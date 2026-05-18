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
  const res = await api.get("admin/getallemployee");
  return res.data;
};

export const getParticularEmployee = async (uid) => {
  const res = await api.get(`admin/getperticularemployee/${uid}`);
  return res.data;
};

export const deleteUser = async (uid) => {
  const res = await api.delete(`admin/deleteuser/${uid}`);
  return res.data;
};

export const editEmployee = async (uid, data) => {
  const res = await api.put(`admin/editemployee/${uid}`, data);
  return res.data;
};

export const getEmployeeStats = async () => {
  const res = await api.get("admin/noofemployee");
  return res.data;
};

export const reviewToManager = async (data) => {
  const res = await api.post("admin/reviewtomanager", data);
  return res.data;
};
export const getparticularEmployeeStats = async (uid) => {
  const res = await api.get(`admin/getperticularemployee/${uid}`);
  return res.data;
};

export const getParticularManager = async (uid) => {
  const res = await api.get(`admin/getperticularemanager/${uid}`);
  return res.data;
};

export const getTodayCheckins = async () => {
  const res = await api.get("admin/gettodaycheckins");
  return res.data;
};

export const getOrgInfo = async () => {
  const res = await api.get("admin/getorginfo");
  return res.data;
};