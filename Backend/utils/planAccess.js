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

const ADMIN_ROLES = ["superadmin", "super_admin", "admin", "senior_admin", "official"];

const findActiveTalentLicense = (org) =>
  (org?.licenses || []).find(
    (l) =>
      l.product === "torchx_talent" &&
      l.isActive &&
      new Date(l.expiresAt) > new Date()
  ) || null;

const isTrialActive = (org) =>
  !!org && !!org.is_trial_active && new Date() < new Date(org.trial_expires_at);

const getPlanState = (org) => {
  const trialActive = isTrialActive(org);
  const license = findActiveTalentLicense(org);
  return {
    trialActive,
    trialExpired: !trialActive,
    license,
    plan: license?.plan || null,
    // free tier = trial is over and no paid license is running
    isFreeTier: !trialActive && !license,
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
const refreshStorageUsage = (org) => {
  const key = String(org._id);
  if (!inflight.has(key)) {
    const p = (async () => {
      const usage = await getOrganisationStorageUsage({
        _id: org._id,
        organisation_id: org.organisation_id,
        organisation_name: org.organisation_name,
      });
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

// Used at LOGIN: waits for a re-scan when the stored number is stale.
const getStorageStatusForLogin = async (org) => {
  let used = org.storage_used_bytes || 0;
  let checkedAt = org.storage_checked_at;
  if (!isFresh(org)) {
    try {
      used = await withTimeout(refreshStorageUsage(org), STORAGE_LOGIN_WAIT_MS);
      checkedAt = new Date();
    } catch (err) {
      console.error("[planAccess] storage scan failed, using last known value:", err?.message);
    }
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

const roleCanUpgrade = (role) => ADMIN_ROLES.includes(role);

const buildStorageLimitError = (status, role) => {
  const canUpgrade = roleCanUpgrade(role);
  const title = "Storage limit reached";
  const message = canUpgrade
    ? `Your organisation has used ${status.usedFormatted} of the ${status.limitFormatted} free storage. ` +
      `Please upgrade to the Basic or Advance plan at torchxsuite.com for unlimited storage and to continue using TorchX Talent.`
    : `Your organisation has reached its free storage limit. Please contact your organization.`;

  return Object.assign(new Error(message), {
    statusCode: 403,
    code: "STORAGE_LIMIT_REACHED",
    meta: {
      title,
      canUpgrade,
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

  if (status.exceeded) throw buildStorageLimitError(status, role);
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
  findActiveTalentLicense,
  isTrialActive,
  getPlanState,
  getAllowedUsers,
  daysLeft,
  refreshStorageUsage,
  peekStorageStatus,
  getStorageStatusForLogin,
  assertOrgAccess,
  storageGateMiddleware,
};