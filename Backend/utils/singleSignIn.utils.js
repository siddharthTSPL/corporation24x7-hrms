const SessionModel = require("../Models/Session.model");

const CHALLENGE_TTL_MS = 90 * 1000; // 90 sec to approve/deny before it auto-expires

const ROLE_TO_ACCOUNT_MODEL = {
  superadmin: "SuperAdmin",
  admin: "Admin",
  manager: "Manager",
  employee: "User",
};

const buildDeviceInfo = (req) => {
  const { getIp, locateIp } = require("./loginAnomaly.utils");
  const ip = getIp(req);
  const ua = req.headers["user-agent"] || "";
  const parsed = parseUserAgent(ua);
  return {
    userAgent: ua,
    ip,
    // `label` is kept in the same "Browser on OS" shape as before because
    // other code (e.g. login anomaly alerts) reads it.
    label: parsed.label,
    deviceName: parsed.deviceName,
    deviceType: parsed.deviceType,
    browser: parsed.browser,
    os: parsed.os,
    // IP lookup is local/offline and returns null for private or unknown IPs.
    geo: locateIp(ip),
  };
};

// Android model-code prefix -> brand. Not exhaustive — anything unmatched is
// shown as the raw model code, which is still more useful than "Android".
const ANDROID_BRANDS = [
  [/^SM-|^GT-|^SC-|^SCV/i, "Samsung"],
  [/^Pixel/i, "Google"],
  [/^(CPH|PH[A-Z]\d)/i, "OPPO"],
  [/^RMX/i, "realme"],
  [/^(Redmi|POCO|Mi |MI |M\d{4}|2\d{6,}[A-Z]*)/i, "Xiaomi"],
  [/^(V\d{4}|vivo)/i, "vivo"],
  [/^(LE\d|IN\d|KB\d|NE\d|CPH|OnePlus|HD\d)/i, "OnePlus"],
  [/^(XT\d|moto)/i, "Motorola"],
  [/^(TA-|Nokia)/i, "Nokia"],
  [/^(LM-|LG)/i, "LG"],
  [/^(Infinix|X6\d|X\d{3})/i, "Infinix"],
  [/^(TECNO|KG\d|LH\d)/i, "Tecno"],
];

const firstMatch = (ua, re) => {
  const m = ua.match(re);
  return m ? m[1] : "";
};

const trimVersion = (v, parts = 1) => (v ? v.split(".").slice(0, parts).join(".") : "");

/**
 * Lightweight User-Agent parser. Returns browser + OS (with versions where
 * the UA actually carries them), a device type and a human "device name".
 *
 * Honest limits: browsers don't expose the computer's hostname/"device name"
 * (e.g. "Rahul's laptop") and modern Chrome freezes parts of the UA string
 * (macOS always reads 10_15_7, many Android phones report the model as "K").
 * So desktops come out as "Windows PC" / "Mac" and phones show brand + model
 * when the UA includes it.
 */
function parseUserAgent(ua = "") {
  // ---- Browser (order matters: Edge/Opera/Samsung also contain "Chrome") ----
  let browser = "Browser";
  let browserVersion = "";
  if (/edg(e|a|ios)?\//i.test(ua)) {
    browser = "Edge";
    browserVersion = firstMatch(ua, /edg(?:e|a|ios)?\/([\d.]+)/i);
  } else if (/opr\/|opera/i.test(ua)) {
    browser = "Opera";
    browserVersion = firstMatch(ua, /(?:opr|opera)\/([\d.]+)/i);
  } else if (/samsungbrowser/i.test(ua)) {
    browser = "Samsung Internet";
    browserVersion = firstMatch(ua, /samsungbrowser\/([\d.]+)/i);
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
    browserVersion = firstMatch(ua, /(?:firefox|fxios)\/([\d.]+)/i);
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
    browserVersion = firstMatch(ua, /(?:chrome|crios)\/([\d.]+)/i);
  } else if (/safari/i.test(ua)) {
    browser = "Safari";
    browserVersion = firstMatch(ua, /version\/([\d.]+)/i);
  }
  const browserFull = browserVersion
    ? `${browser} ${trimVersion(browserVersion, 1)}`
    : browser;

  // ---- OS + device ----
  let osName = "Unknown OS";
  let osVersion = "";
  let deviceType = "desktop";
  let deviceName = "Unknown device";

  if (/iphone/i.test(ua)) {
    osName = "iOS";
    osVersion = firstMatch(ua, /iphone os ([\d_]+)/i).replace(/_/g, ".");
    deviceType = "mobile";
    deviceName = "iPhone";
  } else if (/ipad/i.test(ua)) {
    osName = "iPadOS";
    osVersion = firstMatch(ua, /cpu os ([\d_]+)/i).replace(/_/g, ".");
    deviceType = "tablet";
    deviceName = "iPad";
  } else if (/android/i.test(ua)) {
    osName = "Android";
    osVersion = firstMatch(ua, /android ([\d.]+)/i);
    deviceType = /mobile/i.test(ua) ? "mobile" : "tablet";
    const model = firstMatch(ua, /android [\d.]+;\s*([^;)]+?)(?:\s+build\/|[;)])/i).trim();
    // Chrome's reduced UA reports the model as just "K" — not useful.
    if (model && model.length > 1 && !/^(k|android|mobile)$/i.test(model)) {
      const brand = ANDROID_BRANDS.find(([re]) => re.test(model))?.[1];
      deviceName = brand && !model.toLowerCase().startsWith(brand.toLowerCase())
        ? `${brand} ${model}`
        : model;
    } else {
      deviceName = deviceType === "tablet" ? "Android tablet" : "Android phone";
    }
  } else if (/windows/i.test(ua)) {
    osName = "Windows";
    const nt = firstMatch(ua, /windows nt ([\d.]+)/i);
    // Windows 10 and 11 both report NT 10.0 — can't tell them apart from the UA.
    osVersion = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" }[nt] || "";
    deviceName = "Windows PC";
  } else if (/cros/i.test(ua)) {
    osName = "ChromeOS";
    deviceName = "Chromebook";
  } else if (/mac os x|macintosh/i.test(ua)) {
    osName = "macOS"; // version is frozen at 10_15_7 by browsers, so omit it
    deviceName = "Mac";
  } else if (/linux|x11/i.test(ua)) {
    osName = "Linux";
    deviceName = "Linux PC";
  }

  if (deviceName === "Unknown device") deviceType = "unknown";
  const os = osVersion ? `${osName} ${osVersion}` : osName;
  return {
    browser: browserFull,
    os,
    deviceType,
    deviceName,
    label: `${browser} on ${osName}`,
  };
}

