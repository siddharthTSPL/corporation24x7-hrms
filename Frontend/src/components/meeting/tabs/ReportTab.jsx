import toast from "react-hot-toast";
import { Download } from "lucide-react";
import { useMeetingReport, useDownloadMeetingReport } from "../../../auth/server-state/meeting/meeting.hook";
import { Btn, Chip, Empty, ErrorNote, Spinner } from "../ui";
import { errMsg, fmtDateTime, fmtDuration } from "../meetingUtils";

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-3">
    <p className="text-xl font-semibold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

// Host / co-host attendance report (members and outside guests).
export default function ReportTab({ meeting: m }) {
  const q = useMeetingReport(m.id);
  const csv = useDownloadMeetingReport();

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote error={q.error} retry={q.refetch} />;
  const { summary: s, participants = [] } = q.data;

  if (!s.sessions) return <Empty title="No report yet" hint="Attendance is recorded once the meeting has been started." />;

  return (
    <div className="space-y-5 p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Invited" value={s.invited} />
        <Stat label="Attended" value={s.attended} />
        <Stat label="Attendance" value={`${s.attendanceRate}%`} />
        <Stat label="Duration" value={fmtDuration(Math.max(1, Math.round(s.durationSec / 60)))} />
      </div>

      <div className="flex justify-end">
        <Btn variant="secondary" size="sm" loading={csv.isPending} onClick={() => csv.mutate(m.id, { onError: (e) => toast.error(errMsg(e)) })}>
          <Download size={14} /> Download CSV
        </Btn>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium">Time in meeting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {participants.map((p) => (
              <tr key={p.key}>
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-900">{p.name}</span>{" "}
                  {p.isHost && <Chip tone="brand">Host</Chip>} {p.isCoHost && <Chip tone="brand">Co-host</Chip>} {p.isGuest && <Chip>Guest</Chip>}
                </td>
                <td className="px-3 py-2">{p.attended ? <Chip tone="green">Attended</Chip> : <Chip tone="red">Absent</Chip>}</td>
                <td className="px-3 py-2 text-gray-600">
                  {p.firstJoinedAt ? fmtDateTime(p.firstJoinedAt) : "-"}
                  {p.joinedLateMin > 0 && <span className="ml-1 text-xs text-amber-600">({p.joinedLateMin} min late)</span>}
                </td>
                <td className="px-3 py-2 text-gray-600">{p.attended ? fmtDuration(Math.max(1, Math.round(p.durationSec / 60))) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
