import { api } from "../adminapi/auth/ad.auth.api";

const roleToEndpoint = {
  admin: "admin",
  senior_admin: "admin",
  official: "admin",
  manager: "manager",
  senior_manager: "manager",
  employee: "employee",
};

export const fetchMyPermissions = async (role) => {
  const endpoint = roleToEndpoint[role];
  if (!endpoint) return null;
  const res = await api.get(`permissions/me/${endpoint}`);
  return res.data.data;
};