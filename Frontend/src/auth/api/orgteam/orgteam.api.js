import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const e = new Error(error.response?.data?.message || "Something went wrong");
    e.status = error.response?.status;
    return Promise.reject(e);
  },
);

export const getOrgTeams = async () => (await api.get("org-teams")).data;
export const saveHRTeam = async (adminIds) => (await api.put("org-teams/hr", { adminIds })).data;
export const saveITTeam = async (members) => (await api.put("org-teams/it", { members })).data;
export const saveAccountsTeam = async (members) => (await api.put("org-teams/accounts", { members })).data;