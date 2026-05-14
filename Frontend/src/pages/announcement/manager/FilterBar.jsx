import { C } from "../../../components/announcement/shared/constants";

export default function FilterBar({ filter, setFilter, allAnnouncements }) {
  const urgentCount   = allAnnouncements.filter((a) => (a.priority || "").toLowerCase() === "high").length;
  const managersCount = allAnnouncements.filter((a) => (a.audience  || "").toLowerCase() === "managers").length;

  const FILTERS = [
    { id: "all",      label: "All",          count: allAnnouncements.length },
    { id: "high",     label: "Urgent",       count: urgentCount },
    { id: "managers", label: "Managers only",count: managersCount },
  ];

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {FILTERS.map((f) => (
        <button
          key={f.id}
          className="filter-btn"
          onClick={() => setFilter(f.id)}
          style={{
            padding: "5px 14px", borderRadius: 99, cursor: "pointer",
            fontSize: 11, fontWeight: 500, letterSpacing: ".08em",
            textTransform: "uppercase", transition: "all .2s",
            background: filter === f.id ? C.deep : "transparent",
            color:      filter === f.id ? C.white : C.deepA45,
            border: `1px solid ${filter === f.id ? C.deep : C.deepA25}`,
          }}>
          {f.label} · {f.count}
        </button>
      ))}
    </div>
  );
}