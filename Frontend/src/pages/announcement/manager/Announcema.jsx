import { useState } from "react";
import { useManagerAnnouncements } from "../../../auth/server-state/manager/managerannounce/managerannounce.hook";
import FontInjector       from "../../../components/announcement/shared/FontInjector";
import BulletinHeader     from "../../../components/announcement/shared/BulletinHeader";
import AnnCard            from "../../../components/announcement/shared/AnnCard";
import { Spinner }        from "../../../components/announcement/shared/Spinner";
import { PriorityPill, AudiencePill } from "../../../components/announcement/shared/Badges";
import { C }              from "../../../components/announcement/shared/constants";
import FilterBar          from "./FilterBar";
import ManagerDetailModal from "./ManagerDetailModal";

export default function Announcema() {
  const { data, isLoading, isError: error } = useManagerAnnouncements();
  const [selectedId, setSelectedId] = useState(null);
  const [filter,     setFilter]     = useState("all");

  const allAnnouncements = data || [];

  const filtered = allAnnouncements
    .filter((ann) => {
      if (filter === "high")     return (ann.priority || "").toLowerCase() === "high";
      if (filter === "managers") return (ann.audience  || "").toLowerCase() === "managers";
      return true;
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      const ap = order[(a.priority || "low").toLowerCase()] ?? 2;
      const bp = order[(b.priority || "low").toLowerCase()] ?? 2;
      if (ap !== bp) return ap - bp;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" }}>
      <FontInjector />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        <BulletinHeader count={allAnnouncements.length}>
          <FilterBar filter={filter} setFilter={setFilter} allAnnouncements={allAnnouncements} />
        </BulletinHeader>

        {isLoading && <Spinner />}

        {error && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ color: C.mid, fontWeight: 500, fontSize: 15, margin: "0 0 6px" }}>Failed to load announcements</p>
            <p style={{ color: C.deepA45, fontSize: 13, margin: 0 }}>Please try refreshing the page.</p>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              border: `1.5px solid ${C.midA25}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3 style={{ fontFamily: "'Segoe UI', sans-serif", fontSize: 24, fontWeight: 600, color: C.deep, marginBottom: ".5rem" }}>
              Nothing yet
            </h3>
            <p style={{ fontSize: 13, color: C.deepA45, margin: 0 }}>
              {filter !== "all" ? "Try a different filter." : "New announcements will appear here."}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
            {filtered.map((ann, i) => (
              <AnnCard
                key={ann._id}
                ann={ann}
                index={i}
                onClick={setSelectedId}
                badges={<>
                  {ann.priority && <PriorityPill priority={ann.priority} />}
                  {ann.audience && <AudiencePill audience={ann.audience} />}
                </>}
              />
            ))}
          </div>
        )}
      </div>

      {selectedId && <ManagerDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}