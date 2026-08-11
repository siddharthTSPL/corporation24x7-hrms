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
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Compact "My Assets" widget — shows every asset currently assigned to the
 * logged-in person (asset name, quantity, assigned date). Works for any role
 * (Employee, Manager, Admin) — just pass in the matching `useMyAssets` hook
 * (useGetMyAssetsEmployee / useGetMyAssetsManager / useGetMyAssetsAdmin).
 *
 * Used on both the Dashboard and Settings pages, so it's fully self-styled
 * and doesn't depend on any page-local card/skeleton components.
 */
export default function MyAssetsWidget({ useMyAssets, title = "My Assets", accent = "#730042" }) {
  const { data, isLoading, isError } = useMyAssets();
  const assets = data?.assets ?? [];

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
            {data.total_units} unit{data.total_units === 1 ? "" : "s"}
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
          {assets.map((a) => {
            const Icon = TYPE_ICON[a.asset_type] || FaBoxOpen;
            return (
              <div key={a.assignment_id} className="px-4 sm:px-5 py-2.5 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}12`, color: accent }}
                >
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#2a1a16] font-sans truncate">
                    {a.asset_name} {a.quantity > 1 ? `× ${a.quantity}` : ""}
                  </p>
                  <p className="text-[10.5px] text-[#b0948a] font-sans">
                    Assigned on <span className="font-medium text-[#7a5568]">{fmtDate(a.assigned_date)}</span>
                    {a.brand ? ` · ${a.brand}` : ""}
                  </p>
                </div>
                <span className="text-[9.5px] font-mono text-[#c499b4] whitespace-nowrap">{a.asset_code}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}