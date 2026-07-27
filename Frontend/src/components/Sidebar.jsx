import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import React from "react";
import talent from "../assets/Talent.png";
import TechTorchLogo from "../../src/assets/TechTorchLogo.png"
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
  FaQuestionCircle,
  FaMapSigns,
  FaHeadset,
} from "react-icons/fa";
import { useAuth } from "../auth/store/getmeauth/getmeauth";
import { useAdminLogout } from "../auth/server-state/adminauth/adminauth.hook";
import { useLogoutManager } from "../auth/server-state/manager/managerauth/managerauth.hook";
import { useLogoutUser } from "../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useLogoutSuperAdmin } from "../auth/server-state/superadmin/auth/suauth.hook";
import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { clearAgentToken } from "../pages/utils/Desktopagent";
import HelpTour from "./help/HelpTour";
import TechnicalSupportModal from "./help/TechnicalSupportModal";

const superAdminMenu = [
  { name: "Dashboard",      path: "/superadmin-dashboard",     icon: <FaHome />, blurb: "Overview of every organisation — usage, activity, and platform health." },
  { name: "Organisations",  path: "/superadmin-organisations", icon: <FaBuilding />, blurb: "Onboard organisations and manage their TorchX Talent access." },
  { name: "Announcements",  path: "/superadmin-announcements", icon: <FaBullhorn />, blurb: "Broadcast announcements across all organisations." },
  { name: "Leaves",         path: "/superadmin-leaves",        icon: <FaCalendarAlt />, blurb: "See and manage leave requests across every organisation." },
  { name: "Reviews",        path: "/superadmin-reviews",       icon: <FaClipboardCheck />, blurb: "Monitor performance reviews raised across organisations." },
  {name: "Asset Management", path: "/superadmin-asset-management", icon: <FaFolder />, blurb: "Track company assets — assign, revoke, and view history." },
  { name: "Team Documents", path: "/superadmin-documents",     icon: <FaFileAlt />, blurb: "Access documents uploaded by teams across organisations." },
  { name:"Timesheet",       path: "/superadmin-timesheet",     icon: <FaLock />, blurb: "Review logged hours and timesheets, org-wide." },
  { name: "TorchX Management", path: "/superadmin-management", icon: <FaUsersCog />, blurb: "Manage TorchX product access and licensing per organisation." },
  { name: "Payroll",       path: "/superadmin-payroll",       icon: <FaMoneyCheckAlt />, blurb: "Oversee payroll runs across every organisation." },
  { name: "TorchX Voice",   path: "/superadmin-complaints",    icon: <FaShieldAlt />, blurb: "Handle support tickets raised by admins, managers, and employees." },
  { name: "Settings",       path: "/superadmin-settings",      icon: <FaCog />, blurb: "Configure platform-wide settings and preferences." },
];

const adminMenu = [
  { name: "Dashboard",     path: "/dashboard",           icon: <FaHome />, blurb: "Your organisation's overview — headcount, attendance, and activity." },
  { name: "Onboarding",    path: "/employee",            icon: <FaUsers />, blurb: "Add and manage employees and managers." },
  { name: "Announcement",  path: "/announcement",        icon: <FaBullhorn />, blurb: "Create and publish announcements for your organisation.",  permissionGroup: ["announcements.can_view_announcements", "announcements.can_create_announcement", "announcements.can_edit_announcement", "announcements.can_delete_announcement"] },
  { name: "Review",        path: "/review-admin",        icon: <FaClipboardCheck />, blurb: "Run and track performance reviews for your team." },
  { name: "Leave",         path: "/leave-admin",         icon: <FaCalendarAlt />, blurb: "Approve or reject leave requests from managers and employees." },
  { name: "Organisation",  path: "/organisation",        icon: <FaBuilding />, blurb: "View your organisation's structure and org chart." },
  { name:"Asset Management", path: "/admin-asset-management", icon: <FaFolder />, blurb: "Assign, revoke, and track company assets." },
  { name: "Face Attendance", path: "/face-enrollment", icon: <FaShieldAlt />, blurb: "Enroll employee faces for kiosk-based attendance." },
  { name: "Recruitment",   path: "/recruitment-admin",   icon: <FaUsersCog />, blurb: "Post hiring requisitions and track candidates.",
    permissionGroup: ["recruitment.can_view_hiring_requisitions", "recruitment.can_create_hiring_requisition", "recruitment.can_view_candidates", "recruitment.can_add_candidate"] },
  { name: "TorchX Voice",  path: "/admin-complaints",    icon: <FaShieldAlt />, blurb: "Raise or resolve support tickets.", permissionGroup: ["tickets.can_raise_ticket", "tickets.can_view_all_tickets", "tickets.can_resolve_ticket", "tickets.can_rate_ticket"] },
  { name: "Timesheet",     path: "/admin-timesheet",     icon: <FaLock />, blurb: "Review and approve team timesheets." },
  { name: "Payroll",       path: "/payroll",             icon: <FaMoneyCheckAlt />, blurb: "Run payroll and manage payslips." },
  { name: "TorchX Management", path: "/admin-management", icon: <FaUsersCog />, blurb: "Manage your organisation's TorchX product access." },
  { name: "Document",      path: "/document-admin",      icon: <FaFileAlt />, blurb: "Upload and manage your own documents.",   permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "Team Document", path: "/document-admin-team", icon: <FaFileAlt />, blurb: "View documents uploaded by your team.",   permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "Settings",      path: "/settings",            icon: <FaCog />, blurb: "Update your profile and account preferences." },
];

