import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
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
} from "react-icons/fa";

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menu = [
    { name: "Dashboard", path: "/dashboard", icon: <FaHome /> },
    { name: "Employee Register", path: "/employee", icon: <FaUsers /> },
    { name: "Organisation", path: "/organisation", icon: <FaBuilding /> },
    { name: "Leave", path: "/leave", icon: <FaCalendarAlt /> },
    { name: "Announcement", path: "/announcement", icon: <FaBullhorn /> },
    { name: "Document", path: "/document", icon: <FaFileAlt /> },
    { name: "File", path: "/file", icon: <FaFolder /> },
    { name: "Settings", path: "/settings", icon: <FaCog /> },
    { name: "Logout", path: "/", icon: <FaSignOutAlt /> },
  ];

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center justify-between p-3 bg-white shadow">
        <button onClick={() => setMobileOpen(true)}>
          <FaBars size={20} />
        </button>
      </div>

      {/* OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed md:static z-50 top-0 left-0 h-full bg-white shadow-md transition-all duration-300
        ${collapsed ? "w-16" : "w-56"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        onMouseEnter={() => collapsed && setCollapsed(false)}
      >
        {/* HEADER */}
        <div className="p-4 flex items-center justify-between border-b">
          <img src="/logo1.jpeg" alt="logo" className="w-40" />

          {/* MOBILE CLOSE */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        {/* HRMS HEADER */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer text-gray-600 hover:bg-gray-100"
          onClick={() => setOpen(!open)}
        >
          {!collapsed && (
            <span className="font-medium flex items-center gap-2">
              <FaBuilding /> HRMS
            </span>
          )}
          <FaChevronDown
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>

        {/* MENU */}
        {open && (
          <nav className="px-2 flex flex-col gap-1">
            {menu.map((item, index) => {
              const active = location.pathname === item.path;

              return (
                <Link
                  key={index}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all
                    ${
                      active
                        ? "bg-[var(--primary)] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}
