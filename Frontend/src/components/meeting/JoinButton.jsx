import { useState } from "react";
import { Video, Mic, Loader2 } from "lucide-react";
import useCall from "../../realtime/useCall";
import { useMeetingJoinInfo } from "../../auth/server-state/meeting/meeting.hook";
import PreJoinDialog from "./room/live/PreJoinDialog";
import { Btn, Chip } from "./ui";
import { fmtTime, startOfDay, useNow, errMsg } from "./meetingUtils";

// Join states: not open yet -> "Opens 9:50 AM" · open -> Join · waiting for host -> cancel · already in -> chip.
export default function JoinButton({ meeting: m, size = "md", className }) {
  const now = useNow();
  const { joinMeeting, active, waiting, cancelWaiting } = useCall();
  const [pre, setPre] = useState(false);

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

  // Join opens the pre-join screen (preview, devices, join muted / camera off); the dialog does the actual join.
  const openPreJoin = (e) => {
    e.stopPropagation();
    setPre(true);
  };

  const join = async ({ audio, video }) => {
    try {
      await joinMeeting(m.id, { media: m.media, audio, video });
      setPre(false);
    } catch (err) {
      // "waiting for host" / lobby are normal states the room handles itself
      if (err?.code === "WAITING_FOR_HOST" || err?.code === "TOO_EARLY") return setPre(false);
      throw new Error(errMsg(err)); // the pre-join dialog shows it
    }
  };

  return (
    <>
      <Btn size={size} className={className} disabled={blocked} onClick={openPreJoin} title={blocked ? info?.message : undefined}>
        <Icon size={15} /> {m.status === "live" ? "Join now" : "Join"}
      </Btn>
      {pre && <PreJoinDialog title={m.title} audioOnly={m.media === "audio"} onClose={() => setPre(false)} onJoin={join} />}
    </>
  );
}
