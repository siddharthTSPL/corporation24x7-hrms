import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import React from "react";
import talent from "../assets/Talent.png";
import {
  FaHome,
  FaCalendarAlt,
  FaBullhorn,
  FaFileAlt,
  FaFolder,
  FaCog,
  FaSignOutAlt,
  FaUsers,
  FaBuilding,
  FaChevronDown,
  FaBars,
  FaTimes,
  FaShieldAlt,
  FaUsersCog,
  FaLock,
  FaMoneyCheckAlt,
  FaClipboardCheck,
} from "react-icons/fa";
import { useAuth } from "../auth/store/getmeauth/getmeauth";
import { useAdminLogout } from "../auth/server-state/adminauth/adminauth.hook";
import { useLogoutManager } from "../auth/server-state/manager/managerauth/managerauth.hook";
import { useLogoutUser } from "../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useLogoutSuperAdmin } from "../auth/server-state/superadmin/auth/suauth.hook";
import { usePermissionStore } from "../auth/store/permission/permissionStore";

const superAdminMenu = [
  { name: "Dashboard",      path: "/superadmin-dashboard",     icon: <FaHome /> },
  { name: "Organisations",  path: "/superadmin-organisations", icon: <FaBuilding /> },
  { name: "Announcements",  path: "/superadmin-announcements", icon: <FaBullhorn /> },
  { name: "Leaves",         path: "/superadmin-leaves",        icon: <FaCalendarAlt /> },
  { name: "Reviews",        path: "/superadmin-reviews",       icon: <FaClipboardCheck /> },
  {name: "Asset Management", path: "/superadmin-asset-management", icon: <FaFolder /> },
  { name: "Team Documents", path: "/superadmin-documents",     icon: <FaFileAlt /> },
  { name:"Timesheet",       path: "/superadmin-timesheet",     icon: <FaLock /> },
  { name: "TorchX Management", path: "/superadmin-management", icon: <FaUsersCog /> },
  { name: "Payroll",       path: "/superadmin-payroll",       icon: <FaMoneyCheckAlt /> },
  { name: "TorchX Voice",   path: "/superadmin-complaints",    icon: <FaShieldAlt /> },
  { name: "Settings",       path: "/superadmin-settings",      icon: <FaCog /> },
];

const adminMenu = [
  { name: "Dashboard",     path: "/dashboard",           icon: <FaHome /> },
  { name: "Onboarding",    path: "/employee",            icon: <FaUsers /> },
  { name: "Announcement",  path: "/announcement",        icon: <FaBullhorn />,  permissionGroup: ["announcements.can_view_announcements", "announcements.can_create_announcement", "announcements.can_edit_announcement", "announcements.can_delete_announcement"] },
  { name: "Review",        path: "/review-admin",        icon: <FaClipboardCheck /> },
  { name: "Leave",         path: "/leave-admin",         icon: <FaCalendarAlt /> },
  { name: "Organisation",  path: "/organisation",        icon: <FaBuilding /> },
  { name:"Asset Management", path: "/admin-asset-management", icon: <FaFolder /> },
  { name: "Face Attendance", path: "/face-enrollment", icon: <FaShieldAlt /> },
  { name: "Recruitment",   path: "/recruitment-admin",   icon: <FaUsersCog />, 
    permissionGroup: ["recruitment.can_view_hiring_requisitions", "recruitment.can_create_hiring_requisition", "recruitment.can_view_candidates", "recruitment.can_add_candidate"] },
  { name: "TorchX Voice",  path: "/admin-complaints",    icon: <FaShieldAlt />, permissionGroup: ["tickets.can_raise_ticket", "tickets.can_view_all_tickets", "tickets.can_resolve_ticket", "tickets.can_rate_ticket"] },
  { name: "Timesheet",     path: "/admin-timesheet",     icon: <FaLock /> },
  { name: "Payroll",       path: "/payroll",             icon: <FaMoneyCheckAlt /> },
  { name: "TorchX Management", path: "/admin-management", icon: <FaUsersCog /> },
  { name: "Document",      path: "/document-admin",      icon: <FaFileAlt />,   permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "Team Document", path: "/document-admin-team", icon: <FaFileAlt />,   permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "Settings",      path: "/settings",            icon: <FaCog /> },
];

const managerMenu = [
  { name: "Dashboard",    path: "/manager-dashboard",    icon: <FaHome /> },
  { name: "Leave",        path: "/leave-manager",        icon: <FaCalendarAlt /> },
  { name: "Announcement", path: "/announcement-manager", icon: <FaBullhorn />,  permissionGroup: ["announcements.can_view_announcements", "announcements.can_create_announcement", "announcements.can_edit_announcement", "announcements.can_delete_announcement"] },
  { name: "Organisation", path: "/organisation-manager", icon: <FaBuilding /> },
  { name: "Review",       path: "/review-manager",       icon: <FaClipboardCheck /> },
  { name: "Timesheet",    path: "/manager-timesheet",    icon: <FaLock /> },
  { name: "File",         path: "/file-manager",         icon: <FaFolder />,    permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "Recruitment",  path: "/recruitment-manager",  icon: <FaUsersCog />,  permissionGroup: ["recruitment.can_view_hiring_requisitions", "recruitment.can_create_hiring_requisition", "recruitment.can_view_candidates", "recruitment.can_add_candidate"] },
  { name: "TorchX Voice", path: "/manager-complaints",   icon: <FaShieldAlt />, permissionGroup: ["tickets.can_raise_ticket", "tickets.can_view_all_tickets", "tickets.can_resolve_ticket", "tickets.can_rate_ticket"] },
  { name: "Settings",     path: "/settings-manager",     icon: <FaCog /> },
];

