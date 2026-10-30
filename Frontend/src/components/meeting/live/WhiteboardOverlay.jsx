import { useCallback, useEffect, useRef, useState } from "react";
import { FaPen, FaEraser, FaUndo, FaTrash, FaTimes, FaDownload, FaEye } from "react-icons/fa";
import useCall from "../../../../realtime/useCall";
import { emitAck } from "../../../../realtime/chatSocket";
import { useMeetingBoard } from "../../../../auth/server-state/meeting/meetingLive.hook";
import { EV } from "./liveEvents";
import { useLiveStore } from "./liveStore";
import { act } from "./liveUi";

const COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#d97706", "#9333ea"];
const WIDTHS = [3, 6, 12];
const BG = "#ffffff";
const pt = (p) => (Array.isArray(p) ? p : [p.x, p.y]); // accepts [x, y] or {x, y}; coordinates are 0..1 of the board
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function paint(ctx, w, h, stroke) {
  const pts = (stroke.points || []).map(pt);
  if (!pts.length) return;
  ctx.strokeStyle = stroke.tool === "eraser" ? BG : stroke.color || "#111827";
  ctx.lineWidth = ((stroke.width || 4) / 1000) * w * (stroke.tool === "eraser" ? 3 : 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
  if (pts.length === 1) ctx.lineTo(pts[0][0] * w + 0.1, pts[0][1] * h);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * w, pts[i][1] * h);
  ctx.stroke();
}

export default function WhiteboardOverlay({ onClose, guest = false }) {
  const { active, isHost, myKey } = useCall();
  const roomKey = active?.roomKey;
  const meetingId = active?.meetingId;
  const selfKey = myKey || "me";
  const board = useLiveStore((s) => s.board);
  const { boardLoad, boardAdd, boardRemove, boardClear, boardViewOnly } = useLiveStore.getState();
  const { data } = useMeetingBoard(meetingId, !guest && !!meetingId);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(null); // stroke being drawn right now
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);

  const canDraw = !guest && (!board.viewOnly || isHost);

  // first open: take what the server already has
  useEffect(() => {
    if (data?.strokes && !useLiveStore.getState().board.loaded) boardLoad(data.strokes);
  }, [data, boardLoad]);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, c.width, c.height);
    useLiveStore.getState().board.strokes.forEach((s) => paint(ctx, c.width, c.height, s));
    if (drawing.current) paint(ctx, c.width, c.height, drawing.current);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const c = canvasRef.current;
    if (!wrap || !c) return undefined;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [board.strokes, redraw]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  const down = (e) => {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = { id: uid(), key: selfKey, tool, color, width, points: [pos(e)] };
    redraw();
  };
  const move = (e) => {
    if (!drawing.current) return;
    drawing.current.points.push(pos(e));
    redraw();
  };
  const up = () => {
    const s = drawing.current;
    drawing.current = null;
    if (!s) return;
    boardAdd(s);
    act(() => emitAck(EV.boardStroke, { roomKey, stroke: s }));
  };

  const undo = () => {
    const mine = [...board.strokes].reverse().find((s) => s.key === selfKey);
    if (!mine) return;
    boardRemove(mine.id);
    act(() => emitAck(EV.boardUndo, { roomKey, strokeId: mine.id }));
  };
  const clear = () => {
    if (!window.confirm("Clear the whole whiteboard for everyone?")) return;
    boardClear();
    act(() => emitAck(EV.boardClear, { roomKey }));
  };
  const toggleView = () => {
    boardViewOnly(!board.viewOnly);
    act(() => emitAck(EV.boardView, { roomKey, viewOnly: !board.viewOnly }));
  };
  const save = () => {
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const Tool = ({ on, onClick, title, children, danger }) => (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${on ? "bg-white text-gray-900" : danger ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"}`}>
      {children}
    </button>
  );

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden rounded-2xl bg-[#1b1b20] ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="mr-2 text-sm font-semibold text-white">Whiteboard</p>
        {canDraw ? (
          <>
            <Tool on={tool === "pen"} onClick={() => setTool("pen")} title="Pen"><FaPen /></Tool>
            <Tool on={tool === "eraser"} onClick={() => setTool("eraser")} title="Eraser"><FaEraser /></Tool>
            <span className="mx-1 h-6 w-px bg-white/10" />
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => { setColor(c); setTool("pen"); }} className={`h-6 w-6 rounded-full ring-2 ${color === c && tool === "pen" ? "ring-white" : "ring-transparent"}`} style={{ background: c }} />
            ))}
            <span className="mx-1 h-6 w-px bg-white/10" />
            {WIDTHS.map((w) => (
              <button key={w} type="button" aria-label={`Thickness ${w}`} onClick={() => setWidth(w)} className={`flex h-9 w-9 items-center justify-center rounded-full ${width === w ? "bg-white/20" : "hover:bg-white/10"}`}>
                <span className="rounded-full bg-white" style={{ width: w + 2, height: w + 2 }} />
              </button>
            ))}
            <Tool onClick={undo} title="Undo my last stroke"><FaUndo /></Tool>
          </>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-gray-300"><FaEye /> {guest ? "View only for guests" : "The host made this view-only"}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isHost && <button type="button" onClick={toggleView} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">{board.viewOnly ? "Let everyone draw" : "View-only for others"}</button>}
          {isHost && <Tool danger onClick={clear} title="Clear board"><FaTrash /></Tool>}
          <Tool onClick={save} title="Save as image"><FaDownload /></Tool>
          <Tool onClick={onClose} title="Close whiteboard"><FaTimes /></Tool>
        </div>
      </div>
      <div ref={wrapRef} className="relative min-h-0 flex-1 bg-white">
        <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className={`absolute inset-0 h-full w-full touch-none ${canDraw ? "cursor-crosshair" : "cursor-default"}`} />
      </div>
    </div>
  );
}
