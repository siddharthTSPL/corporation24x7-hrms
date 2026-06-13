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
  }
);

export const applyWFH = async (data) => {
  const res = await api.post("wfh/employee/applyWFH", data);
  return res.data;
};

export const editWFH = async (id, data) => {
  const res = await api.put(`wfh/employee/editWFH/${id}`, data);
  return res.data;
};

export const deleteWFH = async (id) => {
  const res = await api.delete(`wfh/employee/deleteWFH/${id}`);
  return res.data;
};

export const getMyWFH = async () => {
  const res = await api.get("wfh/employee/getMyWFH");
  return res.data;
};