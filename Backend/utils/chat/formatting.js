// Message formatting (WhatsApp-style) + link extraction. Pure functions, no DB.
//
//   *bold*   _italic_   ~strike~   `inline code`   ```code block```
//
// The message `text` is stored exactly as typed (markers included). Alongside it we
// store `entities`, so every client renders the same thing without writing its own parser:
//   { type, start, end, contentStart, contentEnd }
// All offsets are JS string indices (UTF-16 code units) into `text`.
//   [start, end)               -> whole span, markers included
//   [contentStart, contentEnd) -> what to show (hide the markers around it)

const MAX_ENTITIES = 100;
const MASK = "\u0001";

const mask = (s, from, to) => s.slice(0, from) + MASK.repeat(to - from) + s.slice(to);

// marker char -> entity type. Code is handled first so nothing inside it is formatted.
const INLINE = [
  ["bold", "*"],
  ["italic", "_"],
  ["strike", "~"],
];

const escapeClass = (ch) => ch.replace(/[\\\]^-]/g, "\\$&");

const inlineRegex = (ch) => {
  const c = escapeClass(ch);
  const lit = ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // marker must not touch a word char / same marker on the outside, and must hug non-space text inside
  return new RegExp(`(?<![\\w${c}])${lit}(?=[^\\s${c}])([^${c}\\n]*?[^\\s${c}])${lit}(?![\\w${c}])`, "g");
};
const INLINE_RE = new Map(INLINE.map(([type, ch]) => [type, inlineRegex(ch)]));

const parseFormatting = (input) => {
  const text = String(input == null ? "" : input);
  if (!text || !/[*_~`]/.test(text)) return [];

  const entities = [];
  let masked = text;

  // 1) ```code block```
  for (const m of text.matchAll(/```([\s\S]+?)```/g)) {
    if (!m[1].trim()) continue;
    entities.push({ type: "pre", start: m.index, end: m.index + m[0].length, contentStart: m.index + 3, contentEnd: m.index + m[0].length - 3 });
    masked = mask(masked, m.index, m.index + m[0].length);
  }

  // 2) `inline code`
  const afterPre = masked;
  for (const m of afterPre.matchAll(/`([^`\n]+?)`/g)) {
    if (!m[1].trim()) continue;
    entities.push({ type: "code", start: m.index, end: m.index + m[0].length, contentStart: m.index + 1, contentEnd: m.index + m[0].length - 1 });
    masked = mask(masked, m.index, m.index + m[0].length);
  }

  // 3) bold / italic / strike - scanned on the masked text, so code regions are never touched
  //    and different markers may nest (*_bold italic_*).
  const scan = masked;
  for (const [type] of INLINE) {
    for (const m of scan.matchAll(INLINE_RE.get(type))) {
      entities.push({ type, start: m.index, end: m.index + m[0].length, contentStart: m.index + 1, contentEnd: m.index + m[0].length - 1 });
    }
  }

  entities.sort((a, b) => a.start - b.start || b.end - a.end);
  return entities.slice(0, MAX_ENTITIES);
};

// Same text with the markers removed - used for notification / chat-list previews and search snippets.
const stripFormatting = (input, entities) => {
  const text = String(input == null ? "" : input);
  const ents = entities || parseFormatting(text);
  if (!ents.length) return text;
  const drop = new Set();
  for (const e of ents) {
    for (let i = e.start; i < e.contentStart; i++) drop.add(i);
    for (let i = e.contentEnd; i < e.end; i++) drop.add(i);
  }
  let out = "";
  for (let i = 0; i < text.length; i++) if (!drop.has(i)) out += text[i];
  return out;
};

// ---------- links ----------

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const MAX_LINKS = 10;
const MAX_URL_LENGTH = 2000;

const cleanTrailing = (u) => {
  let url = u;
  // strip trailing punctuation, and a closing bracket only if it has no opener inside the url
  for (;;) {
    const last = url[url.length - 1];
    if (/[.,;:!?'"*_~]/.test(last)) url = url.slice(0, -1);
    else if (last === ")" && !url.includes("(")) url = url.slice(0, -1);
    else if (last === "]" && !url.includes("[")) url = url.slice(0, -1);
    else break;
  }
  return url;
};

const extractUrls = (input) => {
  const text = String(input == null ? "" : input);
  if (!text) return [];
  const seen = new Set();
  const out = [];
  for (const m of text.matchAll(URL_RE)) {
    let raw = cleanTrailing(m[0]);
    if (/^www\./i.test(raw)) raw = `https://${raw}`;
    if (raw.length > MAX_URL_LENGTH) continue;
    let parsed;
    try { parsed = new URL(raw); } catch { continue; }
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".")) continue;
    const href = parsed.href;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push(href);
    if (out.length >= MAX_LINKS) break;
  }
  return out;
};

module.exports = { parseFormatting, stripFormatting, extractUrls, MAX_ENTITIES, MAX_LINKS };
