// Minimal RFC 5545 calendar invite builder (works in Google Calendar, Outlook, Apple Calendar).
const pad = (n) => String(n).padStart(2, "0");
const utc = (d) => {
  const x = new Date(d);
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}${pad(x.getUTCSeconds())}Z`;
};
const esc = (s) => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lines must be <= 75 octets; continuation lines start with one space.
const fold = (line) => {
  const buf = Buffer.from(line, "utf8");
  if (buf.length <= 75) return line;
  const out = [];
  let i = 0;
  let limit = 75;
  while (i < buf.length) {
    let end = Math.min(i + limit, buf.length);
    while (end < buf.length && (buf[end] & 0xc0) === 0x80) end--; // don't split a UTF-8 character
    out.push(buf.slice(i, end).toString("utf8"));
    i = end;
    limit = 74;
  }
  return out.join("\r\n ");
};

/**
 * @param {object} m   meeting-like { id, title, description, agenda, startTime, endTime, sequence }
 * @param {object} o   { method: "REQUEST"|"CANCEL", organizer:{name,email}, attendees:[{name,email,rsvp}], url }
 */
const buildIcs = (m, { method = "REQUEST", organizer, attendees = [], url = "" } = {}) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TorchX Talent//Meetings//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${m.id}@torchx-talent`,
    `SEQUENCE:${m.sequence || 0}`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(m.startTime)}`,
    `DTEND:${utc(m.endTime)}`,
    `SUMMARY:${esc(m.title)}`,
    `DESCRIPTION:${esc([m.description, m.agenda && `Agenda: ${m.agenda}`, url && `Join: ${url}`].filter(Boolean).join("\n\n"))}`,
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
  ];
  if (url) lines.push(`URL:${url}`, `LOCATION:${esc(url)}`);
  if (organizer && organizer.email) lines.push(`ORGANIZER;CN=${esc(organizer.name || organizer.email)}:mailto:${organizer.email}`);
  for (const a of attendees) {
    if (!a.email) continue;
    const partstat = { accepted: "ACCEPTED", declined: "DECLINED", tentative: "TENTATIVE" }[a.rsvp] || "NEEDS-ACTION";
    lines.push(`ATTENDEE;CN=${esc(a.name || a.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=${partstat}:mailto:${a.email}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
};

module.exports = { buildIcs, utc, esc, fold };
