import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaRegCommentDots } from "react-icons/fa";
import { useConversations, useConversation } from "../../auth/server-state/chat/chat.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import ConversationList from "./ConversationList";
import ChatThread from "./ChatThread";
import NewChatSheet from "./NewChatSheet";
import GroupInfoSheet from "./GroupInfoSheet";

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

export default function ChatPanel() {
  const open = useChatUiStore((s) => s.open);
  const expanded = useChatUiStore((s) => s.expanded);
  const selectedId = useChatUiStore((s) => s.selectedId);
  const newChatOpen = useChatUiStore((s) => s.newChatOpen);
  const infoOpen = useChatUiStore((s) => s.infoOpen);
  const closePanel = useChatUiStore((s) => s.closePanel);
  const toggleExpanded = useChatUiStore((s) => s.toggleExpanded);
  const openConversation = useChatUiStore((s) => s.openConversation);
  const backToList = useChatUiStore((s) => s.backToList);
  const setNewChatOpen = useChatUiStore((s) => s.setNewChatOpen);
  const setInfoOpen = useChatUiStore((s) => s.setInfoOpen);
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
      else if (newChatOpen) setNewChatOpen(false);
      else closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, infoOpen, newChatOpen, closePanel, setInfoOpen, setNewChatOpen]);

  const showList = twoPane || !selectedId;
  const showThread = twoPane || !!selectedId;

  const frameStyle = isDesktop
    ? {
        top: 64,
        right: 16,
        width: twoPane ? "min(900px, calc(100vw - 2rem))" : 380,
        height: "min(700px, calc(100vh - 5rem))",
      }
    : { top: 0, right: 0, bottom: 0, left: 0 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-panel"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          style={frameStyle}
          className={`fixed z-[70] bg-white flex overflow-hidden ${isDesktop ? "rounded-2xl shadow-2xl border border-gray-200" : ""}`}
        >
          {showList && (
            <div className={twoPane ? "w-[320px] flex-shrink-0 border-r border-gray-100" : "w-full"}>
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
                <div className="h-full flex flex-col items-center justify-center text-center bg-[#F7F9FB] px-8">
                  <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4">
                    <FaRegCommentDots className="text-2xl text-[#730042]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Select a conversation</p>
                  <p className="text-xs text-gray-500 mt-1">Pick a chat on the left or start a new one.</p>
                  <button
                    type="button"
                    onClick={() => setNewChatOpen(true)}
                    className="mt-4 px-4 py-2 rounded-full bg-[#730042] text-white text-xs font-semibold hover:bg-[#5c0035]"
                  >
                    New chat
                  </button>
                </div>
              )}
            </div>
          )}

          {newChatOpen && (
            <div className={`absolute top-0 bottom-0 right-0 z-30 bg-white ${twoPane ? "w-[420px] border-l border-gray-200 shadow-xl" : "left-0"}`}>
              <NewChatSheet onClose={() => setNewChatOpen(false)} />
            </div>
          )}

          {infoOpen && infoConv && infoConv.type !== "direct" && (
            <div className={`absolute top-0 bottom-0 right-0 z-30 bg-white ${twoPane ? "w-[420px] border-l border-gray-200 shadow-xl" : "left-0"}`}>
              <GroupInfoSheet conversation={infoConv} onClose={() => setInfoOpen(false)} />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
