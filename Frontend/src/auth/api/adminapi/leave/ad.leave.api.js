import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) return Promise.reject(null);
    return Promise.reject(new Error(message));
  }
);

export const getAllLeaves = async () => {
  const res = await api.get("admin/showallleaves");
  return res.data;
};


export const acceptLeave = async ({ id, leaveFor }) => {
  if (!id) throw new Error("Leave ID is required");
  if (!leaveFor) throw new Error("leaveFor is required");

  const res = await api.put(
    `/admin/acceptleave/${id}?leaveFor=${leaveFor}`
  );

  return res.data;
};

export const rejectLeave = async ({ id, leaveFor }) => {
  if (!id) throw new Error("Leave ID is required");
  if (!leaveFor) throw new Error("leaveFor is required");

  const res = await api.put(
    `/admin/rejectleave/${id}?leaveFor=${leaveFor}`
  );

  return res.data;
};

export const applyleave = async (data) => {
  const res = await api.post("admin/applyleave", data);
  return res.data;
};

export const editMyLeave = async ({ id, ...data }) => {
  const res = await api.put(`admin/editleave/${id}`, data);
  return res.data;
};

export const deleteMyLeave = async (id) => {
  const res = await api.delete(`admin/deleteleave/${id}`);
  return res.data;
};


export const getLeavehistory = async (id) => {
  const res = await api.get(`admin/getmyleavehistory`);
  return res.data;
}