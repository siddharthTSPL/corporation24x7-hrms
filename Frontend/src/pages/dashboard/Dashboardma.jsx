import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetMeManager } from "../../auth/server-state/manager/managerauth/managerauth.hook";

// ─── helpers ────────────────────────────────────────────────────────────────
const initials = (name = "") =>
  name.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).join("").slice(0, 2);

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const yearsMonths = (from) => {
  if (!from) return { yrs: 0, mo: 0, decimal: 0.0 };
  const start = new Date(from);
  const now = new Date();
  let yrs = now.getFullYear() - start.getFullYear();
  let mo = now.getMonth() - start.getMonth();
  if (mo < 0) { yrs--; mo += 12; }
  return { yrs, mo, decimal: parseFloat((yrs + mo / 12).toFixed(1)) };
};

const nextMilestone = (from) => {
  if (!from) return "1 yr — Apr 2027";
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return `1 yr — ${d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
};

// ─── chip ────────────────────────────────────────────────────────────────────
const Chip = ({ label, bg, color }) => (
  <span style={{ fontSize: 11, borderRadius: 20, padding: "3px 10px", fontWeight: 500, background: bg, color, display: "inline-block" }}>
    {label}
  </span>
);

// ─── donut ───────────────────────────────────────────────────────────────────
const Donut = ({ val = 0, max = 5 }) => {
  const r = 26, circ = 2 * Math.PI * r;
  const fill = Math.min((val / max) * circ, circ);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#eee" strokeWidth="5" />
      {val > 0 && (
        <circle cx="36" cy="36" r={r} fill="none" stroke="#7b1450"
          strokeWidth="5" strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 36 36)" />
      )}
      <text x="36" y="38" textAnchor="middle" fontSize="13" fill="#1a1a1a" fontWeight="500">{val.toFixed(1)}</text>
      <text x="36" y="48" textAnchor="middle" fontSize="8" fill="#aaa">yrs</text>
    </svg>
  );
};

// ─── leave bar strip ─────────────────────────────────────────────────────────
const BarStrip = ({ el, sl, pl }) => {
  const total = el + sl + pl || 1;
  return (
    <div style={{ display: "flex", height: 7, borderRadius: 99, overflow: "hidden", margin: "10px 0 8px" }}>
      <div style={{ width: `${(el / total) * 100}%`, background: "#2e7d32" }} />
      <div style={{ width: `${(sl / total) * 100}%`, background: "#185fa5" }} />
      <div style={{ width: `${(pl / total) * 100}%`, background: "#ba7517" }} />
    </div>
  );
};

const LegendDot = ({ color, label }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
    {label}
  </span>
);

// ─── dynamic calendar ────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_S = {
  present: { bg: "#f0eeff", color: "#534ab7" },
  absent:  { bg: "#fce8e8", color: "#a32d2d" },
  halfday: { bg: "#fff8e0", color: "#ba7517" },
  onleave: { bg: "#e3f0fb", color: "#185fa5" },
  today:   { bg: "transparent", color: "#7b1450", border: "1.5px solid #7b1450", fontWeight: 600 },
  weekend: { bg: "#fce8f2", color: "#9b4468" },
  future:  { bg: "transparent", color: "#ccc" },
  default: { bg: "transparent", color: "#555" },
};

function Calendar({ leaveData = [] }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  // Build date → type map from leave records
  const leaveMap = {};
  leaveData.forEach((record) => {
    if (!record.startDate) return;
    const start  = new Date(record.startDate);
    const end    = new Date(record.endDate || record.startDate);
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const st  = (record.status || "").toLowerCase();
      if (st.includes("approved")) leaveMap[key] = "onleave";
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  const todayStr     = now.toISOString().slice(0, 10);
  const nowMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const selMonthStart = new Date(year, month, 1);
  const isFutureMonth = selMonthStart > nowMonthStart;

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow     = (startWeekday + d - 1) % 7;
    const isWknd  = dow === 0 || dow === 6;
    const isToday = dateStr === todayStr;
    const isPast  = new Date(dateStr) < now && !isToday;

    let type = "default";
    if (isToday)              type = "today";
    else if (isFutureMonth || new Date(dateStr) > now) type = isWknd ? "weekend" : "future";
    else if (leaveMap[dateStr]) type = leaveMap[dateStr];
    else if (isWknd)          type = "weekend";

    cells.push({ d, type });
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isFutureMonth) return;
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e4dc", padding: "20px 22px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>Attendance</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "0.5px solid #ddd", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 14, color: "#555", lineHeight: 1.5 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", minWidth: 120, textAlign: "center" }}>
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            style={{ background: "none", border: "0.5px solid #ddd", borderRadius: 6, padding: "2px 10px", cursor: isFutureMonth ? "not-allowed" : "pointer", fontSize: 14, color: isFutureMonth ? "#ccc" : "#555", lineHeight: 1.5 }}
          >›</button>
        </div>
      </div>

      {/* day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {["S","M","T","W","T","F","S"].map((h, i) => (
          <div key={i} style={{ fontSize: 11, color: "#bbb", textAlign: "center", paddingBottom: 6 }}>{h}</div>
        ))}

        {/* day cells */}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const s = DAY_S[c.type] || DAY_S.default;
          return (
            <div key={i} style={{
              fontSize: 12, textAlign: "center", padding: "7px 2px", borderRadius: 8,
              background: s.bg, color: s.color, border: s.border || "none",
              fontWeight: s.fontWeight || 400, cursor: "default",
            }}>
              {c.d}
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
        <LegendDot color="#534ab7" label="Present" />
        <LegendDot color="#e24b4a" label="Absent" />
        <LegendDot color="#ba7517" label="Half day" />
        <LegendDot color="#185fa5" label="On leave" />
      </div>
    </div>
  );
}


const DEMO_ANN = [
  { _id: "1", title: "hi", priority: "high", body: "ehuhe", age: "4 days ago", expires: "15 Apr", audience: "all" },
  { _id: "2", title: "emergency for document", priority: "low", body: "Subject: Emergency Notice – Immediate Attention Required Dear Employees and Managers, This is to inf...", age: "4 days ago", expires: "30 Apr", audience: "managers" },
];

function Announcements({ data = [] }) {
  const items = data.length ? data : DEMO_ANN;
  const urgent = items.filter((a) => a.priority === "high").length;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e4dc", padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>Announcements</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Chip label={`${urgent} urgent`} bg="#fce8e8" color="#a32d2d" />
          <span style={{ fontSize: 12, color: "#aaa" }}>{items.length} total</span>
        </div>
      </div>
      {items.map((ann, idx) => (
        <div key={ann._id} style={{
          display: "flex", gap: 10, padding: "12px 0",
          borderBottom: idx < items.length - 1 ? "0.5px solid #f3f0ea" : "none",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5, background: ann.priority === "high" ? "#e24b4a" : "#333" }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{ann.title}</span>
              <Chip label={ann.priority} bg={ann.priority === "high" ? "#fce8e8" : "#f1efe8"} color={ann.priority === "high" ? "#a32d2d" : "#5f5e5a"} />
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 3, lineHeight: 1.5 }}>{ann.body}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#bbb" }}>{ann.age} · Expires {ann.expires}</span>
              <Chip
                label={ann.audience}
                bg={ann.audience === "managers" ? "#e8f5e9" : "#f0eeff"}
                color={ann.audience === "managers" ? "#2e7d32" : "#534ab7"}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── main dashboard ──────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { data, isLoading } = useGetMeManager();

  const navigate = useNavigate();

  const manager   = data?.manager           || {};
  const balance   = data?.leavebalance?.[0] || {};
  const announces = data?.announcements     || [];
  const leaves    = data?.leaves            || []; // pass leave records for calendar

  const fullName = [manager.f_name, manager.l_name].filter(Boolean).join(" ") || "Ashish gangwar";
  const av       = initials(fullName);
  const exp      = yearsMonths(manager.createdAt || "2026-04-10");

  // Fix: Map API fields correctly
  const el        = balance.EL?.entitled    ?? 15;
  const sl        = balance.SL?.entitled    ?? 12;
  const pl        = balance.PL              ?? 0;
  const ml        = balance.ML              ?? 0;
  const lwp       = balance.lwp             ?? 0;
  const elUsed    = balance.EL?.availed     ?? 0;
  const slUsed    = balance.SL?.availed     ?? 0;
  const plUsed    = 0; // PL doesn't have availed field
  const elAccrued = balance.EL?.accrued     ?? 0;
  const pbc       = balance.pbc             ?? 0;

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f3ef", fontFamily: "'Segoe UI',sans-serif", fontSize: 14, color: "#888" }}>
      Loading dashboard…
    </div>
  );

  return (
    <div style={{ background: "#f5f3ef", minHeight: "100vh", fontFamily: "'Segoe UI',sans-serif" }}>

      {/* topbar */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid #e8e4dc", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.3px" }}>Dashboard</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 1 }}>Welcome back, {manager.f_name || "Ashish"} · {manager.uid || "MGMT03"}</div>
        </div>
  <button
      onClick={() => navigate("/mark-attendance")}
      className=" ml-110  bg-[#730042] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 transition"
    >
      Check In
    </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "#888" }}>📍 {manager.office_location || "Bareilly"}</span>
          <span style={{ fontSize: 18, cursor: "pointer", color: "#888" }}>🔔</span>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#7b1450", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{av}</div>
        </div>
      </div> 

      <div style={{ padding: "20px 28px" }}>

        {/* ── 4 info cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>

          {/* card 1 – manager profile */}
          <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e4dc", padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Manager</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: "#1a1a1a" }}>{fullName}</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{manager.designation || "Engineering Manager"}</div>
            <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
              <Chip label={manager.uid || "MGMT03"} bg="#f0eeff" color="#534ab7" />
              <Chip label="Active" bg="#e8f5e9" color="#2e7d32" />
              <Chip label={manager.department || "MGMT"} bg="#e3f0fb" color="#185fa5" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginTop: 4 }}>
              <span>✉</span>{manager.work_email || "—"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", marginTop: 4 }}>
              <span>📞</span>{manager.personal_contact || "—"}
            </div>
          </div>

          {/* card 2 – date of joining */}
          <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e4dc", padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Date of joining</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Donut val={exp.decimal} max={5} />
              <div>
                <div style={{ fontSize: 11, color: "#aaa" }}>Joined on</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{fmtDate(manager.createdAt || "2026-04-10")}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>Experience here</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{exp.yrs} yrs {exp.mo} mo</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ position: "relative", height: 4, background: "#eee", borderRadius: 99 }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min((exp.decimal / 5) * 100, 100)}%`, background: "#7b1450", borderRadius: 99 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#bbb", marginTop: 4 }}>
                {["0","1yr","2yr","3yr","4yr","5yr"].map((l) => <span key={l}>{l}</span>)}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "#aaa" }}>Next milestone</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#7b1450" }}>{nextMilestone(manager.createdAt || "2026-04-10")}</div>
            </div>
          </div>

          {/* card 3 – leave overview */}
          <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e4dc", padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Leave overview</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 30, fontWeight: 600, color: "#2e7d32" }}>{el - elUsed}</span>
              <span style={{ fontSize: 13, color: "#888" }}>EL remaining</span>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
              Accrued this month: <strong style={{ color: "#1a1a1a" }}>{elAccrued.toFixed(2)} days</strong>
            </div>
            <BarStrip el={el - elUsed} sl={sl - slUsed} pl={pl - plUsed} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <LegendDot color="#2e7d32" label={`EL (${el - elUsed} left)`} />
              <LegendDot color="#185fa5" label={`SL (${sl - slUsed} left)`} />
              <LegendDot color="#ba7517" label={`PL (${pl - plUsed})`} />
            </div>
          </div>

          {/* card 4 – dark maroon */}
          <div style={{ background: "#7b1450", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#d49bb7", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Reporting to admin</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#a03070", color: "#fff", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{av}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>{fullName}</div>
                <div style={{ fontSize: 12, color: "#d49bb7" }}>manager</div>
              </div>
            </div>
            <hr style={{ border: "none", borderTop: "0.5px solid #a03070", margin: "10px 0" }} />
            <div style={{ fontSize: 11, color: "#d49bb7" }}>Manager ID</div>
            <div style={{ fontSize: 13, color: "#fff", marginTop: 2 }}>{manager.uid || "—"}</div>
            <div style={{ fontSize: 11, color: "#d49bb7", marginTop: 8 }}>Work email</div>
            <div style={{ fontSize: 13, color: "#fff", marginTop: 2 }}>{manager.work_email || "—"}</div>
          </div>

        </div>

        {/* ── manager profile + leave balance ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, marginBottom: 16 }}>

          {/* manager profile card */}
          <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e4dc", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>Manager profile</span>
              <Chip label="manager" bg="#f0eeff" color="#534ab7" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#7b1450", color: "#fff", fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{av}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{fullName}</div>
                <div style={{ fontSize: 13, color: "#888" }}>{manager.designation || "Engineering Manager"}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <Chip label="Active" bg="#e8f5e9" color="#2e7d32" />
                  <Chip label={manager.uid || "MGMT03"} bg="#f0eeff" color="#534ab7" />
                  <Chip label={manager.department || "MGMT"} bg="#e3f0fb" color="#185fa5" />
                </div>
              </div>
            </div>
            <div style={{ borderTop: "0.5px solid #f0ece4", paddingTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { label: "Work email",        value: manager.work_email         || "—" },
                { label: "Department",        value: manager.department         || "MGMT" },
                { label: "Office",            value: manager.office_location    || "Bareilly" },
                { label: "Gender",            value: manager.gender             || "—" },
                { label: "Marital status",    value: manager.marital_status     || "—" },
                { label: "Contact",           value: manager.personal_contact   || "—" },
                { label: "Emergency contact", value: manager.e_contact          || "—" },
                { label: "Member since",      value: fmtDate(manager.createdAt  || "2026-04-10") },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#1a1a1a" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* leave balance card */}
          <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e4dc", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>Leave balance</span>
              <span style={{ fontSize: 11, color: "#aaa" }}>FY 2025–26</span>
            </div>
            {[
              { label: "Earned Leave (EL)",   total: el,  used: elUsed, color: "#2e7d32", accent: "#2e7d32" },
              { label: "Sick Leave (SL)",     total: sl,  used: slUsed, color: "#185fa5", accent: "#185fa5" },
              { label: "Privilege Leave (PL)",total: pl,  used: plUsed, color: "#ba7517", accent: "#ba7517" },
              { label: "Maternity Leave (ML)",total: ml,  used: 0,      color: "#888",    accent: "#888"    },
            ].map(({ label, total, used, color, accent }) => {
              const left = total - used;
              const pct  = total > 0 ? ((left / total) * 100).toFixed(0) : 0;
              return (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#1a1a1a" }}>{label}</span>
                    <span style={{ fontSize: 18, fontWeight: 600, color: accent }}>{left}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
                    {label.includes("EL") ? `Accrued: ${elAccrued.toFixed(2)}` : "Accrued: 0"} &nbsp;·&nbsp; of {total} left
                  </div>
                  <div style={{ height: 4, background: "#eee", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>{used} used · {pct}%</div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <Chip label={`LWP ${lwp}`} bg="#f1efe8" color="#5f5e5a" />
              <Chip label={`PBC ${pbc}`} bg="#f1efe8" color="#5f5e5a" />
              <Chip label={`Last accrual ${fmtDate(balance.lastAccrualDate) || "10 Apr"}`} bg="#f1efe8" color="#5f5e5a" />
            </div>
            <div style={{ marginTop: 14, padding: "10px 12px", background: "#f8f6f2", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#7b1450", color: "#fff", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{av}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{fullName}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{manager.designation || "Engineering Manager"}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <Chip label={manager.uid || "MGMT03"} bg="#f0eeff" color="#534ab7" />
                <Chip label="Active" bg="#e8f5e9" color="#2e7d32" />
              </div>
            </div>
          </div>

        </div>

        {/* ── bottom: calendar + announcements ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
          <Calendar leaveData={leaves} />
          <Announcements data={announces} />
        </div>

      </div>
    </div>
  );
}