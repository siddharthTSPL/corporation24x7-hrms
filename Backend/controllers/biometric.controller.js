const crypto = require("crypto");
const ExcelJS = require("exceljs");
const BiometricDevice = require("../Models/biometricdevice.model");
const BiometricPunch = require("../Models/biometricpunch.model");
const BiometricUserMap = require("../Models/biometricusermap.model");
const BiometricOrgKey = require("../Models/biometricorgkey.model");
const Attendance = require("../Models/attendance.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const AdminUser = require("../Models/Admin.model");
const { sha256 } = require("../middleware/auth/biometricagent.middleware");
const { updateSummary } = require("../automatic/monthattendanceupdate");
const { computeLateStanding, applyLatePenaltyToStatus, refreshLateStanding, lateForgiveMinutes } = require("../utils/Laterule.utils");
const { startOfISTDay } = require("../utils/Istdate.utils");
const {
  resolveEmployeeShift,
  evaluateCheckinWindow,
  evaluateCheckoutWindow,
  calculateFaceStatus,
} = require("../utils/shift.utils");

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SESSION_MINUTES = 5; // two punches closer than this = same scan, not a check-out
const MODELS = [
  { model: User, onModel: "User", role: "employee" },
  { model: Manager, onModel: "Manager", role: "manager" },
  { model: AdminUser, onModel: "Admin", role: "admin" },
];
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const orgOf = (req) => req.admin.organisation_id;

// ---------- empid -> person ----------
async function findPersonByEmpid(organisation_id, empid) {
  if (!empid) return null;
  const rx = new RegExp(`^${esc(String(empid).trim())}$`, "i");
  for (const m of MODELS) {
    const doc = await m.model.findOne({ organisation_id, empid: rx }).select("_id empid f_name l_name").lean();
    if (doc) return { ...m, doc };
  }
  return null;
}

// Apply mapping to one map row and to its stored punches.
async function applyMapping(mapRow, person, by) {
  mapRow.empid = person.doc.empid;
  mapRow.employee = person.doc._id;
  mapRow.onModel = person.onModel;
  mapRow.role = person.role;
  mapRow.mappedBy = by;
  await mapRow.save();
  await BiometricPunch.updateMany(
    { device: mapRow.device, deviceUserId: mapRow.deviceUserId },
    { empid: person.doc.empid, employee: person.doc._id, onModel: person.onModel, role: person.role, processed: false, processNote: "" }
  );
}

// Device user id == HRMS empid  -> map automatically.
async function autoMapDevice(device) {
  const rows = await BiometricUserMap.find({ device: device._id, employee: null });
  let mapped = 0;
  for (const row of rows) {
    const person = await findPersonByEmpid(device.organisation_id, row.deviceUserId);
    if (person) { await applyMapping(row, person, "auto"); mapped++; }
  }
  return mapped;
}

// ---------- punches -> Attendance ----------
async function processEmployeeDay(organisation_id, employee, onModel, role, dayStart) {
  const punches = await BiometricPunch.find({
    organisation_id, employee,
    punchTime: { $gte: dayStart, $lt: new Date(dayStart.getTime() + DAY_MS) },
  }).sort({ punchTime: 1 }).lean();
  if (!punches.length) return "no punches";

  let attendance = await Attendance.findOne({ organisation_id, employee, role, date: dayStart });
  // Another channel already owns this day - leave it, keep raw punches only.
  if (attendance && attendance.source !== "biometric" && attendance.source !== "agent")
    return `day already recorded via ${attendance.source}`;

  const Model = MODELS.find((m) => m.onModel === onModel).model;
  const personDoc = await Model.findById(employee).select("f_name l_name shift").lean();
  if (!personDoc) return "employee not found";
  const shift = await resolveEmployeeShift(personDoc, organisation_id);

  const first = punches[0];
  const last = punches[punches.length - 1];
  const checkIn = first.punchTime;
  const gate = (await BiometricDevice.findById(first.device).select("name serialNumber").lean());
  const gateName = gate ? (gate.name || gate.serialNumber) : null;

  const { isLate, lateMinutes } = evaluateCheckinWindow(shift, checkIn);
  const { lateCountInMonth, latePenalty } = await computeLateStanding({
    organisation_id, employee, role, date: dayStart, isLate, lateMinutes,
  });

  const wasCheckedOut = !!attendance?.checkOut;
  if (!attendance) {
    attendance = new Attendance({ organisation_id, employee, onModel, role, date: dayStart });
  }
  attendance.source = "biometric";
  attendance.checkIn = checkIn;
  attendance.shift = shift._id;
  attendance.isLate = isLate;
  attendance.lateMinutes = lateMinutes;
  attendance.lateCountInMonth = lateCountInMonth;
  attendance.latePenalty = latePenalty;
  attendance.checkInGate = gateName;

  const sessionMinutes = Math.round((last.punchTime - first.punchTime) / 60000);
  if (sessionMinutes >= MIN_SESSION_MINUTES) {
    const lastGate = await BiometricDevice.findById(last.device).select("name serialNumber").lean();
    const { remark, isOvertime, overtimeMinutes } = evaluateCheckoutWindow(shift, last.punchTime, checkIn);
    attendance.checkOut = last.punchTime;
    attendance.checkOutGate = lastGate ? (lastGate.name || lastGate.serialNumber) : null;
    attendance.activeMinutes = sessionMinutes;
    const standing = await refreshLateStanding(attendance);
    const forgive = lateForgiveMinutes(attendance, shift, standing);
    attendance.status = applyLatePenaltyToStatus(attendance, calculateFaceStatus(sessionMinutes + forgive, shift));
    attendance.checkoutRemark = remark;
    attendance.overtimeMinutes = isOvertime ? overtimeMinutes : 0;
    await attendance.save();
    // First time this day closes: update monthly summary. Re-runs rely on the
    // nightly reconcile so the same day is never counted twice.
    if (!wasCheckedOut) await updateSummary(attendance);
    return "checked in + out";
  }
  attendance.checkOut = undefined;
  await attendance.save();
  return "checked in";
}

async function processPending(organisation_id, filter = {}) {
  const pending = await BiometricPunch.find({
    organisation_id, processed: false, employee: { $ne: null }, ...filter,
  }).select("employee onModel role punchTime").lean();
  const days = new Map();
  for (const p of pending) {
    const day = startOfISTDay(p.punchTime);
    days.set(`${p.employee}|${day.getTime()}`, { p, day });
  }
  let ok = 0;
  for (const { p, day } of days.values()) {
    let note;
    try { note = await processEmployeeDay(organisation_id, p.employee, p.onModel, p.role, day); }
    catch (e) { note = `error: ${e.message}`; }
    await BiometricPunch.updateMany(
      { organisation_id, employee: p.employee, punchTime: { $gte: day, $lt: new Date(day.getTime() + DAY_MS) } },
      { processed: true, processNote: note }
    );
    if (!note.startsWith("error")) ok++;
  }
  return { days: days.size, ok };
}

// =====================  AGENT ENDPOINTS  =====================

// POST /biometric/agent/device-info   (agent read the machine: serial, firmware ...)
const agentDeviceInfo = async (req, res) => {
  const organisation_id = req.agentOrg;
  const d = req.body || {};
  const serial = String(d.serialNumber || "").trim();
  if (!serial) return res.status(400).json({ message: "serialNumber is required" });

  const set = {
    lastSeenAt: new Date(),
    ...(d.manufacturer && { manufacturer: d.manufacturer }),
    ...(d.model && { model: d.model }),
    ...(d.firmwareVersion && { firmwareVersion: d.firmwareVersion }),
    ...(d.platform && { platform: d.platform }),
    ...(d.connectionType && { connectionType: d.connectionType }),
    ...(d.ip && { ip: d.ip }),
    ...(d.port && { port: Number(d.port) }),
    ...(d.agentHost && { agentHost: d.agentHost }),
    ...(d.deviceTime && { deviceTime: new Date(d.deviceTime) }),
  };
  for (const k of ["userCount", "fingerCount", "logCount", "logCapacity"]) if (Number.isFinite(Number(d[k]))) set[k] = Number(d[k]);

  const device = await BiometricDevice.findOneAndUpdate(
    { organisation_id, serialNumber: serial },
    { $set: set, $setOnInsert: { organisation_id, serialNumber: serial, name: d.name || `Device ${serial}` } },
    { upsert: true, returnDocument: "after" }
  );
  res.json({ message: "Device registered", deviceId: device._id, serialNumber: device.serialNumber, isActive: device.isActive });
};

// POST /biometric/agent/users   { serialNumber, users:[{userId,name,cardNumber}] }
const agentUsers = async (req, res) => {
  const organisation_id = req.agentOrg;
  const { serialNumber, users } = req.body || {};
  const device = await BiometricDevice.findOne({ organisation_id, serialNumber: String(serialNumber || "").trim() });
  if (!device) return res.status(404).json({ message: "Device not registered. Send device-info first." });
  if (!Array.isArray(users)) return res.status(400).json({ message: "users[] required" });

  const ops = users.filter((u) => u && u.userId !== undefined && u.userId !== "").map((u) => ({
    updateOne: {
      filter: { device: device._id, deviceUserId: String(u.userId).trim() },
      update: {
        $set: { deviceUserName: u.name || "", cardNumber: u.cardNumber ? String(u.cardNumber) : "" },
        $setOnInsert: { organisation_id, device: device._id, deviceUserId: String(u.userId).trim() },
      },
      upsert: true,
    },
  }));
  if (ops.length) await BiometricUserMap.bulkWrite(ops, { ordered: false });
  const autoMapped = await autoMapDevice(device);
  res.json({ message: "Users synced", received: ops.length, autoMapped });
};

// POST /biometric/agent/punches   { serialNumber, punches:[{userId,time,verifyMode,state}] }
const agentPunches = async (req, res) => {
  const organisation_id = req.agentOrg;
  const { serialNumber, punches } = req.body || {};
  const device = await BiometricDevice.findOne({ organisation_id, serialNumber: String(serialNumber || "").trim() });
  if (!device) return res.status(404).json({ message: "Device not registered. Send device-info first." });
  if (!device.isActive) return res.status(403).json({ message: "This device is disabled by the admin" });
  if (!Array.isArray(punches)) return res.status(400).json({ message: "punches[] required" });

  const maps = await BiometricUserMap.find({ device: device._id, employee: { $ne: null } }).lean();
  const byUser = new Map(maps.map((m) => [m.deviceUserId, m]));

  const ops = [];
  for (const p of punches) {
    const t = new Date(p.time);
    if (!p || p.userId === undefined || isNaN(t)) continue;
    const uid = String(p.userId).trim();
    const m = byUser.get(uid);
    ops.push({
      updateOne: {
        filter: { device: device._id, deviceUserId: uid, punchTime: t },
        update: {
          $setOnInsert: {
            organisation_id, device: device._id, deviceSerial: device.serialNumber, deviceUserId: uid, punchTime: t,
            verifyMode: p.verifyMode ? String(p.verifyMode) : "",
            inOutState: Number.isFinite(Number(p.state)) ? Number(p.state) : null,
            empid: m?.empid || "", employee: m?.employee || null, onModel: m?.onModel || "User", role: m?.role || "employee",
            processed: false,
          },
        },
        upsert: true,
      },
    });
  }
  let inserted = 0;
  for (let i = 0; i < ops.length; i += 1000) {
    const r = await BiometricPunch.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
    inserted += r.upsertedCount || 0;
  }
  await BiometricDevice.updateOne({ _id: device._id }, { lastSyncAt: new Date(), lastSeenAt: new Date(), lastSyncCount: inserted });
  const processed = await processPending(organisation_id, { device: device._id });
  res.json({ message: "Punches received", received: ops.length, newPunches: inserted, attendance: processed });
};

// GET /biometric/agent/config  -> what the agent needs to know (device list + known mappings)
const agentConfig = async (req, res) => {
  const devices = await BiometricDevice.find({ organisation_id: req.agentOrg, isActive: true })
    .select("serialNumber name ip port connectionType").lean();
  res.json({ devices, serverTime: new Date() });
};

// =====================  ADMIN ENDPOINTS  =====================

const listDevices = async (req, res) => {
  const devices = await BiometricDevice.find({ organisation_id: orgOf(req) }).sort({ createdAt: -1 }).lean();
  const ids = devices.map((d) => d._id);
  const [mapped, unmapped] = await Promise.all([
    BiometricUserMap.aggregate([{ $match: { device: { $in: ids }, employee: { $ne: null } } }, { $group: { _id: "$device", n: { $sum: 1 } } }]),
    BiometricUserMap.aggregate([{ $match: { device: { $in: ids }, employee: null } }, { $group: { _id: "$device", n: { $sum: 1 } } }]),
  ]);
  const mm = new Map(mapped.map((x) => [String(x._id), x.n]));
  const um = new Map(unmapped.map((x) => [String(x._id), x.n]));
  const key = await BiometricOrgKey.findOne({ organisation_id: orgOf(req) }).lean();
  res.json({
    devices: devices.map((d) => ({ ...d, mappedUsers: mm.get(String(d._id)) || 0, unmappedUsers: um.get(String(d._id)) || 0 })),
    agentKey: key ? { rotatedAt: key.rotatedAt, lastUsedAt: key.lastUsedAt } : null,
  });
};

// Pre-register a machine by serial (e.g. 2405021163) before the agent reads it.
const createDevice = async (req, res) => {
  const { serialNumber, name, location, model, manufacturer } = req.body || {};
  if (!serialNumber || !String(serialNumber).trim()) return res.status(400).json({ message: "serialNumber is required" });
  try {
    const device = await BiometricDevice.create({
      organisation_id: orgOf(req), serialNumber: String(serialNumber).trim(),
      name: name || "", location: location || "", model: model || "", manufacturer: manufacturer || "",
    });
    res.status(201).json({ device });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "A device with this serial number already exists" });
    throw e;
  }
};

