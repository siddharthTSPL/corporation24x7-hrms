import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  FaUsers, FaClock, FaCalendarAlt, FaBullhorn,
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck,
  FaMapMarkerAlt, FaChevronRight, FaBan, FaStar,
  FaUserShield, FaBuilding, FaEnvelope, FaCheckCircle,
  FaChartBar, FaLayerGroup, FaUserTie, FaUserCog,
  FaAngleDown, FaAngleUp, FaSearch, FaSortAmountDown,
  FaEye, FaFilter, FaInbox,
} from "react-icons/fa";

/* ─────────────────────────────────────────────
   HOOK IMPORTS  (wire to your real hooks)
───────────────────────────────────────────── */
import { useGetMeSuperAdmin }        from "../../auth/server-state/superadmin/auth/suauth.hook";
import { useGetTodayCheckins, useGetOrgInfo, useGetNoOfEmployees, useGetAllManagers, useGetAllEmployees, useGetParticularEmployee, useGetParticularManager, useDeleteEmployee, useAddEmployee, useAddManager, useEditEmployee } from "../../auth/server-state/superadmin/other/suother.hook";
import { useShowAllLeaves, useAcceptLeaveByAdmin, useRejectLeaveByAdmin } from "../../auth/server-state/superadmin/leave/suleave.hook";
import { useGetAllAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "../../auth/server-state/superadmin/announcement/suannouncement.hook";
import { useGetAllAdmins, useCreateAdmin, useUpdateAdmin, useDeleteAdmin } from "../../auth/server-state/superadmin/other/suother.hook";
import { useReviewToAdmin } from "../../auth/server-state/superadmin/other/suother.hook";

/* ─────────────────────────────────────────────
   STYLE INJECTION
───────────────────────────────────────────── */
const useStyles = () => {
  useEffect(() => {
    const font = document.createElement("link");
    font.rel  = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(font);

    const style = document.createElement("style");
    style.id = "sa-dash-styles";
    style.textContent = `
      :root {
        --ink:      #0d0209;
        --p:        #730042;
        --p-dark:   #4a0029;
        --p-deep:   #2a0017;
        --p-mid:    #9e0058;
        --p-light:  #cd166e;
        --p-wash:   #f7ecf3;
        --p-pale:   #fdf5f9;
        --border:   #e8d5e2;
        --surface:  #ffffff;
        --muted:    #7a5568;
        --light:    #c499b4;
        --green:    #0d9e6e;
        --red:      #d93025;
        --gold:     #b8760a;
        --amber:    #f59e0b;
        --blue:     #2563eb;
        --sh:       0 2px 12px rgba(115,0,66,.08);
        --sh-lg:    0 16px 48px rgba(115,0,66,.16);
        --r:        14px;
        --r-sm:     8px;
        font-family: 'DM Sans', sans-serif;
      }
      
      *, *::before, *::after { box-sizing: border-box; }

      .sa { background: var(--p-pale); min-height: 100vh; padding: 24px 28px; font-family: 'DM Sans', sans-serif; color: var(--ink); }

      /* ── HERO ── */
      .sa-hero {
        background: linear-gradient(135deg, var(--p-deep) 0%, var(--p-dark) 35%, var(--p) 65%, var(--p-light) 100%);
        border-radius: var(--r); padding: 32px 40px; margin-bottom: 26px;
        position: relative; overflow: hidden; box-shadow: var(--sh-lg);
      }
      .sa-hero::before {
        content:''; position:absolute; width:500px; height:500px; border-radius:50%;
        top:-250px; right:-120px; background:rgba(255,255,255,.04); pointer-events:none;
      }
      .sa-hero::after {
        content:''; position:absolute; width:320px; height:320px; border-radius:50%;
        bottom:-180px; left:42%; background:rgba(255,255,255,.03); pointer-events:none;
      }
      .sa-hero-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); border-radius:99px; padding:4px 14px 4px 8px; font-size:11px; color:rgba(255,255,255,.85); letter-spacing:.5px; font-weight:600; text-transform:uppercase; margin-bottom:14px; }
      .sa-hero-badge-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; box-shadow:0 0 6px #4ade80; }
      .sa-hero-title { font-family:'Playfair Display',serif; font-size:clamp(28px,3.5vw,42px); color:#fff; margin:0 0 8px; font-weight:800; line-height:1.05; letter-spacing:-.5px; }
      .sa-hero-sub { font-size:13px; color:rgba(255,255,255,.6); font-weight:300; max-width:560px; line-height:1.65; }
      .sa-hero-chips { display:flex; gap:10px; margin-top:22px; flex-wrap:wrap; }
      .sa-chip { background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.2); border-radius:99px; padding:6px 16px; font-size:12px; color:rgba(255,255,255,.9); font-weight:500; backdrop-filter:blur(4px); }
      .sa-hero-actions { position:absolute; top:28px; right:36px; display:flex; gap:10px; }
      .sa-hero-action-btn { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:#fff; padding:8px 16px; border-radius:var(--r-sm); font-size:12px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s; display:flex; align-items:center; gap:6px; }
      .sa-hero-action-btn:hover { background:rgba(255,255,255,.25); }

      /* ── STATS ── */
      .sa-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; margin-bottom:26px; }
      @media(max-width:1200px){ .sa-stats { grid-template-columns:repeat(3,1fr); } }
      @media(max-width:760px) { .sa-stats { grid-template-columns:repeat(2,1fr); } }
      @media(max-width:480px) { .sa-stats { grid-template-columns:1fr; } }

      .sa-stat { background:var(--surface); border-radius:var(--r); border:1px solid var(--border); padding:20px 18px 16px; box-shadow:var(--sh); position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s; cursor:default; }
      .sa-stat:hover { transform:translateY(-3px); box-shadow:var(--sh-lg); }
      .sa-stat-accent { position:absolute; top:0; left:0; right:0; height:3px; }
      .sa-stat-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; margin-bottom:14px; }
      .sa-stat-lbl { font-size:11px; font-weight:600; letter-spacing:.7px; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
      .sa-stat-val { font-family:'Playfair Display',serif; font-size:34px; line-height:1; color:var(--ink); font-weight:700; }
      .sa-stat-sub { font-size:11px; margin-top:7px; font-weight:500; }
      .sa-stat-bar { height:3px; background:var(--border); border-radius:99px; margin-top:10px; overflow:hidden; }
      .sa-stat-fill { height:100%; border-radius:99px; transition:width .9s cubic-bezier(.4,0,.2,1); }

      /* ── PANEL ── */
      .sa-panel { background:var(--surface); border-radius:var(--r); border:1px solid var(--border); box-shadow:var(--sh); overflow:hidden; }
      .sa-panel-head { padding:16px 22px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .sa-panel-title { font-family:'Playfair Display',serif; font-size:17px; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:9px; }
      .sa-live-dot { width:8px; height:8px; border-radius:50%; background:var(--green); animation:lp 2s infinite; flex-shrink:0; }
      @keyframes lp { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }

      /* ── MAP ── */
      .sa-map-wrap { height:300px; position:relative; }
      .sa-map-foot { padding:11px 20px; background:var(--p-wash); border-top:1px solid var(--border); display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
      .sa-leg { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--muted); }
      .sa-leg-dot { width:10px; height:10px; border-radius:50%; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.2); }

      /* ── GRIDS ── */
      .sa-mid-grid { display:grid; grid-template-columns:1fr 360px; gap:20px; margin-bottom:26px; }
      @media(max-width:1050px){ .sa-mid-grid { grid-template-columns:1fr; } }
      .sa-lower-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:26px; }
      @media(max-width:900px){ .sa-lower-grid { grid-template-columns:1fr; } }
      .sa-three-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-bottom:26px; }
      @media(max-width:1100px){ .sa-three-grid { grid-template-columns:1fr 1fr; } }
      @media(max-width:680px) { .sa-three-grid { grid-template-columns:1fr; } }

      /* ── LEAVE ── */
      .sa-leave-scroll { overflow-y:auto; max-height:360px; }
      .sa-leave-scroll::-webkit-scrollbar { width:4px; }
      .sa-leave-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:99px; }
      .sa-leave-item { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:flex-start; gap:12px; transition:background .15s; }
      .sa-leave-item:hover { background:var(--p-pale); }
      .sa-leave-item:last-child { border-bottom:none; }
      .sa-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:white; flex-shrink:0; }
      .sa-leave-meta { flex:1; min-width:0; }
      .sa-leave-name { font-size:13px; font-weight:600; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .sa-leave-info { font-size:11px; color:var(--muted); margin-top:2px; }
      .sa-leave-actions { display:flex; gap:6px; margin-top:8px; }

      .sa-btn-accept { background:#e8f7f1; color:var(--green); border:1px solid #b8e8d4; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all .15s; font-family:'DM Sans',sans-serif; }
      .sa-btn-accept:hover { background:var(--green); color:white; }
      .sa-btn-reject { background:#fbeaea; color:var(--red); border:1px solid #f0c5c5; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all .15s; font-family:'DM Sans',sans-serif; }
      .sa-btn-reject:hover { background:var(--red); color:white; }

      /* ── TABS ── */
      .sa-tabs { display:flex; gap:0; border-bottom:1px solid var(--border); }
      .sa-tab { padding:10px 18px; font-size:12px; font-weight:600; color:var(--muted); border-bottom:2px solid transparent; cursor:pointer; transition:all .15s; white-space:nowrap; background:none; border-top:none; border-left:none; border-right:none; font-family:'DM Sans',sans-serif; }
      .sa-tab.active { color:var(--p); border-bottom-color:var(--p); }
      .sa-tab:hover:not(.active) { color:var(--ink); }

      /* ── STATUS BADGE ── */
      .sa-badge { display:inline-flex; align-items:center; font-size:10px; font-weight:700; letter-spacing:.4px; padding:3px 9px; border-radius:99px; }
      .sa-badge-pending  { background:#fff8e1; color:var(--gold); }
      .sa-badge-approved { background:#e8f7f1; color:var(--green); }
      .sa-badge-rejected { background:#fbeaea; color:var(--red); }
      .sa-badge-active   { background:#e8f7f1; color:var(--green); }
      .sa-badge-inactive { background:#f3f4f6; color:#6b7280; }
      .sa-badge-suspended{ background:#fbeaea; color:var(--red); }

      /* ── ADMIN CARDS ── */
      .sa-admin-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; padding:18px; }
      .sa-admin-card { border:1px solid var(--border); border-radius:var(--r-sm); padding:18px 16px; transition:all .2s; position:relative; }
      .sa-admin-card:hover { box-shadow:var(--sh); transform:translateY(-2px); background:var(--p-wash); }
      .sa-admin-ava { width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; color:white; background:linear-gradient(135deg,var(--p-dark),var(--p-light)); margin:0 auto 12px; }
      .sa-admin-name { font-size:13px; font-weight:700; color:var(--ink); text-align:center; }
      .sa-admin-desg { font-size:11px; color:var(--muted); text-align:center; margin-top:2px; }
      .sa-admin-email { font-size:10px; color:var(--light); text-align:center; margin-top:6px; }
      .sa-admin-actions { display:flex; justify-content:center; gap:6px; margin-top:12px; padding-top:10px; border-top:1px solid var(--border); }

      /* ── EMPLOYEE GRID ── */
      .sa-emp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; padding:18px; }
      .sa-emp-card { border:1px solid var(--border); border-radius:var(--r-sm); padding:14px 12px; display:flex; align-items:center; gap:12px; transition:all .2s; }
      .sa-emp-card:hover { box-shadow:var(--sh); background:var(--p-wash); }
      .sa-emp-ava { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:white; flex-shrink:0; }
      .sa-emp-name { font-size:13px; font-weight:600; color:var(--ink); line-height:1.2; }
      .sa-emp-role { font-size:11px; color:var(--muted); margin-top:1px; }
      .sa-emp-dept { display:inline-block; font-size:10px; font-weight:600; background:var(--p-wash); color:var(--p); padding:2px 7px; border-radius:99px; margin-top:4px; }

      /* ── DEPT BARS ── */
      .sa-dept-item { padding:12px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:14px; }
      .sa-dept-item:last-child { border-bottom:none; }
      .sa-dept-name { font-size:12px; font-weight:600; color:var(--ink); width:120px; flex-shrink:0; }
      .sa-dept-bar-track { flex:1; height:7px; background:var(--border); border-radius:99px; overflow:hidden; }
      .sa-dept-bar-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,var(--p-dark),var(--p-light)); transition:width 1s ease; }
      .sa-dept-count { font-size:12px; font-weight:700; color:var(--p); width:32px; text-align:right; flex-shrink:0; }

      /* ── ANN ── */
      .sa-ann-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:18px; }
      @media(max-width:700px){ .sa-ann-grid { grid-template-columns:1fr; } }
      .sa-ann-card { border-radius:var(--r-sm); border:1px solid var(--border); padding:16px; transition:all .2s; }
      .sa-ann-card:hover { box-shadow:var(--sh); transform:translateY(-2px); }
      .sa-ann-chip { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; padding:3px 10px; border-radius:99px; margin-bottom:8px; }
      .chip-general { background:var(--p-wash); color:var(--p); }
      .chip-urgent   { background:#fbeaea; color:var(--red); }
      .chip-event    { background:#e8f7f1; color:var(--green); }
      .chip-policy   { background:#fff8e1; color:var(--gold); }
      .sa-ann-title { font-size:13px; font-weight:600; color:var(--ink); margin-bottom:5px; }
      .sa-ann-body  { font-size:12px; color:var(--muted); line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .sa-ann-foot  { display:flex; gap:6px; margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }

      /* ── REVIEW ── */
      .sa-review-form { padding:20px; }
      .sa-stars { display:flex; gap:6px; margin-bottom:14px; }
      .sa-star { font-size:22px; cursor:pointer; color:var(--border); transition:color .15s; }
      .sa-star.active { color:var(--amber); }

      /* ── BUTTONS ── */
      .sa-btn-p { background:var(--p); color:white; border:none; padding:8px 16px; border-radius:var(--r-sm); font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:'DM Sans',sans-serif; transition:all .2s; white-space:nowrap; }
      .sa-btn-p:hover { background:var(--p-dark); transform:translateY(-1px); box-shadow:0 4px 14px rgba(115,0,66,.3); }
      .sa-btn-p:disabled { opacity:.5; cursor:not-allowed; transform:none; }
      .sa-btn-ghost { background:none; color:var(--muted); border:1px solid var(--border); padding:8px 16px; border-radius:var(--r-sm); font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s; white-space:nowrap; }
      .sa-btn-ghost:hover { border-color:var(--p); color:var(--p); }
      .sa-icon-btn { background:none; border:none; cursor:pointer; padding:5px 8px; border-radius:5px; font-size:12px; color:var(--light); transition:all .15s; display:flex; align-items:center; gap:4px; font-family:'DM Sans',sans-serif; }
      .sa-icon-btn:hover { background:var(--p-wash); color:var(--p); }
      .sa-icon-btn.del:hover { background:#fbeaea; color:var(--red); }

      /* ── SEARCH ── */
      .sa-search-wrap { position:relative; }
      .sa-search-ico { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--light); font-size:12px; pointer-events:none; }
      .sa-search-inp { padding:7px 10px 7px 30px; background:var(--p-pale); border:1px solid var(--border); border-radius:var(--r-sm); font-size:12px; color:var(--ink); font-family:'DM Sans',sans-serif; outline:none; width:200px; transition:all .15s; }
      .sa-search-inp:focus { border-color:var(--p); box-shadow:0 0 0 3px var(--p-wash); width:240px; }

      /* ── MODAL ── */
      .sa-overlay { position:fixed; inset:0; background:rgba(13,2,9,.65); backdrop-filter:blur(6px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:saov .18s; }
      @keyframes saov { from{opacity:0} to{opacity:1} }
      .sa-modal { background:var(--surface); border-radius:var(--r); width:100%; max-width:520px; box-shadow:var(--sh-lg); animation:samup .22s; max-height:90vh; overflow-y:auto; }
      .sa-modal-lg { max-width:640px; }
      @keyframes samup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .sa-modal-hd { padding:22px 26px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:var(--surface); z-index:1; }
      .sa-modal-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:700; color:var(--ink); }
      .sa-modal-x { background:none; border:none; cursor:pointer; color:var(--muted); font-size:15px; padding:5px; border-radius:6px; transition:all .15s; }
      .sa-modal-x:hover { background:var(--p-wash); color:var(--p); }
      .sa-modal-bd { padding:22px 26px; }
      .sa-modal-ft { padding:14px 26px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:10px; position:sticky; bottom:0; background:var(--surface); }
      .sa-fld { margin-bottom:16px; }
      .sa-flbl { display:block; font-size:11px; font-weight:600; letter-spacing:.6px; text-transform:uppercase; color:var(--muted); margin-bottom:5px; }
      .sa-finp, .sa-fsel, .sa-ftxt { width:100%; padding:10px 12px; background:var(--p-pale); border:1px solid var(--border); border-radius:var(--r-sm); font-size:13px; color:var(--ink); font-family:'DM Sans',sans-serif; outline:none; transition:border-color .15s,box-shadow .15s; }
      .sa-finp:focus, .sa-fsel:focus, .sa-ftxt:focus { border-color:var(--p); box-shadow:0 0 0 3px var(--p-wash); }
      .sa-ftxt { resize:vertical; min-height:80px; line-height:1.6; }
      .sa-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

      /* ── EMPTY ── */
      .sa-empty { text-align:center; padding:36px 20px; color:var(--light); }
      .sa-empty-ico { font-size:28px; margin-bottom:10px; }
      .sa-empty p { font-size:13px; margin:0; }

      /* ── SECTION DIVIDER ── */
      .sa-divider { display:flex; align-items:center; gap:12px; margin:0 0 20px; }
      .sa-divider-line { flex:1; height:1px; background:var(--border); }
      .sa-divider-txt { font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--light); font-weight:600; white-space:nowrap; }

      @keyframes mPulse {
        0%,100% { transform:translate(-50%,-50%) scale(1); opacity:.5; }
        50%      { transform:translate(-50%,-50%) scale(2.4); opacity:0; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      try { document.head.removeChild(font); } catch(_){}
      const el = document.getElementById("sa-dash-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
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
  if (t.includes("earn") || t === "el")  return "#730042";
  if (t.includes("priv") || t === "pl")  return "#b8760a";
  if (t.includes("mat")  || t === "ml")  return "#7c3aed";
  if (t.includes("cas")  || t === "cl")  return "#2563eb";
  return "#730042";
};

const ANN_CHIP = { general:"chip-general", urgent:"chip-urgent", event:"chip-event", policy:"chip-policy" };

const AVATAR_COLORS = [
  "#730042","#9e0058","#4a0029","#2563eb","#0d9e6e","#7c3aed","#b8760a","#d93025",
];
const avaColor = (str = "") =>
  AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ─────────────────────────────────────────────
   ATTENDANCE MAP
───────────────────────────────────────────── */
const AttendanceMap = ({ checkins = [], loading }) => {
  const mapRef = useRef(null);
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

/* ─────────────────────────────────────────────
   ANNOUNCEMENT MODAL
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   CREATE ADMIN MODAL
───────────────────────────────────────────── */
const AdminModal = ({ open, onClose, initial, onSave, loading }) => {
  const blank = { f_name:"", l_name:"", work_email:"", password:"", gender:"", designation:"", phone:"" };
  const [form, setForm] = useState(blank);
  useEffect(() => { if (open) setForm(initial ? { ...blank, ...initial } : blank); }, [open]);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="sa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal sa-modal-lg">
        <div className="sa-modal-hd">
          <h2 className="sa-modal-title">{initial ? "Edit Admin" : "Create Admin"}</h2>
          <button className="sa-modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="sa-modal-bd">
          <div className="sa-form-row">
            <div className="sa-fld"><label className="sa-flbl">First Name</label><input className="sa-finp" placeholder="First name" value={form.f_name} onChange={set("f_name")} /></div>
            <div className="sa-fld"><label className="sa-flbl">Last Name</label><input className="sa-finp" placeholder="Last name" value={form.l_name} onChange={set("l_name")} /></div>
          </div>
          <div className="sa-fld"><label className="sa-flbl">Work Email</label><input className="sa-finp" type="email" placeholder="admin@company.com" value={form.work_email} onChange={set("work_email")} disabled={!!initial} /></div>
          {!initial && <div className="sa-fld"><label className="sa-flbl">Password</label><input className="sa-finp" type="password" placeholder="Temporary password" value={form.password} onChange={set("password")} /></div>}
          <div className="sa-form-row">
            <div className="sa-fld"><label className="sa-flbl">Designation</label><input className="sa-finp" placeholder="e.g. HR Manager" value={form.designation} onChange={set("designation")} /></div>
            <div className="sa-fld">
              <label className="sa-flbl">Gender</label>
              <select className="sa-fsel" value={form.gender} onChange={set("gender")}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="sa-fld" style={{ marginBottom: 0 }}><label className="sa-flbl">Phone</label><input className="sa-finp" placeholder="Phone number" value={form.phone} onChange={set("phone")} /></div>
        </div>
        <div className="sa-modal-ft">
          <button className="sa-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sa-btn-p" onClick={() => onSave(form)} disabled={loading || !form.f_name || !form.work_email}>
            <FaCheck style={{ fontSize: 10 }} /> {loading ? "Saving…" : initial ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   REVIEW MODAL
───────────────────────────────────────────── */
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
                <option key={a._id} value={a._id}>{a.f_name} {a.l_name} – {a.designation || a.work_email}</option>
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

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
function SuperAdminDashboard() {
  useStyles();

  const [greeting, setGreeting] = useState("");
  const [thought,  setThought]  = useState("");

  // Modals
  const [annModal,    setAnnModal]    = useState({ open: false, editing: null });
  const [adminModal,  setAdminModal]  = useState({ open: false, editing: null });
  const [reviewModal, setReviewModal] = useState(false);

  // UI state
  const [leaveTab,    setLeaveTab]    = useState("employee"); // "employee" | "admin"
  const [empExpand,   setEmpExpand]   = useState(false);
  const [empSearch,   setEmpSearch]   = useState("");

  // ── Data hooks ──
  const { data: meData }                                   = useGetMeSuperAdmin();
  const { data: checkinData, isLoading: mapLoading }       = useGetTodayCheckins();
  const { data: adminsData,  isLoading: adminsLoading }    = useGetAllAdmins();
  const { data: empData,     isLoading: empLoading }       = useGetAllEmployees();
  const { data: deptData,    isLoading: deptLoading }      = useGetNoOfEmployees();
  const { data: leavesRaw,   isLoading: leaveLoading }     = useShowAllLeaves();
  const { data: annRaw,      isLoading: annLoading }       = useGetAllAnnouncements();

  // ── Mutation hooks ──
  const { mutate: createAnn,   isPending: creatingAnn  }   = useCreateAnnouncement();
  const { mutate: updateAnn,   isPending: updatingAnn  }   = useUpdateAnnouncement();
  const { mutate: deleteAnn                            }   = useDeleteAnnouncement();
  const { mutate: createAdmin, isPending: creatingAdmin }  = useCreateAdmin();
  const { mutate: updateAdmin, isPending: updatingAdmin }  = useUpdateAdmin();
  const { mutate: deleteAdmin                          }   = useDeleteAdmin();
  const { mutate: acceptLeave, isPending: accepting    }   = useAcceptLeaveByAdmin();
  const { mutate: rejectLeave, isPending: rejecting    }   = useRejectLeaveByAdmin();
  const { mutate: reviewAdmin, isPending: reviewing    }   = useReviewToAdmin();

  // ── Normalize data ──
  const superAdmin     = meData?.superAdmin || meData || {};
  const checkins       = checkinData?.checkins  ?? [];
  const presentToday   = checkinData?.total     ?? checkins.length;
  const stillOnDuty    = checkins.filter((c) => !c.checkedOut).length;
  const admins         = Array.isArray(adminsData?.admins)  ? adminsData.admins  : Array.isArray(adminsData) ? adminsData : [];
  const employees      = Array.isArray(empData?.users)      ? empData.users      : Array.isArray(empData)   ? empData   : [];
  const departments    = Array.isArray(deptData?.departments) ? deptData.departments : [];
  const totalEmpCount  = deptData?.totalEmployees ?? employees.length;
  const announcements  = Array.isArray(annRaw?.announcements) ? annRaw.announcements : Array.isArray(annRaw) ? annRaw : [];
  const empLeaves      = Array.isArray(leavesRaw?.employeeLeaves?.leaves) ? leavesRaw.employeeLeaves.leaves : [];
  const adminLeaves    = Array.isArray(leavesRaw?.adminLeaves?.leaves)    ? leavesRaw.adminLeaves.leaves    : [];
  const activeLeaves   = leaveTab === "employee" ? empLeaves : adminLeaves;
  const pendingLeaves  = empLeaves.filter((l) => {
    const s = (l.status || "").toLowerCase();
    return s.includes("forwarded") || s.includes("pending");
  }).length + adminLeaves.filter((l) => (l.status || "").includes("pending")).length;

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

  // ── Filtered employees ──
  const filteredEmp = employees.filter((e) => {
    const q = empSearch.toLowerCase();
    const name = [e.f_name, e.l_name].filter(Boolean).join(" ").toLowerCase();
    return !q || name.includes(q) || (e.department || "").toLowerCase().includes(q) || (e.work_email || "").toLowerCase().includes(q);
  });
  const displayEmp = empExpand ? filteredEmp : filteredEmp.slice(0, 10);

  // ── Stats ──
  const stats = [
    { icon: <FaUserShield />, label: "Total Admins", value: adminsLoading ? "—" : admins.length, sub: `${admins.filter((a) => a.status === "active").length} active`, color: "#730042", bgColor: "#f7ecf3", bar: null },
    { icon: <FaUsers />, label: "Total Employees", value: deptLoading || empLoading ? "—" : totalEmpCount, sub: `${departments.length} departments`, color: "#2563eb", bgColor: "#eff6ff", bar: null },
    { icon: <FaClock />, label: "Present Today", value: mapLoading ? "—" : presentToday, sub: `${attendanceRate}% · ${stillOnDuty} on duty`, color: "#0d9e6e", bgColor: "#e8f7f1", bar: mapLoading ? null : attendanceRate },
    { icon: <FaCalendarAlt />, label: "Pending Leaves", value: leaveLoading ? "—" : pendingLeaves, sub: pendingLeaves > 0 ? "Needs attention" : "All clear ✓", color: pendingLeaves > 0 ? "#b8760a" : "#0d9e6e", bgColor: pendingLeaves > 0 ? "#fff8e1" : "#e8f7f1", bar: null },
    { icon: <FaBullhorn />, label: "Announcements", value: annLoading ? "—" : announcements.length, sub: "Active broadcasts", color: "#7c3aed", bgColor: "#f5f3ff", bar: null },
  ];

  // ── Handlers ──
  const saveAnn = (form) => {
    if (annModal.editing) {
      updateAnn({ id: annModal.editing._id, data: form }, { onSuccess: () => setAnnModal({ open: false, editing: null }) });
    } else {
      createAnn(form, { onSuccess: () => setAnnModal({ open: false, editing: null }) });
    }
  };

  const saveAdmin = (form) => {
    if (adminModal.editing) {
      updateAdmin({ id: adminModal.editing._id, data: form }, { onSuccess: () => setAdminModal({ open: false, editing: null }) });
    } else {
      createAdmin(form, { onSuccess: () => setAdminModal({ open: false, editing: null }) });
    }
  };

  const handleAcceptLeave = (leave) => {
    const isAdminLeave = leaveTab === "admin";
    acceptLeave({ id: leave._id, leaveFor: isAdminLeave ? "admin" : "employee" });
  };

  const handleRejectLeave = (leave) => {
    const isAdminLeave = leaveTab === "admin";
    rejectLeave({ id: leave._id, leaveFor: isAdminLeave ? "admin" : "employee" });
  };

  const saveReview = (form) => {
    reviewAdmin(form, { onSuccess: () => setReviewModal(false) });
  };

  const leaveStatusClass = (status = "") => {
    const s = status.toLowerCase();
    if (s.includes("approved")) return "sa-badge sa-badge-approved";
    if (s.includes("rejected")) return "sa-badge sa-badge-rejected";
    return "sa-badge sa-badge-pending";
  };

  const leaveStatusLabel = (status = "") => {
    if (status.includes("approved")) return "Approved";
    if (status.includes("rejected")) return "Rejected";
    if (status.includes("forwarded") || status.includes("pending")) return "Pending";
    return status;
  };

  const isPendingLeave = (leave) => {
    const s = (leave.status || "").toLowerCase();
    return s.includes("forwarded") || s.includes("pending");
  };

  return (
    <div className="sa">

      {/* ━━━━━━━━ HERO ━━━━━━━━ */}
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
        <div className="sa-hero-actions">
          <button className="sa-hero-action-btn" onClick={() => setAdminModal({ open: true, editing: null })}>
            <FaPlus style={{ fontSize: 10 }} /> Add Admin
          </button>
          <button className="sa-hero-action-btn" onClick={() => setReviewModal(true)}>
            <FaStar style={{ fontSize: 10 }} /> Review Admin
          </button>
        </div>
      </div>

      {/* ━━━━━━━━ STATS ━━━━━━━━ */}
      <div className="sa-stats">
        {stats.map((s, i) => (
          <div className="sa-stat" key={i}>
            <div className="sa-stat-accent" style={{ background: `linear-gradient(90deg, ${s.color}cc, ${s.color}55)` }} />
            <div className="sa-stat-icon" style={{ background: s.bgColor, color: s.color }}>{s.icon}</div>
            <div className="sa-stat-lbl">{s.label}</div>
            <div className="sa-stat-val">{s.value}</div>
            <p className="sa-stat-sub" style={{ color: s.color }}>{s.sub}</p>
            {s.bar !== null && (
              <div className="sa-stat-bar">
                <div className="sa-stat-fill" style={{ width: `${s.bar}%`, background: `linear-gradient(90deg, ${s.color}cc, ${s.color})` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ━━━━━━━━ MAP + LEAVE REQUESTS ━━━━━━━━ */}
      <div className="sa-mid-grid">

        {/* MAP */}
        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <div className="sa-live-dot" />
              Live Attendance Map
            </div>
            <span style={{ fontSize: 11, color: "var(--light)", fontWeight: 500 }}>
              <FaMapMarkerAlt style={{ marginRight: 4 }} />
              {mapLoading ? "Loading…" : `${checkins.length} check-in${checkins.length !== 1 ? "s" : ""} today`}
            </span>
          </div>
          <div className="sa-map-wrap">
            <AttendanceMap checkins={checkins} loading={mapLoading} />
          </div>
          <div className="sa-map-foot">
            <div className="sa-leg"><div className="sa-leg-dot" style={{ background: "#730042" }} />Manager</div>
            <div className="sa-leg"><div className="sa-leg-dot" style={{ background: "#a0005c" }} />Employee</div>
            <div className="sa-leg"><div className="sa-leg-dot" style={{ background: "#aaa", opacity: .5 }} />Checked out</div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--light)" }}>Click pin for details</span>
          </div>
        </div>

        {/* LEAVE PANEL */}
        <div className="sa-panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <FaCalendarAlt style={{ color: "var(--p)", fontSize: 14 }} />
              Leave Requests
            </div>
            {pendingLeaves > 0 && (
              <span style={{ background: "#fff8e1", color: "var(--gold)", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: "1px solid #f0d870" }}>
                {pendingLeaves} pending
              </span>
            )}
          </div>

          <div className="sa-tabs">
            <button className={`sa-tab${leaveTab === "employee" ? " active" : ""}`} onClick={() => setLeaveTab("employee")}>
              Employees {empLeaves.length > 0 && `(${empLeaves.length})`}
            </button>
            <button className={`sa-tab${leaveTab === "admin" ? " active" : ""}`} onClick={() => setLeaveTab("admin")}>
              Admins/Managers {adminLeaves.length > 0 && `(${adminLeaves.length})`}
            </button>
          </div>

          <div className="sa-leave-scroll" style={{ flex: 1 }}>
            {leaveLoading ? (
              <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading…</p></div>
            ) : activeLeaves.length === 0 ? (
              <div className="sa-empty">
                <div className="sa-empty-ico"><FaCheckCircle style={{ color: "var(--green)" }} /></div>
                <p>No leave requests in this category.</p>
              </div>
            ) : (
              activeLeaves.map((leave) => {
                const emp = leave.employee || leave.manager || {};
                const name = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || leave.name || "Employee";
                const type = leave.leaveType || leave.type || "Leave";
                const from = leave.startDate || leave.from || "";
                const to   = leave.endDate   || leave.to   || "";
                const pending = isPendingLeave(leave);
                return (
                  <div key={leave._id} className="sa-leave-item">
                    <div className="sa-avatar" style={{ background: leaveTypeColor(type) }}>{initials(name)}</div>
                    <div className="sa-leave-meta">
                      <div className="sa-leave-name">{name}</div>
                      <div className="sa-leave-info">
                        {type.toUpperCase()} · {fmtDate(from)}{to && to !== from ? ` → ${fmtDate(to)}` : ""}
                        {emp.designation ? ` · ${emp.designation}` : ""}
                      </div>
                      {leave.reason && (
                        <div className="sa-leave-info" style={{ marginTop: 2, fontStyle: "italic" }}>"{leave.reason}"</div>
                      )}
                      {pending ? (
                        <div className="sa-leave-actions">
                          <button className="sa-btn-accept" onClick={() => handleAcceptLeave(leave)} disabled={accepting}><FaCheck /> Approve</button>
                          <button className="sa-btn-reject" onClick={() => handleRejectLeave(leave)} disabled={rejecting}><FaBan /> Reject</button>
                        </div>
                      ) : (
                        <div style={{ marginTop: 6 }}>
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

      {/* ━━━━━━━━ ADMIN MANAGEMENT ━━━━━━━━ */}
      <div className="sa-panel" style={{ marginBottom: 26 }}>
        <div className="sa-panel-head">
          <div className="sa-panel-title">
            <FaUserCog style={{ color: "var(--p)", fontSize: 15 }} />
            Admin Management
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="sa-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setReviewModal(true)}>
              <FaStar style={{ fontSize: 10, marginRight: 4 }} /> Review Admin
            </button>
            <button className="sa-btn-p" onClick={() => setAdminModal({ open: true, editing: null })}>
              <FaPlus style={{ fontSize: 10 }} /> Add Admin
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
              const name = [admin.f_name, admin.l_name].filter(Boolean).join(" ");
              const statusKey = (admin.status || "inactive").toLowerCase();
              return (
                <div className="sa-admin-card" key={admin._id}>
                  <div className="sa-admin-ava" style={{ background: `linear-gradient(135deg, ${avaColor(admin.f_name || "")}, #cd166e)` }}>
                    {initials(name)}
                  </div>
                  <div className="sa-admin-name">{name}</div>
                  <div className="sa-admin-desg">{admin.designation || "Admin"}</div>
                  <div className="sa-admin-email">{admin.work_email}</div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                    <span className={`sa-badge sa-badge-${statusKey}`}>{statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}</span>
                  </div>
                  <div className="sa-admin-actions">
                    <button className="sa-icon-btn" title="Edit" onClick={() => setAdminModal({ open: true, editing: admin })}><FaEdit /></button>
                    <button className="sa-icon-btn del" title="Delete" onClick={() => { if (window.confirm(`Delete ${name}?`)) deleteAdmin(admin._id); }}><FaTrash /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ━━━━━━━━ DEPARTMENT BREAKDOWN + ANNOUNCEMENTS ━━━━━━━━ */}
      <div className="sa-lower-grid">

        {/* DEPT BREAKDOWN */}
        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <FaLayerGroup style={{ color: "var(--p)", fontSize: 14 }} />
              Department Breakdown
            </div>
            <span style={{ fontSize: 11, color: "var(--light)", fontWeight: 600 }}>
              {deptLoading ? "…" : `${totalEmpCount} total`}
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
                  <div className="sa-dept-bar-fill" style={{ width: `${Math.round((dep.lastNumber / maxDept) * 100)}%` }} />
                </div>
                <div className="sa-dept-count">{dep.lastNumber}</div>
              </div>
            ))
          )}
        </div>

        {/* ANNOUNCEMENTS */}
        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-title">
              <FaBullhorn style={{ color: "var(--p)", fontSize: 14 }} />
              Announcements
            </div>
            <button className="sa-btn-p" onClick={() => setAnnModal({ open: true, editing: null })}>
              <FaPlus style={{ fontSize: 10 }} /> New
            </button>
          </div>
          {annLoading ? (
            <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading…</p></div>
          ) : announcements.length === 0 ? (
            <div className="sa-empty"><div className="sa-empty-ico">📢</div><p>No announcements. Publish one to notify your team.</p></div>
          ) : (
            <div style={{ overflow: "hidden" }}>
              <div className="sa-ann-grid" style={{ gridTemplateColumns: "1fr" }}>
                {announcements.slice(0, 5).map((ann) => {
                  const priority = (ann.priority || "normal").toLowerCase();
                  const audience = (ann.audience || "all");
                  const chipCls = priority === "urgent" ? "chip-urgent" : priority === "low" ? "chip-event" : "chip-general";
                  return (
                    <div className="sa-ann-card" key={ann._id}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <span className={`sa-ann-chip ${chipCls}`}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
                        <span style={{ fontSize: 10, background: "#f3f4f6", color: "#6b7280", padding: "3px 8px", borderRadius: 99, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>{audience}</span>
                      </div>
                      <div className="sa-ann-title">{ann.title}</div>
                      <div className="sa-ann-body">{ann.message}</div>
                      <div className="sa-ann-foot">
                        <button className="sa-icon-btn" onClick={() => setAnnModal({ open: true, editing: ann })}><FaEdit /> Edit</button>
                        <button className="sa-icon-btn del" onClick={() => { if (window.confirm("Delete announcement?")) deleteAnn(ann._id); }}><FaTrash /> Delete</button>
                        {ann.expiresAt && (
                          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--light)" }}>
                            Expires {fmtDate(ann.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━ EMPLOYEE OVERVIEW ━━━━━━━━ */}
      <div className="sa-panel" style={{ marginBottom: 26 }}>
        <div className="sa-panel-head">
          <div className="sa-panel-title">
            <FaUsers style={{ color: "var(--p)", fontSize: 14 }} />
            Employee Overview
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
              <button className="sa-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setEmpExpand((v) => !v)}>
                {empExpand ? "Show Less" : `View All (${filteredEmp.length})`}
                <FaChevronRight style={{ fontSize: 9, marginLeft: 4, transform: empExpand ? "rotate(90deg)" : "none", transition: ".2s" }} />
              </button>
            )}
          </div>
        </div>

        {empLoading ? (
          <div className="sa-empty"><div className="sa-empty-ico">⏳</div><p>Loading employees…</p></div>
        ) : filteredEmp.length === 0 ? (
          <div className="sa-empty"><div className="sa-empty-ico"><FaUsers /></div><p>{empSearch ? "No matching employees." : "No employees found."}</p></div>
        ) : (
          <div className="sa-emp-grid">
            {displayEmp.map((emp, i) => {
              const name  = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || "Employee";
              const role  = emp.designation || emp.role || "";
              const dept  = emp.department  || "";
              const email = emp.work_email  || "";
              const isManager = (emp.role || "").toLowerCase() === "manager";
              return (
                <div className="sa-emp-card" key={emp._id || i}>
                  <div className="sa-emp-ava" style={{ background: isManager ? "linear-gradient(135deg,#730042,#cd166e)" : `linear-gradient(135deg,${avaColor(emp.f_name || "")},${avaColor((emp.l_name || "A"))})` }}>
                    {initials(name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="sa-emp-name">{name}</div>
                    {isManager && <span style={{ fontSize: 9, background: "var(--p-wash)", color: "var(--p)", padding: "1px 6px", borderRadius: 99, fontWeight: 700, display: "inline-block", marginBottom: 2 }}>MANAGER</span>}
                    {role  && <div className="sa-emp-role">{role}</div>}
                    {dept  && <span className="sa-emp-dept">{dept}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!empExpand && filteredEmp.length > 10 && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <button className="sa-btn-ghost" onClick={() => setEmpExpand(true)} style={{ fontSize: 12 }}>
              Show all {filteredEmp.length} employees <FaAngleDown style={{ marginLeft: 4 }} />
            </button>
          </div>
        )}
      </div>

      {/* ━━━━━━━━ MODALS ━━━━━━━━ */}
      <AnnModal
        open={annModal.open}
        onClose={() => setAnnModal({ open: false, editing: null })}
        initial={annModal.editing ? { title: annModal.editing.title, message: annModal.editing.message, audience: annModal.editing.audience || "all", priority: annModal.editing.priority || "normal" } : null}
        onSave={saveAnn}
        loading={creatingAnn || updatingAnn}
      />

      <AdminModal
        open={adminModal.open}
        onClose={() => setAdminModal({ open: false, editing: null })}
        initial={adminModal.editing}
        onSave={saveAdmin}
        loading={creatingAdmin || updatingAdmin}
      />

      <ReviewModal
        open={reviewModal}
        onClose={() => setReviewModal(false)}
        admins={admins}
        onSave={saveReview}
        loading={reviewing}
      />
    </div>
  );
}

export default React.memo(SuperAdminDashboard);