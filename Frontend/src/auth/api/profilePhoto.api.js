import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const uploadProfilePhoto = async (role, file) => {
  const formData = new FormData();
  formData.append("photo", file);
  const response = await api.post(`${role}/profile-photo`, formData);
  return response.data;
};
