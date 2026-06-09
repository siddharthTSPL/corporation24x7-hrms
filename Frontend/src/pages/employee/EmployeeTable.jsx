"use client";
import { useState } from "react";
import {
  FaEdit, FaTrash, FaSearch, FaFilter, FaTimes, FaUserTie, FaUserPlus,
  FaChevronLeft, FaChevronRight, FaBars, FaEye,
} from "react-icons/fa";
import {
  useAddManager, useAddEmployee, useFindAllManagers,
} from "../../auth/server-state/adminauth/adminauth.hook";
import {
  useGetAllEmployee, useDeleteUser, useEditEmployee,
} from "../../auth/server-state/adminother/adminother.hook";
import EmployeeDetailModal from "./EmployeeDetailModal";
import { FiEye, FiEyeOff } from "react-icons/fi";

/* ─────────────────────────── constants ─────────────────────────── */
const DEPARTMENTS = ["OPR", "BPO", "ENG", "MGMT", "HR"];
const LOCATIONS   = ["Noida", "Bareilly", "Delhi", "Mumbai"];
const COUNTRIES = [
  "India","United States","United Kingdom","Canada","Australia","Germany",
  "France","Japan","China","Singapore","UAE","Saudi Arabia","South Africa",
  "Brazil","Russia","Italy","Spain","Netherlands","New Zealand","Malaysia",
];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh",
];

const EMPTY_EMP = {
  f_name: "", l_name: "", work_email: "", password: "", confirm_password: "", gender: "", marital_status: "single",
  personal_contact: "", e_contact: "", department: "", designation: "", role: "employee",
  office_location: "", Under_manager: "", address: "", country: "", city: "", state: "", pincode: "",
  aadhaar_number: "", pan_number: "", is_fresher: true, total_experience: "",
  previous_company: "", previous_designation: "", bank_name: "", account_holder_name: "",
  account_number: "", ifsc_code: "", resume: "", aadhaar_card: "", pan_card: "", experience_letter: "",
};

const EMPTY_MGR = {
  f_name: "", l_name: "", work_email: "", password: "", confirm_password: "", gender: "",
  marital_status: "single", personal_contact: "", e_contact: "", department: "",
  designation: "", role: "manager", office_location: "", reporting_manager: "",
  address: "", country: "", city: "", state: "", pincode: "", aadhaar_number: "",
  pan_number: "", is_fresher: true, total_experience: "", previous_company: "",
  previous_designation: "", bank_name: "", account_holder_name: "", account_number: "",
  ifsc_code: "", resume: "", aadhaar_card: "", pan_card: "", experience_letter: "",
};

const EMP_STEPS = [
  { label: "Basic Info",  icon: "👤" },
  { label: "Work",        icon: "💼" },
  { label: "Address",     icon: "🏠" },
  { label: "Identity",    icon: "🪪" },
  { label: "Experience",  icon: "📋" },
  { label: "Bank & Docs", icon: "🏦" },
];

/* ─────────────────────────── shared input class ─────────────────────────── */
/*
 * RESPONSIVE NOTE: Added `min-w-0` to prevent inputs from blowing out
 * their grid cell on narrow viewports. `w-full` + `min-w-0` together
 * ensure the input shrinks inside a flex/grid container.
 */
const inputCls =
  "w-full min-w-0 px-3 py-2.5 rounded-lg border border-[#F4C0D1] bg-[#F9F8F2] text-sm text-[#730042] " +
  "focus:outline-none focus:border-[#CD166E] focus:ring-2 focus:ring-[#CD166E]/20 transition-all " +
  "placeholder-[#993556]/50 font-['DM_Sans',system-ui,sans-serif]";

