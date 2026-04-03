
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/admin",
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
  const res = await api.post("/register", data);
  return res.data;
};

export const verifyAdmin = async (token) => {
  const res = await api.get(`/verify/${token}`);
  return res.data;
};

export const loginAdmin = async (data) => {
  const res = await api.post("/login", data);
  return res.data;
};

export const logoutAdmin = async () => {
  const res = await api.post("/logout");
  return res.data;
};

export const getMeAdmin = async () => {
  const res = await api.get("/getme");
  return res.data;
};

export const sendForgetPasswordOtp = async (email) => {
  const res = await api.post("/forgetpassword", { email });
  return res.data;
};

export const verifyAdminOtp = async (data) => {
  const res = await api.post("/verifyotp", data); 
  // data = { email, otp }
  return res.data;
};

export const resetAdminPassword = async (data) => {
  const res = await api.post("/resetAdminPassword", data);
  return res.data;
};
export const addManager = async (data) => {
  const res = await api.post("/addmanager", data);
  return res.data;
};

export const addEmployee = async (data) => {
  const res = await api.post("/addemployee", data);
  return res.data;
};
