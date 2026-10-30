import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaBan, FaTint, FaPlus, FaTrash, FaVideoSlash, FaSpinner } from "react-icons/fa";
import useCall from "../../../realtime/useCall";
import {
  useMeetingBackgrounds,
  useMeetingPreferences,
  useUpdateMeetingPreferences,
  useUploadMeetingBackground,
  useDeleteMeetingBackground,
} from "../../../auth/server-state/meeting/meeting.hook";
import { MediaView, PanelHeader } from "./RoomMedia";
import { PRESET_BACKGROUNDS, readSavedEffect, writeSavedEffect } from "./effectPresets";

export function useRestoreEffect({ isGuest }) {
  const { active, setVideoEffect } = useCall();
  const { data: prefData, isFetched } = useMeetingPreferences(!isGuest && !!active);
  const done = useRef(false);
  const { data: bgData } = useMeetingBackgrounds(!isGuest && !!active);
  const hasCamera = !!active?.localStream?.getVideoTracks().length;
  const roomKey = active?.roomKey;

  useEffect(() => {
    done.current = false;
  }, [roomKey]);

  useEffect(() => {
    if (!roomKey || !hasCamera || done.current) return;
    if (!isGuest && !isFetched) return;
    done.current = true;

    const local = readSavedEffect();
    let cfg = local;
    if (!cfg && prefData?.preferences && prefData.preferences.effect !== "none") {
      const p = prefData.preferences;
      cfg = { effect: p.effect, blurIntensity: p.blurIntensity, imageUrl: prefData.background?.url || "", backgroundId: p.backgroundId || null };
      if (p.effect === "image" && !cfg.imageUrl) {
        const all = [...(bgData?.organisation || []), ...(bgData?.personal || [])];
        cfg.imageUrl = all.find((b) => b.id === p.backgroundId)?.url || "";
        if (!cfg.imageUrl) cfg = null;
      }
    }
    if (cfg && cfg.effect !== "none") {
      Promise.resolve(setVideoEffect(cfg)).catch(() => {});
    }
  }, [roomKey, hasCamera, isGuest, isFetched, prefData, bgData, setVideoEffect]);
}

function Option({ selected, onClick, children, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`group relative aspect-video overflow-hidden rounded-xl border-2 text-left transition-all disabled:opacity-50 ${selected ? "border-[#CD166E] shadow-[0_0_0_2px_rgba(205,22,110,0.25)]" : "border-transparent hover:border-white/30"}`}
    >
      {children}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[10px] font-medium text-white">{label}</span>
    </button>
  );
}

