import axios from 'axios';

const api= axios.create({
  baseURL: 'http://localhost:5000/user',
  withCredentials: true,
});

export const applyLeave = async (data) => {
  const res = await api.post("/applyleave", data);
  return res.data;
};

export const getLeaveResult = async (id) => {
  const res = await api.get(`/resultofleaverequest/${id}`);
  return res.data;
};

export const getAllLeaves = async () => {
  const res = await api.get("/getallleave");
  return res.data;
};

export const editLeave = async ({ id, ...data }) => {
  const res = await api.put(`/editleave/${id}`, data);
  return res.data;
};

export const deleteLeave = async (id) => {
  const res = await api.delete(`/deleteleave/${id}`);
  return res.data;
};

export const getallleavehistory = async () => {
  const res = await api.get("/getallleavehistory");
  return res.data;
};