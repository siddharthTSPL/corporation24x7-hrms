// Per-TAB login session.
//
// The server sets ONE "token" cookie and the app keeps "role" in localStorage, and
// both are shared by every tab of a browser: logging in as B in a second tab silently
// turns the first tab into B too (chat arrives only after refresh, calls never ring).
//
// This module gives each tab its own identity, without touching any API file:
//   - login responses ({ success, role, token }) are captured into sessionStorage
//   - every XHR to our API gets the tab's token in the X-Tab-Token header
//     (the server prefers it over the cookie)
//   - localStorage "role" is read/written per tab
//   - the socket reads the same token (see realtime/socket.js)
// If a tab has no session of its own it behaves exactly as before (cookie).
//
// Import this FIRST in main.jsx.

const TOKEN_KEY = "tab_token";
const ROLE_KEY = "role";

export const getTabToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

const setTabToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked */
  }
};

export const clearTabSession = () => {
  setTabToken(null);
  try {
    sessionStorage.removeItem(ROLE_KEY);
  } catch {
    /* ignore */
  }
};

// ---- per-tab "role" on top of localStorage ----
const nativeGet = Storage.prototype.getItem;
const nativeSet = Storage.prototype.setItem;
const nativeRemove = Storage.prototype.removeItem;

Storage.prototype.getItem = function (key) {
  if (this === window.localStorage && key === ROLE_KEY) {
    const mine = nativeGet.call(window.sessionStorage, ROLE_KEY);
    if (mine !== null) return mine;
  }
  return nativeGet.call(this, key);
};
Storage.prototype.setItem = function (key, value) {
  if (this === window.localStorage && key === ROLE_KEY) nativeSet.call(window.sessionStorage, ROLE_KEY, value);
  return nativeSet.call(this, key, value);
};
Storage.prototype.removeItem = function (key) {
  if (this === window.localStorage && key === ROLE_KEY) nativeRemove.call(window.sessionStorage, ROLE_KEY);
  return nativeRemove.call(this, key);
};

// ---- XHR (axios) hook ----
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/";
const apiPrefix = (() => {
  try {
    const u = new URL(API_URL, window.location.origin);
    return u.origin + u.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
})();

const isApiUrl = (url) => {
  if (!apiPrefix) return false;
  try {
    return new URL(url, window.location.href).href.startsWith(apiPrefix);
  } catch {
    return false;
  }
};

const xhrOpen = XMLHttpRequest.prototype.open;
const xhrSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this.__tabUrl = String(url);
  return xhrOpen.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function (body) {
  const url = this.__tabUrl || "";
  if (isApiUrl(url)) {
    const token = getTabToken();
    if (token) {
      try {
        this.setRequestHeader("X-Tab-Token", token);
      } catch {
        /* ignore */
      }
    }
    this.addEventListener("load", () => {
      try {
        // logout: forget this tab's session
        if (/\/logout(\?|$)/.test(url) && this.status >= 200 && this.status < 300) {
          clearTabSession();
          return;
        }
        // our token is no longer valid: fall back to the cookie instead of looping on a dead token
        if (this.status === 401 && token) {
          if (getTabToken() === token) setTabToken(null);
          return;
        }
        // login-type response: { success, role, token }
        if (this.status >= 200 && this.status < 300 && typeof this.responseText === "string" && this.responseText.includes('"token"')) {
          const data = JSON.parse(this.responseText);
          if (data && data.success !== false && typeof data.token === "string" && data.role) setTabToken(data.token);
        }
      } catch {
        /* not JSON - ignore */
      }
    });
  }
  return xhrSend.call(this, body);
};