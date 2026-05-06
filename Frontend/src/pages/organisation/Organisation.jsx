"use client";

import { useState, useEffect, useMemo } from "react";
import { Crown, Users, Building2, Shield, User } from "lucide-react";

import { useGetMeAdmin, useFindAllManagers } from "../../auth/server-state/adminauth/adminauth.hook";
import { useGetAllEmployee, useGetEmployeeStats, useGetOrgInfo } from "../../auth/server-state/adminother/adminother.hook";

// ── Constants ─────────────────────────────────────────────────────
const BRAND   = "#7A124A";
const BRAND_L = "#b25080";
const GOLD    = "#c9a84c";

const getInitials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();

// ── CSS ───────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .org-root * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes drawV   { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes drawH   { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes shimmer {
    0%   { background-position: -500px 0; }
    100% { background-position:  500px 0; }
  }
  @keyframes countUp { from { opacity:0; } to { opacity:1; } }
  @keyframes spin    { to { transform: rotate(360deg); } }

  .org-card {
    transition: transform 0.22s ease, box-shadow 0.22s ease;
    cursor: default;
  }
  .org-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(122,18,74,0.12) !important;
  }

  .stat-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important;
  }

  .org-scroll::-webkit-scrollbar { height: 5px; width: 5px; }
  .org-scroll::-webkit-scrollbar-track { background: #f0ede8; border-radius: 4px; }
  .org-scroll::-webkit-scrollbar-thumb { background: #c8b0b8; border-radius: 4px; }
`;

// ── Skeleton ──────────────────────────────────────────────────────
function SkeletonCard({ w = 148, h = 100 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 12,
      background: "linear-gradient(90deg, #f0ece8 25%, #e8e0d8 50%, #f0ece8 75%)",
      backgroundSize: "500px 100%",
      animation: "shimmer 1.3s infinite linear",
    }} />
  );
}

// ── Vertical Line ─────────────────────────────────────────────────
function VLine({ h = 36, color = "#ddd0c8", delay = 0 }) {
  return (
    <div style={{
      width: 1.5, height: h, margin: "0 auto", flexShrink: 0,
      background: color,
      transformOrigin: "top",
      animation: `drawV 0.3s ease forwards`,
      animationDelay: `${delay}ms`,
      transform: "scaleY(0)",
    }} />
  );
}

// ── Node Card ─────────────────────────────────────────────────────
function NodeCard({ name, subtitle, initials: init, type = "employee", delay = 0 }) {
  const cfg = {
    admin: {
      w: 176,
      avatarSize: 52, avatarBg: BRAND, avatarFg: "#fff",
      nameSz: 14, subSz: 11,
      bg: "#fff",
      border: `1.5px solid ${BRAND}30`,
      shadow: `0 4px 16px rgba(122,18,74,0.10)`,
      badge: { bg: BRAND, text: "ADMIN" },
      nameColor: "#1a1410",
      subColor: "#8a7060",
    },
    manager: {
      w: 148,
      avatarSize: 42, avatarBg: BRAND_L, avatarFg: "#fff",
      nameSz: 13, subSz: 10,
      bg: "#fff",
      border: `1px solid #e8d8e0`,
      shadow: `0 3px 10px rgba(122,18,74,0.07)`,
      badge: { bg: BRAND_L, text: "MGR" },
      nameColor: "#1a1410",
      subColor: "#8a7060",
    },
    employee: {
      w: 122,
      avatarSize: 34, avatarBg: "#ede0d8", avatarFg: "#5a4035",
      nameSz: 11, subSz: 10,
      bg: "#faf8f5",
      border: `0.5px solid #e4dcd8`,
      shadow: `0 2px 8px rgba(0,0,0,0.05)`,
      badge: null,
      nameColor: "#2a1e18",
      subColor: "#8a7060",
    },
  };

  const c = cfg[type];

  return (
    <div style={{
      animation: `fadeUp 0.4s ease forwards`,
      animationDelay: `${delay}ms`,
      opacity: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
      flexShrink: 0,
    }}>
      <div
        className="org-card"
        style={{
          width: c.w,
          background: c.bg,
          border: c.border,
          borderRadius: type === "admin" ? 16 : type === "manager" ? 14 : 12,
          padding: type === "admin" ? "18px 14px" : type === "manager" ? "14px 12px" : "10px 8px",
          boxShadow: c.shadow,
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative",
        }}
      >
        {c.badge && (
          <span style={{
            position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            padding: "2px 10px", borderRadius: 20,
            background: c.badge.bg, color: "#fff", whiteSpace: "nowrap",
          }}>{c.badge.text}</span>
        )}

        <div style={{
          width: c.avatarSize, height: c.avatarSize,
          borderRadius: "50%",
          background: c.avatarBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: type === "admin" ? 16 : type === "manager" ? 13 : 11,
          fontWeight: 700,
          color: c.avatarFg,
          marginBottom: type === "admin" ? 10 : 8,
          flexShrink: 0,
          boxShadow: type !== "employee" ? `0 3px 10px ${BRAND}30` : "none",
        }}>
          {init}
        </div>

        <p style={{
          fontSize: c.nameSz, fontWeight: 600,
          color: c.nameColor,
          textAlign: "center",
          maxWidth: c.w - 20,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          margin: 0,
        }}>{name}</p>

        <p style={{
          fontSize: c.subSz, marginTop: 3,
          color: c.subColor,
          textAlign: "center",
          maxWidth: c.w - 20,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          margin: "3px 0 0",
        }}>{subtitle}</p>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconColor, iconBg, delay = 0 }) {
  const [count, setCount] = useState(0);
  const num = parseInt(value) || 0;

  useEffect(() => {
    if (!num) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(num / 20));
    const t = setInterval(() => {
      cur = Math.min(cur + step, num);
      setCount(cur);
      if (cur >= num) clearInterval(t);
    }, 45);
    return () => clearInterval(t);
  }, [num]);

  return (
    <div className="stat-card" style={{
      animation: `fadeUp 0.4s ease ${delay}ms forwards`,
      opacity: 0,
      background: "#fff",
      border: "0.5px solid #e8e0d8",
      borderRadius: 14,
      padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      flexShrink: 0,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, color: "#1a1410", lineHeight: 1, margin: 0 }}>{count}</p>
        <p style={{ fontSize: 11, color: "#8a7060", marginTop: 4, fontWeight: 500, margin: "4px 0 0" }}>{label}</p>
      </div>
    </div>
  );
}

