import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { FaTimes, FaArrowLeft, FaArrowRight, FaMapSigns } from "react-icons/fa";

const PAD = 8;

/**
 * Zoho-style spotlight tour. Walks through `steps` (each with a `selector`
 * that must match a DOM node already on the page — usually a
 * `data-tour="..."` attribute) and darkens everything except that node.
 *
 * A step can optionally set `path` (e.g. "/leave-employee") to point at an
 * element that lives on a different page than the one the tour started on
 * — for example, the "Apply Leave" tab on the Leave page, or the
 * "New Announcement" button on the Announcement page. When the tour reaches
 * such a step it navigates there automatically, waits for the page to
 * render, then spotlights the element as usual.
 *
 * Steps whose target isn't currently in the DOM (e.g. a menu item hidden by
 * a permission gate) are skipped automatically instead of showing an empty
 * spotlight.
 */
export default function HelpTour({ steps, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pendingNav = useRef(false);

  const step = steps[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  // If a step targets a different route, navigate there first and give the
  // new page a moment to mount before measuring/skipping.
  useEffect(() => {
    if (!step) return;
    if (step.path && step.path !== location.pathname) {
      pendingNav.current = true;
      navigate(step.path);
      return;
    }
    pendingNav.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step]);

  // If the current step's target isn't rendered (permission-gated menu item,
  // collapsed section, page still loading after navigation, etc.), skip
  // forward past it instead of getting stuck.
  useEffect(() => {
    if (!step) return;
    if (step.path && step.path !== location.pathname) return; // still navigating

    const el = document.querySelector(step.selector);
    if (!el) {
      // Just navigated — give the new page's async data a little longer
      // before deciding the target really is missing (e.g. gated by a
      // permission that hasn't finished loading).
      const wasNavigating = pendingNav.current;
      pendingNav.current = false;
      const delay = wasNavigating ? 500 : 0;
      const t = setTimeout(() => {
        if (document.querySelector(step.selector)) {
          measure();
          return;
        }
        if (index < steps.length - 1) setIndex((i) => i + 1);
        else onClose();
      }, delay);
      return () => clearTimeout(t);
    }
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = setTimeout(measure, 220);
    return () => clearTimeout(t);
  }, [index, step, steps.length, measure, onClose, location.pathname]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!step) return null;

  const isLast = index === steps.length - 1;
  const isFirst = index === 0;

  const next = () => (isLast ? onClose() : setIndex((i) => i + 1));
  const prev = () => !isFirst && setIndex((i) => i - 1);

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Click-blocker so the tour can't accidentally trigger navigation
          underneath it, while the actual spotlight box (below) stays
          pointer-events:none so its huge box-shadow doesn't eat clicks. */}
      <div className="absolute inset-0" onClick={onClose} />

      {rect && (
        <div
          className="fixed rounded-xl border-2 pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderColor: "#CD166E",
            boxShadow: "0 0 0 9999px rgba(15,15,20,0.65)",
          }}
        />
      )}

      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 w-[92%] max-w-sm bg-white rounded-2xl shadow-2xl border border-[#F4C0D1] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="flex items-center gap-2 text-xs font-semibold text-[#730042]">
            <FaMapSigns /> Step {index + 1} of {steps.length}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes size={14} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-1">{step.title}</h4>
          <p className="text-[13px] text-gray-600 leading-relaxed">{step.content}</p>
        </div>

        <div className="flex items-center justify-between px-5 pb-4 gap-2">
          <button
            onClick={prev}
            disabled={isFirst}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 disabled:opacity-30 hover:text-gray-700 px-2 py-1.5"
          >
            <FaArrowLeft size={10} /> Back
          </button>

          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: i === index ? "#730042" : "#F0D9E2" }}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#730042] hover:opacity-90 rounded-lg px-3 py-1.5"
          >
            {isLast ? "Finish" : "Next"} {!isLast && <FaArrowRight size={10} />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}