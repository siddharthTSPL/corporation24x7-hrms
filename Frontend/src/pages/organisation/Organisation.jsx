"use client";


import { useState, useEffect } from "react";
import { Plus, X, ChevronDown, User, Mail, Phone, Shield, Building2, Users } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────
const DEPARTMENTS  = ["Engineering", "HR", "Operations", "BPO", "Management", "Finance"];
const DESIGNATIONS = ["Software Engineer", "Senior Engineer", "Team Lead", "Analyst", "Executive", "Coordinator"];
const MANAGERS     = ["Manager 1", "Manager 2", "Manager 3"];

const EMPTY_FORM = {
  f_name: "", l_name: "", work_email: "", gender: "",
  marital_status: "", password: "", personal_contact: "",
  e_contact: "", role: "", designation: "", department: "", under_manager: "",
};

// ── Org data (static demo) ──────────────────────────────────────────────────
const ORG_DATA = [
  {
    id: 1, name: "Manager 1", role: "Manager", dept: "Engineering",
    color: "#00A8E8",
    employees: [
      { id: 11, name: "Emp 1", role: "Engineer",   dept: "Engineering" },
      { id: 12, name: "Emp 2", role: "Analyst",     dept: "Engineering" },
      { id: 13, name: "Emp 3", role: "Coordinator", dept: "Engineering" },
    ],
  },
  {
    id: 2, name: "Manager 2", role: "Manager", dept: "HR",
    color: "#FDCB6E",
    employees: [
      { id: 21, name: "Emp 4", role: "HR Exec",    dept: "HR" },
      { id: 22, name: "Emp 5", role: "Recruiter",  dept: "HR" },
      { id: 23, name: "Emp 6", role: "HR Lead",    dept: "HR" },
    ],
  },
  {
    id: 3, name: "Manager 3", role: "Manager", dept: "Operations",
    color: "#90DBF4",
    employees: [
      { id: 31, name: "Emp 7",  role: "Ops Lead",     dept: "Operations" },
      { id: 32, name: "Emp 8",  role: "Coordinator",  dept: "Operations" },
      { id: 33, name: "Emp 9",  role: "Analyst",      dept: "Operations" },
    ],
  },
];

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = "md", color }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: color || "#00A8E8" }}
    >
      {initials}
    </div>
  );
}

// ── Connector line (vertical) ──────────────────────────────────────────────────
function VLine({ h = "h-8" }) {
  return <div className={`w-px ${h} bg-secondary mx-auto`} />;
}

