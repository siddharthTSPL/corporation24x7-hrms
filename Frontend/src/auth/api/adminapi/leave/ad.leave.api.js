import axios from 'axios';

const api= axios.create({
  baseURL: 'http://localhost:5000/api/admin',
  withCredentials: true,
});

export const getForwardedLeaves = async () => {
  const res = await api.get("/showforwardedleaves");
  return res.data;
};

export const acceptLeave = async (id) => {
  const res = await api.put(`/acceptleave/${id}`);
  return res.data;
};

export const rejectLeave = async (id) => {
  const res = await api.put(`/rejectleave/${id}`);
  return res.data;
};