/* ─────────────────────────── Field wrapper ─────────────────────────── */
function Field({ label, error, children, required, span2 }) {
  return (
    /*
     * RESPONSIVE NOTE: `min-w-0` prevents a flex/grid child with long
     * content from overflowing its container on small screens.
     * `col-span-2` is applied only when the parent grid has ≥2 cols AND
     * span2 is requested — the grid itself collapses to 1 col on mobile
     * so `col-span-2` is harmless there.
     */
    <div className={`flex flex-col gap-1 min-w-0 ${span2 ? "col-span-2" : ""}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#993556]">
        {label}{required && <span className="text-[#CD166E] ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-[#A32D2D] flex items-center gap-1">⚠ {error}</span>}
    </div>
  );
}

/* ─────────────────────────── StepModal ─────────────────────────── */
/*
 * RESPONSIVE CHANGES:
 * • Modal is `items-end` (sheet) on mobile, `items-center` (dialog) on sm+.
 * • Max-height uses `max-h-[96dvh]` (dynamic viewport height) to avoid
 *   address-bar overlap on iOS Safari.
 * • Step indicator uses `overflow-x-auto` with `scrollbar-hide` so many
 *   steps don't break the header on narrow screens.
 * • Footer buttons get `min-w-[44px]` to respect touch-target guidelines.
 */
function StepModal({ title, icon, onClose, onSubmit, steps, currentStep, setCurrentStep, children, accentColor = "#CD166E" }) {
  const totalSteps = steps.length;
  const isLast  = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{ background: "rgba(115,0,66,0.40)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* RESPONSIVE: dvh unit prevents modal clip behind iOS address bar */}
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[96dvh] sm:max-h-[92dvh] border-t sm:border border-[#F4C0D1] shadow-2xl overflow-hidden">

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0"
          style={{ background: accentColor }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-white text-lg sm:text-xl flex-shrink-0">{icon}</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">{title}</h2>
              <p className="text-[11px] sm:text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                Step {currentStep + 1} of {totalSteps} — {steps[currentStep].label}
              </p>
            </div>
          </div>
          {/* RESPONSIVE: 44px touch target for close button */}
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ml-2"
            style={{ background: "rgba(255,255,255,0.18)" }}
            aria-label="Close modal"
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Step indicator — scrollable on very narrow screens */}
        <div className="px-3 sm:px-6 pt-3 pb-2 bg-white border-b border-[#F4C0D1] flex-shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setCurrentStep(i)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all min-h-[36px]"
                  style={
                    i === currentStep
                      ? { background: accentColor, color: "#fff" }
                      : i < currentStep
                      ? { background: "#FBEAF0", color: "#730042" }
                      : { background: "#F9F8F2", color: "#993556" }
                  }
                >
                  <span>{s.icon}</span>
                  {/* RESPONSIVE: hide label text below sm; icon-only pill is sufficient */}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < totalSteps - 1 && (
                  <div
                    className="w-2 sm:w-3 h-0.5 rounded-full flex-shrink-0"
                    style={{ background: i < currentStep ? accentColor : "#F4C0D1" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="overflow-y-auto p-3 sm:p-6 flex-1 bg-[#F9F8F2]">
          {/*
           * RESPONSIVE: grid is 1-col on mobile, 2-col on sm+.
           * `min-w-0` on the grid ensures it doesn't overflow its container.
           */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-[#F4C0D1] flex justify-between gap-2 bg-[#F9F8F2] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 sm:px-5 py-2 sm:py-2.5 min-h-[44px] rounded-xl border border-[#F4C0D1] text-[#730042] text-xs sm:text-sm font-semibold hover:bg-[#FBEAF0] transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl border border-[#F4C0D1] text-[#730042] text-xs sm:text-sm font-semibold hover:bg-[#FBEAF0] transition-colors"
              >
                <FaChevronLeft size={10} />
                <span className="hidden xs:inline">Prev</span>
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-white text-xs sm:text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: accentColor }}
              >
                <span className="hidden xs:inline">Next</span>
                <FaChevronRight size={10} />
              </button>
            ) : (
              <button
                onClick={onSubmit}
                className="px-4 sm:px-6 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-white text-xs sm:text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: accentColor }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Simple Modal (Edit) ─────────────────────────── */
/*
 * RESPONSIVE CHANGES: Same dvh fix, overflow-hidden wrapper, 44px touch targets.
 */
function Modal({ title, icon, onClose, onSubmit, children, accentColor = "#CD166E" }) {
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{ background: "rgba(115,0,66,0.40)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[96dvh] sm:max-h-[92dvh] border-t sm:border border-[#F4C0D1] shadow-2xl overflow-hidden">
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0"
          style={{ background: accentColor }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-white text-lg sm:text-xl flex-shrink-0">{icon}</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">{title}</h2>
              <p className="text-[11px] sm:text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Fill in all required fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)" }}
            aria-label="Close modal"
          >
            <FaTimes size={13} />
          </button>
        </div>
        <div className="overflow-y-auto p-3 sm:p-6 flex-1 bg-[#F9F8F2]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
            {children}
          </div>
        </div>
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-[#F4C0D1] flex justify-end gap-2 sm:gap-3 bg-[#F9F8F2] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 sm:px-5 py-2 sm:py-2.5 min-h-[44px] rounded-xl border border-[#F4C0D1] text-[#730042] text-xs sm:text-sm font-semibold hover:bg-[#FBEAF0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 sm:px-6 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90"
            style={{ background: accentColor }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Avatar ─────────────────────────── */
function Avatar({ name }) {
  const safe = name || "??";
  const initials = safe.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#CD166E", "#730042", "#993556", "#72243E", "#A0186A"];
  const color = colors[safe.charCodeAt(0) % colors.length];
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

/* ─────────────────────────── Badge ─────────────────────────── */
function Badge({ label, type = "dept" }) {
  const styles = {
    dept:    "bg-[#FBEAF0] text-[#730042]",
    role:    "bg-[#FEF3E8] text-[#7A3500]",
    manager: "bg-[#EEEDFE] text-[#3C3489]",
    smgr:    "bg-[#E1F5EE] text-[#085041]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${styles[type] ?? styles.dept}`}>
      {label}
    </span>
  );
}

/* ─────────────────────────── MobileCard ─────────────────────────── */
/*
 * RESPONSIVE NOTE: Action buttons are 44px touch targets (w-11 h-11 on
 * mobile, kept at w-7 h-7 on desktop so table rows stay compact).
 */
