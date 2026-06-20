import { useState } from "react";
import {
  useCreateAnnouncement,
  useGetAllAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "../../../auth/server-state/adminannounce/adminannounce.hook";
import { usePermissionStore } from "../../../auth/store/permission/permissionStore";
import { EMPTY_FORM } from "../../../components/announcement/shared/constants";
import { StatCards, LatestCards, FullPageLockScreen, ViewBlurOverlay } from "./AdminShared";
import AnnouncementTable  from "./AnnouncementTable";
import AnnouncementModal  from "./AnnouncementModal";
import DeleteModal        from "./DeleteModal";
import { IconPlus, IconLock } from "./Icons";

export default function AnnouncementPage() {
  const [modalMode,    setModalMode]    = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState({});

  const can = usePermissionStore((state) => state.can);
  const canView   = can("announcements.can_view_announcements");
  const canCreate = can("announcements.can_create_announcement");
  const canEdit   = can("announcements.can_edit_announcement");
  const canDelete = can("announcements.can_delete_announcement");
  const allLocked = !canView && !canCreate && !canEdit && !canDelete;

  const { mutate: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutate: updateAnnouncement, isPending: isUpdating } = useUpdateAnnouncement();
  const { mutate: deleteAnnouncement, isPending: isDeleting } = useDeleteAnnouncement();
  const { data, isLoading, isError }                          = useGetAllAnnouncement();

  const announcements = data?.announcements || [];
  const isPending     = isCreating || isUpdating;

  const openCreate = () => {
    if (!canCreate) return;
    setForm(EMPTY_FORM); setErrors({}); setModalMode("create");
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

  if (allLocked) {
    return (
      <div className="p-4 md:p-8 min-h-screen" style={{ background: "#F9F8F2" }}>
        <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden">
          <FullPageLockScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ background: "#F9F8F2" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#730042] tracking-tight">Announcements</h1>
          <p className="text-[12px] text-[#993556] mt-1">Create and manage announcements for your team</p>
        </div>
        {canCreate ? (
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity hover:opacity-88"
            style={{ background: "#730042" }}>
            <IconPlus size={14} />
            New Announcement
          </button>
        ) : (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-[#993556] border border-[#F4C0D1] opacity-60 cursor-not-allowed select-none"
            style={{ background: "#fff" }}
            title="You don't have permission to create announcements">
            <IconLock size={12} />
            New Announcement
          </div>
        )}
      </div>

      <div className="relative">
        {!canView && <ViewBlurOverlay />}

        <div className={!canView ? "pointer-events-none select-none" : ""} aria-hidden={!canView}>
          <StatCards announcements={announcements} hideValues={!canView} />

          {canView && !isLoading && <LatestCards announcements={announcements} />}

          <AnnouncementTable
            announcements={canView ? announcements : []}
            isLoading={canView ? isLoading : false}
            isError={canView && isError}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>
      </div>

      {modalMode && (canCreate || canEdit) && (
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

      {deleteTarget && canDelete && (
        <DeleteModal
          target={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}