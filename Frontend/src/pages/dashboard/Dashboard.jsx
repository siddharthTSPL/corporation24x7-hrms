import React, { useEffect, useState, useRef } from "react";
import {
  FaUsers,
  FaClock,
  FaBell,
  FaCircle,
  FaArrowUp,
  FaMapMarkerAlt,
} from "react-icons/fa";

// ─── Colour tokens (TorchX palette) ────────────────────────────────
const CRIMSON = "#8B1A4A";
const CRIMSON_DARK = "#6B1238";
const GOLD = "#C8973A";
const BLUE_ACCENT = "#2196F3";
const GREEN_ACCENT = "#4CAF50";
const BG_GRAY = "#F3F4F6";

// ─── DATA ─────────────────────────────────────────────────────────
const ADMIN_DATA = {
  _id: "69ccdea9d2ee739f45d75f2e",
  organisation_name: "ashish",
  role: "admin",
  email: "ashishgangwar009@gmail.com",
  profile_image: "https://api.dicebear.com/7.x/croodles/svg?seed=A",
  phone: "7017415604",
};

const EMPLOYEE_GROWTH_DATA = [
  { month: "Jan", total: 120, new: 5 },
  { month: "Feb", total: 125, new: 5 },
  { month: "Mar", total: 130, new: 5 },
  { month: "Apr", total: 135, new: 5 },
  { month: "May", total: 145, new: 10 },
  { month: "Jun", total: 148, new: 3 },
  { month: "Jul", total: 155, new: 7 },
  { month: "Aug", total: 160, new: 5 },
  { month: "Sep", total: 168, new: 8 },
  { month: "Oct", total: 175, new: 7 },
  { month: "Nov", total: 180, new: 5 },
  { month: "Dec", total: 190, new: 10 },
];

// ─── Employee office locations across India ───────────────────────
const OFFICE_LOCATIONS = [
  { city: "Mumbai",    lat: 19.076,  lng: 72.877,  count: 52, dept: "Engineering" },
  { city: "Delhi",     lat: 28.6139, lng: 77.2090, count: 44, dept: "Operations"  },
  { city: "Bangalore", lat: 12.9716, lng: 77.5946, count: 38, dept: "Product"     },
  { city: "Hyderabad", lat: 17.385,  lng: 78.4867, count: 21, dept: "Sales"       },
  { city: "Chennai",   lat: 13.0827, lng: 80.2707, count: 18, dept: "Support"     },
  { city: "Pune",      lat: 18.5204, lng: 73.8567, count: 12, dept: "Design"      },
  { city: "Kolkata",   lat: 22.5726, lng: 88.3639, count: 5,  dept: "Finance"     },
];

// ─── StatCard ─────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon, accentColor = CRIMSON, trend }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-center mb-2 sm:mb-4">
        <p className="text-xs sm:text-sm font-semibold text-gray-500">{title}</p>
        <span className="text-base sm:text-lg" style={{ color: accentColor }}>
          {icon}
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{value}</h2>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className="text-[10px] sm:text-xs font-semibold text-green-500 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
            <FaArrowUp className="text-[8px]" /> {trend}
          </span>
        )}
        <p className="text-[10px] sm:text-xs text-gray-400 font-medium">{sub}</p>
      </div>
    </div>
  );
}

