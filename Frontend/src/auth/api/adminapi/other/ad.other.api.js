import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) {
      return Promise.reject(null);
    }
    const newError = new Error(message);
    newError.response = error.response; // 👈 original response preserve karo
    newError.status = error.response?.status;
    return Promise.reject(newError);
  },
);

export const getAllEmployee = async () => {
  const res = await api.get("/admin/getallemployee");
  return res.data;
};

// Dashboard-only: managers + employees that report (directly or through a
// chain of managers) to the logged-in admin, not the whole organisation.
export const getMyTeamOverview = async () => {
  const res = await api.get("/admin/dashboard/myteam");
  return res.data;
};

export const getParticularEmployee = async (id) => {
  const res = await api.get(`/admin/getperticularemployee/${id}`);
  return res.data;
};

export const getParticularManager = async (id) => {
  const res = await api.get(`/admin/getperticularemanager/${id}`);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/admin/deleteuser/${id}`);
  return res.data;
};

export const editEmployee = async (id, data) => {
  const res = await api.put(`/admin/editemployee/${id}`, data);
  return res.data;
};

export const editManager = async (id, data) => {
  const res = await api.put(`/admin/editmanager/${id}`, data);
  return res.data;
};

export const promoteEmployeeToManager = async (id, data) => {
  const res = await api.post(`/admin/employee/${id}/promote/manager`, data);
  return res.data;
};

export const promoteEmployeeToAdmin = async (id, data) => {
  const res = await api.post(`/admin/employee/${id}/promote/admin`, data);
  return res.data;
};

export const promoteManagerToAdmin = async (id, data) => {
  const res = await api.post(`/admin/manager/${id}/promote/admin`, data);
  return res.data;
};

export const demoteManagerToEmployee = async (id, data) => {
  const res = await api.post(`/admin/manager/${id}/demote/employee`, data);
  return res.data;
};

export const demoteAdminToManager = async (id, data) => {
  const res = await api.post(`/admin/admin/${id}/demote/manager`, data);
  return res.data;
};

export const demoteAdminToEmployee = async (id, data) => {
  const res = await api.post(`/admin/admin/${id}/demote/employee`, data);
  return res.data;
};

export const changeManagerRole = async (id, data) => {
  const res = await api.put(`/admin/manager/${id}/role`, data);
  return res.data;
};

export const getEmployeeStats = async () => {
  const res = await api.get("/admin/noofemployee");
  return res.data;
};

export const reviewToManager = async (data) => {
  const res = await api.post("/admin/reviewtomanager", data);
  return res.data;
};

export const getparticularEmployeeStats = async (id) => {
  const res = await api.get(`/admin/getperticularemployee/${id}`);
  return res.data;
};

export const getTodayCheckins = async () => {
  const res = await api.get("/admin/gettodaycheckins");
  return res.data;
};

// Powers the "Attendance Details" modal (Today + Monthly tabs) opened from
// the Live Attendance Map card.
export const getAttendanceOverview = async ({ type = "today", month, year } = {}) => {
  const params = { type };
  if (type === "monthly") {
    if (month) params.month = month;
    if (year) params.year = year;
  }
  const res = await api.get("/admin/attendance-overview", { params });
  return res.data;
};

export const getOrgInfo = async () => {
  const res = await api.get("/admin/getorginfo");
  return res.data;
};

export const getTodayLeaves = async () => {
  const res = await api.get("/admin/showallleaves");
  return res.data;
};

export const getAllPersonalDocuments = async () => {
  const res = await api.get("/admin/documents/personal");
  return res.data;
};

export const getAllExpenseDocuments = async () => {
  const res = await api.get("/admin/documents/expense");
  return res.data;
};

export const getDocumentDetails = async (documentId) => {
  const res = await api.get(`/admin/documents/${documentId}`);
  return res.data;
};

export const adminActionOnLeave = async (data) => {
  const res = await api.post("/admin/actionleave", data);
  return res.data;
};



export const setEmployeeWorkingStatus = async (id, working_status) => {
  const res = await api.put(`/admin/employee/${id}/working-status`, { working_status });
  return res.data;
};

export const setManagerWorkingStatus = async (id, working_status) => {
  const res = await api.put(`/admin/manager/${id}/working-status`, { working_status });
  return res.data;
};

export const getInactiveUsers = async () => {
  const res = await api.get("/admin/inactive-users");
  return res.data;
};

export const getActiveUserCount = async () => {
  const res = await api.get("/admin/active-user-count");
  return res.data;
};
export const getAllAdmins = async () => {
  const res = await api.get("/admin/all-admins");
  return res.data;
};

export const getAttendanceHistory = async () => {
  const res = await api.get("admin/getattendance");
  return res.data;
};