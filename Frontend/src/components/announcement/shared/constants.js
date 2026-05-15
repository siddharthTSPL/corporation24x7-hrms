// ── Inline-style color palette (used by employee & manager views) ─────────────
export const C = {
  deep:    "#730042",
  mid:     "#CD166E",
  cream:   "#F9F8F2",
  white:   "#ffffff",
  deepA10: "rgba(115,0,66,0.10)",
  deepA15: "rgba(115,0,66,0.15)",
  deepA25: "rgba(115,0,66,0.25)",
  deepA45: "rgba(115,0,66,0.45)",
  deepA55: "rgba(115,0,66,0.55)",
  midA10:  "rgba(205,22,110,0.10)",
  midA20:  "rgba(205,22,110,0.20)",
  midA25:  "rgba(205,22,110,0.25)",
};

// ── Admin Tailwind priority config ────────────────────────────────────────────
export const PRIORITY_CONFIG = {
  high:   { badge: "bg-[#FCEBEB] text-[#791F1F] border border-[#F09595]", dot: "bg-[#E24B4A]", label: "High" },
  medium: { badge: "bg-[#FAEEDA] text-[#633806] border border-[#FAC775]", dot: "bg-[#BA7517]", label: "Medium" },
  low:    { badge: "bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97]", dot: "bg-[#639922]", label: "Low" },
};

// ── Admin Tailwind audience config ────────────────────────────────────────────
export const AUDIENCE_CONFIG = {
  all:       { label: "All",       color: "bg-[#EEEDFE] text-[#3C3489]" },
  employees: { label: "Employees", color: "bg-[#E6F1FB] text-[#0C447C]" },
  managers:  { label: "Managers",  color: "bg-[#FBEAF0] text-[#730042]" },
};

// ── Inline-style priority styles (employee & manager) ─────────────────────────
export const PRIORITY_STYLES = {
  high:   { label: "Urgent",  bg: "rgba(205,22,110,0.10)", border: "rgba(205,22,110,0.25)", color: "#730042" },
  medium: { label: "Info",    bg: "rgba(115,0,66,0.10)",   border: "rgba(115,0,66,0.15)",   color: "#730042" },
  low:    { label: "General", bg: "rgba(249,248,242,0.9)", border: "rgba(115,0,66,0.15)",   color: "#730042" },
};

export const AVATAR_BG = ["#730042", "#993556", "#72243E", "#CD166E", "#4B1528"];

export const EMPTY_FORM = {
  title: "", message: "", audience: "all",
  priority: "low", notice_image: "", expiresAt: "",
};