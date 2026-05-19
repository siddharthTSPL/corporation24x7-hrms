"use client";
import { useState } from "react";
import {
  FaTimes, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBriefcase,
  FaCalendarAlt, FaClipboard, FaChevronRight, FaIdCard,
  FaUniversity, FaFileAlt, FaExternalLinkAlt, FaStar,
} from "react-icons/fa";
import {
  useGetParticularEmployeeStats,
  useGetParticularManagerStats,
} from "../../auth/server-state/adminother/adminother.hook";

function getInitials(fName = "", lName = "") {
  return `${fName?.[0] ?? ""}${lName?.[0] ?? ""}`.toUpperCase() || "??";
}

function maskAadhaar(val) {
  if (!val) return "—";
  const s = String(val);
  return s.length >= 4 ? `•••• •••• ${s.slice(-4)}` : "••••";
}

function maskPAN(val) {
  if (!val) return "—";
  const s = String(val);
  return s.length >= 4 ? `••••••${s.slice(-4)}` : "••••";
}

function maskAccount(val) {
  if (!val) return "—";
  const s = String(val);
  return s.length > 4 ? `${"•".repeat(s.length - 4)}${s.slice(-4)}` : s;
}

function capitalize(str) {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRole(role) {
  if (!role) return "—";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Avatar({ fName, lName, size = "lg" }) {
  const initials = getInitials(fName, lName);
  const palettes = [
    "from-blue-500 to-violet-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-emerald-500 to-teal-500",
    "from-cyan-500 to-blue-500",
  ];
  const gradient = palettes[((fName || "?").charCodeAt(0)) % palettes.length];
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-[72px] h-[72px] text-2xl",
  };
  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-medium text-white flex-shrink-0 border-2 border-white/10`}>
      {initials}
    </div>
  );
}

function HeroPill({ children, variant = "blue" }) {
  const variants = {
    blue:   "bg-blue-500/20 text-blue-300",
    violet: "bg-violet-500/20 text-violet-300",
    green:  "bg-emerald-500/20 text-emerald-300",
    amber:  "bg-amber-500/20 text-amber-300",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${variants[variant]}`}>
      {children}
    </span>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
      <p className="text-[11px] text-[var(--muted)] mb-1 flex items-center gap-1.5">
        {icon && <span className="opacity-60">{icon}</span>}
        {label}
      </p>
      <p className="text-[13px] font-medium text-[var(--text)] break-all">{value || "—"}</p>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-[var(--muted)] mb-2.5">
      {children}
    </p>
  );
}

function Divider() {
  return <hr className="border-t border-[var(--border)]" />;
}

function ProfileTab({ user }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Personal</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <InfoCard label="Gender"            value={capitalize(user?.gender)} />
          <InfoCard label="Marital status"    value={capitalize(user?.marital_status)} />
          <InfoCard label="Personal contact"  value={user?.personal_contact} icon={<FaPhone size={10} />} />
          <InfoCard label="Emergency contact" value={user?.e_contact}        icon={<FaPhone size={10} />} />
        </div>
      </div>
      <Divider />
      <div>
        <SectionLabel>Address</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <InfoCard label="Street"  value={capitalize(user?.address)} />
          <InfoCard label="City"    value={capitalize(user?.city)} />
          <InfoCard label="State"   value={user?.state} />
          <InfoCard label="Pincode" value={user?.pincode} />
        </div>
      </div>
      <Divider />
      <div>
        <SectionLabel>Identity</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <InfoCard label="Aadhaar number" value={maskAadhaar(user?.aadhaar_number)} icon={<FaIdCard size={10} />} />
          <InfoCard label="PAN number"     value={maskPAN(user?.pan_number)}          icon={<FaIdCard size={10} />} />
        </div>
      </div>
    </div>
  );
}

