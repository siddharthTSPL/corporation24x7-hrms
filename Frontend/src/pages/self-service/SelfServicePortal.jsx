import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  FaCalendarAlt, FaFileInvoiceDollar, FaFolder, FaTicketAlt,
  FaClock, FaPlus, FaArrowRight, FaCheckCircle,
} from "react-icons/fa";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useSelfServiceSummary } from "../../auth/server-state/selfService/selfService.hook";

const BRAND = "#730042";
const PALETTE = ["#730042", "#CD166E", "#F5A623", "#2FB4A0", "#4A6FDC", "#9B59B6"];

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

function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-xs text-gray-400 py-6 text-center">{text}</p>;
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

export default function SelfServicePortal() {
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const role = auth?.role || "employee";
  const paths = ROLE_PATHS[role] || ROLE_PATHS.employee;
  const { data, isLoading, isError } = useSelfServiceSummary();

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-400">Loading Self Service Portal…</div>;
  }

  if (isError || !data) {
    return <div className="p-6 text-sm text-gray-400">Couldn't load your Self Service Portal right now. Please try again.</div>;
  }

  const isOrgScope = data.scope === "organisation";

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Self Service Portal</h1>
        <p className="text-sm text-gray-400">
          {isOrgScope
            ? "Organisation-wide leave, reimbursement, document, and ticket activity."
            : `Everything you need to manage your own leave, claims, documents, and tickets — ${ROLE_LABEL[role]} view.`}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<FaCalendarAlt />} label="Leave Balance (EL)" value={data.leave?.balance?.EL ?? "—"} sub={`${data.leave?.counts?.pending || 0} pending`} />
          <StatCard icon={<FaFileInvoiceDollar />} label="Claims Pending" value={data.reimbursement?.counts?.submitted || 0} sub={fmtCurrency(data.reimbursement?.totalClaimed)} />
          <StatCard icon={<FaFolder />} label="My Documents" value={data.documents?.total || 0} />
          <StatCard icon={data.attendance?.checkedIn ? <FaCheckCircle /> : <FaClock />} label="Today's Attendance" value={data.attendance?.checkedIn ? "Checked In" : "Not Checked In"} sub={data.attendance?.checkIn ? new Date(data.attendance.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<FaCalendarAlt />} label="Leave Requests" value={data.leave?.counts?.total || 0} sub={`${data.leave?.counts?.pending || 0} pending`} />
          <StatCard icon={<FaFileInvoiceDollar />} label="Reimbursements" value={data.reimbursement?.counts?.total || 0} sub={fmtCurrency(data.reimbursement?.totalClaimed)} />
          <StatCard icon={<FaFolder />} label="Documents" value={data.documents?.total || 0} />
          <StatCard icon={<FaTicketAlt />} label="Open Tickets" value={data.tickets?.counts?.open || 0} sub={`${data.tickets?.counts?.total || 0} total`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={isOrgScope ? "Leave requests by type" : "Reimbursement trend (last 6 months)"}>
          <ResponsiveContainer width="100%" height={220}>
            {isOrgScope ? (
              <BarChart data={data.leave?.byType || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
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
            )}
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Reimbursement claims by status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={Object.entries(data.reimbursement?.counts || {}).filter(([k]) => k !== "total").map(([status, count]) => ({ name: fmtStatus(status), value: count }))}
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

        <SectionCard title="Recent reimbursement claims" className={isOrgScope ? "lg:col-span-2" : ""}>
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

        <SectionCard title={isOrgScope ? "Documents by type" : "Recent documents"}>
          {isOrgScope ? (
            data.documents?.byType?.length ? (
              <ul className="space-y-2">
                {data.documents.byType.map((d) => (
                  <li key={d.type} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-600 capitalize">{d.type}</span>
                    <span className="font-semibold text-gray-700">{d.count}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState text="No documents yet" />
          ) : data.documents?.recent?.length ? (
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
      </div>
    </div>
  );
}