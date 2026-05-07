
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) {
      return Promise.reject(null); 
    }

    return Promise.reject(new Error(message));
  }
);



export const registerAdmin = async (data) => {
  const res = await api.post("admin/register", data);
  return res.data;
};

export const verifyAdmin = async (token) => {
  const res = await api.get(`admin/verify/${token}`);
  return res.data;
};

export const loginAdmin = async (data) => {
  const res = await api.post("admin/login", data);
  return res.data;
};

export const logoutAdmin = async () => {
  const res = await api.post("admin/logout");
  return res.data;
};

export const getMeAdmin = async () => {
  const res = await api.get("admin/getme");
  return res.data;
};

export const sendForgetPasswordOtp = async (email) => {
  const res = await api.post("admin/forgetpassword", { email });
  return res.data;
};

export const verifyAdminOtp = async (data) => {
  const res = await api.post("admin/verifyotp", data); 
  return res.data;
};

export const resetAdminPassword = async (data) => {
  const res = await api.post("admin/resetAdminPassword", data);
  return res.data;
};
export const addManager = async (data) => {
  const res = await api.post("admin/addmanager", data);
  return res.data;
};

export const addEmployee = async (data) => {
  const res = await api.post("admin/addemployee", data);
  return res.data;
};

export const findAllManagers = async () => {
  const res = await api.get("admin/findallmanagers");
  return res.data;
};

export const editAdminProfile = async (data) => {
  const res = await api.put("admin/editadminprofile", data);
  return res.data;
};

export const changeAdminPassword = async (data) => {
  const res = await api.put("admin/changepassword", data);
  return res.data;
};
