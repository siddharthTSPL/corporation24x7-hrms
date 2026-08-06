import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaChevronRight,
  FaHeadset,
  FaTicketAlt,
  FaBook,
} from "react-icons/fa";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { helpSections, ROLE_LABEL } from "./helpContent";
import TechnicalSupportModal from "../../components/help/TechnicalSupportModal";

const C = {
  brand: "#CD166E",
  brandDark: "#730042",
  brandLight: "rgba(205,22,110,0.08)",
};

const TICKET_ROUTE = {
  superadmin: "/superadmin-complaints",
  admin: "/admin-complaints",
  manager: "/manager-complaints",
  employee: "/employee-complaints",
};

export default function HelpCenter() {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const role = auth?.role || "employee";

  const [query, setQuery] = useState("");
  const [showSupport, setShowSupport] = useState(false);

  // Only sections/articles relevant to this role ever show up.
  const visibleSections = useMemo(() => {
    return helpSections
      .map((section) => ({
        ...section,
        articles: section.articles.filter((a) => a.roles.includes(role)),
      }))
      .filter((section) => section.articles.length > 0);
  }, [role]);

  const [activeId, setActiveId] = useState(() => {
    const first = visibleSections[0]?.articles[0];
    return first ? `${visibleSections[0].id}/${first.id}` : null;
  });

  const flatArticles = useMemo(
    () =>
      visibleSections.flatMap((section) =>
        section.articles.map((article) => ({
          sectionId: section.id,
          sectionTitle: section.title,
          sectionIcon: section.icon,
          ...article,
        }))
      ),
    [visibleSections]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return flatArticles.filter((a) => {
      const haystack = [
        a.title,
        a.summary,
        ...a.body.flatMap((b) => [b.heading, ...(b.paragraphs || []), ...(b.steps || [])]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, flatArticles]);

  const activeArticle = useMemo(() => {
    if (!activeId) return null;
    const [, articleId] = activeId.split("/");
    return flatArticles.find((a) => a.id === articleId) || null;
  }, [activeId, flatArticles]);

  const selectArticle = (sectionId, articleId) => {
    setActiveId(`${sectionId}/${articleId}`);
    setQuery("");
  };

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <FaBook style={{ color: C.brandDark }} />
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Help &amp; Support</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              A complete guide to using TorchX Talent, tailored to your role —{" "}
              <span className="font-medium" style={{ color: C.brandDark }}>
                {ROLE_LABEL[role] || role}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-2">
            {TICKET_ROUTE[role] && (
              <button
                onClick={() => navigate(TICKET_ROUTE[role])}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FaTicketAlt style={{ color: C.brandDark }} />
                Raise a ticket
              </button>
            )}
            <button
              onClick={() => setShowSupport(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-white transition-colors"
              style={{ background: C.brandDark }}
            >
              <FaHeadset />
              Contact support
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles — e.g. 'apply leave', 'timesheet', 'ticket'"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": C.brand }}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-5">
          {/* Sidebar nav */}
          <nav className="md:w-72 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto py-2">
              {visibleSections.map((section) => (
                <div key={section.id} className="mb-1">
                  <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <span style={{ color: C.brandDark }}>{section.icon}</span>
                    {section.title}
                  </div>
                  {section.articles.map((article) => {
                    const isActive = activeId === `${section.id}/${article.id}`;
                    return (
                      <button
                        key={article.id}
                        onClick={() => selectArticle(section.id, article.id)}
                        className={`w-full text-left flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                          isActive
                            ? "font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        style={isActive ? { background: C.brandLight, color: C.brandDark } : undefined}
                      >
                        <span>{article.title}</span>
                        {isActive && <FaChevronRight size={10} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-8 min-h-[50vh]">
            {searchResults ? (
              <SearchResults results={searchResults} onPick={selectArticle} query={query} />
            ) : activeArticle ? (
              <Article article={activeArticle} />
            ) : (
              <p className="text-gray-400 text-sm">Nothing to show yet.</p>
            )}
          </div>
        </div>
      </div>

      {showSupport && (
        <TechnicalSupportModal role={role} onClose={() => setShowSupport(false)} />
      )}
    </div>
  );
}

function SearchResults({ results, onPick, query }) {
  if (results.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">No results for "{query}"</h2>
        <p className="text-sm text-gray-500">
          Try a different word, or use Contact support above and we'll help directly.
        </p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {results.length} result{results.length > 1 ? "s" : ""} for "{query}"
      </h2>
      <div className="flex flex-col gap-2">
        {results.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a.sectionId, a.id)}
            className="text-left p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <span style={{ color: C.brandDark }}>{a.sectionIcon}</span>
              {a.sectionTitle}
            </div>
            <div className="font-medium text-gray-800 text-sm">{a.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{a.summary}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Article({ article }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <span style={{ color: C.brandDark }}>{article.sectionIcon}</span>
        {article.sectionTitle}
      </div>
      <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">{article.title}</h2>
      <p className="text-sm text-gray-500 mb-6">{article.summary}</p>

      <div className="flex flex-col gap-6">
        {article.body.map((block, i) => (
          <div key={i}>
            {block.heading && (
              <h3 className="text-sm font-semibold mb-2" style={{ color: C.brandDark }}>
                {block.heading}
              </h3>
            )}
            {block.paragraphs?.map((p, j) => (
              <p key={j} className="text-sm text-gray-600 leading-relaxed mb-2">
                {p}
              </p>
            ))}
            {block.steps && (
              <ol className="flex flex-col gap-2 mt-2">
                {block.steps.map((step, k) => (
                  <li key={k} className="flex gap-3 text-sm text-gray-700">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full text-white text-[11px] font-semibold flex items-center justify-center mt-0.5"
                      style={{ background: C.brand }}
                    >
                      {k + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}