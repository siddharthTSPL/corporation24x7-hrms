import { useState, useRef } from "react";
import {
  useGetDocuments,
  useUploadDocument,
  useEditDocument,
  useDeleteDocument,
} from "../../auth/server-state/employee/employeeother/employeeother.hook"; // adjust path as needed

const COLORS = {
  deep: "#730042",
  mid: "#CD166E",
  light: "#F9F8F2",
};

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);

const PdfIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.mid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

const ImgIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.deep} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const FileDropZone = ({ onFileSelect, selectedFile }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? COLORS.mid : "rgba(115,0,66,0.3)"}`,
        borderRadius: 12,
        padding: "1.75rem 1rem",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(205,22,110,0.07)" : "rgba(249,248,242,0.7)",
        transition: "all 0.18s",
        marginBottom: "1rem",
      }}
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={COLORS.mid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block" }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 12 15 15" />
      </svg>
      <p style={{ fontSize: 14, fontWeight: 500, color: COLORS.deep, margin: 0 }}>
        Drop your file here or click to browse
      </p>
      <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>PDF, PNG, JPG — max 2 MB</p>
      {selectedFile && (
        <p style={{ fontSize: 12, color: COLORS.mid, fontWeight: 500, marginTop: 8 }}>
          {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
        </p>
      )}
      <input
        ref={inputRef}
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
        position: "fixed", inset: 0,
        background: "rgba(115,0,66,0.18)",
        zIndex: 100, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: COLORS.light, borderRadius: 16,
        padding: "2rem", width: "min(420px, 95vw)",
        border: "1.5px solid rgba(115,0,66,0.18)",
        position: "relative",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "none", border: "none", cursor: "pointer",
            color: COLORS.mid, fontSize: 20, lineHeight: 1,
          }}
        >✕</button>
        <h2 style={{ fontSize: 17, fontWeight: 500, color: COLORS.deep, marginBottom: "1.25rem" }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

const inputStyle = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "1px solid rgba(115,0,66,0.25)", borderRadius: 8,
  background: "#fff", outline: "none",
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 500,
  color: COLORS.deep, marginBottom: 4,
};

export default function FileEm() {
  const { data, isLoading } = useGetDocuments();
  const uploadMutation = useUploadDocument();
  const editMutation = useEditDocument();
  const deleteMutation = useDeleteDocument();

  const documents = data?.documents || [];

  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [fileType, setFileType] = useState("personal");

  const openUpload = () => {
    setEditDoc(null);
    setSelectedFile(null);
    setTitle("");
    setFileType("personal");
    setModalOpen(true);
  };

  const openEdit = (doc) => {
    setEditDoc(doc);
    setSelectedFile(null);
    setTitle(doc.title);
    setFileType(doc.fileType);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = () => {
    if (!title.trim()) return alert("Please enter a document title.");

    if (editDoc) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("fileType", fileType);
      if (selectedFile) formData.append("file", selectedFile);
      editMutation.mutate({ id: editDoc._id, formData }, { onSuccess: closeModal });
    } else {
      if (!selectedFile) return alert("Please select a file.");
      const formData = new FormData();
      formData.append("title", title);
      formData.append("fileType", fileType);
      formData.append("file", selectedFile);
      uploadMutation.mutate(formData, { onSuccess: closeModal });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this document?")) {
      deleteMutation.mutate(id);
    }
  };

  const isPdf = (url = "") => url.toLowerCase().includes(".pdf");

  const filtered = filter === "all" ? documents : documents.filter((d) => d.fileType === filter);

  const pillStyle = (active) => ({
    padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: `1.5px solid ${active ? COLORS.deep : "rgba(115,0,66,0.25)"}`,
    background: active ? COLORS.deep : "transparent",
    color: active ? COLORS.light : COLORS.deep,
    transition: "all 0.15s",
  });

  return (
    <div style={{ padding: "1.5rem 0", fontFamily: "inherit" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: COLORS.deep, margin: 0 }}>My Documents</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Manage your personal and expense files</p>
        </div>
        <button
          onClick={openUpload}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: COLORS.deep, color: COLORS.light,
            border: "none", borderRadius: 10,
            padding: "10px 18px", fontSize: 14, fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <UploadIcon />
          Upload document
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {["all", "personal", "expense"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={pillStyle(filter === f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Document list */}
      {isLoading ? (
        <p style={{ color: "#888", fontSize: 14 }}>Loading documents…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#888" }}>
          <p style={{ fontSize: 14 }}>No documents found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((doc) => (
            <div
              key={doc._id}
              style={{
                background: COLORS.light,
                border: "1px solid rgba(115,0,66,0.13)",
                borderRadius: 12, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isPdf(doc.fileUrl) ? "rgba(205,22,110,0.12)" : "rgba(115,0,66,0.10)",
              }}>
                {isPdf(doc.fileUrl) ? <PdfIcon /> : <ImgIcon />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 14, fontWeight: 500, color: COLORS.deep,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    display: "block", textDecoration: "none",
                  }}
                >
                  {doc.title}
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
                    background: doc.fileType === "personal" ? "rgba(205,22,110,0.12)" : "rgba(115,0,66,0.10)",
                    color: doc.fileType === "personal" ? COLORS.deep : COLORS.mid,
                  }}>
                    {doc.fileType}
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>{doc.size} KB</span>
                  <span style={{ fontSize: 11, color: "#888" }}>
                    {new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {doc.viewedByManager && (
                    <span style={{ fontSize: 11, color: "#5F5E5A" }}>Viewed by manager</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(doc)}
                  title="Edit"
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: "1px solid rgba(115,0,66,0.2)",
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: COLORS.deep,
                  }}
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDelete(doc._id)}
                  title="Delete"
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: "1px solid rgba(205,22,110,0.25)",
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: COLORS.mid,
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editDoc ? "Edit document" : "Upload new document"}>
        <FileDropZone onFileSelect={setSelectedFile} selectedFile={selectedFile} />

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Document title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Health Insurance Card"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>File type</label>
          <select value={fileType} onChange={(e) => setFileType(e.target.value)} style={inputStyle}>
            <option value="personal">Personal</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploadMutation.isPending || editMutation.isPending}
          style={{
            width: "100%", padding: 11,
            background: uploadMutation.isPending || editMutation.isPending ? "#ccc" : COLORS.mid,
            color: COLORS.light, border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 500, cursor: "pointer",
            marginTop: "0.5rem",
          }}
        >
          {uploadMutation.isPending || editMutation.isPending
            ? "Saving…"
            : editDoc ? "Save changes" : "Upload"}
        </button>
      </Modal>
    </div>
  );
}