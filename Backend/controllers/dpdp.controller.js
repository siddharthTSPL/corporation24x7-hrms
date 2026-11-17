const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const DpdpSettings = require("../Models/dpdpSettings.model");
const DpdpPinAttempt = require("../Models/dpdpPinAttempt.model");
const DpdpConsent = require("../Models/dpdpConsent.model");
const DpdpRequest = require("../Models/dpdpRequest.model");
const AuditLog = require("../Models/auditLog.model");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const SuperAdminModel = require("../Models/superadmin.model");
const { logAudit } = require("../utils/auditLog.utils");
const { signUnlockToken, isUnlocked, getSettings, clearSettingsCache, validatePin, nameOf } = require("../utils/dpdp.utils");

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const COOKIE_BASE = () => {
  const prod = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" };
};

// anyRoleAuth gives req.actor = { id, role, recipientModel, organisation_id }.
const actorOf = (req) => ({
  id: String(req.actor.id),
  role: req.actor.role,
  model: req.actor.recipientModel,
  orgId: String(req.actor.organisation_id),
  name: nameOf(req.user),
  email: req.user?.work_email || req.user?.email || "",
});

const audit = (a, action, meta = {}, target) =>
  logAudit({ organisation_id: a.orgId, module: "dpdp", action, actor: { id: a.id, model: a.model, name: a.name }, target, meta });

const publicSettings = (s) => ({
  enabled: !!s?.enabled,
  maskingEnabled: s ? s.maskingEnabled !== false : true,
  pinRequiredForDocuments: s ? s.pinRequiredForDocuments !== false : true,
  pinConfigured: !!s?.pinVersion,
  pinSetAt: s?.pinSetAt || null,
  unlockMinutes: s?.unlockMinutes || 15,
  unlockRoles: s?.unlockRoles || [],
  notice: s?.notice || { version: "1.0", url: "", purposes: [] },
  officer: s?.officer || { name: "", email: "", phone: "" },
  requestSlaDays: s?.requestSlaDays || 30,
});

// ───────────── every signed-in user ─────────────
exports.getStatus = async (req, res) => {
  const a = actorOf(req);
  const s = await getSettings(a.orgId);
  res.json({
    success: true,
    ...publicSettings(s),
    unlocked: !!s && isUnlocked(req, a, s),
    canUnlock: !!s && s.unlockRoles.includes(a.role),
  });
};

exports.verifyPin = async (req, res) => {
  const a = actorOf(req);
  const s = await DpdpSettings.findOne({ organisation_id: a.orgId }).select("+pinHash");
  if (!s || !s.enabled || !s.pinHash) return res.status(400).json({ message: "Access PIN is not set up for this organisation. Ask your Super Admin." });
  if (!s.unlockRoles.includes(a.role)) {
    audit(a, "pin.denied_role", { role: a.role });
    return res.status(403).json({ code: "DPDP_ROLE_NOT_ALLOWED", message: "Your role is not allowed to view protected data." });
  }

  const now = new Date();
  const att = await DpdpPinAttempt.findOne({ organisation_id: a.orgId, actorId: a.id });
  if (att?.lockedUntil && att.lockedUntil > now) {
    const mins = Math.ceil((att.lockedUntil - now) / 60000);
    return res.status(429).json({ code: "DPDP_PIN_LOCKED", message: `Too many wrong attempts. Try again in ${mins} minute(s).` });
  }

  const pin = String(req.body?.pin ?? "");
  const ok = /^\d{4,12}$/.test(pin) && (await bcrypt.compare(pin, s.pinHash));
  if (!ok) {
    const count = (att && att.lockedUntil && att.lockedUntil <= now ? 0 : att?.count || 0) + 1;
    const locked = count >= MAX_ATTEMPTS;
    await DpdpPinAttempt.findOneAndUpdate(
      { organisation_id: a.orgId, actorId: a.id },
      { count: locked ? 0 : count, lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60000) : null, expiresAt: new Date(Date.now() + 24 * 3600000) },
      { upsert: true },
    );
    audit(a, locked ? "pin.locked" : "pin.failed", { attempt: count, ip: req.ip });
    return res.status(401).json({
      message: locked ? `Too many wrong attempts. Locked for ${LOCK_MINUTES} minutes.` : `Wrong PIN. ${MAX_ATTEMPTS - count} attempt(s) left.`,
    });
  }

  await DpdpPinAttempt.deleteOne({ organisation_id: a.orgId, actorId: a.id });
  const token = signUnlockToken({ actor: a, pinVersion: s.pinVersion, minutes: s.unlockMinutes });
  res.cookie("dpdp_unlock", token, { ...COOKIE_BASE(), maxAge: s.unlockMinutes * 60000 });
  audit(a, "pin.unlocked", { minutes: s.unlockMinutes, ip: req.ip });
  res.json({ success: true, token, expiresInMinutes: s.unlockMinutes });
};

