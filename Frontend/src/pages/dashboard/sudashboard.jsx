import React, { useEffect, useState, useRef } from "react";
import {
  FaUsers, FaClock, FaCalendarAlt, FaBullhorn,
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck,
  FaMapMarkerAlt, FaChevronRight, FaBan, FaStar,
  FaUserShield, FaCheckCircle, FaChartBar, FaLayerGroup,
  FaUserCog, FaAngleDown, FaSearch,
} from "react-icons/fa";

import { useGetMeSuperAdmin } from "../../auth/server-state/superadmin/auth/suauth.hook";
import {
  useGetTodayCheckins, useGetNoOfEmployees, useGetAllEmployees,
  useDeleteEmployee, useAddEmployee, useAddManager, useEditEmployee,
} from "../../auth/server-state/superadmin/other/suother.hook";
import { useShowAllLeaves, useAcceptLeaveByAdmin, useRejectLeaveByAdmin } from "../../auth/server-state/superadmin/leave/suleave.hook";
import { useGetAllAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "../../auth/server-state/superadmin/announcement/suannouncement.hook";
import { useGetAllAdmins, useCreateAdmin, useUpdateAdmin, useDeleteAdmin, useReviewToAdmin } from "../../auth/server-state/superadmin/other/suother.hook";
import { FiEye, FiEyeOff } from "react-icons/fi";

const useStyles = () => {
  useEffect(() => {
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(font);

    const style = document.createElement("style");
    style.id = "sa-dash-styles";
    style.textContent = `
  /* ─── CSS Variables & Reset ─────────────────────────────────────── */
:root {
  --ink: #0d0209; --p: #730042; --p-dark: #4a0029; --p-deep: #2a0017;
  --p-mid: #9e0058; --p-light: #cd166e; --p-wash: #f7ecf3; --p-pale: #fdf5f9;
  --border: #e8d5e2; --surface: #ffffff; --muted: #7a5568; --light: #c499b4;
  --green: #0d9e6e; --red: #d93025; --gold: #b8760a; --amber: #f59e0b;
  --blue: #2563eb; --sh: 0 4px 16px rgba(115,0,66,.06);
  --sh-lg: 0 16px 48px rgba(115,0,66,.12); --r: 16px; --r-sm: 10px;

  /* Responsive Spacing */
  --pad-x: 16px;
  --pad-y: 16px;
  --gap: 16px;
}

/* Tablet */
@media(min-width:768px) {
  :root { --pad-x: 28px; --pad-y: 24px; --gap: 20px; }
}
/* Laptop/Desktop */
@media(min-width:1280px) {
  :root { --pad-x: 40px; --pad-y: 32px; --gap: 24px; }
}

*, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

/* ─── Root Shell (Full Page App Layout) ─────────────────────────── */
.sa {
  background: var(--p-pale);
  height: 100vh; /* Fixed viewport height */
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent body scroll */
  font-family: 'DM Sans', sans-serif;
  color: var(--ink);
}

/* The main scrollable area */
.sa-body {
  flex: 1;
  overflow-y: auto; /* Internal scrolling only */
  overflow-x: hidden;
  padding: var(--pad-y) var(--pad-x);
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  
  /* Smooth scrolling */
  scroll-behavior: smooth;
}

/* ─── Hero Banner ───────────────────────────────────────────────── */
.sa-hero {
  background: linear-gradient(135deg, var(--p-deep) 0%, var(--p-dark) 35%, var(--p) 65%, var(--p-light) 100%);
  border-radius: 0 0 var(--r) var(--r); /* Rounded only bottom */
  padding: clamp(24px, 5vw, 48px) clamp(16px, 4vw, 48px);
  position: relative;
  overflow: hidden;
  box-shadow: var(--sh-lg);
  flex-shrink: 0; /* Never shrink */
  margin-bottom: 0; /* Gap handled by flex container */
  z-index: 10;
}

/* Background blobs */
.sa-hero::before {
  content:''; position:absolute; width:clamp(300px, 50vw, 600px); height:clamp(300px, 50vw, 600px);
  border-radius:50%; top:-40%; right:-10%;
  background:rgba(255,255,255,.06); pointer-events:none;
}
.sa-hero::after {
  content:''; position:absolute; width:clamp(200px, 30vw, 400px); height:clamp(200px, 30vw, 400px);
  border-radius:50%; bottom:-30%; left:40%;
  background:rgba(255,255,255,.04); pointer-events:none;
}

.sa-hero-content {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; gap: 16px;
}

.sa-hero-badge {
  display:inline-flex; align-items:center; gap:8px;
  background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3);
  border-radius:99px; padding:6px 16px;
  font-size:11px; color:rgba(255,255,255,.95);
  letter-spacing:1px; font-weight:700; text-transform:uppercase; width: fit-content;
}
.sa-hero-badge-dot {
  width:8px; height:8px; border-radius:50%;
  background:#4ade80; box-shadow:0 0 8px #4ade80; animation: lp 2s infinite;
}
@keyframes lp { 0%,100%{opacity:1} 50%{opacity:.5} }

.sa-hero-title {
  font-family:'Playfair Display',serif;
  font-size:clamp(24px, 5vw, 44px);
  color:#fff; margin:0; font-weight:800;
  line-height:1.1; letter-spacing:-1px;
  max-width: 800px;
}
.sa-hero-sub {
  font-size:clamp(13px, 1.8vw, 15px);
  color:rgba(255,255,255,.85); font-weight:400;
  max-width: 600px; line-height: 1.6;
}

.sa-hero-chips {
  display:flex; gap:10px; flex-wrap:wrap;
}
.sa-chip {
  background:rgba(255,255,255,.2); border:1px solid rgba(255,255,255,.3);
  border-radius:99px; padding:6px 14px;
  font-size:clamp(11px, 1.2vw, 13px); color:rgba(255,255,255,.95);
  font-weight:600; backdrop-filter:blur(4px);
}

.sa-hero-actions {
  display:flex; gap:12px; flex-wrap:wrap; margin-top: 8px;
}

/* ─── Stats Grid (Strict Breakpoints) ──────────────────────────── */
.sa-stats {
  display: grid;
  gap: var(--gap);
  /* Default Mobile: 1 col */
  grid-template-columns: 1fr;
}

/* Small Mobile > 380px */
@media(min-width: 381px) { .sa-stats { grid-template-columns: repeat(2, 1fr); } }

/* Tablet > 768px */
@media(min-width: 769px) { .sa-stats { grid-template-columns: repeat(3, 1fr); } }

/* Laptop > 1024px */
@media(min-width: 1025px) { .sa-stats { grid-template-columns: repeat(5, 1fr); } }

.sa-stat {
  background:var(--surface); border-radius:var(--r);
  border:1px solid var(--border); padding:20px; box-shadow:var(--sh);
  display: flex; flex-direction: column; justify-content: space-between;
  transition: transform .2s;
}
.sa-stat:hover { transform: translateY(-4px); box-shadow: var(--sh-lg); }

.sa-stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.sa-stat-icon {
  width:42px; height:42px; border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  font-size:16px; background: var(--p-wash); color: var(--p);
}
.sa-stat-lbl {
  font-size:11px; font-weight:700; letter-spacing:.8px;
  text-transform:uppercase; color:var(--muted);
}
.sa-stat-val {
  font-family:'Playfair Display',serif;
  font-size:clamp(28px, 5vw, 38px);
  line-height:1; color:var(--ink); font-weight:800; margin: 4px 0;
}
.sa-stat-sub { font-size:12px; color:var(--muted); font-weight: 500; display: flex; align-items: center; gap: 6px; }
.sa-stat-bar {
  height:4px; background:var(--border); border-radius:99px;
  margin-top:12px; overflow:hidden;
}
.sa-stat-fill { height:100%; border-radius:99px; background: var(--p); }

/* ─── Generic Panel (Unified Structure) ───────────────────────────── */
.sa-panel {
  background:var(--surface); border-radius:var(--r);
  border:1px solid var(--border); box-shadow:var(--sh);
  display: flex; flex-direction: column;
  overflow: hidden; 
  /* Ensure panels fill grid height for "Full Page" look */
  min-height: 300px; 
}

.sa-panel-head {
  padding:16px 20px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; flex-wrap:wrap; background: #fff; flex-shrink: 0;
}
.sa-panel-title {
  font-family:'Playfair Display',serif;
  font-size:clamp(16px, 2vw, 18px);
  font-weight:700; color:var(--ink);
  display:flex; align-items:center; gap:8px;
}

/* Scrollable Content within Panel */
.sa-panel-body {
  flex: 1; /* Fills remaining height */
  overflow-y: auto;
  position: relative;
  min-height: 0; /* Crucial for Flexbox scrolling */
}
.sa-panel-body::-webkit-scrollbar { width: 6px; }
.sa-panel-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

/* ─── Mid Grid (Map & Dept) ─────────────────────────────────────── */
.sa-mid-grid {
  display: grid;
  gap: var(--gap);
  grid-template-columns: 1fr;
  min-height: 400px; /* Minimum height for structure */
}

/* Tablet and up: Map on left, Dept on right */
@media(min-width: 1025px) {
  .sa-mid-grid {
    grid-template-columns: 2fr 1fr; /* 2/3 and 1/3 split */
    align-items: stretch; /* Force equal height */
  }
}

/* ─── Lower Grid (Leaves & Ann) ─────────────────────────────────── */
.sa-lower-grid {
  display: grid;
  gap: var(--gap);
  grid-template-columns: 1fr;
  min-height: 350px;
}
@media(min-width: 1025px) {
  .sa-lower-grid {
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
  }
}

/* ─── Attendance Map ─────────────────────────────────────────────── */
.sa-map-wrap { 
  flex: 1; 
  min-height: 300px; 
  background: #e5e5e5;
  position: relative;
}
.sa-map-foot {
  padding:12px 20px; background:var(--p-wash);
  border-top:1px solid var(--border);
  display:flex; gap:16px; align-items:center; flex-wrap:wrap; flex-shrink: 0;
}

/* ─── Lists & Cards (Responsive Items) ───────────────────────────── */
.sa-list-item {
  padding:14px 20px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; gap:12px; transition:background .15s;
  min-width: 0;
}
.sa-list-item:hover { background:var(--p-pale); }
.sa-list-item:last-child { border-bottom:none; }

.sa-avatar {
  width:40px; height:40px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; color:white; flex-shrink: 0;
}
.sa-meta { flex:1; min-width:0; }
.sa-name { font-size:14px; font-weight:700; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sa-sub { font-size:12px; color:var(--muted); margin-top:2px; }

/* ─── Buttons (Touch Friendly 44px+) ─────────────────────────────── */
.sa-btn-p {
  background:var(--p); color:white; border:none;
  padding:0 20px; border-radius:var(--r-sm);
  font-size:13px; font-weight:600; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  font-family:'DM Sans',sans-serif; transition:all .2s;
  min-height: 44px; /* Touch target */
  white-space:nowrap;
}
.sa-btn-p:hover { background:var(--p-dark); transform:translateY(-1px); box-shadow:0 4px 12px rgba(115,0,66,.3); }

.sa-btn-ghost {
  background:transparent; color:var(--muted); border:1px solid var(--border);
  padding:0 16px; border-radius:var(--r-sm); font-size:13px;
  font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif;
  transition:all .2s; min-height: 44px; display: inline-flex; align-items:center; justify-content:center;
}
.sa-btn-ghost:hover { border-color:var(--p); color:var(--p); background: var(--p-pale); }

.sa-btn-sm {
  padding: 0 12px; min-height: 32px; font-size: 12px; border-radius: 6px;
}

/* ─── Inputs & Forms ────────────────────────────────────────────── */
.sa-search-wrap { width: 100%; max-width: 300px; }
.sa-search-inp {
  width:100%; padding:0 12px 0 36px;
  height: 44px; /* Touch friendly */
  background:var(--p-pale); border:1px solid var(--border);
  border-radius:var(--r-sm); font-size:14px; outline:none;
  transition: border-color .2s;
}
.sa-search-inp:focus { border-color:var(--p); box-shadow:0 0 0 3px var(--p-wash); }
.sa-search-ico { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--light); }

/* ─── Badges ────────────────────────────────────────────────────── */
.sa-badge {
  padding:4px 10px; border-radius:6px; font-size:10px; font-weight:700;
  text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;
}
.badge-urgent { background:#fee2e2; color:#ef4444; }
.badge-info { background:#e0f2fe; color:#0284c7; }
.badge-success { background:#dcfce7; color:#166534; }

/* ─── MODAL SYSTEM (Bottom Sheet on Mobile) ─────────────────────── */
.sa-overlay {
  position:fixed; inset:0; background:rgba(13,2,9,.7); backdrop-filter:blur(4px);
  z-index:2000; display:flex; align-items:center; justify-content:center;
  padding:20px; opacity:0; animation: fadeIn .2s forwards;
}
@keyframes fadeIn { to { opacity:1; } }

.sa-modal {
  background:var(--surface); border-radius:var(--r);
  width:100%; max-width:500px;
  max-height: 90vh;
  box-shadow:var(--sh-lg);
  display:flex; flex-direction:column;
  transform: scale(.95); animation: scaleUp .2s forwards;
}
@keyframes scaleUp { to { transform: scale(1); } }

.sa-modal-lg { max-width:600px; }

.sa-modal-header {
  padding:16px 20px; border-bottom:1px solid var(--border);
  display:flex; justify-content:space-between; align-items:center; flex-shrink:0;
}
.sa-modal-title { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:var(--ink); }

.sa-modal-body { padding:20px; overflow-y:auto; flex:1; }
.sa-modal-footer {
  padding:16px 20px; border-top:1px solid var(--border);
  display:flex; justify-content:flex-end; gap:10px; flex-shrink:0;
}

/* Mobile Bottom Sheet Behavior */
@media(max-width: 767px) {
  .sa-overlay {
    padding:0; align-items:flex-end; background:rgba(0,0,0,.5);
  }
  .sa-modal {
    border-radius:20px 20px 0 0; max-height:85vh;
    transform: translateY(100%); animation: slideUp .3s forwards;
  }
  @keyframes slideUp { to { transform: translateY(0); } }
  
  /* Full width inputs on mobile */
  .sa-fld { width: 100%; }
  .sa-form-row, .sa-form-row-3 { grid-template-columns: 1fr; gap: 12px; }
  
  /* Hero adjustments */
  .sa-hero-actions { width: 100%; }
  .sa-hero-actions button { flex: 1; justify-content: center; }
}

/* ─── Form Elements ─────────────────────────────────────────────── */
.sa-fld { margin-bottom: 14px; }
.sa-flbl { display:block; font-size:11px; font-weight:700; color:var(--muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
.sa-input, .sa-select, .sa-textarea {
  width:100%; padding:10px 12px; background:var(--p-pale);
  border:1px solid var(--border); border-radius:8px;
  font-family:'DM Sans',sans-serif; font-size:14px; color:var(--ink);
  transition: all .2s; min-height: 44px; /* Touch friendly */
}
.sa-input:focus, .sa-select:focus, .sa-textarea:focus {
  border-color:var(--p); outline:none; box-shadow:0 0 0 3px var(--p-wash);
}
.sa-textarea { min-height: 100px; resize: vertical; }

/* ─── Utilities ─────────────────────────────────────────────────── */
.text-truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.flex-between { display:flex; justify-content:space-between; align-items:center; }
.gap-2 { gap: 8px; }
.mt-2 { margin-top: 8px; }

/* Scrollbar hiding for clean look (optional) */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
    return () => {
      try { document.head.removeChild(font); } catch (_) {}
      const el = document.getElementById("sa-dash-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);
};

/* ─── Helpers (unchanged) ──────────────────────────────────────── */
const initials = (name = "") =>
  (name || "").trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
  catch { return d; }
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};

const ROLE_COLOR = { manager: "#730042", employee: "#a0005c" };

const leaveTypeColor = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("sick") || t === "sl") return "#0d9e6e";
  if (t.includes("earn") || t === "el") return "#730042";
  if (t.includes("priv") || t === "pl") return "#b8760a";
  if (t.includes("mat") || t === "ml") return "#7c3aed";
  if (t.includes("cas") || t === "cl") return "#2563eb";
  return "#730042";
};

const AVATAR_COLORS = ["#730042","#9e0058","#4a0029","#2563eb","#0d9e6e","#7c3aed","#b8760a","#d93025"];
const avaColor = (str = "") => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const DEPT_OPTIONS    = ["OPR", "BPO", "ENG", "HR", "MGMT"];
const OFFICE_OPTIONS  = ["Noida", "Bareilly", "Delhi", "Mumbai"];
const ROLE_OPTIONS    = ["admin", "senior_admin", "official"];
const ROLE_LABEL      = { admin: "Admin", senior_admin: "Senior Admin", official: "Official" };

/* ─── Attendance Map (unchanged logic, responsive container) ───── */
const AttendanceMap = ({ checkins = [], loading }) => {
  const mapRef  = useRef(null);
  const instRef = useRef(null);
  const markRef = useRef([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (instRef.current || !mapRef.current) return;
      if (!window.L) {
        await new Promise((res) => {
          const css = document.createElement("link");
          css.rel = "stylesheet";
          css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(css);
          const js = document.createElement("script");
          js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          js.onload = res;
          document.head.appendChild(js);
        });
      }
      if (!alive || !mapRef.current || instRef.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: false }).setView([22.5, 80.0], 5);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "© CARTO", maxZoom: 18 }).addTo(map);
      instRef.current = map;
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = instRef.current;
    if (!L || !map) return;
    markRef.current.forEach((m) => map.removeLayer(m));
    markRef.current = [];
    if (!checkins.length) return;
    const bounds = [];
    checkins.forEach(({ lat, lng, name, role, dept, email, checkIn, checkedOut }) => {
      if (!lat || !lng) return;
      const color = ROLE_COLOR[role?.toLowerCase()] ?? ROLE_COLOR.employee;
      const sz = role?.toLowerCase() === "manager" ? 16 : 12;
      const pulse = sz + 16;
      const inits = initials(name || "?");
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:${pulse}px;height:${pulse}px;">
          <div style="position:absolute;top:50%;left:50%;width:${pulse}px;height:${pulse}px;border-radius:50%;background:${color}33;animation:mPulse 2.2s infinite;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 10px ${color}66;${checkedOut ? "opacity:.45;" : ""}"></div>
        </div>`,
        iconSize: [pulse, pulse], iconAnchor: [pulse / 2, pulse / 2],
      });
      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`<div style="font-family:'DM Sans',sans-serif;padding:6px 4px;min-width:180px;">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${inits}</div>
            <div>
              <div style="font-weight:700;font-size:13px;color:${color};">${name || "Unknown"}</div>
              <div style="font-size:11px;color:#8a6070;text-transform:capitalize;">${role ?? ""}${dept ? " · " + dept : ""}</div>
            </div>
          </div>
          ${email ? `<div style="font-size:11px;color:#8a6070;margin-bottom:6px;">✉ ${email}</div>` : ""}
          <div style="font-size:11px;color:#333;">✅ <strong>Check-in:</strong> ${fmtTime(checkIn)}</div>
          ${checkedOut
            ? `<div style="font-size:11px;color:#0d9e6e;margin-top:3px;">🏁 Checked out</div>`
            : `<div style="font-size:11px;color:#b8760a;margin-top:3px;">🟡 On duty</div>`}
        </div>`, { closeButton: false, maxWidth: 230 })
        .addTo(map);
      markRef.current.push(marker);
      bounds.push([lat, lng]);
    });
    if (bounds.length) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 }); } catch (_) {}
    }
  }, [checkins]);

  useEffect(() => () => { if (instRef.current) { instRef.current.remove(); instRef.current = null; } }, []);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      {loading && (
        <div style={{ position:"absolute", inset:0, background:"rgba(253,245,249,.8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#8a6070", gap:8, zIndex:500 }}>
          <span style={{ fontSize: 18 }}>⏳</span> Fetching check-ins…
        </div>
      )}
      {!loading && checkins.length === 0 && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, zIndex:500, pointerEvents:"none" }}>
          <span style={{ fontSize: 32 }}>📍</span>
          <p style={{ fontSize: 13, color: "#8a6070", margin: 0 }}>No check-ins today</p>
        </div>
      )}
    </div>
  );
};

