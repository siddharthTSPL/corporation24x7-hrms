import axios from 'axios';

const api = axios.create({
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

export const forwardLeaveToReportingManager = async (data) => {
  const res = await api.post("manager/forwardtoreportingmanager", data);
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

export const getForwardedLeavesManager = async () => {
  const res = await api.get("manager/getforwardedleaves");
  return res.data;
};

export const acceptForwardedLeave = async (data) => {
  const res = await api.post("manager/acceptforwardedleave", data);
  return res.data;
};

export const rejectForwardedLeave = async (data) => {
  const res = await api.post("manager/rejectforwardedleave", data);
  return res.data;
};

export const forwardLeaveUpChain = async (data) => {
  const res = await api.post("manager/forwardleaveupchain", data);
  return res.data;
};


export const getLeavehistory = async () => {
  const res = await api.get("manager/getmyleavehistory");
  return res.data;
}