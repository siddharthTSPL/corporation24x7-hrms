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

let canUnlockFlag = null;
export const setDpdpCanUnlock = (v) => { canUnlockFlag = v; };

const digitsOf = (v) => String(v ?? "").replace(/\D/g, "");
const tailMask = (v, keep = 4) => {
  const s = String(v ?? "");
  if (s.length <= keep) return "X".repeat(s.length);
  return "X".repeat(s.length - keep) + s.slice(-keep);
};
const MASKERS = {
  aadhaar_number: (v) => (digitsOf(v).length < 5 ? tailMask(v) : `XXXX XXXX ${digitsOf(v).slice(-4)}`),
  pan_number: (v) => {
    const s = String(v ?? "").toUpperCase();
    return s.length === 10 ? `XXXXX${s.slice(5, 9)}X` : tailMask(s);
  },
  account_number: (v) => tailMask(v, 4),
  ifsc_code: (v) => {
    const s = String(v ?? "");
    return s.length > 4 ? s.slice(0, 4) + "X".repeat(s.length - 4) : tailMask(s, 0);
  },
  personal_contact: (v) => tailMask(String(v ?? "").replace(/\s+/g, ""), 4),
  e_contact: (v) => tailMask(String(v ?? "").replace(/\s+/g, ""), 4),
};
const looksMasked = (v) => typeof v === "string" && /[X*•]{3,}/.test(v);

const maskDeep = (node) => {
  if (Array.isArray(node)) return node.map(maskDeep);
  if (!node || typeof node !== "object" || Object.prototype.toString.call(node) !== "[object Object]") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (MASKERS[k] && (typeof v === "string" || typeof v === "number") && v !== "" && !looksMasked(v)) out[k] = MASKERS[k](v);
    else out[k] = maskDeep(v);
  }
  return out;
};

const stripMasked = (body) => {
  if (!body || Object.prototype.toString.call(body) !== "[object Object]") return;
  for (const k of Object.keys(MASKERS)) if (looksMasked(body[k])) delete body[k];
};

const shouldMask = (cfg) => {
  if (getDpdpToken() || canUnlockFlag === false) return false;
  if (cfg?.responseType && cfg.responseType !== "json") return false;
  return !String(cfg?.url || "").includes("dpdp/");
};

const attach = (instance) => {
  instance.interceptors.request.use((cfg) => {
    if (cfg.data && !String(cfg.url || "").includes("dpdp/")) stripMasked(cfg.data);
    const t = getDpdpToken();
    if (t) {
      cfg.headers = cfg.headers || {};
      if (typeof cfg.headers.set === "function") cfg.headers.set("X-Dpdp-Token", t);
      else cfg.headers["X-Dpdp-Token"] = t;
    }
    return cfg;
  });
  instance.interceptors.response.use(
    (r) => {
      if (r?.data && typeof r.data === "object" && shouldMask(r.config)) r.data = maskDeep(r.data);
      return r;
    },
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