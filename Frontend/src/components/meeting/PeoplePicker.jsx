import { useState } from "react";
import { Search, X } from "lucide-react";
import Avatar from "../chat/Avatar";
import { useDirectorySearch } from "../../auth/server-state/chat/chat.hook";
import { inputCls } from "./ui";

// value: array of directory people ({ key, id, model, name, photo, designation, department })
export default function PeoplePicker({ value = [], onChange, placeholder = "Search by name, ID or department", disabled }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: results = [], isFetching } = useDirectorySearch(q, { enabled: open && !disabled });

  const picked = new Set(value.map((p) => p.key));
  const options = results.filter((p) => !picked.has(p.key));
  const add = (p) => {
    onChange([...value, p]);
    setQ("");
  };

  return (
    <div className="relative">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-2 text-xs text-gray-700">
              <Avatar name={p.name} photo={p.photo} size={20} />
              {p.name}
              {!disabled && (
                <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((x) => x.key !== p.key))} className="text-gray-400 hover:text-gray-700">
                  <X size={13} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className={`${inputCls} pl-9`}
          value={q}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">{isFetching ? "Searching…" : "No one found"}</li>}
          {options.map((p) => (
            <li key={p.key}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
                <Avatar name={p.name} photo={p.photo} size={28} />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-gray-900">{p.name}</span>
                  <span className="block truncate text-xs text-gray-500">{[p.designation, p.department].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
