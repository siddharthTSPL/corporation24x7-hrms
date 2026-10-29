import { useEffect } from "react";
import { X, Loader2, CalendarOff } from "lucide-react";

export const cx = (...a) => a.filter(Boolean).join(" ");

const BTN = {
  primary: "bg-[#730042] text-white hover:bg-[#5c0035] disabled:bg-[#730042]/40",
  secondary: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 disabled:text-gray-400",
  soft: "bg-[#730042]/10 text-[#730042] hover:bg-[#730042]/15 disabled:opacity-50",
  ghost: "text-gray-600 hover:bg-gray-100 disabled:text-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  dangerSoft: "text-red-600 hover:bg-red-50 disabled:text-red-300",
};
const SIZE = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-10 px-4 text-sm gap-2", icon: "h-8 w-8 justify-center" };

export function Btn({ variant = "primary", size = "md", loading, className, children, disabled, ...p }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center rounded-lg font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#730042] disabled:cursor-not-allowed",
        BTN[variant],
        SIZE[size],
        className,
      )}
      {...p}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

const TONES = {
  gray: "bg-gray-100 text-gray-600",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-600",
  brand: "bg-[#730042]/10 text-[#730042]",
  live: "bg-red-600 text-white",
};
export const Chip = ({ tone = "gray", className, children }) => (
  <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONES[tone], className)}>{children}</span>
);

export const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#730042] focus:outline-none focus:ring-2 focus:ring-[#730042]/20 disabled:bg-gray-50";

export const Field = ({ label, hint, children, className }) => (
  <label className={cx("block", className)}>
    <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
  </label>
);

export const Spinner = ({ className }) => (
  <div className={cx("flex justify-center py-12 text-[#730042]", className)}>
    <Loader2 className="animate-spin" size={22} />
  </div>
);

export const Empty = ({ icon: Icon = CalendarOff, title, hint, action }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      <Icon size={22} />
    </div>
    <p className="text-sm font-medium text-gray-800">{title}</p>
    {hint && <p className="mt-1 max-w-xs text-sm text-gray-500">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorNote = ({ error, retry }) => (
  <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    {error?.message || "Couldn't load this."}{" "}
    {retry && (
      <button onClick={retry} className="font-medium underline">
        Try again
      </button>
    )}
  </div>
);

const useEsc = (open, onClose) =>
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-xl">{children}</aside>
    </div>
  );
}

export const Tabs = ({ tabs, value, onChange, className }) => (
  <div role="tablist" className={cx("flex gap-1 overflow-x-auto border-b border-gray-200", className)}>
    {tabs.map((t) => (
      <button
        key={t.id}
        role="tab"
        aria-selected={value === t.id}
        onClick={() => onChange(t.id)}
        className={cx(
          "relative -mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
          value === t.id ? "border-[#730042] text-[#730042]" : "border-transparent text-gray-500 hover:text-gray-800",
        )}
      >
        {t.label}
        {t.badge > 0 && <span className="ml-1.5 rounded-full bg-[#CD166E] px-1.5 py-0.5 text-[10px] font-semibold text-white">{t.badge}</span>}
      </button>
    ))}
  </div>
);
