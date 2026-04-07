"use client";
import { useState } from "react";
import {
  FaEdit, FaTrash, FaSearch, FaFilter, FaTimes, FaUserTie, FaUserPlus,
} from "react-icons/fa";
import {
  useAddManager, useAddEmployee, useFindAllManagers,
} from "../../auth/server-state/adminauth/adminauth.hook";
import {
  useGetAllEmployee, useDeleteUser, useEditEmployee,
} from "../../auth/server-state/adminother/adminother.hook";

const DEPARTMENTS = ["OPR", "BPO", "ENG", "MGMT", "HR"];
const LOCATIONS = ["Noida", "Bareilly", "Delhi", "Mumbai"];

const EMPTY_EMP = {
  department: "", under_manager: "", f_name: "", l_name: "",
  work_email: "", gender: "", marital_status: "single", password: "",
  personal_contact: "", e_contact: "", role: "employee",
  office_location: "", designation: "",
};

const EMPTY_MGR = {
  department: "", f_name: "", l_name: "", work_email: "", gender: "",
  marital_status: "single", password: "", personal_contact: "",
  e_contact: "", role: "manager", designation: "", office_location: "",
};

// ── helpers (Field, Modal, Avatar, Badge, SkeletonRows, EmptyState, Popup, FilterChip unchanged) ──

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</label>
      {children}
      {error && <span className="text-xs text-(--error) flex items-center gap-1">⚠ {error}</span>}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-[var(--background)] text-sm text-[var(--text)] " +
  "focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder-gray-400";

function Modal({ title, icon, onClose, onSubmit, children, accentColor = "var(--primary)" }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: accentColor }}>
          <div className="flex items-center gap-3">
            <span className="text-white text-xl">{icon}</span>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-xs text-white/70">Fill in all required fields</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
            <FaTimes size={14} />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-(--text) text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onSubmit} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95 shadow-md" style={{ background: accentColor }}>Submit</button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name }) {
  const safe = name || "??";
  const initials = safe.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#00A8E8", "#FDCB6E", "#90DBF4", "#6C63FF", "#FF6584"];
  const color = colors[safe.charCodeAt(0) % colors.length];
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: color }}>
      {initials}
    </div>
  );
}

