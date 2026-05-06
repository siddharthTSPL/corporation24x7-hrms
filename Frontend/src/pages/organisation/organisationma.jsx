"use client";

import { useMemo, useEffect, useState } from "react";
import { Crown, Users, Building2, User, MapPin } from "lucide-react";

// ─── Manager hooks ────────────────────────────────────────────────────────────
import { useGetMeManager } from "../../auth/server-state/manager/managerauth/managerauth.hook";
import { useGetUsersUnderManager } from "../../auth/server-state/manager/managgerother/managerother.hook";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Dark tier → Manager (self) card
const D_CARD       = "#1E0E18";
const D_BORDER     = "#6B1840";
const D_AVATAR_BG  = "#7A124A";
const D_ACCENT     = "#C9A84C";
const D_NAME       = "#F5E6EE";
const D_SUB        = "#A07080";

// Light tier → Employees
const E_CARD       = "#FDFCFD";
const E_BORDER     = "#EDE4E8";
const E_AVATAR_BG  = "#EDD8E4";
const E_AVATAR_FG  = "#7A3055";
const E_NAME       = "#2A1820";
const E_SUB        = "#9A8090";

// Connectors
const CONN_DARK    = "#6B184055";
const CONN_LIGHT   = "#DDD0D8";

// ─── Global CSS ───────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:wght@600;700&display=swap');

  .org-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes drawV   { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes drawH   { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes shimmer { 0%{background-position:-500px 0} 100%{background-position:500px 0} }
  @keyframes goldGlow {
    0%,100% { box-shadow: 0 0 0 3px #C9A84C1A, 0 8px 28px #7A124A1A; }
    50%      { box-shadow: 0 0 0 6px #C9A84C0D, 0 10px 34px #7A124A28; }
  }

  .oc { transition: transform .22s ease, box-shadow .22s ease; cursor: default; }
  .oc:hover { transform: translateY(-4px); }
  .oc-mgr:hover { box-shadow: 0 16px 40px #7A124A38 !important; }
  .oc-emp:hover { box-shadow: 0  6px 18px #00000010 !important; }

  .stat-card { transition: transform .18s ease; }
  .stat-card:hover { transform: translateY(-2px); }

  .org-scroll::-webkit-scrollbar { height: 5px; width: 5px; }
  .org-scroll::-webkit-scrollbar-track { background: #F0EBF0; border-radius: 4px; }
  .org-scroll::-webkit-scrollbar-thumb { background: #C8B0C0; border-radius: 4px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ini = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();

function VLine({ h = 32, color = CONN_LIGHT, delay = 0 }) {
  return (
    <div style={{
      width: 1.5, height: h, margin: "0 auto", flexShrink: 0,
      background: color, transformOrigin: "top",
      animation: `drawV .3s ease ${delay}ms forwards`,
      transform: "scaleY(0)",
    }} />
  );
}

function HLine({ w, color = CONN_LIGHT, delay = 0 }) {
  return (
    <div style={{
      width: w, height: 1.5, flexShrink: 0,
      background: color, transformOrigin: "center",
      animation: `drawH .35s ease ${delay}ms forwards`,
      transform: "scaleX(0)",
    }} />
  );
}

function Skeleton({ w = 148, h = 100 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 14,
      background: "linear-gradient(90deg,#F0EBF0 25%,#E8E0E6 50%,#F0EBF0 75%)",
      backgroundSize: "500px 100%",
      animation: "shimmer 1.3s infinite linear",
    }} />
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const n = parseInt(target) || 0;
    if (!n) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(n / 22));
    const t = setInterval(() => {
      cur = Math.min(cur + step, n);
      setV(cur);
      if (cur >= n) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconColor, iconBg, delay = 0 }) {
  const count = useCountUp(value);
  return (
    <div className="stat-card" style={{
      animation: `fadeUp .4s ease ${delay}ms forwards`, opacity: 0,
      background: "#fff", border: "0.5px solid #EAE0E8", borderRadius: 14,
      padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 2px 8px #0000000A",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, color: "#1A0F16", lineHeight: 1, margin: 0 }}>{count}</p>
        <p style={{ fontSize: 11, color: "#9A8090", margin: "4px 0 0", fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Manager card (dark, self) ────────────────────────────────────────────────
function ManagerSelfCard({ name, subtitle, location, initials, delay = 0 }) {
  return (
    <div style={{
      animation: `fadeUp .45s ease ${delay}ms forwards`, opacity: 0,
      flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div className="oc oc-mgr" style={{
        width: 200, background: D_CARD, border: `1.5px solid ${D_BORDER}`,
        borderRadius: 18, padding: "22px 18px",
        display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative",
        animation: "goldGlow 3.2s ease-in-out infinite",
        boxShadow: `0 8px 28px #7A124A1A`,
      }}>
        {/* YOU badge */}
        <span style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 14px",
          borderRadius: 20, background: `linear-gradient(90deg,${D_AVATAR_BG},${D_ACCENT})`,
          color: "#fff", whiteSpace: "nowrap",
        }}>YOU · MANAGER</span>

        {/* Gold ring + avatar */}
        <div style={{
          width: 66, height: 66, borderRadius: "50%",
          border: `2px solid ${D_ACCENT}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: `linear-gradient(135deg,${D_AVATAR_BG},#9B1860)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
            boxShadow: `0 4px 14px #7A124A55`,
          }}>{initials}</div>
        </div>

        <p style={{
          fontSize: 15, fontWeight: 600, color: D_NAME,
          textAlign: "center", margin: 0,
          maxWidth: 164, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{name}</p>
        <p style={{ fontSize: 11, color: D_SUB, margin: "3px 0 0", textAlign: "center" }}>{subtitle}</p>

        {location && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            marginTop: 8, fontSize: 10, color: "#785050",
          }}>
            <MapPin size={10} style={{ color: "#785050", flexShrink: 0 }} />
            {location}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee card (light) ────────────────────────────────────────────────────
function EmployeeCard({ name, subtitle, initials, location, delay = 0 }) {
  return (
    <div style={{
      animation: `fadeUp .4s ease ${delay}ms forwards`, opacity: 0,
      flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div className="oc oc-emp" style={{
        width: 136, background: E_CARD, border: `0.5px solid ${E_BORDER}`,
        borderRadius: 14, padding: "14px 10px",
        display: "flex", flexDirection: "column", alignItems: "center",
        boxShadow: "0 2px 8px #00000008",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: E_AVATAR_BG,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 600, color: E_AVATAR_FG,
          marginBottom: 9, flexShrink: 0,
        }}>{initials}</div>

        <p style={{
          fontSize: 12, fontWeight: 500, color: E_NAME,
          textAlign: "center", margin: 0,
          maxWidth: 116, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{name}</p>
        <p style={{
          fontSize: 10, color: E_SUB, margin: "3px 0 0",
          textAlign: "center",
          maxWidth: 116, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{subtitle}</p>

        {location && (
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            marginTop: 6, fontSize: 9, color: "#B0A0A8",
          }}>
            <MapPin size={9} style={{ color: "#C8B0C0", flexShrink: 0 }} />
            {location}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Org Tree ─────────────────────────────────────────────────────────────────
function OrgTree({ manager, employees, loading }) {
  const EMP_GAP = 16;
  const EMP_W   = 136;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 600 }}>
        <Skeleton w={200} h={130} />
        <div style={{ width: 1.5, height: 36, background: "#EAE0E8" }} />
        <div style={{ display: "flex", gap: EMP_GAP }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 1.5, height: 24, background: "#EAE0E8" }} />
              <Skeleton w={EMP_W} h={110} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const empBranchW = employees.length <= 1
    ? "1.5px"
    : `${(employees.length - 1) * (EMP_W + EMP_GAP)}px`;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      minWidth: Math.max(600, employees.length * (EMP_W + EMP_GAP) + 60),
    }}>
      {/* Manager self card */}
      <ManagerSelfCard
        name={`${manager?.f_name || ""} ${manager?.l_name || ""}`.trim() || "Manager"}
        subtitle={manager?.department || manager?.designation || "Manager"}
        location={manager?.office_location}
        initials={ini(manager?.f_name, manager?.l_name)}
        delay={80}
      />

      {employees.length > 0 && (
        <>
          <VLine h={34} color={CONN_DARK} delay={300} />
          <HLine w={empBranchW} color={CONN_LIGHT} delay={370} />
        </>
      )}

      {/* Employees row */}
      <div style={{ display: "flex", gap: EMP_GAP, justifyContent: "center", alignItems: "flex-start" }}>
        {employees.map((emp, ei) => {
          const empDelay = 440 + ei * 55;
          return (
            <div key={emp._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <VLine h={24} color={CONN_LIGHT} delay={empDelay - 55} />
              <EmployeeCard
                name={`${emp.f_name} ${emp.l_name}`}
                subtitle={emp.department || emp.designation || "Employee"}
                initials={ini(emp.f_name, emp.l_name)}
                location={emp.office_location}
                delay={empDelay}
              />
            </div>
          );
        })}

        {employees.length === 0 && (
          <div style={{
            marginTop: 10, padding: "10px 24px", borderRadius: 10,
            border: "1px dashed #E0D4D8", fontSize: 12, color: "#B0A0A8",
            background: "#FDFCFD",
            animation: `fadeIn .4s ease 380ms forwards`, opacity: 0,
          }}>
            No employees assigned yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrganizationPageManager() {
  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { data: meManagerData, isLoading: loadingMe }      = useGetMeManager();
  const { data: usersUnderData, isLoading: loadingUnder }  = useGetUsersUnderManager();

  // ── Derived ────────────────────────────────────────────────────────────────
  // useGetMeManager returns { manager: {...} } or the manager object directly
  const manager = meManagerData?.manager || meManagerData;

  // useGetUsersUnderManager returns { users: [...] } or an array directly
  const employees = useMemo(() => {
    const raw = usersUnderData?.users || usersUnderData || [];
    return Array.isArray(raw) ? raw : [];
  }, [usersUnderData]);

  const totalEmps  = employees.length;
  const depts      = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const totalDepts = depts.length;
  const locations  = [...new Set(employees.map(e => e.office_location).filter(Boolean))];

  const loading = loadingMe || loadingUnder;

  return (
    <div className="org-root" style={{ minHeight: "100vh", background: "#F7F3F5", position: "relative" }}>
      <style>{STYLES}</style>

      {/* Soft gradient wash */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 210,
        background: "linear-gradient(180deg,#F5E8EE 0%,transparent 100%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1440, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Header ── */}
        <div style={{ animation: "fadeUp .4s ease forwards", opacity: 0, marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: D_AVATAR_BG,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Crown size={14} style={{ color: "#fff" }} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
              color: D_AVATAR_BG, textTransform: "uppercase",
            }}>
              {manager?.department || "My Team"}
            </span>
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: "#1A0F16", lineHeight: 1.2, margin: 0,
            fontFamily: "'Fraunces', serif",
          }}>
            My Organization
          </h1>
          <p style={{ fontSize: 13, color: "#9A8090", margin: "6px 0 0" }}>
            {loading ? "Loading…" : `${totalEmps} employee${totalEmps !== 1 ? "s" : ""} reporting to you`}
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
          gap: 12, marginBottom: 30,
        }}>
          <StatCard
            label="Team Size"
            value={totalEmps}
            icon={Users}
            iconColor="#7A124A"
            iconBg="#7A124A12"
            delay={100}
          />
          <StatCard
            label="Departments"
            value={totalDepts}
            icon={Building2}
            iconColor="#2D7A4A"
            iconBg="#2D7A4A12"
            delay={160}
          />
          <StatCard
            label="Locations"
            value={locations.length}
            icon={MapPin}
            iconColor="#2A7A9A"
            iconBg="#2A7A9A12"
            delay={220}
          />
          <StatCard
            label="Direct Reports"
            value={totalEmps}
            icon={User}
            iconColor="#B25080"
            iconBg="#B2508014"
            delay={280}
          />
        </div>

        {/* ── Tree container ── */}
        <div style={{
          animation: "fadeIn .5s ease 320ms forwards", opacity: 0,
          background: "#fff", border: "0.5px solid #E8E0E6",
          borderRadius: 22, padding: "46px 28px 40px",
          boxShadow: "0 4px 24px #00000008",
          position: "relative", overflow: "hidden",
        }}>
          {/* Corner accents */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 56, height: 56, borderTop: "1.5px solid #F0D8E4", borderLeft: "1.5px solid #F0D8E4", borderRadius: "22px 0 0 0", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 56, height: 56, borderBottom: "1.5px solid #EEE0E8", borderRight: "1.5px solid #EEE0E8", borderRadius: "0 0 22px 0", pointerEvents: "none" }} />

          <div className="org-scroll" style={{ overflowX: "auto", paddingBottom: 8 }}>
            <OrgTree
              manager={manager}
              employees={employees}
              loading={loading}
            />
          </div>
        </div>

        {/* ── Departments list (if multiple) ── */}
        {depts.length > 0 && (
          <div style={{
            animation: "fadeUp .4s ease 500ms forwards", opacity: 0,
            marginTop: 20,
            display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
          }}>
            {depts.map(dept => (
              <span key={dept} style={{
                fontSize: 11, fontWeight: 500, color: "#7A3055",
                background: "#F5E8EE", border: "0.5px solid #EAD0DC",
                padding: "4px 12px", borderRadius: 20,
              }}>
                {dept}
              </span>
            ))}
          </div>
        )}

        {/* ── Legend ── */}
        <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { color: D_AVATAR_BG, label: "You (Manager)" },
            { color: E_AVATAR_BG, label: "Employee" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#9A8090" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}