import { useState } from "react";
import {
  useGetAllPersonalDocumentsSuperAdmin,
  useGetAllExpenseDocumentsSuperAdmin,
  useGetDocumentDetailsSuperAdmin,
} from "../../auth/server-state/superadmin/other/suother.hook";

const C = {
  brand:      "#730042",
  brandLight: "rgba(115,0,66,0.08)",
  brandMid:   "rgba(115,0,66,0.15)",
  amber:      "#BA7517",
  amberBg:    "#faeeda",
  blue:       "#185FA5",
  blueBg:     "#E6F1FB",
  red:        "#E24B4A",
  redBg:      "#fcebeb",
  surface:    "#ffffff",
  page:       "#f9f8f2",
  border:     "#ede5e0",
  text:       "#2a1a16",
  muted:      "#b0948a",
  mutedMid:   "#c9bab5",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtSize(kb) {
  if (!kb) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 2);
}

function Spinner({ size = 28, color = C.brand }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}33`,
      borderTop: `2px solid ${color}`,
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 500, color, background: bg,
    }}>
      {children}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", gap: 14,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: C.brandLight,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke={C.brand} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="14 2 14 8 20 8"
            stroke={C.brand} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>No documents found</div>
      <div style={{ fontSize: 12, color: C.muted }}>{message}</div>
    </div>
  );
}

function DetailDrawer({ documentId, docType, onClose }) {
  const { data, isLoading, isError } = useGetDocumentDetailsSuperAdmin(documentId);
  const doc = data?.document;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,26,22,0.35)" }} />
      <div style={{
        position: "relative", width: 420, height: "100%",
        background: C.surface, overflowY: "auto",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 32px rgba(115,0,66,0.10)",
      }}>
        <div style={{
          padding: "20px 24px", borderBottom: `0.5px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: C.surface, zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Document details</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {docType === "personal" ? "Personal" : "Expense"} document
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: `0.5px solid ${C.border}`,
            borderRadius: 8, cursor: "pointer", padding: "6px 10px",
            color: C.muted, fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ flex: 1, padding: "24px" }}>
          {isLoading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
              <Spinner />
            </div>
          )}
          {isError && (
            <div style={{ padding: "14px 16px", background: C.redBg, borderRadius: 10, fontSize: 13, color: C.red }}>
              Failed to load document details.
            </div>
          )}
          {doc && (
            <>
              <div style={{
                background: C.brandLight, borderRadius: 14,
                padding: "24px", marginBottom: 20,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                border: `0.5px solid ${C.brandMid}`,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: C.brand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14 2 14 8 20 8"
                      stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 4 }}>{doc.title}</div>
                  <Badge
                    color={docType === "personal" ? C.brand : C.blue}
                    bg={docType === "personal" ? C.brandLight : C.blueBg}
                  >
                    {docType === "personal" ? "Personal" : "Expense"}
                  </Badge>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", background: C.brand, color: "#fff",
                  borderRadius: 9, fontSize: 13, fontWeight: 500,
                  textDecoration: "none", marginTop: 4,
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Open / Download
                </a>
              </div>

              {[
                ["File size",   fmtSize(doc.sizeKB)],
                ["Uploaded on", fmtDate(doc.uploadedAt)],
                ["Viewed by admin",       doc.viewedByAdmin ? "Yes" : "Not yet"],
                ["Viewed by super admin", doc.viewedBySuperAdmin ? "Yes" : "Not yet"],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "12px 0", borderBottom: `0.5px solid ${C.border}`, fontSize: 13,
                }}>
                  <span style={{ color: C.muted }}>{label}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{val}</span>
                </div>
              ))}

              {doc.employee && (
                <div style={{
                  marginTop: 24, background: C.page,
                  borderRadius: 12, padding: "16px",
                  border: `0.5px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 12 }}>Uploaded by</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", background: C.brand,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 500, color: "#fff", flexShrink: 0,
                    }}>
                      {getInitials(doc.employee.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{doc.employee.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{doc.employee.email}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{doc.employee.department}</div>
                    </div>
                  </div>
                </div>
              )}

              {doc.reportingManager && (
                <div style={{
                  marginTop: 12, background: C.page,
                  borderRadius: 12, padding: "16px",
                  border: `0.5px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 12 }}>Reporting manager</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", background: C.blue,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 500, color: "#fff", flexShrink: 0,
                    }}>
                      {getInitials(doc.reportingManager.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{doc.reportingManager.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{doc.reportingManager.email}</div>
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
      style={{
        background: C.surface, borderRadius: 14,
        border: `0.5px solid ${C.border}`,
        padding: "16px 20px", cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.brand;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.brandLight}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: docType === "personal" ? C.brand : C.blue,
        borderRadius: "14px 14px 0 0",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: docType === "personal" ? C.brandLight : C.blueBg,
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke={docType === "personal" ? C.brand : C.blue}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="14 2 14 8 20 8"
              stroke={docType === "personal" ? C.brand : C.blue}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: C.text,
            marginBottom: 4, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {doc.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {!doc.viewedBySuperAdmin && (
              <Badge color={C.amber} bg={C.amberBg}>New</Badge>
            )}
            <span style={{ fontSize: 11, color: C.mutedMid }}>
              {fmtSize(doc.sizeKB)} · {fmtDate(doc.uploadedAt)}
            </span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M6 4l4 4-4 4" stroke={C.mutedMid} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function EmployeeDocsView({ employee, onBack }) {
  const [activeTab, setActiveTab] = useState("personal");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [search, setSearch] = useState("");

  const { data: personalData, isLoading: loadingPersonal } = useGetAllPersonalDocumentsSuperAdmin();
  const { data: expenseData,  isLoading: loadingExpense  } = useGetAllExpenseDocumentsSuperAdmin();

  const personalDocs = (personalData?.documents ?? []).filter((d) => d.employee?.id === employee.id);
  const expenseDocs  = (expenseData?.documents  ?? []).filter((d) => d.employee?.id === employee.id);

  const activeDocs = activeTab === "personal" ? personalDocs : expenseDocs;
  const filtered = activeDocs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const loading = activeTab === "personal" ? loadingPersonal : loadingExpense;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.page, minHeight: "100vh", padding: "28px 32px", color: C.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <button
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "none", border: `0.5px solid ${C.border}`,
          borderRadius: 8, padding: "7px 14px", cursor: "pointer",
          fontSize: 13, color: C.muted, marginBottom: 20, fontFamily: "inherit",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L3 7l6 5" stroke={C.muted} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to employees
      </button>

      <div style={{
        background: C.surface, borderRadius: 14,
        border: `0.5px solid ${C.border}`,
        padding: "20px 24px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: C.brand,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 500, color: "#fff", flexShrink: 0,
        }}>
          {getInitials(employee.name)}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: C.text }}>{employee.name}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{employee.email}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {employee.department && (
              <Badge color={C.brand} bg={C.brandLight}>{employee.department}</Badge>
            )}
            {employee.designation && (
              <Badge color={C.blue} bg={C.blueBg}>{employee.designation}</Badge>
            )}
            <Badge color="#5F5E5A" bg="#F1EFE8">{employee.role}</Badge>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
          {[
            ["Personal", personalDocs.length],
            ["Expense",  expenseDocs.length],
          ].map(([label, count]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: C.text }}>{count}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["personal", "expense"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearch(""); }}
              style={{
                padding: "8px 18px", borderRadius: 8,
                border: `0.5px solid ${activeTab === tab ? C.brand : C.border}`,
                background: activeTab === tab ? C.brand : C.surface,
                color: activeTab === tab ? "#fff" : C.muted,
                fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                fontWeight: activeTab === tab ? 500 : 400,
              }}
            >
              {tab === "personal" ? "Personal" : "Expense"}
              <span style={{
                marginLeft: 6, fontSize: 11,
                background: activeTab === tab ? "rgba(255,255,255,0.2)" : C.brandLight,
                color: activeTab === tab ? "#fff" : C.brand,
                padding: "1px 7px", borderRadius: 20,
              }}>
                {tab === "personal" ? personalDocs.length : expenseDocs.length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", position: "relative" }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke={C.muted} strokeWidth="1.3" />
            <path d="M10 10l3 3" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "9px 14px 9px 34px", borderRadius: 10,
              border: `0.5px solid ${C.border}`, fontSize: 13,
              color: C.text, background: C.surface,
              outline: "none", width: 220, fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.brand)}
            onBlur={(e)  => (e.target.style.borderColor = C.border)}
          />
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ height: 3, background: activeTab === "personal" ? C.brand : C.blue }} />

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0", gap: 12 }}>
            <Spinner />
            <span style={{ fontSize: 13, color: C.muted }}>Loading documents...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState message={search ? "No results match your search." : `No ${activeTab} documents found for this employee.`} />
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                docType={activeTab}
                onClick={() => { setSelectedDoc(doc.id); setSelectedDocType(activeTab); }}
              />
            ))}
          </div>
        )}
      </div>

      {selectedDoc && (
        <DetailDrawer
          documentId={selectedDoc}
          docType={selectedDocType}
          onClose={() => { setSelectedDoc(null); setSelectedDocType(null); }}
        />
      )}
    </div>
  );
}

