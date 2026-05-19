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

export const adminSubmitTicket = async (data) => {
  const res = await api.post("admin/submitticket", data);
  return res.data;
};

export const adminGetMyTickets = async () => {
  const res = await api.get("admin/getmytickets");
  return res.data;
};

export const adminRateTicket = async ({ ticketNumber, rating, feedback }) => {
  const res = await api.post(`admin/rateticket/${ticketNumber}`, {
    rating,
    feedback,
  });
  return res.data;
};