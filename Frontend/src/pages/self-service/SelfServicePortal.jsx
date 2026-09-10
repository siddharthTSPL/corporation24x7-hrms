import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  FaCalendarAlt, FaFileInvoiceDollar, FaFolder, FaTicketAlt,
  FaClock, FaPlus, FaArrowRight, FaCheckCircle, FaPercentage,
  FaChartLine, FaDownload, FaLaptop, FaTimes, FaChevronRight,
} from "react-icons/fa";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useSelfServiceSummary } from "../../auth/server-state/selfService/selfService.hook";
import { useMyPayslips } from "../../auth/server-state/payroll/payroll.hook";
import { downloadPayslip, MONTH_NAMES } from "../utils/Payslip";

const BRAND = "#730042";
const PALETTE = ["#730042", "#CD166E", "#F5A623", "#2FB4A0", "#4A6FDC", "#9B59B6", "#EB5757", "#27AE60"];

const ROLE_PATHS = {
  employee: { leave: "/leave-employee", reimbursement: "/reimbursement-employee", documents: "/file-employee", tickets: "/employee-complaints" },
  manager: { leave: "/leave-manager", reimbursement: "/reimbursement-manager", documents: "/file-manager", tickets: "/manager-complaints" },
  admin: { leave: "/leave-admin", reimbursement: "/reimbursement-admin", documents: "/document-admin", tickets: "/admin-complaints" },
  superadmin: { leave: "/superadmin-leaves", reimbursement: "/superadmin-reimbursement", documents: "/superadmin-documents", tickets: "/superadmin-complaints" },
};

const ROLE_LABEL = { employee: "Employee", manager: "Manager", admin: "Admin", superadmin: "Super Admin" };

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${BRAND}1A`, color: BRAND }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-800 truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({ icon, title, blurb, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-[#730042]/40 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${BRAND}1A`, color: BRAND }}>
          {icon}
        </div>
        <FaArrowRight className="text-gray-300 group-hover:text-[#730042] transition-colors" size={12} />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-800">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{blurb}</p>
    </button>
  );
}

function SectionCard({ title, action, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ children }) {
  return <h2 className="text-sm font-bold uppercase tracking-wide text-[#730042]/70 mt-2">{children}</h2>;
}

