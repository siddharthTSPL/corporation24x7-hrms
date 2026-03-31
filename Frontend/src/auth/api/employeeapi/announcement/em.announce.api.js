import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/employee',
  withCredentials: true,
});



export const getAnnouncements = async () => {
  const res = await api.get("/showannouncements");
  return res.data;
};
