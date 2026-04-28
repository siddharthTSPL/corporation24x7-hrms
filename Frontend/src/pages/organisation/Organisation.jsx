"use client";

import { useState, useEffect } from "react";
import { 
  Plus, X, ChevronDown, User, Mail, Phone, Shield, 
  Building2, Users, Trash2, ArrowRight 
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// 1. ORG CHART DATA & COMPONENTS
// ═══════════════════════════════════════════════════════════════

const ORG_DATA = {
  ceo: {
    name: "Admin",
    role: "Chief Executive Officer",
    dept: "Executive",
    initials: "CEO",
    color: "#7A124A"
  },
  vps: [
    {
      id: 1,
      name: "Manager 1",
      role: "Engineering",
      dept: "Engineering",
      initials: "M1",
      color: "#FFC107",
      employees: [
        { id: 101, name: "EMP 1", role: "Engineering", initials: "E1",color: "#16A34A" },
        { id: 102, name: "EMP 2", role: "Engineering", initials: "E2" ,color: "#16A34A"}
      ]
    },
    {
      id: 2,
      name: "Manager 2",
      role: "Product",
      dept: "Product",
      initials: "M2",
      color: "#FEF9C3",
      employees: [
        { id: 201, name: "EMP 3", role: "Product ", initials: "E3", color: "#86EFAC" }
      ]
    },
    {
      id: 3,
      name: "Manager 3",
      role: "Marketing",
      dept: "Marketing",
      initials: "M3",
      color: "#FEF9C3",
      employees: [
        { id: 301, name: "EMP 4", role: "Marketing ", initials: "E4",color: "#86EFAC" },
        { id: 302, name: "EMP 5", role: "Marketing", initials: "E5" ,color: "#86EFAC"}
      ]
    }
  ]
};

// --- Reusable OrgNode Component ---
const OrgNode = ({ name, role, dept, initials, color, size = 'md' }) => {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <div 
      className={`
        flex flex-col items-center text-center bg-white rounded-xl shadow-md border border-gray-100 
        transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative z-10 flex-shrink-0
        ${isSmall ? 'w-28 p-2' : isLarge ? 'w-40 p-4' : 'w-36 p-3'}
      `}
    >
      {/* Colored Border Indicator */}
      <div 
        className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-lg`}
        style={{ backgroundColor: color }}
      />

      {/* Avatar */}
      <div 
        className={`
          flex items-center justify-center rounded-full text-white font-bold mb-2 shadow-sm
          ${isSmall ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'}
        `}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>

      {/* Text Info with truncation for mobile */}
      <h3 className={`font-bold text-gray-800 leading-tight w-full ${isSmall ? 'text-xs truncate px-1' : 'text-sm truncate'}`} title={name}>
        {name}
      </h3>
      {!isSmall && (
        <p className="text-[10px] text-gray-500 font-medium mt-1 truncate w-full px-1">{role}</p>
      )}
      {isLarge && (
        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide w-full px-1">{dept}</p>
      )}
    </div>
  );
};

// --- Standalone CorporateOrgChart Component ---
const CorporateOrgChart = ({ data }) => {
  const userDept = "Engineering"; 

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-2 md:p-8 font-sans overflow-hidden">
      <div className="overflow-x-auto pb-8 custom-scrollbar">
        <div className="min-w-max flex flex-col items-center justify-center p-4">
          
          {/* --- LEVEL 1: CEO --- */}
          <OrgNode 
            name={data.ceo.name} 
            role={data.ceo.role} 
            dept={data.ceo.dept} 
            initials={data.ceo.initials} 
            color={data.ceo.color} 
            size="lg" 
          />

          {/* Connector Line: CEO to MANAGERS */}
          <div className="flex flex-col items-center w-full">
            <div className="w-[1.5px] h-4 bg-[#7A124A]"></div>
            <div className="relative w-[60%] h-[1.5px] bg-[#7A124A]">
               <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-4xl"></div>
            </div>
          </div>

          {/* --- LEVEL 2: MANAGERS ROW --- */}
          <div className="flex justify-center gap-4 md:gap-12 w-full max-w-none relative mt-0 flex-nowrap">
            
            {data.vps.map((vp) => {
              const isActiveDept = vp.dept === userDept;
              
              return (
                <div key={vp.id} className="flex flex-col items-center flex-shrink-0">
                  
                  {/* Vertical Line from Horizontal Bar to Manager */}
                  <div className={`w-[1.5px] h-4 mb-0 ${isActiveDept ? 'bg-[#7A124A]' : 'bg-gray-300'}`}></div>

                  {/* VP Card */}
                  <OrgNode 
                    name={vp.name} 
                    role={vp.role} 
                    dept={vp.dept} 
                    initials={vp.initials} 
                    color={vp.color} 
                  />

                  {/* --- CONNECTOR: VP TO EMPLOYEES --- */}
                  <div className="flex flex-col items-center w-full mt-0">
                    {/* Vertical Line Down */}
                    <div className={`w-[1.5px] h-4 ${isActiveDept ? 'bg-[#7A124A]' : 'bg-gray-300'}`}></div>

                    {/* Horizontal Bar for Employees */}
                    {vp.employees.length > 0 && (
                      <div className={`relative w-full h-[1.5px] ${isActiveDept ? 'bg-[#7A124A]' : 'bg-gray-300'}`}></div>
                    )}
                  </div>

                  {/* --- LEVEL 3: EMPLOYEES --- */}
                  <div className="flex justify-center gap-2 md:gap-4 w-full mt-0 flex-nowrap">
                    {vp.employees.map((emp) => {
                      const empColor = emp.color || "#16A34A";

                      return (
                        <div key={emp.id} className="flex flex-col items-center">
                          
                          {/* Vertical Line to Employee Card */}
                          <div className={`w-[1.5px] h-4 ${isActiveDept ? 'bg-black' : 'bg-gray-300'}`}></div>

                          {/* Employee Card */}
                          <OrgNode 
                            name={emp.name} 
                            role={emp.role} 
                            initials={emp.initials} 
                            color={empColor} 
                            size="sm" 
                          />

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}

          </div>

        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 2. DASHBOARD CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DEPARTMENTS  = ["Engineering", "HR", "Operations", "BPO", "Management", "Finance"];
const DESIGNATIONS = ["Software Engineer", "Senior Engineer", "Team Lead", "Analyst", "Executive", "Coordinator"];
const MANAGERS     = ["Manager 1", "Manager 2", "Manager 3"];

const EMPTY_FORM = {
  f_name: "", l_name: "", work_email: "", gender: "",
  marital_status: "", password: "", personal_contact: "",
  e_contact: "", role: "", designation: "", department: "", under_manager: "",
};

// ═══════════════════════════════════════════════════════════════
// 3. HELPER COMPONENT
// ═══════════════════════════════════════════════════════════════

function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
        {Icon && <Icon size={11} />} {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function OrganizationDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [activeView, setActiveView] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [errors,   setErrors]   = useState({});
  const [touched,  setTouched]  = useState({});
  const [success,  setSuccess]  = useState(false);
  
  const [orgData, setOrgData]   = useState(ORG_DATA);

  const handleDeleteEmployee = (empId) => {
    if(!confirm("Are you sure you want to delete this employee?")) return;

    setOrgData(prev => ({
      ...prev,
      vps: prev.vps.map(vp => ({
        ...vp,
        employees: vp.employees.filter(emp => emp.id !== empId)
      }))
    }));
  };

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
    // 1. Safety Lock
    if (isSubmitting) return;

    // 2. Validation
    const allTouched = Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, true]));
    setTouched(allTouched);
    if (!validate()) return;

    // 3. Lock Button
    setIsSubmitting(true);

    // 4. Determine Manager & Color
    const managerName = form.under_manager || "Manager 1"; 
    
    // Manager 1 -> Dark Green (#15803d)
    // Others -> Light Green (#86EFAC)
    let assignedColor = (managerName === "Manager 1") ? "#15803d" : "#86EFAC";
    
    // 5. Find Target Manager (Object vs Index)
    const targetManager = orgData.vps.find(vp => vp.name === managerName);
    
    if (!targetManager) {
        alert("Manager not found. Please select a valid manager.");
        setIsSubmitting(false);
        return;
    }

    // 6. Create Unique New Employee
    const newEmp = {
      // Unique ID with Random suffix to prevent collision
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`, 
      name: `${form.f_name} ${form.l_name}`,
      role: form.designation,
      initials: `${form.f_name[0]}${form.l_name[0]}`.toUpperCase(),
      color: assignedColor
    };

    // 7. IMMUTABLE STATE UPDATE (Fixes Double Add Issue)
    // Using .map ensures a new object reference, preventing React state confusion
    setOrgData((prev) => ({
      ...prev,
      vps: prev.vps.map(vp => {
        // Only update the specific manager found
        if (vp.id === targetManager.id) {
          return {
            ...vp,
            employees: [...vp.employees, newEmp]
          };
        }
        return vp;
      })
    }));

    // 8. Success Handling
    setSuccess(true);
    setTimeout(() => {
      setShowForm(false);
      setSuccess(false);
      setForm(EMPTY_FORM);
      setTouched({});
      setErrors({});
      setIsSubmitting(false); // Unlock Button
    }, 1600);
  };

  const handleClose = () => {
    if(isSubmitting) return;
    setShowForm(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setTouched({});
    setSuccess(false);
    setIsSubmitting(false);
  };

  useEffect(() => {
    document.body.style.overflow = (showForm || activeView) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm, activeView]);

  const inputCls = (hasErr) =>
    `w-full px-3 py-2.5 rounded-xl border text-sm text-gray-700 bg-gray-50 placeholder-gray-400
     focus:outline-none focus:ring-2 transition-all min-h-[44px]
     ${hasErr ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:border-[#7A124A] focus:ring-[#7A124A]/20"}`;

  const allEmployees = orgData.vps.flatMap(vp => 
    vp.employees.map(emp => ({ ...emp, managerName: vp.name, dept: vp.dept }))
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 px-2 sm:px-4 md:px-8 py-4 md:py-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="px-2 sm:px-0">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">
              Organization Structure
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Visual overview of your company hierarchy
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl bg-[#7A124A] text-white text-sm font-semibold shadow-md active:scale-95 transition-all whitespace-nowrap min-h-[44px]"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Add</span> Employee
          </button>
        </div>

        {/* ── Stat Pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-2 sm:px-0">
          {[
            { label: "Employees", value: allEmployees.length.toString(), icon: Users,     color: "bg-blue-100 text-blue-600", key: 'employees' },
            { label: "Managers",   value: orgData.vps.length.toString(), icon: Shield,    color: "bg-yellow-100 text-yellow-700", key: 'managers' },
            { label: "Departments",value: "3",  icon: Building2, color: "bg-sky-100 text-sky-600", key: 'departments' },
            { label: "Active",     value: "12", icon: User,      color: "bg-green-100 text-green-600", action: false },
          ].map(({ label, value, icon: Icon, color, key, action = true }) => (
            <div 
              key={label} 
              onClick={() => action && setActiveView(key)}
              className={`${action ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : 'cursor-default'} bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 flex items-center gap-3 transition-all`}
            >
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-gray-800 leading-none">{value}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
              {action && <ArrowRight size={12} className="ml-auto text-gray-300 hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* ── Org Chart Component ── */}
        <div className="px-2 sm:px-0">
          <CorporateOrgChart data={orgData} />
        </div>

      </div>

      {/* ══════════════════════════════════════════
           ADD EMPLOYEE MODAL (Responsive: Bottom Sheet on Mobile)
      ══════════════════════════════════════════ */}
      {showForm && (
        <div
          onClick={(e) => e.target === e.currentTarget && handleClose()}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-0 sm:mx-4 animate-slide-in-right sm:animate-none transition-transform duration-300">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#7A124A] rounded-t-3xl sm:rounded-t-2xl flex-shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Add Employee</h2>
                <p className="text-[10px] sm:text-xs text-white/70 mt-0.5">Fill all required fields</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5">
              {success ? (
                <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                  <div className="text-5xl">🎉</div>
                  <p className="text-base font-bold text-green-500">Employee Added Successfully!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field label="First Name" icon={User} error={touched.f_name && errors.f_name}>
                    <input name="f_name" value={form.f_name} onChange={handleChange} placeholder="e.g. Rahul" className={inputCls(touched.f_name && errors.f_name)} />
                  </Field>
                  <Field label="Last Name" icon={User} error={touched.l_name && errors.l_name}>
                    <input name="l_name" value={form.l_name} onChange={handleChange} placeholder="e.g. Sharma" className={inputCls(touched.l_name && errors.l_name)} />
                  </Field>
                  <Field label="Work Email" icon={Mail} error={touched.work_email && errors.work_email}>
                    <input name="work_email" type="email" value={form.work_email} onChange={handleChange} placeholder="name@company.com" className={inputCls(touched.work_email && errors.work_email)} />
                  </Field>
                  <Field label="Password" error={touched.password && errors.password}>
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Set a password" className={inputCls(touched.password && errors.password)} />
                  </Field>
                  <Field label="Gender" error={touched.gender && errors.gender}>
                    <div className="relative">
                      <select name="gender" value={form.gender} onChange={handleChange} className={`${inputCls(touched.gender && errors.gender)} appearance-none pr-9`}>
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Marital Status" error={touched.marital_status && errors.marital_status}>
                    <div className="relative">
                      <select name="marital_status" value={form.marital_status} onChange={handleChange} className={`${inputCls(touched.marital_status && errors.marital_status)} appearance-none pr-9`}>
                        <option value="">Select status</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Phone" icon={Phone} error={touched.personal_contact && errors.personal_contact}>
                    <input name="personal_contact" value={form.personal_contact} onChange={handleChange} placeholder="+91 XXXXX XXXXX" className={inputCls(touched.personal_contact && errors.personal_contact)} />
                  </Field>
                  <Field label="Emergency Contact">
                    <input name="e_contact" value={form.e_contact} onChange={handleChange} placeholder="Emergency contact number" className={inputCls(false)} />
                  </Field>
                  <Field label="Role" icon={Shield} error={touched.role && errors.role}>
                    <div className="relative">
                      <select name="role" value={form.role} onChange={handleChange} className={`${inputCls(touched.role && errors.role)} appearance-none pr-9`}>
                        <option value="">Select role</option>
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="senior_manager">Senior Manager</option>
                        <option value="official">Official</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Department" icon={Building2} error={touched.department && errors.department}>
                    <div className="relative">
                      <select name="department" value={form.department} onChange={handleChange} className={`${inputCls(touched.department && errors.department)} appearance-none pr-9`}>
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Designation" error={touched.designation && errors.designation}>
                    <div className="relative">
                      <select name="designation" value={form.designation} onChange={handleChange} className={`${inputCls(touched.designation && errors.designation)} appearance-none pr-9`}>
                        <option value="">Select designation</option>
                        {DESIGNATIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Under Manager">
                    <div className="relative">
                      <select name="under_manager" value={form.under_manager} onChange={handleChange} className={`${inputCls(false)} appearance-none pr-9`}>
                        <option value="">Select manager (optional)</option>
                        {MANAGERS.map((m) => (<option key={m} value={m}>{m}</option>))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                </div>
              )}
            </div>
            {!success && (
              <div className="flex flex-wrap gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button onClick={handleClose} disabled={isSubmitting} className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors min-h-[44px]">Cancel</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#7A124A] text-white text-sm font-semibold shadow-md 
                   active:scale-95 transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
           DETAILS SIDE PANEL (Responsive: Full Width on Mobile)
      ══════════════════════════════════════════ */}
      {activeView && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full sm:w-[450px] h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 capitalize">
                {activeView === 'employees' ? 'All Employees' : activeView === 'managers' ? 'Managers List' : 'Departments'}
              </h2>
              <button onClick={() => setActiveView(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {activeView === 'employees' && (
                <div className="space-y-3">
                  {allEmployees.length === 0 ? <p className="text-gray-400">No employees found.</p> : 
                    allEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {emp.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{emp.name}</p>
                            <p className="text-xs text-gray-500 truncate">{emp.role} • {emp.managerName}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}
              {activeView === 'managers' && (
                <div className="space-y-3">
                  {orgData.vps.map(vp => (
                    <div key={vp.id} className="p-4 border border-gray-100 rounded-xl bg-yellow-50/30 hover:bg-white shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {vp.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{vp.name}</p>
                          <p className="text-xs text-gray-500">{vp.dept}</p>
                        </div>
                      </div>
                      <div className="text-xs bg-white/50 p-2 rounded-lg border border-gray-100">
                        <span className="font-bold text-gray-600">Reporting Employees: </span> 
                        {vp.employees.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeView === 'departments' && (
                <div className="space-y-2">
                  {DEPARTMENTS.map((dept) => {
                    const manager = orgData.vps.find(vp => vp.dept === dept);
                    return (
                      <div key={dept} className="p-3 border border-gray-100 rounded-lg hover:bg-white hover:shadow-sm transition-all bg-gray-50 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{dept}</span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-gray-200 text-gray-600 flex-shrink-0">
                          {manager ? "Active" : "Vacant"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}