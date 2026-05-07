import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetAnnouncements } from "../../auth/server-state/employee/employeeannounce/employeeannounce.hook";
import { useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useGetAllLeaveHistory } from "../../auth/server-state/employee/employeeleave/employeeleave.hook";
import { useGetAttendance } from "../../auth/server-state/employee/employeeother/employeeother.hook"; 


const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["S","M","T","W","T","F","S"];

const APPROVED_STATUSES = ["approved_manager", "approved_admin"];


const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(115,0,66,0.35); }
      70%  { box-shadow: 0 0 0 8px rgba(115,0,66,0); }
      100% { box-shadow: 0 0 0 0 rgba(115,0,66,0); }
    }
    @keyframes progressIn {
      from { width: 0; }
    }

    .ed-card {
      background: #fff;
      border-radius: 14px;
      border: 0.5px solid #ede5e0;
      overflow: hidden;
      position: relative;
      animation: fadeUp .35s ease both;
    }
    .ed-card:hover {
      box-shadow: 0 4px 20px rgba(42,26,22,0.08);
    }

    .ed-checkin-btn {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 9px 22px;
      border-radius: 10px;
      cursor: pointer;
      border: none;
      transition: all .2s ease;
      letter-spacing: .2px;
    }
    .ed-checkin-btn:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(115,0,66,0.35);
    }
    .ed-checkin-btn:not(:disabled):active { transform: translateY(0); }

    .ed-cal-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      font-size: 10px;
      font-family: 'DM Sans', sans-serif;
      transition: transform .15s;
      cursor: default;
    }
    .ed-cal-day:hover { transform: scale(1.1); }

    .ed-star { color: #e8b84b; font-size: 14px; line-height: 1; }
    .ed-star.empty { color: #e8ddd8; }

    .ed-progress-bar {
      height: 100%;
      border-radius: 4px;
      animation: progressIn .7s ease both;
    }

    .ed-ann-item {
      display: flex;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 0.5px solid #f0e8e4;
      align-items: flex-start;
      transition: background .15s;
    }
    .ed-ann-item:last-child { border-bottom: none; }

    .ed-leave-row { padding: 11px 0; border-bottom: 0.5px solid #ede5e0; }
    .ed-leave-row:last-child { border-bottom: none; }

    .ed-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
    }

    .ed-info-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .ed-info-label {
      font-size: 10px;
      color: #b0948a;
      font-family: 'DM Sans', sans-serif;
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .ed-info-value {
      font-size: 12px;
      font-weight: 500;
      color: #2a1a16;
      font-family: 'DM Sans', sans-serif;
      word-break: break-all;
    }

    .ed-history-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 0.5px solid #f5eeea;
      font-family: 'DM Sans', sans-serif;
    }
    .ed-history-row:last-child { border-bottom: none; }
  `}</style>
);


function getInitials(f = "", l = "") {
  return `${f[0] || ""}${l[0] || ""}`.toUpperCase();
}

function computeTenure(dateStr) {
  if (!dateStr) return { years: 0, months: 0, yearsFloat: "0.0", nextMilestoneLabel: "—", fracInYear: 0 };
  const joined = new Date(dateStr);
  const now = new Date();
  const diffMs = now - joined;
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years  = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearsFloat = (diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
  const nextMilestoneYear = years + 1;
  const nextDate = new Date(joined);
  nextDate.setFullYear(joined.getFullYear() + nextMilestoneYear);
  const nextLabel = `${nextMilestoneYear}yr — ${nextDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
  const fracInYear = parseFloat(yearsFloat) % 1;
  return { years, months, yearsFloat, nextMilestoneLabel: nextLabel, fracInYear };
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86400000)  return "Today";
  if (diff < 172800000) return "Yesterday";
  return `${Math.floor(diff / 86400000)}d ago`;
}

function stripMarkdown(text = "") {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^[\*\-]\s+/gm, "").replace(/\n+/g, " ").trim().slice(0, 90) + (text.length > 90 ? "…" : "");
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isDateInRange(date, start, end) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const s = new Date(start); s.setHours(0,0,0,0);
  const e = new Date(end);   e.setHours(0,0,0,0);
  return d >= s && d <= e;
}


function resolveAttendanceStatus(record) {
  if (!record) return null;

  // Checked in but not yet checked out — still active
  if (record.checkIn && !record.checkOut) return "checkedin";

  const s = (record.status || "").toLowerCase();
  if (s.includes("half")) return "halfday";
  if (s === "present")    return "present";
  if (s === "absent")     return "absent";
  if (s === "late")       return "late";
  if (s === "lwp")        return "absent";


  if (record.checkIn && record.checkOut) return "present";

  return "absent";
}

function Avatar({ src, initials, size = 36, radius = "50%", fontSize = 13, style = {} }) {
  const [imgError, setImgError] = useState(false);
  const showImg = src && !imgError;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: showImg ? "transparent" : "#730042",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 600, color: "#f9f8f2",
      flexShrink: 0, overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif",
      ...style,
    }}>
      {showImg
        ? <img src={src} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgError(true)} />
        : initials
      }
    </div>
  );
}


