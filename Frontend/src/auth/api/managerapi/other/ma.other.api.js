import axios from 'axios';

const api= axios.create({
  baseURL: 'http://localhost:5000/manager',
  withCredentials: true,
});


export const getEmployeeDocuments = async (employeeId) => {
  const res = await api.get(`/documents/${employeeId}`);
  return res.data;
};

export const forgetPasswordManager = async (data) => {
  const res = await api.post("/forgetpassword", data);
  return res.data;
};

export const verifyManagerOtpApi = async (data) => {
  const res = await api.post("/verifyotp", data);
  return res.data;
};

export const resetManagerPassword = async (data) => {
  const res = await api.post("/resetManagerPassword", data);
  return res.data;
};



export const reviewEmployee = async (data) => {
  const res = await api.post("/reviewtoemployee", data);
  return res.data;
};
export const getUsersUnderManager = async () => {
  const res = await api.get("/userunderme");
  return res.data;
};

export const editManagerProfile = async (data) => {
  const res = await api.put("/manager/edit-profile", data);
  return res.data;
};

export const changeManagerPassword = async (data) => {
  const res = await api.put("/manager/change-password", data);
  return res.data;
};

