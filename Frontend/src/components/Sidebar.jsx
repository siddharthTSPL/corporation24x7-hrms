import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import React from "react";
import {
  FaHome, FaCalendarAlt, FaBullhorn, FaFileAlt,
  FaFolder, FaCog, FaSignOutAlt, FaUsers,
  FaBuilding, FaChevronDown, FaBars, FaTimes,
} from "react-icons/fa";
import { useAuth } from "../auth/store/getmeauth/getmeauth";
import { useAdminLogout } from "../auth/server-state/adminauth/adminauth.hook";
import { useLogoutManager } from "../auth/server-state/manager/managerauth/managerauth.hook";
import { useLogoutUser } from "../auth/server-state/employee/employeeauth/employeeauth.hook";

const adminMenu = [
  { name: "Dashboard", path: "/dashboard", icon: <FaHome /> },
  { name: "Employee Register", path: "/employee", icon: <FaUsers /> },
  { name: "Announcement", path: "/announcement", icon: <FaBullhorn /> },
  { name:"Review", path: "/review-admin", icon: <FaBullhorn /> },
  { name: "Leave", path: "/leave-admin", icon: <FaCalendarAlt /> },
  { name: "Organisation", path: "/organisation", icon: <FaBuilding /> },
  { name: "Settings", path: "/settings", icon: <FaCog /> },
];

const managerMenu = [
  { name: "Dashboard", path: "/manager-dashboard", icon: <FaHome /> },
  { name: "Leave", path: "/leave-manager", icon: <FaCalendarAlt /> },
  { name: "Announcement", path: "/announcement-manager", icon: <FaBullhorn /> },
  { name: "Organisation", path: "/organisation", icon: <FaBuilding /> },
  { name: "Review", path: "/review-manager", icon: <FaBullhorn /> },
  { name: "Document", path: "/document-manager", icon: <FaFileAlt /> },
  { name: "File", path: "/file-manager", icon: <FaFolder /> },
  { name: "Settings", path: "/settings-manager", icon: <FaCog /> },
];

const employeeMenu = [
  { name: "Dashboard", path: "/employee-dashboard", icon: <FaHome /> },
  { name: "Leave", path: "/leave-employee", icon: <FaCalendarAlt /> },
  { name: "Announcement", path: "/announcement-employee", icon: <FaBullhorn /> },
  { name: "Organisation", path: "/organisation", icon: <FaBuilding /> },
  { name: "File", path: "/file-employee", icon: <FaFolder /> },
  { name: "Settings", path: "/settings-employee", icon: <FaCog /> },
];

function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const role = auth?.role;

  const { mutate: logoutAdmin, isPending: pendingAdmin } = useAdminLogout();
  const { mutate: logoutManager, isPending: pendingManager } = useLogoutManager();
  const { mutate: logoutEmployee, isPending: pendingEmployee } = useLogoutUser();

  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menu = role === "admin" ? adminMenu : role === "manager" ? managerMenu : employeeMenu;
  const isPending = pendingAdmin || pendingManager || pendingEmployee;

  const handleLogout = () => {
    const onSuccess = () => {
      localStorage.removeItem("role");
      navigate("/login");
    };

    if (role === "admin") logoutAdmin(undefined, { onSuccess });
    else if (role === "manager") logoutManager(undefined, { onSuccess });
    else logoutEmployee(undefined, { onSuccess });
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
          <img src="/src/assets/logo1.png" alt="logo" className="w-40" />
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <FaTimes />
          </button>
        </div>

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
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={index}
                    to={item.path}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      active ? "bg-[#730042] text-white" : "hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {!collapsed && item.name}
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                disabled={isPending}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-100 text-gray-800"
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