// ── OrgCard ────────────────────────────────────────────────────────────────────
function OrgCard({ name, role, dept, color, size = "md" }) {
  const isLg = size === "lg";
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-secondary/40 text-center flex flex-col items-center transition-shadow hover:shadow-md
        ${isLg ? "px-6 py-4 min-w-[140px]" : "px-4 py-3 min-w-[110px]"}`}
    >
      <Avatar name={name} size={isLg ? "lg" : "md"} color={color} />
      <p className={`font-semibold text-apptext mt-2 ${isLg ? "text-sm" : "text-xs"}`}>{name}</p>
      <p className="text-[11px] text-gray-400">{role}</p>
      {dept && <p className="text-[10px] text-primary font-medium mt-0.5">{dept}</p>}
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────────
function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
        {Icon && <Icon size={11} />} {label}
      </label>
      {children}
      {error && <p className="text-xs text-error flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

const inputCls = (hasErr) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm text-apptext bg-background placeholder-gray-400
   focus:outline-none focus:ring-2 transition-all
   ${hasErr ? "border-error focus:ring-error/20" : "border-secondary/70 focus:border-primary focus:ring-primary/20"}`;

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function OrganizationDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [errors,   setErrors]   = useState({});
  const [touched,  setTouched]  = useState({});
  const [success,  setSuccess]  = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setTouched((p) => ({ ...p, [name]: true }));
  };

  const validate = () => {
    const err = {};
    if (!form.f_name)           err.f_name           = "Required";
    if (!form.l_name)           err.l_name           = "Required";
    if (!form.work_email)       err.work_email       = "Required";
    if (!form.department)       err.department       = "Required";
    if (!form.role)             err.role             = "Required";
    if (!form.designation)      err.designation      = "Required";
    if (!form.gender)           err.gender           = "Required";
    if (!form.personal_contact) err.personal_contact = "Required";
    if (!form.password)         err.password         = "Required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    const allTouched = Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, true]));
    setTouched(allTouched);
    if (!validate()) return;
    setSuccess(true);
    setTimeout(() => {
      setShowForm(false);
      setSuccess(false);
      setForm(EMPTY_FORM);
      setTouched({});
      setErrors({});
    }, 1600);
  };

  const handleClose = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setTouched({});
    setSuccess(false);
  };

  useEffect(() => {
    document.body.style.overflow = showForm ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              Organization Structure
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Visual overview of your company hierarchy
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 rounded-xl  bg-[var(--primary)] text-white text-sm font-semibold shadow-md shadow-primary/30 hover:opacity-90 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={16} /> Add Employee
          </button>
        </div>

        {/* ── Stat Pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Employees", value: "9",  icon: Users,     color: "bg-primary/10 text-primary"   },
            { label: "Managers",        value: "3",  icon: Shield,    color: "bg-accent/30 text-yellow-700" },
            { label: "Departments",     value: "3",  icon: Building2, color: "bg-secondary/40 text-[#007BAE]" },
            { label: "Active",          value: "12", icon: User,      color: "bg-green-100 text-green-600"  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-secondary/30 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-lg font-bold text-apptext leading-none">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Org Chart ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary/30 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
            Hierarchy Chart
          </h2>

          {/* Scrollable on small screens */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[560px] flex flex-col items-center">

              {/* ── CEO ── */}
              <OrgCard name="Admin" role="CEO" dept="Executive" color="#1F2937" size="lg" />
              <VLine h="h-10" />

              {/* ── Horizontal connector ── */}
              <div className="relative w-full flex justify-center">
                <div
                  className="absolute top-0 bg-secondary/60 h-px"
                  style={{ left: "calc(16.66% + 55px)", right: "calc(16.66% + 55px)" }}
                />
              </div>

              {/* ── Managers + employees ── */}
              <div className="flex gap-4 sm:gap-8 md:gap-12 w-full justify-center">
                {ORG_DATA.map((mgr) => (
                  <div key={mgr.id} className="flex flex-col items-center">
                    <VLine h="h-10" />
                    <OrgCard name={mgr.name} role={mgr.role} dept={mgr.dept} color={mgr.color} />
                    <VLine h="h-6" />

                    {/* Employees column */}
                    <div className="flex flex-col gap-3 items-center">
                      {mgr.employees.map((emp, ei) => (
                        <div key={emp.id} className="flex flex-col items-center">
                          {ei > 0 && <VLine h="h-3" />}
                          <OrgCard name={emp.name} role={emp.role} dept={emp.dept} color={mgr.color} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════
           MODAL — bottom sheet on mobile
      ══════════════════════════════════════════ */}
      {showForm && (
        <div
          onClick={(e) => e.target === e.currentTarget && handleClose()}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-0 sm:mx-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--primary)] rounded-t-3xl sm:rounded-t-2xl flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">Add Employee</h2>
                <p className="text-xs text-white/70 mt-0.5">Fill all required fields</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {success ? (
                <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                  <div className="text-5xl">🎉</div>
                  <p className="text-base font-bold text-green-500">Employee Added Successfully!</p>
                  <p className="text-sm text-gray-400">The new employee is now in the system.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* First Name */}
                  <Field label="First Name" icon={User} error={touched.f_name && errors.f_name}>
                    <input
                      name="f_name" value={form.f_name} onChange={handleChange}
                      placeholder="e.g. Rahul"
                      className={inputCls(touched.f_name && errors.f_name)}
                    />
                  </Field>

                  {/* Last Name */}
                  <Field label="Last Name" icon={User} error={touched.l_name && errors.l_name}>
                    <input
                      name="l_name" value={form.l_name} onChange={handleChange}
                      placeholder="e.g. Sharma"
                      className={inputCls(touched.l_name && errors.l_name)}
                    />
                  </Field>

                  {/* Work Email */}
                  <Field label="Work Email" icon={Mail} error={touched.work_email && errors.work_email}>
                    <input
                      name="work_email" type="email" value={form.work_email} onChange={handleChange}
                      placeholder="name@company.com"
                      className={inputCls(touched.work_email && errors.work_email)}
                    />
                  </Field>

                  {/* Password */}
                  <Field label="Password" error={touched.password && errors.password}>
                    <input
                      name="password" type="password" value={form.password} onChange={handleChange}
                      placeholder="Set a password"
                      className={inputCls(touched.password && errors.password)}
                    />
                  </Field>

                  {/* Gender */}
                  <Field label="Gender" error={touched.gender && errors.gender}>
                    <div className="relative">
                      <select
                        name="gender" value={form.gender} onChange={handleChange}
                        className={`${inputCls(touched.gender && errors.gender)} appearance-none pr-9`}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                  {/* Marital Status */}
                  <Field label="Marital Status" error={touched.marital_status && errors.marital_status}>
                    <div className="relative">
                      <select
                        name="marital_status" value={form.marital_status} onChange={handleChange}
                        className={`${inputCls(touched.marital_status && errors.marital_status)} appearance-none pr-9`}
                      >
                        <option value="">Select status</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                  {/* Phone */}
                  <Field label="Phone" icon={Phone} error={touched.personal_contact && errors.personal_contact}>
                    <input
                      name="personal_contact" value={form.personal_contact} onChange={handleChange}
                      placeholder="+91 XXXXX XXXXX"
                      className={inputCls(touched.personal_contact && errors.personal_contact)}
                    />
                  </Field>

                  {/* Emergency Contact */}
                  <Field label="Emergency Contact">
                    <input
                      name="e_contact" value={form.e_contact} onChange={handleChange}
                      placeholder="Emergency contact number"
                      className={inputCls(false)}
                    />
                  </Field>

                  {/* Role */}
                  <Field label="Role" icon={Shield} error={touched.role && errors.role}>
                    <div className="relative">
                      <select
                        name="role" value={form.role} onChange={handleChange}
                        className={`${inputCls(touched.role && errors.role)} appearance-none pr-9`}
                      >
                        <option value="">Select role</option>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="senior_manager">Senior Manager</option>
                        <option value="official">Official</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                  {/* Department */}
                  <Field label="Department" icon={Building2} error={touched.department && errors.department}>
                    <div className="relative">
                      <select
                        name="department" value={form.department} onChange={handleChange}
                        className={`${inputCls(touched.department && errors.department)} appearance-none pr-9`}
                      >
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                  {/* Designation */}
                  <Field label="Designation" error={touched.designation && errors.designation}>
                    <div className="relative">
                      <select
                        name="designation" value={form.designation} onChange={handleChange}
                        className={`${inputCls(touched.designation && errors.designation)} appearance-none pr-9`}
                      >
                        <option value="">Select designation</option>
                        {DESIGNATIONS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                  {/* Under Manager */}
                  <Field label="Under Manager">
                    <div className="relative">
                      <select
                        name="under_manager" value={form.under_manager} onChange={handleChange}
                        className={`${inputCls(false)} appearance-none pr-9`}
                      >
                        <option value="">Select manager (optional)</option>
                        {MANAGERS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!success && (
              <div className="flex flex-wrap gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={handleClose}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-gray-200 text-apptext text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold shadow-md shadow-primary/30 hover:opacity-90 active:scale-95 transition-all"
                >
                  Save Employee
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}