import { useState } from "react";
import { FaBell, FaPhoneAlt, FaCommentDots, FaUserCircle, FaLock, FaPalette, FaMoon, FaDatabase, FaFlag, FaQuestionCircle } from "react-icons/fa";
import Avatar from "./Avatar";
import CallSoundSettings from "./Callsoundsettings";
import { Header, NavRow, Section, ToggleRow, PageBody } from "./settingsUi";
import { ProfilePage, PrivacyPage, AppearancePage, NotificationRulesPage, StoragePage, ReportsPage, AboutPage } from "./ChatSettingsPages";
import { useConversations } from "../../auth/server-state/chat/chat.hook";
import { useChatSettings, useChatReports } from "../../auth/server-state/chat/chatSettings.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { getChatPrefs, setChatPrefs } from "./chatPrefs";

const STATUS_DOT = { available: "bg-green-500", busy: "bg-red-500", in_meeting: "bg-amber-500", on_leave: "bg-sky-500", custom: "bg-[#730042]" };

function ChatsPage({ onBack }) {
  const [prefs, setPrefs] = useState(getChatPrefs);
  const patch = (p) => setPrefs(setChatPrefs(p));
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f0f2f5]">
      <Header title="Chats" onBack={onBack} />
      <PageBody>
        <Section>
          <ToggleRow
            title="Enter is send"
            hint={prefs.enterIsSend ? "Press Enter to send, Shift + Enter for a new line" : "Press Ctrl + Enter to send, Enter adds a new line"}
            on={prefs.enterIsSend}
            onChange={(v) => patch({ enterIsSend: v })}
          />
        </Section>
        <p className="px-5 py-3 text-xs text-gray-500">Chat wallpaper is set per conversation from the ⋮ menu inside a chat.</p>
      </PageBody>
    </div>
  );
}

export default function ChatSettingsSheet({ onClose }) {
  const [page, setPage] = useState(null);
  const myKey = useChatStore((s) => s.myKey);
  const { data: auth } = useAuth();
  const isStaff = ["admin", "superadmin"].includes(String(auth?.role || "").toLowerCase());
  const { data: conversations = [] } = useConversations(true);
  const { data: s } = useChatSettings();
  const { data: openReports = [] } = useChatReports({ status: "open", enabled: isStaff });
  const self = conversations.flatMap((c) => c.participants || []).find((p) => p.key === myKey);
  const back = () => setPage(null);

  if (page === "profile") return <ProfilePage onBack={back} self={self ? { ...self, key: myKey } : { key: myKey }} />;
  if (page === "privacy") return <PrivacyPage onBack={back} />;
  if (page === "appearance") return <AppearancePage onBack={back} />;
  if (page === "dnd") return <NotificationRulesPage onBack={back} />;
  if (page === "storage") return <StoragePage onBack={back} />;
  if (page === "reports") return <ReportsPage onBack={back} />;
  if (page === "about") return <AboutPage onBack={back} />;
  if (page === "notifications") return <CallSoundSettings section="notifications" onClose={back} />;
  if (page === "calls") return <CallSoundSettings section="calls" onClose={back} />;
  if (page === "chats") return <ChatsPage onBack={back} />;

  const status = s?.status;
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f0f2f5]">
      <Header title="Settings" onBack={onClose} />
      <PageBody>
        <button type="button" onClick={() => setPage("profile")} className="flex w-full items-center gap-4 bg-white px-5 py-5 text-left hover:bg-gray-50">
          <Avatar name={self?.name || "You"} photo={self?.photo || ""} size={64} seed={myKey || "me"} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-gray-900">{self?.name || "You"}</p>
            <p className="truncate text-sm text-gray-500">{s?.profile?.about || self?.designation || self?.role || "Hey there! I am using TorchX Spark"}</p>
            {status?.preset && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status.preset] || "bg-gray-400"}`} />
                <span className="truncate">{status.text}</span>
              </p>
            )}
          </div>
        </button>

        <Section>
          <NavRow icon={FaUserCircle} title="Profile & status" hint="About, availability status" onClick={() => setPage("profile")} />
          <NavRow icon={FaLock} title="Privacy" hint="Online status, typing, who can add you" onClick={() => setPage("privacy")} />
          <NavRow icon={FaPalette} title="Appearance" hint="Theme, font size, accent colour" onClick={() => setPage("appearance")} />
          <NavRow icon={FaCommentDots} title="Chats" hint="Enter key behaviour" onClick={() => setPage("chats")} />
        </Section>

        <Section>
          <NavRow icon={FaBell} title="Notifications" hint="Message sounds, desktop alerts" onClick={() => setPage("notifications")} />
          <NavRow icon={FaMoon} title="Do not disturb & alerts" hint={s?.dndActiveNow ? "Active now" : "Schedule, group alerts, previews"} onClick={() => setPage("dnd")} />
          <NavRow icon={FaPhoneAlt} title="Calls" hint="Ringtone, volume, vibration" onClick={() => setPage("calls")} />
        </Section>

        <Section>
          <NavRow icon={FaDatabase} title="Storage & data" hint="Usage, auto-download, clear all chats" onClick={() => setPage("storage")} />
          {isStaff && <NavRow icon={FaFlag} title="User reports" hint="Review reports from your organisation" badge={openReports.length || null} onClick={() => setPage("reports")} />}
          <NavRow icon={FaQuestionCircle} title="Help & about" hint="Keyboard shortcuts, version" onClick={() => setPage("about")} />
        </Section>

        <div className="px-5 py-6 text-center">
          <p className="text-sm font-semibold text-[#730042]">TorchX Spark</p>
          <p className="text-xs text-gray-400">from TorchX Talent</p>
        </div>
      </PageBody>
    </div>
  );
}
