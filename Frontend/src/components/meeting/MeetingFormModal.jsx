import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Users, CalendarClock, Video, Mic, Repeat, Bell, AlignLeft, SlidersHorizontal, FileText, Zap, CalendarPlus, X, Check, Minus, Clock } from "lucide-react";
import Avatar from "../chat/Avatar";
import { Btn } from "./ui";
import { useDialogFocus, useEsc } from "./meetingHooks";
import { cx, inputCls } from "./meetingClasses";
import PeoplePicker from "./PeoplePicker";
import { useCreateMeeting, useUpdateMeeting, useCheckAvailability, useMeetingDefaults } from "../../auth/server-state/meeting/meeting.hook";
import { useCreateInstantMeeting } from "../../auth/server-state/meeting/meetingSpace.hook";
import { GUEST_SKIP_REASON, parseGuestInput, DURATIONS, REMINDERS, addDays, combineDateTime, errMsg, fmtDate, fmtDuration, fmtTime, minutesBetween, nextSlot, personRef, startOfDay, toDateInput, toTimeInput } from "./meetingUtils";

const QUICK_TIMES = [
  ["In 1 hour", () => nextSlot(60)],
  ["Tomorrow, 10 AM", () => { const d = addDays(startOfDay(), 1); d.setHours(10, 0, 0, 0); return d; }],
  ["Next Monday", () => { const d = startOfDay(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); d.setHours(10, 0, 0, 0); return d; }],
];
const FREQS = [["none", "Does not repeat"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]];

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#730042]/10 text-[#730042]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const Label = ({ children }) => <span className="mb-1 block text-xs font-medium text-gray-600">{children}</span>;

const Chipbtn = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={active} className={cx("min-h-9 rounded-lg border px-3 text-sm transition-colors", active ? "border-[#730042] bg-[#730042] font-medium text-white shadow-sm" : "border-gray-300 bg-white text-gray-700 hover:border-[#730042]/50 hover:bg-[#730042]/[0.04]")}>
    {children}
  </button>
);

const Switch = ({ checked, onChange, label, hint }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50">
    <span className="min-w-0">
      <span className="block text-sm font-medium text-gray-800">{label}</span>
      {hint && <span className="block text-xs text-gray-500">{hint}</span>}
    </span>
    <span className={cx("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-[#730042]" : "bg-gray-300")}>
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
    </span>
  </button>
);

const SumRow = ({ on, children }) => (
  <li className={cx("flex items-center gap-2 text-sm", on ? "text-gray-800" : "text-gray-400")}>
    {on ? <Check size={14} className="text-emerald-600" aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}
    {children}
  </li>
);

/**
 * mode: "create" | "edit" | "instant". Mount it only while open - state initialises from props.
 * onSaved(meeting, { instant })
 */
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * mode: "create" | "edit" | "instant". Mount it only while open - state initialises from props.
 * onSaved(meeting, { instant })
 */
