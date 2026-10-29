import { useState } from "react";
import toast from "react-hot-toast";
import { CalendarPlus, Pencil, XCircle, StopCircle, Video, Mic, Repeat, BellRing, Globe, Lock } from "lucide-react";
import Avatar from "../../chat/Avatar";
import JoinButton from "../JoinButton";
import { RsvpButtons } from "../MeetingCard";
import { Btn, Chip, Modal, Field, inputCls } from "../ui";
import { useCancelMeeting, useEndMeeting, useDownloadMeetingIcs } from "../../../auth/server-state/meeting/meeting.hook";
import { useNudgeMeetingInvitees, useUpdateMeetingSpace, useInterestedPeople, usePromoteInterestedPeople } from "../../../auth/server-state/meeting/meetingSpace.hook";
import { RSVP, errMsg, fmtDate, fmtDuration, fmtTime, minutesBetween } from "../meetingUtils";

function CancelDialog({ meeting: m, onClose }) {
  const [scope, setScope] = useState("this");
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const cancel = useCancelMeeting();
  const go = () =>
    cancel.mutate(
      { id: m.id, scope, reason: reason.trim() || undefined, sendEmail },
      { onSuccess: () => { toast.success("Meeting cancelled"); onClose(); }, onError: (e) => toast.error(errMsg(e)) },
    );
  return (
    <Modal
      open
      onClose={onClose}
      title="Cancel this meeting?"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Keep meeting
          </Btn>
          <Btn variant="danger" loading={cancel.isPending} onClick={go}>
            Cancel meeting
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {m.seriesId && (
          <div className="space-y-1.5 text-sm text-gray-700">
            {[["this", "Only this meeting"], ["series", "This and all future meetings in the series"]].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" className="accent-[#730042]" checked={scope === v} onChange={() => setScope(v)} /> {l}
              </label>
            ))}
          </div>
        )}
        <Field label="Reason (optional)">
          <textarea className={inputCls} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shown to attendees" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="accent-[#730042]" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Email attendees
        </label>
      </div>
    </Modal>
  );
}