function Badge({ label, type = "dept" }) {
  const styles = {
    dept: "bg-[var(--secondary)]/30 text-[#007BAE]",
    role: "bg-[var(--accent)]/30 text-yellow-700",
    manager: "bg-purple-100 text-purple-700",
    active: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[type] ?? styles.dept}`}>{label}</span>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-gray-50">
      {Array.from({ length: 7 }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? "80%" : "60%" }} />
        </td>
      ))}
    </tr>
  ));
}

function EmptyState({ onAdd }) {
  return (
    <tr><td colSpan={7}>
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="text-5xl">👥</div>
        <p className="text-gray-500 font-medium">No employees found</p>
        <p className="text-gray-400 text-sm">Add your first employee to get started</p>
        <button onClick={onAdd} className="mt-2 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-(--primary) hover:opacity-90 transition">+ Add Employee</button>
      </div>
    </td></tr>
  );
}

function Popup({ type = "success", message, onClose }) {
  const styles = { success: "bg-green-500", error: "bg-red-500", info: "bg-blue-500" };
  return (
    <div className="fixed top-5 right-5 z-100" style={{ animation: "slideInPopup 0.3s ease forwards" }}>
      <style>{`@keyframes slideInPopup { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }`}</style>
      <div className={`min-w-70 max-w-sm px-4 py-3 rounded-xl shadow-lg text-white flex items-start justify-between gap-3 ${styles[type]}`}>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white shrink-0">✕</button>
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors"><FaTimes size={9} /></button>
    </span>
  );
}

// ── DeleteConfirm modal ──────────────────────────────────────────────────────

function DeleteConfirm({ user, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🗑️</div>
          <h3 className="text-lg font-bold text-gray-800">Delete User?</h3>
          <p className="text-sm text-gray-500 mt-1">
            Are you sure you want to delete <span className="font-semibold text-gray-700">{user.f_name} {user.l_name}</span>? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EmployeeTable() {
  const [open, setOpen] = useState(false);
  const [openManager, setOpenManager] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [popup, setPopup] = useState({ show: false, type: "success", message: "" });

  // Add forms
  const [empForm, setEmpForm] = useState(EMPTY_EMP);
  const [mgrForm, setMgrForm] = useState(EMPTY_MGR);
  const [empErrors, setEmpErrors] = useState({});
  const [mgrErrors, setMgrErrors] = useState({});

  // ── EDIT STATE ──────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null);   // the user object being edited
  const [editForm, setEditForm] = useState({});          // current form values
  const [editErrors, setEditErrors] = useState({});
  const [openEdit, setOpenEdit] = useState(false);

  // ── DELETE STATE ────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // user to confirm-delete

  const [filters, setFilters] = useState({ search: "", department: "", role: "", location: "", gender: "" });

  // hooks
  const { mutate: addEmployeeApi } = useAddEmployee();
  const { mutate: addManagerApi } = useAddManager();
  const { data: managers } = useFindAllManagers();
  const { data: employeeData, isLoading: listLoading, refetch: refetchList } = useGetAllEmployee();
  const allUsers = employeeData?.users ?? [];

  // ── useEditEmployee is called with the current editTarget's _id ─────────────
  // We pass a stable uid reference; the hook is re-created when editTarget changes.
  const { mutate: editUserApi } = useEditEmployee(editTarget?._id);
  const { mutate: deleteUserApi } = useDeleteUser();

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "", message: "" }), 3000);
  };

  // ── open edit modal, pre-fill form ─────────────────────────────────────────
  const handleOpenEdit = (user) => {
    setEditTarget(user);
    setEditForm({
      f_name:           user.f_name ?? "",
      l_name:           user.l_name ?? "",
      work_email:       user.work_email ?? "",
      gender:           user.gender ?? "",
      marital_status:   user.marital_status ?? "single",
      personal_contact: user.personal_contact ?? "",
      e_contact:        user.e_contact ?? "",
      role:             user.role ?? "employee",
      office_location:  user.office_location ?? "",
      designation:      user.designation ?? "",
      department:       user.department ?? "",
      Under_manager:    user.Under_manager?._id ?? "",   // send the manager _id
    });
    setEditErrors({});
    setOpenEdit(true);
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const validateEdit = () => {
    const err = {};
    if (!editForm.f_name)      err.f_name      = "Required";
    if (!editForm.l_name)      err.l_name      = "Required";
    if (!editForm.work_email)  err.work_email  = "Required";
    if (!editForm.department)  err.department  = "Required";
    if (!editForm.designation) err.designation = "Required";
    setEditErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleEditSubmit = () => {
    if (!validateEdit()) { showPopup("error", "Please fill all required fields"); return; }
    editUserApi(editForm, {
      onSuccess: (res) => {
        showPopup("success", res?.message || "Updated successfully");
        setOpenEdit(false);
        setEditTarget(null);
        refetchList();
      },
      onError: (err) => showPopup("error", err?.response?.data?.message || err?.message || "Update failed"),
    });
  };

  // ── delete flow ─────────────────────────────────────────────────────────────
  const handleConfirmDelete = () => {
    deleteUserApi(deleteTarget._id, {
      onSuccess: () => {
        showPopup("success", "User deleted successfully");
        setDeleteTarget(null);
        refetchList();
      },
      onError: (err) => {
        showPopup("error", err?.response?.data?.message || err?.message || "Delete failed");
        setDeleteTarget(null);
      },
    });
  };

  // ── add employee ────────────────────────────────────────────────────────────
  const handleEmpChange = (e) => setEmpForm({ ...empForm, [e.target.name]: e.target.value });

  const validateEmp = () => {
    const err = {};
    if (!empForm.f_name)      err.f_name      = "Required";
    if (!empForm.l_name)      err.l_name      = "Required";
    if (!empForm.work_email)  err.work_email  = "Required";
    if (!empForm.department)  err.department  = "Required";
    if (!empForm.designation) err.designation = "Required";
    if (!empForm.password)    err.password    = "Required";
    setEmpErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleEmpSubmit = () => {
    if (!validateEmp()) { showPopup("error", "Please fill all required employee fields"); return; }
    const payload = {
      f_name: empForm.f_name, l_name: empForm.l_name, work_email: empForm.work_email,
      password: empForm.password, gender: empForm.gender, marital_status: empForm.marital_status,
      personal_contact: empForm.personal_contact, e_contact: empForm.e_contact,
      role: empForm.role, office_location: empForm.office_location,
      designation: empForm.designation, department: empForm.department,
      Under_manager: empForm.under_manager,
    };
    addEmployeeApi(payload, {
      onSuccess: (res) => {
        showPopup("success", res?.message || "Employee added successfully");
        setOpen(false); setEmpForm(EMPTY_EMP); setEmpErrors({});
        refetchList();
      },
      onError: (err) => showPopup("error", err?.response?.data?.message || err?.message || "Something went wrong"),
    });
  };

  // ── add manager ─────────────────────────────────────────────────────────────
  const handleMgrChange = (e) => setMgrForm({ ...mgrForm, [e.target.name]: e.target.value });

  const validateMgr = () => {
    const err = {};
    if (!mgrForm.f_name)      err.f_name      = "Required";
    if (!mgrForm.l_name)      err.l_name      = "Required";
    if (!mgrForm.work_email)  err.work_email  = "Required";
    if (!mgrForm.department)  err.department  = "Required";
    if (!mgrForm.designation) err.designation = "Required";
    setMgrErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleMgrSubmit = () => {
    if (!validateMgr()) { showPopup("error", "Please fill all required manager fields"); return; }
    const payload = {
      f_name: mgrForm.f_name, l_name: mgrForm.l_name, work_email: mgrForm.work_email,
      password: mgrForm.password, gender: mgrForm.gender, marital_status: mgrForm.marital_status,
      personal_contact: mgrForm.personal_contact, e_contact: mgrForm.e_contact,
      role: mgrForm.role, office_location: mgrForm.office_location,
      designation: mgrForm.designation, department: mgrForm.department,
    };
    addManagerApi(payload, {
      onSuccess: (res) => {
        showPopup("success", res?.message || "Manager added & login link sent to email");
        setOpenManager(false); setMgrForm(EMPTY_MGR); setMgrErrors({});
        refetchList();
      },
      onError: (err) => showPopup("error", err?.response?.data?.message || err?.message || "Something went wrong"),
    });
  };

  // ── filter ──────────────────────────────────────────────────────────────────
  const filtered = allUsers.filter((u) => {
    const name = `${u.f_name ?? ""} ${u.l_name ?? ""}`.toLowerCase();
    const q = filters.search.toLowerCase();
    return (
      (name.includes(q) || (u.work_email ?? "").toLowerCase().includes(q)) &&
      (filters.department ? u.department === filters.department : true) &&
      (filters.role       ? u.role === filters.role             : true) &&
      (filters.location   ? u.office_location === filters.location : true) &&
      (filters.gender     ? u.gender === filters.gender          : true)
    );
  });

  const clearFilters = () => setFilters({ search: "", department: "", role: "", location: "", gender: "" });
  const activeFilterCount = [filters.department, filters.role, filters.location, filters.gender].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-(--background) p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-(--text)">Employee Directory</h1>
            <p className="text-sm text-gray-400 mt-0.5">{allUsers.length} total · {filtered.length} shown</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOpenManager(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-(--primary) text-(--primary) text-sm font-semibold hover:bg-(--primary) hover:text-white transition-all">
              <FaUserTie size={13} /><span>Add Manager</span>
            </button>
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-(--primary) text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-(--primary)/30">
              <FaUserPlus size={13} /><span>Add Employee</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-(--secondary)/30 overflow-hidden">

          {/* Search + filters bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
                <input placeholder="Search name or email…" className={`${inputCls} pl-9`} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <select className={`${inputCls} sm:w-44`} value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className={`${inputCls} sm:w-40`} value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                <option value="">All Roles</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="senior_manager">Senior Manager</option>
                <option value="official">Official</option>
              </select>
              <button onClick={() => setShowFilters(!showFilters)} className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters ? "bg-(--primary) text-white border-(--primary)" : "border-gray-200 text-gray-500 hover:border-(--primary) hover:text-(--primary)"}`}>
                <FaFilter size={11} />
                <span className="hidden sm:inline">More Filters</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select className={inputCls} value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
                  <option value="">All Locations</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select className={inputCls} value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
                  <option value="">All Genders</option>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
                <div className="col-span-2 flex flex-wrap gap-2 items-center">
                  {filters.department && <FilterChip label={`Dept: ${filters.department}`} onRemove={() => setFilters({ ...filters, department: "" })} />}
                  {filters.role       && <FilterChip label={`Role: ${filters.role}`}       onRemove={() => setFilters({ ...filters, role: "" })} />}
                  {filters.location   && <FilterChip label={`Loc: ${filters.location}`}    onRemove={() => setFilters({ ...filters, location: "" })} />}
                  {filters.gender     && <FilterChip label={`Gender: ${filters.gender}`}   onRemove={() => setFilters({ ...filters, gender: "" })} />}
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-(--error) font-semibold hover:underline ml-1">Clear All</button>}
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="bg-(--background) border-b border-gray-100">
                  {["Employee", "Department", "Designation", "Location", "Manager", "Role", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {listLoading ? <SkeletonRows /> : filtered.length === 0 ? <EmptyState onAdd={() => setOpen(true)} /> : (
                  filtered.map((u) => (
                    <tr key={u._id} className="hover:bg-(--background)/60 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${u.f_name ?? ""} ${u.l_name ?? ""}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-(--text) truncate">{u.f_name} {u.l_name}</p>
                            <p className="text-xs text-gray-400 truncate">{u.work_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge label={u.department || "—"} type="dept" /></td>
                      <td className="px-4 py-3 text-gray-600">{u.designation || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{u.office_location || "—"}</td>
                      <td className="px-4 py-3">
                        {u.Under_manager ? (
                          <div className="text-xs">
                            <p className="font-medium text-gray-700">{u.Under_manager.f_name} {u.Under_manager.l_name}</p>
                            <p className="text-gray-400">{u.Under_manager.uid}</p>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={u.role?.replace("_", " ") || "—"} type={u.role === "employee" ? "role" : "manager"} />
                      </td>
                      {/* ── FIXED: wired-up action buttons ── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="w-8 h-8 rounded-lg bg-(--background) flex items-center justify-center text-gray-400 hover:text-(--primary) hover:bg-(--secondary)/30 transition-colors"
                            title="Edit"
                          >
                            <FaEdit size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="w-8 h-8 rounded-lg bg-(--background) flex items-center justify-center text-gray-400 hover:text-(--error) hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!listLoading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400 flex items-center justify-between">
              <span>Showing {filtered.length} of {allUsers.length} employees</span>
              {activeFilterCount > 0 && <button onClick={clearFilters} className="text-(--error) font-medium hover:underline">Clear filters</button>}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Employee modal (unchanged) ── */}
      {open && (
        <Modal title="Add Employee" icon={<FaUserPlus />} onClose={() => { setOpen(false); setEmpErrors({}); }} onSubmit={handleEmpSubmit} accentColor="var(--primary)">
          <Field label="Department" error={empErrors.department}>
            <select name="department" value={empForm.department} onChange={handleEmpChange} className={inputCls}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Under Manager">
            <select name="under_manager" value={empForm.under_manager} onChange={handleEmpChange} className={inputCls}>
              <option value="">Select Manager</option>
              {managers?.managers?.map((mgr) => (
                <option key={mgr._id} value={mgr._id}>{mgr.f_name} {mgr.l_name} ({mgr.uid})</option>
              ))}
            </select>
          </Field>
          <Field label="First Name" error={empErrors.f_name}><input name="f_name" placeholder="First name" value={empForm.f_name} onChange={handleEmpChange} className={inputCls} /></Field>
          <Field label="Last Name" error={empErrors.l_name}><input name="l_name" placeholder="Last name" value={empForm.l_name} onChange={handleEmpChange} className={inputCls} /></Field>
          <Field label="Work Email" error={empErrors.work_email}><input name="work_email" type="email" placeholder="name@company.com" value={empForm.work_email} onChange={handleEmpChange} className={inputCls} /></Field>
          <Field label="Password" error={empErrors.password}><input name="password" type="password" placeholder="Set password" value={empForm.password} onChange={handleEmpChange} className={inputCls} /></Field>
          <Field label="Gender">
            <select name="gender" value={empForm.gender} onChange={handleEmpChange} className={inputCls}>
              <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select name="marital_status" value={empForm.marital_status} onChange={handleEmpChange} className={inputCls}>
              <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
            </select>
          </Field>
          <Field label="Phone"><input name="personal_contact" placeholder="+91 XXXXX XXXXX" value={empForm.personal_contact} onChange={handleEmpChange} className={inputCls} /></Field>
          <Field label="Emergency Contact"><input name="e_contact" placeholder="Emergency contact" value={empForm.e_contact} onChange={handleEmpChange} className={inputCls} /></Field>
          <Field label="Office Location">
            <select name="office_location" value={empForm.office_location} onChange={handleEmpChange} className={inputCls}>
              <option value="">Select Location</option>{LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Designation" error={empErrors.designation}><input name="designation" placeholder="e.g. Software Engineer" value={empForm.designation} onChange={handleEmpChange} className={inputCls} /></Field>
        </Modal>
      )}

      {/* ── Add Manager modal (unchanged) ── */}
      {openManager && (
        <Modal title="Add Manager" icon={<FaUserTie />} onClose={() => { setOpenManager(false); setMgrErrors({}); }} onSubmit={handleMgrSubmit} accentColor="var(--accent)">
          <Field label="Department" error={mgrErrors.department}>
            <select name="department" value={mgrForm.department} onChange={handleMgrChange} className={inputCls}>
              <option value="">Select Department</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Role">
            <select name="role" value={mgrForm.role} onChange={handleMgrChange} className={inputCls}>
              <option value="manager">Manager</option><option value="senior_manager">Senior Manager</option><option value="official">Official</option>
            </select>
          </Field>
          <Field label="First Name" error={mgrErrors.f_name}><input name="f_name" placeholder="First name" value={mgrForm.f_name} onChange={handleMgrChange} className={inputCls} /></Field>
          <Field label="Last Name" error={mgrErrors.l_name}><input name="l_name" placeholder="Last name" value={mgrForm.l_name} onChange={handleMgrChange} className={inputCls} /></Field>
          <Field label="Work Email" error={mgrErrors.work_email}><input name="work_email" type="email" placeholder="name@company.com" value={mgrForm.work_email} onChange={handleMgrChange} className={inputCls} /></Field>
          <Field label="Password"><input name="password" type="password" placeholder="Set password" value={mgrForm.password} onChange={handleMgrChange} className={inputCls} /></Field>
          <Field label="Gender">
            <select name="gender" value={mgrForm.gender} onChange={handleMgrChange} className={inputCls}>
              <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select name="marital_status" value={mgrForm.marital_status} onChange={handleMgrChange} className={inputCls}>
              <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
            </select>
          </Field>
          <Field label="Phone"><input name="personal_contact" placeholder="+91 XXXXX XXXXX" value={mgrForm.personal_contact} onChange={handleMgrChange} className={inputCls} /></Field>
          <Field label="Emergency Contact"><input name="e_contact" placeholder="Emergency contact" value={mgrForm.e_contact} onChange={handleMgrChange} className={inputCls} /></Field>
          <Field label="Office Location">
            <select name="office_location" value={mgrForm.office_location} onChange={handleMgrChange} className={inputCls}>
              <option value="">Select Location</option>{LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Designation" error={mgrErrors.designation}><input name="designation" placeholder="e.g. Head of Engineering" value={mgrForm.designation} onChange={handleMgrChange} className={inputCls} /></Field>
        </Modal>
      )}

      {/* ── EDIT modal (NEW) — works for both employee & manager ── */}
      {openEdit && editTarget && (
        <Modal
          title={`Edit ${editTarget.role === "employee" ? "Employee" : "Manager"}`}
          icon={editTarget.role === "employee" ? <FaUserPlus /> : <FaUserTie />}
          onClose={() => { setOpenEdit(false); setEditTarget(null); setEditErrors({}); }}
          onSubmit={handleEditSubmit}
          accentColor={editTarget.role === "employee" ? "var(--primary)" : "var(--accent)"}
        >
          <Field label="First Name" error={editErrors.f_name}><input name="f_name" value={editForm.f_name} onChange={handleEditChange} className={inputCls} /></Field>
          <Field label="Last Name" error={editErrors.l_name}><input name="l_name" value={editForm.l_name} onChange={handleEditChange} className={inputCls} /></Field>
          <Field label="Work Email" error={editErrors.work_email}><input name="work_email" type="email" value={editForm.work_email} onChange={handleEditChange} className={inputCls} /></Field>
          <Field label="Department" error={editErrors.department}>
            <select name="department" value={editForm.department} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Department</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation" error={editErrors.designation}><input name="designation" value={editForm.designation} onChange={handleEditChange} className={inputCls} /></Field>
          <Field label="Role">
            <select name="role" value={editForm.role} onChange={handleEditChange} className={inputCls}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="senior_manager">Senior Manager</option>
              <option value="official">Official</option>
            </select>
          </Field>
          {/* Manager dropdown — only show for employees */}
          {editForm.role === "employee" && (
            <Field label="Under Manager">
              <select name="Under_manager" value={editForm.Under_manager} onChange={handleEditChange} className={inputCls}>
                <option value="">Select Manager</option>
                {managers?.managers?.map((mgr) => (
                  <option key={mgr._id} value={mgr._id}>{mgr.f_name} {mgr.l_name} ({mgr.uid})</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Gender">
            <select name="gender" value={editForm.gender} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select name="marital_status" value={editForm.marital_status} onChange={handleEditChange} className={inputCls}>
              <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
            </select>
          </Field>
          <Field label="Phone"><input name="personal_contact" value={editForm.personal_contact} onChange={handleEditChange} className={inputCls} /></Field>
          <Field label="Emergency Contact"><input name="e_contact" value={editForm.e_contact} onChange={handleEditChange} className={inputCls} /></Field>
          <Field label="Office Location">
            <select name="office_location" value={editForm.office_location} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Location</option>{LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </Modal>
      )}

      {/* ── DELETE confirm (NEW) ── */}
      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {popup.show && (
        <Popup type={popup.type} message={popup.message} onClose={() => setPopup({ show: false, type: "", message: "" })} />
      )}
    </div>
  );
}