export default function MeetingFormModal({ mode = "create", meeting, onClose, onSaved }) {
  const dlgRef = useRef(null);
  useEsc(true, onClose);
  useDialogFocus(true, dlgRef);
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
  const heading = instant ? "Meet now" : edit ? "Edit meeting" : "Schedule a meeting";
  const sub = instant ? "Start a call right away and invite people into it." : edit ? "Update the details. Attendees are notified of changes." : "Pick a time, invite people and we'll send the invitations.";
  const showWhen = !instant && canReschedule;
  const setWhen = (d) => {
    setDate(toDateInput(d));
    setTime(toTimeInput(d));
  };
  const HeadIcon = instant ? Zap : CalendarPlus;
  const Media = media === "audio" ? Mic : Video;
  const total = people.length + guestList.length;

  return (
    <div className="mtg-root fixed inset-0 z-[80] overflow-y-auto bg-gray-900/55 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mx-auto flex min-h-full items-end sm:items-center sm:p-6">
        <div ref={dlgRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={heading} className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl">
          <header className="relative overflow-hidden bg-gradient-to-r from-[#3d0023] via-[#730042] to-[#CD166E] px-5 py-4 text-white sm:px-7 sm:py-5">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <HeadIcon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">{heading}</h2>
                  <p className="text-sm text-white/70">{sub}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close dialog" className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-h-0 space-y-4 overflow-y-auto bg-gray-50/70 p-4 sm:p-6">
              <Section icon={FileText} title="Meeting details">
                <label className="block">
                  <Label>{instant ? "Title (optional)" : "Title"}</Label>
                  <input className={inputCls} value={title} maxLength={150} data-autofocus placeholder={instant ? "Instant meeting" : "e.g. Sprint planning"} onChange={(e) => setTitle(e.target.value)} />
                </label>
                {!instant && (
                  <label className="block">
                    <Label>Description</Label>
                    <textarea className={inputCls} rows={2} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this meeting about?" />
                  </label>
                )}
              </Section>

              <Section icon={Users} title="Attendees" hint="Search your organisation or add outside guests">
                <PeoplePicker value={people} onChange={setPeople} />
                {!instant && !edit && (
                  <>
                    <Switch checked={everyone} onChange={setEveryone} label="Invite everyone in the organisation" />
                    <details className="rounded-lg border border-dashed border-gray-300 px-3">
                      <summary className="min-h-10 cursor-pointer py-2.5 text-sm font-medium text-[#730042]">Add outside guests{guestList.length ? ` (${guestList.length})` : ""}</summary>
                      <p className="mb-2 text-xs text-gray-600">People without an account get a personal PIN by email and wait in the lobby until you admit them. One email per line.</p>
                      <textarea className={cx(inputCls, "mb-3")} rows={2} aria-label="Outside guests" value={guestText} onChange={(e) => setGuestText(e.target.value)} placeholder={"client@company.com\nPriya Sharma <priya@example.com>"} />
                    </details>
                  </>
                )}
              </Section>

              {(showWhen || instant) && (
                <Section icon={CalendarClock} title={instant ? "Duration" : "Date and time"}>
                  {showWhen && (
                    <>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick times">
                        {QUICK_TIMES.map(([label, fn]) => (
                          <Chipbtn key={label} onClick={() => setWhen(fn())}>
                            {label}
                          </Chipbtn>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <Label>Date</Label>
                          <input type="date" className={inputCls} min={toDateInput(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
                        </label>
                        <label className="block">
                          <Label>Start time</Label>
                          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
                        </label>
                      </div>
                    </>
                  )}
                  <div>
                    {showWhen && <Label>Duration</Label>}
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Duration">
                      {DURATIONS.map((d) => (
                        <Chipbtn key={d} active={duration === d} onClick={() => setDuration(d)}>
                          {fmtDuration(d)}
                        </Chipbtn>
                      ))}
                    </div>
                  </div>

                  {showWhen && (people.length > 0 || everyone) && avail.data && (
                    <div role="status" className={cx("flex gap-2 rounded-lg p-3 text-sm", busy.length ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700")}>
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
                </Section>
              )}

              <Section icon={Video} title="Meeting type">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["video", "Video call", "Camera and screen share", Video],
                    ["audio", "Audio only", "Light on bandwidth", Mic],
                  ].map(([v, label, hint, Icon]) => (
                    <button key={v} type="button" onClick={() => setMedia(v)} aria-pressed={media === v} className={cx("flex items-start gap-3 rounded-xl border p-3 text-left transition", media === v ? "border-[#730042] bg-[#730042]/[0.05] ring-1 ring-[#730042]/30" : "border-gray-200 bg-white hover:border-[#730042]/40")}>
                      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", media === v ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-500")}>
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{label}</span>
                        <span className="block text-xs text-gray-500">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Section>

              {!instant && (
                <>
                  <Section icon={AlignLeft} title="Agenda" hint="One topic per line">
                    <textarea className={inputCls} rows={3} maxLength={3000} aria-label="Agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder={"Status update\nBlockers\nNext steps"} />
                  </Section>

                  <Section icon={SlidersHorizontal} title="Options">
                    {!edit && (
                      <div>
                        <Label>Repeat</Label>
                        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Repeat">
                          {FREQS.map(([v, label]) => (
                            <Chipbtn key={v} active={freq === v} onClick={() => setFreq(v)}>
                              {label}
                            </Chipbtn>
                          ))}
                          {freq !== "none" && (
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input type="number" min={2} max={52} aria-label="Occurrences" className={cx(inputCls, "!w-20")} value={count} onChange={(e) => setCount(e.target.value)} /> times
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label>Remind attendees</Label>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Reminder">
                        {REMINDERS.map((r) => (
                          <Chipbtn key={r} active={reminder === r} onClick={() => setReminderPick(r)}>
                            {r === 0 ? "No reminder" : `${r} min before`}
                          </Chipbtn>
                        ))}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                      <Switch checked={joinBefore} onChange={setJoinBeforePick} label="Allow people to join before the host" />
                      {!edit &&
                        [
                          ["lobby", "Waiting room", "Admit people one by one"],
                          ["muteOnEntry", "Mute on entry", "Everyone except hosts joins muted"],
                        ].map(([key, label, hint]) => <Switch key={key} checked={!!controls[key]} onChange={(v) => setControlPicks((c) => ({ ...c, [key]: v }))} label={label} hint={hint} />)}
                      {!edit && <Switch checked={sendEmail} onChange={setSendEmail} label="Email invitations" hint="Attendees get an email with the join link" />}
                    </div>
                    {!edit && defaultsQ.isSuccess && <p className="text-xs text-gray-500">Your organisation's defaults are pre-selected.</p>}
                  </Section>
                </>
              )}

              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            <aside aria-label="Summary" className="hidden overflow-y-auto border-l border-gray-200 bg-white p-5 lg:block">
              <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                <div className="bg-gradient-to-br from-[#730042] to-[#CD166E] p-4 text-white">
                  <p className="flex items-center gap-1.5 text-xs text-white/75">
                    <Media size={13} aria-hidden="true" /> {media === "audio" ? "Audio call" : "Video call"}
                  </p>
                  <p className={cx("mt-1.5 break-words text-base font-semibold leading-snug", !title && "text-white/60")}>{title || (instant ? "Instant meeting" : "Untitled meeting")}</p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex gap-2.5">
                    <Clock size={16} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <div className="text-sm">
                      {instant ? (
                        <p className="text-gray-800">Starts right away · {fmtDuration(duration)}</p>
                      ) : start ? (
                        <>
                          <p className="font-medium text-gray-900">{fmtDate(start, { weekday: "long", day: "numeric", month: "long" })}</p>
                          <p className="text-gray-600">
                            {fmtTime(start)} – {fmtTime(end)} · {fmtDuration(duration)}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400">Pick a date and time</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <Users size={16} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <div className="min-w-0 text-sm">
                      {everyone ? (
                        <p className="text-gray-800">Whole organisation</p>
                      ) : total ? (
                        <>
                          <div className="flex -space-x-2">
                            {people.slice(0, 5).map((p) => (
                              <span key={p.key} className="rounded-full ring-2 ring-white">
                                <Avatar name={p.name} photo={p.photo} size={26} />
                              </span>
                            ))}
                          </div>
                          <p className="mt-1.5 text-gray-600">
                            {people.length} invited{guestList.length ? ` · ${guestList.length} guest${guestList.length > 1 ? "s" : ""}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400">No one invited yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {!instant && (
                <ul className="mt-4 space-y-2">
                  <SumRow on={reminder > 0}>{reminder > 0 ? `Reminder ${reminder} min before` : "No reminder"}</SumRow>
                  {!edit && <SumRow on={freq !== "none"}>{freq !== "none" ? `Repeats ${freq}, ${Number(count) || 4} times` : "Does not repeat"}</SumRow>}
                  {!edit && <SumRow on={!!controls.lobby}>Waiting room</SumRow>}
                  {!edit && <SumRow on={!!controls.muteOnEntry}>Mute on entry</SumRow>}
                  <SumRow on={joinBefore}>Join before host</SumRow>
                  {!edit && <SumRow on={sendEmail}>Email invitations</SumRow>}
                </ul>
              )}
            </aside>
          </div>

          <footer className="mtg-safe-b flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 pt-3 sm:px-6">
            <p className="min-w-0 truncate text-xs text-gray-500 lg:hidden">{!instant && start ? `${fmtDate(start, { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(start)} · ${fmtDuration(duration)}` : ""}</p>
            <div className="ml-auto flex gap-2">
              <Btn variant="ghost" onClick={onClose}>
                Cancel
              </Btn>
              <Btn loading={saving} onClick={submit}>
                {instant ? "Start and join" : edit ? "Save changes" : "Send invitations"}
              </Btn>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}