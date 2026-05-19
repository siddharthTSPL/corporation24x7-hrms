import { useQuery } from "@tanstack/react-query";
import { getMeAdmin }      from "../../api/adminapi/auth/ad.auth.api";
import { getMeManager }    from "../../api/managerapi/auth/ma.auth.api";
import { getMeUser }       from "../../api/employeeapi/auth/em.auth.api";
import { getMeSuperAdmin } from "../../api/superadmin/auth/su.auth";

export const useAuth = () =>
  useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const savedRole = localStorage.getItem("role");

      const attempt = async (fn, role) => {
        try {
          const res = await fn();
          return { role, data: res };
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          return null;
        }
      };

      if (savedRole === "superadmin") return attempt(getMeSuperAdmin, "superadmin");
      if (savedRole === "admin")      return attempt(getMeAdmin,       "admin");
      if (savedRole === "manager")    return attempt(getMeManager,     "manager");
      if (savedRole === "employee")   return attempt(getMeUser,        "employee");

      return null;
    },
    staleTime:            1000 * 60 * 5,
    retry:                false,
    refetchOnWindowFocus: false,
  });


export const persistAuth = (role, token) => {
  localStorage.setItem("role",  role);
  localStorage.setItem("token", token);
};


export const clearAuth = () => {
  localStorage.removeItem("role");
  localStorage.removeItem("token");
};