const updateDevice = async (req, res) => {
  const allowed = ["name", "location", "isActive", "punchMode", "model", "manufacturer"];
  const set = {};
  for (const k of allowed) if (req.body[k] !== undefined) set[k] = req.body[k];
  const device = await BiometricDevice.findOneAndUpdate({ _id: req.params.id, organisation_id: orgOf(req) }, { $set: set }, { returnDocument: "after" });
  if (!device) return res.status(404).json({ message: "Device not found" });
  res.json({ device });
};

const deleteDevice = async (req, res) => {
  const device = await BiometricDevice.findOneAndDelete({ _id: req.params.id, organisation_id: orgOf(req) });
  if (!device) return res.status(404).json({ message: "Device not found" });
  // Attendance already created stays; raw punches + mappings of this device are removed.
  await Promise.all([BiometricUserMap.deleteMany({ device: device._id }), BiometricPunch.deleteMany({ device: device._id })]);
  res.json({ message: "Device removed" });
};

// Generate/rotate the org agent key and return the ready-to-use agent-config.json
const downloadAgentConfig = async (req, res) => {
  const organisation_id = orgOf(req);
  const secret = crypto.randomBytes(24).toString("hex");
  await BiometricOrgKey.findOneAndUpdate(
    { organisation_id },
    { keyHash: sha256(secret), rotatedAt: new Date() },
    { upsert: true, returnDocument: "after" }
  );
  const serverUrl = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const cfg = {
    serverUrl,
    agentKey: `${organisation_id}.${secret}`,
    syncIntervalMinutes: 5,
    lan: { scanSubnet: "auto", port: 4370, knownDevices: [] },
    usbDrive: { enabled: true, fileNames: ["*.dat", "*.csv", "*.xls", "*.xlsx", "*.txt"] },
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="agent-config.json"');
  res.send(JSON.stringify(cfg, null, 2));
};

const listDeviceUsers = async (req, res) => {
  const device = await BiometricDevice.findOne({ _id: req.params.id, organisation_id: orgOf(req) }).lean();
  if (!device) return res.status(404).json({ message: "Device not found" });
  const users = await BiometricUserMap.find({ device: device._id }).sort({ deviceUserId: 1 }).lean();
  res.json({ device, users });
};

// PUT /biometric/devices/:id/users/:deviceUserId   { empid }   ("" clears the mapping)
const mapDeviceUser = async (req, res) => {
  const organisation_id = orgOf(req);
  const device = await BiometricDevice.findOne({ _id: req.params.id, organisation_id });
  if (!device) return res.status(404).json({ message: "Device not found" });
  const row = await BiometricUserMap.findOne({ device: device._id, deviceUserId: req.params.deviceUserId });
  if (!row) return res.status(404).json({ message: "Device user not found" });

  const empid = String(req.body.empid || "").trim();
  if (!empid) {
    row.empid = ""; row.employee = null; row.mappedBy = null; await row.save();
    await BiometricPunch.updateMany({ device: device._id, deviceUserId: row.deviceUserId }, { empid: "", employee: null });
    return res.json({ message: "Mapping cleared", user: row });
  }
  const person = await findPersonByEmpid(organisation_id, empid);
  if (!person) return res.status(404).json({ message: `No employee with empid "${empid}" in this organisation` });
  await applyMapping(row, person, "manual");
  const processed = await processPending(organisation_id, { device: device._id });
  res.json({ message: "Mapped", user: row, attendance: processed });
};

const autoMap = async (req, res) => {
  const device = await BiometricDevice.findOne({ _id: req.params.id, organisation_id: orgOf(req) });
  if (!device) return res.status(404).json({ message: "Device not found" });
  const mapped = await autoMapDevice(device);
  const processed = await processPending(orgOf(req), { device: device._id });
  res.json({ message: `Auto-mapped ${mapped} user(s) where device user id equals empid`, mapped, attendance: processed });
};

const reprocess = async (req, res) => {
  const organisation_id = orgOf(req);
  const { from, to } = req.query;
  const f = {};
  if (from || to) {
    f.punchTime = {};
    if (from) f.punchTime.$gte = startOfISTDay(new Date(from));
    if (to) f.punchTime.$lt = new Date(startOfISTDay(new Date(to)).getTime() + DAY_MS);
  }
  await BiometricPunch.updateMany({ organisation_id, employee: { $ne: null }, ...f }, { processed: false });
  const processed = await processPending(organisation_id, f);
  res.json({ message: "Re-processed", ...processed });
};

function punchFilter(req) {
  const q = { organisation_id: orgOf(req) };
  const { from, to, empid, device, unmapped } = req.query;
  if (from || to) {
    q.punchTime = {};
    if (from) q.punchTime.$gte = startOfISTDay(new Date(from));
    if (to) q.punchTime.$lt = new Date(startOfISTDay(new Date(to)).getTime() + DAY_MS);
  }
  if (empid) q.empid = new RegExp(`^${esc(empid.trim())}$`, "i");
  if (device) q.device = device;
  if (unmapped === "true") q.employee = null;
  return q;
}

const listPunches = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const q = punchFilter(req);
  const [rows, total] = await Promise.all([
    BiometricPunch.find(q).sort({ punchTime: -1 }).skip((page - 1) * limit).limit(limit).populate("device", "name serialNumber").lean(),
    BiometricPunch.countDocuments(q),
  ]);
  res.json({ total, page, limit, punches: rows });
};

