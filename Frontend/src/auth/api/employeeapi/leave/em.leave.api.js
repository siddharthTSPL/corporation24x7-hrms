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

// Apply Leave
export const applyLeave = async (data) => {
  const res = await api.post("user/applyleave", data);
  return res.data;
};

// Get Current Leaves
export const getAllLeaves = async () => {
  const res = await api.get("user/getallleave");
  return res.data;
};

// Edit Leave
export const editLeave = async ({ id, ...data }) => {
  const res = await api.put(
    `user/editleave/${id}`,
    data
  );

  return res.data;
};

// Delete Leave
export const deleteLeave = async (id) => {
  const res = await api.delete(
    `user/deleteleave/${id}`
  );

  return res.data;
};

// Leave History
export const getAllLeaveHistory = async () => {
  const res = await api.get(
    "user/getallleavehistory"
  );

  return res.data;
};

// Attendance
export const getAttendance = async () => {
  const res = await api.get(
    "user/getattendance"
  );

  return res.data;
};