exports.lock = async (req, res) => {
  const a = actorOf(req);
  res.clearCookie("dpdp_unlock", COOKIE_BASE());
  audit(a, "pin.locked_manually");
  res.json({ success: true });
};

// Open /api/dpdp/selftest in the browser while logged in. Tells you exactly why
// data is (not) masked: middleware registered?, org settings found?, ON?, unlocked?
exports.selfTest = async (req, res) => {
  const a = actorOf(req);
  const { maskTree } = require("../utils/dpdp.utils");
  const s = await DpdpSettings.findOne({ organisation_id: a.orgId }).lean();
  const unlocked = !!s && isUnlocked(req, a, s);
  const willMask = !!(s && s.enabled && s.maskingEnabled !== false && !unlocked);
  const reasons = [];
  if (!req.dpdpMaskInstalled) reasons.push("dpdpMask middleware is NOT registered in app.js (or server was not restarted)");
  if (!s) reasons.push("No DPDP settings found for your organisation. Open the DPDP & Privacy page as Super Admin, set a PIN and switch protection ON");
  else if (!s.enabled) reasons.push("DPDP protection is OFF for your organisation");
  else if (s.maskingEnabled === false) reasons.push("'Mask personal identifiers' is switched OFF");
  if (unlocked) reasons.push("You have entered the PIN (unlocked), so real data is shown. Click Lock");
  const sampleOther = { _id: "000000000000000000000000", f_name: "Sample", personal_contact: "9876543210", aadhaar_number: "123412341234", pan_number: "ABCDE1234F", account_number: "123456789012", work_email: "sample@x.com" };
  res.json({
    success: true,
    middlewareRegistered: !!req.dpdpMaskInstalled,
    you: { id: a.id, role: a.role, organisation_id: a.orgId },
    settingsFound: !!s,
    enabled: !!s?.enabled,
    maskingEnabled: s ? s.maskingEnabled !== false : null,
    pinConfigured: !!s?.pinVersion,
    unlocked,
    willMaskOtherPeoplesData: willMask,
    whyNotMasked: willMask ? [] : reasons,
    // What another person's record looks like to you right now:
    sampleAsYouSeeIt: willMask ? maskTree(sampleOther, a.id) : sampleOther,
    note: "Your OWN profile is never masked. Check lists of other employees.",
  });
};

// ───────────── consent ─────────────
exports.getMyConsent = async (req, res) => {
  const a = actorOf(req);
  const s = await getSettings(a.orgId);
  const notice = publicSettings(s).notice;
  const rows = await DpdpConsent.find({ organisation_id: a.orgId, "subject.id": a.id }).sort({ createdAt: -1 }).lean();
  const latest = {};
  for (const r of rows) if (!(r.purpose in latest)) latest[r.purpose] = r;
  const purposes = notice.purposes.map((p) => ({
    ...p,
    granted: latest[p.key]?.granted ?? false,
    answered: !!latest[p.key],
    noticeVersion: latest[p.key]?.noticeVersion || null,
    at: latest[p.key]?.createdAt || null,
  }));
  const pending = purposes.some((p) => !p.answered || p.noticeVersion !== notice.version);
  res.json({ success: true, noticeVersion: notice.version, noticeUrl: notice.url, officer: publicSettings(s).officer, purposes, pending });
};

