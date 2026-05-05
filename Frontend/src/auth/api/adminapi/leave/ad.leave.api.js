import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/admin",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) return Promise.reject(null);
    return Promise.reject(new Error(message));
  }
);

export const getAllLeaves = async () => {
  const res = await api.get("/showallleaves");
  return res.data;
};


export const acceptLeave = async ({ id, leaveFor }) => {
  if (!id) throw new Error("Leave ID is required");
  const res = await api.put(`/acceptleave/${id}?leaveFor=${leaveFor}`);
  return res.data;
};

export const rejectLeave = async ({ id, leaveFor }) => {
  if (!id) throw new Error("Leave ID is required");
  const res = await api.put(`/rejectleave/${id}?leaveFor=${leaveFor}`);
  return res.data;
};