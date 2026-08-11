import React from "react";
import { FaBoxOpen, FaLaptop, FaDesktop, FaMobileAlt, FaHeadphones, FaKeyboard, FaMouse, FaTabletAlt, FaTv } from "react-icons/fa";

const TYPE_ICON = {
  laptop: FaLaptop,
  desktop: FaDesktop,
  monitor: FaTv,
  keyboard: FaKeyboard,
  mouse: FaMouse,
  headset: FaHeadphones,
  mobile: FaMobileAlt,
  tablet: FaTabletAlt,
};

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Local error boundary — if anything inside the widget throws (bad hook,
// unexpected API shape, etc.) this stops it from taking down the whole
// Dashboard/Settings page around it, and shows the real error message so
// it's easy to see what actually broke.
class AssetsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("MyAssetsWidget crashed:", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-red-100">
            <span className="text-[12px] font-semibold font-sans text-red-600">My Assets — couldn't load</span>
          </div>
          <div className="px-4 sm:px-5 py-4 text-[11px] text-red-500 font-sans break-words">
            {String(this.state.error?.message || this.state.error)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MyAssetsWidgetInner({ useMyAssets, title = "My Assets", accent = "#730042" }) {
  if (typeof useMyAssets !== "function") {
    throw new Error(
      "MyAssetsWidget was not given a valid `useMyAssets` hook (check the import in the page that renders it)."
    );
  }

  const result = useMyAssets() || {};
  const { data, isLoading, isError } = result;

  // Defend against the API returning something other than
  // { assets: [...], total_units } — e.g. an error page, null, etc.
  const rawAssets = data && typeof data === "object" ? data.assets : null;
  const assets = Array.isArray(rawAssets) ? rawAssets : [];
  const totalUnits =
    typeof data?.total_units === "number"
      ? data.total_units
      : assets.reduce((sum, a) => sum + (Number(a?.quantity) || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#ede5e0]">
        <span className="text-[12px] font-semibold font-sans flex items-center gap-2" style={{ color: "#2a1a16" }}>
          <FaBoxOpen size={13} style={{ color: accent }} /> {title}
        </span>
        {!isLoading && assets.length > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: accent, background: `${accent}14` }}
          >
            {totalUnits} unit{totalUnits === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="px-4 sm:px-5 py-6 flex flex-col items-center gap-2 text-[#b0948a]">
          <span className="text-xl animate-pulse">⏳</span>
          <p className="text-[11px] font-sans">Loading your assets…</p>
        </div>
      ) : isError ? (
        <div className="px-4 sm:px-5 py-6 text-center text-[11px] text-[#b0948a] font-sans">
          Couldn't load your assets right now.
        </div>
      ) : assets.length === 0 ? (
        <div className="px-4 sm:px-5 py-8 flex flex-col items-center gap-2 text-center">
          <FaBoxOpen size={24} className="text-[#ede5e0]" />
          <p className="text-[11.5px] text-[#b0948a] font-sans">No assets assigned to you yet</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f4ede9]">
          {assets.map((a, i) => {
            if (!a || typeof a !== "object") return null;
            const Icon = TYPE_ICON[a.asset_type] || FaBoxOpen;
            const qty = Number(a.quantity) || 0;
            return (
              <div key={a.assignment_id ?? a._id ?? i} className="px-4 sm:px-5 py-2.5 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}12`, color: accent }}
                >
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#2a1a16] font-sans truncate">
                    {a.asset_name || "Unnamed asset"} {qty > 1 ? `× ${qty}` : ""}
                  </p>
                  <p className="text-[10.5px] text-[#b0948a] font-sans">
                    Assigned on <span className="font-medium text-[#7a5568]">{fmtDate(a.assigned_date)}</span>
                    {a.brand ? ` · ${a.brand}` : ""}
                  </p>
                </div>
                {a.asset_code && (
                  <span className="text-[9.5px] font-mono text-[#c499b4] whitespace-nowrap">{a.asset_code}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Compact "My Assets" widget — shows every asset currently assigned to the
 * logged-in person (asset name, quantity, assigned date). Works for any role
 * (Employee, Manager, Admin) — just pass in the matching `useMyAssets` hook
 * (useGetMyAssetsEmployee / useGetMyAssetsManager / useGetMyAssetsAdmin).
 *
 * Wrapped in a local error boundary so a bad API response or a wiring
 * mistake only breaks this card, not the whole Dashboard/Settings page.
 */
export default function MyAssetsWidget(props) {
  return (
    <AssetsErrorBoundary>
      <MyAssetsWidgetInner {...props} />
    </AssetsErrorBoundary>
  );
}
