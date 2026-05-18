import { PRIORITY_CONFIG, AUDIENCE_CONFIG, PRIORITY_STYLES } from "./constants";
import { C } from "./constants";

/* ── Admin: Tailwind-based priority badge ─────────────────────────────────── */
export function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ── Admin: Tailwind-based audience badge ─────────────────────────────────── */
export function AudienceBadge({ audience }) {
  const cfg = AUDIENCE_CONFIG[audience];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/* ── Employee/Manager: inline-style priority pill ─────────────────────────── */
export function PriorityPill({ priority }) {
  const s = PRIORITY_STYLES[(priority || "low").toLowerCase()] || PRIORITY_STYLES.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 500, letterSpacing: ".1em",
      textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif",
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

/* ── Manager: inline-style audience pill ─────────────────────────────────── */
export function AudiencePill({ audience }) {
  const isManagers = (audience || "").toLowerCase() === "managers";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 500, letterSpacing: ".1em",
      textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif",
      background: isManagers ? C.midA10 : C.deepA10,
      border: `1px solid ${isManagers ? C.midA25 : C.deepA15}`,
      color: C.deep,
    }}>
      {isManagers ? "Managers" : "All Staff"}
    </span>
  );
}