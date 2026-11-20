import { useEffect, useRef } from "react";

// Tiny dependency-free confetti burst on a full-screen canvas.
const COLORS = ["#730042", "#cd166e", "#ff7ab8", "#facc15", "#22d3ee", "#a78bfa", "#34d399", "#fb923c"];

export default function Confetti({ run, onDone, pieces = 140 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!run) return;
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { onDone?.(); return; }
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    const parts = Array.from({ length: pieces }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.25, y: H * 0.35, vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 14 - 4) * dpr,
      g: (0.32 + Math.random() * 0.2) * dpr, s: (6 + Math.random() * 7) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: COLORS[(Math.random() * COLORS.length) | 0], life: 1,
    }));
    let raf; let frames = 0;
    const tick = () => {
      frames++;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.99;
        if (frames > 90) p.life -= 0.02;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore();
      });
      if (frames < 220 && parts.some((p) => p.life > 0 && p.y < H + 50)) raf = requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, W, H); onDone?.(); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  return run ? <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[400] h-full w-full" /> : null;
}
