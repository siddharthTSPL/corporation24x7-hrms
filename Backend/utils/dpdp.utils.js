const jwt = require("jsonwebtoken");
const DpdpSettings = require("../Models/dpdpSettings.model");

// ───────────────────────── masking ─────────────────────────
const digits = (v) => String(v ?? "").replace(/\D/g, "");
const tail = (v, keep = 4) => {
  const s = String(v ?? "");
  if (!s) return s;
  if (s.length <= keep) return "X".repeat(s.length);
  return "X".repeat(s.length - keep) + s.slice(-keep);
};

const maskAadhaar = (v) => {
  const d = digits(v);
  if (d.length < 5) return tail(v);
  return `XXXX XXXX ${d.slice(-4)}`;
};
const maskPan = (v) => {
  const s = String(v ?? "").toUpperCase();
  return s.length === 10 ? `XXXXX${s.slice(5, 9)}X` : tail(s);
};
const maskPhone = (v) => tail(String(v ?? "").replace(/\s+/g, ""), 4);
const maskAccount = (v) => tail(v, 4);
const maskIfsc = (v) => {
  const s = String(v ?? "");
  return s.length > 4 ? s.slice(0, 4) + "X".repeat(s.length - 4) : tail(s, 0);
};
const maskAddress = (v) => (v ? "XXXXXXXXXX (hidden)" : v);
const maskPincode = (v) => tail(v, 2);

// Strong identifiers: masked wherever they appear.
const STRONG = {
  aadhaar_number: maskAadhaar,
  pan_number: maskPan,
  account_number: maskAccount,
  ifsc_code: maskIfsc,
  personal_contact: maskPhone,
  e_contact: maskPhone,
};
// Generic keys: masked only inside an object that looks like a person record.
const PERSON_ONLY = { address: maskAddress, pincode: maskPincode };
const PERSON_MARKERS = ["aadhaar_number", "pan_number", "account_number", "personal_contact", "work_email", "e_contact"];
// KYC file links: removed (not masked) until the PIN is entered.
const LOCK_KEYS = new Set(["aadhaar_card", "pan_card"]);

const looksMasked = (v) => typeof v === "string" && /[X*•]{3,}/.test(v);
const isPerson = (o) => PERSON_MARKERS.some((k) => Object.prototype.hasOwnProperty.call(o, k));

function maskTree(node, actorId, inheritedOwn = false) {
  if (Array.isArray(node)) return node.map((n) => maskTree(n, actorId, inheritedOwn));
  if (!node || typeof node !== "object") return node;

  const own = inheritedOwn || String(node._id || node.id || "") === String(actorId);
  const person = isPerson(node);
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (!own && STRONG[k] && (typeof v === "string" || typeof v === "number") && v !== "") out[k] = STRONG[k](v);
    else if (!own && person && PERSON_ONLY[k] && typeof v === "string") out[k] = PERSON_ONLY[k](v);
    else if (!own && LOCK_KEYS.has(k) && v) out[k] = null;
    else out[k] = maskTree(v, actorId, own);
  }
  if (!own && Object.keys(node).some((k) => LOCK_KEYS.has(k) && node[k])) out.kycLocked = true;
  return out;
}

// Stops "edit employee" forms from writing a masked placeholder back over
// the real value (the form was pre-filled with the masked text).
function stripMaskedWrites(body) {
  if (!body || typeof body !== "object") return;
  const keys = new Set([...Object.keys(STRONG), ...Object.keys(PERSON_ONLY)]);
  for (const k of keys) if (looksMasked(body[k])) delete body[k];
}

// ───────────────────────── actor / token ─────────────────────────
function readAuthToken(req) {
  let t = req.cookies?.token;
  if (!t) {
    const h = req.headers?.authorization;
    if (typeof h === "string" && h.startsWith("Bearer ")) t = h.slice(7);
  }
  return t || null;
}

const MODEL_BY_ROLE = {
  super_admin: "SuperAdmin",
  admin: "Admin", senior_admin: "Admin",
  manager: "Manager", senior_manager: "Manager", official: "Manager",
  employee: "User",
};

// Light actor lookup from the (already signature-checked) JWT. Route-level
// auth middleware still does the full account validation; this is only used
// for masking decisions and for binding the unlock token to a person.
function getActor(req) {
  if (req.actor?.id) {
    return { id: String(req.actor.id), role: req.actor.role, orgId: String(req.actor.organisation_id), model: req.actor.recipientModel };
  }
  const token = readAuthToken(req);
  if (!token) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    const id = d.superadminid || d.adminid || d.managerid || d._id || d.id || d.userId;
    const orgId = d.role === "super_admin" ? d.superadminid : d.organisation_id;
    if (!id || !orgId) return null;
    return { id: String(id), role: d.role, orgId: String(orgId), model: MODEL_BY_ROLE[d.role] || "User" };
  } catch {
    return null;
  }
}

const UNLOCK_SECRET = () => `${process.env.JWT_SECRET}:dpdp-unlock`;

function signUnlockToken({ actor, pinVersion, minutes }) {
  return jwt.sign({ typ: "dpdp-unlock", sub: actor.id, org: actor.orgId, v: pinVersion }, UNLOCK_SECRET(), { expiresIn: `${minutes}m` });
}

function readUnlockToken(req) {
  const t = req.headers?.["x-dpdp-token"] || req.cookies?.dpdp_unlock;
  if (!t || typeof t !== "string") return null;
  try {
    const d = jwt.verify(t, UNLOCK_SECRET());
    return d.typ === "dpdp-unlock" ? d : null;
  } catch {
    return null;
  }
}

function isUnlocked(req, actor, settings) {
  const d = readUnlockToken(req);
  return !!(d && actor && settings && d.sub === actor.id && d.org === actor.orgId && d.v === settings.pinVersion);
}

// ───────────────────────── settings cache ─────────────────────────
const cache = new Map();
const TTL = 30 * 1000;

async function getSettings(orgId) {
  const key = String(orgId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await DpdpSettings.findOne({ organisation_id: orgId }).lean();
  cache.set(key, { at: Date.now(), value });
  return value;
}
const clearSettingsCache = (orgId) => cache.delete(String(orgId));

const WEAK = new Set(["000000", "111111", "123456", "654321", "121212", "112233", "123123", "000111", "1234567", "12345678"]);
function validatePin(pin) {
  const p = String(pin ?? "");
  if (!/^\d{6,8}$/.test(p)) return "PIN must be 6 to 8 digits";
  if (WEAK.has(p) || /^(\d)\1+$/.test(p)) return "PIN is too easy to guess. Choose a less predictable PIN";
  return null;
}

const nameOf = (u) => (u ? [u.f_name, u.l_name].filter(Boolean).join(" ") || u.name || u.organisation_name || "" : "");

module.exports = {
  nameOf, maskTree, stripMaskedWrites, getActor, signUnlockToken, readUnlockToken, isUnlocked,
  getSettings, clearSettingsCache, validatePin, MODEL_BY_ROLE,
  maskAadhaar, maskPan, maskPhone, maskAccount, maskIfsc,
};
