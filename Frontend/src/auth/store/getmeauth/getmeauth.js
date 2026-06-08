import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeAdmin, loginAdmin } from "../../api/adminapi/auth/ad.auth.api";
import { getMeManager, loginManager } from "../../api/managerapi/auth/ma.auth.api";
import { getMeUser, loginUser } from "../../api/employeeapi/auth/em.auth.api";
import { getMeSuperAdmin, loginSuperAdmin } from "../../api/superadmin/auth/su.auth";

export const useAuth = () => {
  return useQuery({
    queryKey: ["auth"],

    queryFn: async () => {
      const savedRole = localStorage.getItem("role");

      if (savedRole === "superadmin") {
        try {
          const res = await getMeSuperAdmin();
          return { role: "superadmin", data: res };
        } catch {
          localStorage.removeItem("role");
          return null;
        }
      }

      if (savedRole === "admin") {
        try {
          const res = await getMeAdmin();
          return { role: "admin", data: res };
        } catch {
          localStorage.removeItem("role");
          return null;
        }
      }

      if (savedRole === "manager") {
        try {
          const res = await getMeManager();
          return { role: "manager", data: res };
        } catch {
          localStorage.removeItem("role");
          return null;
        }
      }

      if (savedRole === "employee") {
        try {
          const res = await getMeUser();
          return { role: "employee", data: res };
        } catch {
          localStorage.removeItem("role");
          return null;
        }
      }

      return null;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();

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
    },
  });
};