/* ─── Announcement Modal (unchanged logic) ──────────────────────── */
const AnnModal = ({ open, onClose, initial, onSave, loading }) => {
  const [form, setForm] = useState({ title: "", message: "", audience: "all", priority: "normal" });
  useEffect(() => {
    if (open) setForm({ title:"", message:"", audience:"all", priority:"normal", ...(initial || {}) });
  }, [open]);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="sa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal">
        <div className="sa-modal-hd">
          <h2 className="sa-modal-title">{initial ? "Edit Announcement" : "New Announcement"}</h2>
          <button className="sa-modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="sa-modal-bd">
          <div className="sa-fld">
            <label className="sa-flbl">Title</label>
            <input className="sa-finp" placeholder="Announcement title…" value={form.title} onChange={set("title")} />
          </div>
          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Audience</label>
              <select className="sa-fsel" value={form.audience} onChange={set("audience")}>
                <option value="all">All</option>
                <option value="admin">Admins</option>
                <option value="manager">Managers</option>
                <option value="employee">Employees</option>
              </select>
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Priority</label>
              <select className="sa-fsel" value={form.priority} onChange={set("priority")}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="sa-fld" style={{ marginBottom: 0 }}>
            <label className="sa-flbl">Message</label>
            <textarea className="sa-ftxt" placeholder="Write your announcement…" value={form.message} onChange={set("message")} />
          </div>
        </div>
        <div className="sa-modal-ft">
          <button className="sa-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sa-btn-p" onClick={() => onSave(form)} disabled={loading || !form.title}>
            <FaCheck style={{ fontSize: 10 }} /> {loading ? "Saving…" : initial ? "Update" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Countries list (unchanged) ───────────────────────────────── */
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)",
  "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
  "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal",
  "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
  "Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia",
  "Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan",
  "Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan",
  "Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

/* ─── Admin Modal (exact original) ─────────────────────────────── */
const AdminModal = ({ open, onClose, initial, onSave, loading }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validatePassword(form.password)) {
    alert(
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
    );
    return;
  }


};

  const validatePassword = (password) => passwordRegex.test(password);

  // All keys match backend field names exactly as destructured in createAdmin controller
  const blank = {
    f_name: "",
    l_name: "",
    work_email: "",
    password: "",
    confirmPassword: "",        // frontend-only validation field, stripped before submit
    gender: "",
    designation: "",
    department: "",
    office_location: "",
    personal_contact: "",
    e_contact: "",
    role: "admin",
    marital_status: "single",
    is_fresher: true,
    total_experience: 0,
    previous_company: "",
    previous_designation: "",
    aadhaar_number: "",
    pan_number: "",
    // Two UI fields combined into backend `address` on save
    residential_address: "",
    permanent_address: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    reporting_manager: "",
    reporting_manager_model: "",
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
  };

  const parseAddress = (raw = "") => {
    // Format stored: "Residential: <val> | Permanent: <val>"
    const resMatch = raw.match(/Residential:\s*(.*?)(?:\s*\|\s*Permanent:|$)/);
    const permMatch = raw.match(/Permanent:\s*(.*?)$/);
    return {
      residential_address: resMatch ? resMatch[1].trim() : raw,
      permanent_address: permMatch ? permMatch[1].trim() : "",
    };
  };

  const [form, setForm] = useState(blank);
  useEffect(() => {
    if (open) {
      if (initial) {
        const { address, ...rest } = initial;
        setForm({ ...blank, ...rest, ...parseAddress(address || ""), confirmPassword: "" });
      } else {
        setForm(blank);
      }
    }
  }, [open]);
  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  // Combine UI address fields → single backend `address`, strip frontend-only keys
  const handleSave = () => {
    const { confirmPassword, residential_address, permanent_address, ...rest } = form;
    const address = [
      residential_address ? `Residential: ${residential_address}` : "",
      permanent_address   ? `Permanent: ${permanent_address}`     : "",
    ].filter(Boolean).join(" | ");
    onSave({ ...rest, address });
  };

  const passwordsMatch = !form.confirmPassword || form.password === form.confirmPassword;
  const canSubmit =
    !loading &&
    form.f_name && form.l_name && form.work_email &&
    form.gender && form.designation && form.department &&
    form.office_location && form.personal_contact && form.e_contact &&
    (initial || (form.password && passwordsMatch));

  return (
    <div className="sa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal sa-modal-lg">
        <div className="sa-modal-hd">
          <h2 className="sa-modal-title">{initial ? "Edit Admin" : "Create Admin"}</h2>
          <button className="sa-modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="sa-modal-bd">

          {/* ── Basic Information ── */}
          <div className="sa-modal-section">Basic Information</div>
          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">First Name *</label>
              <input className="sa-finp" placeholder="First name" value={form.f_name} onChange={set("f_name")} />
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Last Name *</label>
              <input className="sa-finp" placeholder="Last name" value={form.l_name} onChange={set("l_name")} />
            </div>
          </div>

          <div className="sa-fld">
            <label className="sa-flbl">Work Email *</label>
            <input className="sa-finp" type="email" placeholder="admin@company.com" value={form.work_email} onChange={set("work_email")} disabled={!!initial} />
          </div>

          {/* Password fields — create only */}
         {/* Password fields — create only */}
{!initial && (
  <>
    <div className="sa-fld">
      <label className="sa-flbl">Password *</label>

      <div style={{ position: "relative" }}>
        <input
          className="sa-finp"
          type={showPassword ? "text" : "password"}
          placeholder="Enter Password"
          value={form.password}
          onChange={set("password")}
          style={{ paddingRight: "45px" }}
        />

        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          style={{
            position: "absolute",
            right: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            color: "#6b7280",
            zIndex: 1,
          }}
        >
          {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>

      {form.password && !validatePassword(form.password) && (
        <p
          style={{
            color: "#dc2626",
            fontSize: "12px",
            marginTop: "6px",
            lineHeight: "1.5",
          }}
        >
          Password must contain:
          <br />
          • 1 uppercase letter
          <br />
          • 1 lowercase letter
          <br />
          • 1 number
          <br />
          • 1 special character
          <br />
          • Minimum 8 characters
        </p>
      )}
    </div>

    <div className="sa-fld">
      <label className="sa-flbl">Confirm Password *</label>
<div
  style={{
    position: "relative",
    display: "flex",
    alignItems: "center",
  }}
>
  <input
    className="sa-finp"
    type={showPassword ? "text" : "password"}
    placeholder="Confirm Password"
    value={form.confirmPassword}
    onChange={set("confirmPassword")}
    style={{
      paddingRight: "45px",
      width: "100%",
      boxSizing: "border-box",
    }}
  />

  <button
    type="button"
    onClick={() => setShowPassword((v) => !v)}
    style={{
      position: "absolute",
      right: "14px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: 0,
      zIndex: 2,
    }}
  >
    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
  </button>
</div>
      {form.confirmPassword && !passwordsMatch && (
        <p
          style={{
            color: "#ef4444",
            fontSize: "13px",
            marginTop: "6px",
          }}
        >
          Passwords do not match
        </p>
      )}
    </div>
  </>
)}

          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Gender *</label>
              <select className="sa-fsel" value={form.gender} onChange={set("gender")}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Marital Status</label>
              <select className="sa-fsel" value={form.marital_status} onChange={set("marital_status")}>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>
          </div>

          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Personal Contact *</label>
              <input className="sa-finp" placeholder="Personal phone" value={form.personal_contact} onChange={set("personal_contact")} />
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Emergency Contact *</label>
              <input className="sa-finp" placeholder="Emergency phone" value={form.e_contact} onChange={set("e_contact")} />
            </div>
          </div>

          <div className="sa-modal-section">Work Details</div>
          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Designation *</label>
              <input className="sa-finp" placeholder="e.g. HR Manager" value={form.designation} onChange={set("designation")} />
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Role *</label>
              <select className="sa-fsel" value={form.role} onChange={set("role")}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
          </div>

          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Department *</label>
              <select className="sa-fsel" value={form.department} onChange={set("department")}>
                <option value="">Select department</option>
                {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Office Location *</label>
              <select className="sa-fsel" value={form.office_location} onChange={set("office_location")}>
                <option value="">Select location</option>
                {OFFICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="sa-modal-section">Experience</div>
          <div className="sa-form-row">
            <div className="sa-fld" style={{ display:"flex", alignItems:"center", gap:10, paddingTop:22 }}>
              <input type="checkbox" id="sa-fresher" checked={form.is_fresher} onChange={setCheck("is_fresher")} style={{ width:16, height:16, accentColor:"var(--p)" }} />
              <label htmlFor="sa-fresher" className="sa-flbl" style={{ margin:0, cursor:"pointer" }}>Is Fresher</label>
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Total Experience (yrs)</label>
              <input className="sa-finp" type="number" min="0" placeholder="0" value={form.total_experience} onChange={set("total_experience")} disabled={form.is_fresher} />
            </div>
          </div>

          {!form.is_fresher && (
            <div className="sa-form-row">
              <div className="sa-fld">
                <label className="sa-flbl">Previous Company</label>
                <input className="sa-finp" placeholder="Company name" value={form.previous_company} onChange={set("previous_company")} />
              </div>
              <div className="sa-fld">
                <label className="sa-flbl">Previous Designation</label>
                <input className="sa-finp" placeholder="Last role" value={form.previous_designation} onChange={set("previous_designation")} />
              </div>
            </div>
          )}

          <div className="sa-modal-section">Identity & Address</div>
          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Aadhaar Number</label>
              <input className="sa-finp" placeholder="xxxx xxxx xxxx" value={form.aadhaar_number} onChange={set("aadhaar_number")} />
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">PAN Number</label>
              <input className="sa-finp" placeholder="ABCDE1234F" value={form.pan_number} onChange={set("pan_number")} />
            </div>
          </div>

          <div className="sa-fld">
            <label className="sa-flbl">Residential Address</label>
            <input className="sa-finp" placeholder="Current / residential street, locality" value={form.residential_address} onChange={set("residential_address")} />
          </div>

          <div className="sa-fld">
            <label className="sa-flbl">Permanent Address</label>
            <input className="sa-finp" placeholder="Permanent / hometown address" value={form.permanent_address} onChange={set("permanent_address")} />
          </div>

          <div className="sa-form-row-3">
            <div className="sa-fld">
              <label className="sa-flbl">City</label>
              <input className="sa-finp" placeholder="City" value={form.city} onChange={set("city")} />
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">State</label>
              <input className="sa-finp" placeholder="State" value={form.state} onChange={set("state")} />
            </div>
            <div className="sa-fld" style={{ marginBottom:0 }}>
              <label className="sa-flbl">Pincode</label>
              <input className="sa-finp" placeholder="Pincode" value={form.pincode} onChange={set("pincode")} />
            </div>
          </div>

          <div className="sa-fld" style={{ marginBottom: 0 }}>
            <label className="sa-flbl">Country</label>
            <select className="sa-fsel" value={form.country} onChange={set("country")}>
              <option value="">Select country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="sa-modal-section">Banking Details <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, fontSize:10 }}>(optional)</span></div>
          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Bank Name</label>
              <input className="sa-finp" placeholder="e.g. HDFC Bank" value={form.bank_name} onChange={set("bank_name")} />
            </div>
            <div className="sa-fld">
              <label className="sa-flbl">Account Holder Name</label>
              <input className="sa-finp" placeholder="As per passbook" value={form.account_holder_name} onChange={set("account_holder_name")} />
            </div>
          </div>
          <div className="sa-form-row">
            <div className="sa-fld">
              <label className="sa-flbl">Account Number</label>
              <input className="sa-finp" placeholder="Account number" value={form.account_number} onChange={set("account_number")} />
            </div>
            <div className="sa-fld" style={{ marginBottom:0 }}>
              <label className="sa-flbl">IFSC Code</label>
              <input className="sa-finp" placeholder="IFSC code" value={form.ifsc_code} onChange={set("ifsc_code")} />
            </div>
          </div>

        </div>
        <div className="sa-modal-ft">
          <button className="sa-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sa-btn-p" onClick={handleSave} disabled={!canSubmit}>
            <FaCheck style={{ fontSize: 10 }} /> {loading ? "Saving…" : initial ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReviewModal = ({ open, onClose, admins, onSave, loading }) => {
  const [form, setForm] = useState({ adminid: "", rating: 0, comment: "" });
  useEffect(() => { if (open) setForm({ adminid: "", rating: 0, comment: "" }); }, [open]);
  if (!open) return null;
  return (
    <div className="sa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal">
        <div className="sa-modal-hd">
          <h2 className="sa-modal-title">Review Admin</h2>
          <button className="sa-modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="sa-modal-bd">
          <div className="sa-fld">
            <label className="sa-flbl">Select Admin</label>
            <select className="sa-fsel" value={form.adminid} onChange={(e) => setForm((f) => ({ ...f, adminid: e.target.value }))}>
              <option value="">Choose admin…</option>
              {admins.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.f_name} {a.l_name} – {a.designation} ({a.department})
                </option>
              ))}
            </select>
          </div>
          <div className="sa-fld">
            <label className="sa-flbl">Rating</label>
            <div className="sa-stars">
              {[1,2,3,4,5].map((n) => (
                <span key={n} className={`sa-star${form.rating >= n ? " active" : ""}`} onClick={() => setForm((f) => ({ ...f, rating: n }))}>★</span>
              ))}
            </div>
          </div>
          <div className="sa-fld" style={{ marginBottom: 0 }}>
            <label className="sa-flbl">Comment</label>
            <textarea className="sa-ftxt" placeholder="Write your review…" value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
          </div>
        </div>
        <div className="sa-modal-ft">
          <button className="sa-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sa-btn-p" onClick={() => onSave(form)} disabled={loading || !form.adminid || !form.rating || !form.comment}>
            <FaStar style={{ fontSize: 10 }} /> {loading ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

const roleBadgeClass = (role = "") => {
  if (role === "senior_admin") return "sa-badge sa-badge-role-senior";
  if (role === "official")     return "sa-badge sa-badge-role-official";
  return "sa-badge sa-badge-role-admin";
};

/* ─── Main Dashboard ────────────────────────────────────────────── */
function SuperAdminDashboard() {
  useStyles();

  const [greeting, setGreeting]   = useState("");
  const [thought,  setThought]    = useState("");
  const [annModal,   setAnnModal]   = useState({ open: false, editing: null });
  const [adminModal, setAdminModal] = useState({ open: false, editing: null });
  const [reviewModal, setReviewModal] = useState(false);
  const [leaveTab,  setLeaveTab]  = useState("employee");
  const [empExpand, setEmpExpand] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  const { data: meData }                             = useGetMeSuperAdmin();
  const { data: checkinData, isLoading: mapLoading } = useGetTodayCheckins();
  const { data: adminsData,  isLoading: adminsLoading } = useGetAllAdmins();
  const { data: empData,     isLoading: empLoading }    = useGetAllEmployees();
  const { data: deptData,    isLoading: deptLoading }   = useGetNoOfEmployees();
  const { data: leavesRaw,   isLoading: leaveLoading }  = useShowAllLeaves();
  const { data: annRaw,      isLoading: annLoading }    = useGetAllAnnouncements();

  const { mutate: createAnn,   isPending: creatingAnn }  = useCreateAnnouncement();
  const { mutate: updateAnn,   isPending: updatingAnn }  = useUpdateAnnouncement();
  const { mutate: deleteAnn }                            = useDeleteAnnouncement();
  const { mutate: createAdmin, isPending: creatingAdmin } = useCreateAdmin();
  const { mutate: updateAdmin, isPending: updatingAdmin } = useUpdateAdmin();
  const { mutate: deleteAdmin }                           = useDeleteAdmin();
  const { mutate: acceptLeave, isPending: accepting }    = useAcceptLeaveByAdmin();
  const { mutate: rejectLeave, isPending: rejecting }    = useRejectLeaveByAdmin();
  const { mutate: reviewAdmin, isPending: reviewing }    = useReviewToAdmin();

  const superAdmin    = meData?.superAdmin || meData || {};
  const checkins      = checkinData?.checkins ?? [];
  const presentToday  = checkinData?.total ?? checkins.length;
  const stillOnDuty   = checkins.filter((c) => !c.checkedOut).length;
  const admins        = Array.isArray(adminsData?.admins) ? adminsData.admins : Array.isArray(adminsData) ? adminsData : [];
  const employees     = Array.isArray(empData?.users) ? empData.users : Array.isArray(empData) ? empData : [];
  const departments   = Array.isArray(deptData?.departments) ? deptData.departments : [];
  const totalEmpCount = deptData?.totalEmployees ?? employees.length;
  const announcements = Array.isArray(annRaw?.announcements) ? annRaw.announcements : Array.isArray(annRaw) ? annRaw : [];
  const empLeaves     = Array.isArray(leavesRaw?.employeeLeaves?.leaves) ? leavesRaw.employeeLeaves.leaves : [];
  const adminLeaves   = Array.isArray(leavesRaw?.adminLeaves?.leaves)    ? leavesRaw.adminLeaves.leaves    : [];
  const activeLeaves  = leaveTab === "employee" ? empLeaves : adminLeaves;

  const pendingLeaves =
    empLeaves.filter((l) => { const s = (l.status||"").toLowerCase(); return s.includes("forwarded")||s.includes("pending"); }).length +
    adminLeaves.filter((l) => (l.status||"").includes("pending")).length;

  const attendanceRate = totalEmpCount > 0 ? Math.round((presentToday / totalEmpCount) * 100) : 0;

  const THOUGHTS = [
    "The strength of an organisation lies in the people it cultivates.",
    "Clarity at the top creates confidence throughout the hierarchy.",
    "Data without action is just noise. Lead with intention.",
    "Great cultures are built one decision at a time.",
    "Trust is the foundation every high-performing team is built on.",
  ];

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : h < 21 ? "Good Evening 🌆" : "Good Night 🌙");
    setThought(THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const orgName = superAdmin?.organisation_name || "Your Organisation";
  const maxDept = Math.max(...departments.map((d) => d.lastNumber), 1);

  const filteredEmp = employees.filter((e) => {
    const q    = empSearch.toLowerCase();
    const name = [e.f_name, e.l_name].filter(Boolean).join(" ").toLowerCase();
    return !q || name.includes(q) || (e.department||"").toLowerCase().includes(q) || (e.work_email||"").toLowerCase().includes(q);
  });
  const displayEmp = empExpand ? filteredEmp : filteredEmp.slice(0, 10);

  const stats = [
    { icon:<FaUserShield />, label:"Total Admins",    value:adminsLoading?"—":admins.length,       sub:`${admins.filter((a)=>a.status==="active").length} active`, color:"#730042", bgColor:"#f7ecf3", bar:null },
    { icon:<FaUsers />,      label:"Total Employees", value:deptLoading||empLoading?"—":totalEmpCount, sub:`${departments.length} departments`, color:"#2563eb", bgColor:"#eff6ff", bar:null },
    { icon:<FaClock />,      label:"Present Today",   value:mapLoading?"—":presentToday,           sub:`${attendanceRate}% · ${stillOnDuty} on duty`, color:"#0d9e6e", bgColor:"#e8f7f1", bar:mapLoading?null:attendanceRate },
    { icon:<FaCalendarAlt />,label:"Pending Leaves",  value:leaveLoading?"—":pendingLeaves,         sub:pendingLeaves>0?"Needs attention":"All clear ✓", color:pendingLeaves>0?"#b8760a":"#0d9e6e", bgColor:pendingLeaves>0?"#fff8e1":"#e8f7f1", bar:null },
    { icon:<FaBullhorn />,   label:"Announcements",   value:annLoading?"—":announcements.length,   sub:"Active broadcasts", color:"#7c3aed", bgColor:"#f5f3ff", bar:null },
  ];

  const saveAnn = (form) => {
    if (annModal.editing) {
      updateAnn({ id:annModal.editing._id, data:form }, { onSuccess:()=>setAnnModal({open:false,editing:null}) });
    } else {
      createAnn(form, { onSuccess:()=>setAnnModal({open:false,editing:null}) });
    }
  };

  const saveAdmin = (form) => {
    if (adminModal.editing) {
      updateAdmin({ id:adminModal.editing._id, data:form }, { onSuccess:()=>setAdminModal({open:false,editing:null}) });
    } else {
      createAdmin(form, { onSuccess:()=>setAdminModal({open:false,editing:null}) });
    }
  };

  const handleAcceptLeave = (leave) => acceptLeave({ id:leave._id, leaveFor:leaveTab==="admin"?"admin":"employee" });
  const handleRejectLeave = (leave) => rejectLeave({ id:leave._id, leaveFor:leaveTab==="admin"?"admin":"employee" });
  const saveReview = (form) => reviewAdmin(form, { onSuccess:()=>setReviewModal(false) });

  const leaveStatusClass = (status="") => {
    const s = status.toLowerCase();
    if (s.includes("approved")) return "sa-badge sa-badge-approved";
    if (s.includes("rejected")) return "sa-badge sa-badge-rejected";
    return "sa-badge sa-badge-pending";
  };
  const leaveStatusLabel = (status="") => {
    if (status.includes("approved")) return "Approved";
    if (status.includes("rejected")) return "Rejected";
    if (status.includes("forwarded")||status.includes("pending")) return "Pending";
    return status;
  };
  const isPendingLeave = (leave) => {
    const s = (leave.status||"").toLowerCase();
    return s.includes("forwarded")||s.includes("pending");
  };

  return (
    <div className="sa">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="sa-hero">
        <div className="sa-hero-badge">
          <div className="sa-hero-badge-dot" />
          Super Administrator
        </div>
        <h1 className="sa-hero-title">{greeting}, {orgName}!</h1>
        <p className="sa-hero-sub">"{thought}"</p>
        <div className="sa-hero-chips">
          <span className="sa-chip">🏢 {orgName}</span>
          <span className="sa-chip">👥 {totalEmpCount} Employees</span>
          {presentToday > 0 && <span className="sa-chip">✅ {presentToday} Present</span>}
          {pendingLeaves > 0 && <span className="sa-chip">📋 {pendingLeaves} Leave{pendingLeaves !== 1 ? "s" : ""} Pending</span>}
          <span className="sa-chip">📆 {today}</span>
        </div>
        {/* On phones this becomes static (flex) via CSS breakpoint */}
        <div className="sa-hero-actions">
          <button className="sa-hero-action-btn" onClick={() => setAdminModal({ open:true, editing:null })}>
            <FaPlus style={{ fontSize:10 }} /> Add Admin
          </button>
          <button className="sa-hero-action-btn" onClick={() => setReviewModal(true)}>
            <FaStar style={{ fontSize:10 }} /> Review Admin
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="sa-stats">
        {stats.map((s, i) => (
          <div className="sa-stat" key={i}>
            <div className="sa-stat-accent" style={{ background:`linear-gradient(90deg, ${s.color}cc, ${s.color}55)` }} />
            <div className="sa-stat-icon" style={{ background:s.bgColor, color:s.color }}>{s.icon}</div>
            <div className="sa-stat-lbl">{s.label}</div>
            <div className="sa-stat-val">{s.value}</div>
            <p className="sa-stat-sub" style={{ color:s.color }}>{s.sub}</p>
            {s.bar !== null && (
              <div className="sa-stat-bar">
                <div className="sa-stat-fill" style={{ width:`${s.bar}%`, background:`linear-gradient(90deg, ${s.color}cc, ${s.color})` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Map + Leaves ─────────────────────────────────────── */}
      <div className="sa-mid-grid">
        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <div className="sa-live-dot" />
              Live Attendance Map
            </div>
            <span style={{ fontSize:11, color:"var(--light)", fontWeight:500 }}>
              <FaMapMarkerAlt style={{ marginRight:4 }} />
              {mapLoading ? "Loading…" : `${checkins.length} check-in${checkins.length!==1?"s":""} today`}
            </span>
          </div>
          <div className="sa-map-wrap">
            <AttendanceMap checkins={checkins} loading={mapLoading} />
          </div>
          <div className="sa-map-foot">
            <div className="sa-leg"><div className="sa-leg-dot" style={{ background:"#730042" }} />Manager</div>
            <div className="sa-leg"><div className="sa-leg-dot" style={{ background:"#a0005c" }} />Employee</div>
            <div className="sa-leg"><div className="sa-leg-dot" style={{ background:"#aaa", opacity:.5 }} />Checked out</div>
            <span style={{ marginLeft:"auto", fontSize:11, color:"var(--light)" }}>Click pin for details</span>
          </div>
        </div>

        <div className="sa-panel" style={{ display:"flex", flexDirection:"column" }}>
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <FaCalendarAlt style={{ color:"var(--p)", fontSize:14 }} />
              Leave Requests
            </div>
            {pendingLeaves > 0 && (
              <span style={{ background:"#fff8e1", color:"var(--gold)", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, border:"1px solid #f0d870", whiteSpace:"nowrap" }}>
                {pendingLeaves} pending
              </span>
            )}
          </div>
          <div className="sa-tabs">
            <button className={`sa-tab${leaveTab==="employee"?" active":""}`} onClick={()=>setLeaveTab("employee")}>
              Employees {empLeaves.length>0&&`(${empLeaves.length})`}
            </button>
            <button className={`sa-tab${leaveTab==="admin"?" active":""}`} onClick={()=>setLeaveTab("admin")}>
              Admins/Managers {adminLeaves.length>0&&`(${adminLeaves.length})`}
            </button>
          </div>
          <div className="sa-leave-scroll" style={{ flex:1 }}>
            {leaveLoading ? (
              <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading…</p></div>
            ) : activeLeaves.length === 0 ? (
              <div className="sa-empty">
                <div className="sa-empty-ico"><FaCheckCircle style={{ color:"var(--green)" }} /></div>
                <p>No leave requests in this category.</p>
              </div>
            ) : (
              activeLeaves.map((leave) => {
                const emp     = leave.employee || leave.manager || {};
                const name    = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || leave.name || "Employee";
                const type    = leave.leaveType || leave.type || "Leave";
                const from    = leave.startDate || leave.from || "";
                const to      = leave.endDate   || leave.to   || "";
                const pending = isPendingLeave(leave);
                return (
                  <div key={leave._id} className="sa-leave-item">
                    <div className="sa-avatar" style={{ background:leaveTypeColor(type) }}>{initials(name)}</div>
                    <div className="sa-leave-meta">
                      <div className="sa-leave-name">{name}</div>
                      <div className="sa-leave-info">
                        {type.toUpperCase()} · {fmtDate(from)}{to&&to!==from?` → ${fmtDate(to)}`:""}
                        {emp.designation?` · ${emp.designation}`:""}
                      </div>
                      {leave.reason && (
                        <div className="sa-leave-info" style={{ marginTop:2, fontStyle:"italic" }}>"{leave.reason}"</div>
                      )}
                      {pending ? (
                        <div className="sa-leave-actions">
                          <button className="sa-btn-accept" onClick={()=>handleAcceptLeave(leave)} disabled={accepting}><FaCheck /> Approve</button>
                          <button className="sa-btn-reject" onClick={()=>handleRejectLeave(leave)} disabled={rejecting}><FaBan /> Reject</button>
                        </div>
                      ) : (
                        <div style={{ marginTop:6 }}>
                          <span className={leaveStatusClass(leave.status)}>{leaveStatusLabel(leave.status)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Admin Management ─────────────────────────────────── */}
      <div className="sa-panel" style={{ marginBottom:22 }}>
        <div className="sa-panel-head">
          <div className="sa-panel-title">
            <FaUserCog style={{ color:"var(--p)", fontSize:15 }} />
            Admin Management
          </div>
          {/* Wrapped in sa-head-actions for flex-wrap on narrow screens */}
          <div className="sa-head-actions">
            <button className="sa-btn-ghost" style={{ fontSize:11, padding:"6px 12px" }} onClick={()=>setReviewModal(true)}>
              <FaStar style={{ fontSize:10, marginRight:4 }} /> Review Admin
            </button>
            <button className="sa-btn-p" onClick={()=>setAdminModal({open:true,editing:null})}>
              <FaPlus style={{ fontSize:10 }} /> Add Admin
            </button>
          </div>
        </div>
        {adminsLoading ? (
          <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading admins…</p></div>
        ) : admins.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-ico"><FaUserShield /></div>
            <p>No admins yet. Create one to delegate management.</p>
          </div>
        ) : (
          <div className="sa-admin-grid">
            {admins.map((admin) => {
              const name      = [admin.f_name, admin.l_name].filter(Boolean).join(" ");
              const statusKey = (admin.status||"inactive").toLowerCase();
              const roleKey   = admin.role || "admin";
              return (
                <div className="sa-admin-card" key={admin._id}>
                  <div className="sa-admin-ava" style={{ background:`linear-gradient(135deg, ${avaColor(admin.f_name||"")}, #cd166e)` }}>
                    {initials(name)}
                  </div>
                  <div className="sa-admin-name">{name}</div>
                  <div className="sa-admin-desg">{admin.designation}</div>
                  <div className="sa-admin-email">{admin.work_email}</div>
                  <div className="sa-admin-meta">
                    <span className={`sa-badge ${statusKey==="active"?"sa-badge-active":statusKey==="suspended"?"sa-badge-suspended":"sa-badge-inactive"}`}>
                      {statusKey.charAt(0).toUpperCase()+statusKey.slice(1)}
                    </span>
                    <span className={roleBadgeClass(roleKey)}>{ROLE_LABEL[roleKey]||roleKey}</span>
                  </div>
                  {admin.department && (
                    <div style={{ textAlign:"center", marginTop:4 }}>
                      <span style={{ fontSize:10, background:"#f3f4f6", color:"#6b7280", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>
                        {admin.department} · {admin.office_location}
                      </span>
                    </div>
                  )}
                  <div className="sa-admin-actions">
                    <button className="sa-icon-btn" title="Edit" onClick={()=>setAdminModal({open:true,editing:admin})}><FaEdit /></button>
                    <button className="sa-icon-btn del" title="Delete" onClick={()=>{ if(window.confirm(`Delete ${name}?`)) deleteAdmin(admin._id); }}><FaTrash /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dept + Announcements ─────────────────────────────── */}
      <div className="sa-lower-grid">
        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <FaLayerGroup style={{ color:"var(--p)", fontSize:14 }} />
              Department Breakdown
            </div>
            <span style={{ fontSize:11, color:"var(--light)", fontWeight:600 }}>
              {deptLoading?"…":`${totalEmpCount} total`}
            </span>
          </div>
          {deptLoading ? (
            <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading…</p></div>
          ) : departments.length === 0 ? (
            <div className="sa-empty"><div className="sa-empty-ico"><FaChartBar /></div><p>No departments yet.</p></div>
          ) : (
            departments.map((dep) => (
              <div className="sa-dept-item" key={dep.department}>
                <div className="sa-dept-name">{dep.department}</div>
                <div className="sa-dept-bar-track">
                  <div className="sa-dept-bar-fill" style={{ width:`${Math.round((dep.lastNumber/maxDept)*100)}%` }} />
                </div>
                <div className="sa-dept-count">{dep.lastNumber}</div>
              </div>
            ))
          )}
        </div>

        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <FaBullhorn style={{ color:"var(--p)", fontSize:14 }} />
              Announcements
            </div>
            <button className="sa-btn-p" onClick={()=>setAnnModal({open:true,editing:null})}>
              <FaPlus style={{ fontSize:10 }} /> New
            </button>
          </div>
          {annLoading ? (
            <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading…</p></div>
          ) : announcements.length === 0 ? (
            <div className="sa-empty"><div className="sa-empty-ico">📢</div><p>No announcements. Publish one to notify your team.</p></div>
          ) : (
            <div style={{ paddingTop:6, paddingBottom:6 }}>
              {announcements.slice(0,5).map((ann) => {
                const priority = (ann.priority||"normal").toLowerCase();
                const audience = ann.audience || "all";
                const chipCls  = priority==="urgent"?"chip-urgent":priority==="low"?"chip-event":"chip-general";
                return (
                  <div className="sa-ann-card" key={ann._id}>
                    <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                      <span className={`sa-ann-chip ${chipCls}`}>{priority.charAt(0).toUpperCase()+priority.slice(1)}</span>
                      <span style={{ fontSize:10, background:"#f3f4f6", color:"#6b7280", padding:"3px 8px", borderRadius:99, fontWeight:600, textTransform:"uppercase", letterSpacing:".4px" }}>{audience}</span>
                    </div>
                    <div className="sa-ann-title">{ann.title}</div>
                    <div className="sa-ann-body">{ann.message}</div>
                    <div className="sa-ann-foot">
                      <button className="sa-icon-btn" onClick={()=>setAnnModal({open:true,editing:ann})}><FaEdit /> Edit</button>
                      <button className="sa-icon-btn del" onClick={()=>{ if(window.confirm("Delete announcement?")) deleteAnn(ann._id); }}><FaTrash /> Delete</button>
                      {ann.expiresAt && (
                        <span style={{ marginLeft:"auto", fontSize:10, color:"var(--light)" }}>
                          Expires {fmtDate(ann.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Employee Overview ────────────────────────────────── */}
      <div className="sa-panel" style={{ marginBottom:26 }}>
        <div className="sa-panel-head">
          <div className="sa-panel-title">
            <FaUsers style={{ color:"var(--p)", fontSize:14 }} />
            Employee Overview
          </div>
          {/* sa-head-actions wraps on narrow screens */}
          <div className="sa-head-actions">
            <div className="sa-search-wrap">
              <FaSearch className="sa-search-ico" />
              <input
                className="sa-search-inp"
                placeholder="Search employees…"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
              />
            </div>
            {filteredEmp.length > 10 && (
              <button className="sa-btn-ghost" style={{ fontSize:11, padding:"6px 12px" }} onClick={()=>setEmpExpand((v)=>!v)}>
                {empExpand ? "Show Less" : `View All (${filteredEmp.length})`}
                <FaChevronRight style={{ fontSize:9, marginLeft:4, transform:empExpand?"rotate(90deg)":"none", transition:".2s" }} />
              </button>
            )}
          </div>
        </div>
        {empLoading ? (
          <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading employees…</p></div>
        ) : filteredEmp.length === 0 ? (
          <div className="sa-empty"><div className="sa-empty-ico"><FaUsers /></div><p>{empSearch?"No matching employees.":"No employees found."}</p></div>
        ) : (
          <div className="sa-emp-grid">
            {displayEmp.map((emp, i) => {
              const name      = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || "Employee";
              const role      = emp.designation || emp.role || "";
              const dept      = emp.department  || "";
              const isManager = (emp.role||"").toLowerCase() === "manager";
              return (
                <div className="sa-emp-card" key={emp._id||i}>
                  <div className="sa-emp-ava" style={{ background:isManager?"linear-gradient(135deg,#730042,#cd166e)":`linear-gradient(135deg,${avaColor(emp.f_name||"")},${avaColor((emp.l_name||"A"))})` }}>
                    {initials(name)}
                  </div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div className="sa-emp-name">{name}</div>
                    {isManager && <span style={{ fontSize:9, background:"var(--p-wash)", color:"var(--p)", padding:"1px 6px", borderRadius:99, fontWeight:700, display:"inline-block", marginBottom:2 }}>MANAGER</span>}
                    {role && <div className="sa-emp-role">{role}</div>}
                    {dept && <span className="sa-emp-dept">{dept}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!empExpand && filteredEmp.length > 10 && (
          <div style={{ padding:"12px 18px", borderTop:"1px solid var(--border)", textAlign:"center" }}>
            <button className="sa-btn-ghost" onClick={()=>setEmpExpand(true)} style={{ fontSize:12 }}>
              Show all {filteredEmp.length} employees <FaAngleDown style={{ marginLeft:4 }} />
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <AnnModal
        open={annModal.open}
        onClose={()=>setAnnModal({open:false,editing:null})}
        initial={annModal.editing ? { title:annModal.editing.title, message:annModal.editing.message, audience:annModal.editing.audience||"all", priority:annModal.editing.priority||"normal" } : null}
        onSave={saveAnn}
        loading={creatingAnn||updatingAnn}
      />
      <AdminModal
        open={adminModal.open}
        onClose={()=>setAdminModal({open:false,editing:null})}
        initial={adminModal.editing}
        onSave={saveAdmin}
        loading={creatingAdmin||updatingAdmin}
      />
      <ReviewModal
        open={reviewModal}
        onClose={()=>setReviewModal(false)}
        admins={admins}
        onSave={saveReview}
        loading={reviewing}
      />
    </div>
  );
}

export default React.memo(SuperAdminDashboard);