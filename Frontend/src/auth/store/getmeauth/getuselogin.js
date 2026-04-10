import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginAdmin, getMeAdmin } from "../../api/adminapi/auth/ad.auth.api";
import { loginManager, getMeManager } from "../../api/managerapi/auth/ma.auth.api";
import { loginUser, getMeUser } from "../../api/employeeapi/auth/em.auth.api";

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["login"],
    mutationFn: async ({ role, ...payload }) => {
      if (role === "admin") return loginAdmin(payload);
      if (role === "manager") return loginManager(payload);
      if (role === "employee") return loginUser(payload);
      throw new Error("Invalid role");
    },
    onSuccess: async (data, variables) => {
      const role = variables.role;
      localStorage.setItem("role", role);

      try {
        let fullData;
        if (role === "admin") fullData = await getMeAdmin();
        else if (role === "manager") fullData = await getMeManager();
        else fullData = await getMeUser();

        queryClient.setQueryData(["auth"], { role, data: fullData });
      } catch {
        queryClient.setQueryData(["auth"], { role, data });
      }
    },
  });
};