import toast from "react-hot-toast";

export const act = (fn) => Promise.resolve().then(fn).catch((err) => toast.error(err?.message || "Something went wrong."));

export const darkInput =
  "w-full rounded-xl bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#CD166E]/50 disabled:opacity-50";

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
