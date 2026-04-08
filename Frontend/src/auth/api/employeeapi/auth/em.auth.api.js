import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/employee',
  withCredentials: true,
});


export const verifyUser = async (token) => {
  const res = await api.get(`/verify/${token}`);
  return res.data;
};

export const loginUser = async (data) => {
  const res = await api.post("/login", data);
  return res.data;
};

export const logoutUser = async () => {
  const res = await api.post("/logout");
  return res.data;
};

export const firstLoginResetPassword = async (data) => {
  const res = await api.post("/resetUserPassword", data);
  return res.data;
};

export const updatePassword = async (data) => {
  const res = await api.post("/updatepassword", data);
  return res.data;
};


export const forgetPassword = async (data) => {
  const res = await api.post("/forgetpassword", data);
  return res.data;
};

export const verifyOtp = async (data) => {
  const res = await api.post("/verifyotp", data);
  return res.data;
};

export const resetPasswordAfterForget = async (data) => {
  const res = await api.post("/resetPasswordafterforget", data);
  return res.data;
};

export const getMeUser = async () => {
  const res = await api.get("/getme");
  return res.data;
};