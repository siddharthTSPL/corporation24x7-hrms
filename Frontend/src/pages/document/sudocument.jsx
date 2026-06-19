import { useState, useMemo } from "react";
import {
  useGetAllPersonalDocumentsSuperAdmin,
  useGetAllExpenseDocumentsSuperAdmin,
  useGetDocumentDetailsSuperAdmin,
} from "../../auth/server-state/superadmin/other/suother.hook";

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
  if (role.toLowerCase() === "user") return "Employee";
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

function exportToCSV(docs, tabLabel) {
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
    "Viewed by Super Admin",
  ];

  const rows = docs.map((d) => [
    `"${d.title}"`,
    tabLabel,
    `"${d.uploader?.name || "—"}"`,
    `"${d.uploader?.email || "—"}"`,
    `"${d.uploaderModel || "—"}"`,
    `"${d.uploader?.department || "—"}"`,
    `"${d.uploader?.designation || "—"}"`,
    fmtSize(d.sizeKB),
    fmtDate(d.uploadedAt),
    d.viewedByAdmin ? "Yes" : "No",
    d.viewedBySuperAdmin ? "Yes" : "No",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tabLabel}-documents-${Date.now()}.csv`;
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

function Badge({ children, className }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${className}`}
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

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-[#ede5e0] text-sm gap-4">
      <span className="text-[#b0948a] shrink-0">{label}</span>
      <span className="text-[#2a1a16] font-medium text-right break-all">{value}</span>
    </div>
  );
}

