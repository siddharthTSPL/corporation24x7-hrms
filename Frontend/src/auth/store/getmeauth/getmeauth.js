import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeAdmin, loginAdmin } from "../../api/adminapi/auth/ad.auth.api";
import { getMeManager, loginManager } from "../../api/managerapi/auth/ma.auth.api";
import { getMeUser, loginUser } from "../../api/employeeapi/auth/em.auth.api";
import { getMeSuperAdmin, loginSuperAdmin } from "../../api/superadmin/auth/su.auth";
import { usePermissionStore } from "../permission/permissionStore";
import { fetchMyPermissions } from "../../api/permission/permission.api";

export const useAuth = () => {
  const { setPermissions, clearPermissions } = usePermissionStore();

  return useQuery({
    queryKey: ["auth"],

    queryFn: async () => {
      const savedRole = localStorage.getItem("role");
      if (!savedRole) return null;

      try {
        let userData = null;

        if (savedRole === "superadmin") {
          const res = await getMeSuperAdmin();
          userData = { role: "superadmin", data: res };
          setPermissions("superadmin", null);
          return userData;
        }

        if (savedRole === "admin") {
          const res = await getMeAdmin();
          userData = { role: "admin", data: res };
        } else if (savedRole === "manager") {
          const res = await getMeManager();
          userData = { role: "manager", data: res };
        } else if (savedRole === "employee") {
          const res = await getMeUser();
          userData = { role: "employee", data: res };
        }

        if (userData) {
          try {
            const perms = await fetchMyPermissions(savedRole);
            setPermissions(savedRole, perms);
          } catch {
            clearPermissions();
          }
        }

        return userData;
      } catch {
        localStorage.removeItem("role");
        clearPermissions();
        return null;
      }
    },

    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setPermissions, clearPermissions } = usePermissionStore();

  return useMutation({
    mutationKey: ["login"],

    mutationFn: async ({ role, ...payload }) => {
      if (role === "admin") return await loginAdmin(payload);
      if (role === "manager") return await loginManager(payload);
      if (role === "employee") return await loginUser(payload);
      if (role === "superadmin") return await loginSuperAdmin(payload);
      throw new Error("Invalid role");
    },

    onSuccess: async (data, variables) => {
      const role = variables.role;
      localStorage.setItem("role", role);

      try {
        let fullData;
        if (role === "admin") fullData = await getMeAdmin();
        else if (role === "manager") fullData = await getMeManager();
        else if (role === "employee") fullData = await getMeUser();
        else if (role === "superadmin") fullData = await getMeSuperAdmin();

        queryClient.setQueryData(["auth"], { role, data: fullData });
      } catch {
        queryClient.setQueryData(["auth"], { role, data });
      }

      if (role === "superadmin") {
        setPermissions("superadmin", null);
      } else {
        try {
          const perms = await fetchMyPermissions(role);
          setPermissions(role, perms);
        } catch {
          clearPermissions();
        }
      }
    },
  });
};