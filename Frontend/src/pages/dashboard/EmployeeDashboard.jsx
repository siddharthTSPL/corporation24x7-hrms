import React, { useState } from "react";
import { useGetAnnouncements } from "../../auth/server-state/employee/employeeannounce/employeeannounce.hook";
import { useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["S","M","T","W","T","F","S"];
const SEED = [0.12,0.73,0.91,0.44,0.67,0.35,0.88,0.22,0.56,0.79,0.14,0.95,0.41,0.63,0.28,0.82,0.51,0.17,0.74,0.39,0.66,0.8,0.25,0.48,0.93,0.31,0.59,0.72,0.11,0.86,0.43];

// ─── HELPERS ──────────────────────────────────────────────────────────────

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
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return `${Math.floor(diff / 86400000)} days ago`;
}

function priorityVariant(priority) {
  if (priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "green";
}

// Strip markdown bold/bullets from announcement messages
function stripMarkdown(text = "") {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^[\*\-]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 100) + (text.length > 100 ? "…" : "");
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

function LeaveRow({ label, availed, entitled, accrued, color }) {
  // availed = days used, entitled = total allowed
  const used = availed ?? 0;
  const total = entitled ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = total - used;

  return (
    <div style={{ padding: "12px 0", borderBottom: "0.5px solid #ede5e0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#2a1a16" }}>{label}</div>
          {accrued != null && (
            <div style={{ fontSize: 10, color: "#b0948a", marginTop: 1 }}>Accrued: {accrued}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1 }}>{remaining}</div>
          <div style={{ fontSize: 10, color: "#b0948a", marginTop: 2 }}>of {total} left</div>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: "#f0e8e4", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ fontSize: 9, color: "#b0948a", marginTop: 3 }}>{used} used · {pct}%</div>
    </div>
  );
}

