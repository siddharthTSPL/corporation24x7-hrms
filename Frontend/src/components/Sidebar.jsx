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
} from "react-icons/fa";

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const [open, setOpen] = useState(true);

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
    <div
      className={`h-full bg-white shadow-md transition-all duration-300 
      ${collapsed ? "w-20" : "w-64"}`}
      onMouseEnter={() => collapsed && setCollapsed(false)}
    >
      {/* LOGO IMAGE */}
      <div className="p-4 flex items-center gap-3 border-b">
        <img
          src="/logo1.jpg"   
          alt="logo"
          className="w-20 h-20 object-contain"
        />

        {!collapsed && (
          <h3 className="font-bold text-lg text-[var(--primary)]">
            CORPORATION 24X7
          </h3>
        )}
      </div>

      {/* DROPDOWN HEADER */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer text-gray-600 hover:bg-gray-100"
        onClick={() => setOpen(!open)}
      >
        {!collapsed && <span className="font-medium">Menu</span>}
        <FaChevronDown
          className={`transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* MENU DROPDOWN */}
      {open && (
        <nav className="px-3 flex flex-col gap-2">
          {menu.map((item, index) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={index}
                to={item.path}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all
                  ${
                    active
                      ? "bg-[var(--primary)] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>

                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}