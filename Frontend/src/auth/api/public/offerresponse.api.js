import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/";

const api = axios.create({ baseURL });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong. Please try again";
    const err = new Error(message);
    err.status = error.response?.status;
    return Promise.reject(err);
  },
);

export const publicOfferPdfUrl = (token) => `${baseURL.replace(/\/$/, "")}/recruitment/public/offer/${token}/pdf`;

export const getPublicOffer = async (token) => {
  const res = await api.get(`recruitment/public/offer/${token}`);
  return res.data;
};

export const respondToOffer = async (token, data) => {
  const res = await api.post(`recruitment/public/offer/${token}`, data);
  return res.data;
};