// Hide the last part of an IP so the waiting-approval screen can say
// "103.21.x.x" without publishing the full address.
const maskIp = (ip = "") => {
  if (!ip) return "";
  if (ip.includes(":")) return `${ip.split(":").slice(0, 2).join(":")}::`;
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : "";
};

// Safe, display-only summary of the device that currently HOLDS the account's
// active session. Sent to the new device's "waiting for approval" screen so
// the person knows exactly which device to go and approve from. Deliberately
// leaves out the raw user-agent, exact IP and coordinates.
const toActiveDeviceSummary = (session) => {
  const d = session?.device_info;
  if (!d) return null;
  // Sessions created before deviceName existed: derive it from the stored UA.
  const parsed = d.deviceName ? null : parseUserAgent(d.userAgent || "");
  return {
    deviceName: d.deviceName || parsed.deviceName,
    deviceType: d.deviceType && d.deviceType !== "unknown" ? d.deviceType : parsed?.deviceType || "unknown",
    browser: d.browser || parsed?.browser || "",
    os: d.os || parsed?.os || "",
    label: d.label || parsed?.label || "",
    city: d.geo?.city || "",
    country: d.geo?.country || "",
    ipMasked: maskIp(d.ip),
    signedInAt: session.createdAt || null,
  };
};

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
 *   { outcome: "pending", sessionId, expiresAt, activeDevice } → approval mode, challenge raised
 */
const evaluateSingleSignIn = async ({ organisation, role, accountId, req }) => {
  const accountModel = ROLE_TO_ACCOUNT_MODEL[role];

  // .sort(): there should only ever be one "active" row per account, but if
  // stray duplicates ever exist (e.g. leftover rows from before logout
  // started revoking sessions), always deterministically treat the most
  // recently-seen one as "the" active session, and quietly retire the rest
  // — instead of leaving it up to whatever order Mongo happens to return.
  const existing = await SessionModel.findOne({
    account_id: accountId,
    account_model: accountModel,
    status: "active",
  }).sort({ last_seen_at: -1 });

  if (existing) {
    await SessionModel.updateMany(
      {
        account_id: accountId,
        account_model: accountModel,
        status: "active",
        _id: { $ne: existing._id },
      },
      { $set: { status: "revoked" } }
    );
  }

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
      activeDevice: toActiveDeviceSummary(existing),
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

  return {
    outcome: "pending",
    sessionId: existing._id,
    expiresAt,
    activeDevice: toActiveDeviceSummary(existing),
  };
};

// Called by the per-request auth middlewares when a JWT carries a `sid`.
// A revoked/missing session means the account signed in elsewhere and this
// device's session was retired — the request must be rejected.
const isSessionStillActive = async (sessionId) => {
  if (!sessionId) return true; // no sid on token = feature wasn't active at login time
  const session = await SessionModel.findById(sessionId).select("status");
  return !!session && session.status === "active";
};

// Called on logout, for every role, to release THIS device's session slot.
//
// Why this matters: evaluateSingleSignIn()'s whole "is another device
// already signed in" check is based on whether a Session row for this
// account still has status:"active". Logout only ever cleared the cookie —
// it never touched this row. So after logging out, the row was still
// "active" in the DB, and the very next login attempt (even from the same
// device/browser) was treated as a second, concurrent sign-in:
//   - strict mode  -> wrongly rejected ("already signed in elsewhere")
//   - approval mode -> wrongly raised a pending challenge and parked the
//     user on the "waiting for approval" screen — with no other logged-in
//     device left anywhere to show the Approve/Deny banner, since this
//     device's cookie was just cleared. It could only ever time out.
//
// Revoking the session here (not touching the account's own status/
// working_status field — that's a separate, unrelated concept) closes that
// gap: logout actually frees up the slot, so the next login on this device
// is recognized as "no existing active session" and proceeds normally.
//
// `sessionId` is undefined/null for tokens minted while the feature was
// off (no `sid` claim) — a harmless no-op in that case.
const revokeSession = async (sessionId) => {
  if (!sessionId) return;
  await SessionModel.updateOne(
    { _id: sessionId, status: "active" },
    { $set: { status: "revoked" } }
  );
};

module.exports = {
  CHALLENGE_TTL_MS,
  ROLE_TO_ACCOUNT_MODEL,
  buildDeviceInfo,
  parseUserAgent,
  toActiveDeviceSummary,
  isSingleSignInActive,
  evaluateSingleSignIn,
  isSessionStillActive,
  revokeSession,
};