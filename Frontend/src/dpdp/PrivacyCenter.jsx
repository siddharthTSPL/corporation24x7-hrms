import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useMyConsent, useSaveConsent, useMyDpdpRequests, useCreateDpdpRequest, useExportMyData } from "../auth/server-state/dpdp/dpdp.hook";

const TYPES = [
  { v: "access", l: "Get a copy of my data" },
  { v: "correction", l: "Correct my data" },
  { v: "erasure", l: "Erase my data" },
  { v: "grievance", l: "Raise a grievance" },
  { v: "nomination", l: "Nominate someone (death/incapacity)" },
  { v: "consent_withdrawal", l: "Withdraw consent" },
];
const badge = { open: "bg-amber-100 text-amber-800", in_progress: "bg-blue-100 text-blue-800", resolved: "bg-emerald-100 text-emerald-800", rejected: "bg-red-100 text-red-800" };
const err = (e) => e?.response?.data?.message || "Something went wrong";

// Route: /privacy (every role). Consent, rights requests, data download.
export default function PrivacyCenter() {
  const { data: consent } = useMyConsent();
  const { data: reqData } = useMyDpdpRequests();
  const saveConsentMut = useSaveConsent();
  const createReq = useCreateDpdpRequest();
  const exportMut = useExportMyData();
  const reqs = reqData?.requests || [];
  const [answers, setAnswers] = useState({});
  const [form, setForm] = useState({ type: "access", subject: "", details: "" });

  useEffect(() => {
    if (consent) setAnswers(Object.fromEntries(consent.purposes.map((p) => [p.key, p.required ? true : p.granted])));
  }, [consent]);

  const saveConsent = () =>
    saveConsentMut.mutate(Object.entries(answers).map(([key, granted]) => ({ key, granted })), {
      onSuccess: () => toast.success("Consent saved"),
      onError: (e) => toast.error(err(e)),
    });
  const submitReq = (e) => {
    e.preventDefault();
    createReq.mutate(form, {
      onSuccess: () => { toast.success("Request submitted"); setForm({ type: "access", subject: "", details: "" }); },
      onError: (x) => toast.error(err(x)),
    });
  };
  const download = () =>
    exportMut.mutate(undefined, {
      onSuccess: (data) => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        Object.assign(document.createElement("a"), { href: url, download: "my-personal-data.json" }).click();
        URL.revokeObjectURL(url);
      },
      onError: (x) => toast.error(err(x)),
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Privacy &amp; My Data</h1>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-1 font-semibold">Consent</h2>
        {consent?.noticeUrl && <a className="text-sm text-[#730042] underline" href={consent.noticeUrl} target="_blank" rel="noreferrer">Read the privacy notice (v{consent.noticeVersion})</a>}
        <div className="mt-3 space-y-2">
          {consent?.purposes.map((p) => (
            <label key={p.key} className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1" disabled={p.required} checked={!!answers[p.key]}
                onChange={(e) => setAnswers({ ...answers, [p.key]: e.target.checked })} />
              <span>{p.label}{p.required && <em className="ml-1 text-gray-500">(required)</em>}</span>
            </label>
          ))}
        </div>
        <button onClick={saveConsent} className="mt-4 rounded-lg bg-[#730042] px-4 py-2 text-sm text-white">
          {consent?.pending ? "Give consent" : "Update consent"}
        </button>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-2 font-semibold">My data</h2>
        <button onClick={download} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Download my personal data (JSON)</button>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">Raise a request</h2>
        <form onSubmit={submitReq} className="space-y-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} placeholder="Details" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button className="rounded-lg bg-[#730042] px-4 py-2 text-sm text-white">Submit</button>
        </form>
        {consent?.officer?.email && <p className="mt-3 text-xs text-gray-500">Grievance officer: {consent.officer.name} · {consent.officer.email} {consent.officer.phone}</p>}
        <ul className="mt-4 divide-y">
          {reqs.map((r) => (
            <li key={r._id} className="py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.subject}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${badge[r.status]}`}>{r.status.replace("_", " ")}</span>
              </div>
              <div className="text-xs text-gray-500">{r.type.replace("_", " ")} · due {new Date(r.dueAt).toLocaleDateString()}</div>
              {r.resolution && <div className="mt-1 text-gray-700">Response: {r.resolution}</div>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