function StarRating({ rating = 0, max = 5, size = 14 }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(rating);
        const half   = !filled && i < rating;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1-3-2.9 4.2-.8z"
              fill={filled ? "#e8b84b" : half ? "url(#half)" : "#e8ddd8"}
              stroke={filled || half ? "#d4a33a" : "#d9ceca"} strokeWidth=".5"
            />
            {half && (
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="#e8b84b"/>
                  <stop offset="50%" stopColor="#e8ddd8"/>
                </linearGradient>
              </defs>
            )}
          </svg>
        );
      })}
      {rating > 0 && (
        <span style={{ fontSize: 10, color: "#b0948a", marginLeft: 3, fontFamily: "'DM Sans', sans-serif" }}>
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}


function Badge({ children, variant = "brand" }) {
  const styles = {
    brand:  { background: "rgba(115,0,66,0.08)", color: "#730042" },
    green:  { background: "#e8f5e9", color: "#1a6b48" },
    blue:   { background: "#e6f1fb", color: "#185FA5" },
    amber:  { background: "#faeeda", color: "#633806" },
    red:    { background: "#fcebeb", color: "#791F1F" },
    purple: { background: "#f3e8ff", color: "#5b21b6" },
    slate:  { background: "#f1f5f9", color: "#475569" },
  };
  return (
    <span className="ed-tag" style={styles[variant] || styles.brand}>{children}</span>
  );
}


function CardAccent({ color }) {
  return <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:color,borderRadius:"14px 14px 0 0" }}/>;
}


function Skeleton({ w = "100%", h = 16, radius = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg,#f0e8e4 25%,#f9f4f2 50%,#f0e8e4 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }}/>
  );
}


function InfoField({ label, value, loading }) {
  return (
    <div className="ed-info-row">
      <span className="ed-info-label">{label}</span>
      <span className="ed-info-value">{loading ? <Skeleton h={13} /> : (value || "—")}</span>
    </div>
  );
}


function LeaveRow({ label, availed, entitled, accrued, color }) {
  const used      = availed  ?? 0;
  const total     = entitled ?? 0;
  const pct       = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = total - used;
  return (
    <div className="ed-leave-row">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:500, color:"#2a1a16", fontFamily:"'DM Sans',sans-serif" }}>{label}</div>
          {accrued != null && <div style={{ fontSize:10, color:"#b0948a", marginTop:1 }}>Accrued: {accrued}</div>}
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:18, fontWeight:700, color, lineHeight:1, fontFamily:"'Lora',serif" }}>{remaining}</div>
          <div style={{ fontSize:10, color:"#b0948a", marginTop:2 }}>of {total} left</div>
        </div>
      </div>
      <div style={{ height:4, borderRadius:4, background:"#f0e8e4", overflow:"hidden" }}>
        <div className="ed-progress-bar" style={{ width:`${pct}%`, background:color }}/>
      </div>
      <div style={{ fontSize:9, color:"#b0948a", marginTop:3, fontFamily:"'DM Sans',sans-serif" }}>{used} used · {pct}%</div>
    </div>
  );
}


function SegBar({ segments }) {
  return (
    <>
      <div style={{ display:"flex", height:5, borderRadius:5, overflow:"hidden", gap:2, margin:"10px 0 8px" }}>
        {segments.map((s, i) => <div key={i} style={{ flex:s.pct, background:s.color }}/>)}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"5px 10px" }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
            <div style={{ width:7, height:7, borderRadius:2, background:s.color }}/>
            {s.label}
          </div>
        ))}
      </div>
    </>
  );
}


function Calendar({ month, joiningDate, attendanceMap = new Map(), approvedLeaves = [] }) {
  const year     = new Date().getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMo = new Date(year, month + 1, 0).getDate();
  const today    = new Date(); today.setHours(0, 0, 0, 0);

  // Joining date normalised to midnight (local)
  const joiningMidnight = useMemo(() => {
    if (!joiningDate) return null;
    const d = new Date(joiningDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [joiningDate]);


  const leaveDaySet = useMemo(() => {
    const set = new Set();
    approvedLeaves.forEach(lv => {
      for (let d = new Date(lv.startDate); d <= new Date(lv.endDate); d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          set.add(d.getDate());
        }
      }
    });
    return set;
  }, [approvedLeaves, month, year]);


  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null); // grid padding

  for (let d = 1; d <= daysInMo; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);

    const isToday        = date.toDateString() === today.toDateString();
    const isFuture       = date > today;
    const isBeforeJoining = joiningMidnight && date < joiningMidnight;

    let status = "future";

    if (isBeforeJoining) {
     
      status = "before_joining";
    } else if (leaveDaySet.has(d)) {
      status = "leave";
    } else if (!isFuture) {
   
      const key    = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const record = attendanceMap.get(key);
      status = resolveAttendanceStatus(record) ?? "absent";
    }

    cells.push({ day: d, status, isToday });
  }

  const calStyle = {
    present:        { background: "rgba(115,0,66,0.07)", color: "#730042", fontWeight: 500 },
    absent:         { background: "#fce4ec",             color: "#b71c1c", fontWeight: 500 },
    halfday:        { background: "#fff8e1",             color: "#f57f17", fontWeight: 500 },
    late:           { background: "#fff3e0",             color: "#e65100", fontWeight: 500 },
    leave:          { background: "#e8eaf6",             color: "#283593", fontWeight: 600 },
    checkedin:      { background: "rgba(29,158,117,0.12)", color: "#1D9E75", fontWeight: 600 },
    future:         { color: "#d4c8c4", fontWeight: 400 },

    before_joining: { color: "#cfc6c1", fontWeight: 400, background: "transparent" },
  };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ textAlign:"center", fontSize:10, color:"#b0948a", padding:"3px 0", fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            className="ed-cal-day"
            title={
              cell
                ? cell.status === "before_joining"
                  ? "Before joining"
                  : cell.status.replace(/_/g, " ")
                : ""
            }
            style={{
              outline:      cell?.isToday ? "1.5px solid #730042" : "none",
              outlineOffset: -1.5,
              opacity:       cell?.status === "before_joining" ? 0.35 : 1,
              ...(cell ? calStyle[cell.status] ?? {} : {}),
            }}
          >
            {cell?.day}
          </div>
        ))}
      </div>
    </div>
  );
}


