/* TorchX Biometric Agent
 *  - LAN mode : auto-scans the local network (or a cable-linked machine) for biometric
 *               devices speaking the ZK protocol (port 4370), reads serial/firmware/users/punches.
 *  - USB drive: when a pen drive that holds an exported attendance file (.dat/.csv/.xls/.xlsx/.txt)
 *               is plugged into the laptop, the file is read and imported automatically.
 *  Everything is pushed to the HRMS server using agent-config.json (downloaded from TorchX Management).
 *
 *  Usage:  node agent.js          (keeps running, syncs every N minutes)
 *          node agent.js --once   (one sync and exit)
 *          node agent.js --scan   (only list devices found, nothing sent)
 */
const fs = require("fs");
const os = require("os");
const net = require("net");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ARGS = process.argv.slice(2);
const CONFIG_PATH = path.join(__dirname, "agent-config.json");
const STATE_PATH = path.join(__dirname, "agent-state.json");
const BATCH = 500; // keep each request under the server's default body limit
const log = (...a) => console.log(new Date().toISOString(), ...a);

if (!fs.existsSync(CONFIG_PATH)) {
  console.error("agent-config.json not found. Download it from TorchX Management > Biometric Devices and put it next to agent.js");
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) : { lastPunch: {}, files: {} };
const saveState = () => fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
const TZ = cfg.deviceTimezone || "+05:30"; // device clock timezone