function EmployeeListView({ onSelectEmployee }) {
  const { data: personalData } = useGetAllPersonalDocumentsSuperAdmin();
  const { data: expenseData  } = useGetAllExpenseDocumentsSuperAdmin();
  const [search, setSearch]     = useState("");
  const [deptFilter, setDept]   = useState("all");
  const [roleFilter, setRole]   = useState("all");

  const allDocs = [
    ...(personalData?.documents ?? []),
    ...(expenseData?.documents  ?? []),
  ];

  const employeeMap = {};
  allDocs.forEach((doc) => {
    if (!doc.employee) return;
    const id = doc.employee.id;
    if (!employeeMap[id]) {
      employeeMap[id] = {
        id,
        name:        doc.employee.name,
        email:       doc.employee.email,
        contact:     doc.employee.contact,
        department:  doc.employee.department,
        designation: doc.employee.designation,
        role:        doc.reportingManager ? "employee" : "manager",
        personalCount: 0,
        expenseCount:  0,
        unviewed:      0,
      };
    }
    if (doc.fileType === "personal") employeeMap[id].personalCount++;
    else                             employeeMap[id].expenseCount++;
    if (!doc.viewedBySuperAdmin)     employeeMap[id].unviewed++;
  });

  const employees = Object.values(employeeMap);

  const departments = ["all", ...new Set(employees.map((e) => e.department).filter(Boolean))];
  const roles       = ["all", "employee", "manager"];

  const filtered = employees.filter((e) => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || e.department === deptFilter;
    const matchRole = roleFilter === "all" || e.role === roleFilter;
    return matchSearch && matchDept && matchRole;
  });

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.page, minHeight: "100vh", padding: "28px 32px", color: C.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>Documents</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          Select an employee or manager to view their documents
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          ["Total employees", employees.length, C.brand],
          ["With unviewed docs", employees.filter((e) => e.unviewed > 0).length, C.amber],
        ].map(([label, val, dotColor]) => (
          <div key={label} style={{
            background: C.surface, borderRadius: 10,
            border: `0.5px solid ${C.border}`,
            padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
            <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{val}</span>
          </div>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={deptFilter}
            onChange={(e) => setDept(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8,
              border: `0.5px solid ${C.border}`, fontSize: 13,
              color: C.text, background: C.surface,
              outline: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === "all" ? "All departments" : d}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRole(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8,
              border: `0.5px solid ${C.border}`, fontSize: 13,
              color: C.text, background: C.surface,
              outline: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>

          <div style={{ position: "relative" }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke={C.muted} strokeWidth="1.3" />
              <path d="M10 10l3 3" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "9px 14px 9px 34px", borderRadius: 10,
                border: `0.5px solid ${C.border}`, fontSize: 13,
                color: C.text, background: C.surface,
                outline: "none", width: 250, fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.brand)}
              onBlur={(e)  => (e.target.style.borderColor = C.border)}
            />
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ height: 3, background: C.brand }} />

        {filtered.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 24px", gap: 14,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: C.brandLight,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke={C.brand} strokeWidth="1.5" />
                <path d="M21 21l-4.35-4.35" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>No employees found</div>
            <div style={{ fontSize: 12, color: C.muted }}>Try adjusting your filters or search term.</div>
          </div>
        ) : (
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((emp) => (
              <div
                key={emp.id}
                onClick={() => onSelectEmployee(emp)}
                style={{
                  background: C.surface, borderRadius: 14,
                  border: `0.5px solid ${C.border}`,
                  padding: "16px 20px", cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  display: "flex", alignItems: "center", gap: 16,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.brand;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.brandLight}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: C.brand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 500, color: "#fff", flexShrink: 0,
                }}>
                  {getInitials(emp.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{emp.name}</span>
                    {emp.unviewed > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: C.amber, background: C.amberBg,
                        padding: "1px 8px", borderRadius: 20,
                      }}>
                        {emp.unviewed} new
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{emp.email}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {emp.department && (
                      <Badge color={C.brand} bg={C.brandLight}>{emp.department}</Badge>
                    )}
                    {emp.designation && (
                      <Badge color={C.blue} bg={C.blueBg}>{emp.designation}</Badge>
                    )}
                    <Badge color="#5F5E5A" bg="#F1EFE8">
                      {emp.role === "manager" ? "Manager" : "Employee"}
                    </Badge>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                  {[
                    ["Personal", emp.personalCount, C.brand],
                    ["Expense",  emp.expenseCount,  C.blue],
                  ].map(([label, count, color]) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 500, color }}>{count}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
                    </div>
                  ))}
                </div>

                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M6 4l4 4-4 4" stroke={C.mutedMid} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminDocuments() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  if (selectedEmployee) {
    return (
      <EmployeeDocsView
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  return <EmployeeListView onSelectEmployee={setSelectedEmployee} />;
}