const employeeMenu = [
  { name: "Dashboard",    path: "/employee-dashboard",    icon: <FaHome /> },
  { name: "Leave",        path: "/leave-employee",        icon: <FaCalendarAlt /> },
  { name: "Announcement", path: "/announcement-employee", icon: <FaBullhorn />,  permissionGroup: ["announcements.can_view_announcements", "announcements.can_create_announcement", "announcements.can_edit_announcement", "announcements.can_delete_announcement"] },
  { name: "Organisation", path: "/organisation-employee", icon: <FaBuilding /> },
  { name: "Timesheet",    path: "/employee-timesheet",    icon: <FaLock /> },
  { name: "File",         path: "/file-employee",         icon: <FaFolder />,    permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "TorchX Voice", path: "/employee-complaints",   icon: <FaShieldAlt />, permissionGroup: ["tickets.can_raise_ticket", "tickets.can_view_all_tickets", "tickets.can_resolve_ticket", "tickets.can_rate_ticket"] },
  { name: "Settings",     path: "/settings-employee",     icon: <FaCog /> },
];

const menuByRole = {
  superadmin: superAdminMenu,
  admin:      adminMenu,
  manager:    managerMenu,
  employee:   employeeMenu,
};

function Sidebar({ collapsed, setCollapsed }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { data: auth } = useAuth();
  const role = auth?.role;

  const can = usePermissionStore((state) => state.can);
  const permRole = usePermissionStore((state) => state.role);
  const clearPermissions = usePermissionStore((state) => state.clearPermissions);

  const { mutate: logoutSuperAdmin, isPending: pendingSuperAdmin } = useLogoutSuperAdmin();
  const { mutate: logoutAdmin,      isPending: pendingAdmin }      = useAdminLogout();
  const { mutate: logoutManager,    isPending: pendingManager }    = useLogoutManager();
  const { mutate: logoutEmployee,   isPending: pendingEmployee }   = useLogoutUser();

  const [open,       setOpen]       = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menu = menuByRole[role] ?? employeeMenu;

  const isPending = pendingSuperAdmin || pendingAdmin || pendingManager || pendingEmployee;

  const permissionsReady = role === "superadmin" || !!permRole;

  const isAllowed = (item) => {
    if (!item.permissionGroup || item.permissionGroup.length === 0) return true;
    if (!permissionsReady) return false;
    return item.permissionGroup.some((p) => can(p));
  };

  const handleLogout = () => {
    const onSuccess = async () => {
      localStorage.removeItem("role");
      clearPermissions();
      try {
        await fetch("http://localhost:47821/clear-token");
      } catch (_) {}
      navigate("/login");
    };

    if (role === "superadmin")    logoutSuperAdmin(undefined, { onSuccess });
    else if (role === "admin")    logoutAdmin(undefined, { onSuccess });
    else if (role === "manager")  logoutManager(undefined, { onSuccess });
    else                          logoutEmployee(undefined, { onSuccess });
  };

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-3 bg-white shadow">
        <button onClick={() => setMobileOpen(true)}>
          <FaBars size={20} />
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed md:static z-50 top-0 left-0 h-full bg-white shadow-md transition-all duration-300 flex flex-col
        ${collapsed ? "w-16" : "w-56"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-4 flex items-center justify-between border-b">
          <img src={talent} alt="Talent" className="w-40" />
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <FaTimes />
          </button>
        </div>

       {!collapsed && role && (
  <div className="mx-3 mt-2 mb-1 flex items-center gap-2 rounded-md bg-[#730042]/10 px-3 py-1.5">
    <FaShieldAlt className="text-[#730042] text-xs" />

    <span className="text-xs font-semibold text-[#730042]">
      {role === "superadmin"
        ? "Super Admin"
        : role === "admin"
        ? "Admin"
        : role === "manager"
        ? "Manager"
        : role === "employee"
        ? "Employee"
        : role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  </div>
)}

        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          {!collapsed && (
            <span className="font-medium flex items-center gap-2">
              <FaBuilding /> Talent
            </span>
          )}
          <FaChevronDown className={open ? "rotate-180" : ""} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {open && (
            <nav className="px-2 flex flex-col gap-1">
              {menu.map((item, index) => {
                const active  = location.pathname === item.path;
                const allowed = isAllowed(item);

                return (
                  <Link
                    key={index}
                    to={allowed ? item.path : location.pathname}
                    onClick={(e) => { if (!allowed) e.preventDefault(); }}
                    title={!allowed && collapsed ? `${item.name} — No permission` : undefined}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors
                      ${active && allowed  ? "bg-[#730042] text-white" : ""}
                      ${active && !allowed ? "bg-gray-100 text-gray-400" : ""}
                      ${!active && allowed  ? "hover:bg-gray-100 text-gray-700" : ""}
                      ${!active && !allowed ? "text-gray-400 cursor-not-allowed" : ""}
                    `}
                  >
                    <span className={`text-sm flex-shrink-0 ${!allowed ? "opacity-50" : ""}`}>
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="flex-1 flex items-center justify-between text-sm">
                        <span className={!allowed ? "opacity-50" : ""}>{item.name}</span>
                        {!allowed && (
                          <FaLock size={9} className="text-gray-400 flex-shrink-0" />
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                disabled={isPending}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-100 text-gray-800 transition-colors"
              >
                <FaSignOutAlt />
                {!collapsed && (isPending ? "Logging out..." : "Logout")}
              </button>
            </nav>
          )}
        </div>

        {!collapsed && (
          <div className="mt-auto border-t border-gray-200 p-4">
            <p className="text-xs text-center text-gray-500">
              Powered by TechTorch | &copy; 2026
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(Sidebar);