function DOJCard({ joiningDate }) {
  const { years, months, yearsFloat, nextMilestoneLabel, fracInYear } = computeTenure(joiningDate);
  const R = 36, circ = Math.PI * R;
  const dash = fracInYear * circ;
  const pips = Math.min(Math.floor(parseFloat(yearsFloat)), 5);
  return (
    <div className="ed-card">
      <CardAccent color="#378ADD"/>
      <div style={{ padding:"16px 18px 14px" }}>
        <div style={{ fontSize:11, color:"#b0948a", fontWeight:500, letterSpacing:".3px", marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
          Date of joining
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ position:"relative", width:88, height:88, flexShrink:0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={R} fill="none" stroke="#ede5e0" strokeWidth="6"/>
              <circle cx="44" cy="44" r={R} fill="none" stroke="#378ADD" strokeWidth="6"
                strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round"/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:22, fontWeight:700, color:"#730042", lineHeight:1, fontFamily:"'Lora',serif" }}>{yearsFloat}</span>
              <span style={{ fontSize:9, color:"#b0948a", marginTop:1, fontFamily:"'DM Sans',sans-serif" }}>yrs</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7, flex:1 }}>
            <InfoField label="Joined on" value={joiningDate ? fmtDate(joiningDate) : "—"} loading={false}/>
            <InfoField label="Experience" value={`${years} yr${years !== 1 ? "s" : ""} ${months} mo`} loading={false}/>
            <div className="ed-info-row">
              <span className="ed-info-label">Next milestone</span>
              <span style={{ fontSize:12, fontWeight:500, color:"#378ADD", fontFamily:"'DM Sans',sans-serif" }}>{nextMilestoneLabel}</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, marginTop:12 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ height:4, flex:1, borderRadius:4, background: i < pips ? "#378ADD" : "#ede5e0" }}/>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:9, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
          <span>0</span><span>1yr</span><span>2yr</span><span>3yr</span><span>4yr</span><span>5yr</span>
        </div>
      </div>
    </div>
  );
}

function AnnouncementItem({ ann }) {
  const isHigh    = ann.priority === "high";
  const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
  const dotColor  = isHigh ? "#E24B4A" : ann.priority === "medium" ? "#BA7517" : "#730042";
  return (
    <div className="ed-ann-item" style={{ opacity: isExpired ? .45 : 1 }}>
      <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, marginTop:5, background:dotColor,
        boxShadow: isHigh ? "0 0 0 3px rgba(226,75,74,0.15)" : "none" }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, fontWeight:500, color:"#2a1a16", fontFamily:"'DM Sans',sans-serif" }}>{ann.title}</span>
          <Badge variant={isHigh ? "red" : ann.priority === "medium" ? "amber" : "green"}>{ann.priority}</Badge>
        </div>
        <div style={{ fontSize:11, color:"#b0948a", lineHeight:1.55, marginBottom:4, fontFamily:"'DM Sans',sans-serif" }}>
          {stripMarkdown(ann.message)}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:"#c9bab5", fontFamily:"'DM Sans',sans-serif" }}>{timeAgo(ann.createdAt)}</span>
          {ann.expiresAt && (
            <span style={{ fontSize:10, color: isExpired ? "#E24B4A" : "#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
              {isExpired ? "Expired" : `Expires ${new Date(ann.expiresAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`}
            </span>
          )}
          {ann.audience && <Badge variant={ann.audience === "all" ? "blue" : "brand"}>{ann.audience}</Badge>}
        </div>
      </div>
    </div>
  );
}


function TodayBanner({ isOnLeave, leaveType, onCheckIn }) {
  const today = new Date();
  const day   = today.toLocaleDateString("en-IN", { weekday:"long" });
  const date  = today.toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });

  const leaveLabel = {
    el: "Earned Leave", sl: "Sick Leave", pl: "Privilege Leave",
    ml: "Maternity Leave", cl: "Casual Leave",
  };

  return (
    <div style={{
      background: isOnLeave
        ? "linear-gradient(135deg,#e8eaf6,#c5cae9)"
        : "linear-gradient(135deg,#730042,#a0004a)",
      borderRadius:14, padding:"18px 22px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      marginBottom:14, flexWrap:"wrap", gap:12,
      boxShadow: isOnLeave ? "0 4px 16px rgba(40,53,147,0.15)" : "0 4px 20px rgba(115,0,66,0.28)",
      animation: "fadeUp .3s ease both",
    }}>
      <div>
        <div style={{ fontSize:11, fontWeight:500, fontFamily:"'DM Sans',sans-serif",
          color: isOnLeave ? "rgba(40,53,147,0.7)" : "rgba(249,248,242,0.65)", letterSpacing:".4px", textTransform:"uppercase" }}>
          {day}
        </div>
        <div style={{ fontSize:18, fontWeight:700, fontFamily:"'Lora',serif",
          color: isOnLeave ? "#283593" : "#f9f8f2", marginTop:2 }}>
          {date}
        </div>
        {isOnLeave && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
            <span style={{ fontSize:11, color:"#3949AB", fontFamily:"'DM Sans',sans-serif",
              background:"rgba(57,73,171,0.12)", padding:"3px 10px", borderRadius:20, fontWeight:600 }}>
              🏖️ On Leave — {leaveLabel[leaveType] || "Approved Leave"}
            </span>
          </div>
        )}
      </div>

      <button
        className="ed-checkin-btn"
        disabled={isOnLeave}
        onClick={onCheckIn}
        style={{
          background: isOnLeave ? "rgba(255,255,255,0.3)" : "#fff",
          color:      isOnLeave ? "rgba(40,53,147,0.5)"   : "#730042",
          cursor:     isOnLeave ? "not-allowed"            : "pointer",
          opacity:    isOnLeave ? .7 : 1,
          boxShadow:  isOnLeave ? "none" : "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {isOnLeave ? "🚫 Check-in Disabled" : "✅ Check In"}
      </button>
    </div>
  );
}


