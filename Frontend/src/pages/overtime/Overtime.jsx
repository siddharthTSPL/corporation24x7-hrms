import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FaBusinessTime, FaCheck, FaTimes, FaTrash, FaEdit, FaPlus, FaSearch, FaMoneyBillWave } from "react-icons/fa";
import {
  getOvertimeAccess,
  applyOvertime,
  getMyOvertime,
  editMyOvertime,
  deleteMyOvertime,
  getOvertimeForReview,
  approveOvertime,
  rejectOvertime,
} from "../../auth/api/overtime/overtime.api";

const BRAND = "#730042";

const STATUS_STYLE = {
  pending: { label: "Pending", bg: "#FEF3C7", color: "#92400E" },
  approved: { label: "Approved", bg: "#DCFCE7", color: "#166534" },
  rejected: { label: "Rejected", bg: "#FEE2E2", color: "#991B1B" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const todayISO = () => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000); // IST
  return d.toISOString().slice(0, 10);
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";

const fmtHours = (h) => `${Number(h || 0).toFixed(2).replace(/\.?0+$/, "")} hr`;
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-2xl font-bold mt-1" style={{ color: BRAND }}>{value}</p>
    {sub ? <p className="text-xs text-gray-500 mt-0.5">{sub}</p> : null}
  </div>
);

