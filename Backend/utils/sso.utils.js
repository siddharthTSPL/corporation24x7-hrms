// External SSO ("Sign in with Microsoft / Zoho") helpers.
//
// NOTE: this is unrelated to utils/singleSignIn.utils.js, which is the
// "one active device per account" feature. This file is OIDC / OAuth login
// through an external identity provider.
const crypto = require("crypto");
const axios = require("axios");

const b64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const randomToken = (bytes = 32) => b64url(crypto.randomBytes(bytes));
const pkceChallenge = (verifier) => b64url(crypto.createHash("sha256").update(verifier).digest());

// Public base URL of THIS API (including any path prefix, e.g. IIS virtual
// directory) — used to build the redirect URI registered with the provider.
const apiBase = () =>
  String(process.env.SSO_REDIRECT_BASE || process.env.BASE_URL || "").replace(/\/+$/, "");
const frontendBase = () => String(process.env.FRONTEND_URL || "").replace(/\/+$/, "");
const redirectUri = (provider) => `${apiBase()}/auth/sso/${provider}/callback`;

const decodeJwtPayload = (jwtString) => {
  const part = String(jwtString || "").split(".")[1];
  if (!part) throw new Error("Malformed id_token");
  return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
};

const postForm = async (url, fields) => {
  const { data } = await axios.post(url, new URLSearchParams(fields).toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    timeout: 10000,
  });
  return data;
};

// ---------------------------------------------------------------- Microsoft
// Multi-tenant Entra ID app. "organizations" = work/school accounts only
// (no personal @outlook.com). Override with MICROSOFT_TENANT if you want a
// single-tenant app.
const msAuthority = () =>
  `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || "organizations"}/oauth2/v2.0`;

const microsoft = {
  key: "microsoft",
  label: "Microsoft",
  isConfigured: () => !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  usesPkce: true,

  buildAuthUrl: ({ state, nonce, verifier, silent }) => {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri("microsoft"),
      response_mode: "query",
      scope: "openid profile email",
      state,
      nonce,
      code_challenge: pkceChallenge(verifier),
      code_challenge_method: "S256",
      // No forced account chooser: if the person is already signed in to
      // Microsoft in this browser, they pass straight through. silent =
      // prompt=none: never show Microsoft UI, just answer "signed in or not".
      ...(silent ? { prompt: "none" } : {}),
    });
    return `${msAuthority()}/authorize?${params.toString()}`;
  },

  // The id_token is received directly from Microsoft's token endpoint over
  // TLS in exchange for our client secret, so (per OIDC Core §3.1.3.7) its
  // signature need not be re-verified; we still validate aud / iss / exp /
  // nonce. `tid` is what the org-level tenant binding is checked against.
  resolveIdentity: async ({ code, verifier, nonce }) => {
    const tokens = await postForm(`${msAuthority()}/token`, {
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri("microsoft"),
      code_verifier: verifier,
      scope: "openid profile email",
    });
    const claims = decodeJwtPayload(tokens.id_token);

    if (claims.aud !== process.env.MICROSOFT_CLIENT_ID) throw new Error("id_token audience mismatch");
    if (!claims.tid || claims.iss !== `https://login.microsoftonline.com/${claims.tid}/v2.0`)
      throw new Error("id_token issuer mismatch");
    if (!claims.exp || claims.exp * 1000 < Date.now()) throw new Error("id_token expired");
    if (claims.nonce !== nonce) throw new Error("id_token nonce mismatch");

    const email = String(claims.email || claims.preferred_username || "").toLowerCase().trim();
    if (!email.includes("@")) throw new Error("No email address in Microsoft account");

    return {
      email,
      name: claims.name || "",
      tenantId: String(claims.tid).toLowerCase(),
      subject: claims.oid || claims.sub,
    };
  },
};

// --------------------------------------------------------------------- Zoho
// Zoho runs separate data centres: accounts.zoho.com / .in / .eu /
// .com.au / .jp / .ca. Set ZOHO_ACCOUNTS_URL to the one your Zoho account
// lives in, e.g. https://accounts.zoho.in
const zohoAccounts = () =>
  String(process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com").replace(/\/+$/, "");

const zoho = {
  key: "zoho",
  label: "Zoho",
  isConfigured: () => !!(process.env.ZOHO_SSO_CLIENT_ID && process.env.ZOHO_SSO_CLIENT_SECRET),
  usesPkce: false,

  buildAuthUrl: ({ state }) => {
    const params = new URLSearchParams({
      client_id: process.env.ZOHO_SSO_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri("zoho"),
      scope: "AaaServer.profile.READ",
      state,
      access_type: "online",
    });
    return `${zohoAccounts()}/oauth/v2/auth?${params.toString()}`;
  },

  resolveIdentity: async ({ code }) => {
    const tokens = await postForm(`${zohoAccounts()}/oauth/v2/token`, {
      client_id: process.env.ZOHO_SSO_CLIENT_ID,
      client_secret: process.env.ZOHO_SSO_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri("zoho"),
    });
    if (!tokens.access_token) throw new Error(`Zoho token error: ${tokens.error || "no access_token"}`);

    const { data } = await axios.get(`${zohoAccounts()}/oauth/user/info`, {
      headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` },
      timeout: 10000,
    });
    const email = String(data.Email || data.email || "").toLowerCase().trim();
    if (!email.includes("@")) throw new Error("No email address in Zoho account");

    return {
      email,
      name: data.Display_Name || [data.First_Name, data.Last_Name].filter(Boolean).join(" "),
      subject: data.ZUID || data.sub || email,
    };
  },
};

const PROVIDERS = { microsoft, zoho };

module.exports = { PROVIDERS, randomToken, redirectUri, frontendBase };