const managerMenu = [
  { name: "Dashboard",    path: "/manager-dashboard",    icon: <FaHome />, blurb: "Your team's overview — attendance, leaves, and activity." },
  { name: "Leave",        path: "/leave-manager",        icon: <FaCalendarAlt />, blurb: "Approve or forward leave requests from your team." },
  { name: "Announcement", path: "/announcement-manager", icon: <FaBullhorn />, blurb: "View and share announcements with your team.",  permissionGroup: ["announcements.can_view_announcements", "announcements.can_create_announcement", "announcements.can_edit_announcement", "announcements.can_delete_announcement"] },
  { name: "Organisation", path: "/organisation-manager", icon: <FaBuilding />, blurb: "View your organisation's structure and org chart." },
  { name: "Review",       path: "/review-manager",       icon: <FaClipboardCheck />, blurb: "Run performance reviews for your reportees." },
  { name: "Timesheet",    path: "/manager-timesheet",    icon: <FaLock />, blurb: "Track and approve your team's timesheets." },
  { name: "File",         path: "/file-manager",         icon: <FaFolder />, blurb: "Upload and manage documents.",    permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "Recruitment",  path: "/recruitment-manager",  icon: <FaUsersCog />, blurb: "Track hiring requisitions and candidates.",  permissionGroup: ["recruitment.can_view_hiring_requisitions", "recruitment.can_create_hiring_requisition", "recruitment.can_view_candidates", "recruitment.can_add_candidate"] },
  { name: "TorchX Voice", path: "/manager-complaints",   icon: <FaShieldAlt />, blurb: "Raise a support ticket.", permissionGroup: ["tickets.can_raise_ticket", "tickets.can_view_all_tickets", "tickets.can_resolve_ticket", "tickets.can_rate_ticket"] },
  { name: "Settings",     path: "/settings-manager",     icon: <FaCog />, blurb: "Update your profile and account preferences." },
];

const employeeMenu = [
  { name: "Dashboard",    path: "/employee-dashboard",    icon: <FaHome />, blurb: "Your personal overview — attendance, leaves, and updates." },
  { name: "Leave",        path: "/leave-employee",        icon: <FaCalendarAlt />, blurb: "Apply for leave and track your leave balance." },
  { name: "Announcement", path: "/announcement-employee", icon: <FaBullhorn />, blurb: "See company announcements.",  permissionGroup: ["announcements.can_view_announcements", "announcements.can_create_announcement", "announcements.can_edit_announcement", "announcements.can_delete_announcement"] },
  { name: "Organisation", path: "/organisation-employee", icon: <FaBuilding />, blurb: "View your organisation's structure and org chart." },
  { name: "Timesheet",    path: "/employee-timesheet",    icon: <FaLock />, blurb: "Log your hours and track your timesheet." },
  { name: "File",         path: "/file-employee",         icon: <FaFolder />, blurb: "Upload and manage your personal documents.",    permissionGroup: ["documents.can_upload_documents", "documents.can_view_all_documents"] },
  { name: "TorchX Voice", path: "/employee-complaints",   icon: <FaShieldAlt />, blurb: "Raise a support ticket for any issue.", permissionGroup: ["tickets.can_raise_ticket", "tickets.can_view_all_tickets", "tickets.can_resolve_ticket", "tickets.can_rate_ticket"] },
  { name: "Settings",     path: "/settings-employee",     icon: <FaCog />, blurb: "Update your profile and account preferences." },
];

const menuByRole = {
  superadmin: superAdminMenu,
  admin:      adminMenu,
  manager:    managerMenu,
  employee:   employeeMenu,
};

