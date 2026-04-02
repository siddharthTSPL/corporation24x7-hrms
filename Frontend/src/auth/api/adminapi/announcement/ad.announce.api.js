import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/admin",
  withCredentials: true,
});

// ✅ INTERCEPTOR (same pattern everywhere)
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


export const createAnnouncement = async (data) => {
  if (!data?.title || !data?.message) {
    throw new Error("Title and message are required");
  }
  const res = await api.post("/createannouncement", data);
  return res.data;
};