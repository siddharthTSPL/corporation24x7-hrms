import { useState } from "react";
import { useManagerAnnouncements, useParticularAnnouncement } from "../../auth/server-state/manager/managerannounce/managerannounce.hook";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const timeAgo = (date) => {
  if (!date) return "—";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

const priorityConfig = {
  high: { bg: "#fce8e8", color: "#a32d2d", dot: "#e24b4a" },
  medium: { bg: "#fff8e0", color: "#ba7517", dot: "#ba7517" },
  low: { bg: "#f1efe8", color: "#5f5e5a", dot: "#888" },
};

const audienceConfig = {
  managers: { bg: "#e8f5e9", color: "#2e7d32" },
  all: { bg: "#f0eeff", color: "#534ab7" },
};

// ─── chip ────────────────────────────────────────────────────────────────────
const Chip = ({ label, bg, color }) => (
  <span style={{ 
    fontSize: 11, 
    borderRadius: 20, 
    padding: "3px 10px", 
    fontWeight: 500, 
    background: bg, 
    color, 
    display: "inline-block" 
  }}>
    {label}
  </span>
);

// ─── announcement card ───────────────────────────────────────────────────────
const AnnouncementCard = ({ announcement, onClick, isExpanded }) => {
  const priority = (announcement.priority || "low").toLowerCase();
  const audience = (announcement.audience || "all").toLowerCase();
  const pConfig = priorityConfig[priority] || priorityConfig.low;
  const aConfig = audienceConfig[audience] || audienceConfig.all;

  return (
    <div
      onClick={() => onClick(announcement._id)}
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "0.5px solid #e8e4dc",
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
        transform: isExpanded ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Priority indicator dot */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          flexShrink: 0,
          marginTop: 6,
          background: pConfig.dot,
          boxShadow: priority === "high" ? "0 0 8px rgba(227, 75, 74, 0.4)" : "none",
        }} />

        <div style={{ flex: 1 }}>
          {/* Title and priority */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
              {announcement.title || "Untitled Announcement"}
            </span>
            <Chip label={priority} bg={pConfig.bg} color={pConfig.color} />
            {priority === "high" && (
              <span style={{ fontSize: 11, color: "#e24b4a", fontWeight: 600 }}>⚠ URGENT</span>
            )}
          </div>

          {/* Body preview */}
          <div style={{ 
            fontSize: 13, 
            color: "#555", 
            lineHeight: 1.6, 
            marginBottom: 10,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: isExpanded ? "none" : 2,
            WebkitBoxOrient: "vertical",
          }}>
            {announcement.body || "No content available"}
          </div>

          {/* Metadata */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#bbb" }}>
              {timeAgo(announcement.createdAt)}
            </span>
            {announcement.expiresAt && (
              <>
                <span style={{ fontSize: 11, color: "#bbb" }}>•</span>
                <span style={{ fontSize: 11, color: "#bbb" }}>
                  Expires {fmtDate(announcement.expiresAt)}
                </span>
              </>
            )}
            <span style={{ fontSize: 11, color: "#bbb" }}>•</span>
            <Chip label={audience} bg={aConfig.bg} color={aConfig.color} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── detailed announcement modal ─────────────────────────────────────────────
const AnnouncementDetail = ({ id, onClose }) => {
  const { data, isLoading, error } = useParticularAnnouncement(id);

  if (isLoading) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "'Segoe UI',sans-serif",
      }}>
        <div style={{ fontSize: 14, color: "#fff" }}>Loading announcement...</div>
      </div>
    );
  }

  if (error || !data?.announcement) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "'Segoe UI',sans-serif",
      }} onClick={onClose}>
        <div style={{
          background: "#fff",
          borderRadius: 14,
          padding: "24px",
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#a32d2d", marginBottom: 8 }}>
            Error Loading Announcement
          </div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {error?.message || "Announcement not found"}
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#7b1450",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const announcement = data.announcement;
  const priority = (announcement.priority || "low").toLowerCase();
  const audience = (announcement.audience || "all").toLowerCase();
  const pConfig = priorityConfig[priority] || priorityConfig.low;
  const aConfig = audienceConfig[audience] || audienceConfig.all;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "'Segoe UI',sans-serif",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          maxWidth: 700,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header with priority indicator */}
        <div style={{
          background: priority === "high" ? "#7b1450" : "#f8f6f2",
          padding: "20px 24px",
          borderRadius: "14px 14px 0 0",
          borderBottom: "0.5px solid #e8e4dc",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              flexShrink: 0,
              marginTop: 4,
              background: priority === "high" ? "#fff" : pConfig.dot,
            }} />
            <div style={{ flex: 1 }}>
              <h2 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                color: priority === "high" ? "#fff" : "#1a1a1a",
                marginBottom: 8,
              }}>
                {announcement.title || "Untitled Announcement"}
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Chip label={priority} bg={pConfig.bg} color={pConfig.color} />
                <Chip label={audience} bg={aConfig.bg} color={aConfig.color} />
                {priority === "high" && (
                  <span style={{
                    fontSize: 11,
                    color: priority === "high" ? "#fff" : "#e24b4a",
                    fontWeight: 600,
                  }}>
                    ⚠ URGENT
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 24,
                color: priority === "high" ? "#fff" : "#888",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          <div style={{
            fontSize: 14,
            color: "#1a1a1a",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            marginBottom: 20,
          }}>
            {announcement.body || "No content available"}
          </div>

          {/* Metadata footer */}
          <div style={{
            borderTop: "0.5px solid #f0ece4",
            paddingTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Published</div>
              <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>
                {fmtDate(announcement.createdAt)}
              </div>
            </div>
            {announcement.expiresAt && (
              <div>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Expires</div>
                <div style={{ fontSize: 13, color: "#a32d2d", fontWeight: 500 }}>
                  {fmtDate(announcement.expiresAt)}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Audience</div>
              <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>
                {audience === "all" ? "All Employees" : "Managers Only"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Priority</div>
              <div style={{ fontSize: 13, color: pConfig.color, fontWeight: 500, textTransform: "capitalize" }}>
                {priority}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── main announcements component ────────────────────────────────────────────
export default function Announcema() {
  const { data, isLoading, error } = useManagerAnnouncements();
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all"); // all, high, managers

  const announcements = data || [];

  // Filter announcements
  const filteredAnnouncements = announcements.filter((ann) => {
    if (filter === "all") return true;
    if (filter === "high") return (ann.priority || "").toLowerCase() === "high";
    if (filter === "managers") return (ann.audience || "").toLowerCase() === "managers";
    return true;
  });

  // Sort by priority (high first) then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[(a.priority || "low").toLowerCase()] ?? 2;
    const bPriority = priorityOrder[(b.priority || "low").toLowerCase()] ?? 2;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const urgentCount = announcements.filter((a) => (a.priority || "").toLowerCase() === "high").length;
  const managersCount = announcements.filter((a) => (a.audience || "").toLowerCase() === "managers").length;

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f5f3ef",
        fontFamily: "'Segoe UI',sans-serif",
        fontSize: 14,
        color: "#888",
      }}>
        Loading announcements…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f5f3ef",
        fontFamily: "'Segoe UI',sans-serif",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 14,
          border: "0.5px solid #e8e4dc",
          padding: "24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#a32d2d", marginBottom: 8 }}>
            Error Loading Announcements
          </div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {error.message || "Please try again later"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f5f3ef", minHeight: "100vh", fontFamily: "'Segoe UI',sans-serif" }}>
      
      {/* Top bar */}
      <div style={{
        background: "#fff",
        borderBottom: "0.5px solid #e8e4dc",
        padding: "16px 28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              color: "#1a1a1a",
              letterSpacing: "-0.3px",
            }}>
              Announcements
            </h1>
            <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              Stay updated with important company announcements
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {urgentCount > 0 && (
              <Chip label={`${urgentCount} urgent`} bg="#fce8e8" color="#a32d2d" />
            )}
            <span style={{ fontSize: 12, color: "#aaa" }}>
              {announcements.length} total
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        
        {/* Filters */}
        <div style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}>
          {[
            { id: "all", label: `All (${announcements.length})` },
            { id: "high", label: `Urgent (${urgentCount})` },
            { id: "managers", label: `Managers only (${managersCount})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "8px 16px",
                background: filter === f.id ? "#7b1450" : "#fff",
                color: filter === f.id ? "#fff" : "#1a1a1a",
                border: filter === f.id ? "none" : "0.5px solid #e8e4dc",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Announcements grid */}
        {sortedAnnouncements.length === 0 ? (
          <div style={{
            background: "#fff",
            borderRadius: 14,
            border: "0.5px solid #e8e4dc",
            padding: "40px 24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 15, color: "#888", marginBottom: 8 }}>
              No announcements found
            </div>
            <div style={{ fontSize: 13, color: "#bbb" }}>
              {filter !== "all" ? "Try changing the filter" : "Check back later for updates"}
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: 16,
          }}>
            {sortedAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement._id}
                announcement={announcement}
                onClick={setSelectedId}
                isExpanded={selectedId === announcement._id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedId && (
        <AnnouncementDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}