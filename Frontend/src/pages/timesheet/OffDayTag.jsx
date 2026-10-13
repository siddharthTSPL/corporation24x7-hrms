import React from "react";

// A day is "off" when the backend marks it as a company holiday or the
// employee's week-off. Those days are paid automatically, so no time entry /
// timer is allowed on them - the UI shows this tag instead of "+ Add".
export const isOffDay = (info) =>
  !!info && (info.dayType === "holiday" || info.dayType === "week_off");

export function OffDayTag({ info, className = "" }) {
  if (!isOffDay(info)) return null;
  const isHoliday = info.dayType === "holiday";
  const label = isHoliday ? "Holiday" : "Week Off";
  const title = isHoliday && info.holidayName
    ? `${info.holidayName} - paid automatically`
    : `${label} - paid automatically`;
  return (
    <div
      title={title}
      className={`w-full rounded-lg px-2 py-1.5 text-center text-[10px] sm:text-[11px] font-bold border min-w-0 ${
        isHoliday
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-600 border-slate-200"
      } ${className}`}
    >
      <div className="truncate">{label}</div>
      {isHoliday && info.holidayName && (
        <div className="truncate text-[9px] font-semibold opacity-80">{info.holidayName}</div>
      )}
      <div className="text-[9px] font-semibold opacity-70">Paid</div>
    </div>
  );
}

// Shown inside the "Log Time" modal when the chosen date is a holiday / week off.
export function OffDayNotice({ status }) {
  if (!isOffDay(status)) return null;
  const isHoliday = status.dayType === "holiday";
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
      {isHoliday
        ? `This date is a holiday${status.holidayName ? ` (${status.holidayName})` : ""}.`
        : "This date is a week off."}{" "}
      It is paid automatically - time can't be logged on it.
    </div>
  );
}