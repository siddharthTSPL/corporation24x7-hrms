import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaBan, FaTint } from "react-icons/fa";
import { MediaView } from "../RoomMedia";
import { PRESET_BACKGROUNDS, readSavedEffect, writeSavedEffect } from "../effectPresets";
import { createEffectProcessor, loadEffectImage } from "../../../../realtime/webrtc/videoEffects";
import { audioConstraints, videoConstraints, getMediaPrefs, setMediaPrefs } from "../../../../realtime/webrtc/mediaPrefs";
import { useUpdateMeetingPreferences } from "../../../../auth/server-state/meeting/meeting.hook";
import useAudioActivity from "./useAudioActivity";
import { DeviceSelect, useDevices } from "./DeviceFields";

const stop = (s) => s && s.getTracks().forEach((t) => t.stop());

function Switch({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {hint ? <p className="text-[11px] text-gray-500">{hint}</p> : null}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#CD166E]" : "bg-white/20"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

// Shown before the person enters the meeting: preview, devices, "join muted / camera off", background, audio processing.
export default function PreJoinDialog({ title = "Meeting", audioOnly = false, onClose, onJoin }) {
  const [prefs, setPrefs] = useState(getMediaPrefs);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!audioOnly);
  const [heard, setHeard] = useState(false);
  const [fx, setFx] = useState(() => readSavedEffect() || { effect: "none" });
  const [previewTrack, setPreviewTrack] = useState(null);
  const [joining, setJoining] = useState(false);
  const [restart, setRestart] = useState(0);
  const rawRef = useRef(null);
  const procRef = useRef(null);
  const { mutate: savePrefs } = useUpdateMeetingPreferences();
  const devices = useDevices(restart);

  // (re)open the camera + mic whenever a device or an audio option changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(prefs), video: audioOnly ? false : videoConstraints(prefs) });
        if (cancelled) return stop(s);
        stop(rawRef.current);
        rawRef.current = s;
        setStream(s);
        setRestart((n) => n + 1); // device labels are available now
      } catch (err) {
        if (cancelled) return;
        // camera blocked / missing -> try the mic alone
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(prefs), video: false });
          if (cancelled) return stop(s);
          stop(rawRef.current);
          rawRef.current = s;
          setStream(s);
          setCamOn(false);
          setError("Camera isn't available. You can still join with your microphone.");
        } catch {
          setError(err?.name === "NotAllowedError" ? "Allow microphone and camera access in your browser to join." : "Couldn't open your microphone or camera.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [prefs.audioDeviceId, prefs.videoDeviceId, prefs.noiseSuppression, prefs.echoCancellation, prefs.autoGainControl, audioOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // background effect on the preview (the same choice is applied when the meeting starts)
  useEffect(() => {
    let cancelled = false;
    const cam = stream?.getVideoTracks()[0];
    (async () => {
      if (procRef.current) { procRef.current.stop(); procRef.current = null; }
      if (!cam || fx.effect === "none") return setPreviewTrack(cam || null);
      try {
        const image = fx.effect === "image" ? await loadEffectImage(fx.imageUrl) : null;
        const proc = await createEffectProcessor(cam);
        if (cancelled) return proc.stop();
        proc.setConfig({ effect: fx.effect, blurIntensity: fx.blurIntensity || 50, image });
        procRef.current = proc;
        setPreviewTrack(proc.track);
      } catch {
        setPreviewTrack(cam);
      }
    })();
    return () => { cancelled = true; };
  }, [stream, fx]);

  useEffect(() => { stream?.getAudioTracks().forEach((t) => (t.enabled = micOn)); }, [stream, micOn]);
  useEffect(() => { stream?.getVideoTracks().forEach((t) => (t.enabled = camOn)); }, [stream, camOn]);

  useEffect(
    () => () => {
      procRef.current?.stop();
      stop(rawRef.current);
    },
    [],
  );

  useAudioActivity([{ id: "me", stream, enabled: micOn }], useCallback((_, on) => setHeard(on), []));

  const preview = previewTrack ? new MediaStream([previewTrack]) : null;
  const hasCam = !!stream?.getVideoTracks().length;

  const setDevice = (kind, id) => setPrefs(setMediaPrefs(kind === "audio" ? { audioDeviceId: id } : { videoDeviceId: id }));
  const setProc = (patch) => {
    setPrefs(setMediaPrefs(patch));
    savePrefs(patch, { onError: () => {} }); // best effort: the account-level preference is a bonus, the local one is what applies
  };
  const pickFx = (cfg) => {
    setFx(cfg);
    writeSavedEffect(cfg); // the room restores this on join
  };

  const join = async () => {
    setJoining(true);
    procRef.current?.stop();
    procRef.current = null;
    stop(rawRef.current); // release the camera so the meeting can open it
    rawRef.current = null;
    try {
      await onJoin({ audio: micOn, video: camOn && hasCam });
    } catch (err) {
      toast.error(err?.message || "Couldn't join the meeting.");
      setJoining(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Get ready to join">
      <div className="grid w-full max-w-4xl gap-5 rounded-3xl border border-white/10 bg-[#16161a] p-4 text-white shadow-2xl sm:p-6 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#26262b]">
            {camOn && preview ? <MediaView stream={preview} muted mirror /> : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">{audioOnly ? "Audio meeting" : camOn ? "Starting camera…" : "Camera is off"}</div>
            )}
            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setMicOn((v) => !v)} aria-label={micOn ? "Mute microphone" : "Unmute microphone"} className={`flex h-11 w-11 items-center justify-center rounded-full ${micOn ? "bg-white/15 hover:bg-white/25" : "bg-red-600"} ${micOn && heard ? "ring-4 ring-emerald-400/60" : ""}`}>
                {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              {!audioOnly && (
                <button type="button" disabled={!hasCam} onClick={() => setCamOn((v) => !v)} aria-label={camOn ? "Turn camera off" : "Turn camera on"} className={`flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40 ${camOn ? "bg-white/15 hover:bg-white/25" : "bg-red-600"}`}>
                  {camOn ? <FaVideo /> : <FaVideoSlash />}
                </button>
              )}
            </div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">{error}</p>}
          {!audioOnly && hasCam && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Background</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => pickFx({ effect: "none" })} title="No effect" className={`flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border-2 bg-white/10 ${fx.effect === "none" ? "border-[#CD166E]" : "border-transparent"}`}><FaBan /></button>
                <button type="button" onClick={() => pickFx({ effect: "blur", blurIntensity: 50 })} title="Blur" className={`flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border-2 bg-white/10 ${fx.effect === "blur" ? "border-[#CD166E]" : "border-transparent"}`}><FaTint /></button>
                {PRESET_BACKGROUNDS.slice(0, 6).map((b) => (
                  <button key={b.id} type="button" onClick={() => pickFx({ effect: "image", imageUrl: b.url, backgroundId: null, blurIntensity: 50 })} title={b.name} className={`h-14 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${fx.effect === "image" && fx.imageUrl === b.url ? "border-[#CD166E]" : "border-transparent"}`}>
                    <img src={b.url} alt={b.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-lg font-semibold">Ready to join?</p>
            <p className="truncate text-sm text-gray-400">{title}</p>
          </div>
          <DeviceSelect label="Microphone" devices={devices.mics} value={prefs.audioDeviceId} onChange={(v) => setDevice("audio", v)} fallback="Microphone" />
          {!audioOnly && <DeviceSelect label="Camera" devices={devices.cams} value={prefs.videoDeviceId} onChange={(v) => setDevice("video", v)} fallback="Camera" />}
          <div className="space-y-3 rounded-2xl bg-white/5 p-3.5">
            <Switch checked={!micOn} onChange={(v) => setMicOn(!v)} label="Join muted" />
            {!audioOnly && <Switch checked={!camOn} onChange={(v) => setCamOn(!v)} label="Join with camera off" />}
            <Switch checked={prefs.noiseSuppression} onChange={(v) => setProc({ noiseSuppression: v })} label="Noise suppression" hint="Filters keyboard and background noise" />
            <Switch checked={prefs.echoCancellation} onChange={(v) => setProc({ echoCancellation: v })} label="Echo cancellation" hint="Turn off only if you use headphones" />
          </div>
          <div className="mt-auto flex gap-2">
            <button type="button" onClick={onClose} disabled={joining} className="flex-1 rounded-full bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={join} disabled={joining || (!stream && !error)} className="flex-[1.4] rounded-full bg-[#730042] px-4 py-3 text-sm font-semibold hover:bg-[#8c0050] disabled:opacity-50">{joining ? "Joining…" : "Join now"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
