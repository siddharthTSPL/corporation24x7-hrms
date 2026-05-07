import axios from 'axios';

const api= axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});


export const acceptLeaveRequest = async (data) => {
  const res = await api.post("manager/acceptleaverequest", data);
  return res.data;
};

export const rejectLeaveRequest = async (data) => {
  const res = await api.post("manager/rejectleaverequest", data);
  return res.data;
};

export const forwardLeaveToAdmin = async (data) => {
  const res = await api.post("manager/forwardtoadmin", data);
  return res.data;
};

export const applyLeaveManager = async (data) => {
  const res = await api.post("manager/applyleavem", data);
  return res.data;
};

export const getMyLeavesManager = async () => {
  const res = await api.get("manager/getmyleaves");
  return res.data;
};
export const getAllManagerLeaves = async () => {
  const res = await api.get("manager/viewallleaves");
  return res.data;
};