// ─── Announcements ────────────────────────────────────────────────
function Announcements() {
  const items = [
    {
      title: "Office timings changed",
      priority: "high",
      body: "Please note that office timings will change from next Monday onwards due to summer schedule.",
      time: "2 days ago",
      tag: "all",
      dot: CRIMSON,
    },
    {
      title: "Q2 appraisal cycle begins",
      priority: "medium",
      body: "The Q2 performance appraisal cycle starts this week. Managers must complete evaluations by May 10.",
      time: "4 days ago",
      tag: "managers",
      dot: GOLD,
    },
    {
      title: "New leave policy effective May 1",
      priority: "low",
      body: "Updated leave encashment policy now supports quarterly payouts. Check HR portal for full details.",
      time: "1 week ago",
      tag: "all",
      dot: BLUE_ACCENT,
    },
  ];

  const priorityStyles = {
    high:   "bg-red-50 text-red-600",
    medium: "bg-yellow-50 text-yellow-600",
    low:    "bg-green-50 text-green-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-700">Announcements</h3>
        <span className="text-xs text-gray-400">{items.length} active</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pr-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 group">
            <div className="flex flex-col items-center pt-1.5">
              <FaCircle className="text-[8px] shrink-0" style={{ color: item.dot }} />
              {i < items.length - 1 && (
                <div className="w-px flex-1 mt-1" style={{ background: "#f3f4f6" }} />
              )}
            </div>
            <div className="pb-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs sm:text-sm font-bold text-gray-800">
                  {item.title}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${priorityStyles[item.priority]}`}
                >
                  {item.priority}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed line-clamp-2">
                {item.body}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] text-gray-400">{item.time}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold uppercase"
                  style={{ background: BLUE_ACCENT }}
                >
                  {item.tag}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EmployeeGrowthChart ──────────────────────────────────────────
function EmployeeGrowthChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.total));
  const currentMonthIndex = new Date().getMonth();
  const firstTotal = data[0].total;
  const lastTotal = data[data.length - 1].total;
  const growthPct = (((lastTotal - firstTotal) / firstTotal) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 w-full overflow-x-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 min-w-[300px] gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-700">
            Employee Statistics
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-400">Monthly breakdown</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full" style={{ background: CRIMSON_DARK }} />
            Total
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
            New
          </div>
          <span
            className="flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#dcfce7", color: "#15803d" }}
          >
            <FaArrowUp className="text-[8px]" /> +{growthPct}%
          </span>
        </div>
      </div>

      <div className="h-64 w-full min-w-[320px] flex items-end gap-[2px] sm:gap-1 md:gap-2 justify-between">
        {data.map((d, i) => {
          const heightPercent = (d.total / maxVal) * 70;
          const isCurrentMonth = i === currentMonthIndex;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end relative"
            >
              <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 bg-gray-800 text-white text-[8px] sm:text-[10px] px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap">
                {d.total} Emp · +{d.new} new
              </div>
              <div className="w-[15px] sm:w-[25px] md:w-[40px] lg:w-[60px] flex flex-col justify-end items-center h-full relative">
                <div
                  className="w-full rounded-t-[2px] sm:rounded-t-sm mb-[2px] transition-all duration-300 z-10 shadow-sm"
                  style={{
                    height: `${(d.new / maxVal) * 100}%`,
                    backgroundColor: GOLD,
                    opacity: isCurrentMonth ? 1 : 0.4,
                  }}
                />
                <div
                  className="w-full rounded-t-[2px] sm:rounded-t-sm transition-all duration-300 relative"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: isCurrentMonth ? CRIMSON_DARK : CRIMSON,
                    opacity: isCurrentMonth ? 1 : 0.2,
                  }}
                >
                  {isCurrentMonth && (
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent rounded-t-sm" />
                  )}
                </div>
              </div>
              <span
                className="text-[8px] sm:text-[10px] mt-1 sm:mt-2 font-medium uppercase transition-colors duration-300"
                style={{
                  color: isCurrentMonth ? CRIMSON_DARK : "#9CA3AF",
                  fontSize: "8px",
                }}
              >
                {d.month.substring(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EmployeeMap (Leaflet via CDN) ────────────────────────────────
function EmployeeMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // Dynamically inject Leaflet CSS + JS
  useEffect(() => {
    // Inject CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject JS
    if (window.L) {
      setLeafletReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  // Initialise map once Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    const bounds = [
      [6.0, 68.0],   // South-West India
      [37.0, 97.0]   // North-East India
    ];

    const map = L.map(mapRef.current, {
      center: [22.9734, 78.6569], // Strictly centered on India
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0 // Prevents bouncing outside bounds
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    // Custom crimson SVG marker
    const makeIcon = (count) => {
      const size = count > 40 ? 44 : count > 20 ? 36 : 28;
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="20" fill="${CRIMSON}" fill-opacity="0.15" />
          <circle cx="22" cy="22" r="13" fill="${CRIMSON}" />
          <text x="22" y="27" text-anchor="middle" font-size="11"
            font-family="DM Sans,sans-serif" font-weight="700" fill="#fff">${count}</text>
        </svg>`;
      return L.divIcon({
        html: svgIcon,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    // Add markers
    OFFICE_LOCATIONS.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng], {
        icon: makeIcon(loc.count),
      }).addTo(map);

      marker.bindTooltip(
        `<div style="font-family:DM Sans,sans-serif;font-size:12px;font-weight:600;color:#111;padding:2px 4px">
          ${loc.city} · ${loc.count} employees
        </div>`,
        { direction: "top", offset: [0, -6], className: "leaflet-tooltip-clean" }
      );

      marker.on("click", () => setSelected(loc));
    });

    mapInstanceRef.current = map;
  }, [leafletReady]);

  const totalMapped = OFFICE_LOCATIONS.reduce((s, l) => s + l.count, 0);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      {/* Card header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-50 gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-700 flex items-center gap-2">
            <FaMapMarkerAlt style={{ color: CRIMSON }} className="text-sm" />
            Employee Location Map
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
            {totalMapped} employees across {OFFICE_LOCATIONS.length} offices · India
          </p>
        </div>

        {/* Quick city pills */}
        <div className="flex flex-wrap gap-2">
          {OFFICE_LOCATIONS.slice(0, 4).map((loc) => (
            <button
              key={loc.city}
              onClick={() => {
                setSelected(loc);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([loc.lat, loc.lng], 8, {
                    animate: true,
                    duration: 1,
                  });
                }
              }}
              className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full border font-semibold transition-all duration-200"
              style={{
                borderColor:
                  selected?.city === loc.city ? CRIMSON : "#e5e7eb",
                color: selected?.city === loc.city ? CRIMSON : "#6b7280",
                background:
                  selected?.city === loc.city ? "#fdf2f8" : "#fff",
              }}
            >
              {loc.city}
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div className="relative">
        <div
          ref={mapRef}
          style={{ 
            height: "300px", // Mobile height
            width: "100%", 
            zIndex: 0 
          }}
          className="sm:h-[400px] lg:h-[450px]" // Tablet/Desktop heights
        />

        {/* Floating info panel when a city is selected */}
        {selected && (
          <div
            className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-[999] w-52 sm:w-60"
            style={{ boxShadow: "0 4px 24px rgba(139,26,74,0.12)" }}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {selected.city}
                </p>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: GOLD }}
                >
                  {selected.dept}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-300 hover:text-gray-500 text-sm font-bold leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex items-end gap-1 mt-3">
              <span
                className="text-3xl font-bold"
                style={{ color: CRIMSON }}
              >
                {selected.count}
              </span>
              <span className="text-xs text-gray-400 mb-1">employees</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Office share</span>
                <span className="font-semibold text-gray-600">
                  {((selected.count / totalMapped) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(selected.count / totalMapped) * 100}%`,
                    background: CRIMSON,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {!leafletReady && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10"
            style={{ height: "300px" }} // Match mobile height
          >
            <div className="text-center">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2"
                style={{ borderColor: `${CRIMSON} transparent ${CRIMSON} ${CRIMSON}` }}
              />
              <p className="text-xs text-gray-400">Loading map…</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom legend strip */}
      <div className="px-4 sm:px-6 py-3 border-t border-gray-50 flex flex-wrap gap-x-6 gap-y-2">
        {OFFICE_LOCATIONS.map((loc) => (
          <button
            key={loc.city}
            onClick={() => {
              setSelected(loc);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([loc.lat, loc.lng], 8, {
                  animate: true,
                  duration: 1,
                });
              }
            }}
            className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 hover:text-gray-800 transition-colors duration-150 font-medium"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: CRIMSON }}
            />
            {loc.city}
            <span className="text-gray-300">·</span>
            <span className="font-bold text-gray-700">{loc.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────
function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const [thought, setThought] = useState("");
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    setAdminData(ADMIN_DATA);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning ☀️");
    else if (hour < 17) setGreeting("Good Afternoon 🌤️");
    else setGreeting("Good Evening 🌆");
    const thoughts = [
      "Small steps every day lead to big results.",
      "Consistency is the key to growth.",
      "Teamwork makes the dream work.",
    ];
    setThought(thoughts[Math.floor(Math.random() * thoughts.length)]);
  }, []);

  const employee = adminData
    ? { name: adminData.organisation_name, id: "ENG18" }
    : { name: "Loading...", id: "..." };

  const stats = [
    {
      title: "Total Employees",
      value: "190",
      sub: "from last year",
      icon: <FaUsers />,
      accentColor: CRIMSON,
      trend: "12%",
    },
    {
      title: "Present Today",
      value: "182",
      sub: "95% Attendance",
      icon: <FaClock />,
      accentColor: GREEN_ACCENT,
    },
  ];

  return (
    <div
      className="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8 font-sans text-gray-800"
      style={{ background: BG_GRAY }}
    >
      <style>{`
        .leaflet-tooltip-clean {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12) !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          background: #fff !important;
        }
        .leaflet-tooltip-clean::before { display: none !important; }
      `}</style>

      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              {greeting}, {employee.name} · {employee.id}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 italic">
              "{thought}"
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-[#8B1A4A] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-white hover:bg-[#8c0808] shadow-sm transition-colors w-full md:w-auto">
            <FaBell />
            <span>Notifications</span>
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((item, i) => (
            <StatCard key={i} {...item} />
          ))}
        </div>

        {/* ── Announcements ── */}
        <div className="mb-6 sm:mb-8">
          <Announcements />
        </div>

        {/* ── Employee Growth Chart ── */}
        <div className="mb-6 sm:mb-8">
          <EmployeeGrowthChart data={EMPLOYEE_GROWTH_DATA} />
        </div>

        {/* ── Employee Location Map ── */}
        <div>
          <EmployeeMap />
        </div>

      </div>
    </div>
  );
}

export default React.memo(Dashboard);