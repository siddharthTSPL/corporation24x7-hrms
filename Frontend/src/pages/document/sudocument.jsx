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
  green:      "#1D9E75",
  greenBg:    "#e8f5e9",
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
                ["File size",             fmtSize(doc.sizeKB)],
                ["Uploaded on",           fmtDate(doc.uploadedAt)],
                ["Viewed by manager",     doc.viewedByManager     ? "Yes" : "Not yet"],
                ["Viewed by admin",       doc.viewedByAdmin       ? "Yes" : "Not yet"],
                ["Viewed by super admin", doc.viewedBySuperAdmin  ? "Yes" : "Not yet"],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "12px 0", borderBottom: `0.5px solid ${C.border}`, fontSize: 13,
                }}>
                  <span style={{ color: C.muted }}>{label}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{val}</span>
                </div>
              ))}

              {doc.employee ? (
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
              ) : (
                <div style={{
                  marginTop: 24, background: C.page,
                  borderRadius: 12, padding: "14px 16px",
                  border: `0.5px solid ${C.border}`,
                  fontSize: 13, color: C.muted,
                }}>
                  Employee information not available
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

function DocRow({ doc, docType, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 20px", cursor: "pointer",
        borderBottom: `0.5px solid ${C.border}`,
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.page)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: docType === "personal" ? C.brandLight : C.blueBg,
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

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {doc.employee ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: C.brand,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 600, color: "#fff", flexShrink: 0,
            }}>
              {getInitials(doc.employee.name)}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{doc.employee.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{doc.employee.department || doc.employee.designation || "—"}</div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: C.mutedMid }}>No employee info</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        <div title="Viewed by admin" style={{
          width: 20, height: 20, borderRadius: "50%",
          background: doc.viewedByAdmin ? C.greenBg : C.redBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {doc.viewedByAdmin
            ? <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={C.green} strokeWidth="1.5" strokeLinecap="round"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/></svg>
          }
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M6 4l4 4-4 4" stroke={C.mutedMid} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function SuperAdminDocuments() {
  const [activeTab, setActiveTab]     = useState("personal");
  const [search, setSearch]           = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(null);

  const { data: personalData, isLoading: loadingPersonal } = useGetAllPersonalDocumentsSuperAdmin();
  const { data: expenseData,  isLoading: loadingExpense  } = useGetAllExpenseDocumentsSuperAdmin();

  const personalDocs = personalData?.documents ?? [];
  const expenseDocs  = expenseData?.documents  ?? [];

  const activeDocs = activeTab === "personal" ? personalDocs : expenseDocs;
  const loading    = activeTab === "personal" ? loadingPersonal : loadingExpense;

  const filtered = activeDocs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.employee?.name  || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.employee?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const unviewedPersonal = personalDocs.filter((d) => !d.viewedBySuperAdmin).length;
  const unviewedExpense  = expenseDocs.filter((d)  => !d.viewedBySuperAdmin).length;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.page, minHeight: "100vh", padding: "28px 32px", color: C.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>Documents</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          View and manage personal and expense documents submitted by employees
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {[
          ["Total personal", personalDocs.length, C.brand, C.brandLight],
          ["Total expense",  expenseDocs.length,  C.blue,  C.blueBg],
          ["Unviewed",       unviewedPersonal + unviewedExpense, C.amber, C.amberBg],
        ].map(([label, val, color, bg]) => (
          <div key={label} style={{
            background: C.surface, borderRadius: 10,
            border: `0.5px solid ${C.border}`,
            padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{val}</span>
          </div>
        ))}

        <div style={{ marginLeft: "auto", position: "relative" }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke={C.muted} strokeWidth="1.3" />
            <path d="M10 10l3 3" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search title, employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "9px 14px 9px 34px", borderRadius: 10,
              border: `0.5px solid ${C.border}`, fontSize: 13,
              color: C.text, background: C.surface,
              outline: "none", width: 240, fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.brand)}
            onBlur={(e)  => (e.target.style.borderColor = C.border)}
          />
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ height: 3, background: activeTab === "personal" ? C.brand : C.blue }} />

        <div style={{
          display: "flex", gap: 0,
          borderBottom: `0.5px solid ${C.border}`,
          padding: "0 20px",
        }}>
          {[
            { key: "personal", label: "Personal",  count: personalDocs.length, unviewed: unviewedPersonal },
            { key: "expense",  label: "Expense",   count: expenseDocs.length,  unviewed: unviewedExpense  },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              style={{
                padding: "14px 20px",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.key
                  ? `2px solid ${tab.key === "personal" ? C.brand : C.blue}`
                  : "2px solid transparent",
                color: activeTab === tab.key ? (tab.key === "personal" ? C.brand : C.blue) : C.muted,
                fontSize: 13, fontWeight: activeTab === tab.key ? 500 : 400,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: -1,
              }}
            >
              {tab.label}
              <span style={{
                fontSize: 11, padding: "1px 7px", borderRadius: 20,
                background: activeTab === tab.key
                  ? (tab.key === "personal" ? C.brandLight : C.blueBg)
                  : "#f2eeec",
                color: activeTab === tab.key
                  ? (tab.key === "personal" ? C.brand : C.blue)
                  : C.muted,
              }}>
                {tab.count}
              </span>
              {tab.unviewed > 0 && (
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 20,
                  background: C.amberBg, color: C.amber, fontWeight: 600,
                }}>
                  {tab.unviewed} new
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0", gap: 12 }}>
            <Spinner />
            <span style={{ fontSize: 13, color: C.muted }}>Loading documents...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState message={search ? "No results match your search." : `No ${activeTab} documents uploaded yet.`} />
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 200px 60px",
              padding: "10px 20px",
              borderBottom: `0.5px solid ${C.border}`,
              gap: 16,
            }}>
              {["", "Document", "Employee", "Status"].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 500, color: C.mutedMid, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {h}
                </div>
              ))}
            </div>

            <div>
              {filtered.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  docType={activeTab}
                  onClick={() => { setSelectedDoc(doc.id); setSelectedDocType(activeTab); }}
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
          onClose={() => { setSelectedDoc(null); setSelectedDocType(null); }}
        />
      )}
    </div>
  );
}