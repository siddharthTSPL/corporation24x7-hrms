// "Delete for me" / "Delete for everyone" chooser (like WhatsApp).
export default function DeleteDialog({ canDeleteForAll, onDeleteForMe, onDeleteForAll, onCancel }) {
  return (
    <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold text-gray-900 mb-3">Delete message?</p>
        <div className="flex flex-col gap-1.5">
          {canDeleteForAll && (
            <button type="button" onClick={onDeleteForAll} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50">
              Delete for everyone
            </button>
          )}
          <button type="button" onClick={onDeleteForMe} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Delete for me
          </button>
          <button type="button" onClick={onCancel} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
