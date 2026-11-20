// "Sign in with Microsoft / Zoho" (OIDC / OAuth 2.0 authorization-code flow).
//
// Flow:
//   1. GET  /auth/sso/:provider/start     -> redirect to the provider
//   2. GET  /auth/sso/:provider/callback  -> verify identity, match the email
//                                            to an EXISTING account, then
//                                            redirect to the frontend with a
//                                            90-second one-time ticket
//   3. POST /auth/sso/exchange            -> frontend swaps the ticket for the
//                                            normal session cookie (same
//                                            token / single-device gate /
//                                            response shape as password login)
//
// SSO never creates accounts. The email from the provider must already exist
// in HRMS, and the account's organisation must have that provider enabled
// (Microsoft additionally requires the org's Entra tenant ID to match).
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { LRUCache } = require("lru-cache");

const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");
const { PROVIDERS, randomToken, frontendBase } = require("../utils/sso.utils");
const {
  buildLoginToken,
  findAccountByEmail,
  cookieOpts,
  handleLoginGeoCheck,
} = require("./Unified.auth.controller");

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const usedTickets = new LRUCache({ max: 5000, ttl: 5 * 60 * 1000 });

const stateCookieOpts = () => {
  const isProduction = process.env.NODE_ENV === "production";
  // Lax is enough: the provider sends the browser back with a top-level GET.
  return { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/" };
};

const failRedirect = (res, message) =>
  res.redirect(`${frontendBase()}/sso-callback?error=${encodeURIComponent(message)}`);

const MODEL_BY_ACCOUNT_TYPE = {
  superadmin: SuperAdminModel,
  admin: AdminModel,
  manager: Managermodel,
  employee: Usermodel,
};
const GEO_MODEL_NAME = { superadmin: "SuperAdmin", admin: "Admin", manager: "Manager", employee: "User" };

const resolveOrganisation = async (accountType, account) => {
  if (accountType === "superadmin") return account;
  let org = await SuperAdminModel.findById(account.organisation_id);
  if (!org && accountType === "manager") {
    // Older managers may point at their admin instead of the org.
    const parent = await AdminModel.findById(account.organisation_id).select("organisation_id").lean();
    if (parent?.organisation_id) org = await SuperAdminModel.findById(parent.organisation_id);
  }
  return org;
};

// GET /auth/sso/providers — which buttons the login page should show.
const listProviders = (req, res) => {
  const providers = Object.values(PROVIDERS)
    .filter((p) => p.isConfigured())
    .map((p) => ({ key: p.key, label: p.label }));
  res.status(200).json({ success: true, providers });
};

// GET /auth/sso/:provider/start
const startSso = (req, res) => {
  const provider = PROVIDERS[req.params.provider];
  if (!provider || !provider.isConfigured())
    return failRedirect(res, "This sign-in method isn't available.");

  const nonce = randomToken(24);
  const verifier = randomToken(48);
  // silent=1: automatic attempt from the login page (no user click). If the
  // person isn't already signed in at the provider we go back to the normal
  // login form instead of showing an error.
  const silent = req.query.silent === "1";

  const stateCookie = jwt.sign(
    { purpose: "sso_state", provider: provider.key, nonce, verifier, silent },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
  res.cookie("sso_state", stateCookie, { ...stateCookieOpts(), maxAge: 10 * 60 * 1000 });

  return res.redirect(provider.buildAuthUrl({ state: nonce, nonce, verifier, silent }));
};

// GET /auth/sso/:provider/callback
const ssoCallback = async (req, res) => {
  const providerKey = req.params.provider;
  const provider = PROVIDERS[providerKey];
  const stateCookie = req.cookies?.sso_state;
  res.clearCookie("sso_state", stateCookieOpts());

  if (!provider || !provider.isConfigured()) return failRedirect(res, "This sign-in method isn't available.");
  const { code, state } = req.query;
  let st;
  try {
    st = jwt.verify(stateCookie, process.env.JWT_SECRET);
  } catch {
    return failRedirect(res, "Your sign-in session expired. Please try again.");
  }
  if (req.query.error) {
    // Automatic attempt and the person isn't signed in at the provider
    // (login_required / interaction_required / ...): quietly fall back to
    // the normal login form.
    if (st.silent && st.provider === providerKey) return res.redirect(`${frontendBase()}/login?sso=none`);
    return failRedirect(res, `Sign-in with ${provider.label} was cancelled or denied.`);
  }
  if (st.purpose !== "sso_state" || st.provider !== providerKey || !code || !state || state !== st.nonce)
    return failRedirect(res, "Sign-in could not be verified. Please try again.");

  let identity;
  try {
    identity = await provider.resolveIdentity({ code, verifier: st.verifier, nonce: st.nonce });
  } catch (err) {
    console.error(`[sso:${providerKey}] identity lookup failed:`, err?.response?.data || err?.message);
    return failRedirect(res, `Couldn't verify your ${provider.label} account. Please try again.`);
  }

  const found = await findAccountByEmail(identity.email);
  if (!found)
    return failRedirect(res, `No account found for ${identity.email}. Ask your admin to add you first.`);
  const { accountType, account } = found;

  if (accountType === "superadmin") {
    if (!account.isVerified) return failRedirect(res, "Please verify your email before logging in.");
    if (account.status === "suspended") return failRedirect(res, "Your account has been suspended. Contact support.");
  }
  if (account.working_status && account.working_status !== "working")
    return failRedirect(res, "Your account is not active. Please contact your admin.");

  const org = await resolveOrganisation(accountType, account);
  if (!org) return failRedirect(res, "Organisation not found. Please contact support.");

  const cfg = org.externalSso?.[providerKey];
  if (!cfg?.enabled)
    return failRedirect(
      res,
      `Sign-in with ${provider.label} isn't enabled for your organisation. Ask your super admin to turn it on in Settings → Security.`
    );

  if (providerKey === "microsoft") {
    if (!cfg.tenantId)
      return failRedirect(res, "Your organisation hasn't set its Microsoft tenant ID yet. Ask your super admin.");
    if (String(cfg.tenantId).toLowerCase() !== identity.tenantId)
      return failRedirect(res, "This Microsoft account belongs to a different organisation.");
  }

  const ticket = jwt.sign(
    { purpose: "sso_ticket", jti: crypto.randomUUID(), accountType, accountId: String(account._id), provider: providerKey },
    process.env.JWT_SECRET,
    { expiresIn: "90s" }
  );
  return res.redirect(`${frontendBase()}/sso-callback?ticket=${encodeURIComponent(ticket)}`);
};

// POST /auth/sso/exchange  { ticket }
const exchangeSsoTicket = async (req, res, next) => {
  const fail = (message, statusCode = 401) => next(Object.assign(new Error(message), { statusCode }));

  let decoded;
  try {
    decoded = jwt.verify(req.body?.ticket, process.env.JWT_SECRET);
  } catch {
    return fail("This sign-in link has expired. Please try again.");
  }
  if (decoded.purpose !== "sso_ticket" || usedTickets.has(decoded.jti))
    return fail("This sign-in link is no longer valid. Please try again.");
  usedTickets.set(decoded.jti, true);

  const Model = MODEL_BY_ACCOUNT_TYPE[decoded.accountType];
  const account = Model && (await Model.findById(decoded.accountId));
  if (!account) return fail("Account not found.", 404);
  const { accountType } = decoded;

  const orgId = accountType === "superadmin" ? account._id : account.organisation_id;
  void handleLoginGeoCheck({
    accountId: account._id,
    accountModel: GEO_MODEL_NAME[accountType],
    accountName: `${account.f_name || account.name || ""} ${account.l_name || ""}`.trim() || account.work_email || account.email,
    organisation_id: orgId,
    req,
  });

  let token;
  try {
    // Same gate as password login: working_status, plan access, and the
    // one-active-device Single Sign-In rule (may return a challenge).
    token = await buildLoginToken(accountType, account, req);
  } catch (err) {
    return next(err);
  }

  if (token && typeof token === "object" && token.challenge) {
    return res.status(200).json({
      success: true,
      challenge: true,
      sessionId: token.sessionId,
      expiresAt: token.expiresAt,
      activeDevice: token.activeDevice || null,
      message: "We've sent an approval request to your other device. Approve it there to continue.",
    });
  }

  res.cookie("token", token, cookieOpts());
  if (accountType !== "employee") Model.findByIdAndUpdate(account._id, { last_login: new Date() }).exec();

  return res.status(200).json({
    success: true,
    message: "Login successful",
    role: account.role,
    accountType,
    token,
    provider: decoded.provider,
  });
};

// --- SuperAdmin: per-organisation SSO settings ---------------------------
const shapeSettings = (org) => ({
  microsoft: { enabled: !!org.externalSso?.microsoft?.enabled, tenantId: org.externalSso?.microsoft?.tenantId || "" },
  zoho: { enabled: !!org.externalSso?.zoho?.enabled },
});

const getSsoSettings = (req, res) => {
  res.status(200).json({
    success: true,
    settings: shapeSettings(req.superAdmin),
    available: { microsoft: PROVIDERS.microsoft.isConfigured(), zoho: PROVIDERS.zoho.isConfigured() },
  });
};

const updateSsoSettings = async (req, res, next) => {
  const org = req.superAdmin;
  const { microsoft, zoho } = req.body || {};

  if (microsoft) {
    if (typeof microsoft.tenantId === "string") {
      const tenantId = microsoft.tenantId.trim().toLowerCase();
      if (tenantId && !GUID_RE.test(tenantId))
        return next(Object.assign(new Error("Microsoft tenant ID must be a GUID like 11111111-2222-3333-4444-555555555555."), { statusCode: 400 }));
      org.set("externalSso.microsoft.tenantId", tenantId);
    }
    if (typeof microsoft.enabled === "boolean") {
      if (microsoft.enabled && !org.get("externalSso.microsoft.tenantId"))
        return next(Object.assign(new Error("Enter your Microsoft tenant ID before enabling Microsoft sign-in."), { statusCode: 400 }));
      org.set("externalSso.microsoft.enabled", microsoft.enabled);
    }
  }
  if (zoho && typeof zoho.enabled === "boolean") org.set("externalSso.zoho.enabled", zoho.enabled);

  await org.save();
  return res.status(200).json({ success: true, settings: shapeSettings(org) });
};

module.exports = { listProviders, startSso, ssoCallback, exchangeSsoTicket, getSsoSettings, updateSsoSettings };