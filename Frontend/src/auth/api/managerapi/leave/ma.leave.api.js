import axios from 'axios';

const api= axios.create({
  baseURL: 'http://localhost:5000/manager',
  withCredentials: true,
});


export const acceptLeaveRequest = async (data) => {
  const res = await api.post("/acceptleave", data);
  return res.data;
};

export const rejectLeaveRequest = async (data) => {
  const res = await api.post("/rejectleave", data);
  return res.data;
};

export const forwardLeaveToAdmin = async (data) => {
  const res = await api.post("/forwardtoadmin", data);
  return res.data;
};

export const applyLeaveManager = async (data) => {
  const res = await api.post("/applyleave", data);
  return res.data;
};

export const getMyLeavesManager = async () => {
  const res = await api.get("/getmyleaves");
  return res.data;
};
export const getAllManagerLeaves = async () => {
  const res = await api.get("/viewallleaves");
  return res.data;
};
