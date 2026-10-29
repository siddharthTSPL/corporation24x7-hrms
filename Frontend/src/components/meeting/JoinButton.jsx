import { Video, Mic, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import useCall from "../../realtime/useCall";
import { useMeetingJoinInfo } from "../../auth/server-state/meeting/meeting.hook";
import { Btn, Chip } from "./ui";
import { fmtTime, startOfDay, useNow, errMsg } from "./meetingUtils";

// Join states: not open yet -> "Opens 9:50 AM" · open -> Join · waiting for host -> cancel · already in -> chip.
export default function JoinButton({ meeting: m, size = "md", className }) {
  const now = useNow();
  const { joinMeeting, active, waiting, cancelWaiting } = useCall();

  const joinable = m.status === "live" || m.status === "scheduled";
  const opensAt = new Date(m.opensAt || m.startTime).getTime();
  const isOpen = joinable && (m.status === "live" || now >= opensAt - 60000);
  const { data: info } = useMeetingJoinInfo(m.id, isOpen);

  if (!joinable) return null;

  const roomKey = m.roomKey || `meeting:${m.id}`;
  if (active?.roomKey === roomKey) return <Chip tone="green">You're in this meeting</Chip>;

  if (waiting && waiting.meetingId === m.id) {
    return (
      <Btn variant="secondary" size={size} className={className} onClick={cancelWaiting}>
        <Loader2 size={14} className="animate-spin" /> Waiting for host · Cancel
      </Btn>
    );
  }

  if (!isOpen) {
    const today = startOfDay(m.startTime).getTime() === startOfDay().getTime();
    return today ? <span className="text-xs text-gray-500">Opens {fmtTime(opensAt)}</span> : null;
  }

  const blocked = info && !info.canJoin && info.code !== "WAITING_FOR_HOST";
  const Icon = m.media === "audio" ? Mic : Video;

  const join = async (e) => {
    e.stopPropagation();
    try {
      await joinMeeting(m.id, { media: m.media });
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <Btn size={size} className={className} disabled={blocked} onClick={join} title={blocked ? info?.message : undefined}>
      <Icon size={15} /> {m.status === "live" ? "Join now" : "Join"}
    </Btn>
  );
}
