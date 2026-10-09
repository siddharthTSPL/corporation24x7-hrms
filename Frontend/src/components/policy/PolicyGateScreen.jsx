import { useState } from "react";
import { FaFileContract, FaSignOutAlt, FaChevronRight, FaCheckCircle } from "react-icons/fa";
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
    <div className="h-screen bg-(--background) flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <img src={TorchXTalentLogo} alt="TorchX Talent" className="h-8 w-auto object-contain" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#730042]"
        >
          <FaSignOutAlt /> Logout
        </button>
      </header>

      <main className="flex-1 flex overflow-y-auto p-4 sm:p-8">
        <div className="m-auto w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#730042] text-white px-6 py-5 flex items-start gap-3">
            <FaFileContract className="text-2xl mt-1 shrink-0" />
            <div>
              <h1 className="text-lg font-semibold">Action Required — Policy Acknowledgement</h1>
              <p className="text-sm text-white/80 mt-1">
                {policies.length > 1
                  ? `You have ${policies.length} policies to review before continuing.`
                  : "Please review and acknowledge this policy before continuing."}
              </p>
            </div>
          </div>

          {policies.length > 1 && (
            <div className="flex gap-2 px-6 pt-4 flex-wrap">
              {policies.map((p, i) => (
                <span
                  key={p.policy._id}
                  className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${
                    i === activeIndex
                      ? "bg-[#730042] text-white"
                      : p.acknowledgement?.status === "ACKNOWLEDGED"
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.acknowledgement?.status === "ACKNOWLEDGED" && <FaCheckCircle />}
                  {p.policy.title}
                </span>
              ))}
            </div>
          )}

          <div className="p-6">
            {isLoading && <p className="text-sm text-gray-500">Loading policy...</p>}
            {!isLoading && active && (
              <PolicyDocumentViewer entry={active} onAcknowledged={handleAcknowledged} compact />
            )}
            {!isLoading && !active && policies.length === 0 && (
              <p className="text-sm text-gray-500">Refreshing...</p>
            )}
          </div>

          {policies.length > 1 && activeIndex < policies.length - 1 && (
            <div className="px-6 pb-6 flex justify-end">
              <button
                onClick={() => setActiveIndex((i) => Math.min(i + 1, policies.length - 1))}
                className="flex items-center gap-1 text-sm text-[#730042] hover:underline"
              >
                Next policy <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}