"use client";
import { useState } from "react";
import {
  useGetMyLeaves,
  useApplyLeave,
} from "../../auth/server-state/leave/leave.hook";
import {
  useGetManagerLeaves,
} from "../../auth/server-state/managerleave/managerleave.hook";
import {
  useGetAdminLeaves,
} from "../../auth/server-state/adminleave/adminleave.hook";

const leaveTypes = [
  { value: "el", label: "EL — Earned Leave" },
  { value: "sl", label: "SL — Sick Leave" },
  { value: "half_day_el", label: "½EL — Half Day EL" },
  { value: "half_day_sl", label: "½SL — Half Day SL" },
];

const STATUS_LABEL = {
  pending_manager:             "Pending (Manager)",
  approved_manager:            "Approved by Manager",
  rejected_manager:            "Rejected by Manager",
  forwarded_admin:             "Forwarded to Admin",
  forwarded_reporting_manager: "Forwarded to RM",
  approved_admin:              "Approved by Admin",
  rejected_admin:              "Rejected by Admin",
  approved_reporting_manager:  "Approved by RM",
  rejected_reporting_manager:  "Rejected by RM",
  pending_reporting_manager:   "Pending (RM)",
  pending_admin:               "Pending (Admin)",
  pending_superadmin:          "Pending (Super Admin)",
  approved_superadmin:         "Approved by Super Admin",
  rejected_superadmin:         "Rejected by Super Admin",
};

const LEAVE_LABEL = {
  el:          "Earned Leave",
  sl:          "Sick Leave",
  ml:          "Maternity Leave",
  pl:          "Paternity Leave",
  half_day_el: "Half Day EL",
  half_day_sl: "Half Day SL",
};

const humanStatus = (s) =>
  STATUS_LABEL[s] || (s || "Unknown").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const humanLeave = (t) => LEAVE_LABEL[t] || (t || "").toUpperCase();

const isApproved = (s) => s?.includes("approved");
const isPending  = (s) => s?.includes("pending") || s?.includes("forwarded");
const isRejected = (s) => s?.includes("rejected");

