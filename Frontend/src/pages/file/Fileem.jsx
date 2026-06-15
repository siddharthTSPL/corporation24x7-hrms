import { useState, useRef } from "react";
import {
  useGetDocuments,
  useUploadDocument,
  useEditDocument,
  useDeleteDocument,
} from "../../auth/server-state/employee/employeeother/employeeother.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const isPdf = (url = "") => url.toLowerCase().includes(".pdf");

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

function FileDropZone({ onFileSelect, selectedFile }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  };

  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all mb-4 ${
        drag
          ? "border-[#CD166E] bg-[rgba(205,22,110,0.05)]"
          : "border-[rgba(115,0,66,0.2)] bg-[#F9F8F2] hover:border-[#730042] hover:bg-[rgba(115,0,66,0.03)]"
      }`}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <polyline points="9 15 12 12 15 15"/>
      </svg>
      <p className="text-[13px] font-medium text-[#730042] m-0">Drop file here or tap to browse</p>
      <p className="text-[11px] text-[#9B7A8E] mt-1 mb-0">PDF, PNG, JPG — max 2 MB</p>
      {selectedFile && (
        <p className="text-[12px] text-[#CD166E] font-medium mt-2 mb-0">
          {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
        </p>
      )}
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
        onChange={(e) => e.target.files[0] && onFileSelect(e.target.files[0])} />
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-[rgba(26,10,18,0.45)] z-[200] flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-[440px] border border-[rgba(115,0,66,0.12)] relative max-h-[90vh] overflow-y-auto shadow-xl">
        <button onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-[#9B7A8E] text-xl leading-none p-1 hover:text-[#730042] transition-colors"
        >×</button>
        <h2 className="text-[16px] font-semibold text-[#730042] mb-5 mt-0">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function NoPermission() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3 className="text-[16px] font-semibold text-[#730042] mb-1">Access Restricted</h3>
      <p className="text-[13px] text-[#9B7A8E]">You don't have permission to upload or manage documents.</p>
    </div>
  );
}

export default function FileEm() {
  const can = usePermissionStore((s) => s.can);
  const canUpload = can("documents.can_upload_documents");

  const { data, isLoading } = useGetDocuments();
  const uploadMut = useUploadDocument();
  const editMut = useEditDocument();
  const deleteMut = useDeleteDocument();

  const docs = data?.documents || [];

  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [fileType, setFileType] = useState("personal");
  const [toast, setToast] = useState(null);

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  };

  const openUpload = () => {
    if (!canUpload) return;
    setEditDoc(null);
    setFile(null);
    setTitle("");
    setFileType("personal");
    setModalOpen(true);
  };

  const openEdit = (doc) => {
    if (!canUpload) return;
    setEditDoc(doc);
    setFile(null);
    setTitle(doc.title);
    setFileType(doc.fileType);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = () => {
    if (!title.trim()) { showToast("Please enter a document title.", "err"); return; }
    const fd = new FormData();
    fd.append("title", title);
    fd.append("fileType", fileType);
    if (file) fd.append("file", file);

    if (editDoc) {
      editMut.mutate(
        { id: editDoc._id, formData: fd },
        {
          onSuccess: () => { closeModal(); showToast("Document updated."); },
          onError: () => showToast("Update failed.", "err"),
        }
      );
    } else {
      if (!file) { showToast("Please select a file.", "err"); return; }
      uploadMut.mutate(fd, {
        onSuccess: () => { closeModal(); showToast("Document uploaded."); },
        onError: () => showToast("Upload failed.", "err"),
      });
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this document?")) return;
    deleteMut.mutate(id, {
      onSuccess: () => showToast("Document deleted."),
      onError: () => showToast("Delete failed.", "err"),
    });
  };

  const filtered = filter === "all" ? docs : docs.filter((d) => d.fileType === filter);
  const isBusy = uploadMut.isPending || editMut.isPending;

  const inputCls = "w-full px-3 py-2.5 text-[13px] border border-[rgba(115,0,66,0.12)] rounded-lg bg-[#F9F8F2] outline-none text-[#1A0A12] focus:border-[#730042] transition-colors box-border font-[inherit]";
  const labelCls = "block text-[11px] font-semibold text-[#730042] mb-1.5 uppercase tracking-wide";

  return (
    <div className="py-5 px-0 font-[inherit]">
      <style>{`@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}`}</style>

      <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-[18px] font-bold text-[#730042] m-0">My Documents</h1>
          <p className="text-[12px] text-[#9B7A8E] mt-1 mb-0">Manage your personal and expense files</p>
        </div>
        {canUpload && (
          <button onClick={openUpload}
            className="flex items-center gap-1.5 bg-[#730042] text-white border-none rounded-xl px-4 py-2.5 text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload
          </button>
        )}
      </div>

      {!canUpload && docs.length === 0 && !isLoading && <NoPermission />}

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "personal", "expense"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all cursor-pointer ${
              filter === f
                ? "bg-[#730042] text-white border-[#730042]"
                : "bg-transparent text-[#730042] border-[rgba(115,0,66,0.2)] hover:bg-[rgba(115,0,66,0.07)]"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[70px] rounded-xl"
              style={{ background: "linear-gradient(90deg,#f0e8ed 25%,#f8f3f6 50%,#f0e8ed 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#F9F8F2] rounded-xl border border-dashed border-[rgba(115,0,66,0.2)]">
          <div className="text-4xl mb-2">📂</div>
          <p className="text-[13px] text-[#9B7A8E] m-0">
            {filter === "all" ? "No documents yet." : `No ${filter} documents.`}
          </p>
          {canUpload && (
            <button onClick={openUpload}
              className="mt-3 bg-transparent border-none text-[#CD166E] text-[13px] font-semibold cursor-pointer underline"
            >
              Upload your first document
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((doc) => (
            <div key={doc._id}
              className="bg-white border border-[rgba(115,0,66,0.12)] rounded-xl px-3.5 sm:px-4 py-3.5 flex items-center gap-3 hover:shadow-[0_4px_16px_rgba(115,0,66,0.09)] transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${isPdf(doc.fileUrl) ? "bg-[rgba(205,22,110,0.1)]" : "bg-[rgba(115,0,66,0.08)]"}`}>
                {isPdf(doc.fileUrl) ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                    <line x1="9" y1="17" x2="15" y2="17"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#730042" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                  className="text-[13px] font-semibold text-[#730042] truncate block no-underline hover:underline"
                >
                  {doc.title}
                </a>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    doc.fileType === "personal" ? "bg-[rgba(205,22,110,0.1)] text-[#CD166E]" : "bg-[rgba(115,0,66,0.08)] text-[#730042]"
                  }`}>
                    {doc.fileType}
                  </span>
                  {doc.size && <span className="text-[11px] text-[#9B7A8E]">{doc.size} KB</span>}
                  <span className="text-[11px] text-[#9B7A8E]">{fmt(doc.uploadedAt)}</span>
                  {doc.viewedByManager && (
                    <span className="text-[11px] text-[#5F5E5A] flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Seen by manager
                    </span>
                  )}
                </div>
              </div>

              {canUpload && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(doc)} title="Edit"
                    className="w-8 h-8 rounded-lg border border-[rgba(115,0,66,0.12)] bg-transparent cursor-pointer flex items-center justify-center hover:bg-[rgba(115,0,66,0.07)] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#730042" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(doc._id)} title="Delete"
                    className="w-8 h-8 rounded-lg border border-[rgba(205,22,110,0.2)] bg-transparent cursor-pointer flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-[13px] font-medium border z-[300] shadow-lg whitespace-nowrap ${
          toast.kind === "ok"
            ? "bg-green-50 text-green-800 border-green-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.kind === "ok" ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editDoc ? "Edit document" : "Upload document"}>
        <FileDropZone onFileSelect={setFile} selectedFile={file} />

        <div className="mb-4">
          <label className={labelCls}>Document title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Health Insurance Card" className={inputCls} />
        </div>

        <div className="mb-4">
          <label className={labelCls}>File type</label>
          <select value={fileType} onChange={(e) => setFileType(e.target.value)} className={inputCls}>
            <option value="personal">Personal</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <button onClick={handleSubmit} disabled={isBusy}
          className="w-full py-3 bg-[#CD166E] text-white border-none rounded-xl text-[14px] font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
        >
          {isBusy ? "Saving…" : editDoc ? "Save changes" : "Upload"}
        </button>
      </Modal>
    </div>
  );
}