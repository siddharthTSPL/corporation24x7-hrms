import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/attendance",
  withCredentials: true,
});


export const checkin = async (data) => {
  const res = await api.post("/checkin", data);
  return res.data;
};


export const activity = async (status) => {
  const res = await api.post("/activity", { status });
  return res.data;
};

export const checkout = async () => {
  const res = await api.post("/checkout");
  return res.data;
};