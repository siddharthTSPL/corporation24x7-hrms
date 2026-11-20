import { FaArrowLeft, FaChevronRight } from "react-icons/fa";

export function Header({ title, onBack, right }) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-200 bg-white shrink-0">
      <button type="button" onClick={onBack} title="Back" className="w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 flex items-center justify-center transition-colors">
        <FaArrowLeft className="text-sm" />
      </button>
      <h3 className="text-base font-semibold tracking-tight text-gray-900 flex-1 truncate">{title}</h3>
      {right}
    </div>
  );
}

export function NavRow({ icon: Icon, title, hint, onClick, badge }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-[#FBF3F7]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6E8EF] text-[#730042] transition-colors group-hover:bg-[#730042] group-hover:text-white">
        <Icon className="text-sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        {hint && <span className="block truncate text-xs text-gray-500 mt-0.5">{hint}</span>}
      </span>
      {badge ? <span className="rounded-full bg-[#730042] px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}
      <FaChevronRight className="text-[10px] text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#730042]" />
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#730042]/15 disabled:opacity-50 ${on ? "bg-[#730042]" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function ToggleRow({ title, hint, on, onChange, disabled }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <Switch on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function Section({ title, children, note }) {
  return (
    <>
      {title && <p className="px-6 pt-5 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">{title}</p>}
      <section className={`${title ? "" : "mt-4"} mx-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100`}>{children}</section>
      {note && <p className="px-6 py-2 text-xs leading-relaxed text-gray-500">{note}</p>}
    </>
  );
}

// options: [{ id, label }]
export function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${value === o.id ? "bg-[#730042] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageBody({ children }) {
  return <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pb-6">{children}</div>;
}

export const formatBytes = (n = 0) => {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB"];
  let i = -1;
  let v = n;
  do { v /= 1024; i += 1; } while (v >= 1024 && i < u.length - 1);
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${u[i]}`;
};
