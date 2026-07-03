import React, { useEffect, useState, useRef } from "react";
import {
  FaUsers, FaClock, FaCalendarAlt, FaBullhorn,
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck,
  FaMapMarkerAlt, FaChevronRight, FaBan, FaStar,
  FaUserShield, FaCheckCircle, FaChartBar, FaLayerGroup,
  FaUserCog, FaAngleDown, FaSearch, FaEye, FaEyeSlash,
  FaShieldAlt, FaBuilding, FaPhone, FaEnvelope,
  FaIdCard, FaUniversity, FaGlobe, FaBriefcase,
  FaLock, FaUserSlash, FaExclamationTriangle, FaToggleOn,
  FaCrown,
} from "react-icons/fa";

import { useGetMeSuperAdmin } from "../../auth/server-state/superadmin/auth/suauth.hook";
import {
  useGetTodayCheckins, useGetNoOfEmployees, useGetAllEmployees,
  useDeleteEmployee, useAddEmployee, useAddManager, useEditEmployee,
  useGetPermissions, useUpdatePermissions, useSetAdminWorkingStatus,
  useSuperAdminActiveUserCount,
} from "../../auth/server-state/superadmin/other/suother.hook";
import { useShowAllLeaves, useAcceptLeaveByAdmin, useRejectLeaveByAdmin } from "../../auth/server-state/superadmin/leave/suleave.hook";
import { useGetAllAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "../../auth/server-state/superadmin/announcement/suannouncement.hook";
import { useGetAllAdmins, useCreateAdmin, useUpdateAdmin, useDeleteAdmin, useReviewToAdmin } from "../../auth/server-state/superadmin/other/suother.hook";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Belarus","Belgium","Belize","Bhutan","Bolivia",
  "Brazil","Brunei","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Croatia",
  "Cuba","Cyprus","Czech Republic","Denmark","Ecuador","Egypt","Estonia","Ethiopia","Finland","France",
  "Georgia","Germany","Ghana","Greece","Guatemala","Hungary","Iceland","India","Indonesia","Iran",
  "Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait",
  "Kyrgyzstan","Laos","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Maldives",
  "Mali","Malta","Mexico","Moldova","Mongolia","Morocco","Myanmar","Nepal","Netherlands","New Zealand",
  "Nicaragua","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palestine",
  "Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
  "Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan",
  "Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

const DEPT_OPTIONS = ["OPR", "BPO", "ENG", "HR", "MGMT"];
const OFFICE_OPTIONS = ["Noida", "Bareilly", "Delhi", "Mumbai"];
const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "senior_admin", label: "Senior Admin" },
  { value: "official", label: "Official" },
];
const ROLE_LABEL = { admin: "Admin", senior_admin: "Senior Admin", official: "Official" };

const WORKING_STATUS_OPTIONS = [
  { value: "resigned", label: "Resigned" },
  { value: "fired", label: "Fired" },
  { value: "terminated", label: "Terminated" },
];

const WORKING_STATUS_META = {
  resigned: { color: "#b8760a", bg: "#fff8e1", border: "#ffe082", label: "Resigned" },
  fired: { color: "#d93025", bg: "#fce8e6", border: "#f5c6c3", label: "Fired" },
  terminated: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", label: "Terminated" },
  working: { color: "#0d9e6e", bg: "#e8f7f1", border: "#a7f3d0", label: "Working" },
};

const USER_MODEL_MAP = {
  admin: "Admin", senior_admin: "Admin", official: "Admin",
  manager: "Manager", senior_manager: "Manager",
  employee: "User",
};

const DEFAULT_PERMISSIONS = {
  announcements: {
    can_view_announcements: true,
    can_create_announcement: true,
    can_edit_announcement: true,
    can_delete_announcement: true,
  },
  documents: {
    can_upload_documents: true,
    can_view_all_documents: true,
  },
  tickets: {
    can_raise_ticket: true,
    can_view_all_tickets: true,
    can_resolve_ticket: true,
    can_rate_ticket: true,
  },
  recruitment: {
    can_view_hiring_requisitions: true,
    can_create_hiring_requisition: true,
    can_view_candidates: true,
    can_add_candidate: true,
  },
};

const PERMISSION_META = {
  announcements: {
    label: "Announcements",
    icon: <FaBullhorn size={13} />,
    color: "#7c3aed",
    bg: "#f5f3ff",
    keys: {
      can_view_announcements: "View Announcements",
      can_create_announcement: "Create Announcement",
      can_edit_announcement: "Edit Announcement",
      can_delete_announcement: "Delete Announcement",
    },
  },
  documents: {
    label: "Documents",
    icon: <FaIdCard size={13} />,
    color: "#0369a1",
    bg: "#e0f2fe",
    keys: {
      can_upload_documents: "Upload Documents",
      can_view_all_documents: "View All Documents",
    },
  },
  tickets: {
    label: "Tickets",
    icon: <FaCheckCircle size={13} />,
    color: "#0d9e6e",
    bg: "#e8f7f1",
    keys: {
      can_raise_ticket: "Raise Ticket",
      can_view_all_tickets: "View All Tickets",
      can_resolve_ticket: "Resolve Ticket",
      can_rate_ticket: "Rate Ticket",
    },
  },
  recruitment: {
    label: "Recruitment",
    icon: <FaBriefcase size={13} />,
    color: "#b8760a",
    bg: "#fff8e1",
    keys: {
      can_view_hiring_requisitions: "View Hiring Requisitions",
      can_create_hiring_requisition: "Create Hiring Requisition",
      can_view_candidates: "View Candidates",
      can_add_candidate: "Add Candidate",
    },
  },
};

const BLANK_FORM = {
  f_name: "", l_name: "", work_email: "", password: "", confirmPassword: "",
  gender: "", marital_status: "single", personal_contact: "", e_contact: "",
  designation: "", role: "admin", department: "", office_location: "",
  is_fresher: true, total_experience: 0, previous_company: "", previous_designation: "",
  aadhaar_number: "", pan_number: "", residential_address: "", permanent_address: "",
  city: "", state: "", pincode: "", country: "",
  bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "",
};

const validateForm = (form, isEdit) => {
  const e = {};
 if (form.account_number) {
  if (!/^\d{9,18}$/.test(form.account_number)) {
    errors.account_number =
      "Account number must contain only digits (9-18 characters).";
  }
}
  if (!form.f_name.trim()) e.f_name = "First name is required";
  if (!form.l_name.trim()) e.l_name = "Last name is required";
  if (!form.work_email.trim()) e.work_email = "Work email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.work_email)) e.work_email = "Enter a valid email address";
  if (!isEdit) {
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters required";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
  }
  if (!form.gender) e.gender = "Gender is required";
  if (!form.personal_contact.trim()) e.personal_contact = "Personal contact is required";
  else if (!/^[6-9]\d{9}$/.test(form.personal_contact)) e.personal_contact = "Enter valid 10-digit mobile number";
  if (!form.e_contact.trim()) e.e_contact = "Emergency contact is required";
  else if (!/^[6-9]\d{9}$/.test(form.e_contact)) e.e_contact = "Enter valid 10-digit mobile number";
  if (!form.designation.trim()) e.designation = "Designation is required";
  if (!form.department) e.department = "Department is required";
  if (!form.office_location) e.office_location = "Office location is required";
  if (!form.is_fresher && (!form.total_experience || Number(form.total_experience) <= 0))
    e.total_experience = "Enter total experience in years";
  if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number.replace(/\s/g, "")))
    e.aadhaar_number = "Aadhaar must be exactly 12 digits";
  if (form.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number))
    e.pan_number = "Format: ABCDE1234F";
  if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = "Pincode must be 6 digits";
  if (form.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc_code))
    e.ifsc_code = "Invalid IFSC format (e.g. HDFC0001234)";
  return e;
};

const hasErrors = (e) => Object.keys(e).length > 0;

const parseAddress = (raw = "") => {
  const resMatch = raw.match(/Residential:\s*(.*?)(?:\s*\|\s*Permanent:|$)/);
  const permMatch = raw.match(/Permanent:\s*(.*?)$/);
  return {
    residential_address: resMatch ? resMatch[1].trim() : raw,
    permanent_address: permMatch ? permMatch[1].trim() : "",
  };
};

const initials = (name = "") =>
  (name || "").trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); } catch { return d; }
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
};

