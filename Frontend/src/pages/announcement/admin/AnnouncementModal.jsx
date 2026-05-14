import { inputCls } from "../../../components/announcement/shared/helpers";
import { Field, ModalOverlay } from "./AdminShared";
import { IconClose } from "./Icons";

export default function AnnouncementModal({ mode, form, errors, isPending, onChange, onSubmit, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[92vh] overflow-y-auto border border-[#F4C0D1]">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#F4C0D1] rounded-t-2xl"
          style={{ background: "#730042" }}>
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              {mode === "create" ? "New Announcement" : "Edit Announcement"}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Fill in the details below</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.18)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}>
            <IconClose size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4" style={{ background: "#F9F8F2" }}>

          <Field label="Title" error={errors.title}>
            <input name="title" placeholder="e.g. Office Holiday Notice"
              value={form.title} onChange={onChange} className={inputCls}
              style={errors.title ? { borderColor: "#F09595", background: "#FCEBEB" } : {}} />
          </Field>

          <Field label="Message" error={errors.message}>
            <textarea name="message" placeholder="Write your announcement details here..."
              value={form.message} onChange={onChange} rows={4}
              className={`${inputCls} resize-none`}
              style={errors.message ? { borderColor: "#F09595", background: "#FCEBEB" } : {}} />
          </Field>

          <Field label="Image URL" optional error={errors.notice_image}>
            <input name="notice_image" placeholder="https://example.com/image.jpg"
              value={form.notice_image} onChange={onChange} className={inputCls}
              style={errors.notice_image ? { borderColor: "#F09595", background: "#FCEBEB" } : {}} />
            {form.notice_image && /^https?:\/\/.+/.test(form.notice_image) && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[#F4C0D1]">
                <img src={form.notice_image} alt="preview" className="w-full h-28 object-cover"
                  onError={(e) => (e.target.style.display = "none")} />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Audience">
              <select name="audience" value={form.audience} onChange={onChange} className={inputCls}>
                <option value="all">All</option>
                <option value="employees">Employees</option>
                <option value="managers">Managers</option>
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" value={form.priority} onChange={onChange} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>

          <Field label="Expiry Date" optional>
            <input type="date" name="expiresAt" value={form.expiresAt} onChange={onChange} className={inputCls} />
          </Field>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-[#F4C0D1] rounded-b-2xl"
          style={{ background: "#F9F8F2" }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#F4C0D1] text-[13px] font-medium text-[#730042] transition-colors hover:bg-[#FBEAF0]"
            style={{ background: "#fff" }}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-88"
            style={{ background: "#730042" }}>
            {isPending
              ? (mode === "create" ? "Creating..." : "Saving...")
              : (mode === "create" ? "Create" : "Save Changes")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}