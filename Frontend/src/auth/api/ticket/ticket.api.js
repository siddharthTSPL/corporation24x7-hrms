import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const submitTicket = (data) =>
  api.post("ticket/submit", data).then((r) => r.data);
export const getMyTickets = () =>
  api.get("ticket/my-tickets").then((r) => r.data);
export const rateTicket = (ticketNumber, data) =>
  api.post(`ticket/rate/${ticketNumber}`, data).then((r) => r.data);

export const getTicketStats = () =>
  api.get("ticket/superadmin/stats").then((r) => r.data);
export const getAllTickets = (params = {}) =>
  api.get("ticket/superadmin/all", { params }).then((r) => r.data);
export const getTicketById = (id) =>
  api.get(`ticket/superadmin/${id}`).then((r) => r.data);
export const updateTicketStatus = (id, data) =>
  api.put(`ticket/superadmin/${id}/update`, data).then((r) => r.data);
export const escalateTicket = (id, data) =>
  api.put(`ticket/superadmin/${id}/escalate`, data).then((r) => r.data);
export const deleteTicket = (id) =>
  api.delete(`ticket/superadmin/${id}`).then((r) => r.data);
