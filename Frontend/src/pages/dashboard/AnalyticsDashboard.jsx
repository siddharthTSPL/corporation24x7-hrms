import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  FaUsers, FaUserTie, FaUserShield, FaCalendarCheck, FaFileInvoiceDollar,
  FaMoneyBillWave, FaClipboardCheck, FaTicketAlt, FaLaptop, FaArrowUp,
  FaArrowDown, FaSyncAlt, FaChartLine,
} from "react-icons/fa";
import { useAnalyticsSummary } from "../../auth/server-state/analytics/analytics.hook";

const BRAND = "#730042";
const PALETTE = ["#730042", "#CD166E", "#F5A623", "#2FB4A0", "#4A6FDC", "#9B59B6", "#EB5757", "#27AE60"];

const RANGE_PRESETS = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "custom", label: "Custom", days: null },
];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function usePresetRange() {
  const [preset, setPreset] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    const days = RANGE_PRESETS.find((p) => p.key === preset)?.days || 30;
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (days - 1));
    return { from: toISODate(fromDate), to: toISODate(toDate) };
  }, [preset, customFrom, customTo]);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, from, to };
}

function KpiCard({ icon: Icon, label, value, sub, accent = BRAND, trend }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 min-w-0">
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accent}18`, color: accent }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-gray-400 truncate">{label}</p>
        <p className="text-[20px] font-bold text-gray-900 leading-tight truncate">{value}</p>
        {sub && (
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            {trend === "up" && <FaArrowUp className="text-emerald-500" size={9} />}
            {trend === "down" && <FaArrowDown className="text-red-500" size={9} />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, height = 260, right }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <h3 className="text-[13.5px] font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </div>
  );
}

function EmptyChart({ label = "No data in this range" }) {
  return (
    <div className="h-full w-full flex items-center justify-center text-[12px] text-gray-300">
      {label}
    </div>
  );
}

const axisStyle = { fontSize: 11, fill: "#9CA3AF" };
const tooltipStyle = { fontSize: 12, borderRadius: 10, border: "1px solid #eee" };

export default function AnalyticsDashboard({ role = "admin" }) {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, from, to } = usePresetRange();
  const { data, isLoading, isError, refetch, isFetching } = useAnalyticsSummary({ role, from, to });

  const a = data || {};
  const headcount = a.headcount || {};
  const attendance = a.attendance || {};
  const leave = a.leave || {};
  const payroll = a.payroll || {};
  const reimbursement = a.reimbursement || {};
  const reviews = a.reviews || {};
  const tickets = a.tickets || {};
  const assets = a.assets || {};

  const deptDistribution = headcount.departmentDistribution || [];
  const orgGrowthTrend = headcount.orgGrowthTrend || [];
  const attendanceDailyTrend = attendance.dailyTrend || [];
  const leaveByType = leave.byType || [];
  const leaveMonthlyTrend = leave.monthlyTrend || [];
  const topLeaveTakers = leave.topLeaveTakers || [];
  const payrollMonthlyTrend = payroll.monthlyTrend || [];
  const payrollDeptWise = payroll.departmentWise || [];
  const reimbByType = reimbursement.byType || [];
  const reimbByStatus = reimbursement.byStatus || [];
  const reimbMonthlyTrend = reimbursement.monthlyTrend || [];
  const reviewByRating = reviews.byRating || [];
  const ticketByType = Object.entries(tickets.byType || {}).map(([type, count]) => ({ type, count }));
  const ticketByStatus = Object.entries(tickets.byStatus || {}).map(([status, count]) => ({ status, count }));
  const assetByType = assets.byType || [];

  const leaveApprovalPie = [
    { name: "Approved", value: leave.approved || 0 },
    { name: "Pending", value: leave.pending || 0 },
    { name: "Rejected", value: leave.rejected || 0 },
  ];

  const attendanceRadar = [
    { metric: "Present", value: attendance.present || 0 },
    { metric: "Half Day", value: attendance.halfDay || 0 },
    { metric: "Absent", value: attendance.absent || 0 },
  ];

  const fmtINR = (n) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n || 0}`;

  return (
    <div className="space-y-5">
      {/* ── Range controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FaChartLine className="text-[#730042]" size={14} />
          <h2 className="text-[15px] font-bold text-gray-900">Analytics Overview</h2>
          <button
            onClick={() => refetch()}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#730042]"
            title="Refresh"
          >
            <FaSyncAlt size={11} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                  preset === p.key ? "bg-white text-[#730042] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
              />
              <span className="text-gray-300 text-[11px]">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
              />
            </div>
          )}
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl px-4 py-3">
          Couldn't load analytics data. Try refreshing.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI row ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={FaUsers} label="Total Headcount" value={headcount.total || 0} accent={BRAND}
              sub={`${headcount.employees?.total || 0} emp · ${headcount.managers?.total || 0} mgr · ${headcount.admins?.total || 0} admin`} />
            <KpiCard icon={FaCalendarCheck} label="Attendance Rate" value={`${attendance.attendanceRate || 0}%`} accent="#2FB4A0"
              sub={`${attendance.present || 0} present of ${attendance.totalMarked || 0}`} />
            <KpiCard icon={FaClipboardCheck} label="Leave Requests" value={leave.totalRequests || 0} accent="#F5A623"
              sub={`${leave.approved || 0} approved · ${leave.pending || 0} pending`} />
            <KpiCard icon={FaMoneyBillWave} label="Payroll (latest month)" value={fmtINR(payroll.latestMonthTotal || 0)} accent="#4A6FDC"
              sub={`${payrollMonthlyTrend.length} month(s) tracked`} />
            <KpiCard icon={FaFileInvoiceDollar} label="Reimbursement Claims" value={reimbursement.totalClaims || 0} accent="#9B59B6"
              sub={`${fmtINR(reimbursement.totalAmount || 0)} claimed`} />
            <KpiCard icon={FaUserTie} label="Reviews Completed" value={`${reviews.completionRate || 0}%`} accent="#EB5757"
              sub={`avg score ${reviews.avgScore || 0}/5 · ${reviews.total || 0} total`} />
            <KpiCard icon={FaTicketAlt} label="Open Tickets/Complaints" value={
              Object.entries(tickets.byStatus || {}).filter(([s]) => !["resolved","closed","rejected"].includes(s)).reduce((sum,[,c])=>sum+c,0)
            } accent="#27AE60" sub={`${tickets.overdue || 0} overdue`} />
            <KpiCard icon={FaLaptop} label="Assets Tracked" value={assets.total || 0} accent="#CD166E"
              sub={`${assets.byStatus?.find(s=>s.status==="assigned")?.count || 0} assigned`} />
          </div>

          {/* ── Headcount & growth ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChartCard title="Organisation Growth" subtitle="New joiners across roles, last 6 months" height={260}>
                {orgGrowthTrend.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={orgGrowthTrend}>
                      <defs>
                        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BRAND} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="count" name="New joins" stroke={BRAND} fill="url(#growthFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </ChartCard>
            </div>
            <ChartCard title="Attendance Split" subtitle="Status breakdown, selected range" height={260}>
              {attendance.totalMarked ? (
                <ResponsiveContainer>
                  <RadarChart data={attendanceRadar} outerRadius="75%">
                    <PolarGrid stroke="#eee" />
                    <PolarAngleAxis dataKey="metric" tick={axisStyle} />
                    <PolarRadiusAxis tick={axisStyle} />
                    <Radar dataKey="value" stroke={BRAND} fill={BRAND} fillOpacity={0.35} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          <ChartCard title="Department-wise Headcount" subtitle="Employees, managers & admins per department" height={280}>
            {deptDistribution.some((d) => d.employees || d.managers || d.admins) ? (
              <ResponsiveContainer>
                <BarChart data={deptDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="department" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="employees" name="Employees" fill={BRAND} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="managers" name="Managers" fill="#CD166E" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="admins" name="Admins" fill="#F5A623" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          {/* ── Attendance trend ─────────────────────────────────────── */}
          <ChartCard title="Daily Attendance Trend" subtitle="Present / half-day / absent over the selected range" height={280}>
            {attendanceDailyTrend.length ? (
              <ResponsiveContainer>
                <LineChart data={attendanceDailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="present" name="Present" stroke="#2FB4A0" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="half_day" name="Half day" stroke="#F5A623" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="#EB5757" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          {/* ── Leave analytics ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Leave Approval Split" height={240}>
              {leaveApprovalPie.some((d) => d.value) ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={leaveApprovalPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {leaveApprovalPie.map((entry, i) => (
                        <Cell key={entry.name} fill={[BRAND, "#F5A623", "#EB5757"][i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard title="Leave Requests by Type" subtitle="EL / SL / ML / PL / LWP etc." height={240}>
                {leaveByType.length ? (
                  <ResponsiveContainer>
                    <BarChart data={leaveByType} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="type" tick={axisStyle} axisLine={false} tickLine={false} width={60} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="Requests" fill={BRAND} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </ChartCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChartCard title="Leave Volume Trend" subtitle="Requests filed per month, last 6 months" height={240}>
                {leaveMonthlyTrend.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={leaveMonthlyTrend}>
                      <defs>
                        <linearGradient id="leaveFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="count" name="Requests" stroke="#F5A623" fill="url(#leaveFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </ChartCard>
            </div>
            <ChartCard title="Top Leave Takers" subtitle="By approved days" height={240}>
              {topLeaveTakers.length ? (
                <div className="space-y-2.5 overflow-y-auto h-full pr-1">
                  {topLeaveTakers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F6E8EF] text-[#730042] text-[11px] font-bold">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-gray-700 truncate">{t.name || "—"}</p>
                        <p className="text-[10px] text-gray-400">{t.role || ""}</p>
                      </div>
                      <span className="text-[12px] font-bold text-[#730042]">{t.totalDays}d</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          {/* ── Payroll & reimbursement ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Payroll Cost Trend" subtitle="Net salary payout per month" height={260}>
              {payrollMonthlyTrend.length ? (
                <ResponsiveContainer>
                  <LineChart data={payrollMonthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtINR} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtINR(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="totalNet" name="Net payout" stroke="#4A6FDC" strokeWidth={2} />
                    <Line type="monotone" dataKey="totalCtc" name="Total CTC" stroke={BRAND} strokeWidth={2} strokeDasharray="4 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Reimbursement Claims" subtitle="By status" height={260}>
              {reimbByStatus.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={reimbByStatus} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {reimbByStatus.map((entry, i) => (
                        <Cell key={entry.status} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Reimbursement by Category" subtitle="Travel / Food / Medical / etc." height={240}>
              {reimbByType.length ? (
                <ResponsiveContainer>
                  <BarChart data={reimbByType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="type" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtINR} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtINR(v)} />
                    <Bar dataKey="amount" name="Amount" fill="#9B59B6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Reimbursement Trend" subtitle="Monthly claim amount" height={240}>
              {reimbMonthlyTrend.length ? (
                <ResponsiveContainer>
                  <AreaChart data={reimbMonthlyTrend}>
                    <defs>
                      <linearGradient id="reimbFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9B59B6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#9B59B6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtINR} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtINR(v)} />
                    <Area type="monotone" dataKey="amount" name="Amount" stroke="#9B59B6" fill="url(#reimbFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          {/* ── Reviews, tickets, assets ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Review Ratings" subtitle="Overall rating distribution" height={240}>
              {reviewByRating.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={reviewByRating} dataKey="count" nameKey="rating" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {reviewByRating.map((entry, i) => (
                        <Cell key={entry.rating} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Tickets by Status" height={240}>
              {ticketByStatus.length ? (
                <ResponsiveContainer>
                  <BarChart data={ticketByStatus} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="status" tick={{ ...axisStyle, fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Tickets" fill="#27AE60" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Assets by Type" height={240}>
              {assetByType.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={assetByType} dataKey="count" nameKey="type" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {assetByType.map((entry, i) => (
                        <Cell key={entry.type} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          {ticketByType.length > 0 && (
            <ChartCard title="Tickets & Complaints by Type" subtitle="suggestion / complaint / POSH / grievance / whistleblower" height={220}>
              <ResponsiveContainer>
                <BarChart data={ticketByType}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="type" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Count" fill={BRAND} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}