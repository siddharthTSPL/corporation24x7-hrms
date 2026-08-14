import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaQuestion, FaTimes, FaMapSigns, FaHeadset, FaBook } from "react-icons/fa";

const SIZE = 56;
const MARGIN = 20;
const DRAG_THRESHOLD = 6; // px of movement before a press counts as a drag, not a click
const STORAGE_KEY = "floatingHelpPos";

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Default resting spot: bottom-right corner, same place the old static
// button used to sit.
function defaultPos() {
  return {
    x: window.innerWidth - SIZE - MARGIN,
    y: window.innerHeight - SIZE - MARGIN,
  };
}

function loadSavedPos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x !== "number" || typeof p?.y !== "number") return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Bottom-right floating help launcher, portal-rendered straight to
 * document.body so it always sits fixed to the real viewport — even though
 * Sidebar's own container carries a CSS transform (for its slide-in/out
 * animation) that would otherwise trap a "fixed" child inside its own
 * bounds instead of the screen corner.
 *
 * Fully draggable: press and drag it anywhere on screen, drop it wherever
 * is most comfortable, and it remembers that spot (localStorage) next time.
 * A quick tap/click (no real movement) still opens the two options —
 * "Take a Tour" (replays HelpTour) and "Help" (opens TechnicalSupportModal).
 */
export default function FloatingHelp({ onTakeTour, onTechnicalSupport, onDocumentation }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => loadSavedPos() || defaultPos());
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef(null);
  const dragState = useRef(null); // { startX, startY, originX, originY, moved }

  // Keep the button on-screen if the window gets resized/rotated.
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: clamp(p.x, MARGIN, window.innerWidth - SIZE - MARGIN),
        y: clamp(p.y, MARGIN, window.innerHeight - SIZE - MARGIN),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const onPointerMove = useCallback((e) => {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true;
    if (!d.moved) return;
    setDragging(true);
    setPos({
      x: clamp(d.originX + dx, MARGIN, window.innerWidth - SIZE - MARGIN),
      y: clamp(d.originY + dy, MARGIN, window.innerHeight - SIZE - MARGIN),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragState.current;
    dragState.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    setDragging(false);

    if (d?.moved) {
      // Was a drag — save the drop spot, don't toggle the menu.
      setPos((p) => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        } catch {
          /* ignore quota/private-mode errors */
        }
        return p;
      });
    } else {
      // Was a genuine click/tap — toggle the menu.
      setOpen((v) => !v);
    }
  }, [onPointerMove]);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return; // left click / touch only
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, moved: false };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Smart popup direction so the menu never opens off-screen: flip up/down
  // and left/right depending on which quadrant the button currently sits in.
  const openUp = pos.y > window.innerHeight / 2;
  const openLeft = pos.x > window.innerWidth / 2;

  return createPortal(
    <div
      ref={rootRef}
      className="fixed z-[999]"
      style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
    >
      {open && (
        <div
          className="absolute w-64 bg-white rounded-2xl shadow-2xl border border-[#F4C0D1] overflow-hidden animate-[floatIn_0.16s_ease]"
          style={{
            ...(openUp ? { bottom: SIZE + 12 } : { top: SIZE + 12 }),
            ...(openLeft ? { right: 0 } : { left: 0 }),
          }}
        >
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
            onClick={() => { setOpen(false); onDocumentation?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#FBEAF0] hover:text-[#730042] transition-colors border-t border-gray-100 text-left"
          >
            <FaBook className="text-[#730042] flex-shrink-0" />
            <span>
              <span className="block font-medium">Documentation</span>
              <span className="block text-[11px] text-gray-400">Guides & frequently asked questions</span>
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
        onPointerDown={onPointerDown}
        aria-label="Help"
        className="relative w-14 h-14 rounded-full flex items-center justify-center text-white select-none"
        style={{
          background: "linear-gradient(135deg, #730042 0%, #9B2554 100%)",
          boxShadow: dragging ? "0 10px 28px rgba(115,0,66,0.5)" : "0 6px 20px rgba(115,0,66,0.4)",
          cursor: dragging ? "grabbing" : "grab",
          transform: dragging ? "scale(1.06)" : "scale(1)",
          transition: dragging ? "box-shadow 0.15s ease" : "transform 0.15s ease, box-shadow 0.15s ease",
          touchAction: "none",
        }}
      >
        {!dragging && !open && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "#9B2554", opacity: 0.35 }}
          />
        )}
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