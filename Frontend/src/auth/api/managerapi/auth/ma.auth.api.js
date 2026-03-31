import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api/manager",
  withCredentials: true,
});

export const verifyManager = async (token) => {
  const res = await api.get(`/verify/${token}`);
  return res.data;
};

export const loginManager = async (data) => {
  const res = await api.post("/login", data);
  return res.data;
};

export const logoutManager = async () => {
  const res = await api.post("/logout");
  return res.data;
};

export const firstLoginPasswordChange = async (data) => {
  const res = await api.post("/firstloginpasswordchange", data);
  return res.data;
};

export const updateManagerPassword = async (data) => {
  const res = await api.post("/updatepassword", data);
  return res.data;
};
export const getMeManager = async () => {
  const res = await api.get("/getme");
  return res.data;
};






