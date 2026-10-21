const SuperAdminModel = require("../Models/superadmin.model");
const { getOrganisationStorageUsage, formatBytes } = require("./storageUsage.utils");

// ─────────────────────────────────────────────────────────────────────────
// Plan model (single source of truth — every login / limit / gate reads here)
//
//   Day 0-14  (free trial)   → ALL features unlocked, up to TRIAL_USER_LIMIT users
//   After 14 days, no paid
//   license   (free tier)    → nothing is stopped; only Basic features stay
//                              open (Review / Timesheet / Recruitment / Asset /
//                              TorchX Voice / Single Sign-In are locked).
//                              The one hard limit is storage: once the org
//                              crosses FREE_STORAGE_LIMIT_MB, login is blocked
//                              until the plan is upgraded (Basic / Advance).
//   Active paid license      → plan rules (users / features) as before; the
//                              free storage cap does not apply.
// ─────────────────────────────────────────────────────────────────────────

const TRIAL_DAYS = 14;
const TRIAL_USER_LIMIT = 100;
const FREE_USER_LIMIT = 100; // user cap for the free tier after the trial ends

const FREE_STORAGE_LIMIT_MB = Number(process.env.FREE_STORAGE_LIMIT_MB) || 5;
const FREE_STORAGE_LIMIT_BYTES = FREE_STORAGE_LIMIT_MB * 1024 * 1024;

// Persisted storage number is trusted this long before a re-scan is started.
const STORAGE_FRESH_MS = 15 * 60 * 1000;
// A login never waits longer than this for a re-scan; if it is slower we fall
// back to the last known number (fail-open — never lock people out on a hiccup).
const STORAGE_LOGIN_WAIT_MS = 20 * 1000;

// Only these roles are told the full story (which plan expired, when, how to
// upgrade). Every other role just sees "plan expired, ask your superadmin".
const SUPERADMIN_ROLES = ["superadmin", "super_admin"];

// The message says "TorchX Store"; the frontend turns that text into a link to
// STORE_URL (sent in meta.storeUrl).
const STORE_LABEL = "TorchX Store";
const STORE_URL = process.env.TORCHX_STORE_URL || "https://torchxsuite.com";

const findActiveTalentLicense = (org) =>
  (org?.licenses || []).find(
    (l) =>
      l.product === "torchx_talent" &&
      l.isActive &&
      new Date(l.expiresAt) > new Date()
  ) || null;

// Most recent TorchX Talent license (used to tell the user WHAT expired and WHEN).
const findLastTalentLicense = (org) =>
  (org?.licenses || [])
    .filter((l) => l.product === "torchx_talent")
    .sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt))[0] || null;

const isTrialActive = (org) =>
  !!org && !!org.is_trial_active && new Date() < new Date(org.trial_expires_at);

const getPlanState = (org) => {
  const trialActive = isTrialActive(org);
  const license = findActiveTalentLicense(org);
  const isFreeTier = !trialActive && !license;

  // Why is the org on the free tier?
  //   "license_expired" → had a paid license, it ran out
  //   "trial_expired"   → never had a paid license, the trial ended
  let inactiveReason = null;
  let lastLicense = null;
  if (isFreeTier) {
    lastLicense = findLastTalentLicense(org);
    inactiveReason = lastLicense ? "license_expired" : "trial_expired";
  }

  return {
    trialActive,
    trialExpired: !trialActive,
    license,
    lastLicense,
    plan: license?.plan || null,
    // free tier = trial is over and no paid license is running
    isFreeTier,
    inactiveReason,
    trialEndedAt: org?.trial_expires_at || null,
  };
};

const daysLeft = (date) => {
  if (!date) return 0;
  const ms = new Date(date).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
};

// Seats an org may use right now.
const getAllowedUsers = (org) => {
  const state = getPlanState(org);
  if (state.trialActive) return TRIAL_USER_LIMIT;
  if (state.license) return state.license.users || 0;
  return FREE_USER_LIMIT;
};

// ── Storage ──────────────────────────────────────────────────────────────

