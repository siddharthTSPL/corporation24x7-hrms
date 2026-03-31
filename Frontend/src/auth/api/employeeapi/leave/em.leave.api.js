import axios from 'axios';

const api= axios.create({
  baseURL: 'http://localhost:8080/api/employee',
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