/* ------------------------------------------------------------ apply modal */
function OvertimeFormModal({ initial, onClose, onSubmit, saving }) {
  const [mode, setMode] = useState(initial?.startTime ? "time" : "hours");
  const [form, setForm] = useState({
    date: initial?.date ? new Date(initial.date).toISOString().slice(0, 10) : todayISO(),
    hours: initial?.hours ?? "",
    startTime: initial?.startTime || "",
    endTime: initial?.endTime || "",
    reason: initial?.reason || "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const payload = { date: form.date, reason: form.reason };
    if (mode === "time") {
      payload.startTime = form.startTime;
      payload.endTime = form.endTime;
    } else {
      payload.hours = form.hours;
    }
    onSubmit(payload);
  };

  const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/30";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{initial ? "Edit overtime" : "Apply for overtime"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Date worked</label>
          <input type="date" required max={todayISO()} value={form.date} onChange={set("date")} disabled={!!initial} className={`${input} mt-1`} />
        </div>

        <div className="flex gap-2 text-sm">
          {[["hours", "Enter hours"], ["time", "Start / end time"]].map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 py-1.5 rounded-lg border font-medium ${mode === key ? "text-white border-transparent" : "text-gray-600 border-gray-300"}`}
              style={mode === key ? { background: BRAND } : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "hours" ? (
          <div>
            <label className="text-sm font-medium text-gray-700">Overtime hours</label>
            <input type="number" step="0.25" min="0.25" max="16" required value={form.hours} onChange={set("hours")} placeholder="e.g. 2.5" className={`${input} mt-1`} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">From</label>
              <input type="time" required value={form.startTime} onChange={set("startTime")} className={`${input} mt-1`} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">To</label>
              <input type="time" required value={form.endTime} onChange={set("endTime")} className={`${input} mt-1`} />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700">Reason</label>
          <textarea required rows={3} maxLength={500} value={form.reason} onChange={set("reason")} placeholder="What did you work on?" className={`${input} mt-1`} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: BRAND }}>
            {saving ? "Saving..." : initial ? "Save changes" : "Send to HR"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------- reject / approve */
function RemarksModal({ row, mode, onClose, onSubmit, saving }) {
  const [remarks, setRemarks] = useState("");
  const rejecting = mode === "reject";
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-gray-800">{rejecting ? "Reject overtime" : "Approve overtime"}</h3>
        <p className="text-sm text-gray-600">
          {row.requesterSnapshot?.name} · {fmtDate(row.date)} · {fmtHours(row.hours)}
          {!rejecting && row.estimate ? <> · will add about <b>{fmtMoney(row.estimate.amount)}</b> to payroll</> : null}
        </p>
        <textarea
          rows={3}
          maxLength={500}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={rejecting ? "Reason for rejection (required)" : "Remarks (optional)"}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/30"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600">Cancel</button>
          <button
            disabled={saving || (rejecting && !remarks.trim())}
            onClick={() => onSubmit(remarks)}
            className={`px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-60 ${rejecting ? "bg-red-600" : "bg-green-600"}`}
          >
            {saving ? "Please wait..." : rejecting ? "Reject" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ my overtime */
function MyOvertime() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { row? }
  const { data, isLoading } = useQuery({ queryKey: ["overtime", "my"], queryFn: () => getMyOvertime() });

  const refresh = () => qc.invalidateQueries({ queryKey: ["overtime"] });
  const onError = (e) => toast.error(e?.message || "Something went wrong");

  const create = useMutation({
    mutationFn: applyOvertime,
    onSuccess: (r) => { toast.success(r.message); setModal(null); refresh(); },
    onError,
  });
  const update = useMutation({
    mutationFn: editMyOvertime,
    onSuccess: (r) => { toast.success(r.message); setModal(null); refresh(); },
    onError,
  });
  const remove = useMutation({
    mutationFn: deleteMyOvertime,
    onSuccess: (r) => { toast.success(r.message); refresh(); },
    onError,
  });

  const rows = data?.overtime || [];
  const s = data?.summary || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={s.pending || 0} />
        <StatCard label="Approved" value={s.approved || 0} />
        <StatCard label="Approved hours" value={fmtHours(s.approvedHours)} />
        <StatCard label="Est. payroll add-on" value={fmtMoney(s.estimatedAmount)} sub="Approved overtime" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setModal({})} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: BRAND }}>
          <FaPlus /> Apply overtime
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payroll</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No overtime filed yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r._id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {fmtHours(r.hours)}
                  {r.startTime ? <div className="text-xs text-gray-400">{r.startTime} - {r.endTime}</div> : null}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-gray-700 break-words">{r.reason}</p>
                  {r.remarks ? <p className="text-xs text-gray-400 mt-1">HR: {r.remarks}</p> : null}
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">
                  {r.status !== "approved" ? <span className="text-gray-400">-</span> : r.payroll ? (
                    <span className="text-green-700 font-semibold">Added to {MONTHS[r.month - 1]} {r.year} payroll</span>
                  ) : (
                    <span className="text-gray-600">{r.estimate ? `≈ ${fmtMoney(r.estimate.amount)} · ` : ""}adds to {MONTHS[r.month - 1]} payroll</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.status === "pending" ? (
                    <>
                      <button title="Edit" onClick={() => setModal({ row: r })} className="p-2 text-gray-500 hover:text-[#730042]"><FaEdit /></button>
                      <button title="Withdraw" onClick={() => window.confirm("Withdraw this overtime request?") && remove.mutate(r._id)} className="p-2 text-gray-500 hover:text-red-600"><FaTrash /></button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal ? (
        <OvertimeFormModal
          initial={modal.row}
          saving={create.isPending || update.isPending}
          onClose={() => setModal(null)}
          onSubmit={(payload) => (modal.row ? update.mutate({ id: modal.row._id, data: payload }) : create.mutate(payload))}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- HR review */
function HRReview() {
  const qc = useQueryClient();
  const now = new Date();
  const [status, setStatus] = useState("pending");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState("");
  const [action, setAction] = useState(null); // { row, mode }

  const params = useMemo(() => {
    const p = {};
    if (status) p.status = status;
    if (month) p.month = month;
    if (year) p.year = year;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [status, month, year, search]);

  const { data, isLoading } = useQuery({
    queryKey: ["overtime", "review", params],
    queryFn: () => getOvertimeForReview(params),
  });

  const decide = useMutation({
    mutationFn: ({ mode, id, remarks }) => (mode === "reject" ? rejectOvertime({ id, remarks }) : approveOvertime({ id, remarks })),
    onSuccess: (r) => { toast.success(r.message); setAction(null); qc.invalidateQueries({ queryKey: ["overtime"] }); },
    onError: (e) => toast.error(e?.message || "Something went wrong"),
  });

  const rows = data?.overtime || [];
  const counts = data?.counts || {};
  const input = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/30";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pending review" value={counts.pending || 0} />
        <StatCard label="Approved" value={counts.approved || 0} />
        <StatCard label="Rejected" value={counts.rejected || 0} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["", "All"]].map(([v, l]) => (
            <button key={l} onClick={() => setStatus(v)} className={`px-3 py-2 font-medium ${status === v ? "text-white" : "text-gray-600 bg-white"}`} style={status === v ? { background: BRAND } : undefined}>{l}</button>
          ))}
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={input}>
          <option value="">All months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className={`${input} w-24`} />
        <div className="relative flex-1 min-w-[180px]">
          <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, department" className={`${input} w-full pl-8`} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Payroll value</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No overtime requests found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r._id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-800">{r.requesterSnapshot?.name || "-"}</p>
                  <p className="text-xs text-gray-400">{[r.requesterSnapshot?.role, r.requesterSnapshot?.employeeId, r.requesterSnapshot?.department].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {fmtHours(r.hours)}
                  {r.startTime ? <div className="text-xs text-gray-400">{r.startTime} - {r.endTime}</div> : null}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.estimate ? (
                    <>
                      <p className="font-semibold flex items-center gap-1"><FaMoneyBillWave className="text-green-600" /> {fmtMoney(r.estimate.amount)}</p>
                      <p className="text-xs text-gray-400">{fmtMoney(r.estimate.perHourSalary)}/hr · {fmtMoney(r.estimate.perDaySalary)}/day</p>
                    </>
                  ) : <span className="text-xs text-gray-400">No salary structure</span>}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-gray-700 break-words">{r.reason}</p>
                  {r.remarks ? <p className="text-xs text-gray-400 mt-1">Remark: {r.remarks}</p> : null}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                  {r.status === "approved" && r.payroll ? <p className="text-[11px] text-green-700 mt-1">In payroll</p> : null}
                  {r.reviewerName && r.status !== "pending" ? <p className="text-[11px] text-gray-400 mt-1">by {r.reviewerName}</p> : null}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.status === "pending" ? (
                    <>
                      <button onClick={() => setAction({ row: r, mode: "approve" })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold mr-2"><FaCheck /> Approve</button>
                      <button onClick={() => setAction({ row: r, mode: "reject" })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"><FaTimes /> Reject</button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {action ? (
        <RemarksModal
          row={action.row}
          mode={action.mode}
          saving={decide.isPending}
          onClose={() => setAction(null)}
          onSubmit={(remarks) => decide.mutate({ mode: action.mode, id: action.row._id, remarks })}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- page */
export default function Overtime() {
  const { data: access, isLoading } = useQuery({ queryKey: ["overtime", "access"], queryFn: getOvertimeAccess });
  const [tab, setTab] = useState(null);

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>;

  const tabs = [];
  if (access?.canApply) tabs.push({ key: "my", label: "My Overtime" });
  if (access?.canReview) tabs.push({ key: "review", label: "HR Review" });
  const active = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl" style={{ background: `${BRAND}15`, color: BRAND }}><FaBusinessTime size={20} /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Overtime</h1>
          <p className="text-sm text-gray-500">File extra hours worked. Once HR approves, they are added to your payroll automatically.</p>
        </div>
      </div>

      {tabs.length > 1 ? (
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${active === t.key ? "border-[#730042] text-[#730042]" : "border-transparent text-gray-500"}`}>{t.label}</button>
          ))}
        </div>
      ) : null}

      {active === "my" ? <MyOvertime /> : null}
      {active === "review" ? <HRReview /> : null}
      {!active ? <p className="text-gray-400">Overtime is not available for your account.</p> : null}
    </div>
  );
}