function AnnouncementItem({ ann }) {
  const isHigh = ann.priority === "high";
  const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
  return (
    <div style={{
      display: "flex", gap: 10, padding: "12px 0",
      borderBottom: "0.5px solid #f0e8e4",
      alignItems: "flex-start",
      opacity: isExpired ? 0.45 : 1,
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 5,
        background: isHigh ? "#E24B4A" : ann.priority === "medium" ? "#BA7517" : "#730042",
        boxShadow: isHigh ? "0 0 0 3px rgba(226,75,74,0.15)" : "none",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#2a1a16" }}>{ann.title}</div>
          <Badge variant={priorityVariant(ann.priority)}>{ann.priority}</Badge>
        </div>
        <div style={{ fontSize: 11, color: "#b0948a", lineHeight: 1.55, marginBottom: 4 }}>
          {stripMarkdown(ann.message)}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#c9bab5" }}>{timeAgo(ann.createdAt)}</span>
          {ann.expiresAt && (
            <span style={{ fontSize: 10, color: isExpired ? "#E24B4A" : "#b0948a" }}>
              {isExpired ? "Expired" : `Expires ${new Date(ann.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
            </span>
          )}
          {ann.audience && (
            <Badge variant={ann.audience === "all" ? "blue" : "brand"}>
              {ann.audience}
            </Badge>
          )}
        </div>
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
    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #ede5e0", overflow: "hidden", position: "relative" }}>
      <CardAccent color="#378ADD" />
      <div style={{ padding: "16px 18px 14px" }}>
        <div style={{ fontSize: 11, color: "#b0948a", fontWeight: 500, letterSpacing: ".3px", marginBottom: 10 }}>Date of joining</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={R} fill="none" stroke="#ede5e0" strokeWidth="6" />
              <circle cx="44" cy="44" r={R} fill="none" stroke="#378ADD" strokeWidth="6"
                strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#730042", lineHeight: 1 }}>{yearsFloat}</span>
              <span style={{ fontSize: 9, color: "#b0948a", marginTop: 1 }}>yrs</span>
            </div>
          </div>
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

function InfoField({ label, value, loading }) {
  return (
    <div style={{ fontSize: 11, color: "#b0948a" }}>
      {label}
      <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#2a1a16", marginTop: 2, wordBreak: "break-all" }}>
        {loading ? <Skeleton h={14} /> : (value || "—")}
      </span>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // ── API hooks ──
  const { data: meData, isLoading: meLoading, isError: meError } = useGetMeUser();
  const { data: annData, isLoading: annLoading } = useGetAnnouncements();

  // ── Real data mapping from your backend ──
  // getme returns: { success, employee, leavebalance: [{ EL:{entitled,availed,accrued}, SL:{entitled,availed}, ML, PL, pbc, lwp }] }
  const employee     = meData?.employee ?? null;
  const lb           = meData?.leavebalance?.[0] ?? null;  // first (only) balance doc

  // announcements returns: { success, announcements: [{ _id, title, message, priority, audience, createdAt, expiresAt }] }
  const announcements = annData?.announcements ?? [];

  const initials = employee ? getInitials(employee.f_name, employee.l_name) : "—";
  const fullName  = employee ? `${employee.f_name} ${employee.l_name}` : "—";

  // Manager name from populated Under_manager field
  const managerName = employee?.Under_manager
    ? `${employee.Under_manager.f_name} ${employee.Under_manager.l_name}`
    : "—";

  // Leave rows — directly from leavebalance[0]
  // Your schema: EL: { entitled, availed, accrued }, SL: { entitled, availed }, ML (number), PL (number), pbc, lwp
  const leaveRows = [
    {
      label: "Earned Leave (EL)",
      availed:  lb?.EL?.availed,
      entitled: lb?.EL?.entitled,
      accrued:  lb?.EL?.accrued,
      color: "#730042",
    },
    {
      label: "Sick Leave (SL)",
      availed:  lb?.SL?.availed,
      entitled: lb?.SL?.entitled,
      accrued:  null,
      color: "#1D9E75",
    },
    {
      label: "Privilege Leave (PL)",
      availed:  lb?.pbc ?? 0,           // pbc = privilege balance consumed
      entitled: lb?.PL,
      accrued:  null,
      color: "#378ADD",
    },
    {
      label: "LWP / Maternity",
      availed:  lb?.lwp ?? 0,
      entitled: (lb?.ML ?? 0) + 5,      // ML + buffer
      accrued:  null,
      color: "#BA7517",
    },
  ];

  const s = {
    page:      { fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f9f8f2", minHeight: "100vh", padding: "24px 28px", color: "#2a1a16" },
    card:      { background: "#fff", borderRadius: 12, border: "0.5px solid #ede5e0", overflow: "hidden", position: "relative" },
    cardBody:  { padding: "16px 18px 14px" },
    cardLabel: { fontSize: 11, color: "#b0948a", fontWeight: 500, letterSpacing: ".3px", marginBottom: 8 },
    grid4:     { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 14 },
    grid2:     { display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 14, marginBottom: 14 },
    grid3:     { display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,320px)", gap: 14 },
    cardHeader:{ padding: "14px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #ede5e0" },
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
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.3px" }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "#b0948a", marginTop: 2 }}>
            {employee ? `Welcome back, ${employee.f_name} · ${employee.uid}` : "Welcome back"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Office location pill */}
          {employee?.office_location && (
            <div style={{ fontSize: 11, color: "#b0948a", background: "#fff", border: "0.5px solid #ede5e0", borderRadius: 20, padding: "4px 12px" }}>
              📍 {employee.office_location}
            </div>
          )}
          <div style={{ width: 36, height: 36, borderRadius: 8, border: "0.5px solid #ede5e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5a4 4 0 0 0-4 4V7L2 8.5V9.5h11V8.5L11.5 7V5.5a4 4 0 0 0-4-4zM7.5 13.5a1.5 1.5 0 0 1-1.5-1.5h3a1.5 1.5 0 0 1-1.5 1.5z" fill="#730042" />
            </svg>
          </div>
          {/* Avatar with real initials */}
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#730042", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#f9f8f2" }}>
            {meLoading ? "—" : initials}
          </div>
        </div>
      </div>

      {/* ROW 1: 4 stat cards */}
      <div style={s.grid4}>

        {/* Card 1: Employee identity */}
        <div style={s.card}>
          <CardAccent color="#730042" />
          <div style={s.cardBody}>
            <div style={s.cardLabel}>Employee</div>
            {meLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton h={22} w="70%" /><Skeleton h={14} w="55%" /><Skeleton h={20} w="40%" />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.25, marginBottom: 3 }}>{fullName}</div>
                <div style={{ fontSize: 11, color: "#b0948a", textTransform: "capitalize", marginBottom: 10 }}>
                  {employee?.designation ?? "—"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Badge variant="brand">{employee?.uid ?? "—"}</Badge>
                  <Badge variant="green">Active</Badge>
                  <Badge variant="blue">{employee?.department ?? "—"}</Badge>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #ede5e0", display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 10, color: "#b0948a" }}>📧 {employee?.work_email ?? "—"}</div>
                  <div style={{ fontSize: 10, color: "#b0948a" }}>📞 {employee?.personal_contact ?? "—"}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: DOJ — uses createdAt since your model may not have date_of_joining */}
        <DOJCard joiningDate={employee?.date_of_joining ?? employee?.createdAt} />

        {/* Card 3: Leave Summary (quick glance from real data) */}
        <div style={s.card}>
          <CardAccent color="#1D9E75" />
          <div style={s.cardBody}>
            <div style={s.cardLabel}>Leave overview</div>
            {meLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton h={30} w="50%" /><Skeleton h={14} w="80%" /><Skeleton h={14} w="60%" />
              </div>
            ) : (
              <>
                {/* EL accrued highlight */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 600, color: "#1D9E75", lineHeight: 1 }}>
                    {(lb?.EL?.entitled ?? 0) - (lb?.EL?.availed ?? 0)}
                  </span>
                  <span style={{ fontSize: 12, color: "#b0948a" }}>EL remaining</span>
                </div>
                <div style={{ fontSize: 11, color: "#b0948a", marginBottom: 10 }}>
                  Accrued this month: <strong style={{ color: "#2a1a16" }}>{lb?.EL?.accrued ?? 0}</strong> days
                </div>
                <SegBar segments={[
                  { pct: (lb?.EL?.entitled ?? 15) - (lb?.EL?.availed ?? 0), color: "#1D9E75", label: `EL (${(lb?.EL?.entitled ?? 15) - (lb?.EL?.availed ?? 0)} left)` },
                  { pct: (lb?.SL?.entitled ?? 12) - (lb?.SL?.availed ?? 0), color: "#378ADD", label: `SL (${(lb?.SL?.entitled ?? 12) - (lb?.SL?.availed ?? 0)} left)` },
                  { pct: lb?.PL ?? 7,                                        color: "#BA7517", label: `PL (${lb?.PL ?? 7})` },
                ]} />
              </>
            )}
          </div>
        </div>

        {/* Card 4: Manager card — from Under_manager populate */}
        <div style={{ background: "#730042", borderRadius: 12, border: "0.5px solid #5a0033", padding: "16px 18px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -10, left: -10, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ fontSize: 11, color: "rgba(249,248,242,0.6)", fontWeight: 500, letterSpacing: ".3px", marginBottom: 10 }}>Reporting manager</div>
          {meLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton h={18} w="60%" radius={4} /><Skeleton h={14} w="80%" radius={4} />
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(249,248,242,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#f9f8f2", flexShrink: 0 }}>
                  {employee?.Under_manager
                    ? getInitials(employee.Under_manager.f_name, employee.Under_manager.l_name)
                    : "—"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f9f8f2" }}>{managerName}</div>
                  <div style={{ fontSize: 11, color: "rgba(249,248,242,0.6)", marginTop: 2 }}>
                    {employee?.Under_manager?.role ?? "Manager"}
                  </div>
                </div>
              </div>
              <div style={{ height: "0.5px", background: "rgba(249,248,242,0.15)", marginBottom: 10 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "rgba(249,248,242,0.5)" }}>Manager ID</span>
                <span style={{ fontWeight: 500, color: "rgba(249,248,242,0.7)" }}>{employee?.Under_manager?.uid ?? "—"}</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(249,248,242,0.4)", marginBottom: 2 }}>Work email</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(249,248,242,0.6)", wordBreak: "break-all" }}>
                  {employee?.Under_manager?.work_email ?? "—"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ROW 2: Calendar + Announcements */}
      <div style={s.grid2}>

        {/* Calendar */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Attendance</span>
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
                <div style={{ fontSize: 15, fontWeight: 600, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: "#b0948a", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px 14px", borderTop: "0.5px solid #f0e8e4" }}>
            {[["#730042","Present"],["#E24B4A","Absent"],["#f57f17","Half day"],["#283593","On leave"]].map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#b0948a" }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
          </div>
        </div>

        {/* Announcements — real data */}
        <div style={s.card}>
          <CardAccent color="#BA7517" />
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Announcements</span>
            <div style={{ display: "flex", align: "center", gap: 6 }}>
              {announcements.filter(a => a.priority === "high").length > 0 && (
                <Badge variant="red">{announcements.filter(a => a.priority === "high").length} urgent</Badge>
              )}
              <span style={{ fontSize: 11, color: "#b0948a" }}>{announcements.length} total</span>
            </div>
          </div>
          <div style={{ padding: "0 18px", overflowY: "auto", maxHeight: 360 }}>
            {annLoading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "0.5px solid #f0e8e4", display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton h={12} w="65%" /><Skeleton h={10} w="90%" /><Skeleton h={10} w="40%" />
                </div>
              ))
            ) : announcements.length > 0 ? (
              // Sort: high priority first
              [...announcements]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
                })
                .map(a => <AnnouncementItem key={a._id} ann={a} />)
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12, color: "#b0948a" }}>No announcements</div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: Profile + Leave Balance */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 14 }}>

        {/* Employee Profile — real fields */}
        <div style={s.card}>
          <CardAccent color="#730042" />
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Employee profile</span>
            <Badge variant="brand">{employee?.role ?? "employee"}</Badge>
          </div>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, borderBottom: "0.5px solid #ede5e0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#730042", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#f9f8f2", flexShrink: 0 }}>
              {meLoading ? "—" : initials}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{meLoading ? <Skeleton w={120} h={18} /> : fullName}</div>
              <div style={{ fontSize: 12, color: "#b0948a", textTransform: "capitalize" }}>
                {meLoading ? <Skeleton w={90} h={14} /> : (employee?.designation ?? "—")}
              </div>
              <div style={{ marginTop: 5, display: "flex", gap: 6 }}>
                <Badge variant="green">Active</Badge>
                <Badge variant="blue">{employee?.uid ?? "—"}</Badge>
                <Badge variant="brand">{employee?.department ?? "—"}</Badge>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: "14px 18px" }}>
            <InfoField label="Work email"     value={employee?.work_email}        loading={meLoading} />
            <InfoField label="Department"     value={employee?.department}         loading={meLoading} />
            <InfoField label="Office"         value={employee?.office_location}    loading={meLoading} />
            <InfoField label="Gender"         value={employee?.gender}             loading={meLoading} />
            <InfoField label="Marital status" value={employee?.marital_status}     loading={meLoading} />
            <InfoField label="Contact"        value={employee?.personal_contact}   loading={meLoading} />
            <InfoField label="Emergency contact" value={employee?.e_contact}      loading={meLoading} />
            <InfoField label="Manager"        value={managerName}                  loading={meLoading} />
            <InfoField label="Member since"   value={employee?.createdAt
              ? new Date(employee.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
              : null} loading={meLoading} />
          </div>
        </div>

        {/* Leave Balance — real leavebalance[0] data */}
        <div style={s.card}>
          <CardAccent color="#1D9E75" />
          <div style={s.cardHeader}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Leave balance</span>
            <span style={{ fontSize: 10, color: "#b0948a" }}>FY 2025–26</span>
          </div>
          <div style={{ padding: "0 18px 4px" }}>
            {meLoading ? (
              [1,2,3,4].map(i => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "0.5px solid #ede5e0" }}>
                  <Skeleton h={40} />
                </div>
              ))
            ) : (
              leaveRows.map((row, i) => (
                <LeaveRow key={i}
                  label={row.label}
                  availed={row.availed}
                  entitled={row.entitled}
                  accrued={row.accrued}
                  color={row.color}
                />
              ))
            )}
          </div>
          {/* LWP / PBC summary chips */}
          {!meLoading && lb && (
            <div style={{ margin: "0 18px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ background: "#f9f8f2", border: "0.5px solid #ede5e0", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                <span style={{ color: "#b0948a" }}>LWP used </span>
                <strong style={{ color: "#2a1a16" }}>{lb.lwp ?? 0}</strong>
              </div>
              <div style={{ background: "#f9f8f2", border: "0.5px solid #ede5e0", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                <span style={{ color: "#b0948a" }}>PBC </span>
                <strong style={{ color: "#2a1a16" }}>{lb.pbc ?? 0}</strong>
              </div>
              <div style={{ background: "#f9f8f2", border: "0.5px solid #ede5e0", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                <span style={{ color: "#b0948a" }}>Last accrual </span>
                <strong style={{ color: "#2a1a16" }}>
                  {lb.lastAccrualDate
                    ? new Date(lb.lastAccrualDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "—"}
                </strong>
              </div>
            </div>
          )}
          {/* Employee mini card */}
          <div style={{ margin: "0 18px 18px", background: "#f9f8f2", borderRadius: 8, border: "0.5px solid #ede5e0", padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#730042", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#f9f8f2", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{fullName}</div>
              <div style={{ fontSize: 11, color: "#b0948a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                {employee?.designation ?? "—"}
              </div>
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