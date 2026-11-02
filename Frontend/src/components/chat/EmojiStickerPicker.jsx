import { useMemo, useState } from "react";
import { EMOJI_CATEGORIES, STICKER_PACKS } from "./emojiData";

const RECENT_KEY = "hrms_chat_recent_emoji";

const readRecent = () => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, 24) : [];
  } catch {
    return [];
  }
};

const writeRecent = (emoji) => {
  try {
    const next = [emoji, ...readRecent().filter((e) => e !== emoji)].slice(0, 24);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked - recents just won't persist */
  }
};

// Emoji + sticker panel that opens above the composer.
//   onEmoji("😀")      -> insert into the text box (panel stays open so you can add several)
//   onSticker("id")    -> sends the sticker right away
export default function EmojiStickerPicker({ onEmoji, onSticker, onClose }) {
  const [tab, setTab] = useState("emoji");
  const [cat, setCat] = useState("recent");
  const [pack, setPack] = useState(STICKER_PACKS[0].id);
  const [recent, setRecent] = useState(readRecent);

  const categories = useMemo(
    () => (recent.length ? [{ id: "recent", icon: "🕘", name: "Recent", emojis: recent }, ...EMOJI_CATEGORIES] : EMOJI_CATEGORIES),
    [recent],
  );
  const activeCat = categories.find((c) => c.id === cat) || categories[0];
  const activePack = STICKER_PACKS.find((p) => p.id === pack) || STICKER_PACKS[0];

  const pickEmoji = (e) => {
    writeRecent(e);
    setRecent(readRecent());
    onEmoji(e);
  };

  return (
    <div className="border-t border-gray-100 bg-white">
      <div className="flex items-center justify-between px-3 pt-2">
        <div className="flex gap-1">
          {[
            ["emoji", "Emoji"],
            ["stickers", "Stickers"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${tab === id ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1">
          Close
        </button>
      </div>

      {tab === "emoji" ? (
        <>
          <div className="flex gap-0.5 px-2 pt-2 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.name}
                onClick={() => setCat(c.id)}
                className={`w-8 h-8 flex-shrink-0 text-lg rounded-lg flex items-center justify-center ${activeCat.id === c.id ? "bg-[#F6E8EF]" : "hover:bg-gray-100"}`}
              >
                {c.icon}
              </button>
            ))}
          </div>
          <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{activeCat.name}</p>
          <div className="grid grid-cols-8 gap-0.5 px-2 pb-2 h-40 overflow-y-auto content-start">
            {activeCat.emojis.map((e, i) => (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => pickEmoji(e)}
                className="h-9 text-[22px] rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1 px-2 pt-2 overflow-x-auto">
            {STICKER_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPack(p.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${activePack.id === p.id ? "bg-[#F6E8EF] text-[#730042]" : "text-gray-500 hover:bg-gray-100"}`}
              >
                <span className="text-base">{p.icon}</span> {p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 p-2 h-44 overflow-y-auto content-start">
            {activePack.stickers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSticker(s.id)}
                title={s.label}
                className="rounded-xl py-1.5 flex flex-col items-center hover:scale-105 transition-transform"
                style={{ background: s.bg }}
              >
                <span className="text-[30px] leading-none">{s.emoji}</span>
                <span className="text-[9px] font-bold text-gray-700 mt-1 px-1 text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
