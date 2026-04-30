import { useState, useEffect, useRef, useCallback } from "react";
import { useTodayAttendance, useCheckin, useActivity, useCheckout } from "../../auth/server-state/attendance/attendance.hook";

const PING_INTERVAL_MS      = 60_000;
const IDLE_DETECTION_MS     = 120_000;
const FOCUS_GRACE_PERIOD_MS = 600_000;
const STILL_WORKING_AFTER   = 300_000;
const STORAGE_KEY           = "attendance_session";

const formatDuration = (ms) => {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const saveSession  = (data) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {} };
const clearSession = ()     => { try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} };

export const useAttendanceTracker = () => {
  const [isCheckedIn,      setIsCheckedIn]      = useState(false);
  const [checkInTime,      setCheckInTime]      = useState(null);
  const [activeMinutes,    setActiveMinutes]    = useState(0);
  const [idleMinutes,      setIdleMinutes]      = useState(0);
  const [activityStatus,   setActivityStatus]   = useState("idle");
  const [elapsedTime,      setElapsedTime]      = useState("00:00:00");
  const [showStillWorking, setShowStillWorking] = useState(false);
  const [lastPingResult,   setLastPingResult]   = useState(null);
  const [isLoading,        setIsLoading]        = useState(false);
  const [error,            setError]            = useState(null);

  const { data: todayData }  = useTodayAttendance();
  const checkinMutation      = useCheckin();
  const activityMutation     = useActivity();
  const checkoutMutation     = useCheckout();

  const lastBrowserActivityRef = useRef(Date.now());
  const tabHiddenAtRef         = useRef(null);
  const wasActiveThisMinuteRef = useRef(false);
  const pingIntervalRef        = useRef(null);
  const clockIntervalRef       = useRef(null);
  const idlePromptTimerRef     = useRef(null);
  const checkInTimeRef         = useRef(null);
  const sessionRestoredRef     = useRef(false);

  useEffect(() => { checkInTimeRef.current = checkInTime; }, [checkInTime]);

  // ── Restore from backend on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!todayData || sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    if (todayData.isCheckedIn && todayData.attendance) {
      const att  = todayData.attendance;
      const time = att.checkIn;
      setIsCheckedIn(true);
      setCheckInTime(time);
      setActiveMinutes(att.activeMinutes ?? 0);
      setIdleMinutes(att.idleMinutes     ?? 0);
      saveSession({ isCheckedIn: true, checkInTime: time, activeMinutes: att.activeMinutes ?? 0, idleMinutes: att.idleMinutes ?? 0 });
    } else {
      setIsCheckedIn(false);
      setCheckInTime(null);
      setActiveMinutes(0);
      setIdleMinutes(0);
      clearSession();
    }
  }, [todayData]);

  const computeActivityStatus = useCallback(() => {
    const now            = Date.now();
    const browserIdle    = now - lastBrowserActivityRef.current > IDLE_DETECTION_MS;
    const tabAwayTooLong = tabHiddenAtRef.current !== null && now - tabHiddenAtRef.current > FOCUS_GRACE_PERIOD_MS;
    return browserIdle || tabAwayTooLong ? "idle" : "active";
  }, []);

  const handleBrowserActivity = useCallback(() => {
    lastBrowserActivityRef.current = Date.now();
    wasActiveThisMinuteRef.current = true;
    setShowStillWorking(false);
    clearTimeout(idlePromptTimerRef.current);
    setActivityStatus(computeActivityStatus());
  }, [computeActivityStatus]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      tabHiddenAtRef.current = Date.now();
    } else {
      const wasAway = tabHiddenAtRef.current;
      tabHiddenAtRef.current = null;
      if (wasAway && Date.now() - wasAway < FOCUS_GRACE_PERIOD_MS) {
        wasActiveThisMinuteRef.current = true;
        lastBrowserActivityRef.current = Date.now();
      }
      setShowStillWorking(false);
      clearTimeout(idlePromptTimerRef.current);
      setActivityStatus(computeActivityStatus());
    }
  }, [computeActivityStatus]);

  const sendActivityPing = useCallback(async () => {
    const status = wasActiveThisMinuteRef.current ? "active" : computeActivityStatus();
    wasActiveThisMinuteRef.current = false;
    setActivityStatus(status);

    if (status === "idle") {
      clearTimeout(idlePromptTimerRef.current);
      idlePromptTimerRef.current = setTimeout(() => setShowStillWorking(true), STILL_WORKING_AFTER);
    } else {
      clearTimeout(idlePromptTimerRef.current);
      setShowStillWorking(false);
    }

    activityMutation.mutate(status, {
      onSuccess: (data) => {
        setActiveMinutes(data.activeMinutes);
        setIdleMinutes(data.idleMinutes);
        setLastPingResult({ status, time: new Date() });
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try { saveSession({ ...JSON.parse(raw), activeMinutes: data.activeMinutes, idleMinutes: data.idleMinutes }); } catch (_) {}
        }
      },
      onError: (err) => { if (err?.response?.status !== 429) console.error("Ping failed:", err); },
    });
  }, [activityMutation, computeActivityStatus]);

  const startTracking = useCallback((checkInISO) => {
    const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "click", "touchstart"];
    EVENTS.forEach((e) => window.addEventListener(e, handleBrowserActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    pingIntervalRef.current  = setInterval(sendActivityPing, PING_INTERVAL_MS);
    clockIntervalRef.current = setInterval(() => {
      const start = checkInISO ? new Date(checkInISO).getTime() : Date.now();
      setElapsedTime(formatDuration(Date.now() - start));
      setActivityStatus(computeActivityStatus());
    }, 1_000);

    lastBrowserActivityRef.current = Date.now();
    wasActiveThisMinuteRef.current = true;
    setActivityStatus("active");
  }, [handleBrowserActivity, handleVisibilityChange, sendActivityPing, computeActivityStatus]);

  const stopTracking = useCallback(() => {
    const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "click", "touchstart"];
    EVENTS.forEach((e) => window.removeEventListener(e, handleBrowserActivity));
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    clearInterval(pingIntervalRef.current);
    clearInterval(clockIntervalRef.current);
    clearTimeout(idlePromptTimerRef.current);
  }, [handleBrowserActivity, handleVisibilityChange]);

  useEffect(() => {
    if (isCheckedIn && checkInTime) startTracking(checkInTime);
    return () => stopTracking();
  }, [isCheckedIn, checkInTime]); // eslint-disable-line

  useEffect(() => {
    if (!isCheckedIn || !checkInTime) setElapsedTime("00:00:00");
  }, [isCheckedIn, checkInTime]);

  const handleCheckin = useCallback(async ({ latitude, longitude, selfie }) => {
    setIsLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      checkinMutation.mutate({ latitude, longitude, selfie }, {
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
      });
    });
  }, [checkinMutation]);

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

  const confirmStillWorking = useCallback(() => {
    lastBrowserActivityRef.current = Date.now();
    wasActiveThisMinuteRef.current = true;
    tabHiddenAtRef.current         = null;
    setActivityStatus("active");
    setShowStillWorking(false);
    clearTimeout(idlePromptTimerRef.current);
    sendActivityPing();
  }, [sendActivityPing]);

  const totalMinutes       = activeMinutes + idleMinutes;
  const activePercent      = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 0;
  const productivityStatus = activePercent >= 70 ? "High" : activePercent >= 40 ? "Medium" : "Low";

  return {
    isCheckedIn, checkInTime,
    activeMinutes, idleMinutes, totalMinutes, activePercent, productivityStatus,
    activityStatus, elapsedTime,
    showStillWorking, lastPingResult,
    isLoading, error,
    handleCheckin, handleCheckout, confirmStillWorking,
    clearError: () => setError(null),
  };
};