// NOTE: added `className` (default "") to props so the parent
// (MainLayout) can pass positioning/sticky classes down to the
// actual root <div> of the sidebar. Previously this prop was
// silently ignored, which is why "sticky top-0" from MainLayout
// never had any effect and the sidebar scrolled with the page.
function Sidebar({ collapsed, setCollapsed, className = "" }) {
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

  const [open,        setOpen]        = useState(true);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [helpOpen,    setHelpOpen]    = useState(false);
  const [showTour,    setShowTour]    = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const menu = menuByRole[role] ?? employeeMenu;

  const isPending = pendingSuperAdmin || pendingAdmin || pendingManager || pendingEmployee;

  const permissionsReady = role === "superadmin" || !!permRole;

  const isAllowed = (item) => {
    if (!item.permissionGroup || item.permissionGroup.length === 0) return true;
    if (!permissionsReady) return false;
    return item.permissionGroup.some((p) => can(p));
  };

  // Built straight from the role's own menu so the tour never drifts out of
  // sync with what's actually in the sidebar. Items hidden by a permission
  // gate are left out — HelpTour also self-skips if a target ever vanishes
  // mid-tour (e.g. permissions load in late).
  const tourSteps = [
    {
      selector: '[data-tour="sidebar-brand"]',
      title: "Welcome to TorchX Talent",
      content: "Quick tour of what you can do from here — takes less than a minute.",
    },
    ...menu
      .filter((item) => isAllowed(item) && item.blurb)
      .map((item) => ({
        selector: `[data-tour="menu-${item.path}"]`,
        title: item.name,
        content: item.blurb,
      })),
    {
      selector: '[data-tour="help-button"]',
      title: "Need help anytime?",
      content: "Come back here to replay this tour, or send a message straight to our support team.",
    },
  ];

  const startTour = () => {
    setHelpOpen(false);
    setOpen(true);
    setMobileOpen(true);
    setShowTour(true);
  };

  const openSupportForm = () => {
    setHelpOpen(false);
    setShowSupport(true);
  };

  const handleLogout = () => {
    const onSuccess = async () => {
      localStorage.removeItem("role");
      clearPermissions();
      clearAgentToken();
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
  className={`fixed md:static z-50 top-0 left-0 h-full bg-white shadow-md transition-all duration-300 flex flex-col flex-shrink-0
  ${collapsed ? "w-16 md:min-w-16" : "w-56 md:min-w-56"}
  ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
  ${className}`}
>
        <div className="p-4 flex items-center justify-between border-b flex-shrink-0" data-tour="sidebar-brand">
          <img src={talent} alt="Talent" className="w-40" />
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <FaTimes />
          </button>
        </div>

       {!collapsed && role && (
  <div className="mx-3 mt-2 mb-1 flex items-center gap-2 rounded-md bg-[#730042]/10 px-3 py-1.5 flex-shrink-0">
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
          className="flex items-center justify-between px-4 py-3 cursor-pointer flex-shrink-0"
          onClick={() => setOpen(!open)}
        >
          {!collapsed && (
            <span className="font-medium flex items-center gap-2">
              <FaBuilding /> Talent
            </span>
          )}
          <FaChevronDown className={open ? "rotate-180" : ""} />
        </div>

        {/*
          This nav list gets its own scroll region (overflow-y-auto).
          That way, if the menu is ever longer than the viewport, IT
          scrolls internally instead of the whole sidebar (or worse,
          the whole page) scrolling.
        */}
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
                    data-tour={`menu-${item.path}`}
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

              <div className="relative">
                {helpOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setHelpOpen(false)} />
                    <div
                      className={`absolute z-40 bottom-full mb-2 bg-white rounded-xl shadow-xl border border-[#F4C0D1] overflow-hidden
                        ${collapsed ? "left-14 w-52" : "left-0 right-0"}`}
                    >
                      <button
                        onClick={startTour}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#FBEAF0] hover:text-[#730042] transition-colors"
                      >
                        <FaMapSigns className="text-[#730042]" />
                        <span>
                          <span className="block font-medium">Take a Tour</span>
                          <span className="block text-[11px] text-gray-400">Hum kaha se kya kar sakte hain</span>
                        </span>
                      </button>
                      <button
                        onClick={openSupportForm}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#FBEAF0] hover:text-[#730042] transition-colors border-t border-gray-100"
                      >
                        <FaHeadset className="text-[#730042]" />
                        <span>
                          <span className="block font-medium">Technical Support</span>
                          <span className="block text-[11px] text-gray-400">Report a problem via email</span>
                        </span>
                      </button>
                    </div>
                  </>
                )}

                <button
                  data-tour="help-button"
                  onClick={() => setHelpOpen((v) => !v)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                    ${helpOpen ? "bg-[#FBEAF0] text-[#730042]" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  <FaQuestionCircle />
                  {!collapsed && "Help"}
                </button>
              </div>

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
          <div className="mt-auto border-t border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 whitespace-nowrap">Powered by</span>

              <img
                src={TechTorchLogo}
                alt="TechTorch Solutions"
                className="h-5 w-auto object-contain flex-shrink-0"
              />

              <span className="text-xs text-gray-500 whitespace-nowrap">
                | &copy; 2026
              </span>
            </div>
          </div>
        )}
      </div>

      {showTour && <HelpTour steps={tourSteps} onClose={() => setShowTour(false)} />}
      {showSupport && <TechnicalSupportModal role={role} onClose={() => setShowSupport(false)} />}
    </>
  );
}

export default React.memo(Sidebar);