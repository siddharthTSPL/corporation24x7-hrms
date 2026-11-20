import { useRef } from "react";
import toast from "react-hot-toast";
import { FaArrowLeft, FaImage, FaUndo, FaCheck } from "react-icons/fa";
import { useSetWallpaper, useUploadWallpaper } from "../../auth/server-state/chat/chat.hook";
import { WALLPAPER_COLORS, WALLPAPER_PRESETS, wallpaperStyle } from "./emojiData";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Pick a background for THIS chat. It's saved for you only - the other person keeps their own.
export default function WallpaperSheet({ conversationId, current, onClose }) {
  const setWallpaper = useSetWallpaper();
  const upload = useUploadWallpaper();
  const fileRef = useRef(null);

  const apply = (wallpaper) =>
    setWallpaper.mutate({ id: conversationId, wallpaper }, { onError: (e) => toast.error(e.message || "Couldn't change the background.") });

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image.");
    if (f.size > MAX_IMAGE_BYTES) return toast.error("Image is larger than 8 MB.");
    upload.mutate({ id: conversationId, file: f }, { onError: (err) => toast.error(err.message || "Upload failed.") });
  };

  const selectedPreset = (id) => current === `preset:${id}` || (id === "default" && !current);
  const isCustomImage = /^https:\/\//.test(current || "");

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
          <FaArrowLeft className="text-sm" />
        </button>
        <h3 className="text-base font-bold text-gray-900">Chat background</h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        <div className="rounded-xl border border-gray-200 h-24 flex items-end justify-end p-2" style={wallpaperStyle(current)}>
          <span className="text-[11px] bg-white rounded-xl px-2.5 py-1 shadow-sm text-gray-700">Preview</span>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Themes</p>
          <div className="grid grid-cols-4 gap-2">
            {WALLPAPER_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => apply(p.id === "default" ? "" : `preset:${p.id}`)}
                title={p.name}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`relative w-full aspect-square rounded-xl border-2 ${selectedPreset(p.id) ? "border-[#730042]" : "border-gray-200"}`}
                  style={{ background: p.css }}
                >
                  {selectedPreset(p.id) && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-5 h-5 rounded-full bg-[#730042] text-white flex items-center justify-center">
                        <FaCheck className="text-[9px]" />
                      </span>
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-gray-500">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Solid colours</p>
          <div className="flex flex-wrap gap-2 items-center">
            {WALLPAPER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => apply(`color:${c}`)}
                className={`w-8 h-8 rounded-full border-2 ${current === `color:${c}` ? "border-[#730042]" : "border-gray-200"}`}
                style={{ background: c }}
                title={c}
              />
            ))}
            <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 text-gray-400 text-xs flex items-center justify-center cursor-pointer overflow-hidden relative" title="Custom colour">
              +
              <input
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => apply(`color:${e.target.value}`)}
              />
            </label>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Your own photo</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold disabled:opacity-60 ${isCustomImage ? "border-[#730042] text-[#730042]" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            <FaImage /> {upload.isPending ? "Uploading…" : isCustomImage ? "Change photo" : "Upload a photo"}
          </button>
        </div>

        {current && (
          <button type="button" onClick={() => apply("")} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <FaUndo className="text-xs" /> Reset to default
          </button>
        )}
        <p className="text-[11px] text-gray-400 text-center">Only you see this background. The other person keeps their own.</p>
      </div>
    </div>
  );
}
