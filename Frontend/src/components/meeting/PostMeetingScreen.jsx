import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Share2, PartyPopper, DoorOpen, Copy } from "lucide-react";
import { useMeetingMinutes, useDownloadMeetingMinutes, useDownloadMeetingTranscript, useShareMeetingTranscript } from "../../auth/server-state/meeting/meetingLive.hook";
import { useMyMeetingFeedback, useSubmitMeetingFeedback } from "../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Modal, SkeletonList, ErrorNote } from "./ui";
import { cx, inputCls } from "./meetingClasses";
import MinutesView, { Stat } from "./MinutesView";
import Stars from "./Stars";
import { FEEDBACK_TAGS, errMsg, fmtDuration } from "./meetingUtils";

function FeedbackPrompt({ meetingId }) {
  const q = useMyMeetingFeedback(meetingId);
  const submit = useSubmitMeetingFeedback();
  const mine = q.data?.feedback;
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  if (q.isLoading || q.isError || !q.data?.canRate) return null;

  const current = rating || mine?.rating || 0;
  const chosenTags = tags.length ? tags : mine?.tags || [];
  const send = () =>
    submit.mutate(
      { id: meetingId, rating: current, tags: chosenTags, comment: comment || mine?.comment || "", anonymous: mine?.anonymous ?? false },
      { onSuccess: () => setSent(true), onError: (e) => toast.error(errMsg(e)) },
    );

  if (sent) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
        <PartyPopper size={18} aria-hidden="true" /> Thanks, your feedback helps the host improve future meetings.
      </div>
    );
  }

  return (
    <section aria-label="Rate this meeting" className="rounded-xl border border-[#730042]/20 bg-[#730042]/5 p-4">
      <p className="text-sm font-semibold text-gray-900">{mine ? "Update your rating" : "How was this meeting?"}</p>
      <div className="mt-2">
        <Stars value={current} onChange={setRating} />
      </div>
      {current > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(q.data.tags || Object.keys(FEEDBACK_TAGS)).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={chosenTags.includes(k)}
                onClick={() => setTags(chosenTags.includes(k) ? chosenTags.filter((x) => x !== k) : [...chosenTags, k])}
                className={cx("min-h-9 rounded-full border px-3 text-xs", chosenTags.includes(k) ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")}
              >
                {FEEDBACK_TAGS[k] || k}
              </button>
            ))}
          </div>
          <textarea aria-label="Comment (optional)" className={inputCls} rows={2} maxLength={1000} placeholder="Anything else? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Btn loading={submit.isPending} onClick={send}>
            {mine ? "Update feedback" : "Send feedback"}
          </Btn>
        </div>
      )}
    </section>
  );
}

export default function PostMeetingScreen({ meeting, onClose }) {
  const navigate = useNavigate();
  const q = useMeetingMinutes(meeting.id);
  const dlMinutes = useDownloadMeetingMinutes();
  const dlTranscript = useDownloadMeetingTranscript();
  const share = useShareMeetingTranscript();
  const r = q.data?.minutes;
  const ended = r?.meeting.status === "ended";
  const moderator = !!r?.talk;
  const transcriptLines = r?.transcript?.lines || 0;
  const transcriptShared = !!r?.transcript?.shared;
  const canDownloadTranscript = transcriptLines > 0 && (moderator || transcriptShared);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(q.data.markdown);
      toast.success("Minutes copied");
    } catch {
      toast.error("Couldn't copy. Download the file instead.");
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={ended ? "Meeting ended" : "You left the meeting"}
      footer={
        <>
          <Btn
            variant="ghost"
            onClick={() => {
              onClose();
              navigate(`/meetings/${meeting.id}`);
            }}
          >
            <DoorOpen size={15} aria-hidden="true" /> Open meeting
          </Btn>
          <Btn onClick={onClose} data-autofocus>
            Done
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-base font-semibold text-gray-900">{r?.meeting.title || meeting.title || "Meeting"}</p>
          {r && (
            <p className="mt-0.5 text-sm text-gray-600">
              {r.meeting.durationSec > 0 ? `${fmtDuration(Math.max(1, Math.round(r.meeting.durationSec / 60)))} · ` : ""}
              hosted by {r.meeting.host}
            </p>
          )}
        </div>

        {q.isLoading && <SkeletonList rows={3} className="p-0" />}
        {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}

        {r && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Attended" value={r.attendance.length} />
              <Stat label="Decisions" value={r.decisions.length} />
              <Stat label="Action items" value={r.actionItems.length} />
              <Stat label="Questions" value={r.questions.total} />
            </div>

            <FeedbackPrompt meetingId={meeting.id} />

            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" size="sm" loading={dlMinutes.isPending} onClick={() => dlMinutes.mutate(meeting.id, { onError: (e) => toast.error(errMsg(e)) })}>
                <Download size={14} aria-hidden="true" /> Minutes (.md)
              </Btn>
              <Btn variant="secondary" size="sm" onClick={copyMarkdown}>
                <Copy size={14} aria-hidden="true" /> Copy minutes
              </Btn>
              {canDownloadTranscript && (
                <Btn variant="secondary" size="sm" loading={dlTranscript.isPending} onClick={() => dlTranscript.mutate(meeting.id, { onError: (e) => toast.error(errMsg(e)) })}>
                  <FileText size={14} aria-hidden="true" /> Transcript (.txt)
                </Btn>
              )}
              {moderator && transcriptLines > 0 && (
                <Btn
                  variant="soft"
                  size="sm"
                  loading={share.isPending}
                  onClick={() =>
                    share.mutate(
                      { id: meeting.id, shared: !transcriptShared },
                      {
                        onSuccess: () => {
                          toast.success(transcriptShared ? "Transcript hidden from attendees" : "Transcript shared with attendees");
                          q.refetch();
                        },
                        onError: (e) => toast.error(errMsg(e)),
                      },
                    )
                  }
                >
                  <Share2 size={14} aria-hidden="true" /> {transcriptShared ? "Stop sharing transcript" : "Share transcript"}
                </Btn>
              )}
            </div>

            <MinutesView minutes={r} />
          </>
        )}
      </div>
    </Modal>
  );
}
