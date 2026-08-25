import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || "Something went wrong";

    if (error.response?.status === 401) {
      return Promise.reject(null);
    }

    return Promise.reject(new Error(message));
  }
);

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

export const getLeaveHistory = async () => {
  const res = await api.get("manager/myleavehistory");
  return res.data;
};

export const acceptLeaveRequest = async (data) => {
  const res = await api.post("manager/acceptleaverequest", data);
  return res.data;
};

export const rejectLeaveRequest = async (data) => {
  const res = await api.post("manager/rejectleaverequest", data);
  return res.data;
};

export const forwardLeaveToReportingManager = async (data) => {
  const res = await api.post(
    "manager/forwardtoreportingmanager",
    data
  );
  return res.data;
};

export const getForwardedLeavesManager = async () => {
  const res = await api.get("manager/getforwardedleaves");
  return res.data;
};

export const acceptForwardedLeave = async (data) => {
  const res = await api.post(
    "manager/acceptforwardedleave",
    data
  );
  return res.data;
};

export const rejectForwardedLeave = async (data) => {
  const res = await api.post(
    "manager/rejectforwardedleave",
    data
  );
  return res.data;
};
export const editLeaveManager = async ({ id, ...data }) => {
  const res = await api.put(`manager/editleavem/${id}`, data);
  return res.data;
};

export const deleteLeaveManager = async (id) => {
  const res = await api.delete(`manager/deleteleavem/${id}`);
  return res.data;
};


export const forwardLeaveUpChain = async (data) => {
  const res = await api.post(
    "manager/forwardforwardedleavetoadmin",
    data
  );
  return res.data;
};