// GET /biometric/punches/download?format=xlsx|csv&from=&to=&empid=&device=
const downloadPunches = async (req, res) => {
  const q = punchFilter(req);
  const rows = await BiometricPunch.find(q).sort({ punchTime: 1 }).limit(200000).populate("device", "name serialNumber").lean();
  const names = new Map();
  const empIds = [...new Set(rows.filter((r) => r.employee).map((r) => String(r.employee)))];
  for (const m of MODELS) {
    const docs = await m.model.find({ _id: { $in: empIds } }).select("f_name l_name").lean();
    docs.forEach((d) => names.set(String(d._id), `${d.f_name || ""} ${d.l_name || ""}`.trim()));
  }
  const fmt = (d) => new Date(d.getTime() + 330 * 60000).toISOString().replace("T", " ").slice(0, 19); // IST
  const data = rows.map((r) => ({
    empid: r.empid || "", name: r.employee ? names.get(String(r.employee)) || "" : "",
    deviceUserId: r.deviceUserId, punchTimeIST: fmt(r.punchTime),
    device: r.device?.name || r.deviceSerial, serial: r.deviceSerial, verify: r.verifyMode,
    mapped: r.employee ? "Yes" : "No", attendance: r.processNote || (r.processed ? "processed" : "pending"),
  }));

  if ((req.query.format || "xlsx") === "csv") {
    const head = ["Emp ID", "Name", "Device User ID", "Punch Time (IST)", "Device", "Serial", "Verify", "Mapped", "Attendance"];
    const csv = [head.join(",")].concat(
      data.map((d) => [d.empid, d.name, d.deviceUserId, d.punchTimeIST, d.device, d.serial, d.verify, d.mapped, d.attendance]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    ).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="biometric-punches.csv"');
    return res.send(csv);
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Punches");
  ws.columns = [
    { header: "Emp ID", key: "empid", width: 14 }, { header: "Name", key: "name", width: 24 },
    { header: "Device User ID", key: "deviceUserId", width: 16 }, { header: "Punch Time (IST)", key: "punchTimeIST", width: 22 },
    { header: "Device", key: "device", width: 22 }, { header: "Serial", key: "serial", width: 16 },
    { header: "Verify", key: "verify", width: 12 }, { header: "Mapped", key: "mapped", width: 9 },
    { header: "Attendance", key: "attendance", width: 22 },
  ];
  ws.addRows(data);
  ws.getRow(1).font = { bold: true };
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="biometric-punches.xlsx"');
  await wb.xlsx.write(res);
  res.end();
};

// GET /biometric/devices/:id/config/download -> device info + user<->empid mapping backup (JSON)
const downloadDeviceConfig = async (req, res) => {
  const device = await BiometricDevice.findOne({ _id: req.params.id, organisation_id: orgOf(req) }).lean();
  if (!device) return res.status(404).json({ message: "Device not found" });
  const users = await BiometricUserMap.find({ device: device._id }).sort({ deviceUserId: 1 }).lean();
  const out = {
    exportedAt: new Date(),
    organisation: String(device.organisation_id),
    device: {
      serialNumber: device.serialNumber, name: device.name, location: device.location, manufacturer: device.manufacturer,
      model: device.model, firmwareVersion: device.firmwareVersion, platform: device.platform,
      connectionType: device.connectionType, ip: device.ip, port: device.port, punchMode: device.punchMode,
      userCount: device.userCount, logCount: device.logCount, lastSyncAt: device.lastSyncAt,
    },
    users: users.map((u) => ({ deviceUserId: u.deviceUserId, deviceUserName: u.deviceUserName, cardNumber: u.cardNumber, empid: u.empid, mappedBy: u.mappedBy })),
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="device-${device.serialNumber}-config.json"`);
  res.send(JSON.stringify(out, null, 2));
};

// POST /biometric/import   multipart/JSON fallback: admin pastes/uploads pen-drive rows parsed in the browser
// body: { serialNumber, punches:[{userId,time}] }
const importPunches = async (req, res) => {
  req.agentOrg = orgOf(req);
  const { serialNumber } = req.body || {};
  if (serialNumber) {
    await BiometricDevice.updateOne(
      { organisation_id: req.agentOrg, serialNumber: String(serialNumber).trim() },
      { $setOnInsert: { organisation_id: req.agentOrg, serialNumber: String(serialNumber).trim(), name: `Device ${serialNumber}`, connectionType: "manual_import" } },
      { upsert: true }
    );
  }
  return agentPunches(req, res);
};

module.exports = {
  agentDeviceInfo, agentUsers, agentPunches, agentConfig,
  listDevices, createDevice, updateDevice, deleteDevice, downloadAgentConfig,
  listDeviceUsers, mapDeviceUser, autoMap, reprocess,
  listPunches, downloadPunches, downloadDeviceConfig, importPunches,
};