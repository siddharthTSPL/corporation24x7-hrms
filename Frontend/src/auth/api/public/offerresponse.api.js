import axios from "axios";

// Production build is served under /talent behind IIS, which proxies
// /talent/api/* to the backend. If VITE_API_URL is missing at build time the
// old fallback (http://localhost:5000/) made every candidate's browser call
// its own localhost, so the offer page never loaded / Accept-Reject did nothing.
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/talent/api" : "http://localhost:5000/");

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