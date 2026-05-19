import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
    }
    return Promise.reject(err);
  }
);

export const getTicketStats = async () => {
  const res = await api.get("ticket/stats");
  return res.data;
};

export const getAllTickets = async (params = {}) => {
  const res = await api.get("ticket/all", { params });
  return res.data;
};

export const getTicketById = async (id) => {
  const res = await api.get(`ticket/${id}`);
  return res.data;
};

export const updateTicketStatus = async ({ id, data }) => {
  const res = await api.put(`ticket/${id}/update`, data);
  return res.data;
};

export const escalateTicket = async ({ id, data }) => {
  const res = await api.put(`ticket/${id}/escalate`, data);
  return res.data;
};

export const deleteTicket = async (id) => {
  const res = await api.delete(`ticket/${id}`);
  return res.data;
};