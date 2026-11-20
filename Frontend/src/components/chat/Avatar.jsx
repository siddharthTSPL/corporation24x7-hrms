import { useState } from "react";
import { FaUsers } from "react-icons/fa";
import { colorFor, initials } from "./chatUtils";

// online === true -> green dot (soft pulse); busy === true (on a call) -> amber dot
export default function Avatar({ name = "", photo = "", size = 40, online = null, group = false, seed = "", busy = false }) {
  const [failedUrl, setFailedUrl] = useState("");

  const dot = Math.max(10, Math.round(size * 0.28));
  const showPhoto = photo && failedUrl !== photo;
  const base = colorFor(seed || name);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {showPhoto ? (
        <img
          src={photo}
          alt={name}
          onError={() => setFailedUrl(photo)}
          className="w-full h-full rounded-full object-cover ring-1 ring-black/5"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold select-none ring-1 ring-black/5"
          style={{
            backgroundColor: base,
            backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(0,0,0,0.14) 100%)",
            fontSize: Math.max(11, Math.round(size * 0.36)),
          }}
        >
          {group ? <FaUsers style={{ fontSize: size * 0.42 }} /> : initials(name)}
        </div>
      )}
      {online === true && (
        <span
          title={busy ? "On a call" : "Online"}
          className="absolute bottom-0 right-0 flex rounded-full ring-2 ring-white"
          style={{ width: dot, height: dot }}
        >
          {!busy && size >= 36 && <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />}
          <span className={`relative w-full h-full rounded-full ${busy ? "bg-amber-500" : "bg-emerald-500"}`} />
        </span>
      )}
    </div>
  );
}