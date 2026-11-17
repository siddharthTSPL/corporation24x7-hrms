// DPDP gate. Import this right after ./lib/Tabsession in main.jsx.
// - sends the unlock token (X-Dpdp-Token) with every API call made through axios
// - when the server answers 423 DPDP_PIN_REQUIRED, opens the PIN popup, and on
//   success replays the original request, so every document screen works unchanged.
import axios from "axios";

const KEY = "dpdp_token";
const EXP = "dpdp_exp";
export const API = import.meta.env.VITE_API_URL || "http://localhost:5000/";

export const getDpdpToken = () => {
  try {
    const exp = Number(sessionStorage.getItem(EXP) || 0);
    if (exp && Date.now() > exp) {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(EXP);
      return null;
    }
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export const getDpdpExpiry = () => Number(sessionStorage.getItem(EXP) || 0) || null;
export const setDpdpToken = (token, minutes) => {
  try {
    if (token) {
      sessionStorage.setItem(KEY, token);
      sessionStorage.setItem(EXP, String(Date.now() + minutes * 60000));
    } else {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(EXP);
    }
  } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent("dpdp:changed"));
};

let pending = null;
export const requestPin = () => {
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    window.dispatchEvent(new CustomEvent("dpdp:pin-required", { detail: { resolve, reject } }));
  }).finally(() => { pending = null; });
  return pending;
};

const attach = (instance) => {
  instance.interceptors.request.use((cfg) => {
    const t = getDpdpToken();
    if (t) {
      cfg.headers = cfg.headers || {};
      if (typeof cfg.headers.set === "function") cfg.headers.set("X-Dpdp-Token", t);
      else cfg.headers["X-Dpdp-Token"] = t;
    }
    return cfg;
  });
  instance.interceptors.response.use(
    (r) => r,
    async (err) => {
      const cfg = err?.config;
      const d = err?.response?.data;
      if (err?.response?.status === 423 && d?.code === "DPDP_PIN_REQUIRED" && cfg && !cfg.__dpdpRetried) {
        cfg.__dpdpRetried = true;
        try {
          await requestPin();
          return instance.request(cfg);
        } catch {
          return Promise.reject(err);
        }
      }
      return Promise.reject(err);
    },
  );
};

if (!axios.__dpdpPatched) {
  axios.__dpdpPatched = true;
  const origCreate = axios.create.bind(axios);
  axios.create = (...args) => {
    const inst = origCreate(...args);
    attach(inst);
    return inst;
  };
  attach(axios);
}

// Client for the DPDP endpoints themselves. Their errors are 400/401/429, never 423, so no popup loop.
export const dpdpHttp = axios.create({ baseURL: API, withCredentials: true });
