import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import ReportFilters from "./ReportFilters";
import { useRunReport, useExportReport } from "../../auth/server-state/reports/reports.hook";
import { formatCell, isNumericType, formatGeneratedAt } from "./reportFormat";

const monthNow = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date());
  return p.slice(0, 7);
};
const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const defaultsFor = (report) => {
  const v = {};
  for (const f of report.filters) {
    if (f.type === "month" && f.required) v[f.key] = monthNow();
    else if (f.key === "asOf") v[f.key] = todayIST();
    else if (f.default !== undefined && typeof f.default !== "function") v[f.key] = f.default;
  }
  return v;
};

export default function ReportRunner({ report }) {
  const [values, setValues] = useState(() => defaultsFor(report));
  const [applied, setApplied] = useState(null); // filters used by the LAST Generate - Export uses exactly these
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(null);
  const run = useRunReport();
  const exp = useExportReport();
  const first = useRef(true);

  const fetchPage = useCallback((over = {}, refresh = false, filters = applied) => {
    if (!filters) return;
    setError("");
    run.mutate(
      { key: report.key, body: { filters, page, pageSize, search, sort, refresh, ...over } },
      {
        onSuccess: (d) => { setResult(d); if (d.pagination.page !== (over.page ?? page)) setPage(d.pagination.page); },
        onError: (e) => { setError(e?.message || "Could not generate the report."); setResult(null); },
      },
    );
  }, [applied, report.key, page, pageSize, search, sort, run]);

  const generate = () => {
    const missing = report.filters.find((f) => f.required && (values[f.key] === undefined || values[f.key] === ""));
    if (missing) { setError(`${missing.label} is required.`); return; }
    setApplied(values);
    setPage(1);
    setSearch("");
    setSort(null);
    fetchPage({ page: 1, search: "", sort: null }, true, values);
  };

  const clear = () => { setValues(defaultsFor(report)); setApplied(null); setResult(null); setError(""); setPage(1); setSearch(""); setSort(null); };

  // paging / search / sorting re-use the server's short-lived cache (no full re-run)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!applied) return;
    const t = setTimeout(() => fetchPage(), search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, sort]);

  const doExport = () =>
    exp.mutate({ key: report.key, filters: applied }, {
      onSuccess: () => toast.success("Excel download started"),
      onError: (e) => toast.error(e?.message || "Export failed"),
    });

  const cols = result?.columns || [];
  const meta = result?.meta;
  const pg = result?.pagination;
  const toggleSort = (key) => { setPage(1); setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" })); };

  const empty = useMemo(() => result && result.empty, [result]);

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
      <Link to="/reports" className="text-sm text-[#730042] hover:underline">← All reports</Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-800">{report.name}</h1>
      <p className="text-sm text-gray-500">{report.description}</p>

      <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
        <ReportFilters filters={report.filters} values={values} onChange={setValues} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={generate} disabled={run.isPending} className="rounded-lg bg-[#730042] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0033] disabled:opacity-60">
            {run.isPending && !result ? "Generating…" : "Generate Report"}
          </button>
          <button onClick={clear} className="rounded-lg border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50">Clear Filters</button>
          {report.canExport && (
            <button onClick={doExport} disabled={!applied || !result || empty || exp.isPending}
              className="ml-auto rounded-lg border border-[#730042] px-5 py-2 text-sm font-semibold text-[#730042] hover:bg-[#730042]/5 disabled:opacity-40">
              {exp.isPending ? "Preparing Excel…" : "Export to Excel"}
            </button>
          )}
        </div>
        {report.canExport === false && <p className="mt-2 text-xs text-gray-400">You can view this report but do not have permission to export it.</p>}
      </section>

      {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {result && (
        <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm text-gray-600">
            <div className="font-semibold text-gray-800">{meta.reportName}</div>
            <div>Period: {meta.period || "—"} · Generated {formatGeneratedAt(meta.generatedAt)} by {meta.generatedBy || "—"}</div>
            {meta.filterLines.length > 0 && <div className="text-xs text-gray-500">Filters: {meta.filterLines.join(" | ")}</div>}
          </div>

          {result.summary?.length > 0 && !empty && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {result.summary.map((s) => (
                <div key={s.label} className="rounded-lg bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">{s.label}</div>
                  <div className="text-lg font-bold text-gray-800">{formatCell(s.type, s.value)}</div>
                </div>
              ))}
            </div>
          )}

          {empty ? (
            <div className="py-16 text-center">
              <div className="text-lg font-semibold text-gray-700">No records found</div>
              <p className="text-sm text-gray-500">Nothing matches the selected filters. Try a wider date range or fewer filters.</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search in results…"
                  className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#730042] focus:outline-none" />
                <span className="text-xs text-gray-500">{pg.totalRows.toLocaleString("en-IN")} of {pg.matchedBeforeSearch.toLocaleString("en-IN")} rows</span>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#730042] text-white">
                    <tr>
                      {cols.map((c) => (
                        <th key={c.key} onClick={() => toggleSort(c.key)} className={`cursor-pointer whitespace-nowrap px-3 py-2 font-semibold ${isNumericType(c.type) ? "text-right" : "text-left"}`}>
                          {c.header}{sort?.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r, i) => (
                      <tr key={i} className="border-t odd:bg-white even:bg-gray-50/60">
                        {cols.map((c) => (
                          <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${isNumericType(c.type) ? "text-right tabular-nums" : ""}`}>{formatCell(c.type, r[c.key])}</td>
                        ))}
                      </tr>
                    ))}
                    {result.rows.length === 0 && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-gray-500">No rows match your search.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  Rows per page
                  <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }} className="rounded border px-2 py-1">
                    {[25, 50, 100].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={pg.page <= 1} onClick={() => setPage(pg.page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
                  <span>Page {pg.page} of {pg.totalPages}</span>
                  <button disabled={pg.page >= pg.totalPages} onClick={() => setPage(pg.page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
                </div>
              </div>
            </>
          )}

          {meta.notes?.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-500">{meta.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          )}
        </section>
      )}
    </div>
  );
}
