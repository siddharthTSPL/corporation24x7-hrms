import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaTrash, FaReply, FaRegCalendarAlt, FaVideo, FaCoffee, FaUmbrellaBeach, FaBullseye, FaUserFriends, FaHourglassHalf, FaUsers } from "react-icons/fa";
import Avatar from "./Avatar";
import { Header, PageBody, Section, ToggleRow, Segmented, formatBytes } from "./settingsUi";
import {
  useChatSettings, useUpdateChatSettings, useSetChatStatus, useChatAbout, useChatStorage,
  useClearAllChats, useChatReports, useReviewReport,
} from "../../auth/server-state/chat/chatSettings.hook";
import { REPORT_REASONS } from "../../auth/api/chat/chatSettings.api";

const Loading = () => <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>;

// ---------------------------------------------------------------- Profile + status
const PRESETS = [
  { id: "available", label: "Available", dot: "bg-green-500" },
  { id: "busy", label: "Busy", dot: "bg-red-500" },
  { id: "in_meeting", label: "In a meeting", dot: "bg-amber-500" },
  { id: "on_leave", label: "On leave", dot: "bg-sky-500" },
  { id: "custom", label: "Custom", dot: "bg-[#730042]" },
];
const DURATIONS = [
  { id: "1h", label: "1 hour" },
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "never", label: "Never" },
];

