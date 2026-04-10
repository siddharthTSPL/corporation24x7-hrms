import React, { useState, useEffect } from "react";

import { useGetAnnouncements } from "../../auth/server-state/employee/employeeannounce/employeeannounce.hook";
import { useGetAllLeaves } from "../../auth/server-state/employee/employeeleave/employeeleave.hook";
import { useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";


const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["S","M","T","W","T","F","S"];
const SEED = [0.12,0.73,0.91,0.44,0.67,0.35,0.88,0.22,0.56,0.79,0.14,0.95,0.41,0.63,0.28,0.82,0.51,0.17,0.74,0.39,0.66,0.8,0.25,0.48,0.93,0.31,0.59,0.72,0.11,0.86,0.43];

function getInitials(fName = "", lName = "") {
  return `${fName[0] || ""}${lName[0] || ""}`.toUpperCase();
}

function computeTenure(dateStr) {
  if (!dateStr) return { years: 0, months: 0, yearsFloat: "0.0", nextMilestoneLabel: "—", fracInYear: 0 };
  const joined = new Date(dateStr);
  const now = new Date();
  const diffMs = now - joined;
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearsFloat = (diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
  const nextMilestoneYear = years + 1;
  const nextDate = new Date(joined);
  nextDate.setFullYear(joined.getFullYear() + nextMilestoneYear);
  const nextLabel = `${nextMilestoneYear} yr — ${nextDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
  const fracInYear = parseFloat(yearsFloat) % 1;
  return { years, months, yearsFloat, nextMilestoneLabel: nextLabel, fracInYear };
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return `${Math.floor(diff / 86400000)} days ago`;
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────

function CardAccent({ color }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "12px 12px 0 0" }} />
  );
}

function Badge({ children, variant = "brand" }) {
  const styles = {
    brand: { background: "rgba(115,0,66,0.08)", color: "#730042" },
    green: { background: "#e8f5e9", color: "#1a6b48" },
    blue:  { background: "#e6f1fb", color: "#185FA5" },
    amber: { background: "#faeeda", color: "#633806" },
    red:   { background: "#fcebeb", color: "#791F1F" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500, ...styles[variant] }}>
      {children}
    </span>
  );
}

function SegBar({ segments }) {
  return (
    <>
      <div style={{ display: "flex", height: 5, borderRadius: 5, overflow: "hidden", gap: 2, margin: "10px 0 8px" }}>
        {segments.map((s, i) => <div key={i} style={{ flex: s.pct, background: s.color }} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#b0948a" }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </>
  );
}

function LeaveRow({ label, used, total, color }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "0.5px solid #ede5e0" }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#2a1a16", marginBottom: 5 }}>{label}</div>
        <div style={{ height: 4, borderRadius: 4, background: "#f0e8e4", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: "#2a1a16", lineHeight: 1 }}>{used ?? "—"}</div>
        <div style={{ fontSize: 10, color: "#b0948a", marginTop: 2 }}>of {total ?? "—"}</div>
      </div>
    </div>
  );
}

function AnnouncementItem({ ann }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 0", borderBottom: "0.5px solid #f0e8e4", alignItems: "flex-start", opacity: ann.unread ? 1 : 0.5 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 5, background: ann.unread ? "#730042" : "#ede5e0" }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#2a1a16", marginBottom: 3 }}>{ann.title}</div>
        <div style={{ fontSize: 11, color: "#b0948a", lineHeight: 1.55, marginBottom: 4 }}>{ann.description}</div>
        <div style={{ fontSize: 10, color: "#c9bab5" }}>{timeAgo(ann.createdAt)}</div>
      </div>
    </div>
  );
}

function Calendar({ month }) {
  const year = new Date().getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    let status = "future";
    if (date <= today) {
      const r = SEED[(d - 1) % SEED.length];
      status = r > 0.9 ? "absent" : r > 0.84 ? "halfday" : r > 0.79 ? "leave" : "present";
    }
    cells.push({ day: d, status, isToday: date.toDateString() === today.toDateString() });
  }

  const statusStyle = {
    present: { background: "rgba(115,0,66,0.07)", color: "#730042", fontWeight: 500 },
    absent:  { background: "#fce4ec", color: "#b71c1c", fontWeight: 500 },
    halfday: { background: "#fff8e1", color: "#f57f17", fontWeight: 500 },
    leave:   { background: "#e8eaf6", color: "#283593", fontWeight: 500 },
    future:  { color: "#d4c8c4", fontWeight: 400 },
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#b0948a", padding: "3px 0", fontWeight: 500 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((cell, i) => (
          <div key={i} style={{
            aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 6, fontSize: 10,
            outline: cell?.isToday ? "1.5px solid #730042" : "none",
            outlineOffset: -1.5,
            ...(cell ? statusStyle[cell.status] : {}),
          }}>
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
    <div className="card" style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #ede5e0", overflow: "hidden", position: "relative" }}>
      <CardAccent color="#378ADD" />
      <div style={{ padding: "16px 18px 14px" }}>
        <div style={{ fontSize: 11, color: "#b0948a", fontWeight: 500, letterSpacing: ".3px", marginBottom: 10 }}>Date of joining</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Ring */}
          <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={R} fill="none" stroke="#ede5e0" strokeWidth="6" />
              <circle cx="44" cy="44" r={R} fill="none" stroke="#378ADD" strokeWidth="6"
                strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 500, color: "#730042", lineHeight: 1 }}>{yearsFloat}</span>
              <span style={{ fontSize: 9, color: "#b0948a", marginTop: 1 }}>yrs</span>
            </div>
          </div>
          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
            <div style={{ fontSize: 11, color: "#b0948a" }}>Joined on
              <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#2a1a16", marginTop: 1 }}>
                {joiningDate ? new Date(joiningDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#b0948a" }}>Experience here
              <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#2a1a16", marginTop: 1 }}>
                {years} yr{years !== 1 ? "s" : ""} {months} mo
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#b0948a" }}>Next milestone
              <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#378ADD", marginTop: 1 }}>{nextMilestoneLabel}</span>
            </div>
          </div>
        </div>
        {/* Pip bar */}
        <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ height: 4, flex: 1, borderRadius: 4, background: i < pips ? "#378ADD" : "#ede5e0" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "#b0948a" }}>
          <span>0</span><span>1yr</span><span>2yr</span><span>3yr</span><span>4yr</span><span>5yr</span>
        </div>
      </div>
    </div>
  );
}

function IncomeCard({ salary }) {
  // salary shape (add to your user model or a separate salary model):
  // { net: 82500, basic: 55000, hra: 22000, allowances: 5500, nextCreditDate: "2026-04-30", growthPct: 8.3 }
  const fmt = (v) => v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
  return (
    <div style={{ background: "#730042", borderRadius: 12, border: "0.5px solid #5a0033", padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ fontSize: 11, color: "rgba(249,248,242,0.6)", fontWeight: 500, letterSpacing: ".3px", marginBottom: 8 }}>Income from company</div>
      <div style={{ fontSize: 26, fontWeight: 500, color: "#f9f8f2", lineHeight: 1, marginBottom: 6 }}>{fmt(salary?.net)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ padding: "2px 7px", borderRadius: 12, fontSize: 10, fontWeight: 500, background: "rgba(249,248,242,0.15)", color: "#f9f8f2" }}>
          ↑ {salary?.growthPct ?? "—"}%
        </span>
        <span style={{ fontSize: 11, color: "rgba(249,248,242,0.5)" }}>vs last year</span>
      </div>
      <div style={{ height: "0.5px", background: "rgba(249,248,242,0.15)", margin: "10px 0" }} />
      {[
        ["Basic salary", salary?.basic],
        ["HRA",          salary?.hra],
        ["Allowances",   salary?.allowances],
      ].map(([label, val]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: "rgba(249,248,242,0.5)" }}>{label}</span>
          <span style={{ fontWeight: 500, color: "rgba(249,248,242,0.8)" }}>{fmt(val)}</span>
        </div>
      ))}
      <div style={{ height: "0.5px", background: "rgba(249,248,242,0.15)", margin: "8px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span style={{ color: "rgba(249,248,242,0.5)" }}>Next credit</span>
        <span style={{ fontWeight: 500, color: "rgba(249,248,242,0.6)" }}>
          {salary?.nextCreditDate ? new Date(salary.nextCreditDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </span>
      </div>
    </div>
  );
}

function AreaChart() {
  const income  = [5200,5400,5600,5500,5900,6200,6950,7100,7300];
  const expense = [3800,3900,4100,4000,4300,4400,4600,4700,4800];
  const labels  = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const W=560,H=160,PL=40,PR=10,PT=10,PB=30;
  const cw=W-PL-PR, ch=H-PT-PB;
  const minV=2000, maxV=9000;
  const xp = (i) => PL + (i/(income.length-1))*cw;
  const yp = (v) => PT + ch - ((v-minV)/(maxV-minV))*ch;
  const poly = (d) => d.map((v,i)=>`${xp(i)},${yp(v)}`).join(" ");
  const area = (d) => `M${xp(0)},${yp(d[0])} L${poly(d)} L${xp(d.length-1)},${PT+ch} L${xp(0)},${PT+ch} Z`;
  const yticks = [3000,5000,7000,9000];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"100%" }}>
      <defs>
        <linearGradient id="iGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#730042" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#730042" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {yticks.map(v=>(
        <g key={v}>
          <line x1={PL} y1={yp(v)} x2={W-PR} y2={yp(v)} stroke="#ede5e0" strokeWidth="0.5" />
          <text x={PL-6} y={yp(v)+4} fontSize="9" fill="#b0948a" textAnchor="end">${v/1000}K</text>
        </g>
      ))}
      {labels.map((l,i)=>(
        <text key={l} x={xp(i)} y={H-6} fontSize="9" fill="#b0948a" textAnchor="middle">{l}</text>
      ))}
      <path d={area(expense)} fill="none" />
      <polyline points={poly(expense)} fill="none" stroke="#c9a8b8" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={area(income)} fill="url(#iGrad)" />
      <polyline points={poly(income)} fill="none" stroke="#730042" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {income.map((v,i)=>(
        <circle key={i} cx={xp(i)} cy={yp(v)} r="3" fill="#730042" />
      ))}
      <g transform={`translate(${xp(6)},${yp(6950)-22})`}>
        <rect x="-28" y="-14" width="56" height="18" rx="5" fill="#730042" />
        <text x="0" y="-1" fontSize="9" fill="#f9f8f2" textAnchor="middle" fontWeight="500">$6.95K ↑8.72%</text>
      </g>
      <line x1={xp(6)} y1={yp(6950)} x2={xp(6)} y2={yp(minV)} stroke="#730042" strokeWidth="0.5" strokeDasharray="3 3" />
    </svg>
  );
}

// ─── SKELETON LOADER ──────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 16, radius = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg, #f0e8e4 25%, #f9f4f2 50%, #f0e8e4 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // ── API hooks ──
  const { data: meData, isLoading: meLoading, isError: meError } = useGetMeUser();
  const { data: annData, isLoading: annLoading } = useGetAnnouncements();
  const { data: leaveData, isLoading: leaveLoading } = useGetAllLeaves();

  // ── Derived data ──
  // getme returns: { success, employee, leavebalance }
  const employee = meData?.employee ?? null;
  const leavebalance = meData?.leavebalance?.[0] ?? null; // array from your schema

  // getallleave returns: { success, EL, SL, ML, PL, pbc, lwp }
  const leaveEntitled = leaveData ?? {};

  // showannouncements returns: { success, announcements: [...] }
  const announcements = annData?.announcements ?? [];

  // Salary — wire this to your salary API/model when ready
  // Shape expected: { net, basic, hra, allowances, growthPct, nextCreditDate }
  const salary = employee?.salary ?? null;

  const initials = employee ? getInitials(employee.f_name, employee.l_name) : "—";
  const fullName = employee ? `${employee.f_name} ${employee.l_name}` : "—";

  // ── Leave balance rows — mapped from leavebalance model ──
  // Your LeaveBalance model: { EL: { entitled, used }, SL: { entitled, used }, ML, PL, pbc, lwp }
  const leaveRows = [
    { label: "Earned leave (EL)", used: leavebalance?.EL?.used ?? leaveEntitled?.EL, total: leavebalance?.EL?.entitled ?? 18, color: "#730042" },
    { label: "Sick leave (SL)",   used: leavebalance?.SL?.used ?? leaveEntitled?.SL, total: leavebalance?.SL?.entitled ?? 12, color: "#1D9E75" },
    { label: "Casual leave",      used: leavebalance?.casual?.used, total: leavebalance?.casual?.entitled ?? 8, color: "#378ADD" },
    { label: "LWP / Other",       used: leavebalance?.lwp ?? leaveEntitled?.lwp, total: 5, color: "#BA7517" },
  ];

  const s = {
    page: { fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f9f8f2", minHeight: "100vh", padding: "24px 28px", color: "#2a1a16" },
    card: { background: "#fff", borderRadius: 12, border: "0.5px solid #ede5e0", overflow: "hidden", position: "relative" },
    cardBody: { padding: "16px 18px 14px" },
    cardLabel: { fontSize: 11, color: "#b0948a", fontWeight: 500, letterSpacing: ".3px", marginBottom: 8 },
    grid4: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 14 },
    grid2: { display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 14, marginBottom: 14 },
    grid3: { display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,320px)", gap: 14 },
    cardHeader: { padding: "16px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #ede5e0" },
  };

  if (meError) {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...s.card, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Failed to load dashboard</div>
          <div style={{ fontSize: 12, color: "#b0948a" }}>Please check your connection or log in again.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* TOPBAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "#b0948a", marginTop: 2 }}>
            {employee ? `Welcome back, ${employee.f_name}` : "Welcome back"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, border: "0.5px solid #ede5e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5a4 4 0 0 0-4 4V7L2 8.5V9.5h11V8.5L11.5 7V5.5a4 4 0 0 0-4-4zM7.5 13.5a1.5 1.5 0 0 1-1.5-1.5h3a1.5 1.5 0 0 1-1.5 1.5z" fill="#730042" />
            </svg>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#730042", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#f9f8f2" }}>
            {meLoading ? "—" : initials}
          </div>
        </div>
      </div>

      {/* ROW 1: 4 stat cards */}
      <div style={s.grid4}>

        {/* Card 1: Employee */}
        <div style={s.card}>
          <CardAccent color="#730042" />
          <div style={s.cardBody}>
            <div style={s.cardLabel}>Employee</div>
            {meLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton h={22} w="70%" />
                <Skeleton h={14} w="55%" />
                <Skeleton h={20} w="40%" />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.2, marginBottom: 4 }}>{fullName}</div>
                <div style={{ fontSize: 11, color: "#b0948a", marginBottom: 10 }}>{employee?.designation ?? "—"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Badge variant="brand">{employee?.uid ?? employee?._id?.slice(-8) ?? "—"}</Badge>
                  <Badge variant="green">{employee?.status === "active" ? "Active" : employee?.status ?? "Active"}</Badge>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #ede5e0" }}>
                  <div style={{ fontSize: 10, color: "#b0948a" }}>{employee?.department ?? "—"}</div>
                  <div style={{ fontSize: 10, color: "#b0948a", marginTop: 2 }}>{employee?.work_email ?? "—"}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Date of joining */}
        <DOJCard joiningDate={employee?.date_of_joining ?? employee?.createdAt} />

        {/* Card 3: Attendance */}
        <div style={s.card}>
          <CardAccent color="#1D9E75" />
          <div style={s.cardBody}>
            <div style={s.cardLabel}>Attendance rate</div>
            <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, marginBottom: 4 }}>88%</div>
            <div style={{ fontSize: 11, color: "#b0948a" }}>
              This month <Badge variant="green">↑ 2.5%</Badge>
            </div>
            <SegBar segments={[
              { pct: 88, color: "#1D9E75", label: "Present (88%)" },
              { pct: 8,  color: "#E24B4A", label: "Absent (8%)" },
              { pct: 4,  color: "#BA7517", label: "Half day (4%)" },
            ]} />
          </div>
        </div>

        {/* Card 4: Income */}
        <IncomeCard salary={salary} />
      </div>

      {/* ROW 2: Chart + Calendar */}
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Financial activity</span>
            <div style={{ display: "flex", gap: 14 }}>
              {[["#730042","Income"],["#c9a8b8","Expense"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#b0948a" }}>
                  <div style={{ width: 20, height: 2, background: c, borderRadius: 2 }} />{l}
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "10px 10px 12px", height: 190 }}>
            <AreaChart />
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Attendance</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              style={{ fontFamily: "inherit", fontSize: 11, color: "#b0948a", background: "#f9f8f2", border: "0.5px solid #ede5e0", borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div style={{ padding: "12px 14px 0" }}>
            <Calendar month={selectedMonth} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "0.5px solid #f0e8e4", marginTop: 12 }}>
            {[["22","#730042","Present"],["2","#E24B4A","Absent"],["1","#BA7517","Half"],["88%","#1D9E75","Rate"]].map(([v,c,l]) => (
              <div key={l} style={{ padding: "10px 0", textAlign: "center", borderRight: "0.5px solid #f0e8e4" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: "#b0948a", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 3: Profile + Announcements + Leave */}
      <div style={s.grid3}>

        {/* Profile */}
        <div style={s.card}>
          <CardAccent color="#730042" />
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Employee profile</span>
            <Badge variant="brand">{employee?.role ?? "employee"}</Badge>
          </div>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, borderBottom: "0.5px solid #ede5e0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#730042", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500, color: "#f9f8f2", flexShrink: 0 }}>
              {meLoading ? "—" : initials}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{meLoading ? <Skeleton w={120} h={18} /> : fullName}</div>
              <div style={{ fontSize: 12, color: "#b0948a" }}>{meLoading ? <Skeleton w={90} h={14} /> : (employee?.designation ?? "—")}</div>
              <div style={{ marginTop: 5, display: "flex", gap: 6 }}>
                <Badge variant="green">Active</Badge>
                <Badge variant="blue">{employee?.uid ?? "—"}</Badge>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 18px" }}>
            {[
              ["Department",     employee?.department],
              ["Work email",     employee?.work_email],
              ["Username",       employee?.username],
              ["Gender",         employee?.gender],
              ["Marital status", employee?.marital_status],
              ["Manager",        employee?.Under_manager ?? "—"],
              ["Verified",       employee?.isverified ? "✓ Verified" : "Not verified"],
              ["Member since",   employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short" }) : "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ fontSize: 11, color: "#b0948a" }}>
                {label}
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#2a1a16", marginTop: 2, wordBreak: "break-all" }}>
                  {meLoading ? <Skeleton h={14} /> : (val ?? "—")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div style={s.card}>
          <CardAccent color="#BA7517" />
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Announcements</span>
            <span style={{ fontSize: 11, color: "#730042", fontWeight: 500 }}>
              {announcements.filter(a => a.unread).length} unread
            </span>
          </div>
          <div style={{ padding: "0 18px" }}>
            {annLoading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "0.5px solid #f0e8e4", display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton h={12} w="65%" />
                  <Skeleton h={10} w="90%" />
                  <Skeleton h={10} w="40%" />
                </div>
              ))
            ) : announcements.length > 0 ? (
              announcements.map(a => <AnnouncementItem key={a._id ?? a.id} ann={a} />)
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12, color: "#b0948a" }}>No announcements</div>
            )}
          </div>
        </div>

        {/* Leave Balance */}
        <div style={s.card}>
          <CardAccent color="#1D9E75" />
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Leave balance</span>
            <span style={{ fontSize: 10, color: "#b0948a" }}>FY 2025–26</span>
          </div>
          <div style={{ padding: "0 18px 4px" }}>
            {leaveLoading ? (
              [1,2,3,4].map(i => <div key={i} style={{ padding: "12px 0", borderBottom: "0.5px solid #ede5e0" }}><Skeleton h={40} /></div>)
            ) : (
              leaveRows.map((row, i) => (
                <LeaveRow key={i} label={row.label} used={row.used} total={row.total} color={row.color} />
              ))
            )}
          </div>
          {/* Employee mini card */}
          <div style={{ margin: "12px 18px 18px", background: "#f9f8f2", borderRadius: 8, border: "0.5px solid #ede5e0", padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#730042", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, color: "#f9f8f2", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{fullName}</div>
              <div style={{ fontSize: 11, color: "#b0948a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee?.designation ?? "—"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <span style={{ fontSize: 10, color: "#b0948a" }}>{employee?.uid ?? "—"}</span>
              <Badge variant="brand">Active</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}