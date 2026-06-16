import { useState } from "react";
import {
  useGetAllPersonalDocuments,
  useGetAllExpenseDocuments,
  useGetDocumentDetails,
} from "../../auth/server-state/adminother/adminother.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const isPdf = (url = "") => url.toLowerCase().includes(".pdf");

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const ROLE_STYLE = {
  employee: { bg: "bg-[rgba(205,22,110,0.1)]", text: "text-[#CD166E]" },
  manager:  { bg: "bg-violet-100",              text: "text-violet-700"  },
  admin:    { bg: "bg-amber-100",               text: "text-amber-700"   },
};

function FileIcon({ url }) {
  if (isPdf(url)) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
        <line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#730042" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
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
      <p className="text-[13px] text-[#9B7A8E]">You don't have permission to view team documents.</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="h-[72px] rounded-xl"
      style={{
        background: "linear-gradient(90deg,#f0e8ed 25%,#f8f3f6 50%,#f0e8ed 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

function DetailModal({ documentId, onClose }) {
  const { data, isLoading } = useGetDocumentDetails(documentId);
  const doc = data?.document;

  return (
    <div
      className="fixed inset-0 bg-[rgba(26,10,18,0.5)] z-[200] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-[480px] border border-[rgba(115,0,66,0.12)] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(115,0,66,0.08)]">
          <h2 className="text-[15px] font-bold text-[#730042]">Document Details</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer text-[#9B7A8E] hover:bg-red-50 hover:text-red-500 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[rgba(115,0,66,0.15)] border-t-[#730042] animate-spin" />
            <p className="text-xs text-[#9B7A8E]">Loading…</p>
          </div>
        ) : !doc ? (
          <div className="p-6 text-center text-[13px] text-[#9B7A8E]">Document not found.</div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${isPdf(doc.fileUrl) ? "bg-[rgba(205,22,110,0.1)]" : "bg-[rgba(115,0,66,0.08)]"}`}>
                <FileIcon url={doc.fileUrl} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1A0A12] truncate">{doc.title}</p>
                <p className="text-[11px] text-[#9B7A8E] mt-0.5">{fmt(doc.uploadedAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "File Type",    val: doc.fileType },
                { label: "Uploaded By",  val: doc.uploadedBy?.name || "—" },
                { label: "Role",         val: doc.uploadedBy?.role || "—" },
                { label: "Size",         val: doc.size ? `${doc.size} KB` : "—" },
              ].map(({ label, val }) => (
                <div key={label} className="bg-[#F9F8F2] rounded-xl p-3 border border-[rgba(115,0,66,0.08)]">
                  <p className="text-[10px] font-semibold text-[#9B7A8E] uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-[12px] font-semibold text-[#1A0A12] capitalize">{val}</p>
                </div>
              ))}
            </div>

            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold no-underline hover:opacity-90 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open Document
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function DocList({ docs, onSelect }) {
  if (!docs.length) {
    return (
      <div className="text-center py-14 px-4 bg-[#F9F8F2] rounded-xl border border-dashed border-[rgba(115,0,66,0.2)]">
        <div className="text-4xl mb-2">📂</div>
        <p className="text-[13px] text-[#9B7A8E] m-0">No documents found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {docs.map((doc) => {
        const roleStyle = ROLE_STYLE[doc.uploadedBy?.role] || { bg: "bg-gray-100", text: "text-gray-600" };
        return (
          <div
            key={doc._id}
            onClick={() => onSelect(doc._id)}
            className="bg-white border border-[rgba(115,0,66,0.12)] rounded-xl px-3.5 sm:px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:shadow-[0_4px_16px_rgba(115,0,66,0.09)] hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${isPdf(doc.fileUrl) ? "bg-[rgba(205,22,110,0.1)]" : "bg-[rgba(115,0,66,0.08)]"}`}>
              <FileIcon url={doc.fileUrl} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#730042] truncate mb-1">{doc.title}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {doc.uploadedBy?.name && (
                  <span className="text-[11px] text-[#9B7A8E] truncate max-w-[120px]">
                    {doc.uploadedBy.name}
                  </span>
                )}
                {doc.uploadedBy?.role && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${roleStyle.bg} ${roleStyle.text}`}>
                    {doc.uploadedBy.role}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  doc.fileType === "personal"
                    ? "bg-[rgba(205,22,110,0.08)] text-[#CD166E]"
                    : "bg-[rgba(115,0,66,0.06)] text-[#730042]"
                }`}>
                  {doc.fileType}
                </span>
                {doc.size && <span className="text-[11px] text-[#9B7A8E]">{doc.size} KB</span>}
                <span className="text-[11px] text-[#9B7A8E]">{fmt(doc.uploadedAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-lg border border-[rgba(115,0,66,0.12)] flex items-center justify-center hover:bg-[rgba(115,0,66,0.07)] transition-colors no-underline"
                title="Open file"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#730042" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
              <span className="text-[10px] text-[#9B7A8E] hidden sm:block">View →</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ManagerTeamDocument() {
  const can = usePermissionStore((s) => s.can);
  const canView = can("documents.can_view_all_documents");

  const { data: personalData, isLoading: loadingPersonal } = useGetAllPersonalDocuments();
  const { data: expenseData,  isLoading: loadingExpense  } = useGetAllExpenseDocuments();

  const [tab,        setTab]        = useState("personal");
  const [selectedId, setSelectedId] = useState(null);
  const [search,     setSearch]     = useState("");

  if (!canView) return <NoPermission />;

  const personalDocs = personalData?.documents || [];
  const expenseDocs  = expenseData?.documents  || [];

  const activeDocs = (tab === "personal" ? personalDocs : expenseDocs).filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.title?.toLowerCase().includes(q) ||
      d.uploadedBy?.name?.toLowerCase().includes(q) ||
      d.uploadedBy?.role?.toLowerCase().includes(q)
    );
  });

  const isLoading = tab === "personal" ? loadingPersonal : loadingExpense;

  return (
    <div className="py-5 px-0 font-[inherit]">
      <style>{`@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}`}</style>

      <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-[18px] font-bold text-[#730042] m-0">Team Documents</h1>
          <p className="text-[12px] text-[#9B7A8E] mt-1 mb-0">
            View documents uploaded by your team members
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F9F8F2] border border-[rgba(115,0,66,0.12)] rounded-xl px-3 py-2 w-full sm:w-auto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9B7A8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] text-[#1A0A12] placeholder:text-[#9B7A8E] w-44 sm:w-52"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="bg-transparent border-none cursor-pointer text-[#9B7A8E] hover:text-[#730042] text-sm leading-none p-0 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: "personal", label: "Personal", count: personalDocs.length },
          { key: "expense",  label: "Expense",  count: expenseDocs.length  },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(""); }}
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === key
                ? "bg-[#730042] text-white border-[#730042]"
                : "bg-transparent text-[#730042] border-[rgba(115,0,66,0.2)] hover:bg-[rgba(115,0,66,0.07)]"
            }`}
          >
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              tab === key ? "bg-white/20 text-white" : "bg-[rgba(115,0,66,0.1)] text-[#730042]"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <DocList docs={activeDocs} onSelect={setSelectedId} />
      )}

      {selectedId && (
        <DetailModal documentId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}