const LEAVE_TYPE_META = {
  el: { label:"Earned",    color:"#730042", bg:"rgba(115,0,66,0.08)" },
  sl: { label:"Sick",      color:"#1D9E75", bg:"rgba(29,158,117,0.08)" },
  pl: { label:"Privilege", color:"#378ADD", bg:"rgba(55,138,221,0.08)" },
  ml: { label:"Maternity", color:"#9333EA", bg:"rgba(147,51,234,0.08)" },
  cl: { label:"Casual",    color:"#BA7517", bg:"rgba(186,117,23,0.08)" },
};

const STATUS_COLORS = {
  pending_manager:  { label:"Pending",    color:"#92400E", bg:"#faeeda" },
  approved_manager: { label:"Approved",   color:"#1a6b48", bg:"#e8f5e9" },
  rejected_manager: { label:"Rejected",   color:"#791F1F", bg:"#fcebeb" },
  forwarded_admin:  { label:"Forwarded",  color:"#185FA5", bg:"#e6f1fb" },
  approved_admin:   { label:"Approved ✓", color:"#1a6b48", bg:"#e8f5e9" },
  rejected_admin:   { label:"Rejected ✗", color:"#791F1F", bg:"#fcebeb" },
};

function LeaveHistoryList({ leaves = [], loading }) {
  if (loading) return (
    <div style={{ padding:"0 18px 14px", display:"flex", flexDirection:"column", gap:10 }}>
      {[1,2,3].map(i => <Skeleton key={i} h={44} radius={8}/>)}
    </div>
  );
  if (!leaves.length) return (
    <div style={{ padding:"20px 18px", textAlign:"center", fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
      No leave history
    </div>
  );
  return (
    <div style={{ padding:"0 18px 14px" }}>
      {leaves.slice(0, 6).map((lv, i) => {
        const lm = LEAVE_TYPE_META[lv.leaveType] || { label: lv.leaveType?.toUpperCase(), color:"#730042", bg:"rgba(115,0,66,0.08)" };
        const sm = STATUS_COLORS[lv.status] || { label: lv.status, color:"#475569", bg:"#f1f5f9" };
        const days = lv.days || 1;
        return (
          <div key={i} className="ed-history-row">
            <div style={{ width:32, height:32, borderRadius:8, background:lm.bg, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:10, fontWeight:700, color:lm.color, flexShrink:0 }}>
              {lm.label.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#2a1a16" }}>{lm.label}</div>
              <div style={{ fontSize:10, color:"#b0948a", marginTop:1 }}>
                {fmtDate(lv.startDate)} → {fmtDate(lv.endDate)} · {days}d
              </div>
            </div>
            <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600,
              background:sm.bg, color:sm.color, fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
              {sm.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}


function ReviewCard({ reviews = [], loading }) {
  if (loading) return (
    <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
      <Skeleton h={16} w="60%"/><Skeleton h={30} w="40%"/><Skeleton h={12} w="80%"/>
    </div>
  );

  const avg      = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length)
    : null;
  const latest   = reviews[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = reviews.filter(r => r.monthYear === thisMonth).length;

  return (
    <div style={{ padding:"14px 18px 16px" }}>
      {avg !== null ? (
        <>
          <div style={{ display:"flex", alignItems:"flex-end", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:36, fontWeight:700, color:"#e8b84b", lineHeight:1, fontFamily:"'Lora',serif" }}>
              {avg.toFixed(1)}
            </span>
            <div>
              <StarRating rating={avg} size={15}/>
              <div style={{ fontSize:10, color:"#b0948a", marginTop:3, fontFamily:"'DM Sans',sans-serif" }}>
                from {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
            {[5,4,3,2,1].map(star => {
              const cnt = reviews.filter(r => Math.round(r.rating) === star).length;
              const pct = reviews.length > 0 ? (cnt / reviews.length) * 100 : 0;
              return (
                <div key={star} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:10, color:"#b0948a", width:8, fontFamily:"'DM Sans',sans-serif" }}>{star}</span>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="#e8b84b"><path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1-3-2.9 4.2-.8z"/></svg>
                  <div style={{ flex:1, height:5, borderRadius:4, background:"#f0e8e4", overflow:"hidden" }}>
                    <div className="ed-progress-bar" style={{ width:`${pct}%`, background:"#e8b84b" }}/>
                  </div>
                  <span style={{ fontSize:10, color:"#b0948a", width:18, textAlign:"right", fontFamily:"'DM Sans',sans-serif" }}>{cnt}</span>
                </div>
              );
            })}
          </div>

          {latest?.comment && (
            <div style={{ background:"#faf8f2", borderRadius:8, padding:"9px 12px",
              borderLeft:"3px solid #e8b84b", fontSize:11, color:"#5a4030", lineHeight:1.6,
              fontFamily:"'DM Sans',sans-serif" }}>
              <span style={{ color:"#b0948a", fontSize:10, display:"block", marginBottom:4 }}>
                {latest.reviewer
                  ? `${latest.reviewer.f_name} ${latest.reviewer.l_name} · ${latest.monthYear}`
                  : `Latest · ${latest.monthYear}`}
              </span>
              "{latest.comment}"
            </div>
          )}

          {newThisMonth > 0 && (
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:5 }}>
              <Badge variant="green">+{newThisMonth} this month</Badge>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign:"center", padding:"14px 0" }}>
          <div style={{ fontSize:24, marginBottom:6 }}>⭐</div>
          <div style={{ fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>No reviews yet</div>
        </div>
      )}
    </div>
  );
}


export default function EmployeeDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const navigate = useNavigate();

  /* ── Hooks ── */
  const { data: meData,   isLoading: meLoading,  isError: meError  } = useGetMeUser();
  const { data: annData,  isLoading: annLoading                     } = useGetAnnouncements();
  const { data: histData, isLoading: histLoading                    } = useGetAllLeaveHistory();
  const { data: attData,  isLoading: attLoading                     } = useGetAttendance(); 


  const employee      = meData?.employee      ?? null;
  const lb            = meData?.leavebalance?.[0] ?? null;
  const allLeaves     = histData?.leaves      ?? [];
  const announcements = annData?.announcements ?? [];
  const reviews       = meData?.review        ?? [];

 
  const joiningDate = employee?.date_of_joining ?? employee?.createdAt ?? null;

 
 
  const attendanceMap = useMemo(() => {
    const records = Array.isArray(attData)
      ? attData
      : Array.isArray(attData?.attendance)
        ? attData.attendance
        : [];

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30
    const map = new Map();

    records.forEach(rec => {
      if (!rec.date) return;
     
      const istKey = new Date(new Date(rec.date).getTime() + IST_OFFSET_MS)
        .toISOString()
        .slice(0, 10);
      map.set(istKey, rec);
    });
    return map;
  }, [attData]);


  const approvedLeaves = useMemo(() =>
    allLeaves.filter(lv => APPROVED_STATUSES.includes(lv.status)),
    [allLeaves]
  );


  const todayLeave = useMemo(() => {
    const today = new Date();
    return approvedLeaves.find(lv =>
      isDateInRange(today, lv.startDate, lv.endDate)
    ) ?? null;
  }, [approvedLeaves]);

  const isOnLeaveToday = Boolean(todayLeave);


  const empInitials = employee ? getInitials(employee.f_name, employee.l_name) : "—";
  const fullName    = employee ? `${employee.f_name} ${employee.l_name}` : "—";
  const managerName = employee?.Under_manager
    ? `${employee.Under_manager.f_name} ${employee.Under_manager.l_name}` : "—";

  const joiningMidnight = useMemo(() => {
    if (!joiningDate) return null;
    const d = new Date(joiningDate); d.setHours(0, 0, 0, 0); return d;
  }, [joiningDate]);

  const { presentCount, absentCount, halfCount, checkedInCount, attendanceRate } = useMemo(() => {
    const year  = new Date().getFullYear();
    const today = new Date(); today.setHours(0,0,0,0);

    let present = 0, absent = 0, half = 0, checkedIn = 0, counted = 0;

    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, selectedMonth, d);
      date.setHours(0,0,0,0);
      if (date > today) break;                                             // future
      if (joiningMidnight && date < joiningMidnight) continue;            // before joining
      if (approvedLeaves.some(lv => isDateInRange(date, lv.startDate, lv.endDate))) continue;

      counted++;
      const key    = date.toISOString().slice(0, 10);
      const rec    = attendanceMap.get(key);
      const status = resolveAttendanceStatus(rec);

      if (status === "present")                           present++;
      else if (status === "absent" || !status)            absent++;
      else if (status === "halfday" || status === "late") half++;
      else if (status === "checkedin")                    checkedIn++;
    }

    const rate = counted > 0 ? Math.round(((present + checkedIn) / counted) * 100) : 0;
    return { presentCount: present, absentCount: absent, halfCount: half, checkedInCount: checkedIn, attendanceRate: rate };
  }, [attendanceMap, selectedMonth, approvedLeaves, joiningMidnight]);

  const leaveRows = [
    { label:"Earned Leave (EL)",   availed:lb?.EL?.availed, entitled:lb?.EL?.entitled, accrued:lb?.EL?.accrued, color:"#730042" },
    { label:"Sick Leave (SL)",     availed:lb?.SL?.availed, entitled:lb?.SL?.entitled, accrued:null,            color:"#1D9E75" },
    { label:"Privilege Leave (PL)",availed:lb?.pbc ?? 0,    entitled:lb?.PL,           accrued:null,            color:"#378ADD" },
    { label:"LWP / Maternity",     availed:lb?.lwp ?? 0,    entitled:(lb?.ML ?? 0) + 5,accrued:null,            color:"#BA7517" },
  ];

  if (meError) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#f9f8f2", minHeight:"100vh",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div className="ed-card" style={{ padding:32, textAlign:"center", maxWidth:320 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:6, fontFamily:"'Lora',serif" }}>Failed to load dashboard</div>
        <div style={{ fontSize:12, color:"#b0948a" }}>Check your connection or log in again.</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f9f8f2",
      minHeight:"100vh", padding:"24px 28px", color:"#2a1a16" }}>
      <GlobalStyles/>

      {/* ── TOPBAR ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0, letterSpacing:"-.3px", fontFamily:"'Lora',serif" }}>
            Dashboard
          </h1>
          <p style={{ fontSize:12, color:"#b0948a", marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>
            {employee ? `Welcome back, ${employee.f_name} · ${employee.uid}` : "Welcome back"}
          </p>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {employee?.office_location && (
            <div style={{ fontSize:11, color:"#b0948a", background:"#fff", border:"0.5px solid #ede5e0",
              borderRadius:20, padding:"4px 12px", fontFamily:"'DM Sans',sans-serif" }}>
              📍 {employee.office_location}
            </div>
          )}

          <div style={{ width:36, height:36, borderRadius:8, border:"0.5px solid #ede5e0", background:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative" }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5a4 4 0 0 0-4 4V7L2 8.5V9.5h11V8.5L11.5 7V5.5a4 4 0 0 0-4-4zM7.5 13.5a1.5 1.5 0 0 1-1.5-1.5h3a1.5 1.5 0 0 1-1.5 1.5z" fill="#730042"/>
            </svg>
            {announcements.filter(a => a.priority === "high").length > 0 && (
              <div style={{ position:"absolute", top:5, right:5, width:7, height:7, borderRadius:"50%",
                background:"#E24B4A", border:"1.5px solid #f9f8f2" }}/>
            )}
          </div>

          <div style={{ position:"relative" }}>
            <Avatar
              src={employee?.profile_image}
              initials={meLoading ? "—" : empInitials}
              size={38}
              style={{ boxShadow:"0 2px 8px rgba(115,0,66,0.25)", animation: isOnLeaveToday ? "pulse-ring 2s infinite" : "none" }}
            />
            {isOnLeaveToday && (
              <div style={{ position:"absolute", bottom:-2, right:-2, width:12, height:12, borderRadius:"50%",
                background:"#283593", border:"2px solid #f9f8f2", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:7 }}>🏖</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TODAY BANNER ── */}
      <TodayBanner
        isOnLeave={isOnLeaveToday}
        leaveType={todayLeave?.leaveType}
        onCheckIn={() => navigate("/mark-attendance")}
      />

      {/* ── ROW 1: 4 stat cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:14, marginBottom:14 }}>

        {/* Employee identity */}
        <div className="ed-card" style={{ animationDelay:".05s" }}>
          <CardAccent color="#730042"/>
          <div style={{ padding:"16px 18px 14px" }}>
            <div style={{ fontSize:11, color:"#b0948a", fontWeight:500, letterSpacing:".3px", marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>Employee</div>
            {meLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Skeleton w={44} h={44} radius={22}/>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}><Skeleton h={16} w="70%"/><Skeleton h={12} w="50%"/></div>
                </div>
                <Skeleton h={20} w="60%"/>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <Avatar src={employee?.profile_image} initials={empInitials} size={44} radius={12}
                    style={{ boxShadow:"0 3px 10px rgba(115,0,66,0.22)" }}/>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, lineHeight:1.25, fontFamily:"'Lora',serif" }}>{fullName}</div>
                    <div style={{ fontSize:11, color:"#b0948a", textTransform:"capitalize", marginTop:2 }}>{employee?.designation ?? "—"}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                  <Badge variant="brand">{employee?.uid ?? "—"}</Badge>
                  <Badge variant="green">Active</Badge>
                  <Badge variant="blue">{employee?.department ?? "—"}</Badge>
                </div>
                <div style={{ marginTop:10, paddingTop:10, borderTop:"0.5px solid #ede5e0", display:"flex", flexDirection:"column", gap:3 }}>
                  <div style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>📧 {employee?.work_email ?? "—"}</div>
                  <div style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>📞 {employee?.personal_contact ?? "—"}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* DOJ */}
        <DOJCard joiningDate={joiningDate}/>

        {/* Leave overview */}
        <div className="ed-card" style={{ animationDelay:".1s" }}>
          <CardAccent color="#1D9E75"/>
          <div style={{ padding:"16px 18px 14px" }}>
            <div style={{ fontSize:11, color:"#b0948a", fontWeight:500, letterSpacing:".3px", marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>Leave overview</div>
            {meLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <Skeleton h={30} w="50%"/><Skeleton h={14} w="80%"/><Skeleton h={14} w="60%"/>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:28, fontWeight:700, color:"#1D9E75", lineHeight:1, fontFamily:"'Lora',serif" }}>
                    {(lb?.EL?.entitled ?? 0) - (lb?.EL?.availed ?? 0)}
                  </span>
                  <span style={{ fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>EL remaining</span>
                </div>
                <div style={{ fontSize:11, color:"#b0948a", marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
                  Accrued this month: <strong style={{ color:"#2a1a16" }}>{lb?.EL?.accrued ?? 0}</strong> days
                </div>
                {isOnLeaveToday && (
                  <div style={{ background:"#e8eaf6", borderRadius:8, padding:"6px 10px", fontSize:11,
                    color:"#283593", fontWeight:600, marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>
                    🏖️ Currently on leave
                  </div>
                )}
                <SegBar segments={[
                  { pct:(lb?.EL?.entitled ?? 15)-(lb?.EL?.availed ?? 0), color:"#1D9E75", label:`EL (${(lb?.EL?.entitled ?? 15)-(lb?.EL?.availed ?? 0)} left)` },
                  { pct:(lb?.SL?.entitled ?? 12)-(lb?.SL?.availed ?? 0), color:"#378ADD", label:`SL (${(lb?.SL?.entitled ?? 12)-(lb?.SL?.availed ?? 0)} left)` },
                  { pct:lb?.PL ?? 7, color:"#BA7517", label:`PL (${lb?.PL ?? 7})` },
                ]}/>
              </>
            )}
          </div>
        </div>

        {/* Manager card */}
        <div className="ed-card" style={{ animationDelay:".15s", background:"#730042", border:"0.5px solid #5a0033" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
          <div style={{ position:"absolute", bottom:-10, left:-10, width:60, height:60, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
          <div style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:11, color:"rgba(249,248,242,0.6)", fontWeight:500, letterSpacing:".3px",
              marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>Reporting manager</div>
            {meLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <Skeleton h={18} w="60%" radius={4}/><Skeleton h={14} w="80%" radius={4}/>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <Avatar
                    src={employee?.Under_manager?.profile_image}
                    initials={employee?.Under_manager ? getInitials(employee.Under_manager.f_name, employee.Under_manager.l_name) : "—"}
                    size={42}
                    style={{ background:"rgba(249,248,242,0.15)" }}
                  />
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#f9f8f2", fontFamily:"'Lora',serif" }}>{managerName}</div>
                    <div style={{ fontSize:11, color:"rgba(249,248,242,0.6)", marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>
                      {employee?.Under_manager?.role ?? "Manager"}
                    </div>
                  </div>
                </div>
                <div style={{ height:"0.5px", background:"rgba(249,248,242,0.15)", marginBottom:10 }}/>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>
                  <span style={{ color:"rgba(249,248,242,0.5)" }}>Manager ID</span>
                  <span style={{ fontWeight:500, color:"rgba(249,248,242,0.7)" }}>{employee?.Under_manager?.uid ?? "—"}</span>
                </div>
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:10, color:"rgba(249,248,242,0.4)", fontFamily:"'DM Sans',sans-serif", marginBottom:2 }}>Work email</div>
                  <div style={{ fontSize:11, fontWeight:500, color:"rgba(249,248,242,0.6)", wordBreak:"break-all", fontFamily:"'DM Sans',sans-serif" }}>
                    {employee?.Under_manager?.work_email ?? "—"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Calendar + Announcements ── */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,2fr) minmax(0,1fr)", gap:14, marginBottom:14 }}>

        {/* Calendar — real attendance, full month from day 1 */}
        <div className="ed-card" style={{ animationDelay:".2s" }}>
          <div style={{ padding:"14px 18px 12px", display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:"0.5px solid #ede5e0" }}>
            <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>Attendance</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {attLoading && (
                <span style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>Loading…</span>
              )}
              {isOnLeaveToday && <Badge variant="blue">On Leave Today</Badge>}
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#b0948a", background:"#f9f8f2",
                  border:"0.5px solid #ede5e0", borderRadius:6, padding:"3px 7px", cursor:"pointer" }}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ padding:"12px 14px 0" }}>
            {/* Joining date hint */}
          {joiningDate && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <div style={{ width:7, height:7, borderRadius:2, background:"#cfc6c1" }}/>
              <span style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
                Joined {fmtDate(joiningDate)} · days before this are not counted
              </span>
            </div>
          )}
            <Calendar
              month={selectedMonth}
              joiningDate={joiningDate}
              attendanceMap={attendanceMap}
              approvedLeaves={approvedLeaves}
            />
          </div>

          {/* Stats row — 5 columns (added "Active Now") */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", borderTop:"0.5px solid #f0e8e4", marginTop:12 }}>
            {[
              [presentCount,        "#730042", "Present"],
              [absentCount,         "#E24B4A", "Absent"],
              [halfCount,           "#BA7517", "Half/Late"],
              [checkedInCount,      "#1D9E75", "Active Now"],
              [`${attendanceRate}%`,"#378ADD", "Rate"],
            ].map(([v, c, l]) => (
              <div key={l} style={{ padding:"10px 0", textAlign:"center", borderRight:"0.5px solid #f0e8e4" }}>
                <div style={{ fontSize:15, fontWeight:700, color:c, fontFamily:"'Lora',serif" }}>{v}</div>
                <div style={{ fontSize:10, color:"#b0948a", marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, padding:"10px 14px 14px", borderTop:"0.5px solid #f0e8e4" }}>
            {[
              ["#730042","Present"],
              ["#E24B4A","Absent"],
              ["#f57f17","Half day"],
              ["#e65100","Late"],
              ["#1D9E75","Checked in"],
              ["#283593","On leave"],
            ].map(([c, l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
                <div style={{ width:8, height:8, borderRadius:2, background:c }}/>{l}
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="ed-card" style={{ animationDelay:".25s" }}>
          <CardAccent color="#BA7517"/>
          <div style={{ padding:"14px 18px 12px", display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:"0.5px solid #ede5e0" }}>
            <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>Announcements</span>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {announcements.filter(a => a.priority === "high").length > 0 && (
                <Badge variant="red">{announcements.filter(a => a.priority === "high").length} urgent</Badge>
              )}
              <span style={{ fontSize:11, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>{announcements.length}</span>
            </div>
          </div>
          <div style={{ padding:"0 18px", overflowY:"auto", maxHeight:320 }}>
            {annLoading
              ? [1,2,3].map(i => (
                  <div key={i} style={{ padding:"12px 0", borderBottom:"0.5px solid #f0e8e4", display:"flex", flexDirection:"column", gap:6 }}>
                    <Skeleton h={12} w="65%"/><Skeleton h={10} w="90%"/><Skeleton h={10} w="40%"/>
                  </div>
                ))
              : announcements.length > 0
                ? [...announcements]
                    .sort((a, b) => ({ high:0, medium:1, low:2 }[a.priority] ?? 3) - ({ high:0, medium:1, low:2 }[b.priority] ?? 3))
                    .map(a => <AnnouncementItem key={a._id} ann={a}/>)
                : <div style={{ padding:"24px 0", textAlign:"center", fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>No announcements</div>
            }
          </div>
        </div>
      </div>

      {/* ── ROW 3: Profile + Leave Balance + Reviews ── */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.5fr) minmax(0,1fr) minmax(0,.7fr)", gap:14, marginBottom:14 }}>

        {/* Employee Profile */}
        <div className="ed-card" style={{ animationDelay:".3s" }}>
          <CardAccent color="#730042"/>
          <div style={{ padding:"14px 18px 12px", display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:"0.5px solid #ede5e0" }}>
            <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>Employee profile</span>
            <Badge variant="brand">{employee?.role ?? "employee"}</Badge>
          </div>
          <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14,
            borderBottom:"0.5px solid #ede5e0" }}>
            <Avatar src={employee?.profile_image} initials={meLoading ? "—" : empInitials}
              size={52} radius={14} style={{ boxShadow:"0 4px 14px rgba(115,0,66,0.22)" }}/>
            <div>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Lora',serif" }}>
                {meLoading ? <Skeleton w={120} h={18}/> : fullName}
              </div>
              <div style={{ fontSize:12, color:"#b0948a", textTransform:"capitalize", fontFamily:"'DM Sans',sans-serif" }}>
                {meLoading ? <Skeleton w={90} h={14}/> : (employee?.designation ?? "—")}
              </div>
              <div style={{ marginTop:5, display:"flex", gap:5 }}>
                <Badge variant="green">Active</Badge>
                <Badge variant="blue">{employee?.uid ?? "—"}</Badge>
                {reviews.length > 0 && <StarRating rating={reviews.reduce((s, r) => s + r.rating, 0) / reviews.length} size={12}/>}
              </div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, padding:"14px 18px" }}>
            <InfoField label="Work email"       value={employee?.work_email}      loading={meLoading}/>
            <InfoField label="Department"        value={employee?.department}       loading={meLoading}/>
            <InfoField label="Office"            value={employee?.office_location}  loading={meLoading}/>
            <InfoField label="Gender"            value={employee?.gender}           loading={meLoading}/>
            <InfoField label="Marital status"    value={employee?.marital_status}   loading={meLoading}/>
            <InfoField label="Contact"           value={employee?.personal_contact} loading={meLoading}/>
            <InfoField label="Emergency contact" value={employee?.e_contact}        loading={meLoading}/>
            <InfoField label="Manager"           value={managerName}                loading={meLoading}/>
            <InfoField label="Member since"
              value={employee?.createdAt ? fmtDate(employee.createdAt) : null}
              loading={meLoading}/>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="ed-card" style={{ animationDelay:".35s" }}>
          <CardAccent color="#1D9E75"/>
          <div style={{ padding:"14px 18px 12px", display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:"0.5px solid #ede5e0" }}>
            <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>Leave balance</span>
            <span style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>FY 2025–26</span>
          </div>
          <div style={{ padding:"0 18px 4px" }}>
            {meLoading
              ? [1,2,3,4].map(i => <div key={i} style={{ padding:"12px 0", borderBottom:"0.5px solid #ede5e0" }}><Skeleton h={40}/></div>)
              : leaveRows.map((row, i) => <LeaveRow key={i} {...row}/>)
            }
          </div>
          {!meLoading && lb && (
            <div style={{ margin:"0 18px 14px", display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["LWP used", lb.lwp ?? 0], ["PBC", lb.pbc ?? 0]].map(([l, v]) => (
                <div key={l} style={{ background:"#f9f8f2", border:"0.5px solid #ede5e0", borderRadius:8,
                  padding:"6px 10px", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>
                  <span style={{ color:"#b0948a" }}>{l} </span>
                  <strong style={{ color:"#2a1a16" }}>{v}</strong>
                </div>
              ))}
              {lb.lastAccrualDate && (
                <div style={{ background:"#f9f8f2", border:"0.5px solid #ede5e0", borderRadius:8,
                  padding:"6px 10px", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>
                  <span style={{ color:"#b0948a" }}>Last accrual </span>
                  <strong style={{ color:"#2a1a16" }}>
                    {new Date(lb.lastAccrualDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="ed-card" style={{ animationDelay:".4s" }}>
          <CardAccent color="#e8b84b"/>
          <div style={{ padding:"14px 18px 12px", display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:"0.5px solid #ede5e0" }}>
            <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>My Reviews</span>
            {reviews.length > 0 && <Badge variant="amber">{reviews.length} total</Badge>}
          </div>
          <ReviewCard reviews={reviews} loading={meLoading}/>
        </div>
      </div>

      {/* ── ROW 4: Leave History ── */}
      <div className="ed-card" style={{ animationDelay:".45s" }}>
        <CardAccent color="#378ADD"/>
        <div style={{ padding:"14px 18px 12px", display:"flex", alignItems:"center", justifyContent:"space-between",
          borderBottom:"0.5px solid #ede5e0" }}>
          <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>Leave History</span>
          <div style={{ display:"flex", gap:6 }}>
            <Badge variant="green">{approvedLeaves.length} approved</Badge>
            <Badge variant="amber">{allLeaves.filter(l => l.status?.includes("pending")).length} pending</Badge>
          </div>
        </div>
        <LeaveHistoryList leaves={allLeaves} loading={histLoading}/>
      </div>

    </div>
  );
}