export default function EffectsPanel({ onClose, isGuest }) {
  const { active, setVideoEffect } = useCall();
  const [busy, setBusy] = useState("");
  const [intensity, setIntensity] = useState(active?.effect?.blurIntensity || 50);
  const fileRef = useRef(null);
  const debounce = useRef(null);

  const { data: bgData } = useMeetingBackgrounds(!isGuest);
  const upload = useUploadMeetingBackground();
  const remove = useDeleteMeetingBackground();
  const { mutate: savePrefs } = useUpdateMeetingPreferences();

  const fx = active?.effect || { effect: "none" };
  const cameraOn = !!active?.localStream?.getVideoTracks().length;
  const org = bgData?.organisation || [];
  const personal = bgData?.personal || [];
  const limits = bgData?.limits || { personal: 10 };

  useEffect(() => () => clearTimeout(debounce.current), []);

  const apply = async (cfg, key) => {
    setBusy(key);
    try {
      await setVideoEffect(cfg);
      writeSavedEffect(cfg);
      if (!isGuest) {
        const body = { effect: cfg.effect === "image" && !cfg.backgroundId ? "none" : cfg.effect, blurIntensity: cfg.blurIntensity || 50 };
        if (cfg.effect === "image" && cfg.backgroundId) body.backgroundId = cfg.backgroundId;
        savePrefs(body);
      }
    } catch (err) {
      toast.error(err?.message || "Couldn't apply that effect.");
    } finally {
      setBusy("");
    }
  };

  const onIntensity = (value) => {
    setIntensity(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply({ effect: "blur", blurIntensity: value }, "blur"), 250);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8 MB.");
    try {
      const res = await upload.mutateAsync({ file });
      const bg = res.background;
      if (bg) apply({ effect: "image", imageUrl: bg.url, backgroundId: bg.id, blurIntensity: intensity }, bg.id);
    } catch (err) {
      toast.error(err?.message || "Upload failed.");
    }
  };

  const del = async (e, bg) => {
    e.stopPropagation();
    try {
      await remove.mutateAsync(bg.id);
      if (fx.backgroundId === bg.id) await setVideoEffect({ effect: "none" });
    } catch (err) {
      toast.error(err?.message || "Couldn't delete it.");
    }
  };

  const thumb = (bg) => (
    <img src={bg.thumbUrl || bg.url} alt={bg.name} className="h-full w-full object-cover" crossOrigin="anonymous" loading="lazy" />
  );

  const bgCard = (bg, deletable) => (
    <div key={bg.id} className="group relative">
      <Option label={bg.name} selected={fx.effect === "image" && fx.imageUrl === bg.url} disabled={!cameraOn || !!busy} onClick={() => apply({ effect: "image", imageUrl: bg.url, backgroundId: bg.id.startsWith("preset-") ? null : bg.id, blurIntensity: intensity }, bg.id)}>
        {thumb(bg)}
        {busy === bg.id && <span className="absolute inset-0 flex items-center justify-center bg-black/50"><FaSpinner className="animate-spin text-white" /></span>}
      </Option>
      {deletable && (
        <button type="button" onClick={(e) => del(e, bg)} title="Delete" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[10px] text-white opacity-0 hover:bg-red-600 group-hover:opacity-100">
          <FaTrash />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Backgrounds & effects" subtitle="Applies to your video for everyone" onClose={onClose} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
          {cameraOn && active.video ? (
            <MediaView stream={active.localStream} muted mirror />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
              <FaVideoSlash className="text-2xl" />
              <p className="px-6 text-center text-xs">{cameraOn ? "Turn your camera on to preview effects." : "No camera available."}</p>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs text-white">
              <FaSpinner className="mr-2 animate-spin" /> Applying…
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Effects</p>
          <div className="grid grid-cols-3 gap-2">
            <Option label="None" selected={fx.effect === "none"} disabled={!cameraOn || !!busy} onClick={() => apply({ effect: "none" }, "none")}>
              <div className="flex h-full w-full items-center justify-center bg-white/10 text-gray-300"><FaBan /></div>
            </Option>
            <Option label="Blur" selected={fx.effect === "blur"} disabled={!cameraOn || !!busy} onClick={() => apply({ effect: "blur", blurIntensity: intensity }, "blur")}>
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800 text-gray-100"><FaTint /></div>
            </Option>
          </div>
          {fx.effect === "blur" && (
            <div className="mt-3 rounded-xl bg-white/5 px-3 py-2.5">
              <div className="mb-1 flex justify-between text-xs text-gray-300"><span>Blur strength</span><span>{intensity}%</span></div>
              <input type="range" min={10} max={100} step={5} value={intensity} onChange={(e) => onIntensity(Number(e.target.value))} className="w-full accent-[#CD166E]" />
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Backgrounds</p>
          <div className="grid grid-cols-3 gap-2">{PRESET_BACKGROUNDS.map((bg) => bgCard(bg, false))}</div>
        </div>

        {!isGuest && org.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company</p>
            <div className="grid grid-cols-3 gap-2">{org.map((bg) => bgCard(bg, false))}</div>
          </div>
        )}

        {!isGuest && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">My backgrounds</p>
              <span className="text-[10px] text-gray-500">{personal.length}/{limits.personal}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {personal.map((bg) => bgCard(bg, true))}
              {personal.length < limits.personal && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={upload.isPending} className="flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/25 text-gray-300 hover:border-white/50 hover:bg-white/5 disabled:opacity-50">
                  {upload.isPending ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  <span className="text-[10px]">Upload</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          </div>
        )}
      </div>
    </div>
  );
}
