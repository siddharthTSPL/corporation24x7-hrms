import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/employee',
  withCredentials: true,
});



export const getAnnouncements = async () => {
  const res = await api.get("/showannouncements");
  return res.data;
};
