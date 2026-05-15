import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  loginAdmin,
  getMeAdmin,
} from "../../api/adminapi/auth/ad.auth.api";

import {
  loginManager,
  getMeManager,
} from "../../api/managerapi/auth/ma.auth.api";

import {
  loginUser,
  getMeUser,
} from "../../api/employeeapi/auth/em.auth.api";

import {
  loginSuperAdmin,
  getMeSuperAdmin,
} from "../../api/superadmin/auth/su.auth";

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["login"],

    mutationFn: async ({ role, ...payload }) => {
      if (role === "admin") {
        return await loginAdmin(payload);
      }

      if (role === "manager") {
        return await loginManager(payload);
      }

      if (role === "employee") {
        return await loginUser(payload);
      }

      if (role === "superadmin") {
        return await loginSuperAdmin(payload);
      }

      throw new Error("Invalid role");
    },

    onSuccess: async (data, variables) => {
      const role = variables.role;

      localStorage.setItem("role", role);

      try {
        let fullData;

        if (role === "admin") {
          fullData = await getMeAdmin();
        } else if (role === "manager") {
          fullData = await getMeManager();
        } else if (role === "employee") {
          fullData = await getMeUser();
        } else if (role === "superadmin") {
          fullData = await getMeSuperAdmin();
        }

        queryClient.setQueryData(["auth"], {
          role,
          data: fullData,
        });
      } catch {
        queryClient.setQueryData(["auth"], {
          role,
          data,
        });
      }
    },
  });
};