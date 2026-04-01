import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-(--background)">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 flex flex-col">
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="p-6 overflow-auto flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}