import toast from "react-hot-toast";
import { useUpdateMeetingSettings } from "../../../auth/server-state/meeting/meeting.hook";
import { Field, inputCls } from "../ui";
import { errMsg } from "../meetingUtils";

const TOGGLES = [
  ["lobby", "Waiting room", "Members wait until you admit them. (Outside guests always wait.)"],
  ["muteOnEntry", "Mute people on entry", "Everyone except hosts joins muted."],
  ["allowUnmute", "Let people unmute themselves", "Turn off to keep participants muted unless you unmute them."],
  ["chatEnabled", "In-meeting chat", "Participants can send messages during the meeting."],
  ["reactionsEnabled", "Reactions", "Participants can send emoji reactions."],
  ["handRaiseEnabled", "Raise hand", "Participants can raise a hand to speak."],
];

// Applies instantly (and live, if the meeting is already running).
export default function SettingsTab({ meeting: m }) {
  const update = useUpdateMeetingSettings();
  const s = m.settings || {};
  const set = (patch) => update.mutate({ id: m.id, ...patch }, { onError: (e) => toast.error(errMsg(e)) });

  return (
    <div className="space-y-5 p-5">
      <p className="text-sm text-gray-500">These controls apply to everyone in this meeting. Changes take effect immediately, even while it's running.</p>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {TOGGLES.map(([key, label, hint]) => (
          <li key={key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{hint}</p>
            </div>
            <input type="checkbox" role="switch" aria-label={label} checked={!!s[key]} disabled={update.isPending} onChange={(e) => set({ [key]: e.target.checked })} className="h-4 w-4 accent-[#730042]" />
          </li>
        ))}
      </ul>
      <Field label="Who can share their screen">
        <select className={inputCls} value={s.screenShare || "everyone"} disabled={update.isPending} onChange={(e) => set({ screenShare: e.target.value })}>
          <option value="everyone">Everyone</option>
          <option value="host">Host and co-hosts only</option>
        </select>
      </Field>
    </div>
  );
}
