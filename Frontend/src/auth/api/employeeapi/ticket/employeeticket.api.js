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
  const res = await api.post("employee/submitticket", data);
  return res.data;
};

export const employeeGetMyTickets = async () => {
  const res = await api.get("employee/getmytickets");
  return res.data;
};


export const employeeRateTicket = async ({
  ticketNumber,
  rating,
  feedback,
}) => {
  const res = await api.post(
    `employee/rateticket/${ticketNumber}`,
    {
      rating,
      feedback,
    }
  );

  return res.data;
};