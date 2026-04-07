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
  high:   { badge: "bg-red-100 text-red-600 border border-red-200",     dot: "bg-red-500",     label: "High"   },
  medium: { badge: "bg-amber-100 text-amber-600 border border-amber-200", dot: "bg-amber-500",   label: "Medium" },
  low:    { badge: "bg-emerald-100 text-emerald-600 border border-emerald-200", dot: "bg-emerald-500", label: "Low" },
};

const AUDIENCE_CONFIG = {
  all:       { icon: "🌐", label: "All",       color: "bg-purple-50 text-purple-600" },
  employees: { icon: "👷", label: "Employees", color: "bg-blue-50 text-blue-600"   },
  managers:  { icon: "🧑‍💼", label: "Managers",  color: "bg-orange-50 text-orange-600" },
};

export default function AnnouncementPage() {
  const [modalMode, setModalMode]       = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});


  const { mutate: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutate: updateAnnouncement, isPending: isUpdating } = useUpdateAnnouncement();
  const { mutate: deleteAnnouncement, isPending: isDeleting } = useDeleteAnnouncement();
   const { data, isLoading, isError } = useGetAllAnnouncement();

const announcements = data?.announcements || [];
console.log("AnnouncementPage data:", data);
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModalMode("create");
  };

  const openEdit = (item) => {
    setSelectedItem(item);
    setForm({
      title:        item.title,
      message:      item.message,
      audience:     item.audience,
      priority:     item.priority,
      notice_image: item.notice_image || "",
      expiresAt:    item.expiresAt
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
    if (!form.title.trim())   err.title   = "Title is required";
    if (!form.message.trim()) err.message = "Message is required";
    if (form.notice_image && !/^https?:\/\/.+/.test(form.notice_image))
      err.notice_image = "Enter a valid image URL (http/https)";
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
    deleteAnnouncement(deleteTarget._id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const isPending = isCreating || isUpdating;

  const stats = [
    { label: "Total",        value: announcements.length,                                                       icon: "📋", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    { label: "High Priority",value: announcements.filter((a) => a.priority === "high").length,                  icon: "🔴", color: "bg-red-50 text-red-600 border-red-100"         },
    { label: "Audience: All",value: announcements.filter((a) => a.audience === "all").length,                   icon: "🌐", color: "bg-purple-50 text-purple-600 border-purple-100" },
    { label: "With Expiry",  value: announcements.filter((a) => a.expiresAt && new Date(a.expiresAt) > new Date()).length, icon: "⏳", color: "bg-amber-50 text-amber-600 border-amber-100" },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📢 <span>Announcements</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Create and manage announcements for your team
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-200 transition-all duration-150"
        >
          <span className="text-xl leading-none">+</span>
          New Announcement
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-4 flex items-center gap-4 bg-white ${stat.color.split(" ").find(c => c.startsWith("border"))}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${stat.color.split(" ").filter(c => c.startsWith("bg") || c.startsWith("text")).join(" ")}`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── LATEST 3 PREVIEW CARDS ── */}
      {!isLoading && announcements.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Latest Announcements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.slice(0, 3).map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {item.notice_image && /^https?:\/\/.+/.test(item.notice_image) ? (
                  <img
                    src={item.notice_image}
                    alt={item.title}
                    className="w-full h-36 object-cover"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-5xl">
                    📢
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_CONFIG[item.priority]?.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[item.priority]?.dot}`} />
                      {PRIORITY_CONFIG[item.priority]?.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${AUDIENCE_CONFIG[item.audience]?.color}`}>
                      {AUDIENCE_CONFIG[item.audience]?.icon} {AUDIENCE_CONFIG[item.audience]?.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{item.message}</p>
                  {item.expiresAt && (
                    <p className="text-xs text-gray-300 mt-2">
                      Expires {new Date(item.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">All Announcements</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">
            {announcements.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-medium">Image</th>
                <th className="px-6 py-3 text-left font-medium">Title & Message</th>
                <th className="px-6 py-3 text-left font-medium">Audience</th>
                <th className="px-6 py-3 text-left font-medium">Priority</th>
                <th className="px-6 py-3 text-left font-medium">Expiry</th>
                <th className="px-6 py-3 text-left font-medium">Created</th>
                <th className="px-6 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className={`h-4 bg-gray-100 rounded-lg animate-pulse ${j === 0 ? "w-10 h-10 rounded-xl" : ""}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-red-400">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p className="font-medium">Failed to load announcements</p>
                    <p className="text-xs text-gray-300 mt-1">Check your network and try again</p>
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="font-semibold text-gray-500">No announcements yet</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Click "New Announcement" to get started
                    </p>
                  </td>
                </tr>
              ) : (
                announcements.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors duration-100">

                    {/* Image */}
                    <td className="px-6 py-4">
                      {item.notice_image && /^https?:\/\/.+/.test(item.notice_image) ? (
                        <img
                          src={item.notice_image}
                          alt="notice"
                          className="w-12 h-12 object-cover rounded-xl border border-gray-100 shadow-sm"
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xl shadow-sm">
                          📢
                        </div>
                      )}
                    </td>

                    {/* Title + Message */}
                    <td className="px-6 py-4 max-w-[220px]">
                      <p className="font-semibold text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{item.message}</p>
                    </td>

                    {/* Audience */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${AUDIENCE_CONFIG[item.audience]?.color}`}>
                        {AUDIENCE_CONFIG[item.audience]?.icon}
                        {AUDIENCE_CONFIG[item.audience]?.label}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_CONFIG[item.priority]?.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[item.priority]?.dot}`} />
                        {PRIORITY_CONFIG[item.priority]?.label}
                      </span>
                    </td>

                    {/* Expiry */}
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {item.expiresAt
                        ? new Date(item.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : <span className="text-gray-200">—</span>}
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Delete"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                        >
                          🗑️
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

      {/* ── CREATE / EDIT MODAL ── */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl z-10">
              <h2 className="text-base font-bold text-gray-800">
                {modalMode === "create" ? "📢 New Announcement" : "✏️ Edit Announcement"}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  name="title"
                  placeholder="e.g. Office Holiday Notice"
                  value={form.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.title ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1.5">{errors.title}</p>}
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="message"
                  placeholder="Write your announcement details here..."
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl text-sm resize-none transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.message ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                {errors.message && <p className="text-red-500 text-xs mt-1.5">{errors.message}</p>}
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Image URL{" "}
                  <span className="font-normal normal-case text-gray-300">(optional)</span>
                </label>
                <input
                  name="notice_image"
                  placeholder="https://example.com/image.jpg"
                  value={form.notice_image}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.notice_image ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                {errors.notice_image && <p className="text-red-500 text-xs mt-1.5">{errors.notice_image}</p>}
                {form.notice_image && /^https?:\/\/.+/.test(form.notice_image) && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-100">
                    <img
                      src={form.notice_image}
                      alt="preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  </div>
                )}
              </div>

              {/* Audience + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Audience
                  </label>
                  <select
                    name="audience"
                    value={form.audience}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">🌐 All</option>
                    <option value="employees">👷 Employees</option>
                    <option value="managers">🧑‍💼 Managers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Expiry Date{" "}
                  <span className="font-normal normal-case text-gray-300">(optional)</span>
                </label>
                <input
                  type="date"
                  name="expiresAt"
                  value={form.expiresAt}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white flex justify-end gap-3 px-6 py-4 border-t border-gray-100 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 disabled:opacity-50 transition"
              >
                {isPending
                  ? modalMode === "create" ? "Creating..." : "Saving..."
                  : modalMode === "create" ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-red-50 px-6 pt-8 pb-4 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-gray-800">Delete Announcement?</h3>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-sm text-gray-500 mb-1">
                You're about to delete:
              </p>
              <p className="text-sm font-semibold text-gray-800 mb-4">
                "{deleteTarget.title}"
              </p>
              <p className="text-xs text-gray-400">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-200 disabled:opacity-50 transition"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}