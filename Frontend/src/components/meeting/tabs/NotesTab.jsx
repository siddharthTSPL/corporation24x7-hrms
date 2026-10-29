import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Mail } from "lucide-react";
import { useMeetingNotes, useSaveMeetingNotes, useShareMeetingNotes } from "../../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Chip, Empty, Spinner, ErrorNote, inputCls } from "../ui";
import { fmtDateTime, errMsg } from "../meetingUtils";

export default function NotesTab({ meeting: m }) {
  const q = useMeetingNotes(m.id);
  const save = useSaveMeetingNotes();
  const share = useShareMeetingNotes();
  const note = q.data?.note;
  const canEdit = !!q.data?.canEdit && m.status !== "cancelled";

  const [content, setContent] = useState("");
  const [decisions, setDecisions] = useState("");
  useEffect(() => {
    setContent(note?.content || "");
    setDecisions((note?.decisions || []).join("\n"));
  }, [note?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = content !== (note?.content || "") || decisions !== (note?.decisions || []).join("\n");
  const body = () => ({ id: m.id, content, decisions: decisions.split("\n").map((d) => d.trim()).filter(Boolean), version: note?.version });
  const fail = (e) => toast.error(e.status === 409 ? "Someone else changed these notes. We've loaded the latest version." : errMsg(e));

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote error={q.error} retry={q.refetch} />;

  if (!canEdit) {
    if (!note) return <Empty icon={FileText} title="No notes shared yet" hint="The host will publish notes and decisions here after the meeting." />;
    return (
      <div className="space-y-4 p-5">
        <p className="text-xs text-gray-500">Shared {note.publishedAt ? fmtDateTime(note.publishedAt) : ""}</p>
        <p className="whitespace-pre-wrap text-sm text-gray-800">{note.content || "—"}</p>
        {note.decisions?.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Decisions</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
              {note.decisions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {note?.published ? <Chip tone="green">Visible to attendees</Chip> : <Chip>Private draft</Chip>}
        {note?.updatedAt && (
          <span>
            Saved {fmtDateTime(note.updatedAt)}
            {note.updatedBy ? ` by ${note.updatedBy.name}` : ""}
          </span>
        )}
      </div>

      <textarea className={inputCls} rows={10} maxLength={20000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Meeting notes" />
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Decisions</label>
        <textarea className={inputCls} rows={4} value={decisions} onChange={(e) => setDecisions(e.target.value)} placeholder="One decision per line" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Btn loading={save.isPending} disabled={!dirty} onClick={() => save.mutate(body(), { onSuccess: () => toast.success("Notes saved"), onError: fail })}>
          Save notes
        </Btn>
        <Btn variant="secondary" loading={save.isPending} onClick={() => save.mutate({ ...body(), published: !note?.published }, { onSuccess: () => toast.success(note?.published ? "Notes hidden from attendees" : "Notes published"), onError: fail })}>
          {note?.published ? "Unpublish" : "Publish to attendees"}
        </Btn>
        <Btn
          variant="soft"
          disabled={!note?.published || dirty}
          title={!note?.published ? "Publish the notes first" : dirty ? "Save your changes first" : undefined}
          loading={share.isPending}
          onClick={() => share.mutate({ id: m.id, includeAttendees: true, includeGuests: m.guestCount > 0 }, { onSuccess: () => toast.success("Notes emailed"), onError: (e) => toast.error(errMsg(e)) })}
        >
          <Mail size={14} /> Email notes
        </Btn>
      </div>
      {note?.sharedAt && <p className="text-xs text-gray-400">Last emailed {fmtDateTime(note.sharedAt)}</p>}
    </div>
  );
}
