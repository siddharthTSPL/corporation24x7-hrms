const PALETTE = ["#730042", "#0E7490", "#7C3AED", "#B45309", "#047857", "#BE123C", "#1D4ED8", "#4D7C0F"];

export const colorFor = (seed = "") => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export const initials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

export const isSameDay = (a, b) => {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

export const formatClock = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

export const formatListTime = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  if (isSameDay(date, now)) return formatClock(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  if (now - date < 6 * 86400000) return date.toLocaleDateString("en-IN", { weekday: "short" });
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const formatDayLabel = (d) => {
  const date = new Date(d);
  const now = new Date();
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

export const formatLastSeen = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const istDayKey = (value) => {
    const shifted = new Date(value.getTime() + 330 * 60 * 1000);
    return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth()}-${shifted.getUTCDate()}`;
  };
  const today = new Date();
  if (istDayKey(date) === istDayKey(today)) return `today at ${time}`;
  const yesterday = new Date(today.getTime() - 86400000);
  if (istDayKey(date) === istDayKey(yesterday)) return `yesterday at ${time}`;
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return `${day} at ${time}`;
};

export const formatSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDuration = (sec = 0) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const isImage = (mime = "") => mime.startsWith("image/");
export const isAudio = (mime = "") => mime.startsWith("audio/");
export const isVideo = (mime = "") => mime.startsWith("video/");

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/zip",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "video/mp4",
  "video/webm",
];

export const ACCEPT_ATTR = ALLOWED_MIME.join(",");

export const personOf = (m) => ({ model: m.model, id: m.id });

// ---------------------------------------------------------------- message helpers

// "👍", "😂😂", "🙏 ❤️" -> bigger emoji without a bubble (max 3, nothing else in the text)
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*\s*){1,3}$/u;
export const isEmojiOnly = (text = "") => {
  const t = String(text).trim();
  return !!t && t.length <= 24 && EMOJI_ONLY.test(t);
};

// Turns plain text into [{ text } | { url }] so links are clickable.
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/gi;
export const splitLinks = (text = "") =>
  String(text)
    .split(URL_RE)
    .filter((p) => p !== "")
    .map((p) => (/^https?:\/\//i.test(p) ? { url: p } : { text: p }));

// Tick state of one of MY messages: sending | failed | sent | delivered | seen
export const deliveryStatus = (m, others) => {
  if (m.failed) return "failed";
  if (m.pending) return "sending";
  if (!others.length) return "sent";
  const created = new Date(m.createdAt);
  if (others.every((p) => p.lastReadAt && new Date(p.lastReadAt) >= created)) return "seen";
  const delivered = m.deliveredTo || [];
  if (others.every((p) => delivered.includes(p.key) || (p.lastReadAt && new Date(p.lastReadAt) >= created))) return "delivered";
  return "sent";
};

// [{ emoji, count, mine, keys }] sorted by popularity
export const groupReactions = (reactions = [], myKey) => {
  const map = new Map();
  for (const r of reactions) {
    const row = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false, keys: [] };
    row.count += 1;
    row.keys.push(r.key);
    if (r.key === myKey) row.mine = true;
    map.set(r.emoji, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
};

export const previewOf = (m) => {
  if (!m) return "";
  if (m.deleted) return "Message deleted";
  if (m.type === "sticker") return "Sticker";
  if (m.text) return m.text;
  const a = m.attachments?.[0];
  if (a?.mime?.startsWith("audio/")) return "Voice message";
  if (a?.mime?.startsWith("image/")) return "Photo";
  return a?.name || "Attachment";
};
