import { useState } from "react";
import {
  useCreateAnnouncement,
  useGetAllAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "../../../auth/server-state/adminannounce/adminannounce.hook";
import { EMPTY_FORM } from "../../../components/announcement/shared/constants";
import { StatCards, LatestCards } from "./AdminShared";
import AnnouncementTable  from "./AnnouncementTable";
import AnnouncementModal  from "./AnnouncementModal";
import DeleteModal        from "./DeleteModal";
import { IconPlus }       from "./Icons";

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

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ background: "#F9F8F2" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#730042] tracking-tight">Announcements</h1>
          <p className="text-[12px] text-[#993556] mt-1">Create and manage announcements for your team</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity hover:opacity-88"
          style={{ background: "#730042" }}>
          <IconPlus size={14} />
          New Announcement
        </button>
      </div>

      <StatCards announcements={announcements} />

      {!isLoading && <LatestCards announcements={announcements} />}

      <AnnouncementTable
        announcements={announcements}
        isLoading={isLoading}
        isError={isError}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      {modalMode && (
        <AnnouncementModal
          mode={modalMode}
          form={form}
          errors={errors}
          isPending={isPending}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={() => deleteAnnouncement(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) })}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}