import React, { useEffect, useState, useRef } from "react";
import {
  FaUsers, FaClock, FaCalendarAlt, FaBullhorn,
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck,
  FaMapMarkerAlt, FaChevronRight, FaBan, FaUserTie,
  FaBuilding, FaEnvelope, FaPhone, FaCheckCircle,
} from "react-icons/fa";
import Charts from "./Charts";
import { useGetMeAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import { useGetAllEmployee } from "../../auth/server-state/adminother/adminother.hook";
import {
  useGetForwardedLeaves,
  useAcceptLeave,
  useRejectLeave,
} from "../../auth/server-state/adminleave/adminleave.hook";
import {
  useGetAllAnnouncement,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "../../auth/server-state/adminannounce/adminannounce.hook";

// ── NEW: real check-in data hook ──────────────────────────────────────────────
import { useGetTodayCheckins } from "../../auth/server-state/adminother/adminother.hook";


const useInjectStyles = () => {
  useEffect(() => {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600&display=swap";
    document.head.appendChild(fontLink);

    const styleEl = document.createElement("style");
    styleEl.id = "dash-styles";
    styleEl.textContent = `
      :root {
        --p:       #730042;
        --p-dark:  #4a0029;
        --p-deep:  #2e0019;
        --p-mid:   #a0005c;
        --p-soft:  #c0527e;
        --p-wash:  #f7edf3;
        --p-pale:  #fdf5f9;
        --border:  #eedde8;
        --surface: #ffffff;
        --text:    #1a0010;
        --muted:   #8a6070;
        --light:   #c49ab2;
        --green:   #0d9e6e;
        --red:     #d93025;
        --gold:    #b8760a;
        --shadow:  0 2px 12px rgba(115,0,66,.09);
        --shadow-lg: 0 12px 40px rgba(115,0,66,.16);
        --r: 14px;
        --r-sm: 8px;
        font-family: 'Outfit', sans-serif;
      }

      .db { background: var(--p-pale); min-height: 100vh; padding: 24px 28px; font-family: 'Outfit', sans-serif; color: var(--text); }

      /* ── Hero ── */
      .hero {
        background: linear-gradient(135deg, var(--p-deep) 0%, var(--p-dark) 40%, var(--p) 70%, var(--p-mid) 100%);
        border-radius: var(--r);
        padding: 30px 36px;
        margin-bottom: 26px;
        position: relative;
        overflow: hidden;
        box-shadow: var(--shadow-lg);
      }
      .hero::before {
        content: ''; position: absolute;
        width: 420px; height: 420px; border-radius: 50%;
        top: -180px; right: -100px;
        background: rgba(255,255,255,.05);
        pointer-events: none;
      }
      .hero::after {
        content: ''; position: absolute;
        width: 260px; height: 260px; border-radius: 50%;
        bottom: -140px; left: 38%;
        background: rgba(255,255,255,.04);
        pointer-events: none;
      }
      .hero-eyebrow { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.5); margin-bottom: 8px; font-weight: 500; }
      .hero-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(26px, 3vw, 36px); color: #fff; margin: 0 0 6px; font-weight: 700; line-height: 1.1; }
      .hero-thought { font-size: 13px; color: rgba(255,255,255,.65); font-weight: 300; max-width: 520px; line-height: 1.6; }
      .hero-chips { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
      .hero-chip { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 99px; padding: 5px 14px; font-size: 12px; color: rgba(255,255,255,.85); font-weight: 500; backdrop-filter: blur(4px); }

      /* ── Stats Grid ── */
      .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; margin-bottom: 26px; }
      @media(max-width:1100px){ .stats-grid { grid-template-columns: repeat(2,1fr); } }
      @media(max-width:600px) { .stats-grid { grid-template-columns: 1fr; } }

      .stat-card {
        background: var(--surface);
        border-radius: var(--r);
        border: 1px solid var(--border);
        padding: 22px 20px 18px;
        box-shadow: var(--shadow);
        position: relative;
        overflow: hidden;
        transition: transform .2s, box-shadow .2s;
        cursor: default;
      }
      .stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
      .stat-card-stripe { position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: var(--p); }
      .stat-icon-ring {
        width: 44px; height: 44px; border-radius: 50%;
        background: var(--p-wash);
        display: flex; align-items: center; justify-content: center;
        color: var(--p); font-size: 16px;
        margin-bottom: 16px;
      }
      .stat-lbl { font-size: 11px; font-weight: 600; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
      .stat-val { font-family: 'Cormorant Garamond', serif; font-size: 36px; line-height: 1; color: var(--text); font-weight: 700; }
      .stat-sub { font-size: 11px; margin-top: 8px; font-weight: 500; }
      .stat-bar-track { height: 3px; background: var(--border); border-radius: 99px; margin-top: 12px; overflow: hidden; }
      .stat-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--p-dark), var(--p-soft)); transition: width .8s ease; }

      /* ── Panel ── */
      .panel { background: var(--surface); border-radius: var(--r); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
      .panel-head { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
      .panel-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 9px; }
      .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: livePulse 2s infinite; }
      @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }

      /* ── Map ── */
      .map-wrap { height: 310px; position: relative; }
      .map-footer { padding: 11px 20px; background: var(--p-wash); border-top: 1px solid var(--border); display: flex; gap: 20px; align-items: center; }
      .map-leg { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--muted); }
      .leg-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,.2); }

      /* ── Main layout ── */
      .mid-grid { display: grid; grid-template-columns: 1fr 370px; gap: 20px; margin-bottom: 26px; }
      @media(max-width:1050px){ .mid-grid { grid-template-columns: 1fr; } }

      .lower-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 26px; }
      @media(max-width:900px){ .lower-grid { grid-template-columns: 1fr; } }

      /* ── Leave Request Card ── */
      .leave-scroll { overflow-y: auto; max-height: 340px; }
      .leave-scroll::-webkit-scrollbar { width: 4px; }
      .leave-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

      .leave-item { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; gap: 12px; transition: background .15s; }
      .leave-item:hover { background: var(--p-pale); }
      .leave-item:last-child { border-bottom: none; }
      .leave-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; flex-shrink: 0; font-family: 'Outfit', sans-serif; background: var(--p); }
      .leave-meta { flex: 1; min-width: 0; }
      .leave-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .leave-info { font-size: 11px; color: var(--muted); margin-top: 2px; }
      .leave-actions { display: flex; gap: 6px; margin-top: 8px; }
      .btn-accept { background: #e8f7f1; color: var(--green); border: 1px solid #b8e8d4; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all .15s; font-family: 'Outfit',sans-serif; }
      .btn-accept:hover { background: var(--green); color: white; }
      .btn-reject { background: #fbeaea; color: var(--red); border: 1px solid #f0c5c5; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all .15s; font-family: 'Outfit',sans-serif; }
      .btn-reject:hover { background: var(--red); color: white; }

      .status-badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; letter-spacing: .4px; padding: 2px 8px; border-radius: 99px; }
      .status-pending  { background: #fff8e1; color: var(--gold); }
      .status-approved { background: #e8f7f1; color: var(--green); }
      .status-rejected { background: #fbeaea; color: var(--red); }

      /* ── Announcements ── */
      .ann-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px; }
      @media(max-width:700px){ .ann-grid { grid-template-columns: 1fr; } }
      .ann-card { border-radius: var(--r-sm); border: 1px solid var(--border); padding: 16px; transition: all .2s; cursor: default; }
      .ann-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
      .ann-type-chip { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 3px 10px; border-radius: 99px; margin-bottom: 8px; }
      .chip-general { background: var(--p-wash); color: var(--p); }
      .chip-urgent   { background: #fbeaea; color: var(--red); }
      .chip-event    { background: #e8f7f1; color: var(--green); }
      .chip-policy   { background: #fff8e1; color: var(--gold); }
      .ann-card-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 5px; line-height: 1.3; }
      .ann-card-body  { font-size: 12px; color: var(--muted); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .ann-card-foot  { display: flex; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
      .icon-btn { background: none; border: none; cursor: pointer; padding: 4px 7px; border-radius: 5px; font-size: 12px; color: var(--light); transition: all .15s; display: flex; align-items: center; gap: 4px; font-family: 'Outfit',sans-serif; }
      .icon-btn:hover { background: var(--p-wash); color: var(--p); }
      .icon-btn.del:hover { background: #fbeaea; color: var(--red); }

      /* ── Employee Grid ── */
      .emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; padding: 18px; }
      .emp-card { border: 1px solid var(--border); border-radius: var(--r-sm); padding: 16px 14px; display: flex; align-items: center; gap: 12px; transition: all .2s; }
      .emp-card:hover { box-shadow: var(--shadow); background: var(--p-wash); }
      .emp-ava { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; flex-shrink: 0; background: linear-gradient(135deg, var(--p-dark), var(--p-mid)); }
      .emp-name { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.2; }
      .emp-role { font-size: 11px; color: var(--muted); margin-top: 2px; }
      .emp-dept { display: inline-block; font-size: 10px; font-weight: 600; background: var(--p-wash); color: var(--p); padding: 2px 7px; border-radius: 99px; margin-top: 5px; }

      /* ── Charts wrapper ── */
      .charts-panel { background: var(--surface); border-radius: var(--r); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; margin-bottom: 26px; }
      .charts-body { padding: 20px; }

      /* ── Buttons ── */
      .btn-p { background: var(--p); color: white; border: none; padding: 8px 16px; border-radius: var(--r-sm); font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: 'Outfit',sans-serif; letter-spacing: .3px; transition: all .2s; }
      .btn-p:hover { background: var(--p-dark); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(115,0,66,.3); }
      .btn-ghost { background: none; color: var(--muted); border: 1px solid var(--border); padding: 8px 16px; border-radius: var(--r-sm); font-size: 12px; font-weight: 500; cursor: pointer; font-family: 'Outfit',sans-serif; transition: all .2s; }
      .btn-ghost:hover { border-color: var(--p); color: var(--p); }

      /* ── Modal ── */
      .overlay { position: fixed; inset: 0; background: rgba(30,0,18,.6); backdrop-filter: blur(5px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: ov .18s; }
      @keyframes ov { from{opacity:0} to{opacity:1} }
      .modal { background: var(--surface); border-radius: var(--r); width: 100%; max-width: 500px; box-shadow: var(--shadow-lg); animation: mup .22s; }
      @keyframes mup { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      .modal-hd { padding: 22px 26px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
      .modal-hd-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--text); }
      .modal-x { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 15px; padding: 5px; border-radius: 6px; transition: all .15s; }
      .modal-x:hover { background: var(--p-wash); color: var(--p); }
      .modal-bd { padding: 22px 26px; }
      .modal-ft { padding: 14px 26px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
      .fld { margin-bottom: 18px; }
      .flbl { display: block; font-size: 11px; font-weight: 600; letter-spacing: .6px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
      .finp, .ftxt, .fsel { width: 100%; padding: 10px 13px; background: var(--p-pale); border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 14px; color: var(--text); font-family: 'Outfit',sans-serif; outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
      .finp:focus, .ftxt:focus, .fsel:focus { border-color: var(--p); box-shadow: 0 0 0 3px var(--p-wash); }
      .ftxt { resize: vertical; min-height: 88px; line-height: 1.6; }

      /* ── Empty ── */
      .empty { text-align: center; padding: 38px 20px; color: var(--light); }
      .empty-ico { font-size: 28px; margin-bottom: 10px; }
      .empty p { font-size: 13px; }

      /* ── Section divider ── */
      .sec-divider { display: flex; align-items: center; gap: 12px; margin: 6px 0 18px; }
      .sec-divider-line { flex: 1; height: 1px; background: var(--border); }
      .sec-divider-txt { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--light); font-weight: 600; white-space: nowrap; }

      /* ── Map pulse (injected once globally) ── */
      @keyframes mPulse {
        0%,100% { transform: translate(-50%,-50%) scale(1); opacity: .5; }
        50%      { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(fontLink);
      const el = document.getElementById("dash-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);
};

/* ═══════════════════════════════════════════════════
   ATTENDANCE MAP  — uses real check-in data
═══════════════════════════════════════════════════ */
const ROLE_COLOR = { manager: "#730042", employee: "#a0005c" };

const fmtTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};

const AttendanceMap = ({ checkins = [], loading = false }) => {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const markersRef  = useRef([]);

  /* ── Boot Leaflet once ── */
  useEffect(() => {
    let active = true;
    (async () => {
      if (instanceRef.current || !mapRef.current) return;
      if (!window.L) {
        await new Promise((res) => {
          const css = document.createElement("link");
          css.rel  = "stylesheet";
          css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(css);
          const js  = document.createElement("script");
          js.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          js.onload = res;
          document.head.appendChild(js);
        });
      }
      if (!active || !mapRef.current || instanceRef.current) return;
      const L   = window.L;
      const map = L.map(mapRef.current, { zoomControl: false }).setView([22.5, 80.0], 5);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CARTO", maxZoom: 18,
      }).addTo(map);
      instanceRef.current = map;
    })();
    return () => { active = false; };
  }, []);

  /* ── Redraw markers whenever checkins changes ── */
  useEffect(() => {
    const L   = window.L;
    const map = instanceRef.current;
    if (!L || !map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (!checkins.length) return;

    const bounds = [];

    checkins.forEach(({ lat, lng, name, role, dept, email, checkIn, checkedOut }) => {
      if (!lat || !lng) return;
      const color  = ROLE_COLOR[role?.toLowerCase()] ?? ROLE_COLOR.employee;
      const size   = role?.toLowerCase() === "manager" ? 15 : 11;
      const pulse  = size + 14;
      const inits  = (name || "?").split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();

      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:${pulse}px;height:${pulse}px;">
          <div style="position:absolute;top:50%;left:50%;width:${pulse}px;height:${pulse}px;border-radius:50%;background:${color}33;animation:mPulse 2.2s infinite;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 10px ${color}66;${checkedOut ? "opacity:.4;" : ""}"></div>
        </div>`,
        iconSize: [pulse, pulse], iconAnchor: [pulse / 2, pulse / 2],
      });

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(
          `<div style="font-family:'Outfit',sans-serif;padding:6px 4px;min-width:175px;">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${inits}</div>
              <div>
                <div style="font-weight:700;font-size:13px;color:${color};">${name}</div>
                <div style="font-size:11px;color:#8a6070;text-transform:capitalize;">${role ?? ""}${dept ? " · " + dept : ""}</div>
              </div>
            </div>
            ${email ? `<div style="font-size:11px;color:#8a6070;margin-bottom:6px;">✉ ${email}</div>` : ""}
            <div style="font-size:11px;color:#333;">✅ <strong>Check-in:</strong> ${fmtTime(checkIn)}</div>
            ${checkedOut
              ? `<div style="font-size:11px;color:#0d9e6e;margin-top:3px;">🏁 Checked out</div>`
              : `<div style="font-size:11px;color:#b8760a;margin-top:3px;">🟡 Still on duty</div>`}
          </div>`,
          { closeButton: false, maxWidth: 220 }
        )
        .addTo(map);

      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 }); }
      catch (_) {}
    }
  }, [checkins]);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(253,245,249,.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "#8a6070", gap: 8, zIndex: 500,
        }}>
          <span style={{ fontSize: 18 }}>⏳</span> Fetching check-ins…
        </div>
      )}

      {/* Empty state */}
      {!loading && checkins.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 8, zIndex: 500, pointerEvents: "none",
        }}>
          <span style={{ fontSize: 32 }}>📍</span>
          <p style={{ fontSize: 13, color: "#8a6070", margin: 0 }}>No check-ins recorded yet today</p>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const leaveTypeColor = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("sick") || t.includes("sl")) return "#0d9e6e";
  if (t.includes("earn") || t.includes("el"))  return "#730042";
  if (t.includes("priv") || t.includes("pl"))  return "#b8760a";
  if (t.includes("mat")  || t.includes("ml"))  return "#7c3aed";
  return "#730042";
};

