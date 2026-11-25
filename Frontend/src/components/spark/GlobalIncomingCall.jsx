import { memo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaPhoneAlt, FaPhoneSlash, FaVideo } from "react-icons/fa";
import { useSparkStore } from "../../auth/store/spark/sparkStore";
import Avatar from "../chat/Avatar";

// Global incoming-call card.
//
// Mounted ONCE, in MainLayout, so it shows on every page and keeps showing
// while the user switches pages or chats - and never inside the chat panel.
// Spark (the iframe) owns the real call/socket; it reports ringing calls via
// postMessage (-> sparkStore.incoming) and receives accept / decline back as
// commands (-> sparkStore.command, delivered by <SparkFrame/>).
//
// Layout: fixed, top-centre, slightly below the top edge, compact. The wrapper
// ignores pointer events so only the card itself is clickable - no full-screen
// blocking layer, sidebar / navbar stay usable.

const MAX_VISIBLE = 3;

const subtitleOf = (c) => {
  const type = c.media === "video" ? "Video" : "Voice";
  if (c.kind === "meeting") return "Meeting invite";
  if (c.kind === "group" && c.conversationName) return `${c.conversationName} · ${type} call`;
  return `${type} call`;
};

const CallCard = memo(function CallCard({ call, inCall, onAccept, onDecline }) {
  const caller = call.from?.name || call.conversationName || "Incoming call";
  const video = call.media === "video";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
      role="alertdialog"
      aria-label={`Incoming ${video ? "video" : "voice"} call from ${caller}`}
      className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-[#730042]/10 bg-white/95 p-3 pr-3.5 shadow-[0_12px_32px_-8px_rgba(60,0,35,0.35)] ring-1 ring-black/5 backdrop-blur"
    >
      {/* avatar with a soft ringing pulse */}
      <div className="relative flex-shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#730042]/25 [animation-duration:1.8s]" aria-hidden="true" />
        <div className="relative">
          <Avatar name={caller} photo={call.from?.photo || ""} size={46} seed={call.from?.key || call.roomKey} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-gray-900">{caller}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E8EF] px-1.5 py-0.5 text-[10px] font-semibold text-[#730042]">
            {video ? <FaVideo className="text-[9px]" /> : <FaPhoneAlt className="text-[8px]" />}
            {video ? "Video" : "Audio"}
          </span>
          <span className="truncate">{inCall ? "Incoming · you're on another call" : `Incoming · ${subtitleOf(call)}`}</span>
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onDecline(call)}
          title="Reject"
          aria-label="Reject call"
          className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-200 transition hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <FaPhoneSlash className="text-[15px]" />
        </button>
        {!inCall && (
          <button
            type="button"
            onClick={() => onAccept(call)}
            title="Accept"
            aria-label="Accept call"
            className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {video ? <FaVideo className="text-[15px]" /> : <FaPhoneAlt className="text-[14px]" />}
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default function GlobalIncomingCall() {
  const incoming = useSparkStore((s) => s.incoming);
  const inCall = useSparkStore((s) => s.inCall);

  const accept = useCallback((call) => {
    const st = useSparkStore.getState();
    // Opens the dock so the existing call screen is visible, then Spark joins.
    st.sendCommand({ type: "accept-call", roomKey: call.roomKey, media: call.media });
    st.dropIncoming(call.roomKey);
  }, []);

  const decline = useCallback((call) => {
    const st = useSparkStore.getState();
    st.sendCommand({ type: "decline-call", roomKey: call.roomKey }, { open: false });
    st.dropIncoming(call.roomKey);
  }, []);

  const visible = incoming.slice(0, MAX_VISIBLE);

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-3 z-[1100] flex w-[min(400px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-2 sm:top-4"
      style={{ marginTop: "env(safe-area-inset-top)" }}
    >
      <AnimatePresence initial={false}>
        {visible.map((call) => (
          <CallCard key={call.roomKey} call={call} inCall={inCall} onAccept={accept} onDecline={decline} />
        ))}
      </AnimatePresence>
      {incoming.length > MAX_VISIBLE && (
        <p className="pointer-events-auto self-center rounded-full bg-gray-900/80 px-3 py-1 text-[11px] font-medium text-white">
          +{incoming.length - MAX_VISIBLE} more incoming
        </p>
      )}
    </div>
  );
}
