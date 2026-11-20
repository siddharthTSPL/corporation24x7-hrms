import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Inbox } from "lucide-react";
import { Icon, IconTile } from "./icons";

export { Icon, IconTile };

// ── formatting ──
export const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN");
export const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
export const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
export const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); if (dd < 7) return `${dd}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
export const timeLeft = (d) => {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m left`;
  if (h < 48) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
};

// ── design tokens (match the rest of the HRMS) ──
export const BRAND = "#730042";
export const RANK_COLORS = { bronze: "#b4763c", silver: "#8793a1", gold: "#c99700", platinum: "#2a9fb0", diamond: "#3b6df0", master: "#8b46f0", legend: "#d6336c" };
export const TIER_COLORS = { bronze: "#b4763c", silver: "#8793a1", gold: "#c99700", platinum: "#2a9fb0", diamond: "#3b6df0", special: "#7c3aed" };
export const TONES = {
  neutral: { bg: "#f3efec", fg: "#5b4b45" },
  brand: { bg: "#730042", fg: "#ffffff", soft: "#73004214", softFg: "#730042" },
  success: { bg: "#e7f6ee", fg: "#12794a" },
  warning: { bg: "#fdf3dc", fg: "#9a6700" },
  danger: { bg: "#fde9e9", fg: "#b42318" },
  info: { bg: "#e6effd", fg: "#1d4ed8" },
  violet: { bg: "#efe9fd", fg: "#6d28d9" },
};

export const Card = ({ className = "", children, ...rest }) => (
  <div className={`rounded-xl border border-[#ede5e0] bg-white ${className}`} {...rest}>{children}</div>
);

export const Pill = ({ children, color, tone = "neutral", className = "" }) => {
  const t = TONES[tone] || TONES.neutral;
  const style = color ? { background: `${color}14`, color } : { background: t.softFg ? t.soft : t.bg, color: t.softFg || t.fg };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${className}`} style={style}>{children}</span>;
};

export const Skeleton = ({ className = "h-24" }) => <div className={`animate-pulse rounded-xl bg-[#f0eae6] ${className}`} />;

export const Empty = ({ icon, title, hint, action }) => (
  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f3efec] text-[#9c8880]">{icon ? <Icon name={icon} size={20} /> : <Inbox size={20} />}</span>
    <p className="mt-3 text-sm font-semibold text-[#2a1a16]">{title}</p>
    {hint && <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#7a6a64]">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// Section heading used inside pages and cards.
export const SectionTitle = ({ icon, title, right, sub }) => (
  <div className="mb-3 flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-2.5">
      {icon && <span className="mt-0.5 text-[#730042]"><Icon name={icon} size={16} /></span>}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#2a1a16]">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-[#7a6a64]">{sub}</p>}
      </div>
    </div>
    {right}
  </div>
);

export const Avatar = ({ name, photo, size = 36 }) => (
  <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#730042]/10 font-semibold text-[#730042]" style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}>
    {photo ? <img src={photo} alt={name} className="h-full w-full object-cover" /> : initials(name)}
  </div>
);

export const LevelChip = ({ level, rank, small }) => (
  <span className={`inline-flex items-center rounded-md font-semibold text-white ${small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"}`} style={{ background: RANK_COLORS[rank] || BRAND }}>Level {level}</span>
);

export const ProgressBar = ({ value, max, color = BRAND, height = 6 }) => (
  <div className="overflow-hidden rounded-full bg-[#f0eae6]" style={{ height }}>
    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, background: color }} />
  </div>
);

export const XpBar = ({ level, height = 8, showNumbers = true }) => (
  <div>
    <ProgressBar value={Math.round((level?.progress || 0) * 1000)} max={1000} height={height} />
    {showNumbers && (
      <div className="mt-1.5 flex justify-between text-[11px] text-[#7a6a64]">
        <span>{fmt(level?.xpIntoLevel)} XP</span>
        <span>{level?.maxed ? "Maximum level" : `${fmt(level?.xpForLevel - level?.xpIntoLevel)} XP to level ${(level?.level || 1) + 1}`}</span>
      </div>
    )}
  </div>
);

// Underline tabs.
export const Tabs = ({ tabs, value, onChange, className = "" }) => (
  <div className={`flex gap-1 overflow-x-auto border-b border-[#ede5e0] [scrollbar-width:none] ${className}`} role="tablist">
    {tabs.map((t) => {
      const active = value === t.id;
      return (
        <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)}
          className={`relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${active ? "border-[#730042] text-[#730042]" : "border-transparent text-[#7a6a64] hover:text-[#2a1a16]"}`}>
          {t.icon && <Icon name={t.icon} size={15} />}{t.label}
          {t.badge > 0 && <span className="rounded-full bg-[#730042] px-1.5 text-[10px] font-semibold leading-[16px] text-white">{t.badge}</span>}
        </button>
      );
    })}
  </div>
);

// Compact segmented control (period / scope switchers).
export const Segmented = ({ options, value, onChange, className = "" }) => (
  <div className={`inline-flex rounded-lg border border-[#ede5e0] bg-white p-0.5 ${className}`}>
    {options.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${value === k ? "bg-[#730042] text-white" : "text-[#5b4b45] hover:bg-[#faf7f5]"}`}>{l}</button>
    ))}
  </div>
);

export const Button = ({ children, variant = "primary", size = "md", className = "", loading, ...rest }) => {
  const styles = {
    primary: "bg-[#730042] text-white hover:bg-[#5c0035] focus-visible:ring-[#730042]/30",
    pink: "bg-[#730042] text-white hover:bg-[#5c0035] focus-visible:ring-[#730042]/30",
    secondary: "border border-[#ddd2cc] bg-white text-[#2a1a16] hover:bg-[#faf7f5]",
    outline: "border border-[#ddd2cc] bg-white text-[#2a1a16] hover:bg-[#faf7f5]",
    ghost: "text-[#5b4b45] hover:bg-[#f3efec]",
    danger: "border border-[#f3c9c5] bg-white text-[#b42318] hover:bg-[#fde9e9]",
  };
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-[13px]" };
  return (
    <button {...rest} disabled={rest.disabled || loading} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant] || styles.primary} ${sizes[size]} ${className}`}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}{children}
    </button>
  );
};

export const Modal = ({ open, onClose, title, children, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[300] flex items-end justify-center bg-[#2a1a16]/45 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#2a1a16]">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-[#7a6a64] hover:bg-[#f3efec]"><X size={17} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-[#5b4b45]">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-[#9c8880]">{hint}</span>}
  </label>
);
export const inputCls = "w-full rounded-lg border border-[#ddd2cc] bg-white px-3 py-2 text-[13px] text-[#2a1a16] outline-none transition placeholder:text-[#b0a39d] focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/15";

export const Toggle = ({ checked, onChange, label, disabled }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-[#730042]" : "bg-[#d9cfc9]"} ${disabled ? "opacity-50" : ""}`}>
    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
  </button>
);

// KPI tile.
export const Stat = ({ icon, label, value, sub, color = BRAND }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#7a6a64]">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#2a1a16]">{value}</p>
        {sub && <p className="mt-1 truncate text-[11px] text-[#9c8880]">{sub}</p>}
      </div>
      {icon && <IconTile name={icon} color={color} size={34} />}
    </div>
  </Card>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-[#2a1a16]">{title}</h1>
      {subtitle && <p className="mt-0.5 text-[13px] text-[#7a6a64]">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
