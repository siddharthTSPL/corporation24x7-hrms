import { useState } from "react";
import toast from "react-hot-toast";
import { useDpdpAdminSettings, useUpdateDpdpSettings, useSetDpdpPin, useDpdpAccessLog, useDpdpAdminRequests, useUpdateDpdpRequest } from "../auth/server-state/dpdp/dpdp.hook";

const ROLES = ["super_admin", "admin", "senior_admin", "official", "manager", "senior_manager"];
const err = (e) => e?.response?.data?.message || "Something went wrong";

export default function DpdpSettingsPage() {
  const { data: sd } = useDpdpAdminSettings();
  const { data: ld } = useDpdpAccessLog({ limit: 25 });
  const { data: rd } = useDpdpAdminRequests();
  const updateSettings = useUpdateDpdpSettings();
  const setPinMut = useSetDpdpPin();
  const updateReq = useUpdateDpdpRequest();
  const s = sd?.settings;
  const log = ld?.items || [];
  const reqs = rd?.requests || [];
  const [pin, setPin] = useState("");
  const [shown, setShown] = useState("");

  const save = (patch, ok = "Saved") =>
    updateSettings.mutate(patch, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(err(e)) });
  const setPinNow = (generate) =>
    setPinMut.mutate(generate ? { generate: true } : { pin }, {
      onSuccess: (data) => { setPin(""); setShown(data.generatedPin || ""); toast.success("PIN updated. Everyone must re-enter it."); },
      onError: (e) => toast.error(err(e)),
    });
  const handle = (id, status) => {
    const resolution = status === "in_progress" ? "" : window.prompt("Response / resolution note");
    if (status !== "in_progress" && !resolution) return;
    updateReq.mutate({ id, status, resolution }, { onError: (e) => toast.error(err(e)) });
  };

  if (!s) return <div className="p-6 text-sm text-gray-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">DPDP Compliance</h1>

      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        <b>Protection is always ON.</b> Other people's Aadhaar, PAN, bank and phone show masked until the PIN is entered, and documents ask for the PIN first. Your own data is never masked.
      </div>

      {s.usingDefaultPin && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Default PIN is active: 1212.</b> Change it below to a PIN only your authorised people know.
        </div>
      )}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-1 font-semibold">Access PIN</h2>
        <p className="mb-3 text-sm text-gray-600">Share this PIN only with people who must view documents or unmasked data. Changing it signs everyone out of protected data instantly. Status: <b>{s.usingDefaultPin ? "default PIN (1212)" : "custom PIN set"}</b>{s.pinSetAt && ` (last changed ${new Date(s.pinSetAt).toLocaleString()})`}</p>
        <div className="flex flex-wrap gap-2">
          <input type="password" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="New PIN (6-8 digits)" className="rounded-lg border px-3 py-2 text-sm" />
          <button onClick={() => setPinNow(false)} disabled={setPinMut.isPending} className="rounded-lg bg-[#730042] px-4 py-2 text-sm text-white disabled:opacity-50">Change PIN</button>
          <button onClick={() => setPinNow(true)} disabled={setPinMut.isPending} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Generate random PIN</button>
        </div>
        {shown && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">New PIN: <b className="font-mono text-lg">{shown}</b> — copy it now, it is never shown again.</div>}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-1 font-semibold">Unlock rules</h2>
        <p className="mb-4 text-sm text-gray-600">How long protected data stays visible after the PIN is entered, and how fast privacy requests must be answered.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block rounded-lg border bg-gray-50 p-4 text-sm">
            <span className="font-medium">Stay unlocked</span>
            <span className="mt-0.5 block text-xs text-gray-500">After this time, the PIN is asked again.</span>
            <span className="mt-3 flex items-center gap-2">
              <input type="number" min={1} max={120} defaultValue={s.unlockMinutes} onBlur={(e) => save({ unlockMinutes: Number(e.target.value) })} className="w-24 rounded-lg border bg-white px-3 py-2 text-base" />
              <span className="text-gray-600">minutes</span>
              <span className="ml-auto text-xs text-gray-400">1 – 120</span>
            </span>
          </label>
          <label className="block rounded-lg border bg-gray-50 p-4 text-sm">
            <span className="font-medium">Request response deadline</span>
            <span className="mt-0.5 block text-xs text-gray-500">Time to resolve an employee's privacy request.</span>
            <span className="mt-3 flex items-center gap-2">
              <input type="number" min={1} max={90} defaultValue={s.requestSlaDays} onBlur={(e) => save({ requestSlaDays: Number(e.target.value) })} className="w-24 rounded-lg border bg-white px-3 py-2 text-base" />
              <span className="text-gray-600">days</span>
              <span className="ml-auto text-xs text-gray-400">1 – 90</span>
            </span>
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-1 text-sm font-medium">Roles allowed to enter the PIN</div>
          <p className="mb-3 text-xs text-gray-500">These roles can unlock protected data. This is always enabled for all roles and cannot be turned off.</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {r.replace(/_/g, " ")}
              </span>
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