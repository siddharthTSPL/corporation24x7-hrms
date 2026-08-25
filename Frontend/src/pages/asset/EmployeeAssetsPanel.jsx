import { useState } from "react";
import {
  FaSearch, FaUser, FaUserTie, FaUserShield, FaHistory, FaTimes,
  FaBoxOpen, FaCheckCircle, FaUndo, FaChevronRight,
} from "react-icons/fa";

const ROLE_META = {
  Admin:   { label: "Admin",    icon: <FaUserShield size={10} />, color: "#730042", bg: "#f7ecf3", border: "#e8d5e2" },
  Manager: { label: "Manager",  icon: <FaUserTie size={10} />,    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  User:    { label: "Employee", icon: <FaUser size={10} />,       color: "#0d9e6e", bg: "#e8f7f1", border: "#a7f3d0" },
};

// Kept in sync with DEPT_FULL_FORMS in the employee directory component —
// short department codes (OPR, BPO, ENG, HR, MGMT) shown as full names here.
const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function deptLabel(dept) {
  if (!dept) return "";
  return DEPT_FULL_FORMS[dept] || dept;
}

function RoleChip({ model }) {
  const m = ROLE_META[model] || ROLE_META.User;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function Avatar({ f_name, l_name }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#FBEAF0] flex items-center justify-center text-[11px] font-bold text-[#730042] flex-shrink-0">
      {((f_name || "?")[0] + (l_name || "?")[0]).toUpperCase()}
    </div>
  );
}

/**
 * Row in the employee history timeline — one assignment (assign + optional revoke).
 */
function HistoryRow({ item }) {
  return (
    <div className="flex gap-3 py-3 border-b border-[#FBEAF0] last:border-b-0">
      <div className="flex flex-col items-center pt-0.5">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: item.is_returned ? "#b8760a" : "#0d9e6e" }}
        />
        <div className="w-px flex-1 bg-[#F4C0D1] mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[12.5px] font-semibold text-[#730042]">
            {item.asset_name} {item.quantity > 1 ? `× ${item.quantity}` : ""}
          </p>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
            style={
              item.is_returned
                ? { color: "#b8760a", background: "#fff8e1", borderColor: "#ffe082" }
                : { color: "#0d9e6e", background: "#e8f7f1", borderColor: "#a7f3d0" }
            }
          >
            {item.is_returned ? <><FaUndo size={9} /> Revoked</> : <><FaCheckCircle size={9} /> Active</>}
          </span>
        </div>
        <p className="text-[10px] text-[#993556] font-mono mt-0.5">{item.asset_code}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-[#7a5568]">
          <span>Assigned: <span className="font-semibold text-[#0d0209]">{fmtDate(item.assigned_date)}</span></span>
          {item.is_returned && (
            <span>Revoked: <span className="font-semibold text-[#0d0209]">{fmtDate(item.returned_date)}</span></span>
          )}
          {item.is_returned && item.return_condition && (
            <span>Condition on return: <span className="font-semibold capitalize text-[#0d0209]">{item.return_condition}</span></span>
          )}
        </div>
        {item.is_returned && item.return_notes && (
          <p className="text-[11px] text-[#993556] italic mt-1">“{item.return_notes}”</p>
        )}
      </div>
    </div>
  );
}

