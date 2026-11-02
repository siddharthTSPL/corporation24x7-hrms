import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const useEsc = (open, onClose) => {
  const ref = useRef(onClose);
  useEffect(() => {
    ref.current = onClose;
  });
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === "Escape" && ref.current?.();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);
};

export const useDialogFocus = (open, containerRef) => {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = containerRef.current;
    const first = node?.querySelector("[data-autofocus]") || node?.querySelector(FOCUSABLE);
    (first || node)?.focus?.({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous && document.contains(previous)) previous.focus?.({ preventScroll: true });
    };
  }, [open, containerRef]);
};

export const useReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const useViewportCover = () => {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return undefined;
    const original = meta.getAttribute("content") || "";
    if (!/viewport-fit=cover/.test(original)) meta.setAttribute("content", `${original}, viewport-fit=cover`);
    return () => meta.setAttribute("content", original);
  }, []);
};
