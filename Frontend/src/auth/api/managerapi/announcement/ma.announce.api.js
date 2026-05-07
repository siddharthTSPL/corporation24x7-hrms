import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

export const getManagerAnnouncements = async () => {
  const res = await api.get("manager/showannouncements");
  return res.data;
};
export  const particularAnnouncement = async (id) => {
  const res = await api.get(`manager/showannouncement/${id}`);
  return res.data;
};