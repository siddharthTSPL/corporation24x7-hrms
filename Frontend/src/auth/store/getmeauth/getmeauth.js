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

export const usePermissionsSync = () => {
  const { setPermissions, clearPermissions } = usePermissionStore();
  const savedRole = localStorage.getItem("role");

  return useQuery({
    queryKey: ["permissions", savedRole],
    enabled: !!savedRole && savedRole !== "superadmin",

    queryFn: async () => {
      try {
        const perms = await fetchMyPermissions(savedRole);
        setPermissions(savedRole, perms);
        return perms;
      } catch {
        clearPermissions();
        return {};
      }
    },

    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: false,
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

      if (role === "superadmin") {
        setPermissions("superadmin", null);
        try {
          const fullData = await getMeSuperAdmin();
          queryClient.setQueryData(["auth"], { role, data: fullData });
        } catch {
          queryClient.setQueryData(["auth"], { role, data });
        }
        return;
      }

      const getMeFn =
        role === "admin" ? getMeAdmin
        : role === "manager" ? getMeManager
        : getMeUser;

      const [fullDataResult, permsResult] = await Promise.allSettled([
        getMeFn(),
        fetchMyPermissions(role),
      ]);

      if (permsResult.status === "fulfilled") {
        setPermissions(role, permsResult.value);
      } else {
        clearPermissions();
      }

      queryClient.setQueryData(["auth"], {
        role,
        data: fullDataResult.status === "fulfilled" ? fullDataResult.value : data,
      });

      queryClient.invalidateQueries({ queryKey: ["permissions", role] });
    },
  });
};