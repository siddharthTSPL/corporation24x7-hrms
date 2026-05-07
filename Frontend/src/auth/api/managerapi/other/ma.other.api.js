import axios from 'axios';

const api= axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});


export const getEmployeeDocuments = async (employeeId) => {
  const res = await api.get(`manager/documents/${employeeId}`);
  return res.data;
};

export const forgetPasswordManager = async (data) => {
  const res = await api.post("manager/forgetpassword", data);
  return res.data;
};

export const verifyManagerOtpApi = async (data) => {
  const res = await api.post("manager/verifyotp", data);
  return res.data;
};

export const resetManagerPassword = async (data) => {
  const res = await api.post("manager/resetManagerPassword", data);
  return res.data;
};



export const reviewEmployee = async (data) => {
  const res = await api.post("manager/reviewtoemployee", data);
  return res.data;
};
export const getUsersUnderManager = async () => {
  const res = await api.get("manager/userunderme");
  return res.data;
};

export const editManagerProfile = async (data) => {
  const res = await api.put("manager/manager/edit-profile", data);
  return res.data;
};

export const changeManagerPassword = async (data) => {
  const res = await api.put("manager/manager/change-password", data);
  return res.data;
};

export const getAllPersonalDocuments = async () => {
  const res = await api.get("manager/getAllPersonalDocuments");
  return res.data;
};
export const getAllExpenseDocuments = async () => {
  const res = await api.get("manager/getAllExpenseDocuments");
  return res.data;
};
export const getDocumentDetails = async (documentId) => {
  const res = await api.get(`manager/getDocumentDetails/${documentId}`);
  return res.data;
};

export const getattendance = async () => {
  const res = await api.get("manager/getattendance");
  return res.data;
};