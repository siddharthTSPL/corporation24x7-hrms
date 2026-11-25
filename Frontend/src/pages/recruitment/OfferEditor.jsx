import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaTimes, FaArrowUp, FaArrowDown, FaTrash, FaPlus, FaUpload, FaSave, FaExternalLinkAlt } from "react-icons/fa";
import {
  usePreviewCtc,
  useUpdateOffer,
  useUpdateAppointment,
  useUploadOfferAssets,
  useUploadAppointmentAssets,
} from "../../auth/server-state/adminrecruitment/adrecruitment.hook";
import { fetchOfferPdf, fetchAppointmentPdf } from "../../auth/api/adminapi/recruitment/recruitment.api";

const inputCls = "w-full px-3 py-2 bg-[#fdf5f9] border border-[#eedde8] rounded-lg text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all";
const labelCls = "block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5";

const ymd = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "");
const inr = (n) => Number(n || 0).toLocaleString("en-IN");

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className={labelCls}>{label}</label>
    {children}
  </div>
);

const TYPE_OPTIONS = [
  { value: "earning", label: "Earning" },
  { value: "variable", label: "Variable pay" },
  { value: "employer", label: "Employer contribution" },
  { value: "deduction", label: "Deduction" },
];

const METHOD_OPTIONS = [
  { value: "FIXED_ANNUAL", label: "Fixed yearly amount" },
  { value: "FIXED_MONTHLY", label: "Fixed monthly amount" },
  { value: "PERCENT_OF_CTC", label: "% of CTC" },
  { value: "PERCENT_OF_COMPONENT", label: "% of another component" },
  { value: "BALANCE", label: "Balance (auto)" },
];

const FALLBACK_CONFIG = [
  { key: "basic", label: "Basic Salary", type: "earning", method: "PERCENT_OF_CTC", value: 40, ref_key: null, enabled: true },
  { key: "hra", label: "House Rent Allowance (HRA)", type: "earning", method: "PERCENT_OF_COMPONENT", value: 50, ref_key: "basic", enabled: true },
  { key: "conveyance", label: "Conveyance Allowance", type: "earning", method: "FIXED_MONTHLY", value: 1600, ref_key: null, enabled: true },
  { key: "special_allowance", label: "Special Allowance", type: "earning", method: "BALANCE", value: 0, ref_key: null, enabled: true },
];

const configFromLetter = (letter) => {
  if (letter.ctc?.source === "COMPANY_CONFIG" && Array.isArray(letter.ctc.config) && letter.ctc.config.length) {
    return letter.ctc.config.map((c) => ({ ...c }));
  }
  const comps = (letter.ctc?.components || []).filter((c) => c.key !== "gratuity");
  if (!comps.length) return FALLBACK_CONFIG.map((c) => ({ ...c }));
  const rows = comps.map((c) => ({
    key: c.key,
    label: c.label,
    type: c.type,
    method: c.key === "special_allowance" ? "BALANCE" : "FIXED_ANNUAL",
    value: c.key === "special_allowance" ? 0 : c.annual,
    ref_key: null,
    enabled: true,
  }));
  if (!rows.some((r) => r.method === "BALANCE")) rows.push({ key: "special_allowance", label: "Special Allowance", type: "earning", method: "BALANCE", value: 0, ref_key: null, enabled: true });
  return rows;
};

const cleanConfig = (list) =>
  (list || []).map((c) => ({
    key: c.key,
    label: String(c.label || "").trim(),
    type: c.type,
    method: c.method,
    value: c.method === "BALANCE" ? 0 : c.value === "" || c.value === null || c.value === undefined ? "" : Number(c.value),
    ref_key: c.method === "PERCENT_OF_COMPONENT" ? c.ref_key || null : null,
    enabled: c.enabled !== false,
  }));

const initForm = (letter, kind) => ({
  designation: letter.designation || "",
  department: letter.department || "",
  employment_type: letter.employment_type || "",
  work_mode: letter.work_mode || "",
  work_location: letter.work_location || "",
  joining_date: ymd(letter.joining_date),
  letter_date: ymd(letter.letter_date),
  valid_till: ymd(letter.valid_till),
  probation_months: letter.probation_months ?? 6,
  notice_period_days: letter.notice_period_days ?? 30,
  company: { name: "", address: "", city: "", phone: "", email: "", website: "", ...(letter.company || {}) },
  signatory: { name: "", designation: "", ...(letter.signatory || {}) },
  template_key: letter.template_key || "classic",
  accent_color: letter.accent_color || "",
  sections: (letter.sections || []).map((s) => ({ ...s })),
  annual_ctc: kind === "OFFER" ? letter.ctc?.annual_ctc || "" : "",
  ctc_config: kind === "OFFER" ? configFromLetter(letter) : [],
});

