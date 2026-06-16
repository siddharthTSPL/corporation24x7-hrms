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

function fmtSize(kb) {
  if (!kb) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function exportToCSV(docs, tabLabel) {
  const headers = [
    "Title",
    "Type",
    "Employee Name",
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
    `"${d.employee?.name || "—"}"`,
    `"${d.employee?.email || "—"}"`,
    `"${d.employee?.role || d.uploaderModel || "—"}"`,
    `"${d.employee?.department || "—"}"`,
    `"${d.employee?.designation || "—"}"`,
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${className}`}
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
      <p className="text-xs text-[#b0948a]">{message}</p>
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
      <div className="relative w-full max-w-[440px] h-full bg-white flex flex-col shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-[#ede5e0] flex items-center justify-between">
          <div>
            <p className="text-[15px] font-medium text-[#2a1a16]">Document details</p>
            <p className="text-xs text-[#b0948a] mt-0.5">
              {docType === "personal" ? "Personal" : "Expense"} document
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#ede5e0] flex items-center justify-center text-[#b0948a] hover:bg-[#f9f8f2] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-6">
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
              <div className="bg-[#730042]/8 border border-[#730042]/15 rounded-2xl p-6 mb-5 flex flex-col items-center gap-3">
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
                <div className="text-center">
                  <p className="text-sm font-medium text-[#2a1a16] mb-1.5">{doc.title}</p>
                  <Badge
                    className={
                      docType === "personal"
                        ? "bg-[#730042]/10 text-[#730042]"
                        : "bg-blue-50 text-blue-700"
                    }
                  >
                    {docType === "personal" ? "Personal" : "Expense"}
                  </Badge>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#730042] text-white text-sm font-medium rounded-xl hover:bg-[#5a0033] transition-colors mt-1"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1v8M4 6l3 3 3-3M2 11h10"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Open / Download
                </a>
              </div>

              {[
                ["File size", fmtSize(doc.sizeKB)],
                ["Uploaded on", fmtDate(doc.uploadedAt)],
                ["Viewed by manager", doc.viewedByManager ? "Yes" : "Not yet"],
                ["Viewed by admin", doc.viewedByAdmin ? "Yes" : "Not yet"],
                ["Viewed by super admin", doc.viewedBySuperAdmin ? "Yes" : "Not yet"],
              ].map(([label, val]) => (
                <div
                  key={label}
                  className="flex justify-between py-3 border-b border-[#ede5e0] text-sm"
                >
                  <span className="text-[#b0948a]">{label}</span>
                  <span className="text-[#2a1a16] font-medium">{val}</span>
                </div>
              ))}

              {doc.employee ? (
                <div className="mt-6 bg-[#f9f8f2] rounded-xl p-4 border border-[#ede5e0]">
                  <p className="text-[11px] font-medium text-[#b0948a] uppercase tracking-wide mb-3">
                    Uploaded by
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#730042] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                      {getInitials(doc.employee.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2a1a16]">{doc.employee.name}</p>
                      <p className="text-xs text-[#b0948a] mt-0.5 truncate">{doc.employee.email}</p>
                      {doc.employee.role && (
                        <p className="text-xs text-[#b0948a] mt-0.5 capitalize">
                          Role: {doc.employee.role}
                        </p>
                      )}
                      {doc.employee.department && (
                        <p className="text-xs text-[#b0948a] mt-0.5">{doc.employee.department}</p>
                      )}
                      {doc.employee.designation && (
                        <p className="text-xs text-[#b0948a] mt-0.5">{doc.employee.designation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 bg-[#f9f8f2] rounded-xl p-4 border border-[#ede5e0] text-sm text-[#b0948a]">
                  Employee information not available
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
                    <div>
                      <p className="text-sm font-medium text-[#2a1a16]">{doc.reportingManager.name}</p>
                      <p className="text-xs text-[#b0948a] mt-0.5">{doc.reportingManager.email}</p>
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

function DocCard({ doc, docType, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-4 p-4 sm:p-5 cursor-pointer border-b border-[#ede5e0] hover:bg-[#f9f8f2] transition-colors group"
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
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium text-[#2a1a16] truncate max-w-[200px] sm:max-w-none">
            {doc.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!doc.viewedBySuperAdmin && (
              <Badge className="bg-amber-50 text-amber-700">New</Badge>
            )}
            <div
              title={doc.viewedByAdmin ? "Admin viewed" : "Not viewed by admin"}
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                doc.viewedByAdmin ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {doc.viewedByAdmin ? (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <polyline
                    points="1.5,5 4,7.5 8.5,2.5"
                    fill="none"
                    stroke="#1D9E75"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <line x1="2" y1="2" x2="8" y2="8" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="8" y1="2" x2="2" y2="8" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-[#c9bab5] group-hover:translate-x-0.5 transition-transform"
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <p className="text-xs text-[#c9bab5] mt-1">
          {fmtSize(doc.sizeKB)} · {fmtDate(doc.uploadedAt)}
        </p>

        {doc.employee ? (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#730042] flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0">
              {getInitials(doc.employee.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#2a1a16] truncate">
                {doc.employee.name}
              </p>
              <p className="text-[10px] text-[#b0948a] truncate">{doc.employee.email}</p>
            </div>
            {doc.employee.role && (
              <Badge className="bg-[#f9f8f2] text-[#b0948a] border border-[#ede5e0] ml-auto capitalize hidden sm:inline-flex">
                {doc.employee.role}
              </Badge>
            )}
            {doc.employee.department && (
              <Badge className="bg-[#f9f8f2] text-[#b0948a] border border-[#ede5e0] hidden lg:inline-flex">
                {doc.employee.department}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[#c9bab5] mt-2">No employee info</p>
        )}
      </div>
    </div>
  );
}

function TableRow({ doc, docType, onClick }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-[#ede5e0] hover:bg-[#f9f8f2] cursor-pointer transition-colors group"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              docType === "personal" ? "bg-[#730042]/10" : "bg-blue-50"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#2a1a16] truncate max-w-[180px]">{doc.title}</p>
            <p className="text-[10px] text-[#c9bab5]">{fmtSize(doc.sizeKB)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {doc.employee ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#730042] flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0">
              {getInitials(doc.employee.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#2a1a16] truncate">{doc.employee.name}</p>
              <p className="text-[10px] text-[#b0948a] truncate max-w-[160px]">{doc.employee.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-xs text-[#c9bab5]">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {doc.employee?.role ? (
          <Badge className="bg-[#730042]/8 text-[#730042] capitalize">
            {doc.employee.role}
          </Badge>
        ) : (
          <span className="text-xs text-[#c9bab5]">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-[#b0948a] truncate max-w-[120px]">
          {doc.employee?.department || "—"}
        </p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-[#b0948a]">{fmtDate(doc.uploadedAt)}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {!doc.viewedBySuperAdmin && (
            <Badge className="bg-amber-50 text-amber-700">New</Badge>
          )}
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center ${
              doc.viewedByAdmin ? "bg-green-50" : "bg-red-50"
            }`}
          >
            {doc.viewedByAdmin ? (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="2" y1="2" x2="8" y2="8" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="2" x2="2" y2="8" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#c9bab5] group-hover:translate-x-0.5 transition-transform">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </td>
    </tr>
  );
}

const ROLE_OPTIONS = ["all", "employee", "manager", "admin", "senior_admin", "official", "senior_manager"];
const STATUS_OPTIONS = ["all", "new", "viewed"];
const DEPT_VIEWED_OPTIONS = ["all", "viewed_admin", "not_viewed_admin"];

export default function SuperAdminDocuments() {
  const [activeTab, setActiveTab] = useState("personal");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAdminViewed, setFilterAdminViewed] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: personalData, isLoading: loadingPersonal } = useGetAllPersonalDocumentsSuperAdmin();
  const { data: expenseData, isLoading: loadingExpense } = useGetAllExpenseDocumentsSuperAdmin();

  const personalDocs = personalData?.documents ?? [];
  const expenseDocs = expenseData?.documents ?? [];

  const activeDocs = activeTab === "personal" ? personalDocs : expenseDocs;
  const loading = activeTab === "personal" ? loadingPersonal : loadingExpense;

  const departments = useMemo(() => {
    const set = new Set(activeDocs.map((d) => d.employee?.department).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [activeDocs]);

  const filtered = useMemo(() => {
    return activeDocs.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        (d.employee?.name || "").toLowerCase().includes(q) ||
        (d.employee?.email || "").toLowerCase().includes(q) ||
        (d.employee?.department || "").toLowerCase().includes(q) ||
        (d.employee?.designation || "").toLowerCase().includes(q) ||
        (d.employee?.role || "").toLowerCase().includes(q);

      const matchRole =
        filterRole === "all" || (d.employee?.role || "").toLowerCase() === filterRole;

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "new" && !d.viewedBySuperAdmin) ||
        (filterStatus === "viewed" && d.viewedBySuperAdmin);

      const matchAdminViewed =
        filterAdminViewed === "all" ||
        (filterAdminViewed === "viewed_admin" && d.viewedByAdmin) ||
        (filterAdminViewed === "not_viewed_admin" && !d.viewedByAdmin);

      const matchDept =
        filterDept === "all" || (d.employee?.department || "") === filterDept;

      const uploadDate = d.uploadedAt ? new Date(d.uploadedAt) : null;
      const matchFrom = !filterDateFrom || (uploadDate && uploadDate >= new Date(filterDateFrom));
      const matchTo = !filterDateTo || (uploadDate && uploadDate <= new Date(filterDateTo + "T23:59:59"));

      return matchSearch && matchRole && matchStatus && matchAdminViewed && matchDept && matchFrom && matchTo;
    });
  }, [activeDocs, search, filterRole, filterStatus, filterAdminViewed, filterDept, filterDateFrom, filterDateTo]);

  const unviewedPersonal = personalDocs.filter((d) => !d.viewedBySuperAdmin).length;
  const unviewedExpense = expenseDocs.filter((d) => !d.viewedBySuperAdmin).length;

  const activeFiltersCount = [
    filterRole !== "all",
    filterStatus !== "all",
    filterAdminViewed !== "all",
    filterDept !== "all",
    !!filterDateFrom,
    !!filterDateTo,
  ].filter(Boolean).length;

  function clearFilters() {
    setFilterRole("all");
    setFilterStatus("all");
    setFilterAdminViewed("all");
    setFilterDept("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearch("");
  }

  return (
    <div className="min-h-screen bg-[#f9f8f2] p-4 sm:p-6 lg:p-8 font-[DM_Sans,ui-sans-serif,system-ui,sans-serif] text-[#2a1a16]">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-[#b0948a] mt-1">
          View and manage personal and expense documents submitted by employees
        </p>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 items-center">
        {[
          ["Total personal", personalDocs.length, "bg-[#730042]/10 text-[#730042]", "bg-[#730042]"],
          ["Total expense", expenseDocs.length, "bg-blue-50 text-blue-700", "bg-blue-500"],
          ["Unviewed", unviewedPersonal + unviewedExpense, "bg-amber-50 text-amber-700", "bg-amber-500"],
        ].map(([label, val, badge, dot]) => (
          <div
            key={label}
            className="bg-white border border-[#ede5e0] rounded-xl px-3 py-2 flex items-center gap-2 text-sm"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-[#b0948a] text-xs">{label}</span>
            <span className="font-semibold text-[#2a1a16]">{val}</span>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
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
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm text-[#2a1a16] outline-none focus:border-[#730042] w-40 sm:w-56 transition-colors placeholder:text-[#c9bab5]"
            />
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || activeFiltersCount > 0
                ? "bg-[#730042] text-white border-[#730042]"
                : "bg-white text-[#2a1a16] border-[#ede5e0] hover:border-[#730042]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-white text-[#730042] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => exportToCSV(filtered, activeTab)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#ede5e0] bg-white text-sm font-medium text-[#2a1a16] hover:border-[#730042] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="#730042" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-[#ede5e0] rounded-2xl p-4 sm:p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium text-[#b0948a] uppercase tracking-wide">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#ede5e0] bg-[#f9f8f2] text-xs text-[#2a1a16] outline-none focus:border-[#730042] capitalize"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r === "all" ? "All roles" : r.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium text-[#b0948a] uppercase tracking-wide">SA Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#ede5e0] bg-[#f9f8f2] text-xs text-[#2a1a16] outline-none focus:border-[#730042]"
            >
              <option value="all">All</option>
              <option value="new">New (unviewed)</option>
              <option value="viewed">Viewed</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium text-[#b0948a] uppercase tracking-wide">Admin view</label>
            <select
              value={filterAdminViewed}
              onChange={(e) => setFilterAdminViewed(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#ede5e0] bg-[#f9f8f2] text-xs text-[#2a1a16] outline-none focus:border-[#730042]"
            >
              <option value="all">All</option>
              <option value="viewed_admin">Admin viewed</option>
              <option value="not_viewed_admin">Not viewed</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium text-[#b0948a] uppercase tracking-wide">Department</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#ede5e0] bg-[#f9f8f2] text-xs text-[#2a1a16] outline-none focus:border-[#730042]"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "All depts" : d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium text-[#b0948a] uppercase tracking-wide">From date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#ede5e0] bg-[#f9f8f2] text-xs text-[#2a1a16] outline-none focus:border-[#730042]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium text-[#b0948a] uppercase tracking-wide">To date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#ede5e0] bg-[#f9f8f2] text-xs text-[#2a1a16] outline-none focus:border-[#730042]"
            />
          </div>

          {activeFiltersCount > 0 && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-6 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-[#730042] font-medium hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden">
        <div
          className="h-0.5 transition-colors duration-300"
          style={{ background: activeTab === "personal" ? "#730042" : "#185FA5" }}
        />

        <div className="flex border-b border-[#ede5e0] px-4 sm:px-5 overflow-x-auto">
          {[
            { key: "personal", label: "Personal", count: personalDocs.length, unviewed: unviewedPersonal },
            { key: "expense", label: "Expense", count: expenseDocs.length, unviewed: unviewedExpense },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const color = tab.key === "personal" ? "#730042" : "#185FA5";
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearch("");
                  clearFilters();
                }}
                style={{
                  borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                  color: isActive ? color : "#b0948a",
                }}
                className="px-4 py-3.5 bg-transparent border-none text-sm whitespace-nowrap font-medium cursor-pointer flex items-center gap-2 -mb-px transition-colors"
              >
                {tab.label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? `${color}15` : "#f2eeec",
                    color: isActive ? color : "#b0948a",
                  }}
                >
                  {tab.count}
                </span>
                {tab.unviewed > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">
                    {tab.unviewed} new
                  </span>
                )}
              </button>
            );
          })}

          <div className="ml-auto flex items-center pl-4 py-2">
            <span className="text-[11px] text-[#b0948a]">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-16 gap-3">
            <Spinner />
            <span className="text-sm text-[#b0948a]">Loading documents...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState
            message={
              search || activeFiltersCount > 0
                ? "No results match your filters."
                : `No ${activeTab} documents uploaded yet.`
            }
          />
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#ede5e0]">
                    {["Document", "Employee", "Role", "Department", "Uploaded", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold text-[#c9bab5] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <TableRow
                      key={doc.id}
                      doc={doc}
                      docType={activeTab}
                      onClick={() => {
                        setSelectedDoc(doc.id);
                        setSelectedDocType(activeTab);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden">
              {filtered.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  docType={activeTab}
                  onClick={() => {
                    setSelectedDoc(doc.id);
                    setSelectedDocType(activeTab);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

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