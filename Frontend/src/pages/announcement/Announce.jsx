import { useState } from "react";
import {
  useCreateAnnouncement,
  useGetAllAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "../../auth/server-state/adminannounce/adminannounce.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const EMPTY_FORM = {
  title: "",
  message: "",
  audience: "all",
  priority: "low",
  notice_image: "",
  expiresAt: "",
};

const PRIORITY_CONFIG = {
  high: {
    badge: "bg-[#FCEBEB] text-[#791F1F] border border-[#F09595]",
    dot: "bg-[#E24B4A]",
    label: "High",
  },
  medium: {
    badge: "bg-[#FAEEDA] text-[#633806] border border-[#FAC775]",
    dot: "bg-[#BA7517]",
    label: "Medium",
  },
  low: {
    badge: "bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97]",
    dot: "bg-[#639922]",
    label: "Low",
  },
};

const AUDIENCE_CONFIG = {
  all:       { label: "All",       color: "bg-[#EEEDFE] text-[#3C3489]" },
  employees: { label: "Employees", color: "bg-[#E6F1FB] text-[#0C447C]" },
  managers:  { label: "Managers",  color: "bg-[#FBEAF0] text-[#730042]" },
};

const AVATAR_BG = ["#730042", "#993556", "#72243E", "#CD166E", "#4B1528"];

