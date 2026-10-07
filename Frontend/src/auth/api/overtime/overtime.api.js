import axios from "axios";

// One shared endpoint set for every role (employee / manager / admin /
// superadmin) - the backend reads the role from the session cookie.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    const newError = new Error(message);
    newError.response = error.response;
    newError.status = error.response?.status;
    return Promise.reject(newError);
  },
);

export const getOvertimeAccess = async () => (await api.get("overtime/access")).data;

export const applyOvertime = async (data) => (await api.post("overtime/apply", data)).data;

export const getMyOvertime = async (params = {}) => (await api.get("overtime/my", { params })).data;

export const editMyOvertime = async ({ id, data }) => (await api.put(`overtime/my/${id}`, data)).data;

export const deleteMyOvertime = async (id) => (await api.delete(`overtime/my/${id}`)).data;

export const getOvertimeForReview = async (params = {}) => (await api.get("overtime/review", { params })).data;

export const approveOvertime = async ({ id, remarks }) =>
  (await api.post(`overtime/review/${id}/approve`, { remarks })).data;

export const rejectOvertime = async ({ id, remarks }) =>
  (await api.post(`overtime/review/${id}/reject`, { remarks })).data;