// ── Org Tree ──────────────────────────────────────────────────────
function OrgTree({ adminName, orgName, managers, employeesByMgr, loading }) {

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, minWidth: 700 }}>
        <SkeletonCard w={176} h={106} />
        <div style={{ width: 1.5, height: 36, background: "#e8e0d8" }} />
        <div style={{ display: "flex", gap: 36 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              <div style={{ width: 1.5, height: 28, background: "#e8e0d8" }} />
              <SkeletonCard w={148} h={90} />
              <div style={{ width: 1.5, height: 24, background: "#e8e0d8" }} />
              <div style={{ display: "flex", gap: 12 }}>
                {[1, 2, 3].map(j => (
                  <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 1.5, height: 20, background: "#e8e0d8" }} />
                    <SkeletonCard w={122} h={76} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const MGR_GAP = managers.length > 4 ? 16 : 36;
  const EMP_GAP = 12;
  const CONNECTOR = "#ddd0c8";
  const BRAND_CONNECTOR = `${BRAND}44`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: Math.max(700, managers.length * 200) }}>

      {/* Admin node */}
      <NodeCard
        name={orgName || adminName || "Admin"}
        subtitle="Administrator"
        initials={getInitials(
          (orgName || adminName || "Admin").split(" ")[0],
          (orgName || adminName || "AD").split(" ")[1] || "D"
        )}
        type="admin"
        delay={100}
      />

      {/* Admin → managers vertical */}
      {managers.length > 0 && (
        <>
          <VLine h={32} color={BRAND_CONNECTOR} delay={350} />
          {/* Horizontal branch */}
          <div style={{
            width: managers.length === 1 ? 1.5 : `${(managers.length - 1) * (148 + MGR_GAP)}px`,
            height: 1.5,
            background: CONNECTOR,
            transformOrigin: "center",
            animation: "drawH 0.4s ease forwards",
            animationDelay: "420ms",
            transform: "scaleX(0)",
            flexShrink: 0,
          }} />
        </>
      )}

      {/* Managers row */}
      <div style={{ display: "flex", gap: MGR_GAP, justifyContent: "center", alignItems: "flex-start" }}>
        {managers.map((mgr, mi) => {
          const emps = employeesByMgr[mgr._id] || [];
          const mgrDelay = 520 + mi * 90;

          return (
            <div key={mgr._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <VLine h={28} color={CONNECTOR} delay={mgrDelay - 90} />

              <NodeCard
                name={`${mgr.f_name} ${mgr.l_name}`}
                subtitle={mgr.department || mgr.designation || "Manager"}
                initials={getInitials(mgr.f_name, mgr.l_name)}
                type="manager"
                delay={mgrDelay}
              />

              {emps.length > 0 && (
                <>
                  <VLine h={24} color={CONNECTOR} delay={mgrDelay + 130} />
                  <div style={{
                    width: emps.length === 1 ? 1.5 : `${(emps.length - 1) * (122 + EMP_GAP)}px`,
                    height: 1.5,
                    background: CONNECTOR,
                    transformOrigin: "center",
                    animation: "drawH 0.35s ease forwards",
                    animationDelay: `${mgrDelay + 180}ms`,
                    transform: "scaleX(0)",
                    flexShrink: 0,
                  }} />
                </>
              )}

              {/* Employees */}
              <div style={{ display: "flex", gap: EMP_GAP, justifyContent: "center" }}>
                {emps.map((emp, ei) => (
                  <div key={emp._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <VLine h={20} color={CONNECTOR} delay={mgrDelay + 260 + ei * 50} />
                    <NodeCard
                      name={`${emp.f_name} ${emp.l_name}`}
                      subtitle={emp.department || emp.designation || "Employee"}
                      initials={getInitials(emp.f_name, emp.l_name)}
                      type="employee"
                      delay={mgrDelay + 300 + ei * 50}
                    />
                  </div>
                ))}

                {emps.length === 0 && (
                  <div style={{
                    marginTop: 8, padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px dashed #e0d4cc",
                    fontSize: 10, color: "#b0a098",
                    animation: `fadeIn 0.4s ease ${mgrDelay + 200}ms forwards`,
                    opacity: 0,
                    background: "#faf8f5",
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
            marginTop: 12, padding: "12px 24px",
            borderRadius: 12,
            border: "1px dashed #e0d4cc",
            fontSize: 13, color: "#b0a098",
            background: "#faf8f5",
          }}>
            No managers added yet
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function OrganizationPage() {
  const { data: adminData }   = useGetMeAdmin();
  const { data: orgData }     = useGetOrgInfo();
  const { data: managersRes, isLoading: loadingMgrs } = useFindAllManagers();
  const { data: employeesRes, isLoading: loadingEmps } = useGetAllEmployee();
  const { data: statsRes }    = useGetEmployeeStats();

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

  const loading  = loadingMgrs || loadingEmps;
  const orgName  = orgData?.organisation_name || adminData?.organisation_name;
  const adminName = adminData?.username || adminData?.email?.split("@")[0] || "Admin";

  return (
    <div className="org-root" style={{
      minHeight: "100vh",
      background: "#faf8f5",
      position: "relative",
    }}>
      <style>{STYLES}</style>

      {/* Subtle top gradient accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 220,
        background: `linear-gradient(180deg, ${BRAND}08 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Header ── */}
        <div style={{
          animation: "fadeUp 0.4s ease forwards", opacity: 0,
          marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: BRAND,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Crown size={15} style={{ color: "#fff" }} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
              color: BRAND, textTransform: "uppercase",
            }}>
              {orgName || "Organisation"}
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1a1410", lineHeight: 1.2, margin: 0 }}>
            Organization Structure
          </h1>
          <p style={{ fontSize: 13, color: "#8a7060", marginTop: 6, margin: "6px 0 0" }}>
            Live hierarchy · {loading ? "—" : totalAll} total members
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}>
          <StatCard
            label="Total Members"
            value={totalAll}
            icon={Users}
            iconColor={BRAND}
            iconBg={`${BRAND}12`}
            delay={100}
          />
          <StatCard
            label="Managers"
            value={totalMgrs}
            icon={Shield}
            iconColor={BRAND_L}
            iconBg={`${BRAND_L}14`}
            delay={160}
          />
          <StatCard
            label="Employees"
            value={totalEmps}
            icon={User}
            iconColor="#2a7a9a"
            iconBg="#2a7a9a14"
            delay={220}
          />
          <StatCard
            label="Departments"
            value={totalDepts || statsRes?.departments?.length || 0}
            icon={Building2}
            iconColor="#2d7a4a"
            iconBg="#2d7a4a12"
            delay={280}
          />
        </div>

        {/* ── Org Tree Container ── */}
        <div style={{
          animation: "fadeIn 0.5s ease 340ms forwards",
          opacity: 0,
          background: "#fff",
          border: "0.5px solid #e8e0d8",
          borderRadius: 20,
          padding: "44px 28px 36px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Corner accents */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 64, height: 64, borderTop: `1.5px solid ${BRAND}18`, borderLeft: `1.5px solid ${BRAND}18`, borderRadius: "20px 0 0 0", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 64, height: 64, borderBottom: `1.5px solid #e8d8d0`, borderRight: `1.5px solid #e8d8d0`, borderRadius: "0 0 20px 0", pointerEvents: "none" }} />

          <div className="org-scroll" style={{ overflowX: "auto", paddingBottom: 12 }}>
            <OrgTree
              adminName={adminName}
              orgName={orgName}
              managers={managers}
              employeesByMgr={employeesByMgr}
              loading={loading}
            />
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", gap: 20, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { color: BRAND, label: "Admin" },
            { color: BRAND_L, label: "Manager" },
            { color: "#d0c0b8", label: "Employee" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#8a7060" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}