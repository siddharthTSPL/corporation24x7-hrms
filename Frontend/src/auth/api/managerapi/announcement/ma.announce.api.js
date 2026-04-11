import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/manager',
  withCredentials: true,
});

export const getManagerAnnouncements = async () => {
  const res = await api.get("/showannouncements");
  return res.data;
};
export  const particularAnnouncement = async (id) => {
  const res = await api.get(`/showannouncement/${id}`);
  return res.data;
};