const inflight = new Map();

// Re-scans MongoDB + ImageKit usage for the org (uses the same scanner as the
// Storage tab / owner dashboard) and persists the total on the org document.
const refreshStorageUsage = (org, { force = false } = {}) => {
  const key = String(org._id);
  if (!inflight.has(key)) {
    const p = (async () => {
      const usage = await getOrganisationStorageUsage({
        _id: org._id,
        organisation_id: org.organisation_id,
        organisation_name: org.organisation_name,
      }, { force });
      const usedBytes = usage.totalBytes || 0;
      await SuperAdminModel.updateOne(
        { _id: org._id },
        { $set: { storage_used_bytes: usedBytes, storage_checked_at: new Date() } }
      );
      return usedBytes;
    })().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return inflight.get(key);
};

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("storage scan timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });

const buildStorageStatus = (org, usedBytes, checkedAt) => ({
  usedBytes,
  limitBytes: FREE_STORAGE_LIMIT_BYTES,
  usedFormatted: formatBytes(usedBytes),
  limitFormatted: formatBytes(FREE_STORAGE_LIMIT_BYTES),
  percent: Math.min(100, Math.round((usedBytes / FREE_STORAGE_LIMIT_BYTES) * 100)),
  exceeded: usedBytes > FREE_STORAGE_LIMIT_BYTES,
  checkedAt: checkedAt || null,
});

const isFresh = (org) =>
  org?.storage_checked_at &&
  Date.now() - new Date(org.storage_checked_at).getTime() < STORAGE_FRESH_MS;

// Used at LOGIN: always re-scans before granting free-tier access so a recent
// upload cannot keep using an under-limit snapshot for the storage freshness window.
const getStorageStatusForLogin = async (org) => {
  let used = org.storage_used_bytes || 0;
  let checkedAt = org.storage_checked_at;
  try {
    used = await withTimeout(refreshStorageUsage(org, { force: true }), STORAGE_LOGIN_WAIT_MS);
    checkedAt = new Date();
  } catch (err) {
    console.error("[planAccess] storage scan failed, using last known value:", err?.message);
  }
  return buildStorageStatus(org, used, checkedAt);
};

// Used on already-logged-in requests (getme, plan-features): never waits —
// answers from the stored number and refreshes it in the background.
const peekStorageStatus = (org) => {
  if (!isFresh(org)) refreshStorageUsage(org).catch(() => {});
  return buildStorageStatus(org, org.storage_used_bytes || 0, org.storage_checked_at);
};

// ── Blocking error ───────────────────────────────────────────────────────

// Only the superadmin can renew / upgrade the plan.
const roleCanUpgrade = (role) => SUPERADMIN_ROLES.includes(role);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const planLabel = (plan) =>
  plan ? `${String(plan).charAt(0).toUpperCase()}${String(plan).slice(1)} ` : "";

// First sentence of the superadmin message: WHAT ended, WHEN, and where the org is now.
const buildPlanExpiredLine = (state) => {
  if (state?.inactiveReason === "license_expired" && state.lastLicense?.expiresAt) {
    return `Your ${planLabel(state.lastLicense.plan)}plan expired on ${fmtDate(state.lastLicense.expiresAt)}, so your organisation is now on the Free Forever plan.`;
  }
  if (state?.inactiveReason === "trial_expired") {
    return state.trialEndedAt
      ? `Your free trial ended on ${fmtDate(state.trialEndedAt)}, so your organisation is now on the Free Forever plan.`
      : `Your free trial has ended, so your organisation is now on the Free Forever plan.`;
  }
  return `Your organisation is on the Free Forever plan.`;
};

// Single source of truth for every "access paused" message (login, getme,
// plan-features, uploads). `extra` is an optional upload-specific sentence.
// `state` is getPlanState(org) — optional, falls back to a generic message.
//
//   superadmin  → full detail: which plan expired, on what date, what to do
//   other roles → short: plan expired, ask your organisation's superadmin
const buildStorageMessage = (status, canUpgrade, extra = "", state = null) => {
  const lead = extra ? `${extra} ` : "";
  return canUpgrade
    ? `${lead}${buildPlanExpiredLine(state)} Access to TorchX Talent is temporarily unavailable. ` +
        `Please renew or upgrade your plan from the ${STORE_LABEL} to restore access.`
    : `${lead}Your organisation's plan has expired, and access to TorchX Talent is temporarily unavailable. ` +
        `Please contact your organisation's superadmin to renew or upgrade the plan and restore access.`;
};

const buildStorageTitle = (state, canUpgrade) => {
  if (!canUpgrade) return "Plan expired";
  if (state?.inactiveReason === "license_expired") return "Plan expired";
  if (state?.inactiveReason === "trial_expired") return "Free trial ended";
  return "Storage limit reached";
};

const buildStorageLimitError = (status, role, extra = "", state = null) => {
  const canUpgrade = roleCanUpgrade(role);
  const title = buildStorageTitle(state, canUpgrade);
  const message = buildStorageMessage(status, canUpgrade, extra, state);

  return Object.assign(new Error(message), {
    statusCode: 403,
    code: "STORAGE_LIMIT_REACHED",
    meta: {
      title,
      canUpgrade,
      storeLabel: canUpgrade ? STORE_LABEL : null,
      storeUrl: canUpgrade ? STORE_URL : null,
      reason: state?.inactiveReason || null,
      planExpiredAt: state?.lastLicense?.expiresAt || null,
      trialEndedAt: state?.trialEndedAt || null,
      usedBytes: status.usedBytes,
      limitBytes: status.limitBytes,
      usedFormatted: status.usedFormatted,
      limitFormatted: status.limitFormatted,
    },
  });
};

/**
 * Login / session gate. Trial ending or a missing license NEVER blocks;
 * the only thing that blocks is the free-tier storage cap.
 *
 *   await assertOrgAccess(orgDoc, "admin")              // login  (may wait for a scan)
 *   await assertOrgAccess(orgDoc, "employee", { wait: false }) // getme (never waits)
 *
 * Throws an Error with statusCode 403 / code STORAGE_LIMIT_REACHED.
 */
const assertOrgAccess = async (org, role, { wait = true } = {}) => {
  if (!org) return;
  const state = getPlanState(org);
  if (!state.isFreeTier) return;

  const status = wait
    ? await getStorageStatusForLogin(org)
    : peekStorageStatus(org);

  if (status.exceeded) throw buildStorageLimitError(status, role, "", state);
};

// Express middleware version for "already logged in" endpoints (getme).
// Resolves the org from whichever role the auth middleware attached.
const storageGateMiddleware = async (req, res, next) => {
  try {
    const role = req.superAdmin
      ? "superadmin"
      : req.admin
        ? "admin"
        : req.manager
          ? "manager"
          : "employee";

    let org = req.superAdmin;
    if (!org) {
      const organisationId =
        req.admin?.organisation_id ||
        req.manager?.organisation_id ||
        req.employee?.organisation_id ||
        req.user?.organisation_id;
      if (!organisationId) return next();
      org = await SuperAdminModel.findById(organisationId).select(
        "licenses is_trial_active trial_expires_at storage_used_bytes storage_checked_at organisation_id organisation_name"
      );
    }
    await assertOrgAccess(org, role, { wait: false });
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  TRIAL_DAYS,
  TRIAL_USER_LIMIT,
  FREE_USER_LIMIT,
  FREE_STORAGE_LIMIT_MB,
  FREE_STORAGE_LIMIT_BYTES,
  STORE_LABEL,
  STORE_URL,
  findActiveTalentLicense,
  findLastTalentLicense,
  isTrialActive,
  getPlanState,
  getAllowedUsers,
  daysLeft,
  refreshStorageUsage,
  peekStorageStatus,
  getStorageStatusForLogin,
  assertOrgAccess,
  storageGateMiddleware,
  buildStorageMessage,
  buildStorageLimitError,
  roleCanUpgrade,
};