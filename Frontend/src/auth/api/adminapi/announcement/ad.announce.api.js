import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/admin',
  withCredentials: true,
});

export const createAnnouncement = async (data) => {
  const res = await api.post("/createannouncement", data);
  return res.data;
};

