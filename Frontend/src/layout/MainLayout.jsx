import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useAuth, usePermissionsSync } from "../auth/store/getmeauth/getmeauth";
import { useDismissWelcomeMessage } from "../auth/store/unifiedauth/Unifiedauth.hook";
import WelcomeModal from "../components/WelcomeModal";

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { data: auth } = useAuth();
  const queryClient = useQueryClient();
  const { mutate: dismissWelcome, isPending: isDismissingWelcome } = useDismissWelcomeMessage();

  usePermissionsSync();

  const roleLabels = {
    superadmin: "Super Admin",
    admin: "Admin",
    manager: "Manager",
    employee: "Employee",
  };

  const getAccount = () => {
    if (!auth?.data) return null;
    if (auth.role === "superadmin") return auth.data.superAdmin || null;
    if (auth.role === "admin") return auth.data.user || null;
    if (auth.role === "manager") return auth.data.manager || null;
    return auth.data.employee || null;
  };

  const account = getAccount();
  const shouldShowWelcome = !!account?.isFirstLogin;
  const displayName =
    auth?.role === "admin"
      ? account?.organisation_name || account?.name || account?.email || "there"
      : `${account?.f_name || ""} ${account?.l_name || ""}`.trim() ||
        account?.name ||
        account?.email ||
        "there";
  const professionLabel = account?.designation || roleLabels[auth?.role] || "";

  useEffect(() => {
    setShowWelcome(shouldShowWelcome);
  }, [shouldShowWelcome]);

  const markWelcomeAsSeenInCache = () => {
    queryClient.setQueryData(["auth"], (current) => {
      if (!current?.data) return current;

      if (current.role === "superadmin" && current.data.superAdmin) {
        return {
          ...current,
          data: {
            ...current.data,
            superAdmin: {
              ...current.data.superAdmin,
              isFirstLogin: false,
            },
          },
        };
      }

      if (current.role === "admin" && current.data.user) {
        return {
          ...current,
          data: {
            ...current.data,
            user: {
              ...current.data.user,
              isFirstLogin: false,
            },
          },
        };
      }

      if (current.role === "manager" && current.data.manager) {
        return {
          ...current,
          data: {
            ...current.data,
            manager: {
              ...current.data.manager,
              isFirstLogin: false,
            },
          },
        };
      }

      if (current.role === "employee" && current.data.employee) {
        return {
          ...current,
          data: {
            ...current.data,
            employee: {
              ...current.data.employee,
              isFirstLogin: false,
            },
          },
        };
      }

      return current;
    });
  };

  const handleCloseWelcome = () => {
    dismissWelcome(undefined, {
      onSuccess: () => {
        markWelcomeAsSeenInCache();
        setShowWelcome(false);
      },
      onError: (error) => {
        toast.error(error?.message || "Couldn't save welcome status. Please try again.");
      },
    });
  };

  return (
    <div className="flex h-screen bg-(--background)">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 flex flex-col">
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="p-6 overflow-auto flex-1">
          <Outlet />
        </div>
      </div>

      {showWelcome && (
        <WelcomeModal
          displayName={displayName}
          professionLabel={professionLabel}
          roleLabel={roleLabels[auth?.role] || ""}
          onClose={handleCloseWelcome}
          isClosing={isDismissingWelcome}
        />
      )}
    </div>
  );
}
