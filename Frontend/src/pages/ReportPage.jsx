import { useEffect, useState } from "react";
import { fetchReportList, runReport, downloadReport } from "../api/reportApi";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReportList()
      .then(setReports)
      .catch((e) => setError(e.message));
  }, []);

  const pick = (key) => {
    setSelected(reports.find((r) => r.key === key) || null);
    setFilters({});
    setResult(null);
    setError("");
  };

  // drop empty values so the backend never receives ""
  const cleanFilters = () =>
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "" && v != null),
    );

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await runReport(selected.key, cleanFilters()));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = async (format) => {
    try {
      await downloadReport(selected.key, cleanFilters(), format);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Reports</h2>

      <select
        value={selected?.key || ""}
        onChange={(e) => pick(e.target.value)}
      >
        <option value="">Select a report</option>
        {reports.map((r) => (
          <option key={r.key} value={r.key}>
            {r.title}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <p>{selected.description}</p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              margin: "12px 0",
            }}
          >
            {selected.filters.map((f) => (
              <label key={f.name}>
                {f.label}{" "}
                {f.type === "select" ? (
                  <select
                    value={filters[f.name] || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, [f.name]: e.target.value })
                    }
                  >
                    <option value="">All</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={filters[f.name] || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, [f.name]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <button onClick={run} disabled={loading}>
            {loading ? "Running..." : "Run report"}
          </button>{" "}
          <button onClick={() => download("xlsx")}>Download Excel</button>{" "}
          <button onClick={() => download("csv")}>Download CSV</button>
        </>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <>
          <table
            border="1"
            cellPadding="6"
            style={{ marginTop: 16, borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                {result.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i}>
                  {result.columns.map((c) => (
                    <td key={c.key}>{String(row[c.key] ?? "")}</td>
                  ))}
                </tr>
              ))}
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={result.columns.length}>
                    No data for these filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {result.summary && (
            <div style={{ marginTop: 12 }}>
              {Object.entries(result.summary).map(([k, v]) => (
                <div key={k}>
                  <b>{k}:</b> {String(v)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
