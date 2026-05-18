import { useState } from "react";
import {
  useCreateAnnouncement,
  useGetAllAnnouncements,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "../../auth/server-state/superadmin/announcement/suannouncement.hook";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  all: { label: "All", color: "bg-[#EEEDFE] text-[#3C3489]" },
  employees: { label: "Employees", color: "bg-[#E6F1FB] text-[#0C447C]" },
  managers: { label: "Managers", color: "bg-[#FBEAF0] text-[#730042]" },
};

const AVATAR_BG = ["#730042", "#993556", "#72243E", "#CD166E", "#4B1528"];

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 border border-[#F4C0D1] rounded-[9px] bg-[#F9F8F2] text-[13px] text-[#730042] " +
  "outline-none focus:border-[#CD166E] focus:ring-2 focus:ring-[#CD166E]/20 transition-all placeholder-[#993556]/40 font-[inherit]";

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AudienceBadge({ audience }) {
  const cfg = AUDIENCE_CONFIG[audience];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

function Field({ label, optional, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#993556]">
        {label}{" "}
        {optional ? (
          <span className="font-normal normal-case text-[#B4B2A9] text-[10px]">
            (optional)
          </span>
        ) : (
          <span className="text-[#A32D2D] ml-0.5">*</span>
        )}
      </label>
      {children}
      {error && <p className="text-[10px] text-[#A32D2D]">{error}</p>}
    </div>
  );
}

function AnnouncementThumb({ src, alt, bg }) {
  if (src && /^https?:\/\/.+/.test(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className="w-10 h-10 object-cover rounded-[9px] border border-[#F4C0D1]"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-[9px] border border-[#F4C0D1] flex items-center justify-center"
      style={{ background: bg }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.8"
      >
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
      </svg>
    </div>
  );
}

function PreviewCardImage({ src, bg }) {
  if (src && /^https?:\/\/.+/.test(src)) {
    return (
      <img
        src={src}
        alt="notice"
        className="w-full h-32 object-cover"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    );
  }
  return (
    <div
      className="w-full h-32 flex items-center justify-center"
      style={{ background: bg }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      >
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
      </svg>
    </div>
  );
}

function SkeletonRows() {
  return [...Array(4)].map((_, i) => (
    <tr key={i}>
      {[...Array(7)].map((_, j) => (
        <td key={j} className="px-5 py-4">
          <div
            className={`bg-[#FBEAF0] rounded-lg animate-pulse ${
              j === 0 ? "w-10 h-10 rounded-xl" : "h-3"
            }`}
          />
        </td>
      ))}
    </tr>
  ));
}

function ModalOverlay({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{
        background: "rgba(115,0,66,0.28)",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, iconPath, bg, iconColor }) {
  return (
    <div className="bg-white rounded-xl border border-[#F4C0D1] p-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.8"
        >
          {iconPath}
        </svg>
      </div>
      <div>
        <div className="text-xl font-semibold text-[#730042]">{value}</div>
        <div className="text-[11px] text-[#993556] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }) {
  return (
    <tr>
      <td colSpan={7} className="py-20 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#FBEAF0] flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#CD166E"
              strokeWidth="1.8"
            >
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#730042]">
              No announcements yet
            </p>
            <p className="text-[11px] text-[#993556] mt-1">
              Create your first announcement to get started
            </p>
          </div>
          <button
            onClick={onCreateClick}
            className="mt-1 px-4 py-2 rounded-xl text-[12px] font-medium text-white"
            style={{ background: "#730042" }}
          >
            + New Announcement
          </button>
        </div>
      </td>
    </tr>
  );
}

function ErrorState() {
  return (
    <tr>
      <td colSpan={7} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-[#FCEBEB] flex items-center justify-center">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A32D2D"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-[#730042]">
            Failed to load announcements
          </p>
          <p className="text-[11px] text-[#993556]">
            Check your network connection and try again
          </p>
        </div>
      </td>
    </tr>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

function AnnouncementFormModal({ mode, form, errors, isPending, onChange, onSubmit, onClose }) {
  const isEdit = mode === "edit";

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[92vh] overflow-y-auto border border-[#F4C0D1]">
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#F4C0D1] rounded-t-2xl"
          style={{ background: "#730042" }}
        >
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              {isEdit ? "Edit Announcement" : "New Announcement"}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              Fill in the details below
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4" style={{ background: "#F9F8F2" }}>
          <Field label="Title" error={errors.title}>
            <input
              name="title"
              placeholder="e.g. Office Holiday Notice"
              value={form.title}
              onChange={onChange}
              className={inputCls}
              style={errors.title ? { borderColor: "#F09595", background: "#FCEBEB" } : {}}
            />
          </Field>

          <Field label="Message" error={errors.message}>
            <textarea
              name="message"
              placeholder="Write your announcement details here..."
              value={form.message}
              onChange={onChange}
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
              onChange={onChange}
              className={inputCls}
              style={errors.notice_image ? { borderColor: "#F09595", background: "#FCEBEB" } : {}}
            />
            {form.notice_image && /^https?:\/\/.+/.test(form.notice_image) && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[#F4C0D1]">
                <img
                  src={form.notice_image}
                  alt="preview"
                  className="w-full h-28 object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Audience">
              <select
                name="audience"
                value={form.audience}
                onChange={onChange}
                className={inputCls}
              >
                <option value="all">All</option>
                <option value="employees">Employees</option>
                <option value="managers">Managers</option>
              </select>
            </Field>
            <Field label="Priority">
              <select
                name="priority"
                value={form.priority}
                onChange={onChange}
                className={inputCls}
              >
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
              onChange={onChange}
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
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#F4C0D1] text-[13px] font-medium text-[#730042] bg-white hover:bg-[#FBEAF0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: "#730042" }}
          >
            {isPending
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
              ? "Save Changes"
              : "Create"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ item, isDeleting, onConfirm, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl border border-[#F4C0D1] overflow-hidden">
        <div className="px-6 pt-8 pb-5 text-center" style={{ background: "#FBEAF0" }}>
          <div
            className="w-12 h-12 rounded-full border border-[#F7C1C1] flex items-center justify-center mx-auto mb-3"
            style={{ background: "#FCEBEB" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A32D2D"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-[#730042]">
            Delete announcement?
          </h3>
        </div>
        <div className="px-6 py-5 text-center">
          <p className="text-[12px] text-[#993556] leading-relaxed">
            You're about to delete{" "}
            <span className="font-semibold text-[#730042]">
              "{item.title}"
            </span>
            .<br />
            This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#F4C0D1] text-[12px] font-medium text-[#730042] bg-white hover:bg-[#FBEAF0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: "#A32D2D" }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnnouncementPage() {
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { mutate: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutate: updateAnnouncement, isPending: isUpdating } = useUpdateAnnouncement();
  const { mutate: deleteAnnouncement, isPending: isDeleting } = useDeleteAnnouncement();
  const { data, isLoading, isError } = useGetAllAnnouncements();

  const announcements = data?.announcements || [];
  const isPending = isCreating || isUpdating;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModalMode("create");
  };

  const openEdit = (item) => {
    setSelectedItem(item);
    setForm({
      title: item.title,
      message: item.message,
      audience: item.audience,
      priority: item.priority,
      notice_image: item.notice_image || "",
      expiresAt: item.expiresAt
        ? new Date(item.expiresAt).toISOString().split("T")[0]
        : "",
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

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    const err = {};
    if (!form.title.trim()) err.title = "Title is required";
    if (!form.message.trim()) err.message = "Message is required";
    if (
      form.notice_image &&
      !/^https?:\/\/.+/.test(form.notice_image)
    )
      err.notice_image = "Enter a valid image URL (http / https)";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (modalMode === "create") {
      createAnnouncement(form, { onSuccess: closeModal });
    } else {
      updateAnnouncement(
        { id: selectedItem._id, data: form },
        { onSuccess: closeModal }
      );
    }
  };

  const handleDelete = () => {
    deleteAnnouncement(deleteTarget._id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const now = new Date();
  const statCards = [
    {
      label: "Total",
      value: announcements.length,
      bg: "#FBEAF0",
      iconColor: "#CD166E",
      iconPath: (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </>
      ),
    },
    {
      label: "High priority",
      value: announcements.filter((a) => a.priority === "high").length,
      bg: "#FCEBEB",
      iconColor: "#A32D2D",
      iconPath: (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </>
      ),
    },
    {
      label: "Audience: all",
      value: announcements.filter((a) => a.audience === "all").length,
      bg: "#EEEDFE",
      iconColor: "#3C3489",
      iconPath: (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </>
      ),
    },
    {
      label: "With expiry",
      value: announcements.filter(
        (a) => a.expiresAt && new Date(a.expiresAt) > now
      ).length,
      bg: "#FAEEDA",
      iconColor: "#633806",
      iconPath: (
        <>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ background: "#F9F8F2" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#730042] tracking-tight">
            Announcements
          </h1>
          <p className="text-[12px] text-[#993556] mt-1">
            Create and manage announcements for your team
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity hover:opacity-90 self-start sm:self-auto"
          style={{ background: "#730042" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Announcement
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Latest Preview Cards */}
      {!isLoading && announcements.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#993556] mb-3">
            Latest announcements
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.slice(0, 3).map((item, idx) => (
              <div
                key={item._id}
                className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden hover:-translate-y-0.5 transition-transform duration-200 cursor-default"
              >
                <PreviewCardImage
                  src={item.notice_image}
                  bg={AVATAR_BG[idx % AVATAR_BG.length]}
                />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <PriorityBadge priority={item.priority} />
                    <AudienceBadge audience={item.audience} />
                  </div>
                  <p className="text-[13px] font-semibold text-[#730042] truncate mb-1">
                    {item.title}
                  </p>
                  <p
                    className="text-[11px] text-[#993556] leading-relaxed"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.message}
                  </p>
                  {item.expiresAt && (
                    <p className="text-[10px] text-[#B4B2A9] mt-2">
                      Expires{" "}
                      {new Date(item.expiresAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-[#F4C0D1] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#730042]">
            All announcements
          </span>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#FBEAF0] text-[#730042]">
            {announcements.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr
                className="border-b border-[#F4C0D1]"
                style={{ background: "#F9F8F2" }}
              >
                {[
                  "Image",
                  "Title & Message",
                  "Audience",
                  "Priority",
                  "Expiry",
                  "Created",
                  "Actions",
                ].map((h) => (
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
                <ErrorState />
              ) : announcements.length === 0 ? (
                <EmptyState onCreateClick={openCreate} />
              ) : (
                announcements.map((item, idx) => (
                  <tr
                    key={item._id}
                    className="transition-colors duration-100 hover:bg-[#FEF4F9]"
                  >
                    {/* Image */}
                    <td className="px-5 py-4">
                      <AnnouncementThumb
                        src={item.notice_image}
                        alt={item.title}
                        bg={AVATAR_BG[idx % AVATAR_BG.length]}
                      />
                    </td>

                    {/* Title + Message */}
                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="text-[13px] font-semibold text-[#730042] truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#993556] truncate mt-0.5">
                        {item.message}
                      </p>
                    </td>

                    {/* Audience */}
                    <td className="px-5 py-4">
                      <AudienceBadge audience={item.audience} />
                    </td>

                    {/* Priority */}
                    <td className="px-5 py-4">
                      <PriorityBadge priority={item.priority} />
                    </td>

                    {/* Expiry */}
                    <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                      {item.expiresAt ? (
                        new Date(item.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      ) : (
                        <span className="text-[#D3D1C7]">—</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit"
                          className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FBEAF0] hover:text-[#CD166E]"
                          style={{ background: "#F9F8F2" }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Delete"
                          className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FCEBEB] hover:text-[#A32D2D] hover:border-[#F7C1C1]"
                          style={{ background: "#F9F8F2" }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
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

      {/* Create / Edit Modal */}
      {modalMode && (
        <AnnouncementFormModal
          mode={modalMode}
          form={form}
          errors={errors}
          isPending={isPending}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}