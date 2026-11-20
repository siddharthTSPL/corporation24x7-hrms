import { useEffect, useState } from "react";
import { useReportLookup } from "../../auth/server-state/reports/reports.hook";

const input = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#730042] focus:outline-none focus:ring-1 focus:ring-[#730042]";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

const useDebounced = (value, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

// Dropdown fed by /reports/lookups/:name (scoped to the caller on the server).
function LookupSelect({ lookup, value, onChange }) {
  const { data = [], isLoading } = useReportLookup(lookup);
  return (
    <select className={input} value={value || ""} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">{isLoading ? "Loading…" : "All"}</option>
      {data.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Type-ahead for people. Selected people are kept as {value,label} chips.
function PeoplePicker({ lookup, multi, value = [], onChange, chips, setChips }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const { data = [] } = useReportLookup(lookup, dq, dq.length >= 2);
  const pick = (o) => {
    if (value.includes(o.value)) return;
    setChips({ ...chips, [o.value]: o.label });
    onChange(multi ? [...value, o.value] : [o.value]);
    setQ("");
  };
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        {value.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#730042]/10 px-2 py-0.5 text-xs text-[#730042]">
            {chips[id] || id}
            <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((x) => x !== id))}>×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input className={input} placeholder="Type 2+ letters to search…" value={q} onChange={(e) => setQ(e.target.value)} />
        {dq.length >= 2 && data.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white shadow-lg">
            {data.map((o) => (
              <li key={o.value}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100" onClick={() => pick(o)}>{o.label}</button></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ReportFilters({ filters, values, onChange }) {
  const [chips, setChips] = useState({});
  const set = (key, v) => {
    const next = { ...values };
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) delete next[key]; else next[key] = v;
    onChange(next);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filters.map((f) => (
        <div key={f.key} className={f.type === "multiselect" || f.type === "employees" ? "sm:col-span-2 lg:col-span-1" : ""}>
          {f.type !== "boolean" && <label className={label}>{f.label}{f.required && " *"}</label>}
          {f.type === "date" && <input type="date" className={input} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />}
          {f.type === "month" && <input type="month" className={input} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />}
          {f.type === "text" && <input type="text" maxLength={100} className={input} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />}
          {f.type === "boolean" && (
            <label className="flex items-center gap-2 pt-6 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 accent-[#730042]" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
              {f.label}
            </label>
          )}
          {f.type === "select" && (f.options
            ? (
              <select className={input} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}>
                {!f.default && <option value="">All</option>}
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : <LookupSelect lookup={f.lookup} value={values[f.key]} onChange={(v) => set(f.key, v)} />)}
          {f.type === "multiselect" && (
            <div className="flex flex-wrap gap-2">
              {f.options.map((o) => {
                const on = (values[f.key] || []).includes(o.value);
                return (
                  <button key={o.value} type="button"
                    onClick={() => set(f.key, on ? values[f.key].filter((x) => x !== o.value) : [...(values[f.key] || []), o.value])}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "border-[#730042] bg-[#730042] text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
          {(f.type === "employee" || f.type === "employees") && (
            <PeoplePicker lookup={f.lookup} multi={f.type === "employees"} value={values[f.key] || []}
              onChange={(v) => set(f.key, v)} chips={chips} setChips={setChips} />
          )}
        </div>
      ))}
    </div>
  );
}
