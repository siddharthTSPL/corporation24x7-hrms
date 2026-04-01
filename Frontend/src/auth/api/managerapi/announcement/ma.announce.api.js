import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/manager',
  withCredentials: true,
});

export const getManagerAnnouncements = async () => {
  const res = await api.get("/showannouncements");
  return res.data;
};