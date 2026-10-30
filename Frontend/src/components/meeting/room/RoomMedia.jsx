import { useEffect, useRef } from "react";

export function MediaView({ stream, muted = false, mirror = false, hidden = false, contain = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = stream || null;
    if (el.srcObject !== next) el.srcObject = next;
    if (next) el.play().catch(() => {});
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${hidden ? "absolute h-0 w-0 opacity-0 pointer-events-none" : `h-full w-full ${contain ? "object-contain" : "object-cover"}`} ${mirror ? "-scale-x-100" : ""}`}
    />
  );
}

export function RoomButton({ onClick, active = false, danger = false, disabled = false, title, badge, children, className = "", wide = false }) {
  const tone = danger
    ? "bg-red-600 text-white hover:bg-red-700"
    : active
      ? "bg-white text-gray-900 hover:bg-gray-200"
      : "bg-white/10 text-white hover:bg-white/20";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`relative flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-[15px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 ${wide ? "px-5" : "w-11 sm:w-12"} ${tone} ${className}`}
    >
      {children}
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#CD166E] px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[#16161a]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function PanelHeader({ title, subtitle, onClose, right }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {subtitle ? <p className="truncate text-xs text-gray-400">{subtitle}</p> : null}
      </div>
      {right}
      <button type="button" onClick={onClose} aria-label="Close panel" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 2l10 10M12 2L2 12" />
        </svg>
      </button>
    </div>
  );
}
