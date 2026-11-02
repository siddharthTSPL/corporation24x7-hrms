import toast from "react-hot-toast";
import useCall from "../../../realtime/useCall";
import { useMeetingReactions } from "../../../auth/server-state/meeting/meeting.hook";

const FALLBACK = ["👍", "👏", "❤️", "😂", "😮", "🎉", "🙏", "👎", "🔥", "💯", "🚀", "💡", "🤔", "😢"];

export default function ReactionTray({ onDone, canLoad = true }) {
  const { sendReaction } = useCall();
  const { data } = useMeetingReactions(canLoad);
  const list = data && data.length ? data : FALLBACK;

  const send = (emoji) => {
    Promise.resolve(sendReaction(emoji)).catch((err) => toast.error(err?.message || "Couldn't send reaction."));
    if (onDone) onDone();
  };

  return (
    <div className="grid grid-cols-7 gap-1 rounded-2xl border border-white/10 bg-[#1f1f24] p-2 shadow-2xl">
      {list.map((emoji) => (
        <button key={emoji} type="button" onClick={() => send(emoji)} className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-transform hover:scale-125 hover:bg-white/10 active:scale-95">
          {emoji}
        </button>
      ))}
    </div>
  );
}
