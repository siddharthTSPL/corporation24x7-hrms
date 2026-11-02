import { useId, useRef } from "react";
import { X, Loader2, CalendarOff } from "lucide-react";
import { cx } from "./meetingClasses";
import { useDialogFocus, useEsc } from "./meetingHooks";
import "./meetingA11y.css";

const BTN = {
  primary: "bg-[#730042] text-white hover:bg-[#5c0035] disabled:bg-[#730042]/40",
  secondary: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 disabled:text-gray-400",
  soft: "bg-[#730042]/10 text-[#730042] hover:bg-[#730042]/15 disabled:opacity-50",
  ghost: "text-gray-600 hover:bg-gray-100 disabled:text-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  dangerSoft: "text-red-600 hover:bg-red-50 disabled:text-red-300",
};
const SIZE = {
  sm: "h-9 px-3 text-xs gap-1.5 sm:h-8",
  md: "h-11 px-4 text-sm gap-2 sm:h-10",
  icon: "h-10 w-10 justify-center sm:h-8 sm:w-8",
};

export function Btn({ variant = "primary", size = "md", loading, className, children, disabled, ...p }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap disabled:cursor-not-allowed",
        BTN[variant],
        SIZE[size],
        className,
      )}
      {...p}
    >
      {loading && <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
}

const TONES = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  brand: "bg-[#730042]/10 text-[#730042]",
  live: "bg-red-600 text-white",
};
export const Chip = ({ tone = "gray", className, children }) => (
  <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONES[tone], className)}>{children}</span>
);

export const Field = ({ label, hint, children, className }) => (
  <label className={cx("block", className)}>
    <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-600">{hint}</span>}
  </label>
);

export const Spinner = ({ className }) => (
  <div role="status" aria-label="Loading" className={cx("flex justify-center py-12 text-[#730042]", className)}>
    <Loader2 className="animate-spin motion-reduce:animate-none" size={22} />
  </div>
);

export const Skeleton = ({ className }) => <div aria-hidden="true" className={cx("animate-pulse rounded-md bg-gray-200/80 motion-reduce:animate-none", className)} />;

export const SkeletonList = ({ rows = 4, className }) => (
  <div role="status" aria-label="Loading" className={cx("space-y-3 p-5", className)}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export const Empty = ({ icon: Icon = CalendarOff, title, hint, action }) => (
  <div className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
      <Icon size={22} aria-hidden="true" />
    </div>
    <p className="text-sm font-medium text-gray-900">{title}</p>
    {hint && <p className="mt-1 max-w-xs text-sm text-gray-600">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorNote = ({ error, retry }) => (
  <div role="alert" className="m-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <span className="min-w-0 flex-1">{error?.message || "Couldn't load this."}</span>
    {retry && (
      <Btn variant="secondary" size="sm" onClick={() => retry()}>
        Try again
      </Btn>
    )}
  </div>
);

export function QueryState({ query, skeleton, children }) {
  if (query.isLoading) return skeleton || <SkeletonList />;
  if (query.isError) return <ErrorNote error={query.error} retry={query.refetch} />;
  return children;
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null);
  const titleId = useId();
  useEsc(open, onClose);
  useDialogFocus(open, ref);
  if (!open) return null;
  return (
    <div className="mtg-root fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx("flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:h-8 sm:w-8">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="mtg-safe-b flex justify-end gap-2 border-t border-gray-100 px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, label, children }) {
  const ref = useRef(null);
  useEsc(open, onClose);
  useDialogFocus(open, ref);
  if (!open) return null;
  return (
    <div className="mtg-root fixed inset-0 z-[70] flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label || "Meeting details"} className="flex h-full w-full flex-col bg-white shadow-2xl outline-none sm:max-w-xl">
        {children}
      </aside>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className, label = "Sections", idPrefix = "tab" }) {
  const move = (e, i) => {
    const last = tabs.length - 1;
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`${idPrefix}-${tabs[next].id}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cx("flex gap-1 overflow-x-auto border-b border-gray-200 [scrollbar-width:none]", className)}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          id={`${idPrefix}-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-controls={`${idPrefix}panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => move(e, i)}
          className={cx(
            "relative -mb-px min-h-11 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:min-h-10",
            value === t.id ? "border-[#730042] text-[#730042]" : "border-transparent text-gray-600 hover:text-gray-900",
          )}
        >
          {t.label}
          {t.badge > 0 && (
            <span className="ml-1.5 rounded-full bg-[#CD166E] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {t.badge}
              <span className="sr-only"> pending</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export const TabPanel = ({ id, active, idPrefix = "tab", children, className }) =>
  active ? (
    <div role="tabpanel" id={`${idPrefix}panel-${id}`} aria-labelledby={`${idPrefix}-${id}`} tabIndex={0} className={className}>
      {children}
    </div>
  ) : null;
