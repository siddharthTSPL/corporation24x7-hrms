"use client";

import { useMemo, useEffect, useState } from "react";
import { Crown, Users, Building2, Shield, User } from "lucide-react";

// ─── Admin hooks ─────────────────────────────────────────────────────────────
import {
  useGetMeAdmin,
  useFindAllManagers,
} from "../../auth/server-state/adminauth/adminauth.hook";

import {
  useGetAllEmployee,
  useGetEmployeeStats,
  useGetOrgInfo,
} from "../../auth/server-state/adminother/adminother.hook";

// ─── Employee hook (to find the current user's reporting manager) ─────────────
import { useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";

// ─── Design tokens ───────────────────────────────────────────────────────────
// Dark tier  → Admin + Reporting Manager (current user's manager)
const D_CARD        = "#1E0E18";
const D_BORDER      = "#6B1840";
const D_AVATAR_BG   = "#7A124A";
const D_ACCENT      = "#C9A84C";          // gold ring / admin badge
const D_NAME        = "#F5E6EE";
const D_SUB         = "#A07080";

const R_CARD        = "#260F1C";          // reporting manager – slightly different shade
const R_BORDER      = "#501030";
const R_AVATAR_BG   = "#5A1438";
const R_BADGE_BG    = "#4A0E2C";
const R_NAME        = "#F0D0E0";
const R_SUB         = "#906070";

// Light tier → Regular managers
const M_CARD        = "#FFF7FA";
const M_BORDER      = "#EAD0DC";
const M_AVATAR_BG   = "#D4789C";
const M_BADGE_BG    = "#B25080";
const M_NAME        = "#3A1828";
const M_SUB         = "#9A6878";

// Lightest → Employees
const E_CARD        = "#FDFCFD";
const E_BORDER      = "#EDE4E8";
const E_AVATAR_BG   = "#EDD8E4";
const E_AVATAR_FG   = "#7A3055";
const E_NAME        = "#2A1820";
const E_SUB         = "#9A8090";

// Connectors
const CONN_DARK     = "#6B184055";
const CONN_LIGHT    = "#DDD0D8";

// ─── Global CSS ───────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fraunces:wght@600;700&display=swap');

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
  .oc-admin:hover   { box-shadow: 0 16px 40px #7A124A38 !important; }
  .oc-rpt:hover     { box-shadow: 0 12px 32px #5A143840 !important; }
  .oc-mgr:hover     { box-shadow: 0 10px 26px #B2508018 !important; }
  .oc-emp:hover     { box-shadow: 0  6px 18px #00000010 !important; }

  .stat-card { transition: transform .18s ease; }
  .stat-card:hover { transform: translateY(-2px); }

  .org-scroll::-webkit-scrollbar { height: 5px; width: 5px; }
  .org-scroll::-webkit-scrollbar-track { background: #F0EBF0; border-radius: 4px; }
  .org-scroll::-webkit-scrollbar-thumb { background: #C8B0C0; border-radius: 4px; }
`;

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
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

// ─── Animated stat counter ────────────────────────────────────────────────────
function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const n = parseInt(target) || 0;
    if (!n) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(n / 22));
    const t = setInterval(() => { cur = Math.min(cur + step, n); setV(cur); if (cur >= n) clearInterval(t); }, 40);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, delay = 0 }) {
  const count = useCountUp(value);
  return (
    <div className="stat-card" style={{
      animation: `fadeUp .4s ease ${delay}ms forwards`, opacity: 0,
      background: "#fff", border: "0.5px solid #EAE0E8", borderRadius: 14,
      padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 2px 8px #0000000A",
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, color: "#1A0F16", lineHeight: 1, margin: 0 }}>{count}</p>
        <p style={{ fontSize: 11, color: "#9A8090", margin: "4px 0 0", fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Node cards ───────────────────────────────────────────────────────────────

/** ADMIN — darkest, gold accent ring, pulsing glow */
function AdminCard({ name, subtitle, initials, delay = 0 }) {
  return (
    <div style={{ animation: `fadeUp .45s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="oc oc-admin" style={{
        width: 188, background: D_CARD, border: `1.5px solid ${D_BORDER}`, borderRadius: 18,
        padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative", animation: "goldGlow 3.2s ease-in-out infinite",
        boxShadow: `0 8px 28px #7A124A1A`,
      }}>
        <span style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 12px",
          borderRadius: 20, background: `linear-gradient(90deg,${D_AVATAR_BG},${D_ACCENT})`,
          color: "#fff", whiteSpace: "nowrap",
        }}>ADMIN</span>

        {/* Gold ring */}
        <div style={{ width: 62, height: 62, borderRadius: "50%", border: `2px solid ${D_ACCENT}44`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, flexShrink: 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: `linear-gradient(135deg,${D_AVATAR_BG},#9B1860)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 700, color: "#fff",
            boxShadow: `0 4px 14px #7A124A55`,
          }}>{initials}</div>
        </div>

        <p style={{ fontSize: 14, fontWeight: 600, color: D_NAME, textAlign: "center", margin: 0, maxWidth: 156, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 11, color: D_SUB, margin: "3px 0 0", textAlign: "center" }}>{subtitle}</p>
      </div>
    </div>
  );
}

/** REPORTING MANAGER — dark, slightly different shade from admin */
function ReportingManagerCard({ name, subtitle, initials, delay = 0 }) {
  return (
    <div style={{ animation: `fadeUp .4s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="oc oc-rpt" style={{
        width: 162, background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 16,
        padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative", boxShadow: `0 4px 18px #5A143818`,
      }}>
        <span style={{
          position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
          fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", padding: "2px 10px",
          borderRadius: 20, background: R_BADGE_BG, color: "#F0C0D0", whiteSpace: "nowrap",
        }}>REPORTING MGR</span>

        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: `linear-gradient(135deg,${R_AVATAR_BG},${D_AVATAR_BG})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#F0D0DC",
          marginBottom: 10, flexShrink: 0, boxShadow: `0 3px 10px #5A143844`,
        }}>{initials}</div>

        <p style={{ fontSize: 13, fontWeight: 600, color: R_NAME, textAlign: "center", margin: 0, maxWidth: 136, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 10, color: R_SUB, margin: "3px 0 0", textAlign: "center", maxWidth: 136, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>
      </div>
    </div>
  );
}

/** REGULAR MANAGER — light */
function ManagerCard({ name, subtitle, initials, delay = 0 }) {
  return (
    <div style={{ animation: `fadeUp .4s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="oc oc-mgr" style={{
        width: 150, background: M_CARD, border: `1px solid ${M_BORDER}`, borderRadius: 14,
        padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative", boxShadow: `0 3px 10px #B2508010`,
      }}>
        <span style={{
          position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
          fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", padding: "2px 9px",
          borderRadius: 20, background: M_BADGE_BG, color: "#fff", whiteSpace: "nowrap",
        }}>MGR</span>

        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: M_AVATAR_BG,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
          marginBottom: 8, flexShrink: 0, boxShadow: `0 2px 8px #B2508028`,
        }}>{initials}</div>

        <p style={{ fontSize: 12, fontWeight: 600, color: M_NAME, textAlign: "center", margin: 0, maxWidth: 126, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 10, color: M_SUB, margin: "3px 0 0", textAlign: "center", maxWidth: 126, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>
      </div>
    </div>
  );
}

/** EMPLOYEE — lightest */
function EmployeeCard({ name, subtitle, initials, delay = 0 }) {
  return (
    <div style={{ animation: `fadeUp .4s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="oc oc-emp" style={{
        width: 124, background: E_CARD, border: `0.5px solid ${E_BORDER}`, borderRadius: 12,
        padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center",
        boxShadow: "0 2px 6px #00000008",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: E_AVATAR_BG,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: E_AVATAR_FG,
          marginBottom: 7, flexShrink: 0,
        }}>{initials}</div>

        <p style={{ fontSize: 11, fontWeight: 500, color: E_NAME, textAlign: "center", margin: 0, maxWidth: 108, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ fontSize: 10, color: E_SUB, margin: "2px 0 0", textAlign: "center", maxWidth: 108, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Org Tree ─────────────────────────────────────────────────────────────────
function OrgTree({ adminName, orgName, managers, employeesByMgr, reportingManagerId, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 700 }}>
        <Skeleton w={188} h={114} />
        <div style={{ width: 1.5, height: 30, background: "#EAE0E8" }} />
        <div style={{ display: "flex", gap: 32 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 1.5, height: 28, background: "#EAE0E8" }} />
              <Skeleton w={150} h={88} />
              <div style={{ width: 1.5, height: 22, background: "#EAE0E8" }} />
              <div style={{ display: "flex", gap: 10 }}>
                {[1, 2, 3].map(j => (
                  <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 1.5, height: 18, background: "#EAE0E8" }} />
                    <Skeleton w={124} h={74} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const MGR_GAP = managers.length > 4 ? 14 : 30;
  const EMP_GAP = 10;

  const mgrBranchW = managers.length <= 1
    ? "1.5px"
    : `${(managers.length - 1) * (150 + MGR_GAP)}px`;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      minWidth: Math.max(700, managers.length * 200),
    }}>

      {/* Admin */}
      <AdminCard
        name={orgName || adminName || "Admin"}
        subtitle="Administrator"
        initials={ini(
          (orgName || adminName || "Admin").split(" ")[0],
          (orgName || adminName || "AD").split(" ")[1] || "D"
        )}
        delay={80}
      />

      {managers.length > 0 && (
        <>
          <VLine h={30} color={CONN_DARK} delay={320} />
          <HLine w={mgrBranchW} color={CONN_LIGHT} delay={390} />
        </>
      )}

      {/* Managers row */}
      <div style={{ display: "flex", gap: MGR_GAP, justifyContent: "center", alignItems: "flex-start" }}>
        {managers.map((mgr, mi) => {
          const emps        = employeesByMgr[mgr._id] || [];
          const mgrDelay    = 470 + mi * 80;
          const isReporting = mgr._id === reportingManagerId;

          const empBranchW = emps.length <= 1
            ? "1.5px"
            : `${(emps.length - 1) * (124 + EMP_GAP)}px`;

          return (
            <div key={mgr._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <VLine h={28} color={CONN_LIGHT} delay={mgrDelay - 80} />

              {isReporting ? (
                <ReportingManagerCard
                  name={`${mgr.f_name} ${mgr.l_name}`}
                  subtitle={mgr.department || mgr.designation || "Manager"}
                  initials={ini(mgr.f_name, mgr.l_name)}
                  delay={mgrDelay}
                />
              ) : (
                <ManagerCard
                  name={`${mgr.f_name} ${mgr.l_name}`}
                  subtitle={mgr.department || mgr.designation || "Manager"}
                  initials={ini(mgr.f_name, mgr.l_name)}
                  delay={mgrDelay}
                />
              )}

              {emps.length > 0 && (
                <>
                  <VLine h={22} color={CONN_LIGHT} delay={mgrDelay + 120} />
                  <HLine w={empBranchW} color={CONN_LIGHT} delay={mgrDelay + 165} />
                </>
              )}

              {/* Employees */}
              <div style={{ display: "flex", gap: EMP_GAP, justifyContent: "center" }}>
                {emps.map((emp, ei) => (
                  <div key={emp._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <VLine h={18} color={CONN_LIGHT} delay={mgrDelay + 235 + ei * 45} />
                    <EmployeeCard
                      name={`${emp.f_name} ${emp.l_name}`}
                      subtitle={emp.department || emp.designation || "Employee"}
                      initials={ini(emp.f_name, emp.l_name)}
                      delay={mgrDelay + 268 + ei * 45}
                    />
                  </div>
                ))}

                {emps.length === 0 && (
                  <div style={{
                    marginTop: 8, padding: "6px 14px", borderRadius: 8,
                    border: "1px dashed #E0D4D8", fontSize: 10, color: "#B0A0A8",
                    animation: `fadeIn .4s ease ${mgrDelay + 170}ms forwards`,
                    opacity: 0, background: "#FDFCFD",
                  }}>
                    No employees yet
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {managers.length === 0 && (
          <div style={{
            padding: "10px 24px", borderRadius: 12,
            border: "1px dashed #E0D4D8",
            fontSize: 13, color: "#B0A0A8",
            background: "#FDFCFD", marginTop: 10,
          }}>
            No managers added yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrganizationPage() {
  // Admin data
  const { data: adminData }                            = useGetMeAdmin();
  const { data: orgData }                              = useGetOrgInfo();
  const { data: managersRes, isLoading: loadingMgrs }  = useFindAllManagers();
  const { data: employeesRes, isLoading: loadingEmps } = useGetAllEmployee();
  const { data: statsRes }                             = useGetEmployeeStats();

  // Employee data — used to highlight the current user's reporting manager
  const { data: meUserData } = useGetMeUser();
  const reportingManagerId   =
    meUserData?.Under_manager?._id ||
    meUserData?.Under_manager ||
    null;

  // Derived values
  const managers = managersRes?.managers || [];

  const employees = useMemo(() =>
    (employeesRes?.users || []).filter(u => u.Under_manager != null),
  [employeesRes]);

  const employeesByMgr = useMemo(() =>
    managers.reduce((acc, mgr) => {
      acc[mgr._id] = employees.filter(
        e => e.Under_manager?._id === mgr._id || e.Under_manager === mgr._id
      );
      return acc;
    }, {}),
  [managers, employees]);

  const totalEmps  = employees.length;
  const totalMgrs  = managers.length;
  const totalDepts = [...new Set(managers.map(m => m.department).filter(Boolean))].length;
  const totalAll   = statsRes?.totalEmployees || (totalEmps + totalMgrs);

  const loading    = loadingMgrs || loadingEmps;
  const orgName    = orgData?.organisation_name || adminData?.organisation_name;
  const adminName  = adminData?.username || adminData?.email?.split("@")[0] || "Admin";

  return (
    <div className="org-root" style={{ minHeight: "100vh", background: "#F7F3F5", position: "relative" }}>
      <style>{STYLES}</style>

      {/* Soft top wash */}
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
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: D_AVATAR_BG, textTransform: "uppercase" }}>
              {orgName || "Organisation"}
            </span>
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: "#1A0F16", lineHeight: 1.2, margin: 0,
            fontFamily: "'Fraunces', serif",
          }}>
            Organization Structure
          </h1>
          <p style={{ fontSize: 13, color: "#9A8090", margin: "6px 0 0" }}>
            Live hierarchy · {loading ? "—" : totalAll} total members
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
          gap: 12, marginBottom: 30,
        }}>
          <StatCard label="Total Members" value={totalAll}   icon={Users}     iconColor="#7A124A" iconBg="#7A124A12" delay={100} />
          <StatCard label="Managers"      value={totalMgrs}  icon={Shield}    iconColor="#B25080" iconBg="#B2508014" delay={160} />
          <StatCard label="Employees"     value={totalEmps}  icon={User}      iconColor="#2A7A9A" iconBg="#2A7A9A12" delay={220} />
          <StatCard label="Departments"   value={totalDepts || statsRes?.departments?.length || 0}
                                                             icon={Building2} iconColor="#2D7A4A" iconBg="#2D7A4A12" delay={280} />
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
              adminName={adminName}
              orgName={orgName}
              managers={managers}
              employeesByMgr={employeesByMgr}
              reportingManagerId={reportingManagerId}
              loading={loading}
            />
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", gap: 20, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { color: D_AVATAR_BG,   label: "Admin" },
            { color: R_AVATAR_BG,   label: "Reporting Manager" },
            { color: M_AVATAR_BG,   label: "Manager" },
            { color: E_AVATAR_BG,   label: "Employee" },
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