import { useState } from "react";
import { FaUsers } from "react-icons/fa";
import { colorFor, initials } from "./chatUtils";

// online === true -> green dot; busy === true (on a call) -> amber dot
export default function Avatar({ name = "", photo = "", size = 40, online = null, group = false, seed = "", busy = false }) {
  const [failedUrl, setFailedUrl] = useState("");

  const dot = Math.max(9, Math.round(size * 0.26));
  const showPhoto = photo && failedUrl !== photo;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {showPhoto ? (
        <img
          src={photo}
          alt={name}
          onError={() => setFailedUrl(photo)}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold select-none"
          style={{ background: colorFor(seed || name), fontSize: Math.max(11, Math.round(size * 0.36)) }}
        >
          {group ? <FaUsers style={{ fontSize: size * 0.4 }} /> : initials(name)}
        </div>
      )}
      {online === true && (
        <span
          title={busy ? "On a call" : "Online"}
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${busy ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: dot, height: dot }}
        />
      )}
    </div>
  );
}