const ANN_TYPE_MAP = {
  general: "chip-general",
  urgent:  "chip-urgent",
  event:   "chip-event",
  policy:  "chip-policy",
};

/* ═══════════════════════════════════════════════════
   ANNOUNCEMENT MODAL
═══════════════════════════════════════════════════ */
const AnnModal = ({ open, onClose, initial, onSave, loading }) => {
  const [form, setForm] = useState({ title: "", message: "", type: "general" });

  useEffect(() => {
    if (open) setForm({ title: "", message: "", type: "general", ...(initial || {}) });
  }, [open]);

  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-hd-title">{initial ? "Edit Announcement" : "New Announcement"}</h2>
          <button className="modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="modal-bd">
          <div className="fld">
            <label className="flbl">Title</label>
            <input className="finp" placeholder="Announcement title…" value={form.title} onChange={set("title")} required />
          </div>
          <div className="fld">
            <label className="flbl">Type</label>
            <select className="fsel" value={form.type} onChange={set("type")}>
              <option value="general">General</option>
              <option value="urgent">Urgent</option>
              <option value="event">Event</option>
              <option value="policy">Policy</option>
            </select>
          </div>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label className="flbl">Message</label>
            <textarea className="ftxt" placeholder="Write your announcement…" value={form.message} onChange={set("message")} />
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-p" onClick={() => onSave(form)} disabled={loading || !form.title}>
            <FaCheck style={{ fontSize: 10 }} />
            {loading ? "Saving…" : initial ? "Update" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════ */
function Dashboard() {
  useInjectStyles();

  const [greeting, setGreeting]   = useState("");
  const [thought, setThought]     = useState("");
  const [annModal, setAnnModal]   = useState({ open: false, editing: null });
  const [empExpand, setEmpExpand] = useState(false);

  /* ── API Hooks ── */
  const { data: admin }                                         = useGetMeAdmin();
  const { data: empData,      isLoading: empLoading     }      = useGetAllEmployee();
  const { data: leaveData,    isLoading: leaveLoading   }      = useGetForwardedLeaves();
  const { data: annRaw,       isLoading: annLoading     }      = useGetAllAnnouncement();
  // ── REAL MAP DATA ──
  const { data: checkinData,  isLoading: mapLoading     }      = useGetTodayCheckins();

  const { mutate: acceptLeave, isPending: accepting } = useAcceptLeave();
  const { mutate: rejectLeave, isPending: rejecting } = useRejectLeave();
  const { mutate: createAnn,   isPending: creating  } = useCreateAnnouncement();
  const { mutate: deleteAnn                         } = useDeleteAnnouncement();
  const { mutate: updateAnn,   isPending: updating  } = useUpdateAnnouncement();

  /* ── Normalise data ── */
  const employees = Array.isArray(empData?.employees)
    ? empData.employees
    : Array.isArray(empData) ? empData : [];

  const leaves = Array.isArray(leaveData?.leaves)
    ? leaveData.leaves
    : Array.isArray(leaveData) ? leaveData : [];

  const announcements = Array.isArray(annRaw?.announcements)
    ? annRaw.announcements
    : Array.isArray(annRaw) ? annRaw : [];

  // Real check-ins for the map + "Present Today" stat
  const checkins      = checkinData?.checkins ?? [];
  const presentToday  = checkinData?.total    ?? checkins.length;
  const stillOnDuty   = checkins.filter((c) => !c.checkedOut).length;
  const attendanceRate = employees.length > 0
    ? Math.round((presentToday / employees.length) * 100)
    : 0;

  const totalEmployees = empData?.count || employees.length || 0;
  const pendingLeaves  = leaves.filter((l) => (l.status || "").toLowerCase() === "pending").length
    || leaveData?.count || 0;
  const totalAnn = announcements.length;

  /* ── Greeting ── */
  const THOUGHTS = [
    "Great teams are built on trust and transparency.",
    "Leadership is not about being in charge — it's about caring.",
    "Small decisions made consistently become culture.",
    "Your team's success is your greatest achievement.",
    "Clarity is kindness. Communicate with purpose.",
  ];
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : h < 21 ? "Good Evening 🌆" : "Good Night 🌙");
    setThought(THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
  }, []);

  /* ── Stats — "Present Today" now uses live checkin count ── */
  const stats = [
    {
      icon: <FaUsers />,
      label: "Total Employees",
      value: empLoading ? "—" : totalEmployees,
      sub: "+2% from last month",
      subColor: "var(--green)",
      bar: null,
    },
    {
      icon: <FaClock />,
      label: "Present Today",
      value: mapLoading ? "—" : presentToday,
      sub: mapLoading ? "Loading…" : `${attendanceRate}% attendance · ${stillOnDuty} on duty`,
      subColor: "var(--muted)",
      bar: mapLoading ? null : attendanceRate,
    },
    {
      icon: <FaCalendarAlt />,
      label: "Pending Leaves",
      value: leaveLoading ? "—" : pendingLeaves,
      sub: pendingLeaves > 0 ? "Needs attention" : "All clear",
      subColor: pendingLeaves > 0 ? "var(--gold)" : "var(--green)",
      bar: null,
    },
    {
      icon: <FaBullhorn />,
      label: "Announcements",
      value: annLoading ? "—" : totalAnn,
      sub: "Active broadcasts",
      subColor: "var(--muted)",
      bar: null,
    },
  ];

  /* ── Announcement handlers ── */
  const saveAnn = (form) => {
    if (annModal.editing) {
      updateAnn(
        { id: annModal.editing._id, data: form },
        { onSuccess: () => setAnnModal({ open: false, editing: null }) }
      );
    } else {
      createAnn(form, { onSuccess: () => setAnnModal({ open: false, editing: null }) });
    }
  };
  const removeAnn = (id) => { if (window.confirm("Delete this announcement?")) deleteAnn(id); };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const displayEmployees = empExpand ? employees : employees.slice(0, 8);

  return (
    <div className="db">

      {/* ━━━━━━ HERO ━━━━━━ */}
      <div className="hero">
        <p className="hero-eyebrow">{today}</p>
        <h1 className="hero-title">
          {greeting}, {admin?.organisation_name || "Admin"}!
        </h1>
        <p className="hero-thought">"{thought}"</p>
        <div className="hero-chips">
          <span className="hero-chip">🏢 {totalEmployees} Employees</span>
          {presentToday > 0 && (
            <span className="hero-chip">✅ {presentToday} Present Today</span>
          )}
          {pendingLeaves > 0 && (
            <span className="hero-chip">📋 {pendingLeaves} Leave{pendingLeaves > 1 ? "s" : ""} Pending</span>
          )}
          <span className="hero-chip">📢 {totalAnn} Announcement{totalAnn !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ━━━━━━ STATS ━━━━━━ */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-card-stripe" />
            <div className="stat-icon-ring">{s.icon}</div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val">{s.value}</div>
            <p className="stat-sub" style={{ color: s.subColor }}>{s.sub}</p>
            {s.bar !== null && (
              <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${s.bar}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ━━━━━━ MAP + LEAVE REQUESTS ━━━━━━ */}
      <div className="mid-grid">

        {/* ── Live Attendance Map ── */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <div className="live-dot" />
              Live Attendance Map
            </div>
            <span style={{ fontSize: 11, color: "var(--light)", fontWeight: 500 }}>
              <FaMapMarkerAlt style={{ marginRight: 4 }} />
              {mapLoading
                ? "Loading…"
                : `${checkins.length} check-in${checkins.length !== 1 ? "s" : ""} today`}
            </span>
          </div>

          <div className="map-wrap">
            {/* Pass real data — no more hardcoded pins */}
            <AttendanceMap checkins={checkins} loading={mapLoading} />
          </div>

          <div className="map-footer">
            <div className="map-leg">
              <div className="leg-dot" style={{ background: "#730042" }} />
              Manager
            </div>
            <div className="map-leg">
              <div className="leg-dot" style={{ background: "#a0005c" }} />
              Employee
            </div>
            <div className="map-leg" style={{ marginLeft: 4 }}>
              <div className="leg-dot" style={{ background: "#aaa", opacity: .5 }} />
              Checked out
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--light)" }}>
              Click a pin for details · updates every 2 min
            </span>
          </div>
        </div>

        {/* ── Leave Requests ── */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="panel-head">
            <div className="panel-title">
              <FaCalendarAlt style={{ color: "var(--p)", fontSize: 15 }} />
              Leave Requests
            </div>
            {pendingLeaves > 0 && (
              <span style={{
                background: "#fff8e1", color: "var(--gold)", fontSize: 11,
                fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: "1px solid #f0d870",
              }}>
                {pendingLeaves} pending
              </span>
            )}
          </div>

          <div className="leave-scroll" style={{ flex: 1 }}>
            {leaveLoading ? (
              <div className="empty"><div className="empty-ico">⏳</div><p>Loading…</p></div>
            ) : leaves.length === 0 ? (
              <div className="empty">
                <div className="empty-ico"><FaCheckCircle style={{ color: "var(--green)" }} /></div>
                <p>No leave requests.<br />All employees are accounted for.</p>
              </div>
            ) : (
              leaves.map((leave) => {
                const name      = leave.employeeName || leave.name || leave.user?.name || "Employee";
                const type      = leave.leaveType    || leave.type || "Leave";
                const from      = leave.from         || leave.startDate || leave.fromDate || "";
                const to        = leave.to           || leave.endDate   || leave.toDate   || "";
                const status    = (leave.status || "pending").toLowerCase();
                const isPending = status === "pending";

                const fmtDate = (d) => {
                  if (!d) return "";
                  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
                  catch { return d; }
                };

                return (
                  <div key={leave._id || leave.id} className="leave-item">
                    <div className="leave-avatar" style={{ background: leaveTypeColor(type) }}>
                      {initials(name)}
                    </div>
                    <div className="leave-meta">
                      <div className="leave-name">{name}</div>
                      <div className="leave-info">
                        {type} · {fmtDate(from)}{to && to !== from ? ` → ${fmtDate(to)}` : ""}
                      </div>
                      {leave.reason && (
                        <div className="leave-info" style={{ marginTop: 2, fontStyle: "italic" }}>
                          "{leave.reason}"
                        </div>
                      )}
                      {isPending ? (
                        <div className="leave-actions">
                          <button
                            className="btn-accept"
                            onClick={() => acceptLeave(leave._id || leave.id)}
                            disabled={accepting}
                          >
                            <FaCheck /> Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => rejectLeave(leave._id || leave.id)}
                            disabled={rejecting}
                          >
                            <FaBan /> Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ marginTop: 6 }}>
                          <span className={`status-badge status-${status}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
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

      {/* ━━━━━━ ANNOUNCEMENTS ━━━━━━ */}
      <div className="panel" style={{ marginBottom: 26 }}>
        <div className="panel-head">
          <div className="panel-title">
            <FaBullhorn style={{ color: "var(--p)", fontSize: 15 }} />
            Announcements
          </div>
          <button className="btn-p" onClick={() => setAnnModal({ open: true, editing: null })}>
            <FaPlus style={{ fontSize: 10 }} /> New
          </button>
        </div>

        {annLoading ? (
          <div className="empty"><div className="empty-ico">⏳</div><p>Loading…</p></div>
        ) : announcements.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">📢</div>
            <p>No announcements yet.<br />Publish one to notify your team.</p>
          </div>
        ) : (
          <div className="ann-grid">
            {announcements.map((ann) => {
              const typeKey = (ann.type || "general").toLowerCase();
              const chipCls = ANN_TYPE_MAP[typeKey] || "chip-general";
              return (
                <div className="ann-card" key={ann._id}>
                  <span className={`ann-type-chip ${chipCls}`}>
                    {typeKey.charAt(0).toUpperCase() + typeKey.slice(1)}
                  </span>
                  <div className="ann-card-title">{ann.title}</div>
                  <div className="ann-card-body">{ann.message}</div>
                  <div className="ann-card-foot">
                    <button
                      className="icon-btn"
                      onClick={() => setAnnModal({ open: true, editing: ann })}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button className="icon-btn del" onClick={() => removeAnn(ann._id)}>
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ━━━━━━ EMPLOYEE OVERVIEW ━━━━━━ */}
      <div className="panel" style={{ marginBottom: 26 }}>
        <div className="panel-head">
          <div className="panel-title">
            <FaUsers style={{ color: "var(--p)", fontSize: 15 }} />
            Employee Overview
          </div>
          {employees.length > 8 && (
            <button
              className="btn-ghost"
              style={{ fontSize: 12, padding: "6px 14px" }}
              onClick={() => setEmpExpand((v) => !v)}
            >
              {empExpand ? "Show Less" : `View All (${employees.length})`}
              <FaChevronRight style={{
                fontSize: 10, marginLeft: 4,
                transform: empExpand ? "rotate(90deg)" : "none",
                transition: ".2s",
              }} />
            </button>
          )}
        </div>

        {empLoading ? (
          <div className="empty"><div className="empty-ico">⏳</div><p>Loading employees…</p></div>
        ) : employees.length === 0 ? (
          <div className="empty">
            <div className="empty-ico"><FaUsers /></div>
            <p>No employees found.</p>
          </div>
        ) : (
          <div className="emp-grid">
            {displayEmployees.map((emp, i) => {
              const name  = emp.name || emp.fullName || emp.username || "Employee";
              const role  = emp.role || emp.designation || emp.position || "";
              const dept  = emp.department || emp.dept || "";
              const email = emp.email || emp.workEmail || "";
              return (
                <div className="emp-card" key={emp._id || emp.id || i}>
                  <div className="emp-ava">{initials(name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="emp-name">{name}</div>
                    {role  && <div className="emp-role">{role}</div>}
                    {dept  && <span className="emp-dept">{dept}</span>}
                    {email && (
                      <div style={{ fontSize: 10, color: "var(--light)", marginTop: 4 }}>
                        <FaEnvelope style={{ marginRight: 4 }} />{email}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ━━━━━━ CHARTS (preserved, uncomment to enable) ━━━━━━ */}
      {/* <div className="charts-panel">
        <div className="panel-head">
          <div className="panel-title">Analytics Overview</div>
        </div>
        <div className="charts-body">
          <Charts />
        </div>
      </div> */}

      {/* ━━━━━━ ANNOUNCEMENT MODAL ━━━━━━ */}
      <AnnModal
        open={annModal.open}
        onClose={() => setAnnModal({ open: false, editing: null })}
        initial={
          annModal.editing
            ? { title: annModal.editing.title, message: annModal.editing.message, type: annModal.editing.type || "general" }
            : null
        }
        onSave={saveAnn}
        loading={creating || updating}
      />
    </div>
  );
}

export default React.memo(Dashboard);