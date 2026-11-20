import { Star } from "lucide-react";

export default function Stars({ value, onChange, size = 28, label = "Rating" }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : "img"} aria-label={onChange ? label : `${label}: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role={onChange ? "radio" : undefined}
          aria-checked={onChange ? value === n : undefined}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          tabIndex={onChange ? (value === n || (!value && n === 1) ? 0 : -1) : -1}
          onClick={() => onChange?.(n)}
          onKeyDown={(e) => {
            if (!onChange) return;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(Math.min(5, (value || 0) + 1));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(Math.max(1, (value || 2) - 1));
            }
          }}
          disabled={!onChange}
          className={onChange ? "flex h-11 w-11 items-center justify-center rounded-lg sm:h-auto sm:w-auto sm:p-0.5" : "disabled:cursor-default"}
        >
          <Star size={size} aria-hidden="true" className={n <= value ? "fill-amber-400 text-amber-500" : "text-gray-400"} />
        </button>
      ))}
    </div>
  );
}
