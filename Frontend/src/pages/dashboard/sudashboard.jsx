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
      /* ─── CSS Variables ─────────────────────────────────────── */
      :root {
        --ink: #0d0209; --p: #730042; --p-dark: #4a0029; --p-deep: #2a0017;
        --p-mid: #9e0058; --p-light: #cd166e; --p-wash: #f7ecf3; --p-pale: #fdf5f9;
        --border: #e8d5e2; --surface: #ffffff; --muted: #7a5568; --light: #c499b4;
        --green: #0d9e6e; --red: #d93025; --gold: #b8760a; --amber: #f59e0b;
        --blue: #2563eb; --sh: 0 2px 12px rgba(115,0,66,.08);
        --sh-lg: 0 16px 48px rgba(115,0,66,.16); --r: 14px; --r-sm: 8px;

        /* Responsive spacing tokens */
        --pad-x: 16px;        /* mobile default side padding */
        --pad-y: 20px;        /* mobile default vertical padding */
        --gap: 14px;          /* mobile default grid gap */

        font-family: 'DM Sans', sans-serif;
      }

      /* Tablet+ */
      @media(min-width:768px) {
        :root { --pad-x: 28px; --pad-y: 24px; --gap: 18px; }
      }
      /* Desktop */
      @media(min-width:1280px) {
        :root { --pad-x: 40px; --pad-y: 28px; --gap: 20px; }
      }

      *, *::before, *::after { box-sizing: border-box; }

      /* ─── Root Shell ────────────────────────────────────────── */
      /* Replaced fixed 24px/28px padding with fluid CSS vars     */
      .sa {
        background: var(--p-pale);
        min-height: 100vh;
        /* Fluid side padding: 16px on mobile → 40px on desktop   */
        padding: var(--pad-y) var(--pad-x);
        font-family: 'DM Sans', sans-serif;
        color: var(--ink);
        /* Prevent any child from causing horizontal scroll        */
        overflow-x: hidden;
        width: 100%;
      }

      /* ─── Hero Banner ───────────────────────────────────────── */
      .sa-hero {
        background: linear-gradient(135deg, var(--p-deep) 0%, var(--p-dark) 35%, var(--p) 65%, var(--p-light) 100%);
        border-radius: var(--r);
        /* Fluid padding: tighter on mobile, generous on desktop   */
        padding: clamp(20px, 4vw, 36px) clamp(20px, 4vw, 44px);
        margin-bottom: 22px;
        position: relative;
        overflow: hidden;
        box-shadow: var(--sh-lg);
      }
      .sa-hero::before {
        content:''; position:absolute; width:clamp(260px,50vw,500px); height:clamp(260px,50vw,500px);
        border-radius:50%; top:-50%; right:-8%;
        background:rgba(255,255,255,.04); pointer-events:none;
      }
      .sa-hero::after {
        content:''; position:absolute; width:clamp(180px,32vw,320px); height:clamp(180px,32vw,320px);
        border-radius:50%; bottom:-40%; left:42%;
        background:rgba(255,255,255,.03); pointer-events:none;
      }

      .sa-hero-badge {
        display:inline-flex; align-items:center; gap:6px;
        background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2);
        border-radius:99px; padding:4px 14px 4px 8px;
        font-size:11px; color:rgba(255,255,255,.85);
        letter-spacing:.5px; font-weight:600; text-transform:uppercase; margin-bottom:14px;
      }
      .sa-hero-badge-dot {
        width:6px; height:6px; border-radius:50%;
        background:#4ade80; box-shadow:0 0 6px #4ade80;
      }

      /* Fluid hero title: 22px mobile → 42px desktop             */
      .sa-hero-title {
        font-family:'Playfair Display',serif;
        font-size:clamp(22px, 4.5vw, 42px);
        color:#fff; margin:0 0 8px; font-weight:800;
        line-height:1.1; letter-spacing:-.5px;
        /* Prevent very long org names from overflowing            */
        word-break: break-word;
        /* Reserve space so hero-actions (absolute) don't overlap  */
        padding-right: clamp(0px, 20vw, 200px);
      }
      .sa-hero-sub {
        font-size:clamp(12px,1.5vw,13px);
        color:rgba(255,255,255,.6); font-weight:300;
        max-width:560px; line-height:1.65;
        /* Don't let quote text overflow behind action buttons      */
        padding-right: clamp(0px, 20vw, 200px);
      }

      .sa-hero-chips {
        display:flex; gap:8px; margin-top:18px;
        flex-wrap:wrap;
        /* Chips must not overflow hero width                       */
        max-width: 100%;
      }
      .sa-chip {
        background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.2);
        border-radius:99px; padding:5px 13px;
        font-size:clamp(10px,1.3vw,12px); color:rgba(255,255,255,.9);
        font-weight:500; backdrop-filter:blur(4px);
        white-space: nowrap;          /* prevent chip text wrapping */
      }

      /* Hero action buttons: absolute on tablet+, stacked below on mobile */
      .sa-hero-actions {
        position: absolute; top: 24px; right: clamp(16px, 3vw, 36px);
        display:flex; gap:8px; flex-wrap:wrap;
        /* Hidden behind hero content on very small screens        */
        max-width: clamp(120px, 35vw, 300px);
      }
      /* On phones, pull actions out of absolute flow to avoid overlap */
      @media(max-width:480px) {
        .sa-hero-actions {
          position: static;
          margin-top: 18px;
          max-width: 100%;
        }
        .sa-hero-title { padding-right: 0; }
        .sa-hero-sub   { padding-right: 0; }
      }

      .sa-hero-action-btn {
        background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25);
        color:#fff; padding:8px 14px; border-radius:var(--r-sm);
        font-size:clamp(11px,1.2vw,12px); font-weight:600; cursor:pointer;
        font-family:'DM Sans',sans-serif; transition:all .2s;
        display:flex; align-items:center; gap:6px;
        /* Touch-friendly minimum tap target                       */
        min-height: 36px;
      }
      .sa-hero-action-btn:hover { background:rgba(255,255,255,.25); }

      /* ─── Stats Grid ────────────────────────────────────────── */
      /* 5 cols → 3 cols (tablet) → 2 cols (phone) → 1 col (tiny) */
      .sa-stats {
        display:grid;
        grid-template-columns: repeat(5, 1fr);
        gap: var(--gap);
        margin-bottom: 22px;
      }
      @media(max-width:1200px){ .sa-stats { grid-template-columns:repeat(3,1fr); } }
      @media(max-width:760px)  { .sa-stats { grid-template-columns:repeat(2,1fr); } }
      @media(max-width:380px)  { .sa-stats { grid-template-columns:1fr; } }

      .sa-stat {
        background:var(--surface); border-radius:var(--r);
        border:1px solid var(--border); padding:18px 16px 14px;
        box-shadow:var(--sh); position:relative; overflow:hidden;
        transition:transform .2s, box-shadow .2s;
        /* Prevent value numbers from overflowing narrow cards     */
        min-width: 0;
      }
      .sa-stat:hover { transform:translateY(-3px); box-shadow:var(--sh-lg); }
      .sa-stat-accent { position:absolute; top:0; left:0; right:0; height:3px; }
      .sa-stat-icon {
        width:38px; height:38px; border-radius:10px;
        display:flex; align-items:center; justify-content:center;
        font-size:15px; margin-bottom:12px;
      }
      .sa-stat-lbl {
        font-size:10px; font-weight:600; letter-spacing:.7px;
        text-transform:uppercase; color:var(--muted); margin-bottom:4px;
      }
      /* Fluid stat value: smaller on tiny phones                  */
      .sa-stat-val {
        font-family:'Playfair Display',serif;
        font-size:clamp(26px, 4vw, 34px);
        line-height:1; color:var(--ink); font-weight:700;
      }
      .sa-stat-sub { font-size:11px; margin-top:6px; font-weight:500; }
      .sa-stat-bar {
        height:3px; background:var(--border); border-radius:99px;
        margin-top:10px; overflow:hidden;
      }
      .sa-stat-fill {
        height:100%; border-radius:99px;
        transition:width .9s cubic-bezier(.4,0,.2,1);
      }

      /* ─── Generic Panel ─────────────────────────────────────── */
      .sa-panel {
        background:var(--surface); border-radius:var(--r);
        border:1px solid var(--border); box-shadow:var(--sh); overflow:hidden;
        /* Prevent internal content from blowing out width         */
        min-width: 0;
      }
      .sa-panel-head {
        padding: 14px 18px; border-bottom:1px solid var(--border);
        display:flex; align-items:center; justify-content:space-between;
        gap:10px; flex-wrap:wrap;
        /* Ensure head content wraps instead of overflowing        */
        min-width: 0;
      }
      .sa-panel-title {
        font-family:'Playfair Display',serif;
        font-size:clamp(15px,2vw,17px);
        font-weight:700; color:var(--ink);
        display:flex; align-items:center; gap:8px;
        flex-shrink: 0;
      }
      .sa-live-dot {
        width:8px; height:8px; border-radius:50%;
        background:var(--green); animation:lp 2s infinite; flex-shrink:0;
      }
      @keyframes lp { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }

      /* ─── Attendance Map ─────────────────────────────────────── */
      /* Fixed 300px → fluid clamp so it's shorter on phones       */
      .sa-map-wrap {
        height: clamp(220px, 35vw, 320px);
        position:relative;
      }
      .sa-map-foot {
        padding:10px 18px; background:var(--p-wash);
        border-top:1px solid var(--border);
        display:flex; gap:14px; align-items:center; flex-wrap:wrap;
      }
      .sa-leg { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--muted); }
      .sa-leg-dot {
        width:10px; height:10px; border-radius:50%;
        border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,.2);
        flex-shrink: 0;
      }

      /* ─── Mid Grid (Map + Leaves) ───────────────────────────── */
      /* 2-col on laptop → 1-col on tablet/mobile                  */
      .sa-mid-grid {
        display:grid;
        grid-template-columns: 1fr 360px;
        gap: var(--gap);
        margin-bottom: 22px;
      }
      @media(max-width:1050px) { .sa-mid-grid { grid-template-columns:1fr; } }

      /* ─── Lower Grid (Dept + Announcements) ────────────────── */
      /* 2-col → 1-col on mobile                                   */
      .sa-lower-grid {
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--gap);
        margin-bottom: 22px;
      }
      @media(max-width:900px) { .sa-lower-grid { grid-template-columns:1fr; } }

      /* ─── Leave Panel ───────────────────────────────────────── */
      .sa-leave-scroll { overflow-y:auto; max-height:360px; }
      .sa-leave-scroll::-webkit-scrollbar { width:4px; }
      .sa-leave-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:99px; }
      .sa-leave-item {
        padding:12px 16px; border-bottom:1px solid var(--border);
        display:flex; align-items:flex-start; gap:11px;
        transition:background .15s;
      }
      .sa-leave-item:hover { background:var(--p-pale); }
      .sa-leave-item:last-child { border-bottom:none; }

      .sa-avatar {
        width:34px; height:34px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:11px; font-weight:700; color:white; flex-shrink:0;
      }
      .sa-leave-meta { flex:1; min-width:0; }
      .sa-leave-name {
        font-size:13px; font-weight:600; color:var(--ink);
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .sa-leave-info { font-size:11px; color:var(--muted); margin-top:2px; }
      .sa-leave-actions { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }

      .sa-btn-accept {
        background:#e8f7f1; color:var(--green); border:1px solid #b8e8d4;
        border-radius:6px; padding:5px 10px; font-size:11px; font-weight:600;
        cursor:pointer; display:flex; align-items:center; gap:4px;
        transition:all .15s; font-family:'DM Sans',sans-serif;
        min-height: 32px; /* touch-friendly */
      }
      .sa-btn-accept:hover { background:var(--green); color:white; }
      .sa-btn-reject {
        background:#fbeaea; color:var(--red); border:1px solid #f0c5c5;
        border-radius:6px; padding:5px 10px; font-size:11px; font-weight:600;
        cursor:pointer; display:flex; align-items:center; gap:4px;
        transition:all .15s; font-family:'DM Sans',sans-serif;
        min-height: 32px;
      }
      .sa-btn-reject:hover { background:var(--red); color:white; }

      /* ─── Tabs ──────────────────────────────────────────────── */
      .sa-tabs {
        display:flex; gap:0; border-bottom:1px solid var(--border);
        /* Allow tabs to scroll horizontally if they overflow      */
        overflow-x: auto; -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .sa-tabs::-webkit-scrollbar { display:none; }
      .sa-tab {
        padding:10px 16px; font-size:12px; font-weight:600; color:var(--muted);
        border-bottom:2px solid transparent; cursor:pointer; transition:all .15s;
        white-space:nowrap; background:none;
        border-top:none; border-left:none; border-right:none;
        font-family:'DM Sans',sans-serif;
        flex-shrink: 0; /* prevent tab text from wrapping         */
        min-height: 40px; /* touch target */
      }
      .sa-tab.active { color:var(--p); border-bottom-color:var(--p); }
      .sa-tab:hover:not(.active) { color:var(--ink); }

      /* ─── Badges ────────────────────────────────────────────── */
      .sa-badge {
        display:inline-flex; align-items:center;
        font-size:10px; font-weight:700; letter-spacing:.4px;
        padding:3px 9px; border-radius:99px;
        white-space: nowrap;
      }
      .sa-badge-pending    { background:#fff8e1; color:var(--gold); }
      .sa-badge-approved   { background:#e8f7f1; color:var(--green); }
      .sa-badge-rejected   { background:#fbeaea; color:var(--red); }
      .sa-badge-active     { background:#e8f7f1; color:var(--green); }
      .sa-badge-inactive   { background:#f3f4f6; color:#6b7280; }
      .sa-badge-suspended  { background:#fbeaea; color:var(--red); }
      .sa-badge-role-admin  { background:var(--p-wash); color:var(--p); }
      .sa-badge-role-senior { background:#ede9fe; color:#7c3aed; }
      .sa-badge-role-official { background:#e0f2fe; color:#0369a1; }

      /* ─── Admin Cards Grid ──────────────────────────────────── */
      /* auto-fill with 240px min → fluid on all widths            */
      .sa-admin-grid {
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
        gap:12px; padding:16px;
      }
      .sa-admin-card {
        border:1px solid var(--border); border-radius:var(--r-sm);
        padding:16px 14px; transition:all .2s; position:relative;
        min-width: 0; /* prevent card from overflowing grid cell   */
      }
      .sa-admin-card:hover { box-shadow:var(--sh); transform:translateY(-2px); background:var(--p-wash); }
      .sa-admin-ava {
        width:44px; height:44px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:14px; font-weight:700; color:white;
        background:linear-gradient(135deg,var(--p-dark),var(--p-light));
        margin:0 auto 10px;
      }
      .sa-admin-name  { font-size:13px; font-weight:700; color:var(--ink); text-align:center; word-break:break-word; }
      .sa-admin-desg  { font-size:11px; color:var(--muted); text-align:center; margin-top:2px; }
      .sa-admin-email { font-size:10px; color:var(--light); text-align:center; margin-top:4px; word-break:break-all; }
      .sa-admin-meta  { display:flex; justify-content:center; gap:5px; margin-top:8px; flex-wrap:wrap; }
      .sa-admin-actions {
        display:flex; justify-content:center; gap:6px;
        margin-top:10px; padding-top:10px; border-top:1px solid var(--border);
      }

      /* ─── Employee Cards Grid ───────────────────────────────── */
      .sa-emp-grid {
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr));
        gap:10px; padding:16px;
      }
      .sa-emp-card {
        border:1px solid var(--border); border-radius:var(--r-sm);
        padding:12px 10px; display:flex; align-items:center; gap:10px;
        transition:all .2s; min-width: 0;
      }
      .sa-emp-card:hover { box-shadow:var(--sh); background:var(--p-wash); }
      .sa-emp-ava {
        width:36px; height:36px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:12px; font-weight:700; color:white; flex-shrink:0;
      }
      .sa-emp-name {
        font-size:12px; font-weight:600; color:var(--ink); line-height:1.2;
        /* Truncate long names instead of overflowing              */
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .sa-emp-role  { font-size:11px; color:var(--muted); margin-top:1px; }
      .sa-emp-dept  {
        display:inline-block; font-size:10px; font-weight:600;
        background:var(--p-wash); color:var(--p);
        padding:2px 7px; border-radius:99px; margin-top:4px;
      }

      /* ─── Department List ───────────────────────────────────── */
      .sa-dept-item {
        padding:11px 18px; border-bottom:1px solid var(--border);
        display:flex; align-items:center; gap:12px; min-width: 0;
      }
      .sa-dept-item:last-child { border-bottom:none; }
      .sa-dept-name {
        font-size:12px; font-weight:600; color:var(--ink);
        /* Fixed width only above 400px; shrinks on tiny screens   */
        width: clamp(70px, 18vw, 120px); flex-shrink:0;
      }
      .sa-dept-bar-track { flex:1; height:7px; background:var(--border); border-radius:99px; overflow:hidden; min-width: 0; }
      .sa-dept-bar-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,var(--p-dark),var(--p-light)); transition:width 1s ease; }
      .sa-dept-count { font-size:12px; font-weight:700; color:var(--p); width:28px; text-align:right; flex-shrink:0; }

      /* ─── Announcement Cards ────────────────────────────────── */
      .sa-ann-card {
        border-radius:var(--r-sm); border:1px solid var(--border);
        padding:14px; margin:0 16px 10px; transition:all .2s;
        min-width: 0;
      }
      .sa-ann-card:hover { box-shadow:var(--sh); transform:translateY(-2px); }
      .sa-ann-chip {
        display:inline-block; font-size:10px; font-weight:700;
        letter-spacing:.5px; text-transform:uppercase;
        padding:3px 10px; border-radius:99px; margin-bottom:8px;
        white-space: nowrap;
      }
      .chip-general  { background:var(--p-wash); color:var(--p); }
      .chip-urgent   { background:#fbeaea; color:var(--red); }
      .chip-event    { background:#e8f7f1; color:var(--green); }
      .chip-policy   { background:#fff8e1; color:var(--gold); }
      .sa-ann-title  { font-size:13px; font-weight:600; color:var(--ink); margin-bottom:5px; word-break:break-word; }
      .sa-ann-body   { font-size:12px; color:var(--muted); line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .sa-ann-foot   { display:flex; gap:6px; margin-top:10px; padding-top:10px; border-top:1px solid var(--border); flex-wrap:wrap; }

      /* ─── Buttons (shared) ──────────────────────────────────── */
      .sa-btn-p {
        background:var(--p); color:white; border:none;
        padding:8px 14px; border-radius:var(--r-sm);
        font-size:12px; font-weight:600; cursor:pointer;
        display:flex; align-items:center; gap:6px;
        font-family:'DM Sans',sans-serif; transition:all .2s;
        white-space:nowrap; min-height:36px;
      }
      .sa-btn-p:hover { background:var(--p-dark); transform:translateY(-1px); box-shadow:0 4px 14px rgba(115,0,66,.3); }
      .sa-btn-p:disabled { opacity:.5; cursor:not-allowed; transform:none; }
      .sa-btn-ghost {
        background:none; color:var(--muted); border:1px solid var(--border);
        padding:8px 14px; border-radius:var(--r-sm); font-size:12px;
        font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif;
        transition:all .2s; white-space:nowrap; min-height:36px;
      }
      .sa-btn-ghost:hover { border-color:var(--p); color:var(--p); }
      .sa-icon-btn {
        background:none; border:none; cursor:pointer;
        padding:5px 8px; border-radius:5px; font-size:12px;
        color:var(--light); transition:all .15s;
        display:flex; align-items:center; gap:4px;
        font-family:'DM Sans',sans-serif; min-height:32px;
      }
      .sa-icon-btn:hover     { background:var(--p-wash); color:var(--p); }
      .sa-icon-btn.del:hover { background:#fbeaea; color:var(--red); }

      /* ─── Search Input ──────────────────────────────────────── */
      .sa-search-wrap { position:relative; }
      .sa-search-ico {
        position:absolute; left:10px; top:50%; transform:translateY(-50%);
        color:var(--light); font-size:12px; pointer-events:none;
      }
      .sa-search-inp {
        /* Fixed 200px → fluid, full-width on mobile               */
        padding:7px 10px 7px 30px;
        background:var(--p-pale); border:1px solid var(--border);
        border-radius:var(--r-sm); font-size:12px; color:var(--ink);
        font-family:'DM Sans',sans-serif; outline:none;
        width: clamp(140px, 25vw, 220px);
        transition:all .15s;
      }
      .sa-search-inp:focus { border-color:var(--p); box-shadow:0 0 0 3px var(--p-wash); }
      @media(max-width:480px) {
        .sa-search-inp { width: 100%; }
      }

      /* Review star */
      .sa-review-form { padding:20px; }
      .sa-stars { display:flex; gap:6px; margin-bottom:14px; }
      .sa-star { font-size:22px; cursor:pointer; color:var(--border); transition:color .15s; }
      .sa-star.active { color:var(--amber); }

      /* ─── Modal Overlay ─────────────────────────────────────── */
      .sa-overlay {
        position:fixed; inset:0;
        background:rgba(13,2,9,.65); backdrop-filter:blur(6px);
        z-index:1000; display:flex; align-items:center; justify-content:center;
        /* Fluid padding so modal never touches screen edges       */
        padding: clamp(12px, 3vw, 24px);
        animation:saov .18s;
      }
      @keyframes saov { from{opacity:0} to{opacity:1} }

      .sa-modal {
        background:var(--surface); border-radius:var(--r);
        /* Full-width on small screens, capped at 520px            */
        width:100%; max-width:520px;
        box-shadow:var(--sh-lg); animation:samup .22s;
        max-height:90vh; overflow-y:auto;
      }
      .sa-modal-lg { max-width:min(680px, 95vw); }

      @keyframes samup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

      .sa-modal-hd {
        padding:18px 22px 14px; border-bottom:1px solid var(--border);
        display:flex; align-items:center; justify-content:space-between;
        position:sticky; top:0; background:var(--surface); z-index:1;
        gap:10px;
      }
      .sa-modal-title {
        font-family:'Playfair Display',serif;
        font-size:clamp(17px,3vw,20px);
        font-weight:700; color:var(--ink);
        word-break: break-word;
      }
      .sa-modal-x {
        background:none; border:none; cursor:pointer;
        color:var(--muted); font-size:15px; padding:5px;
        border-radius:6px; transition:all .15s; flex-shrink:0;
        min-width:32px; min-height:32px;
      }
      .sa-modal-x:hover { background:var(--p-wash); color:var(--p); }
      .sa-modal-bd { padding:18px 22px; }
      .sa-modal-ft {
        padding:14px 22px; border-top:1px solid var(--border);
        display:flex; justify-content:flex-end; gap:10px;
        position:sticky; bottom:0; background:var(--surface);
        /* Stack buttons on very small modals                      */
        flex-wrap: wrap;
      }

      .sa-modal-section {
        font-size:10px; font-weight:700; letter-spacing:1px;
        text-transform:uppercase; color:var(--p);
        margin:18px 0 10px; padding-bottom:6px;
        border-bottom:1px solid var(--p-wash);
      }
      .sa-modal-section:first-child { margin-top:0; }

      /* ─── Form Fields ───────────────────────────────────────── */
      .sa-fld { margin-bottom:14px; }
      .sa-flbl {
        display:block; font-size:11px; font-weight:600;
        letter-spacing:.6px; text-transform:uppercase;
        color:var(--muted); margin-bottom:5px;
      }
      .sa-finp, .sa-fsel, .sa-ftxt {
        /* Always full-width inside modal/form                     */
        width:100%; padding:10px 12px;
        background:var(--p-pale); border:1px solid var(--border);
        border-radius:var(--r-sm); font-size:13px; color:var(--ink);
        font-family:'DM Sans',sans-serif; outline:none;
        transition:border-color .15s,box-shadow .15s;
        /* Prevent inputs from overflowing on small screens        */
        max-width: 100%;
      }
      .sa-finp:focus, .sa-fsel:focus, .sa-ftxt:focus {
        border-color:var(--p); box-shadow:0 0 0 3px var(--p-wash);
      }
      .sa-ftxt { resize:vertical; min-height:80px; line-height:1.6; }

      /* 2-col form row: stacks to 1 col on small modal width      */
      .sa-form-row {
        display:grid; grid-template-columns:1fr 1fr; gap:12px;
      }
      @media(max-width:480px) {
        .sa-form-row { grid-template-columns:1fr; }
      }

      /* 3-col form row: stacks to 1 col on mobile                 */
      .sa-form-row-3 {
        display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;
      }
      @media(max-width:540px) {
        .sa-form-row-3 { grid-template-columns:1fr 1fr; }
      }
      @media(max-width:380px) {
        .sa-form-row-3 { grid-template-columns:1fr; }
      }

      /* ─── Empty States ──────────────────────────────────────── */
      .sa-empty { text-align:center; padding:32px 20px; color:var(--light); }
      .sa-empty-ico { font-size:26px; margin-bottom:10px; }
      .sa-empty p { font-size:13px; margin:0; }

      /* ─── Map marker pulse animation ───────────────────────── */
      @keyframes mPulse {
        0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.5}
        50%{transform:translate(-50%,-50%) scale(2.4);opacity:0}
      }

      /* ─── Employee panel header wrapping fix ────────────────── */
      /* On narrow screens the search + button row needs to stack  */
      @media(max-width:560px) {
        .sa-panel-head .sa-emp-header-actions {
          flex-direction: column;
          align-items: stretch;
          width: 100%;
        }
        .sa-panel-head .sa-emp-header-actions .sa-search-wrap {
          width: 100%;
        }
        .sa-panel-head .sa-emp-header-actions .sa-search-inp {
          width: 100%;
        }
      }

      /* ─── Responsive panel head button groups ───────────────── */
      .sa-head-actions {
        display:flex; gap:8px; align-items:center; flex-wrap:wrap;
      }

      /* ─── Ensure no horizontal scroll bleeds from any child ─── */
      .sa-panel, .sa-modal, .sa-admin-grid, .sa-emp-grid { max-width:100%; }
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