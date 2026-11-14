import { useEffect, useState } from "react";
import { FaExpandAlt, FaCompressAlt, FaExternalLinkAlt, FaTimes } from "react-icons/fa";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useSparkStore } from "../../auth/store/spark/sparkStore";
import { SPARK_URL, SPARK_EMBED_URL, SPARK_ORIGIN, SPARK_MSG_SOURCE } from "./sparkConfig";

// Zoho-Cliq-style chat dock: Spark (a separate app) shown inside Talent
// through an <iframe>. The iframe is mounted once after login and then only
// hidden/shown, so Spark keeps its socket alive (live unread badge, incoming
// call/message alerts) even while the panel is closed.
export default function SparkFrame() {
  const { data: auth } = useAuth();
  const enabled = Boolean(auth?.role);

  const open = useSparkStore((s) => s.open);
  const expanded = useSparkStore((s) => s.expanded);
  const openPanel = useSparkStore((s) => s.openPanel);
  const closePanel = useSparkStore((s) => s.closePanel);
  const toggleExpanded = useSparkStore((s) => s.toggleExpanded);
  const setUnread = useSparkStore((s) => s.setUnread);

  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load the iframe when the browser is idle (or immediately once opened).
  useEffect(() => {
    if (!enabled) {
      useSparkStore.getState().reset();
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

  // Messages coming FROM Spark. Always check origin + source tag.
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== SPARK_ORIGIN) return;
      const msg = e.data;
      if (!msg || msg.source !== SPARK_MSG_SOURCE) return;

      if (msg.type === "unread") setUnread(Number(msg.count) || 0);
      if (msg.type === "open") openPanel();   // e.g. incoming call
      if (msg.type === "close") closePanel(); // Spark's own close button
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setUnread, openPanel, closePanel]);

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
    : "md:w-[400px] md:h-[min(640px,calc(100dvh-5rem))]";

  return (
    <div
      role="dialog"
      aria-label="TorchX Spark"
      aria-hidden={!open}
      className={`fixed z-[60] flex flex-col overflow-hidden bg-white shadow-2xl border border-gray-200
        inset-0 md:inset-auto md:right-4 md:bottom-4 md:rounded-2xl ${size}
        transition-[opacity,transform,width,height] duration-200 origin-bottom-right
        ${open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none invisible"}`}
    >
      {/* frame header */}
      <div className="flex items-center justify-between gap-2 px-3 h-11 shrink-0 bg-gradient-to-r from-[#8A0A52] to-[#5C0035] text-white">
        <span className="text-sm font-semibold tracking-tight">TorchX Spark</span>
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
            href={SPARK_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Spark in a new tab"
            aria-label="Open Spark in a new tab"
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

      {/* Spark */}
      <div className="relative flex-1 min-h-0 bg-[#F6F7F9]">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-500">
            Loading Spark…
          </div>
        )}
        <iframe
          title="TorchX Spark"
          src={SPARK_EMBED_URL}
          onLoad={() => setLoaded(true)}
          allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen; notifications"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}
