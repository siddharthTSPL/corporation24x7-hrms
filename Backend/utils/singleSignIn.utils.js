const SessionModel = require("../Models/Session.model");

const CHALLENGE_TTL_MS = 90 * 1000; // 90 sec to approve/deny before it auto-expires

const ROLE_TO_ACCOUNT_MODEL = {
  superadmin: "SuperAdmin",
  admin: "Admin",
  manager: "Manager",
  employee: "User",
};

const buildDeviceInfo = (req) => ({
  userAgent: req.headers["user-agent"] || "",
  ip: req.ip || req.headers["x-forwarded-for"] || "",
  label: describeDevice(req.headers["user-agent"] || ""),
});

// Very small heuristic label — good enough for "which device is this" in a
// prompt, not meant to be a full UA parser.
function describeDevice(ua) {
  const browser = /edg/i.test(ua)
    ? "Edge"
    : /chrome/i.test(ua)
    ? "Chrome"
    : /firefox/i.test(ua)
    ? "Firefox"
    : /safari/i.test(ua)
    ? "Safari"
    : "Browser";
  const os = /windows/i.test(ua)
    ? "Windows"
    : /mac os/i.test(ua)
    ? "macOS"
    : /android/i.test(ua)
    ? "Android"
    : /iphone|ipad/i.test(ua)
    ? "iOS"
    : "Unknown OS";
  return `${browser} on ${os}`;
}

// Org must have singleSignIn.enabled AND be on an Advance/enterprise plan
// (or an active trial) for the feature to actually kick in. Anything else
// = login behaves exactly as before.
const isSingleSignInActive = (orgSuperAdmin) => {
  if (!orgSuperAdmin?.singleSignIn?.enabled) return false;
  if (orgSuperAdmin.isTrialValid?.()) return true;
  const talentLicense = orgSuperAdmin.licenses?.find(
    (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
  );
  return !!talentLicense && ["Advance", "enterprise"].includes(talentLicense.plan);
};

/**
 * Called right after password verification, before a JWT is issued.
 * Returns one of:
 *   { outcome: "proceed", sessionId }               → no existing session, sign in normally
 *   { outcome: "rejected", message }                → strict mode, another session is active
 *   { outcome: "pending", sessionId, expiresAt }     → approval mode, challenge raised
 */
const evaluateSingleSignIn = async ({ organisation, role, accountId, req }) => {
  const accountModel = ROLE_TO_ACCOUNT_MODEL[role];
  const existing = await SessionModel.findOne({
    account_id: accountId,
    account_model: accountModel,
    status: "active",
  });

  const deviceInfo = buildDeviceInfo(req);

  if (!existing) {
    const session = await SessionModel.create({
      organisation_id: organisation._id,
      account_id: accountId,
      account_model: accountModel,
      status: "active",
      device_info: deviceInfo,
      last_seen_at: new Date(),
    });
    return { outcome: "proceed", sessionId: session._id };
  }

  if (organisation.singleSignIn.mode === "strict") {
    return {
      outcome: "rejected",
      message:
        "You're already signed in on another device. Sign out there first, or ask your admin to enable approval mode.",
    };
  }

  // approval mode
  if (existing.challenge?.status === "pending" && !existing.isChallengeExpired()) {
    return {
      outcome: "pending",
      sessionId: existing._id,
      expiresAt: existing.challenge.expires_at,
    };
  }

  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  existing.challenge = {
    status: "pending",
    device_info: deviceInfo,
    requested_at: new Date(),
    expires_at: expiresAt,
  };
  await existing.save();

  return { outcome: "pending", sessionId: existing._id, expiresAt };
};

// Called by the per-request auth middlewares when a JWT carries a `sid`.
// A revoked/missing session means the account signed in elsewhere and this
// device's session was retired — the request must be rejected.
const isSessionStillActive = async (sessionId) => {
  if (!sessionId) return true; // no sid on token = feature wasn't active at login time
  const session = await SessionModel.findById(sessionId).select("status");
  return !!session && session.status === "active";
};

module.exports = {
  CHALLENGE_TTL_MS,
  ROLE_TO_ACCOUNT_MODEL,
  buildDeviceInfo,
  isSingleSignInActive,
  evaluateSingleSignIn,
  isSessionStillActive,
};