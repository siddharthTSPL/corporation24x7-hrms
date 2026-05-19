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

export const employeeSubmitTicket = async (data) => {
  const res = await api.post("user/submitTicket", data);
  return res.data;
};

export const employeeGetMyTickets = async () => {
  const res = await api.get("user/getMyTickets");
  return res.data;
};

export const employeeGetTicketDetail = async (ticketNumber) => {
  const res = await api.get(`employee/getTicketDetail/${ticketNumber}`);
  return res.data;
};

export const employeeRateTicket = async ({
  ticketNumber,
  rating,
  feedback,
}) => {
  const res = await api.post(
    `user/rateTicket/${ticketNumber}`,
    {
      rating,
      feedback,
    }
  );

  return res.data;
};