import { useState } from "react";
import {
  FaFileContract,
  FaSignOutAlt,
  FaChevronRight,
  FaChevronLeft,
  FaCheckCircle,
  FaShieldAlt,
} from "react-icons/fa";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useAdminLogout } from "../../auth/server-state/adminauth/adminauth.hook";
import { useLogoutManager } from "../../auth/server-state/manager/managerauth/managerauth.hook";
import { useLogoutUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useLogoutSuperAdmin } from "../../auth/server-state/superadmin/auth/suauth.hook";
import { useMyPendingPolicies } from "../../auth/server-state/policy/policy.hook";
import PolicyDocumentViewer from "./PolicyDocumentViewer";
import TorchXTalentLogo from "../../assets/Talent.png";

// ─────────────────────────────────────────────────────────────────────────
// TorchX Policy — Access Gate screen.
//
// Mounted by MainLayout INSTEAD OF Sidebar/Navbar/Outlet whenever the
// gate-status check says mandatory policies are pending. Nothing else in
// the app renders while this is up — no sidebar, no dashboard data, no
// other route content — matching "login karte hi sirf yeh dikhe, aur jab
// tak acknowledge na ho kuch aur khule hi na" from the spec.
// ─────────────────────────────────────────────────────────────────────────
export default function PolicyGateScreen() {
  const { data: auth } = useAuth();
  const role = auth?.role;

  const { mutate: logoutSuperAdmin } = useLogoutSuperAdmin();
  const { mutate: logoutAdmin } = useAdminLogout();
  const { mutate: logoutManager } = useLogoutManager();
  const { mutate: logoutEmployee } = useLogoutUser();

  const { data, isLoading } = useMyPendingPolicies();
  const policies = data?.policies || [];
  const total = policies.length;
  const acknowledgedCount = policies.filter((p) => p.acknowledgement?.status === "ACKNOWLEDGED").length;
  const progressPct = total > 0 ? Math.round((acknowledgedCount / total) * 100) : 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const active = policies[activeIndex];

  const handleLogout = () => {
    const onSuccess = () => {
      localStorage.removeItem("role");
      window.location.href = "/login";
    };
    if (role === "superadmin") logoutSuperAdmin(undefined, { onSuccess });
    else if (role === "admin") logoutAdmin(undefined, { onSuccess });
    else if (role === "manager") logoutManager(undefined, { onSuccess });
    else logoutEmployee(undefined, { onSuccess });
  };

  const handleAcknowledged = () => {
    // Move to the next pending policy, if any. Once the list empties,
    // useGateStatus (polled by MainLayout) flips `blocked` to false on its
    // next refetch and this screen unmounts automatically.
    setActiveIndex((i) => Math.min(i + 1, Math.max(policies.length - 2, 0)));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#fdf2f8] via-[#f8fafc] to-[#eef2ff]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <img src={TorchXTalentLogo} alt="TorchX Talent" className="h-8 w-auto object-contain" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#730042] transition-colors"
        >
          <FaSignOutAlt /> Logout
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-10 overflow-y-auto">
        <div className="w-full max-w-3xl">
          {/* Intro badge, above the card — sets a calm, official tone */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-[#730042]/10 flex items-center justify-center text-[#730042] mb-3">
              <FaShieldAlt size={22} />
            </div>
            <h1 className="text-2xl font-semibold text-[#1F2937]">Action Required</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              {total > 1
                ? `Please review and acknowledge ${total} policies before continuing to your dashboard.`
                : "Please review and acknowledge this policy before continuing to your dashboard."}
            </p>
          </div>

          {/* Progress bar, only meaningful with more than one policy */}
          {total > 1 && (
            <div className="mb-4 px-1">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>
                  {acknowledgedCount} of {total} acknowledged
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#730042] to-[#a3005f] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Main card */}
          <div className="w-full bg-white rounded-2xl shadow-lg shadow-[#730042]/5 border border-gray-100 max-h-[74vh] overflow-y-auto">
            {total > 1 && (
              <div className="flex items-center gap-2 px-6 pt-5 pb-1 flex-wrap sticky top-0 bg-white z-10">
                {policies.map((p, i) => {
                  const done = p.acknowledgement?.status === "ACKNOWLEDGED";
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={p.policy._id}
                      onClick={() => setActiveIndex(i)}
                      className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium transition-colors ${
                        isActive
                          ? "bg-[#730042] text-white"
                          : done
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {done && <FaCheckCircle size={11} />}
                      {p.policy.title}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-6">
              {isLoading && (
                <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-[#730042] animate-spin" />
                  <p className="text-sm">Loading policy...</p>
                </div>
              )}
              {!isLoading && active && (
                <PolicyDocumentViewer entry={active} onAcknowledged={handleAcknowledged} compact />
              )}
              {!isLoading && !active && policies.length === 0 && (
                <div className="py-10 flex flex-col items-center gap-2 text-green-600">
                  <FaCheckCircle size={22} />
                  <p className="text-sm font-medium">All done — taking you in...</p>
                </div>
              )}
            </div>

            {total > 1 && (
              <div className="px-6 pb-5 flex items-center justify-between border-t border-gray-50 pt-4">
                <button
                  onClick={() => setActiveIndex((i) => Math.max(i - 1, 0))}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#730042] disabled:opacity-0 disabled:pointer-events-none transition-colors"
                >
                  <FaChevronLeft size={12} /> Previous
                </button>
                {activeIndex < policies.length - 1 && (
                  <button
                    onClick={() => setActiveIndex((i) => Math.min(i + 1, policies.length - 1))}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#730042] hover:text-[#5c0335] transition-colors"
                  >
                    Next policy <FaChevronRight size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            <FaFileContract className="inline mr-1 -mt-0.5" />
            Having trouble? Contact your HR admin for help.
          </p>
        </div>
      </main>
    </div>
  );
}