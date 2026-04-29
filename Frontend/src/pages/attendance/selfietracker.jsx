import { useRef, useState, useEffect, useCallback } from "react";

/**
 * SelfieCapture
 * Opens the user's webcam, lets them take a photo, returns base64 string via onCapture.
 * Props:
 *   onCapture(base64String) — called when photo is confirmed
 *   onCancel()              — called when user dismisses
 */
export default function SelfieCapture({ onCapture, onCancel }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [phase,    setPhase]    = useState("loading"); // loading | preview | captured | error
  const [snapshot, setSnapshot] = useState(null);      // base64
  const [errorMsg, setErrorMsg] = useState("");

  // ── Start webcam ──
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

  // ── Take photo ──
  const takePhoto = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = 400;
    canvas.width  = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    // Mirror and crop to square
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;

    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1); // mirror horizontally
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    ctx.restore();

    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    setSnapshot(base64);
    setPhase("captured");

    // Stop stream to turn off camera indicator light
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // ── Retake ──
  const retake = useCallback(async () => {
    setSnapshot(null);
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

  // ── Confirm ──
  const confirm = useCallback(() => {
    if (snapshot) onCapture(snapshot);
  }, [snapshot, onCapture]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>📸 Verify Identity</span>
          <button style={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div style={styles.viewfinder}>
          {/* Live video */}
          <video
            ref={videoRef}
            style={{ ...styles.media, display: phase === "preview" ? "block" : "none", transform: "scaleX(-1)" }}
            playsInline
            muted
          />

          {/* Captured photo */}
          {snapshot && (
            <img src={snapshot} alt="selfie" style={{ ...styles.media, display: phase === "captured" ? "block" : "none" }} />
          )}

          {/* Loading */}
          {phase === "loading" && (
            <div style={styles.placeholder}>
              <div style={styles.spinner} />
              <p style={styles.placeholderText}>Starting camera…</p>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div style={styles.placeholder}>
              <span style={{ fontSize: 36 }}>🚫</span>
              <p style={styles.placeholderText}>{errorMsg}</p>
            </div>
          )}

          {/* Overlay circle frame */}
          <div style={styles.circleFrame} />
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <p style={styles.hint}>
          {phase === "preview"   && "Position your face in the circle and take a photo."}
          {phase === "captured"  && "Looks good? Confirm or retake."}
          {phase === "loading"   && "Requesting camera access…"}
          {phase === "error"     && "Cannot access camera."}
        </p>

        <div style={styles.actions}>
          {phase === "preview" && (
            <button style={styles.primaryBtn} onClick={takePhoto}>
              📷 Take Photo
            </button>
          )}
          {phase === "captured" && (
            <>
              <button style={styles.secondaryBtn} onClick={retake}>↩ Retake</button>
              <button style={styles.primaryBtn} onClick={confirm}>✓ Confirm</button>
            </>
          )}
          {phase === "error" && (
            <button style={styles.secondaryBtn} onClick={onCancel}>
              Skip (No Selfie)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: 20,
    padding: "24px",
    width: 360,
    display: "flex", flexDirection: "column", gap: 16,
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  title: { color: "#f9fafb", fontWeight: 700, fontSize: 18 },
  closeBtn: {
    background: "none", border: "none", color: "#9ca3af",
    cursor: "pointer", fontSize: 18, padding: 4,
  },
  viewfinder: {
    position: "relative",
    width: 280, height: 280,
    alignSelf: "center",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#1f2937",
    border: "3px solid #374151",
  },
  media: {
    width: "100%", height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  circleFrame: {
    position: "absolute", inset: 0,
    borderRadius: "50%",
    border: "3px solid rgba(99,102,241,0.6)",
    boxShadow: "inset 0 0 30px rgba(99,102,241,0.15)",
    pointerEvents: "none",
  },
  placeholder: {
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  placeholderText: { color: "#9ca3af", fontSize: 13, textAlign: "center", margin: 0, padding: "0 16px" },
  spinner: {
    width: 36, height: 36,
    border: "3px solid #374151",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  hint: { color: "#6b7280", fontSize: 13, textAlign: "center", margin: 0 },
  actions: { display: "flex", gap: 10, justifyContent: "center" },
  primaryBtn: {
    flex: 1,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", border: "none", borderRadius: 12,
    padding: "12px 0", fontWeight: 700, fontSize: 15,
    cursor: "pointer",
  },
  secondaryBtn: {
    flex: 1,
    background: "#1f2937", color: "#9ca3af",
    border: "1px solid #374151", borderRadius: 12,
    padding: "12px 0", fontWeight: 600, fontSize: 15,
    cursor: "pointer",
  },
};