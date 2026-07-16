import { useRef, useState, useEffect, useCallback } from "react";

export default function SelfieCapture({ onCapture, onCancel }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase,    setPhase]    = useState("loading");
  const [snapshot, setSnapshot] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [timer,    setTimer]    = useState(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setPhase("preview");
          };
        }
      } catch (err) {
        if (!active) return;
        setErrorMsg(
          err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access."
            : "Could not start camera: " + err.message
        );
        setPhase("error");
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const doCapture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = 400;
    canvas.width  = size;
    canvas.height = size;
    const ctx  = canvas.getContext("2d");
    const vw   = video.videoWidth;
    const vh   = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx   = (vw - side) / 2;
    const sy   = (vh - side) / 2;
    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    ctx.restore();
    const base64 = canvas.toDataURL("image/jpeg", 0.85);
    setSnapshot(base64);
    setPhase("captured");
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startCountdown = useCallback(() => {
    let count = 3;
    setTimer(count);
    const id = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(id);
        countdownRef.current = null;
        setTimer(null);
        doCapture();
      } else {
        setTimer(count);
      }
    }, 1000);
    countdownRef.current = id;
  }, [doCapture]);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const retake = useCallback(async () => {
    setSnapshot(null);
    setTimer(null);
    setPhase("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setPhase("preview");
        };
      }
    } catch (err) {
      setErrorMsg("Could not restart camera: " + err.message);
      setPhase("error");
    }
  }, []);

  const confirm = useCallback(() => {
    if (snapshot) onCapture(snapshot);
  }, [snapshot, onCapture]);

  const statusConfig = {
    preview:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500",  label: "Camera live" },
    captured: { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-500",   label: "Photo captured" },
    loading:  { bg: "bg-gray-100",  text: "text-gray-500",   border: "border-gray-200",   dot: "bg-gray-400",   label: "Starting camera…" },
    error:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500",    label: "Camera unavailable" },
  };
  const sc = statusConfig[phase] ?? statusConfig.loading;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-[fadeIn_0.25s_ease]">

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📸</span>
            <div>
              <p className="m-0 text-[17px] font-bold text-gray-900">Identity Verification</p>
              <p className="mt-0.5 text-[12px] text-gray-400">Take a clear selfie to check in</p>
            </div>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg flex items-center justify-center cursor-pointer text-sm hover:bg-gray-100 transition-colors flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="relative w-[260px] h-[260px] rounded-full overflow-hidden bg-gray-100 border-[3px] border-gray-200 flex-shrink-0">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover rounded-full ${phase === "preview" ? "block" : "hidden"}`}
              style={{ transform: "scaleX(-1)" }}
              playsInline muted />

            {snapshot && (
              <img src={snapshot} alt="selfie"
                className={`w-full h-full object-cover rounded-full ${phase === "captured" ? "block" : "hidden"}`} />
            )}

            {phase === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#7B1C3E] rounded-full animate-spin" />
                <p className="text-[12px] text-gray-400 text-center m-0 px-4">Starting camera…</p>
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
                <span className="text-4xl">🚫</span>
                <p className="text-[12px] text-gray-400 text-center m-0">{errorMsg}</p>
              </div>
            )}

            {timer !== null && (
              <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center">
                <span className="text-8xl font-extrabold text-white leading-none animate-[countPop_1s_ease-in-out_infinite]">{timer}</span>
              </div>
            )}

            {phase === "preview" && (
              <>
                <div className="absolute top-3 left-3 w-5 h-5 border-t-[3px] border-l-[3px] border-[#7B1C3E] rounded-sm" />
                <div className="absolute top-3 right-3 w-5 h-5 border-t-[3px] border-r-[3px] border-[#7B1C3E] rounded-sm" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-[3px] border-l-[3px] border-[#7B1C3E] rounded-sm" />
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-[3px] border-r-[3px] border-[#7B1C3E] rounded-sm" />
              </>
            )}

            {phase === "captured" && (
              <div className="absolute bottom-3.5 right-3.5 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            )}
          </div>

          <div className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
            {sc.label}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <p className="m-0 text-[12px] text-gray-500 text-center leading-relaxed">
          {phase === "preview"  && "Align your face within the frame, then tap Take Photo."}
          {phase === "captured" && "Happy with the photo? Confirm to check in."}
          {phase === "loading"  && "Requesting camera access…"}
          {phase === "error"    && "You can skip selfie verification and check in without a photo."}
        </p>

        {phase === "preview" && (
          <div className="flex gap-2 justify-center flex-wrap">
            {["💡 Face forward", "☀️ Good lighting", "🚫 No sunglasses"].map((tip) => (
              <span key={tip} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] text-gray-500">{tip}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2.5">
          {phase === "preview" && (
            <>
              <button onClick={onCancel}
                className="flex-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl py-3 font-semibold text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                Skip
              </button>
              <button onClick={startCountdown} disabled={timer !== null}
                className="flex-1 text-white border-none rounded-xl py-3 font-bold text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #7B1C3E 0%, #9B2554 100%)", boxShadow: "0 4px 14px rgba(123,28,62,0.25)" }}>
                {timer !== null ? `📷 Taking in ${timer}…` : "📷 Take Photo"}
              </button>
            </>
          )}
          {phase === "captured" && (
            <>
              <button onClick={retake}
                className="flex-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl py-3 font-semibold text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                ↩ Retake
              </button>
              <button onClick={confirm}
                className="flex-1 text-white border-none rounded-xl py-3 font-bold text-sm cursor-pointer"
                style={{ background: "linear-gradient(135deg, #7B1C3E 0%, #9B2554 100%)", boxShadow: "0 4px 14px rgba(123,28,62,0.25)" }}>
                ✓ Use Photo
              </button>
            </>
          )}
          {phase === "error" && (
            <>
              <button onClick={onCancel}
                className="flex-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl py-3 font-semibold text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={onCancel}
                className="flex-1 text-white border-none rounded-xl py-3 font-bold text-sm cursor-pointer"
                style={{ background: "linear-gradient(135deg, #7B1C3E 0%, #9B2554 100%)", boxShadow: "0 4px 14px rgba(123,28,62,0.25)" }}>
                Skip Selfie →
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn   { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes countPop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
      `}</style>
    </div>
  );
}