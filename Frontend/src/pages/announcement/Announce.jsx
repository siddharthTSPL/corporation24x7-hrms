import { useState } from "react";
import {
  useCreateAnnouncement,
  useGetAllAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "../../auth/server-state/adminannounce/adminannounce.hook";

const EMPTY_FORM = {
  title: "",
  message: "",
  audience: "all",
  priority: "low",
  notice_image: "",
  expiresAt: "",
};

const PRIORITY_CONFIG = {
  high:   {
    badge: "bg-[#FCEBEB] text-[#791F1F] border border-[#F09595]",
    dot:   "bg-[#E24B4A]",
    label: "High",
  },
  medium: {
    badge: "bg-[#FAEEDA] text-[#633806] border border-[#FAC775]",
    dot:   "bg-[#BA7517]",
    label: "Medium",
  },
  low: {
    badge: "bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97]",
    dot:   "bg-[#639922]",
    label: "Low",
  },
};

const AUDIENCE_CONFIG = {
  all:       { label: "All",       color: "bg-[#EEEDFE] text-[#3C3489]" },
  employees: { label: "Employees", color: "bg-[#E6F1FB] text-[#0C447C]" },
  managers:  { label: "Managers",  color: "bg-[#FBEAF0] text-[#730042]" },
};

const AVATAR_BG = ["#730042", "#993556", "#72243E", "#CD166E", "#4B1528"];

// ── Icon components (clean SVG, no emoji) ────────────────────────────────────

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
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconGlobe({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconClock({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconFile({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
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
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconClose({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Shared input class ────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2.5 border border-[#F4C0D1] rounded-[9px] bg-[#F9F8F2] text-[13px] text-[#730042] " +
  "outline-none focus:border-[#CD166E] focus:ring-2 focus:ring-[#CD166E]/20 transition-all placeholder-[#993556]/40 font-[inherit]";

// ── Field wrapper ─────────────────────────────────────────────────────────────
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

// ── Image placeholder for cards / table ──────────────────────────────────────
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
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: placeholderBg }}
    >
      <IconMegaphone size={22} color="rgba(255,255,255,0.28)" />
    </div>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Audience badge ────────────────────────────────────────────────────────────
function AudienceBadge({ audience }) {
  const cfg = AUDIENCE_CONFIG[audience];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────
function SkeletonRows() {
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

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function ModalOverlay({ onClose, children }) {
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnnouncementPage() {
  const [modalMode,    setModalMode]    = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState({});

  const { mutate: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutate: updateAnnouncement, isPending: isUpdating } = useUpdateAnnouncement();
  const { mutate: deleteAnnouncement, isPending: isDeleting } = useDeleteAnnouncement();
  const { data, isLoading, isError }                          = useGetAllAnnouncement();

  const announcements = data?.announcements || [];
  const isPending     = isCreating || isUpdating;

  const openCreate = () => { setForm(EMPTY_FORM); setErrors({}); setModalMode("create"); };

  const openEdit = (item) => {
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

  const closeModal = () => { setModalMode(null); setSelectedItem(null); setForm(EMPTY_FORM); setErrors({}); };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    const err = {};
    if (!form.title.trim())   err.title   = "Title is required";
    if (!form.message.trim()) err.message = "Message is required";
    if (form.notice_image && !/^https?:\/\/.+/.test(form.notice_image))
      err.notice_image = "Enter a valid image URL (http / https)";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (modalMode === "create") {
      createAnnouncement(form, { onSuccess: closeModal });
    } else {
      updateAnnouncement({ id: selectedItem._id, data: form }, { onSuccess: closeModal });
    }
  };

  const handleDelete = () => {
    deleteAnnouncement(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
  };

  const stats = [
    { label: "Total",        value: announcements.length,                                                                  icon: <IconFile size={18} color="#CD166E" />,    bg: "bg-[#FBEAF0]"  },
    { label: "High priority",value: announcements.filter((a) => a.priority === "high").length,                             icon: <IconAlert size={18} color="#A32D2D" />,   bg: "bg-[#FCEBEB]"  },
    { label: "Audience: all",value: announcements.filter((a) => a.audience === "all").length,                              icon: <IconGlobe size={18} color="#3C3489" />,   bg: "bg-[#EEEDFE]"  },
    { label: "With expiry",  value: announcements.filter((a) => a.expiresAt && new Date(a.expiresAt) > new Date()).length, icon: <IconClock size={18} color="#633806" />,   bg: "bg-[#FAEEDA]"  },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ background: "#F9F8F2" }}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#730042] tracking-tight">Announcements</h1>
          <p className="text-[12px] text-[#993556] mt-1">Create and manage announcements for your team</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity hover:opacity-88"
          style={{ background: "#730042" }}
        >
          <IconPlus size={14} />
          New Announcement
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#F4C0D1] p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              {s.icon}
            </div>
            <div>
              <div className="text-xl font-semibold text-[#730042]">{s.value}</div>
              <div className="text-[11px] text-[#993556] mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Latest preview cards ── */}
      {!isLoading && announcements.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#993556] mb-3">
            Latest announcements
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.slice(0, 3).map((item, idx) => (
              <div
                key={item._id}
                className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden hover:-translate-y-0.5 transition-transform duration-200"
              >
                <ImageOrPlaceholder
                  src={item.notice_image}
                  alt={item.title}
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

      {/* ── Table ── */}
      <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F4C0D1] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#730042]">All announcements</span>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#FBEAF0] text-[#730042]">
            {announcements.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
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
              {isLoading ? (
                <SkeletonRows />
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <IconAlert size={28} color="#A32D2D" />
                      <p className="text-[13px] font-semibold text-[#730042]">Failed to load announcements</p>
                      <p className="text-[11px] text-[#993556]">Check your network and try again</p>
                    </div>
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#FBEAF0] flex items-center justify-center">
                        <IconMegaphone size={22} color="#CD166E" />
                      </div>
                      <p className="text-[13px] font-semibold text-[#730042]">No announcements yet</p>
                      <p className="text-[11px] text-[#993556]">Click "New Announcement" to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                announcements.map((item, idx) => (
                  <tr
                    key={item._id}
                    className="transition-colors duration-100"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF4F9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Image */}
                    <td className="px-5 py-4">
                      <ImageOrPlaceholder
                        src={item.notice_image}
                        alt="notice"
                        className="w-10 h-10 object-cover rounded-[9px] border border-[#F4C0D1]"
                        placeholderBg={AVATAR_BG[idx % AVATAR_BG.length]}
                      />
                    </td>

                    {/* Title + Message */}
                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="text-[13px] font-semibold text-[#730042] truncate">{item.title}</p>
                      <p className="text-[11px] text-[#993556] truncate mt-0.5">{item.message}</p>
                    </td>

                    {/* Audience */}
                    <td className="px-5 py-4"><AudienceBadge audience={item.audience} /></td>

                    {/* Priority */}
                    <td className="px-5 py-4"><PriorityBadge priority={item.priority} /></td>

                    {/* Expiry */}
                    <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                      {item.expiresAt
                        ? new Date(item.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : <span className="text-[#D3D1C7]">—</span>}
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit"
                          className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FBEAF0] hover:text-[#CD166E] hover:border-[#F4C0D1]"
                          style={{ background: "#F9F8F2" }}
                        >
                          <IconEdit size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Delete"
                          className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FCEBEB] hover:text-[#A32D2D] hover:border-[#F7C1C1]"
                          style={{ background: "#F9F8F2" }}
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalMode && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white w-full max-w-lg rounded-2xl max-h-[92vh] overflow-y-auto border border-[#F4C0D1]">

            {/* Head */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#F4C0D1] rounded-t-2xl" style={{ background: "#730042" }}>
              <div>
                <h2 className="text-[15px] font-semibold text-white">
                  {modalMode === "create" ? "New Announcement" : "Edit Announcement"}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Fill in the details below</p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.18)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              >
                <IconClose size={13} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-4" style={{ background: "#F9F8F2" }}>
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

            {/* Footer */}
            <div
              className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-[#F4C0D1] rounded-b-2xl"
              style={{ background: "#F9F8F2" }}
            >
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border border-[#F4C0D1] text-[13px] font-medium text-[#730042] transition-colors hover:bg-[#FBEAF0]"
                style={{ background: "#fff" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-6 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-88"
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

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <ModalOverlay onClose={() => setDeleteTarget(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#F4C0D1] overflow-hidden">
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
            <div className="flex gap-3 px-6 pb-6">
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