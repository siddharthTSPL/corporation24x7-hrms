import { findSticker } from "./emojiData";

// Draws a sticker from its id. Unknown ids (old / custom) fall back to the id text so nothing breaks.
export default function StickerView({ id, size = 96 }) {
  const s = findSticker(id);
  if (!s) return <span className="text-5xl leading-none">{id}</span>;
  return (
    <div
      className="inline-flex flex-col items-center justify-center rounded-2xl px-3 pt-2 pb-1.5 select-none"
      style={{ background: s.bg, minWidth: size }}
    >
      <span style={{ fontSize: size * 0.58, lineHeight: 1.1 }}>{s.emoji}</span>
      <span className="text-[11px] font-bold text-gray-700 mt-0.5 text-center leading-tight max-w-[140px]">{s.label}</span>
    </div>
  );
}
