import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/";

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// Full-page navigation target (the provider redirects the whole browser,
// so this is a URL, not an XHR).
export const ssoStartUrl = (provider, { silent = false } = {}) =>
  `${API_BASE.replace(/\/+$/, "")}/auth/sso/${provider}/start${silent ? "?silent=1" : ""}`;

export const getSsoProviders = async () => (await api.get("auth/sso/providers")).data;

export const exchangeSsoTicket = async (ticket) =>
  (await api.post("auth/sso/exchange", { ticket })).data;

// SuperAdmin settings
export const getSsoSettings = async () => (await api.get("auth/sso/settings")).data;
export const updateSsoSettings = async (payload) => (await api.patch("auth/sso/settings", payload)).data;