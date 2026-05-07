import axios from 'axios';

const api= axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

export const applyLeave = async (data) => {
  const res = await api.post("user/applyleave", data);
  return res.data;
};

export const getLeaveResult = async (id) => {
  const res = await api.get(`user/resultofleaverequest/${id}`);
  return res.data;
};

export const getAllLeaves = async () => {
  const res = await api.get("user/getallleave");
  return res.data;
};

export const editLeave = async ({ id, ...data }) => {
  const res = await api.put(`user/editleave/${id}`, data);
  return res.data;
};

export const deleteLeave = async (id) => {
  const res = await api.delete(`user/deleteleave/${id}`);
  return res.data;
};

export const getallleavehistory = async () => {
  const res = await api.get("user/getallleavehistory");
  return res.data;
};

export const getattendance = async () => {
  const res = await api.get("user/getattendance");
  return res.data;
};