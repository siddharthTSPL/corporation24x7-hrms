import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Users, Clock, Video, Mic, Repeat, Bell, AlignLeft, SlidersHorizontal, Mail } from "lucide-react";
import { Modal, Btn } from "./ui";
import { inputCls } from "./meetingClasses";
import PeoplePicker from "./PeoplePicker";
import { useCreateMeeting, useUpdateMeeting, useCheckAvailability, useMeetingDefaults } from "../../auth/server-state/meeting/meeting.hook";
import { useCreateInstantMeeting } from "../../auth/server-state/meeting/meetingSpace.hook";
import { GUEST_SKIP_REASON, parseGuestInput } from "./meetingUtils";
import { DURATIONS, REMINDERS, fmtDuration, combineDateTime, errMsg, fmtTime, minutesBetween, nextSlot, personRef, toDateInput, toTimeInput } from "./meetingUtils";

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
  const [guestText, setGuestText] = useState("");
  const [freq, setFreq] = useState("none");
  const [count, setCount] = useState(4);
  const [reminderPick, setReminderPick] = useState(meeting?.reminderMinutes ?? null);
  const [joinBeforePick, setJoinBeforePick] = useState(meeting?.allowJoinBeforeHost ?? null);
  const [controlPicks, setControlPicks] = useState({});
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState("");

  const defaultsQ = useMeetingDefaults(!edit);
  const orgDefaults = defaultsQ.data?.defaults;
  const reminder = reminderPick ?? orgDefaults?.reminderMinutes ?? 10;
  const joinBefore = joinBeforePick ?? orgDefaults?.allowJoinBeforeHost ?? false;
  const controls = { ...(orgDefaults?.settings || {}), ...controlPicks };
  const create = useCreateMeeting();
  const update = useUpdateMeeting();
  const quick = useCreateInstantMeeting();
  const avail = useCheckAvailability();
  const saving = create.isPending || update.isPending || quick.isPending;

  const guestList = parseGuestInput(guestText);
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
    if (!edit && !people.length && !guestList.length && !(everyone && !instant)) return setError("Invite at least one person.");
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
          guests: guestList.length ? guestList : undefined,
          recurrence: freq === "none" ? undefined : { freq, interval: 1, count: Number(count) || 4 },
          reminderMinutes: reminderPick ?? undefined,
          allowJoinBeforeHost: joinBeforePick ?? undefined,
          settings: Object.keys(controlPicks).length ? controlPicks : undefined,
          sendEmail,
        });
        toast.success(res.occurrences > 1 ? `${res.occurrences} meetings scheduled` : "Meeting scheduled");
        if (res.guests?.invited?.length) toast.success(`${res.guests.invited.length} outside guest${res.guests.invited.length > 1 ? "s" : ""} emailed a PIN`);
        (res.guests?.skipped || []).forEach((g) => toast(`${g.email}: ${GUEST_SKIP_REASON[g.reason] || g.reason}`, { icon: "⚠️" }));
        if (res.conflicts?.length) toast(`${res.conflicts.length} invitee${res.conflicts.length > 1 ? "s have" : " has"} a clash at this time`, { icon: "⚠️" });
        onSaved?.(res.meeting);
      }
      onClose();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const busy = avail.data?.busy || [];
  const heading = instant ? "Meet now" : edit ? "Edit meeting" : "New meeting";
  const showWhen = !instant && canReschedule;

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
      <div className="space-y-5">
        <input
          className="w-full border-0 border-b border-gray-300 bg-transparent px-0 pb-2 text-lg text-gray-900 placeholder:text-gray-400 focus:border-[#730042] focus:outline-none focus:ring-0"
          value={title}
          maxLength={150}
          data-autofocus
          aria-label={instant ? "Title (optional)" : "Title"}
          placeholder={instant ? "Add a title (optional)" : "Add a title"}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Row icon={Users} label="Attendees">
          <PeoplePicker value={people} onChange={setPeople} />
          {!instant && !edit && (
            <>
              <label className="mt-2 flex min-h-9 items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} className="h-4 w-4 accent-[#730042]" />
                Invite everyone in the organisation
              </label>
              <details className="mt-1">
                <summary className="min-h-9 cursor-pointer py-1.5 text-sm font-medium text-[#730042]">Add outside guests{guestList.length ? ` (${guestList.length})` : ""}</summary>
                <p className="mb-2 text-xs text-gray-600">People without an account get a personal PIN by email and wait in the lobby until you admit them. One email per line.</p>
                <textarea className={inputCls} rows={2} aria-label="Outside guests" value={guestText} onChange={(e) => setGuestText(e.target.value)} placeholder={"client@company.com\nPriya Sharma <priya@example.com>"} />
              </details>
            </>
          )}
        </Row>

        {showWhen && (
          <Row icon={Clock} label="Time">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <input type="date" aria-label="Date" className={inputCls} min={toDateInput(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" aria-label="Start time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
              <select aria-label="Duration" className={`${inputCls} col-span-2 sm:col-span-1`} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {fmtDuration(d)}
                  </option>
                ))}
              </select>
            </div>
            {start && end && (
              <p className="mt-1.5 text-xs text-gray-600">
                {fmtTime(start)} to {fmtTime(end)} · {TZ}
              </p>
            )}
            {(people.length > 0 || everyone) && avail.data && (
              <div role="status" className={`mt-2 flex gap-2 rounded-lg p-3 text-sm ${busy.length ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                {busy.length ? <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
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
          </Row>
        )}

        {instant && (
          <Row icon={Clock} label="Duration">
            <select aria-label="Duration" className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {fmtDuration(d)}
                </option>
              ))}
            </select>
          </Row>
        )}

        <Row icon={media === "audio" ? Mic : Video} label="Type">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300" role="group" aria-label="Meeting type">
            {[
              ["video", "Video"],
              ["audio", "Audio only"],
            ].map(([v, label]) => (
              <button key={v} type="button" onClick={() => setMedia(v)} aria-pressed={media === v} className={`min-h-10 border-r border-gray-300 px-5 text-sm last:border-r-0 ${media === v ? "bg-[#730042] text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </Row>

        {!instant && (
          <>
            <Row icon={AlignLeft} label="Details">
              <textarea className={inputCls} rows={2} maxLength={3000} aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description" />
              <textarea className={`${inputCls} mt-2`} rows={3} maxLength={3000} aria-label="Agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Agenda (one topic per line)" />
            </Row>

            {!edit && (
              <Row icon={Repeat} label="Repeat">
                <div className="flex flex-wrap items-center gap-3">
                  <select aria-label="Repeat" className={`${inputCls} !w-auto`} value={freq} onChange={(e) => setFreq(e.target.value)}>
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {freq !== "none" && (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      for <input type="number" min={2} max={52} aria-label="Occurrences" className={`${inputCls} !w-20`} value={count} onChange={(e) => setCount(e.target.value)} /> occurrences
                    </label>
                  )}
                </div>
              </Row>
            )}

            <Row icon={Bell} label="Reminder">
              <select aria-label="Remind attendees" className={`${inputCls} !w-auto`} value={reminder} onChange={(e) => setReminderPick(Number(e.target.value))}>
                {REMINDERS.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? "No reminder" : `${r} minutes before`}
                  </option>
                ))}
              </select>
            </Row>

            <Row icon={SlidersHorizontal} label="Options">
              <div className="space-y-0.5">
                <Check checked={joinBefore} onChange={setJoinBeforePick} label="Allow people to join before the host" />
                {!edit &&
                  [
                    ["lobby", "Enable waiting room"],
                    ["muteOnEntry", "Mute participants on entry"],
                  ].map(([key, label]) => <Check key={key} checked={!!controls[key]} onChange={(v) => setControlPicks((c) => ({ ...c, [key]: v }))} label={label} />)}
              </div>
              {!edit && defaultsQ.isSuccess && <p className="mt-1 text-xs text-gray-500">Your organisation's defaults are pre-selected.</p>}
            </Row>

            {!edit && (
              <Row icon={Mail} label="Invitations">
                <Check checked={sendEmail} onChange={setSendEmail} label="Email invitations to attendees" />
              </Row>
            )}
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

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center text-gray-500" title={label}>
        <Icon size={18} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Check({ checked, onChange, label }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#730042]" />
      {label}
    </label>
  );
}
