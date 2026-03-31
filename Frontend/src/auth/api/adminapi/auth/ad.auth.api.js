import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api/admin",
  withCredentials: true,
});

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

export const addManager = async (data) => {
  const res = await api.post("/addmanager", data);
  return res.data;
};

export const addEmployee = async (data) => {
  const res = await api.post("/addemployee", data);
  return res.data;
};