const statusColor = (s) => {
  if (isApproved(s)) return { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  border: "border-green-200"  };
  if (isRejected(s)) return { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    border: "border-red-200"    };
  return                    { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400", border: "border-yellow-200" };
};

const leaveColor = (t) => {
  if (t === "el" || t === "half_day_el") return { bg: "bg-green-50",  text: "text-green-700"  };
  if (t === "sl" || t === "half_day_sl") return { bg: "bg-blue-50",   text: "text-blue-700"   };
  if (t === "ml")                        return { bg: "bg-purple-50", text: "text-purple-700" };
  if (t === "pl")                        return { bg: "bg-amber-50",  text: "text-amber-700"  };
  return                                        { bg: "bg-gray-100",  text: "text-gray-700"   };
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysDiff = (s, e) => {
  if (!s || !e) return 0;
  const n = Math.floor((new Date(e) - new Date(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = { leaveType: "el", startDate: "", endDate: "", reason: "" };

const StatusBadge = ({ status }) => {
  const c = statusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
      {humanStatus(status)}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const c = leaveColor(type);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {humanLeave(type)}
    </span>
  );
};

const EmptyState = ({ msg = "No records found" }) => (
  <div className="flex flex-col items-center py-14 gap-3">
    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">📋</div>
    <p className="text-sm text-gray-400 font-medium">{msg}</p>
  </div>
);

const LeaveCard = ({ leave, source }) => {
  const person =
    source === "manager" ? (leave.manager || leave.employee || {}) :
    source === "admin"   ? (leave.admin   || leave.employee || {}) :
    {};
  const days = leave.days || daysDiff(leave.startDate, leave.endDate);
  const sc = statusColor(leave.status);

  return (
    <div className={`bg-white rounded-xl border ${sc.border} p-4 mb-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${sc.dot}`}/>
      <div className="pl-3">
        {source !== "employee" && (person.f_name || person.l_name) && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {(person.f_name?.[0] || "")}{(person.l_name?.[0] || "")}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{person.f_name} {person.l_name}</div>
              {person.work_email && <div className="text-xs text-gray-400">{person.work_email}</div>}
            </div>
            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${source === "manager" ? "bg-purple-100 text-purple-700" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>
              {source === "manager" ? "Manager" : "Admin"}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <TypeBadge type={leave.leaveType}/>
          <StatusBadge status={leave.status}/>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            {days} day{days > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 13 13"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="currentColor" strokeWidth="1"/><path d="M1 6h11" stroke="currentColor" strokeWidth="1"/><path d="M4 1v2M9 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
          <span className="font-medium text-gray-700">{fmt(leave.startDate)}</span>
          <span className="text-gray-300">→</span>
          <span className="font-medium text-gray-700">{fmt(leave.endDate)}</span>
          {leave.createdAt && (
            <span className="ml-auto text-gray-400">Applied {fmt(leave.createdAt)}</span>
          )}
        </div>

        {leave.reason && (
          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 border-l-2 border-gray-300 leading-relaxed">
            <span className="font-semibold text-gray-700">Reason — </span>{leave.reason}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryBar = ({ leaves }) => {
  const total    = leaves.length;
  const approved = leaves.filter(l => isApproved(l.status)).length;
  const pending  = leaves.filter(l => isPending(l.status)).length;
  const rejected = leaves.filter(l => isRejected(l.status)).length;

  return (
    <div className="flex gap-3 mb-4 flex-wrap">
      {[
        { label: "Total",    val: total,    cls: "text-[var(--primary)] border-[var(--primary)]" },
        { label: "Approved", val: approved, cls: "text-green-600 border-green-400" },
        { label: "Pending",  val: pending,  cls: "text-yellow-600 border-yellow-400" },
        { label: "Rejected", val: rejected, cls: "text-red-600 border-red-400" },
      ].map(s => (
        <div key={s.label} className={`bg-white rounded-xl border-t-4 ${s.cls} px-4 py-2.5 shadow-sm min-w-[80px] flex flex-col items-center`}>
          <span className={`text-xl font-bold ${s.cls.split(" ")[0]}`}>{s.val}</span>
          <span className="text-xs text-gray-400 font-medium">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function LeavePage() {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [errors, setErrors]   = useState({});
  const [histTab, setHistTab] = useState("employee");

  const { data: myLeavesRaw,      isLoading: myLoading      } = useGetMyLeaves();
  const { data: managerLeavesRaw, isLoading: managerLoading } = useGetManagerLeaves();
  const { data: adminLeavesRaw,   isLoading: adminLoading   } = useGetAdminLeaves();
  const applyMut = useApplyLeave();

  const myLeaves      = Array.isArray(myLeavesRaw)      ? myLeavesRaw      : (myLeavesRaw?.leaves      || []);
  const managerLeaves = Array.isArray(managerLeavesRaw) ? managerLeavesRaw : (managerLeavesRaw?.leaves  || []);
  const adminLeaves   = Array.isArray(adminLeavesRaw)   ? adminLeavesRaw   : (adminLeavesRaw?.leaves    || []);

  const days = daysDiff(form.startDate, form.endDate);

  const validate = () => {
    const e = {};
    if (!form.leaveType)  e.leaveType  = "Select a leave type";
    if (!form.startDate)  e.startDate  = "Required";
    if (!form.endDate)    e.endDate    = "Required";
    if ((form.reason || "").trim().length < 5) e.reason = "Min 5 characters";
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) e.endDate = "End date before start";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await applyMut.mutateAsync(form);
      setOpen(false);
      setForm(EMPTY_FORM);
      setErrors({});
    } catch (err) {
      setErrors({ submit: err?.response?.data?.message || err?.message || "Something went wrong" });
    }
  };

  const activeLeaves =
    histTab === "manager"  ? managerLeaves :
    histTab === "admin"    ? adminLeaves   :
    myLeaves;

  const activeLoading =
    histTab === "manager"  ? managerLoading :
    histTab === "admin"    ? adminLoading   :
    myLoading;

  const ib = (k) => errors[k] ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-[var(--primary)]/20";

  const HIST_TABS = [
    { key: "employee", label: "My Leaves"      },
    { key: "manager",  label: "Manager Leaves" },
    { key: "admin",    label: "Admin Leaves"   },
  ];

  return (
    <div className="min-h-screen bg-background px-3 sm:px-6 md:px-10 py-6">
      <div className="max-w-4xl mx-auto">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary)]">Leave Management</h1>
            <p className="text-xs sm:text-sm text-gray-500">Track and manage your leave requests</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm shadow hover:opacity-90 hover:scale-95 transition"
          >
            + Apply Leave
          </button>
        </div>

        <SummaryBar leaves={myLeaves}/>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-4 pt-4 pb-0 flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1">
              {HIST_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setHistTab(t.key)}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition border-b-2 ${
                    histTab === t.key
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    histTab === t.key ? "bg-[var(--primary)] text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {t.key === "employee" ? myLeaves.length : t.key === "manager" ? managerLeaves.length : adminLeaves.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-[var(--primary)] rounded-full animate-spin"/>
              </div>
            ) : activeLeaves.length === 0 ? (
              <EmptyState msg={`No ${histTab === "employee" ? "leave" : histTab} records found`}/>
            ) : (
              activeLeaves.map((leave, idx) => (
                <LeaveCard key={leave._id || idx} leave={leave} source={histTab}/>
              ))
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--primary)]">Apply Leave</h2>
              <button onClick={() => { setOpen(false); setForm(EMPTY_FORM); setErrors({}); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Leave Type <span className="text-red-500">*</span></label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 transition ${ib("leaveType")}`}
                >
                  {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {errors.leaveType && <p className="text-xs text-red-500 mt-1">{errors.leaveType}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.startDate}
                    min={todayStr()}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 transition ${ib("startDate")}`}
                  />
                  {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">End Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || todayStr()}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 transition ${ib("endDate")}`}
                  />
                  {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                </div>
              </div>

              {days > 0 && (
                <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-lg px-3 py-2 text-sm text-[var(--primary)] font-semibold flex items-center gap-2">
                  <span>📅</span> {days} day{days > 1 ? "s" : ""} · {humanLeave(form.leaveType)}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={form.reason}
                  placeholder="Briefly explain the reason for your leave…"
                  rows={3}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 transition resize-none ${ib("reason")}`}
                />
                {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{errors.submit}</div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setOpen(false); setForm(EMPTY_FORM); setErrors({}); }}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={applyMut?.isPending}
                  className="flex-1 bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applyMut?.isPending ? "Submitting…" : "Submit →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}