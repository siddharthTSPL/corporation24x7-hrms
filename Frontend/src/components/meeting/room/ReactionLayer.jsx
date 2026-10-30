import useCall from "../../../realtime/useCall";

export default function ReactionLayer() {
  const { active } = useCall();
  const reactions = active?.reactions || [];
  if (!reactions.length) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-30 overflow-hidden">
      <style>{`
        @keyframes torchx-float { 0% { transform: translateY(0) scale(.6); opacity: 0; } 12% { opacity: 1; transform: translateY(-40px) scale(1.15); } 100% { transform: translateY(-62vh) scale(1); opacity: 0; } }
      `}</style>
      {reactions.map((r) => (
        <div key={r.id} className="absolute bottom-6 flex flex-col items-center" style={{ left: `${r.left}%`, animation: "torchx-float 3.4s ease-out forwards" }}>
          <span className="text-5xl drop-shadow-lg">{r.emoji}</span>
          <span className="mt-1 max-w-28 truncate rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">{r.name || "Someone"}</span>
        </div>
      ))}
    </div>
  );
}
