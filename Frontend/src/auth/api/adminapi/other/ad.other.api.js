import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) {
      return Promise.reject(null);
    }
    return Promise.reject(new Error(message));
  },
);

export const getAllEmployee = async () => {
  const res = await api.get("/admin/getallemployee");
  return res.data;
};

export const getParticularEmployee = async (id) => {
  const res = await api.get(`/admin/getperticularemployee/${id}`);
  return res.data;
};

export const getParticularManager = async (id) => {
  const res = await api.get(`/admin/getperticularemanager/${id}`);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/admin/deleteuser/${id}`);
  return res.data;
};

export const editEmployee = async (id, data) => {
  const res = await api.put(`/admin/editemployee/${id}`, data);
  return res.data;
};

export const editManager = async (id, data) => {
  const res = await api.put(`/admin/editmanager/${id}`, data);
  return res.data;
};

export const promoteToManager = async (id, data) => {
  const res = await api.post(`/admin/employee/${id}/promote`, data);
  return res.data;
};

export const demoteToEmployee = async (id, data) => {
  const res = await api.post(`/admin/manager/${id}/demote`, data);
  return res.data;
};

export const changeManagerRole = async (id, data) => {
  const res = await api.put(`/admin/manager/${id}/role`, data);
  return res.data;
};

export const getEmployeeStats = async () => {
  const res = await api.get("/admin/noofemployee");
  return res.data;
};

export const reviewToManager = async (data) => {
  const res = await api.post("/admin/reviewtomanager", data);
  return res.data;
};

export const getparticularEmployeeStats = async (id) => {
  const res = await api.get(`/admin/getperticularemployee/${id}`);
  return res.data;
};

export const getTodayCheckins = async () => {
  const res = await api.get("/admin/gettodaycheckins");
  return res.data;
};

export const getOrgInfo = async () => {
  const res = await api.get("/admin/getorginfo");
  return res.data;
};

export const getTodayLeaves = async () => {
  const res = await api.get("/admin/showallleaves");
  return res.data;
};