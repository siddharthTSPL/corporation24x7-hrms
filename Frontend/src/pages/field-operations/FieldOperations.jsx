import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiActivity,
  FiAlertTriangle,
  FiCamera,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiMapPin,
  FiNavigation,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiSettings,
  FiShare2,
  FiUpload,
  FiUserPlus,
  FiUsers,
  FiWifiOff,
  FiX,
  FiXCircle,
  FiTrash2,
} from "react-icons/fi";
import { FaAngleDown } from "react-icons/fa";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { createRoadSnapCache, snapPathToRoadsCached } from "./roadSnap.utils";
import {
  sendFieldLocation,
  exportFieldActivitiesCsvUrl,
  exportMyVisitsCsvUrl,
  downloadBulkAssignTemplateUrl,
  uploadBulkAssignFile,
} from "../../auth/api/fieldOperations/fieldOperations.api";
import {
  useMyFieldDuty,
  useFieldOverview,
  useFieldTeams,
  useFieldTeamOptions,
  useFieldSettings,
  useFieldRoute,
  useCreateFieldTeam,
  useUpdatedFieldTeam,
  useDeleteFieldTeam,
  useStartFieldDuty,
  useUpdateFieldDutyStatus,
  useCheckoutFieldDuty,
  useTakeOverDuty,
  useSubmitFieldCheckIn,
  useStartFieldVisit,
  useEndFieldVisit,
  useUploadVisitPhoto,
  useUpdateFieldSettings,
  useFieldAssignments,
  useCreateIndividualFieldAssignment,
  useRemoveIndividualFieldAssignment,
  useMyAssignedActivities,
  useMyFieldVisits,
  useAllFieldVisits,
  useAssignFieldActivity,
  useReassignFieldActivity,
  useCancelFieldActivity,
  useFieldAuditLog,
} from "../../auth/server-state/fieldOperations/fieldOperations.hook";
import {
  pendingFieldEvents,
  queueFieldEvent,
  removeFieldEvent,
} from "./fieldOfflineQueue";
import FieldMap from "./FieldMap";

