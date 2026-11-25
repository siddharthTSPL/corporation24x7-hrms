import { useEffect, useRef, useState } from "react";
import { FaExpandAlt, FaCompressAlt, FaExternalLinkAlt, FaTimes } from "react-icons/fa";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useConvsStore } from "../../auth/store/convs/convsStore";
import { CONVS_URL, CONVS_EMBED_URL, CONVS_ORIGIN, CONVS_MSG_SOURCE } from "./convsConfig";
import convsLogo from "../../assets/TorchX_Convs.png"; // TorchX Convs wordmark

// Zoho-Cliq-style chat dock: Convs (a separate app) shown inside Talent
// through an <iframe>. The iframe is mounted once after login and then only
// hidden/shown, so Convs keeps its socket alive (live unread badge, incoming
// call/message alerts) even while the panel is closed.
export default function ConvsFrame() {
  const { data: auth } = useAuth();
  const enabled = Boolean(auth?.role);

  const open = useConvsStore((s) => s.open);
  const expanded = useConvsStore((s) => s.expanded);
  const openPanel = useConvsStore((s) => s.openPanel);
  const closePanel = useConvsStore((s) => s.closePanel);
  const toggleExpanded = useConvsStore((s) => s.toggleExpanded);
  const setUnread = useConvsStore((s) => s.setUnread);
  const setIncoming = useConvsStore((s) => s.setIncoming);
  const command = useConvsStore((s) => s.command);
  const clearCommand = useConvsStore((s) => s.clearCommand);
  const iframeRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load the iframe when the browser is idle (or immediately once opened).
  useEffect(() => {
    if (!enabled) {
      useConvsStore.getState().reset();
      setMounted(false);
      setLoaded(false);
      return undefined;
    }
    if (open) {
      setMounted(true);
      return undefined;
    }
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => setMounted(true));
    return () => cancel(id);
  }, [enabled, open]);

  // Messages coming FROM Convs. Always check origin + source tag.
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== CONVS_ORIGIN) return;
      const msg = e.data;
      if (!msg || msg.source !== CONVS_MSG_SOURCE) return;

      if (msg.type === "unread") setUnread(Number(msg.count) || 0);
      if (msg.type === "ready") {
        // Handshake: Convs may skip its own incoming-call card, Talent draws it globally.
        iframeRef.current?.contentWindow?.postMessage(
          { source: "torchx-talent", type: "capabilities", globalIncoming: true }, CONVS_ORIGIN);
      }
      if (msg.type === "incoming") setIncoming(msg.calls, msg.inCall); // ringing calls -> <GlobalIncomingCall/>
      if (msg.type === "open") openPanel();   // Convs asked for the dock (e.g. call accepted)
      if (msg.type === "close") closePanel(); // Convs's own close button
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setUnread, setIncoming, openPanel, closePanel]);

  // Commands for Convs (open a conversation, accept / decline a call). They wait
  // here until the iframe has loaded, so a click that arrives before Convs is
  // ready is delivered as soon as it is.
  useEffect(() => {
    if (!command || !loaded) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ source: "torchx-talent", ...command }, CONVS_ORIGIN);
    clearCommand(command.id);
  }, [command, loaded, clearCommand]);

  // Esc closes the frame.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  if (!enabled || !mounted) return null;

  // Desktop: floating dock bottom-right. Mobile: full screen.
  const size = expanded
    ? "md:w-[min(960px,calc(100vw-2rem))] md:h-[min(720px,calc(100dvh-5rem))]"
    : "md:w-[380px] md:h-[min(560px,calc(100dvh-5rem))]";

  return (
    <div
      role="dialog"
      aria-label="TorchX Convs"
      aria-hidden={!open}
      className={`fixed z-[1000] flex flex-col overflow-hidden bg-white shadow-2xl border border-gray-200
        inset-0 md:inset-auto md:right-4 md:bottom-4 md:rounded-2xl ${size}
        transition-[opacity,transform,width,height] duration-200 origin-bottom-right
        ${open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none invisible"}`}
    >
      {/* frame header */}
      <div className="flex items-center justify-between gap-2 px-3 h-11 shrink-0 bg-gradient-to-r from-[#8A0A52] to-[#5C0035] text-white">
        <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 shadow-sm">
          <img src={convsLogo} alt="TorchX Convs" draggable={false} className="h-6 w-auto select-none" />
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleExpanded}
            title={expanded ? "Collapse" : "Expand"}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="hidden md:grid place-items-center w-8 h-8 rounded-lg hover:bg-white/15"
          >
            {expanded ? <FaCompressAlt size={12} /> : <FaExpandAlt size={12} />}
          </button>
          <a
            href={CONVS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Convs in a new tab"
            aria-label="Open Convs in a new tab"
            className="grid place-items-center w-8 h-8 rounded-lg hover:bg-white/15"
          >
            <FaExternalLinkAlt size={12} />
          </a>
          <button
            type="button"
            onClick={closePanel}
            title="Close"
            aria-label="Close"
            className="grid place-items-center w-8 h-8 rounded-lg hover:bg-white/15"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>

      {/* Convs */}
      <div className="relative flex-1 min-h-0 bg-[#F6F7F9]">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-500">
            Loading Convs…
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="TorchX Convs"
          src={CONVS_EMBED_URL}
          onLoad={() => setLoaded(true)}
          allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen; notifications"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}
