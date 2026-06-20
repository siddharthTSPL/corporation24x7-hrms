import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { usePermissionsSync } from "../auth/store/getmeauth/getmeauth";

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  usePermissionsSync();

  return (
    <div className="flex h-screen bg-(--background)">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 flex flex-col">
        {/* <Navbar collapsed={collapsed} setCollapsed={setCollapsed} /> */}
        <div className="p-6 overflow-auto flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}