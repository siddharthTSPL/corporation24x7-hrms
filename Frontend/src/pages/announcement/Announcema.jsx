import { useState } from "react";
import { FaLock, FaPlus, FaPen, FaTrash } from "react-icons/fa";
import {
  useManagerAnnouncements,
  useParticularAnnouncement,
} from "../../auth/server-state/manager/managerannounce/managerannounce.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

/**
 * Color reference (used only as a guide for the arbitrary Tailwind values below):
 * deep    #730042
 * mid     #CD166E
 * cream   #F9F8F2
 * white   #ffffff
 * Opacity variants are expressed with Tailwind's color/opacity modifier, e.g. bg-[#730042]/10
 */

const PERMS = {
  view: "announcements.can_view_announcements",
  create: "announcements.can_create_announcement",
  edit: "announcements.can_edit_announcement",
  delete: "announcements.can_delete_announcement",
};

const FontInjector = () => (
  <style>{`
    * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.25} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  `}</style>
);

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};
const fmtTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
const excerpt = (text, len = 130) => {
  if (!text) return "";
  return text.length > len ? text.slice(0, len).trimEnd() + "…" : text;
};

// Static, fully-written class strings (never built via runtime concatenation)
// so Tailwind's scanner can pick them all up.
const PRIORITY_STYLES = {
  high: {
    label: "Urgent",
    className: "bg-[#CD166E]/10 border-[#CD166E]/25 text-[#730042]",
  },
  medium: {
    label: "Info",
    className: "bg-[#730042]/10 border-[#730042]/15 text-[#730042]",
  },
  low: {
    label: "General",
    className: "bg-[#F9F8F2]/90 border-[#730042]/15 text-[#730042]",
  },
};

const PriorityPill = ({ priority }) => {
  const s =
    PRIORITY_STYLES[(priority || "low").toLowerCase()] || PRIORITY_STYLES.low;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-[10px] font-medium uppercase tracking-[.1em] font-sans ${s.className}`}
    >
      {s.label}
    </span>
  );
};

const AudiencePill = ({ audience }) => {
  const isManagers = (audience || "").toLowerCase() === "managers";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-[10px] font-medium uppercase tracking-[.1em] font-sans text-[#730042] ${
        isManagers
          ? "bg-[#CD166E]/10 border-[#CD166E]/25"
          : "bg-[#730042]/10 border-[#730042]/15"
      }`}
    >
      {isManagers ? "Managers" : "All Staff"}
    </span>
  );
};

const AccessDenied = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F9F8F2] font-sans px-4 sm:px-6">
    <div className="text-center max-w-[360px]">
      <div className="w-[84px] h-[84px] rounded-full bg-[#730042]/10 flex items-center justify-center mx-auto mb-5">
        <FaLock size={30} className="text-[#730042]" />
      </div>
      <h2 className="text-[clamp(22px,5vw,28px)] font-semibold text-[#730042] mb-2 font-sans">
        Access Restricted
      </h2>
      <p className="text-sm text-[#730042]/55 leading-relaxed m-0">
        You don't have permission to use announcements. Contact your admin to
        request access.
      </p>
    </div>
  </div>
);

