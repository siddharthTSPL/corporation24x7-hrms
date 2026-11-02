import { useMemo } from "react";
import { BarChart3, CalendarCheck, Clock, Percent, Timer } from "lucide-react";
import { useMeetingInsights } from "../../auth/server-state/meeting/meetingSpace.hook";
import { Empty, SkeletonList, ErrorNote } from "./ui";
import { cx } from "./meetingClasses";
import { RSVP } from "./meetingUtils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hourLabel = (h) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });
const RSVP_FILL = { accepted: "bg-emerald-500", tentative: "bg-amber-400", declined: "bg-red-500", invited: "bg-gray-300" };

const Kpi = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-600">{label}</p>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#730042]/10 text-[#730042]">
        <Icon size={16} aria-hidden="true" />
      </span>
    </div>
    <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
  </div>
);

const Card = ({ title, hint, children }) => (
  <section className="rounded-xl border border-gray-200 bg-white p-5">
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

export default function InsightsTab() {
  const params = useMemo(() => ({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }), []);
  const q = useMeetingInsights(params);
  if (q.isLoading) return <SkeletonList />;
  if (q.isError) return <ErrorNote error={q.error} retry={q.refetch} />;
  const d = q.data;
  if (!d?.totals?.meetings) return <Empty icon={BarChart3} title="No meetings in the last 30 days" hint="Your meeting load shows up here once you have a few on the calendar." />;

  const t = d.totals;
  const counts = DAYS.map((k) => d.byWeekday?.[k] || 0);
  const max = Math.max(...counts, 1);
  const peak = counts.indexOf(Math.max(...counts));
  const rsvpTotal = Object.keys(RSVP).reduce((n, k) => n + (d.rsvp?.[k] || 0), 0);
  const hostedPct = t.meetings ? Math.round((t.hosted / t.meetings) * 100) : 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Last 30 days</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={CalendarCheck} label="Meetings" value={t.meetings} hint={`${t.hosted} hosted · ${t.invitedTo} invited`} />
        <Kpi icon={Clock} label="Time in meetings" value={`${t.hoursInMeetings}h`} hint={`${t.scheduledHours}h scheduled`} />
        <Kpi icon={Percent} label="Attendance" value={`${t.attendanceRate}%`} hint={`${t.attended} of ${t.ended} ended`} />
        <Kpi icon={Timer} label="Average length" value={`${t.averageMinutes} min`} hint={`${t.upcoming} still to come`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Meetings by weekday" hint={d.busiest?.weekday ? `Busiest: ${d.busiest.weekday} around ${hourLabel(d.busiest.hour)}` : undefined}>
          <div className="flex h-40 items-end gap-3">
            {DAYS.map((k, i) => (
              <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-xs text-gray-600">{counts[i]}</span>
                <div className="flex w-full flex-1 items-end">
                  <div className={cx("w-full rounded-t-md", i === peak && counts[i] ? "bg-[#730042]" : "bg-[#730042]/30")} style={{ height: `${(counts[i] / max) * 100}%`, minHeight: counts[i] ? 4 : 0 }} />
                </div>
                <span className="text-xs text-gray-600">{k}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Hosted vs invited">
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`${t.hosted} hosted, ${t.invitedTo} invited`}>
              <div className="h-full rounded-full bg-[#730042]" style={{ width: `${hostedPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-600">
              <span>{t.hosted} hosted</span>
              <span>{t.invitedTo} invited</span>
            </div>
          </Card>

          <Card title="Your replies to invitations">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Breakdown of your replies">
              {Object.keys(RSVP).map((k) => (
                <div key={k} className={RSVP_FILL[k]} style={{ width: `${rsvpTotal ? ((d.rsvp?.[k] || 0) / rsvpTotal) * 100 : 0}%` }} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-y-1 text-sm text-gray-600">
              {Object.entries(RSVP).map(([k, v]) => (
                <li key={k} className="flex items-center gap-2">
                  <span aria-hidden="true" className={cx("h-2.5 w-2.5 rounded-full", RSVP_FILL[k])} />
                  {v.label} <strong className="text-gray-900">{d.rsvp?.[k] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
