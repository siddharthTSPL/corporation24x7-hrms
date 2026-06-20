import { useState, useMemo } from "react";
import {
  useGetAllPersonalDocuments,
  useGetAllExpenseDocuments,
  useGetDocumentDetails,
} from "../../auth/server-state/adminother/adminother.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtSize(kb) {
  if (!kb && kb !== 0) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function fmtRole(role) {
  if (!role) return "—";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getExt(url = "") {
  const clean = url.split("?")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

function isPdf(url = "") {
  return url.toLowerCase().includes(".pdf");
}

function exportToCSV(docs) {
  const headers = [
    "Title",
    "Type",
    "Uploader Name",
    "Email",
    "Role",
    "Department",
    "Designation",
    "Size",
    "Uploaded At",
    "Viewed by Admin",
  ];
  const rows = docs.map((d) => [
    `"${d.title}"`,
    d.fileType,
    `"${d.uploader?.name || "—"}"`,
    `"${d.uploader?.email || "—"}"`,
    `"${d.uploaderModel || "—"}"`,
    `"${d.uploader?.department || "—"}"`,
    `"${d.uploader?.designation || "—"}"`,
    fmtSize(d.sizeKB),
    fmtDate(d.uploadedAt),
    d.viewedByAdmin ? "Yes" : "No",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `team-documents-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Spinner({ size = 28 }) {
  return (
    <div
      className="rounded-full border-2 border-[#730042]/20 border-t-[#730042] animate-spin flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
      <div className="w-14 h-14 rounded-full bg-[#730042]/10 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke="#730042"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="14 2 14 8 20 8"
            stroke="#730042"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-[#2a1a16]">No documents found</p>
      <p className="text-xs text-[#b0948a] text-center">{message}</p>
    </div>
  );
}

function NoPermission() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-[16px] font-semibold text-[#730042] mb-1">Access Restricted</h3>
      <p className="text-[13px] text-[#9B7A8E]">You don't have permission to view team documents.</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-[#ede5e0] gap-4">
      <span className="text-xs text-[#b0948a] shrink-0">{label}</span>
      <span className="text-xs text-[#2a1a16] font-medium text-right break-all">{value || "—"}</span>
    </div>
  );
}

function FileTypeIcon({ url, docType }) {
  const color = docType === "personal" ? "#730042" : "#185FA5";
  if (isPdf(url)) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="9" y1="13" x2="15" y2="13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="9" y1="17" x2="15" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth="1.4" />
      <polyline points="21 15 16 10 5 21" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailDrawer({ documentId, docType, onClose }) {
  const { data, isLoading, isError } = useGetDocumentDetails(documentId);
  const doc = data?.document;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#2a1a16]/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full sm:max-w-md h-full bg-white flex flex-col shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white z-10 px-4 sm:px-6 py-4 border-b border-[#ede5e0] flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-semibold text-[#2a1a16] truncate">Document details</p>
            <p className="text-xs text-[#b0948a] mt-0.5">
              {docType === "personal" ? "Personal" : "Expense"} document
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-[#ede5e0] flex items-center justify-center text-[#b0948a] hover:bg-[#f9f8f2] transition-colors text-xl leading-none shrink-0 bg-transparent cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center pt-20 gap-3">
              <Spinner />
              <p className="text-xs text-[#b0948a]">Loading…</p>
            </div>
          )}
          {isError && (
            <div className="p-4 bg-red-50 rounded-xl text-sm text-red-500 border border-red-100">
              Failed to load document details.
            </div>
          )}
          {doc && (
            <>
              <div
                className="rounded-2xl p-4 sm:p-5 mb-5 flex flex-col items-center gap-3 border"
                style={{
                  background: docType === "personal" ? "rgba(115,0,66,0.05)" : "rgba(24,95,165,0.05)",
                  borderColor: docType === "personal" ? "rgba(115,0,66,0.15)" : "rgba(24,95,165,0.15)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: docType === "personal" ? "#730042" : "#185FA5" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14 2 14 8 20 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-center w-full min-w-0">
                  <p className="text-sm font-semibold text-[#2a1a16] mb-2 break-words">{doc.title}</p>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <Badge className={docType === "personal" ? "bg-[#730042]/10 text-[#730042]" : "bg-blue-50 text-blue-700"}>
                      {docType === "personal" ? "Personal" : "Expense"}
                    </Badge>
                    <Badge className="bg-[#f9f8f2] text-[#b0948a] border border-[#ede5e0]">
                      {getExt(doc.fileUrl)}
                    </Badge>
                    {doc.size && (
                      <Badge className="bg-[#f9f8f2] text-[#b0948a] border border-[#ede5e0]">
                        {fmtSize(doc.size)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors no-underline"
                    style={{ background: docType === "personal" ? "#730042" : "#185FA5" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="7" cy="7" r="1.6" stroke="#fff" strokeWidth="1.3" />
                    </svg>
                    View
                  </a>
                  <a
                    href={doc.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-sm font-medium rounded-xl transition-colors no-underline border"
                    style={{
                      borderColor: docType === "personal" ? "#730042" : "#185FA5",
                      color: docType === "personal" ? "#730042" : "#185FA5",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Download
                  </a>
                </div>
              </div>

              <p className="text-[10px] font-semibold text-[#b0948a] uppercase tracking-wider mb-1 px-1">
                Document info
              </p>
              <div className="mb-5">
                <InfoRow label="Title" value={doc.title} />
                <InfoRow label="Type" value={docType === "personal" ? "Personal" : "Expense"} />
                <InfoRow label="Format" value={getExt(doc.fileUrl)} />
                <InfoRow label="Size" value={doc.size ? fmtSize(doc.size) : "—"} />
                <InfoRow label="Uploaded on" value={fmtDateTime(doc.uploadedAt)} />
                <InfoRow label="Viewed by admin" value={doc.viewedByAdmin ? "Yes" : "Not yet"} />
              </div>

              {doc.uploadedBy && (
                <div className="bg-[#f9f8f2] rounded-xl p-4 border border-[#ede5e0]">
                  <p className="text-[10px] font-semibold text-[#b0948a] uppercase tracking-wider mb-3">
                    Uploaded by
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: "#730042" }}
                    >
                      {getInitials(doc.uploadedBy?.name || "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#2a1a16] truncate">{doc.uploadedBy?.name || "—"}</p>
                      <p className="text-xs text-[#b0948a] mt-0.5">{doc.uploadedBy?.role || "—"}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DocRow({ doc, docType, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer border-b border-[#ede5e0] hover:bg-[#f9f8f2] transition-colors group last:border-b-0"
    >
      <div
        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ background: docType === "personal" ? "rgba(115,0,66,0.1)" : "rgba(24,95,165,0.1)" }}
      >
        <FileTypeIcon url={doc.fileUrl} docType={docType} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-[#2a1a16] truncate flex-1 min-w-0">{doc.title}</p>
          {!doc.viewedByAdmin && (
            <Badge className="bg-amber-50 text-amber-700 flex-shrink-0">New</Badge>
          )}
        </div>
        <p className="text-xs text-[#b0948a] mt-1">
          {fmtSize(doc.sizeKB)} · {fmtDate(doc.uploadedAt)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="View"
          className="w-8 h-8 rounded-lg border border-[#ede5e0] flex items-center justify-center hover:bg-white hover:border-[#730042] transition-colors no-underline"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="#730042" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7" cy="7" r="1.6" stroke="#730042" strokeWidth="1.3" />
          </svg>
        </a>
        <a
          href={doc.fileUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Download"
          className="w-8 h-8 rounded-lg border border-[#ede5e0] flex items-center justify-center hover:bg-white hover:border-[#730042] transition-colors no-underline"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="#730042" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#c9bab5] group-hover:translate-x-0.5 transition-transform hidden sm:block">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function UploaderDrawer({ group, onClose, onOpenDoc }) {
  const [tab, setTab] = useState(group.personalDocs.length > 0 ? "personal" : "expense");
  const list = tab === "personal" ? group.personalDocs : group.expenseDocs;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-[#2a1a16]/40 backdrop-blur-[2px]" />
      <div className="relative w-full sm:max-w-md h-full bg-white flex flex-col shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white z-10 px-4 sm:px-6 py-4 border-b border-[#ede5e0] flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-full bg-[#730042] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {getInitials(group.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#2a1a16] truncate">{group.name}</p>
            <p className="text-xs text-[#b0948a] truncate">{group.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-[#ede5e0] flex items-center justify-center text-[#b0948a] hover:bg-[#f9f8f2] transition-colors text-xl leading-none shrink-0 bg-transparent cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-[#ede5e0] grid grid-cols-2 gap-x-4 gap-y-3 bg-[#f9f8f2]/60 shrink-0">
          {[
            { label: "Role", value: fmtRole(group.role) },
            { label: "Department", value: group.department || "—" },
            { label: "Designation", value: group.designation || "—" },
            { label: "Total documents", value: group.personalDocs.length + group.expenseDocs.length },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-[#b0948a] uppercase tracking-wide">{label}</p>
              <p className="text-xs font-semibold text-[#2a1a16] mt-0.5">{value}</p>
            </div>
          ))}
          {group.contact && (
            <div className="col-span-2">
              <p className="text-[10px] text-[#b0948a] uppercase tracking-wide">Contact</p>
              <p className="text-xs font-semibold text-[#2a1a16] mt-0.5">{group.contact}</p>
            </div>
          )}
        </div>

        <div className="flex border-b border-[#ede5e0] px-4 sm:px-6 shrink-0">
          {[
            { key: "personal", label: "Personal", count: group.personalDocs.length, color: "#730042" },
            { key: "expense", label: "Expense", count: group.expenseDocs.length, color: "#185FA5" },
          ].map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-3 bg-transparent border-none text-sm font-medium cursor-pointer flex items-center gap-2 -mb-px transition-colors"
                style={{
                  borderBottom: isActive ? `2px solid ${t.color}` : "2px solid transparent",
                  color: isActive ? t.color : "#b0948a",
                }}
              >
                {t.label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? `${t.color}18` : "#f2eeec",
                    color: isActive ? t.color : "#b0948a",
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <EmptyState message={`No ${tab} documents from this person.`} />
          ) : (
            list.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                docType={tab}
                onClick={() => onOpenDoc(doc.id, tab)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function UploaderCard({ group, onClick }) {
  const total = group.personalDocs.length + group.expenseDocs.length;
  const unviewed = group.unviewedCount;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 sm:gap-4 p-4 cursor-pointer border-b border-[#ede5e0] hover:bg-[#f9f8f2] transition-colors group last:border-b-0"
    >
      <div className="w-11 h-11 rounded-full bg-[#730042] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
        {getInitials(group.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#2a1a16] truncate">{group.name}</p>
          {unviewed > 0 ? (
            <Badge className="bg-amber-50 text-amber-700">{unviewed} new</Badge>
          ) : (
            <Badge className="bg-green-50 text-green-700">All viewed</Badge>
          )}
        </div>
        <p className="text-xs text-[#b0948a] truncate mt-0.5">{group.email}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <Badge className="bg-[#730042]/8 text-[#730042]">{fmtRole(group.role)}</Badge>
          {group.department && (
            <Badge className="bg-[#f9f8f2] text-[#b0948a] border border-[#ede5e0]">{group.department}</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {group.personalDocs.length > 0 ? (
            <Badge className="bg-[#730042]/10 text-[#730042]">{group.personalDocs.length} personal</Badge>
          ) : (
            <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0 personal</Badge>
          )}
          {group.expenseDocs.length > 0 ? (
            <Badge className="bg-blue-50 text-blue-700">{group.expenseDocs.length} expense</Badge>
          ) : (
            <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0 expense</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[#b0948a] font-medium">
          {total} doc{total !== 1 ? "s" : ""}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#c9bab5] group-hover:translate-x-0.5 transition-transform">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function UploaderTableRow({ group, onClick }) {
  const total = group.personalDocs.length + group.expenseDocs.length;
  return (
    <tr
      onClick={onClick}
      className="border-b border-[#ede5e0] hover:bg-[#f9f8f2] cursor-pointer transition-colors group last:border-b-0"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#730042] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            {getInitials(group.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#2a1a16] truncate max-w-[150px] xl:max-w-xs">{group.name}</p>
            <p className="text-[10px] text-[#b0948a] truncate max-w-[150px] xl:max-w-xs">{group.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className="bg-[#730042]/8 text-[#730042]">{fmtRole(group.role)}</Badge>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-[#b0948a] truncate max-w-[110px]">{group.department || "—"}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-[#b0948a] truncate max-w-[110px]">{group.designation || "—"}</p>
      </td>
      <td className="px-4 py-3">
        {group.personalDocs.length > 0 ? (
          <Badge className="bg-[#730042]/10 text-[#730042]">{group.personalDocs.length}</Badge>
        ) : (
          <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        {group.expenseDocs.length > 0 ? (
          <Badge className="bg-blue-50 text-blue-700">{group.expenseDocs.length}</Badge>
        ) : (
          <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-bold text-[#2a1a16]">{total}</span>
      </td>
      <td className="px-4 py-3">
        {group.unviewedCount > 0 ? (
          <Badge className="bg-amber-50 text-amber-700">{group.unviewedCount} new</Badge>
        ) : (
          <Badge className="bg-green-50 text-green-700">All viewed</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#c9bab5] group-hover:translate-x-0.5 transition-transform">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </td>
    </tr>
  );
}

export default function ManagerTeamDocument() {
  const can = usePermissionStore((s) => s.can);
  const canView = can("documents.can_view_all_documents");

  const { data: personalData, isLoading: loadingPersonal } = useGetAllPersonalDocuments();
  const { data: expenseData, isLoading: loadingExpense } = useGetAllExpenseDocuments();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUploaderId, setSelectedUploaderId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(null);

  if (!canView) return <NoPermission />;

  const personalDocs = personalData?.documents || [];
  const expenseDocs = expenseData?.documents || [];
  const loading = loadingPersonal || loadingExpense;

  const groups = useMemo(() => {
    const map = new Map();

    function add(doc, type) {
      const uid = doc.uploader?.id || "unknown";
      if (!map.has(uid)) {
        map.set(uid, {
          id: uid,
          name: doc.uploader?.name || "Unknown",
          email: doc.uploader?.email || "—",
          contact: doc.uploader?.contact || "",
          department: doc.uploader?.department || "",
          designation: doc.uploader?.designation || "",
          role: doc.uploaderModel || "—",
          personalDocs: [],
          expenseDocs: [],
          unviewedCount: 0,
        });
      }
      const g = map.get(uid);
      if (type === "personal") g.personalDocs.push(doc);
      else g.expenseDocs.push(doc);
      if (!doc.viewedByAdmin) g.unviewedCount += 1;
    }

    personalDocs.forEach((d) => add(d, "personal"));
    expenseDocs.forEach((d) => add(d, "expense"));

    return Array.from(map.values()).sort(
      (a, b) =>
        b.personalDocs.length + b.expenseDocs.length -
        (a.personalDocs.length + a.expenseDocs.length)
    );
  }, [personalDocs, expenseDocs]);

  const roleOptions = useMemo(() => {
    const roles = new Set(groups.map((g) => g.role).filter(Boolean));
    return ["all", ...Array.from(roles)];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.department.toLowerCase().includes(q) ||
        g.designation.toLowerCase().includes(q);
      const matchRole = filterRole === "all" || g.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [groups, search, filterRole]);

  const totalDocs = personalDocs.length + expenseDocs.length;
  const totalUnviewed = groups.reduce((sum, g) => sum + g.unviewedCount, 0);
  const selectedGroup = groups.find((g) => g.id === selectedUploaderId) || null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f9f8f2] p-4 sm:p-6 lg:p-8 font-sans text-[#2a1a16]">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#730042]">Team Documents</h1>
        <p className="text-sm text-[#b0948a] mt-1">
          Personal and expense documents submitted by your team, grouped by uploader
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-5 items-start sm:items-center">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {[
            { label: "Uploaders", val: groups.length, badge: "bg-[#730042]/10 text-[#730042]", dot: "bg-[#730042]" },
            { label: "Total docs", val: totalDocs, badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
            { label: "Unviewed", val: totalUnviewed, badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
          ].map(({ label, val, badge, dot }) => (
            <div
              key={label}
              className={`flex-1 sm:flex-none bg-white border border-[#ede5e0] rounded-xl px-3 py-2 flex items-center gap-2 text-sm ${badge}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[#b0948a] text-xs">{label}</span>
              <span className="font-bold text-[#2a1a16]">{val}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:ml-auto">
          <div className="relative flex-1 sm:flex-none">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="#b0948a" strokeWidth="1.3" />
              <path d="M10 10l3 3" stroke="#b0948a" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search uploader…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-52 pl-9 pr-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm text-[#2a1a16] outline-none focus:border-[#730042] transition-colors placeholder:text-[#c9bab5]"
            />
          </div>

          {roleOptions.length > 2 && (
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm text-[#2a1a16] outline-none focus:border-[#730042] cursor-pointer"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r === "all" ? "All roles" : fmtRole(r)}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => exportToCSV([...personalDocs, ...expenseDocs])}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm font-medium text-[#2a1a16] hover:border-[#730042] transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="#730042" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#ede5e0]">
          <p className="text-sm font-semibold text-[#2a1a16]">Uploaders</p>
          <span className="text-[11px] text-[#b0948a]">
            {filteredGroups.length} result{filteredGroups.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-16 gap-3">
            <Spinner />
            <span className="text-sm text-[#b0948a]">Loading documents…</span>
          </div>
        )}

        {!loading && filteredGroups.length === 0 && (
          <EmptyState
            message={
              search || filterRole !== "all"
                ? "No uploaders match your filters."
                : "No documents have been uploaded yet."
            }
          />
        )}

        {!loading && filteredGroups.length > 0 && (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-[#ede5e0] bg-[#f9f8f2]/60">
                    {["Uploader", "Role", "Department", "Designation", "Personal", "Expense", "Total", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold text-[#c9bab5] uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((g) => (
                    <UploaderTableRow
                      key={g.id}
                      group={g}
                      onClick={() => setSelectedUploaderId(g.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden">
              {filteredGroups.map((g) => (
                <UploaderCard
                  key={g.id}
                  group={g}
                  onClick={() => setSelectedUploaderId(g.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedGroup && (
        <UploaderDrawer
          group={selectedGroup}
          onClose={() => setSelectedUploaderId(null)}
          onOpenDoc={(id, type) => {
            setSelectedDoc(id);
            setSelectedDocType(type);
          }}
        />
      )}

      {selectedDoc && (
        <DetailDrawer
          documentId={selectedDoc}
          docType={selectedDocType}
          onClose={() => {
            setSelectedDoc(null);
            setSelectedDocType(null);
          }}
        />
      )}
    </div>
  );
}