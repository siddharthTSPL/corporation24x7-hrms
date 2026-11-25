import { ResponsiveContainer, BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const COLORS = ["#730042", "#c2410c", "#0f766e", "#1d4ed8", "#a16207", "#7c3aed", "#475569"];
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

// Draws from ALL rows of the report (chartRows), never just the visible page.
export default function ReportChart({ chart, rows }) {
  if (!chart || !rows?.length) return null;
  const bars = chart.bars || [];
  const tick = (v) => compact.format(v);
  const tip = (v) => (chart.yType === "currency" ? `₹${full.format(v)}` : full.format(v));
  const common = { data: rows, margin: { top: 8, right: 16, left: 0, bottom: 8 } };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={chart.x} tick={{ fontSize: 12 }} interval={0} angle={rows.length > 8 ? -30 : 0} textAnchor={rows.length > 8 ? "end" : "middle"} height={rows.length > 8 ? 70 : 30} />
      <YAxis tick={{ fontSize: 12 }} tickFormatter={tick} width={56} />
      <Tooltip formatter={tip} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
    </>
  );
  return (
    <div role="img" aria-label="Report chart" className="h-80 w-full">
      <ResponsiveContainer>
        {chart.type === "combo" ? (
          <ComposedChart {...common}>
            {axes}
            {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.label} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />)}
            {chart.line && <Line type="monotone" dataKey={chart.line.key} name={chart.line.label} stroke="#111827" strokeWidth={2} dot />}
          </ComposedChart>
        ) : (
          <BarChart {...common}>
            {axes}
            {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.label} stackId={chart.stacked ? "s" : undefined} fill={COLORS[i % COLORS.length]} radius={chart.stacked ? 0 : [3, 3, 0, 0]} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