function DetailDrawer({ documentId, docType, onClose }) {
  const { data, isLoading, isError } = useGetDocumentDetailsSuperAdmin(documentId);
  const doc = data?.document;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#2a1a16]/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full sm:max-w-md md:max-w-lg h-full bg-white flex flex-col shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white z-10 px-4 sm:px-6 py-4 border-b border-[#ede5e0] flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <p className="text-sm sm:text-[15px] font-medium text-[#2a1a16] truncate">Document details</p>
            <p className="text-xs text-[#b0948a] mt-0.5">
              {docType === "personal" ? "Personal" : "Expense"} document
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-[#ede5e0] flex items-center justify-center text-[#b0948a] hover:bg-[#f9f8f2] transition-colors text-lg leading-none shrink-0"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center pt-16">
              <Spinner />
            </div>
          )}
          {isError && (
            <div className="p-4 bg-red-50 rounded-xl text-sm text-red-500">
              Failed to load document details.
            </div>
          )}
          {doc && (
            <>
              <div className="bg-[#730042]/8 border border-[#730042]/15 rounded-2xl p-4 sm:p-6 mb-5 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#730042] flex items-center justify-center">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      stroke="#fff"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="14 2 14 8 20 8"
                      stroke="#fff"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="text-center w-full min-w-0">
                  <p className="text-sm font-medium text-[#2a1a16] mb-1.5 break-words">{doc.title}</p>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <Badge
                      className={
                        docType === "personal"
                          ? "bg-[#730042]/10 text-[#730042]"
                          : "bg-blue-50 text-blue-700"
                      }
                    >
                      {docType === "personal" ? "Personal" : "Expense"}
                    </Badge>
                    <Badge className="bg-[#f9f8f2] text-[#b0948a] border border-[#ede5e0]">
                      {getExt(doc.fileUrl)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 w-full">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#730042] text-white text-sm font-medium rounded-xl hover:bg-[#5a0033] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z"
                        stroke="#fff"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="7" cy="7" r="1.6" stroke="#fff" strokeWidth="1.3" />
                    </svg>
                    View
                  </a>
                  <a
                    href={doc.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#730042] text-[#730042] text-sm font-medium rounded-xl hover:bg-[#730042]/5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1v8M4 6l3 3 3-3M2 11h10"
                        stroke="#730042"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Download
                  </a>
                </div>
              </div>

              <p className="text-[11px] font-medium text-[#b0948a] uppercase tracking-wide mb-2 px-1">
                Document info
              </p>
              <div className="space-y-1 mb-6">
                <InfoRow label="Title" value={doc.title} />
                <InfoRow label="File type" value={docType === "personal" ? "Personal" : "Expense"} />
                <InfoRow label="Format" value={getExt(doc.fileUrl)} />
                <InfoRow label="File size" value={fmtSize(doc.sizeKB)} />
                <InfoRow label="Uploaded on" value={fmtDateTime(doc.uploadedAt)} />
                <InfoRow label="Uploader role" value={fmtRole(doc.uploaderModel)} />
                <InfoRow label="Viewed by manager" value={doc.viewedByManager ? "Yes" : "Not yet"} />
                <InfoRow label="Viewed by admin" value={doc.viewedByAdmin ? "Yes" : "Not yet"} />
                <InfoRow label="Viewed by super admin" value={doc.viewedBySuperAdmin ? "Yes" : "Not yet"} />
              </div>

              {doc.uploader ? (
                <div className="bg-[#f9f8f2] rounded-xl p-4 border border-[#ede5e0]">
                  <p className="text-[11px] font-medium text-[#b0948a] uppercase tracking-wide mb-3">
                    Uploaded by
                  </p>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-[#730042] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                      {getInitials(doc.uploader.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#2a1a16] truncate">{doc.uploader.name}</p>
                      <p className="text-xs text-[#b0948a] mt-0.5 truncate">{doc.uploader.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <InfoRow label="Role" value={fmtRole(doc.uploaderModel)} />
                    <InfoRow label="Department" value={doc.uploader.department || "—"} />
                    <InfoRow label="Designation" value={doc.uploader.designation || "—"} />
                    {doc.uploader.contact && (
                      <InfoRow label="Contact" value={doc.uploader.contact} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#f9f8f2] rounded-xl p-4 border border-[#ede5e0] text-sm text-[#b0948a]">
                  Uploader information not available
                </div>
              )}

              {doc.reportingManager && (
                <div className="mt-3 bg-[#f9f8f2] rounded-xl p-4 border border-[#ede5e0]">
                  <p className="text-[11px] font-medium text-[#b0948a] uppercase tracking-wide mb-3">
                    Reporting manager
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                      {getInitials(doc.reportingManager.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2a1a16] truncate">{doc.reportingManager.name}</p>
                      <p className="text-xs text-[#b0948a] mt-0.5 truncate">{doc.reportingManager.email}</p>
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
        className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
          docType === "personal" ? "bg-[#730042]/10" : "bg-blue-50"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke={docType === "personal" ? "#730042" : "#185FA5"}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="14 2 14 8 20 8"
            stroke={docType === "personal" ? "#730042" : "#185FA5"}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-[#2a1a16] truncate flex-1 min-w-0">{doc.title}</p>
          {!doc.viewedBySuperAdmin && <Badge className="bg-amber-50 text-amber-700 flex-shrink-0">New</Badge>}
        </div>
        <p className="text-xs text-[#c9bab5] mt-1">
          {fmtSize(doc.sizeKB)} · {fmtDate(doc.uploadedAt)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="View"
          className="w-8 h-8 rounded-lg border border-[#ede5e0] flex items-center justify-center hover:bg-white hover:border-[#730042] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z"
              stroke="#730042"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
          className="w-8 h-8 rounded-lg border border-[#ede5e0] flex items-center justify-center hover:bg-white hover:border-[#730042] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
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

function UploaderDrawer({ group, personalDocs, expenseDocs, onClose, onOpenDoc }) {
  const [tab, setTab] = useState(
    personalDocs.length > 0 ? "personal" : "expense"
  );

  const list = tab === "personal" ? personalDocs : expenseDocs;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-[#2a1a16]/40 backdrop-blur-[2px]" />
      <div className="relative w-full sm:max-w-md md:max-w-lg h-full bg-white flex flex-col shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white z-10 px-4 sm:px-6 py-4 border-b border-[#ede5e0] flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-full bg-[#730042] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {getInitials(group.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#2a1a16] truncate">{group.name}</p>
            <p className="text-xs text-[#b0948a] truncate">{group.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-[#ede5e0] flex items-center justify-center text-[#b0948a] hover:bg-[#f9f8f2] transition-colors text-lg leading-none shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-[#ede5e0] grid grid-cols-2 gap-3 bg-[#f9f8f2]/60 shrink-0">
          <div>
            <p className="text-[10px] text-[#b0948a] uppercase tracking-wide">Role</p>
            <p className="text-xs font-medium text-[#2a1a16] mt-0.5">{fmtRole(group.role)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#b0948a] uppercase tracking-wide">Department</p>
            <p className="text-xs font-medium text-[#2a1a16] mt-0.5">{group.department || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#b0948a] uppercase tracking-wide">Designation</p>
            <p className="text-xs font-medium text-[#2a1a16] mt-0.5">{group.designation || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#b0948a] uppercase tracking-wide">Total documents</p>
            <p className="text-xs font-medium text-[#2a1a16] mt-0.5">
              {personalDocs.length + expenseDocs.length}
            </p>
          </div>
        </div>

        <div className="flex border-b border-[#ede5e0] px-4 sm:px-6 shrink-0">
          {[
            { key: "personal", label: "Personal", count: personalDocs.length },
            { key: "expense", label: "Expense", count: expenseDocs.length },
          ].map((t) => {
            const isActive = tab === t.key;
            const color = t.key === "personal" ? "#730042" : "#185FA5";
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                  color: isActive ? color : "#b0948a",
                }}
                className="px-4 py-3 bg-transparent border-none text-sm font-medium cursor-pointer flex items-center gap-2 -mb-px transition-colors"
              >
                {t.label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? `${color}15` : "#f2eeec",
                    color: isActive ? color : "#b0948a",
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
              <DocRow key={doc.id} doc={doc} docType={tab} onClick={() => onOpenDoc(doc.id, tab)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function UploaderCard({ group, onClick }) {
  const total = group.personalCount + group.expenseCount;
  const unviewed = group.unviewedCount;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 sm:gap-4 p-4 cursor-pointer border-b border-[#ede5e0] hover:bg-[#f9f8f2] transition-colors group"
    >
      <div className="w-11 h-11 rounded-full bg-[#730042] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
        {getInitials(group.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-[#2a1a16] truncate">{group.name}</p>
          {unviewed > 0 ? (
            <Badge className="bg-amber-50 text-amber-700">{unviewed} new</Badge>
          ) : (
            <Badge className="bg-green-50 text-green-700">All viewed</Badge>
          )}
        </div>
        <p className="text-xs text-[#b0948a] truncate mt-0.5">{group.email}</p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Badge className="bg-[#730042]/8 text-[#730042] capitalize">{fmtRole(group.role)}</Badge>
          {group.department && (
            <Badge className="bg-[#f9f8f2] text-[#b0948a] border border-[#ede5e0]">{group.department}</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {group.personalCount > 0 ? (
            <Badge className="bg-[#730042]/10 text-[#730042]">{group.personalCount} personal</Badge>
          ) : (
            <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0 personal</Badge>
          )}
          {group.expenseCount > 0 ? (
            <Badge className="bg-blue-50 text-blue-700">{group.expenseCount} expense</Badge>
          ) : (
            <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0 expense</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[#b0948a] font-medium">
          {total} document{total !== 1 ? "s" : ""}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-[#c9bab5] group-hover:translate-x-0.5 transition-transform"
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function UploaderTableRow({ group, onClick }) {
  const total = group.personalCount + group.expenseCount;

  return (
    <tr onClick={onClick} className="border-b border-[#ede5e0] hover:bg-[#f9f8f2] cursor-pointer transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#730042] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
            {getInitials(group.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#2a1a16] truncate max-w-[160px] xl:max-w-xs">{group.name}</p>
            <p className="text-[10px] text-[#b0948a] truncate max-w-[160px] xl:max-w-xs">{group.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className="bg-[#730042]/8 text-[#730042] capitalize">{fmtRole(group.role)}</Badge>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-[#b0948a] truncate max-w-[120px] xl:max-w-xs">{group.department || "—"}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-[#b0948a] truncate max-w-[120px] xl:max-w-xs">{group.designation || "—"}</p>
      </td>
      <td className="px-4 py-3">
        {group.personalCount > 0 ? (
          <Badge className="bg-[#730042]/10 text-[#730042]">{group.personalCount}</Badge>
        ) : (
          <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        {group.expenseCount > 0 ? (
          <Badge className="bg-blue-50 text-blue-700">{group.expenseCount}</Badge>
        ) : (
          <Badge className="bg-[#f9f8f2] text-[#c9bab5] border border-[#ede5e0]">0</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-[#2a1a16]">{total}</span>
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

const ROLE_OPTIONS = ["all", "User", "Manager", "Admin", "SeniorAdmin", "Official", "SeniorManager"];

export default function SuperAdminDocuments() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [selectedUploaderId, setSelectedUploaderId] = useState(null);

  const { data: personalData, isLoading: loadingPersonal } = useGetAllPersonalDocumentsSuperAdmin();
  const { data: expenseData, isLoading: loadingExpense } = useGetAllExpenseDocumentsSuperAdmin();

  const personalDocs = personalData?.documents ?? [];
  const expenseDocs = expenseData?.documents ?? [];
  const loading = loadingPersonal || loadingExpense;

  const groups = useMemo(() => {
    const map = new Map();

    function add(doc, type) {
      const uploaderId = doc.uploader?.id || "unknown";
      if (!map.has(uploaderId)) {
        map.set(uploaderId, {
          id: uploaderId,
          name: doc.uploader?.name || "Unknown uploader",
          email: doc.uploader?.email || "—",
          department: doc.uploader?.department || "",
          designation: doc.uploader?.designation || "",
          role: doc.uploaderModel || "—",
          personalCount: 0,
          expenseCount: 0,
          unviewedCount: 0,
          personalDocs: [],
          expenseDocs: [],
        });
      }
      const g = map.get(uploaderId);
      if (type === "personal") {
        g.personalCount += 1;
        g.personalDocs.push(doc);
      } else {
        g.expenseCount += 1;
        g.expenseDocs.push(doc);
      }
      if (!doc.viewedBySuperAdmin) g.unviewedCount += 1;
    }

    personalDocs.forEach((d) => add(d, "personal"));
    expenseDocs.forEach((d) => add(d, "expense"));

    return Array.from(map.values()).sort(
      (a, b) => b.personalCount + b.expenseCount - (a.personalCount + a.expenseCount)
    );
  }, [personalDocs, expenseDocs]);

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
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f9f8f2] p-4 sm:p-6 lg:p-8 font-[DM_Sans,ui-sans-serif,system-ui,sans-serif] text-[#2a1a16]">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-[#b0948a] mt-1">
          Personal and expense documents submitted by employees, grouped by uploader
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-5 items-start sm:items-center">
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          {[
            ["Uploaders", groups.length, "bg-[#730042]/10 text-[#730042]", "bg-[#730042]"],
            ["Total documents", totalDocs, "bg-blue-50 text-blue-700", "bg-blue-500"],
            ["Unviewed", totalUnviewed, "bg-amber-50 text-amber-700", "bg-amber-500"],
          ].map(([label, val, badge, dot]) => (
            <div
              key={label}
              className={`flex-1 sm:flex-none bg-white border border-[#ede5e0] rounded-xl px-3 py-2 flex items-center gap-2 text-sm ${badge}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[#b0948a] text-xs">{label}</span>
              <span className="font-semibold text-[#2a1a16]">{val}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:ml-auto justify-end">
          <div className="relative flex-1 sm:flex-none">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <circle cx="6.5" cy="6.5" r="4.5" stroke="#b0948a" strokeWidth="1.3" />
              <path d="M10 10l3 3" stroke="#b0948a" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search uploader..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm text-[#2a1a16] outline-none focus:border-[#730042] transition-colors placeholder:text-[#c9bab5]"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm text-[#2a1a16] outline-none focus:border-[#730042]"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All roles" : fmtRole(r)}
              </option>
            ))}
          </select>

          <button
            onClick={() => exportToCSV([...personalDocs, ...expenseDocs], "all")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm font-medium text-[#2a1a16] hover:border-[#730042] transition-colors"
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
          <p className="text-sm font-medium text-[#2a1a16]">Uploaders</p>
          <span className="text-[11px] text-[#b0948a]">
            {filteredGroups.length} result{filteredGroups.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-16 gap-3">
            <Spinner />
            <span className="text-sm text-[#b0948a]">Loading documents...</span>
          </div>
        )}

        {!loading && filteredGroups.length === 0 && (
          <EmptyState
            message={
              search || filterRole !== "all"
                ? "No uploaders match your filters."
                : "No documents uploaded yet."
            }
          />
        )}

        {!loading && filteredGroups.length > 0 && (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-[#ede5e0]">
                    {["Uploader", "Role", "Department", "Designation", "Personal", "Expense", "Total", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold text-[#c9bab5] uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((g) => (
                    <UploaderTableRow key={g.id} group={g} onClick={() => setSelectedUploaderId(g.id)} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden">
              {filteredGroups.map((g) => (
                <UploaderCard key={g.id} group={g} onClick={() => setSelectedUploaderId(g.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedGroup && (
        <UploaderDrawer
          group={selectedGroup}
          personalDocs={selectedGroup.personalDocs}
          expenseDocs={selectedGroup.expenseDocs}
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