// ---------------- server calls ----------------
async function api(method, url, body) {
  const res = await fetch(cfg.serverUrl.replace(/\/$/, "") + url, {
    method,
    headers: { "Content-Type": "application/json", "x-agent-key": cfg.agentKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { message: text }; }
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${json.message || ""}`);
  return json;
}

async function pushPunches(serial, punches) {
  let sent = 0;
  for (let i = 0; i < punches.length; i += BATCH) {
    const r = await api("POST", "/biometric/agent/punches", { serialNumber: serial, punches: punches.slice(i, i + BATCH) });
    sent += r.newPunches || 0;
  }
  return sent;
}

// ---------------- LAN discovery ----------------
function localSubnets() {
  if (cfg.lan && cfg.lan.scanSubnet && cfg.lan.scanSubnet !== "auto") return [cfg.lan.scanSubnet]; // e.g. "192.168.1"
  const out = new Set();
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === "IPv4" && !i.internal) out.add(i.address.split(".").slice(0, 3).join("."));
  return [...out];
}

function probe(ip, port, timeout = 400) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (ok) => { s.destroy(); resolve(ok); };
    s.setTimeout(timeout);
    s.once("connect", () => done(true));
    s.once("timeout", () => done(false));
    s.once("error", () => done(false));
    s.connect(port, ip);
  });
}

async function discoverLan() {
  const port = (cfg.lan && cfg.lan.port) || 4370;
  const found = new Set((cfg.lan && cfg.lan.knownDevices) || []);
  for (const subnet of localSubnets()) {
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
    for (let i = 0; i < ips.length; i += 64) {
      const hits = await Promise.all(ips.slice(i, i + 64).map(async (ip) => ((await probe(ip, port)) ? ip : null)));
      hits.filter(Boolean).forEach((ip) => found.add(ip));
    }
  }
  return [...found];
}

async function safe(fn, fallback = "") {
  try { const v = await fn(); return v === undefined || v === null ? fallback : v; } catch { return fallback; }
}

async function readLanDevice(ip) {
  const ZKLib = require("node-zklib");
  const port = (cfg.lan && cfg.lan.port) || 4370;
  const zk = new ZKLib(ip, port, 10000, 4000);
  await zk.createSocket();
  try {
    const info = await safe(() => zk.getInfo(), {});
    const serial = String(await safe(() => zk.getSerialNumber()) || "").replace(/[^\x20-\x7E]/g, "").replace(/^SerialNumber=/i, "").trim();
    const fw = String(await safe(() => zk.getDeviceVersion()) || "").replace(/[^\x20-\x7E]/g, "").trim();
    const platform = String(await safe(() => zk.getPlatform()) || "").replace(/[^\x20-\x7E]/g, "").replace(/^~?Platform=/i, "").trim();
    const name = String(await safe(() => zk.getDeviceName()) || "").replace(/[^\x20-\x7E]/g, "").replace(/^~?DeviceName=/i, "").trim();
    const devTime = await safe(() => zk.getTime(), null);
    const users = (await safe(() => zk.getUsers(), { data: [] })).data || [];
    const logs = (await safe(() => zk.getAttendances(), { data: [] })).data || [];
    return { ip, port, serial, fw, platform, name, devTime, info, users, logs };
  } finally {
    await safe(() => zk.disconnect());
  }
}

const fmtLocal = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${TZ}`;
};

async function syncLanDevice(ip) {
  const d = await readLanDevice(ip);
  if (!d.serial) { log(`[LAN ${ip}] answered but gave no serial number - skipped`); return; }
  const manufacturer = /secureye/i.test(d.name) ? "Secureye" : "";
  log(`[LAN ${ip}] serial=${d.serial} name=${d.name || "-"} firmware=${d.fw || "-"} users=${d.users.length} logs=${d.logs.length}`);
  if (ARGS.includes("--scan")) return;

  await api("POST", "/biometric/agent/device-info", {
    serialNumber: d.serial, manufacturer, model: d.name, firmwareVersion: d.fw, platform: d.platform,
    connectionType: "lan", ip: d.ip, port: d.port, agentHost: os.hostname(),
    deviceTime: d.devTime ? new Date(d.devTime).toISOString() : undefined,
    userCount: d.info.userCounts ?? d.users.length, logCount: d.info.logCounts ?? d.logs.length, logCapacity: d.info.logCapacity,
  });
  await api("POST", "/biometric/agent/users", {
    serialNumber: d.serial,
    users: d.users.map((u) => ({ userId: u.userId || u.uid, name: u.name, cardNumber: u.cardno })),
  });
  const since = state.lastPunch[d.serial] ? new Date(state.lastPunch[d.serial]).getTime() - 24 * 3600 * 1000 : 0;
  const punches = d.logs
    .map((l) => ({ userId: l.deviceUserId, time: fmtLocal(new Date(l.recordTime)), raw: new Date(l.recordTime).getTime() }))
    .filter((p) => p.raw >= since)
    .map(({ userId, time }) => ({ userId, time }));
  const n = await pushPunches(d.serial, punches);
  const newest = d.logs.reduce((m, l) => Math.max(m, new Date(l.recordTime).getTime()), 0);
  if (newest) state.lastPunch[d.serial] = new Date(newest).toISOString();
  saveState();
  log(`[LAN ${ip}] pushed ${punches.length} punches (${n} new)`);
}

// ---------------- USB pen-drive import ----------------
function removableRoots() {
  const roots = [];
  try {
    if (process.platform === "win32") {
      const out = execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DriveType=2\\" | Select-Object -ExpandProperty DeviceID"',
        { encoding: "utf8" }
      );
      out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((d) => roots.push(d + "\\"));
    } else {
      for (const base of ["/media", "/run/media", "/Volumes"]) {
        if (!fs.existsSync(base)) continue;
        for (const e of fs.readdirSync(base)) {
          const p = path.join(base, e);
          if (fs.statSync(p).isDirectory()) {
            const subs = fs.readdirSync(p).map((s) => path.join(p, s));
            roots.push(...(base === "/Volumes" ? [p] : subs.filter((s) => fs.statSync(s).isDirectory())));
          }
        }
      }
    }
  } catch { /* no removable drives */ }
  return roots;
}

function walk(dir, depth = 2, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && depth > 0 && !e.name.startsWith("$") && e.name !== "System Volume Information") walk(p, depth - 1, out);
    else if (e.isFile() && /\.(dat|csv|txt|xls|xlsx)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const DT_RX = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?|(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/;
function toIso(cell) {
  if (cell instanceof Date) return fmtLocal(cell);
  const m = DT_RX.exec(String(cell));
  if (!m) return null;
  const p = (n) => String(n).padStart(2, "0");
  if (m[1]) return `${m[1]}-${p(m[2])}-${p(m[3])}T${p(m[4])}:${m[5]}:${p(m[6] || 0)}${TZ}`;
  return `${m[9]}-${p(m[8])}-${p(m[7])}T${p(m[10])}:${m[11]}:${p(m[12] || 0)}${TZ}`; // dd-mm-yyyy
}

function parseFile(file) {
  let rows;
  if (/\.(xls|xlsx)$/i.test(file)) {
    const XLSX = require("xlsx");
    const wb = XLSX.readFile(file, { cellDates: true });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
  } else {
    rows = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split(/\t|,|;/).map((s) => s.trim().replace(/^"|"$/g, "")));
  }
  const punches = [];
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    let time = null, id = null;
    for (const cell of r) {
      if (!time) { const t = toIso(cell); if (t) { time = t; continue; } }
      if (!id && /^\d{1,12}$/.test(String(cell).trim())) id = String(cell).trim();
    }
    // .dat rows are "userId <tab> datetime <tab> ..." so the first integer is the user id
    if (time && id) punches.push({ userId: id, time });
  }
  return punches;
}

async function syncUsbDrives() {
  const serial = cfg.usbDrive && cfg.usbDrive.deviceSerial;
  for (const root of removableRoots()) {
    for (const file of walk(root)) {
      const sig = crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
      if (state.files[sig]) continue;
      const punches = parseFile(file);
      log(`[USB ${root}] ${path.basename(file)} -> ${punches.length} punches found`);
      if (!punches.length || ARGS.includes("--scan")) continue;
      const targetSerial = serial || (/(\d{8,})/.exec(path.basename(file)) || [])[1];
      if (!targetSerial) {
        log(`[USB] set usbDrive.deviceSerial in agent-config.json (e.g. "2405021163") so these punches are linked to the right machine`);
        continue;
      }
      await api("POST", "/biometric/agent/device-info", { serialNumber: targetSerial, connectionType: "usb_drive", agentHost: os.hostname() });
      const n = await pushPunches(targetSerial, punches);
      state.files[sig] = { file: path.basename(file), at: new Date().toISOString(), punches: punches.length };
      saveState();
      log(`[USB] imported ${path.basename(file)}: ${n} new punches`);
    }
  }
}

// ---------------- main loop ----------------
async function cycle() {
  try {
    if (!cfg.lan || cfg.lan.enabled !== false) {
      const ips = await discoverLan();
      if (!ips.length) log("[LAN] no biometric device found on this network");
      for (const ip of ips) { try { await syncLanDevice(ip); } catch (e) { log(`[LAN ${ip}] ${e.message}`); } }
    }
    if (!cfg.usbDrive || cfg.usbDrive.enabled !== false) await syncUsbDrives();
  } catch (e) { log("sync failed:", e.message); }
}

(async () => {
  log("TorchX Biometric Agent started on", os.hostname());
  await cycle();
  if (ARGS.includes("--once") || ARGS.includes("--scan")) return;
  setInterval(cycle, Math.max(1, cfg.syncIntervalMinutes || 5) * 60 * 1000);
})();