exports.saveMyConsent = async (req, res) => {
  const a = actorOf(req);
  const s = await getSettings(a.orgId);
  const notice = publicSettings(s).notice;
  const answers = Array.isArray(req.body?.purposes) ? req.body.purposes : [];
  const rows = [];
  for (const p of notice.purposes) {
    const ans = answers.find((x) => x.key === p.key);
    if (!ans && !p.required) continue;
    const granted = p.required ? true : !!ans?.granted;
    if (p.required && ans && ans.granted === false)
      return res.status(400).json({ message: `"${p.label}" is required for employment. To withdraw, raise a request instead.` });
    rows.push({
      organisation_id: a.orgId, subject: { id: a.id, model: a.model }, purpose: p.key, granted,
      noticeVersion: notice.version, ip: req.ip, userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    });
  }
  if (rows.length) await DpdpConsent.insertMany(rows);
  audit(a, "consent.saved", { noticeVersion: notice.version, purposes: rows.map((r) => `${r.purpose}:${r.granted}`) });
  res.json({ success: true });
};

// ───────────── data principal requests ─────────────
exports.createRequest = async (req, res) => {
  const a = actorOf(req);
  const { type, subject, details } = req.body || {};
  if (!["access", "correction", "erasure", "grievance", "nomination", "consent_withdrawal"].includes(type)) return res.status(400).json({ message: "Invalid request type" });
  if (!subject || String(subject).trim().length < 3) return res.status(400).json({ message: "Please add a short subject" });
  const s = await getSettings(a.orgId);
  const dueAt = new Date(Date.now() + (s?.requestSlaDays || 30) * 86400000);
  const doc = await DpdpRequest.create({
    organisation_id: a.orgId, requester: { id: a.id, model: a.model, name: a.name, email: a.email },
    type, subject: String(subject).trim(), details: String(details || "").trim(), dueAt,
  });
  audit(a, "request.created", { type, requestId: doc._id });
  res.status(201).json({ success: true, request: doc });
};

exports.myRequests = async (req, res) => {
  const a = actorOf(req);
  const requests = await DpdpRequest.find({ organisation_id: a.orgId, "requester.id": a.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, requests });
};

// Right of access: the person downloads their own record.
exports.exportMyData = async (req, res) => {
  const a = actorOf(req);
  const Model = { User: Usermodel, Manager: Managermodel, Admin: AdminModel, SuperAdmin: SuperAdminModel }[a.model];
  const doc = await Model.findById(a.id).select("-password -__v").lean();
  const consents = await DpdpConsent.find({ organisation_id: a.orgId, "subject.id": a.id }).select("-__v").lean();
  audit(a, "data.exported");
  res.setHeader("Content-Disposition", `attachment; filename="my-personal-data.json"`);
  res.json({ exportedAt: new Date().toISOString(), profile: doc, consents });
};

// ───────────── super admin ─────────────
const superActor = (req) => ({ id: String(req.superAdmin._id), role: "super_admin", model: "SuperAdmin", orgId: String(req.superAdmin._id), name: nameOf(req.superAdmin) });

exports.adminGetSettings = async (req, res) => {
  const s = await DpdpSettings.findOne({ organisation_id: req.superAdmin._id }).lean();
  res.json({ success: true, settings: publicSettings(s) });
};