function MobileCard({ u, onView, onEdit, onDelete }) {
  const roleBadgeType = u.role === "manager" ? "manager" : u.role === "senior_manager" ? "smgr" : "role";
  const roleLabel = u.role === "senior_manager" ? "Sr. Manager" : u.role === "employee" ? "Employee" : u.role?.replace("_", " ") || "—";
  return (
    <div
      className="bg-white border border-[#F4C0D1] rounded-xl p-4 flex gap-3 cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => onView(u._id, u.role)}
    >
      <Avatar name={`${u.f_name ?? ""} ${u.l_name ?? ""}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[#730042] text-sm truncate">{u.f_name} {u.l_name}</p>
            <p className="text-xs text-[#993556] truncate">{u.work_email}</p>
          </div>
          <Badge label={roleLabel} type={roleBadgeType} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {u.department && <Badge label={u.department} type="dept" />}
          {u.office_location && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#F9F8F2] text-[#993556] border border-[#F4C0D1]">
              📍 {u.office_location}
            </span>
          )}
          {u.designation && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#F9F8F2] text-[#993556] border border-[#F4C0D1] truncate max-w-[120px]">
              {u.designation}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          {u.Under_manager ? (
            <p className="text-[11px] text-[#993556]">
              Under: <span className="font-medium text-[#730042]">{u.Under_manager.f_name} {u.Under_manager.l_name}</span>
            </p>
          ) : <span />}
          {/* RESPONSIVE: 44×44 touch targets for action icons on mobile */}
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onView(u._id, u.role)}
              className="w-11 h-11 rounded-lg flex items-center justify-center text-[#993556] border border-[#F4C0D1] bg-[#F9F8F2]"
              aria-label="View"
            >
              <FaEye size={14} />
            </button>
            <button
              onClick={() => onEdit(u)}
              className="w-11 h-11 rounded-lg flex items-center justify-center text-[#993556] border border-[#F4C0D1] bg-[#F9F8F2]"
              aria-label="Edit"
            >
              <FaEdit size={14} />
            </button>
            <button
              onClick={() => onDelete(u)}
              className="w-11 h-11 rounded-lg flex items-center justify-center text-[#993556] border border-[#F4C0D1] bg-[#F9F8F2]"
              aria-label="Delete"
            >
              <FaTrash size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Skeleton rows ─────────────────────────── */
function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-[#FBEAF0]">
      {Array.from({ length: 7 }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 bg-[#FBEAF0] rounded animate-pulse" style={{ width: j === 0 ? "80%" : "60%" }} />
        </td>
      ))}
    </tr>
  ));
}

function MobileSkeletons() {
  return Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="bg-white border border-[#F4C0D1] rounded-xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-[#FBEAF0] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#FBEAF0] rounded w-3/4" />
          <div className="h-3 bg-[#FBEAF0] rounded w-1/2" />
          <div className="h-3 bg-[#FBEAF0] rounded w-1/3" />
        </div>
      </div>
    </div>
  ));
}

/* ─────────────────────────── Empty state ─────────────────────────── */
function EmptyState({ onAdd }) {
  return (
    <tr>
      <td colSpan={7}>
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3 text-center px-4">
          <div className="text-4xl sm:text-5xl">👥</div>
          <p className="text-[#730042] font-medium text-sm sm:text-base">No employees found</p>
          <p className="text-[#993556] text-xs sm:text-sm">Add your first employee to get started</p>
          <button
            onClick={onAdd}
            className="mt-2 px-4 py-2 min-h-[44px] rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
            style={{ background: "#730042" }}
          >
            + Add Employee
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────── Toast Popup ─────────────────────────── */
function Popup({ type = "success", message, onClose }) {
  const styles = {
    success: { background: "#CD166E" },
    error:   { background: "#A32D2D" },
    info:    { background: "#185FA5" },
  };
  return (
    /*
     * RESPONSIVE: constrained to viewport width with right/left margins
     * so it never overflows on 320px screens.
     */
    <div
      className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[100]"
      style={{
        maxWidth: "calc(100vw - 2rem)",
        animation: "slideInPopup 0.3s ease forwards",
      }}
    >
      <style>{`@keyframes slideInPopup { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }`}</style>
      <div
        className="min-w-[240px] sm:min-w-[280px] max-w-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-white flex items-start justify-between gap-3"
        style={styles[type]}
      >
        <span className="text-xs sm:text-sm font-medium break-words">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white flex-shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center">✕</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Filter Chip ─────────────────────────── */
function FilterChip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBEAF0] text-[#730042] text-xs font-medium border border-[#F4C0D1]">
      <span className="truncate max-w-[120px]">{label}</span>
      <button onClick={onRemove} className="hover:text-[#CD166E] transition-colors flex-shrink-0 min-w-[16px] min-h-[16px]">
        <FaTimes size={9} />
      </button>
    </span>
  );
}

/* ─────────────────────────── Delete Confirm ─────────────────────────── */
function DeleteConfirm({ user, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{ background: "rgba(115,0,66,0.40)", backdropFilter: "blur(3px)" }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 sm:p-6 flex flex-col gap-4 border-t sm:border border-[#F4C0D1] shadow-2xl">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl mb-2">🗑️</div>
          <h3 className="text-base sm:text-lg font-bold text-[#730042]">Delete User?</h3>
          <p className="text-xs sm:text-sm text-[#993556] mt-1">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-[#730042]">{user.f_name} {user.l_name}</span>? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-4 sm:px-5 py-2 min-h-[44px] rounded-xl border border-[#F4C0D1] text-xs sm:text-sm font-semibold text-[#730042] hover:bg-[#FBEAF0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 sm:px-5 py-2 min-h-[44px] rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-colors"
            style={{ background: "#A32D2D" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Employee Step Fields ─────────────────────────── */
/*
 * RESPONSIVE NOTE: Each step renders Field components inside the parent
 * grid (1-col mobile / 2-col sm+). `span2` fields use col-span-2 which
 * only takes effect when the parent is ≥2 columns.
 * All selects and inputs inherit `min-w-0` via inputCls.
 */
function EmpStepFields({ step, form, onChange, errors, managers }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const passwordError = form.password && !passwordRegex.test(form.password)
    ? "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character."
    : "";
  const confirmPasswordError = form.confirm_password && form.password !== form.confirm_password
    ? "Passwords do not match."
    : "";

  if (step === 0) return (
    <>
      <Field label="First Name" required error={errors.f_name}>
        <input name="f_name" placeholder="First name" value={form.f_name} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Last Name" required error={errors.l_name}>
        <input name="l_name" placeholder="Last name" value={form.l_name} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Work Email" required error={errors.work_email}>
        <input name="work_email" type="email" placeholder="name@company.com" value={form.work_email} onChange={onChange} className={inputCls} />
      </Field>

      <Field label="Password" required error={passwordError || errors.password}>
        <div className="relative min-w-0">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Set password"
            value={form.password}
            onChange={onChange}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#993556] bg-transparent border-none cursor-pointer p-0 z-[2] flex items-center justify-center min-w-[24px] min-h-[24px]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
      </Field>

      <Field label="Confirm Password" required error={confirmPasswordError || errors.confirm_password}>
        <div className="relative min-w-0">
          <input
            name="confirm_password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={form.confirm_password}
            onChange={onChange}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#993556] bg-transparent border-none cursor-pointer p-0 z-[2] flex items-center justify-center min-w-[24px] min-h-[24px]"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
      </Field>

      <Field label="Gender" required error={errors.gender}>
        <select name="gender" value={form.gender} onChange={onChange} className={inputCls}>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Marital Status">
        <select name="marital_status" value={form.marital_status} onChange={onChange} className={inputCls}>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
        </select>
      </Field>
      <Field label="Personal Contact" required error={errors.personal_contact}>
        <input name="personal_contact" placeholder="+91 XXXXX XXXXX" value={form.personal_contact} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Emergency Contact" required error={errors.e_contact}>
        <input name="e_contact" placeholder="Emergency contact" value={form.e_contact} onChange={onChange} className={inputCls} />
      </Field>
    </>
  );

  if (step === 1) return (
    <>
      <Field label="Department" required error={errors.department}>
        <select name="department" value={form.department} onChange={onChange} className={inputCls}>
          <option value="">Select Department</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Designation" required error={errors.designation}>
        <input name="designation" placeholder="e.g. Software Engineer" value={form.designation} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Role">
        <select name="role" value={form.role} onChange={onChange} className={inputCls}>
          <option value="employee">Employee</option>
          <option value="official">Official</option>
        </select>
      </Field>
      <Field label="Office Location" required error={errors.office_location}>
        <select name="office_location" value={form.office_location} onChange={onChange} className={inputCls}>
          <option value="">Select Location</option>
          {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Under Manager" span2>
        <select name="Under_manager" value={form.Under_manager} onChange={onChange} className={inputCls}>
          <option value="">Select Manager (optional)</option>
          {managers?.managers?.map((mgr) => (
            <option key={mgr._id} value={mgr._id}>{mgr.f_name} {mgr.l_name} ({mgr.uid})</option>
          ))}
        </select>
      </Field>
    </>
  );

  if (step === 2) return (
    <>
      <Field label="Address" span2>
        <input name="address" placeholder="Street address" value={form.address} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Country">
        <select name="country" value={form.country} onChange={onChange} className={inputCls}>
          <option value="">Select Country</option>
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </Field>
      <Field label="City">
        <input name="city" placeholder="City" value={form.city} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="State">
        <select name="state" value={form.state} onChange={onChange} className={inputCls}>
          <option value="">Select State</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Pincode">
        <input name="pincode" placeholder="6-digit pincode" maxLength={6} value={form.pincode} onChange={onChange} className={inputCls} />
      </Field>
    </>
  );

  if (step === 3) return (
    <>
      <Field label="Aadhaar Number">
        <input name="aadhaar_number" placeholder="XXXX XXXX XXXX" maxLength={12} value={form.aadhaar_number} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="PAN Number">
        <input name="pan_number" placeholder="ABCDE1234F" maxLength={10} value={form.pan_number} onChange={onChange} className={inputCls} />
      </Field>
    </>
  );

  if (step === 4) return (
    <>
      <Field label="Is Fresher?" span2>
        <select
          name="is_fresher"
          value={form.is_fresher ? "true" : "false"}
          onChange={(e) => onChange({ target: { name: "is_fresher", value: e.target.value === "true" } })}
          className={inputCls}
        >
          <option value="true">Yes — Fresher</option>
          <option value="false">No — Experienced</option>
        </select>
      </Field>
      {!form.is_fresher && (
        <>
          <Field label="Total Experience (years)">
            <input name="total_experience" type="number" min="0" placeholder="e.g. 3" value={form.total_experience} onChange={onChange} className={inputCls} />
          </Field>
          <Field label="Previous Company">
            <input name="previous_company" placeholder="Company name" value={form.previous_company} onChange={onChange} className={inputCls} />
          </Field>
          <Field label="Previous Designation">
            <input name="previous_designation" placeholder="Previous role" value={form.previous_designation} onChange={onChange} className={inputCls} />
          </Field>
        </>
      )}
    </>
  );

  if (step === 5) return (
    <>
      <Field label="Bank Name">
        <input name="bank_name" placeholder="e.g. State Bank of India" value={form.bank_name} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Account Holder Name">
        <input name="account_holder_name" placeholder="Name as per bank" value={form.account_holder_name} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Account Number">
        <input name="account_number" placeholder="Account number" value={form.account_number} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="IFSC Code">
        <input name="ifsc_code" placeholder="e.g. SBIN0001234" value={form.ifsc_code} onChange={onChange} className={inputCls} />
      </Field>
      <div className="col-span-1 sm:col-span-2 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#993556] mb-3">Document URLs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          <Field label="Resume URL"><input name="resume" placeholder="https://..." value={form.resume} onChange={onChange} className={inputCls} /></Field>
          <Field label="Aadhaar Card URL"><input name="aadhaar_card" placeholder="https://..." value={form.aadhaar_card} onChange={onChange} className={inputCls} /></Field>
          <Field label="PAN Card URL"><input name="pan_card" placeholder="https://..." value={form.pan_card} onChange={onChange} className={inputCls} /></Field>
          <Field label="Experience Letter URL"><input name="experience_letter" placeholder="https://..." value={form.experience_letter} onChange={onChange} className={inputCls} /></Field>
        </div>
      </div>
    </>
  );

  return null;
}

/* ─────────────────────────── Manager Step Fields ─────────────────────────── */
function MgrStepFields({ step, form, onChange, errors, managers }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const passwordError = form.password && !passwordRegex.test(form.password)
    ? "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character."
    : "";
  const confirmPasswordError = form.confirm_password && form.password !== form.confirm_password
    ? "Passwords do not match."
    : "";

  if (step === 0) return (
    <>
      <Field label="First Name" required error={errors.f_name}>
        <input name="f_name" placeholder="First name" value={form.f_name} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Last Name" required error={errors.l_name}>
        <input name="l_name" placeholder="Last name" value={form.l_name} onChange={onChange} className={inputCls} />
      </Field>

      <Field label="Password" required error={passwordError || errors.password}>
        {/* RESPONSIVE: relative wrapper must not overflow; pr-10 reserves eye-button space */}
        <div className="relative min-w-0">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Set password"
            value={form.password}
            onChange={onChange}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#993556] bg-transparent border-none cursor-pointer p-0 z-[2] flex items-center justify-center min-w-[24px] min-h-[24px]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
      </Field>

      <Field label="Confirm Password" required error={confirmPasswordError || errors.confirm_password}>
        <div className="relative min-w-0">
          <input
            name="confirm_password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={form.confirm_password}
            onChange={onChange}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#993556] bg-transparent border-none cursor-pointer p-0 z-[2] flex items-center justify-center min-w-[24px] min-h-[24px]"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
      </Field>

      <Field label="Gender" required error={errors.gender}>
        <select name="gender" value={form.gender} onChange={onChange} className={inputCls}>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Marital Status">
        <select name="marital_status" value={form.marital_status} onChange={onChange} className={inputCls}>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
        </select>
      </Field>
      <Field label="Personal Contact" required error={errors.personal_contact}>
        <input name="personal_contact" placeholder="+91 XXXXX XXXXX" value={form.personal_contact} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Emergency Contact" required error={errors.e_contact}>
        <input name="e_contact" placeholder="Emergency contact" value={form.e_contact} onChange={onChange} className={inputCls} />
      </Field>
    </>
  );

  if (step === 1) return (
    <>
      <Field label="Department" required error={errors.department}>
        <select name="department" value={form.department} onChange={onChange} className={inputCls}>
          <option value="">Select Department</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Designation" required error={errors.designation}>
        <input name="designation" placeholder="e.g. Head of Engineering" value={form.designation} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Role">
        <select name="role" value={form.role} onChange={onChange} className={inputCls}>
          <option value="manager">Manager</option>
          <option value="senior_manager">Senior Manager</option>
          <option value="official">Official</option>
        </select>
      </Field>
      <Field label="Office Location" required error={errors.office_location}>
        <select name="office_location" value={form.office_location} onChange={onChange} className={inputCls}>
          <option value="">Select Location</option>
          {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Reporting Manager" span2>
        <select name="reporting_manager" value={form.reporting_manager} onChange={onChange} className={inputCls}>
          <option value="">Select Reporting Manager (optional)</option>
          {managers?.managers?.map((mgr) => (
            <option key={mgr._id} value={mgr._id}>{mgr.f_name} {mgr.l_name} ({mgr.uid})</option>
          ))}
        </select>
      </Field>
    </>
  );

  if (step === 2) return (
    <>
      <Field label="Address" span2>
        <input name="address" placeholder="Street address" value={form.address} onChange={onChange} className={inputCls} />
      </Field>
      {/*
       * RESPONSIVE: Country select had inline style overrides for width.
       * Replaced with `w-full min-w-0` via inputCls + removed conflicting
       * inline styles so it behaves correctly inside the CSS grid.
       */}
      <Field label="Country">
        <select name="country" value={form.country} onChange={onChange} className={inputCls}>
          <option value="">Select Country</option>
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </Field>
      <Field label="City">
        <input name="city" placeholder="City" value={form.city} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="State">
        <select name="state" value={form.state} onChange={onChange} className={inputCls}>
          <option value="">Select State</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Pincode">
        <input name="pincode" placeholder="6-digit pincode" maxLength={6} value={form.pincode} onChange={onChange} className={inputCls} />
      </Field>
    </>
  );

  if (step === 3) return (
    <>
      <Field label="Aadhaar Number">
        <input name="aadhaar_number" placeholder="XXXX XXXX XXXX" maxLength={12} value={form.aadhaar_number} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="PAN Number">
        <input name="pan_number" placeholder="ABCDE1234F" maxLength={10} value={form.pan_number} onChange={onChange} className={inputCls} />
      </Field>
    </>
  );

  if (step === 4) return (
    <>
      <Field label="Is Fresher?" span2>
        <select
          name="is_fresher"
          value={form.is_fresher ? "true" : "false"}
          onChange={(e) => onChange({ target: { name: "is_fresher", value: e.target.value === "true" } })}
          className={inputCls}
        >
          <option value="true">Yes — Fresher</option>
          <option value="false">No — Experienced</option>
        </select>
      </Field>
      {!form.is_fresher && (
        <>
          <Field label="Total Experience (years)">
            <input name="total_experience" type="number" min="0" placeholder="e.g. 3" value={form.total_experience} onChange={onChange} className={inputCls} />
          </Field>
          <Field label="Previous Company">
            <input name="previous_company" placeholder="Company name" value={form.previous_company} onChange={onChange} className={inputCls} />
          </Field>
          <Field label="Previous Designation">
            <input name="previous_designation" placeholder="Previous role" value={form.previous_designation} onChange={onChange} className={inputCls} />
          </Field>
        </>
      )}
    </>
  );

  if (step === 5) return (
    <>
      <Field label="Bank Name">
        <input name="bank_name" placeholder="e.g. State Bank of India" value={form.bank_name} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Account Holder Name">
        <input name="account_holder_name" placeholder="Name as per bank" value={form.account_holder_name} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="Account Number">
        <input name="account_number" placeholder="Account number" value={form.account_number} onChange={onChange} className={inputCls} />
      </Field>
      <Field label="IFSC Code">
        <input name="ifsc_code" placeholder="e.g. SBIN0001234" value={form.ifsc_code} onChange={onChange} className={inputCls} />
      </Field>
      <div className="col-span-1 sm:col-span-2 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#993556] mb-3">Document URLs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          <Field label="Resume URL"><input name="resume" placeholder="https://..." value={form.resume} onChange={onChange} className={inputCls} /></Field>
          <Field label="Aadhaar Card URL"><input name="aadhaar_card" placeholder="https://..." value={form.aadhaar_card} onChange={onChange} className={inputCls} /></Field>
          <Field label="PAN Card URL"><input name="pan_card" placeholder="https://..." value={form.pan_card} onChange={onChange} className={inputCls} /></Field>
          <Field label="Experience Letter URL"><input name="experience_letter" placeholder="https://..." value={form.experience_letter} onChange={onChange} className={inputCls} /></Field>
        </div>
      </div>
    </>
  );

  return null;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — EmployeeTable
   ═══════════════════════════════════════════════════════════ */
export default function EmployeeTable() {
  const [open,        setOpen]        = useState(false);
  const [openManager, setOpenManager] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [popup,       setPopup]       = useState({ show: false, type: "success", message: "" });

  const [selectedEmployeeId,   setSelectedEmployeeId]   = useState(null);
  const [selectedEmployeeRole, setSelectedEmployeeRole] = useState(null);

  const [empStep, setEmpStep] = useState(0);
  const [mgrStep, setMgrStep] = useState(0);

  const [empForm,   setEmpForm]   = useState(EMPTY_EMP);
  const [mgrForm,   setMgrForm]   = useState(EMPTY_MGR);
  const [empErrors, setEmpErrors] = useState({});
  const [mgrErrors, setMgrErrors] = useState({});

  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [openEdit,   setOpenEdit]   = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({ search: "", department: "", role: "", location: "", gender: "" });

  const { mutate: addEmployeeApi } = useAddEmployee();
  const { mutate: addManagerApi  } = useAddManager();
  const { data: managers         } = useFindAllManagers();
  const { data: employeeData, isLoading: listLoading, refetch: refetchList } = useGetAllEmployee();
  const allUsers = employeeData?.users ?? [];

  const { mutate: editUserApi   } = useEditEmployee(editTarget?._id);
  const { mutate: deleteUserApi } = useDeleteUser();

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "", message: "" }), 3000);
  };

  const handleOpenEdit = (user) => {
    setEditTarget(user);
    setEditForm({
      f_name: user.f_name ?? "", l_name: user.l_name ?? "", work_email: user.work_email ?? "",
      gender: user.gender ?? "", marital_status: user.marital_status ?? "single",
      personal_contact: user.personal_contact ?? "", e_contact: user.e_contact ?? "",
      role: user.role ?? "employee", office_location: user.office_location ?? "",
      designation: user.designation ?? "", department: user.department ?? "",
      Under_manager: user.Under_manager?._id ?? "",
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
        setOpenEdit(false); setEditTarget(null); refetchList();
      },
      onError: (err) => showPopup("error", err?.response?.data?.message || err?.message || "Update failed"),
    });
  };

  const handleConfirmDelete = () => {
    deleteUserApi(deleteTarget._id, {
      onSuccess: () => { showPopup("success", "User deleted successfully"); setDeleteTarget(null); refetchList(); },
      onError: (err) => { showPopup("error", err?.response?.data?.message || err?.message || "Delete failed"); setDeleteTarget(null); },
    });
  };

  const handleEmpChange = (e) => setEmpForm({ ...empForm, [e.target.name]: e.target.value });

  const validateEmp = () => {
    const err = {};
    if (!empForm.f_name)           err.f_name           = "Required";
    if (!empForm.l_name)           err.l_name           = "Required";
    if (!empForm.work_email)       err.work_email       = "Required";
    if (!empForm.password)         err.password         = "Required";
    if (!empForm.gender)           err.gender           = "Required";
    if (!empForm.personal_contact) err.personal_contact = "Required";
    if (!empForm.e_contact)        err.e_contact        = "Required";
    if (!empForm.department)       err.department       = "Required";
    if (!empForm.designation)      err.designation      = "Required";
    if (!empForm.office_location)  err.office_location  = "Required";
    setEmpErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleEmpSubmit = () => {
    if (!validateEmp()) { showPopup("error", "Please fill all required fields before submitting"); setEmpStep(0); return; }
    addEmployeeApi({
      f_name: empForm.f_name, l_name: empForm.l_name, work_email: empForm.work_email,
      password: empForm.password, gender: empForm.gender, marital_status: empForm.marital_status,
      personal_contact: empForm.personal_contact, e_contact: empForm.e_contact,
      role: empForm.role, office_location: empForm.office_location,
      designation: empForm.designation, department: empForm.department,
      Under_manager: empForm.Under_manager || undefined,
      address: empForm.address || undefined, city: empForm.city || undefined,
      state: empForm.state || undefined, pincode: empForm.pincode || undefined,
      aadhaar_number: empForm.aadhaar_number || undefined, pan_number: empForm.pan_number || undefined,
      is_fresher: empForm.is_fresher,
      total_experience: empForm.is_fresher ? undefined : empForm.total_experience || undefined,
      previous_company: empForm.is_fresher ? undefined : empForm.previous_company || undefined,
      previous_designation: empForm.is_fresher ? undefined : empForm.previous_designation || undefined,
      bank_name: empForm.bank_name || undefined, account_holder_name: empForm.account_holder_name || undefined,
      account_number: empForm.account_number || undefined, ifsc_code: empForm.ifsc_code || undefined,
      resume: empForm.resume || undefined, aadhaar_card: empForm.aadhaar_card || undefined,
      pan_card: empForm.pan_card || undefined, experience_letter: empForm.experience_letter || undefined,
    }, {
      onSuccess: (res) => {
        showPopup("success", res?.message || "Employee added successfully");
        setOpen(false); setEmpForm(EMPTY_EMP); setEmpErrors({}); setEmpStep(0); refetchList();
      },
      onError: (err) => showPopup("error", err?.response?.data?.message || err?.message || "Something went wrong"),
    });
  };

  const handleMgrChange = (e) => setMgrForm({ ...mgrForm, [e.target.name]: e.target.value });

  const validateMgr = () => {
    const err = {};
    if (!mgrForm.f_name)           err.f_name           = "Required";
    if (!mgrForm.l_name)           err.l_name           = "Required";
    if (!mgrForm.work_email)       err.work_email       = "Required";
    if (!mgrForm.password)         err.password         = "Required";
    if (!mgrForm.gender)           err.gender           = "Required";
    if (!mgrForm.personal_contact) err.personal_contact = "Required";
    if (!mgrForm.e_contact)        err.e_contact        = "Required";
    if (!mgrForm.department)       err.department       = "Required";
    if (!mgrForm.designation)      err.designation      = "Required";
    if (!mgrForm.office_location)  err.office_location  = "Required";
    setMgrErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleMgrSubmit = () => {
    if (!validateMgr()) { showPopup("error", "Please fill all required fields before submitting"); setMgrStep(0); return; }
    addManagerApi({
      f_name: mgrForm.f_name, l_name: mgrForm.l_name, work_email: mgrForm.work_email,
      password: mgrForm.password, gender: mgrForm.gender, marital_status: mgrForm.marital_status,
      personal_contact: mgrForm.personal_contact, e_contact: mgrForm.e_contact,
      role: mgrForm.role, office_location: mgrForm.office_location,
      designation: mgrForm.designation, department: mgrForm.department,
      reporting_manager: mgrForm.reporting_manager || undefined,
      address: mgrForm.address || undefined, city: mgrForm.city || undefined,
      state: mgrForm.state || undefined, pincode: mgrForm.pincode || undefined,
      aadhaar_number: mgrForm.aadhaar_number || undefined, pan_number: mgrForm.pan_number || undefined,
      is_fresher: mgrForm.is_fresher,
      total_experience: mgrForm.is_fresher ? undefined : mgrForm.total_experience || undefined,
      previous_company: mgrForm.is_fresher ? undefined : mgrForm.previous_company || undefined,
      previous_designation: mgrForm.is_fresher ? undefined : mgrForm.previous_designation || undefined,
      bank_name: mgrForm.bank_name || undefined, account_holder_name: mgrForm.account_holder_name || undefined,
      account_number: mgrForm.account_number || undefined, ifsc_code: mgrForm.ifsc_code || undefined,
      resume: mgrForm.resume || undefined, aadhaar_card: mgrForm.aadhaar_card || undefined,
      pan_card: mgrForm.pan_card || undefined, experience_letter: mgrForm.experience_letter || undefined,
    }, {
      onSuccess: (res) => {
        showPopup("success", res?.message || "Manager added & verification email sent");
        setOpenManager(false); setMgrForm(EMPTY_MGR); setMgrErrors({}); setMgrStep(0); refetchList();
      },
      onError: (err) => showPopup("error", err?.response?.data?.message || err?.message || "Something went wrong"),
    });
  };

  const filtered = allUsers.filter((u) => {
    const name = `${u.f_name ?? ""} ${u.l_name ?? ""}`.toLowerCase();
    const q = filters.search.toLowerCase();
    return (
      (name.includes(q) || (u.work_email ?? "").toLowerCase().includes(q)) &&
      (filters.department ? u.department      === filters.department : true) &&
      (filters.role       ? u.role            === filters.role       : true) &&
      (filters.location   ? u.office_location === filters.location   : true) &&
      (filters.gender     ? u.gender          === filters.gender     : true)
    );
  });

  const clearFilters = () => setFilters({ search: "", department: "", role: "", location: "", gender: "" });
  const activeFilterCount = [filters.department, filters.role, filters.location, filters.gender].filter(Boolean).length;

  function roleBadge(role) {
    if (role === "employee")       return <Badge label="Employee"    type="role" />;
    if (role === "manager")        return <Badge label="Manager"     type="manager" />;
    if (role === "senior_manager") return <Badge label="Sr. Manager" type="smgr" />;
    return <Badge label={role?.replace("_", " ") || "—"} type="manager" />;
  }

  /* ── render ── */
  return (
    /*
     * RESPONSIVE: `overflow-x-hidden` on root prevents any accidental
     * horizontal scroll. `w-full` ensures it fills the page but never
     * overflows. `box-border` (via Tailwind `box-border` reset) means
     * padding won't push the element outside the viewport.
     */
    <div
      className="min-h-screen w-full overflow-x-hidden p-3 sm:p-4 md:p-6 font-['DM_Sans',system-ui,sans-serif] box-border"
      style={{ background: "#F9F8F2" }}
    >
      <style>{`
        /* Hide scrollbar utility */
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        /* xs breakpoint — Tailwind doesn't include this by default */
        @media (min-width: 480px) {
          .xs\\:inline { display: inline; }
          .xs\\:block  { display: block;  }
        }

        /* Prevent any child from pushing horizontal scroll */
        * { box-sizing: border-box; }
      `}</style>

      {/*
       * RESPONSIVE: max-w-7xl + mx-auto centres content on large screens.
       * On mobile the full width is used (no horizontal margin waste).
       */}
      <div className="max-w-7xl mx-auto w-full">

        {/* ── Page header ── */}
        {/*
         * RESPONSIVE: stacks vertically on mobile, row on sm+.
         * Button group wraps so both buttons stay on the same row
         * even on 320px (they're compact enough).
         */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <div>
            {/* Fluid headline: 20px on mobile → 24px on desktop */}
            <h1
              className="font-bold text-[#730042] tracking-tight"
              style={{ fontSize: "clamp(1.15rem, 2vw + 0.5rem, 1.5rem)" }}
            >
              Employee Directory
            </h1>
            <p className="text-xs sm:text-sm text-[#993556] mt-0.5">
              {allUsers.length} total · {filtered.length} shown
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setOpenManager(true); setMgrStep(0); }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl border-2 text-xs sm:text-sm font-semibold hover:text-white transition-all"
              style={{ borderColor: "#730042", color: "#730042" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#730042"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#730042"; }}
            >
              <FaUserTie size={12} />
              <span>Add Manager</span>
            </button>
            <button
              onClick={() => { setOpen(true); setEmpStep(0); }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-all"
              style={{ background: "#730042" }}
            >
              <FaUserPlus size={12} />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="bg-white rounded-2xl border border-[#F4C0D1] overflow-hidden w-full">

          {/* ── Toolbar: search + filters ── */}
          <div className="p-3 sm:p-4 border-b border-[#F4C0D1]" style={{ background: "#F9F8F2" }}>
            <div className="flex flex-col gap-2 sm:gap-3">

              {/* Search + filter toggle */}
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#993556]" size={12} />
                  <input
                    placeholder="Search name or email…"
                    className={`${inputCls} pl-8 sm:pl-9`}
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg border text-xs sm:text-sm font-medium transition-colors flex-shrink-0"
                  style={
                    showFilters
                      ? { background: "#CD166E", color: "#fff", borderColor: "#CD166E" }
                      : { background: "transparent", color: "#730042", borderColor: "#F4C0D1" }
                  }
                  aria-label="Toggle filters"
                >
                  <FaFilter size={11} />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ background: "#730042" }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Quick-filter row (desktop only via hidden sm:flex) */}
              <div className="hidden sm:flex gap-2">
                <select
                  className={`${inputCls} flex-1`}
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  className={`${inputCls} flex-1`}
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                >
                  <option value="">All Roles</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="senior_manager">Senior Manager</option>
                  <option value="official">Official</option>
                </select>
              </div>
            </div>

            {/* Expanded filter panel */}
            {showFilters && (
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[#F4C0D1]">
                {/*
                 * RESPONSIVE: 2-col grid on mobile (small labels), 4-col on sm+.
                 * Prevents the panel from causing horizontal scroll.
                 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <select className={inputCls} value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
                    <option value="">All Depts</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className={inputCls} value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                    <option value="">All Roles</option>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="senior_manager">Sr. Manager</option>
                    <option value="official">Official</option>
                  </select>
                  <select className={inputCls} value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
                    <option value="">All Locations</option>
                    {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select className={inputCls} value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                    {filters.department && <FilterChip label={`Dept: ${filters.department}`} onRemove={() => setFilters({ ...filters, department: "" })} />}
                    {filters.role       && <FilterChip label={`Role: ${filters.role}`}       onRemove={() => setFilters({ ...filters, role: "" })} />}
                    {filters.location   && <FilterChip label={`Loc: ${filters.location}`}    onRemove={() => setFilters({ ...filters, location: "" })} />}
                    {filters.gender     && <FilterChip label={`Gender: ${filters.gender}`}   onRemove={() => setFilters({ ...filters, gender: "" })} />}
                    <button onClick={clearFilters} className="text-xs text-[#A32D2D] font-semibold hover:underline ml-1 min-h-[32px]">
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile card list (hidden on sm+) ── */}
          <div className="sm:hidden p-3 space-y-2.5" style={{ background: "#F9F8F2" }}>
            {listLoading ? (
              <MobileSkeletons />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-2">
                <div className="text-4xl">👥</div>
                <p className="text-[#730042] font-medium text-sm">No employees found</p>
                <p className="text-[#993556] text-xs">Add your first employee to get started</p>
                <button
                  onClick={() => setOpen(true)}
                  className="mt-1 px-4 py-2 min-h-[44px] rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
                  style={{ background: "#730042" }}
                >
                  + Add Employee
                </button>
              </div>
            ) : (
              filtered.map((u) => (
                <MobileCard
                  key={u._id}
                  u={u}
                  onView={(id, role) => { setSelectedEmployeeId(id); setSelectedEmployeeRole(role); }}
                  onEdit={handleOpenEdit}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </div>

          {/* ── Desktop table (hidden below sm) ── */}
          {/*
           * RESPONSIVE: `overflow-x-auto` allows the table to scroll
           * horizontally if the viewport is between sm and the table's
           * min-width, rather than breaking the page layout.
           */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "700px" }}>
              <thead>
                <tr className="border-b border-[#F4C0D1]" style={{ background: "#F9F8F2" }}>
                  {["Employee", "Department", "Designation", "Location", "Manager", "Role", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-3 lg:px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#993556] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FBEAF0]">
                {listLoading ? (
                  <SkeletonRows />
                ) : filtered.length === 0 ? (
                  <EmptyState onAdd={() => setOpen(true)} />
                ) : (
                  filtered.map((u) => (
                    <tr
                      key={u._id}
                      className="transition-colors group cursor-pointer"
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FEF4F9"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      onClick={() => { setSelectedEmployeeId(u._id); setSelectedEmployeeRole(u.role); }}
                    >
                      {/* Employee name + email */}
                      <td className="px-3 lg:px-4 py-3">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <Avatar name={`${u.f_name ?? ""} ${u.l_name ?? ""}`} />
                          <div className="min-w-0">
                            {/*
                             * RESPONSIVE: max-w clamps prevent long names
                             * from pushing the table columns too wide on
                             * medium viewports.
                             */}
                            <p className="font-semibold text-[#730042] text-xs lg:text-sm truncate max-w-[100px] lg:max-w-[160px]">
                              {u.f_name} {u.l_name}
                            </p>
                            <p className="text-[11px] text-[#993556] truncate max-w-[100px] lg:max-w-[160px]">
                              {u.work_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 py-3">
                        <Badge label={u.department || "—"} type="dept" />
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-[#730042] text-xs lg:text-sm">
                        {/* RESPONSIVE: truncate long designations on medium screens */}
                        <span className="block truncate max-w-[100px] lg:max-w-none">
                          {u.designation || "—"}
                        </span>
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-[#730042] text-xs lg:text-sm whitespace-nowrap">
                        {u.office_location || "—"}
                      </td>
                      <td className="px-3 lg:px-4 py-3">
                        {u.Under_manager ? (
                          <div className="text-xs">
                            <p className="font-medium text-[#730042] truncate max-w-[80px] lg:max-w-none">
                              {u.Under_manager.f_name} {u.Under_manager.l_name}
                            </p>
                            <p className="text-[#993556] hidden lg:block">{u.Under_manager.uid}</p>
                          </div>
                        ) : <span className="text-[#F4C0D1] text-xs">—</span>}
                      </td>
                      <td className="px-3 lg:px-4 py-3">{roleBadge(u.role)}</td>
                      <td className="px-3 lg:px-4 py-3">
                        {/* RESPONSIVE: 44px touch-friendly buttons, shown on hover on desktop */}
                        <div
                          className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#993556] border border-[#F4C0D1] hover:text-[#CD166E] hover:bg-[#FBEAF0] transition-colors"
                            style={{ background: "#F9F8F2" }}
                            aria-label="Edit user"
                          >
                            <FaEdit size={11} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#993556] border border-[#F4C0D1] hover:text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                            style={{ background: "#F9F8F2" }}
                            aria-label="Delete user"
                          >
                            <FaTrash size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count row */}
          {!listLoading && filtered.length > 0 && (
            <div
              className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-[#F4C0D1] text-[11px] sm:text-xs text-[#993556] flex items-center justify-between flex-wrap gap-1"
              style={{ background: "#F9F8F2" }}
            >
              <span>Showing {filtered.length} of {allUsers.length} employees</span>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-[#A32D2D] font-medium hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ Add Employee Modal ══ */}
      {open && (
        <StepModal
          title="Add Employee"
          icon={<FaUserPlus />}
          onClose={() => { setOpen(false); setEmpErrors({}); setEmpStep(0); }}
          onSubmit={handleEmpSubmit}
          steps={EMP_STEPS}
          currentStep={empStep}
          setCurrentStep={setEmpStep}
          accentColor="#730042"
        >
          <EmpStepFields step={empStep} form={empForm} onChange={handleEmpChange} errors={empErrors} managers={managers} />
        </StepModal>
      )}

      {/* ══ Add Manager Modal ══ */}
      {openManager && (
        <StepModal
          title="Add Manager"
          icon={<FaUserTie />}
          onClose={() => { setOpenManager(false); setMgrErrors({}); setMgrStep(0); }}
          onSubmit={handleMgrSubmit}
          steps={EMP_STEPS}
          currentStep={mgrStep}
          setCurrentStep={setMgrStep}
          accentColor="#730042"
        >
          <MgrStepFields step={mgrStep} form={mgrForm} onChange={handleMgrChange} errors={mgrErrors} managers={managers} />
        </StepModal>
      )}

      {/* ══ Edit Modal ══ */}
      {openEdit && editTarget && (
        <Modal
          title={`Edit ${editTarget.role === "employee" ? "Employee" : "Manager"}`}
          icon={editTarget.role === "employee" ? <FaUserPlus /> : <FaUserTie />}
          onClose={() => { setOpenEdit(false); setEditTarget(null); setEditErrors({}); }}
          onSubmit={handleEditSubmit}
          accentColor={editTarget.role === "employee" ? "#CD166E" : "#730042"}
        >
          <Field label="First Name" required error={editErrors.f_name}>
            <input name="f_name" value={editForm.f_name} onChange={handleEditChange} className={inputCls} />
          </Field>
          <Field label="Last Name" required error={editErrors.l_name}>
            <input name="l_name" value={editForm.l_name} onChange={handleEditChange} className={inputCls} />
          </Field>
          <Field label="Work Email" required error={editErrors.work_email}>
            <input name="work_email" type="email" value={editForm.work_email} onChange={handleEditChange} className={inputCls} />
          </Field>
          <Field label="Department" required error={editErrors.department}>
            <select name="department" value={editForm.department} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation" required error={editErrors.designation}>
            <input name="designation" value={editForm.designation} onChange={handleEditChange} className={inputCls} />
          </Field>
          <Field label="Role">
            <select name="role" value={editForm.role} onChange={handleEditChange} className={inputCls}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="senior_manager">Senior Manager</option>
              <option value="official">Official</option>
            </select>
          </Field>
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
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select name="marital_status" value={editForm.marital_status} onChange={handleEditChange} className={inputCls}>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
            </select>
          </Field>
          <Field label="Phone">
            <input name="personal_contact" value={editForm.personal_contact} onChange={handleEditChange} className={inputCls} />
          </Field>
          <Field label="Emergency Contact">
            <input name="e_contact" value={editForm.e_contact} onChange={handleEditChange} className={inputCls} />
          </Field>
          <Field label="Office Location">
            <select name="office_location" value={editForm.office_location} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Location</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </Modal>
      )}

      {/* ══ Delete confirmation ══ */}
      {deleteTarget && (
        <DeleteConfirm user={deleteTarget} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      {/* ══ Employee detail modal ══ */}
      {selectedEmployeeId && (
        <EmployeeDetailModal
          employeeId={selectedEmployeeId}
          employeeRole={selectedEmployeeRole}
          onClose={() => { setSelectedEmployeeId(null); setSelectedEmployeeRole(null); }}
        />
      )}

      {/* ══ Toast popup ══ */}
      {popup.show && (
        <Popup type={popup.type} message={popup.message} onClose={() => setPopup({ show: false, type: "", message: "" })} />
      )}
    </div>
  );
}