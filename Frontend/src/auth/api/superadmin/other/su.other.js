import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});


export const reviewToAdmin = async (data) => {
  const res = await api.post("superadmin/reviewtoadmin", data);
  return res.data;
};

export const getAllReviews = async (params = {}) => {
  const res = await api.get("superadmin/allreviews", { params });
  return res.data;
};

export const setAdminHRRole = async (data) => {
  const res = await api.post("superadmin/set-hr-role", data);
  return res.data;
};

export const superAdminAcknowledgeReview = async (data) => {
  const res = await api.post("superadmin/review/acknowledge", data);
  return res.data;
};

export const getTodayCheckins = async () => {
  const res = await api.get("superadmin/getTodayCheckins");
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
  const res = await api.get("superadmin/attendance-overview", { params });
  return res.data;
};

// Powers the "History" button on the Monthly tab — day-wise check-in/out,
// source (face/system), active/idle minutes for one employee, optionally
// filtered by a startDate/endDate range (YYYY-MM-DD).
export const getAttendanceHistory = async (employeeId, { startDate, endDate } = {}) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const res = await api.get(`superadmin/attendance-history/${employeeId}`, { params });
  return res.data;
};

export const getOrgInfo = async () => {
  const res = await api.get("superadmin/getorginfo");
  return res.data;
};




export const changeSuperAdminPassword = async (data) => {
  const res = await api.put("superadmin/changepassword", data);
  return res.data;
};

export const forgotPasswordSuperAdmin = async (data) => {
  const res = await api.post("superadmin/forgot-password", data);
  return res.data;
};

export const verifySuperAdminOtp = async (data) => {
  const res = await api.post("superadmin/verify-otp", data);
  return res.data;
};

export const resetSuperAdminPassword = async (data) => {
  const res = await api.post("superadmin/resetpassword", data);
  return res.data;
};

export const createAdmin = async (data) => {
  const res = await api.post("superadmin/admin/create", data);
  return res.data;
};

export const updateAdmin = async (id, data) => {
  const res = await api.put(`superadmin/admin/update/${id}`, data);
  return res.data;
};

export const deleteAdmin = async (id) => {
  const res = await api.delete(`superadmin/admin/delete/${id}`);
  return res.data;
};

export const getAllAdmins = async () => {
  const res = await api.get("superadmin/admin/all");
  return res.data;
};

export const addManager = async (data) => {
  const res = await api.post("superadmin/addmanager", data);
  return res.data;
};

export const addEmployee = async (data) => {
  const res = await api.post("superadmin/addemployee", data);
  return res.data;
};

export const getAllManagers = async () => {
  const res = await api.get("superadmin/findallmanagers");
  return res.data;
};

export const getAllEmployees = async () => {
  const res = await api.get("superadmin/getallemployee");
  return res.data;
};

export const editEmployee = async (uid, data) => {
  const res = await api.put(`superadmin/editemployee/${uid}`, data);
  return res.data;
};

export const getParticularEmployee = async (uid) => {
  const res = await api.get(`superadmin/getperticularemployee/${uid}`);
  return res.data;
};

export const getParticularManager = async (uid) => {
  const res = await api.get(`superadmin/getperticularemanager/${uid}`);
  return res.data;
};

export const deleteEmployee = async (uid) => {
  const res = await api.delete(`superadmin/deleteuser/${uid}`);
  return res.data;
};



export const getNoOfEmployees = async () => {
  const res = await api.get("superadmin/noofemployee");
  return res.data;
};

export const getAllPersonalDocumentsSuperAdmin = async () => {
  const res = await api.get("superadmin/getallpersonaldocuments");
  return res.data;
};

export const getAllExpenseDocumentsSuperAdmin = async () => {
  const res = await api.get("superadmin/getallexpensedocuments");
  return res.data;
};

export const getDocumentDetailsSuperAdmin = async (documentId) => {
  const res = await api.get(
    `superadmin/getdocumentdetails/${documentId}`
  );
  return res.data;
};


export const getPermissions = async (id, user_model) => {
  const res = await api.get(`superadmin/getpermissions/${id}`, { params: { user_model } });
  return res.data;
};

export const updatePermissions = async ({ id, data }) => {
  const res = await api.put(`superadmin/updatepermissions/${id}`, data);
  return res.data;
};


export const setAdminWorkingStatus = async (id, working_status, extra = {}) => {
  const res = await api.patch(`superadmin/admin/${id}/working-status`, { working_status, ...extra });
  return res.data;
};

export const getInactiveUsers = async () => {
  const res = await api.get("superadmin/inactive-users");
  return res.data;
};

export const getActiveUserCount = async () => {
  const res = await api.get("superadmin/active-user-count");
  return res.data;
};

// ---------------------------------------------------------------------
// Leave policy — lets a SuperAdmin customize yearly EL/SL entitlement
// (per admin vs everyone-else tier) for their organisation. One-time:
// the backend locks this the moment the org has its first Admin.
// ---------------------------------------------------------------------
export const getLeavePolicy = async () => {
  const res = await api.get("superadmin/leave-policy");
  return res.data;
};

export const setLeavePolicy = async (data) => {
  const res = await api.post("superadmin/leave-policy", data);
  return res.data;
};

// ---------------------------------------------------------------------
// Kiosk password — the credential (separate from the superadmin's own
// login password) that face-attendance tablets sign in with, alongside
// the organisation's Organisation ID.
// ---------------------------------------------------------------------
export const getKioskPasswordStatus = async () => {
  const res = await api.get("superadmin/kiosk-password/status");
  return res.data;
};

export const setKioskPassword = async (data) => {
  const res = await api.put("superadmin/kiosk-password", data);
  return res.data;
};
export const getParticularAdmin = async (uid) => {
  const res = await api.get(`superadmin/getperticularadmin/${uid}`);
  return res.data;
};