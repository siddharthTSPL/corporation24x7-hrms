/* TorchX Biometric Agent  (multi-organisation)
 *  One agent process can serve ONE or MANY organisations. Each organisation has its own
 *  agent key (downloaded from HRMS > TorchX Management > Biometric Devices), and everything
 *  else - which machines exist, their IP/port, connection type, timezone - is read from the
 *  server (GET /biometric/agent/config), so nothing about a customer is hardcoded here.
 *
 *  Modes per organisation:
 *   - LAN      : connects to the machines registered for that org (ip/port set in HRMS, or listed in
 *                lan.knownDevices). Optional auto-scan of PRIVATE subnets only (never public IPs).
 *   - USB drive: imports attendance exports (.dat/.csv/.xls/.xlsx/.txt) from pen drives.
 *   - USB cable: only if usbCable.enabled === true and the maker's SDK (zkemkeeper) is installed.
 *
 *  Usage:  node agent.js          keep running, sync every N minutes
 *          node agent.js --once   one sync and exit
 *          node agent.js --scan   only list what is found, send nothing
 *          node agent.js --usb    list USB devices on this PC
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
const BATCH = 500;
const log = (...a) => console.log(new Date().toISOString(), ...a);

if (!fs.existsSync(CONFIG_PATH)) {
  console.error("agent-config.json not found. Download it from TorchX Management > Biometric Devices (or see agent-config.example.json) and put it next to agent.js");
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) : {};
state.lastPunch = state.lastPunch || {};
state.files = state.files || {};
const saveState = () => fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

// ---------------- organisations ----------------
// New format: { "organisations": [ {name, serverUrl, agentKey, ...} ], "syncIntervalMinutes": 5, ... }
// Old format (single org, keys at top level) still works.
const orgs = (Array.isArray(raw.organisations) ? raw.organisations : [raw])
  .map((o, i) => {
    const agentKey = String(o.agentKey || "").trim();
    const id = agentKey.split(".")[0];
    return {
      name: o.name || id || `org${i + 1}`,
      id,
      serverUrl: String(o.serverUrl || raw.serverUrl || "").replace(/\/$/, ""),
      agentKey,
      tz: o.deviceTimezone || raw.deviceTimezone || "+05:30",
      lan: { ...(raw.lan || {}), ...(o.lan || {}) },
      usbDrive: { ...(raw.usbDrive || {}), ...(o.usbDrive || {}) },
      usbCable: { ...(raw.usbCable || {}), ...(o.usbCable || {}) },
      autoRegister: o.autoRegister === true,
    };
  })
  .filter((o) => o.agentKey && o.serverUrl && o.id);
if (!orgs.length) { console.error("No valid organisation in agent-config.json (need serverUrl + agentKey)"); process.exit(1); }
const MULTI = orgs.length > 1;
const intervalMin = Math.max(1, Math.min(...orgs.map((o) => Number((o.syncIntervalMinutes ?? raw.syncIntervalMinutes) || 5))));

// ---------------- server calls ----------------
async function api(org, method, url, body) {
  const res = await fetch(org.serverUrl + url, {
    method,
    headers: { "Content-Type": "application/json", "x-agent-key": org.agentKey },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { message: text }; }
  if (!res.ok) throw new Error(`[${org.name}] ${method} ${url} -> ${res.status} ${json.message || ""}`);
  return json;
}

async function pushPunches(org, serial, punches) {
  let sent = 0;
  for (let i = 0; i < punches.length; i += BATCH) {
    const r = await api(org, "POST", "/biometric/agent/punches", { serialNumber: serial, punches: punches.slice(i, i + BATCH) });
    sent += r.newPunches || 0;
  }
  return sent;
}

const stateKey = (org, k) => `${org.id}:${k}`;
const getLast = (org, serial) => state.lastPunch[stateKey(org, serial)] || (MULTI ? undefined : state.lastPunch[serial]);

async function safe(fn, fallback = "") {
  try { const v = await fn(); return v === undefined || v === null ? fallback : v; } catch { return fallback; }
}

const fmtLocal = (d, tz) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${tz}`;
};

// ---------------- LAN ----------------
const isPrivate = (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(ip);

function privateSubnets(org) {
  const s = org.lan.scanSubnet;
  if (s === false || s === "off") return [];
  if (s && s !== "auto") return isPrivate(s + ".1") ? [s] : (log(`[${org.name}] scanSubnet ${s} is not a private range - ignored`), []);
  const out = new Set();
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === "IPv4" && !i.internal && isPrivate(i.address)) out.add(i.address.split(".").slice(0, 3).join("."));
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

const scanCache = new Map(); // per cycle: "subnet:port" -> Promise<ip[]>
function scanSubnet(subnet, port) {
  const k = `${subnet}:${port}`;
  if (!scanCache.has(k)) scanCache.set(k, (async () => {
    const found = [];
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
    for (let i = 0; i < ips.length; i += 64) {
      const hits = await Promise.all(ips.slice(i, i + 64).map(async (ip) => ((await probe(ip, port)) ? ip : null)));
      found.push(...hits.filter(Boolean));
    }
    return found;
  })());
  return scanCache.get(k);
}

// ip:port -> where it came from. Devices registered in HRMS (with ip) + local knownDevices + private auto-scan.
async function lanTargets(org, serverDevices) {
  const defPort = Number(org.lan.port) || 4370;
  const t = new Map();
  for (const ip of org.lan.knownDevices || []) t.set(`${ip}:${defPort}`, { ip, port: defPort });
  for (const d of serverDevices)
    if (d.ip && ["lan", "unknown", undefined, ""].includes(d.connectionType)) t.set(`${d.ip}:${d.port || defPort}`, { ip: d.ip, port: Number(d.port) || defPort });
  for (const sn of privateSubnets(org))
    for (const ip of await scanSubnet(sn, defPort)) if (!t.has(`${ip}:${defPort}`)) t.set(`${ip}:${defPort}`, { ip, port: defPort });
  return [...t.values()];
}

const readCache = new Map(); // per cycle: "ip:port" -> Promise<device data>  (so N orgs don't re-read one machine)
function readLanDevice(ip, port) {
  const k = `${ip}:${port}`;
  if (!readCache.has(k)) readCache.set(k, (async () => {
    const ZKLib = require("node-zklib");
    const zk = new ZKLib(ip, port, 10000, 4000);
    await zk.createSocket();
    try {
      const clean = (v) => String(v || "").replace(/[^\x20-\x7E]/g, "").trim();
      const info = await safe(() => zk.getInfo(), {});
      const serial = clean(await safe(() => zk.getSerialNumber())).replace(/^SerialNumber=/i, "");
      const fw = clean(await safe(() => zk.getDeviceVersion()));
      const platform = clean(await safe(() => zk.getPlatform())).replace(/^~?Platform=/i, "");
      const name = clean(await safe(() => zk.getDeviceName())).replace(/^~?DeviceName=/i, "");
      const devTime = await safe(() => zk.getTime(), null);
      const users = (await safe(() => zk.getUsers(), { data: [] })).data || [];
      const logs = (await safe(() => zk.getAttendances(), { data: [] })).data || [];
      return { ip, port, serial, fw, platform, name, devTime, info, users, logs };
    } finally { await safe(() => zk.disconnect()); }
  })());
  return readCache.get(k);
}

async function syncLanDevice(org, target, knownSerials) {
  const d = await readLanDevice(target.ip, target.port);
  if (!d.serial) { log(`[${org.name}] [LAN ${target.ip}] answered but gave no serial number - skipped`); return; }
  // A machine belongs to ONE organisation. If the org already has registered machines, only sync those.
  const mine = knownSerials.has(d.serial);
  const allowNew = !MULTI || org.autoRegister;
  if (!mine && !allowNew) { if (ARGS.includes("--scan")) log(`[${org.name}] [LAN ${target.ip}] serial ${d.serial} is not registered for this organisation - skipped`); return; }
  const manufacturer = /secureye/i.test(d.name) ? "Secureye" : "";
  log(`[${org.name}] [LAN ${d.ip}] serial=${d.serial} name=${d.name || "-"} firmware=${d.fw || "-"} users=${d.users.length} logs=${d.logs.length}`);
  if (ARGS.includes("--scan")) return;

  await api(org, "POST", "/biometric/agent/device-info", {
    serialNumber: d.serial, manufacturer, model: d.name, firmwareVersion: d.fw, platform: d.platform,
    connectionType: "lan", ip: d.ip, port: d.port, agentHost: os.hostname(),
    deviceTime: d.devTime ? new Date(d.devTime).toISOString() : undefined,
    userCount: d.info.userCounts ?? d.users.length, logCount: d.info.logCounts ?? d.logs.length, logCapacity: d.info.logCapacity,
  });
  await api(org, "POST", "/biometric/agent/users", {
    serialNumber: d.serial, users: d.users.map((u) => ({ userId: u.userId || u.uid, name: u.name, cardNumber: u.cardno })),
  });
  const last = getLast(org, d.serial);
  const since = last ? new Date(last).getTime() - 24 * 3600 * 1000 : 0;
  const tz = (org.serverDeviceTz && org.serverDeviceTz[d.serial]) || org.tz;
  const punches = d.logs
    .map((l) => ({ userId: l.deviceUserId, time: fmtLocal(new Date(l.recordTime), tz), raw: new Date(l.recordTime).getTime() }))
    .filter((p) => p.raw >= since)
    .map(({ userId, time }) => ({ userId, time }));
  const n = await pushPunches(org, d.serial, punches);
  const newest = d.logs.reduce((m, l) => Math.max(m, new Date(l.recordTime).getTime()), 0);
  if (newest) state.lastPunch[stateKey(org, d.serial)] = new Date(newest).toISOString();
  saveState();
  log(`[${org.name}] [LAN ${d.ip}] pushed ${punches.length} punches (${n} new)`);
}

// ---------------- USB pen-drive import ----------------
function removableRoots() {
  const roots = [];
  try {
    if (process.platform === "win32") {
      const out = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DriveType=2\\" | Select-Object -ExpandProperty DeviceID"', { encoding: "utf8" });
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
function toIso(cell, tz) {
  if (cell instanceof Date) return fmtLocal(cell, tz);
  const m = DT_RX.exec(String(cell));
  if (!m) return null;
  const p = (n) => String(n).padStart(2, "0");
  if (m[1]) return `${m[1]}-${p(m[2])}-${p(m[3])}T${p(m[4])}:${m[5]}:${p(m[6] || 0)}${tz}`;
  return `${m[9]}-${p(m[8])}-${p(m[7])}T${p(m[10])}:${m[11]}:${p(m[12] || 0)}${tz}`; // dd-mm-yyyy
}

function parseFile(file, tz) {
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
      if (!time) { const t = toIso(cell, tz); if (t) { time = t; continue; } }
      if (!id && /^\d{1,12}$/.test(String(cell).trim())) id = String(cell).trim();
    }
    if (time && id) punches.push({ userId: id, time });
  }
  return punches;
}

// Which machine does a pen-drive file belong to, for this organisation?
function resolveUsbSerial(org, serverDevices, file) {
  const explicit = org.usbDrive.deviceSerial;
  const mine = serverDevices.map((d) => String(d.serialNumber));
  const inPath = mine.find((s) => file.includes(s));
  if (explicit) {
    // several orgs share this PC -> the file/folder name must mention the serial (or match pathMatch)
    if (MULTI && !(file.includes(explicit) || (org.usbDrive.pathMatch && new RegExp(org.usbDrive.pathMatch, "i").test(file)))) return null;
    return explicit;
  }
  if (inPath) return inPath;
  const drives = serverDevices.filter((d) => d.connectionType === "usb_drive");
  if (!MULTI && drives.length === 1) return drives[0].serialNumber;
  if (MULTI && drives.length === 1 && org.usbDrive.pathMatch && new RegExp(org.usbDrive.pathMatch, "i").test(file)) return drives[0].serialNumber;
  const fromName = (/(\d{8,})/.exec(path.basename(file)) || [])[1];
  return !MULTI ? fromName || null : null;
}

async function syncUsbDrives(org, serverDevices) {
  if (org.usbDrive.enabled === false) return;
  for (const root of removableRoots()) {
    for (const file of walk(root)) {
      const sig = crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
      const fk = stateKey(org, sig);
      if (state.files[fk] || (!MULTI && state.files[sig])) continue;
      const serial = resolveUsbSerial(org, serverDevices, file);
      if (!serial) { if (ARGS.includes("--scan")) log(`[${org.name}] [USB] ${path.basename(file)} - cannot tell which machine it belongs to (set usbDrive.deviceSerial / register the machine as usb_drive in HRMS / usbDrive.pathMatch)`); continue; }
      const tz = (org.serverDeviceTz && org.serverDeviceTz[serial]) || org.tz;
      const punches = parseFile(file, tz);
      log(`[${org.name}] [USB ${root}] ${path.basename(file)} -> ${punches.length} punches (machine ${serial})`);
      if (!punches.length || ARGS.includes("--scan")) continue;
      await api(org, "POST", "/biometric/agent/device-info", { serialNumber: serial, connectionType: "usb_drive", agentHost: os.hostname() });
      const n = await pushPunches(org, serial, punches);
      state.files[fk] = { file: path.basename(file), at: new Date().toISOString(), punches: punches.length };
      saveState();
      log(`[${org.name}] [USB] imported ${path.basename(file)}: ${n} new punches`);
    }
  }
}

// ---------------- USB: detect devices plugged into this PC ----------------
const BIOMETRIC_WORDS = /biometric|fingerprint|finger|zk|zkteco|secureye|essl|realtime|mantra|attendance|time\s*clock/i;
const BIOMETRIC_VIDS = ["1B55"];

function listUsbDevices() {
  if (process.platform !== "win32") return [];
  try {
    const out = execSync(
      'powershell -NoProfile -Command "Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like \'USB\\*\' } | Select-Object FriendlyName,InstanceId,Class,Manufacturer | ConvertTo-Json -Compress"',
      { encoding: "utf8", timeout: 20000 }
    ).trim();
    if (!out) return [];
    return [].concat(JSON.parse(out)).map((d) => {
      const vid = (/VID_([0-9A-F]{4})/i.exec(d.InstanceId) || [])[1] || "";
      const pid = (/PID_([0-9A-F]{4})/i.exec(d.InstanceId) || [])[1] || "";
      const likely = BIOMETRIC_VIDS.includes(vid.toUpperCase()) || BIOMETRIC_WORDS.test(`${d.FriendlyName} ${d.Manufacturer}`);
      return { name: d.FriendlyName || "(unnamed)", vid, pid, cls: d.Class || "", manufacturer: d.Manufacturer || "", likely };
    });
  } catch { return []; }
}

// USB CABLE (maker's 32-bit COM SDK "zkemkeeper"). Only for orgs that set usbCable.enabled = true.
const PS_USB = `
$ErrorActionPreference = 'Stop'
function Out($o) { $o | ConvertTo-Json -Compress -Depth 5; exit }
try { $zk = New-Object -ComObject zkemkeeper.ZKEM } catch { Out @{ error = 'sdk_missing' } }
if (-not $zk.Connect_USB(1)) { Out @{ error = 'connect_failed' } }
$sn=''; [void]$zk.GetSerialNumber(1,[ref]$sn)
$fw=''; [void]$zk.GetFirmwareVersion(1,[ref]$fw)
$pc=''; try { [void]$zk.GetProductCode(1,[ref]$pc) } catch {}
$users=@()
if ($zk.ReadAllUserID(1)) {
  $id='';$nm='';$pw='';$pv=0;$en=$false
  while ($zk.SSR_GetAllUserInfo(1,[ref]$id,[ref]$nm,[ref]$pw,[ref]$pv,[ref]$en)) { $users += @{ userId=$id; name=$nm } }
}
$logs=@()
if ($zk.ReadGeneralLogData(1)) {
  $id='';$vm=0;$io=0;$y=0;$mo=0;$d=0;$h=0;$mi=0;$s=0;$wc=0
  while ($zk.SSR_GetGeneralLogData(1,[ref]$id,[ref]$vm,[ref]$io,[ref]$y,[ref]$mo,[ref]$d,[ref]$h,[ref]$mi,[ref]$s,[ref]$wc)) {
    $logs += @{ userId=$id; time=('{0:D4}-{1:D2}-{2:D2}T{3:D2}:{4:D2}:{5:D2}' -f $y,$mo,$d,$h,$mi,$s); state=$io }
  }
}
$zk.Disconnect()
Out @{ serial=$sn; firmware=$fw; model=$pc; users=$users; logs=$logs }
`;

function readUsbCable() {
  const ps32 = path.join(process.env.SystemRoot || "C:\\Windows", "SysWOW64", "WindowsPowerShell", "v1.0", "powershell.exe");
  const exe = fs.existsSync(ps32) ? ps32 : "powershell";
  const tmp = path.join(os.tmpdir(), "torchx-usb-read.ps1");
  fs.writeFileSync(tmp, PS_USB);
  try {
    const out = execSync(`"${exe}" -NoProfile -ExecutionPolicy Bypass -File "${tmp}"`, { encoding: "utf8", timeout: 180000, maxBuffer: 256 * 1024 * 1024 }).trim();
    return JSON.parse(out.split(/\r?\n/).pop());
  } catch (e) { return { error: "failed: " + String(e.message).split("\n")[0] }; }
}

async function syncUsbCable(org, knownSerials) {
  if (process.platform !== "win32" || org.usbCable.enabled !== true) return;
  const r = readUsbCable();
  if (r.error === "sdk_missing") { log(`[${org.name}] [USB cable] machine SDK (zkemkeeper) not installed on this PC`); return; }
  if (r.error === "connect_failed") { log(`[${org.name}] [USB cable] no machine answered over USB`); return; }
  if (r.error) { log(`[${org.name}] [USB cable]`, r.error); return; }
  const serial = String(r.serial || "").trim();
  if (!serial) { log(`[${org.name}] [USB cable] machine gave no serial - skipped`); return; }
  if (MULTI && !knownSerials.has(serial) && !org.autoRegister) return; // belongs to another organisation
  const users = [].concat(r.users || []), logs = [].concat(r.logs || []);
  log(`[${org.name}] [USB cable] serial=${serial} firmware=${r.firmware || "-"} users=${users.length} logs=${logs.length}`);
  if (ARGS.includes("--scan")) return;
  await api(org, "POST", "/biometric/agent/device-info", {
    serialNumber: serial, manufacturer: /secureye/i.test(r.model || "") ? "Secureye" : "", model: r.model, firmwareVersion: r.firmware,
    connectionType: "usb_cable", agentHost: os.hostname(), userCount: users.length, logCount: logs.length,
  });
  await api(org, "POST", "/biometric/agent/users", { serialNumber: serial, users: users.map((u) => ({ userId: u.userId, name: u.name })) });
  const last = getLast(org, serial);
  const since = last ? new Date(last).getTime() - 24 * 3600 * 1000 : 0;
  const punches = logs.map((l) => ({ userId: l.userId, time: l.time + org.tz, state: l.state })).filter((p) => new Date(p.time).getTime() >= since);
  const n = await pushPunches(org, serial, punches);
  const newest = punches.reduce((m, p) => Math.max(m, new Date(p.time).getTime()), 0);
  if (newest) state.lastPunch[stateKey(org, serial)] = new Date(newest).toISOString();
  saveState();
  log(`[${org.name}] [USB cable] pushed ${punches.length} punches (${n} new)`);
}

// ---------------- per-organisation cycle ----------------
async function syncOrg(org) {
  // What does the server know about this organisation's machines?
  let devices = [];
  try {
    const sc = await api(org, "GET", "/biometric/agent/config");
    devices = sc.devices || [];
  } catch (e) { log(e.message); if (/401/.test(e.message)) return; }
  org.serverDeviceTz = Object.fromEntries(devices.filter((d) => d.timezone).map((d) => [String(d.serialNumber), d.timezone]));
  const knownSerials = new Set(devices.map((d) => String(d.serialNumber)));
  log(`[${org.name}] ${devices.length} machine(s) registered in HRMS`);

  if (org.lan.enabled !== false) {
    const targets = await lanTargets(org, devices);
    if (!targets.length) log(`[${org.name}] [LAN] nothing to connect to (set the machine IP in HRMS, or lan.knownDevices, or use a private LAN)`);
    for (const t of targets) { try { await syncLanDevice(org, t, knownSerials); } catch (e) { log(`[${org.name}] [LAN ${t.ip}] ${e.message}`); } }
  }
  await syncUsbDrives(org, devices);
  await syncUsbCable(org, knownSerials);
}

let busy = false;
async function cycle() {
  scanCache.clear(); readCache.clear();
  for (const org of orgs) { try { await syncOrg(org); } catch (e) { log(`[${org.name}] sync failed:`, e.message); } }
}

// plug a USB device / pen drive in -> sync within ~10 seconds
let lastUsbSig = "";
async function usbWatch() {
  if (busy) return;
  const devs = listUsbDevices();
  const sig = devs.map((d) => d.vid + d.pid + d.name).sort().join("|") + "#" + removableRoots().join(",");
  if (sig === lastUsbSig) return;
  const first = lastUsbSig === "";
  lastUsbSig = sig;
  if (first) return;
  log("[USB] change detected - scanning...");
  devs.filter((d) => d.likely).forEach((d) => log(`[USB] biometric-like device: ${d.name} (VID ${d.vid} PID ${d.pid})`));
  busy = true; try { await cycle(); } finally { busy = false; }
}

(async () => {
  log(`TorchX Biometric Agent started on ${os.hostname()} - ${orgs.length} organisation(s): ${orgs.map((o) => o.name).join(", ")}`);
  const usb = listUsbDevices();
  if (ARGS.includes("--usb")) { console.log(usb.length ? usb : "No USB devices listed (Windows only)."); return; }
  const likely = usb.filter((d) => d.likely);
  log(`[USB] ${usb.length} USB device(s) connected; ${likely.length} look like a biometric machine` + (likely.length ? ": " + likely.map((d) => d.name).join(", ") : ""));
  busy = true; try { await cycle(); } finally { busy = false; }
  if (ARGS.includes("--once") || ARGS.includes("--scan")) return;
  setInterval(() => { if (!busy) { busy = true; cycle().finally(() => { busy = false; }); } }, intervalMin * 60 * 1000);
  setInterval(usbWatch, 10000);
})();