function WorkTab({ user, isManager }) {
  const manager = isManager ? user?.reporting_manager : user?.Under_manager;
  const managerLabel = isManager ? "Reporting manager" : "Under manager";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Role & department</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <InfoCard label="Designation"     value={capitalize(user?.designation)} icon={<FaBriefcase size={10} />} />
          <InfoCard label="Department"      value={user?.department} />
          <InfoCard label="Role"            value={formatRole(user?.role)} />
          <InfoCard label="Office location" value={user?.office_location} icon={<FaMapMarkerAlt size={10} />} />
        </div>
      </div>
      {manager && (
        <>
          <Divider />
          <div>
            <SectionLabel>{managerLabel}</SectionLabel>
            <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5">
              <Avatar fName={manager.f_name} lName={manager.l_name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[var(--text)] truncate">
                  {manager.f_name} {manager.l_name}
                  <span className="text-[11px] text-[var(--muted)] font-normal ml-2">· {manager.uid}</span>
                </p>
                <p className="text-[12px] text-[var(--muted)] flex items-center gap-1 mt-0.5 truncate">
                  <FaEnvelope size={9} /> {manager.work_email}
                </p>
              </div>
              <FaChevronRight size={11} className="text-[var(--muted)] flex-shrink-0" />
            </div>
          </div>
        </>
      )}
      <Divider />
      <div>
        <SectionLabel>Experience</SectionLabel>
        <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
          <p className="text-[13px] text-[var(--muted)]">Employment type</p>
          <span className="text-[11px] font-medium bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full">
            {user?.is_fresher
              ? "Fresher"
              : `Experienced · ${user?.total_experience || 0} yr${user?.total_experience !== 1 ? "s" : ""}`}
          </span>
        </div>
        {!user?.is_fresher && (
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <InfoCard label="Previous company"     value={user?.previous_company} />
            <InfoCard label="Previous designation" value={user?.previous_designation} />
          </div>
        )}
      </div>
    </div>
  );
}

function LeaveBar({ label, entitled, availed, accrued, color }) {
  const remaining = (entitled || 0) - (availed || 0);
  const pct = entitled ? Math.round(((entitled - availed) / entitled) * 100) : 100;
  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="flex items-start justify-between p-3.5 bg-[var(--surface)]">
        <div>
          <p className="text-[13px] font-medium text-[var(--text)]">{label}</p>
          {accrued !== undefined && (
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Accrued this month: {accrued}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[20px] font-medium" style={{ color }}>{remaining}</p>
          <p className="text-[10px] text-[var(--muted)]">remaining</p>
        </div>
      </div>
      <div className="px-3.5 pb-3.5 pt-2.5">
        <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-[var(--muted)]">Entitled <span className="text-[var(--text)] font-medium">{entitled || 0}</span></span>
          <span className="text-[11px] text-[var(--muted)]">Availed <span className="text-[var(--text)] font-medium">{availed || 0}</span></span>
        </div>
      </div>
    </div>
  );
}

function LeaveTab({ leaveBalance }) {
  if (!leaveBalance) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
        <FaCalendarAlt size={32} className="mb-3 opacity-30" />
        <p className="text-[13px]">No leave data available</p>
      </div>
    );
  }

  const totalEntitled =
    (leaveBalance.EL?.entitled || 0) +
    (leaveBalance.SL?.entitled || 0) +
    (leaveBalance.ML || 0) +
    (leaveBalance.PL || 0) +
    (leaveBalance.pbc || 0);
  const totalAvailed = (leaveBalance.EL?.availed || 0) + (leaveBalance.SL?.availed || 0);
  const totalBalance = totalEntitled - totalAvailed;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
        <div>
          <p className="text-[20px] font-medium text-[var(--text)]">{totalEntitled}</p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">Total entitled</p>
        </div>
        <div>
          <p className="text-[20px] font-medium text-red-400">{totalAvailed}</p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">Total availed</p>
        </div>
        <div>
          <p className="text-[20px] font-medium text-emerald-400">{totalBalance}</p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">Balance remaining</p>
        </div>
      </div>

      {leaveBalance.EL && typeof leaveBalance.EL === "object" && (
        <LeaveBar
          label="Earned leave (EL)"
          entitled={leaveBalance.EL.entitled}
          availed={leaveBalance.EL.availed}
          accrued={leaveBalance.EL.accrued}
          color="#3b82f6"
        />
      )}
      {leaveBalance.SL && typeof leaveBalance.SL === "object" && (
        <LeaveBar
          label="Sick leave (SL)"
          entitled={leaveBalance.SL.entitled}
          availed={leaveBalance.SL.availed}
          accrued={leaveBalance.SL.accrued}
          color="#8b5cf6"
        />
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {leaveBalance.ML !== undefined && (
          <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
            <div>
              <p className="text-[11px] text-[var(--muted)]">Maternity (ML)</p>
              <p className="text-[18px] font-medium text-[var(--text)]">{leaveBalance.ML || 0}</p>
            </div>
            <FaCalendarAlt size={18} className="text-[var(--border)]" />
          </div>
        )}
        {leaveBalance.PL !== undefined && (
          <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
            <div>
              <p className="text-[11px] text-[var(--muted)]">Personal (PL)</p>
              <p className="text-[18px] font-medium text-[var(--text)]">{leaveBalance.PL || 0}</p>
            </div>
            <FaCalendarAlt size={18} className="text-[var(--border)]" />
          </div>
        )}
        {leaveBalance.pbc !== undefined && (
          <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
            <div>
              <p className="text-[11px] text-[var(--muted)]">Privilege bonus (PBC)</p>
              <p className="text-[18px] font-medium text-[var(--text)]">{leaveBalance.pbc || 0}</p>
            </div>
            <FaCalendarAlt size={18} className="text-[var(--border)]" />
          </div>
        )}
        {leaveBalance.lwp !== undefined && (
          <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
            <div>
              <p className="text-[11px] text-[var(--muted)]">Loss of pay (LWP)</p>
              <p className="text-[18px] font-medium text-red-400">{leaveBalance.lwp || 0}</p>
            </div>
            <FaCalendarAlt size={18} className="text-[var(--border)]" />
          </div>
        )}
      </div>
    </div>
  );
}

