import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useMeetingInsights } from "../../auth/server-state/meeting/meetingSpace.hook";
import { Empty, Spinner, ErrorNote } from "./ui";
import { RSVP } from "./meetingUtils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hourLabel = (h) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });

const Stat = ({ label, value, hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-2xl font-semibold text-gray-900">{value}</p>
    <p className="mt-1 text-sm text-gray-600">{label}</p>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

export default function InsightsTab() {
  const params = useMemo(() => ({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }), []);
  const q = useMeetingInsights(params);
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote error={q.error} retry={q.refetch} />;
  const d = q.data;
  if (!d?.totals?.meetings) return <Empty icon={BarChart3} title="No meetings in the last 30 days" hint="Your meeting load shows up here once you have a few on the calendar." />;

  const t = d.totals;
  const max = Math.max(...DAYS.map((k) => d.byWeekday[k] || 0), 1);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Last 30 days</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Meetings" value={t.meetings} hint={`${t.hosted} hosted · ${t.invitedTo} invited`} />
        <Stat label="Time in meetings" value={`${t.hoursInMeetings}h`} hint={`${t.scheduledHours}h scheduled`} />
        <Stat label="Attendance" value={`${t.attendanceRate}%`} hint={`${t.attended} of ${t.ended} ended`} />
        <Stat label="Average length" value={`${t.averageMinutes} min`} hint={`${t.upcoming} still to come`} />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Meetings by weekday</h3>
        {d.busiest?.weekday && (
          <p className="mt-0.5 text-xs text-gray-500">
            Busiest: {d.busiest.weekday} around {hourLabel(d.busiest.hour)}
          </p>
        )}
        <div className="mt-4 flex h-32 items-end gap-3">
          {DAYS.map((k) => (
            <div key={k} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{d.byWeekday[k] || 0}</span>
              <div className="w-full rounded-t bg-[#730042]" style={{ height: `${((d.byWeekday[k] || 0) / max) * 100}%`, minHeight: d.byWeekday[k] ? 4 : 0 }} />
              <span className="text-xs text-gray-500">{k}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Your replies to invitations</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          {Object.entries(RSVP).map(([k, v]) => (
            <span key={k}>
              {v.label}: <strong className="text-gray-900">{d.rsvp?.[k] ?? 0}</strong>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
