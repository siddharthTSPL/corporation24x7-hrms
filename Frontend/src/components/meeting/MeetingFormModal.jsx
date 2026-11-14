import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Users, CalendarClock, Video, Mic, Repeat, Bell, AlignLeft, SlidersHorizontal, FileText, Zap, CalendarPlus, X, Check, Minus, Clock, Loader2, ListChecks } from "lucide-react";
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
const FREQS = [["none", "Does not repeat"], ["daily", "Daily"], ["weekdays", "Weekdays (Mon–Fri)"], ["weekly", "Weekly"], ["monthly", "Monthly"]];
const FREQ_LABEL = { daily: "daily", weekdays: "on weekdays", weekly: "weekly", monthly: "monthly" };
const NOTIFY_OPTIONS = [
  ["attendees", "Attendees only", "Everyone invited gets the notification and email"],
  ["attendees_and_me", "Attendees & me", "Invitees, plus a copy for you"],
  ["none", "No one", "Schedule quietly, nobody is notified"],
];

// Double-click on a calendar day: that day at 10:00, or the next free slot if the day is today.
const slotForDay = (day) => {
  const d = new Date(day);
  d.setHours(10, 0, 0, 0);
  return startOfDay(d).getTime() <= startOfDay().getTime() ? nextSlot() : d;
};

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
export default function MeetingFormModal({ mode = "create", meeting, initialDate, onClose, onSaved }) {
  const dlgRef = useRef(null);
  const [askNotify, setAskNotify] = useState(false);
  useEsc(true, askNotify ? () => setAskNotify(false) : onClose);
  useDialogFocus(true, dlgRef);
  const edit = mode === "edit";
  const instant = mode === "instant";
  const slot = initialDate ? slotForDay(initialDate) : nextSlot();

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
  const [skipWeekOffs, setSkipWeekOffs] = useState(false);
  const [notifyMode, setNotifyMode] = useState("attendees");
  const [error, setError] = useState("");

  const defaultsQ = useMeetingDefaults(!edit);
  const orgDefaults = defaultsQ.data?.defaults;
  const reminder = reminderPick ?? orgDefaults?.reminderMinutes ?? 10;
  const joinBefore = joinBeforePick ?? orgDefaults?.allowJoinBeforeHost ?? false;
  const controls = { ...((edit ? meeting?.settings : orgDefaults?.settings) || {}), ...controlPicks };
  const transcriptOn = controls.transcript !== false;
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

  const validate = () => {
    if (!instant && !title.trim()) return "Add a meeting title.";
    if (!edit && !people.length && !guestList.length && !(everyone && !instant)) return "Invite at least one person.";
    if (!instant && canReschedule && (!start || start.getTime() < Date.now() - 5 * 60000)) return "Pick a start time that hasn't passed.";
    return "";
  };

  // New meetings ask who should be notified before anything is sent; edits and instant meetings save straight away.
  const submit = () => {
    setError("");
    const problem = validate();
    if (problem) return setError(problem);
    if (!edit && !instant) return setAskNotify(true);
    return save();
  };

  const save = async () => {
    setError("");
    try {
      if (instant) {
        const res = await quick.mutateAsync({ title: title.trim() || undefined, durationMin: duration, media, attendees: people.map(personRef), settings: "transcript" in controlPicks ? { transcript: controlPicks.transcript } : undefined });
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
        if ("transcript" in controlPicks) body.settings = { transcript: controlPicks.transcript };
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
          recurrence: freq === "none" ? undefined : { freq, interval: 1, count: Number(count) || 4, skipWeekOffs },
          reminderMinutes: reminderPick ?? undefined,
          allowJoinBeforeHost: joinBeforePick ?? undefined,
          settings: Object.keys(controlPicks).length ? controlPicks : undefined,
          notifyMode,
          sendEmail: notifyMode !== "none",
        });
        toast.success(res.occurrences > 1 ? `${res.occurrences} meetings scheduled` : "Meeting scheduled");
        if (freq !== "none" && res.occurrences < (Number(count) || 4)) toast(`Only ${res.occurrences} session${res.occurrences > 1 ? "s" : ""} could be scheduled with these repeat settings`, { icon: "📅" });
        if (res.recurrence?.skippedWeekOffs) toast(`${res.recurrence.skippedWeekOffs} session${res.recurrence.skippedWeekOffs > 1 ? "s" : ""} skipped because of your week-off`, { icon: "📅" });
        if (res.recurrence?.firstOnWeekOff) toast("The first meeting falls on your week-off", { icon: "⚠️" });
        if (res.guests?.invited?.length) toast.success(`${res.guests.invited.length} outside guest${res.guests.invited.length > 1 ? "s" : ""} emailed a PIN`);
        (res.guests?.skipped || []).forEach((g) => toast(`${g.email}: ${GUEST_SKIP_REASON[g.reason] || g.reason}`, { icon: "⚠️" }));
        if (res.conflicts?.length) toast(`${res.conflicts.length} invitee${res.conflicts.length > 1 ? "s have" : " has"} a clash at this time`, { icon: "⚠️" });
        onSaved?.(res.meeting);
      }
      onClose();
    } catch (e) {
      setAskNotify(false);
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
  const agendaCount = agenda.split("\n").filter((l) => l.trim()).length;
  const busyPeople = [...new Map(busy.map((b) => [b.key, b])).values()];
  const checks = [
    [instant || !!title.trim(), "Title added"],
    [edit || total > 0 || (everyone && !instant), "Attendees invited"],
    [!showWhen || (!!start && start.getTime() >= Date.now() - 5 * 60000), "Start time is valid"],
  ];
  const ready = checks.filter(([ok]) => ok).length;

  return (
    <div className="mtg-root fixed inset-0 z-[80] bg-gray-900/55 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes mtgDrawerIn{from{transform:translateX(48px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion:reduce){.mtg-drawer{animation:none!important}}`}</style>
      <div className="flex h-full justify-end">
        <div ref={dlgRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={heading} style={{ animation: "mtgDrawerIn .28s ease-out" }} className="mtg-drawer relative flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl outline-none sm:rounded-l-2xl">
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#3d0023] via-[#730042] to-[#CD166E] px-5 py-4 text-white sm:px-7 sm:py-5">
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

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px]">
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
                      <textarea className={cx(inputCls, "mb-3")} rows={2} aria-label="Outside guests" value={guestText} onChange={(e) => setGuestText(e.target.value)} placeholder={"client@company.com\nAlex Morgan <alex@example.com>"} />
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
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <div role="status" className={cx("flex gap-2 rounded-lg p-3 text-sm lg:hidden", busy.length ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700")}>
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

              {instant && (
                <Section icon={SlidersHorizontal} title="Options">
                  <div className="rounded-lg border border-gray-200">
                    <Switch checked={transcriptOn} onChange={(v) => setControlPicks((c) => ({ ...c, transcript: v }))} label="Meeting transcript" hint={transcriptOn ? "What is said is saved as a transcript the host can share" : "Nothing is saved, live captions still work"} />
                  </div>
                </Section>
              )}

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
                        {freq !== "none" && (
                          <div className="mt-2 rounded-lg border border-gray-200">
                            <Switch checked={skipWeekOffs} onChange={setSkipWeekOffs} label="Skip week-offs" hint="A session that falls on your week-off is skipped and not counted" />
                          </div>
                        )}
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
                      <Switch checked={transcriptOn} onChange={(v) => setControlPicks((c) => ({ ...c, transcript: v }))} label="Meeting transcript" hint={transcriptOn ? "What is said is saved as a transcript the host can share" : "Nothing is saved, live captions still work"} />
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

            <aside aria-label="Summary" className="hidden min-h-0 flex-col gap-5 overflow-y-auto border-l border-gray-200 bg-white p-5 lg:flex">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
                <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
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
                      <div className="min-w-0 flex-1 text-sm">
                        {everyone ? (
                          <p className="text-gray-800">Whole organisation</p>
                        ) : total ? (
                          <>
                            <p className="font-medium text-gray-900">
                              {people.length} invited{guestList.length ? ` · ${guestList.length} guest${guestList.length > 1 ? "s" : ""}` : ""}
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {people.slice(0, 4).map((p) => (
                                <li key={p.key} className="flex items-center gap-2">
                                  <Avatar name={p.name} photo={p.photo} size={22} />
                                  <span className="truncate text-xs text-gray-700">{p.name}</span>
                                </li>
                              ))}
                              {people.length > 4 && <li className="pl-8 text-xs text-gray-500">+{people.length - 4} more</li>}
                            </ul>
                          </>
                        ) : (
                          <p className="text-gray-400">No one invited yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {showWhen && (
                <div>
                  <h4 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Availability
                    {avail.isPending && <Loader2 size={13} className="animate-spin text-[#730042]" aria-label="Checking availability" />}
                  </h4>
                  {!people.length && !everyone ? (
                    <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-500">Add attendees to see who is free at this time.</p>
                  ) : !avail.data ? (
                    <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">Checking calendars…</p>
                  ) : busyPeople.length ? (
                    <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <AlertTriangle size={15} className="shrink-0" aria-hidden="true" /> {busyPeople.length} {busyPeople.length > 1 ? "people are" : "person is"} busy
                      </p>
                      <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                        {busyPeople.slice(0, 6).map((b, i) => (
                          <li key={b.key || i} className="text-xs leading-snug">
                            <span className="block font-medium">{b.name}</span>
                            <span className="block text-amber-800/80">
                              {b.title || "Another meeting"} · {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {busyPeople.length > 6 && <p className="mt-2 text-xs text-amber-800/80">and {busyPeople.length - 6} more</p>}
                    </div>
                  ) : (
                    <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                      <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" /> Everyone is free at this time
                    </p>
                  )}
                </div>
              )}

              {!instant && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Settings</h4>
                  <ul className="space-y-2">
                    <SumRow on={reminder > 0}>{reminder > 0 ? `Reminder ${reminder} min before` : "No reminder"}</SumRow>
                    {!edit && <SumRow on={freq !== "none"}>{freq !== "none" ? `Repeats ${FREQ_LABEL[freq]}, ${Number(count) || 4} times${skipWeekOffs ? ", skips week-offs" : ""}` : "Does not repeat"}</SumRow>}
                    {!edit && <SumRow on={!!controls.lobby}>Waiting room</SumRow>}
                    {!edit && <SumRow on={!!controls.muteOnEntry}>Mute on entry</SumRow>}
                    <SumRow on={joinBefore}>Join before host</SumRow>
                    <SumRow on={agendaCount > 0}>{agendaCount > 0 ? `${agendaCount} agenda topic${agendaCount > 1 ? "s" : ""}` : "No agenda"}</SumRow>
                    <SumRow on={transcriptOn}>{transcriptOn ? "Transcript on" : "Transcript off"}</SumRow>
                  </ul>
                </div>
              )}

              {!instant && (
                <div className="mt-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5"><ListChecks size={14} className="text-[#730042]" aria-hidden="true" /> Ready to send</span>
                    <span>{ready}/{checks.length}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                    <div className="h-full rounded-full bg-[#730042] transition-all" style={{ width: `${(ready / checks.length) * 100}%` }} />
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {checks.map(([ok, label]) => (
                      <SumRow key={label} on={ok}>{label}</SumRow>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          <footer className="mtg-safe-b flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 pt-3 sm:px-6">
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

          {askNotify && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !saving && setAskNotify(false)}>
              <div role="alertdialog" aria-modal="true" aria-labelledby="mtg-notify-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                <h3 id="mtg-notify-title" className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Bell size={18} className="text-[#730042]" aria-hidden="true" /> Send notification to?
                </h3>
                <p className="mt-1 text-xs text-gray-500">Choose who is told about this meeting.</p>
                <div role="radiogroup" aria-label="Notify" className="mt-4 space-y-2">
                  {NOTIFY_OPTIONS.map(([v, label, hint]) => (
                    <button key={v} type="button" role="radio" aria-checked={notifyMode === v} onClick={() => setNotifyMode(v)} className={cx("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition", notifyMode === v ? "border-[#730042] bg-[#730042]/[0.05] ring-1 ring-[#730042]/30" : "border-gray-200 hover:border-[#730042]/40")}>
                      <span className={cx("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", notifyMode === v ? "border-[#730042] bg-[#730042]" : "border-gray-300")}>
                        {notifyMode === v && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{label}</span>
                        <span className="block text-xs text-gray-500">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {notifyMode === "none" && guestList.length > 0 && <p className="mt-3 text-xs text-amber-700">Outside guests still receive their join PIN, they cannot enter without it.</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Btn variant="ghost" onClick={() => setAskNotify(false)}>
                    Back
                  </Btn>
                  <Btn loading={saving} onClick={save}>
                    Schedule
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}