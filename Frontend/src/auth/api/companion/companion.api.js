import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// Called from an already logged-in browser to mint a short-lived link that
// signs you in on a different browser too (so activity ping/active-time
// tracking works there as well, without retyping the password).
export const getCompanionLink = async () => {
  const res = await api.get("auth/companion-link");
  return res.data; // { success, link, token, expiresInMinutes }
};

// Called from the OTHER browser (the one that has no session yet) after
// opening the companion link. Sets a normal session cookie on THIS browser.
export const redeemCompanionLink = async (token) => {
  const res = await api.post("auth/companion-login", { token });
  return res.data; // { success, message, role, accountType }
};