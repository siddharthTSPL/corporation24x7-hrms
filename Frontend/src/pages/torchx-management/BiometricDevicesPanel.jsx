import React, { useState } from "react";
import { Fingerprint, Plus, Download, Trash2, Loader2, Users, RefreshCw, X, KeyRound, Wand2, Upload } from "lucide-react";
import {
  useBiometricDevices,
  useBiometricDeviceUsers,
  useBiometricPunches,
  useCreateBiometricDevice,
  useUpdateBiometricDevice,
  useDeleteBiometricDevice,
  useMapBiometricUser,
  useAutoMapBiometricUsers,
  useReprocessBiometric,
} from "../../auth/server-state/biometric/biometric.hook";
import { downloadBlob, importBiometricPunches } from "../../auth/api/biometric/biometric.api";
import { useQueryClient } from "@tanstack/react-query";
import { parseAttendanceFile } from "./parseAttendanceFile";

const errMsg = (e, fb) => e?.response?.data?.message || e?.message || fb;
const fmt = (d) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—");
const card = "bg-white rounded-2xl border border-slate-200/80 shadow-sm min-w-0";
const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-[#730042] text-white hover:bg-[#5c0035] disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/30";

function AddDeviceModal({ onClose, notify }) {
  const create = useCreateBiometricDevice();
  const [f, setF] = useState({ serialNumber: "", name: "", location: "", model: "" });
  const submit = async () => {
    try {
      await create.mutateAsync(f);
      notify("success", "Device added. Run the agent on the laptop to read its details.");
      onClose();
    } catch (e) { notify("error", errMsg(e, "Could not add device")); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Add biometric device</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <input className={input} placeholder="Serial number (e.g. 2405021163)" value={f.serialNumber} onChange={(e) => setF({ ...f, serialNumber: e.target.value })} />
        <input className={input} placeholder="Name (e.g. Main Gate)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={input} placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        <input className={input} placeholder="Model (optional, e.g. S-B8CB)" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} />
        <p className="text-xs text-slate-400">You can skip this: the agent adds the device automatically when it detects it.</p>
        <div className="flex justify-end gap-2">
          <button className={btn} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={!f.serialNumber.trim() || create.isPending} onClick={submit}>
            {create.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ devices, onClose, notify }) {
  const qc = useQueryClient();
  const [serial, setSerial] = useState(devices[0]?.serialNumber || "USB-IMPORT");
  const [fileName, setFileName] = useState("");
  const [punches, setPunches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    setResult(null); setPunches([]); setFileName(file?.name || "");
    if (!file) return;
    try {
      const rows = await parseAttendanceFile(file);
      setPunches(rows);
      if (!rows.length) notify("error", "No punches found in this file. Use the attendance export (.dat/.csv/.xls/.xlsx) from the machine.");
    } catch (err) { notify("error", errMsg(err, "Could not read the file")); }
  };

  const upload = async () => {
    setBusy(true);
    let received = 0, fresh = 0;
    try {
      for (let i = 0; i < punches.length; i += 500) {
        const r = await importBiometricPunches({ serialNumber: serial.trim(), punches: punches.slice(i, i + 500) });
        received += r.received || 0; fresh += r.newPunches || 0;
      }
      setResult({ received, fresh });
      qc.invalidateQueries({ queryKey: ["biometric"] });
      notify("success", `Imported: ${fresh} new punches (${received - fresh} already existed)`);
    } catch (err) { notify("error", errMsg(err, "Import failed")); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Import attendance file</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-400">Export attendance from the machine to a pen drive, then choose that file here (.dat, .csv, .txt, .xls, .xlsx).</p>
        <label className="text-xs text-slate-500 block">Device serial number
          <input className={input} list="bio-serials" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="e.g. 2405021163" />
          <datalist id="bio-serials">{devices.map((d) => <option key={d._id} value={d.serialNumber}>{d.name}</option>)}</datalist>
        </label>
        <input type="file" accept=".dat,.csv,.txt,.xls,.xlsx" onChange={pick} className="block w-full text-sm" />
        {fileName && <p className="text-xs text-slate-500">{fileName}: <b>{punches.length}</b> punches found</p>}
        {result && <p className="text-xs text-emerald-700">Done: {result.fresh} new, {result.received - result.fresh} duplicates skipped. Map users to Emp IDs, then click Re-process attendance.</p>}
        <div className="flex justify-end gap-2">
          <button className={btn} onClick={onClose}>Close</button>
          <button className={btnPrimary} disabled={!punches.length || !serial.trim() || busy} onClick={upload}>
            {busy && <Loader2 className="w-3 h-3 animate-spin" />} Import
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersModal({ device, onClose, notify }) {
  const { data, isLoading } = useBiometricDeviceUsers(device._id);
  const map = useMapBiometricUser();
  const auto = useAutoMapBiometricUsers();
  const [edits, setEdits] = useState({});

  const save = async (u) => {
    try {
      await map.mutateAsync({ id: device._id, deviceUserId: u.deviceUserId, empid: edits[u.deviceUserId] ?? u.empid });
      notify("success", `User ${u.deviceUserId} saved`);
    } catch (e) { notify("error", errMsg(e, "Could not map user")); }
  };
  const runAuto = async () => {
    try { const r = await auto.mutateAsync(device._id); notify("success", r.message); }
    catch (e) { notify("error", errMsg(e, "Auto-map failed")); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Map device users to Emp ID</h3>
            <p className="text-xs text-slate-400">{device.name || device.serialNumber} · serial {device.serialNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={btn} onClick={runAuto} disabled={auto.isPending}><Wand2 className="w-3 h-3" /> Auto-map (user id = empid)</button>
            <button onClick={onClose}><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="overflow-auto p-4">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !data?.users?.length ? (
            <p className="text-sm text-slate-400">No users read from this device yet. Run the agent once so it can read the users enrolled on the machine.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400">
                <th className="py-1 pr-2">Device ID</th><th className="pr-2">Name on device</th><th className="pr-2">Emp ID</th><th /></tr></thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u._id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2 font-mono">{u.deviceUserId}</td>
                    <td className="pr-2">{u.deviceUserName || "—"}</td>
                    <td className="pr-2">
                      <input className={input} value={edits[u.deviceUserId] ?? u.empid ?? ""} placeholder="Emp ID"
                        onChange={(e) => setEdits({ ...edits, [u.deviceUserId]: e.target.value })} />
                    </td>
                    <td><button className={btn} disabled={map.isPending} onClick={() => save(u)}>Save</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function PunchLog({ devices, notify }) {
  const [filters, setFilters] = useState({ from: "", to: "", empid: "", device: "", unmapped: false });
  const [page, setPage] = useState(1);
  const params = { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== false)), page, limit: 25 };
  const { data, isFetching } = useBiometricPunches(params);
  const reprocess = useReprocessBiometric();
  const dl = (format) => downloadBlob("biometric/punches/download", { ...params, format }, `biometric-punches.${format}`)
    .catch((e) => notify("error", errMsg(e, "Download failed")));

  return (
    <div className={`${card} p-4 space-y-3`}>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-slate-500">From<input type="date" className={input} value={filters.from} onChange={(e) => { setPage(1); setFilters({ ...filters, from: e.target.value }); }} /></label>
        <label className="text-xs text-slate-500">To<input type="date" className={input} value={filters.to} onChange={(e) => { setPage(1); setFilters({ ...filters, to: e.target.value }); }} /></label>
        <label className="text-xs text-slate-500">Emp ID<input className={input} value={filters.empid} placeholder="All" onChange={(e) => { setPage(1); setFilters({ ...filters, empid: e.target.value }); }} /></label>
        <label className="text-xs text-slate-500">Device
          <select className={input} value={filters.device} onChange={(e) => { setPage(1); setFilters({ ...filters, device: e.target.value }); }}>
            <option value="">All devices</option>
            {devices.map((d) => <option key={d._id} value={d._id}>{d.name || d.serialNumber}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500 flex items-center gap-1 pb-2"><input type="checkbox" checked={filters.unmapped} onChange={(e) => setFilters({ ...filters, unmapped: e.target.checked })} /> Unmapped only</label>
        <div className="flex gap-2 ml-auto">
          <button className={btn} onClick={() => dl("xlsx")}><Download className="w-3 h-3" /> Excel</button>
          <button className={btn} onClick={() => dl("csv")}><Download className="w-3 h-3" /> CSV</button>
          <button className={btn} disabled={reprocess.isPending}
            onClick={() => reprocess.mutateAsync({ from: filters.from || undefined, to: filters.to || undefined })
              .then((r) => notify("success", `Attendance re-processed for ${r.ok} day(s)`)).catch((e) => notify("error", errMsg(e, "Failed")))}>
            <RefreshCw className="w-3 h-3" /> Re-process attendance
          </button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400"><th className="py-1">Time (IST)</th><th>Emp ID</th><th>Device ID</th><th>Device</th><th>Attendance</th></tr></thead>
          <tbody>
            {(data?.punches || []).map((p) => (
              <tr key={p._id} className="border-t border-slate-100">
                <td className="py-1.5">{fmt(p.punchTime)}</td>
                <td>{p.empid || <span className="text-amber-600">unmapped</span>}</td>
                <td className="font-mono">{p.deviceUserId}</td>
                <td>{p.device?.name || p.deviceSerial}</td>
                <td className="text-xs text-slate-500">{p.processNote || (p.processed ? "processed" : "pending")}</td>
              </tr>
            ))}
            {!data?.punches?.length && <tr><td colSpan={5} className="py-6 text-center text-slate-400">{isFetching ? "Loading…" : "No punches"}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center text-xs text-slate-500">
        <span>{data?.total || 0} punches</span>
        <div className="flex gap-2">
          <button className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <button className={btn} disabled={page * 25 >= (data?.total || 0)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

export default function BiometricDevicesPanel({ notify }) {
  const { data, isLoading } = useBiometricDevices();
  const update = useUpdateBiometricDevice();
  const remove = useDeleteBiometricDevice();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [usersFor, setUsersFor] = useState(null);
  const devices = data?.devices || [];

  const getAgentConfig = () => {
    if (data?.agentKey && !window.confirm("This creates a NEW agent key. Agents using the old config stop working until you replace their agent-config.json. Continue?")) return;
    downloadBlob("biometric/agent-config/download", undefined, "agent-config.json").catch((e) => notify("error", errMsg(e, "Download failed")));
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F9F0F5] text-[#730042] flex items-center justify-center"><Fingerprint className="w-4 h-4" /></div>
          <div>
            <h2 className="text-sm md:text-base font-semibold text-slate-800">Biometric devices</h2>
            <p className="text-xs md:text-sm text-slate-400">Install the TorchX Biometric Agent on the laptop connected to the machine; it detects the device and syncs punches here.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className={btn} onClick={getAgentConfig}><KeyRound className="w-3 h-3" /> Download agent config</button>
          <button className={btn} onClick={() => setImporting(true)}><Upload className="w-3 h-3" /> Import file</button>
          <button className={btnPrimary} onClick={() => setAdding(true)}><Plus className="w-3 h-3" /> Add device</button>
        </div>
      </div>

      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !devices.length ? (
        <div className={`${card} p-8 text-center text-sm text-slate-400`}>No devices yet. Add one by serial number, or run the agent and it will appear automatically.</div>
      ) : devices.map((d) => (
        <div key={d._id} className={`${card} p-4`}>
          <div className="flex flex-wrap justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 truncate">{d.name || d.serialNumber}</h3>
                <span className={`text-[11px] rounded-full px-2 py-0.5 border ${d.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{d.isActive ? "Active" : "Disabled"}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Serial <b className="font-mono">{d.serialNumber}</b> · {[d.manufacturer, d.model].filter(Boolean).join(" ") || "model not read yet"}
                {d.firmwareVersion ? ` · FW ${d.firmwareVersion}` : ""} · via {d.connectionType}{d.ip ? ` (${d.ip}:${d.port})` : ""}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Last seen {fmt(d.lastSeenAt)} · last sync {fmt(d.lastSyncAt)} ({d.lastSyncCount} new) · {d.logCount || 0} logs on device
              </p>
              <p className="text-xs mt-0.5"><span className="text-emerald-700">{d.mappedUsers} mapped</span>{d.unmappedUsers > 0 && <span className="text-amber-600"> · {d.unmappedUsers} not mapped to an Emp ID</span>}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              <button className={btn} onClick={() => setUsersFor(d)}><Users className="w-3 h-3" /> Users / Emp ID</button>
              <button className={btn} onClick={() => downloadBlob(`biometric/devices/${d._id}/config/download`, undefined, `device-${d.serialNumber}-config.json`).catch((e) => notify("error", errMsg(e, "Download failed")))}><Download className="w-3 h-3" /> Config</button>
              <button className={btn} onClick={() => downloadBlob("biometric/punches/download", { device: d._id, format: "xlsx" }, "biometric-punches.xlsx").catch((e) => notify("error", errMsg(e, "Download failed")))}><Download className="w-3 h-3" /> Data</button>
              <button className={btn} onClick={() => update.mutateAsync({ id: d._id, isActive: !d.isActive }).catch((e) => notify("error", errMsg(e, "Failed")))}>{d.isActive ? "Disable" : "Enable"}</button>
              <button className={`${btn} text-red-600`} onClick={() => window.confirm("Remove this device and its raw punches? Attendance already created is kept.") && remove.mutateAsync(d._id).then(() => notify("success", "Device removed")).catch((e) => notify("error", errMsg(e, "Failed")))}><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      ))}

      <PunchLog devices={devices} notify={notify} />
      {importing && <ImportModal devices={devices} onClose={() => setImporting(false)} notify={notify} />}
      {adding && <AddDeviceModal onClose={() => setAdding(false)} notify={notify} />}
      {usersFor && <UsersModal device={usersFor} onClose={() => setUsersFor(null)} notify={notify} />}
    </div>
  );
}