import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaTrash } from "react-icons/fa";
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

  if (!s) return <div className="flex h-full flex-col bg-[#f0f2f5]"><Header title="Profile & status" onBack={onBack} /><Loading /></div>;

  const aboutDirty = about.trim() !== s.profile.about;
  const saveAbout = () => update.mutate({ profile: { about: about.trim() } }, { onSuccess: () => toast.success("About updated") });
  const saveStatus = () => {
    if (preset === "custom" && !text.trim()) return toast.error("Type your status first.");
    setStatus.mutate({ preset, text: preset === "custom" ? text.trim() : undefined, duration }, { onSuccess: () => toast.success(preset ? "Status updated" : "Status cleared") });
  };
  const expires = s.status.expiresAt ? new Date(s.status.expiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
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

// ---------------------------------------------------------------- Privacy
export function PrivacyPage({ onBack }) {
  const { data: s } = useChatSettings();
  const update = useUpdateChatSettings();
  if (!s) return <div className="flex h-full flex-col bg-[#f0f2f5]"><Header title="Privacy" onBack={onBack} /><Loading /></div>;
  const p = s.privacy;
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
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
  if (!s) return <div className="flex h-full flex-col bg-[#f0f2f5]"><Header title="Appearance" onBack={onBack} /><Loading /></div>;
  const a = s.appearance;
  const set = (patch) => update.mutate({ appearance: patch });
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
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
  if (!s) return <div className="flex h-full flex-col bg-[#f0f2f5]"><Header title="Do not disturb & alerts" onBack={onBack} /><Loading /></div>;
  const n = s.notifications;
  const dnd = n.dnd;
  const setDnd = (patch) => update.mutate({ notifications: { dnd: patch } });
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
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
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
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
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
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
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
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