function DocsTab({ user }) {
  const docItems = [
    { label: "Resume",            value: user?.resume,            icon: <FaFileAlt size={14} />,   color: "text-blue-400" },
    { label: "Aadhaar card",      value: user?.aadhaar_card,      icon: <FaIdCard size={14} />,    color: "text-emerald-400" },
    { label: "PAN card",          value: user?.pan_card,          icon: <FaIdCard size={14} />,    color: "text-amber-400" },
    { label: "Experience letter", value: user?.experience_letter, icon: <FaBriefcase size={14} />, color: "text-violet-400" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Bank details</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <InfoCard label="Bank name"      value={capitalize(user?.bank_name)} icon={<FaUniversity size={10} />} />
          <InfoCard label="Account holder" value={user?.account_holder_name} />
          <InfoCard label="Account number" value={maskAccount(user?.account_number)} />
          <InfoCard label="IFSC code"      value={user?.ifsc_code} />
        </div>
      </div>
      <Divider />
      <div>
        <SectionLabel>Uploaded documents</SectionLabel>
        <div className="flex flex-col gap-2">
          {docItems.map(({ label, value, icon, color }) => (
            <div key={label} className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
              <span className={color}>{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--muted)]">{label}</p>
                <p className="text-[12px] font-medium text-blue-400 truncate">{value || "Not uploaded"}</p>
              </div>
              {value && <FaExternalLinkAlt size={10} className="text-[var(--muted)] flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewsTab({ reviews = [] }) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FaClipboard size={32} className="text-[var(--border)] mb-3" />
        <p className="text-[14px] font-medium text-[var(--text)]">No reviews yet</p>
        <p className="text-[12px] text-[var(--muted)] mt-1">Reviews submitted by managers will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review, idx) => (
        <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Avatar fName={review.reviewer?.f_name} lName={review.reviewer?.l_name} size="sm" />
              <div>
                <p className="text-[13px] font-medium text-[var(--text)]">
                  {review.reviewer?.f_name} {review.reviewer?.l_name}
                </p>
                <p className="text-[11px] text-[var(--muted)]">{formatRole(review.reviewer?.role)}</p>
              </div>
            </div>
            {review.rating && (
              <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">
                <FaStar size={10} />
                <span className="text-[12px] font-medium">{review.rating}/5</span>
              </div>
            )}
          </div>
          {review.feedback && (
            <p className="text-[13px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3">
              {review.feedback}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: "profile", label: "Profile",   icon: "👤" },
  { id: "work",    label: "Work",      icon: "💼" },
  { id: "leave",   label: "Leave",     icon: "📅" },
  { id: "docs",    label: "Documents", icon: "📄" },
  { id: "reviews", label: "Reviews",   icon: "⭐" },
];

export default function EmployeeDetailModal({ employeeId, employeeRole, onClose }) {
  const [activeTab, setActiveTab] = useState("profile");

  const isManager =
    employeeRole === "manager" ||
    employeeRole === "senior_manager" ||
    employeeRole === "official";

  const empQuery = useGetParticularEmployeeStats(!isManager ? employeeId : null);
  const mgrQuery = useGetParticularManagerStats(isManager ? employeeId : null);
  const { data, isLoading, error } = isManager ? mgrQuery : empQuery;

  if (!employeeId) return null;

  const user         = isManager ? data?.manager : data?.user;
  const leaveBalance = data?.leaveBalance;
  const reviews      = data?.reviews || [];

  const roleColorMap = {
    employee:       "violet",
    manager:        "blue",
    senior_manager: "green",
    official:       "amber",
  };
  const roleColor = roleColorMap[user?.role] ?? "blue";

  return (
    <>
      <style>{`
        .emp-modal-wrap {
          --surface: #f8fafc;
          --border:  rgba(0,0,0,0.08);
          --text:    #0f172a;
          --muted:   #64748b;
        }
        @media (prefers-color-scheme: dark) {
          .emp-modal-wrap {
            --surface: rgba(255,255,255,0.04);
            --border:  rgba(255,255,255,0.08);
            --text:    #f1f5f9;
            --muted:   #94a3b8;
          }
        }
      `}</style>

      <div
        className="emp-modal-wrap fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl bg-white dark:bg-[#0f172a] border border-black/10 dark:border-white/10">

          <div className="bg-[#88004d] px-7 pt-7 pb-0 flex-shrink-0">
            <div className="flex items-start gap-4">
              <Avatar fName={user?.f_name} lName={user?.l_name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[22px] font-medium text-slate-100 truncate">
                    {user?.f_name ?? "—"} {user?.l_name ?? ""}
                  </h2>
                  {user?.uid && (
                    <span className="text-[11px] font-medium text-white px-2 py-0.5 rounded border border-white bg-white/5">
                      {user.uid}
                    </span>
                  )}
                  {isManager && (
                    <span className="text-[11px] font-medium bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-white mt-0.5 flex items-center gap-1.5">
                  <FaEnvelope size={10} /> {user?.work_email ?? ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {user?.department && <HeroPill variant="blue">{user.department}</HeroPill>}
                  {user?.role && <HeroPill variant={roleColor}>{formatRole(user.role)}</HeroPill>}
                  {user?.office_location && (
                    <HeroPill variant="green">
                      <FaMapMarkerAlt size={9} className="inline mr-1 -mt-px" />
                      {user.office_location}
                    </HeroPill>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="flex gap-0 mt-5 border-b border-white/[0.08]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "text-white border-white"
                      : "text-slate-400 border-transparent hover:text-slate-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-7 bg-white dark:bg-[#0f172a]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-white rounded-full animate-spin" />
                <p className="text-[13px] text-[var(--muted)]">Loading details…</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-5 text-center">
                <p className="text-[14px] font-medium text-red-600 dark:text-red-400">Failed to load details</p>
                <p className="text-[12px] text-red-500/70 mt-1">{error?.message}</p>
              </div>
            ) : (
              <>
                {activeTab === "profile" && <ProfileTab user={user} />}
                {activeTab === "work"    && <WorkTab    user={user} isManager={isManager} />}
                {activeTab === "leave"   && <LeaveTab   leaveBalance={leaveBalance} />}
                {activeTab === "docs"    && <DocsTab    user={user} />}
                {activeTab === "reviews" && <ReviewsTab reviews={reviews} />}
              </>
            )}
          </div>

          <div className="px-7 py-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-white dark:bg-[#0f172a] flex-shrink-0">
            <p className="text-[11px] text-[var(--muted)]">
              {user?.uid && `ID: ${user.uid}`}
              {user?.department && ` · ${user.department}`}
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-black/10 dark:border-white/10 text-[13px] font-medium text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </>
  );
}