import React, { useEffect, useState, useRef } from "react";
import {
  FaUsers, FaClock, FaCalendarAlt, FaBullhorn,
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck,
  FaMapMarkerAlt, FaChevronRight, FaBan, FaEnvelope, FaCheckCircle, FaStar,
} from "react-icons/fa";
import Charts from "./Charts"; // Assuming this is used elsewhere or imported correctly
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
import { useGetTodayCheckins } from "../../auth/server-state/adminother/adminother.hook";

// Minimal styles for keyframes and leaflet overrides
const GlobalDashStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600&display=swap');
    
    @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
    @keyframes mPulse { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity: .5; } 50% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; } }
    @keyframes progressIn { from { width: 0; } }
    @keyframes ov { from{opacity:0} to{opacity:1} }
    @keyframes mup { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #0d9e6e; animation: livePulse 2s infinite; }
    .lb-bar-fill { animation: progressIn .8s ease both; }
    
    .leaflet-container { font-family: 'Outfit', sans-serif; }
    .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    .leaflet-popup-content { margin: 12px 16px; }
  `}</style>
);

const initials = (name = "") =>
  name.trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const leaveTypeColor = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("sick") || t.includes("sl")) return "#0d9e6e";
  if (t.includes("earn") || t.includes("el")) return "#730042";
  if (t.includes("priv") || t.includes("pl")) return "#b8760a";
  if (t.includes("mat") || t.includes("ml"))  return "#7c3aed";
  return "#730042";
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};

const AttendanceMap = ({ checkins = [], loading = false }) => {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const markersRef  = useRef([]);

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

  useEffect(() => {
    const L   = window.L;
    const map = instanceRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (!checkins.length) return;

    const bounds = [];
    checkins.forEach(({ lat, lng, name, role, dept, email, checkIn, checkedOut }) => {
      if (!lat || !lng) return;
      const color = role?.toLowerCase() === "manager" ? "#730042" : "#a0005c";
      const size  = role?.toLowerCase() === "manager" ? 15 : 11;
      const pulse = size + 14;
      const inits = initials(name || "?");

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
                <div style="font-weight:700;font-size:13px;color:${color};">${name || "Unknown"}</div>
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

  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      {loading && (
        <div className="absolute inset-0 bg-[#fdf5f9]/75 flex items-center justify-center text-sm text-[#8a6070] gap-2 z-[500]">
          <span className="text-lg">⏳</span> Fetching check-ins…
        </div>
      )}
      {!loading && checkins.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-[500] pointer-events-none">
          <span className="text-3xl">📍</span>
          <p className="text-sm text-[#8a6070] m-0">No check-ins recorded yet today</p>
        </div>
      )}
    </div>
  );
};

const AnnModal = ({ open, onClose, initial, onSave, loading }) => {
  const [form, setForm] = useState({ title: "", message: "", type: "general" });

  useEffect(() => {
    if (open) setForm({ title: "", message: "", type: "general", ...(initial || {}) });
  }, [open]);

  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-[ov_.18s]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-[mup_.22s] flex flex-col max-h-[90vh]">
        <div className="p-5 sm:p-6 border-b border-[#eedde8] flex items-center justify-between shrink-0">
          <h2 className="font-['Cormorant_Garamond',serif] text-xl sm:text-2xl font-bold text-[#1a0010]">
            {initial ? "Edit Announcement" : "New Announcement"}
          </h2>
          <button className="bg-none border-none cursor-pointer text-[#8a6070] text-base p-1.5 rounded-md hover:bg-[#f7edf3] hover:text-[#730042]" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-xs font-semibold tracking-wide uppercase text-[#8a6070] mb-1.5">Title</label>
            <input 
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-lg text-sm text-[#1a0010] outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 box-border"
              placeholder="Announcement title…" 
              value={form.title} 
              onChange={set("title")} 
              required 
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold tracking-wide uppercase text-[#8a6070] mb-1.5">Type</label>
            <select 
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-lg text-sm text-[#1a0010] outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 box-border cursor-pointer"
              value={form.type} 
              onChange={set("type")}
            >
              <option value="general">General</option>
              <option value="urgent">Urgent</option>
              <option value="event">Event</option>
              <option value="policy">Policy</option>
            </select>
          </div>
          <div className="mb-0">
            <label className="block text-xs font-semibold tracking-wide uppercase text-[#8a6070] mb-1.5">Message</label>
            <textarea 
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-lg text-sm text-[#1a0010] outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 box-border resize-y min-h-[88px] leading-relaxed"
              placeholder="Write your announcement…" 
              value={form.message} 
              onChange={set("message")} 
            />
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-[#eedde8] flex justify-end gap-2.5 shrink-0">
          <button className="bg-none text-[#8a6070] border border-[#eedde8] px-4 py-2 rounded-lg text-xs font-medium cursor-pointer hover:border-[#730042] hover:text-[#730042]" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="bg-[#730042] text-white border-none px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-[#4a0029] transition-all disabled:opacity-50"
            onClick={() => onSave(form)} 
            disabled={loading || !form.title}
          >
            <FaCheck className="text-[10px]" />
            {loading ? "Saving…" : initial ? "Update" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StarDisplay = ({ rating, max = 5 }) => {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: max }, (_, i) => (
        <FaStar
          key={i}
          className="text-[13px]"
          style={{ color: i < Math.round(rating) ? "#e8b84b" : "#eedde8" }}
        />
      ))}
      <span className="text-xs text-[#8a6070] ml-1.5 font-semibold">
        {Number(rating).toFixed(1)}
      </span>
    </div>
  );
};

const LeaveBalancePanel = ({ leaveBalance, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm p-5">
        <div className="text-sm text-[#8a6070]">Loading leave balance…</div>
      </div>
    );
  }

  if (!leaveBalance) {
    return (
      <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm">
        <div className="text-center py-10 px-5 text-[#c49ab2]">
          <div className="text-3xl mb-2.5">📋</div>
          <p className="text-sm">No leave balance found.</p>
        </div>
      </div>
    );
  }

  const lb = leaveBalance;

  const rows = [
    {
      label: "Earned Leave (EL)",
      availed: lb.EL?.availed ?? 0,
      entitled: lb.EL?.entitled ?? 0,
      accrued: lb.EL?.accrued != null ? Number(lb.EL.accrued).toFixed(2) : null,
      color: "#730042",
    },
    {
      label: "Sick Leave (SL)",
      availed: lb.SL?.availed ?? 0,
      entitled: lb.SL?.entitled ?? 0,
      accrued: null,
      color: "#0d9e6e",
    },
    {
      label: "Paternity Leave (PL)",
      availed: lb.pbc ?? 0,
      entitled: lb.PL ?? 0,
      accrued: null,
      color: "#185FA5",
    },
    {
      label: "Maternity Leave (ML)",
      availed: 0,
      entitled: lb.ML ?? 0,
      accrued: null,
      color: "#7c3aed",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 sm:p-5 border-b border-[#eedde8] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-['Cormorant_Garamond',serif] text-lg font-bold text-[#1a0010]">
          <FaCalendarAlt className="text-[#730042] text-sm" />
          My Leave Balance
        </div>
        <span className="text-xs text-[#c49ab2] font-medium hidden sm:inline">FY 2025–26</span>
      </div>
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
        {rows.map((row, i) => {
          const remaining = row.entitled - row.availed;
          const pct = row.entitled > 0 ? Math.min(100, Math.round((row.availed / row.entitled) * 100)) : 0;
          return (
            <div className="py-3 border-b border-[#eedde8] last:border-b-0" key={i}>
              <div className="flex justify-between items-start mb-1.5">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-[#1a0010]">{row.label}</div>
                  {row.accrued != null && (
                    <div className="text-[10px] text-[#8a6070] mt-0.5">
                      Accrued this month: <strong>{row.accrued}</strong>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold leading-none font-['Cormorant_Garamond',serif]" style={{ color: row.color }}>
                    {remaining}
                  </div>
                  <div className="text-[10px] text-[#8a6070] mt-0.5">of {row.entitled} left</div>
                </div>
              </div>
              <div className="h-1 bg-[#eedde8] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
              </div>
              <div className="text-[10px] text-[#8a6070] mt-1">
                {row.availed} used · {pct}%
              </div>
            </div>
          );
        })}

        <div className="flex gap-2 flex-wrap mt-2.5 pt-2.5 border-t border-[#eedde8]">
          {[
            ["LWP Used", lb.lwp ?? 0],
            ["PBC", lb.pbc ?? 0],
          ].map(([l, v]) => (
            <div key={l} className="bg-[#fdf5f9] border border-[#eedde8] rounded-lg px-3 py-1.5 text-xs">
              <span className="text-[#8a6070]">{l} </span>
              <strong className="text-[#1a0010]">{v}</strong>
            </div>
          ))}
          {lb.lastAccrualDate && (
            <div className="bg-[#fdf5f9] border border-[#eedde8] rounded-lg px-3 py-1.5 text-xs">
              <span className="text-[#8a6070]">Last accrual </span>
              <strong className="text-[#1a0010]">
                {new Date(lb.lastAccrualDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewsPanel = ({ reviews, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm p-5">
        <div className="text-sm text-[#8a6070]">Loading reviews…</div>
      </div>
    );
  }

  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const avg = safeReviews.length
    ? safeReviews.reduce((s, r) => s + (r.rating || 0), 0) / safeReviews.length
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 sm:p-5 border-b border-[#eedde8] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-['Cormorant_Garamond',serif] text-lg font-bold text-[#1a0010]">
          <FaStar className="text-[#e8b84b] text-sm" />
          Reviews Received
        </div>
        {safeReviews.length > 0 && (
          <span className="bg-[#fff8e1] text-[#b8760a] text-xs font-bold px-2.5 py-1 rounded-full border border-[#f0d870]">
            {safeReviews.length} review{safeReviews.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
        {safeReviews.length === 0 ? (
          <div className="text-center py-10 px-5 text-[#c49ab2]">
            <div className="text-3xl mb-2.5">⭐</div>
            <p className="text-sm">No reviews received yet.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-4 pb-4 border-b border-[#eedde8]">
              <div className="font-['Cormorant_Garamond',serif] text-5xl font-bold text-[#e8b84b] leading-none">
                {avg.toFixed(1)}
              </div>
              <div className="pb-1">
                <StarDisplay rating={avg} />
                <div className="text-xs text-[#8a6070] mt-1">
                  Based on {safeReviews.length} review{safeReviews.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              {[5, 4, 3, 2, 1].map((star) => {
                const cnt = safeReviews.filter((r) => Math.round(r.rating) === star).length;
                const pct = safeReviews.length > 0 ? (cnt / safeReviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-[#8a6070] w-2">{star}</span>
                    <FaStar className="text-xs text-[#e8b84b]" />
                    <div className="flex-1 h-1.5 rounded bg-[#eedde8] overflow-hidden">
                      <div className="h-full rounded bg-[#e8b84b]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-[#8a6070] w-3.5 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5">
              {safeReviews.map((rev, i) => {
                const reviewerName = rev.reviewer
                  ? [rev.reviewer.f_name, rev.reviewer.l_name].filter(Boolean).join(" ")
                  : "Unknown";
                const reviewerRole = rev.reviewer?.role || rev.reviewerRole || "";
                return (
                  <div key={rev._id || i} className="bg-[#fdf5f9] rounded-lg p-3 border-l-4 border-[#e8b84b]">
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#730042] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                          {initials(reviewerName)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#1a0010] truncate">{reviewerName}</div>
                          <div className="text-[10px] text-[#8a6070] capitalize">{reviewerRole.replace("_", " ")}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StarDisplay rating={rev.rating} />
                        <div className="text-[10px] text-[#8a6070] mt-0.5">{rev.monthYear}</div>
                      </div>
                    </div>
                    {rev.comment && (
                      <div className="text-xs text-[#8a6070] italic leading-relaxed mt-1.5">
                        "{rev.comment}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function Dashboard() {
  const [greeting, setGreeting]   = useState("");
  const [thought, setThought]     = useState("");
  const [annModal, setAnnModal]   = useState({ open: false, editing: null });
  const [empExpand, setEmpExpand] = useState(false);

  const { data: adminData, isLoading: adminLoading } = useGetMeAdmin();
  const { data: empData,   isLoading: empLoading  } = useGetAllEmployee();
  const { data: leaveData, isLoading: leaveLoading} = useGetForwardedLeaves();
  const { data: annRaw,    isLoading: annLoading  } = useGetAllAnnouncement();
  const { data: checkinData, isLoading: mapLoading} = useGetTodayCheckins();

  const { mutate: acceptLeave, isPending: accepting } = useAcceptLeave();
  const { mutate: rejectLeave, isPending: rejecting } = useRejectLeave();
  const { mutate: createAnn,   isPending: creating  } = useCreateAnnouncement();
  const { mutate: deleteAnn                         } = useDeleteAnnouncement();
  const { mutate: updateAnn,   isPending: updating  } = useUpdateAnnouncement();

  const admin        = adminData?.user       ?? null;
  const leaveBalance = adminData?.leaveBalance ?? null;
  const reviews      = adminData?.reviews    ?? [];

  const employees = Array.isArray(empData?.employees)
    ? empData.employees
    : Array.isArray(empData) ? empData : [];

  const leaves = Array.isArray(leaveData?.leaves)
    ? leaveData.leaves
    : Array.isArray(leaveData) ? leaveData : [];

  const announcements = Array.isArray(annRaw?.announcements)
    ? annRaw.announcements
    : Array.isArray(annRaw) ? annRaw : [];

  const checkins       = checkinData?.checkins ?? [];
  const presentToday   = checkinData?.total    ?? checkins.length;
  const stillOnDuty    = checkins.filter((c) => !c.checkedOut).length;
  const attendanceRate = employees.length > 0
    ? Math.round((presentToday / employees.length) * 100)
    : 0;

  const totalEmployees = empData?.count || employees.length || 0;
  const pendingLeaves  = leaves.filter((l) => (l.status || "").toLowerCase() === "pending").length
    || leaveData?.count || 0;
  const totalAnn = announcements.length;

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : null;

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

  const adminName = admin
    ? [admin.f_name, admin.l_name].filter(Boolean).join(" ")
    : admin?.organisation_name || "Admin";

  const stats = [
    {
      icon: <FaUsers />,
      label: "Total Employees",
      value: empLoading ? "—" : totalEmployees,
      sub: "+2% from last month",
      subColor: "#0d9e6e",
      bar: null,
    },
    {
      icon: <FaClock />,
      label: "Present Today",
      value: mapLoading ? "—" : presentToday,
      sub: mapLoading ? "Loading…" : `${attendanceRate}% attendance · ${stillOnDuty} on duty`,
      subColor: "#8a6070",
      bar: mapLoading ? null : attendanceRate,
    },
    {
      icon: <FaCalendarAlt />,
      label: "Pending Leaves",
      value: leaveLoading ? "—" : pendingLeaves,
      sub: pendingLeaves > 0 ? "Needs attention" : "All clear",
      subColor: pendingLeaves > 0 ? "#b8760a" : "#0d9e6e",
      bar: null,
    },
    {
      icon: <FaStar />,
      label: "My Rating",
      value: adminLoading ? "—" : avgRating != null ? avgRating.toFixed(1) : "—",
      sub: reviews.length > 0 ? `${reviews.length} review${reviews.length !== 1 ? "s" : ""} received` : "No reviews yet",
      subColor: avgRating != null ? "#e8b84b" : "#8a6070",
      bar: avgRating != null ? Math.round((avgRating / 5) * 100) : null,
    },
  ];

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
    <div className="min-h-screen w-full overflow-x-hidden bg-[#fdf5f9] p-4 sm:p-6 lg:p-8 font-['Outfit',sans-serif] text-[#1a0010]">
      <GlobalDashStyles />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#2e0019] via-[#4a0029] to-[#730042] rounded-2xl p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8 relative overflow-hidden shadow-lg">
        <div className="absolute w-[420px] h-[420px] rounded-full top-[-180px] right-[-100px] bg-white/5 pointer-events-none hidden md:block"></div>
        <div className="absolute w-[260px] h-[260px] rounded-full bottom-[-140px] left-[38%] bg-white/5 pointer-events-none hidden md:block"></div>
        
        <p className="text-[11px] tracking-widest uppercase text-white/50 mb-2 font-medium">{today}</p>
        <h1 className="font-['Cormorant_Garamond',serif] text-2xl sm:text-3xl lg:text-4xl text-white font-bold leading-tight m-0">
          {greeting}, {adminName}!
        </h1>
        <p className="text-sm text-white/65 font-light max-w-xl leading-relaxed mt-1.5">"{thought}"</p>
        
        <div className="flex gap-2.5 mt-5 flex-wrap">
          <span className="bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white/85 font-medium backdrop-blur-sm">
            🏢 {totalEmployees} Employees
          </span>
          {presentToday > 0 && (
            <span className="bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white/85 font-medium backdrop-blur-sm">
              ✅ {presentToday} Present Today
            </span>
          )}
          {pendingLeaves > 0 && (
            <span className="bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white/85 font-medium backdrop-blur-sm">
              📋 {pendingLeaves} Leave{pendingLeaves > 1 ? "s" : ""} Pending
            </span>
          )}
          <span className="bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white/85 font-medium backdrop-blur-sm">
            📢 {totalAnn} Announcement{totalAnn !== 1 ? "s" : ""}
          </span>
          {avgRating != null && (
            <span className="bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white/85 font-medium backdrop-blur-sm">
              ⭐ {avgRating.toFixed(1)} Rating
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#eedde8] p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: i === 3 ? "#e8b84b" : "#730042" }} />
            <div 
              className="w-11 h-11 rounded-full flex items-center justify-center text-base mb-4"
              style={{ color: i === 3 ? "#e8b84b" : "#730042", background: i === 3 ? "#fff8e1" : "#f7edf3" }}
            >
              {s.icon}
            </div>
            <div className="text-[11px] font-semibold tracking-wide uppercase text-[#8a6070] mb-1.5">{s.label}</div>
            <div className="font-['Cormorant_Garamond',serif] text-4xl leading-none text-[#1a0010] font-bold">{s.value}</div>
            <p className="text-xs mt-2 font-medium" style={{ color: s.subColor }}>{s.sub}</p>
            {s.bar !== null && (
              <div className="h-1 bg-[#eedde8] rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${s.bar}%`, 
                    background: i === 3 ? "linear-gradient(90deg,#c8920a,#e8b84b)" : "linear-gradient(90deg,#4a0029,#c0527e)" 
                  }} 
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mid Grid: Map & Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#eedde8] flex items-center justify-between">
            <div className="flex items-center gap-2 font-['Cormorant_Garamond',serif] text-lg font-bold text-[#1a0010]">
              <div className="live-dot"></div>
              Live Attendance Map
            </div>
            <span className="text-xs text-[#c49ab2] font-medium hidden sm:flex items-center">
              <FaMapMarkerAlt className="mr-1" />
              {mapLoading ? "Loading…" : `${checkins.length} check-in${checkins.length !== 1 ? "s" : ""} today`}
            </span>
          </div>
          <div className="h-[300px] sm:h-[400px] lg:h-[450px] w-full">
            <AttendanceMap checkins={checkins} loading={mapLoading} />
          </div>
          <div className="p-3 sm:p-4 bg-[#f7edf3] border-t border-[#eedde8] flex flex-wrap gap-4 sm:gap-5 items-center">
            <div className="flex items-center gap-1.5 text-xs text-[#8a6070]">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-[#730042]"></div>
              Manager
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#8a6070]">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-[#a0005c]"></div>
              Employee
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#8a6070]">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-gray-400 opacity-50"></div>
              Checked out
            </div>
            <span className="ml-auto text-xs text-[#c49ab2] hidden md:inline">
              Click a pin for details · updates every 2 min
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#eedde8] flex items-center justify-between">
            <div className="flex items-center gap-2 font-['Cormorant_Garamond',serif] text-lg font-bold text-[#1a0010]">
              <FaCalendarAlt className="text-[#730042] text-sm" />
              Leave Requests
            </div>
            {pendingLeaves > 0 && (
              <span className="bg-[#fff8e1] text-[#b8760a] text-xs font-bold px-2.5 py-1 rounded-full border border-[#f0d870]">
                {pendingLeaves} pending
              </span>
            )}
          </div>

          <div className="overflow-y-auto max-h-[400px] lg:max-h-[450px] flex-1">
            {leaveLoading ? (
              <div className="text-center py-10 px-5 text-[#c49ab2]">
                <div className="text-3xl mb-2.5">⏳</div>
                <p className="text-sm">Loading…</p>
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-10 px-5 text-[#c49ab2]">
                <div className="text-3xl mb-2.5 text-[#0d9e6e]"><FaCheckCircle /></div>
                <p className="text-sm">No leave requests.<br />All employees are accounted for.</p>
              </div>
            ) : (
              leaves.map((leave) => {
                const name =
                  leave.employeeName ||
                  leave.name ||
                  (leave.employee
                    ? [leave.employee.f_name, leave.employee.l_name].filter(Boolean).join(" ")
                    : "") ||
                  leave.user?.name ||
                  "Employee";

                const type   = leave.leaveType || leave.type || "Leave";
                const from   = leave.from      || leave.startDate || leave.fromDate || "";
                const to     = leave.to        || leave.endDate   || leave.toDate   || "";
                const status = (leave.status || "pending").toLowerCase();
                const isPending = status === "pending";

                const fmtShort = (d) => {
                  if (!d) return "";
                  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
                  catch { return d; }
                };

                return (
                  <div key={leave._id || leave.id} className="p-4 border-b border-[#eedde8] flex items-start gap-3 transition-colors hover:bg-[#fdf5f9] last:border-b-0">
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 bg-[#730042]"
                      style={{ background: leaveTypeColor(type) }}
                    >
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#1a0010] truncate">{name}</div>
                      <div className="text-[11px] text-[#8a6070] mt-0.5">
                        {type} · {fmtShort(from)}{to && to !== from ? ` → ${fmtShort(to)}` : ""}
                      </div>
                      {leave.reason && (
                        <div className="text-[11px] text-[#8a6070] mt-0.5 italic truncate">
                          "{leave.reason}"
                        </div>
                      )}
                      {isPending ? (
                        <div className="flex gap-1.5 mt-2">
                          <button
                            className="bg-[#e8f7f1] text-[#0d9e6e] border border-[#b8e8d4] rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer flex items-center gap-1 hover:bg-[#0d9e6e] hover:text-white transition-all disabled:opacity-50"
                            onClick={() => acceptLeave(leave._id || leave.id)}
                            disabled={accepting}
                          >
                            <FaCheck /> Approve
                          </button>
                          <button
                            className="bg-[#fbeaea] text-[#d93025] border border-[#f0c5c5] rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer flex items-center gap-1 hover:bg-[#d93025] hover:text-white transition-all disabled:opacity-50"
                            onClick={() => rejectLeave(leave._id || leave.id)}
                            disabled={rejecting}
                          >
                            <FaBan /> Reject
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <span 
                            className="inline-flex items-center text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full capitalize"
                            style={{
                              background: status === 'approved' ? '#e8f7f1' : status === 'rejected' ? '#fbeaea' : '#fff8e1',
                              color: status === 'approved' ? '#0d9e6e' : status === 'rejected' ? '#d93025' : '#b8760a'
                            }}
                          >
                            {status}
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

      {/* Lower Grid: Leave Balance & Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <LeaveBalancePanel leaveBalance={leaveBalance} loading={adminLoading} />
        <ReviewsPanel reviews={reviews} loading={adminLoading} />
      </div>

      {/* Announcements Panel */}
      <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-5 border-b border-[#eedde8] flex items-center justify-between">
          <div className="flex items-center gap-2 font-['Cormorant_Garamond',serif] text-lg font-bold text-[#1a0010]">
            <FaBullhorn className="text-[#730042] text-sm" />
            Announcements
          </div>
          <button 
            className="bg-[#730042] text-white border-none px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-[#4a0029] transition-all"
            onClick={() => setAnnModal({ open: true, editing: null })}
          >
            <FaPlus className="text-[10px]" /> New
          </button>
        </div>
        {annLoading ? (
          <div className="text-center py-10 px-5 text-[#c49ab2]">
            <div className="text-3xl mb-2.5">⏳</div>
            <p className="text-sm">Loading…</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10 px-5 text-[#c49ab2]">
            <div className="text-3xl mb-2.5">📢</div>
            <p className="text-sm">No announcements yet.<br />Publish one to notify your team.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-5">
            {announcements.map((ann) => {
              const typeKey = (ann.type || "general").toLowerCase();
              const chipStyles = {
                general: "bg-[#f7edf3] text-[#730042]",
                urgent: "bg-[#fbeaea] text-[#d93025]",
                event: "bg-[#e8f7f1] text-[#0d9e6e]",
                policy: "bg-[#fff8e1] text-[#b8760a]"
              };
              return (
                <div key={ann._id} className="rounded-lg border border-[#eedde8] p-4 transition-all hover:shadow-sm hover:-translate-y-0.5 flex flex-col">
                  <span 
                    className="inline-block text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full mb-2 w-fit"
                    style={{ 
                      background: typeKey === 'urgent' ? '#fbeaea' : typeKey === 'event' ? '#e8f7f1' : typeKey === 'policy' ? '#fff8e1' : '#f7edf3', 
                      color: typeKey === 'urgent' ? '#d93025' : typeKey === 'event' ? '#0d9e6e' : typeKey === 'policy' ? '#b8760a' : '#730042' 
                    }}
                  >
                    {typeKey.charAt(0).toUpperCase() + typeKey.slice(1)}
                  </span>
                  <div className="text-sm font-semibold text-[#1a0010] mb-1.5 leading-tight">{ann.title}</div>
                  <div className="text-xs text-[#8a6070] leading-relaxed line-clamp-2 flex-1">{ann.message}</div>
                  <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-[#eedde8]">
                    <button 
                      className="bg-none border-none cursor-pointer px-1.5 py-1 rounded text-xs text-[#c49ab2] hover:bg-[#f7edf3] hover:text-[#730042] flex items-center gap-1"
                      onClick={() => setAnnModal({ open: true, editing: ann })}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button 
                      className="bg-none border-none cursor-pointer px-1.5 py-1 rounded text-xs text-[#c49ab2] hover:bg-[#fbeaea] hover:text-[#d93025] flex items-center gap-1"
                      onClick={() => removeAnn(ann._id)}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee Overview Panel */}
      <div className="bg-white rounded-2xl border border-[#eedde8] shadow-sm overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-5 border-b border-[#eedde8] flex items-center justify-between">
          <div className="flex items-center gap-2 font-['Cormorant_Garamond',serif] text-lg font-bold text-[#1a0010]">
            <FaUsers className="text-[#730042] text-sm" />
            Employee Overview
          </div>
          {employees.length > 8 && (
            <button
              className="bg-none text-[#8a6070] border border-[#eedde8] px-3 sm:px-4 py-2 rounded-lg text-xs font-medium cursor-pointer hover:border-[#730042] hover:text-[#730042] transition-all flex items-center"
              onClick={() => setEmpExpand((v) => !v)}
            >
              {empExpand ? "Show Less" : `View All (${employees.length})`}
              <FaChevronRight className="text-[10px] ml-1 transition-transform" style={{ transform: empExpand ? "rotate(90deg)" : "none" }} />
            </button>
          )}
        </div>

        {empLoading ? (
          <div className="text-center py-10 px-5 text-[#c49ab2]">
            <div className="text-3xl mb-2.5">⏳</div>
            <p className="text-sm">Loading employees…</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-10 px-5 text-[#c49ab2]">
            <div className="text-3xl mb-2.5"><FaUsers /></div>
            <p className="text-sm">No employees found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 sm:p-5">
            {displayEmployees.map((emp, i) => {
              const name  = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || "Employee";
              const role  = emp.designation || emp.role || "";
              const dept  = emp.department  || "";
              const email = emp.work_email  || "";
              return (
                <div key={emp._id || emp.id || i} className="border border-[#eedde8] rounded-lg p-4 flex items-center gap-3 transition-all hover:shadow-sm hover:bg-[#f7edf3]">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br from-[#4a0029] to-[#a0005c]">
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1a0010] leading-tight truncate">{name}</div>
                    {role  && <div className="text-[11px] text-[#8a6070] mt-0.5 truncate">{role}</div>}
                    {dept  && <span className="inline-block text-[10px] font-semibold bg-[#f7edf3] text-[#730042] px-1.5 py-0.5 rounded-full mt-1">{dept}</span>}
                    {email && (
                      <div className="text-[10px] text-[#c49ab2] mt-1 truncate flex items-center gap-1">
                        <FaEnvelope /> {email}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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