import React, { useState, useMemo, useEffect, useRef } from "react";
import { useGetMeAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import { useGetAllEmployee, useGetTodayCheckins } from "../../auth/server-state/adminother/adminother.hook";
import {
  useGetForwardedLeaves,
  useAcceptLeave,
  useRejectLeave,
  useAdminGetMyLeaveHistory,
} from "../../auth/server-state/adminleave/adminleave.hook";
import { useAdminGetMyWFH } from "../../auth/server-state/adminwfh/adminwfh.hook";
import { useTodayAttendance, useCalendarMeta } from "../../auth/server-state/attendance/attendance.hook";
import AttendanceModal from "./AttendanceModal";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["S","M","T","W","T","F","S"];
const APPROVED_STATUSES = ["approved_manager","approved_admin","approved_reporting_manager","approved"];
const APPROVED_WFH_STATUSES = ["approved","approved_admin","approved_reporting_manager"];

function getInitials(f="",l="") {
  return `${f[0]||""}${l[0]||""}`.toUpperCase();
}

function computeTenure(dateStr) {
  if (!dateStr) return { years:0, months:0, yearsFloat:"0.0", nextMilestoneLabel:"—", fracInYear:0 };
  const joined = new Date(dateStr);
  const now = new Date();
  const diffMs = now - joined;
  const totalMonths = Math.floor(diffMs / (1000*60*60*24*30.44));
  const years = Math.floor(totalMonths/12);
  const months = totalMonths%12;
  const yearsFloat = (diffMs/(1000*60*60*24*365.25)).toFixed(1);
  const nextMilestoneYear = years+1;
  const nextDate = new Date(joined);
  nextDate.setFullYear(joined.getFullYear()+nextMilestoneYear);
  const nextLabel = `${nextMilestoneYear}yr — ${nextDate.toLocaleDateString("en-IN",{month:"short",year:"numeric"})}`;
  const fracInYear = parseFloat(yearsFloat)%1;
  return { years, months, yearsFloat, nextMilestoneLabel:nextLabel, fracInYear };
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); }
  catch { return "—"; }
}

function isDateInRange(date,start,end) {
  const d=new Date(date); d.setHours(0,0,0,0);
  const s=new Date(start); s.setHours(0,0,0,0);
  const e=new Date(end); e.setHours(0,0,0,0);
  return d>=s && d<=e;
}

function resolveAttendanceStatus(record) {
  if (!record) return null;
  if (record.checkIn && !record.checkOut) return "checkedin";
  const s=(record.status||"").toLowerCase();
  if (s.includes("half")) return "halfday";
  if (s==="present") return "present";
  if (s==="absent") return "absent";
  if (s==="late") return "late";
  if (s==="lwp") return "absent";
  if (record.checkIn && record.checkOut) return "present";
  return "absent";
}

function Avatar({ src, initials, size=36, className="", style={} }) {
  const [imgError, setImgError] = useState(false);
  const showImg = src && !imgError;
  return (
    <div
      className={`flex-shrink-0 overflow-hidden flex items-center justify-center font-semibold text-[#f9f8f2] ${className}`}
      style={{ width:size, height:size, borderRadius:"50%", background:showImg?"transparent":"#730042", fontSize:size*0.35, ...style }}
    >
      {showImg
        ? <img src={src} alt="avatar" className="w-full h-full object-cover" onError={()=>setImgError(true)} />
        : initials
      }
    </div>
  );
}

function Badge({ children, variant="brand" }) {
  const map = {
    brand: "bg-[rgba(115,0,66,0.08)] text-[#730042]",
    green: "bg-green-50 text-green-800",
    blue: "bg-blue-50 text-blue-800",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-800",
    purple: "bg-purple-50 text-purple-800",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-sans ${map[variant]||map.brand}`}>
      {children}
    </span>
  );
}

function Skeleton({ className="" }) {
  return (
    <div className={`rounded-md bg-gradient-to-r from-[#f0e8e4] via-[#f9f4f2] to-[#f0e8e4] bg-[length:200%_100%] animate-pulse ${className}`} />
  );
}

function InfoField({ label, value, loading }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#b0948a] uppercase tracking-wide font-sans">{label}</span>
      <span className="text-[12px] font-medium text-[#2a1a16] font-sans break-all">
        {loading ? <Skeleton className="h-3 w-24" /> : (value||"—")}
      </span>
    </div>
  );
}

function CardAccent({ color }) {
  return <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background:color }} />;
}

