import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .su-org *, .su-org { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn   { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes shimmer   { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes drawH     { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes drawV     { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes slideR    { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
  @keyframes pulseRing {
    0%,100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.3), 0 4px 16px rgba(115,0,66,0.12); }
    50%      { box-shadow: 0 0 0 6px rgba(115,0,66,0.08), 0 6px 22px rgba(115,0,66,0.2); }
  }
  .su-card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.15s ease; cursor: pointer; }
  .su-card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(115,0,66,0.12) !important; border-color: #730042 !important; }
  .su-card-highlight { outline: 2.5px solid #730042 !important; outline-offset: 2px; box-shadow: 0 0 0 5px rgba(115,0,66,0.12) !important; }
  .su-card-dim { opacity: 0.2; filter: grayscale(0.4); transition: opacity 0.2s, filter 0.2s; }
  .su-card-sa  { animation: pulseRing 2.8s ease-in-out infinite !important; }
  .su-scroll::-webkit-scrollbar { height:4px; width:4px; }
  .su-scroll::-webkit-scrollbar-track { background:transparent; }
  .su-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
  .su-hdr-btn {
    display:flex; align-items:center; gap:6px;
    padding:7px 14px; border-radius:8px;
    border:1px solid #e2e8f0; background:#fff; color:#475569;
    font-size:13px; font-weight:500; cursor:pointer;
    font-family:'DM Sans',sans-serif;
    transition:background 0.13s, border-color 0.13s, color 0.13s;
    white-space:nowrap;
  }
  .su-hdr-btn:hover { background:#f8fafc; border-color:#cbd5e1; color:#1e293b; }
  .su-hdr-btn-primary { background:#730042; color:#fff; border-color:#730042; }
  .su-hdr-btn-primary:hover { background:#5a0033; border-color:#5a0033; color:#fff; }
  .su-search-wrap {
    display:flex; align-items:center; gap:8px;
    border:1px solid #730042; border-radius:8px;
    padding:0 10px; background:#fff; height:36px; width:268px;
    box-shadow:0 0 0 3px rgba(115,0,66,0.1);
  }
  .su-search-input { border:none; outline:none; background:transparent; font-size:13px; color:#1e293b; font-family:'DM Sans',sans-serif; flex:1; min-width:0; }
  .su-search-input::placeholder { color:#94a3b8; }
  .panel-overlay { position:fixed; inset:0; z-index:40; background:rgba(42,26,22,0.35); animation:fadeIn 0.2s ease forwards; }
  .panel-drawer  { position:fixed; top:0; right:0; bottom:0; width:420px; z-index:50; background:#fff; box-shadow:-4px 0 32px rgba(115,0,66,0.12); animation:slideR 0.25s ease forwards; overflow-y:auto; display:flex; flex-direction:column; }
  .info-row { display:flex; justify-content:space-between; padding:11px 0; border-bottom:0.5px solid #ede5e0; font-size:13px; }
  .detail-tab { padding:8px 16px; border-radius:8px; border:0.5px solid #ede5e0; font-size:12px; cursor:pointer; background:#fff; color:#b0948a; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; }
  .detail-tab.active { background:#730042; color:#fff; border-color:#730042; }
`;

const BRAND = "#730042";
const BRAND_LIGHT = "rgba(115,0,66,0.08)";
const BRAND_MID   = "rgba(115,0,66,0.15)";

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getInitials = (f = "", l = "") =>
  `${f[0] || ""}${l[0] || ""}`.toUpperCase();

const normalize = (s = "") => s.toLowerCase().trim();

function Skeleton({ w, h, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%)",
      backgroundSize: "600px 100%",
      animation: "shimmer 1.4s infinite linear",
    }} />
  );
}

function VLine({ h = 32, delay = 0 }) {
  return (
    <div style={{
      width: 1, height: h, margin: "0 auto", flexShrink: 0,
      background: "#e2e8f0", transformOrigin: "top",
      animation: `drawV 0.25s ease ${delay}ms forwards`, transform: "scaleY(0)",
    }} />
  );
}

function HLine({ w, delay = 0 }) {
  return (
    <div style={{
      width: w, height: 1, flexShrink: 0,
      background: "#e2e8f0", transformOrigin: "center",
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
      fontSize, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function Badge({ children, color = BRAND, bg = BRAND_LIGHT }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 500, color, background: bg,
    }}>
      {children}
    </span>
  );
}

function SuperAdminNode({ name, role, initials, delay = 0, onClick }) {
  return (
    <div style={{ animation: `scaleIn 0.35s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className="su-card-hover su-card-sa"
        onClick={onClick}
        style={{
          width: 200, background: "#fff",
          border: `1px solid #e2e8f0`, borderRadius: 14,
          padding: "20px 16px 16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: BRAND, borderRadius: "14px 14px 0 0" }} />
        <span style={{ position: "absolute", top: 11, right: 12, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>SA</span>
        <Avatar initials={initials} size={54} bg={BRAND} fontSize={18} />
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "12px 0 0", textAlign: "center" }}>{name}</p>
        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0", textAlign: "center" }}>{role}</p>
        <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
          <Badge>Super Admin</Badge>
        </div>
      </div>
    </div>
  );
}

function AdminNode({ admin, delay = 0, dimmed, highlighted, onClick }) {
  const name = `${admin.f_name} ${admin.l_name}`.trim();
  return (
    <div style={{ animation: `scaleIn 0.35s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["su-card-hover", highlighted ? "su-card-highlight" : "", dimmed ? "su-card-dim" : ""].filter(Boolean).join(" ")}
        onClick={onClick}
        style={{
          width: 170, background: "#fff",
          border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "16px 12px 14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#6366f1", borderRadius: "12px 12px 0 0" }} />
        <span style={{ position: "absolute", top: 9, right: 10, fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>ADM</span>
        <Avatar initials={getInitials(admin.f_name, admin.l_name)} size={44} bg="#6366f1" fontSize={14} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: "10px 0 0", textAlign: "center", maxWidth: 146, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "3px 0 0", textAlign: "center", maxWidth: 146, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.designation || "Admin"}</p>
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "#eef2ff", color: "#4338ca", fontWeight: 500 }}>Admin</span>
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
          width: 148, background: "#f8fafc",
          border: "1px solid #e9eef5", borderRadius: 10,
          padding: "12px 10px",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#0ea5e9", borderRadius: "10px 10px 0 0" }} />
        <Avatar initials={getInitials(manager.f_name, manager.l_name)} size={36} bg="#0ea5e9" fontSize={12} />
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", margin: "8px 0 0", textAlign: "center", maxWidth: 128, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 10, color: "#94a3b8", margin: "2px 0 0", textAlign: "center", maxWidth: 128, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{manager.department || manager.designation || "Manager"}</p>
        <div style={{ marginTop: 6 }}>
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: "#e0f2fe", color: "#0369a1", fontWeight: 500 }}>Manager</span>
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
          width: 130, background: "#fafafa",
          border: "1px solid #e9eef5", borderRadius: 10,
          padding: "10px 8px",
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
      <Skeleton w={200} h={120} r={14} />
      <div style={{ width: 1, height: 28, background: "#e2e8f0" }} />
      <div style={{ display: "flex", gap: 16 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />
            <Skeleton w={170} h={100} r={12} />
            <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />
            <div style={{ display: "flex", gap: 12 }}>
              {[1, 2, 3].map(j => (
                <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1, height: 16, background: "#e2e8f0" }} />
                  <Skeleton w={130} h={80} r={10} />
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

  const name = isSA
    ? `${person.f_name} ${person.l_name}`
    : isEmployee || isManager || isAdmin
    ? `${person.f_name} ${person.l_name}`
    : "";

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
          padding: "20px 24px", borderBottom: "0.5px solid #ede5e0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#2a1a16" }}>Employee details</div>
            <div style={{ fontSize: 12, color: "#b0948a", marginTop: 2 }}>{roleLabel} profile</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "0.5px solid #ede5e0",
            borderRadius: 8, cursor: "pointer", padding: "6px 10px",
            color: "#b0948a", fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{
            background: BRAND_LIGHT, borderRadius: 14,
            padding: "24px", marginBottom: 20,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            border: `0.5px solid ${BRAND_MID}`,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: accentColor, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 600,
            }}>
              {getInitials(person.f_name, person.l_name)}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#2a1a16" }}>{name}</div>
              <div style={{ fontSize: 12, color: "#b0948a", marginTop: 2 }}>{person.work_email || person.email}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              <Badge color={accentColor} bg={`${accentColor}15`}>{roleLabel}</Badge>
              {(person.department || person.designation) && (
                <Badge color="#5F5E5A" bg="#F1EFE8">{person.department || person.designation}</Badge>
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
            <div>
              {fields.map(([label, val]) => (
                <div key={label} className="info-row">
                  <span style={{ color: "#b0948a" }}>{label}</span>
                  <span style={{ color: "#2a1a16", fontWeight: 500, maxWidth: 220, textAlign: "right", wordBreak: "break-all" }}>{val || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "leave" && !isSA && <LeaveTab uid={person._id} />}
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
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${BRAND}33`, borderTop: `2px solid ${BRAND}`, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!lb) return <div style={{ fontSize: 13, color: "#b0948a", textAlign: "center", paddingTop: 32 }}>No leave data found.</div>;

  const leaveTypes = [
    ["Casual Leave",    lb.casualLeave,    lb.casualLeaveUsed,    "#10b981"],
    ["Sick Leave",      lb.sickLeave,      lb.sickLeaveUsed,      "#0ea5e9"],
    ["Earned Leave",    lb.earnedLeave,    lb.earnedLeaveUsed,    "#6366f1"],
    ["Maternity Leave", lb.maternityLeave, lb.maternityLeaveUsed, "#ec4899"],
  ].filter(([, total]) => total !== undefined && total !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {leaveTypes.map(([label, total, used, color]) => {
        const remaining = (total || 0) - (used || 0);
        const pct = total ? Math.round(((used || 0) / total) * 100) : 0;
        return (
          <div key={label} style={{ background: "#f9f8f2", borderRadius: 10, padding: "14px 16px", border: "0.5px solid #ede5e0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#2a1a16" }}>{label}</span>
              <span style={{ fontSize: 12, color: "#b0948a" }}>{used || 0} / {total || 0} used</span>
            </div>
            <div style={{ height: 5, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "#b0948a", marginTop: 5 }}>{remaining} days remaining</div>
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
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${BRAND}33`, borderTop: `2px solid ${BRAND}`, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (!reviews.length) return (
    <div style={{ fontSize: 13, color: "#b0948a", textAlign: "center", paddingTop: 32 }}>No reviews yet.</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {reviews.map((r) => (
        <div key={r._id} style={{ background: "#f9f8f2", borderRadius: 10, padding: "14px 16px", border: "0.5px solid #ede5e0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#2a1a16" }}>
              {r.reviewer?.f_name} {r.reviewer?.l_name}
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ fontSize: 13, color: s <= r.rating ? "#f59e0b" : "#e2e8f0" }}>★</span>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{r.comment}</p>
          <div style={{ fontSize: 11, color: "#b0948a", marginTop: 6 }}>{r.monthYear}</div>
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

  const ADM_GAP = 24;
  const ADM_W   = 170;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: Math.max(600, admins.length * (ADM_W + ADM_GAP) + 60) }}>

      <SuperAdminNode
        name={`${superAdmin?.f_name || ""} ${superAdmin?.l_name || ""}`.trim() || "Super Admin"}
        role={superAdmin?.organisation_name || "Super Admin"}
        initials={getInitials(superAdmin?.f_name, superAdmin?.l_name)}
        delay={60}
        onClick={() => onNodeClick(superAdmin, "superadmin")}
      />

      {admins.length > 0 && (
        <>
          <VLine h={28} delay={220} />
          {admins.length > 1 && <HLine w={(admins.length - 1) * (ADM_W + ADM_GAP)} delay={280} />}
        </>
      )}

      <div style={{ display: "flex", gap: ADM_GAP, justifyContent: "center", alignItems: "flex-start" }}>
        {admins.map((admin, ai) => {
          const admMatch  = hasQ && matchName(admin.f_name, admin.l_name, "", admin.designation);
          const admDimmed = hasQ && !admMatch;
          const admDelay  = 340 + ai * 60;

          const admManagers  = managers.filter(m => m.created_by?.toString() === admin._id?.toString() || true);
          const MAN_GAP = 16;
          const MAN_W   = 148;
          const manTotal = admManagers.length > 1 ? (admManagers.length - 1) * (MAN_W + MAN_GAP) : 0;

          return (
            <div key={admin._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <VLine h={20} delay={admDelay - 60} />
              <AdminNode
                admin={admin}
                delay={admDelay}
                highlighted={admMatch}
                dimmed={admDimmed}
                onClick={() => onNodeClick(admin, "admin")}
              />

              {admManagers.length > 0 && (
                <>
                  <VLine h={24} delay={admDelay + 120} />
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
                  const EMP_W   = 130;
                  const empTotal = mgrEmps.length > 1 ? (mgrEmps.length - 1) * (EMP_W + EMP_GAP) : 0;

                  return (
                    <div key={mgr._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <VLine h={16} delay={mgrDelay - 55} />
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
                              <VLine h={14} delay={empDelay - 45} />
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
        <div style={{ marginTop: 32, padding: "16px 32px", borderRadius: 10, border: "1px dashed #e2e8f0", fontSize: 13, color: "#cbd5e1", background: "#fafafa" }}>
          No admins created yet
        </div>
      )}
    </div>
  );
}

export default function SuperAdminOrgChart() {
  const { data: saData,   isLoading: loadingSA  } = useGetMeSuperAdmin();
  const { data: admData,  isLoading: loadingAdm } = useGetAllAdmins();
  const { data: mgrData,  isLoading: loadingMgr } = useGetAllManagers();
  const { data: empData,  isLoading: loadingEmp } = useGetAllEmployees();
  const { data: orgData }                          = useGetOrgInfo();

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

  const orgName = orgData?.organisation_name || superAdmin?.organisation_name || "Organisation";

  const loading = loadingSA || loadingAdm || loadingMgr || loadingEmp;

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
    const onKey = (e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSelected(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  const totalNodes = 1 + admins.length + managers.length + employees.length;

  return (
    <div className="su-org" style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{STYLES}</style>

      <div style={{
        animation: "fadeIn 0.4s ease forwards",
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "0 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 60, gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND }} />
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{orgName}</span>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 3l3 3.5L5 10" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>Org Chart</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: BRAND_LIGHT, color: BRAND, fontWeight: 600, marginLeft: 4 }}>
            Super Admin View
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="su-search-wrap">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="#94a3b8" strokeWidth="1.3" /><path d="M9 9l2.5 2.5" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" /></svg>
                <input ref={inputRef} className="su-search-input" placeholder="Search name, role, department…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0 }}>
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

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 28px 40px" }}>
        <div style={{ animation: "fadeUp 0.35s ease 60ms forwards", opacity: 0, marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" }}>Organisation Chart</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "5px 0 0" }}>
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · Click any card to see full details`}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
          {[
            ["Admins",    admins.length,    "#6366f1"],
            ["Managers",  managers.length,  "#0ea5e9"],
            ["Employees", employees.length, "#10b981"],
            ["Total",     totalNodes,       BRAND],
          ].map(([label, value, color], i) => (
            <div key={label} style={{
              animation: `fadeUp 0.35s ease ${100 + i * 50}ms forwards`, opacity: 0,
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: "12px 12px 0 0" }} />
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: color }} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#0f172a", lineHeight: 1 }}>{loading ? "—" : value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          animation: "fadeIn 0.4s ease 300ms forwards", opacity: 0,
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 20px", borderBottom: "1px solid #f1f5f9",
            display: "flex", alignItems: "center", gap: 10, background: "#fafafa",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Hierarchy view</span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#94a3b8", fontWeight: 600, fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>
              {loading ? "—" : `${totalNodes} nodes`}
            </span>
            {searchQuery && matchCount > 0 && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: BRAND_LIGHT, color: BRAND, fontWeight: 600 }}>
                {matchCount} highlighted
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>Click any card to view details</span>
          </div>

          <div className="su-scroll" style={{ overflowX: "auto", padding: "40px 32px 36px", background: "#fff" }}>
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
          <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center", flexWrap: "wrap", animation: "fadeIn 0.4s ease 600ms forwards", opacity: 0 }}>
            {[
              { dot: BRAND,     label: "Super Admin", pulse: true },
              { dot: "#6366f1", label: "Admin"   },
              { dot: "#0ea5e9", label: "Manager" },
              { dot: "#e2e8f0", label: "Employee", border: "#cbd5e1" },
            ].map(({ dot, label, border, pulse }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#94a3b8" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, border: border ? `1.5px solid ${border}` : "none", boxShadow: pulse ? `0 0 0 3px ${dot}30` : "none" }} />
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