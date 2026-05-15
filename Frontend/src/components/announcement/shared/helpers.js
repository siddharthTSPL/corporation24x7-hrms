export const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

export const fmtTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export const fmtShortDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const excerpt = (text, len = 130) => {
  if (!text) return "";
  return text.length > len ? text.slice(0, len).trimEnd() + "…" : text;
};

export const inputCls =
  "w-full px-3 py-2.5 border border-[#F4C0D1] rounded-[9px] bg-[#F9F8F2] text-[13px] text-[#730042] " +
  "outline-none focus:border-[#CD166E] focus:ring-2 focus:ring-[#CD166E]/20 transition-all placeholder-[#993556]/40 font-[inherit]";