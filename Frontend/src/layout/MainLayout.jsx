import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useAuth, usePermissionsSync } from "../auth/store/getmeauth/getmeauth";
import { useDismissWelcomeMessage, useDismissBirthdayWish } from "../auth/store/unifiedauth/Unifiedauth.hook";
import WelcomeModal from "../components/WelcomeModal";
import BirthdayModal from "../components/BirthdayModal";
import SingleSignInApprovalBanner from "../components/SingleSignInApprovalBanner";
import PolicyGateScreen from "../components/policy/PolicyGateScreen";
import { useGateStatus } from "../auth/server-state/policy/policy.hook";

// True when `dob` (any year) falls on today's month/day.
function isBirthdayToday(dob) {
  if (!dob) return false;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showBirthday, setShowBirthday] = useState(false);
  const { data: auth } = useAuth();
  const queryClient = useQueryClient();
  const { mutate: dismissWelcome, isPending: isDismissingWelcome } = useDismissWelcomeMessage();
  const { mutate: dismissBirthday, isPending: isDismissingBirthday } = useDismissBirthdayWish();

  usePermissionsSync();

  // TorchX Policy — Access Gate. While any mandatory policy assigned to
  // this person is unacknowledged, render ONLY PolicyGateScreen below —
  // no Sidebar, no Navbar, no route content — until it's cleared.
  const { data: gateStatus, isLoading: isGateLoading } = useGateStatus();

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

  const currentYear = new Date().getFullYear();
  const shouldShowBirthday =
    !shouldShowWelcome &&
    isBirthdayToday(account?.date_of_birth) &&
    account?.lastBirthdayWishYear !== currentYear;

  useEffect(() => {
    setShowWelcome(shouldShowWelcome);
  }, [shouldShowWelcome]);

  useEffect(() => {
    setShowBirthday(shouldShowBirthday);
  }, [shouldShowBirthday]);

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

  const markBirthdayAsSeenInCache = () => {
    queryClient.setQueryData(["auth"], (current) => {
      if (!current?.data) return current;
      const year = new Date().getFullYear();

      const roleKey =
        current.role === "superadmin" ? "superAdmin"
        : current.role === "admin" ? "user"
        : current.role === "manager" ? "manager"
        : current.role === "employee" ? "employee"
        : null;

      if (!roleKey || !current.data[roleKey]) return current;

      return {
        ...current,
        data: {
          ...current.data,
          [roleKey]: {
            ...current.data[roleKey],
            lastBirthdayWishYear: year,
          },
        },
      };
    });
  };

  const handleCloseBirthday = () => {
    dismissBirthday(undefined, {
      onSuccess: () => {
        markBirthdayAsSeenInCache();
        setShowBirthday(false);
      },
      onError: (error) => {
        toast.error(error?.message || "Couldn't save birthday status. Please try again.");
      },
    });
  };

  // Fail-safe like the backend gate: while the very first check is loading
  // we don't yet know if the person is blocked, so avoid a flash of full
  // dashboard content — but never hold this longer than one quick request.
  if (isGateLoading) {
    return <div className="min-h-screen bg-(--background)" />;
  }
  if (gateStatus?.blocked) {
    return <PolicyGateScreen />;
  }

  return (
    <div className="flex h-screen bg-(--background)">
      <SingleSignInApprovalBanner />
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

      {!showWelcome && showBirthday && (
        <BirthdayModal
          displayName={displayName}
          onClose={handleCloseBirthday}
          isClosing={isDismissingBirthday}
        />
      )}
    </div>
  );
}