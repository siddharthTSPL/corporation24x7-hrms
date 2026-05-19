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

export const managerSubmitTicket = async (data) => {
  const res = await api.post("manager/submit-ticket", data);
  return res.data;
};

export const managerGetMyTickets = async () => {
  const res = await api.get("manager/my-tickets");
  return res.data;
};

export const managerRateTicket = async ({ ticketNumber, rating, feedback }) => {
  const res = await api.post(`manager/rate-ticket/${ticketNumber}`, {
    rating,
    feedback,
  });
  return res.data;
};

export const managerGetTicketDetail = async (ticketNumber) => {
  const res = await api.get(`manager/getTicketDetail/${ticketNumber}`);
  return res.data;
};