const buildPayload = (form, kind) => {
  const payload = {
    designation: form.designation,
    department: form.department,
    employment_type: form.employment_type,
    work_mode: form.work_mode,
    work_location: form.work_location,
    joining_date: form.joining_date || undefined,
    letter_date: form.letter_date || undefined,
    probation_months: Number(form.probation_months),
    notice_period_days: Number(form.notice_period_days),
    company: form.company,
    signatory: form.signatory,
    template_key: form.template_key,
    accent_color: form.accent_color || "",
    sections: form.sections,
  };
  if (kind === "OFFER") {
    payload.valid_till = form.valid_till || undefined;
    payload.annual_ctc = Number(form.annual_ctc);
    payload.ctc_config = cleanConfig(form.ctc_config);
  }
  return payload;
};

const CtcPreview = ({ form, config }) => {
  const previewMut = usePreviewCtc();
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!Number(form.annual_ctc)) {
      setResult(null);
      return undefined;
    }
    timer.current = setTimeout(() => {
      previewMut.mutate(
        { annual_ctc: Number(form.annual_ctc), config: cleanConfig(config) },
        {
          onSuccess: (res) => {
            setResult(res.data);
            setErr("");
          },
          onError: (e) => {
            setResult(null);
            setErr(e.message);
          },
        }
      );
    }, 450);
    return () => clearTimeout(timer.current);
  }, [form.annual_ctc, config]);

  if (err) return <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>;
  if (!result) return <div className="text-xs text-gray-400">Enter annual CTC to see the break-up.</div>;

  const groups = [
    { title: "Fixed earnings", type: "earning" },
    { title: "Variable pay", type: "variable" },
    { title: "Employer contributions", type: "employer" },
    { title: "Employee deductions (indicative)", type: "deduction" },
  ];

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1fr_90px_100px] bg-[#730042] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2">
        <span>Component</span>
        <span className="text-right">Monthly</span>
        <span className="text-right">Annual</span>
      </div>
      {groups.map((g) => {
        const rows = result.components.filter((c) => c.type === g.type);
        if (!rows.length) return null;
        return (
          <div key={g.type}>
            <div className="px-3 py-1.5 bg-[#fdf5f9] text-[10px] font-bold text-[#730042] uppercase tracking-wide">{g.title}</div>
            {rows.map((c) => (
              <div key={c.key} className="grid grid-cols-[1fr_90px_100px] px-3 py-1.5 text-xs text-gray-700 border-t border-gray-50">
                <span>{c.label}</span>
                <span className="text-right">{c.type === "variable" ? "-" : inr(c.monthly)}</span>
                <span className="text-right">{inr(c.annual)}</span>
              </div>
            ))}
          </div>
        );
      })}
      <div className="grid grid-cols-[1fr_90px_100px] px-3 py-2 text-xs font-bold text-gray-900 bg-emerald-50 border-t border-emerald-100">
        <span>Total CTC</span>
        <span className="text-right">{inr(result.monthly_ctc)}</span>
        <span className="text-right">{inr(result.annual_ctc)}</span>
      </div>
      <div className="grid grid-cols-[1fr_90px_100px] px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-t border-gray-100">
        <span>Estimated net take-home (before TDS)</span>
        <span className="text-right">{inr(result.net_take_home_monthly)}</span>
        <span className="text-right">{inr(result.net_take_home_annual)}</span>
      </div>
    </div>
  );
};

