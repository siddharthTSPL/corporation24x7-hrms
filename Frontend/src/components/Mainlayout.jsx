import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { usePermissionsSync } from "../auth/store/getmeauth/getmeauth";

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  usePermissionsSync();

  return (
   
    <div className="h-screen w-full flex overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        className="h-screen sticky top-0"
      />

      <div className="flex-1 min-w-0 h-screen overflow-hidden flex flex-col">
     
        <Outlet />
      </div>
    </div>
  );
}