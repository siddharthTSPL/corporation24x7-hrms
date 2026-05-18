import { PriorityBadge, AudienceBadge } from "../../../components/announcement/shared/Badges";
import { fmtShortDate } from "../../../components/announcement/shared/helpers";
import { AVATAR_BG } from "../../../components/announcement/shared/constants";
import { IconMegaphone, IconAlert, IconGlobe, IconClock, IconFile } from "./Icons";

/* ── Image placeholder ────────────────────────────────────────────────────── */
export function ImageOrPlaceholder({ src, alt, className, placeholderBg }) {
  if (src && /^https?:\/\/.+/.test(src)) {
    return (
      <img src={src} alt={alt} className={className}
        onError={(e) => (e.target.style.display = "none")} />
    );
  }
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: placeholderBg }}>
      <IconMegaphone size={22} color="rgba(255,255,255,0.28)" />
    </div>
  );
}

/* ── Field wrapper ────────────────────────────────────────────────────────── */
export function Field({ label, optional, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#993556]">
        {label}{" "}
        {optional
          ? <span className="font-normal normal-case text-[#B4B2A9] text-[10px]">(optional)</span>
          : <span className="text-[#A32D2D] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-[#A32D2D]">{error}</p>}
    </div>
  );
}

/* ── Modal overlay ────────────────────────────────────────────────────────── */
export function ModalOverlay({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(115,0,66,0.32)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

/* ── Skeleton rows ────────────────────────────────────────────────────────── */
export function SkeletonRows() {
  return [...Array(3)].map((_, i) => (
    <tr key={i}>
      {[...Array(7)].map((_, j) => (
        <td key={j} className="px-5 py-4">
          <div className={`bg-[#FBEAF0] rounded-lg animate-pulse ${j === 0 ? "w-10 h-10 rounded-xl" : "h-3"}`} />
        </td>
      ))}
    </tr>
  ));
}

/* ── Stat cards ───────────────────────────────────────────────────────────── */
export function StatCards({ announcements }) {
  const stats = [
    { label: "Total",         value: announcements.length,
      icon: <IconFile  size={18} color="#CD166E" />, bg: "bg-[#FBEAF0]" },
    { label: "High priority", value: announcements.filter((a) => a.priority === "high").length,
      icon: <IconAlert size={18} color="#A32D2D" />, bg: "bg-[#FCEBEB]" },
    { label: "Audience: all", value: announcements.filter((a) => a.audience === "all").length,
      icon: <IconGlobe size={18} color="#3C3489" />, bg: "bg-[#EEEDFE]" },
    { label: "With expiry",   value: announcements.filter((a) => a.expiresAt && new Date(a.expiresAt) > new Date()).length,
      icon: <IconClock size={18} color="#633806" />, bg: "bg-[#FAEEDA]" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-xl border border-[#F4C0D1] p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>{s.icon}</div>
          <div>
            <div className="text-xl font-semibold text-[#730042]">{s.value}</div>
            <div className="text-[11px] text-[#993556] mt-0.5">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Latest preview cards ─────────────────────────────────────────────────── */
export function LatestCards({ announcements }) {
  if (!announcements.length) return null;
  return (
    <div className="mb-8">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#993556] mb-3">Latest announcements</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcements.slice(0, 3).map((item, idx) => (
          <div key={item._id}
            className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden hover:-translate-y-0.5 transition-transform duration-200">
            <ImageOrPlaceholder
              src={item.notice_image} alt={item.title}
              className="w-full h-32 object-cover"
              placeholderBg={AVATAR_BG[idx % AVATAR_BG.length]}
            />
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <PriorityBadge priority={item.priority} />
                <AudienceBadge audience={item.audience} />
              </div>
              <p className="text-[13px] font-semibold text-[#730042] truncate mb-1">{item.title}</p>
              <p className="text-[11px] text-[#993556] line-clamp-2 leading-relaxed">{item.message}</p>
              {item.expiresAt && (
                <p className="text-[10px] text-[#B4B2A9] mt-2">Expires {fmtShortDate(item.expiresAt)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}