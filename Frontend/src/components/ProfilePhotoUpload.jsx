import { useRef, useState } from "react";
import { uploadProfilePhoto } from "../auth/api/profilePhoto.api";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ProfilePhotoUpload({ role, onUploaded, onError }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event) => {
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

    setUploading(true);
    try {
      const result = await uploadProfilePhoto(role, file);
      if (!result?.profile_image) throw new Error("Upload completed without a photo URL.");
      onUploaded(result.profile_image);
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
    </div>
  );
}
