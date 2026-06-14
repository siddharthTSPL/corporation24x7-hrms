import { useState, useRef } from "react";
import {
  useGetDocuments,
  useUploadDocument,
  useEditDocument,
  useDeleteDocument,
} from "../../auth/server-state/employee/employeeother/employeeother.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const C = {
  primary: "#730042",
  accent: "#CD166E",
  bg: "#F9F8F2",
  card: "#ffffff",
  border: "rgba(115,0,66,0.12)",
  muted: "#9B7A8E",
  text: "#1A0A12",
  sub: "#5C3A50",
};

const isPdf = (url = "") => url.toLowerCase().includes(".pdf");

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const FileDropZone = ({ onFileSelect, selectedFile }) => {
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
      style={{
        border: `2px dashed ${drag ? C.accent : C.border}`,
        borderRadius: 12,
        padding: "1.5rem 1rem",
        textAlign: "center",
        cursor: "pointer",
        background: drag ? "rgba(205,22,110,0.05)" : C.bg,
        transition: "all 0.18s",
        marginBottom: "1rem",
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.accent}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ margin: "0 auto 8px", display: "block" }}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 12 15 15" />
      </svg>
      <p style={{ fontSize: 13, fontWeight: 500, color: C.primary, margin: 0 }}>
        Drop file here or tap to browse
      </p>
      <p style={{ fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 0 }}>
        PDF, PNG, JPG — max 2 MB
      </p>
      {selectedFile && (
        <p style={{ fontSize: 12, color: C.accent, fontWeight: 500, marginTop: 8, marginBottom: 0 }}>
          {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
        </p>
      )}
      <input
        ref={ref}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFileSelect(e.target.files[0])}
      />
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,10,18,0.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "1.75rem",
          width: "min(440px, 100%)",
          border: `1px solid ${C.border}`,
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.muted,
            fontSize: 20,
            lineHeight: 1,
            padding: "4px 8px",
          }}
        >
          ×
        </button>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: C.primary,
            marginBottom: "1.25rem",
            marginTop: 0,
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

const inp = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  background: C.bg,
  outline: "none",
  color: C.text,
  boxSizing: "border-box",
};

const lbl = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: C.primary,
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

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
    if (!title.trim()) {
      showToast("Please enter a document title.", "err");
      return;
    }
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

  const filtered =
    filter === "all" ? docs : docs.filter((d) => d.fileType === filter);

  const isBusy = uploadMut.isPending || editMut.isPending;

  return (
    <div style={{ padding: "1.25rem 0", fontFamily: "inherit" }}>
      <style>{`
        .fe-pill { padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid ${C.border}; transition: all 0.15s; background: transparent; color: ${C.primary}; }
        .fe-pill.active { background: ${C.primary}; color: #fff; border-color: ${C.primary}; }
        .fe-pill:hover:not(.active) { background: rgba(115,0,66,0.07); }
        .fe-doc-card { background: #fff; border: 1px solid ${C.border}; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; transition: box-shadow 0.18s; }
        .fe-doc-card:hover { box-shadow: 0 4px 16px rgba(115,0,66,0.09); }
        .fe-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid ${C.border}; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
        .fe-icon-btn:hover { background: rgba(115,0,66,0.07); }
        .fe-upload-btn { display: flex; align-items: center; gap: 7px; background: ${C.primary}; color: #fff; border: none; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; white-space: nowrap; }
        .fe-upload-btn:hover { opacity: 0.9; }
        .fe-upload-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .fe-save-btn { width: 100%; padding: 11px; background: ${C.accent}; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; margin-top: 0.5rem; }
        .fe-save-btn:hover { opacity: 0.9; }
        .fe-save-btn:disabled { background: #ccc; cursor: not-allowed; }
        @media (max-width: 480px) {
          .fe-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .fe-doc-info { min-width: 0; }
          .fe-doc-meta { flex-wrap: wrap; }
          .fe-doc-actions { flex-direction: row; }
        }
      `}</style>

      <div
        className="fe-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.primary, margin: 0 }}>
            My Documents
          </h1>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3, marginBottom: 0 }}>
            Manage your personal and expense files
          </p>
        </div>
        {canUpload && (
          <button className="fe-upload-btn" onClick={openUpload}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: "1.1rem", flexWrap: "wrap" }}>
        {["all", "personal", "expense"].map((f) => (
          <button
            key={f}
            className={`fe-pill${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 70,
                borderRadius: 12,
                background: "linear-gradient(90deg,#f0e8ed 25%,#f8f3f6 50%,#f0e8ed 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          ))}
          <style>{`@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: C.muted,
            background: C.bg,
            borderRadius: 12,
            border: `1px dashed ${C.border}`,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
          <p style={{ fontSize: 13, margin: 0 }}>
            {filter === "all" ? "No documents yet." : `No ${filter} documents.`}
          </p>
          {canUpload && (
            <button
              onClick={openUpload}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: C.accent,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Upload your first document
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((doc) => (
            <div key={doc._id} className="fe-doc-card">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isPdf(doc.fileUrl)
                    ? "rgba(205,22,110,0.1)"
                    : "rgba(115,0,66,0.08)",
                }}
              >
                {isPdf(doc.fileUrl) ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>

              <div className="fe-doc-info" style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.primary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                    textDecoration: "none",
                  }}
                >
                  {doc.title}
                </a>
                <div
                  className="fe-doc-meta"
                  style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background:
                        doc.fileType === "personal"
                          ? "rgba(205,22,110,0.1)"
                          : "rgba(115,0,66,0.08)",
                      color:
                        doc.fileType === "personal" ? C.accent : C.primary,
                      textTransform: "capitalize",
                    }}
                  >
                    {doc.fileType}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>{doc.size} KB</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{fmt(doc.uploadedAt)}</span>
                  {doc.viewedByManager && (
                    <span style={{ fontSize: 11, color: "#5F5E5A" }}>Seen by manager</span>
                  )}
                </div>
              </div>

              {canUpload && (
                <div className="fe-doc-actions" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    className="fe-icon-btn"
                    onClick={() => openEdit(doc)}
                    title="Edit"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="fe-icon-btn"
                    onClick={() => handleDelete(doc._id)}
                    title="Delete"
                    style={{ borderColor: "rgba(205,22,110,0.2)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            background: toast.kind === "ok" ? "#F0FDF4" : "#FEF2F2",
            color: toast.kind === "ok" ? "#065F46" : "#991B1B",
            border: `1px solid ${toast.kind === "ok" ? "#86EFAC" : "#FCA5A5"}`,
            zIndex: 300,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            whiteSpace: "nowrap",
          }}
        >
          {toast.kind === "ok" ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editDoc ? "Edit document" : "Upload document"}
      >
        <FileDropZone onFileSelect={setFile} selectedFile={file} />

        <div style={{ marginBottom: "1rem" }}>
          <label style={lbl}>Document title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Health Insurance Card"
            style={inp}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={lbl}>File type</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            style={inp}
          >
            <option value="personal">Personal</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <button
          className="fe-save-btn"
          onClick={handleSubmit}
          disabled={isBusy}
        >
          {isBusy ? "Saving…" : editDoc ? "Save changes" : "Upload"}
        </button>
      </Modal>
    </div>
  );
}