const DetailModal = ({ id, onClose, canEdit, canDelete, onEdit, onDelete }) => {
  const { data, isLoading, error } = useParticularAnnouncement(id);
  const ann = data?.announcement;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[9999] bg-[#730042]/[0.18] flex items-center justify-center p-3 sm:p-5 backdrop-blur-[4px]"
    >
      <div className="bg-[#F9F8F2] rounded-[20px] border-[.5px] border-[#CD166E]/25 w-full max-w-[600px] max-h-[90vh] sm:max-h-[88vh] overflow-y-auto font-sans shadow-[0_24px_48px_rgba(115,0,66,0.12)]">
        <div className="bg-white px-4 py-4 sm:px-6 sm:py-[18px] border-b-[.5px] border-[#730042]/10 flex items-center justify-between rounded-t-[20px] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-[#CD166E]/10 border-[.5px] border-[#CD166E]/25 flex items-center justify-center">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#CD166E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[11px] font-medium tracking-[.14em] uppercase text-[#730042]">
              Announcement detail
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg bg-[#730042]/10 border-none cursor-pointer text-[#730042] text-base flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pt-6 pb-8 sm:px-7 sm:pt-7 sm:pb-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-9 h-9 border-[3px] border-[#730042]/10 border-t-[#CD166E] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[#730042]/45 text-[13px] m-0">Loading…</p>
            </div>
          ) : error || !ann ? (
            <p className="text-[#730042]/45 text-center py-8">
              Announcement not found.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2.5 flex-wrap mb-4">
                {ann.priority && <PriorityPill priority={ann.priority} />}
                {ann.audience && <AudiencePill audience={ann.audience} />}
                <span className="ml-auto text-[11px] text-[#730042]/45">
                  {fmtDate(ann.createdAt)} · {fmtTime(ann.createdAt)}
                </span>
              </div>

              <h2 className="font-sans text-[clamp(20px,5vw,28px)] font-semibold text-[#730042] leading-tight m-0 tracking-[-0.3px]">
                {ann.title}
              </h2>

              <div className="h-[.5px] bg-[#CD166E]/20 my-[18px]" />

              <p className="text-[15px] text-[#730042]/55 leading-[1.85] m-0">
                {ann.body ||
                  ann.content ||
                  ann.message ||
                  ann.description ||
                  "No content available."}
              </p>

              {ann.expiresAt && (
                <div className="mt-5 px-4 py-3 bg-[#730042]/10 rounded-[10px] border-[.5px] border-[#730042]/15 flex items-center gap-2">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#730042"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span className="text-xs text-[#730042]">
                    Expires {fmtDate(ann.expiresAt)}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 mt-6 pt-5 border-t-[.5px] border-[#730042]/10">
                {canEdit ? (
                  <button
                    onClick={() => onEdit(ann)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] border-none text-[12.5px] font-medium font-sans bg-[#730042] text-white cursor-pointer hover:brightness-95"
                  >
                    <FaPen size={11} /> Edit
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] border-none text-[12.5px] font-medium font-sans bg-[#730042]/10 text-[#730042]/45 cursor-not-allowed"
                  >
                    <FaLock size={11} /> Edit
                  </button>
                )}
                {canDelete ? (
                  <button
                    onClick={() => onDelete(ann)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[12.5px] font-medium font-sans bg-[#CD166E]/10 text-[#CD166E] border border-[#CD166E]/25 cursor-pointer hover:brightness-95"
                  >
                    <FaTrash size={11} /> Delete
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] border-none text-[12.5px] font-medium font-sans bg-[#730042]/10 text-[#730042]/45 cursor-not-allowed"
                  >
                    <FaLock size={11} /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const AnnCard = ({ ann, index, onClick, canEdit, canDelete, onEdit, onDelete }) => {
  const isFeatured = index === 0;

  return (
    <div
      onClick={() => onClick(ann._id)}
      className={`group bg-white border-[.5px] border-[#730042]/15 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden font-sans hover:border-[#CD166E]/45 hover:-translate-y-[3px] animate-[fadeUp_0.4s_ease_both] ${
        isFeatured
          ? "p-5 pt-7 sm:p-7 sm:pt-[30px] col-span-full"
          : "p-4 pt-[22px] sm:p-[22px] sm:pt-[22px]"
      }`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {isFeatured && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#CD166E]" />
      )}

      <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {ann.priority && <PriorityPill priority={ann.priority} />}
          {ann.audience && <AudiencePill audience={ann.audience} />}
          {isFeatured && (
            <span className="text-[10px] font-medium text-[#CD166E] tracking-[.14em] uppercase flex items-center gap-1">
              <svg width="8" height="8" viewBox="0 0 10 10" fill="#CD166E">
                <circle cx="5" cy="5" r="5" />
              </svg>
              Featured
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#730042]/45 tracking-[.03em] whitespace-nowrap">
            {fmtDate(ann.createdAt)}
          </span>
          {canEdit ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(ann);
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border-none cursor-pointer bg-[#730042]/10 text-[#730042] flex-shrink-0 hover:brightness-95"
            >
              <FaPen size={11} />
            </button>
          ) : (
            <span
              title="Edit — No permission"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#730042]/10 text-[#730042]/45 flex-shrink-0 cursor-not-allowed"
            >
              <FaLock size={10} />
            </span>
          )}
          {canDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(ann);
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border-none cursor-pointer bg-[#CD166E]/10 text-[#CD166E] flex-shrink-0 hover:brightness-95"
            >
              <FaTrash size={11} />
            </button>
          ) : (
            <span
              title="Delete — No permission"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#730042]/10 text-[#730042]/45 flex-shrink-0 cursor-not-allowed"
            >
              <FaLock size={10} />
            </span>
          )}
        </div>
      </div>

      <h3
        className={`font-sans font-semibold text-[#730042] leading-tight mb-2.5 tracking-[-0.2px] ${
          isFeatured ? "text-[clamp(18px,3vw,22px)]" : "text-[17px]"
        }`}
      >
        {ann.title || "Untitled Announcement"}
      </h3>

      <p className="text-[13.5px] text-[#730042]/55 leading-[1.75] mb-4">
        {excerpt(
          ann.body || ann.content || ann.message || ann.description,
          isFeatured ? 200 : 100
        )}
      </p>

      <div className="flex items-center justify-between pt-3.5 border-t-[.5px] border-[#730042]/10">
        {ann.expiresAt && (
          <span className="text-[10.5px] text-[#730042]/45 tracking-[.06em]">
            Expires {fmtDate(ann.expiresAt)}
          </span>
        )}
        <span className="ml-auto text-[11.5px] font-medium text-[#CD166E] tracking-[.06em] uppercase flex items-center gap-[3px] transition-colors group-hover:text-[#730042]">
          Read more ›
        </span>
      </div>
    </div>
  );
};

const Announcema = ({
  onCreate = () => {},
  onEdit = () => {},
  onDelete = () => {},
} = {}) => {
  const { data, isLoading, isError: error } = useManagerAnnouncements();
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const can = usePermissionStore((state) => state.can);
  const canView = can(PERMS.view);
  const canCreate = can(PERMS.create);
  const canEdit = can(PERMS.edit);
  const canDelete = can(PERMS.delete);
  const hasAccess = canView || canCreate || canEdit || canDelete;

  if (!hasAccess) return <AccessDenied />;

  const allAnnouncements = data || [];

  const filtered = allAnnouncements
    .filter((ann) => {
      if (filter === "high") return (ann.priority || "").toLowerCase() === "high";
      if (filter === "managers")
        return (ann.audience || "").toLowerCase() === "managers";
      return true;
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      const ap = order[(a.priority || "low").toLowerCase()] ?? 2;
      const bp = order[(b.priority || "low").toLowerCase()] ?? 2;
      if (ap !== bp) return ap - bp;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const urgentCount = allAnnouncements.filter(
    (a) => (a.priority || "").toLowerCase() === "high"
  ).length;
  const managersCount = allAnnouncements.filter(
    (a) => (a.audience || "").toLowerCase() === "managers"
  ).length;

  const FILTERS = [
    { id: "all", label: "All", count: allAnnouncements.length },
    { id: "high", label: "Urgent", count: urgentCount },
    { id: "managers", label: "Managers only", count: managersCount },
  ];

  return (
    <div className="bg-[#F9F8F2] min-h-screen font-sans">
      <FontInjector />

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10">
        {/* Eyebrow */}
        <div className="flex items-center gap-2.5 mb-5 flex-wrap animate-[fadeUp_.45s_ease_both]">
          <div className="w-8 h-px bg-[#730042]" />
          <span className="text-[11px] font-medium tracking-[.18em] uppercase text-[#730042]">
            Company Bulletin
          </span>
          <div className="ml-auto flex items-center gap-1.5 bg-[#730042]/10 border border-[#730042]/25 px-[11px] py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#CD166E] animate-[blink_1.8s_ease-in-out_infinite]" />
            <span className="text-[10px] font-medium tracking-[.14em] uppercase text-[#730042]">
              Live
            </span>
          </div>
        </div>

        {/* Heading + create button */}
        <div className="flex items-center gap-3.5 flex-wrap animate-[fadeUp_.5s_ease_both]">
          <h1 className="font-sans text-[clamp(30px,7vw,48px)] font-semibold text-[#730042] tracking-[-1px] leading-[1.1] m-0 mr-1.5">
            Announce<span className="font-semibold text-[#CD166E]">ments</span>
          </h1>

          <button
            onClick={() => canCreate && onCreate()}
            disabled={!canCreate}
            title={!canCreate ? "New Announcement — No permission" : undefined}
            className={`ml-auto flex items-center gap-2 px-4 py-2.5 rounded-full border-none text-[12.5px] font-medium tracking-[.05em] uppercase font-sans ${
              canCreate
                ? "cursor-pointer bg-[#730042] text-white hover:brightness-95"
                : "cursor-not-allowed bg-[#730042]/10 text-[#730042]/45"
            }`}
          >
            {canCreate ? <FaPlus size={11} /> : <FaLock size={11} />}
            <span className="hidden xs:inline sm:inline">New Announcement</span>
            <span className="inline xs:hidden sm:hidden">New</span>
          </button>
        </div>

        {canView && (
          <div className="flex items-center gap-3.5 my-5 sm:my-8 animate-[fadeUp_.55s_ease_both] flex-wrap">
            <div className="flex-1 h-[.5px] bg-[#730042]/25 min-w-[24px]" />
            <div className="flex gap-1.5 flex-wrap justify-center w-full sm:w-auto order-3 sm:order-none">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3.5 py-[5px] rounded-full cursor-pointer text-[11px] font-medium tracking-[.08em] uppercase transition-all duration-200 border ${
                    filter === f.id
                      ? "bg-[#730042] text-white border-[#730042]"
                      : "bg-transparent text-[#730042]/45 border-[#730042]/25 hover:bg-[#730042]/8"
                  }`}
                >
                  {f.label} · {f.count}
                </button>
              ))}
            </div>
            <div className="flex-1 h-[.5px] bg-[#730042]/25 min-w-[24px]" />
          </div>
        )}

        {!canView ? (
          <div className="text-center py-20 px-4">
            <div className="w-[60px] h-[60px] rounded-full border-[1.5px] border-[#CD166E]/25 flex items-center justify-center mx-auto mb-5">
              <FaLock size={22} className="text-[#CD166E]" />
            </div>
            <h3 className="font-sans text-[clamp(20px,4vw,24px)] font-semibold text-[#730042] mb-2">
              Viewing is restricted
            </h3>
            <p className="text-[13px] text-[#730042]/45 m-0">
              You don't have permission to view announcements. Contact your
              admin to request access.
            </p>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-[38px] h-[38px] border-[3px] border-[#730042]/10 border-t-[#CD166E] rounded-full animate-spin" />
                <p className="text-[#730042]/45 text-[13px] m-0">
                  Loading announcements…
                </p>
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <p className="text-[#CD166E] font-medium text-[15px] mb-1.5">
                  Failed to load announcements
                </p>
                <p className="text-[#730042]/45 text-[13px] m-0">
                  Please try refreshing the page.
                </p>
              </div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
              <div className="text-center py-20 px-4">
                <div className="w-[60px] h-[60px] rounded-full border-[1.5px] border-[#CD166E]/25 flex items-center justify-center mx-auto mb-5">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#CD166E"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <h3 className="font-sans text-[clamp(20px,4vw,24px)] font-semibold text-[#730042] mb-2">
                  Nothing yet
                </h3>
                <p className="text-[13px] text-[#730042]/45 m-0">
                  {filter !== "all"
                    ? "Try a different filter."
                    : "New announcements will appear here."}
                </p>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
                {filtered.map((ann, i) => (
                  <AnnCard
                    key={ann._id}
                    ann={ann}
                    index={i}
                    onClick={setSelectedId}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedId && (
        <DetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};

export default Announcema;