import { useRef, useState, useEffect, useCallback } from "react";

export default function SelfieCapture({ onCapture, onCancel }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase,    setPhase]    = useState("loading");
  const [snapshot, setSnapshot] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [timer,    setTimer]    = useState(null); // countdown

  // ── Start webcam ──────────────────────────────────────────────────────────────
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

  // ── Countdown then auto-capture ───────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    let count = 3;
    setTimer(count);
    const id = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(id);
        setTimer(null);
        doCapture();
      } else {
        setTimer(count);
      }
    }, 1000);
  }, []); // eslint-disable-line

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

  // ── Retake ────────────────────────────────────────────────────────────────────
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

  return (
    <div style={s.overlay}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.headerIcon}>📸</span>
            <div>
              <p style={s.title}>Identity Verification</p>
              <p style={s.subtitle}>Take a clear selfie to check in</p>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onCancel} title="Cancel">✕</button>
        </div>

        {/* Viewfinder */}
        <div style={s.viewfinderWrap}>
          <div style={s.viewfinder}>
            <video
              ref={videoRef}
              style={{ ...s.media, display: phase === "preview" ? "block" : "none", transform: "scaleX(-1)" }}
              playsInline muted
            />
            {snapshot && (
              <img src={snapshot} alt="selfie" style={{ ...s.media, display: phase === "captured" ? "block" : "none" }} />
            )}
            {phase === "loading" && (
              <div style={s.placeholder}>
                <div style={s.spinner} />
                <p style={s.placeholderText}>Starting camera…</p>
              </div>
            )}
            {phase === "error" && (
              <div style={s.placeholder}>
                <span style={{ fontSize: 40 }}>🚫</span>
                <p style={s.placeholderText}>{errorMsg}</p>
              </div>
            )}

            {/* Countdown overlay */}
            {timer !== null && (
              <div style={s.countdownOverlay}>
                <span style={s.countdownNum}>{timer}</span>
              </div>
            )}

            {/* Corner guides */}
            {phase === "preview" && (
              <>
                <div style={{ ...s.corner, top: 12, left: 12, borderTop: "3px solid #7B1C3E", borderLeft: "3px solid #7B1C3E" }} />
                <div style={{ ...s.corner, top: 12, right: 12, borderTop: "3px solid #7B1C3E", borderRight: "3px solid #7B1C3E" }} />
                <div style={{ ...s.corner, bottom: 12, left: 12, borderBottom: "3px solid #7B1C3E", borderLeft: "3px solid #7B1C3E" }} />
                <div style={{ ...s.corner, bottom: 12, right: 12, borderBottom: "3px solid #7B1C3E", borderRight: "3px solid #7B1C3E" }} />
              </>
            )}

            {/* Captured checkmark */}
            {phase === "captured" && (
              <div style={s.capturedBadge}>✓</div>
            )}
          </div>

          {/* Status pill */}
          <div style={{
            ...s.statusPill,
            background: phase === "preview"  ? "#DCFCE7" :
                        phase === "captured" ? "#EFF6FF" :
                        phase === "error"    ? "#FEF2F2" : "#F3F4F6",
            color:      phase === "preview"  ? "#16A34A" :
                        phase === "captured" ? "#1D4ED8" :
                        phase === "error"    ? "#DC2626" : "#6B7280",
            border: `1px solid ${
                        phase === "preview"  ? "#86EFAC" :
                        phase === "captured" ? "#BFDBFE" :
                        phase === "error"    ? "#FECACA" : "#E5E7EB"}`,
          }}>
            <span style={{ ...s.statusDot, background:
                        phase === "preview"  ? "#16A34A" :
                        phase === "captured" ? "#1D4ED8" :
                        phase === "error"    ? "#DC2626" : "#9CA3AF" }} />
            {phase === "preview"  && "Camera live"}
            {phase === "captured" && "Photo captured"}
            {phase === "loading"  && "Starting camera…"}
            {phase === "error"    && "Camera unavailable"}
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Hint */}
        <p style={s.hint}>
          {phase === "preview"  && "Align your face within the frame, then tap Take Photo."}
          {phase === "captured" && "Happy with the photo? Confirm to check in."}
          {phase === "loading"  && "Requesting camera access…"}
          {phase === "error"    && "You can skip selfie verification and check in without a photo."}
        </p>

        {/* Tips (preview only) */}
        {phase === "preview" && (
          <div style={s.tips}>
            <span style={s.tip}>💡 Face forward</span>
            <span style={s.tip}>☀️ Good lighting</span>
            <span style={s.tip}>🚫 No sunglasses</span>
          </div>
        )}

        {/* Actions */}
        <div style={s.actions}>
          {phase === "preview" && (
            <>
              <button style={s.ghostBtn} onClick={onCancel}>Skip</button>
              <button style={s.primaryBtn} onClick={startCountdown} disabled={timer !== null}>
                {timer !== null ? `📷 Taking in ${timer}…` : "📷 Take Photo"}
              </button>
            </>
          )}
          {phase === "captured" && (
            <>
              <button style={s.ghostBtn} onClick={retake}>↩ Retake</button>
              <button style={s.primaryBtn} onClick={confirm}>✓ Use Photo</button>
            </>
          )}
          {phase === "error" && (
            <>
              <button style={s.ghostBtn} onClick={onCancel}>Cancel</button>
              <button style={s.primaryBtn} onClick={onCancel}>Skip Selfie →</button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeIn   { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes countPop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
      `}</style>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 24,
    padding: "24px 22px",
    width: "100%",
    maxWidth: 380,
    display: "flex", flexDirection: "column", gap: 16,
    boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
    animation: "fadeIn 0.25s ease",
  },

  // Header
  header:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerIcon: { fontSize: 28 },
  title:      { margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" },
  subtitle:   { margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" },
  closeBtn:   { background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#6B7280", cursor: "pointer", fontSize: 14, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  // Viewfinder
  viewfinderWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  viewfinder: {
    position: "relative",
    width: 260, height: 260,
    borderRadius: "50%",
    overflow: "hidden",
    background: "#F3F4F6",
    border: "3px solid #E5E7EB",
    flexShrink: 0,
  },
  media:   { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" },
  corner:  { position: "absolute", width: 20, height: 20, borderRadius: 2 },
  placeholder: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 },
  placeholderText: { color: "#9CA3AF", fontSize: 12, textAlign: "center", margin: 0, padding: "0 16px" },
  spinner: { width: 32, height: 32, border: "3px solid #E5E7EB", borderTopColor: "#7B1C3E", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  countdownOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" },
  countdownNum:     { fontSize: 80, fontWeight: 800, color: "#FFFFFF", animation: "countPop 1s ease-in-out infinite", lineHeight: 1 },

  capturedBadge: { position: "absolute", bottom: 14, right: 14, background: "#16A34A", color: "#fff", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 },

  statusPill: { display: "flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 600 },
  statusDot:  { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },

  // Tips
  tips: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  tip:  { background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#6B7280" },

  hint: { margin: 0, fontSize: 12, color: "#6B7280", textAlign: "center", lineHeight: 1.6 },

  // Actions
  actions:    { display: "flex", gap: 10 },
  primaryBtn: { flex: 1, background: "linear-gradient(135deg, #7B1C3E 0%, #9B2554 100%)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(123,28,62,0.25)" },
  ghostBtn:   { flex: 1, background: "#F9FAFB", color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: 12, padding: "13px 0", fontWeight: 600, fontSize: 14, cursor: "pointer" },
};