const newId = () =>
  window.crypto?.randomUUID?.() ||
  `field_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const MIN_VISIT_MINUTES = 20;
const formatTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
const formatDuration = (totalSeconds) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
};
const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return "—";
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
};
const PRESENCE_LIVE_MS = 90 * 1000;
const PRESENCE_RECENT_MS = 5 * 60 * 1000;
function getPresence(session, now = Date.now()) {
  if (!session || session.status === "checked_out")
    return { state: "offline", label: "Checked out" };
  const lastSeen = session.lastSeenAt
    ? new Date(session.lastSeenAt).getTime()
    : null;
  if (session.status === "offline" || !lastSeen)
    return { state: "offline", label: "Offline" };
  const diff = now - lastSeen;
  if (diff <= PRESENCE_LIVE_MS) return { state: "online", label: "Live" };
  if (diff <= PRESENCE_RECENT_MS)
    return {
      state: "recent",
      label: `Last seen ${Math.max(1, Math.round(diff / 60000))}m ago`,
    };
  return {
    state: "offline",
    label: `Last seen ${formatTime(session.lastSeenAt)}`,
  };
}
function PresenceDot({ session, showLabel = true }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const presence = getPresence(session, now);
  const dotColor =
    presence.state === "online"
      ? "#16a34a"
      : presence.state === "recent"
        ? "#f59e0b"
        : "#94a3b8";
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="relative inline-flex h-2 w-2 shrink-0 sm:h-2.5 sm:w-2.5">
        {presence.state === "online" && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
          style={{ backgroundColor: dotColor }}
        />
      </span>
      {showLabel && (
        <span className="truncate text-[9px] font-bold text-slate-500 sm:text-[11px]">
          {presence.label}
        </span>
      )}
    </span>
  );
}
const ACTIVITY_TYPES = [
  "customer_visit",
  "meeting",
  "service",
  "survey",
  "collection",
  "delivery",
  "installation",
  "follow_up",
  "other",
];
const titleize = (value) => String(value || "").replaceAll("_", " ");
const personName = (person) =>
  `${person?.f_name || ""} ${person?.l_name || ""}`.trim() || "Unassigned";
const personInitials = (person) =>
  personName(person)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const formatVisitDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Date not recorded";
function GeofenceResult({ result, label }) {
  if (!result || typeof result.withinFence !== "boolean") return null;
  return (
    <p
      className={`mt-1.5 text-[10px] font-bold sm:mt-2 sm:text-xs ${result.withinFence ? "text-emerald-700" : "text-rose-700"}`}
    >
      {label}:{" "}
      {result.withinFence ? "within allowed area" : "outside allowed area"}
      {Number.isFinite(result.distanceMeters)
        ? ` (${formatDistance(result.distanceMeters)})`
        : ""}
    </p>
  );
}
const pointFromPosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  speedMps: position.coords.speed,
  heading: position.coords.heading,
  capturedAt: new Date(position.timestamp).toISOString(),
  networkStatus: navigator.onLine ? "online" : "offline",
});

function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("This browser does not support GPS location."));
    let best = null;
    let settled = false;
    const watchIdRef = { current: null };
    const clear = () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (settled) return;
        const { accuracy } = pos.coords;
        if (!best || accuracy < best.accuracy) best = pos;
        if (accuracy <= 30) {
          settled = true;
          clear();
          resolve(best);
        }
      },
      () => {
        if (settled) return;
        clear();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    setTimeout(() => {
      if (settled) return;
      settled = true;
      clear();
      if (best) return resolve(best);
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    }, 6000);
  });
}

async function safeCurrentPosition() {
  try {
    const pos = await currentPosition();
    return pointFromPosition(pos);
  } catch {
    return null;
  }
}

function StatusPill({ status }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    offline: "bg-slate-200 text-slate-600",
    checked_out: "bg-slate-100 text-slate-600",
    moving: "bg-emerald-100 text-emerald-700",
    slow_moving: "bg-amber-100 text-amber-700",
    stationary: "bg-slate-200 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    follow_up_required: "bg-violet-100 text-violet-700",
    skipped: "bg-rose-100 text-rose-700",
    pending: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize sm:px-2.5 sm:py-1 sm:text-[11px] ${styles[status] || styles.offline}`}
    >
      {String(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}

function ShareOnWhatsAppButton({ session }) {
  const location = session?.lastLocation || session?.startLocation;
  if (!location) return null;
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const name =
    `${session.employee?.f_name || ""} ${session.employee?.l_name || ""}`.trim();
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
  const text = encodeURIComponent(
    `${name || "Field employee"}'s location (${formatTime(location.capturedAt)}): ${mapsUrl}`,
  );
  return (
    <a
      href={`https://wa.me/?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-[10px] font-bold text-emerald-700 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
      title="Share on WhatsApp"
    >
      <FiShare2 size={11} />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}

function LiveMap({ session, big = false, markers: extraMarkers = [] }) {
  const location = session?.lastLocation || session?.startLocation;
  const allMarkers = [];
  if (location) {
    const lat = Number(location.latitude);
    const lon = Number(location.longitude);
    const accuracy = Number(location.accuracy);
    allMarkers.push({
      latitude: lat,
      longitude: lon,
      type: "live",
      presence: getPresence(session).state,
      label:
        session?.employee?.f_name || session?.employee?.l_name
          ? `${session.employee.f_name || ""} ${session.employee.l_name || ""}`.trim()
          : "Current location",
      accuracy,
      timestamp: location.capturedAt,
    });
  }
  allMarkers.push(...extraMarkers);
  if (!allMarkers.length)
    return (
      <div className="grid min-h-[140px] place-items-center rounded-lg bg-slate-100 p-2 text-center text-[11px] text-slate-500 sm:min-h-64 sm:rounded-2xl sm:p-4 sm:text-sm">
        No live GPS point yet
      </div>
    );
  return (
    <div>
      <FieldMap big={big} height={big ? 180 : 220} markers={allMarkers} />
      {location && <AccuracyBadge accuracy={Number(location.accuracy)} />}
    </div>
  );
}

function AccuracyBadge({ accuracy }) {
  if (!Number.isFinite(accuracy)) return null;
  const tone =
    accuracy <= 50
      ? "text-emerald-600"
      : accuracy <= 200
        ? "text-amber-600"
        : accuracy <= 500
          ? "text-orange-600"
          : "text-rose-600";
  const message =
    accuracy <= 50
      ? `Location accuracy: ${Math.round(accuracy)}m`
      : accuracy <= 500
        ? `Location accuracy is low: ${Math.round(accuracy)}m`
        : `Location accuracy is unreliable: ${Math.round(accuracy)}m. Please enable device GPS and retry.`;
  return (
    <p
      className={`mt-1.5 flex items-start gap-1 text-[10px] font-semibold sm:mt-2 sm:items-center sm:gap-1.5 sm:text-xs ${tone}`}
    >
      {accuracy > 200 && <FiAlertTriangle className="mt-0.5 shrink-0 sm:mt-0" />}
      <span>{message}</span>
    </p>
  );
}

function LiveDuration({ startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!startedAt) return "—";
  return formatDuration(
    Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)),
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";
  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  return (
    <div className="relative w-full min-w-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[36px] w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] outline-none transition hover:border-slate-300 focus:border-[#7A004B] focus:ring-2 focus:ring-[#7A004B]/10 sm:min-h-[38px] sm:px-2.5 sm:text-xs"
      >
        <span
          className={`truncate ${selectedLabel ? "text-slate-900" : "text-slate-400"}`}
        >
          {selectedLabel || placeholder}
        </span>
        <FaAngleDown
          size={11}
          className={`flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 flex max-h-52 w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex-shrink-0 border-b border-slate-100 p-1.5 sm:p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#7A004B] sm:text-[11px]"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[10px] text-slate-400 sm:text-[11px]">
                No results
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full px-3 py-1.5 text-left text-[10px] transition-colors hover:bg-[#fdf5f9] sm:text-[11px] ${o.value === value ? "bg-[#fdf0f6] font-semibold text-[#7A004B]" : "text-slate-900"}`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteTrail({
  employeeId,
  date,
  showPicker,
  employees,
  selectedEmployeeId,
  onEmployeeChange,
  onDateChange,
  big = false,
}) {
  const { data, isLoading } = useFieldRoute(employeeId, date, undefined, !date);
  const gpsPoints = data?.points || [];
  const points = data?.routePoints || gpsPoints;
  const sessions = data?.sessions || [];
  const summary = data?.summary;
  const dayVisits = data?.visits || [];

  const MIN_MOVE_METERS = 25;
  const MAX_USABLE_ACCURACY_METERS = 75;
  const SPIKE_NEIGHBOR_METERS = 150;
  const SPIKE_JUMP_METERS = 250;
  const metersBetween = (a, b) => {
    const dLat = (b.lat - a.lat) * 111320;
    const dLon = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
    return Math.hypot(dLat, dLon);
  };
  const removeSpikes = (segment) => {
    if (segment.length < 3) return segment;
    const out = [segment[0]];
    for (let i = 1; i < segment.length - 1; i++) {
      const prev = out[out.length - 1];
      const curr = segment[i];
      const next = segment[i + 1];
      const prevNext = metersBetween(prev, next);
      const prevCurr = metersBetween(prev, curr);
      const currNext = metersBetween(curr, next);
      const isSpike =
        prevNext <= SPIKE_NEIGHBOR_METERS &&
        (prevCurr >= SPIKE_JUMP_METERS || currNext >= SPIKE_JUMP_METERS);
      if (!isSpike) out.push(curr);
    }
    out.push(segment[segment.length - 1]);
    return out;
  };
  const rawPath = useMemo(() => {
    const trusted = points.filter(
      (p) =>
        !p.isMocked &&
        (!Number.isFinite(p.accuracy) ||
          p.accuracy <= MAX_USABLE_ACCURACY_METERS),
    );
    const segments = [];
    let currentSegment = [];
    for (let i = 0; i < trusted.length; i++) {
      if (
        i > 0 &&
        trusted[i].crossSessionGapFlag &&
        trusted[i - 1].crossSessionGapFlag
      ) {
        if (currentSegment.length > 0) segments.push(currentSegment);
        currentSegment = [];
      }
      currentSegment.push({
        lat: trusted[i].location.coordinates[1],
        lng: trusted[i].location.coordinates[0],
        accuracy: trusted[i].accuracy,
      });
    }
    if (currentSegment.length > 0) segments.push(currentSegment);
    const simplifiedSegments = segments.map((segment) => {
      const despiked = removeSpikes(segment);
      if (despiked.length < 2) return despiked.map((p) => [p.lat, p.lng]);
      const simplified = [despiked[0]];
      for (let i = 1; i < despiked.length; i++) {
        const a = simplified[simplified.length - 1];
        const b = despiked[i];
        const dLat = (b.lat - a.lat) * 111320;
        const dLon =
          (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
        const requiredMoveMeters = Math.max(
          MIN_MOVE_METERS,
          (a.accuracy || 0) + (b.accuracy || 0),
        );
        if (Math.hypot(dLat, dLon) >= requiredMoveMeters) simplified.push(b);
      }
      return simplified.map((p) => [p.lat, p.lng]);
    });
    return simplifiedSegments.filter((s) => s.length >= 2);
  }, [points]);

  const [roadPath, setRoadPath] = useState(null);
  const [snappingRoads, setSnappingRoads] = useState(false);
  const roadSnapCacheRef = useRef(createRoadSnapCache());
  const roadSnapKeyRef = useRef(null);
  useEffect(() => {
    const cacheKey = `${employeeId || ""}:${date || "today"}`;
    if (roadSnapKeyRef.current !== cacheKey) {
      roadSnapCacheRef.current = createRoadSnapCache();
      roadSnapKeyRef.current = cacheKey;
    }
    if (!rawPath.length) {
      setRoadPath([]);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setSnappingRoads(true);
    snapPathToRoadsCached(rawPath, roadSnapCacheRef.current, controller.signal)
      .then((snapped) => {
        if (!cancelled) setRoadPath(snapped);
      })
      .catch((error) => {
        if (!cancelled && error?.name !== "AbortError") setRoadPath(null);
      })
      .finally(() => {
        if (!cancelled) setSnappingRoads(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rawPath, employeeId, date]);
  const path = roadPath || rawPath.map((coords) => ({ coords, dashed: true }));
  const markers = useMemo(() => {
    const list = [];
    sessions.forEach((session, idx) => {
      if (session.startLocation)
        list.push({
          latitude: session.startLocation.latitude,
          longitude: session.startLocation.longitude,
          accuracy: session.startLocation.accuracy,
          timestamp: session.startedAt,
          type: "start",
          label: `Duty started${sessions.length > 1 ? ` (session ${idx + 1})` : ""}`,
        });
      if (session.endLocation)
        list.push({
          latitude: session.endLocation.latitude,
          longitude: session.endLocation.longitude,
          accuracy: session.endLocation.accuracy,
          timestamp: session.endedAt,
          type: "end",
          label: "Checked out",
        });
    });
    points.forEach((p) => {
      if (p.source === "check_in")
        list.push({
          latitude: p.location.coordinates[1],
          longitude: p.location.coordinates[0],
          accuracy: p.accuracy,
          timestamp: p.deviceTimestamp,
          type: "checkpoint",
          label: "Manual check-in",
        });
      if (p.isMocked)
        list.push({
          latitude: p.location.coordinates[1],
          longitude: p.location.coordinates[0],
          accuracy: p.accuracy,
          timestamp: p.deviceTimestamp,
          type: "alert",
          label: "Unreliable point (implausible jump) — not trusted",
        });
    });
    dayVisits.forEach((visit) => {
      const fallbackLoc = visit.endLocation || visit.startLocation;
      if (!(visit.attachments || []).length) return;
      const locationsByUrl = new Map(
        (visit.attachmentLocations || []).map((entry) => [entry.url, entry]),
      );
      visit.attachments.forEach((url, idx) => {
        const own = locationsByUrl.get(url);
        const loc =
          own && Number.isFinite(own.latitude) && Number.isFinite(own.longitude)
            ? own
            : fallbackLoc;
        if (!loc) return;
        list.push({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: own?.accuracy,
          type: "photo",
          photoUrl: url,
          label: `${visit.customerName || titleize(visit.activityType)}${visit.attachments.length > 1 ? ` (${idx + 1}/${visit.attachments.length})` : ""}`,
          timestamp: own?.capturedAt || visit.endedAt || visit.startedAt,
        });
      });
    });
    return list;
  }, [points, sessions, dayVisits]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3 md:p-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <h3 className="min-w-0 text-xs font-bold text-slate-900 sm:text-sm md:text-base">
          Today's route
          {snappingRoads && (
            <span className="ml-1.5 text-[9px] font-medium text-slate-400 sm:ml-2 sm:text-[10px] md:text-xs">
              Matching…
            </span>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {showPicker && employees && onEmployeeChange && (
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-44">
              <SearchableSelect
                value={selectedEmployeeId || ""}
                onChange={onEmployeeChange}
                options={employees.map((emp) => ({
                  value: emp._id,
                  label: `${emp.f_name} ${emp.l_name}`,
                }))}
                placeholder="Select employee…"
              />
            </div>
          )}
          {onDateChange && (
            <input
              type="date"
              value={date || ""}
              onChange={(e) => onDateChange(e.target.value)}
              className="min-w-0 rounded-lg border px-1.5 py-1 text-[10px] sm:px-2 sm:text-xs"
            />
          )}
          {points.length > 0 && (
            <span className="text-[9px] text-slate-500 sm:text-[10px] md:text-xs">
              {points.length} pt{points.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
      {!employeeId ? (
        <div className="mt-2 grid h-32 place-items-center rounded-lg bg-slate-50 p-2 text-center text-[10px] text-slate-500 sm:mt-3 sm:h-48 sm:rounded-xl sm:p-4 sm:text-sm">
          No field employee selected — choose one above
        </div>
      ) : isLoading ? (
        <div className="mt-2 grid h-32 place-items-center text-[10px] text-slate-400 sm:mt-3 sm:h-48 sm:text-sm">
          Loading route…
        </div>
      ) : !points.length ? (
        <div className="mt-2 grid h-32 place-items-center rounded-lg bg-slate-50 p-2 text-center text-[10px] text-slate-500 sm:mt-3 sm:h-48 sm:rounded-xl sm:p-4 sm:text-sm">
          No route recorded for this day yet
        </div>
      ) : (
        <>
          <div className="mt-2 sm:mt-3">
            <FieldMap
              markers={markers}
              path={path}
              height={big ? 180 : 220}
              fitAll
              big={big}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 sm:mt-3 sm:gap-2">
            <div className="min-w-0 rounded-md bg-slate-50 p-1.5 text-center sm:rounded-lg sm:p-2">
              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                Distance
              </p>
              <p className="truncate text-[11px] font-bold text-slate-900 sm:text-sm">
                {formatDistance(summary?.totalDistanceMeters)}
              </p>
            </div>
            <div className="min-w-0 rounded-md bg-slate-50 p-1.5 text-center sm:rounded-lg sm:p-2">
              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                Duration
              </p>
              <p className="truncate text-[11px] font-bold text-slate-900 sm:text-sm">
                {formatDuration(summary?.totalDurationSeconds)}
              </p>
            </div>
            <div className="min-w-0 rounded-md bg-slate-50 p-1.5 text-center sm:rounded-lg sm:p-2">
              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                Geofence
              </p>
              <p className="truncate text-[11px] font-bold text-slate-900 sm:text-sm">
                {summary?.geofenceExitCount || 0}
              </p>
            </div>
          </div>
          {summary?.mockedPoints > 0 && (
            <p className="mt-2 flex items-start gap-1 text-[10px] text-rose-600 sm:mt-3 sm:gap-1.5 sm:text-xs">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>
                {summary.mockedPoints} GPS point
                {summary.mockedPoints === 1 ? "" : "s"} looked unreliable.
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function FaceCheckModal({
  onCaptured,
  onClose,
  heading = "Verify before field duty",
  subtext = "The live camera preview must be visible. Keep your face centred, look at the camera, and use good lighting before verifying.",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      })
      .catch(() =>
        setError("Camera permission is needed to verify your face."),
      );
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 480;
    canvas.height = 480;
    canvas
      .getContext("2d")
      .drawImage(
        video,
        (video.videoWidth - size) / 2,
        (video.videoHeight - size) / 2,
        size,
        size,
        0,
        0,
        480,
        480,
      );
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onCaptured(canvas.toDataURL("image/jpeg", 0.85));
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/60 p-2 sm:p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-3 shadow-2xl sm:p-5">
        <div className="flex items-start gap-2 sm:gap-3">
          <span className="shrink-0 rounded-full bg-[#fdf0f6] p-1.5 text-[#7A004B] sm:p-2">
            <FiCamera size={14} className="sm:hidden" />
            <FiCamera size={16} className="hidden sm:block" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
              {heading}
            </h2>
            <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
              {subtext}
            </p>
          </div>
        </div>
        <div className="mt-3 aspect-square overflow-hidden rounded-xl bg-slate-900 sm:mt-4">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full -scale-x-100 object-cover"
          />
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-slate-600 sm:text-xs">
          Good lighting · face inside frame · look at the camera
        </p>
        {error && (
          <p className="mt-2 text-xs text-rose-600 sm:text-sm">{error}</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-lg border px-2 py-2 text-xs font-bold sm:px-3 sm:py-2.5 sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={capture}
            className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-[#7A004B] px-2 py-2 text-xs font-bold text-white disabled:opacity-50 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
          >
            <FiCamera size={13} /> Verify
          </button>
        </div>
      </div>
    </div>
  );
}

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function PhotoCaptureModal({
  onCaptured,
  onClose,
  heading = "Take a photo",
  subtext = "Live camera only — gallery photos aren't accepted as visit proof.",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      })
      .catch(() => setError("Camera permission is needed to take this photo."));
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onCaptured(
      dataUrlToFile(
        canvas.toDataURL("image/jpeg", 0.85),
        `visit-${Date.now()}.jpg`,
      ),
    );
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/60 p-2 sm:p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-3 shadow-2xl sm:p-5">
        <div className="flex items-start gap-2 sm:gap-3">
          <span className="shrink-0 rounded-full bg-blue-50 p-1.5 text-blue-600 sm:p-2">
            <FiCamera size={14} className="sm:hidden" />
            <FiCamera size={16} className="hidden sm:block" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
              {heading}
            </h2>
            <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
              {subtext}
            </p>
          </div>
        </div>
        <div className="mt-3 aspect-square overflow-hidden rounded-xl bg-slate-900 sm:mt-4">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        </div>
        {error && (
          <p className="mt-2 text-xs text-rose-600 sm:text-sm">{error}</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-lg border px-2 py-2 text-xs font-bold sm:px-3 sm:py-2.5 sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={capture}
            className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 py-2 text-xs font-bold text-white disabled:opacity-50 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
          >
            <FiCamera size={13} /> Capture
          </button>
        </div>
      </div>
    </div>
  );
}

function VisitPhotoUploader({ visit, onUploaded }) {
  const [showCamera, setShowCamera] = useState(false);
  const uploadPhoto = useUploadVisitPhoto();
  const attachments = visit?.attachments || [];
  const handleCaptured = async (file) => {
    setShowCamera(false);
    if (!visit?._id) return;
    try {
      const location = await safeCurrentPosition();
      const result = await uploadPhoto.mutateAsync({
        visitId: visit._id,
        file,
        location,
      });
      onUploaded?.(result.visit);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not upload photo");
    }
  };
  return (
    <div className="mt-2 sm:mt-3">
      <p className="text-[10px] font-bold text-blue-900 sm:text-xs">
        Visit proof photo
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
        {attachments.map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="h-10 w-10 overflow-hidden rounded-lg border border-blue-200 sm:h-14 sm:w-14"
          >
            <img
              src={url}
              alt="Visit proof"
              className="h-full w-full object-cover"
            />
          </a>
        ))}
        {attachments.length < 6 && (
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={uploadPhoto.isPending}
            className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-blue-300 text-blue-600 disabled:opacity-40 sm:h-14 sm:w-14"
          >
            <FiCamera size={13} />
            <span className="text-[8px] font-bold sm:text-[9px]">
              {uploadPhoto.isPending ? "…" : "Add"}
            </span>
          </button>
        )}
      </div>
      {showCamera && (
        <PhotoCaptureModal
          onClose={() => setShowCamera(false)}
          onCaptured={handleCaptured}
        />
      )}
    </div>
  );
}

function EmployeeDuty({ auth }) {
  const myDuty = useMyFieldDuty(true);
  const assignedActivities = useMyAssignedActivities(true);
  const session = myDuty.data?.session || null;
  const myEmployeeId = session?.employee || auth?.data?.employee?._id;

  const startDuty = useStartFieldDuty();
  const updateStatus = useUpdateFieldDutyStatus();
  const checkoutDuty = useCheckoutFieldDuty();
  const submitCheckIn = useSubmitFieldCheckIn();
  const takeOverDutyMutation = useTakeOverDuty();
  const startVisitMut = useStartFieldVisit();
  const endVisitMut = useEndFieldVisit();
  const watchId = useRef(null);
  const lastSent = useRef(0);
  const promptedForRef = useRef(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [routeDate, setRouteDate] = useState("");
  const [visitForm, setVisitForm] = useState({
    customerName: "",
    organisationName: "",
    contactNumber: "",
    purpose: "",
    visitType: "",
  });
  const [openVisit, setOpenVisit] = useState(null);
  const [lastFinishedVisit, setLastFinishedVisit] = useState(null);
  const [checkInMode, setCheckInMode] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingPoints, setPendingPoints] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(() => Date.now());
  const [visitTick, setVisitTick] = useState(() => Date.now());
  const [deviceTokenMismatch, setDeviceTokenMismatch] = useState(false);
  const [showTakeOverFaceCheck, setShowTakeOverFaceCheck] = useState(false);
  useEffect(() => {
    const onDeviceConflict = () => setDeviceTokenMismatch(true);
    window.addEventListener("field-duty-device-conflict", onDeviceConflict);
    return () =>
      window.removeEventListener("field-duty-device-conflict", onDeviceConflict);
  }, []);
  useEffect(() => {
    if (!openVisit) return undefined;
    const timer = window.setInterval(() => setVisitTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [openVisit]);

  const nextCheckInDueAt = myDuty.data?.nextCheckInDueAt
    ? new Date(myDuty.data.nextCheckInDueAt).getTime()
    : null;
  const checkInOverdue =
    session?.status === "active" &&
    Boolean(nextCheckInDueAt) &&
    now >= nextCheckInDueAt;
  const checkInDueInMinutes = nextCheckInDueAt
    ? Math.max(0, Math.ceil((nextCheckInDueAt - now) / 60000))
    : null;

  useEffect(() => {
    if (
      checkInOverdue &&
      promptedForRef.current !== nextCheckInDueAt &&
      !checkInMode
    ) {
      promptedForRef.current = nextCheckInDueAt;
      setCheckInMode("checkin");
    }
  }, [checkInOverdue, nextCheckInDueAt, checkInMode]);

  useEffect(() => {
    if (!session?._id) {
      setDeviceTokenMismatch(false);
      return;
    }
    const stored = localStorage.getItem(`deviceToken_${session._id}`);
    if (session.deviceLockActive && !stored) {
      setDeviceTokenMismatch(true);
    } else {
      setDeviceTokenMismatch(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?._id) {
      localStorage.setItem("activeFieldSessionId", session._id);
      if (
        !session.deviceLockActive &&
        !localStorage.getItem(`deviceToken_${session._id}`)
      ) {
        localStorage.setItem(`deviceToken_${session._id}`, newId());
      }
    } else {
      localStorage.removeItem("activeFieldSessionId");
    }
  }, [session]);

  const refreshPendingCount = useCallback(async () => {
    const events = await pendingFieldEvents();
    setPendingCount(events.length);
    setPendingPoints(
      events
        .filter((e) => !e.payload?.type || e.payload.type === "location")
        .map((e) => ({
          latitude: e.payload.latitude,
          longitude: e.payload.longitude,
          accuracy: e.payload.accuracy,
          timestamp: e.payload.capturedAt,
          type: "pending",
        })),
    );
  }, []);
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;
    let attempts = 0;
    const restoreOpenVisit = async () => {
      try {
        const res = await myVisits.refetch();
        const inProgress = (res.data?.visits || []).find(
          (v) => v.status === "in_progress",
        );
        if (!cancelled && inProgress) {
          setOpenVisit(inProgress);
          setVisitForm({
            customerName: inProgress.customerName || "",
            organisationName: inProgress.organisationName || "",
            contactNumber: inProgress.contactNumber || "",
            purpose: inProgress.purpose || "",
            visitType: inProgress.visitType || "",
          });
          return;
        }
        if (res.data && !myVisits.isLoading) return;
      } catch {
        /* best-effort restore */
      }
      if (!cancelled && attempts < 10) {
        attempts += 1;
        retryTimer = setTimeout(restoreOpenVisit, 3000);
      }
    };
    restoreOpenVisit();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncQueue = useCallback(async () => {
    if (deviceTokenMismatch) return;
    const queued = await pendingFieldEvents();
    for (const event of queued) {
      try {
        if (event.payload?.type === "end_visit") {
          await endVisitMut.mutateAsync({
            visitId: event.payload.visitId,
            body: {
              location: event.payload.location,
              status: event.payload.status,
            },
          });
        } else if (event.payload?.type === "status_change") {
          await updateStatus.mutateAsync({
            sessionId: event.sessionId,
            status: event.payload.status,
          });
        } else {
          await sendFieldLocation(event.sessionId, event.payload);
        }
        await removeFieldEvent(event.id);
      } catch (error) {
        if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
          setDeviceTokenMismatch(true);
          break;
        }
        break;
      }
    }
    refreshPendingCount();
  }, [refreshPendingCount, endVisitMut, updateStatus, deviceTokenMismatch]);

  const sendLocation = useCallback(
    async (position) => {
      if (!session?._id || session.status !== "active" || deviceTokenMismatch)
        return;
      const now = Date.now();
      if (now - lastSent.current < 10000) return;
      lastSent.current = now;
      const payload = {
        ...pointFromPosition(position),
        type: "location",
        eventId: newId(),
      };
      try {
        if (!navigator.onLine) throw new Error("offline");
        await sendFieldLocation(session._id, payload);
      } catch (error) {
        if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
          setDeviceTokenMismatch(true);
          return;
        }
        if (error?.response?.status === 403) return;
        await queueFieldEvent({
          id: payload.eventId,
          sessionId: session._id,
          payload,
          createdAt: Date.now(),
        });
        refreshPendingCount();
      }
    },
    [session, refreshPendingCount, deviceTokenMismatch],
  );

  useEffect(() => {
    if (
      !session?._id ||
      session.status !== "active" ||
      deviceTokenMismatch ||
      !navigator.geolocation
    )
      return undefined;
    watchId.current = navigator.geolocation.watchPosition(
      sendLocation,
      () => {},
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 20000 },
    );
    return () => {
      if (watchId.current !== null)
        navigator.geolocation.clearWatch(watchId.current);
    };
  }, [session?._id, session?.status, sendLocation, deviceTokenMismatch]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (navigator.onLine) syncQueue();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncQueue]);

  const beginDuty = async (selfieBase64 = null) => {
    if (!selfieBase64) {
      setCheckInMode("start");
      return;
    }
    try {
      if (!navigator.onLine)
        throw new Error(
          "Connect to the internet once to start field duty. GPS updates are safely queued after duty starts.",
        );
      const position = await currentPosition();
      const result = await startDuty.mutateAsync({
        location: pointFromPosition(position),
        selfieBase64,
        eventId: newId(),
        device: {
          platform: navigator.userAgent.slice(0, 40),
          appVersion: "web",
          batteryLevel: null,
        },
      });
      if (result.activeDeviceToken && result.session?._id) {
        localStorage.setItem(
          `deviceToken_${result.session._id}`,
          result.activeDeviceToken,
        );
        localStorage.setItem("activeFieldSessionId", result.session._id);
      }
      toast.success("Field duty started. Live location sharing is on.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Could not start duty",
      );
    }
  };

  const submitPeriodicCheckIn = async (selfieBase64) => {
    try {
      const position = await currentPosition();
      await submitCheckIn.mutateAsync({
        sessionId: session._id,
        body: { ...pointFromPosition(position), selfieBase64 },
      });
      toast.success("Check-in recorded — thanks!");
    } catch (error) {
      if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
        setDeviceTokenMismatch(true);
        return;
      }
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Could not record check-in",
      );
    }
  };

  const handleFaceCaptured = (selfie) => {
    const mode = checkInMode;
    setCheckInMode(null);
    if (mode === "checkin") submitPeriodicCheckIn(selfie);
    else beginDuty(selfie);
  };

  const changeStatus = async (status) => {
    try {
      if (!navigator.onLine) throw new Error("offline");
      await updateStatus.mutateAsync({ sessionId: session._id, status });
      toast.success(
        status === "paused"
          ? "Location sharing paused"
          : "Location sharing resumed",
      );
    } catch (error) {
      if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
        setDeviceTokenMismatch(true);
        return;
      }
      if (error?.message === "offline" || !navigator.onLine) {
        await queueFieldEvent({
          id: newId(),
          sessionId: session._id,
          payload: { type: "status_change", status },
          createdAt: Date.now(),
        });
        refreshPendingCount();
        toast.success(
          `${status === "paused" ? "Pause" : "Resume"} saved — will apply when back online`,
        );
        return;
      }
      toast.error(error?.response?.data?.message || "Could not update duty");
    }
  };

  const endDuty = async () => {
    if (openVisit) {
      toast.error(
        "Finish or skip your open visit before checking out of field duty.",
      );
      return;
    }
    try {
      let body = {};
      try {
        body = { location: pointFromPosition(await currentPosition()) };
      } catch {
        body = {};
      }
      await checkoutDuty.mutateAsync({ sessionId: session._id, body });
      setOpenVisit(null);
      toast.success("Field duty checked out. Location sharing stopped.");
    } catch (error) {
      if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
        setDeviceTokenMismatch(true);
        return;
      }
      toast.error(error?.response?.data?.message || "Could not check out");
    }
  };

  const handleTakeOver = async (selfieBase64) => {
    try {
      const result = await takeOverDutyMutation.mutateAsync({ selfieBase64 });
      localStorage.setItem(
        `deviceToken_${session._id}`,
        result.activeDeviceToken,
      );
      setShowTakeOverFaceCheck(false);
      setDeviceTokenMismatch(false);
      toast.success("Face verified — you're back in control of this duty.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Face verification failed");
    }
  };

  const beginVisit = async (event, assignedActivity = null) => {
    event?.preventDefault();
    try {
      const location = await safeCurrentPosition();
      const result = await startVisitMut.mutateAsync({
        sessionId: session._id,
        body: {
          ...visitForm,
          ...(assignedActivity ? { activityId: assignedActivity._id } : {}),
          location,
          eventId: newId(),
        },
      });
      setOpenVisit(result.visit);
      setVisitOpen(false);
      setVisitForm({
        customerName: "",
        organisationName: "",
        contactNumber: "",
        purpose: "",
        visitType: "",
      });
      await myVisits.refetch();
      toast.success("Visit started");
    } catch (error) {
      if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
        setDeviceTokenMismatch(true);
        return;
      }
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Could not start visit",
      );
    }
  };

  const startAssignedActivity = async (activity) => {
    if (!session || session.status !== "active") {
      toast.error(
        "Start and activate field duty before starting assigned work.",
      );
      return;
    }
    await beginVisit(null, activity);
    assignedActivities.refetch();
  };

  const [pendingCompletePhoto, setPendingCompletePhoto] = useState(false);
  const [visitFilter, setVisitFilter] = useState({ status: "", type: "" });
  const [visitPage, setVisitPage] = useState(1);
  const visitPageSize = 6;
  const uploadCompletionPhoto = useUploadVisitPhoto();
  const myVisits = useMyFieldVisits(true, {
    ...visitFilter,
    page: visitPage,
    limit: visitPageSize,
  });
  const allMyVisits = myVisits.data?.visits || [];
  const reportedVisitTotal = Number(myVisits.data?.total);
  const hasServerPagination = Number.isFinite(reportedVisitTotal);
  const myVisitTotal = hasServerPagination
    ? Math.max(reportedVisitTotal, allMyVisits.length)
    : allMyVisits.length;
  const myVisitItems = hasServerPagination
    ? allMyVisits
    : allMyVisits.slice(
        (visitPage - 1) * visitPageSize,
        visitPage * visitPageSize,
      );
  const myVisitTotalPages = Math.max(
    1,
    Math.ceil(myVisitTotal / visitPageSize),
  );
  const myVisitFirstRecord =
    myVisitTotal === 0 ? 0 : (visitPage - 1) * visitPageSize + 1;
  const myVisitLastRecord = Math.min(visitPage * visitPageSize, myVisitTotal);
  const updateVisitFilter = (key) => (event) => {
    setVisitFilter((filters) => ({ ...filters, [key]: event.target.value }));
    setVisitPage(1);
  };

  const finishVisit = async (status = "completed") => {
    if (!openVisit) return;
    try {
      const location = await safeCurrentPosition();
      const result = await endVisitMut.mutateAsync({
        visitId: openVisit._id,
        body: { location, status },
      });
      setLastFinishedVisit(result.visit);
      setOpenVisit(null);
      toast.success(
        status === "skipped" ? "Visit marked as skipped" : "Visit completed",
      );
    } catch (error) {
      if (error?.response?.data?.code === "DUTY_SESSION_ON_ANOTHER_DEVICE") {
        setDeviceTokenMismatch(true);
        return;
      }
      if (error?.message === "offline" || !navigator.onLine) {
        try {
          await queueFieldEvent({
            id: newId(),
            sessionId: session?._id,
            payload: {
              type: "end_visit",
              visitId: openVisit._id,
              status,
              eventId: newId(),
            },
            createdAt: Date.now(),
          });
          refreshPendingCount();
          setOpenVisit(null);
          toast.success("Visit queued — will sync when you're back online");
          return;
        } catch {
          /* fall through */
        }
      }
      toast.error(error?.response?.data?.message || "Could not update visit");
    }
  };

  const requestCompleteVisit = () => {
    if ((openVisit?.attachments || []).length > 0) {
      finishVisit("completed");
      return;
    }
    setPendingCompletePhoto(true);
  };

  const handleCompletionPhoto = async (file) => {
    setPendingCompletePhoto(false);
    try {
      const location = await safeCurrentPosition();
      const result = await uploadCompletionPhoto.mutateAsync({
        visitId: openVisit._id,
        file,
        location,
      });
      setOpenVisit(result.visit);
      await finishVisit("completed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not upload photo");
    }
  };

  const visitMinMinutes = Number.isFinite(openVisit?.minDurationMinutes)
    ? openVisit.minDurationMinutes
    : MIN_VISIT_MINUTES;
  const visitElapsedMinutes = openVisit
    ? (visitTick - new Date(openVisit.startedAt).getTime()) / 60000
    : 0;
  const visitCanComplete = visitElapsedMinutes >= visitMinMinutes;
  const visitCountdownLabel = (() => {
    const remainingSeconds = Math.max(
      0,
      Math.round((visitMinMinutes - visitElapsedMinutes) * 60),
    );
    const mm = Math.floor(remainingSeconds / 60);
    const ss = String(remainingSeconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  })();

  const busy =
    startDuty.isPending ||
    updateStatus.isPending ||
    checkoutDuty.isPending ||
    startVisitMut.isPending ||
    endVisitMut.isPending;

  if (myDuty.isLoading)
    return (
      <div className="p-3 text-xs text-slate-500 sm:p-8 sm:text-sm">
        Loading your field duty…
      </div>
    );

  if (myDuty.isError) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-2 text-center sm:p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
          <FiAlertTriangle className="mx-auto text-amber-500" size={36} />
          <h2 className="mt-3 text-sm font-bold text-slate-900 sm:mt-4 sm:text-lg">
            Couldn't load Field Operations
          </h2>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm">
            {myDuty.error?.response?.data?.message ||
              "Something went wrong. Please check your connection and try again."}
          </p>
          <button
            type="button"
            onClick={() => myDuty.refetch()}
            className="mt-4 w-full rounded-lg bg-[#730042] px-4 py-2.5 text-xs font-bold text-white sm:w-auto sm:text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (myDuty.data?.fieldOperationsEnabled === false) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-2 text-center sm:p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
          <FiXCircle className="mx-auto text-slate-400" size={36} />
          <h2 className="mt-3 text-sm font-bold text-slate-900 sm:mt-4 sm:text-lg">
            Field Operations isn't available
          </h2>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm">
            Your organization has not enabled Field Operations. Contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  if (myDuty.data?.isAssigned === false) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-2 text-center sm:p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
          <FiUsers className="mx-auto text-slate-400" size={36} />
          <h2 className="mt-3 text-sm font-bold text-slate-900 sm:mt-4 sm:text-lg">
            Your organization has not enabled this feature for you
          </h2>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm">
            You're not on a field team or individually assigned to Field Work
            yet. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (deviceTokenMismatch && session) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-2 text-center sm:p-6">
        <div className="w-full max-w-sm rounded-2xl border border-[#F4C0D1] bg-white p-4 shadow-xl sm:p-6">
          <FiAlertTriangle className="mx-auto text-[#730042]" size={36} />
          <h2 className="mt-3 text-sm font-bold text-slate-900 sm:mt-4 sm:text-lg">
            Your field duty is already active
          </h2>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm">
            This duty session was started on another device. To continue here,
            verify your face to take over the session.
          </p>
          <button
            type="button"
            onClick={() => setShowTakeOverFaceCheck(true)}
            className="mt-4 w-full rounded-lg bg-[#730042] px-4 py-2.5 text-xs font-bold text-white sm:w-auto sm:text-sm"
          >
            Verify face to continue
          </button>
          {showTakeOverFaceCheck && (
            <FaceCheckModal
              heading="Verify to take over field duty"
              onClose={() => setShowTakeOverFaceCheck(false)}
              onCaptured={handleTakeOver}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2 p-2 pb-20 sm:space-y-4 sm:p-4 sm:pb-6 lg:space-y-5 lg:p-6">
      <header>
        <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#7A004B] sm:text-xs">
          Field Operations
        </p>
        <h1 className="mt-0.5 text-base font-extrabold text-slate-900 sm:mt-1 sm:text-xl lg:text-2xl">
          Your field duty
        </h1>
        <p className="mt-0.5 text-[11px] text-slate-500 sm:mt-1 sm:text-sm">
          Location is shared only while your field duty is active.
        </p>
      </header>
      <div className="rounded-xl bg-gradient-to-br from-[#7A004B] to-[#31001d] p-3 text-white shadow-lg sm:rounded-2xl sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-white/70 sm:text-sm">Duty status</p>
            <p className="mt-0.5 text-base font-extrabold sm:mt-1 sm:text-xl lg:text-2xl">
              {session
                ? session.status === "checked_out"
                  ? "Duty completed"
                  : "Field duty active"
                : "Ready to start"}
            </p>
          </div>
          {session && <StatusPill status={session.status} />}
        </div>
        {session ? (
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] sm:mt-5 sm:gap-3 sm:text-sm">
            <div className="min-w-0 rounded-lg bg-white/10 p-2 sm:rounded-xl sm:p-3">
              <FiClock className="mb-0.5" size={12} />
              <span className="block truncate">
                Started {formatTime(session.startedAt)}
              </span>
            </div>
            <div className="min-w-0 rounded-lg bg-white/10 p-2 sm:rounded-xl sm:p-3">
              <FiActivity className="mb-0.5" size={12} />
              <span className="block truncate">
                {session.status === "checked_out" ? (
                  formatDuration(session.totalDurationSeconds)
                ) : (
                  <LiveDuration startedAt={session.startedAt} />
                )}{" "}
                on duty
              </span>
            </div>
            <div className="min-w-0 rounded-lg bg-white/10 p-2 sm:rounded-xl sm:p-3">
              <FiMapPin className="mb-0.5" size={12} />
              <span className="block truncate">
                Seen {formatTime(session.lastSeenAt)}
              </span>
            </div>
            <div className="min-w-0 rounded-lg bg-white/10 p-2 sm:rounded-xl sm:p-3">
              <FiNavigation className="mb-0.5" size={12} />
              <span className="block truncate">
                {formatDistance(session.totalDistanceMeters)} travelled
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-white/80 sm:mt-4 sm:text-sm">
            Allow precise location when prompted. We stop tracking automatically
            after checkout.
          </p>
        )}
        {!session || session.status === "checked_out" ? (
          <button
            disabled={busy}
            onClick={() => beginDuty()}
            className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[#7A004B] disabled:opacity-60 sm:mt-5 sm:min-h-[44px] sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
          >
            <FiCamera size={14} /> Verify face & start duty
          </button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-5 sm:gap-3">
            <button
              disabled={busy || session.status !== "active"}
              onClick={() => changeStatus("paused")}
              className="inline-flex min-h-[42px] items-center justify-center gap-1 rounded-xl bg-white/15 px-2 py-2.5 text-[11px] font-bold disabled:opacity-40 sm:min-h-[44px] sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
            >
              <FiPause size={12} /> Pause
            </button>
            <button
              disabled={busy}
              onClick={endDuty}
              className="inline-flex min-h-[42px] items-center justify-center gap-1 rounded-xl bg-rose-500 px-2 py-2.5 text-[11px] font-bold sm:min-h-[44px] sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
            >
              <FiXCircle size={12} /> Check out
            </button>
          </div>
        )}
        {session?.status === "paused" && (
          <button
            disabled={busy}
            onClick={() => changeStatus("active")}
            className="mt-2 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[#7A004B] sm:mt-3 sm:min-h-[44px] sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
          >
            <FiPlay size={12} /> Resume location sharing
          </button>
        )}
      </div>
      {session?.lastLocation && (
        <div className="rounded-xl border border-slate-200 bg-white p-2 sm:rounded-2xl sm:p-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:mb-2 sm:text-xs">
            Your live location
            {pendingPoints.length > 0 && (
              <span className="ml-1 font-medium normal-case text-amber-600 sm:ml-2">
                · {pendingPoints.length} pt{pendingPoints.length === 1 ? "" : "s"} offline
              </span>
            )}
          </p>
          <LiveMap session={session} big markers={pendingPoints} />
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
        <div className="flex gap-2 sm:gap-3">
          <FiWifiOff
            className={
              isOnline
                ? "mt-0.5 shrink-0 text-emerald-600 sm:mt-0"
                : "mt-0.5 shrink-0 text-amber-600 sm:mt-0"
            }
            size={16}
          />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-800 sm:text-sm">
              {isOnline ? "Online" : "Offline"} · {pendingCount} update
              {pendingCount === 1 ? "" : "s"} pending
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
              GPS points are stored securely on this device and sync when you
              reconnect.
            </p>
          </div>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={syncQueue}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#7A004B] sm:mt-3 sm:text-sm"
          >
            <FiRefreshCw size={12} /> Sync now
          </button>
        )}
      </div>
      {session?.status === "active" && nextCheckInDueAt && (
        <div
          className={`rounded-xl border p-2.5 sm:rounded-2xl sm:p-4 ${checkInOverdue ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-[11px] font-bold sm:text-sm ${checkInOverdue ? "text-rose-700" : "text-slate-800"}`}
              >
                {checkInOverdue ? "Check-in overdue" : "Next check-in"}
              </p>
              <p className="text-[10px] text-slate-500 sm:text-xs">
                {checkInOverdue
                  ? "Take a quick selfie to confirm you're on the field."
                  : `Due in about ${checkInDueInMinutes}m`}
              </p>
            </div>
            <button
              onClick={() => setCheckInMode("checkin")}
              className={`inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold sm:min-h-[38px] sm:gap-2 sm:px-3 sm:text-sm ${checkInOverdue ? "bg-rose-600 text-white" : "border border-[#7A004B] text-[#7A004B]"}`}
            >
              <FiCamera size={12} /> Check in
            </button>
          </div>
        </div>
      )}
      {myEmployeeId && (
        <RouteTrail
          employeeId={myEmployeeId}
          date={routeDate}
          showPicker={false}
          big
        />
      )}
      {session && session.status !== "checked_out" && (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-900 sm:text-base">
                Customer visit
              </h2>
              <p className="text-[10px] text-slate-500 sm:text-xs">
                Log time, outcome, and a proof photo at each customer location.
              </p>
            </div>
            {openVisit ? <StatusPill status="in_progress" /> : null}
          </div>
          {openVisit ? (
            <div className="mt-2 rounded-xl bg-blue-50 p-2.5 sm:mt-4 sm:p-3">
              <p className="text-xs font-bold text-blue-900 sm:text-base">
                {openVisit.customerName}
              </p>
              <p className="text-[10px] text-blue-700 sm:text-xs">
                Started {formatTime(openVisit.startedAt)}
              </p>
              <VisitPhotoUploader visit={openVisit} onUploaded={setOpenVisit} />
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:grid-cols-3 sm:gap-2">
                <button
                  disabled={busy || !visitCanComplete}
                  onClick={requestCompleteVisit}
                  className="col-span-2 min-h-[38px] rounded-lg bg-blue-600 px-2 py-2 text-[11px] font-bold text-white disabled:opacity-40 sm:col-span-1 sm:min-h-[40px] sm:text-sm"
                >
                  {visitCanComplete
                    ? "End visit"
                    : `End (${visitCountdownLabel})`}
                </button>
                <button
                  disabled={busy}
                  onClick={() => finishVisit("skipped")}
                  className="min-h-[38px] rounded-lg border border-amber-300 px-2 py-2 text-[11px] font-bold text-amber-700 disabled:opacity-40 sm:min-h-[40px] sm:text-sm"
                >
                  Skip
                </button>
                <button
                  disabled={busy}
                  onClick={() => finishVisit("follow_up_required")}
                  className="min-h-[38px] rounded-lg border border-violet-300 px-2 py-2 text-[11px] font-bold text-violet-700 disabled:opacity-40 sm:min-h-[40px] sm:text-sm"
                >
                  Follow up
                </button>
              </div>
              <p className="mt-1.5 text-[9px] text-blue-600 sm:mt-2 sm:text-[11px]">
                {visitMinMinutes > 0
                  ? `Needs ${visitMinMinutes} min and a live camera photo to close.`
                  : "Live camera photo needed to close."}{" "}
                Use Skip or Follow up if unavailable.
              </p>
              <GeofenceResult
                result={openVisit.geofenceStatus?.atStart}
                label="Start"
              />
              <GeofenceResult
                result={openVisit.geofenceStatus?.atEnd}
                label="End"
              />
            </div>
          ) : (
            <button
              disabled={busy || session.status !== "active"}
              onClick={() => setVisitOpen(true)}
              className="mt-2 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#7A004B] px-3 py-2.5 text-xs font-bold text-[#7A004B] disabled:opacity-40 sm:mt-4 sm:min-h-[44px] sm:gap-2 sm:text-sm"
            >
              <FiUserPlus size={14} /> Start customer visit
            </button>
          )}
        </div>
      )}
      {lastFinishedVisit && (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <p className="text-xs font-bold text-slate-900 sm:text-base">
            Result: {lastFinishedVisit.customerName}
          </p>
          <GeofenceResult
            result={lastFinishedVisit.geofenceStatus?.atStart}
            label="Start"
          />
          <GeofenceResult
            result={lastFinishedVisit.geofenceStatus?.atEnd}
            label="End"
          />
        </div>
      )}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
        <div className="flex flex-col gap-2 p-2.5 pb-0 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A004B] sm:text-xs">
              Visit history
            </p>
            <h2 className="mt-0.5 text-xs font-bold text-slate-900 sm:mt-1 sm:text-base">
              My field visits
            </h2>
            <p className="mt-0.5 text-[9px] text-slate-500 sm:mt-1 sm:text-xs">
              Latest visits first. Use filters to find a record.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <input
              type="date"
              value={visitFilter.from || ""}
              onChange={updateVisitFilter("from")}
              className="min-w-0 rounded-lg border px-1.5 py-1 text-[10px] sm:px-2 sm:text-xs"
            />
            <input
              type="date"
              value={visitFilter.to || ""}
              onChange={updateVisitFilter("to")}
              className="min-w-0 rounded-lg border px-1.5 py-1 text-[10px] sm:px-2 sm:text-xs"
            />
            <select
              value={visitFilter.status}
              onChange={updateVisitFilter("status")}
              className="min-w-0 rounded-lg border px-1.5 py-1 text-[10px] sm:px-2 sm:text-xs"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="follow_up_required">Follow up</option>
              <option value="in_progress">In progress</option>
            </select>
            <select
              value={visitFilter.type}
              onChange={updateVisitFilter("type")}
              className="min-w-0 rounded-lg border px-1.5 py-1 text-[10px] sm:px-2 sm:text-xs"
            >
              <option value="">All types</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleize(t)}
                </option>
              ))}
            </select>
            <a
              href={exportMyVisitsCsvUrl(visitFilter)}
              download
              className="col-span-2 inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-[#7A004B] px-2 py-1 text-[10px] font-bold text-[#7A004B] hover:bg-[#fdf0f6] sm:col-auto sm:px-2.5 sm:text-xs"
            >
              <FiDownload size={11} /> Export CSV
            </a>
          </div>
        </div>
        <div className="m-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-1.5 sm:m-4 sm:rounded-2xl sm:p-3">
          {myVisits.isLoading ? (
            <p className="p-2 text-[11px] text-slate-500 sm:p-3 sm:text-sm">
              Loading visits…
            </p>
          ) : myVisitItems.length === 0 ? (
            <p className="p-2 text-[11px] text-slate-500 sm:p-3 sm:text-sm">
              No visits recorded yet.
            </p>
          ) : (
            myVisitItems.map((visit, visitIndex) => (
              <article
                key={visit._id}
                className="group mb-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition last:mb-0 hover:border-[#d7a6c0] hover:shadow-md sm:mb-2 sm:rounded-xl sm:p-3"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fdf0f6] text-[10px] font-extrabold text-[#7A004B] sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm">
                    {(visitPage - 1) * visitPageSize + visitIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-slate-900 sm:text-sm">
                          {visit.customerName || "Customer visit"}
                        </p>
                        <p className="mt-0.5 text-[9px] font-medium text-slate-500 sm:text-xs">
                          {titleize(visit.activityType || "open")} ·{" "}
                          {formatVisitDate(visit.startedAt)}
                        </p>
                      </div>
                      <StatusPill status={visit.status} />
                    </div>
                    {visit.purpose && (
                      <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-600 sm:mt-2 sm:text-xs sm:leading-5">
                        {visit.purpose}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-medium sm:mt-2 sm:gap-1.5 sm:text-[11px]">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600 sm:gap-1 sm:px-2 sm:py-1">
                        <FiClock size={9} /> {formatTime(visit.startedAt)}
                      </span>
                      {visit.assignmentType && (
                        <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-violet-700 sm:px-2 sm:py-1">
                          {titleize(visit.assignmentType)}
                        </span>
                      )}
                      {visit.attachments?.length ? (
                        <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-sky-700 sm:px-2 sm:py-1">
                          {visit.attachments.length} photo
                          {visit.attachments.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {visit.geofenceStatus?.atEnd ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 ${
                            visit.geofenceStatus.atEnd.withinFence
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 font-bold text-rose-700"
                          }`}
                        >
                          {visit.geofenceStatus.atEnd.withinFence
                            ? "In geofence"
                            : "Out of geofence"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
        {myVisitTotal > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 bg-white px-2.5 py-2 sm:gap-2 sm:px-4 sm:py-3">
            <p className="text-[9px] font-medium text-slate-500 sm:text-xs">
              <span className="font-bold text-slate-700">
                {myVisitFirstRecord}–{myVisitLastRecord}
              </span>{" "}
              of {myVisitTotal}
            </p>
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:gap-1 sm:rounded-xl sm:p-1">
              <button
                type="button"
                onClick={() =>
                  setVisitPage((current) => Math.max(1, current - 1))
                }
                disabled={visitPage === 1 || myVisits.isFetching}
                aria-label="Previous"
                className="inline-flex items-center rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 sm:gap-1 sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-xs"
              >
                <FiChevronLeft size={11} />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <span className="rounded-md bg-white px-1.5 py-1 text-[10px] font-bold text-[#7A004B] shadow-sm sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-xs">
                {visitPage}/{myVisitTotalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setVisitPage((current) =>
                    Math.min(myVisitTotalPages, current + 1),
                  )
                }
                disabled={visitPage >= myVisitTotalPages || myVisits.isFetching}
                aria-label="Next"
                className="inline-flex items-center rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 sm:gap-1 sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-xs"
              >
                <span className="hidden sm:inline">Next</span>
                <FiChevronRight size={11} />
              </button>
            </div>
          </div>
        )}
      </section>
      {(assignedActivities.data?.activities || []).length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <h2 className="text-xs font-bold text-slate-900 sm:text-base">
            Today's assigned work
          </h2>
          <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
            {assignedActivities.data.activities.map((activity) => (
              <div
                key={activity._id}
                className="rounded-lg bg-slate-50 p-2 sm:rounded-xl sm:p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 sm:text-sm">
                      {activity.customerName}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-500 sm:text-xs">
                      {titleize(activity.activityType)} ·{" "}
                      {titleize(activity.priority)}
                      {activity.scheduledTime
                        ? ` · ${activity.scheduledTime}`
                        : ""}
                    </p>
                    {activity.purpose && (
                      <p className="mt-0.5 text-[9px] text-slate-600 sm:mt-1 sm:text-xs">
                        {activity.purpose}
                      </p>
                    )}
                  </div>
                  {activity.status === "pending" ? (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        Boolean(openVisit) ||
                        session?.status !== "active"
                      }
                      onClick={() => startAssignedActivity(activity)}
                      className="min-h-[32px] shrink-0 rounded-lg bg-[#7A004B] px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40 sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                    >
                      Start
                    </button>
                  ) : (
                    <StatusPill status={activity.status} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {pendingCompletePhoto && (
        <PhotoCaptureModal
          heading="Photo to close this visit"
          subtext="A live photo is required to mark this visit complete."
          onClose={() => setPendingCompletePhoto(false)}
          onCaptured={handleCompletionPhoto}
        />
      )}
      {visitOpen && (
        <form
          onSubmit={beginVisit}
          className="space-y-2 rounded-xl border border-[#d7a6c0] bg-[#fff8fb] p-2.5 sm:space-y-3 sm:rounded-2xl sm:p-4"
        >
          <h2 className="text-xs font-bold sm:text-base">
            Start a customer visit
          </h2>
          {[
            ["customerName", "Customer / contact name *"],
            ["organisationName", "Organisation / place"],
            ["contactNumber", "Contact number"],
            ["visitType", "Visit type (Sales call, Delivery…)"],
            ["purpose", "Visit purpose"],
          ].map(([name, label]) => (
            <input
              key={name}
              required={name === "customerName"}
              value={visitForm[name]}
              onChange={(e) =>
                setVisitForm({ ...visitForm, [name]: e.target.value })
              }
              placeholder={label}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#7A004B] sm:px-3 sm:text-sm"
            />
          ))}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
            <button
              disabled={busy}
              className="min-h-[40px] flex-1 rounded-lg bg-[#7A004B] px-3 py-2 text-xs font-bold text-white disabled:opacity-50 sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            >
              Start visit
            </button>
            <button
              type="button"
              onClick={() => setVisitOpen(false)}
              className="min-h-[40px] rounded-lg border px-3 py-2 text-xs sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {checkInMode && (
        <FaceCheckModal
          onClose={() => setCheckInMode(null)}
          onCaptured={handleFaceCaptured}
          heading={
            checkInMode === "checkin" ? "Periodic field check-in" : undefined
          }
          subtext={
            checkInMode === "checkin"
              ? "A quick selfie + location every couple of hours confirms you're on the field and safe."
              : undefined
          }
        />
      )}
    </div>
  );
}

function TeamSetupForm({ team, onClose, onSaved }) {
  const isEdit = Boolean(team);
  const teamOptions = useFieldTeamOptions();
  const createTeam = useCreateFieldTeam();
  const updateTeam = useUpdatedFieldTeam();
  const [options, setOptions] = useState(null);
  const [managerSearch, setManagerSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [form, setForm] = useState(() =>
    team
      ? {
          name: team.name || "",
          territory: team.territory || "",
          departmentId: team.department?._id || team.department || "",
          color: team.color || "#7A004B",
          notifyOnGeofenceExit: Boolean(team.notifyOnGeofenceExit),
          geofence: {
            latitude: team.geofence?.latitude ?? "",
            longitude: team.geofence?.longitude ?? "",
            radiusMeters: team.geofence?.radiusMeters ?? "",
          },
          managers: (team.managers || []).map((m) => String((m && m._id) || m)),
          members: (team.members || []).map((m) => String((m && m._id) || m)),
        }
      : {
          name: "",
          territory: "",
          departmentId: "",
          color: "#7A004B",
          notifyOnGeofenceExit: false,
          geofence: { latitude: "", longitude: "", radiusMeters: "" },
          managers: [],
          members: [],
        },
  );

  useEffect(() => {
    teamOptions
      .mutateAsync()
      .then(setOptions)
      .catch((e) =>
        toast.error(
          e?.response?.data?.message || "Could not load team members",
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key, id) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((item) => item !== id)
        : [...current[key], id],
    }));

  const matchesSearch = (person, query) =>
    !query ||
    `${person.f_name} ${person.l_name}`
      .toLowerCase()
      .includes(query.toLowerCase());
  const filteredManagers = (options?.managers || []).filter((p) =>
    matchesSearch(p, managerSearch),
  );
  const filteredMembers = (options?.employees || []).filter((p) =>
    matchesSearch(p, memberSearch),
  );

  const selectAllVisible = (key, visiblePeople) =>
    setForm((current) => ({
      ...current,
      [key]: [
        ...new Set([...current[key], ...visiblePeople.map((p) => p._id)]),
      ],
    }));
  const clearAllVisible = (key, visiblePeople) => {
    const visibleIds = new Set(visiblePeople.map((p) => p._id));
    setForm((current) => ({
      ...current,
      [key]: current[key].filter((id) => !visibleIds.has(id)),
    }));
  };

  const busy = createTeam.isPending || updateTeam.isPending;

  const submit = async (event, force = false) => {
    event.preventDefault();
    const body = force ? { ...form, force: true } : form;
    try {
      if (isEdit) {
        await updateTeam.mutateAsync({ teamId: team._id, body });
        toast.success("Field team updated");
      } else {
        await createTeam.mutateAsync(body);
        toast.success("Field team created");
      }
      onSaved?.();
    } catch (e) {
      if (
        e?.response?.data?.code === "INDIVIDUAL_ASSIGNMENT_CONFLICT" &&
        !force &&
        window.confirm(
          `${e.response.data.message} They will be removed from their individual assignment.`,
        )
      ) {
        return submit(event, true);
      }
      toast.error(e?.response?.data?.message || "Could not save team");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-2 sm:p-4"
    >
      <div className="mx-auto my-2 w-full max-w-xl rounded-xl bg-white p-3 shadow-2xl sm:my-6 sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-extrabold sm:text-lg">
            {isEdit ? "Edit field team" : "Create field team"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Team name *"
          className="mt-3 w-full rounded-lg border px-2.5 py-2 text-xs sm:mt-4 sm:px-3 sm:text-sm"
        />
        <input
          value={form.territory}
          onChange={(e) => setForm({ ...form, territory: e.target.value })}
          placeholder="Territory / area"
          className="mt-2 w-full rounded-lg border px-2.5 py-2 text-xs sm:px-3 sm:text-sm"
        />
        <select
          value={form.departmentId}
          onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
          className="mt-2 w-full rounded-lg border px-2.5 py-2 text-xs sm:px-3 sm:text-sm"
        >
          <option value="">No department</option>
          {(options?.departments || []).map((dept) => (
            <option key={dept._id} value={dept._id}>
              {dept.name}
              {dept.code ? ` (${dept.code})` : ""}
            </option>
          ))}
        </select>
        <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <label className="flex items-center gap-2 text-[11px] text-slate-600 sm:text-sm">
            Map colour{" "}
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-7 w-9 rounded border sm:h-8 sm:w-10"
            />
          </label>
          <label className="flex flex-1 items-start gap-1.5 text-[11px] text-slate-600 sm:gap-2 sm:text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.notifyOnGeofenceExit}
              onChange={(e) =>
                setForm({ ...form, notifyOnGeofenceExit: e.target.checked })
              }
            />{" "}
            Alert managers when a member leaves the geofence
          </label>
        </div>
        <p className="mt-3 text-xs font-bold sm:mt-4 sm:text-sm">
          Geofence (optional)
        </p>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:mt-2 sm:grid-cols-3 sm:gap-2">
          <input
            value={form.geofence.latitude}
            onChange={(e) =>
              setForm({
                ...form,
                geofence: { ...form.geofence, latitude: e.target.value },
              })
            }
            placeholder="Latitude"
            className="rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
          />
          <input
            value={form.geofence.longitude}
            onChange={(e) =>
              setForm({
                ...form,
                geofence: { ...form.geofence, longitude: e.target.value },
              })
            }
            placeholder="Longitude"
            className="rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
          />
          <input
            value={form.geofence.radiusMeters}
            onChange={(e) =>
              setForm({
                ...form,
                geofence: { ...form.geofence, radiusMeters: e.target.value },
              })
            }
            placeholder="Radius (m)"
            className="rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 sm:mt-4 sm:gap-2">
          <p className="text-xs font-bold sm:text-sm">
            Managers ({form.managers.length})
          </p>
          <div className="flex gap-1.5 text-[10px] font-bold text-[#7A004B] sm:gap-2 sm:text-xs">
            <button
              type="button"
              onClick={() => selectAllVisible("managers", filteredManagers)}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => clearAllVisible("managers", filteredManagers)}
            >
              Clear
            </button>
          </div>
        </div>
        <input
          value={managerSearch}
          onChange={(e) => setManagerSearch(e.target.value)}
          placeholder="Search managers…"
          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs sm:text-sm"
        />
        <div className="mt-1.5 grid max-h-28 grid-cols-1 gap-1 overflow-y-auto sm:mt-2 sm:max-h-32 sm:grid-cols-2 sm:gap-2">
          {filteredManagers.map((person) => (
            <label
              key={person._id}
              className="flex min-w-0 gap-1.5 rounded bg-slate-50 p-1.5 text-[11px] sm:gap-2 sm:p-2 sm:text-xs"
            >
              <input
                type="checkbox"
                className="shrink-0"
                checked={form.managers.includes(person._id)}
                onChange={() => toggle("managers", person._id)}
              />
              <span className="min-w-0 truncate">
                {person.f_name} {person.l_name}
              </span>
            </label>
          ))}
          {!filteredManagers.length && (
            <p className="col-span-2 text-[10px] text-slate-400 sm:text-xs">
              No match
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 sm:mt-4 sm:gap-2">
          <p className="text-xs font-bold sm:text-sm">
            Field employees ({form.members.length})
          </p>
          <div className="flex gap-1.5 text-[10px] font-bold text-[#7A004B] sm:gap-2 sm:text-xs">
            <button
              type="button"
              onClick={() => selectAllVisible("members", filteredMembers)}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => clearAllVisible("members", filteredMembers)}
            >
              Clear
            </button>
          </div>
        </div>
        <input
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Search employees…"
          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs sm:text-sm"
        />
        <div className="mt-1.5 grid max-h-36 grid-cols-1 gap-1 overflow-y-auto sm:mt-2 sm:max-h-40 sm:grid-cols-2 sm:gap-2">
          {filteredMembers.map((person) => (
            <label
              key={person._id}
              className="flex min-w-0 gap-1.5 rounded bg-slate-50 p-1.5 text-[11px] sm:gap-2 sm:p-2 sm:text-xs"
            >
              <input
                type="checkbox"
                className="shrink-0"
                checked={form.members.includes(person._id)}
                onChange={() => toggle("members", person._id)}
              />
              <span className="min-w-0 truncate">
                {person.f_name} {person.l_name}
              </span>
            </label>
          ))}
          {!filteredMembers.length && (
            <p className="col-span-2 text-[10px] text-slate-400 sm:text-xs">
              No match
            </p>
          )}
        </div>
        <button
          disabled={busy}
          className="mt-4 min-h-[42px] w-full rounded-lg bg-[#7A004B] py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:mt-5 sm:min-h-[44px] sm:text-sm"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create team"}
        </button>
      </div>
    </form>
  );
}

function SettingsPanel({ onClose, isSuperAdmin = false }) {
  const { data, isLoading } = useFieldSettings(true);
  const updateSettings = useUpdateFieldSettings();
  const [formEdits, setForm] = useState({});
  const form = data?.settings ? { ...data.settings, ...formEdits } : null;

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form };
      if (!isSuperAdmin) {
        delete payload.enabled;
        delete payload.require_face_verification;
      }
      await updateSettings.mutateAsync(payload);
      toast.success("Field Operations settings saved");
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save settings");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-2 sm:p-4">
      <div className="mx-auto my-2 w-full max-w-lg rounded-xl bg-white p-3 shadow-2xl sm:my-6 sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold sm:text-lg">
              Field Operations settings
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">
              Configure geofencing, duration rules, and operational limits.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>
        {isLoading || !form ? (
          <p className="mt-3 text-xs text-slate-500 sm:mt-6 sm:text-sm">
            Loading settings…
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="mt-3 space-y-3 sm:mt-4 sm:space-y-4"
          >
            <div>
              <p className="text-[11px] font-bold text-slate-600 sm:text-xs">
                Minimum activity duration (minutes)
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">
                Defaults: 20 min for visits and meetings. Set 0 to allow
                immediate completion.
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-2 sm:grid-cols-3 sm:gap-2">
                {ACTIVITY_TYPES.map((type) => (
                  <label
                    key={type}
                    className="min-w-0 text-[10px] font-bold capitalize text-slate-600 sm:text-[11px]"
                  >
                    <span className="block truncate">{titleize(type)}</span>
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      value={form.min_duration_overrides?.[type] ?? ""}
                      placeholder={
                        type === "meeting" || type === "customer_visit"
                          ? "20"
                          : "0"
                      }
                      onChange={(e) => {
                        const overrides = {
                          ...(form.min_duration_overrides || {}),
                        };
                        if (e.target.value === "") delete overrides[type];
                        else overrides[type] = Number(e.target.value);
                        setForm({ ...form, min_duration_overrides: overrides });
                      }}
                      className="mt-0.5 w-full rounded-lg border px-1.5 py-1 text-xs font-normal sm:mt-1 sm:px-2 sm:py-1.5 sm:text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <label className="text-[11px] font-bold text-slate-600 sm:text-xs">
                Max field employees
                <input
                  type="number"
                  min="0"
                  value={form.max_field_employees}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_field_employees: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
                />
              </label>
              <label className="text-[11px] font-bold text-slate-600 sm:text-xs">
                Max field managers
                <input
                  type="number"
                  min="0"
                  value={form.max_managers}
                  onChange={(e) =>
                    setForm({ ...form, max_managers: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
                />
              </label>
              <label className="text-[11px] font-bold text-slate-600 sm:text-xs">
                Data retention (days)
                <input
                  type="number"
                  min="1"
                  value={form.data_retention_days}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      data_retention_days: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
                />
              </label>
            </div>
            <button
              disabled={updateSettings.isPending}
              className="min-h-[42px] w-full rounded-lg bg-[#7A004B] py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:min-h-[44px] sm:text-sm"
            >
              {updateSettings.isPending ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const DUTY_STATUS_OPTIONS = [
  { value: "", label: "All duty status" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "offline", label: "Offline" },
  { value: "checked_out", label: "Checked out" },
];
const CHECKPOINT_STATUS_OPTIONS = [
  { value: "", label: "All checkpoints" },
  { value: "not_due", label: "Not due" },
  { value: "due", label: "Due" },
  { value: "overdue", label: "Overdue" },
];

function OverviewFilters({
  filters,
  onChange,
  teamOptions,
  canManageTeams,
  onExport,
}) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-1.5 sm:rounded-2xl sm:p-3">
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <input
          type="date"
          value={filters.date}
          onChange={set("date")}
          className="col-span-2 min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:col-auto sm:px-2.5 sm:text-sm"
        />
        <input
          type="text"
          placeholder="Search employee…"
          value={filters.employeeSearch || ""}
          onChange={set("employeeSearch")}
          className="col-span-2 min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:min-w-[140px] sm:flex-1 sm:px-2.5 sm:text-sm"
        />
        {canManageTeams && (
          <select
            value={filters.teamId}
            onChange={set("teamId")}
            className="min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:px-2.5 sm:text-sm"
          >
            <option value="">All teams</option>
            {teamOptions.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={filters.dutyStatus}
          onChange={set("dutyStatus")}
          className="min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:px-2.5 sm:text-sm"
        >
          {DUTY_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filters.checkpointStatus}
          onChange={set("checkpointStatus")}
          className="col-span-2 min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:col-auto sm:px-2.5 sm:text-sm"
        >
          {CHECKPOINT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(filters.date ||
          filters.teamId ||
          filters.dutyStatus ||
          filters.checkpointStatus ||
          filters.employeeSearch) && (
          <button
            onClick={() =>
              onChange({
                date: "",
                teamId: "",
                dutyStatus: "",
                checkpointStatus: "",
                employeeSearch: "",
              })
            }
            className="col-span-2 min-h-[32px] rounded-lg border border-slate-300 px-1.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 sm:col-auto sm:min-h-[34px] sm:px-2.5 sm:text-sm"
          >
            Clear all
          </button>
        )}
        {onExport && (
          <a
            href={onExport({
              from: filters.date || new Date().toISOString().slice(0, 10),
              to: filters.date || new Date().toISOString().slice(0, 10),
              teamId: filters.teamId,
              activityStatus: filters.dutyStatus,
            })}
            download
            className="col-span-2 inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-[#7A004B] px-1.5 py-1 text-[10px] font-bold text-[#7A004B] hover:bg-[#fdf0f6] sm:col-auto sm:min-h-[34px] sm:gap-1.5 sm:px-2.5 sm:text-xs"
          >
            <FiDownload size={11} /> Export CSV
          </a>
        )}
      </div>
    </div>
  );
}

function BulkAssignExcelModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [autoCreateTeams, setAutoCreateTeams] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!file) return toast.error("Choose a .xlsx, .xls or .csv file first");
    setBusy(true);
    setResult(null);
    try {
      const data = await uploadBulkAssignFile(file, autoCreateTeams);
      setResult(data);
      if (data.successCount) {
        toast.success(`${data.successCount} employee(s) assigned`);
        onDone?.();
      }
      if (data.failedCount && !data.successCount) {
        toast.error(`${data.failedCount} row(s) failed — see details below`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not process the file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-2 sm:p-4">
      <div className="mx-auto my-2 w-full max-w-lg rounded-xl bg-white p-3 shadow-2xl sm:my-8 sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-extrabold sm:text-lg">
            Bulk-assign via Excel
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 sm:text-sm">
          For assigning many employees at once. Prefer ticking checkboxes? Use
          "Bulk assign" on a team's card.
        </p>
        <a
          href={downloadBulkAssignTemplateUrl()}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-bold text-[#7A004B] sm:mt-3 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <FiUpload size={13} /> Download template (.xlsx)
        </a>
        <div className="mt-2.5 sm:mt-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-[11px] sm:text-sm"
          />
        </div>
        <label className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-600 sm:mt-3 sm:gap-2 sm:text-sm">
          <input
            type="checkbox"
            className="mt-0.5 shrink-0"
            checked={autoCreateTeams}
            onChange={(e) => setAutoCreateTeams(e.target.checked)}
          />
          Create any team named in the sheet that doesn't exist yet
        </label>
        <button
          type="button"
          disabled={busy || !file}
          onClick={submit}
          className="mt-3 min-h-[42px] w-full rounded-lg bg-[#7A004B] py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:mt-4 sm:min-h-[44px] sm:text-sm"
        >
          {busy ? "Processing…" : "Upload and assign"}
        </button>

        {result && (
          <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
            <div className="flex gap-3 text-xs sm:gap-4 sm:text-sm">
              <span className="font-bold text-emerald-600">
                {result.successCount} succeeded
              </span>
              <span className="font-bold text-rose-600">
                {result.failedCount} failed
              </span>
            </div>
            {result.failedCount > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg bg-rose-50 p-2 text-[10px] sm:text-xs">
                {result.failed.map((f, i) => (
                  <p key={i} className="py-0.5">
                    Row {f.row} ({f.employeeRef || "—"}): {f.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IndividualAssignmentsPanel() {
  const assignments = useFieldAssignments(true);
  const teamOptions = useFieldTeamOptions();
  const createAssignment = useCreateIndividualFieldAssignment();
  const removeAssignment = useRemoveIndividualFieldAssignment();
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({
    employeeId: "",
    managerId: "",
    territory: "",
  });

  useEffect(() => {
    teamOptions
      .mutateAsync()
      .then(setOptions)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await createAssignment.mutateAsync({
        ...form,
        managerId: form.managerId || undefined,
      });
      setForm({ employeeId: "", managerId: "", territory: "" });
      toast.success("Individual field assignment created");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not create assignment",
      );
    }
  };
  const remove = async (assignment) => {
    if (
      !window.confirm(
        `Remove ${assignment.employee?.f_name || "this employee"} from Field Work?`,
      )
    )
      return;
    try {
      await removeAssignment.mutateAsync(assignment._id);
      toast.success("Individual field assignment removed");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not remove assignment",
      );
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
      <h2 className="text-xs font-bold text-slate-900 sm:text-base">
        Individual field assignments
      </h2>
      <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">
        For field employees who do not belong to a team.
      </p>
      <form
        onSubmit={submit}
        className="mt-2 grid grid-cols-1 gap-1.5 sm:mt-3 sm:gap-2 md:grid-cols-4"
      >
        <select
          required
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        >
          <option value="">Choose employee</option>
          {(options?.employees || []).map((employee) => (
            <option key={employee._id} value={employee._id}>
              {employee.f_name} {employee.l_name}{" "}
              {employee.empid ? `(${employee.empid})` : ""}
            </option>
          ))}
        </select>
        <select
          value={form.managerId}
          onChange={(e) => setForm({ ...form, managerId: e.target.value })}
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        >
          <option value="">No manager</option>
          {(options?.managers || []).map((manager) => (
            <option key={manager._id} value={manager._id}>
              {manager.f_name} {manager.l_name}
            </option>
          ))}
        </select>
        <input
          value={form.territory}
          onChange={(e) => setForm({ ...form, territory: e.target.value })}
          placeholder="Territory (optional)"
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <button
          disabled={createAssignment.isPending}
          className="min-h-[36px] rounded-lg bg-[#7A004B] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 sm:min-h-[40px] sm:py-2 sm:text-sm"
        >
          Assign
        </button>
      </form>
      <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
        {(assignments.data?.assignments || []).map((assignment) => (
          <div
            key={assignment._id}
            className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] sm:gap-3 sm:rounded-xl sm:p-3 sm:text-sm"
          >
            <div className="min-w-0 flex-1">
              <b>
                {assignment.employee?.f_name} {assignment.employee?.l_name}
              </b>
              <span className="block text-slate-500 sm:inline">
                {" "}
                · {assignment.territory || "No territory"} · Manager:{" "}
                {assignment.manager
                  ? `${assignment.manager.f_name} ${assignment.manager.l_name}`
                  : "None"}
              </span>
            </div>
            <button
              onClick={() => remove(assignment)}
              className="shrink-0 text-rose-600"
              title="Remove assignment"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        ))}
        {!assignments.isLoading &&
          !(assignments.data?.assignments || []).length && (
            <p className="text-[11px] text-slate-500 sm:text-sm">
              No individual assignments.
            </p>
          )}
      </div>
    </section>
  );
}

function AssignedActivitiesPanel({ employees, visits }) {
  const assignActivity = useAssignFieldActivity();
  const reassignActivity = useReassignFieldActivity();
  const cancelActivity = useCancelFieldActivity();
  const [form, setForm] = useState({
    employeeId: "",
    customerName: "",
    activityType: "customer_visit",
    priority: "medium",
    scheduledDate: "",
    scheduledTime: "",
    purpose: "",
    expectedLatitude: "",
    expectedLongitude: "",
    expectedRadius: "",
  });
  const [reassignTo, setReassignTo] = useState({});
  const submit = async (event) => {
    event.preventDefault();
    const hasExpectedLocation =
      form.expectedLatitude !== "" ||
      form.expectedLongitude !== "" ||
      form.expectedRadius !== "";
    try {
      await assignActivity.mutateAsync({
        employeeId: form.employeeId,
        customerName: form.customerName,
        activityType: form.activityType,
        priority: form.priority,
        scheduledDate: form.scheduledDate || undefined,
        scheduledTime: form.scheduledTime,
        purpose: form.purpose,
        expectedLocation: hasExpectedLocation
          ? {
              latitude: Number(form.expectedLatitude),
              longitude: Number(form.expectedLongitude),
              radiusMeters: Number(form.expectedRadius),
            }
          : undefined,
      });
      setForm({
        employeeId: "",
        customerName: "",
        activityType: "customer_visit",
        priority: "medium",
        scheduledDate: "",
        scheduledTime: "",
        purpose: "",
        expectedLatitude: "",
        expectedLongitude: "",
        expectedRadius: "",
      });
      toast.success("Field activity assigned");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not assign activity",
      );
    }
  };
  const pending = visits.filter(
    (visit) => visit.assignmentType === "assigned" && visit.status === "pending",
  );
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
      <h2 className="text-xs font-bold text-slate-900 sm:text-base">
        Assigned field work
      </h2>
      <form
        onSubmit={submit}
        className="mt-2 grid grid-cols-1 gap-1.5 sm:mt-3 sm:gap-2 md:grid-cols-3"
      >
        <select
          required
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        >
          <option value="">Assign to employee</option>
          {employees.map((employee) => (
            <option key={employee._id} value={employee._id}>
              {employee.f_name} {employee.l_name}
            </option>
          ))}
        </select>
        <input
          required
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          placeholder="Customer / contact"
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <select
          value={form.activityType}
          onChange={(e) => setForm({ ...form, activityType: e.target.value })}
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        >
          {ACTIVITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {titleize(type)}
            </option>
          ))}
        </select>
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        >
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <input
          type="date"
          value={form.scheduledDate}
          onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <input
          type="time"
          value={form.scheduledTime}
          onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <input
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          placeholder="Purpose (optional)"
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <input
          type="number"
          step="any"
          value={form.expectedLatitude}
          onChange={(e) =>
            setForm({ ...form, expectedLatitude: e.target.value })
          }
          placeholder="Expected latitude"
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <input
          type="number"
          step="any"
          value={form.expectedLongitude}
          onChange={(e) =>
            setForm({ ...form, expectedLongitude: e.target.value })
          }
          placeholder="Expected longitude"
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <input
          type="number"
          min="1"
          value={form.expectedRadius}
          onChange={(e) => setForm({ ...form, expectedRadius: e.target.value })}
          placeholder="Allowed radius (m)"
          className="min-w-0 rounded-lg border px-2 py-1.5 text-xs sm:py-2 sm:text-sm"
        />
        <button
          disabled={assignActivity.isPending}
          className="min-h-[36px] rounded-lg bg-[#7A004B] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 sm:min-h-[40px] sm:py-2 sm:text-sm"
        >
          Create assigned work
        </button>
      </form>
      <div className="mt-2 space-y-1.5 sm:mt-4 sm:space-y-2">
        {pending.map((activity) => (
          <div
            key={activity._id}
            className="rounded-lg bg-slate-50 p-2 text-[11px] sm:rounded-xl sm:p-3 sm:text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="min-w-0">
                <b>{activity.customerName}</b> · {activity.employee?.f_name}{" "}
                {activity.employee?.l_name} · {titleize(activity.activityType)}
                {activity.scheduledTime ? ` · ${activity.scheduledTime}` : ""}
              </span>
              <StatusPill status="pending" />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
              <select
                value={reassignTo[activity._id] || ""}
                onChange={(e) =>
                  setReassignTo({
                    ...reassignTo,
                    [activity._id]: e.target.value,
                  })
                }
                className="min-w-0 flex-1 rounded border px-1.5 py-1 text-[10px] sm:flex-none sm:px-2 sm:text-xs"
              >
                <option value="">Reassign to…</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.f_name} {employee.l_name}
                  </option>
                ))}
              </select>
              <button
                disabled={
                  !reassignTo[activity._id] || reassignActivity.isPending
                }
                onClick={() =>
                  reassignActivity
                    .mutateAsync({
                      activityId: activity._id,
                      body: { employeeId: reassignTo[activity._id] },
                    })
                    .then(() => toast.success("Activity reassigned"))
                    .catch((e) =>
                      toast.error(
                        e?.response?.data?.message || "Could not reassign",
                      ),
                    )
                }
                className="shrink-0 rounded border px-1.5 py-1 text-[10px] font-bold text-[#7A004B] sm:px-2 sm:text-xs"
              >
                Reassign
              </button>
              <button
                onClick={() =>
                  cancelActivity
                    .mutateAsync({ activityId: activity._id })
                    .then(() => toast.success("Activity cancelled"))
                    .catch((e) =>
                      toast.error(
                        e?.response?.data?.message || "Could not cancel",
                      ),
                    )
                }
                className="shrink-0 rounded border border-rose-200 px-1.5 py-1 text-[10px] font-bold text-rose-600 sm:px-2 sm:text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
        {!pending.length && (
          <p className="text-[11px] text-slate-500 sm:text-sm">
            No pending assigned work for this date.
          </p>
        )}
      </div>
    </section>
  );
}

function AuditLogPanel() {
  const [page, setPage] = useState(1);
  const LIMIT = 10;
  const audit = useFieldAuditLog(true, page, LIMIT);
  const entries = audit.data?.entries || [];
  const total = audit.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        <h2 className="text-xs font-bold text-slate-900 sm:text-base">
          Field Work audit log
        </h2>
        <span className="text-[9px] font-semibold text-slate-400 sm:text-xs">
          {total === 0 ? "No entries" : `${from}–${to} of ${total}`}
        </span>
      </div>
      <div className="mt-2 -mx-2.5 overflow-x-auto px-2.5 sm:mt-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0">
        <table className="w-full min-w-[480px] text-left text-[10px] sm:min-w-[520px] sm:text-sm">
          <thead className="border-b text-[9px] uppercase text-slate-500 sm:text-xs">
            <tr>
              <th className="pb-1.5 pr-1.5 sm:pb-2 sm:pr-2">When</th>
              <th className="pb-1.5 pr-1.5 sm:pb-2 sm:pr-2">Actor</th>
              <th className="pb-1.5 pr-1.5 sm:pb-2 sm:pr-2">Action</th>
              <th className="pb-1.5 sm:pb-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id} className="border-b">
                <td className="py-1.5 pr-1.5 sm:py-2 sm:pr-2">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="pr-1.5 sm:pr-2">
                  {entry.actor?.name || entry.actor?.model || "System"}
                </td>
                <td className="pr-1.5 sm:pr-2">{titleize(entry.action)}</td>
                <td>{entry.target?.name || "—"}</td>
              </tr>
            ))}
            {!audit.isLoading && !entries.length && (
              <tr>
                <td colSpan="4" className="py-3 text-center text-slate-500 sm:py-4">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 sm:mt-3 sm:gap-2">
        <span className="text-[9px] text-slate-400 sm:text-xs">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-1.5 sm:gap-2">
          <button
            disabled={page === 1 || audit.isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border px-1.5 py-1 text-[10px] disabled:opacity-40 sm:px-2 sm:text-xs"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages || audit.isLoading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-1.5 py-1 text-[10px] disabled:opacity-40 sm:px-2 sm:text-xs"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function TeamDetailModal({ team, onClose }) {
  if (!team) return null;
  const members = team.members || [];
  const managers = team.managers || [];
  const teamColor = team.color || "#7A004B";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="relative overflow-hidden px-3 pb-3 pt-3 text-white sm:px-6 sm:pb-6 sm:pt-5">
          <div
            className="absolute inset-0 opacity-95"
            style={{
              background: `linear-gradient(135deg, ${teamColor}, #3f1230)`,
            }}
          />
          <div className="relative flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 sm:h-12 sm:w-12 sm:rounded-2xl">
                <FiUsers size={16} className="sm:hidden" />
                <FiUsers size={20} className="hidden sm:block" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 sm:text-[11px]">
                  Field team
                </p>
                <h2
                  id="team-detail-title"
                  className="truncate text-sm font-extrabold sm:text-xl"
                >
                  {team.name}
                </h2>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/80 sm:mt-1 sm:text-xs">
                  <FiMapPin size={10} />{" "}
                  <span className="truncate">
                    {team.territory || "No territory assigned"}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close team details"
              className="shrink-0 rounded-lg bg-white/10 p-1.5 text-white transition hover:bg-white/20 sm:rounded-xl sm:p-2"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] space-y-3 overflow-y-auto p-2.5 sm:space-y-5 sm:p-6">
          <div className="grid grid-cols-3 gap-1 sm:gap-3">
            <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-1.5 sm:rounded-2xl sm:p-3">
              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">
                Employees
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900 sm:mt-1 sm:text-xl">
                {members.length}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-1.5 sm:rounded-2xl sm:p-3">
              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">
                Managers
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900 sm:mt-1 sm:text-xl">
                {managers.length}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-1.5 sm:rounded-2xl sm:p-3">
              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">
                Dept.
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-slate-900 sm:mt-1 sm:text-sm">
                {team.department?.name || "Not set"}
              </p>
            </div>
          </div>

          <section>
            <div className="mb-1.5 flex items-center justify-between gap-1.5 sm:mb-2 sm:gap-2">
              <h3 className="text-[11px] font-extrabold text-slate-900 sm:text-sm">
                Team managers
              </h3>
              <span className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 sm:px-2 sm:py-1 sm:text-[11px]">
                {managers.length}
              </span>
            </div>
            {managers.length ? (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {managers.map((manager) => (
                  <div
                    key={manager._id}
                    className="flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1 sm:gap-2 sm:rounded-xl sm:px-2.5 sm:py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-extrabold text-violet-700 sm:h-8 sm:w-8 sm:text-xs">
                      {personInitials(manager)}
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-24 truncate text-[10px] font-bold text-slate-800 sm:max-w-36 sm:text-xs">
                        {personName(manager)}
                      </span>
                      <span className="block truncate text-[8px] text-slate-500 sm:text-[10px]">
                        {manager.empid || "Manager"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-[10px] text-slate-500 sm:rounded-xl sm:px-3 sm:py-3 sm:text-sm">
                No manager is assigned to this team yet.
              </p>
            )}
          </section>

          <section>
            <div className="mb-1.5 flex items-center justify-between gap-1.5 sm:mb-2 sm:gap-2">
              <h3 className="text-[11px] font-extrabold text-slate-900 sm:text-sm">
                Field employees
              </h3>
              <span className="shrink-0 rounded-full bg-[#fdf0f6] px-1.5 py-0.5 text-[9px] font-bold text-[#7A004B] sm:px-2 sm:py-1 sm:text-[11px]">
                {members.length}
              </span>
            </div>
            {members.length ? (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
                {members.map((member) => (
                  <div
                    key={member._id}
                    className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 sm:gap-2.5 sm:rounded-xl sm:p-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fdf0f6] text-[9px] font-extrabold text-[#7A004B] sm:h-9 sm:w-9 sm:text-xs">
                      {personInitials(member)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-bold text-slate-800 sm:text-sm">
                        {personName(member)}
                      </span>
                      <span className="block truncate text-[9px] text-slate-500 sm:text-[11px]">
                        {member.empid || "Field employee"}
                        {member.office_location
                          ? ` · ${member.office_location}`
                          : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-[10px] text-slate-500 sm:rounded-xl sm:px-3 sm:py-3 sm:text-sm">
                No field employees are assigned to this team yet.
              </p>
            )}
          </section>

          {team.geofence?.latitude != null &&
            team.geofence?.longitude != null && (
              <section className="rounded-lg border border-sky-100 bg-sky-50 p-2 sm:rounded-2xl sm:p-3.5">
                <div className="flex items-start gap-1.5 sm:gap-2.5">
                  <span className="shrink-0 rounded-lg bg-white p-1 text-sky-700 shadow-sm sm:rounded-xl sm:p-2">
                    <FiMapPin size={13} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-extrabold text-slate-900 sm:text-sm">
                      Geofence enabled
                    </h3>
                    <p className="mt-0.5 text-[9px] leading-4 text-slate-600 sm:text-xs sm:leading-5">
                      {team.geofence.radiusMeters
                        ? `${team.geofence.radiusMeters} m radius`
                        : "Radius not set"}{" "}
                      · {Number(team.geofence.latitude).toFixed(4)},{" "}
                      {Number(team.geofence.longitude).toFixed(4)}
                    </p>
                  </div>
                </div>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}

function ManagerDashboard({ canManageTeams, isSuperAdmin }) {
  const [filters, setFilters] = useState({
    date: "",
    teamId: "",
    dutyStatus: "",
    checkpointStatus: "",
    employeeSearch: "",
  });
  const teams = useFieldTeams(true);
  const [selected, setSelected] = useState(null);
  const [teamFormTarget, setTeamFormTarget] = useState(undefined);
  const [teamDetail, setTeamDetail] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBulkExcel, setShowBulkExcel] = useState(false);
  const [routeEmployeeId, setRouteEmployeeId] = useState(null);
  const [routeDate, setRouteDate] = useState("");
  const [rosterEmployees, setRosterEmployees] = useState([]);
  const teamOptionsMutation = useFieldTeamOptions();
  const { employeeSearch, ...serverFilters } = filters;
  const overview = useFieldOverview(true, serverFilters);
  const [teamSearch, setTeamSearch] = useState("");
  const [showAllOnMap, setShowAllOnMap] = useState(false);
  const deleteTeam = useDeleteFieldTeam();
  const canEditTeams = canManageTeams || isSuperAdmin;

  const live = overview.data?.live || [];
  const active = selected || live[0] || null;
  const isRefreshing = overview.isFetching;
  const lastUpdated = overview.dataUpdatedAt
    ? new Date(overview.dataUpdatedAt)
    : null;
  const activityEmployees = useMemo(() => {
    const people = new Map();
    (teams.data?.teams || []).forEach((team) =>
      (team.members || []).forEach((employee) =>
        people.set(employee._id, employee),
      ),
    );
    (overview.data?.visits || []).forEach((visit) => {
      if (visit.employee?._id) people.set(visit.employee._id, visit.employee);
    });
    return [...people.values()].sort((a, b) =>
      `${a.f_name || ""} ${a.l_name || ""}`.localeCompare(
        `${b.f_name || ""} ${b.l_name || ""}`,
      ),
    );
  }, [teams.data?.teams, overview.data?.visits]);

  useEffect(() => {
    teamOptionsMutation
      .mutateAsync()
      .then((data) => setRosterEmployees(data.employees || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeTeam = async (team) => {
    if (
      !window.confirm(
        `Remove "${team.name}"? Its members will become unassigned and can join another team.`,
      )
    )
      return;
    try {
      await deleteTeam.mutateAsync(team._id);
      await teams.refetch();
      overview.refetch();
      toast.success("Field team removed");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not remove team");
    }
  };

  const allTeams = teams.data?.teams || [];
  const q = teamSearch.trim().toLowerCase();
  const filteredTeams = useMemo(
    () =>
      !q
        ? allTeams
        : allTeams.filter(
            (t) =>
              (t.name || "").toLowerCase().includes(q) ||
              (t.territory || "").toLowerCase().includes(q),
          ),
    [allTeams, q],
  );

  const filteredLive = useMemo(() => {
    const list = overview.data?.live || [];
    const empQ = (filters.employeeSearch || "").trim().toLowerCase();
    return list.filter((s) => {
      if (filters.date) {
        const d = new Date(filters.date);
        const sDate = s.lastSeenAt ? new Date(s.lastSeenAt) : null;
        if (
          !sDate ||
          sDate.toISOString().slice(0, 10) !== d.toISOString().slice(0, 10)
        )
          return false;
      }
      if (filters.teamId && s.team?._id !== filters.teamId) return false;
      if (filters.dutyStatus && s.status !== filters.dutyStatus) return false;
      if (filters.checkpointStatus) {
        const cs = s.checkpointStatus || "not_due";
        if (cs !== filters.checkpointStatus) return false;
      }
      if (empQ) {
        const name =
          `${s.employee?.f_name || ""} ${s.employee?.l_name || ""}`.toLowerCase();
        if (!name.includes(empQ)) return false;
      }
      return true;
    });
  }, [overview.data?.live, filters]);

  const visibleTeams = useMemo(() => {
    let list = filteredTeams;
    if (filters.teamId) {
      list = list.filter((t) => t._id === filters.teamId);
    }
    return list;
  }, [filteredTeams, filters.teamId]);

  return (
    <div className="w-full space-y-2 p-2 pb-20 sm:space-y-4 sm:p-4 sm:pb-6 lg:space-y-5 lg:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#7A004B] sm:text-xs">
            Field Operations
          </p>
          <h1 className="mt-0.5 text-base font-extrabold text-slate-900 sm:mt-1 sm:text-xl lg:text-2xl">
            Live field map
          </h1>
          <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-sm">
            {isRefreshing
              ? "Refreshing live field data…"
              : lastUpdated
                ? `Last refreshed ${formatTime(lastUpdated)} · auto-refresh every 10s.`
                : "Loading live field data…"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
          <button
            onClick={() => overview.refetch()}
            disabled={isRefreshing}
            className="inline-flex min-h-[36px] min-w-0 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-bold disabled:cursor-wait disabled:opacity-60 sm:min-h-[38px] sm:gap-2 sm:px-3 sm:text-sm"
          >
            <FiRefreshCw
              className={isRefreshing ? "animate-spin" : ""}
              size={12}
            />
            <span className="truncate">
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </span>
          </button>
          <button
            onClick={() => setShowAllOnMap((v) => !v)}
            className={`inline-flex min-h-[36px] min-w-0 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-bold sm:min-h-[38px] sm:gap-2 sm:px-3 sm:text-sm ${
              showAllOnMap ? "bg-[#7A004B] text-white" : ""
            }`}
          >
            <FiUsers size={12} />
            <span className="truncate">
              {showAllOnMap ? "Hide all" : "Show all"}
            </span>
          </button>
          {canEditTeams ? (
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex min-h-[36px] min-w-0 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-bold sm:min-h-[38px] sm:gap-2 sm:px-3 sm:text-sm"
            >
              <FiSettings size={12} />
              <span className="truncate">Settings</span>
            </button>
          ) : null}
          {canEditTeams ? (
            <button
              onClick={() => setShowBulkExcel(true)}
              className="inline-flex min-h-[36px] min-w-0 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-bold sm:min-h-[38px] sm:gap-2 sm:px-3 sm:text-sm"
            >
              <FiUpload size={12} />
              <span className="truncate">Bulk Excel</span>
            </button>
          ) : null}
          {canEditTeams ? (
            <button
              onClick={() => setTeamFormTarget(null)}
              className="col-span-2 inline-flex min-h-[40px] items-center justify-center gap-1 rounded-lg bg-[#7A004B] px-2.5 py-2 text-[10px] font-bold text-white sm:col-auto sm:min-h-[38px] sm:gap-2 sm:px-3 sm:text-sm"
            >
              <FiUsers size={12} /> Create field team
            </button>
          ) : null}
        </div>
      </header>
      <OverviewFilters
        filters={filters}
        onChange={setFilters}
        teamOptions={teams.data?.teams || []}
        canManageTeams={canManageTeams || isSuperAdmin}
        onExport={exportFieldActivitiesCsvUrl}
      />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
        <Stat
          icon={<FiActivity />}
          label="Active"
          value={overview.data?.summary?.active || 0}
        />
        <Stat
          icon={<FiWifiOff />}
          label="Offline"
          value={overview.data?.summary?.offline || 0}
        />
        <Stat
          icon={<FiCheckCircle />}
          label="Visits"
          value={overview.data?.summary?.completedVisits || 0}
        />
        <Stat
          icon={<FiAlertTriangle />}
          label="Overdue"
          value={overview.data?.summary?.checkpointOverdue || 0}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="min-w-0 space-y-2 sm:space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-2 sm:rounded-2xl sm:p-3">
            <LiveMap
              session={active}
              big={false}
              height={200}
              markers={
                showAllOnMap
                  ? [
                      ...live
                        .filter((s) => s.lastLocation && s._id !== active?._id)
                        .map((s) => ({
                          latitude: Number(s.lastLocation.latitude),
                          longitude: Number(s.lastLocation.longitude),
                          type: "live",
                          presence: getPresence(s).state,
                          label: `${s.employee?.f_name} ${s.employee?.l_name} · ${getPresence(s).label}`,
                          accuracy: Number(s.lastLocation.accuracy),
                          timestamp: s.lastSeenAt,
                        })),
                      ...(overview.data?.visits || [])
                        .filter((v) => (v.attachments || []).length)
                        .flatMap((v) => {
                          const latestUrl =
                            v.attachments[v.attachments.length - 1];
                          const own = (v.attachmentLocations || []).find(
                            (entry) => entry.url === latestUrl,
                          );
                          const loc =
                            own &&
                            Number.isFinite(own.latitude) &&
                            Number.isFinite(own.longitude)
                              ? own
                              : v.endLocation || v.startLocation;
                          if (!loc) return [];
                          return [
                            {
                              latitude: Number(loc.latitude),
                              longitude: Number(loc.longitude),
                              type: "photo",
                              photoUrl: latestUrl,
                              label: `${v.customerName || titleize(v.activityType)} — visit photo`,
                              timestamp:
                                own?.capturedAt || v.endedAt || v.startedAt,
                            },
                          ];
                        }),
                    ]
                  : []
              }
            />
            {!active && (
              <div className="mt-2 grid h-16 place-items-center rounded-lg bg-slate-50 p-2 text-center text-[10px] text-slate-500 sm:mt-3 sm:h-24 sm:rounded-xl sm:p-4 sm:text-sm">
                No employee is currently active in the field right now
              </div>
            )}
            {active && (
              <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-slate-50 p-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-xl sm:p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900 sm:text-base">
                    {active.employee?.f_name} {active.employee?.l_name}
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-500 sm:text-xs">
                    {active.team?.name || "Field team"} ·{" "}
                    {formatTime(active.lastSeenAt)} ·{" "}
                    {formatDistance(active.totalDistanceMeters)} today
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <PresenceDot session={active} />
                  <ShareOnWhatsAppButton session={active} />
                  <StatusPill status={active.status} />
                </div>
              </div>
            )}
          </div>
          <RouteTrail
            employeeId={
              routeEmployeeId ||
              active?.employee?._id ||
              activityEmployees[0]?._id
            }
            date={routeDate}
            showPicker={true}
            employees={rosterEmployees}
            selectedEmployeeId={routeEmployeeId}
            onEmployeeChange={setRouteEmployeeId}
            onDateChange={setRouteDate}
            big={false}
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-2 sm:rounded-2xl sm:p-3">
          <h2 className="px-1 pb-1.5 text-xs font-bold text-slate-900 sm:pb-3 sm:text-base">
            Field employees ({filteredLive.length})
          </h2>
          <div className="max-h-[380px] space-y-1.5 overflow-y-auto sm:max-h-[420px] sm:space-y-2">
            {filteredLive.length ? (
              filteredLive.map((item) => (
                <button
                  key={item._id}
                  onClick={() => setSelected(item)}
                  className={`w-full rounded-lg p-2 text-left sm:rounded-xl sm:p-3 ${active?._id === item._id ? "bg-[#fdf0f6] ring-1 ring-[#d7a6c0]" : "bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-slate-900 sm:text-sm">
                        {item.employee?.f_name} {item.employee?.l_name}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-500 sm:text-xs">
                        {item.team?.territory ||
                          item.employee?.office_location ||
                          "No territory"}
                      </p>
                      <div className="mt-1">
                        <PresenceDot session={item} />
                      </div>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px] text-slate-500 sm:gap-2 sm:text-[11px]">
                    <span>
                      {formatDistance(item.totalDistanceMeters)} travelled
                    </span>
                    {item.checkpoint?.status === "overdue" && (
                      <span className="flex items-center gap-0.5 font-bold text-rose-600 sm:gap-1">
                        <FiAlertTriangle size={9} /> Overdue
                      </span>
                    )}
                    {item.checkpoint?.status === "due" && (
                      <span className="flex items-center gap-0.5 font-bold text-amber-600 sm:gap-1">
                        <FiClock size={9} /> Due
                      </span>
                    )}
                    {item.geofenceExitCount > 0 && (
                      <span className="flex items-center gap-0.5 font-bold text-amber-600 sm:gap-1">
                        <FiAlertTriangle size={9} /> {item.geofenceExitCount}{" "}
                        exit{item.geofenceExitCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-2.5 text-center text-[10px] text-slate-500 sm:rounded-xl sm:p-4 sm:text-sm">
                No field employee is on duty right now.
              </p>
            )}
          </div>
        </section>
      </div>
      <FieldVisitsSection
        canManageTeams={canManageTeams || isSuperAdmin}
        onExport={exportFieldActivitiesCsvUrl}
      />
      <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A004B] sm:text-xs">
              Team workspace
            </p>
            <h2 className="mt-0.5 text-xs font-bold text-slate-900 sm:mt-1 sm:text-base">
              Your field teams
            </h2>
            <p className="mt-0.5 text-[9px] text-slate-500 sm:mt-1 sm:text-xs">
              Select a team to view people, territory and geofence details.
            </p>
          </div>
          <input
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="Search team name…"
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs outline-none transition focus:border-[#7A004B] focus:ring-2 focus:ring-[#7A004B]/10 sm:w-56 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {visibleTeams.map((team) => (
            <div
              key={team._id}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setTeamDetail(team);
                }
              }}
              className="group relative min-w-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#d7a6c0] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#7A004B]/20 sm:rounded-2xl sm:p-4"
              onClick={() => setTeamDetail(team)}
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5 sm:h-1"
                style={{ backgroundColor: team.color || "#7A004B" }}
              />
              <div className="flex items-start gap-2 sm:gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm sm:h-10 sm:w-10 sm:rounded-xl"
                  style={{ backgroundColor: team.color || "#7A004B" }}
                >
                  <FiUsers size={14} className="sm:hidden" />
                  <FiUsers size={18} className="hidden sm:block" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-900 sm:text-base">
                    {team.name}
                  </p>
                  <p className="truncate text-[9px] text-slate-500 sm:text-xs">
                    {team.territory || "No territory"} ·{" "}
                    {team.members?.length || 0} employee(s)
                  </p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
                <div className="min-w-0 rounded-md bg-slate-50 px-1.5 py-1 sm:rounded-xl sm:px-2.5 sm:py-2">
                  <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                    Employees
                  </p>
                  <p className="mt-0.5 text-[11px] font-extrabold text-slate-800 sm:text-sm">
                    {team.members?.length || 0}
                  </p>
                </div>
                <div className="min-w-0 rounded-md bg-slate-50 px-1.5 py-1 sm:rounded-xl sm:px-2.5 sm:py-2">
                  <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                    Managers
                  </p>
                  <p className="mt-0.5 text-[11px] font-extrabold text-slate-800 sm:text-sm">
                    {team.managers?.length || 0}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2 sm:mt-3 sm:gap-2 sm:pt-3">
                <span className="min-w-0 truncate text-[9px] font-medium text-slate-500 sm:text-[11px]">
                  {team.department?.name || "No department"}
                </span>
                <span className="shrink-0 text-[10px] font-bold text-[#7A004B] sm:text-xs">
                  View →
                </span>
              </div>
              {canEditTeams && (
                <div
                  className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2 text-[10px] font-bold sm:mt-3 sm:gap-2 sm:pt-3 sm:text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setTeamFormTarget(team)}
                    className="rounded-md bg-[#fdf0f6] px-2 py-1 text-[#7A004B] transition hover:bg-[#f7dce9] sm:rounded-lg sm:px-2.5 sm:py-1.5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeTeam(team)}
                    className="rounded-md bg-rose-50 px-2 py-1 text-rose-600 transition hover:bg-rose-100 sm:rounded-lg sm:px-2.5 sm:py-1.5"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
          {!visibleTeams.length && (
            <p className="text-[11px] text-slate-500 sm:text-sm">
              {teams.data?.teams?.length
                ? "No teams match your search."
                : "Create a team and assign a manager and field employees to begin."}
            </p>
          )}
        </div>
      </section>
      {canEditTeams && <IndividualAssignmentsPanel />}
      {teamDetail && (
        <TeamDetailModal
          team={teamDetail}
          onClose={() => setTeamDetail(null)}
        />
      )}
      {teamFormTarget !== undefined && (
        <TeamSetupForm
          team={teamFormTarget}
          onClose={() => setTeamFormTarget(undefined)}
          onSaved={() => {
            setTeamFormTarget(undefined);
            teams.refetch();
          }}
        />
      )}
      {showBulkExcel && (
        <BulkAssignExcelModal
          onClose={() => setShowBulkExcel(false)}
          onDone={() => {
            teams.refetch();
            overview.refetch();
          }}
        />
      )}
      {showSettings && (
        <SettingsPanel
          isSuperAdmin={isSuperAdmin}
          onClose={() => {
            setShowSettings(false);
            overview.refetch();
          }}
        />
      )}
    </div>
  );
}

function FieldVisitsSection({ canManageTeams, onExport }) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    teamId: "",
    status: "",
    activityType: "",
    employeeSearch: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const visitsQuery = useAllFieldVisits(true, {
    ...filters,
    page,
    limit: pageSize,
  });
  const teamsQuery = useFieldTeams(true);
  const teamOptions = teamsQuery.data?.teams || [];

  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  const exportUrl = onExport
    ? onExport({
        from: filters.from,
        to: filters.to,
        teamId: filters.teamId,
        status: filters.status,
        activityType: filters.activityType,
        employeeSearch: filters.employeeSearch,
      })
    : "";

  const visits = visitsQuery.data?.visits || [];
  const total = visitsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, total);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 sm:rounded-2xl sm:p-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <h2 className="text-xs font-bold text-slate-900 sm:text-base">
          Field visits
        </h2>
        <div className="flex items-center gap-2">
          {exportUrl ? (
            <a
              href={exportUrl}
              download
              className="inline-flex items-center gap-1 rounded-lg border border-[#7A004B] px-2 py-1 text-[10px] font-bold text-[#7A004B] hover:bg-[#fdf0f6] sm:gap-1.5 sm:px-2.5 sm:text-xs"
            >
              <FiDownload size={11} /> Export Visits
            </a>
          ) : null}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <input
          type="date"
          value={filters.from}
          onChange={set("from")}
          className="min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:px-2.5 sm:text-sm"
        />
        <div className="flex min-w-0 items-center gap-1 sm:contents">
          <span className="shrink-0 text-[9px] text-slate-400 sm:text-xs">
            to
          </span>
          <input
            type="date"
            value={filters.to}
            onChange={set("to")}
            className="min-w-0 flex-1 rounded-lg border px-1.5 py-1.5 text-[10px] sm:flex-none sm:px-2.5 sm:text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Search employee name…"
          value={filters.employeeSearch}
          onChange={set("employeeSearch")}
          className="col-span-2 min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:min-w-[140px] sm:flex-1 sm:px-2.5 sm:text-sm"
        />
        {canManageTeams && (
          <select
            value={filters.teamId}
            onChange={set("teamId")}
            className="min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:px-2.5 sm:text-sm"
          >
            <option value="">All teams</option>
            {teamOptions.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={filters.status}
          onChange={set("status")}
          className="min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:px-2.5 sm:text-sm"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="skipped">Skipped</option>
          <option value="follow_up_required">Follow up</option>
          <option value="in_progress">In progress</option>
        </select>
        <select
          value={filters.activityType}
          onChange={set("activityType")}
          className="col-span-2 min-w-0 rounded-lg border px-1.5 py-1.5 text-[10px] sm:col-auto sm:px-2.5 sm:text-sm"
        >
          <option value="">All types</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {titleize(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 -mx-2.5 overflow-x-auto px-2.5 sm:mt-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0">
        {visitsQuery.isLoading ? (
          <p className="text-[11px] text-slate-500 sm:text-sm">
            Loading visits…
          </p>
        ) : visitsQuery.isError ? (
          <p className="text-[11px] font-medium text-rose-700 sm:text-sm">
            Unable to load field visits.
          </p>
        ) : visits.length === 0 ? (
          <p className="text-[11px] text-slate-500 sm:text-sm">
            No visits recorded for this date range.
          </p>
        ) : (
          <table className="w-full min-w-[520px] text-left text-[10px] sm:min-w-[640px] sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">Employee</th>
                <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">Team</th>
                <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">Customer</th>
                <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">Type</th>
                <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">Start</th>
                <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">End</th>
                <th className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">Dur</th>
                <th className="py-1.5 sm:py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v._id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-1.5 font-medium sm:py-2 sm:pr-3">
                    {v.employee
                      ? `${v.employee.f_name || ""} ${v.employee.l_name || ""}`.trim()
                      : "—"}
                  </td>
                  <td className="py-1.5 pr-1.5 text-slate-500 sm:py-2 sm:pr-3">
                    {v.team?.name || "—"}
                  </td>
                  <td className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">
                    {v.customerName || "—"}
                  </td>
                  <td className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">
                    {titleize(v.activityType)}
                  </td>
                  <td className="py-1.5 pr-1.5 text-slate-500 sm:py-2 sm:pr-3">
                    {v.startedAt ? formatTime(v.startedAt) : "—"}
                  </td>
                  <td className="py-1.5 pr-1.5 text-slate-500 sm:py-2 sm:pr-3">
                    {v.endedAt ? formatTime(v.endedAt) : "—"}
                  </td>
                  <td className="py-1.5 pr-1.5 sm:py-2 sm:pr-3">
                    {v.startedAt && v.endedAt
                      ? `${Math.round(
                          (new Date(v.endedAt) - new Date(v.startedAt)) / 60000,
                        )}m`
                      : "—"}
                  </td>
                  <td className="py-1.5 sm:py-2">
                    <StatusPill status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {total > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200 pt-2 sm:mt-3 sm:gap-2 sm:pt-3">
          <p className="text-[9px] text-slate-500 sm:text-xs">
            Showing {firstRecord}–{lastRecord} of {total} visits
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || visitsQuery.isFetching}
              className="rounded-lg border border-slate-300 px-1.5 py-1 text-[10px] font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5 sm:text-xs"
            >
              Prev
            </button>
            <span className="text-[9px] font-medium text-slate-600 sm:text-xs">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || visitsQuery.isFetching}
              className="rounded-lg border border-slate-300 px-1.5 py-1 text-[10px] font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5 sm:text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 sm:rounded-2xl sm:p-4">
      <div className="flex items-center gap-1 text-[#7A004B] sm:gap-2">
        <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-3 sm:[&_svg]:h-4 sm:[&_svg]:w-4">
          {icon}
        </span>
        <span className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
          {label}
        </span>
      </div>
      <p className="mt-1 text-base font-extrabold text-slate-900 sm:mt-2 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

export default function FieldOperations() {
  const { data: auth } = useAuth();
  const role = auth?.role;
  const isEmployee = role === "employee";

  return isEmployee ? (
    <EmployeeDuty auth={auth} />
  ) : (
    <ManagerDashboard
      canManageTeams={role === "admin"}
      isSuperAdmin={role === "superadmin"}
    />
  );
}