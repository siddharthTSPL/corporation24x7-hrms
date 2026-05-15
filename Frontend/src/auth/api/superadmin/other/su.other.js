import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});


export const reviewToAdmin = async (data) => {
  const res = await api.post("superadmin/reviewtoadmin", data);
  return res.data;
};

export const getTodayCheckins = async () => {
  const res = await api.get("superadmin/getTodayCheckins");
  return res.data;
};

export const getOrgInfo = async () => {
  const res = await api.get("superadmin/getorginfo");
  return res.data;
};




export const changeSuperAdminPassword = async (data) => {
  const res = await api.put("superadmin/change-password", data);
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
  const res = await api.post("superadmin/reset-password", data);
  return res.data;
};

export const createAdmin = async (data) => {
  const res = await api.post("superadmin/create-admin", data);
  return res.data;
};

export const updateAdmin = async (id, data) => {
  const res = await api.put(`superadmin/update-admin/${id}`, data);
  return res.data;
};

export const deleteAdmin = async (id) => {
  const res = await api.delete(`superadmin/delete-admin/${id}`);
  return res.data;
};

export const getAllAdmins = async () => {
  const res = await api.get("superadmin/getAllAdmins");
  return res.data;
};

export const addManager = async (data) => {
  const res = await api.post("superadmin/add-manager", data);
  return res.data;
};

export const addEmployee = async (data) => {
  const res = await api.post("superadmin/add-employee", data);
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
  const res = await api.put(`superadmin/edit-employee/${uid}`, data);
  return res.data;
};

export const getParticularEmployee = async (uid) => {
  const res = await api.get(`superadmin/employee/${uid}`);
  return res.data;
};

export const getParticularManager = async (uid) => {
  const res = await api.get(`superadmin/manager/${uid}`);
  return res.data;
};

export const deleteEmployee = async (uid) => {
  const res = await api.delete(`superadmin/delete-employee/${uid}`);
  return res.data;
};



export const getNoOfEmployees = async () => {
  const res = await api.get("superadmin/noofemployee");
  return res.data;
};



