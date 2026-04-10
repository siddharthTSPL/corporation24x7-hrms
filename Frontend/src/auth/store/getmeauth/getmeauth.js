import { useQuery } from "@tanstack/react-query";
import { getMeAdmin } from "../../api/adminapi/auth/ad.auth.api";
import { getMeManager } from "../../api/managerapi/auth/ma.auth.api";
import { getMeUser } from "../../api/employeeapi/auth/em.auth.api";

export const useAuth = () => {
  return useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const savedRole = localStorage.getItem("role");

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