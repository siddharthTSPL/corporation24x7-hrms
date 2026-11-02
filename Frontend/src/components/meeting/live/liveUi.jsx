import toast from "react-hot-toast";

// small shared bits for the dark live panels
export const act = (fn) => Promise.resolve().then(fn).catch((err) => toast.error(err?.message || "Something went wrong."));

export const darkInput =
  "w-full rounded-xl bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#CD166E]/50 disabled:opacity-50";

export function PillButton({ children, onClick, tone = "default", disabled, className = "", title, type = "button" }) {
  const tones = {
    default: "bg-white/10 text-white hover:bg-white/20",
    brand: "bg-[#730042] text-white hover:bg-[#8c0050]",
    danger: "bg-red-500/20 text-red-300 hover:bg-red-500/30",
    light: "bg-white text-gray-900 hover:bg-gray-200",
    ghost: "text-gray-300 hover:bg-white/10",
  };
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

export function Empty({ icon, title, hint }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl">{icon}</div>
      <p className="text-sm font-medium text-gray-200">{title}</p>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
      {tabs.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${value === id ? "bg-white text-gray-900" : "text-gray-300 hover:bg-white/10"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
