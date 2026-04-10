import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginAdmin } from "../../api/adminapi/auth/ad.auth.api";
import { loginManager } from "../../api/managerapi/auth/ma.auth.api";
import { loginUser } from "../../api/employeeapi/auth/em.auth.api";

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
    onSuccess: (data, variables) => {
      localStorage.setItem("role", variables.role);
      queryClient.setQueryData(["auth"], { role: variables.role, data });
    },
  });
};