exports.adminUpdateSettings = async (req, res) => {
  const a = superActor(req);
  const b = req.body || {};
  const s = (await DpdpSettings.findOne({ organisation_id: a.orgId })) || new DpdpSettings({ organisation_id: a.orgId });

  if (typeof b.maskingEnabled === "boolean") s.maskingEnabled = b.maskingEnabled;
  if (typeof b.pinRequiredForDocuments === "boolean") s.pinRequiredForDocuments = b.pinRequiredForDocuments;
  if (b.unlockMinutes != null) s.unlockMinutes = Math.min(120, Math.max(1, Number(b.unlockMinutes) || 15));
  if (Array.isArray(b.unlockRoles)) s.unlockRoles = b.unlockRoles.filter((r) => ["super_admin", "admin", "senior_admin", "official", "manager", "senior_manager"].includes(r));
  if (b.requestSlaDays != null) s.requestSlaDays = Math.min(90, Math.max(1, Number(b.requestSlaDays) || 30));
  if (b.officer && typeof b.officer === "object") s.officer = { name: String(b.officer.name || "").slice(0, 120), email: String(b.officer.email || "").slice(0, 160), phone: String(b.officer.phone || "").slice(0, 40) };
  if (b.notice && typeof b.notice === "object") {
    if (b.notice.version && b.notice.version !== s.notice.version) s.notice.version = String(b.notice.version).slice(0, 20);
    if (typeof b.notice.url === "string") s.notice.url = b.notice.url.slice(0, 500);
    if (Array.isArray(b.notice.purposes))
      s.notice.purposes = b.notice.purposes.filter((p) => p?.key && p?.label).slice(0, 20).map((p) => ({ key: String(p.key).slice(0, 60), label: String(p.label).slice(0, 200), required: !!p.required }));
  }
  if (typeof b.enabled === "boolean") {
    if (b.enabled && !s.pinHash && !s.pinVersion) return res.status(400).json({ message: "Set the access PIN first, then switch DPDP protection on." });
    s.enabled = b.enabled;
  }
  await s.save();
  clearSettingsCache(a.orgId);
  audit(a, "settings.updated", { enabled: s.enabled, maskingEnabled: s.maskingEnabled, pinRequiredForDocuments: s.pinRequiredForDocuments });
  res.json({ success: true, settings: publicSettings(s) });
};

exports.adminSetPin = async (req, res) => {
  const a = superActor(req);
  const generate = req.body?.generate === true;
  let pin = String(req.body?.pin ?? "");
  if (generate) {
    do { pin = String(crypto.randomInt(100000, 1000000)); } while (validatePin(pin));
  } else {
    const err = validatePin(pin);
    if (err) return res.status(400).json({ message: err });
  }
  const s = (await DpdpSettings.findOne({ organisation_id: a.orgId })) || new DpdpSettings({ organisation_id: a.orgId });
  s.pinHash = await bcrypt.hash(pin, 12);
  s.pinVersion = (s.pinVersion || 0) + 1; // invalidates every unlock already issued
  s.pinSetAt = new Date();
  s.pinSetBy = a.id;
  await s.save();
  clearSettingsCache(a.orgId);
  await DpdpPinAttempt.deleteMany({ organisation_id: a.orgId });
  audit(a, generate ? "pin.generated" : "pin.changed", { version: s.pinVersion });
  // The PIN is returned ONCE (only when generated) so the Super Admin can hand it over; it is never stored in plain text.
  res.json({ success: true, pinConfigured: true, pinVersion: s.pinVersion, ...(generate ? { generatedPin: pin } : {}) });
};

exports.adminAccessLog = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 30);
  const q = { organisation_id: req.superAdmin._id, module: "dpdp" };
  if (req.query.action) q.action = String(req.query.action).slice(0, 60);
  const [items, total] = await Promise.all([
    AuditLog.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(q),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
};

exports.adminListRequests = async (req, res) => {
  const q = { organisation_id: req.superAdmin._id };
  if (req.query.status) q.status = String(req.query.status);
  const requests = await DpdpRequest.find(q).sort({ status: 1, dueAt: 1 }).limit(200).lean();
  const now = Date.now();
  res.json({ success: true, requests: requests.map((r) => ({ ...r, overdue: ["open", "in_progress"].includes(r.status) && new Date(r.dueAt).getTime() < now })) });
};

exports.adminUpdateRequest = async (req, res) => {
  const a = superActor(req);
  const { status, resolution } = req.body || {};
  if (!["in_progress", "resolved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  if (["resolved", "rejected"].includes(status) && !String(resolution || "").trim()) return res.status(400).json({ message: "Add a resolution note" });
  const r = await DpdpRequest.findOne({ _id: req.params.id, organisation_id: a.orgId });
  if (!r) return res.status(404).json({ message: "Request not found" });
  r.status = status;
  if (resolution != null) r.resolution = String(resolution).slice(0, 4000);
  r.handledBy = { id: a.id, name: a.name };
  r.resolvedAt = ["resolved", "rejected"].includes(status) ? new Date() : null;
  await r.save();
  audit(a, "request.updated", { requestId: r._id, status }, { id: r.requester.id, model: r.requester.model, name: r.requester.name });
  res.json({ success: true, request: r });
};
