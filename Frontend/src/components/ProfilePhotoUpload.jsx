import { useEffect, useRef, useState } from "react";
import { uploadProfilePhoto } from "../auth/api/profilePhoto.api";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

export default function ProfilePhotoUpload({ role, onUploaded, onError }) {
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sourceFile, setSourceFile] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const displayScale = imageSize
    ? Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height) * zoom
    : 1;
  const displayWidth = imageSize ? imageSize.width * displayScale : CROP_SIZE;
  const displayHeight = imageSize ? imageSize.height * displayScale : CROP_SIZE;
  const imageLeft = (CROP_SIZE - displayWidth) / 2 + offset.x;
  const imageTop = (CROP_SIZE - displayHeight) / 2 + offset.y;

  const clampOffset = (next, zoomValue = zoom) => {
    const scale = imageSize
      ? Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height) * zoomValue
      : 1;
    const maxX = Math.max(0, (imageSize.width * scale - CROP_SIZE) / 2);
    const maxY = Math.max(0, (imageSize.height * scale - CROP_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  };

  const closeCrop = () => {
    setPreviewUrl("");
    setSourceFile(null);
    setImageSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/[.](png|jpe?g|webp)$/i.test(file.name) || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      onError("Choose a PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError("Profile photo must be 5 MB or smaller.");
      return;
    }

    setSourceFile(file);
    setImageSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCropUpload = async () => {
    if (!imageSize || !sourceFile) return;
    setUploading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not crop this image. Please try another photo.");

      const image = new Image();
      image.src = previewUrl;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const sourceX = Math.max(0, (0 - imageLeft) / displayScale);
      const sourceY = Math.max(0, (0 - imageTop) / displayScale);
      const sourceWidth = CROP_SIZE / displayScale;
      const sourceHeight = CROP_SIZE / displayScale;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const mimeType = sourceFile.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
      if (!blob) throw new Error("Could not crop this image. Please try another photo.");
      const extension = mimeType === "image/png" ? "png" : "jpg";
      const croppedFile = new File([blob], `profile-photo.${extension}`, { type: mimeType });
      const result = await uploadProfilePhoto(role, croppedFile);
      if (!result?.profile_image) throw new Error("Upload completed without a photo URL.");
      onUploaded(result.profile_image);
      closeCrop();
    } catch (error) {
      onError(error?.response?.data?.message || error.message || "Could not upload profile photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-60"
        style={{ color: "#730042", borderColor: "#F4C0D1", background: "#fff" }}
      >
        {uploading ? "Uploading photo…" : "Upload your photo"}
      </button>
      <p className="mt-1.5 text-xs" style={{ color: "#993556" }}>
        PNG, JPG, or WEBP · up to 5 MB
      </p>

      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="profile-photo-crop-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-photo-crop-title" className="text-lg font-semibold text-gray-900">Crop profile photo</h2>
                <p className="mt-1 text-sm text-gray-500">Drag the photo to adjust it inside the circle.</p>
              </div>
              <button type="button" onClick={closeCrop} disabled={uploading} aria-label="Close crop dialog" className="rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100 disabled:opacity-50">×</button>
            </div>

            <div
              className="relative mx-auto overflow-hidden rounded-full bg-gray-100 touch-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE, maxWidth: "100%", cursor: imageSize ? "grab" : "wait" }}
              onPointerDown={(event) => {
                if (!imageSize || uploading) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = { x: event.clientX, y: event.clientY, offset };
              }}
              onPointerMove={(event) => {
                if (!dragRef.current) return;
                const drag = dragRef.current;
                setOffset(clampOffset({
                  x: drag.offset.x + event.clientX - drag.x,
                  y: drag.offset.y + event.clientY - drag.y,
                }));
              }}
              onPointerUp={() => { dragRef.current = null; }}
              onPointerCancel={() => { dragRef.current = null; }}
            >
              <img
                src={previewUrl}
                alt="Photo crop preview"
                draggable="false"
                onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                className="pointer-events-none absolute max-w-none select-none"
                style={{ width: displayWidth, height: displayHeight, left: imageLeft, top: imageTop }}
              />
            </div>

            <label className="mt-5 block text-sm font-medium text-gray-700" htmlFor="profile-photo-zoom">Zoom</label>
            <input
              id="profile-photo-zoom"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              disabled={!imageSize || uploading}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);
                setZoom(nextZoom);
                setOffset((current) => clampOffset(current, nextZoom));
              }}
              className="mt-2 w-full accent-[#730042]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeCrop} disabled={uploading} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">Cancel</button>
              <button
                type="button"
                onClick={handleCropUpload}
                disabled={!imageSize || uploading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
                style={{ background: "#730042" }}
              >
                {uploading ? "Uploading…" : "Crop & upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
