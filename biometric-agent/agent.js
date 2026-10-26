/* TorchX Biometric Agent
 *  - LAN mode : auto-scans the local network (or a cable-linked machine) for biometric
 *               devices speaking the ZK protocol (port 4370), reads serial/firmware/users/punches.
 *  - USB drive: when a pen drive that holds an exported attendance file (.dat/.csv/.xls/.xlsx/.txt)
 *               is plugged into the laptop, the file is read and imported automatically.
 *  - USB cable: if the machine's Windows SDK (zkemkeeper) is installed, the machine is read over the USB cable.
 *  - USB watcher: plugging in any USB device / pen drive triggers a scan within ~10 seconds.
 *  Everything is pushed to the HRMS server using agent-config.json (downloaded from TorchX Management).
 *
 *  Usage:  node agent.js          (keeps running, syncs every N minutes)
 *          node agent.js --once   (one sync and exit)
 *          node agent.js --scan   (only list devices found, nothing sent)
 *          node agent.js --usb    (list every USB device connected to this laptop)
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


// ---------------- USB: detect devices plugged into this laptop ----------------
const BIOMETRIC_WORDS = /biometric|fingerprint|finger|zk|zkteco|secureye|essl|realtime|mantra|attendance|time\s*clock/i;
const BIOMETRIC_VIDS = ["1B55"]; // ZKTeco-family USB vendor id

function listUsbDevices() {
  if (process.platform !== "win32") return [];
  try {
    const out = execSync(
      'powershell -NoProfile -Command "Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like \'USB\\*\' } | Select-Object FriendlyName,InstanceId,Class,Manufacturer | ConvertTo-Json -Compress"',
      { encoding: "utf8", timeout: 20000 }
    ).trim();
    if (!out) return [];
    const arr = [].concat(JSON.parse(out));
    return arr.map((d) => {
      const vid = (/VID_([0-9A-F]{4})/i.exec(d.InstanceId) || [])[1] || "";
      const pid = (/PID_([0-9A-F]{4})/i.exec(d.InstanceId) || [])[1] || "";
      const likely = BIOMETRIC_VIDS.includes(vid.toUpperCase()) || BIOMETRIC_WORDS.test(`${d.FriendlyName} ${d.Manufacturer}`);
      return { name: d.FriendlyName || "(unnamed)", vid, pid, cls: d.Class || "", manufacturer: d.Manufacturer || "", likely };
    });
  } catch { return []; }
}

// Reading a machine over its USB CABLE needs the maker's Windows SDK ("zkemkeeper"), which is
// 32-bit COM, so it is called through 32-bit PowerShell. Works only if that SDK is installed
// (it comes with the machine's own attendance software).
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

async function syncUsbCable() {
  if (process.platform !== "win32") return;
  const r = readUsbCable();
  if (r.error === "sdk_missing") { log("[USB cable] machine SDK (zkemkeeper) is not installed on this laptop - cannot read over the USB cable. Use LAN or the pen drive."); return; }
  if (r.error === "connect_failed") { log("[USB cable] no machine answered over USB (not connected, powered off, or not supported)"); return; }
  if (r.error) { log("[USB cable]", r.error); return; }
  const serial = String(r.serial || "").trim();
  if (!serial) { log("[USB cable] machine answered but gave no serial - skipped"); return; }
  const users = [].concat(r.users || []), logs = [].concat(r.logs || []);
  log(`[USB cable] serial=${serial} firmware=${r.firmware || "-"} users=${users.length} logs=${logs.length}`);
  if (ARGS.includes("--scan")) return;

  await api("POST", "/biometric/agent/device-info", {
    serialNumber: serial, manufacturer: /secureye/i.test(r.model || "") ? "Secureye" : "", model: r.model, firmwareVersion: r.firmware,
    connectionType: "usb_cable", agentHost: os.hostname(), userCount: users.length, logCount: logs.length,
  });
  await api("POST", "/biometric/agent/users", { serialNumber: serial, users: users.map((u) => ({ userId: u.userId, name: u.name })) });
  const since = state.lastPunch[serial] ? new Date(state.lastPunch[serial]).getTime() - 24 * 3600 * 1000 : 0;
  const punches = logs.map((l) => ({ userId: l.userId, time: l.time + TZ, state: l.state })).filter((p) => new Date(p.time).getTime() >= since);
  const n = await pushPunches(serial, punches);
  const newest = punches.reduce((m, p) => Math.max(m, new Date(p.time).getTime()), 0);
  if (newest) state.lastPunch[serial] = new Date(newest).toISOString();
  saveState();
  log(`[USB cable] pushed ${punches.length} punches (${n} new)`);
}

// Quick watcher: the moment a USB device / pen drive appears or disappears, run a sync.
let lastUsbSig = "";
let busy = false;
async function usbWatch() {
  if (busy) return;
  const devs = listUsbDevices();
  const sig = devs.map((d) => d.vid + d.pid + d.name).sort().join("|") + "#" + removableRoots().join(",");
  if (sig === lastUsbSig) return;
  const first = lastUsbSig === "";
  lastUsbSig = sig;
  if (first) return; // the startup cycle already covers what was plugged in at launch
  log("[USB] change detected - scanning...");
  devs.filter((d) => d.likely).forEach((d) => log(`[USB] biometric-like device: ${d.name} (VID ${d.vid} PID ${d.pid})`));
  busy = true; try { await cycle(); } finally { busy = false; }
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
    if (!cfg.usbCable || cfg.usbCable.enabled !== false) await syncUsbCable();
  } catch (e) { log("sync failed:", e.message); }
}

(async () => {
  log("TorchX Biometric Agent started on", os.hostname());
  const usb = listUsbDevices();
  if (ARGS.includes("--usb")) {
    console.log(usb.length ? usb : "No USB devices listed (Windows only).");
    return;
  }
  const likely = usb.filter((d) => d.likely);
  log(`[USB] ${usb.length} USB device(s) connected; ${likely.length} look like a biometric machine` + (likely.length ? ": " + likely.map((d) => d.name).join(", ") : ""));
  await cycle();
  if (ARGS.includes("--once") || ARGS.includes("--scan")) return;
  setInterval(() => { if (!busy) { busy = true; cycle().finally(() => { busy = false; }); } }, Math.max(1, cfg.syncIntervalMinutes || 5) * 60 * 1000);
  setInterval(usbWatch, 10000); // plug something in -> picked up within ~10 seconds
})();