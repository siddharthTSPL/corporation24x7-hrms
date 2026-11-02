import toast from "react-hot-toast";
import useCall from "../../../realtime/useCall";
import { useMeetingReactions } from "../../../auth/server-state/meeting/meeting.hook";

const FALLBACK = ["👍", "👏", "❤️", "😂", "😮", "🎉", "🙏", "👎", "🔥", "💯", "🚀", "💡", "🤔", "😢"];

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export default function ReactionTray({ onDone, canLoad = true }) {
  const { sendReaction } = useCall();
  const { data } = useMeetingReactions(canLoad);
  const list = data && data.length ? data : FALLBACK;

  const send = (emoji) => {
    Promise.resolve(sendReaction(emoji)).catch((err) => toast.error(err?.message || "Couldn't send reaction."));
    if (onDone) onDone();
  };

  return (
    <div role="menu" aria-label="Send a reaction" className="grid w-max max-w-[calc(100vw-1.5rem)] grid-cols-7 gap-1 rounded-2xl border border-[#2E2E35] bg-[#1B1B20] p-2.5 shadow-2xl">
      {list.map((emoji) => (
        <button key={emoji} type="button" role="menuitem" aria-label={`React ${emoji}`} onClick={() => send(emoji)} style={{ fontFamily: EMOJI_FONT }} className="flex h-10 w-10 items-center justify-center rounded-xl text-[22px] leading-none transition-transform hover:scale-125 hover:bg-white/10 active:scale-95">
          {emoji}
        </button>
      ))}
    </div>
  );
}
