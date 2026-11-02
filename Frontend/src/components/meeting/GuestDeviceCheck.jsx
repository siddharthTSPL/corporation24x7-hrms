import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, TriangleAlert } from "lucide-react";
import { cx } from "./meetingClasses";

export default function GuestDeviceCheck({ audioOnly, micOn, camOn, onMic, onCam }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [problem, setProblem] = useState("");
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let local = null;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true, video: audioOnly ? false : true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        local = s;
        setStream(s);
      })
      .catch(() => !cancelled && setProblem("We couldn't reach your camera or microphone. Allow access in your browser, or join without them."));
    if (!navigator.mediaDevices) queueMicrotask(() => !cancelled && setProblem("This browser can't access a camera or microphone."));
    return () => {
      cancelled = true;
      local?.getTracks().forEach((t) => t.stop());
    };
  }, [audioOnly]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = stream && camOn ? stream : null;
  }, [stream, camOn]);

  useEffect(() => {
    if (!stream || !micOn || !stream.getAudioTracks().length) return undefined;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return undefined;
    const ctx = new AC();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const id = setInterval(() => {
      analyser.getByteFrequencyData(data);
      setLevel(Math.min(1, data.reduce((a, b) => a + b, 0) / data.length / 90));
    }, 120);
    return () => {
      clearInterval(id);
      ctx.close().catch(() => {});
    };
  }, [stream, micOn]);

  const showVideo = !audioOnly && camOn && stream;
  const bars = micOn ? level : 0;

  return (
    <div className="space-y-3">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
        <video ref={videoRef} autoPlay playsInline muted className={cx("h-full w-full -scale-x-100 object-cover", !showVideo && "hidden")} />
        {!showVideo && <p className="px-4 text-center text-sm text-gray-400">{audioOnly ? "Audio-only meeting" : "Your camera is off"}</p>}
      </div>

      {problem && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {problem}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={onMic} aria-pressed={micOn} aria-label={micOn ? "Join with microphone on" : "Join muted"} className={cx("flex h-11 w-11 items-center justify-center rounded-full", micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-600 text-white")}>
          {micOn ? <Mic size={18} aria-hidden="true" /> : <MicOff size={18} aria-hidden="true" />}
        </button>
        {!audioOnly && (
          <button type="button" onClick={onCam} aria-pressed={camOn} aria-label={camOn ? "Join with camera on" : "Join with camera off"} className={cx("flex h-11 w-11 items-center justify-center rounded-full", camOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-600 text-white")}>
            {camOn ? <Video size={18} aria-hidden="true" /> : <VideoOff size={18} aria-hidden="true" />}
          </button>
        )}
        <div className="flex-1">
          <p className="mb-1 text-xs text-gray-400">{micOn ? "Microphone level" : "Microphone muted"}</p>
          <div className="h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(bars * 100)} aria-label="Microphone level">
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-100" style={{ width: `${bars * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
