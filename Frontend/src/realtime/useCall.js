import { callManager } from "./webrtc/callManager";
import { useCallStore } from "../auth/store/call/callStore";
import { useChatStore } from "../auth/store/chat/chatStore";

/**
 * Everything a call UI needs. Use it anywhere (chat header buttons, meeting page,
 * a global <IncomingCallModal/>, a floating <CallScreen/>).
 *
 *   const { startCall, incoming, active, toggleAudio, startScreenShare, leave } = useCall();
 *   startCall({ conversationId, media: "video" });     // from a chat
 *   joinMeeting(meetingId);                            // from a meeting page
 *   incoming[0] && <Ring call={incoming[0]} onAccept={() => joinCall({ roomKey, media })} onDecline={() => declineCall(roomKey)} />
 *
 * Rendering streams:  <video ref={el => el && (el.srcObject = peer.stream)} autoPlay playsInline />
 *   - peer.stream        camera + microphone (mute <video> for yourself: localStream)
 *   - peer.screenStream  their shared screen (null when not sharing)
 *   - active.presenterSocketId says who is presenting right now
 */
export default function useCall() {
  const active = useCallStore((s) => s.active);
  const incoming = useCallStore((s) => s.incoming);
  const waiting = useCallStore((s) => s.waiting);
  const lastEnded = useCallStore((s) => s.lastEnded);
  const error = useCallStore((s) => s.error);
  const myKey = useChatStore((s) => s.myKey);
  const setLastEnded = useCallStore((s) => s.setLastEnded);
  const clearError = useCallStore((s) => s.clearError);

  return {
    // state
    active,
    inCall: !!active,
    peers: active ? Object.values(active.peers) : [],
    incoming,
    waiting, // set while waiting for a meeting host
    lastEnded,
    error,
    isHost: !!(active && myKey && active.hostKeys.includes(myKey)),
    myKey,
    isPresenting: !!(active && active.presenterSocketId && active.presenterSocketId === active.mySocketId),

    // actions
    startCall: callManager.startCall,
    joinCall: callManager.joinCall,
    joinMeeting: callManager.joinMeeting,
    cancelWaiting: callManager.cancelWaiting,
    declineCall: callManager.declineCall,
    leave: callManager.leave,
    endForAll: callManager.endForAll,
    toggleAudio: callManager.toggleAudio,
    toggleVideo: callManager.toggleVideo,
    startScreenShare: callManager.startScreenShare,
    stopScreenShare: callManager.stopScreenShare,
    kick: callManager.kick,
    requestMute: callManager.requestMute,
    invitePeople: callManager.invitePeople,
    clearLastEnded: () => setLastEnded(null),
    clearError,
  };
}
