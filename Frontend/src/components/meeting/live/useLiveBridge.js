import { useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useCall from "../../../../realtime/useCall";
import { getSocket } from "../../../../realtime/socket";
import { emitQuiet } from "../../../../realtime/chatSocket";
import { MEETING_LIVE_KEYS } from "../../../../auth/server-state/meeting/meetingLive.hook";
import { EV, LISTEN } from "./liveEvents";
import { useLiveStore } from "./liveStore";
import useAudioActivity from "./useAudioActivity";
import { playSound } from "./sounds";

// Mounted ONCE inside MeetingRoom. Binds the live-tool socket events to liveStore, detects who is
// speaking (own mic + remote audio) and shares our own speaking state with the room.
export default function useLiveBridge() {
  const { active, peers, myKey } = useCall();
  const qc = useQueryClient();
  const roomKey = active?.roomKey;
  const meetingId = active?.meetingId;
  const selfKey = myKey || "me";

  // --- socket -> store
  useEffect(() => {
    if (!roomKey) return undefined;
    const st = () => useLiveStore.getState();
    st().reset();
    const socket = getSocket();
    const mine = (p) => !p?.roomKey || p.roomKey === roomKey;
    const idOf = (p) => p?.key || p?.socketId || p?.by || "";

    const handlers = {
      [EV.speaking]: (p) => mine(p) && idOf(p) && idOf(p) !== selfKey && st().setSpeaking(idOf(p), p.speaking ?? p.on ?? true),
      [EV.spotlight]: (p) => mine(p) && st().setSpotlight(p?.key || p?.socketId || null),
      [EV.caption]: (p) => {
        if (!mine(p) || !p?.text) return;
        if (idOf(p) === selfKey) return; // own captions are added locally
        st().addCaption({ key: idOf(p), name: p.name || "Someone", text: p.text, final: p.final !== false, at: p.at || Date.now() });
      },
      [EV.recording]: (p) => {
        if (!mine(p)) return;
        const was = st().recording.on;
        st().setRecording(p);
        const now = useLiveStore.getState().recording.on;
        if (now !== was) playSound(now ? "record" : "leave");
      },
      [EV.flags]: (p) => mine(p) && st().setFlags(p),

      [EV.boardStroke]: (p) => mine(p) && p?.stroke && st().boardAdd({ ...p.stroke, key: p.stroke.key || idOf(p) }),
      [EV.boardUndo]: (p) => {
        if (!mine(p)) return;
        if (p?.strokeId) st().boardRemove(p.strokeId);
        else if (idOf(p)) st().boardRemoveLastOf(idOf(p));
      },
      [EV.boardClear]: (p) => mine(p) && st().boardClear(),
      [EV.boardView]: (p) => mine(p) && st().boardViewOnly(p?.viewOnly ?? p?.on),

      [EV.timerStart]: (p) => mine(p) && st().timerApply(p, "start"),
      [EV.timerResume]: (p) => mine(p) && st().timerApply(p, "start"),
      [EV.timerPause]: (p) => mine(p) && st().timerApply(p, "pause"),
      [EV.timerReset]: (p) => mine(p) && st().timerApply(p, "reset"),
      [EV.agendaSet]: (p) => mine(p) && st().agendaApply(p),
      [EV.agendaNext]: (p) => {
        if (!mine(p)) return;
        if (p?.currentId != null || p?.currentIndex != null || p?.items) st().agendaApply(p);
        else st().agendaNext();
      },
      [EV.agendaToggle]: (p) => mine(p) && p?.items && st().agendaApply(p),

      [EV.pulseStart]: (p) => mine(p) && st().pulseApply({ ...p, open: true, votes: p?.votes || {}, total: 0 }),
      [EV.pulseVote]: (p) => mine(p) && st().pulseApply(p),
      [EV.pulseClose]: (p) => mine(p) && st().pulseApply({ ...p, open: false }),
      [EV.wheelSpin]: (p) => mine(p) && st().wheelApply(p),
      [EV.kudosReceived]: (p) => {
        if (p?.roomKey && p.roomKey !== roomKey) return;
        st().kudosPush({ id: `${Date.now()}`, from: p?.fromName || p?.from?.name || "Someone", message: p?.message || p?.text || "", emoji: p?.emoji || "🎉" });
        playSound("kudos");
      },
    };
    EV.decisionChanged.forEach((ev) => (handlers[ev] = (p) => mine(p) && st().decisionApply(p)));
    const refetchQa = () => meetingId && qc.invalidateQueries({ queryKey: MEETING_LIVE_KEYS.questions(meetingId) });
    EV.qaChanged.forEach((ev) => (handlers[ev] = refetchQa));

    LISTEN.forEach((ev) => handlers[ev] && socket.on(ev, handlers[ev]));
    return () => {
      LISTEN.forEach((ev) => handlers[ev] && socket.off(ev, handlers[ev]));
      st().reset();
    };
  }, [roomKey, meetingId, selfKey, qc]);

  // --- who is speaking (own mic + remote audio)
  const entries = useMemo(
    () => [
      { id: selfKey, stream: active?.localStream, enabled: !!active?.audio },
      ...peers.map((p) => ({ id: p.key || p.socketId, stream: p.stream, enabled: p.audio !== false })),
    ],
    [active?.localStream, active?.audio, peers, selfKey],
  );

  const onSpeak = useCallback(
    (id, on) => {
      useLiveStore.getState().setSpeaking(id, on);
      if (id === selfKey && roomKey) emitQuiet(EV.speaking, { roomKey, speaking: on });
    },
    [selfKey, roomKey],
  );
  useAudioActivity(roomKey ? entries : [], onSpeak);

  // --- talk time: +1s for everyone currently speaking
  useEffect(() => {
    if (!roomKey) return undefined;
    const t = setInterval(() => useLiveStore.getState().tickTalk(), 1000);
    return () => clearInterval(t);
  }, [roomKey]);
}