const AVATAR_COLORS = ["#730042","#9e0058","#4a0029","#2563eb","#0d9e6e","#7c3aed","#b8760a","#d93025"];
const avaColor = (str = "") => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const leaveTypeColor = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("sick") || t === "sl") return "#0d9e6e";
  if (t.includes("earn") || t === "el") return "#730042";
  if (t.includes("priv") || t === "pl") return "#b8760a";
  if (t.includes("mat") || t === "ml") return "#7c3aed";
  if (t.includes("cas") || t === "cl") return "#2563eb";
  return "#730042";
};

const ROLE_COLOR = { manager: "#730042", employee: "#a0005c" };

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#730042] focus:ring-offset-1 cursor-pointer ${checked ? "bg-[#730042]" : "bg-gray-200"}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function FieldErr({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-[11px] text-red-500 font-medium">{msg}</p>;
}

function FLabel({ children, required }) {
  return (
    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#7a5568] mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FInput({ err, className = "", ...props }) {
  return (
    <input
      className={`w-full px-3 py-2.5 bg-[#fdf5f9] border rounded-lg text-[13px] text-[#0d0209] outline-none transition placeholder:text-[#c499b4] min-h-[44px] ${err ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-50" : "border-[#e8d5e2] focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3]"} ${className}`}
      {...props}
    />
  );
}

function FSel({ err, className = "", children, ...props }) {
  return (
    <select
      className={`w-full px-3 py-2.5 bg-[#fdf5f9] border rounded-lg text-[13px] text-[#0d0209] outline-none transition min-h-[44px] ${err ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-50" : "border-[#e8d5e2] focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3]"} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function SecHead({ icon, children }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.2px] uppercase text-[#730042] mt-7 mb-4 pb-2.5 border-b border-[#f0dcea] first:mt-0">
      {icon && <span className="opacity-70">{icon}</span>}
      {children}
    </div>
  );
}

function PermissionEditor({ permissions, onChange }) {
  const togglePerm = (module, key) => {
    onChange({ ...permissions, [module]: { ...permissions[module], [key]: !permissions[module][key] } });
  };

  const toggleModule = (module) => {
    const allOn = Object.values(permissions[module]).every(Boolean);
    const next = Object.fromEntries(Object.keys(permissions[module]).map((k) => [k, !allOn]));
    onChange({ ...permissions, [module]: next });
  };

  return (
    <div className="space-y-3">
      {Object.entries(PERMISSION_META).map(([module, meta]) => {
        const modulePerms = permissions[module] || {};
        const allOn = Object.values(modulePerms).every(Boolean);
        const someOn = Object.values(modulePerms).some(Boolean);
        const onCount = Object.values(modulePerms).filter(Boolean).length;
        const total = Object.keys(meta.keys).length;
        return (
          <div key={module} className="border border-[#e8d5e2] rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-3 cursor-pointer select-none hover:bg-[#fdf5f9] transition-colors"
              onClick={() => toggleModule(module)}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0d0209] truncate">{meta.label}</p>
                  <p className="text-[10px] text-[#c499b4] mt-0.5">{onCount}/{total} permissions enabled</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-2">
                {someOn && !allOn && (
                  <span className="hidden sm:inline text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">Partial</span>
                )}
                {allOn && (
                  <span className="hidden sm:inline text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">All On</span>
                )}
                <Toggle checked={allOn} onChange={() => toggleModule(module)} />
              </div>
            </div>
            <div className="border-t border-[#f0dcea] divide-y divide-[#f7ecf3]">
              {Object.entries(meta.keys).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between px-3 sm:px-5 py-2.5 hover:bg-[#fdf5f9] transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${modulePerms[key] ? "bg-[#730042]" : "bg-gray-200"}`} />
                    <span className="text-[12px] text-[#4a3040] truncate">{label}</span>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <Toggle checked={!!modulePerms[key]} onChange={() => togglePerm(module, key)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkingStatusModal({ open, onClose, admin, onConfirm, loading }) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) { setSelectedStatus(""); setStep(1); }
  }, [open]);

  if (!open || !admin) return null;

  const name = [admin.f_name, admin.l_name].filter(Boolean).join(" ");
  const meta = WORKING_STATUS_META[selectedStatus] || {};

  const handleNext = () => {
    if (!selectedStatus) return;
    setStep(2);
  };

  const handleConfirm = () => {
    onConfirm({ id: admin._id, working_status: selectedStatus });
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.75)] backdrop-blur-md"
      
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-[modalUp_0.22s_ease-out]">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <div className="min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <FaUserSlash size={11} className="text-[#730042] flex-shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-[#0d0209] tracking-tight truncate">Update Working Status</h2>
            </div>
            <p className="text-[11px] text-[#c499b4] truncate">{name} · {admin.designation}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center">
            <FaTimes size={13} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5">
          {step === 1 && (
            <>
              <div className="flex items-start gap-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4 sm:mb-5">
                <FaExclamationTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] sm:text-[13px] text-amber-800 leading-relaxed font-medium">
                  This action is <strong>permanent and irreversible.</strong> Once the working status is changed, it cannot be modified again.
                </p>
              </div>
              <p className="text-[12px] text-[#7a5568] mb-3 font-medium">Select the reason for status change:</p>
              <div className="space-y-2">
                {WORKING_STATUS_OPTIONS.map((opt) => {
                  const m = WORKING_STATUS_META[opt.value];
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedStatus(opt.value)}
                      className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border-2 transition-all text-left min-h-[52px] ${selectedStatus === opt.value ? "border-[#730042] bg-[#fdf5f9]" : "border-[#e8d5e2] hover:border-[#c499b4] hover:bg-[#fdf5f9]"}`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <span className="text-[13px] font-semibold text-[#0d0209]">{opt.label}</span>
                      {selectedStatus === opt.value && <FaCheck size={10} className="ml-auto text-[#730042]" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-start gap-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl mb-4 sm:mb-5">
                <FaExclamationTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] text-red-800 font-bold mb-1">Final Confirmation</p>
                  <p className="text-[12px] text-red-700 leading-relaxed">
                    You are about to mark <strong>{name}</strong> as <strong style={{ color: meta.color }}>{meta.label}</strong>. This cannot be undone. Are you absolutely sure?
                  </p>
                </div>
              </div>
              <div className="p-3 sm:p-4 rounded-xl border-2 flex items-center gap-3" style={{ borderColor: meta.color, background: meta.bg }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${avaColor(admin.f_name || "")}, #cd166e)` }}>
                  {initials(name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#0d0209] truncate">{name}</p>
                  <p className="text-[11px] text-[#7a5568] truncate">{admin.designation} · {admin.department}</p>
                  <span className="inline-flex items-center mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                    → {meta.label}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex gap-2 sm:gap-3">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="flex-1 px-3 sm:px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedStatus}
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              Continue <FaChevronRight size={9} />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              <FaCheck size={10} />
              {loading ? "Updating…" : "Confirm"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditPermissionsModal({ open, onClose, user, onSave, loading }) {
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const userModel = user ? (USER_MODEL_MAP[user.role] || "User") : null;

  const { data: permData, isLoading: permLoading } = useGetPermissions(
    open ? user?._id : null,
    open ? userModel : null
  );

  useEffect(() => {
    if (!open) return;
    if (permData?.permissions) {
      const p = permData.permissions;
      setPermissions({
        announcements: p.announcements || DEFAULT_PERMISSIONS.announcements,
        documents: p.documents || DEFAULT_PERMISSIONS.documents,
        tickets: p.tickets || DEFAULT_PERMISSIONS.tickets,
        recruitment: p.recruitment || DEFAULT_PERMISSIONS.recruitment,
      });
    } else {
      setPermissions(DEFAULT_PERMISSIONS);
    }
  }, [open, permData]);

  if (!open || !user) return null;

  const name = [user.f_name, user.l_name].filter(Boolean).join(" ");

  const handleSave = () => {
    onSave({
      id: user._id,
      data: { user_model: userModel, ...permissions },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-[modalUp_0.22s_ease-out]">
        <div className="sticky top-0 z-10 bg-white px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between rounded-t-2xl">
          <div className="min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <FaLock size={11} className="text-[#730042] flex-shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-[#0d0209] tracking-tight truncate">Edit Permissions</h2>
            </div>
            <p className="text-[11px] text-[#c499b4] truncate">
              {name} · <span className="font-semibold">{userModel}</span> · {user.designation}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center">
            <FaTimes size={13} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5">
          {permLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#c499b4]">
              <span className="text-2xl">⏳</span>
              <p className="text-[12px]">Loading current permissions…</p>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-[#7a5568] mb-4 leading-relaxed">
                Toggle individual permissions or use the module switch to grant all at once.
              </p>
              <PermissionEditor permissions={permissions} onChange={setPermissions} />
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#e8d5e2] px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-2 sm:gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || permLoading}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <FaCheck size={10} />
            {loading ? "Saving…" : "Save Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminModal({ open, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  const isEdit = !!initial;

  useEffect(() => {
    if (open) {
      if (initial) {
        const { address, ...rest } = initial;
        setForm({ ...BLANK_FORM, ...rest, ...parseAddress(address || ""), confirmPassword: "" });
      } else {
        setForm(BLANK_FORM);
      }
      setErrors({});
      setTouched({});
      setSubmitted(false);
      setShowPass(false);
      setShowConfirm(false);
      setPermissions(DEFAULT_PERMISSIONS);
    }
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    const next = { ...form, [k]: val };
    setForm(next);
    if (submitted || touched[k]) setErrors(validateForm(next, isEdit));
  };

  const setUpper = (k) => (e) => {
    const next = { ...form, [k]: e.target.value.toUpperCase() };
    setForm(next);
    if (submitted || touched[k]) setErrors(validateForm(next, isEdit));
  };

  const blur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validateForm(form, isEdit));
  };

  const showErr = (k) => (submitted || touched[k]) ? errors[k] : "";

  const handleSave = () => {
    setSubmitted(true);
    const e = validateForm(form, isEdit);
    setErrors(e);
    if (hasErrors(e)) return;
    const { confirmPassword, residential_address, permanent_address, ...rest } = form;
    const address = [
      residential_address ? `Residential: ${residential_address}` : "",
      permanent_address ? `Permanent: ${permanent_address}` : "",
    ].filter(Boolean).join(" | ");
    onSave({ ...rest, address, permissions });
  };

  return (
   <div
  className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
>
    
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col max-h-[94vh] animate-[modalUp_0.22s_ease-out]">
        <div className="sticky top-0 z-10 bg-white px-4 sm:px-7 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between rounded-t-2xl">
          <div className="min-w-0 mr-3">
            <h2 className="text-base sm:text-xl font-bold text-[#0d0209] tracking-tight">
              {isEdit ? "Edit Admin" : "Create Admin"}
            </h2>
            <p className="text-[11px] text-[#c499b4] mt-0.5">{isEdit ? "Update admin details and permissions" : "Fill in details and assign permissions"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center">
            <FaTimes size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-7 py-4 sm:py-5">
          <SecHead icon={<FaUsers size={11} />}>Basic Information</SecHead>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <FLabel required>First Name</FLabel>
              <FInput placeholder="First name" value={form.f_name} onChange={set("f_name")} onBlur={blur("f_name")} err={showErr("f_name")} />
              <FieldErr msg={showErr("f_name")} />
            </div>
            <div>
              <FLabel required>Last Name</FLabel>
              <FInput placeholder="Last name" value={form.l_name} onChange={set("l_name")} onBlur={blur("l_name")} err={showErr("l_name")} />
              <FieldErr msg={showErr("l_name")} />
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <FLabel required>Work Email</FLabel>
            <FInput type="email" placeholder="admin@company.com" value={form.work_email} onChange={set("work_email")} onBlur={blur("work_email")} err={showErr("work_email")} disabled={isEdit} className={isEdit ? "opacity-60 cursor-not-allowed" : ""} />
            <FieldErr msg={showErr("work_email")} />
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <FLabel required>Password</FLabel>
                <div className="relative">
                  <FInput type={showPass ? "text" : "password"} placeholder="Min 8 characters" value={form.password} onChange={set("password")} onBlur={blur("password")} err={showErr("password")} className="pr-11" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c499b4] hover:text-[#730042] transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center">
                    {showPass ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </button>
                </div>
                <FieldErr msg={showErr("password")} />
              </div>
              <div>
                <FLabel required>Confirm Password</FLabel>
                <div className="relative">
                  <FInput type={showConfirm ? "text" : "password"} placeholder="Re-enter password" value={form.confirmPassword} onChange={set("confirmPassword")} onBlur={blur("confirmPassword")} err={showErr("confirmPassword")} className="pr-11" />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c499b4] hover:text-[#730042] transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center">
                    {showConfirm ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </button>
                </div>
                <FieldErr msg={showErr("confirmPassword")} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div>
              <FLabel required>Gender</FLabel>
              <FSel value={form.gender} onChange={set("gender")} onBlur={blur("gender")} err={showErr("gender")}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </FSel>
              <FieldErr msg={showErr("gender")} />
            </div>
            <div>
              <FLabel>Marital Status</FLabel>
              <FSel value={form.marital_status} onChange={set("marital_status")}>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
              </FSel>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div>
              <FLabel required>Personal Contact</FLabel>
              <FInput placeholder="10-digit mobile" value={form.personal_contact} onChange={set("personal_contact")} onBlur={blur("personal_contact")} err={showErr("personal_contact")} maxLength={10} />
              <FieldErr msg={showErr("personal_contact")} />
            </div>
            <div>
              <FLabel required>Emergency Contact</FLabel>
              <FInput placeholder="10-digit mobile" value={form.e_contact} onChange={set("e_contact")} onBlur={blur("e_contact")} err={showErr("e_contact")} maxLength={10} />
              <FieldErr msg={showErr("e_contact")} />
            </div>
          </div>

          <SecHead icon={<FaBriefcase size={11} />}>Work Details</SecHead>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <FLabel required>Designation</FLabel>
              <FInput placeholder="e.g. HR Manager" value={form.designation} onChange={set("designation")} onBlur={blur("designation")} err={showErr("designation")} />
              <FieldErr msg={showErr("designation")} />
            </div>
            <div>
              <FLabel required>Role</FLabel>
              <FSel value={form.role} onChange={set("role")}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </FSel>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div>
              <FLabel required>Department</FLabel>
              <FSel value={form.department} onChange={set("department")} onBlur={blur("department")} err={showErr("department")}>
                <option value="">Select department</option>
                {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </FSel>
              <FieldErr msg={showErr("department")} />
            </div>
            <div>
              <FLabel required>Office Location</FLabel>
              <FSel value={form.office_location} onChange={set("office_location")} onBlur={blur("office_location")} err={showErr("office_location")}>
                <option value="">Select location</option>
                {OFFICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </FSel>
              <FieldErr msg={showErr("office_location")} />
            </div>
          </div>

          <SecHead icon={<FaUserShield size={11} />}>Experience</SecHead>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 pt-4 sm:pt-5">
              <input type="checkbox" id="is_fresher" checked={form.is_fresher} onChange={set("is_fresher")} className="w-5 h-5 accent-[#730042] cursor-pointer rounded flex-shrink-0" />
              <label htmlFor="is_fresher" className="text-[11px] font-bold tracking-widest uppercase text-[#7a5568] cursor-pointer select-none">Is Fresher</label>
            </div>
            <div>
              <FLabel>Total Experience (years)</FLabel>
              <FInput type="number" min="0" placeholder="0" value={form.total_experience} onChange={set("total_experience")} onBlur={blur("total_experience")} err={showErr("total_experience")} disabled={form.is_fresher} className={form.is_fresher ? "opacity-40 cursor-not-allowed" : ""} />
              <FieldErr msg={showErr("total_experience")} />
            </div>
          </div>

          {!form.is_fresher && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div>
                <FLabel>Previous Company</FLabel>
                <FInput placeholder="Company name" value={form.previous_company} onChange={set("previous_company")} />
              </div>
              <div>
                <FLabel>Previous Designation</FLabel>
                <FInput placeholder="Last role" value={form.previous_designation} onChange={set("previous_designation")} />
              </div>
            </div>
          )}

          <SecHead icon={<FaIdCard size={11} />}>Identity & Address</SecHead>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <FLabel>Aadhaar Number</FLabel>
              <FInput placeholder="12 digits" value={form.aadhaar_number} onChange={set("aadhaar_number")} onBlur={blur("aadhaar_number")} err={showErr("aadhaar_number")} maxLength={12} />
              <FieldErr msg={showErr("aadhaar_number")} />
            </div>
            <div>
              <FLabel>PAN Number</FLabel>
              <FInput placeholder="ABCDE1234F" value={form.pan_number} onChange={setUpper("pan_number")} onBlur={blur("pan_number")} err={showErr("pan_number")} maxLength={10} />
              <FieldErr msg={showErr("pan_number")} />
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <FLabel>Residential Address</FLabel>
            <FInput placeholder="Current / residential street, locality" value={form.residential_address} onChange={set("residential_address")} />
          </div>

          <div className="mt-3 sm:mt-4">
            <FLabel>Permanent Address</FLabel>
            <FInput placeholder="Permanent / hometown address" value={form.permanent_address} onChange={set("permanent_address")} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div>
              <FLabel>City</FLabel>
              <FInput placeholder="City" value={form.city} onChange={set("city")} />
            </div>
            <div>
              <FLabel>State</FLabel>
              <FInput placeholder="State" value={form.state} onChange={set("state")} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <FLabel>Pincode</FLabel>
              <FInput placeholder="6 digits" value={form.pincode} onChange={set("pincode")} onBlur={blur("pincode")} err={showErr("pincode")} maxLength={6} />
              <FieldErr msg={showErr("pincode")} />
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <FLabel>Country</FLabel>
            <FSel value={form.country} onChange={set("country")}>
              <option value="">Select country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </FSel>
          </div>

          <SecHead icon={<FaUniversity size={11} />}>
            Banking Details <span className="normal-case tracking-normal font-normal text-[#c499b4] ml-1">(optional)</span>
          </SecHead>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <FLabel>Bank Name</FLabel>
              <FInput placeholder="e.g. HDFC Bank" value={form.bank_name} onChange={set("bank_name")} />
            </div>
            <div>
              <FLabel>Account Holder Name</FLabel>
              <FInput placeholder="As per passbook" value={form.account_holder_name} onChange={set("account_holder_name")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
<div>
  <FLabel>Account Number</FLabel>

  <FInput
    placeholder="Account number"
    value={form.account_number}
    onChange={set("account_number")}
    onBlur={blur("account_number")}
    err={showErr("account_number")}
    maxLength={18}
  />

  <FieldErr msg={showErr("account_number")} />
</div>
            <div>
              <FLabel>IFSC Code</FLabel>
              <FInput placeholder="e.g. HDFC0001234" value={form.ifsc_code} onChange={setUpper("ifsc_code")} onBlur={blur("ifsc_code")} err={showErr("ifsc_code")} maxLength={11} />
              <FieldErr msg={showErr("ifsc_code")} />
            </div>
          </div>

          <SecHead icon={<FaShieldAlt size={11} />}>Permission Setup</SecHead>
          <p className="text-[12px] text-[#7a5568] mb-5 leading-relaxed -mt-2">
            Control which modules and actions this admin can access.
          </p>
          <PermissionEditor permissions={permissions} onChange={setPermissions} />
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#e8d5e2] px-4 sm:px-7 py-3 sm:py-4 flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3 rounded-b-2xl">
          {submitted && hasErrors(errors) && (
            <p className="text-[11px] text-red-500 font-medium flex-1 w-full xs:w-auto">Please fix the errors above before saving.</p>
          )}
          <div className="flex gap-2 sm:gap-3 w-full xs:w-auto xs:ml-auto flex-shrink-0">
            <button onClick={onClose} className="flex-1 xs:flex-none px-3 sm:px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors whitespace-nowrap min-h-[44px]">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading} className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[44px]">
              <FaCheck size={10} />
              {loading ? "Saving…" : isEdit ? "Update Admin" : "Create Admin"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnModal({ open, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState({ title: "", message: "", audience: "all", priority: "normal" });
  useEffect(() => {
    if (open) setForm({ title: "", message: "", audience: "all", priority: "normal", ...(initial || {}) });
  }, [open]);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl animate-[modalUp_0.22s_ease-out]">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#0d0209]">{initial ? "Edit Announcement" : "New Announcement"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"><FaTimes size={13} /></button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
          <div>
            <FLabel required>Title</FLabel>
            <FInput placeholder="Announcement title…" value={form.title} onChange={set("title")} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <FLabel>Audience</FLabel>
              <FSel value={form.audience} onChange={set("audience")}>
                <option value="all">All</option>
                <option value="admin">Admins</option>
                <option value="manager">Managers</option>
                <option value="employee">Employees</option>
              </FSel>
            </div>
            <div>
              <FLabel>Priority</FLabel>
              <FSel value={form.priority} onChange={set("priority")}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </FSel>
            </div>
          </div>
          <div>
            <FLabel required>Message</FLabel>
            <textarea
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#e8d5e2] rounded-lg text-[13px] text-[#0d0209] outline-none transition focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3] placeholder:text-[#c499b4] resize-none min-h-[90px] leading-relaxed"
              placeholder="Write your announcement…"
              value={form.message}
              onChange={set("message")}
            />
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex justify-end gap-2 sm:gap-3">
          <button onClick={onClose} className="px-3 sm:px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">Cancel</button>
          <button onClick={() => onSave(form)} disabled={loading || !form.title || !form.message} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
            <FaCheck size={10} />
            {loading ? "Saving…" : initial ? "Update" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ open, onClose, admins, onSave, loading }) {
  const [form, setForm] = useState({ adminid: "", rating: 0, comment: "" });
  useEffect(() => { if (open) setForm({ adminid: "", rating: 0, comment: "" }); }, [open]);
  if (!open) return null;
  return (
   <div
  className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-[modalUp_0.22s_ease-out]">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#0d0209]">Review Admin</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"><FaTimes size={13} /></button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
          <div>
            <FLabel>Select Admin</FLabel>
            <FSel value={form.adminid} onChange={(e) => setForm((f) => ({ ...f, adminid: e.target.value }))}>
              <option value="">Choose admin…</option>
              {admins.map((a) => (
                <option key={a._id} value={a._id}>{a.f_name} {a.l_name} – {a.designation} ({a.department})</option>
              ))}
            </FSel>
          </div>
          <div>
            <FLabel>Rating</FLabel>
            <div className="flex gap-1 sm:gap-2 mt-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, rating: n }))} className={`text-2xl transition-transform hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center ${form.rating >= n ? "text-amber-400" : "text-gray-200"}`}>★</button>
              ))}
            </div>
          </div>
          <div>
            <FLabel>Comment</FLabel>
            <textarea
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#e8d5e2] rounded-lg text-[13px] text-[#0d0209] outline-none transition focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3] placeholder:text-[#c499b4] resize-none min-h-[80px] leading-relaxed"
              placeholder="Write your review…"
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex justify-end gap-2 sm:gap-3">
          <button onClick={onClose} className="px-3 sm:px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">Cancel</button>
          <button onClick={() => onSave(form)} disabled={loading || !form.adminid || !form.rating || !form.comment} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
            <FaStar size={10} />
            {loading ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

const AttendanceMap = ({ checkins = [], loading }) => {
  const mapRef = useRef(null);
  const instRef = useRef(null);
  const markRef = useRef([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (instRef.current || !mapRef.current) return;
      if (!window.L) {
        await new Promise((res) => {
          const css = document.createElement("link");
          css.rel = "stylesheet";
          css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(css);
          const js = document.createElement("script");
          js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          js.onload = res;
          document.head.appendChild(js);
        });
      }
      if (!alive || !mapRef.current || instRef.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: false }).setView([22.5, 80.0], 5);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "© CARTO", maxZoom: 18 }).addTo(map);
      instRef.current = map;
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = instRef.current;
    if (!L || !map) return;
    markRef.current.forEach((m) => map.removeLayer(m));
    markRef.current = [];
    if (!checkins.length) return;
    const bounds = [];
    checkins.forEach(({ lat, lng, name, role, dept, email, checkIn, checkedOut }) => {
      if (!lat || !lng) return;
      const color = ROLE_COLOR[role?.toLowerCase()] ?? ROLE_COLOR.employee;
      const sz = role?.toLowerCase() === "manager" ? 16 : 12;
      const pulse = sz + 16;
      const icon = window.L.divIcon({
        className: "",
        html: `<div style="position:relative;width:${pulse}px;height:${pulse}px;">
          <div style="position:absolute;top:50%;left:50%;width:${pulse}px;height:${pulse}px;border-radius:50%;background:${color}33;animation:mPulse 2.2s infinite;transform:translate(-50%,-50%);"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 10px ${color}66;${checkedOut ? "opacity:.45;" : ""}"></div>
        </div>`,
        iconSize: [pulse, pulse], iconAnchor: [pulse / 2, pulse / 2],
      });
      const marker = window.L.marker([lat, lng], { icon })
        .bindPopup(`<div style="font-family:system-ui,sans-serif;padding:4px;min-width:170px;">
          <div style="font-weight:700;font-size:13px;color:${color};margin-bottom:4px;">${name || "Unknown"}</div>
          <div style="font-size:11px;color:#8a6070;margin-bottom:6px;text-transform:capitalize;">${role ?? ""}${dept ? " · " + dept : ""}</div>
          ${email ? `<div style="font-size:11px;color:#8a6070;margin-bottom:4px;">✉ ${email}</div>` : ""}
          <div style="font-size:11px;">✅ Check-in: <strong>${fmtTime(checkIn)}</strong></div>
          ${checkedOut ? `<div style="font-size:11px;color:#0d9e6e;margin-top:2px;">🏁 Checked out</div>` : `<div style="font-size:11px;color:#b8760a;margin-top:2px;">🟡 On duty</div>`}
        </div>`, { closeButton: false, maxWidth: 220 })
        .addTo(map);
      markRef.current.push(marker);
      bounds.push([lat, lng]);
    });
    if (bounds.length) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 }); } catch (_) {}
    }
  }, [checkins]);

  useEffect(() => () => { if (instRef.current) { instRef.current.remove(); instRef.current = null; } }, []);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      {loading && (
        <div className="absolute inset-0 bg-[rgba(253,245,249,0.85)] flex items-center justify-center gap-2 text-[13px] text-[#8a6070] z-50">
          <span className="text-lg">⏳</span> Fetching check-ins…
        </div>
      )}
      {!loading && checkins.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-50 pointer-events-none">
          <span className="text-3xl">📍</span>
          <p className="text-[13px] text-[#8a6070]">No check-ins today</p>
        </div>
      )}
      <style>{`@keyframes mPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.5}50%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}`}</style>
    </div>
  );
};

function StatCard({ icon, label, value, sub, color, bgColor, bar, badge }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 overflow-hidden relative p-4 sm:p-5">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}cc, ${color}44)` }} />
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-sm sm:text-base" style={{ background: bgColor, color }}>
        {icon}
      </div>
      <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.8px] uppercase text-[#7a5568] mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl sm:text-3xl font-bold text-[#0d0209] leading-none mb-1">{value}</p>
        {badge && (
          <span className="mb-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
            {badge.label}
          </span>
        )}
      </div>
      <p className="text-[10px] sm:text-[11px] font-medium mt-1.5" style={{ color }}>{sub}</p>
      {bar !== null && bar !== undefined && (
        <div className="h-[3px] bg-[#e8d5e2] rounded-full mt-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${bar}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
        </div>
      )}
    </div>
  );
}

function AddAdminButton({ isAtLimit, onClick, variant = "header" }) {
  const base = "flex items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold transition-colors min-h-[44px] relative group";

  const variantCls = {
    header: "bg-[#730042] text-white px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-[#4a0029]",
    hero: "bg-white/15 border border-white/25 text-white px-3 py-2 hover:bg-white/25 backdrop-blur-sm",
    heroMobile: "flex-1 bg-white/15 border border-white/25 text-white px-3 py-2.5 hover:bg-white/25 backdrop-blur-sm",
  };

  const disabledCls = "opacity-50 cursor-not-allowed hover:bg-current";

  return (
    <button
      type="button"
      onClick={isAtLimit ? undefined : onClick}
      disabled={isAtLimit}
      aria-disabled={isAtLimit}
      className={`${base} ${variantCls[variant]} ${isAtLimit ? disabledCls : ""}`}
    >
      <FaPlus size={9} />
      <span className={variant === "header" ? "hidden xs:inline" : ""}>Add Admin</span>
      {isAtLimit && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[220px] text-center bg-[#0d0209] text-white text-[11px] font-medium px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
          You've reached your maximum limit. Upgrade your plan.
        </span>
      )}
    </button>
  );
}

function SuperAdminDashboard() {
  const [greeting, setGreeting] = useState("");
  const [thought, setThought] = useState("");
  const [annModal, setAnnModal] = useState({ open: false, editing: null });
  const [adminModal, setAdminModal] = useState({ open: false, editing: null });
  const [reviewModal, setReviewModal] = useState(false);
  const [permModal, setPermModal] = useState({ open: false, user: null });
  const [workingStatusModal, setWorkingStatusModal] = useState({ open: false, admin: null });
  const [leaveTab, setLeaveTab] = useState("admin");
  const [empExpand, setEmpExpand] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  const { data: meData } = useGetMeSuperAdmin();
  const { data: checkinData, isLoading: mapLoading } = useGetTodayCheckins();
  const { data: adminsData, isLoading: adminsLoading } = useGetAllAdmins();
  const { data: empData, isLoading: empLoading } = useGetAllEmployees();
  const { data: deptData, isLoading: deptLoading } = useGetNoOfEmployees();
  const { data: leavesRaw, isLoading: leaveLoading } = useShowAllLeaves();
  const { data: annRaw, isLoading: annLoading } = useGetAllAnnouncements();
  const { data: activeUserData, isLoading: activeUserLoading } = useSuperAdminActiveUserCount();

  const { mutate: createAnn, isPending: creatingAnn } = useCreateAnnouncement();
  const { mutate: updateAnn, isPending: updatingAnn } = useUpdateAnnouncement();
  const { mutate: deleteAnn } = useDeleteAnnouncement();
  const { mutate: createAdmin, isPending: creatingAdmin } = useCreateAdmin();
  const { mutate: updateAdmin, isPending: updatingAdmin } = useUpdateAdmin();
  const { mutate: deleteAdmin } = useDeleteAdmin();
  const { mutate: acceptLeave, isPending: accepting } = useAcceptLeaveByAdmin();
  const { mutate: rejectLeave, isPending: rejecting } = useRejectLeaveByAdmin();
  const { mutate: reviewAdmin, isPending: reviewing } = useReviewToAdmin();
  const { mutate: updatePermissions, isPending: updatingPerms } = useUpdatePermissions();
  const { mutate: setAdminWorkingStatus, isPending: settingWorkingStatus } = useSetAdminWorkingStatus();

  const superAdmin = meData?.superAdmin || meData || {};
  const checkins = checkinData?.checkins ?? [];
  const presentToday = checkinData?.total ?? checkins.length;
  const stillOnDuty = checkins.filter((c) => !c.checkedOut).length;
  const admins = Array.isArray(adminsData?.admins) ? adminsData.admins : Array.isArray(adminsData) ? adminsData : [];
  const employees = Array.isArray(empData?.users) ? empData.users : Array.isArray(empData) ? empData : [];
  const departments = Array.isArray(deptData?.departments) ? deptData.departments : [];
  const totalEmpCount = deptData?.totalEmployees ?? employees.length;
  const announcements = Array.isArray(annRaw?.announcements) ? annRaw.announcements : Array.isArray(annRaw) ? annRaw : [];

  const adminLeaves = Array.isArray(leavesRaw?.adminLeaves?.leaves) ? leavesRaw.adminLeaves.leaves : [];
  const activeLeaves = adminLeaves;
  const pendingAdminLeaves = adminLeaves.filter((l) => (l.status || "").includes("pending")).length;
  const attendanceRate = totalEmpCount > 0 ? Math.round((presentToday / totalEmpCount) * 100) : 0;

  const activeUserCount = activeUserData?.active_user_count ?? 0;
  const allowedUsers = activeUserData?.allowed_users ?? 0;
  const userUsagePercent = allowedUsers > 0 ? Math.min(Math.round((activeUserCount / allowedUsers) * 100), 100) : 0;
  const isNearLimit = allowedUsers > 0 && activeUserCount >= allowedUsers * 0.8;
  const isAtLimit = allowedUsers > 0 ? activeUserCount >= allowedUsers : (activeUserData?.is_limit_reached ?? false);

  const THOUGHTS = [
    "The strength of an organisation lies in the people it cultivates.",
    "Clarity at the top creates confidence throughout the hierarchy.",
    "Data without action is just noise. Lead with intention.",
    "Great cultures are built one decision at a time.",
    "Trust is the foundation every high-performing team is built on.",
  ];

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : h < 21 ? "Good Evening 🌆" : "Good Night 🌙");
    setThought(THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
  }, []);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const orgName = superAdmin?.organisation_name || "Your Organisation";
  const displayName = [superAdmin?.f_name, superAdmin?.l_name].filter(Boolean).join(" ") || "there";
  const maxDept = Math.max(...departments.map((d) => d.lastNumber), 1);

  const filteredEmp = employees.filter((e) => {
    const q = empSearch.toLowerCase();
    const name = [e.f_name, e.l_name].filter(Boolean).join(" ").toLowerCase();
    return !q || name.includes(q) || (e.department || "").toLowerCase().includes(q) || (e.work_email || "").toLowerCase().includes(q);
  });
  const displayEmp = empExpand ? filteredEmp : filteredEmp.slice(0, 10);

  const activeUserBadge = isAtLimit
    ? { label: "Limit reached", color: "#d93025", bg: "#fce8e6", border: "#f5c6c3" }
    : isNearLimit
    ? { label: "Near limit", color: "#b8760a", bg: "#fff8e1", border: "#ffe082" }
    : null;

  const activeUserColor = isAtLimit ? "#d93025" : isNearLimit ? "#b8760a" : "#730042";

  const stats = [
    { icon: <FaUserShield />, label: "Total Admins", value: adminsLoading ? "—" : admins.length, sub: `${admins.filter((a) => a.status === "active").length} active`, color: "#730042", bgColor: "#f7ecf3", bar: null, badge: null },
    { icon: <FaUsers />, label: "Total Employees", value: deptLoading || empLoading ? "—" : totalEmpCount, sub: `${departments.length} departments`, color: "#2563eb", bgColor: "#eff6ff", bar: null, badge: null },
    { icon: <FaClock />, label: "Present Today", value: mapLoading ? "—" : presentToday, sub: `${attendanceRate}% · ${stillOnDuty} on duty`, color: "#0d9e6e", bgColor: "#e8f7f1", bar: mapLoading ? null : attendanceRate, badge: null },
    { icon: <FaCalendarAlt />, label: "Admin Leaves", value: leaveLoading ? "—" : pendingAdminLeaves, sub: pendingAdminLeaves > 0 ? "Needs attention" : "All clear ✓", color: pendingAdminLeaves > 0 ? "#b8760a" : "#0d9e6e", bgColor: pendingAdminLeaves > 0 ? "#fff8e1" : "#e8f7f1", bar: null, badge: null },
    { icon: <FaBullhorn />, label: "Announcements", value: annLoading ? "—" : announcements.length, sub: "Active broadcasts", color: "#7c3aed", bgColor: "#f5f3ff", bar: null, badge: null },
    {
      icon: <FaToggleOn />,
      label: "Active Users",
      value: activeUserLoading ? "—" : `${activeUserCount}/${allowedUsers}`,
      sub: activeUserLoading ? "Loading…" : isAtLimit ? "Seat limit reached" : isNearLimit ? "Approaching limit" : `${allowedUsers - activeUserCount} seats remaining`,
      color: activeUserColor,
      bgColor: isAtLimit ? "#fce8e6" : isNearLimit ? "#fff8e1" : "#f7ecf3",
      bar: activeUserLoading ? null : userUsagePercent,
      badge: activeUserBadge,
    },
  ];

  const saveAnn = (form) => {
    if (annModal.editing) {
      updateAnn({ id: annModal.editing._id, data: form }, { onSuccess: () => setAnnModal({ open: false, editing: null }) });
    } else {
      createAnn(form, { onSuccess: () => setAnnModal({ open: false, editing: null }) });
    }
  };

  const saveAdmin = (form) => {
    if (adminModal.editing) {
      updateAdmin({ id: adminModal.editing._id, data: form }, { onSuccess: () => setAdminModal({ open: false, editing: null }) });
    } else {
      createAdmin(form, { onSuccess: () => setAdminModal({ open: false, editing: null }) });
    }
  };

  const handleAcceptLeave = (leave) => acceptLeave({ id: leave._id, leaveFor: "admin" });
  const handleRejectLeave = (leave) => rejectLeave({ id: leave._id, leaveFor: "admin" });

  const saveReview = (form) => reviewAdmin(form, { onSuccess: () => setReviewModal(false) });

  const savePermissions = (payload) => {
    updatePermissions(payload, { onSuccess: () => setPermModal({ open: false, user: null }) });
  };

  const handleWorkingStatusConfirm = (payload) => {
    setAdminWorkingStatus(payload, {
      onSuccess: () => setWorkingStatusModal({ open: false, admin: null }),
    });
  };

  const isAdminNonWorking = (admin) => {
    const ws = (admin.working_status || "working").toLowerCase();
    return ws !== "working";
  };

  const isPendingLeave = (leave) => {
    const s = (leave.status || "").toLowerCase();
    return s.includes("pending");
  };

  const leaveStatusClass = (status = "") => {
    const s = status.toLowerCase();
    if (s.includes("approved")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (s.includes("rejected")) return "bg-red-50 text-red-700 border border-red-200";
    return "bg-amber-50 text-amber-700 border border-amber-200";
  };

  const leaveStatusLabel = (status = "") => {
    if (status.includes("approved")) return "Approved";
    if (status.includes("rejected")) return "Rejected";
    if (status.includes("pending")) return "Pending";
    return status;
  };

  const roleBadgeCls = (role = "") => {
    if (role === "senior_admin") return "bg-violet-50 text-violet-700 border border-violet-200";
    if (role === "official") return "bg-sky-50 text-sky-700 border border-sky-200";
    return "bg-[#f7ecf3] text-[#730042] border border-[#e8d5e2]";
  };

  const priorityChipCls = (priority = "") => {
    if (priority === "urgent") return "bg-red-50 text-red-700 border border-red-200";
    if (priority === "low") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    return "bg-[#f7ecf3] text-[#730042] border border-[#e8d5e2]";
  };

  return (
    <div className="min-h-screen bg-[#fdf5f9] p-3 sm:p-5 lg:p-7 font-[system-ui,sans-serif] text-[#0d0209]">
      <style>{`
        @keyframes modalUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        .animate-\\[modalUp_0\\.22s_ease-out\\] { animation: modalUp 0.22s ease-out; }
      `}</style>

      <div className="relative bg-gradient-to-br from-[#2a0017] via-[#730042] to-[#cd166e] rounded-2xl p-4 sm:p-8 lg:p-10 mb-5 sm:mb-6 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 sm:w-48 h-32 sm:h-48 rounded-full bg-white/3 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#4ade80] flex-shrink-0" />
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-white/70">Super Administrator</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight tracking-tight">
                {greeting}, {displayName}!
              </h1>
              <p className="text-xs sm:text-sm text-white/60 max-w-lg leading-relaxed mb-4 sm:mb-5">"{thought}"</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
              <AddAdminButton isAtLimit={isAtLimit} onClick={() => setAdminModal({ open: true, editing: null })} variant="hero" />
              <button onClick={() => setReviewModal(true)} className="flex items-center gap-1.5 bg-white/15 border border-white/25 text-white px-3 py-2 rounded-xl text-[12px] font-semibold hover:bg-white/25 transition-colors backdrop-blur-sm min-h-[44px]">
                <FaStar size={9} /> Review
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-0">
            <span className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-white/90 font-medium">🏢 {orgName}</span>
            <span className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-white/90 font-medium">👥 {totalEmpCount} Employees</span>
            {presentToday > 0 && <span className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-white/90 font-medium">✅ {presentToday} Present</span>}
            {pendingAdminLeaves > 0 && <span className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-white/90 font-medium">📋 {pendingAdminLeaves} Pending</span>}
            <span className="hidden md:inline-flex bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-white/90 font-medium">📆 {today}</span>
          </div>

          <div className="flex sm:hidden gap-2 mt-3">
            <AddAdminButton isAtLimit={isAtLimit} onClick={() => setAdminModal({ open: true, editing: null })} variant="heroMobile" />
            <button onClick={() => setReviewModal(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-white/15 border border-white/25 text-white px-3 py-2.5 rounded-xl text-[12px] font-semibold hover:bg-white/25 transition-colors backdrop-blur-sm min-h-[44px]">
              <FaStar size={9} /> Review
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 sm:gap-5 mb-4 sm:mb-5">
        <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#e8d5e2] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="font-bold text-[13px] sm:text-[15px] text-[#0d0209] truncate">Live Attendance Map</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#c499b4] font-medium flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <FaMapMarkerAlt size={9} />
              {mapLoading ? "Loading…" : `${checkins.length} today`}
            </span>
          </div>
          <div className="h-[240px] sm:h-[300px]">
            <AttendanceMap checkins={checkins} loading={mapLoading} />
          </div>
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-[#f7ecf3] border-t border-[#e8d5e2] flex flex-wrap gap-3 sm:gap-4 items-center">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#7a5568]">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#730042] border-2 border-white shadow-sm flex-shrink-0" />Manager
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#7a5568]">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#a0005c] border-2 border-white shadow-sm flex-shrink-0" />Employee
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#7a5568]">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-300 border-2 border-white shadow-sm opacity-60 flex-shrink-0" />Checked out
            </div>
            <span className="ml-auto text-[10px] sm:text-[11px] text-[#c499b4]">Click pin for details</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#e8d5e2] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <FaCalendarAlt size={12} className="text-[#730042] flex-shrink-0" />
              <span className="font-bold text-[13px] sm:text-[15px] text-[#0d0209] truncate">Admin Leave Requests</span>
            </div>
            {pendingAdminLeaves > 0 && (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 sm:px-2.5 py-1 rounded-full flex-shrink-0">{pendingAdminLeaves} pending</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 max-h-[320px] sm:max-h-[380px]">
            {leaveLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#c499b4]">
                <span className="text-2xl">⏳</span>
                <p className="text-[12px]">Loading…</p>
              </div>
            ) : activeLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#c499b4]">
                <FaCheckCircle size={24} className="text-emerald-400" />
                <p className="text-[12px]">No admin leave requests.</p>
              </div>
            ) : (
              activeLeaves.map((leave) => {
                const emp = leave.admin || {};
                const name = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || "Admin";
                const type = leave.leaveType || leave.type || "Leave";
                const from = leave.startDate || leave.from || "";
                const to = leave.endDate || leave.to || "";
                const pending = isPendingLeave(leave);
                return (
                  <div key={leave._id} className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#f7ecf3] last:border-0 hover:bg-[#fdf5f9] transition-colors flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white flex-shrink-0" style={{ background: leaveTypeColor(type) }}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] sm:text-[13px] font-semibold text-[#0d0209] truncate">{name}</p>
                      <p className="text-[10px] sm:text-[11px] text-[#7a5568] mt-0.5 leading-snug">
                        {type.toUpperCase()} · {fmtDate(from)}{to && to !== from ? ` → ${fmtDate(to)}` : ""}
                        {emp.designation ? ` · ${emp.designation}` : ""}
                      </p>
                      {leave.reason && <p className="text-[10px] sm:text-[11px] text-[#c499b4] mt-1 italic line-clamp-1">"{leave.reason}"</p>}
                      {pending ? (
                        <div className="flex gap-1.5 sm:gap-2 mt-2">
                          <button
                            onClick={() => handleAcceptLeave(leave)}
                            disabled={accepting}
                            className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2 sm:px-2.5 py-1.5 text-[11px] font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors disabled:opacity-50 min-h-[36px]"
                          >
                            <FaCheck size={8} /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave)}
                            disabled={rejecting}
                            className="flex items-center gap-1 sm:gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg px-2 sm:px-2.5 py-1.5 text-[11px] font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors disabled:opacity-50 min-h-[36px]"
                          >
                            <FaBan size={8} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${leaveStatusClass(leave.status)}`}>
                          {leaveStatusLabel(leave.status)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm overflow-hidden mb-4 sm:mb-5">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#e8d5e2] flex items-center justify-between flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <FaUserCog size={13} className="text-[#730042]" />
            <span className="font-bold text-[13px] sm:text-[15px] text-[#0d0209]">Admin Management</span>
            {isAtLimit && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                <FaCrown size={8} /> Seat limit reached
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setReviewModal(true)} className="flex items-center gap-1 sm:gap-1.5 border border-[#e8d5e2] text-[#7a5568] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-[12px] font-semibold hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[36px] sm:min-h-[40px]">
              <FaStar size={9} /> <span className="hidden xs:inline">Review Admin</span><span className="xs:hidden">Review</span>
            </button>
            <AddAdminButton isAtLimit={isAtLimit} onClick={() => setAdminModal({ open: true, editing: null })} variant="header" />
          </div>
        </div>
        {adminsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#c499b4]">
            <span className="text-2xl">⏳</span>
            <p className="text-[12px]">Loading admins…</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#c499b4]">
            <FaUserShield size={28} />
            <p className="text-[13px] text-center px-4">No admins yet. Create one to delegate management.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-5">
            {admins.map((admin) => {
              const name = [admin.f_name, admin.l_name].filter(Boolean).join(" ");
              const statusKey = (admin.status || "inactive").toLowerCase();
              const roleKey = admin.role || "admin";
              const workingStatus = (admin.working_status || "working").toLowerCase();
              const isNonWorking = workingStatus !== "working";
              const wsMeta = WORKING_STATUS_META[workingStatus] || WORKING_STATUS_META.working;
              return (
                <div key={admin._id} className={`border rounded-xl p-3 sm:p-4 flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative ${isNonWorking ? "border-red-200 bg-red-50/40" : "border-[#e8d5e2] hover:bg-[#fdf5f9]"}`}>
                  {isNonWorking && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: wsMeta.color, background: wsMeta.bg, border: `1px solid ${wsMeta.border}` }}>
                        {wsMeta.label}
                      </span>
                    </div>
                  )}
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-[13px] sm:text-[14px] font-bold text-white mx-auto mb-2 sm:mb-3 ${isNonWorking ? "opacity-60" : ""}`} style={{ background: `linear-gradient(135deg, ${avaColor(admin.f_name || "")}, #cd166e)` }}>
                    {initials(name)}
                  </div>
                  <p className={`text-[12px] sm:text-[13px] font-bold text-center truncate ${isNonWorking ? "text-gray-400" : "text-[#0d0209]"}`}>{name}</p>
                  <p className="text-[10px] sm:text-[11px] text-[#7a5568] text-center mt-0.5 truncate">{admin.designation}</p>
                  <p className="text-[10px] text-[#c499b4] text-center mt-0.5 truncate hidden sm:block">{admin.work_email}</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-2 sm:mt-2.5">
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${statusKey === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : statusKey === "suspended" ? "bg-red-50 text-red-700 border border-red-200" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                      {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${roleBadgeCls(roleKey)}`}>
                      {ROLE_LABEL[roleKey] || roleKey}
                    </span>
                  </div>
                  {admin.department && (
                    <p className="text-center mt-1 sm:mt-1.5 hidden sm:block">
                      <span className="text-[9px] sm:text-[10px] bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full font-semibold">
                        {admin.department} · {admin.office_location}
                      </span>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[#f0dcea]">
                    {!isNonWorking ? (
                      <button
                        onClick={() => setWorkingStatusModal({ open: true, admin })}
                        className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-[#7a5568] hover:bg-red-50 hover:text-red-600 transition-colors min-h-[34px]"
                        title="Update Working Status"
                      >
                        <FaUserSlash size={9} /> Status
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() => setPermModal({ open: true, user: admin })}
                      className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-h-[34px]"
                      title="Edit Permissions"
                    >
                      <FaLock size={8} /> Perms
                    </button>
                    <button
                      onClick={() => setAdminModal({ open: true, editing: admin })}
                      className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-h-[34px]"
                    >
                      <FaEdit size={9} /> Edit
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Delete ${name}?`)) deleteAdmin(admin._id); }}
                      className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-[#7a5568] hover:bg-red-50 hover:text-red-600 transition-colors min-h-[34px]"
                    >
                      <FaTrash size={9} /> Del
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
        <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#e8d5e2] flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <FaLayerGroup size={12} className="text-[#730042]" />
              <span className="font-bold text-[13px] sm:text-[15px] text-[#0d0209]">Department Breakdown</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#c499b4] font-semibold">{deptLoading ? "…" : `${totalEmpCount} total`}</span>
          </div>
          {deptLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#c499b4]">
              <span className="text-2xl">⏳</span><p className="text-[12px]">Loading…</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#c499b4]">
              <FaChartBar size={24} /><p className="text-[12px]">No departments yet.</p>
            </div>
          ) : (
            <div>
              {departments.map((dep) => (
                <div key={dep.department} className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#f7ecf3] last:border-0 flex items-center gap-3 sm:gap-4">
                  <p className="text-[11px] sm:text-[12px] font-semibold text-[#0d0209] w-12 sm:w-16 flex-shrink-0">{dep.department}</p>
                  <div className="flex-1 h-2 bg-[#e8d5e2] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#4a0029] to-[#cd166e] transition-all duration-1000" style={{ width: `${Math.round((dep.lastNumber / maxDept) * 100)}%` }} />
                  </div>
                  <p className="text-[12px] sm:text-[13px] font-bold text-[#730042] w-5 sm:w-6 text-right flex-shrink-0">{dep.lastNumber}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#e8d5e2] flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <FaBullhorn size={12} className="text-[#730042]" />
              <span className="font-bold text-[13px] sm:text-[15px] text-[#0d0209]">Announcements</span>
            </div>
            <button onClick={() => setAnnModal({ open: true, editing: null })} className="flex items-center gap-1 sm:gap-1.5 bg-[#730042] text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-semibold hover:bg-[#4a0029] transition-colors min-h-[36px]">
              <FaPlus size={9} /> New
            </button>
          </div>
          {annLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#c499b4]">
              <span className="text-2xl">⏳</span><p className="text-[12px]">Loading…</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#c499b4] text-center px-4">
              <FaBullhorn size={24} /><p className="text-[12px]">No announcements yet. Publish one to notify your team.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f7ecf3]">
              {announcements.slice(0, 5).map((ann) => {
                const priority = (ann.priority || "normal").toLowerCase();
                const audience = ann.audience || "all";
                return (
                  <div key={ann._id} className="px-4 sm:px-5 py-3 sm:py-4 hover:bg-[#fdf5f9] transition-colors">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                      <span className={`text-[9px] sm:text-[10px] font-bold tracking-wide uppercase px-2 sm:px-2.5 py-0.5 rounded-full ${priorityChipCls(priority)}`}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-200 px-2 sm:px-2.5 py-0.5 rounded-full uppercase">{audience}</span>
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-semibold text-[#0d0209] mb-1">{ann.title}</p>
                    <p className="text-[11px] sm:text-[12px] text-[#7a5568] leading-relaxed line-clamp-2">{ann.message}</p>
                    <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-2.5 border-t border-[#f7ecf3]">
                      <button onClick={() => setAnnModal({ open: true, editing: ann })} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-[#c499b4] hover:text-[#730042] hover:bg-[#f7ecf3] px-1.5 sm:px-2 py-1 rounded-lg transition-colors font-medium min-h-[32px]">
                        <FaEdit size={9} /> Edit
                      </button>
                      <button onClick={() => { if (window.confirm("Delete this announcement?")) deleteAnn(ann._id); }} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-[#c499b4] hover:text-red-600 hover:bg-red-50 px-1.5 sm:px-2 py-1 rounded-lg transition-colors font-medium min-h-[32px]">
                        <FaTrash size={9} /> Delete
                      </button>
                      {ann.expiresAt && (
                        <span className="ml-auto text-[9px] sm:text-[10px] text-[#c499b4] self-center">Expires {fmtDate(ann.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm overflow-hidden mb-4 sm:mb-5">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#e8d5e2] flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <FaUsers size={13} className="text-[#730042]" />
            <span className="font-bold text-[13px] sm:text-[15px] text-[#0d0209]">Employee Overview</span>
          </div>
          <div className="flex items-center gap-2 xs:ml-auto">
            <div className="relative flex-1 xs:flex-none">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#c499b4]" size={10} />
              <input
                className="pl-7 sm:pl-8 pr-3 py-2 bg-[#fdf5f9] border border-[#e8d5e2] rounded-xl text-[11px] sm:text-[12px] text-[#0d0209] outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3] w-full xs:w-36 sm:w-52 transition-all placeholder:text-[#c499b4] min-h-[36px] sm:min-h-[40px]"
                placeholder="Search employees…"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
              />
            </div>
            {filteredEmp.length > 10 && (
              <button onClick={() => setEmpExpand((v) => !v)} className="flex items-center gap-1 sm:gap-1.5 border border-[#e8d5e2] text-[#7a5568] px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-[12px] font-semibold hover:border-[#730042] hover:text-[#730042] transition-colors whitespace-nowrap min-h-[36px] sm:min-h-[40px]">
                {empExpand ? "Less" : `All (${filteredEmp.length})`}
                <FaChevronRight size={8} className={`transition-transform ${empExpand ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>
        </div>
        {empLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#c499b4]">
            <span className="text-2xl">⏳</span><p className="text-[12px]">Loading employees…</p>
          </div>
        ) : filteredEmp.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#c499b4]">
            <FaUsers size={28} />
            <p className="text-[13px]">{empSearch ? "No matching employees." : "No employees found."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 p-3 sm:p-5">
            {displayEmp.map((emp, i) => {
              const name = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || "Employee";
              const role = emp.designation || emp.role || "";
              const dept = emp.department || "";
              const isManager = (emp.role || "").toLowerCase() === "manager";
              return (
                <div key={emp._id || i} className="border border-[#e8d5e2] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:shadow-sm hover:bg-[#fdf5f9] transition-all duration-150">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-white flex-shrink-0" style={{ background: isManager ? "linear-gradient(135deg,#730042,#cd166e)" : `linear-gradient(135deg,${avaColor(emp.f_name || "")},${avaColor((emp.l_name || "A"))})` }}>
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] font-semibold text-[#0d0209] truncate leading-tight">{name}</p>
                    {isManager && <span className="text-[9px] bg-[#f7ecf3] text-[#730042] px-1.5 py-0.5 rounded-full font-bold uppercase">MGR</span>}
                    {role && <p className="text-[10px] sm:text-[11px] text-[#7a5568] truncate mt-0.5">{role}</p>}
                    {dept && <span className="text-[9px] sm:text-[10px] bg-[#f7ecf3] text-[#730042] px-1.5 py-0.5 rounded-full font-semibold inline-block mt-0.5 sm:mt-1">{dept}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!empExpand && filteredEmp.length > 10 && (
          <div className="px-4 sm:px-5 py-3 border-t border-[#f0dcea] text-center">
            <button onClick={() => setEmpExpand(true)} className="text-[12px] font-semibold text-[#730042] hover:text-[#4a0029] transition-colors flex items-center gap-1.5 mx-auto min-h-[44px]">
              Show all {filteredEmp.length} employees <FaAngleDown size={12} />
            </button>
          </div>
        )}
      </div>

      <AnnModal
        open={annModal.open}
        onClose={() => setAnnModal({ open: false, editing: null })}
        initial={annModal.editing ? { title: annModal.editing.title, message: annModal.editing.message, audience: annModal.editing.audience || "all", priority: annModal.editing.priority || "normal" } : null}
        onSave={saveAnn}
        loading={creatingAnn || updatingAnn}
      />

      <AdminModal
        open={adminModal.open}
        onClose={() => setAdminModal({ open: false, editing: null })}
        initial={adminModal.editing}
        onSave={saveAdmin}
        loading={creatingAdmin || updatingAdmin}
      />

      <ReviewModal
        open={reviewModal}
        onClose={() => setReviewModal(false)}
        admins={admins}
        onSave={saveReview}
        loading={reviewing}
      />

      <EditPermissionsModal
        open={permModal.open}
        onClose={() => setPermModal({ open: false, user: null })}
        user={permModal.user}
        onSave={savePermissions}
        loading={updatingPerms}
      />

      <WorkingStatusModal
        open={workingStatusModal.open}
        onClose={() => setWorkingStatusModal({ open: false, admin: null })}
        admin={workingStatusModal.admin}
        onConfirm={handleWorkingStatusConfirm}
        loading={settingWorkingStatus}
      />
    </div>
  );
}

export default React.memo(SuperAdminDashboard);