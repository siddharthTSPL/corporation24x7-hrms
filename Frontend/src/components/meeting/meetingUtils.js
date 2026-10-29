import { useEffect, useState } from "react";

// Re-render every `ms` so "opens in…", "Join" and live badges stay current.
export const useNow = (ms = 30000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};

export const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const fmtDate = (d, o = { weekday: "short", day: "numeric", month: "short" }) => new Date(d).toLocaleDateString([], o);
export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;
export const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);
export const fmtDuration = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}` : `${min} min`);

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const dayLabel = (d) => {
  const diff = Math.round((startOfDay(d) - startOfDay()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return fmtDate(d, { weekday: "long", day: "numeric", month: "long" });
};

export const groupByDay = (meetings = [], dir = "asc") => {
  const sorted = [...meetings].sort((a, b) => (dir === "asc" ? 1 : -1) * (new Date(a.startTime) - new Date(b.startTime)));
  const map = new Map();
  for (const m of sorted) {
    const k = startOfDay(m.startTime).getTime();
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return [...map.entries()].map(([k, items]) => ({ key: k, label: dayLabel(k), items }));
};

// <input type="datetime-local"> / <input type="date"> helpers (local time, no TZ suffix)
export const toDateInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
export const toTimeInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(11, 16);
};
export const combineDateTime = (date, time) => (date && time ? new Date(`${date}T${time}`) : null);

// Next quarter-hour, at least `gapMin` from now
export const nextSlot = (gapMin = 15) => {
  const x = new Date(Date.now() + gapMin * 60000);
  x.setSeconds(0, 0);
  x.setMinutes(Math.ceil(x.getMinutes() / 15) * 15);
  return x;
};

export const RSVP = {
  accepted: { label: "Going", tone: "green" },
  tentative: { label: "Maybe", tone: "amber" },
  declined: { label: "Can't go", tone: "red" },
  invited: { label: "No reply", tone: "gray" },
};

export const FEEDBACK_TAGS = {
  well_organised: "Well organised",
  productive: "Productive",
  too_long: "Too long",
  no_agenda: "No agenda",
  could_be_email: "Could have been an email",
  unclear_outcome: "Unclear outcome",
};

export const DURATIONS = [15, 30, 45, 60, 90, 120];
export const REMINDERS = [0, 5, 10, 15, 30, 60];

export const personRef = (p) => ({ model: p.model, id: p.id });
export const errMsg = (e) => e?.message || "Something went wrong";
