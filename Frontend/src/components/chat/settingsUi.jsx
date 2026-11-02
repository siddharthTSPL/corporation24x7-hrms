import { FaArrowLeft, FaChevronRight } from "react-icons/fa";

export function Header({ title, onBack, right }) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white shrink-0">
      <button type="button" onClick={onBack} title="Back" className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
        <FaArrowLeft className="text-sm" />
      </button>
      <h3 className="text-base font-bold text-gray-900 flex-1 truncate">{title}</h3>
      {right}
    </div>
  );
}

export function NavRow({ icon: Icon, title, hint, onClick, badge }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6E8EF] text-[#730042]">
        <Icon className="text-sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-gray-900">{title}</span>
        {hint && <span className="block truncate text-xs text-gray-500">{hint}</span>}
      </span>
      {badge ? <span className="rounded-full bg-[#730042] px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}
      <FaChevronRight className="text-[10px] text-gray-300" />
    </button>
  );
}

export function Switch({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-[#730042]" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export function ToggleRow({ title, hint, on, onChange, disabled }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-gray-900">{title}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      <Switch on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function Section({ title, children, note }) {
  return (
    <>
      {title && <p className="px-5 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#730042]">{title}</p>}
      <section className={`${title ? "" : "mt-2"} divide-y divide-gray-50 bg-white`}>{children}</section>
      {note && <p className="px-5 py-2 text-xs text-gray-500">{note}</p>}
    </>
  );
}

// options: [{ id, label }]
export function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-gray-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${value === o.id ? "bg-[#730042] text-white shadow" : "text-gray-600 hover:text-gray-900"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageBody({ children }) {
  return <div className="flex-1 min-h-0 overflow-y-auto pb-6">{children}</div>;
}

export const formatBytes = (n = 0) => {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB"];
  let i = -1;
  let v = n;
  do { v /= 1024; i += 1; } while (v >= 1024 && i < u.length - 1);
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${u[i]}`;
};