export function ProfilePage({ onBack, self }) {
  const { data: s } = useChatSettings();
  const update = useUpdateChatSettings();
  const setStatus = useSetChatStatus();
  const [about, setAbout] = useState("");
  const [preset, setPreset] = useState("");
  const [text, setText] = useState("");
  const [duration, setDuration] = useState("never");

  useEffect(() => {
    if (!s) return;
    setAbout(s.profile.about);
    setPreset(s.status.preset);
    setText(s.status.preset === "custom" ? s.status.text : "");
  }, [s]);

  if (!s) return <div className="flex h-full flex-col bg-[#f5f6f8]"><Header title="Profile & status" onBack={onBack} /><Loading /></div>;

  const aboutDirty = about.trim() !== s.profile.about;
  const saveAbout = () => update.mutate({ profile: { about: about.trim() } }, { onSuccess: () => toast.success("About updated") });
  const saveStatus = () => {
    if (preset === "custom" && !text.trim()) return toast.error("Type your status first.");
    setStatus.mutate({ preset, text: preset === "custom" ? text.trim() : undefined, duration }, { onSuccess: () => toast.success(preset ? "Status updated" : "Status cleared") });
  };
  const expires = s.status.expiresAt ? new Date(s.status.expiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="Profile & status" onBack={onBack} />
      <PageBody>
        <section className="flex items-center gap-4 bg-white px-5 py-5">
          <Avatar name={self?.name || "You"} photo={self?.photo || ""} size={64} seed={self?.key || "me"} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-gray-900">{self?.name || "You"}</p>
            <p className="truncate text-sm text-gray-500">{s.status.text || "No status set"}</p>
          </div>
        </section>

        <Section title="About">
          <div className="px-5 py-3">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value.slice(0, 140))}
              rows={2}
              placeholder="Hey there! I am using TorchX Spark"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#730042]"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">{about.length}/140</span>
              <button type="button" disabled={!aboutDirty || update.isPending} onClick={saveAbout} className="rounded-full bg-[#730042] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Save</button>
            </div>
          </div>
        </Section>

        <Section title="Status" note={expires ? `Current status clears on ${expires}.` : s.status.preset ? "Current status stays until you change it." : undefined}>
          <div className="space-y-1 px-3 py-2">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPreset(p.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${preset === p.id ? "bg-[#F6E8EF] text-[#730042]" : "text-gray-800 hover:bg-gray-50"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
                <span className="flex-1">{p.label}</span>
                {preset === p.id && <FaCheck className="text-xs" />}
              </button>
            ))}
            {preset === "custom" && (
              <input value={text} onChange={(e) => setText(e.target.value.slice(0, 80))} placeholder="What's your status?" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#730042]" />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-5 py-3">
            <span className="text-sm text-gray-700">Clear after</span>
            <Segmented value={duration} options={DURATIONS} onChange={setDuration} />
          </div>
          <div className="flex gap-2 px-5 py-3">
            <button type="button" onClick={saveStatus} disabled={!preset || setStatus.isPending} className="flex-1 rounded-full bg-[#730042] py-2 text-sm font-semibold text-white disabled:opacity-40">Save status</button>
            {s.status.preset && (
              <button type="button" onClick={() => setStatus.mutate({ preset: "" }, { onSuccess: () => { setPreset(""); toast.success("Status cleared"); } })} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Clear</button>
            )}
          </div>
        </Section>
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Auto-reply
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtDate = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const REPLY_TEMPLATES = [
  { label: "In a meeting", icon: FaVideo, text: "I'm in a meeting right now and will get back to you shortly." },
  { label: "Away from desk", icon: FaCoffee, text: "I'm away from my desk and will reply as soon as I'm back." },
  { label: "On leave", icon: FaUmbrellaBeach, text: "I'm on leave and will respond when I'm back. For anything urgent, please contact my manager." },
  { label: "Focus time", icon: FaBullseye, text: "I'm focusing on a task right now and will reply to you soon." },
];

const atHour = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const UNTIL_PRESETS = [
  { label: "1 hour", at: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: "Today 6 PM", at: () => atHour(0, 18) },
  { label: "Tomorrow 9 AM", at: () => atHour(1, 9) },
  { label: "Next Monday 9 AM", at: () => { const d = atHour(0, 9); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return d; } },
];

const CHIP_ON = "border-transparent bg-gradient-to-br from-[#8A0A52] to-[#68003B] text-white shadow-md shadow-[#730042]/20";
const CHIP_OFF = "border-gray-200 bg-white text-gray-700 hover:border-[#730042]/40 hover:bg-[#FBF3F7] hover:text-[#730042]";

function HeroSwitch({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:opacity-60 ${on ? "bg-white" : "bg-white/25"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full shadow transition-all ${on ? "left-[26px] bg-[#730042]" : "left-1 bg-white"}`} />
    </button>
  );
}

function Card({ title, hint, children }) {
  return (
    <section className="mx-4 mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold tracking-tight text-gray-900">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const INFO = [
  { icon: FaUserFriends, text: "One-to-one chats only" },
  { icon: FaHourglassHalf, text: "Once an hour per person" },
  { icon: FaUsers, text: "Groups are never replied" },
];

export function AutoReplyPage({ onBack }) {
  const { data: s } = useChatSettings();
  const update = useUpdateChatSettings();
  const [message, setMessage] = useState("");
  const [until, setUntil] = useState("");
  const [untilPick, setUntilPick] = useState("");

  useEffect(() => {
    if (!s) return;
    setMessage(s.autoReply.message);
    setUntil(toLocalInput(s.autoReply.until));
    setUntilPick("");
  }, [s]);

  if (!s) return <div className="flex h-full flex-col bg-[#f5f6f8]"><Header title="Auto-reply" onBack={onBack} /><Loading /></div>;

  const ar = s.autoReply;
  const dirty = message.trim() !== ar.message || until !== toLocalInput(ar.until);
  const save = (enabled) => {
    const body = { enabled, message: message.trim(), until: until ? new Date(until).toISOString() : null };
    if (enabled && !body.message) return toast.error("Write your auto-reply message first.");
    if (enabled && until && new Date(until).getTime() <= Date.now()) return toast.error("Pick an end time in the future.");
    return update.mutate({ autoReply: body }, { onSuccess: () => toast.success(enabled ? "Auto-reply is on" : "Auto-reply saved") });
  };
  const presets = UNTIL_PRESETS.map((p) => ({ ...p, date: p.at() })).filter((p) => p.date.getTime() > Date.now() + 60 * 1000);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="Auto-reply" onBack={onBack} />
      <PageBody>
        <div className="chat-pop relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#8A0A52] via-[#730042] to-[#4E002C] p-5 text-white shadow-lg shadow-[#730042]/25">
          <span className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-12 left-16 h-28 w-28 rounded-full bg-white/5" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <FaReply className="text-lg" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold tracking-tight">Auto-reply</p>
              <p className="mt-0.5 text-xs text-white/70">Replies for you while you are away</p>
              <span className={`mt-3 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${ar.enabled ? "bg-emerald-400/20 text-emerald-100 ring-emerald-300/40" : "bg-white/10 text-white/70 ring-white/15"}`}>
                <span className="relative flex h-2 w-2 shrink-0">
                  {ar.enabled && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${ar.enabled ? "bg-emerald-300" : "bg-white/50"}`} />
                </span>
                <span className="truncate">{ar.enabled ? (ar.until ? `Live until ${fmtDate(ar.until)}` : "Live until you turn it off") : "Off"}</span>
              </span>
            </div>
            <HeroSwitch on={ar.enabled} onChange={(v) => save(v)} disabled={update.isPending} />
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {INFO.map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-2 py-3 text-center ring-1 ring-white/10">
                <Icon className="text-sm text-white/90" />
                <span className="text-[10.5px] leading-tight text-white/80">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <Card title="Pick a template" hint="Tap one to fill your message, then edit it if you like">
          <div className="grid grid-cols-2 gap-2">
            {REPLY_TEMPLATES.map((t) => {
              const active = message.trim() === t.text;
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setMessage(t.text)}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-all duration-200 ${active ? "border-transparent bg-gradient-to-br from-[#8A0A52] to-[#68003B] text-white shadow-lg shadow-[#730042]/25" : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-[#730042]/40 hover:shadow-md"}`}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${active ? "bg-white/20 text-white" : "bg-[#F6E8EF] text-[#730042]"}`}>
                      <Icon />
                    </span>
                    {active && <FaCheck className="text-[10px] text-white" />}
                  </span>
                  <span className="text-[13px] font-semibold leading-tight">{t.label}</span>
                  <span className={`line-clamp-2 text-[11px] leading-snug ${active ? "text-white/75" : "text-gray-500"}`}>{t.text}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Your message">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-[#730042]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#730042]/10">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="I'm away right now and will reply as soon as I'm back."
              className="block w-full resize-none bg-transparent px-3.5 pt-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            <p className="px-3.5 pb-2 pt-1 text-right text-[11px] text-gray-400">{message.length}/500</p>
          </div>

          <p className="mb-2 mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">Live preview</p>
          <div className="rounded-2xl bg-[#efe6eb] bg-[radial-gradient(circle_at_20%_20%,rgba(115,0,66,0.06),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(115,0,66,0.05),transparent_40%)] p-4">
            <div className="max-w-[88%]">
              <div className="chat-message-bubble chat-message-bubble-theirs whitespace-pre-wrap rounded-2xl rounded-tl-md bg-white px-3.5 py-2 text-[13.5px] leading-[1.5] text-gray-800">
                <span className="mb-1 flex w-fit items-center gap-1 rounded-full bg-[#F6E8EF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#730042]">
                  <FaReply className="text-[8px]" /> Auto-reply
                </span>
                {message.trim() || <span className="text-gray-400">Your message will appear here.</span>}
                <span className="mt-1 block text-right text-[10px] text-gray-400">now</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Turn off automatically" hint="Optional. Leave empty to keep it on until you switch it off">
          {presets.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={() => { setUntil(toLocalInput(p.date)); setUntilPick(p.label); }} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${untilPick === p.label ? CHIP_ON : CHIP_OFF}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-all focus-within:border-[#730042]/40 focus-within:ring-4 focus-within:ring-[#730042]/10">
              <FaRegCalendarAlt className="shrink-0 text-sm text-[#730042]" />
              <input
                type="datetime-local"
                value={until}
                min={toLocalInput(new Date().toISOString())}
                onChange={(e) => { setUntil(e.target.value); setUntilPick(""); }}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
              />
            </div>
            {until && (
              <button type="button" onClick={() => { setUntil(""); setUntilPick(""); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                Clear
              </button>
            )}
          </div>
        </Card>
      </PageBody>
      <div className="shrink-0 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs">
            {dirty ? (
              <span className="flex items-center gap-1.5 font-medium text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes</span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-500"><FaCheck className="text-[10px] text-emerald-500" /> All changes saved</span>
            )}
          </p>
          <button
            type="button"
            disabled={!dirty || update.isPending}
            onClick={() => save(ar.enabled)}
            className="rounded-xl bg-gradient-to-br from-[#8A0A52] to-[#68003B] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#730042]/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Privacy
export function PrivacyPage({ onBack }) {
  const { data: s } = useChatSettings();
  const update = useUpdateChatSettings();
  if (!s) return <div className="flex h-full flex-col bg-[#f5f6f8]"><Header title="Privacy" onBack={onBack} /><Loading /></div>;
  const p = s.privacy;
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="Privacy" onBack={onBack} />
      <PageBody>
        <Section note="When hidden, others won't see your online dot, “Online” or last seen — and you won't see theirs on your side only if they hide too.">
          <ToggleRow title="Hide online status" hint="No online dot or last seen for others" on={p.hideOnline} onChange={(v) => update.mutate({ privacy: { hideOnline: v } })} />
          <ToggleRow title="Typing indicator" hint="Let others see when you are typing" on={p.typingIndicator} onChange={(v) => update.mutate({ privacy: { typingIndicator: v } })} />
        </Section>
        <Section title="Groups">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-[15px] text-gray-900">Who can add me to groups</p>
              <p className="text-xs text-gray-500">{p.whoCanAddToGroups === "nobody" ? "Nobody can add you — use invite links to join" : "Anyone in your organisation"}</p>
            </div>
            <Segmented value={p.whoCanAddToGroups} options={[{ id: "everyone", label: "Everyone" }, { id: "nobody", label: "Nobody" }]} onChange={(v) => update.mutate({ privacy: { whoCanAddToGroups: v } })} />
          </div>
        </Section>
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Appearance
const ACCENTS = ["", "#730042", "#1A73E8", "#0F9D58", "#F4511E", "#7B1FA2", "#455A64"];
export function AppearancePage({ onBack }) {
  const { data: s } = useChatSettings();
  const update = useUpdateChatSettings();
  if (!s) return <div className="flex h-full flex-col bg-[#f5f6f8]"><Header title="Appearance" onBack={onBack} /><Loading /></div>;
  const a = s.appearance;
  const set = (patch) => update.mutate({ appearance: patch });
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="Appearance" onBack={onBack} />
      <PageBody>
        <Section title="Theme">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <span className="text-[15px] text-gray-900">Theme</span>
            <Segmented value={a.theme} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }]} onChange={(v) => set({ theme: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <span className="text-[15px] text-gray-900">Font size</span>
            <Segmented value={a.fontSize} options={[{ id: "small", label: "S" }, { id: "medium", label: "M" }, { id: "large", label: "L" }]} onChange={(v) => set({ fontSize: v })} />
          </div>
          <ToggleRow title="Compact mode" hint="Tighter chat list and bubbles" on={a.compact} onChange={(v) => set({ compact: v })} />
        </Section>
        <Section title="Accent colour">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            {ACCENTS.map((c) => (
              <button key={c || "default"} type="button" onClick={() => set({ accent: c })} title={c || "Default"} className={`flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 transition ${a.accent === c ? "ring-2 ring-[#730042]" : ""}`} style={{ background: c || "#730042" }}>
                {a.accent === c && <FaCheck className="text-xs text-white" />}
                {!c && a.accent !== c && <span className="text-[9px] font-bold text-white">AUTO</span>}
              </button>
            ))}
          </div>
        </Section>
        <p className="px-5 py-2 text-xs text-gray-500">Default wallpaper for every chat can be picked from ⋮ → Wallpaper inside a conversation.</p>
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Notifications (server side: DND, group alerts, preview)
export function NotificationRulesPage({ onBack }) {
  const { data: s } = useChatSettings();
  const update = useUpdateChatSettings();
  if (!s) return <div className="flex h-full flex-col bg-[#f5f6f8]"><Header title="Do not disturb & alerts" onBack={onBack} /><Loading /></div>;
  const n = s.notifications;
  const dnd = n.dnd;
  const setDnd = (patch) => update.mutate({ notifications: { dnd: patch } });
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="Do not disturb & alerts" onBack={onBack} />
      <PageBody>
        <Section title="Do not disturb" note={s.dndActiveNow ? "Do not disturb is active right now." : "Calls and notifications stay quiet inside this window."}>
          <ToggleRow title="Schedule do not disturb" on={dnd.enabled} onChange={(v) => setDnd({ enabled: v })} />
          {dnd.enabled && (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <label className="flex-1 text-xs text-gray-500">From
                <input type="time" value={dnd.start} onChange={(e) => e.target.value && setDnd({ start: e.target.value })} className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900" />
              </label>
              <label className="flex-1 text-xs text-gray-500">To
                <input type="time" value={dnd.end} onChange={(e) => e.target.value && setDnd({ end: e.target.value })} className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900" />
              </label>
            </div>
          )}
        </Section>
        <Section title="Alerts">
          <ToggleRow title="Group notifications" hint="Get alerts from group chats" on={n.groupNotifications} onChange={(v) => update.mutate({ notifications: { groupNotifications: v } })} />
          <ToggleRow title="Show message preview" hint="Include message text in notifications" on={n.preview} onChange={(v) => update.mutate({ notifications: { preview: v } })} />
        </Section>
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Storage & data
const AUTO_OPTS = [{ id: "always", label: "Always" }, { id: "wifi", label: "Wi-Fi" }, { id: "never", label: "Never" }];
const TYPE_LABEL = { photos: "Photos", video: "Videos", audio: "Audio", documents: "Documents" };

export function StoragePage({ onBack }) {
  const { data: s } = useChatSettings();
  const update = useUpdateChatSettings();
  const { data: st, isLoading } = useChatStorage();
  const clearAll = useClearAllChats();
  const [confirm, setConfirm] = useState(false);
  const auto = s?.storage?.autoDownload;
  const total = st?.totalBytes || 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="Storage & data" onBack={onBack} />
      <PageBody>
        <Section title="Usage">
          {isLoading ? <Loading /> : st ? (
            <>
              <div className="px-5 py-4">
                <p className="text-2xl font-bold text-gray-900">{formatBytes(total)}</p>
                <p className="text-xs text-gray-500">{st.totalMedia} files · {st.totalMessages} messages</p>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100">
                  {["photos", "video", "audio", "documents"].map((k, i) => total ? <span key={k} style={{ width: `${(st.byType[k].bytes / total) * 100}%`, opacity: 1 - i * 0.2 }} className="bg-[#730042]" /> : null)}
                </div>
              </div>
              {Object.keys(TYPE_LABEL).map((k) => (
                <div key={k} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-gray-700">{TYPE_LABEL[k]}</span>
                  <span className="text-gray-500">{st.byType[k].count} · {formatBytes(st.byType[k].bytes)}</span>
                </div>
              ))}
            </>
          ) : null}
        </Section>

        {st?.biggestChats?.length > 0 && (
          <Section title="Biggest chats">
            {st.biggestChats.map((c) => (
              <div key={c.conversationId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="truncate text-gray-800">{c.name}</span>
                <span className="shrink-0 text-gray-500">{formatBytes(c.bytes)}</span>
              </div>
            ))}
          </Section>
        )}

        {auto && (
          <Section title="Media auto-download">
            {Object.keys(TYPE_LABEL).map((k) => (
              <div key={k} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-[15px] text-gray-900">{TYPE_LABEL[k]}</span>
                <Segmented value={auto[k]} options={AUTO_OPTS} onChange={(v) => update.mutate({ storage: { autoDownload: { [k]: v } } })} />
              </div>
            ))}
          </Section>
        )}

        <Section title="Danger zone" note="Clearing removes every chat from your side only. Other people keep their messages.">
          <div className="px-5 py-3.5">
            {!confirm ? (
              <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-2 text-sm font-semibold text-red-600"><FaTrash className="text-xs" /> Clear all chats</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-700">Clear all chats for you?</span>
                <button type="button" onClick={() => setConfirm(false)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">Cancel</button>
                <button type="button" disabled={clearAll.isPending} onClick={() => clearAll.mutate(undefined, { onSettled: () => setConfirm(false) })} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Clear</button>
              </div>
            )}
          </div>
        </Section>
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Reports (Admin / SuperAdmin)
const REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.id, r.label]));
const STATUS_TABS = [{ id: "open", label: "Open" }, { id: "reviewed", label: "Reviewed" }, { id: "dismissed", label: "Dismissed" }];

export function ReportsPage({ onBack }) {
  const [status, setStatus] = useState("open");
  const { data: reports = [], isLoading } = useChatReports({ status });
  const review = useReviewReport();
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="User reports" onBack={onBack} />
      <div className="bg-white px-5 py-3"><Segmented value={status} options={STATUS_TABS} onChange={setStatus} /></div>
      <PageBody>
        {isLoading ? <Loading /> : reports.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">No {status} reports.</p>
        ) : (
          <div className="space-y-2 p-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={r.target.name} photo={r.target.photo} size={36} seed={r.target.key} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{r.target.name}</p>
                    <p className="truncate text-xs text-gray-500">Reported by {r.reporter.name}</p>
                  </div>
                  <span className="rounded-full bg-[#F6E8EF] px-2 py-0.5 text-[10px] font-bold text-[#730042]">{REASON_LABEL[r.reason] || r.reason}</span>
                </div>
                {r.details && <p className="mt-2 text-sm text-gray-700">{r.details}</p>}
                {r.messageSnapshot && <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-600">“{r.messageSnapshot}”</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  {r.status === "open" && (
                    <div className="flex gap-2">
                      <button type="button" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, status: "dismissed" })} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">Dismiss</button>
                      <button type="button" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, status: "reviewed" })} className="rounded-full bg-[#730042] px-3 py-1 text-xs font-semibold text-white">Mark reviewed</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Help & about
export function AboutPage({ onBack }) {
  const { data, isLoading } = useChatAbout();
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f6f8]">
      <Header title="Help & about" onBack={onBack} />
      <PageBody>
        <section className="bg-white px-5 py-6 text-center">
          <p className="text-lg font-bold text-[#730042]">TorchX Spark</p>
          <p className="text-xs text-gray-500">{data ? `${data.app} · v${data.version}` : "from TorchX Talent"}</p>
        </section>
        <Section title="Keyboard shortcuts">
          {isLoading ? <Loading /> : (data?.shortcuts || []).map((k) => (
            <div key={k.keys} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="text-sm text-gray-700">{k.action}</span>
              <kbd className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{k.keys}</kbd>
            </div>
          ))}
        </Section>
      </PageBody>
    </div>
  );
}

