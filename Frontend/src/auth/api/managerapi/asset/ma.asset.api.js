import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

// Assets currently assigned to the logged-in manager.
export const getMyAssetsManager = async () => {
  const res = await api.get("manager/my-assets");
  return res.data;
};