function EmptyState({ text }) {
  return <p className="text-xs text-gray-400 py-10 text-center">{text}</p>;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtStatus(s = "") {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtCurrency(n = 0) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function DetailRow({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700 text-right">{value}</span>
    </div>
  );
}

// Detail modal for a single asset assignment record — shown when the user
// clicks an entry in the Asset history / activity list.
function AssetDetailModal({ asset, isOrgScope, onClose }) {
  if (!asset) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{asset.asset_name}</p>
            <p className="text-[11px] text-gray-400">{asset.asset_code}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={asset.is_returned ? { background: "#F3F4F6", color: "#6B7280" } : { background: `${BRAND}1A`, color: BRAND }}
            >
              {asset.is_returned ? "Returned" : "Assigned"}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FaTimes size={14} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Asset Details</p>
          <DetailRow label="Type" value={asset.asset_type ? fmtStatus(asset.asset_type) : undefined} />
          <DetailRow label="Brand" value={asset.brand} />
          <DetailRow label="Model" value={asset.model_number} />
          <DetailRow label="Serial Number" value={asset.serial_number} />
          <DetailRow label="Condition" value={asset.condition ? fmtStatus(asset.condition) : undefined} />
          <DetailRow label="Current Status" value={asset.asset_status ? fmtStatus(asset.asset_status) : undefined} />
          <DetailRow label="Purchase Date" value={asset.purchase_date ? fmtDate(asset.purchase_date) : undefined} />
          <DetailRow label="Purchase Price" value={asset.purchase_price != null ? fmtCurrency(asset.purchase_price) : undefined} />
          <DetailRow label="Notes" value={asset.notes} />

          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-4 mb-1">Assignment</p>
          {isOrgScope && <DetailRow label="Held By" value={asset.assigned_to_model} />}
          <DetailRow label="Quantity" value={asset.quantity} />
          <DetailRow label="Assigned Date" value={fmtDate(asset.assigned_date)} />
          {asset.is_returned && (
            <>
              <DetailRow label="Returned Date" value={fmtDate(asset.returned_date)} />
              <DetailRow label="Return Condition" value={asset.return_condition ? fmtStatus(asset.return_condition) : undefined} />
              <DetailRow label="Return Notes" value={asset.return_notes} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// "My Payslip" — available on every plan, including Basic. Shows once
// payroll has been marked "paid"; nothing to show before that.
function MyPayslipsCard({ enabled }) {
  const { data, isLoading, isError } = useMyPayslips(enabled);
  const payslips = data?.payslips || [];

  const handleDownload = (payroll) => {
    const snap = payroll.employeeSnapshot || {};
    downloadPayslip({
      payroll,
      name: snap.name || "—",
      employeeId: snap.employeeId || "—",
      department: snap.department || "—",
      designation: snap.designation || "—",
      bankName: snap.bankName,
      accountNumber: snap.accountNumber,
      orgName: payroll.organisationSnapshot?.name || "",
    });
  };

  return (
    <SectionCard title="My Payslip">
      {isLoading ? (
        <p className="text-xs text-gray-400 py-6 text-center">Loading your payslips…</p>
      ) : isError ? (
        <p className="text-xs text-gray-400 py-6 text-center">Couldn't load your payslips right now.</p>
      ) : payslips.length === 0 ? (
        <EmptyState text="No paid payslip yet. Once payroll marks a month as Paid, it will appear here for download." />
      ) : (
        <div className="space-y-2">
          {payslips.slice(0, 6).map((p) => (
            <div key={p._id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">{MONTH_NAMES[p.month - 1]} {p.year}</p>
                <p className="text-[11px] text-gray-400">Net Pay: {fmtCurrency(p.netSalary)}</p>
              </div>
              <button
                onClick={() => handleDownload(p)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#730042] hover:text-[#CD166E] flex-shrink-0"
              >
                <FaDownload size={11} /> Download
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default function SelfServicePortal() {
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const role = auth?.role || "employee";
  const paths = ROLE_PATHS[role] || ROLE_PATHS.employee;
  const { data, isLoading, isError } = useSelfServiceSummary();
  const [selectedAsset, setSelectedAsset] = useState(null);

  const radarData = useMemo(() => {
    if (!data) return [];
    const leaveDecided = (data.leave?.counts?.approved || 0) + (data.leave?.counts?.rejected || 0);
    const leaveApprovalRate = leaveDecided > 0 ? Math.round(((data.leave?.counts?.approved || 0) / leaveDecided) * 100) : 0;
    const ticketResolutionRate = data.tickets?.counts?.total ? Math.round((data.tickets.counts.resolved / data.tickets.counts.total) * 100) : 0;
    return [
      { metric: "Attendance", value: data.attendance?.attendanceRate ?? 0 },
      { metric: "Leave Approval", value: leaveApprovalRate },
      { metric: "Claim Approval", value: data.reimbursement?.approvalRate ?? 0 },
      { metric: "Ticket Resolution", value: ticketResolutionRate },
    ];
  }, [data]);

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-400">Loading Self Service Portal…</div>;
  }

  if (isError || !data) {
    return <div className="p-6 text-sm text-gray-400">Couldn't load your Self Service Portal right now. Please try again.</div>;
  }

  const isOrgScope = data.scope === "organisation";
  const attendance = data.attendance;
  const currentAttendanceMonth = attendance?.monthlyTrend?.[attendance.monthlyTrend.length - 1];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Self Service Portal</h1>
        <p className="text-sm text-gray-400">
          {isOrgScope
            ? "Organisation-wide leave, reimbursement, document, attendance, and ticket activity."
            : `Everything you need to manage your own leave, claims, documents, attendance, and tickets — ${ROLE_LABEL[role]} view.`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {!isOrgScope && (
          <ActionCard icon={<FaPlus size={14} />} title="Apply Leave" blurb="Request time off" onClick={() => navigate(paths.leave)} />
        )}
        <ActionCard icon={<FaFileInvoiceDollar size={14} />} title={isOrgScope ? "Reimbursements" : "Submit Claim"} blurb={isOrgScope ? "Review org claims" : "Raise an expense claim"} onClick={() => navigate(paths.reimbursement)} />
        <ActionCard icon={<FaFolder size={14} />} title={isOrgScope ? "Documents" : "Upload Document"} blurb={isOrgScope ? "Team documents" : "Add a personal document"} onClick={() => navigate(paths.documents)} />
        <ActionCard icon={<FaTicketAlt size={14} />} title={isOrgScope ? "TorchX Voice" : "Raise Ticket"} blurb={isOrgScope ? "Support tickets, org-wide" : "Report an issue"} onClick={() => navigate(paths.tickets)} />
      </div>

      {!isOrgScope ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard icon={<FaCalendarAlt />} label="EL Remaining" value={data.leave?.balance?.EL?.remaining ?? "—"} sub={`${data.leave?.counts?.pending || 0} pending`} />
          <StatCard icon={<FaCalendarAlt />} label="SL Remaining" value={data.leave?.balance?.SL?.remaining ?? "—"} />
          <StatCard icon={<FaFileInvoiceDollar />} label="Claims Pending" value={data.reimbursement?.counts?.submitted || 0} sub={fmtCurrency(data.reimbursement?.totalClaimed)} />
          <StatCard icon={<FaPercentage />} label="Claim Approval Rate" value={data.reimbursement?.approvalRate != null ? `${data.reimbursement.approvalRate}%` : "—"} />
          <StatCard icon={<FaFolder />} label="My Documents" value={data.documents?.total || 0} sub={`${data.documents?.totalSizeMb || 0} MB used`} />
          <StatCard icon={<FaTicketAlt />} label="Open Tickets" value={data.tickets?.counts?.open || 0} sub={`${data.tickets?.counts?.total || 0} total`} />
          <StatCard icon={<FaLaptop />} label="Assets Held" value={data.assets?.counts?.currently_assigned || 0} sub={`${data.assets?.counts?.returned || 0} returned`} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard icon={<FaCalendarAlt />} label="Leave Requests" value={data.leave?.counts?.total || 0} sub={`${data.leave?.counts?.pending || 0} pending`} />
          <StatCard icon={<FaFileInvoiceDollar />} label="Reimbursements" value={data.reimbursement?.counts?.total || 0} sub={fmtCurrency(data.reimbursement?.totalClaimed)} />
          <StatCard icon={<FaPercentage />} label="Claim Approval Rate" value={data.reimbursement?.approvalRate != null ? `${data.reimbursement.approvalRate}%` : "—"} />
          <StatCard icon={<FaFolder />} label="Documents" value={data.documents?.total || 0} sub={`${data.documents?.totalSizeMb || 0} MB used`} />
          <StatCard icon={<FaTicketAlt />} label="Open Tickets" value={data.tickets?.counts?.open || 0} sub={`${data.tickets?.counts?.total || 0} total`} />
          <StatCard icon={<FaChartLine />} label="Org Attendance Rate" value={data.attendance?.attendanceRate != null ? `${data.attendance.attendanceRate}%` : "—"} sub="this month" />
          <StatCard icon={<FaLaptop />} label="Assets" value={data.assets?.counts?.assigned || 0} sub={`${data.assets?.counts?.total || 0} total`} />
        </div>
      )}

      {!isOrgScope && <MyPayslipsCard enabled={!isOrgScope} />}

      <SectionHeading>Overview</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Self service health">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} outerRadius={75}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar dataKey="value" stroke={BRAND} fill={BRAND} fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Reimbursement claims by status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={Object.entries(data.reimbursement?.counts || {}).filter(([k]) => k !== "total" && k !== "draft").map(([status, count]) => ({ name: fmtStatus(status), value: count }))}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {PALETTE.map((color, i) => <Cell key={i} fill={color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Tickets by type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={(data.tickets?.byType || []).map((t) => ({ name: fmtStatus(t.type), value: t.count }))}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {PALETTE.map((color, i) => <Cell key={i} fill={color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionHeading>Leave</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {!isOrgScope && (
          <SectionCard title="Leave balance (EL / SL)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { name: "EL", Entitled: data.leave?.balance?.EL?.entitled || 0, Availed: data.leave?.balance?.EL?.availed || 0, Remaining: data.leave?.balance?.EL?.remaining || 0 },
                  { name: "SL", Entitled: data.leave?.balance?.SL?.entitled || 0, Availed: data.leave?.balance?.SL?.availed || 0, Remaining: data.leave?.balance?.SL?.remaining || 0 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Entitled" fill={PALETTE[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Availed" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Remaining" fill={BRAND} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        <SectionCard title="Leave days taken (last 6 months)" className={isOrgScope ? "lg:col-span-2" : ""}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.leave?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="days" stroke={BRAND} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Leave requests by type">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.leave?.byType || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionHeading>Reimbursement</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Claimed amount trend (last 6 months)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.reimbursement?.monthlyTrend || []}>
              <defs>
                <linearGradient id="ssAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtCurrency(v)} />
              <Area type="monotone" dataKey="amount" stroke={BRAND} fill="url(#ssAmount)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Claimed amount by type">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.reimbursement?.byType || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtCurrency(v)} />
              <Bar dataKey="amount" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionHeading>Documents & Tickets</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Documents uploaded (last 6 months)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.documents?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={PALETTE[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Tickets raised (last 6 months)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.tickets?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke={PALETTE[4]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionHeading>Assets</SectionHeading>
      <div className="grid grid-cols-1 gap-4">
        <SectionCard title={isOrgScope ? "Recent asset activity" : "Asset history"}>
          {data.assets?.recent?.length ? (
            <ul className="space-y-2">
              {data.assets.recent.map((a, i) => (
                <li
                  key={a.assignment_id || i}
                  onClick={() => setSelectedAsset(a)}
                  className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-1 px-1 rounded"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">
                      {a.asset_name} <span className="text-gray-400 font-normal">({a.asset_code})</span>
                      {isOrgScope && <span className="text-gray-400 font-normal"> · {a.assigned_to_model}</span>}
                    </p>
                    <p className="text-gray-400">
                      Assigned {fmtDate(a.assigned_date)}
                      {a.is_returned ? ` · Returned ${fmtDate(a.returned_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={a.is_returned ? { background: "#F3F4F6", color: "#6B7280" } : { background: `${BRAND}1A`, color: BRAND }}
                    >
                      {a.is_returned ? "Returned" : "Assigned"}
                    </span>
                    <FaChevronRight className="text-gray-300" size={10} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState text="No asset assignment history yet" />}
        </SectionCard>
      </div>

      <SectionHeading>Attendance</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {!isOrgScope && (
          <StatCard
            icon={attendance?.today?.checkedIn ? <FaCheckCircle /> : <FaClock />}
            label="Today's Attendance"
            value={attendance?.today?.checkedIn ? "Checked In" : "Not Checked In"}
            sub={attendance?.today?.checkIn ? new Date(attendance.today.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined}
          />
        )}
        <SectionCard title="Attendance this month">
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold" style={{ color: BRAND }}>{attendance?.attendanceRate != null ? `${attendance.attendanceRate}%` : "—"}</p>
            <div className="text-xs text-gray-500">
              <p>Present: {currentAttendanceMonth?.present ?? 0}</p>
              <p>Half day: {currentAttendanceMonth?.half ?? 0}</p>
              <p>Absent: {currentAttendanceMonth?.absent ?? 0}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Attendance trend (last 6 months)" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendance?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="present" stackId="a" fill={PALETTE[3]} />
              <Bar dataKey="half" stackId="a" fill={PALETTE[2]} />
              <Bar dataKey="absent" stackId="a" fill={PALETTE[6]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionHeading>Recent Activity</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {!isOrgScope && (
          <SectionCard title="Recent leave requests">
            {data.leave?.recent?.length ? (
              <ul className="space-y-2">
                {data.leave.recent.map((l) => (
                  <li key={l._id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-700 uppercase">{l.leaveType}</p>
                      <p className="text-gray-400">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${BRAND}1A`, color: BRAND }}>
                      {fmtStatus(l.status)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState text="No leave requests yet" />}
          </SectionCard>
        )}

        <SectionCard title="Recent reimbursement claims">
          {data.reimbursement?.recent?.length ? (
            <ul className="space-y-2">
              {data.reimbursement.recent.map((c) => (
                <li key={c._id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-700">{c.reimbursementType}</p>
                    <p className="text-gray-400">{c.claimNumber} · {fmtDate(c.expenseDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-700">{fmtCurrency(c.amountClaimed)}</p>
                    <span className="text-[10px] text-gray-400">{fmtStatus(c.status)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState text="No reimbursement claims yet" />}
        </SectionCard>

        <SectionCard title="Recent tickets">
          {data.tickets?.recent?.length ? (
            <ul className="space-y-2">
              {data.tickets.recent.map((t) => (
                <li key={t._id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-700">{t.ticketNumber}</p>
                    <p className="text-gray-400 capitalize">{t.type} · {fmtDate(t.createdAt)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${BRAND}1A`, color: BRAND }}>
                    {fmtStatus(t.status)}
                  </span>
                </li>
              ))}
            </ul>
          ) : <EmptyState text="No tickets yet" />}
        </SectionCard>

        {isOrgScope && (
          <SectionCard title="Documents by type">
            {data.documents?.byType?.length ? (
              <ul className="space-y-2">
                {data.documents.byType.map((d) => (
                  <li key={d.type} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-600 capitalize">{d.type}</span>
                    <span className="font-semibold text-gray-700">{d.count}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState text="No documents yet" />}
          </SectionCard>
        )}

        {!isOrgScope && (
          <SectionCard title="Recent documents">
            {data.documents?.recent?.length ? (
              <ul className="space-y-2">
                {data.documents.recent.map((d) => (
                  <li key={d._id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-600 truncate pr-2">{d.title}</span>
                    <span className="text-gray-400">{fmtDate(d.uploadedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState text="No documents yet" />}
          </SectionCard>
        )}
      </div>

      <AssetDetailModal asset={selectedAsset} isOrgScope={isOrgScope} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}