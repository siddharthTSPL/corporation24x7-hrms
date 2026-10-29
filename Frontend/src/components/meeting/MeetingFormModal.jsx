import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Modal, Btn, Field, inputCls } from "./ui";
import PeoplePicker from "./PeoplePicker";
import { useCreateMeeting, useUpdateMeeting, useCheckAvailability } from "../../auth/server-state/meeting/meeting.hook";
import { useCreateInstantMeeting } from "../../auth/server-state/meeting/meetingSpace.hook";
import { DURATIONS, REMINDERS, combineDateTime, errMsg, fmtTime, minutesBetween, nextSlot, personRef, toDateInput, toTimeInput } from "./meetingUtils";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * mode: "create" | "edit" | "instant". Mount it only while open - state initialises from props.
 * onSaved(meeting, { instant })
 */
export default function MeetingFormModal({ mode = "create", meeting, onClose, onSaved }) {
  const edit = mode === "edit";
  const instant = mode === "instant";
  const slot = nextSlot();

  const originalPeople = (meeting?.attendees || []).filter((a) => !a.isHost);
  const [title, setTitle] = useState(meeting?.title || "");
  const [description, setDescription] = useState(meeting?.description || "");
  const [agenda, setAgenda] = useState(meeting?.agenda || "");
  const [date, setDate] = useState(toDateInput(meeting?.startTime || slot));
  const [time, setTime] = useState(toTimeInput(meeting?.startTime || slot));
  const [duration, setDuration] = useState(meeting ? minutesBetween(meeting.startTime, meeting.endTime) : 30);
  const [media, setMedia] = useState(meeting?.media || "video");
  const [people, setPeople] = useState(originalPeople);
  const [everyone, setEveryone] = useState(false);
  const [freq, setFreq] = useState("none");
  const [count, setCount] = useState(4);
  const [reminder, setReminder] = useState(meeting?.reminderMinutes ?? 10);
  const [joinBefore, setJoinBefore] = useState(meeting?.allowJoinBeforeHost ?? false);
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState("");

  const create = useCreateMeeting();
  const update = useUpdateMeeting();
  const quick = useCreateInstantMeeting();
  const avail = useCheckAvailability();
  const saving = create.isPending || update.isPending || quick.isPending;

  const start = combineDateTime(date, time);
  const end = start ? new Date(start.getTime() + duration * 60000) : null;
  const canReschedule = !edit || meeting.status === "scheduled";

  // Busy check while picking a time (debounced)
  const { mutate: check } = avail;
  const peopleKey = people.map((p) => p.key).join(",");
  useEffect(() => {
    if (instant || !canReschedule || !start || (!people.length && !everyone)) return;
    const t = setTimeout(
      () =>
        check({
          people: people.map(personRef),
          audience: everyone ? { everyone: true } : undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          excludeMeetingId: meeting?.id,
        }),
      600,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, duration, peopleKey, everyone]);

  const submit = async () => {
    setError("");
    if (!instant && !title.trim()) return setError("Add a meeting title.");
    if (!edit && !people.length && !(everyone && !instant)) return setError("Invite at least one person.");
    if (!instant && canReschedule && (!start || start.getTime() < Date.now() - 5 * 60000)) return setError("Pick a start time that hasn't passed.");

    try {
      if (instant) {
        const res = await quick.mutateAsync({ title: title.trim() || undefined, durationMin: duration, media, attendees: people.map(personRef) });
        onSaved?.(res.meeting, { instant: true });
      } else if (edit) {
        const before = new Set(originalPeople.map((p) => p.key));
        const after = new Set(people.map((p) => p.key));
        const body = {
          id: meeting.id,
          title: title.trim(),
          description,
          agenda,
          media,
          reminderMinutes: reminder,
          allowJoinBeforeHost: joinBefore,
          addAttendees: people.filter((p) => !before.has(p.key)).map(personRef),
          removeAttendees: [...before].filter((k) => !after.has(k)),
        };
        if (canReschedule) Object.assign(body, { startTime: start.toISOString(), durationMin: duration });
        const res = await update.mutateAsync(body);
        toast.success("Meeting updated");
        onSaved?.(res.meeting);
      } else {
        const res = await create.mutateAsync({
          title: title.trim(),
          description,
          agenda,
          startTime: start.toISOString(),
          durationMin: duration,
          timezone: TZ,
          media,
          attendees: people.map(personRef),
          audience: everyone ? { everyone: true } : undefined,
          recurrence: freq === "none" ? undefined : { freq, interval: 1, count: Number(count) || 4 },
          reminderMinutes: reminder,
          allowJoinBeforeHost: joinBefore,
          sendEmail,
        });
        toast.success(res.occurrences > 1 ? `${res.occurrences} meetings scheduled` : "Meeting scheduled");
        if (res.conflicts?.length) toast(`${res.conflicts.length} invitee${res.conflicts.length > 1 ? "s have" : " has"} a clash at this time`, { icon: "⚠️" });
        onSaved?.(res.meeting);
      }
      onClose();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const busy = avail.data?.busy || [];
  const heading = instant ? "Start a meeting now" : edit ? "Edit meeting" : "Schedule a meeting";

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={heading}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn loading={saving} onClick={submit}>
            {instant ? "Start and join" : edit ? "Save changes" : "Schedule"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={instant ? "Title (optional)" : "Title"}>
          <input className={inputCls} value={title} maxLength={150} autoFocus placeholder={instant ? "Instant meeting" : "e.g. Sprint planning"} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label={everyone ? "Invite" : "Invite people"}>
          <PeoplePicker value={people} onChange={setPeople} />
          {!instant && !edit && (
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} className="accent-[#730042]" />
              Invite everyone in the organisation
            </label>
          )}
        </Field>

        {!instant && canReschedule && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Date">
              <input type="date" className={inputCls} min={toDateInput(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start">
              <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Duration" className="col-span-2 sm:col-span-1">
              <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d >= 60 ? `${d / 60} hr${d > 60 ? "s" : ""}` : `${d} min`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {instant && (
          <Field label="Duration">
            <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </Field>
        )}

        {!instant && canReschedule && (people.length > 0 || everyone) && avail.data && (
          <div className={`flex gap-2 rounded-lg p-3 text-sm ${busy.length ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
            {busy.length ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <div>
              {busy.length ? (
                <>
                  <p className="font-medium">{new Set(busy.map((b) => b.key)).size} invitee(s) are busy then</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {busy.slice(0, 4).map((b, i) => (
                      <li key={i}>
                        {b.name}: {b.title || "another meeting"} ({fmtTime(b.startTime)}–{fmtTime(b.endTime)})
                      </li>
                    ))}
                    {busy.length > 4 && <li>and {busy.length - 4} more</li>}
                  </ul>
                </>
              ) : (
                "Everyone's free at this time."
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {["video", "audio"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setMedia(v)}
              aria-pressed={media === v}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${media === v ? "border-[#730042] bg-[#730042]/5 text-[#730042]" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              {v === "video" ? "Video call" : "Audio only"}
            </button>
          ))}
        </div>

        {!instant && (
          <>
            <Field label="Description">
              <textarea className={inputCls} rows={2} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this meeting about?" />
            </Field>
            <Field label="Agenda">
              <textarea className={inputCls} rows={3} maxLength={3000} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="One topic per line" />
            </Field>

            <details className="rounded-lg border border-gray-200 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">More options</summary>
              <div className="mt-3 space-y-3 pb-1">
                {!edit && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Repeat">
                      <select className={inputCls} value={freq} onChange={(e) => setFreq(e.target.value)}>
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </Field>
                    {freq !== "none" && (
                      <Field label="Occurrences">
                        <input type="number" min={2} max={52} className={inputCls} value={count} onChange={(e) => setCount(e.target.value)} />
                      </Field>
                    )}
                  </div>
                )}
                <Field label="Remind attendees">
                  <select className={inputCls} value={reminder} onChange={(e) => setReminder(Number(e.target.value))}>
                    {REMINDERS.map((r) => (
                      <option key={r} value={r}>
                        {r === 0 ? "No reminder" : `${r} minutes before`}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={joinBefore} onChange={(e) => setJoinBefore(e.target.checked)} className="accent-[#730042]" />
                  Let people join before the host
                </label>
                {!edit && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="accent-[#730042]" />
                    Email invitations
                  </label>
                )}
              </div>
            </details>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