function LeaveRow({ label, availed, entitled, accrued, color }) {
  const used=availed??0;
  const total=entitled??0;
  const pct=total>0?Math.min(100,Math.round((used/total)*100)):0;
  const remaining=total-used;
  return (
    <div className="py-3 border-b border-[#ede5e0] last:border-0">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[12px] font-medium text-[#2a1a16] font-sans">{label}</div>
          {accrued!=null && <div className="text-[10px] text-[#b0948a] mt-0.5">Accrued: {accrued}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold leading-none" style={{ color, fontFamily:"'Lora',serif" }}>{remaining}</div>
          <div className="text-[10px] text-[#b0948a] mt-0.5">of {total} left</div>
        </div>
      </div>
      <div className="h-1 rounded-full bg-[#f0e8e4] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:color }} />
      </div>
      <div className="text-[9px] text-[#b0948a] mt-1 font-sans">{used} used · {pct}%</div>
    </div>
  );
}

function FlatRow({ label, value, color }) {
  return (
    <div className="py-3 border-b border-[#ede5e0] last:border-0">
      <div className="flex justify-between items-start">
        <div className="text-[12px] font-medium text-[#2a1a16] font-sans">{label}</div>
        <div className="text-right">
          <div className="text-lg font-bold leading-none" style={{ color, fontFamily:"'Lora',serif" }}>{value}</div>
          <div className="text-[10px] text-[#b0948a] mt-0.5">days</div>
        </div>
      </div>
    </div>
  );
}

function SegBar({ segments }) {
  return (
    <>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 my-2.5">
        {segments.map((s,i) => <div key={i} style={{ flex:Math.max(s.pct,0.001), background:s.color }} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((s,i) => (
          <div key={i} className="flex items-center gap-1 text-[10px] text-[#b0948a] font-sans">
            <div className="w-1.5 h-1.5 rounded-sm" style={{ background:s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </>
  );
}

function Calendar({ month, joiningDate, attendanceMap=new Map(), approvedLeaves=[], approvedWFH=[], holidayMap=new Map(), weekOffSet=new Set() }) {
  const year=new Date().getFullYear();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMo=new Date(year,month+1,0).getDate();
  const today=new Date(); today.setHours(0,0,0,0);

  const joiningMidnight=useMemo(()=>{
    if (!joiningDate) return null;
    const d=new Date(joiningDate); d.setHours(0,0,0,0); return d;
  },[joiningDate]);

  const leaveDaySet=useMemo(()=>{
    const set=new Set();
    approvedLeaves.forEach(lv=>{
      for (let d=new Date(lv.startDate); d<=new Date(lv.endDate); d.setDate(d.getDate()+1)) {
        if (d.getFullYear()===year && d.getMonth()===month) set.add(d.getDate());
      }
    });
    return set;
  },[approvedLeaves,month,year]);

  const wfhDaySet=useMemo(()=>{
    const set=new Set();
    approvedWFH.forEach(w=>{
      const start = w.startDate || w.date || w.fromDate;
      const end = w.endDate || w.date || w.toDate;
      if (!start) return;
      for (let d=new Date(start); d<=new Date(end||start); d.setDate(d.getDate()+1)) {
        if (d.getFullYear()===year && d.getMonth()===month) set.add(d.getDate());
      }
    });
    return set;
  },[approvedWFH,month,year]);

  const cells=[];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMo; d++) {
    const date=new Date(year,month,d); date.setHours(0,0,0,0);
    const isToday=date.toDateString()===today.toDateString();
    const isFuture=date>today;
    const isBeforeJoining=joiningMidnight && date<joiningMidnight;
    const holidayName=holidayMap.get(d);
    const isWeekOffDay=weekOffSet.has(d);
    let status="future";
    if (isBeforeJoining) { status="before_joining"; }
    else if (holidayName) { status="holiday"; }
    else if (isWeekOffDay) { status="weekoff"; }
    else if (leaveDaySet.has(d)) { status="leave"; }
    else if (wfhDaySet.has(d)) { status="wfh"; }
    else if (!isFuture) {
      const key=date.toISOString().slice(0,10);
      const record=attendanceMap.get(key);
      status=resolveAttendanceStatus(record)??"absent";
    }
    cells.push({ day:d, status, isToday, holidayName });
  }

  const calStyle={
    present:{ bg:"bg-[rgba(115,0,66,0.07)]", text:"text-[#730042] font-medium" },
    absent:{ bg:"bg-red-50", text:"text-red-700 font-medium" },
    halfday:{ bg:"bg-amber-50", text:"text-amber-700 font-medium" },
    late:{ bg:"bg-orange-50", text:"text-orange-700 font-medium" },
    leave:{ bg:"bg-indigo-50", text:"text-indigo-700 font-semibold" },
    wfh:{ bg:"bg-teal-50", text:"text-teal-700 font-semibold" },
    holiday:{ bg:"bg-[#fff1e0]", text:"text-[#b5590a] font-semibold" },
    weekoff:{ bg:"bg-slate-100", text:"text-slate-500 font-semibold" },
    checkedin:{ bg:"bg-[rgba(29,158,117,0.12)]", text:"text-[#1D9E75] font-semibold" },
    future:{ bg:"", text:"text-[#d4c8c4]" },
    before_joining:{ bg:"", text:"text-[#cfc6c1] opacity-35" },
  };

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d,i) => (
          <div key={i} className="text-center text-[10px] text-[#b0948a] py-1 font-medium font-sans">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell,i) => {
          const s=cell?calStyle[cell.status]??calStyle.future:{bg:"",text:""};
          const title=cell
            ? (cell.status==="before_joining" ? "Before joining"
              : cell.status==="holiday" ? `Holiday — ${cell.holidayName}`
              : cell.status==="weekoff" ? "Week off"
              : cell.status.replace(/_/g," "))
            : "";
          return (
            <div
              key={i}
              title={title}
              className={`relative aspect-square flex items-center justify-center rounded text-[10px] font-sans transition-transform hover:scale-110 cursor-default ${s.bg} ${s.text} ${cell?.isToday?"outline outline-[1.5px] outline-[#730042] outline-offset-[-1.5px]":""}`}
            >
              {cell?.day}
              {cell?.status==="holiday" && <span className="absolute -top-0.5 -right-0.5 text-[7px]">🎉</span>}
              {cell?.status==="weekoff" && <span className="absolute -top-0.5 -right-0.5 text-[7px]">🌙</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DOJCard({ joiningDate }) {
  const { years, months, yearsFloat, nextMilestoneLabel, fracInYear }=computeTenure(joiningDate);
  const R=36, circ=Math.PI*R;
  const dash=fracInYear*circ;
  const pips=Math.min(Math.floor(parseFloat(yearsFloat)),5);
  return (
    <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-[fadeUp_.35s_ease_both] hover:shadow-lg transition-shadow">
      <CardAccent color="#378ADD" />
      <div className="p-4 pt-5">
        <div className="text-[11px] text-[#b0948a] font-medium tracking-wide mb-3 font-sans uppercase">Date of joining</div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={R} fill="none" stroke="#ede5e0" strokeWidth="6"/>
              <circle cx="44" cy="44" r={R} fill="none" stroke="#378ADD" strokeWidth="6"
                strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ*0.25} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[#730042] leading-none" style={{ fontFamily:"'Lora',serif" }}>{yearsFloat}</span>
              <span className="text-[9px] text-[#b0948a] mt-0.5 font-sans">yrs</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <InfoField label="Joined on" value={joiningDate?fmtDate(joiningDate):"—"} loading={false} />
            <InfoField label="Experience" value={`${years} yr${years!==1?"s":""} ${months} mo`} loading={false} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#b0948a] uppercase tracking-wide font-sans">Next milestone</span>
              <span className="text-[12px] font-medium text-[#378ADD] font-sans">{nextMilestoneLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 mt-3">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="h-1 flex-1 rounded-full" style={{ background:i<pips?"#378ADD":"#ede5e0" }} />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-[#b0948a] font-sans">
          <span>0</span><span>1yr</span><span>2yr</span><span>3yr</span><span>4yr</span><span>5yr</span>
        </div>
      </div>
    </div>
  );
}

function TodayBanner({ isOnLeave, leaveType, isCheckedIn, isCheckedOut, myAtt, onOpenAttendance, isHolidayToday, holidayName, isWeekOffToday, withinShiftWindow, shiftMeta }) {
  const today=new Date();
  const day=today.toLocaleDateString("en-IN",{weekday:"long"});
  const date=today.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  const leaveLabel={ el:"Earned Leave",sl:"Sick Leave",pl:"Paternity Leave",ml:"Maternity Leave",cl:"Casual Leave",lwp:"Leave Without Pay" };

  // Once checked in / checked out, the day-off restrictions no longer
  // matter for the button — only for a fresh check-in attempt.
  const freshCheckinBlocked = !isCheckedIn && !isCheckedOut && (isHolidayToday || isWeekOffToday || withinShiftWindow===false);
  const isSpecialDayOff = !isCheckedIn && !isCheckedOut && (isHolidayToday || isWeekOffToday);

  let buttonLabel = "Check In";
  if (isOnLeave) {
    buttonLabel = "🚫 Check-in Disabled";
  } else if (isCheckedOut) {
    buttonLabel = "✅ Completed";
  } else if (isCheckedIn) {
    buttonLabel = "🔴 Check Out";
  } else if (isHolidayToday) {
    buttonLabel = "🎉 Holiday";
  } else if (isWeekOffToday) {
    buttonLabel = "🌙 Week Off";
  } else if (withinShiftWindow===false) {
    buttonLabel = "⏰ Outside Shift";
  }

  const buttonDisabled = isOnLeave || freshCheckinBlocked;
  const bannerIsOff = isOnLeave || isSpecialDayOff;

  return (
    <div className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between mb-4 flex-wrap gap-3 ${
      bannerIsOff
        ? "bg-gradient-to-br from-indigo-100 to-indigo-200 shadow-indigo-100 shadow-lg"
        : "bg-gradient-to-br from-[#730042] to-[#a0004a] shadow-[0_4px_20px_rgba(115,0,66,0.28)]"
    }`}>
      <div>
        <div className={`text-[11px] font-medium tracking-wide uppercase font-sans ${bannerIsOff?"text-indigo-500":"text-[rgba(249,248,242,0.65)]"}`}>{day}</div>
        <div className={`text-lg sm:text-xl font-bold mt-0.5 ${bannerIsOff?"text-indigo-800":"text-[#f9f8f2]"}`} style={{ fontFamily:"'Lora',serif" }}>{date}</div>
        {isOnLeave && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-200/60 px-2.5 py-1 rounded-full font-sans">
              🏖️ On Leave — {leaveLabel[leaveType]||"Approved Leave"}
            </span>
          </div>
        )}
        {!isOnLeave && isHolidayToday && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-200/60 px-2.5 py-1 rounded-full font-sans">
              🎉 Holiday — {holidayName || "Company Holiday"}
            </span>
          </div>
        )}
        {!isOnLeave && !isHolidayToday && isWeekOffToday && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-200/60 px-2.5 py-1 rounded-full font-sans">
              🌙 Week Off Today
            </span>
          </div>
        )}
        {!bannerIsOff && !isCheckedIn && !isCheckedOut && withinShiftWindow===false && shiftMeta && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-amber-100 font-semibold bg-white/15 px-2.5 py-1 rounded-full font-sans">
              ⏰ Shift: {shiftMeta.startTime} – {shiftMeta.endTime}
            </span>
          </div>
        )}
        {!isOnLeave && (isCheckedIn || isCheckedOut) && (
          <div className="flex items-center gap-3 mt-2 text-[11px] text-white/70 font-sans">
            <span>In: <strong className="text-white">{fmtTime(myAtt?.checkIn)}</strong></span>
            {isCheckedOut && <span>Out: <strong className="text-white">{fmtTime(myAtt?.checkOut)}</strong></span>}
          </div>
        )}
      </div>
      <button
        disabled={buttonDisabled || isCheckedOut}
        onClick={onOpenAttendance}
        className={`text-[13px] font-semibold px-5 py-2.5 rounded-xl border-none transition-all font-sans ${
          bannerIsOff || isCheckedOut
            ? "bg-white/30 text-indigo-400 cursor-not-allowed opacity-70"
            : "bg-white text-[#730042] cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(115,0,66,0.35)] active:translate-y-0 shadow-md"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

const LEAVE_TYPE_META = {
  el:{ label:"Earned", color:"#730042", bg:"rgba(115,0,66,0.08)" },
  sl:{ label:"Sick", color:"#1D9E75", bg:"rgba(29,158,117,0.08)" },
  pl:{ label:"Paternity", color:"#378ADD", bg:"rgba(55,138,221,0.08)" },
  ml:{ label:"Maternity", color:"#9333EA", bg:"rgba(147,51,234,0.08)" },
  cl:{ label:"Casual", color:"#BA7517", bg:"rgba(186,117,23,0.08)" },
  lwp:{ label:"LWP", color:"#E24B4A", bg:"rgba(226,75,74,0.08)" },
};

const STATUS_COLORS = {
  pending_manager:{ label:"Pending", color:"#92400E", bg:"#faeeda" },
  pending_admin:{ label:"Pending", color:"#92400E", bg:"#faeeda" },
  pending_superadmin:{ label:"Pending", color:"#92400E", bg:"#faeeda" },
  approved_manager:{ label:"Approved", color:"#1a6b48", bg:"#e8f5e9" },
  approved_admin:{ label:"Approved ✓", color:"#1a6b48", bg:"#e8f5e9" },
  approved_superadmin:{ label:"Approved ✓", color:"#1a6b48", bg:"#e8f5e9" },
  rejected_manager:{ label:"Rejected", color:"#791F1F", bg:"#fcebeb" },
  rejected_admin:{ label:"Rejected ✗", color:"#791F1F", bg:"#fcebeb" },
  rejected_superadmin:{ label:"Rejected ✗", color:"#791F1F", bg:"#fcebeb" },
  forwarded_admin:{ label:"Forwarded", color:"#185FA5", bg:"#e6f1fb" },
};

function LeaveHistoryList({ leaves=[], loading }) {
  if (loading) return (
    <div className="px-4 sm:px-5 pb-4 flex flex-col gap-2.5">
      {[1,2,3].map(i => <Skeleton key={i} className="h-11 rounded-xl w-full" />)}
    </div>
  );

  if (!leaves.length) return (
    <div className="py-10 px-4 text-center">
      <div className="text-3xl mb-3">📋</div>
      <div className="text-[13px] font-medium text-[#2a1a16] mb-1 font-sans">No leave history yet</div>
      <div className="text-[11px] text-[#b0948a] font-sans">Your leave applications will appear here</div>
    </div>
  );

  return (
    <div className="px-4 sm:px-5 pb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {leaves.map((lv,i) => {
          const lm=LEAVE_TYPE_META[lv.leaveType]||{ label:lv.leaveType?.toUpperCase()||"Leave", color:"#730042", bg:"rgba(115,0,66,0.08)" };
          const sm=STATUS_COLORS[lv.status]||{ label:lv.status, color:"#475569", bg:"#f1f5f9" };
          const days=lv.days||1;
          return (
            <div key={lv._id||i} className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fdfcfb] border border-[#f0e8e4] hover:border-[#e0d4ce] transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background:lm.bg, color:lm.color }}>
                {lm.label.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[#2a1a16] font-sans">{lm.label}</div>
                <div className="text-[10px] text-[#b0948a] mt-0.5 font-sans truncate">
                  {fmtDate(lv.startDate)} → {fmtDate(lv.endDate)} · {days}d
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0"
                style={{ background:sm.bg, color:sm.color }}>
                {sm.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StarRating({ rating=0, max=5, size=14 }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({length:max},(_,i) => {
        const filled=i<Math.floor(rating);
        const half=!filled && i<rating;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1-3-2.9 4.2-.8z"
              fill={filled?"#e8b84b":half?"url(#half)":"#e8ddd8"}
              stroke={filled||half?"#d4a33a":"#d9ceca"} strokeWidth=".5" />
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
      {rating>0 && <span className="text-[10px] text-[#b0948a] ml-1 font-sans">{Number(rating).toFixed(1)}</span>}
    </div>
  );
}

function ReviewCard({ reviews=[], loading }) {
  if (loading) return (
    <div className="p-4 flex flex-col gap-2.5">
      <Skeleton className="h-4 w-3/5" /><Skeleton className="h-8 w-2/5" /><Skeleton className="h-3 w-4/5" />
    </div>
  );
  const avg=reviews.length?(reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length):null;
  const thisMonth=new Date().toISOString().slice(0,7);
  const newThisMonth=reviews.filter(r=>r.monthYear===thisMonth).length;
  return (
    <div className="p-4 pb-5">
      {avg!==null ? (
        <>
          <div className="flex items-end gap-2.5 mb-3">
            <span className="text-4xl font-bold text-[#e8b84b] leading-none" style={{ fontFamily:"'Lora',serif" }}>{avg.toFixed(1)}</span>
            <div>
              <StarRating rating={avg} size={15} />
              <div className="text-[10px] text-[#b0948a] mt-1 font-sans">from {reviews.length} review{reviews.length!==1?"s":""}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1 mb-3">
            {[5,4,3,2,1].map(star => {
              const cnt=reviews.filter(r=>Math.round(r.rating)===star).length;
              const pct=reviews.length>0?(cnt/reviews.length)*100:0;
              return (
                <div key={star} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#b0948a] w-2 font-sans">{star}</span>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="#e8b84b"><path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1-3-2.9 4.2-.8z"/></svg>
                  <div className="flex-1 h-1.5 rounded-full bg-[#f0e8e4] overflow-hidden">
                    <div className="h-full rounded-full bg-[#e8b84b] transition-all duration-700" style={{ width:`${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#b0948a] w-4 text-right font-sans">{cnt}</span>
                </div>
              );
            })}
          </div>
          {newThisMonth>0 && <Badge variant="green">+{newThisMonth} this month</Badge>}
        </>
      ) : (
        <div className="text-center py-4">
          <div className="text-2xl mb-1.5">⭐</div>
          <div className="text-[12px] text-[#b0948a] font-sans">No reviews yet</div>
        </div>
      )}
    </div>
  );
}

const AttendanceMap = ({ checkins = [], loading = false }) => {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (instanceRef.current || !mapRef.current) return;
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
      if (!active || !mapRef.current || instanceRef.current) return;
      const L = window.L;
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
    const L = window.L;
    const map = instanceRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (!checkins.length) return;

    const bounds = [];
    checkins.forEach(({ lat, lng, name, role, dept, email, checkIn, checkedOut }) => {
      if (!lat || !lng) return;
      const color = role?.toLowerCase() === "admin" ? "#4a0029" : role?.toLowerCase() === "manager" ? "#730042" : "#a0005c";
      const size = role?.toLowerCase() === "manager" || role?.toLowerCase() === "admin" ? 15 : 11;
      const pulse = size + 14;
      const inits = getInitials(...(name || "?").split(" "));

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
          `<div style="font-family:'DM Sans',sans-serif;padding:6px 4px;min-width:175px;">
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

function leaveTypeColor(type="") {
  const t=type.toLowerCase();
  if (t.includes("sick")||t.includes("sl")) return "#1D9E75";
  if (t.includes("earn")||t.includes("el")) return "#730042";
  if (t.includes("pat")||t.includes("pl")) return "#378ADD";
  if (t.includes("mat")||t.includes("ml")) return "#9333EA";
  return "#730042";
}

function LeaveRequestsPanel({ leaves, loading, onAccept, onReject, accepting, rejecting }) {
  const pendingCount = leaves.filter(l => (l.status||"").toLowerCase().includes("pending")).length;
  return (
    <div className="bg-white rounded-2xl border border-[#ede5e0] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#ede5e0] flex items-center justify-between">
        <span className="text-[12px] font-semibold font-sans">Leave Requests</span>
        {pendingCount>0 && <Badge variant="amber">{pendingCount} pending</Badge>}
      </div>
      <div className="overflow-y-auto max-h-[420px] flex-1">
        {loading ? (
          <div className="p-4 flex flex-col gap-2.5">
            {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl w-full" />)}
          </div>
        ) : leaves.length===0 ? (
          <div className="text-center py-10 px-5 text-[#cfc3bc]">
            <div className="text-3xl mb-2.5">✅</div>
            <p className="text-[12px] font-sans">No leave requests. All clear.</p>
          </div>
        ) : (
          leaves.map((leave) => {
            const name = leave.employeeName || leave.name ||
              (leave.employee ? [leave.employee.f_name, leave.employee.l_name].filter(Boolean).join(" ") : "") ||
              leave.manager ? [leave.manager?.f_name, leave.manager?.l_name].filter(Boolean).join(" ") : "Employee";
            const type = leave.leaveType || leave.type || "Leave";
            const from = leave.startDate || leave.from || leave.fromDate || "";
            const to = leave.endDate || leave.to || leave.toDate || "";
            const status = (leave.status||"pending").toLowerCase();
            const isPending = status.includes("pending");
            return (
              <div key={leave._id||leave.id} className="p-3.5 border-b border-[#f0e8e4] last:border-0 flex items-start gap-2.5 hover:bg-[#fdfcfb] transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: leaveTypeColor(type) }}>
                  {getInitials(...(name||"E").split(" "))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[#2a1a16] truncate font-sans">{name||"Employee"}</div>
                  <div className="text-[10px] text-[#b0948a] mt-0.5 font-sans">{type} · {fmtDate(from)}{to&&to!==from?` → ${fmtDate(to)}`:""}</div>
                  {isPending ? (
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={()=>onAccept(leave._id||leave.id)} disabled={accepting}
                        className="bg-green-50 text-green-700 border border-green-200 rounded-md px-2.5 py-1 text-[10px] font-semibold cursor-pointer hover:bg-green-600 hover:text-white transition-all disabled:opacity-50 font-sans">
                        Approve
                      </button>
                      <button onClick={()=>onReject(leave._id||leave.id)} disabled={rejecting}
                        className="bg-red-50 text-red-700 border border-red-200 rounded-md px-2.5 py-1 text-[10px] font-semibold cursor-pointer hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 font-sans">
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize"
                      style={{
                        background: status.includes("approved") ? "#e8f5e9" : status.includes("rejected") ? "#fcebeb" : "#faeeda",
                        color: status.includes("approved") ? "#1a6b48" : status.includes("rejected") ? "#791F1F" : "#92400E",
                      }}>
                      {status.replace(/_/g," ")}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth]=useState(new Date().getMonth());
  const [empExpand, setEmpExpand]=useState(false);
  const [showAttendanceModal, setShowAttendanceModal]=useState(false);

  const { data:meData, isLoading:meLoading, isError:meError }=useGetMeAdmin();
  const { data:histData, isLoading:histLoading }=useAdminGetMyLeaveHistory();
  const { data:attData, isLoading:attLoading }=useTodayAttendance();
  const { data:wfhData, isLoading:wfhLoading }=useAdminGetMyWFH();
  const { data:empData, isLoading:empLoading }=useGetAllEmployee();
  const { data:checkinData, isLoading:mapLoading }=useGetTodayCheckins();
  const { data:leaveReqData, isLoading:leaveReqLoading }=useGetForwardedLeaves();
  const { data:calendarMetaData }=useCalendarMeta(selectedMonth, new Date().getFullYear());

  const { mutate:acceptLeave, isPending:accepting }=useAcceptLeave();
  const { mutate:rejectLeave, isPending:rejecting }=useRejectLeave();

  const employee=meData?.user??null;
  const lb=meData?.leaveBalance??null;
  const allLeaves=histData?.leave??histData?.leaves??[];
  const reviews=meData?.reviews??[];

  const joiningDate=employee?.createdAt??null;

  const employees = Array.isArray(empData?.employees) ? empData.employees : Array.isArray(empData) ? empData : [];
  const checkins = checkinData?.checkins ?? [];
  const leaveRequests = Array.isArray(leaveReqData?.leaves) ? leaveReqData.leaves : Array.isArray(leaveReqData) ? leaveReqData : [];

  const myAtt = attData?.attendance ?? null;
  const isCheckedIn = attData?.isCheckedIn ?? false;
  const isCheckedOut = attData?.isCheckedOut ?? false;

  const attendanceMap=useMemo(()=>{
    const records=Array.isArray(attData?.history)?attData.history:Array.isArray(attData)?attData:[];
    const IST_OFFSET_MS=5.5*60*60*1000;
    const map=new Map();
    records.forEach(rec=>{
      if (!rec.date) return;
      const istKey=new Date(new Date(rec.date).getTime()+IST_OFFSET_MS).toISOString().slice(0,10);
      map.set(istKey,rec);
    });
    if (myAtt?.date) {
      const istKey=new Date(new Date(myAtt.date).getTime()+IST_OFFSET_MS).toISOString().slice(0,10);
      map.set(istKey, myAtt);
    }
    return map;
  },[attData, myAtt]);

  const approvedLeaves=useMemo(()=>allLeaves.filter(lv=>APPROVED_STATUSES.includes(lv.status)),[allLeaves]);

  const wfhList = Array.isArray(wfhData?.wfh) ? wfhData.wfh : Array.isArray(wfhData?.requests) ? wfhData.requests : Array.isArray(wfhData) ? wfhData : [];
  const approvedWFH = useMemo(()=>wfhList.filter(w=>APPROVED_WFH_STATUSES.includes((w.status||"").toLowerCase())),[wfhList]);

  const currentYear = new Date().getFullYear();
  const holidayMap = useMemo(()=>{
    const map = new Map();
    (calendarMetaData?.holidays||[]).forEach(h=>{
      const d = new Date(h.date);
      if (d.getFullYear()===currentYear && d.getMonth()===selectedMonth) map.set(d.getDate(), h.name);
    });
    return map;
  },[calendarMetaData, selectedMonth, currentYear]);

  const weekOffSet = useMemo(()=>{
    const set = new Set();
    (calendarMetaData?.weekOffDates||[]).forEach(dt=>{
      const d = new Date(dt);
      if (d.getFullYear()===currentYear && d.getMonth()===selectedMonth) set.add(d.getDate());
    });
    return set;
  },[calendarMetaData, selectedMonth, currentYear]);

  const todayMeta = calendarMetaData?.today || null;
  const isHolidayToday = todayMeta?.isHoliday || false;
  const isWeekOffToday = todayMeta?.isWeekOff || false;
  const withinShiftWindow = todayMeta ? todayMeta.withinShiftWindow : undefined;

  const todayLeave=useMemo(()=>{
    const today=new Date();
    return approvedLeaves.find(lv=>isDateInRange(today,lv.startDate,lv.endDate))??null;
  },[approvedLeaves]);

  const isOnLeaveToday=Boolean(todayLeave);
  const empInitials=employee?getInitials(employee.f_name,employee.l_name):"—";
  const fullName=employee?`${employee.f_name} ${employee.l_name}`:"—";

  const joiningMidnight=useMemo(()=>{
    if (!joiningDate) return null;
    const d=new Date(joiningDate); d.setHours(0,0,0,0); return d;
  },[joiningDate]);

  const { presentCount, absentCount, halfCount, checkedInCount, attendanceRate }=useMemo(()=>{
    const year=new Date().getFullYear();
    const today=new Date(); today.setHours(0,0,0,0);
    let present=0,absent=0,half=0,checkedIn=0,counted=0;
    const daysInMonth=new Date(year,selectedMonth+1,0).getDate();
    for (let d=1; d<=daysInMonth; d++) {
      const date=new Date(year,selectedMonth,d); date.setHours(0,0,0,0);
      if (date>today) break;
      if (joiningMidnight && date<joiningMidnight) continue;
      if (approvedLeaves.some(lv=>isDateInRange(date,lv.startDate,lv.endDate))) continue;
      if (holidayMap.has(d) || weekOffSet.has(d)) continue;
      counted++;
      const key=date.toISOString().slice(0,10);
      const rec=attendanceMap.get(key);
      const status=resolveAttendanceStatus(rec);
      if (status==="present") present++;
      else if (status==="absent"||!status) absent++;
      else if (status==="halfday"||status==="late") half++;
      else if (status==="checkedin") checkedIn++;
    }
    const rate=counted>0?Math.round(((present+checkedIn)/counted)*100):0;
    return { presentCount:present, absentCount:absent, halfCount:half, checkedInCount:checkedIn, attendanceRate:rate };
  },[attendanceMap,selectedMonth,approvedLeaves,joiningMidnight,holidayMap,weekOffSet]);

  const elRemaining=(lb?.EL?.entitled??0)-(lb?.EL?.availed??0);
  const slRemaining=(lb?.SL?.entitled??0)-(lb?.SL?.availed??0);
  const plEntitled=lb?.PL??0;

  const totalEmployees = empData?.count || employees.length || 0;
  const presentTodayCount = checkinData?.total ?? checkins.length;

  if (meError) return (
    <div className="font-sans bg-[#f9f8f2] min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#ede5e0] p-8 text-center max-w-xs">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-[14px] font-semibold mb-1.5" style={{ fontFamily:"'Lora',serif" }}>Failed to load dashboard</div>
        <div className="text-[12px] text-[#b0948a]">Check your connection or log in again.</div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f9f8f2] min-h-screen text-[#2a1a16]" style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(115,0,66,0.35)} 70%{box-shadow:0 0 0 8px rgba(115,0,66,0)} 100%{box-shadow:0 0 0 0 rgba(115,0,66,0)} }
        @keyframes mPulse { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity: .5; } 50% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; } }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        .animate-fadein { animation: fadeUp .35s ease both; }
        .pulse-ring { animation: pulse-ring 2s infinite; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #0d9e6e; animation: livePulse 2s infinite; }
        .leaflet-container { font-family: 'DM Sans', sans-serif; }
        .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.1); }
        .leaflet-popup-content { margin: 12px 16px; }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">

        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold m-0 tracking-tight" style={{ fontFamily:"'Lora',serif" }}>Dashboard</h1>
            <p className="text-[12px] text-[#b0948a] mt-0.5 font-sans">
              {employee?`Welcome back, ${employee.f_name} · ${employee.uid}`:"Welcome back"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {employee?.office_location && (
              <div className="hidden sm:block text-[11px] text-[#b0948a] bg-white border border-[#ede5e0] rounded-full px-3 py-1 font-sans">
                📍 {employee.office_location}
              </div>
            )}
            <div className="relative">
              <Avatar
                src={employee?.profile_image}
                initials={meLoading?"—":empInitials}
                size={38}
                style={{ boxShadow:"0 2px 8px rgba(115,0,66,0.25)", borderRadius:10 }}
                className={isOnLeaveToday?"pulse-ring":""}
              />
              {isOnLeaveToday && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-700 border-2 border-[#f9f8f2] flex items-center justify-center">
                  <span className="text-[7px]">🏖</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <TodayBanner
          isOnLeave={isOnLeaveToday}
          leaveType={todayLeave?.leaveType}
          isCheckedIn={isCheckedIn}
          isCheckedOut={isCheckedOut}
          myAtt={myAtt}
          onOpenAttendance={()=>setShowAttendanceModal(true)}
          isHolidayToday={isHolidayToday}
          holidayName={todayMeta?.holidayName}
          isWeekOffToday={isWeekOffToday}
          withinShiftWindow={withinShiftWindow}
          shiftMeta={todayMeta?.shift}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-3.5">
          <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein hover:shadow-lg transition-shadow lg:col-span-2">
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#ede5e0] flex-wrap gap-2">
              <div className="flex items-center gap-2 font-sans text-[12px] font-semibold">
                <div className="live-dot"></div>
                Live Attendance Map
              </div>
              <span className="text-[10px] text-[#b0948a] font-sans flex items-center gap-1">
                📍 {mapLoading?"Loading…":`${checkins.length} check-in${checkins.length!==1?"s":""} today`}
              </span>
            </div>
            <div className="h-[260px] sm:h-[320px] lg:h-[360px] w-full">
              <AttendanceMap checkins={checkins} loading={mapLoading} />
            </div>
            <div className="px-4 py-2.5 border-t border-[#f0e8e4] flex flex-wrap gap-3 items-center bg-[#fdfcfb]">
              {[["#4a0029","Admin"],["#730042","Manager"],["#a0005c","Employee"]].map(([c,l])=>(
                <div key={l} className="flex items-center gap-1.5 text-[10px] text-[#b0948a] font-sans">
                  <div className="w-2 h-2 rounded-full" style={{ background:c }} />{l}
                </div>
              ))}
              <span className="ml-auto text-[10px] text-[#cfc3bc] font-sans hidden sm:inline">
                🏢 {totalEmployees} employees · {presentTodayCount} present
              </span>
            </div>
          </div>

          <LeaveRequestsPanel
            leaves={leaveRequests}
            loading={leaveReqLoading}
            onAccept={(id)=>acceptLeave(id)}
            onReject={(id)=>rejectLeave(id)}
            accepting={accepting}
            rejecting={rejecting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-3.5">

          <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein hover:shadow-lg transition-shadow">
            <CardAccent color="#730042" />
            <div className="p-4 pt-5">
              <div className="text-[11px] text-[#b0948a] font-medium tracking-wide mb-3 uppercase font-sans">Admin</div>
              {meLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-11 h-11 rounded-xl" />
                    <div className="flex-1 flex flex-col gap-1.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                  <Skeleton className="h-5 w-3/5" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Avatar src={employee?.profile_image} initials={empInitials} size={44}
                      style={{ borderRadius:12, boxShadow:"0 3px 10px rgba(115,0,66,0.22)" }} />
                    <div>
                      <div className="text-[14px] font-semibold leading-snug" style={{ fontFamily:"'Lora',serif" }}>{fullName}</div>
                      <div className="text-[11px] text-[#b0948a] capitalize mt-0.5 font-sans">{employee?.designation??"—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="brand">{employee?.uid??"—"}</Badge>
                    <Badge variant="green">Active</Badge>
                    <Badge variant="blue">{employee?.department??"—"}</Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#ede5e0] flex flex-col gap-1">
                    <div className="text-[10px] text-[#b0948a] font-sans">📧 {employee?.work_email??"—"}</div>
                    <div className="text-[10px] text-[#b0948a] font-sans">📞 {employee?.personal_contact??"—"}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <DOJCard joiningDate={joiningDate} />

          <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein hover:shadow-lg transition-shadow" style={{ animationDelay:".1s" }}>
            <CardAccent color="#1D9E75" />
            <div className="p-4 pt-5">
              <div className="text-[11px] text-[#b0948a] font-medium tracking-wide mb-3 uppercase font-sans">Leave overview</div>
              {meLoading ? (
                <div className="flex flex-col gap-2"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-3.5 w-4/5" /><Skeleton className="h-3.5 w-3/5" /></div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-3xl font-bold text-[#1D9E75] leading-none" style={{ fontFamily:"'Lora',serif" }}>{elRemaining}</span>
                    <span className="text-[12px] text-[#b0948a] font-sans">EL remaining</span>
                  </div>
                  <div className="text-[11px] text-[#b0948a] mb-3 font-sans">
                    Accrued this month: <strong className="text-[#2a1a16]">{lb?.EL?.accrued??0}</strong> days
                  </div>
                  {isOnLeaveToday && (
                    <div className="bg-indigo-50 rounded-xl px-2.5 py-1.5 text-[11px] text-indigo-700 font-semibold mb-3 font-sans">
                      🏖️ Currently on leave
                    </div>
                  )}
                  <SegBar segments={[
                    { pct:elRemaining, color:"#1D9E75", label:`EL (${elRemaining} left)` },
                    { pct:slRemaining, color:"#378ADD", label:`SL (${slRemaining} left)` },
                    { pct:plEntitled, color:"#BA7517", label:`PL (${plEntitled})` },
                  ]} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden relative animate-fadein bg-[#730042] border border-[#5a0033] hover:shadow-lg transition-shadow" style={{ animationDelay:".15s" }}>
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/[.06]" />
            <div className="absolute -bottom-2.5 -left-2.5 w-16 h-16 rounded-full bg-white/[.04]" />
            <div className="p-4 pt-5 relative">
              <div className="text-[11px] text-white/60 font-medium tracking-wide mb-3 uppercase font-sans">Organisation</div>
              {empLoading||mapLoading ? (
                <div className="flex flex-col gap-2"><Skeleton className="h-5 w-3/5" /><Skeleton className="h-3.5 w-4/5" /></div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-3xl font-bold text-[#f9f8f2] leading-none" style={{ fontFamily:"'Lora',serif" }}>{totalEmployees}</span>
                    <span className="text-[12px] text-white/60 font-sans">total people</span>
                  </div>
                  <div className="h-px bg-white/15 mb-3" />
                  <div className="flex justify-between text-[11px] font-sans mb-2">
                    <span className="text-white/50">Present today</span>
                    <span className="font-medium text-white/80">{presentTodayCount}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-sans mb-2">
                    <span className="text-white/50">Pending leaves</span>
                    <span className="font-medium text-white/80">{leaveRequests.filter(l=>(l.status||"").toLowerCase().includes("pending")).length}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-sans">
                    <span className="text-white/50">Attendance rate</span>
                    <span className="font-medium text-white/80">{totalEmployees>0?Math.round((presentTodayCount/totalEmployees)*100):0}%</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-3.5">
          <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein hover:shadow-lg transition-shadow" style={{ animationDelay:".2s" }}>
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#ede5e0] flex-wrap gap-2">
              <span className="text-[12px] font-semibold font-sans">Attendance</span>
              <div className="flex items-center gap-2 flex-wrap">
                {(attLoading||wfhLoading) && <span className="text-[10px] text-[#b0948a] font-sans">Loading…</span>}
                {isOnLeaveToday && <Badge variant="blue">On Leave Today</Badge>}
                <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}
                  className="font-sans text-[11px] text-[#b0948a] bg-[#f9f8f2] border border-[#ede5e0] rounded-lg px-2 py-1 cursor-pointer outline-none focus:border-[#730042]">
                  {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="px-3 sm:px-4 pt-3">
              {joiningDate && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-sm bg-[#cfc6c1]" />
                  <span className="text-[10px] text-[#b0948a] font-sans">Joined {fmtDate(joiningDate)} · days before this are not counted</span>
                </div>
              )}
              <div className="max-w-2xl mx-auto">
                <Calendar month={selectedMonth} joiningDate={joiningDate} attendanceMap={attendanceMap} approvedLeaves={approvedLeaves} approvedWFH={approvedWFH} holidayMap={holidayMap} weekOffSet={weekOffSet} />
              </div>
            </div>
            <div className="grid grid-cols-5 border-t border-[#f0e8e4] mt-3">
              {[[presentCount,"#730042","Present"],[absentCount,"#E24B4A","Absent"],[halfCount,"#BA7517","Half/Late"],[checkedInCount,"#1D9E75","Active Now"],[`${attendanceRate}%`,"#378ADD","Rate"]].map(([v,c,l]) => (
                <div key={l} className="py-2.5 text-center border-r border-[#f0e8e4] last:border-0">
                  <div className="text-[15px] font-bold leading-none" style={{ color:c, fontFamily:"'Lora',serif" }}>{v}</div>
                  <div className="text-[10px] text-[#b0948a] mt-1 font-sans">{l}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#f0e8e4]">
              {[["#730042","Present"],["#E24B4A","Absent"],["#f57f17","Half day"],["#e65100","Late"],["#1D9E75","Checked in"],["#283593","On leave"],["#0f766e","WFH"],["#b5590a","Holiday"],["#64748b","Week off"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1 text-[10px] text-[#b0948a] font-sans">
                  <div className="w-2 h-2 rounded-sm" style={{ background:c }} />{l}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 mb-3.5">

          <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein hover:shadow-lg transition-shadow" style={{ animationDelay:".3s" }}>
            <CardAccent color="#730042" />
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#ede5e0]">
              <span className="text-[12px] font-semibold font-sans">Admin profile</span>
              <Badge variant="brand">{employee?.role??"admin"}</Badge>
            </div>
            <div className="px-4 sm:px-5 py-3.5 flex items-center gap-3.5 border-b border-[#ede5e0]">
              <Avatar src={employee?.profile_image} initials={meLoading?"—":empInitials}
                size={52} style={{ borderRadius:14, boxShadow:"0 4px 14px rgba(115,0,66,0.22)" }} />
              <div>
                <div className="text-[16px] font-bold" style={{ fontFamily:"'Lora',serif" }}>
                  {meLoading?<Skeleton className="h-5 w-32" />:fullName}
                </div>
                <div className="text-[12px] text-[#b0948a] capitalize mt-0.5 font-sans">
                  {meLoading?<Skeleton className="h-3.5 w-24" />:(employee?.designation??"—")}
                </div>
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                  <Badge variant="green">Active</Badge>
                  <Badge variant="blue">{employee?.uid??"—"}</Badge>
                  {reviews.length>0 && <StarRating rating={reviews.reduce((s,r)=>s+r.rating,0)/reviews.length} size={12} />}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 px-4 sm:px-5 py-3.5">
              <InfoField label="Work email" value={employee?.work_email} loading={meLoading} />
              <InfoField label="Department" value={employee?.department} loading={meLoading} />
              <InfoField label="Office" value={employee?.office_location} loading={meLoading} />
              <InfoField label="Gender" value={employee?.gender} loading={meLoading} />
              <InfoField label="Marital status" value={employee?.marital_status} loading={meLoading} />
              <InfoField label="Contact" value={employee?.personal_contact} loading={meLoading} />
              <InfoField label="Emergency contact" value={employee?.e_contact} loading={meLoading} />
              <InfoField label="Member since" value={employee?.createdAt?fmtDate(employee.createdAt):null} loading={meLoading} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein hover:shadow-lg transition-shadow" style={{ animationDelay:".35s" }}>
            <CardAccent color="#1D9E75" />
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#ede5e0]">
              <span className="text-[12px] font-semibold font-sans">Leave balance</span>
              <span className="text-[10px] text-[#b0948a] font-sans">FY 2025–26</span>
            </div>
            <div className="px-4 sm:px-5 pb-1">
              {meLoading
                ? [1,2,3,4,5,6].map(i => <div key={i} className="py-3 border-b border-[#ede5e0]"><Skeleton className="h-10" /></div>)
                : (
                  <>
                    <LeaveRow label="Earned Leave (EL)" availed={lb?.EL?.availed??0} entitled={lb?.EL?.entitled??0} accrued={lb?.EL?.accrued??null} color="#0d9e6e" />
                    <LeaveRow label="Sick Leave (SL)" availed={lb?.SL?.availed??0} entitled={lb?.SL?.entitled??0} accrued={null} color="#378ADD" />
                    <FlatRow label="Paternity Leave (PL)" value={lb?.PL??0} color="#730042" />
                    <FlatRow label="Maternity Leave (ML)" value={lb?.ML??0} color="#9333EA" />
                    <FlatRow label="Paid by Company (PBC)" value={lb?.pbc??0} color="#BA7517" />
                    <FlatRow label="Leave Without Pay (LWP)" value={lb?.lwp??0} color="#E24B4A" />
                  </>
                )
              }
            </div>
            {!meLoading && lb?.lastAccrualDate && (
              <div className="mx-4 sm:mx-5 mb-4">
                <div className="bg-[#f9f8f2] border border-[#ede5e0] rounded-xl px-2.5 py-1.5 text-[11px] font-sans inline-block">
                  <span className="text-[#b0948a]">Last accrual </span>
                  <strong className="text-[#2a1a16]">{new Date(lb.lastAccrualDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein md:col-span-2 xl:col-span-1 hover:shadow-lg transition-shadow" style={{ animationDelay:".4s" }}>
            <CardAccent color="#e8b84b" />
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#ede5e0]">
              <span className="text-[12px] font-semibold font-sans">My Reviews</span>
              {reviews.length>0 && <Badge variant="amber">{reviews.length} total</Badge>}
            </div>
            <ReviewCard reviews={reviews} loading={meLoading} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative animate-fadein hover:shadow-lg transition-shadow mb-3.5" style={{ animationDelay:".45s" }}>
          <CardAccent color="#378ADD" />
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#ede5e0] flex-wrap gap-2">
            <div>
              <span className="text-[12px] font-semibold font-sans">Leave History</span>
              {!histLoading && (
                <span className="ml-2 text-[11px] text-[#b0948a] font-sans">({allLeaves.length} total)</span>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="green">{approvedLeaves.length} approved</Badge>
              <Badge variant="amber">{allLeaves.filter(l=>l.status?.includes("pending")).length} pending</Badge>
              <Badge variant="red">{allLeaves.filter(l=>l.status?.includes("rejected")).length} rejected</Badge>
            </div>
          </div>
          <LeaveHistoryList leaves={allLeaves} loading={histLoading} />
        </div>

        <div className="bg-white rounded-2xl border border-[#ede5e0] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#ede5e0] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-sans text-[12px] font-semibold">
              👥 Employee Overview
            </div>
            {employees.length > 8 && (
              <button
                className="bg-none text-[#b0948a] border border-[#ede5e0] px-3 sm:px-4 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:border-[#730042] hover:text-[#730042] transition-all font-sans"
                onClick={() => setEmpExpand((v) => !v)}
              >
                {empExpand ? "Show Less" : `View All (${employees.length})`}
              </button>
            )}
          </div>

          {empLoading ? (
            <div className="text-center py-10 px-5 text-[#cfc3bc]">
              <div className="text-3xl mb-2.5">⏳</div>
              <p className="text-[12px] font-sans">Loading employees…</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-10 px-5 text-[#cfc3bc]">
              <div className="text-3xl mb-2.5">👥</div>
              <p className="text-[12px] font-sans">No employees found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 sm:p-5">
              {(empExpand?employees:employees.slice(0,8)).map((emp, i) => {
                const name = [emp.f_name, emp.l_name].filter(Boolean).join(" ") || "Employee";
                const role = emp.designation || emp.role || "";
                const dept = emp.department || "";
                const email = emp.work_email || "";
                return (
                  <div key={emp._id || emp.id || i} className="border border-[#ede5e0] rounded-xl p-3.5 flex items-center gap-3 transition-all hover:shadow-sm hover:bg-[#fdfcfb]">
                    <Avatar src={emp.profile_image} initials={getInitials(emp.f_name,emp.l_name)} size={40}
                      style={{ borderRadius:10, background:"linear-gradient(135deg,#4a0029,#a0005c)" }} />
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#2a1a16] leading-tight truncate font-sans">{name}</div>
                      {role && <div className="text-[10px] text-[#b0948a] mt-0.5 truncate font-sans">{role}</div>}
                      {dept && <span className="inline-block text-[9px] font-semibold bg-[rgba(115,0,66,0.08)] text-[#730042] px-1.5 py-0.5 rounded-full mt-1 font-sans">{dept}</span>}
                      {email && (
                        <div className="text-[9px] text-[#cfc3bc] mt-1 truncate font-sans">✉ {email}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {showAttendanceModal && (
        <AttendanceModal
          user={employee}
          onClose={()=>setShowAttendanceModal(false)}
        />
      )}
    </div>
  );
}