const PdfPane = ({ kind, id, refreshKey }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let revoked = null;
    let active = true;
    setLoading(true);
    setError("");
    (kind === "OFFER" ? fetchOfferPdf(id) : fetchAppointmentPdf(id))
      .then((blob) => {
        if (!active) return;
        revoked = URL.createObjectURL(blob);
        setUrl(revoked);
      })
      .catch((e) => active && setError(e?.message || "Could not load preview"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [kind, id, refreshKey]);

  if (loading) return <div className="py-16 text-center text-sm text-gray-400">Generating preview…</div>;
  if (error) return <div className="py-10 text-center text-sm text-red-500">{error}</div>;
  if (!url) return null;
  return (
    <div>
      <div className="flex justify-end mb-2">
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-[#730042] hover:underline">
          <FaExternalLinkAlt size={10} /> Open in new tab
        </a>
      </div>
      <iframe title="Letter preview" src={url} className="w-full h-[62vh] rounded-xl border border-gray-200" />
    </div>
  );
};

const AssetUploader = ({ label, url, name, onPick, onRemove, busy }) => (
  <div className="border border-gray-100 rounded-xl p-3">
    <div className={labelCls}>{label}</div>
    <div className="h-16 rounded-lg bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] flex items-center justify-center overflow-hidden">
      {url ? <img src={url} alt={label} className="max-h-14 max-w-full object-contain" /> : <span className="text-xs text-gray-400">Not set</span>}
    </div>
    <div className="flex gap-2 mt-2">
      <label className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:border-[#730042] hover:text-[#730042] transition-colors ${busy ? "opacity-50 pointer-events-none" : ""}`}>
        <FaUpload size={10} /> {busy ? "Uploading…" : "Upload"}
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(name, file);
            e.target.value = "";
          }}
        />
      </label>
      {url && (
        <button onClick={() => onRemove(name)} disabled={busy} className="px-3 py-2 text-xs font-semibold text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
          Remove
        </button>
      )}
    </div>
    <p className="text-[10px] text-gray-400 mt-1.5">PNG or JPG, up to 1 MB. Transparent PNG works best.</p>
  </div>
);

const OfferEditor = ({ kind = "OFFER", letter, meta, issues: initialIssues, onClose }) => {
  const isOffer = kind === "OFFER";
  const [form, setForm] = useState(() => initForm(letter, kind));
  const [tab, setTab] = useState("details");
  const [issues, setIssues] = useState(initialIssues || null);
  const [activeSection, setActiveSection] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);
  const offerUpdate = useUpdateOffer();
  const apptUpdate = useUpdateAppointment();
  const offerAssets = useUploadOfferAssets();
  const apptAssets = useUploadAppointmentAssets();
  const updateMut = isOffer ? offerUpdate : apptUpdate;
  const assetsMut = isOffer ? offerAssets : apptAssets;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setNested = (group, key) => (e) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.value } }));
  const patchComponent = (i, patch) =>
    setForm((f) => ({
      ...f,
      ctc_config: f.ctc_config.map((c, idx) => {
        if (idx !== i) return patch.method === "BALANCE" ? { ...c, method: c.method === "BALANCE" ? "FIXED_ANNUAL" : c.method } : c;
        const next = { ...c, ...patch };
        if (patch.method !== undefined) {
          next.ref_key = patch.method === "PERCENT_OF_COMPONENT" ? c.ref_key || null : null;
          if (patch.method === "BALANCE") next.value = 0;
        }
        if (patch.type !== undefined && patch.type !== "earning" && next.method === "BALANCE") next.method = "FIXED_ANNUAL";
        return next;
      }),
    }));
  const addComponent = () =>
    setForm((f) => ({
      ...f,
      ctc_config: [...f.ctc_config, { key: `custom_${Date.now().toString(36)}`, label: "", type: "earning", method: "FIXED_MONTHLY", value: 0, ref_key: null, enabled: true }],
    }));
  const removeComponent = (i) => setForm((f) => ({ ...f, ctc_config: f.ctc_config.filter((_, idx) => idx !== i) }));
  const loadCompanyConfig = () => {
    const comps = meta?.salary_config?.components;
    if (!comps?.length) return toast.error("No company salary structure found");
    setForm((f) => ({ ...f, ctc_config: comps.map((c) => ({ ...c })) }));
  };

  const tabs = [
    { key: "details", label: "Details" },
    ...(isOffer ? [{ key: "ctc", label: "Compensation" }] : []),
    { key: "content", label: "Letter Content" },
    { key: "design", label: "Template & Design" },
    { key: "preview", label: "Preview" },
  ];

  const save = async ({ thenPreview = false } = {}) => {
    try {
      const res = await updateMut.mutateAsync({ id: letter._id, data: buildPayload(form, kind) });
      setIssues(res.issues || null);
      toast.success(res.message || "Saved");
      setPreviewKey((k) => k + 1);
      if (thenPreview) setTab("preview");
      return true;
    } catch (err) {
      toast.error(err?.message || "Could not save");
      return false;
    }
  };

  const pickAsset = async (name, file) => {
    const fd = new FormData();
    fd.append(name, file);
    try {
      await assetsMut.mutateAsync({ id: letter._id, formData: fd });
      toast.success("Image updated");
      setPreviewKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    }
  };

  const removeAsset = async (name) => {
    const fd = new FormData();
    fd.append(name === "logo" ? "remove_logo" : "remove_signature", "true");
    try {
      await assetsMut.mutateAsync({ id: letter._id, formData: fd });
      setPreviewKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.message || "Could not remove image");
    }
  };

  const moveSection = (i, dir) =>
    setForm((f) => {
      const next = [...f.sections];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, sections: next };
    });

  const patchSection = (i, patch) => setForm((f) => ({ ...f, sections: f.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

  const insertPlaceholder = (key) => {
    const idx = Math.min(activeSection, form.sections.length - 1);
    if (idx < 0) return;
    patchSection(idx, { body: `${form.sections[idx].body}${form.sections[idx].body && !form.sections[idx].body.endsWith(" ") ? " " : ""}{{${key}}}` });
  };

  const templates = meta?.templates || [];
  const currentTpl = useMemo(() => templates.find((t) => t.key === form.template_key), [templates, form.template_key]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl my-2">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {isOffer ? "Offer Letter" : "Appointment Letter"} · {letter.ref_no}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Edit the details, then save and preview before finalizing.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><FaTimes size={13} /></button>
        </div>

        <div className="flex px-4 sm:px-6 border-b border-gray-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-4 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-all ${tab === t.key ? "border-[#730042] text-[#730042]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {issues && (issues.missing?.length > 0 || issues.unresolved?.length > 0) && (
          <div className="mx-4 sm:mx-6 mt-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 leading-relaxed">
            {issues.missing?.length > 0 && <div>Missing: <strong>{issues.missing.join(", ")}</strong></div>}
            {issues.unresolved?.length > 0 && <div>Empty or unknown placeholders: <strong>{issues.unresolved.map((u) => `{{${u}}}`).join(", ")}</strong></div>}
          </div>
        )}

        <div className="p-4 sm:p-6 max-h-[64vh] overflow-y-auto">
          {tab === "details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Designation"><input className={inputCls} value={form.designation} onChange={set("designation")} /></Field>
                <Field label="Department"><input className={inputCls} value={form.department} onChange={set("department")} /></Field>
                <Field label="Employment type"><input className={inputCls} value={form.employment_type} onChange={set("employment_type")} /></Field>
                <Field label="Work mode"><input className={inputCls} value={form.work_mode} onChange={set("work_mode")} /></Field>
                <Field label="Work location"><input className={inputCls} value={form.work_location} onChange={set("work_location")} /></Field>
                <Field label="Date of joining"><input type="date" className={inputCls} value={form.joining_date} onChange={set("joining_date")} /></Field>
                <Field label="Letter date"><input type="date" className={inputCls} value={form.letter_date} onChange={set("letter_date")} /></Field>
                {isOffer && <Field label="Offer valid until"><input type="date" className={inputCls} value={form.valid_till} onChange={set("valid_till")} /></Field>}
                <Field label="Probation (months)"><input type="number" min="0" max="24" className={inputCls} value={form.probation_months} onChange={set("probation_months")} /></Field>
                <Field label="Notice period (days)"><input type="number" min="0" max="180" className={inputCls} value={form.notice_period_days} onChange={set("notice_period_days")} /></Field>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-700 mb-3">Company letterhead details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company name"><input className={inputCls} value={form.company.name} onChange={setNested("company", "name")} /></Field>
                  <Field label="City"><input className={inputCls} value={form.company.city} onChange={setNested("company", "city")} /></Field>
                  <Field label="Address" className="sm:col-span-2"><input className={inputCls} value={form.company.address} onChange={setNested("company", "address")} /></Field>
                  <Field label="Phone"><input className={inputCls} value={form.company.phone} onChange={setNested("company", "phone")} /></Field>
                  <Field label="Email"><input className={inputCls} value={form.company.email} onChange={setNested("company", "email")} /></Field>
                  <Field label="Website"><input className={inputCls} value={form.company.website} onChange={setNested("company", "website")} /></Field>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-700 mb-3">Authorised signatory</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Name"><input className={inputCls} value={form.signatory.name} onChange={setNested("signatory", "name")} /></Field>
                  <Field label="Designation"><input className={inputCls} value={form.signatory.designation} onChange={setNested("signatory", "designation")} /></Field>
                </div>
              </div>
            </div>
          )}

          {tab === "ctc" && isOffer && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Field label="Annual CTC (INR)" className="w-full sm:w-64">
                  <input type="number" min="0" className={inputCls} value={form.annual_ctc} onChange={set("annual_ctc")} />
                </Field>
                <button type="button" onClick={loadCompanyConfig} className="text-xs font-semibold text-[#730042] border border-[#eedde8] bg-white px-3 py-2 rounded-lg hover:bg-[#730042] hover:text-white transition-colors">Load company salary structure</button>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="hidden md:grid grid-cols-[28px_1.4fr_1fr_1.2fr_1fr_1fr_28px] gap-2 bg-[#fdf5f9] px-3 py-2 text-[10px] font-bold text-[#730042] uppercase tracking-wide">
                  <span />
                  <span>Component</span>
                  <span>Type</span>
                  <span>Calculation</span>
                  <span>Value</span>
                  <span>Based on</span>
                  <span />
                </div>
                {form.ctc_config.map((c, i) => (
                  <div key={c.key} className={`grid grid-cols-2 md:grid-cols-[28px_1.4fr_1fr_1.2fr_1fr_1fr_28px] gap-2 items-center px-3 py-2 border-t border-gray-50 ${c.enabled === false ? "opacity-50" : ""}`}>
                    <input type="checkbox" className="w-4 h-4 accent-[#730042]" checked={c.enabled !== false} onChange={(e) => patchComponent(i, { enabled: e.target.checked })} />
                    <input className={inputCls} placeholder="Component name" value={c.label} onChange={(e) => patchComponent(i, { label: e.target.value })} />
                    <select className={inputCls} value={c.type} onChange={(e) => patchComponent(i, { type: e.target.value })}>
                      {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className={inputCls} value={c.method} onChange={(e) => patchComponent(i, { method: e.target.value })}>
                      {METHOD_OPTIONS.filter((o) => o.value !== "BALANCE" || c.type === "earning").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {c.method === "BALANCE" ? (
                      <div className="text-xs text-gray-400 px-1">Auto</div>
                    ) : (
                      <input type="number" min="0" className={inputCls} value={c.value ?? ""} onChange={(e) => patchComponent(i, { value: e.target.value })} />
                    )}
                    {c.method === "PERCENT_OF_COMPONENT" ? (
                      <select className={inputCls} value={c.ref_key || ""} onChange={(e) => patchComponent(i, { ref_key: e.target.value })}>
                        <option value="">Select</option>
                        {form.ctc_config.filter((r) => r.key !== c.key && r.type !== "deduction" && r.method !== "BALANCE").map((r) => <option key={r.key} value={r.key}>{r.label || r.key}</option>)}
                      </select>
                    ) : (
                      <div className="text-xs text-gray-400 px-1">-</div>
                    )}
                    <button type="button" onClick={() => removeComponent(i)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg transition-colors justify-self-end"><FaTrash size={11} /></button>
                  </div>
                ))}
                <div className="px-3 py-2 border-t border-gray-100">
                  <button type="button" onClick={addComponent} className="flex items-center gap-1.5 text-xs font-semibold text-[#730042] hover:underline"><FaPlus size={10} /> Add component</button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">Exactly one earning must be set to Balance (for example Special Allowance) so the total always matches the CTC. Uncheck a component to leave it out of this offer.</p>

              <CtcPreview form={form} config={form.ctc_config} />
            </div>
          )}

          {tab === "content" && (
            <div className="space-y-4">
              <div className="bg-[#fdf5f9] border border-[#eedde8] rounded-xl p-3">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Click a placeholder to insert it into the section you are editing</div>
                <div className="flex flex-wrap gap-1.5">
                  {(meta?.placeholders || []).map((p) => (
                    <button key={p} onClick={() => insertPlaceholder(p)} className="text-[11px] font-medium bg-white text-[#730042] border border-[#eedde8] px-2.5 py-1 rounded-full hover:bg-[#730042] hover:text-white transition-colors">
                      {`{{${p}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Tip: lines starting with "- " become bullets. A bullet like "Label: value" is shown as an aligned detail row.</p>
              </div>

              {form.sections.map((s, i) => (
                <div key={`${s.key}-${i}`} className={`border rounded-xl p-3 ${activeSection === i ? "border-[#730042]/40" : "border-gray-100"} ${s.enabled ? "" : "opacity-60"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" className="w-4 h-4 accent-[#730042]" checked={s.enabled} onChange={(e) => patchSection(i, { enabled: e.target.checked })} title="Include in letter" />
                    <input className={`${inputCls} flex-1`} placeholder={s.key === "intro" ? "No heading for the opening paragraph" : "Section heading"} value={s.title} onChange={(e) => patchSection(i, { title: e.target.value })} onFocus={() => setActiveSection(i)} />
                    <button onClick={() => moveSection(i, -1)} className="p-2 text-gray-400 hover:text-gray-700" title="Move up"><FaArrowUp size={11} /></button>
                    <button onClick={() => moveSection(i, 1)} className="p-2 text-gray-400 hover:text-gray-700" title="Move down"><FaArrowDown size={11} /></button>
                    <button onClick={() => setForm((f) => ({ ...f, sections: f.sections.filter((_, idx) => idx !== i) }))} className="p-2 text-red-400 hover:text-red-600" title="Delete section"><FaTrash size={11} /></button>
                  </div>
                  <textarea rows={5} className={`${inputCls} resize-y font-mono text-[12.5px] leading-relaxed`} value={s.body} onFocus={() => setActiveSection(i)} onChange={(e) => patchSection(i, { body: e.target.value })} />
                </div>
              ))}

              <button
                onClick={() => {
                  setForm((f) => ({ ...f, sections: [...f.sections, { key: `custom_${Date.now()}`, title: "New Section", body: "", enabled: true }] }));
                  setActiveSection(form.sections.length);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-dashed border-[#730042]/40 text-[#730042] rounded-xl hover:bg-[#fdf5f9] transition-colors"
              >
                <FaPlus size={10} /> Add section
              </button>
            </div>
          )}

          {tab === "design" && (
            <div className="space-y-6">
              <div>
                <div className={labelCls}>Template</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((t) => {
                    const selected = form.template_key === t.key;
                    const accent = selected && form.accent_color ? form.accent_color : t.accent;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setForm((f) => ({ ...f, template_key: t.key }))}
                        className={`text-left rounded-xl border-2 p-3 transition-all ${selected ? "border-[#730042] shadow-md" : "border-gray-100 hover:border-gray-300"}`}
                      >
                        <div className="rounded-lg h-20 mb-3 relative overflow-hidden bg-white border border-gray-100">
                          {t.header === "band" && <div className="absolute top-0 left-0 right-0 h-6" style={{ background: accent }} />}
                          {t.header === "left" && <div className="absolute top-2 left-2 h-3 w-8 rounded-sm" style={{ background: accent }} />}
                          {(t.header === "centered" || t.header === "framed") && <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3 w-10 rounded-sm" style={{ background: accent }} />}
                          {t.header === "minimal" && <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-14 bg-gray-800" />}
                          {t.header === "framed" && <div className="absolute inset-1 border" style={{ borderColor: accent }} />}
                          <div className="absolute left-3 right-3 top-9 space-y-1.5">
                            <div className="h-1 rounded bg-gray-200" />
                            <div className="h-1 rounded bg-gray-200 w-4/5" />
                            <div className="h-1.5 rounded w-2/5" style={{ background: accent }} />
                            <div className="h-1 rounded bg-gray-200" />
                          </div>
                        </div>
                        <div className="text-sm font-bold text-gray-800">{t.name}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">{t.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Field label="Accent color">
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer bg-white" value={form.accent_color || currentTpl?.accent || "#730042"} onChange={set("accent_color")} />
                    <button onClick={() => setForm((f) => ({ ...f, accent_color: "" }))} className="text-xs font-semibold text-gray-500 hover:text-[#730042]">Reset to template color</button>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AssetUploader label="Company logo" name="logo" url={letter.logo_url} onPick={pickAsset} onRemove={removeAsset} busy={assetsMut.isPending} />
                <AssetUploader label="Signature" name="signature" url={letter.signature_url} onPick={pickAsset} onRemove={removeAsset} busy={assetsMut.isPending} />
              </div>
            </div>
          )}

          {tab === "preview" && <PdfPane kind={kind} id={letter._id} refreshKey={previewKey} />}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors">Close</button>
          <button onClick={() => save({ thenPreview: true })} disabled={updateMut.isPending} className="px-4 py-2.5 text-sm font-semibold text-[#730042] border border-[#730042]/30 rounded-xl hover:bg-[#fdf5f9] disabled:opacity-60 transition-colors">
            Save and preview
          </button>
          <button onClick={() => save()} disabled={updateMut.isPending} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#730042] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0029] disabled:opacity-60 transition-all">
            <FaSave size={11} /> {updateMut.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export { PdfPane };
export default OfferEditor;