function EmployeeHistoryDrawer({ open, onClose, employeeSummary, historyData, isLoading }) {
  if (!open) return null;
  const employee = historyData?.employee || employeeSummary || {};
  const history = historyData?.history || [];
  const currentlyAssigned = historyData?.currently_assigned || [];
  const returnedHistory = historyData?.returned_history || [];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-end bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg h-[92vh] sm:h-full shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none animate-[modalUp_0.22s_ease-out]">
        <div className="sticky top-0 z-10 bg-white px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar f_name={employee.f_name} l_name={employee.l_name} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-[#0d0209] truncate">
                {employee.f_name} {employee.l_name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleChip model={employee.person_model || employeeSummary?.person_model} />
                {employee.empid && <span className="text-[10px] text-[#993556] font-mono">{employee.empid}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0">
            <FaTimes size={13} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#993556]">
              <span className="text-2xl">⏳</span>
              <p className="text-[12px]">Loading history…</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-[#F9F8F2] border border-[#F4C0D1] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#730042]">{history.length}</p>
                  <p className="text-[9px] uppercase font-bold tracking-wider text-[#993556] mt-0.5">Total Records</p>
                </div>
                <div className="bg-[#e8f7f1] border border-[#a7f3d0] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#0d9e6e]">{currentlyAssigned.length}</p>
                  <p className="text-[9px] uppercase font-bold tracking-wider text-[#0d9e6e] mt-0.5">Currently Held</p>
                </div>
                <div className="bg-[#fff8e1] border border-[#ffe082] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#b8760a]">{returnedHistory.length}</p>
                  <p className="text-[9px] uppercase font-bold tracking-wider text-[#b8760a] mt-0.5">Revoked</p>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                  <FaBoxOpen size={28} className="text-[#F4C0D1]" />
                  <p className="text-[13px] font-semibold text-[#993556]">No asset history found</p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#7a5568] mb-1">
                    Assignment Timeline
                  </p>
                  <div>
                    {history.map((item) => (
                      <HistoryRow key={item.assignment_id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Employee Assets tab — shows every employee/manager/admin who currently holds
 * at least one asset, with a summary count. Clicking a row opens the full
 * assign/revoke history (with dates) for that person.
 *
 * `useEmployees` and `useHistory` are the react-query hooks to use — passed in
 * so this one component works for both the Admin and SuperAdmin asset pages.
 */
export default function EmployeeAssetsPanel({ useEmployees, useHistory }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // { person_id, person_model, ...summary }

  const { data, isLoading } = useEmployees();
  const { data: historyData, isLoading: historyLoading } = useHistory(
    selected?.person_id,
    selected?.person_model
  );

  const rawEmployees = data?.employees ?? [];
  const employees = search
    ? rawEmployees.filter((e) =>
        `${e.f_name || ""} ${e.l_name || ""}`.toLowerCase().includes(search.toLowerCase()) ||
        e.empid?.toLowerCase().includes(search.toLowerCase()) ||
        e.designation?.toLowerCase().includes(search.toLowerCase()) ||
        e.department?.toLowerCase().includes(search.toLowerCase()) ||
        deptLabel(e.department).toLowerCase().includes(search.toLowerCase())
      )
    : rawEmployees;

  const totalHolders = rawEmployees.length;
  const totalUnitsHeld = rawEmployees.reduce((s, e) => s + (e.total_assets_assigned || 0), 0);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-2xl border border-[#F4C0D1] shadow-sm p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#730042" }} />
          <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#730042" }}>People Holding Assets</p>
          <p className="text-3xl font-bold text-[#730042]">{isLoading ? "—" : totalHolders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#F4C0D1] shadow-sm p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#2563eb" }} />
          <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#2563eb" }}>Units Currently Out</p>
          <p className="text-3xl font-bold text-[#2563eb]">{isLoading ? "—" : totalUnitsHeld}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F4C0D1] overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#F4C0D1] bg-[#F9F8F2]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#993556]" size={11} />
            <input
              className="w-full pl-9 pr-3 py-2.5 bg-[#fdf5f9] border border-[#e8d5e2] rounded-lg text-[13px] text-[#0d0209] outline-none transition placeholder:text-[#c499b4] min-h-[44px] focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3]"
              placeholder="Search by name, Employee ID, designation, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#993556]">
            <span className="text-2xl">⏳</span>
            <p className="text-[12px]">Loading employees…</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <FaBoxOpen size={32} className="text-[#F4C0D1]" />
            <p className="text-[14px] font-semibold text-[#993556]">No one currently holds an asset</p>
            <p className="text-[12px] text-[#c499b4]">Assign an asset from the Assets tab to see it show up here.</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-[#F4C0D1] bg-[#F9F8F2]">
                    {["Employee", "Role", "Designation", "Assets Held", "Last Assigned", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#993556] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FBEAF0]">
                  {employees.map((e) => (
                    <tr
                      key={`${e.person_model}_${e.person_id}`}
                      className="hover:bg-[#FEF4F9] transition-colors cursor-pointer"
                      onClick={() => setSelected(e)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar f_name={e.f_name} l_name={e.l_name} />
                          <div>
                            <p className="text-[13px] font-semibold text-[#730042]">{e.f_name} {e.l_name}</p>
                            <p className="text-[10px] text-[#993556] font-mono">{e.empid || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleChip model={e.person_model} /></td>
                      <td className="px-4 py-3">
                        <p className="text-[12px] text-[#730042] font-medium">{e.designation || "—"}</p>
                        <p className="text-[10px] text-[#993556]">{deptLabel(e.department)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border" style={{ color: "#730042", background: "#f7ecf3", borderColor: "#e8d5e2" }}>
                          {e.total_assets_assigned} unit{e.total_assets_assigned === 1 ? "" : "s"}
                        </span>
                        <span className="ml-2 text-[10px] text-[#993556]">{e.distinct_assignments} assignment{e.distinct_assignments === 1 ? "" : "s"}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#7a5568]">{fmtDate(e.last_assigned_date)}</td>
                      <td className="px-4 py-3">
                        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#730042] hover:underline">
                          <FaHistory size={10} /> History <FaChevronRight size={9} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-[#FBEAF0]">
              {employees.map((e) => (
                <div
                  key={`${e.person_model}_${e.person_id}`}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-[#FEF4F9] transition-colors cursor-pointer"
                  onClick={() => setSelected(e)}
                >
                  <Avatar f_name={e.f_name} l_name={e.l_name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-[#730042] truncate">{e.f_name} {e.l_name}</p>
                      <RoleChip model={e.person_model} />
                    </div>
                    <p className="text-[10px] text-[#993556] font-mono mb-1">{e.empid || "—"}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border" style={{ color: "#730042", background: "#f7ecf3", borderColor: "#e8d5e2" }}>
                        {e.total_assets_assigned} unit{e.total_assets_assigned === 1 ? "" : "s"}
                      </span>
                      <span className="text-[10px] text-[#993556]">Last: {fmtDate(e.last_assigned_date)}</span>
                    </div>
                  </div>
                  <FaChevronRight size={11} className="text-[#c499b4] mt-2 flex-shrink-0" />
                </div>
              ))}
            </div>
          </>
        )}

        {!isLoading && employees.length > 0 && (
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#F4C0D1] bg-[#F9F8F2]">
            <p className="text-[11px] text-[#993556]">Showing {employees.length} of {rawEmployees.length} people</p>
          </div>
        )}
      </div>

      <EmployeeHistoryDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        employeeSummary={selected}
        historyData={historyData}
        isLoading={historyLoading}
      />
    </div>
  );
}