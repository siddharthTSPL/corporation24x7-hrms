import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaQuestion, FaTimes, FaMapSigns, FaHeadset } from "react-icons/fa";

/**
 * Bottom-right floating help launcher (chat-bubble style), portal-rendered
 * straight to document.body so it always sits fixed to the viewport — even
 * though Sidebar's own container carries a CSS transform (for its
 * slide-in/out animation) that would otherwise trap a "fixed" child inside
 * its own bounds instead of the real screen corner.
 *
 * Click it and it pops open two options: "Take a Tour" (replays HelpTour)
 * and "Help" (opens TechnicalSupportModal) — same two actions that used to
 * live inside the sidebar's own Help menu item, just surfaced globally now.
 */
export default function FloatingHelp({ onTakeTour, onTechnicalSupport }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return createPortal(
    <div ref={rootRef} className="fixed bottom-5 right-5 z-[999] flex flex-col items-end gap-3">
      {open && (
        <div className="w-64 bg-white rounded-2xl shadow-2xl border border-[#F4C0D1] overflow-hidden animate-[floatIn_0.16s_ease]">
          <button
            onClick={() => { setOpen(false); onTakeTour?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#FBEAF0] hover:text-[#730042] transition-colors text-left"
          >
            <FaMapSigns className="text-[#730042] flex-shrink-0" />
            <span>
              <span className="block font-medium">Take a Tour</span>
              <span className="block text-[11px] text-gray-400">A quick walkthrough of where everything is</span>
            </span>
          </button>
          <button
            onClick={() => { setOpen(false); onTechnicalSupport?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#FBEAF0] hover:text-[#730042] transition-colors border-t border-gray-100 text-left"
          >
            <FaHeadset className="text-[#730042] flex-shrink-0" />
            <span>
              <span className="block font-medium">Help</span>
              <span className="block text-[11px] text-gray-400">Report a problem via email</span>
            </span>
          </button>
        </div>
      )}

      <button
        data-tour="help-button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_6px_20px_rgba(115,0,66,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-transform"
        style={{ background: "linear-gradient(135deg, #730042 0%, #9B2554 100%)" }}
      >
        {open ? <FaTimes size={18} /> : <FaQuestion size={20} />}
      </button>

      <style>{`
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}