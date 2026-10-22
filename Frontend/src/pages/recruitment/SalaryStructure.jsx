import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaTrash, FaSave, FaUndo } from "react-icons/fa";
import { useSalaryConfig, useSaveSalaryConfig, useResetSalaryConfig, usePreviewSalaryConfig } from "../../auth/server-state/adminrecruitment/adrecruitment.hook";

const inputCls = "w-full px-3 py-2 bg-[#fdf5f9] border border-[#eedde8] rounded-lg text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed";
const inr = (n) => Number(n || 0).toLocaleString("en-IN");

const TYPES = [
  { value: "earning", label: "Fixed earning" },
  { value: "variable", label: "Variable pay" },
  { value: "employer", label: "Employer benefit" },
  { value: "deduction", label: "Employee deduction" },
];

const METHODS = [
  { value: "FIXED_MONTHLY", label: "Fixed amount per month" },
  { value: "FIXED_ANNUAL", label: "Fixed amount per year" },
  { value: "PERCENT_OF_CTC", label: "% of annual CTC" },
  { value: "PERCENT_OF_COMPONENT", label: "% of another component" },
  { value: "BALANCE", label: "Balance (remaining CTC)" },
];

const GROUPS = [
  { title: "Fixed earnings", type: "earning" },
  { title: "Variable pay", type: "variable" },
  { title: "Employer contributions", type: "employer" },
  { title: "Employee deductions (indicative)", type: "deduction" },
];

const slugify = (label) => String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
const keyOf = (r) => r.key || slugify(r.label);
const blankRow = () => ({ key: "", label: "", type: "earning", method: "FIXED_MONTHLY", value: "", ref_key: "", enabled: true });

const toPayload = (rows) =>
  rows.map((r) => ({
    key: keyOf(r),
    label: r.label,
    type: r.type,
    method: r.method,
    value: r.method === "BALANCE" ? 0 : r.value,
    ref_key: r.method === "PERCENT_OF_COMPONENT" ? r.ref_key : null,
    enabled: r.enabled,
  }));

