import toast from "react-hot-toast";
import { Download, FileText, Copy } from "lucide-react";
import { useMeetingMinutes, useDownloadMeetingMinutes, useDownloadMeetingTranscript } from "../../../auth/server-state/meeting/meetingLive.hook";
import { Btn, Empty, QueryState } from "../ui";
import MinutesView, { Stat } from "../MinutesView";
import { errMsg, fmtDuration } from "../meetingUtils";

export default function MinutesTab({ meeting: m }) {
  const q = useMeetingMinutes(m.id);
  const dlMinutes = useDownloadMeetingMinutes();
  const dlTranscript = useDownloadMeetingTranscript();

  return (
    <QueryState query={q}>
      {q.data && (
        <MinutesBody
          data={q.data}
          dlMinutes={dlMinutes}
          dlTranscript={dlTranscript}
          meetingId={m.id}
        />
      )}
    </QueryState>
  );
}

function MinutesBody({ data, dlMinutes, dlTranscript, meetingId }) {
  const r = data.minutes;
  const moderator = !!r.talk;
  const hasContent = r.attendance.length || r.decisions.length || r.actionItems.length || r.notes || r.questions.total || r.polls.length;
  const canTranscript = r.transcript.lines > 0 && (moderator || r.transcript.shared);

  if (!hasContent) return <Empty icon={FileText} title="No minutes recorded" hint="Minutes are built from attendance, decisions, action items, polls and notes captured during the meeting." />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.markdown);
      toast.success("Minutes copied");
    } catch {
      toast.error("Couldn't copy. Download the file instead.");
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Duration" value={r.meeting.durationSec ? fmtDuration(Math.max(1, Math.round(r.meeting.durationSec / 60))) : "-"} />
        <Stat label="Attended" value={r.attendance.length} />
        <Stat label="Decisions" value={r.decisions.length} />
        <Stat label="Action items" value={r.actionItems.length} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn variant="secondary" size="sm" loading={dlMinutes.isPending} onClick={() => dlMinutes.mutate(meetingId, { onError: (e) => toast.error(errMsg(e)) })}>
          <Download size={14} aria-hidden="true" /> Download minutes
        </Btn>
        <Btn variant="secondary" size="sm" onClick={copy}>
          <Copy size={14} aria-hidden="true" /> Copy
        </Btn>
        {canTranscript && (
          <Btn variant="secondary" size="sm" loading={dlTranscript.isPending} onClick={() => dlTranscript.mutate(meetingId, { onError: (e) => toast.error(errMsg(e)) })}>
            <FileText size={14} aria-hidden="true" /> Transcript
          </Btn>
        )}
      </div>
      <MinutesView minutes={r} />
    </div>
  );
}
