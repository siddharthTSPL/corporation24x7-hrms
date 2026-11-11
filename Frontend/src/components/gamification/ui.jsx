import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN");
export const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

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
  if (ms <= 0) return "ended";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m left`;
  if (h < 48) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
};

export const RANK_COLORS = { bronze: "#b4763c", silver: "#9aa5b1", gold: "#e0a800", platinum: "#2fb5c4", diamond: "#4f7cff", master: "#9b4dff", legend: "#ff3d7f" };
export const TIER_COLORS = { bronze: "#b4763c", silver: "#9aa5b1", gold: "#e0a800", platinum: "#2fb5c4", diamond: "#4f7cff", special: "#c026d3" };

export const Card = ({ className = "", children, ...rest }) => (
  <div className={`rounded-2xl border border-gray-200/80 bg-white shadow-sm ${className}`} {...rest}>{children}</div>
);

export const Pill = ({ children, color = "#730042", className = "" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`} style={{ background: `${color}18`, color }}>{children}</span>
);

export const Skeleton = ({ className = "h-24" }) => <div className={`animate-pulse rounded-2xl bg-gray-200/70 ${className}`} />;

export const Empty = ({ icon = "🎈", title, hint }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-4xl">{icon}</div>
    <p className="mt-2 font-semibold text-gray-700">{title}</p>
    {hint && <p className="mt-1 max-w-sm text-sm text-gray-500">{hint}</p>}
  </div>
);

export const SectionTitle = ({ icon, title, right, sub }) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div>
      <h3 className="flex items-center gap-2 text-base font-bold text-gray-800">{icon && <span>{icon}</span>}{title}</h3>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
    {right}
  </div>
);

// Avatar with the equipped frame as a gradient ring.
export const Avatar = ({ name, photo, frame, size = 44, ring = true }) => {
  const css = frame?.css;
  const pad = css && ring ? Math.max(2, Math.round(size / 16)) : 0;
  return (
    <div className={`shrink-0 rounded-full ${frame?.animated ? "gam-spin-ring" : ""}`} style={{ width: size, height: size, padding: pad, background: css || "transparent" }}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#730042] to-[#cd166e] text-white ring-2 ring-white" style={{ fontSize: size * 0.36 }}>
        {photo ? <img src={photo} alt={name} className="h-full w-full object-cover" /> : <span className="font-bold">{initials(name)}</span>}
      </div>
    </div>
  );
};

export const LevelChip = ({ level, rank, small }) => (
  <span className={`inline-flex items-center gap-1 rounded-full font-bold text-white ${small ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`} style={{ background: RANK_COLORS[rank] || "#730042" }}>
    Lv {level}
  </span>
);

export const XpBar = ({ level, height = 10, showNumbers = true }) => {
  const pct = Math.round((level?.progress || 0) * 100);
  return (
    <div>
      <div className="overflow-hidden rounded-full bg-gray-200" style={{ height }}>
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#730042] via-[#cd166e] to-[#ff7ab8]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
      {showNumbers && (
        <div className="mt-1 flex justify-between text-[11px] text-gray-500">
          <span>{fmt(level?.xpIntoLevel)} XP</span>
          <span>{level?.maxed ? "MAX LEVEL" : `${fmt(level?.xpForLevel)} XP to Lv ${(level?.level || 1) + 1}`}</span>
        </div>
      )}
    </div>
  );
};

export const ProgressBar = ({ value, max, color = "#730042", height = 8 }) => (
  <div className="overflow-hidden rounded-full bg-gray-200" style={{ height }}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, background: color }} />
  </div>
);

export const Tabs = ({ tabs, value, onChange, className = "" }) => (
  <div className={`flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-200 [scrollbar-width:none] ${className}`}>
    {tabs.map((t) => (
      <button key={t.id} onClick={() => onChange(t.id)} className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${value === t.id ? "bg-[#730042] text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>
        {t.icon && <span>{t.icon}</span>}{t.label}
        {t.badge > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${value === t.id ? "bg-white text-[#730042]" : "bg-[#cd166e] text-white"}`}>{t.badge}</span>}
      </button>
    ))}
  </div>
);

export const Button = ({ children, variant = "primary", className = "", loading, ...rest }) => {
  const styles = {
    primary: "bg-[#730042] text-white hover:bg-[#5c0035]",
    pink: "bg-gradient-to-r from-[#730042] to-[#cd166e] text-white hover:opacity-90",
    ghost: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  };
  return (
    <button {...rest} disabled={rest.disabled || loading} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}{children}
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
        <motion.div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
          <motion.div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`} initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 300 }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
              <button onClick={onClose} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
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
    <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
    {children}
    {hint && <span className="mt-0.5 block text-[11px] text-gray-400">{hint}</span>}
  </label>
);
export const inputCls = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/15";

export const Stat = ({ icon, label, value, sub, color = "#730042" }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `${color}15` }}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="text-xl font-extrabold text-gray-800">{value}</p>
        {sub && <p className="truncate text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  </Card>
);
