import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/admin",
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

export const getForwardedLeaves = async () => {
  const res = await api.get("/showforwardedleaves");
  return res.data;
};

export const acceptLeave = async (id) => {
  if (!id) throw new Error("Leave ID is required");

  const res = await api.put(`/acceptleave/${id}`);
  return res.data;
};

export const rejectLeave = async (id) => {
  if (!id) throw new Error("Leave ID is required");
  const res = await api.put(`/rejectleave/${id}`);
  return res.data;
};