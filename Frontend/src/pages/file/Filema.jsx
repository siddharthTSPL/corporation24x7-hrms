// ─────────────────────────────────────────────────────────────────────────
// Managerdocument.jsx
//
// Two permission-gated sections, shown as tabs:
//   "My Documents"   -> gated on documents.can_upload_documents
//   "All Documents"  -> gated on documents.can_view_all_documents
//
// Both tabs always render. If a manager lacks the permission for a tab,
// <Can> shows its built-in "Access Restricted" lock state for that tab only
// — the other tab keeps working normally.
//
// Adjust the two import paths below to match your project structure:
// ─────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  FaCloudUploadAlt,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload,
  FaTimes,
  FaFilePdf,
  FaFileImage,
  FaFolderOpen,
  FaWallet,
  FaIdCard,
  FaPlus,
} from "react-icons/fa";
import Can from "../../components/can";
import {
  useGetManagerDocuments,
  useUploadManagerDocument,
  useUpdateManagerDocument,
  useDeleteManagerDocument,
  useGetAllExpenseDocuments,
  useGetAllPersonalDocuments,
} from "../../auth/server-state/manager/managerdocument/managerdocument.hook";

const BRAND = "#730042";
const MAX_SIZE_KB = 2048;
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const TABS = { MINE: "mine", ORG: "org" };
const SUB = { PERSONAL: "personal", EXPENSE: "expense" };

// ── small helpers ───────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatSize = (kb) => {
  if (kb == null) return "—";
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
};

const FileIcon = ({ url, className }) => {
  const isImage = /\.(png|jpe?g)$/i.test(url || "");
  return isImage ? (
    <FaFileImage className={className} />
  ) : (
    <FaFilePdf className={className} />
  );
};

const TypeBadge = ({ type }) => {
  const isExpense = type === "expense";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        isExpense
          ? "bg-amber-50 text-amber-700"
          : "bg-blue-50 text-blue-600"
      }`}
    >
      {isExpense ? <FaWallet size={10} /> : <FaIdCard size={10} />}
      {isExpense ? "Expense" : "Personal"}
    </span>
  );
};

const EmptyState = ({ title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4">
    <div className="w-16 h-16 rounded-full bg-[#730042]/8 flex items-center justify-center mb-4">
      <FaFolderOpen size={26} className="text-[#730042]/60" />
    </div>
    <p className="font-semibold text-gray-700">{title}</p>
    <p className="text-sm text-gray-400 mt-1 max-w-xs">{subtitle}</p>
    {action}
  </div>
);

const RowSkeleton = () => (
  <div className="animate-pulse flex items-center gap-4 px-4 py-4 border-b border-gray-100">
    <div className="w-9 h-9 rounded-lg bg-gray-100" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 bg-gray-100 rounded" />
      <div className="h-2 w-1/5 bg-gray-100 rounded" />
    </div>
  </div>
);

const Banner = ({ tone, message, onClose }) => (
  <div
    className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl text-sm mb-4 ${
      tone === "error"
        ? "bg-red-50 text-red-600"
        : "bg-emerald-50 text-emerald-700"
    }`}
  >
    <span>{message}</span>
    <button onClick={onClose} className="text-current opacity-60 hover:opacity-100">
      <FaTimes size={12} />
    </button>
  </div>
);