function IconMegaphone({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M22 9a1 1 0 0 0-1-1h-2V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v2H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2h1a1 1 0 0 0 1-1z" />
    </svg>
  );
}
function IconAlert({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconGlobe({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconClock({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconFile({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconEdit({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconTrash({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function IconPlus({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconClose({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconLock({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconShield({ size = 40, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const inputCls =
  "w-full px-3 py-2.5 border border-[#F4C0D1] rounded-[9px] bg-[#F9F8F2] text-[13px] text-[#730042] " +
  "outline-none focus:border-[#CD166E] focus:ring-2 focus:ring-[#CD166E]/20 transition-all placeholder-[#993556]/40 font-[inherit]";

function Field({ label, optional, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#993556]">
        {label}{" "}
        {optional && <span className="font-normal normal-case text-[#B4B2A9] text-[10px]">(optional)</span>}
        {!optional && <span className="text-[#A32D2D] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-[#A32D2D]">{error}</p>}
    </div>
  );
}

function ImageOrPlaceholder({ src, alt, className, placeholderBg }) {
  if (src && /^https?:\/\/.+/.test(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={(e) => (e.target.style.display = "none")}
      />
    );
  }
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: placeholderBg }}>
      <IconMegaphone size={22} color="rgba(255,255,255,0.28)" />
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AudienceBadge({ audience }) {
  const cfg = AUDIENCE_CONFIG[audience];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden animate-pulse">
      <div className="w-full h-32 bg-[#FBEAF0]" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[#FBEAF0] rounded-full" />
          <div className="h-6 w-16 bg-[#FBEAF0] rounded-full" />
        </div>
        <div className="h-3 w-3/4 bg-[#FBEAF0] rounded" />
        <div className="h-3 w-full bg-[#FBEAF0] rounded" />
        <div className="h-3 w-2/3 bg-[#FBEAF0] rounded" />
      </div>
    </div>
  );
}

function SkeletonTableRows() {
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

function SkeletonMobileRows() {
  return [...Array(3)].map((_, i) => (
    <div key={i} className="bg-white rounded-[14px] border border-[#F4C0D1] p-4 animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-[9px] bg-[#FBEAF0] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 bg-[#FBEAF0] rounded" />
          <div className="h-3 w-full bg-[#FBEAF0] rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-[#FBEAF0] rounded-full" />
        <div className="h-6 w-16 bg-[#FBEAF0] rounded-full" />
      </div>
    </div>
  ));
}

function ModalOverlay({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4"
      style={{ background: "rgba(115,0,66,0.32)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

function MobileAnnouncementCard({ item, idx, canEdit, canDelete, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <ImageOrPlaceholder
          src={item.notice_image}
          alt="notice"
          className="w-12 h-12 object-cover rounded-[9px] border border-[#F4C0D1] flex-shrink-0"
          placeholderBg={AVATAR_BG[idx % AVATAR_BG.length]}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#730042] truncate">{item.title}</p>
          <p className="text-[11px] text-[#993556] mt-0.5 line-clamp-2 leading-relaxed">{item.message}</p>
        </div>
      </div>

      <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={item.priority} />
        <AudienceBadge audience={item.audience} />
        {item.expiresAt && (
          <span className="text-[10px] text-[#B4B2A9]">
            Expires {new Date(item.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        <span className="text-[10px] text-[#B4B2A9] ml-auto">
          {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Only show action row if at least one action is permitted */}
      {(canEdit || canDelete) && (
        <div className="px-4 pb-4 flex gap-2 border-t border-[#FBEAF0] pt-3">
          {canEdit && (
            <button
              onClick={() => onEdit(item)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] border border-[#F4C0D1] text-[12px] font-medium text-[#993556] hover:bg-[#FBEAF0] hover:text-[#CD166E] transition-all"
              style={{ background: "#F9F8F2" }}
            >
              <IconEdit size={12} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(item)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] border border-[#F4C0D1] text-[12px] font-medium text-[#993556] hover:bg-[#FCEBEB] hover:text-[#A32D2D] transition-all"
              style={{ background: "#F9F8F2" }}
            >
              <IconTrash size={12} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Restricted full-page banner ─────────────────────────────────────────────
function AccessRestrictedBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-28 text-center px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "#FBEAF0", border: "1px solid #F4C0D1" }}
      >
        <IconShield size={32} color="#CD166E" />
      </div>
      <p className="text-[15px] font-semibold text-[#730042] mb-1">Access Restricted</p>
      <p className="text-[12px] text-[#993556] max-w-xs leading-relaxed">
        You don't have permission to view announcements. Contact your administrator to request access.
      </p>
    </div>
  );
}

export default function AnnouncementPage() {
  const [modalMode, setModalMode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const can = usePermissionStore((state) => state.can);
  const canView   = can("announcements.can_view_announcements");
  const canCreate = can("announcements.can_create_announcement");
  const canEdit   = can("announcements.can_edit_announcement");
  const canDelete = can("announcements.can_delete_announcement");

  const { mutate: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutate: updateAnnouncement, isPending: isUpdating } = useUpdateAnnouncement();
  const { mutate: deleteAnnouncement, isPending: isDeleting } = useDeleteAnnouncement();

  // Only fetch if the user can view; pass `enabled` flag to the hook
  const { data, isLoading, isError } = useGetAllAnnouncement({ enabled: canView });

  const announcements = data?.announcements || [];
  const isPending = isCreating || isUpdating;

  const openCreate = () => {
    if (!canCreate) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setModalMode("create");
  };

  const openEdit = (item) => {
    if (!canEdit) return;
    setSelectedItem(item);
    setForm({
      title:        item.title,
      message:      item.message,
      audience:     item.audience,
      priority:     item.priority,
      notice_image: item.notice_image || "",
      expiresAt:    item.expiresAt ? new Date(item.expiresAt).toISOString().split("T")[0] : "",
    });
    setErrors({});
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedItem(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    const err = {};
    if (!form.title.trim()) err.title = "Title is required";
    if (!form.message.trim()) err.message = "Message is required";
    if (form.notice_image && !/^https?:\/\/.+/.test(form.notice_image))
      err.notice_image = "Enter a valid image URL (http / https)";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (modalMode === "create" && !canCreate) return;
    if (modalMode === "edit" && !canEdit) return;
    if (!validate()) return;
    if (modalMode === "create") {
      createAnnouncement(form, { onSuccess: closeModal });
    } else {
      updateAnnouncement({ id: selectedItem._id, data: form }, { onSuccess: closeModal });
    }
  };

  const handleDelete = () => {
    if (!canDelete) return;
    deleteAnnouncement(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
  };

  const stats = [
    { label: "Total",         value: announcements.length,                                                                icon: <IconFile  size={18} color="#CD166E" />, bg: "bg-[#FBEAF0]" },
    { label: "High priority", value: announcements.filter((a) => a.priority === "high").length,                          icon: <IconAlert size={18} color="#A32D2D" />, bg: "bg-[#FCEBEB]" },
    { label: "Audience: all", value: announcements.filter((a) => a.audience === "all").length,                           icon: <IconGlobe size={18} color="#3C3489" />, bg: "bg-[#EEEDFE]" },
    { label: "With expiry",   value: announcements.filter((a) => a.expiresAt && new Date(a.expiresAt) > new Date()).length, icon: <IconClock size={18} color="#633806" />, bg: "bg-[#FAEEDA]" },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: "#F9F8F2" }}>

      {/* ── Header ── */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#730042] tracking-tight">Announcements</h1>
          <p className="text-[12px] text-[#993556] mt-1">Create and manage announcements for your team</p>
        </div>

        {/* New Announcement button — always visible, locked when no permission */}
        {canCreate ? (
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 w-full xs:w-auto px-5 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity hover:opacity-88 flex-shrink-0"
            style={{ background: "#730042" }}
          >
            <IconPlus size={14} />
            New Announcement
          </button>
        ) : (
          <div
            className="inline-flex items-center justify-center gap-2 w-full xs:w-auto px-5 py-2.5 rounded-xl text-[13px] font-medium text-[#993556] border border-[#F4C0D1] opacity-60 flex-shrink-0 cursor-not-allowed select-none"
            style={{ background: "#fff" }}
            title="You don't have permission to create announcements"
          >
            <IconLock size={12} />
            New Announcement
          </div>
        )}
      </div>

      {/* ── No view permission — show restricted state inside full layout ── */}
      {!canView ? (
        <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden">
          <AccessRestrictedBanner />
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-[#F4C0D1] p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-semibold text-[#730042]">{isLoading ? "—" : s.value}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#993556] mt-0.5 truncate">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Latest 3 cards ── */}
          {!isLoading && announcements.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#993556] mb-3">
                Latest announcements
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {announcements.slice(0, 3).map((item, idx) => (
                  <div
                    key={item._id}
                    className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden hover:-translate-y-0.5 transition-transform duration-200"
                  >
                    <ImageOrPlaceholder
                      src={item.notice_image}
                      alt={item.title}
                      className="w-full h-28 sm:h-32 object-cover"
                      placeholderBg={AVATAR_BG[idx % AVATAR_BG.length]}
                    />
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                        <PriorityBadge priority={item.priority} />
                        <AudienceBadge audience={item.audience} />
                      </div>
                      <p className="text-[13px] font-semibold text-[#730042] truncate mb-1">{item.title}</p>
                      <p className="text-[11px] text-[#993556] line-clamp-2 leading-relaxed">{item.message}</p>
                      {item.expiresAt && (
                        <p className="text-[10px] text-[#B4B2A9] mt-2">
                          Expires{" "}
                          {new Date(item.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Full table ── */}
          <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#F4C0D1] flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-[#730042]">All announcements</span>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#FBEAF0] text-[#730042] flex-shrink-0">
                {isLoading ? "—" : `${announcements.length} total`}
              </span>
            </div>

            {isLoading ? (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-[#F4C0D1]" style={{ background: "#F9F8F2" }}>
                        {["Image", "Title & Message", "Audience", "Priority", "Expiry", "Created", "Actions"].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#993556]"
                            style={h === "Actions" ? { textAlign: "center" } : {}}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FBEAF0]">
                      <SkeletonTableRows />
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden p-4 space-y-3">
                  <SkeletonMobileRows />
                </div>
              </>
            ) : isError ? (
              <div className="py-14 sm:py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <IconAlert size={28} color="#A32D2D" />
                  <p className="text-[13px] font-semibold text-[#730042]">Failed to load announcements</p>
                  <p className="text-[11px] text-[#993556]">Check your network and try again</p>
                </div>
              </div>
            ) : announcements.length === 0 ? (
              <div className="py-16 sm:py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FBEAF0] flex items-center justify-center">
                    <IconMegaphone size={22} color="#CD166E" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#730042]">No announcements yet</p>
                  <p className="text-[11px] text-[#993556]">Click "New Announcement" to get started</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-[#F4C0D1]" style={{ background: "#F9F8F2" }}>
                        {["Image", "Title & Message", "Audience", "Priority", "Expiry", "Created", "Actions"].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#993556]"
                            style={h === "Actions" ? { textAlign: "center" } : {}}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FBEAF0]">
                      {announcements.map((item, idx) => (
                        <tr
                          key={item._id}
                          className="transition-colors duration-100"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF4F9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-5 py-4">
                            <ImageOrPlaceholder
                              src={item.notice_image}
                              alt="notice"
                              className="w-10 h-10 object-cover rounded-[9px] border border-[#F4C0D1]"
                              placeholderBg={AVATAR_BG[idx % AVATAR_BG.length]}
                            />
                          </td>
                          <td className="px-5 py-4 max-w-[200px]">
                            <p className="text-[13px] font-semibold text-[#730042] truncate">{item.title}</p>
                            <p className="text-[11px] text-[#993556] truncate mt-0.5">{item.message}</p>
                          </td>
                          <td className="px-5 py-4"><AudienceBadge audience={item.audience} /></td>
                          <td className="px-5 py-4"><PriorityBadge priority={item.priority} /></td>
                          <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                            {item.expiresAt
                              ? new Date(item.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : <span className="text-[#D3D1C7]">—</span>}
                          </td>
                          <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                            {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-5 py-4">
                            {/* Actions cell: show buttons if permitted, lock icon if not */}
                            {canEdit || canDelete ? (
                              <div className="flex items-center justify-center gap-2">
                                {canEdit && (
                                  <button
                                    onClick={() => openEdit(item)}
                                    title="Edit"
                                    className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FBEAF0] hover:text-[#CD166E]"
                                    style={{ background: "#F9F8F2" }}
                                  >
                                    <IconEdit size={12} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => setDeleteTarget(item)}
                                    title="Delete"
                                    className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FCEBEB] hover:text-[#A32D2D]"
                                    style={{ background: "#F9F8F2" }}
                                  >
                                    <IconTrash size={12} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* No edit/delete permission → show a subtle lock */
                              <div className="flex items-center justify-center text-[#D3D1C7]" title="No action permissions">
                                <IconLock size={12} />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                  {announcements.map((item, idx) => (
                    <MobileAnnouncementCard
                      key={item._id}
                      item={item}
                      idx={idx}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Create / Edit modal ── */}
      {modalMode && (canCreate || canEdit) && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[95vh] sm:max-h-[92vh] overflow-y-auto border border-[#F4C0D1] sm:border">
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#F4C0D1] rounded-t-2xl"
              style={{ background: "#730042" }}
            >
              <div>
                <h2 className="text-[15px] font-semibold text-white">
                  {modalMode === "create" ? "New Announcement" : "Edit Announcement"}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Fill in the details below</p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              >
                <IconClose size={13} />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 flex flex-col gap-4" style={{ background: "#F9F8F2" }}>
              <Field label="Title" error={errors.title}>
                <input
                  name="title"
                  placeholder="e.g. Office Holiday Notice"
                  value={form.title}
                  onChange={handleChange}
                  className={inputCls}
                  style={errors.title ? { borderColor: "#F09595", background: "#FCEBEB" } : {}}
                />
              </Field>

              <Field label="Message" error={errors.message}>
                <textarea
                  name="message"
                  placeholder="Write your announcement details here..."
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  style={errors.message ? { borderColor: "#F09595", background: "#FCEBEB" } : {}}
                />
              </Field>

              <Field label="Image URL" optional error={errors.notice_image}>
                <input
                  name="notice_image"
                  placeholder="https://example.com/image.jpg"
                  value={form.notice_image}
                  onChange={handleChange}
                  className={inputCls}
                  style={errors.notice_image ? { borderColor: "#F09595", background: "#FCEBEB" } : {}}
                />
                {form.notice_image && /^https?:\/\/.+/.test(form.notice_image) && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-[#F4C0D1]">
                    <img
                      src={form.notice_image}
                      alt="preview"
                      className="w-full h-28 object-cover"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Audience">
                  <select name="audience" value={form.audience} onChange={handleChange} className={inputCls}>
                    <option value="all">All</option>
                    <option value="employees">Employees</option>
                    <option value="managers">Managers</option>
                  </select>
                </Field>
                <Field label="Priority">
                  <select name="priority" value={form.priority} onChange={handleChange} className={inputCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </Field>
              </div>

              <Field label="Expiry Date" optional>
                <input
                  type="date"
                  name="expiresAt"
                  value={form.expiresAt}
                  onChange={handleChange}
                  className={inputCls}
                />
              </Field>
            </div>

            <div
              className="sticky bottom-0 flex flex-col sm:flex-row sm:justify-end gap-3 px-5 sm:px-6 py-4 border-t border-[#F4C0D1] rounded-b-2xl"
              style={{ background: "#F9F8F2" }}
            >
              <button
                onClick={closeModal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#F4C0D1] text-[13px] font-medium text-[#730042] transition-colors hover:bg-[#FBEAF0]"
                style={{ background: "#fff" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-88"
                style={{ background: "#730042" }}
              >
                {isPending
                  ? modalMode === "create" ? "Creating..." : "Saving..."
                  : modalMode === "create" ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && canDelete && (
        <ModalOverlay onClose={() => setDeleteTarget(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl border border-[#F4C0D1] overflow-hidden">
            <div className="px-6 pt-8 pb-5 text-center" style={{ background: "#FBEAF0" }}>
              <div
                className="w-12 h-12 rounded-full border border-[#F7C1C1] flex items-center justify-center mx-auto mb-3"
                style={{ background: "#FCEBEB" }}
              >
                <IconTrash size={18} />
              </div>
              <h3 className="text-[15px] font-semibold text-[#730042]">Delete announcement?</h3>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-[12px] text-[#993556] leading-relaxed">
                You're about to delete{" "}
                <span className="font-semibold text-[#730042]">"{deleteTarget.title}"</span>.
                <br />This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 px-6 pb-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#F4C0D1] text-[12px] font-medium text-[#730042] transition-colors hover:bg-[#FBEAF0]"
                style={{ background: "#fff" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-88"
                style={{ background: "#A32D2D" }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}