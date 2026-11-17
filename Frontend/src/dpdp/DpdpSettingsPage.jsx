import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { dpdpHttp } from "./dpdpGate";

const ROLES = ["super_admin", "admin", "senior_admin", "official", "manager", "senior_manager"];
const err = (e) => e?.response?.data?.message || "Something went wrong";

// Route: /superadmin-dpdp  (Super Admin only)
export default function DpdpSettingsPage() {
  const [s, setS] = useState(null);
  const [pin, setPin] = useState("");
  const [shown, setShown] = useState("");
  const [log, setLog] = useState([]);
  const [reqs, setReqs] = useState([]);

  const load = async () => {
    try {
      const [a, b, c] = await Promise.all([dpdpHttp.get("dpdp/admin/settings"), dpdpHttp.get("dpdp/admin/access-log?limit=25"), dpdpHttp.get("dpdp/admin/requests")]);
      setS(a.data.settings); setLog(b.data.items); setReqs(c.data.requests);
    } catch (e) { toast.error(err(e)); }
  };
  useEffect(() => { load(); }, []);

  const save = async (patch, ok = "Saved") => {
    try {
      const { data } = await dpdpHttp.put("dpdp/admin/settings", patch);
      setS(data.settings); toast.success(ok);
    } catch (e) { toast.error(err(e)); }
  };
  const setPinNow = async (generate) => {
    try {
      const { data } = await dpdpHttp.post("dpdp/admin/pin", generate ? { generate: true } : { pin });
      setPin(""); setShown(data.generatedPin || ""); toast.success("PIN updated. Everyone must re-enter it.");
      load();
    } catch (e) { toast.error(err(e)); }
  };
  const handle = async (id, status) => {
    const resolution = status === "in_progress" ? "" : window.prompt("Response / resolution note");
    if (status !== "in_progress" && !resolution) return;
    try { await dpdpHttp.patch(`dpdp/admin/requests/${id}`, { status, resolution }); load(); } catch (e) { toast.error(err(e)); }
  };

  if (!s) return <div className="p-6 text-sm text-gray-500">Loading...</div>;
  const Toggle = ({ k, label, hint }) => (
    <label className="flex items-start justify-between gap-4 py-2 text-sm">
      <span><span className="font-medium">{label}</span><span className="block text-xs text-gray-500">{hint}</span></span>
      <input type="checkbox" checked={!!s[k]} onChange={(e) => save({ [k]: e.target.checked })} className="mt-1 h-4 w-4" />
    </label>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">DPDP Compliance</h1>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-1 font-semibold">Access PIN</h2>
        <p className="mb-3 text-sm text-gray-600">Share this PIN only with people who must view documents or unmasked data. Changing it signs everyone out of protected data instantly. Status: <b>{s.pinConfigured ? "set" : "not set"}</b>{s.pinSetAt && ` (last changed ${new Date(s.pinSetAt).toLocaleString()})`}</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="New PIN (6-8 digits)" className="rounded-lg border px-3 py-2 text-sm" />
          <button onClick={() => setPinNow(false)} className="rounded-lg bg-[#730042] px-4 py-2 text-sm text-white">Set PIN</button>
          <button onClick={() => setPinNow(true)} className="rounded-lg border px-4 py-2 text-sm">Generate random PIN</button>
        </div>
        {shown && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">New PIN: <b className="font-mono text-lg">{shown}</b> — copy it now, it is never shown again.</div>}
      </section>

      <section className="rounded-xl border bg-white p-5 divide-y">
        <Toggle k="enabled" label="DPDP protection ON" hint="Master switch. Needs a PIN to be set first." />
        <Toggle k="maskingEnabled" label="Mask personal identifiers" hint="Aadhaar, PAN, bank, phone, address of other people show as XXXX until PIN is entered." />
        <Toggle k="pinRequiredForDocuments" label="Require PIN to view documents" hint="Admin, manager and superadmin document screens ask for the PIN first." />
        <div className="grid gap-3 py-3 sm:grid-cols-2">
          <label className="text-sm">Stay unlocked (minutes)
            <input type="number" min={1} max={120} defaultValue={s.unlockMinutes} onBlur={(e) => save({ unlockMinutes: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm">Request response deadline (days)
            <input type="number" min={1} max={90} defaultValue={s.requestSlaDays} onBlur={(e) => save({ requestSlaDays: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>
        <div className="py-3 text-sm">
          <div className="mb-1 font-medium">Roles allowed to enter the PIN</div>
          <div className="flex flex-wrap gap-3">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input type="checkbox" checked={s.unlockRoles.includes(r)} onChange={(e) => save({ unlockRoles: e.target.checked ? [...s.unlockRoles, r] : s.unlockRoles.filter((x) => x !== r) })} /> {r}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">Privacy notice &amp; grievance officer</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[["Officer name", "name"], ["Officer email", "email"], ["Officer phone", "phone"]].map(([l, k]) => (
            <label key={k} className="text-sm">{l}
              <input defaultValue={s.officer[k]} onBlur={(e) => e.target.value !== s.officer[k] && save({ officer: { ...s.officer, [k]: e.target.value } })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          ))}
          <label className="text-sm">Privacy notice URL
            <input defaultValue={s.notice.url} onBlur={(e) => save({ notice: { url: e.target.value } })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm">Notice version (change to re-ask consent)
            <input defaultValue={s.notice.version} onBlur={(e) => e.target.value !== s.notice.version && save({ notice: { version: e.target.value } })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">Data principal requests</h2>
        {!reqs.length && <p className="text-sm text-gray-500">No requests yet.</p>}
        <ul className="divide-y">
          {reqs.map((r) => (
            <li key={r._id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><b>{r.subject}</b> <span className="text-gray-500">· {r.type.replace("_", " ")} · {r.requester.name}</span></span>
                <span className={r.overdue ? "text-red-600" : "text-gray-500"}>{r.status.replace("_", " ")} · due {new Date(r.dueAt).toLocaleDateString()}{r.overdue && " (overdue)"}</span>
              </div>
              {r.details && <p className="text-gray-600">{r.details}</p>}
              {["open", "in_progress"].includes(r.status) && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handle(r._id, "in_progress")} className="rounded border px-2 py-1 text-xs">Start</button>
                  <button onClick={() => handle(r._id, "resolved")} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Resolve</button>
                  <button onClick={() => handle(r._id, "rejected")} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Reject</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">Access log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-500"><tr><th className="py-1">When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l._id} className="border-t">
                  <td className="py-1 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.actor.name || l.actor.model}</td>
                  <td>{l.action}</td>
                  <td className="max-w-[260px] truncate">{l.meta?.path || l.meta?.attempt || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