// ── Upload / Edit modal ─────────────────────────────────────────────────
const DocumentFormModal = ({ mode, initial, onClose, onSubmit, submitting, error }) => {
  const [title, setTitle] = useState(initial?.title || "");
  const [fileType, setFileType] = useState(initial?.fileType || SUB.PERSONAL);
  const [file, setFile] = useState(null);
  const [localError, setLocalError] = useState("");

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setLocalError("Only PDF, PNG, or JPG files are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_KB * 1024) {
      setLocalError("File size must be under 2MB.");
      return;
    }
    setLocalError("");
    setFile(f);
  };

  const handleSubmit = () => {
    if (!title.trim()) return setLocalError("Title is required.");
    if (mode === "upload" && !file) return setLocalError("Please choose a file to upload.");
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("fileType", fileType);
    if (file) formData.append("file", file);
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {mode === "upload" ? "Upload document" : "Edit document"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {(localError || error) && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {localError || error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PAN Card, March Travel Bill"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/20 focus:border-[#730042]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
            <div className="flex gap-2">
              {[SUB.PERSONAL, SUB.EXPENSE].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFileType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    fileType === t
                      ? "bg-[#730042] text-white border-[#730042]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {t === SUB.PERSONAL ? "Personal" : "Expense"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              File {mode === "edit" && <span className="text-gray-400">(optional — keep existing)</span>}
            </label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-6 text-sm text-gray-400 cursor-pointer hover:border-[#730042]/40 hover:text-[#730042]/70 transition">
              <FaCloudUploadAlt size={18} />
              {file ? file.name : "PDF, PNG or JPG, up to 2MB"}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-[#730042] hover:bg-[#5c0335] disabled:opacity-50 transition"
          >
            {submitting ? "Saving…" : mode === "upload" ? "Upload" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete confirm modal ────────────────────────────────────────────────
const DeleteConfirmModal = ({ doc, onClose, onConfirm, submitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Delete document?</h3>
      <p className="text-sm text-gray-400 mb-5">
        "{doc?.title}" will be permanently removed. This can't be undone.
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 transition"
        >
          {submitting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ── "My Documents" tab content ──────────────────────────────────────────
const MyDocumentsSection = () => {
  const { data, isLoading } = useGetManagerDocuments();
  const uploadMutation = useUploadManagerDocument();
  const updateMutation = useUpdateManagerDocument();
  const deleteMutation = useDeleteManagerDocument();

  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // { type: 'upload' | 'edit' | 'delete', doc }
  const [banner, setBanner] = useState(null);

  const docs = data?.documents ?? [];
  const filtered = filter === "all" ? docs : docs.filter((d) => d.fileType === filter);

  const closeModal = () => setModal(null);

  const handleUpload = (formData) => {
    uploadMutation.mutate(formData, {
      onSuccess: () => {
        setBanner({ tone: "success", message: "Document uploaded successfully." });
        closeModal();
      },
      onError: (err) => setBanner({ tone: "error", message: err.message }),
    });
  };

  const handleEdit = (formData) => {
    updateMutation.mutate(
      { id: modal.doc.id, data: formData },
      {
        onSuccess: () => {
          setBanner({ tone: "success", message: "Document updated successfully." });
          closeModal();
        },
        onError: (err) => setBanner({ tone: "error", message: err.message }),
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(modal.doc.id, {
      onSuccess: () => {
        setBanner({ tone: "success", message: "Document deleted." });
        closeModal();
      },
      onError: (err) => setBanner({ tone: "error", message: err.message }),
    });
  };

  return (
    <div>
      {banner && <Banner {...banner} onClose={() => setBanner(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-2">
          {["all", SUB.PERSONAL, SUB.EXPENSE].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition ${
                filter === t
                  ? "bg-[#730042] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => setModal({ type: "upload" })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#730042] text-white text-sm font-medium hover:bg-[#5c0335] transition"
        >
          <FaPlus size={12} /> Upload document
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
          {isLoading ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No documents yet"
              subtitle="Upload your ID, certificates, or expense receipts to keep them organized here."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                          <FileIcon url={doc.fileUrl} className="text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-700">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><TypeBadge type={doc.fileType} /></td>
                    <td className="px-5 py-3.5 text-gray-500">{formatSize(doc.sizeKB)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDate(doc.uploadedAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-3 text-gray-400">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" title="View" className="hover:text-[#730042]">
                          <FaEye size={14} />
                        </a>
                        <button onClick={() => setModal({ type: "edit", doc })} title="Edit" className="hover:text-[#730042]">
                          <FaEdit size={14} />
                        </button>
                        <button onClick={() => setModal({ type: "delete", doc })} title="Delete" className="hover:text-red-500">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {isLoading ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No documents yet"
              subtitle="Upload your ID, certificates, or expense receipts to keep them organized here."
            />
          ) : (
            filtered.map((doc) => (
              <div key={doc.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <FileIcon url={doc.fileUrl} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <TypeBadge type={doc.fileType} />
                      <span className="text-xs text-gray-400">{formatSize(doc.sizeKB)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Uploaded {formatDate(doc.uploadedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pl-12 text-gray-400">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs hover:text-[#730042]">
                    <FaEye size={12} /> View
                  </a>
                  <button onClick={() => setModal({ type: "edit", doc })} className="flex items-center gap-1.5 text-xs hover:text-[#730042]">
                    <FaEdit size={12} /> Edit
                  </button>
                  <button onClick={() => setModal({ type: "delete", doc })} className="flex items-center gap-1.5 text-xs hover:text-red-500">
                    <FaTrash size={12} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modal?.type === "upload" && (
        <DocumentFormModal
          mode="upload"
          onClose={closeModal}
          onSubmit={handleUpload}
          submitting={uploadMutation.isPending}
          error={uploadMutation.error?.message}
        />
      )}
      {modal?.type === "edit" && (
        <DocumentFormModal
          mode="edit"
          initial={modal.doc}
          onClose={closeModal}
          onSubmit={handleEdit}
          submitting={updateMutation.isPending}
          error={updateMutation.error?.message}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteConfirmModal
          doc={modal.doc}
          onClose={closeModal}
          onConfirm={handleDelete}
          submitting={deleteMutation.isPending}
        />
      )}
    </div>
  );
};

// ── "All Documents" tab content (read-only, org-wide) ──────────────────
const AllDocumentsSection = () => {
  const [subTab, setSubTab] = useState(SUB.PERSONAL);
  const { data: personalData, isLoading: personalLoading } = useGetAllPersonalDocuments();
  const { data: expenseData, isLoading: expenseLoading } = useGetAllExpenseDocuments();

  const isLoading = subTab === SUB.PERSONAL ? personalLoading : expenseLoading;
  const docs = (subTab === SUB.PERSONAL ? personalData?.documents : expenseData?.documents) ?? [];

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {[SUB.PERSONAL, SUB.EXPENSE].map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition ${
              subTab === t ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:block">
          {isLoading ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : docs.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              subtitle={`No ${subTab} documents have been uploaded across the organization.`}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Uploaded by</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                          <FileIcon url={doc.fileUrl} className="text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-700">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{doc.uploaderModel}</td>
                    <td className="px-5 py-3.5 text-gray-500">{formatSize(doc.sizeKB)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDate(doc.uploadedAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#730042] hover:underline">
                        <FaDownload size={11} /> Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="md:hidden divide-y divide-gray-50">
          {isLoading ? (
            <RowSkeleton />
          ) : docs.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              subtitle={`No ${subTab} documents have been uploaded across the organization.`}
            />
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 px-4 py-4">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <FileIcon url={doc.fileUrl} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {doc.uploaderModel} · {formatSize(doc.sizeKB)} · {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[#730042] shrink-0">
                  <FaDownload size={14} />
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────
function Managerdocument() {
  const [activeTab, setActiveTab] = useState(TABS.MINE);

  return (
    <div className="min-h-screen bg-[#FAF8F6] px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Documents</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your files and browse organization documents.</p>
        </div>

        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {[
            { key: TABS.MINE, label: "My Documents" },
            { key: TABS.ORG, label: "All Documents" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === t.key
                  ? "border-[#730042] text-[#730042]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === TABS.MINE && (
          <Can do="documents.can_upload_documents">
            <MyDocumentsSection />
          </Can>
        )}

        {activeTab === TABS.ORG && (
          <Can do="documents.can_view_all_documents">
            <AllDocumentsSection />
          </Can>
        )}
      </div>
    </div>
  );
}

export default Managerdocument;