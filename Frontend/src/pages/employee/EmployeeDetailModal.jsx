"use client";
import { FaTimes, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBriefcase, FaCalendarAlt, FaClipboard } from "react-icons/fa";
import { useGetParticularEmployeeStats,useGetParticularManager } from "../../auth/server-state/adminother/adminother.hook";

function DetailSection({ title, icon, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <span className="text-[var(--primary)] text-lg">{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, icon }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      {icon && <span className="text-gray-400 text-sm mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 break-words">{value || "—"}</p>
      </div>
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
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[type] ?? styles.dept}`}>{label}</span>
  );
}

function Avatar({ name, size = "lg" }) {
  const safe = name || "??";
  const initials = safe.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#00A8E8", "#FDCB6E", "#90DBF4", "#6C63FF", "#FF6584"];
  const color = colors[safe.charCodeAt(0) % colors.length];
  
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-20 h-20 text-2xl",
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`} style={{ background: color }}>
      {initials}
    </div>
  );
}

export default function EmployeeDetailModal({ employeeId, onClose }) {
  const { data, isLoading, error } = useGetParticularEmployeeStats(employeeId);

  if (!employeeId) return null;

  const user = data?.user;
  const manager = data?.manager;
  const leaveBalance = data?.leaveBalance;
  const reviews = data?.reviews || [];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">
          <div className="flex items-start gap-4">
            <Avatar name={`${user?.f_name ?? ""} ${user?.l_name ?? ""}`} size="lg" />
            <div className="text-white">
              <h2 className="text-2xl font-bold">{user?.f_name} {user?.l_name}</h2>
              <p className="text-sm text-white/80 mt-1">{user?.work_email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge label={user?.department || "—"} type="dept" />
                <Badge label={user?.role?.replace("_", " ") || "—"} type={user?.role === "employee" ? "role" : "manager"} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Loading employee details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600 font-medium">Failed to load employee details</p>
              <p className="text-xs text-red-500 mt-1">{error?.message}</p>
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
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                    <div className="flex items-start gap-3">
                      <Avatar name={`${user.Under_manager.f_name} ${user.Under_manager.l_name}`} size="md" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-700">{user.Under_manager.f_name} {user.Under_manager.l_name}</p>
                        <p className="text-xs text-gray-500 mt-1">ID: {user.Under_manager.uid}</p>
                        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                          <FaEnvelope size={10} /> {user.Under_manager.work_email}
                        </p>
                        <Badge label={user.Under_manager.role?.replace("_", " ") || "—"} type="manager" />
                      </div>
                    </div>
                  </div>
                </DetailSection>
              )}

              {/* Leave Balance */}
              {leaveBalance && (
                <DetailSection title="Leave Balance" icon={<FaCalendarAlt size={14} />}>
                  <div className="space-y-4">
                    {/* Earned Leave (EL) */}
                    {leaveBalance.EL && typeof leaveBalance.EL === "object" && (
                      <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800">Earned Leave (EL)</h4>
                          <span className="text-2xl font-bold text-yellow-600">{(leaveBalance.EL.entitled || 0) - (leaveBalance.EL.availed || 0)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-gray-500 font-semibold">Entitled</p>
                            <p className="text-lg font-bold text-gray-700 mt-1">{leaveBalance.EL.entitled || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-gray-500 font-semibold">Availed</p>
                            <p className="text-lg font-bold text-red-600 mt-1">{leaveBalance.EL.availed || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-gray-500 font-semibold">Accrued</p>
                            <p className="text-lg font-bold text-green-600 mt-1">{leaveBalance.EL.accrued || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sick Leave (SL) */}
                    {leaveBalance.SL && typeof leaveBalance.SL === "object" && (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800">Sick Leave (SL)</h4>
                          <span className="text-2xl font-bold text-blue-600">{(leaveBalance.SL.entitled || 0) - (leaveBalance.SL.availed || 0)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-gray-500 font-semibold">Entitled</p>
                            <p className="text-lg font-bold text-gray-700 mt-1">{leaveBalance.SL.entitled || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-gray-500 font-semibold">Availed</p>
                            <p className="text-lg font-bold text-red-600 mt-1">{leaveBalance.SL.availed || 0}</p>
                          </div>
                          <div className="bg-white rounded p-3 text-center">
                            <p className="text-xs text-gray-500 font-semibold">Accrued</p>
                            <p className="text-lg font-bold text-green-600 mt-1">{leaveBalance.SL.accrued || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Maternity Leave (ML) */}
                    {leaveBalance.ML !== undefined && (
                      <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-800">Maternity Leave (ML)</h4>
                          <span className="text-2xl font-bold text-pink-600">{leaveBalance.ML || 0}</span>
                        </div>
                      </div>
                    )}

                    {/* Personal Leave (PL) */}
                    {leaveBalance.PL !== undefined && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-800">Personal Leave (PL)</h4>
                          <span className="text-2xl font-bold text-purple-600">{leaveBalance.PL || 0}</span>
                        </div>
                      </div>
                    )}

                    {/* Privilege Bonus Casual (PBC) */}
                    {leaveBalance.pbc !== undefined && (
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-800">Privilege Bonus Casual (PBC)</h4>
                          <span className="text-2xl font-bold text-green-600">{leaveBalance.pbc || 0}</span>
                        </div>
                      </div>
                    )}

                    {/* Loss of Pay (LWP) */}
                    {leaveBalance.lwp !== undefined && (
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-800">Loss of Pay (LWP)</h4>
                          <span className="text-2xl font-bold text-orange-600">{leaveBalance.lwp || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Card */}
                  <div className="mt-6 p-4 bg-gray-900 text-white rounded-lg">
                    <h4 className="font-bold mb-3">Balance Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-300">Total Entitled</p>
                        <p className="text-xl font-bold">
                          {((leaveBalance.EL?.entitled || 0) + (leaveBalance.SL?.entitled || 0) + (leaveBalance.ML || 0) + (leaveBalance.PL || 0) + (leaveBalance.pbc || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-300">Total Availed</p>
                        <p className="text-xl font-bold text-red-400">
                          {((leaveBalance.EL?.availed || 0) + (leaveBalance.SL?.availed || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-300">Total Balance</p>
                        <p className="text-xl font-bold text-green-400">
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
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-700">
                              {review.reviewer?.f_name} {review.reviewer?.l_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{review.reviewer?.role?.replace("_", " ")}</p>
                          </div>
                          {review.rating && (
                            <div className="text-sm font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                              ⭐ {review.rating}/5
                            </div>
                          )}
                        </div>
                        {review.feedback && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* Empty reviews message */}
              {(!reviews || reviews.length === 0) && (
                <DetailSection title="Performance Reviews" icon={<FaClipboard size={14} />}>
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">No reviews yet</p>
                  </div>
                </DetailSection>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}