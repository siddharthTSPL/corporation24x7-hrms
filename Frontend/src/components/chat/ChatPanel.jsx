import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaRegCommentDots, FaRegEdit } from "react-icons/fa";
import { useConversations, useConversation } from "../../auth/server-state/chat/chat.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import ConversationList from "./ConversationList";
import ChatThread from "./ChatThread";
import NewChatSheet from "./NewChatSheet";
import GroupInfoSheet from "./GroupInfoSheet";
import PersonInfoSheet from "./PersonInfoSheet";
import CallSoundSettings from "./Callsoundsettings";

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};

function EmptyThread({ onNew }) {
  return (
    <div className="relative h-full flex flex-col items-center justify-center text-center px-10 overflow-hidden bg-gradient-to-b from-[#FCF8FB] to-[#F4F6F9]">
      <span className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#730042]/[0.06] blur-2xl" />
      <span className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-sky-400/[0.08] blur-2xl" />

      <div className="relative w-24 h-24 mb-6">
        <span className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-[#8F0A55] to-[#5C0035] rotate-6 opacity-25" />
        <span className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-[#8F0A55] to-[#5C0035] shadow-xl shadow-[#730042]/30 flex items-center justify-center">
          <FaRegCommentDots className="text-4xl text-white" />
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900">Your messages</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-[260px] leading-relaxed">
        Pick a conversation from the list, or start a new one with anyone in your organisation.
      </p>
      <button
        type="button"
        onClick={onNew}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-[#8F0A55] to-[#640038] text-white text-sm font-semibold shadow-lg shadow-[#730042]/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
      >
        <FaRegEdit /> New chat
      </button>
    </div>
  );
}

export default function ChatPanel() {
  const open = useChatUiStore((s) => s.open);
  const expanded = useChatUiStore((s) => s.expanded);
  const selectedId = useChatUiStore((s) => s.selectedId);
  const newChatOpen = useChatUiStore((s) => s.newChatOpen);
  const infoOpen = useChatUiStore((s) => s.infoOpen);
  const soundSettingsOpen = useChatUiStore((s) => s.soundSettingsOpen);
  const closePanel = useChatUiStore((s) => s.closePanel);
  const toggleExpanded = useChatUiStore((s) => s.toggleExpanded);
  const openConversation = useChatUiStore((s) => s.openConversation);
  const backToList = useChatUiStore((s) => s.backToList);
  const setNewChatOpen = useChatUiStore((s) => s.setNewChatOpen);
  const setInfoOpen = useChatUiStore((s) => s.setInfoOpen);
  const setSoundSettingsOpen = useChatUiStore((s) => s.setSoundSettingsOpen);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const twoPane = isDesktop && expanded;

  const { data: conversations = [] } = useConversations(open);
  const listConv = conversations.find((c) => c.id === selectedId);
  const { data: detail } = useConversation(infoOpen ? selectedId : null);
  const infoConv = detail || listConv;

  useEffect(() => {
    setActiveConversation(open && selectedId ? selectedId : null);
  }, [open, selectedId, setActiveConversation]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (infoOpen) setInfoOpen(false);
      else if (soundSettingsOpen) setSoundSettingsOpen(false);
      else if (newChatOpen) setNewChatOpen(false);
      else closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, infoOpen, soundSettingsOpen, newChatOpen, closePanel, setInfoOpen, setSoundSettingsOpen, setNewChatOpen]);

  const showList = twoPane || !selectedId;
  const showThread = twoPane || !!selectedId;

  const frameStyle = isDesktop
    ? {
        top: 64,
        right: 16,
        width: twoPane ? "min(980px, calc(100vw - 2rem))" : 400,
        height: "min(740px, calc(100vh - 5rem))",
        transition: "width 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }
    : { top: 0, right: 0, bottom: 0, left: 0 };

  const sheetClass = `chat-slide absolute top-0 bottom-0 right-0 z-30 bg-white ${twoPane ? "w-[420px] border-l border-gray-200 shadow-2xl" : "left-0"}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-panel"
          initial={isDesktop ? { opacity: 0, y: -12, scale: 0.97 } : { opacity: 0, x: 32 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={isDesktop ? { opacity: 0, y: -12, scale: 0.97 } : { opacity: 0, x: 32 }}
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          style={frameStyle}
          className={`fixed z-[70] bg-white flex overflow-hidden ${
            isDesktop ? "rounded-3xl shadow-[0_28px_70px_-12px_rgba(60,0,35,0.35)] ring-1 ring-black/5" : ""
          }`}
        >
          {showList && (
            <div className={twoPane ? "w-[340px] flex-shrink-0 border-r border-gray-100" : "w-full"}>
              <ConversationList
                selectedId={selectedId}
                onSelect={openConversation}
                onNew={() => setNewChatOpen(true)}
                expanded={expanded}
                onToggleExpand={toggleExpanded}
                onClose={closePanel}
                canExpand={isDesktop}
              />
            </div>
          )}

          {showThread && (
            <div className="flex-1 min-w-0">
              {selectedId ? (
                <ChatThread
                  key={selectedId}
                  conversationId={selectedId}
                  listConv={listConv}
                  onBack={backToList}
                  showBack={!twoPane}
                  expanded={expanded}
                  onToggleExpand={toggleExpanded}
                  onClose={closePanel}
                  canExpand={isDesktop}
                />
              ) : (
                <EmptyThread onNew={() => setNewChatOpen(true)} />
              )}
            </div>
          )}

          {newChatOpen && (
            <div className={sheetClass}>
              <NewChatSheet onClose={() => setNewChatOpen(false)} />
            </div>
          )}

          {infoOpen && infoConv && (
            <div className={sheetClass}>
              {infoConv.type !== "direct" ? (
                <GroupInfoSheet conversation={infoConv} onClose={() => setInfoOpen(false)} />
              ) : (
                <PersonInfoSheet person={infoConv.otherPerson} onClose={() => setInfoOpen(false)} />
              )}
            </div>
          )}

          {soundSettingsOpen && (
            <div className={sheetClass}>
              <CallSoundSettings onClose={() => setSoundSettingsOpen(false)} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}