function SpaceSettings({ meeting: m }) {
  const upd = useUpdateMeetingSpace();
  const open = m.visibility === "organisation";
  const [cap, setCap] = useState(m.capacity || 0);
  const interested = useInterestedPeople(m.id, open);
  const promote = usePromoteInterestedPeople();
  const people = interested.data?.interested || [];
  const set = (body) => upd.mutate({ id: m.id, ...body }, { onError: (e) => toast.error(errMsg(e)) });

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">{open ? <Globe size={15} /> : <Lock size={15} />} {open ? "Open to the organisation" : "Invite only"}</h4>
          <p className="mt-0.5 text-xs text-gray-500">{open ? "Anyone can find this meeting and say they're interested." : "Only invited people can see this meeting."}</p>
        </div>
        <Btn variant="secondary" size="sm" loading={upd.isPending} onClick={() => set({ visibility: open ? "invite_only" : "organisation" })}>
          {open ? "Make invite only" : "Open up"}
        </Btn>
      </div>

      {open && (
        <>
          <div className="flex items-end gap-2">
            <Field label="Capacity (0 = unlimited)" className="w-40">
              <input type="number" min={0} max={5000} className={inputCls} value={cap} onChange={(e) => setCap(e.target.value)} />
            </Field>
            <Btn variant="secondary" size="sm" disabled={Number(cap) === (m.capacity || 0)} onClick={() => set({ capacity: Number(cap) || 0 })}>
              Save
            </Btn>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">Interested ({interested.data?.count ?? m.interestedCount})</p>
              {people.length > 0 && (
                <Btn size="sm" variant="soft" loading={promote.isPending} onClick={() => promote.mutate({ id: m.id, all: true, sendEmail: true }, { onSuccess: () => toast.success("Invited everyone who was interested"), onError: (e) => toast.error(errMsg(e)) })}>
                  Invite all
                </Btn>
              )}
            </div>
            <ul className="space-y-1.5">
              {people.map((p) => (
                <li key={p.key} className="flex items-center gap-2 text-sm">
                  <Avatar name={p.name} photo={p.photo} size={24} />
                  <span className="flex-1 truncate text-gray-800">{p.name}</span>
                  <Btn size="sm" variant="ghost" onClick={() => promote.mutate({ id: m.id, keys: [p.key], sendEmail: true }, { onError: (e) => toast.error(errMsg(e)) })}>
                    Invite
                  </Btn>
                </li>
              ))}
              {people.length === 0 && <li className="text-xs text-gray-500">No one has shown interest yet.</li>}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

export default function OverviewTab({ meeting: m, moderator, onEdit }) {
  const [cancelling, setCancelling] = useState(false);
  const end = useEndMeeting();
  const ics = useDownloadMeetingIcs();
  const nudge = useNudgeMeetingInvitees();
  const active = m.status === "scheduled" || m.status === "live";
  const Media = m.media === "audio" ? Mic : Video;
  const pending = m.rsvp?.invited || 0;

  return (
    <div className="space-y-5 p-5">
      {m.status === "cancelled" && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">This meeting was cancelled</p>
          {m.cancelReason && <p className="mt-0.5">{m.cancelReason}</p>}
        </div>
      )}

      <div className="space-y-1 text-sm text-gray-700">
        <p className="text-base font-medium text-gray-900">
          {fmtDate(m.startTime, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <p>
          {fmtTime(m.startTime)} – {fmtTime(m.endTime)} · {fmtDuration(minutesBetween(m.startTime, m.endTime))}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Media size={13} /> {m.media === "audio" ? "Audio only" : "Video call"}
          </span>
          {m.seriesId && (
            <span className="inline-flex items-center gap-1">
              <Repeat size={13} /> Part of a series
            </span>
          )}
          {m.timezone && <span>{m.timezone}</span>}
        </div>
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-2">
          <JoinButton meeting={m} />
          <RsvpButtons meeting={m} size="md" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {m.status !== "cancelled" && (
          <Btn variant="secondary" size="sm" loading={ics.isPending} onClick={() => ics.mutate(m.id, { onError: (e) => toast.error(errMsg(e)) })}>
            <CalendarPlus size={14} /> Add to calendar
          </Btn>
        )}
        {moderator && ["scheduled", "live"].includes(m.status) && (
          <Btn variant="secondary" size="sm" onClick={() => onEdit(m)}>
            <Pencil size={14} /> Edit
          </Btn>
        )}
        {moderator && m.status === "live" && (
          <Btn variant="secondary" size="sm" loading={end.isPending} onClick={() => window.confirm("End this meeting for everyone?") && end.mutate(m.id, { onError: (e) => toast.error(errMsg(e)) })}>
            <StopCircle size={14} /> End for everyone
          </Btn>
        )}
        {moderator && m.status === "scheduled" && (
          <Btn variant="dangerSoft" size="sm" onClick={() => setCancelling(true)}>
            <XCircle size={14} /> Cancel meeting
          </Btn>
        )}
        {moderator && m.status === "scheduled" && pending > 0 && (
          <Btn variant="soft" size="sm" loading={nudge.isPending} onClick={() => nudge.mutate({ id: m.id, sendEmail: true }, { onSuccess: (r) => toast.success(`Reminder sent to ${r.nudged ?? pending} ${pending === 1 ? "person" : "people"}`), onError: (e) => toast.error(errMsg(e)) })}>
            <BellRing size={14} /> Remind {pending} who haven't replied
          </Btn>
        )}
      </div>

      {m.description && (
        <section>
          <h4 className="mb-1 text-sm font-semibold text-gray-900">About</h4>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{m.description}</p>
        </section>
      )}
      {m.agenda && (
        <section>
          <h4 className="mb-1 text-sm font-semibold text-gray-900">Agenda</h4>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{m.agenda}</p>
        </section>
      )}

      {moderator && active && <SpaceSettings meeting={m} />}

      <section>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">People ({m.attendeeCount})</h4>
          {["accepted", "tentative", "declined", "invited"].map((k) => m.rsvp?.[k] > 0 && (
            <Chip key={k} tone={RSVP[k].tone}>
              {m.rsvp[k]} {RSVP[k].label.toLowerCase()}
            </Chip>
          ))}
          {m.guestCount > 0 && <Chip>{m.guestCount} guest{m.guestCount > 1 ? "s" : ""}</Chip>}
        </div>
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {(m.attendees || []).map((a) => (
            <li key={a.key} className="flex items-center gap-3 px-3 py-2">
              <Avatar name={a.name} photo={a.photo} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">
                  {a.name} {a.isHost && <span className="text-xs text-gray-400">· Host</span>}
                </p>
                <p className="truncate text-xs text-gray-500">{[a.designation, a.department].filter(Boolean).join(" · ")}</p>
              </div>
              {RSVP[a.rsvp] && <Chip tone={RSVP[a.rsvp].tone}>{RSVP[a.rsvp].label}</Chip>}
            </li>
          ))}
        </ul>
      </section>

      {cancelling && <CancelDialog meeting={m} onClose={() => setCancelling(false)} />}
    </div>
  );
}
