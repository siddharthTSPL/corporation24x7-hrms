import { useState, useEffect, useMemo, useRef } from "react";
import {
  useGetMeSuperAdmin,
} from "../../auth/server-state/superadmin/auth/suauth.hook";
import {
  useGetAllEmployees,
  useGetAllManagers,
  useGetAllAdmins,
  useGetOrgInfo,
  useGetParticularEmployee,
  useGetParticularManager,
} from "../../auth/server-state/superadmin/other/suother.hook";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .su-org *, .su-org { font-family: 'Inter', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn   { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
  @keyframes shimmer   { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes drawH     { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes drawV     { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes slideR    { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
  @keyframes breathe   { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes ringPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.25), 0 4px 20px rgba(115,0,66,0.1); }
    50%      { box-shadow: 0 0 0 7px rgba(115,0,66,0.06), 0 8px 28px rgba(115,0,66,0.18); }
  }

  .su-card-hover {
    transition: transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease, border-color 0.14s ease;
    cursor: pointer;
  }
  .su-card-hover:hover { transform: translateY(-4px) scale(1.015); }
  .su-card-highlight { outline: 2px solid #730042 !important; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(115,0,66,0.1) !important; }
  .su-card-dim { opacity: 0.15; filter: grayscale(0.5) blur(0.3px); transition: opacity 0.22s, filter 0.22s; }
  .su-card-sa  { animation: ringPulse 3s ease-in-out infinite !important; }

  .su-scroll::-webkit-scrollbar { height:5px; width:5px; }
  .su-scroll::-webkit-scrollbar-track { background:transparent; }
  .su-scroll::-webkit-scrollbar-thumb { background:#dde3ec; border-radius:6px; }

  .su-hdr-btn {
    display:flex; align-items:center; gap:6px;
    padding:7px 14px; border-radius:8px;
    border:1px solid #e4e9f2; background:#fff; color:#4b5563;
    font-size:12.5px; font-weight:500; cursor:pointer;
    font-family:'Inter',sans-serif; letter-spacing:0.01em;
    transition:background 0.12s, border-color 0.12s, color 0.12s, box-shadow 0.12s;
    white-space:nowrap;
  }
  .su-hdr-btn:hover { background:#f7f9fc; border-color:#c5cede; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,0.06); }

  .su-search-wrap {
    display:flex; align-items:center; gap:8px;
    border:1.5px solid #730042; border-radius:9px;
    padding:0 11px; background:#fff; height:36px; width:280px;
    box-shadow:0 0 0 4px rgba(115,0,66,0.08);
    transition: box-shadow 0.15s;
  }
  .su-search-wrap:focus-within { box-shadow:0 0 0 5px rgba(115,0,66,0.14); }
  .su-search-input { border:none; outline:none; background:transparent; font-size:13px; color:#111827; font-family:'Inter',sans-serif; flex:1; min-width:0; }
  .su-search-input::placeholder { color:#9ca3af; }

  .panel-overlay { position:fixed; inset:0; z-index:40; background:rgba(15,23,42,0.4); backdrop-filter:blur(2px); animation:fadeIn 0.2s ease forwards; }
  .panel-drawer  { position:fixed; top:0; right:0; bottom:0; width:430px; z-index:50; background:#fff; box-shadow:-6px 0 40px rgba(0,0,0,0.12); animation:slideR 0.25s cubic-bezier(0.22,1,0.36,1) forwards; overflow-y:auto; display:flex; flex-direction:column; }

  .info-row { display:flex; justify-content:space-between; align-items:flex-start; padding:10px 0; border-bottom:1px solid #f3f4f6; font-size:13px; gap:16px; }
  .info-row:last-child { border-bottom: none; }

  .detail-tab { padding:7px 15px; border-radius:8px; border:1px solid #e4e9f2; font-size:12px; cursor:pointer; background:#fff; color:#6b7280; font-family:'Inter',sans-serif; font-weight:500; transition:all 0.14s; }
  .detail-tab:hover { background:#f7f9fc; border-color:#c5cede; }
  .detail-tab.active { background:#730042; color:#fff; border-color:#730042; box-shadow:0 2px 8px rgba(115,0,66,0.25); }

  .stat-card {
    background: #fff;
    border: 1px solid #e8edf5;
    border-radius: 14px;
    padding: 18px 22px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
  .stat-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background: var(--accent); border-radius:14px 14px 0 0;
  }
`;

const BRAND       = "#730042";
const BRAND_LIGHT = "rgba(115,0,66,0.07)";
const BRAND_MID   = "rgba(115,0,66,0.14)";
const REFRESH_MS  = 1000 * 60 * 2;

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getInitials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const normalize   = (s = "") => s.toLowerCase().trim();

function Skeleton({ w, h, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: "linear-gradient(90deg,#f0f4f8 25%,#e4ecf4 50%,#f0f4f8 75%)",
      backgroundSize: "600px 100%",
      animation: "shimmer 1.5s infinite linear",
    }} />
  );
}

function VLine({ h = 32, delay = 0 }) {
  return (
    <div style={{
      width: 1.5, height: h, margin: "0 auto", flexShrink: 0,
      background: "linear-gradient(to bottom, #dde3ec, #c8d2e0)",
      transformOrigin: "top",
      animation: `drawV 0.25s ease ${delay}ms forwards`, transform: "scaleY(0)",
    }} />
  );
}

function HLine({ w, delay = 0 }) {
  return (
    <div style={{
      width: w, height: 1.5, flexShrink: 0,
      background: "linear-gradient(to right, #dde3ec, #dde3ec)",
      transformOrigin: "center",
      animation: `drawH 0.3s ease ${delay}ms forwards`, transform: "scaleX(0)",
    }} />
  );
}

function Avatar({ initials, size = 48, bg = BRAND, fontSize = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 700, flexShrink: 0,
      letterSpacing: "0.02em",
      boxShadow: `0 2px 8px ${bg}40`,
    }}>
      {initials}
    </div>
  );
}

function Badge({ children, color = BRAND, bg = BRAND_LIGHT }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, color, background: bg,
      letterSpacing: "0.02em",
    }}>
      {children}
    </span>
  );
}

function LiveDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "breathe 2s ease-in-out infinite" }} />
      Live
    </span>
  );
}

function SuperAdminNode({ name, role, initials, delay = 0, onClick }) {
  return (
    <div style={{ animation: `scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className="su-card-hover su-card-sa"
        onClick={onClick}
        style={{
          width: 210, background: "#fff",
          border: `1.5px solid #e8edf5`, borderRadius: 16,
          padding: "22px 18px 18px",
          boxShadow: "0 2px 12px rgba(115,0,66,0.08), 0 1px 3px rgba(0,0,0,0.04)",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3.5, background: `linear-gradient(90deg, ${BRAND}, #a8005a)`, borderRadius: "16px 16px 0 0" }} />
        <span style={{ position: "absolute", top: 11, right: 13, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>SA</span>
        <Avatar initials={initials} size={56} bg={BRAND} fontSize={19} />
        <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "13px 0 0", textAlign: "center", letterSpacing: "-0.2px" }}>{name}</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", textAlign: "center" }}>{role}</p>
        <div style={{ marginTop: 11, display: "flex", gap: 5 }}>
          <Badge>Super Admin</Badge>
        </div>
      </div>
    </div>
  );
}

function AdminNode({ admin, delay = 0, dimmed, highlighted, onClick }) {
  const name = `${admin.f_name} ${admin.l_name}`.trim();
  return (
    <div style={{ animation: `scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["su-card-hover", highlighted ? "su-card-highlight" : "", dimmed ? "su-card-dim" : ""].filter(Boolean).join(" ")}
        onClick={onClick}
        style={{
          width: 174, background: "#fff",
          border: "1.5px solid #e8edf5", borderRadius: 13,
          padding: "16px 13px 14px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(99,102,241,0.06)",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#6366f1,#818cf8)", borderRadius: "13px 13px 0 0" }} />
        <span style={{ position: "absolute", top: 10, right: 11, fontSize: 9, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em" }}>ADM</span>
        <Avatar initials={getInitials(admin.f_name, admin.l_name)} size={44} bg="#6366f1" fontSize={14} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: "10px 0 0", textAlign: "center", maxWidth: 148, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "3px 0 0", textAlign: "center", maxWidth: 148, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.designation || "Admin"}</p>
        <div style={{ marginTop: 9 }}>
          <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 6, background: "#eef2ff", color: "#4338ca", fontWeight: 600 }}>Admin</span>
        </div>
      </div>
    </div>
  );
}

function ManagerNode({ manager, delay = 0, dimmed, highlighted, onClick }) {
  const name = `${manager.f_name} ${manager.l_name}`.trim();
  return (
    <div style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["su-card-hover", highlighted ? "su-card-highlight" : "", dimmed ? "su-card-dim" : ""].filter(Boolean).join(" ")}
        onClick={onClick}
        style={{
          width: 152, background: "#f9fbfe",
          border: "1.5px solid #e4edf6", borderRadius: 11,
          padding: "13px 11px",
          boxShadow: "0 1px 4px rgba(14,165,233,0.07)",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: "linear-gradient(90deg,#0ea5e9,#38bdf8)", borderRadius: "11px 11px 0 0" }} />
        <Avatar initials={getInitials(manager.f_name, manager.l_name)} size={38} bg="#0ea5e9" fontSize={13} />
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", margin: "8px 0 0", textAlign: "center", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 10.5, color: "#94a3b8", margin: "2px 0 0", textAlign: "center", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{manager.department || manager.designation || "Manager"}</p>
        <div style={{ marginTop: 7 }}>
          <span style={{ fontSize: 9.5, padding: "2px 8px", borderRadius: 6, background: "#e0f7ff", color: "#0369a1", fontWeight: 600 }}>Manager</span>
        </div>
      </div>
    </div>
  );
}

function EmployeeNode({ employee, delay = 0, dimmed, highlighted, onClick }) {
  const name = `${employee.f_name} ${employee.l_name}`.trim();
  return (
    <div style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["su-card-hover", highlighted ? "su-card-highlight" : "", dimmed ? "su-card-dim" : ""].filter(Boolean).join(" ")}
        onClick={onClick}
        style={{
          width: 132, background: "#fafbfc",
          border: "1.5px solid #e8edf5", borderRadius: 10,
          padding: "11px 9px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative",
        }}
      >
        <Avatar initials={getInitials(employee.f_name, employee.l_name)} size={32} bg="#e2e8f0" fontSize={10} />
        <p style={{ fontSize: 11, fontWeight: 600, color: "#1e293b", margin: "7px 0 0", textAlign: "center", maxWidth: 114, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 10, color: "#94a3b8", margin: "2px 0 0", textAlign: "center", maxWidth: 114, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee.department || employee.designation || "Employee"}</p>
      </div>
    </div>
  );
}

function SkeletonTree() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <Skeleton w={210} h={130} r={16} />
      <div style={{ width: 1.5, height: 28, background: "#dde3ec" }} />
      <div style={{ display: "flex", gap: 20 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 1.5, height: 20, background: "#dde3ec" }} />
            <Skeleton w={174} h={104} r={13} />
            <div style={{ width: 1.5, height: 20, background: "#dde3ec" }} />
            <div style={{ display: "flex", gap: 14 }}>
              {[1, 2].map(j => (
                <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1.5, height: 16, background: "#dde3ec" }} />
                  <Skeleton w={132} h={82} r={10} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeDetailPanel({ person, type, onClose }) {
  const [tab, setTab] = useState("info");
  const isEmployee = type === "employee";
  const isManager  = type === "manager";
  const isAdmin    = type === "admin";
  const isSA       = type === "superadmin";

  const name = `${person.f_name || ""} ${person.l_name || ""}`.trim();

  const accentColor = isSA ? BRAND : isAdmin ? "#6366f1" : isManager ? "#0ea5e9" : "#64748b";
  const roleLabel   = isSA ? "Super Admin" : isAdmin ? "Admin" : isManager ? "Manager" : "Employee";

  const fields = useMemo(() => {
    if (isSA) return [
      ["Email",        person.email],
      ["Phone",        person.phone || "—"],
      ["Organisation", person.organisation_name],
      ["Domain",       person.company_domain || "—"],
      ["Address",      person.company_address || "—"],
      ["Industry",     person.industry || "—"],
      ["Plan",         person.plan || "—"],
      ["Plan expires", fmtDate(person.plan_expires_at)],
      ["Status",       person.status],
      ["Last login",   fmtDate(person.last_login)],
      ["Member since", fmtDate(person.createdAt)],
    ];
    if (isAdmin) return [
      ["Email",       person.work_email],
      ["Phone",       person.phone || "—"],
      ["Gender",      person.gender || "—"],
      ["Designation", person.designation || "—"],
      ["Status",      person.status || "—"],
    ];
    if (isManager) return [
      ["Email",       person.work_email],
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Department",  person.department || "—"],
      ["Designation", person.designation || "—"],
      ["Location",    person.office_location || "—"],
    ];
    return [
      ["Email",       person.work_email],
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Department",  person.department || "—"],
      ["Designation", person.designation || "—"],
      ["Location",    person.office_location || "—"],
    ];
  }, [person, isSA, isAdmin, isManager]);

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="panel-drawer">
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
          backdropFilter: "blur(8px)",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Profile details</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{roleLabel} · {name}</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid #e4e9f2",
            borderRadius: 8, cursor: "pointer", padding: "5px 10px",
            color: "#6b7280", fontSize: 18, lineHeight: 1,
            transition: "background 0.12s, border-color 0.12s",
          }}>×</button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{
            background: `linear-gradient(135deg, ${accentColor}0d, ${accentColor}05)`,
            borderRadius: 14,
            padding: "24px",
            marginBottom: 20,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            border: `1px solid ${accentColor}20`,
          }}>
            <div style={{
              width: 66, height: 66, borderRadius: "50%",
              background: accentColor, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 23, fontWeight: 700,
              boxShadow: `0 4px 16px ${accentColor}35`,
            }}>
              {getInitials(person.f_name, person.l_name)}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.2px" }}>{name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{person.work_email || person.email}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              <Badge color={accentColor} bg={`${accentColor}15`}>{roleLabel}</Badge>
              {(person.department || person.designation) && (
                <Badge color="#374151" bg="#f3f4f6">{person.department || person.designation}</Badge>
              )}
            </div>
          </div>

          {!isSA && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["info", "leave", "reviews"].map((t) => (
                <button key={t} className={`detail-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                  {t === "info" ? "Information" : t === "leave" ? "Leave" : "Reviews"}
                </button>
              ))}
            </div>
          )}

          {(tab === "info" || isSA) && (
            <div style={{ background: "#fafbfc", borderRadius: 12, padding: "4px 16px", border: "1px solid #f0f2f5" }}>
              {fields.map(([label, val]) => (
                <div key={label} className="info-row">
                  <span style={{ color: "#6b7280", flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "#111827", fontWeight: 500, maxWidth: 220, textAlign: "right", wordBreak: "break-all" }}>{val || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "leave"   && !isSA && <LeaveTab uid={person._id} />}
          {tab === "reviews" && !isSA && <ReviewsTab uid={person._id} role={type} />}
        </div>
      </div>
    </>
  );
}

function LeaveTab({ uid }) {
  const { data: empData, isLoading } = useGetParticularEmployee(uid);
  const lb = empData?.leaveBalance;

  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 36 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${BRAND}30`, borderTop: `2px solid ${BRAND}`, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!lb) return (
    <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", paddingTop: 36 }}>No leave data found.</div>
  );

  const leaveTypes = [
    ["Casual Leave",    lb.casualLeave,    lb.casualLeaveUsed,    "#10b981"],
    ["Sick Leave",      lb.sickLeave,      lb.sickLeaveUsed,      "#0ea5e9"],
    ["Earned Leave",    lb.earnedLeave,    lb.earnedLeaveUsed,    "#6366f1"],
    ["Maternity Leave", lb.maternityLeave, lb.maternityLeaveUsed, "#ec4899"],
  ].filter(([, total]) => total !== undefined && total !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {leaveTypes.map(([label, total, used, color]) => {
        const remaining = (total || 0) - (used || 0);
        const pct = total ? Math.round(((used || 0) / total) * 100) : 0;
        return (
          <div key={label} style={{ background: "#fafbfc", borderRadius: 11, padding: "14px 16px", border: "1px solid #f0f2f5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</span>
              <span style={{ fontSize: 11.5, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>{used || 0} / {total || 0}</span>
            </div>
            <div style={{ height: 5, borderRadius: 4, background: "#e8edf5", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>{remaining} days remaining</div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewsTab({ uid, role }) {
  const fetchFn = role === "manager" ? useGetParticularManager : useGetParticularEmployee;
  const { data, isLoading } = fetchFn(uid);
  const reviews = data?.reviews || [];

  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 36 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${BRAND}30`, borderTop: `2px solid ${BRAND}`, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!reviews.length) return (
    <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", paddingTop: 36 }}>No reviews yet.</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {reviews.map((r) => (
        <div key={r._id} style={{ background: "#fafbfc", borderRadius: 11, padding: "14px 16px", border: "1px solid #f0f2f5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
              {r.reviewer?.f_name} {r.reviewer?.l_name}
            </span>
            <div style={{ display: "flex", gap: 1 }}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ fontSize: 13, color: s <= r.rating ? "#f59e0b" : "#e2e8f0" }}>★</span>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: "#4b5563", margin: 0, lineHeight: 1.65 }}>{r.comment}</p>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 7 }}>{r.monthYear}</div>
        </div>
      ))}
    </div>
  );
}

function OrgTree({ superAdmin, admins, managers, employees, loading, searchQuery, onNodeClick }) {
  if (loading) return <SkeletonTree />;

  const q    = normalize(searchQuery);
  const hasQ = q.length > 0;

  const matchName = (f = "", l = "", dept = "", desig = "") => {
    if (!hasQ) return false;
    return normalize(`${f} ${l}`).includes(q) ||
           normalize(dept).includes(q) ||
           normalize(desig).includes(q);
  };

  const ADM_GAP = 28;
  const ADM_W   = 174;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: Math.max(620, admins.length * (ADM_W + ADM_GAP) + 80) }}>
      <SuperAdminNode
        name={`${superAdmin?.f_name || ""} ${superAdmin?.l_name || ""}`.trim() || "Super Admin"}
        role={superAdmin?.organisation_name || "Super Admin"}
        initials={getInitials(superAdmin?.f_name, superAdmin?.l_name)}
        delay={60}
        onClick={() => onNodeClick(superAdmin, "superadmin")}
      />

      {admins.length > 0 && (
        <>
          <VLine h={30} delay={220} />
          {admins.length > 1 && <HLine w={(admins.length - 1) * (ADM_W + ADM_GAP)} delay={280} />}
        </>
      )}

      <div style={{ display: "flex", gap: ADM_GAP, justifyContent: "center", alignItems: "flex-start" }}>
        {admins.map((admin, ai) => {
          const admMatch  = hasQ && matchName(admin.f_name, admin.l_name, "", admin.designation);
          const admDimmed = hasQ && !admMatch;
          const admDelay  = 340 + ai * 60;

          const admManagers = managers.filter(() => true);
          const MAN_GAP = 18;
          const MAN_W   = 152;
          const manTotal = admManagers.length > 1 ? (admManagers.length - 1) * (MAN_W + MAN_GAP) : 0;

          return (
            <div key={admin._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <VLine h={22} delay={admDelay - 60} />
              <AdminNode
                admin={admin}
                delay={admDelay}
                highlighted={admMatch}
                dimmed={admDimmed}
                onClick={() => onNodeClick(admin, "admin")}
              />

              {admManagers.length > 0 && (
                <>
                  <VLine h={26} delay={admDelay + 120} />
                  {admManagers.length > 1 && <HLine w={manTotal} delay={admDelay + 160} />}
                </>
              )}

              <div style={{ display: "flex", gap: MAN_GAP, justifyContent: "center", alignItems: "flex-start" }}>
                {admManagers.map((mgr, mi) => {
                  const mgrMatch  = hasQ && matchName(mgr.f_name, mgr.l_name, mgr.department, mgr.designation);
                  const mgrDimmed = hasQ && !mgrMatch && !admMatch;
                  const mgrDelay  = admDelay + 200 + mi * 55;

                  const mgrEmps = employees.filter(e =>
                    e.Under_manager?._id?.toString() === mgr._id?.toString() ||
                    e.Under_manager?.toString()      === mgr._id?.toString()
                  );
                  const EMP_GAP = 12;
                  const EMP_W   = 132;
                  const empTotal = mgrEmps.length > 1 ? (mgrEmps.length - 1) * (EMP_W + EMP_GAP) : 0;

                  return (
                    <div key={mgr._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <VLine h={18} delay={mgrDelay - 55} />
                      <ManagerNode
                        manager={mgr}
                        delay={mgrDelay}
                        highlighted={mgrMatch}
                        dimmed={mgrDimmed}
                        onClick={() => onNodeClick(mgr, "manager")}
                      />

                      {mgrEmps.length > 0 && (
                        <>
                          <VLine h={20} delay={mgrDelay + 100} />
                          {mgrEmps.length > 1 && <HLine w={empTotal} delay={mgrDelay + 140} />}
                        </>
                      )}

                      <div style={{ display: "flex", gap: EMP_GAP, justifyContent: "center", alignItems: "flex-start" }}>
                        {mgrEmps.map((emp, ei) => {
                          const empMatch  = hasQ && matchName(emp.f_name, emp.l_name, emp.department, emp.designation);
                          const empDimmed = hasQ && !empMatch && !mgrMatch && !admMatch;
                          const empDelay  = mgrDelay + 180 + ei * 45;
                          return (
                            <div key={emp._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <VLine h={16} delay={empDelay - 45} />
                              <EmployeeNode
                                employee={emp}
                                delay={empDelay}
                                highlighted={empMatch}
                                dimmed={empDimmed}
                                onClick={() => onNodeClick(emp, "employee")}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {admins.length === 0 && !loading && (
        <div style={{ marginTop: 36, padding: "18px 36px", borderRadius: 12, border: "1.5px dashed #e4e9f2", fontSize: 13, color: "#c8d2e0", background: "#fafbfc" }}>
          No admins created yet
        </div>
      )}
    </div>
  );
}

export default function SuperAdminOrgChart() {
  const refetchOpts = { staleTime: 1000 * 60 * 5, refetchInterval: REFRESH_MS, refetchOnWindowFocus: false };

  const { data: saData,  isLoading: loadingSA  } = useGetMeSuperAdmin();
  const { data: admData, isLoading: loadingAdm } = useGetAllAdmins(refetchOpts);
  const { data: mgrData, isLoading: loadingMgr } = useGetAllManagers(refetchOpts);
  const { data: empData, isLoading: loadingEmp } = useGetAllEmployees(refetchOpts);
  const { data: orgData }                         = useGetOrgInfo();

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected,    setSelected]    = useState(null);
  const inputRef = useRef(null);

  const superAdmin = saData?.superAdmin || saData;
  const admins     = useMemo(() => admData?.admins || [], [admData]);
  const managers   = useMemo(() => {
    const raw = mgrData?.managers || mgrData || [];
    return Array.isArray(raw) ? raw : [];
  }, [mgrData]);
  const employees  = useMemo(() => {
    const raw = empData?.users || empData || [];
    return Array.isArray(raw) ? raw : [];
  }, [empData]);

  const orgName  = orgData?.organisation_name || superAdmin?.organisation_name || "Organisation";
  const loading  = loadingSA || loadingAdm || loadingMgr || loadingEmp;
  const totalNodes = 1 + admins.length + managers.length + employees.length;

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const q = normalize(searchQuery);
    let n = 0;
    const check = (f, l, dept, desig) => {
      if (normalize(`${f} ${l}`).includes(q) || normalize(dept||"").includes(q) || normalize(desig||"").includes(q)) n++;
    };
    if (superAdmin) check(superAdmin.f_name, superAdmin.l_name, "", "");
    admins.forEach(a   => check(a.f_name, a.l_name, "", a.designation));
    managers.forEach(m => check(m.f_name, m.l_name, m.department, m.designation));
    employees.forEach(e => check(e.f_name, e.l_name, e.department, e.designation));
    return n;
  }, [searchQuery, superAdmin, admins, managers, employees]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSelected(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  const statItems = [
    { label: "Admins",    value: admins.length,    color: "#6366f1" },
    { label: "Managers",  value: managers.length,  color: "#0ea5e9" },
    { label: "Employees", value: employees.length, color: "#10b981" },
    { label: "Total",     value: totalNodes,       color: BRAND     },
  ];

  return (
    <div className="su-org" style={{ minHeight: "100vh", background: "#f4f7fb" }}>
      <style>{STYLES}</style>

      <div style={{
        animation: "fadeIn 0.35s ease forwards",
        background: "#fff",
        borderBottom: "1px solid #e8edf5",
        padding: "0 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 62, gap: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND, boxShadow: `0 0 0 3px ${BRAND}25` }} />
          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{orgName}</span>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 3l3 3.5L5 10" stroke="#d1d5db" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 13.5, color: "#111827", fontWeight: 700, letterSpacing: "-0.2px" }}>Org Chart</span>
          <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 20, background: BRAND_LIGHT, color: BRAND, fontWeight: 700, marginLeft: 4, letterSpacing: "0.02em" }}>
            Super Admin
          </span>
          {!loading && <LiveDot />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="su-search-wrap">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="#9ca3af" strokeWidth="1.3" /><path d="M9 9l2.5 2.5" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" /></svg>
                <input ref={inputRef} className="su-search-input" placeholder="Name, role, department…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <span style={{ fontSize: 11, fontWeight: 600, color: BRAND, background: BRAND_LIGHT, padding: "4px 10px", borderRadius: 20 }}>
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </span>
              )}
              <button className="su-hdr-btn" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                Close
              </button>
            </div>
          ) : (
            <button className="su-hdr-btn" onClick={() => setSearchOpen(true)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" /><path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              Search
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 28px 48px" }}>

        <div style={{ animation: "fadeUp 0.35s ease 60ms forwards", opacity: 0, marginBottom: 22 }}>
          <h1 style={{ fontSize: 23, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" }}>Organisation Chart</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "5px 0 0" }}>
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · auto-refreshes every 2 min`}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 26 }}>
          {statItems.map(({ label, value, color }, i) => (
            <div
              key={label}
              className="stat-card"
              style={{ animation: `fadeUp 0.35s ease ${100 + i * 55}ms forwards`, opacity: 0, "--accent": color }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 17, height: 17, borderRadius: "50%", background: color, boxShadow: `0 2px 6px ${color}40` }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", lineHeight: 1, letterSpacing: "-0.5px", fontFamily: "'JetBrains Mono',monospace" }}>
                  {loading ? "—" : value}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, fontWeight: 500 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          animation: "fadeIn 0.4s ease 280ms forwards", opacity: 0,
          background: "#fff", border: "1px solid #e8edf5",
          borderRadius: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 22px", borderBottom: "1px solid #f0f4fa",
            display: "flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, #fafbfd, #f5f8fc)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Hierarchy</span>
            <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: "#f0f4fa", color: "#9ca3af", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
              {loading ? "…" : `${totalNodes} nodes`}
            </span>
            {searchQuery && matchCount > 0 && (
              <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: BRAND_LIGHT, color: BRAND, fontWeight: 600 }}>
                {matchCount} highlighted
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>Click any card for details</span>
          </div>

          <div className="su-scroll" style={{ overflowX: "auto", padding: "44px 36px 40px", background: "#fff" }}>
            <OrgTree
              superAdmin={superAdmin}
              admins={admins}
              managers={managers}
              employees={employees}
              loading={loading}
              searchQuery={searchQuery}
              onNodeClick={(person, type) => setSelected({ person, type })}
            />
          </div>
        </div>

        {!loading && (
          <div style={{ display: "flex", gap: 22, marginTop: 18, justifyContent: "center", flexWrap: "wrap", animation: "fadeIn 0.4s ease 560ms forwards", opacity: 0 }}>
            {[
              { dot: BRAND,     label: "Super Admin", glow: true },
              { dot: "#6366f1", label: "Admin"   },
              { dot: "#0ea5e9", label: "Manager" },
              { dot: "#cbd5e1", label: "Employee", border: "#b0b8c8" },
            ].map(({ dot, label, border, glow }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#9ca3af" }}>
                <span style={{
                  width: 9, height: 9, borderRadius: "50%", background: dot, flexShrink: 0,
                  border: border ? `1.5px solid ${border}` : "none",
                  boxShadow: glow ? `0 0 0 3px ${dot}28` : "none",
                }} />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <EmployeeDetailPanel
          person={selected.person}
          type={selected.type}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
    
  );
}