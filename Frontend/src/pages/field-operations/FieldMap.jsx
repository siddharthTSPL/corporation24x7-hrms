import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BsArrowsCollapse, BsArrowsExpand } from "react-icons/bs";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Leaflet's default marker icons reference image files by a relative path
// that breaks under most bundlers (Vite included). Rebuilding the default
// icon from the package's own asset URLs keeps this dependency-free of any
// extra static-asset wiring.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_ICON = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const COLOR_ICONS = {};
function coloredIcon(color) {
  // Small inline SVG pin — avoids shipping/loading a full icon set just to
  // get a handful of marker colors (start=green, end=maroon, visit=blue,
  // checkpoint=amber, alert=red, live=brand pink).
  if (COLOR_ICONS[color]) return COLOR_ICONS[color];
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`,
  );
  const icon = L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
  COLOR_ICONS[color] = icon;
  return icon;
}

const MARKER_COLORS = {
  start: "#16a34a", // green — duty/visit started
  end: "#7A004B", // brand maroon — duty/visit ended
  checkpoint: "#f59e0b", // amber — periodic check-in
  visit: "#2563eb", // blue — a visit/activity point
  alert: "#dc2626", // red — flagged/unreliable point
  live: "#7A004B",
};

const PULSE_STYLE_ID = "field-map-live-pulse-style";
function ensurePulseStyles() {
  if (typeof document === "undefined" || document.getElementById(PULSE_STYLE_ID))
    return;
  const style = document.createElement("style");
  style.id = PULSE_STYLE_ID;
  style.textContent = `
@keyframes fieldMapPulse {
  0% { transform: scale(0.6); opacity: 0.55; }
  70% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
.field-map-live-dot { position: relative; width: 18px; height: 18px; }
.field-map-live-dot .ring {
  position: absolute; inset: 0; border-radius: 9999px;
  animation: fieldMapPulse 1.8s ease-out infinite;
}
.field-map-live-dot .core {
  position: absolute; inset: 4px; border-radius: 9999px;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
}
.field-map-photo-pin { position: relative; width: 44px; height: 52px; }
.field-map-photo-pin .thumb {
  width: 40px; height: 40px; border-radius: 9999px; overflow: hidden;
  border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  background-size: cover; background-position: center; margin: 0 auto;
}
.field-map-photo-pin .tail {
  width: 0; height: 0; margin: -2px auto 0;
  border-left: 6px solid transparent; border-right: 6px solid transparent;
  border-top: 9px solid #fff;
}
.field-map-pending-dot {
  width: 14px; height: 14px; border-radius: 9999px;
  background: repeating-conic-gradient(#f59e0b 0deg 90deg, #fff7ed 90deg 180deg);
  border: 2px dashed #b45309; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
`;
  document.head.appendChild(style);
}

function livePulseIcon(color, pulsing) {
  const key = `pulse-${color}-${pulsing ? "on" : "off"}`;
  if (COLOR_ICONS[key]) return COLOR_ICONS[key];
  ensurePulseStyles();
  const html = `
    <div class="field-map-live-dot">
      ${pulsing ? `<div class="ring" style="background:${color}"></div>` : ""}
      <div class="core" style="background:${color}"></div>
    </div>`;
  const icon = L.divIcon({
    html,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
  COLOR_ICONS[key] = icon;
  return icon;
}

function photoPinIcon(photoUrl) {
  const key = `photo-${photoUrl}`;
  if (COLOR_ICONS[key]) return COLOR_ICONS[key];
  ensurePulseStyles();
  const html = `
    <div class="field-map-photo-pin">
      <div class="thumb" style="background-image:url('${photoUrl}')"></div>
      <div class="tail"></div>
    </div>`;
  const icon = L.divIcon({
    html,
    className: "",
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -48],
  });
  COLOR_ICONS[key] = icon;
  return icon;
}

function pendingDotIcon() {
  if (COLOR_ICONS.pending) return COLOR_ICONS.pending;
  ensurePulseStyles();
  const icon = L.divIcon({
    html: `<div class="field-map-pending-dot"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
  COLOR_ICONS.pending = icon;
  return icon;
}

/**
 * A minimal Leaflet + OpenStreetMap map. No API key, no billing, no
 * "premium map infrastructure" — exactly the "reliable basic map solution"
 * called for in the Field Work spec.
 *
 * @param {Array<{latitude:number, longitude:number, label?:string, type?:string, accuracy?:number, timestamp?:string}>} markers
 * @param {Array<{coords: Array<[number, number]>, dashed?: boolean}>} [path] - polyline segments; `dashed: true` renders as an unreliable/unmatched stretch (grey, dashed) instead of a confident road line
 * @param {number} [height=320]
 * @param {boolean} [fitAll=false] - when true, ignore single-point zoom and fit every marker into view
 * @param {boolean} [big=false] - when true, render at ~70vh by default instead of the fixed height
 */
export default function FieldMap({ markers = [], path = [], height = 320, fitAll = false, big = false, showPath = true, expanded: expandedProp = false, onExpandedChange, onPathToggle }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [expanded, setExpanded] = useState(expandedProp);
  const [pathVisible, setPathVisible] = useState(true);
  const defaultHeight = big ? "70vh" : height;

  useEffect(() => {
    if (!expandedProp) setExpanded(false);
  }, [expandedProp]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([20.5937, 78.9629], 5); // sensible India-wide default until points arrive
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const validMarkers = markers.filter(
      (m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude),
    );

    if (pathVisible && showPath && path.length > 0) {
      path.forEach((segment) => {
        // Accepts either the new { coords, dashed } shape or a bare
        // [[lat,lng], ...] array for backward compatibility with any other
        // caller still passing plain polylines.
        const coords = Array.isArray(segment) ? segment : segment.coords;
        const dashed = Array.isArray(segment) ? false : segment.dashed;
        if (coords && coords.length > 1) {
          L.polyline(coords, {
            color: dashed ? "#94a3b8" : "#7A004B",
            weight: 3,
            opacity: dashed ? 0.6 : 0.7,
            dashArray: dashed ? "6 8" : null,
          }).addTo(layer);
        }
      });
    }

    validMarkers.forEach((marker) => {
      let icon;
      if (marker.type === "photo" && marker.photoUrl) {
        icon = photoPinIcon(marker.photoUrl);
      } else if (marker.type === "pending") {
        icon = pendingDotIcon();
      } else if (marker.type === "live") {
        const pulsing = marker.presence !== "offline";
        const color = marker.presence === "offline" ? "#94a3b8" : MARKER_COLORS.live;
        icon = livePulseIcon(color, pulsing);
      } else {
        icon = marker.type
          ? coloredIcon(MARKER_COLORS[marker.type] || MARKER_COLORS.visit)
          : DEFAULT_ICON;
      }
      const m = L.marker([marker.latitude, marker.longitude], { icon }).addTo(
        layer,
      );
      const accuracyLine = Number.isFinite(marker.accuracy)
        ? `Accuracy: ${Math.round(marker.accuracy)}m<br/>`
        : "";
      const timeLine = marker.timestamp
        ? new Date(marker.timestamp).toLocaleString()
        : "";
      const photoLine =
        marker.type === "photo" && marker.photoUrl
          ? `<img src="${marker.photoUrl}" style="width:160px;border-radius:8px;margin-top:4px;display:block"/>`
          : "";
      const pendingLine =
        marker.type === "pending"
          ? "Saved on device — will sync when back online<br/>"
          : "";
      if (marker.label || accuracyLine || timeLine || photoLine || pendingLine) {
        m.bindPopup(
          `<div style="font-size:13px"><strong>${marker.label || ""}</strong><br/>${pendingLine}${accuracyLine}${timeLine}${photoLine}</div>`,
        );
      }
    });

    const allPoints = [
      ...validMarkers.map((m) => [m.latitude, m.longitude]),
      ...path.flatMap((segment) => (Array.isArray(segment) ? segment : segment.coords || [])),
    ];
    if (allPoints.length === 1) {
      map.setView(allPoints[0], 15);
    } else if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), {
        padding: [30, 30],
        maxZoom: fitAll ? 16 : 16,
      });
    }
  }, [markers, path, fitAll, pathVisible, showPath]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandedChange?.(next);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => mapRef.current?.invalidateSize?.()),
    );
  };
  const togglePath = () => {
    const next = !pathVisible;
    setPathVisible(next);
    onPathToggle?.(next);
  };

  return (
    <div
      style={{
        position: expanded ? "fixed" : "relative",
        inset: expanded ? 0 : "auto",
        height: expanded ? "100vh" : defaultHeight,
        width: expanded ? "100vw" : "100%",
        zIndex: expanded ? 90 : 0,
        background: expanded ? "#0f172a" : "transparent",
        display: "flex",
        alignItems: "stretch",
      }}
      className={expanded ? "" : "rounded-2xl border border-slate-200 relative"}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 0,
          overflow: "hidden",
          background: expanded ? "#e2e8f0" : "transparent",
        }}
      >
        <button
          type="button"
          onClick={toggle}
          title={expanded ? "Exit full view" : "Full view"}
          className="absolute right-2 top-2 z-[5] inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-2.5 text-xs font-bold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
        >
          {expanded ? <BsArrowsCollapse size={14} /> : <BsArrowsExpand size={14} />}
          {expanded ? "Exit" : "Full view"}
        </button>
        {path.some((segment) => (Array.isArray(segment) ? segment : segment.coords || []).length > 1) && (
          <button
            type="button"
            onClick={togglePath}
            title={pathVisible ? "Hide route line" : "Show route line"}
            className="absolute right-2 top-11 z-[5] inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-2.5 text-xs font-bold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
          >
            {pathVisible ? <FiEyeOff size={13} /> : <FiEye size={13} />}
            {pathVisible ? "Hide line" : "Show line"}
          </button>
        )}
      </div>
    </div>
  );
}