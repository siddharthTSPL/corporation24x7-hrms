"use client";
import { FaTimes, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBriefcase, FaCalendarAlt, FaClipboard } from "react-icons/fa";
import { useGetParticularEmployeeStats } from "../../auth/server-state/adminother/adminother.hook";

function DetailSection({ title, icon, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F4C0D1]">
        <span className="text-[#CD166E] text-lg">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#993556]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, icon }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F9F8F2] hover:bg-[#FBEAF0] transition-colors border border-[#F4C0D1]">
      {icon && <span className="text-[#993556] text-sm mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#993556]">{label}</p>
        <p className="text-sm text-[#730042] break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

function Badge({ label, type = "dept" }) {
  const styles = {
    dept:    "bg-[#FBEAF0] text-[#730042]",
    role:    "bg-[#FEF3E8] text-[#7A3500]",
    manager: "bg-[#EEEDFE] text-[#3C3489]",
    smgr:    "bg-[#E1F5EE] text-[#085041]",
    active:  "bg-[#E1F5EE] text-[#085041]",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[type] ?? styles.dept}`}>
      {label}
    </span>
  );
}

function Avatar({ name, size = "lg" }) {
  const safe = name || "??";
  const initials = safe.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#CD166E", "#730042", "#993556", "#72243E", "#A0186A"];
  const color = colors[safe.charCodeAt(0) % colors.length];

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-20 h-20 text-2xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

export default function EmployeeDetailModal({ employeeId, onClose }) {
  const { data, isLoading, error } = useGetParticularEmployeeStats(employeeId);

  if (!employeeId) return null;

  const user        = data?.user;
  const leaveBalance = data?.leaveBalance;
  const reviews     = data?.reviews || [];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(115,0,66,0.32)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#F4C0D1]">

        {/* Header */}
        <div
          className="flex items-start justify-between p-6 border-b border-[#F4C0D1]"
          style={{ background: "#730042" }}
        >
          <div className="flex items-start gap-4">
            <Avatar name={`${user?.f_name ?? ""} ${user?.l_name ?? ""}`} size="lg" />
            <div className="text-white">
              <h2 className="text-2xl font-bold">{user?.f_name} {user?.l_name}</h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{user?.work_email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge label={user?.department || "—"} type="dept" />
                <Badge
                  label={user?.role?.replace("_", " ") || "—"}
                  type={user?.role === "employee" ? "role" : user?.role === "senior_manager" ? "smgr" : "manager"}
                />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.18)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.28)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6" style={{ background: "#F9F8F2" }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#F4C0D1] border-t-[#CD166E] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#993556]">Loading employee details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-[#FBEAF0] border border-[#F4C0D1] rounded-lg p-4 text-center">
              <p className="text-sm text-[#730042] font-medium">Failed to load employee details</p>
              <p className="text-xs text-[#993556] mt-1">{error?.message}</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Personal Information */}
              <DetailSection title="Personal Information" icon="👤">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Gender" value={user?.gender} />
                  <DetailRow label="Marital Status" value={user?.marital_status?.charAt(0).toUpperCase() + user?.marital_status?.slice(1)} />
                  <DetailRow label="Personal Contact" value={user?.personal_contact} icon={<FaPhone size={12} />} />
                  <DetailRow label="Emergency Contact" value={user?.e_contact} />
                </div>
              </DetailSection>

              {/* Professional Information */}
              <DetailSection title="Professional Information" icon={<FaBriefcase size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Designation" value={user?.designation} />
                  <DetailRow label="Department" value={user?.department} />
                  <DetailRow label="Office Location" value={user?.office_location} icon={<FaMapMarkerAlt size={12} />} />
                  <DetailRow label="Role" value={user?.role?.replace("_", " ")} />
                </div>
              </DetailSection>

              {/* Manager Information */}
              {user?.Under_manager && (
                <DetailSection title="Manager" icon={<FaBriefcase size={14} />}>
                  <div className="p-4 rounded-lg border border-[#F4C0D1]" style={{ background: "#FBEAF0" }}>
                    <div className="flex items-start gap-3">
                      <Avatar name={`${user.Under_manager.f_name} ${user.Under_manager.l_name}`} size="md" />
                      <div className="flex-1">
                        <p className="font-semibold text-[#730042]">
                          {user.Under_manager.f_name} {user.Under_manager.l_name}
                        </p>
                        <p className="text-xs text-[#993556] mt-1">ID: {user.Under_manager.uid}</p>
                        <p className="text-xs text-[#993556] mt-2 flex items-center gap-1">
                          <FaEnvelope size={10} /> {user.Under_manager.work_email}
                        </p>
                        <div className="mt-2">
                          <Badge label={user.Under_manager.role?.replace("_", " ") || "—"} type="manager" />
                        </div>
                      </div>
                    </div>
                  </div>
                </DetailSection>
              )}

              {/* Leave Balance */}
              {leaveBalance && (
                <DetailSection title="Leave Balance" icon={<FaCalendarAlt size={14} />}>
                  <div className="space-y-3">

                    {leaveBalance.EL && typeof leaveBalance.EL === "object" && (
                      <div className="p-4 rounded-lg border border-[#FAC775]" style={{ background: "#FEF9EC" }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-[#730042]">Earned Leave (EL)</h4>
                          <span className="text-2xl font-bold text-[#854F0B]">
                            {(leaveBalance.EL.entitled || 0) - (leaveBalance.EL.availed || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-[#993556] font-semibold uppercase tracking-wider">Entitled</p>
                            <p className="text-lg font-bold text-[#730042] mt-1">{leaveBalance.EL.entitled || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-[#993556] font-semibold uppercase tracking-wider">Availed</p>
                            <p className="text-lg font-bold text-[#A32D2D] mt-1">{leaveBalance.EL.availed || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-[#993556] font-semibold uppercase tracking-wider">Accrued</p>
                            <p className="text-lg font-bold text-[#3B6D11] mt-1">{leaveBalance.EL.accrued || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {leaveBalance.SL && typeof leaveBalance.SL === "object" && (
                      <div className="p-4 rounded-lg border border-[#85B7EB]" style={{ background: "#E6F1FB" }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-[#730042]">Sick Leave (SL)</h4>
                          <span className="text-2xl font-bold text-[#0C447C]">
                            {(leaveBalance.SL.entitled || 0) - (leaveBalance.SL.availed || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-[#993556] font-semibold uppercase tracking-wider">Entitled</p>
                            <p className="text-lg font-bold text-[#730042] mt-1">{leaveBalance.SL.entitled || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-[#993556] font-semibold uppercase tracking-wider">Availed</p>
                            <p className="text-lg font-bold text-[#A32D2D] mt-1">{leaveBalance.SL.availed || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-[#993556] font-semibold uppercase tracking-wider">Accrued</p>
                            <p className="text-lg font-bold text-[#3B6D11] mt-1">{leaveBalance.SL.accrued || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {leaveBalance.ML !== undefined && (
                      <div className="p-4 rounded-lg border border-[#F4C0D1]" style={{ background: "#FBEAF0" }}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[#730042]">Maternity Leave (ML)</h4>
                          <span className="text-2xl font-bold text-[#CD166E]">{leaveBalance.ML || 0}</span>
                        </div>
                      </div>
                    )}

                    {leaveBalance.PL !== undefined && (
                      <div className="p-4 rounded-lg border border-[#F4C0D1]" style={{ background: "#FBEAF0" }}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[#730042]">Personal Leave (PL)</h4>
                          <span className="text-2xl font-bold text-[#CD166E]">{leaveBalance.PL || 0}</span>
                        </div>
                      </div>
                    )}

                    {leaveBalance.pbc !== undefined && (
                      <div className="p-4 rounded-lg border border-[#9FE1CB]" style={{ background: "#E1F5EE" }}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[#730042]">Privilege Bonus Casual (PBC)</h4>
                          <span className="text-2xl font-bold text-[#085041]">{leaveBalance.pbc || 0}</span>
                        </div>
                      </div>
                    )}

                    {leaveBalance.lwp !== undefined && (
                      <div className="p-4 rounded-lg border border-[#FAC775]" style={{ background: "#FAEEDA" }}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[#730042]">Loss of Pay (LWP)</h4>
                          <span className="text-2xl font-bold text-[#633806]">{leaveBalance.lwp || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Card */}
                  <div className="mt-4 p-4 rounded-lg" style={{ background: "#730042" }}>
                    <h4 className="font-semibold mb-3 text-white">Balance Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Total Entitled</p>
                        <p className="text-xl font-bold text-white">
                          {(leaveBalance.EL?.entitled || 0) + (leaveBalance.SL?.entitled || 0) + (leaveBalance.ML || 0) + (leaveBalance.PL || 0) + (leaveBalance.pbc || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Total Availed</p>
                        <p className="text-xl font-bold text-[#F09595]">
                          {(leaveBalance.EL?.availed || 0) + (leaveBalance.SL?.availed || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Total Balance</p>
                        <p className="text-xl font-bold text-[#9FE1CB]">
                          {((leaveBalance.EL?.entitled || 0) + (leaveBalance.SL?.entitled || 0) + (leaveBalance.ML || 0) + (leaveBalance.PL || 0) + (leaveBalance.pbc || 0)) - ((leaveBalance.EL?.availed || 0) + (leaveBalance.SL?.availed || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </DetailSection>
              )}

              {/* Reviews */}
              {reviews && reviews.length > 0 && (
                <DetailSection title="Performance Reviews" icon={<FaClipboard size={14} />}>
                  <div className="space-y-3">
                    {reviews.map((review, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-[#F4C0D1] hover:border-[#CD166E] transition-colors" style={{ background: "#F9F8F2" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-[#730042]">
                              {review.reviewer?.f_name} {review.reviewer?.l_name}
                            </p>
                            <p className="text-xs text-[#993556] mt-0.5">{review.reviewer?.role?.replace("_", " ")}</p>
                          </div>
                          {review.rating && (
                            <div className="text-sm font-bold px-3 py-1 rounded-full bg-[#FEF9EC] text-[#854F0B]">
                              ⭐ {review.rating}/5
                            </div>
                          )}
                        </div>
                        {review.feedback && (
                          <p className="text-sm text-[#730042] mt-2 leading-relaxed">{review.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </DetailSection>
              )}

              {(!reviews || reviews.length === 0) && (
                <DetailSection title="Performance Reviews" icon={<FaClipboard size={14} />}>
                  <div className="text-center py-6 text-[#993556]">
                    <p className="text-sm">No reviews yet</p>
                  </div>
                </DetailSection>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F4C0D1] flex justify-end bg-[#F9F8F2]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-[#F4C0D1] text-[#730042] text-sm font-semibold hover:bg-[#FBEAF0] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}