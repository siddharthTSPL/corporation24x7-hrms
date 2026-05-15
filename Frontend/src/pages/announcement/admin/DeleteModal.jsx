import { ModalOverlay } from "./AdminShared";
import { IconTrash } from "./Icons";

export default function DeleteModal({ target, isDeleting, onConfirm, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl border border-[#F4C0D1] overflow-hidden">

        <div className="px-6 pt-8 pb-5 text-center" style={{ background: "#FBEAF0" }}>
          <div className="w-12 h-12 rounded-full border border-[#F7C1C1] flex items-center justify-center mx-auto mb-3"
            style={{ background: "#FCEBEB" }}>
            <IconTrash size={18} />
          </div>
          <h3 className="text-[15px] font-semibold text-[#730042]">Delete announcement?</h3>
        </div>

        <div className="px-6 py-5 text-center">
          <p className="text-[12px] text-[#993556] leading-relaxed">
            You're about to delete{" "}
            <span className="font-semibold text-[#730042]">"{target.title}"</span>.
            <br />This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#F4C0D1] text-[12px] font-medium text-[#730042] transition-colors hover:bg-[#FBEAF0]"
            style={{ background: "#fff" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-88"
            style={{ background: "#A32D2D" }}>
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}