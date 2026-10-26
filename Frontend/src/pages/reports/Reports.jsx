import { Link, useParams } from "react-router-dom";
import { useReportCatalog } from "../../auth/server-state/reports/reports.hook";
import ReportRunner from "./ReportRunner";

// /reports            -> catalog grouped by category (only reports the server says you may open)
// /reports/:key       -> the generic runner. New reports need NO frontend code.
export default function Reports() {
  const { key } = useParams();
  const { data, isLoading, error } = useReportCatalog();

  if (isLoading) return <p className="p-6 text-gray-500">Loading reports…</p>;
  if (error) return <p className="p-6 text-red-600">{error.message || "Could not load reports."}</p>;

  const categories = data?.categories || [];
  if (key) {
    const report = categories.flatMap((c) => c.reports).find((r) => r.key === key);
    if (!report) {
      return (
        <div className="p-6">
          <p className="font-semibold text-gray-700">This report is not available to you.</p>
          <Link to="/reports" className="text-[#730042] underline">Back to reports</Link>
        </div>
      );
    }
    return <ReportRunner key={report.key} report={report} />;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
      <p className="text-sm text-gray-500">Pick a report, set filters, generate it on screen and export the full result to Excel.</p>
      {categories.length === 0 && <p className="mt-8 text-gray-500">No reports are available for your account.</p>}
      {categories.map((c) => (
        <section key={c.key} className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#730042]">{c.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.reports.map((r) => (
              <Link key={r.key} to={`/reports/${r.key}`} className="rounded-xl border bg-white p-4 shadow-sm transition hover:border-[#730042] hover:shadow-md">
                <div className="font-semibold text-gray-800">{r.name}</div>
                <p className="mt-1 text-sm text-gray-500">{r.description}</p>
                {r.sensitive && <span className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">Restricted · access is logged</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
