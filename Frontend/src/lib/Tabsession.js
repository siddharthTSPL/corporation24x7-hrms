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

let everSignedIn = false;

// ---- per-tab "role" on top of localStorage ----
const nativeGet = Storage.prototype.getItem;
const nativeSet = Storage.prototype.setItem;
const nativeRemove = Storage.prototype.removeItem;

const isRoleOnLocal = (store, key) => {
  try {
    return key === ROLE_KEY && store === window.localStorage;
  } catch {
    return false;
  }
};

Storage.prototype.getItem = function (key) {
  if (isRoleOnLocal(this, key)) {
    try {
      const mine = nativeGet.call(window.sessionStorage, ROLE_KEY);
      if (mine !== null) return mine;
    } catch {
      void 0;
    }
  }
  return nativeGet.call(this, key);
};
Storage.prototype.setItem = function (key, value) {
  if (isRoleOnLocal(this, key)) {
    everSignedIn = true;
    try {
      nativeSet.call(window.sessionStorage, ROLE_KEY, value);
    } catch {
      void 0;
    }
  }
  return nativeSet.call(this, key, value);
};
Storage.prototype.removeItem = function (key) {
  if (isRoleOnLocal(this, key)) {
    try {
      nativeRemove.call(window.sessionStorage, ROLE_KEY);
    } catch {
      void 0;
    }
  }
  return nativeRemove.call(this, key);
};

// ---- login / logout sync across tabs AND apps (Talent, Convs, Peple share one origin) ----
// Logout in any tab/app -> every other tab/app of this browser signs out right away.
// Login in any tab/app  -> other tabs that are waiting on a sign-in screen pick it up.
// (Cookie is shared by all three apps; this just makes the screens follow it live.)
// Apps can listen:  window.addEventListener("torchx:auth", (e) => e.detail.type === "logout" ...)
// and call e.preventDefault() when they handled it themselves. If nobody does, a tab that was
// signed in simply reloads, which lands it on the login page.
const AUTH_EVENT_KEY = "torchx_auth_event";
const TAB_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
let authChannel = null;
try {
  authChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("torchx-auth") : null;
} catch {
  authChannel = null;
}
const seenAuthEvents = new Set();

const looksSignedIn = () => {
  try {
    return !!getTabToken() || !!nativeGet.call(window.localStorage, ROLE_KEY) || !!nativeGet.call(window.sessionStorage, ROLE_KEY);
  } catch {
    return false;
  }
};
// True once this tab has had a session (guests / public pages never flip it, so they are never reloaded).
everSignedIn = looksSignedIn();

const announceAuth = (type) => {
  const msg = { id: `${TAB_ID}:${Date.now()}:${type}`, type, from: TAB_ID, at: Date.now() };
  try {
    if (authChannel) authChannel.postMessage(msg);
  } catch {
    /* ignore */
  }
  try {
    nativeSet.call(window.localStorage, AUTH_EVENT_KEY, JSON.stringify(msg)); // unique value -> "storage" always fires elsewhere
  } catch {
    /* storage blocked */
  }
};

const onAuthEvent = (msg) => {
  if (!msg || !msg.id || msg.from === TAB_ID || seenAuthEvents.has(msg.id)) return;
  seenAuthEvents.add(msg.id);
  if (Date.now() - (msg.at || 0) > 20000) return; // stale
  if (msg.type === "logout") {
    const wasSignedIn = everSignedIn || looksSignedIn();
    clearTabSession();
    try {
      nativeRemove.call(window.localStorage, ROLE_KEY);
    } catch {
      /* ignore */
    }
    everSignedIn = false;
    const handled = !window.dispatchEvent(new CustomEvent("torchx:auth", { detail: { type: "logout" }, cancelable: true }));
    if (!handled && wasSignedIn && !/\/(login|sso-callback)\/?$/i.test(window.location.pathname)) window.location.reload();
  } else if (msg.type === "login") {
    window.dispatchEvent(new CustomEvent("torchx:auth", { detail: { type: "login" } }));
  }
};

if (authChannel) authChannel.onmessage = (e) => onAuthEvent(e.data);
window.addEventListener("storage", (e) => {
  if (e.key !== AUTH_EVENT_KEY || !e.newValue) return;
  try {
    onAuthEvent(JSON.parse(e.newValue));
  } catch {
    /* ignore */
  }
});

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
  if (isApiUrl(url) && !/\/socket\.io\//.test(url)) {
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
        if (/\/logout(\?|$)/.test(url) && ((this.status >= 200 && this.status < 300) || this.status === 401)) {
          clearTabSession();
          everSignedIn = false;
          announceAuth("logout"); // sign out every other tab / app (Talent, Convs, Peple)
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
          if (data && data.success !== false && typeof data.token === "string" && data.role) {
            setTabToken(data.token);
            everSignedIn = true;
            announceAuth("login"); // tabs waiting on a sign-in screen can continue
          }
        }
      } catch {
        /* not JSON - ignore */
      }
    });
  }
  return xhrSend.call(this, body);
};