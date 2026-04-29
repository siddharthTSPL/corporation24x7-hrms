import { useState, useEffect, useRef, useCallback } from "react";
import { useCheckin, useActivity, useCheckout } from "../../auth/server-state/attendance/attendance.hook";

// ─── Constants ────────────────────────────────────────────────────────────────
const PING_INTERVAL_MS      = 60_000;   // send activity ping every 1 min
const IDLE_DETECTION_MS     = 120_000;  // no browser event for 2min = idle flag
const FOCUS_GRACE_PERIOD_MS = 600_000;  // tab unfocused for 10min = idle (coding grace)
const STILL_WORKING_AFTER   = 300_000;  // show "Still Working?" prompt after 5min idle

const STORAGE_KEY = "attendance_session";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDuration = (ms) => {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const saveSession = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
};

const loadSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
};

const clearSession = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAttendanceTracker = () => {
  const [isCheckedIn,      setIsCheckedIn]      = useState(false);
  const [checkInTime,      setCheckInTime]      = useState(null);    // ISO string
  const [activeMinutes,    setActiveMinutes]    = useState(0);
  const [idleMinutes,      setIdleMinutes]      = useState(0);
  const [activityStatus,   setActivityStatus]   = useState("idle");  // "active"|"idle"
  const [elapsedTime,      setElapsedTime]      = useState("00:00:00");
  const [showStillWorking, setShowStillWorking] = useState(false);
  const [lastPingResult,   setLastPingResult]   = useState(null);
  const [isLoading,        setIsLoading]        = useState(false);
  const [error,            setError]            = useState(null);

  // Refs — mutations assigned later
  const checkinMutation  = useCheckin();
  const activityMutation = useActivity();
  const checkoutMutation = useCheckout();

  // Internal refs (not causing re-renders)
  const lastBrowserActivityRef = useRef(Date.now());  // last mouse/key event
  const tabHiddenAtRef         = useRef(null);        // timestamp when tab was hidden
  const wasActiveThisMinuteRef = useRef(false);        // any event in current window?
  const pingIntervalRef        = useRef(null);
  const clockIntervalRef       = useRef(null);
  const idlePromptTimerRef     = useRef(null);
  const checkInTimeRef         = useRef(null);        // mirrors state for closures

  // ── Keep checkInTimeRef in sync ──
  useEffect(() => { checkInTimeRef.current = checkInTime; }, [checkInTime]);

  // ── Restore persisted session on mount ──
  useEffect(() => {
    const session = loadSession();
    if (session?.isCheckedIn && session?.checkInTime) {
      setIsCheckedIn(true);
      setCheckInTime(session.checkInTime);
      setActiveMinutes(session.activeMinutes ?? 0);
      setIdleMinutes(session.idleMinutes ?? 0);
    }
  }, []);

  // ── Determine current activity status ──
  const computeActivityStatus = useCallback(() => {
    const now = Date.now();
    const browserIdle  = now - lastBrowserActivityRef.current > IDLE_DETECTION_MS;
    const tabAwayTooLong =
      tabHiddenAtRef.current !== null &&
      now - tabHiddenAtRef.current > FOCUS_GRACE_PERIOD_MS;

    return browserIdle || tabAwayTooLong ? "idle" : "active";
  }, []);

  // ── Browser activity event handler ──
  const handleBrowserActivity = useCallback(() => {
    const now = Date.now();
    lastBrowserActivityRef.current = now;
    wasActiveThisMinuteRef.current = true;

    // If the "still working" prompt is visible and user comes back, auto-dismiss
    setShowStillWorking(false);
    clearTimeout(idlePromptTimerRef.current);

    const status = computeActivityStatus();
    setActivityStatus(status);
  }, [computeActivityStatus]);

  // ── Page Visibility change ──
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      tabHiddenAtRef.current = Date.now();
    } else {
      // Tab came back into focus
      const wasAway = tabHiddenAtRef.current;
      tabHiddenAtRef.current = null;

      if (wasAway) {
        const awayMs = Date.now() - wasAway;
        // If they were away < grace period, treat as active (probably coding)
        if (awayMs < FOCUS_GRACE_PERIOD_MS) {
          wasActiveThisMinuteRef.current = true;
          lastBrowserActivityRef.current = Date.now();
        }
      }

      setShowStillWorking(false);
      clearTimeout(idlePromptTimerRef.current);
      setActivityStatus(computeActivityStatus());
    }
  }, [computeActivityStatus]);

  // ── Send activity ping to backend ──
  const sendActivityPing = useCallback(async () => {
    const status = wasActiveThisMinuteRef.current ? "active" : computeActivityStatus();
    wasActiveThisMinuteRef.current = false; // reset window

    setActivityStatus(status);

    // Show "still working?" if idle for a while
    if (status === "idle") {
      clearTimeout(idlePromptTimerRef.current);
      idlePromptTimerRef.current = setTimeout(() => {
        setShowStillWorking(true);
      }, STILL_WORKING_AFTER);
    } else {
      clearTimeout(idlePromptTimerRef.current);
      setShowStillWorking(false);
    }

    activityMutation.mutate(status, {
      onSuccess: (data) => {
        setActiveMinutes(data.activeMinutes);
        setIdleMinutes(data.idleMinutes);
        setLastPingResult({ status, time: new Date() });

        // Persist updated minutes
        const session = loadSession();
        if (session) {
          saveSession({
            ...session,
            activeMinutes: data.activeMinutes,
            idleMinutes: data.idleMinutes,
          });
        }
      },
      onError: (err) => {
        // 429 = rate limited (server's 1-min guard), silently ignore
        if (err?.response?.status !== 429) {
          console.error("Activity ping failed:", err);
        }
      },
    });
  }, [activityMutation, computeActivityStatus]);

  // ── Start/stop tracking loops ──
  const startTracking = useCallback(
    (checkInISO) => {
      // Event listeners
      const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "click", "touchstart"];
      EVENTS.forEach((e) =>
        window.addEventListener(e, handleBrowserActivity, { passive: true })
      );
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Ping loop (every 60s)
      pingIntervalRef.current = setInterval(sendActivityPing, PING_INTERVAL_MS);

      // Clock loop (every 1s)
      clockIntervalRef.current = setInterval(() => {
        const start = checkInISO ? new Date(checkInISO).getTime() : Date.now();
        setElapsedTime(formatDuration(Date.now() - start));
        setActivityStatus(computeActivityStatus());
      }, 1_000);

      // Initial activity status
      lastBrowserActivityRef.current = Date.now();
      wasActiveThisMinuteRef.current = true;
      setActivityStatus("active");
    },
    [handleBrowserActivity, handleVisibilityChange, sendActivityPing, computeActivityStatus]
  );

  const stopTracking = useCallback(() => {
    const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "click", "touchstart"];
    EVENTS.forEach((e) => window.removeEventListener(e, handleBrowserActivity));
    document.removeEventListener("visibilitychange", handleVisibilityChange);

    clearInterval(pingIntervalRef.current);
    clearInterval(clockIntervalRef.current);
    clearTimeout(idlePromptTimerRef.current);
  }, [handleBrowserActivity, handleVisibilityChange]);

  // ── Wire up tracking when checked in ──
  useEffect(() => {
    if (isCheckedIn && checkInTime) {
      startTracking(checkInTime);
    }
    return () => stopTracking();
  }, [isCheckedIn, checkInTime]); // eslint-disable-line

  // ── Clock tick even before check-in (just keeps time correct) ──
  useEffect(() => {
    if (!isCheckedIn || !checkInTime) {
      setElapsedTime("00:00:00");
    }
  }, [isCheckedIn, checkInTime]);

  // ─── Public API ─────────────────────────────────────────────────────────────

  const handleCheckin = useCallback(
    async ({ latitude, longitude, selfie }) => {
      setIsLoading(true);
      setError(null);
      return new Promise((resolve, reject) => {
        checkinMutation.mutate(
          { latitude, longitude, selfie },
          {
            onSuccess: (data) => {
              const time = data.attendance?.checkIn ?? new Date().toISOString();
              setIsCheckedIn(true);
              setCheckInTime(time);
              setActiveMinutes(0);
              setIdleMinutes(0);
              saveSession({ isCheckedIn: true, checkInTime: time, activeMinutes: 0, idleMinutes: 0 });
              setIsLoading(false);
              resolve(data);
            },
            onError: (err) => {
              setError(err?.response?.data?.message ?? "Check-in failed");
              setIsLoading(false);
              reject(err);
            },
          }
        );
      });
    },
    [checkinMutation]
  );

  const handleCheckout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      checkoutMutation.mutate(undefined, {
        onSuccess: (data) => {
          stopTracking();
          setIsCheckedIn(false);
          setCheckInTime(null);
          setElapsedTime("00:00:00");
          setActiveMinutes(0);
          setIdleMinutes(0);
          setShowStillWorking(false);
          clearSession();
          setIsLoading(false);
          resolve(data);
        },
        onError: (err) => {
          setError(err?.response?.data?.message ?? "Checkout failed");
          setIsLoading(false);
          reject(err);
        },
      });
    });
  }, [checkoutMutation, stopTracking]);

  // "I'm still working" button handler
  const confirmStillWorking = useCallback(() => {
    lastBrowserActivityRef.current = Date.now();
    wasActiveThisMinuteRef.current = true;
    tabHiddenAtRef.current = null;
    setActivityStatus("active");
    setShowStillWorking(false);
    clearTimeout(idlePromptTimerRef.current);
    // Immediately send an active ping
    sendActivityPing();
  }, [sendActivityPing]);

  // ── Derived stats ──
  const totalMinutes       = activeMinutes + idleMinutes;
  const activePercent      = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 0;
  const productivityStatus =
    activePercent >= 70 ? "High"   :
    activePercent >= 40 ? "Medium" : "Low";

  return {
    // State
    isCheckedIn,
    checkInTime,
    activeMinutes,
    idleMinutes,
    totalMinutes,
    activePercent,
    productivityStatus,
    activityStatus,     // real-time: "active"|"idle"
    elapsedTime,        // "HH:MM:SS"
    showStillWorking,
    lastPingResult,
    isLoading,
    error,
    handleCheckin,
    handleCheckout,
    confirmStillWorking,
    clearError: () => setError(null),
  };
};