const SalaryPreview = ({ rows }) => {
  const previewMut = usePreviewSalaryConfig();
  const [sampleCtc, setSampleCtc] = useState(1200000);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!Number(sampleCtc)) {
      setResult(null);
      setErr("");
      return undefined;
    }
    timer.current = setTimeout(() => {
      previewMut.mutate(
        { annual_ctc: Number(sampleCtc), components: toPayload(rows) },
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
  }, [rows, sampleCtc]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-gray-800">Sample break-up</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Annual CTC</span>
          <input type="number" min="0" className="w-36 px-3 py-1.5 bg-[#fdf5f9] border border-[#eedde8] rounded-lg text-sm outline-none focus:border-[#730042]" value={sampleCtc} onChange={(e) => setSampleCtc(e.target.value)} />
        </div>
      </div>
      {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
      {!err && !result && <div className="text-xs text-gray-400">Enter a sample CTC to see how the structure calculates.</div>}
      {result && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_90px_100px] bg-[#730042] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2">
            <span>Component</span>
            <span className="text-right">Monthly</span>
            <span className="text-right">Annual</span>
          </div>
          {GROUPS.map((g) => {
            const list = result.components.filter((c) => c.type === g.type);
            if (!list.length) return null;
            return (
              <div key={g.type}>
                <div className="px-3 py-1.5 bg-[#fdf5f9] text-[10px] font-bold text-[#730042] uppercase tracking-wide">{g.title}</div>
                {list.map((c) => (
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
      )}
      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">Annual amounts are rounded to the nearest rupee. Monthly amounts are the annual amount divided by 12, rounded to the nearest rupee. The balancing component makes the total equal the CTC.</p>
    </div>
  );
};

const SalaryStructure = ({ canEdit }) => {
  const { data, isLoading } = useSalaryConfig();
  const saveMut = useSaveSalaryConfig();
  const resetMut = useResetSalaryConfig();
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const config = data?.data;

  useEffect(() => {
    if (config) {
      setRows(config.components.map((c) => ({ ...c, ref_key: c.ref_key || "", value: c.value ?? "" })));
      setDirty(false);
      setError("");
    }
  }, [config]);

  const patch = (i, p) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
    setDirty(true);
  };
  const addRow = () => {
    setRows((r) => [...r, blankRow()]);
    setDirty(true);
  };
  const removeRow = (i) => {
    setRows((r) => r.filter((_, idx) => idx !== i));
    setDirty(true);
  };

  const save = async () => {
    try {
      const res = await saveMut.mutateAsync({ components: toPayload(rows) });
      setError("");
      toast.success(res.message || "Salary structure saved");
    } catch (e) {
      setError(e.message || "Could not save salary structure");
    }
  };

  const reset = async () => {
    if (!window.confirm("Reset to the default salary structure? Offers already prepared keep their current break-up.")) return;
    try {
      const res = await resetMut.mutateAsync();
      toast.success(res.message || "Reset to default");
    } catch (e) {
      toast.error(e.message || "Could not reset");
    }
  };

  if (isLoading) return <div className="text-sm text-gray-400 py-10 text-center">Loading salary structure…</div>;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Company salary structure</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">These components are used to build the salary break-up in every new offer letter for your company. HR enters the annual CTC and the break-up is calculated from this structure.</p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${config?.is_custom ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
            {config?.is_custom ? `Custom structure v${config.version}` : "Using default structure"}
          </span>
        </div>

        {!canEdit && <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">You can view the salary structure but you do not have permission to change it.</div>}

        <div className="overflow-x-auto">
          <div className="min-w-[820px] space-y-2">
            <div className="grid grid-cols-[1.4fr_1.1fr_1.5fr_1.2fr_70px_36px] gap-2 text-[10px] font-semibold tracking-widest text-gray-400 uppercase px-1">
              <span>Component name</span>
              <span>Type</span>
              <span>Calculation</span>
              <span>Value / based on</span>
              <span className="text-center">Active</span>
              <span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1.1fr_1.5fr_1.2fr_70px_36px] gap-2 items-center">
                <input className={inputCls} disabled={!canEdit} value={r.label} placeholder="e.g. Basic Salary" maxLength={60} onChange={(e) => patch(i, { label: e.target.value })} />
                <select className={inputCls} disabled={!canEdit} value={r.type} onChange={(e) => patch(i, { type: e.target.value, ...(e.target.value !== "earning" && r.method === "BALANCE" ? { method: "FIXED_MONTHLY" } : {}) })}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select className={inputCls} disabled={!canEdit} value={r.method} onChange={(e) => patch(i, { method: e.target.value })}>
                  {METHODS.filter((m) => m.value !== "BALANCE" || r.type === "earning").map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {r.method === "BALANCE" ? (
                  <span className="text-xs text-gray-400 px-1">Remaining CTC</span>
                ) : r.method === "PERCENT_OF_COMPONENT" ? (
                  <div className="flex gap-2">
                    <input type="number" min="0" max="100" step="0.01" className={`${inputCls} w-20`} disabled={!canEdit} value={r.value} placeholder="%" onChange={(e) => patch(i, { value: e.target.value })} />
                    <select className={inputCls} disabled={!canEdit} value={r.ref_key} onChange={(e) => patch(i, { ref_key: e.target.value })}>
                      <option value="">Select</option>
                      {rows.filter((o, idx) => idx !== i && o.method !== "BALANCE" && o.type !== "deduction" && o.label.trim()).map((o) => <option key={keyOf(o)} value={keyOf(o)}>{o.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <input type="number" min="0" step="0.01" className={inputCls} disabled={!canEdit} value={r.value} placeholder={r.method === "PERCENT_OF_CTC" ? "% of CTC" : "Amount (INR)"} onChange={(e) => patch(i, { value: e.target.value })} />
                )}
                <div className="flex justify-center">
                  <input type="checkbox" className="w-4 h-4 accent-[#730042]" disabled={!canEdit} checked={r.enabled !== false} onChange={(e) => patch(i, { enabled: e.target.checked })} />
                </div>
                {canEdit ? (
                  <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-600 transition-colors flex justify-center" title="Remove component"><FaTrash size={12} /></button>
                ) : <span />}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
            <button type="button" onClick={addRow} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#730042] border border-[#eedde8] bg-[#fdf5f9] rounded-xl hover:bg-[#730042] hover:text-white transition-all">
              <FaPlus size={10} /> Add component
            </button>
            <div className="flex items-center gap-2">
              {config?.is_custom && (
                <button type="button" onClick={reset} disabled={resetMut.isPending} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all">
                  <FaUndo size={10} /> Reset to default
                </button>
              )}
              <button type="button" onClick={save} disabled={saveMut.isPending || (!dirty && config?.is_custom)} className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#730042] text-white rounded-xl hover:bg-[#5a0033] disabled:opacity-50 transition-all">
                <FaSave size={11} /> {saveMut.isPending ? "Saving…" : "Save structure"}
              </button>
            </div>
          </div>
        )}
      </div>

      <SalaryPreview rows={rows} />
    </div>
  );
};

export default SalaryStructure;