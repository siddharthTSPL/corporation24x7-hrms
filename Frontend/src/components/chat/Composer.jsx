import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaPaperPlane, FaPaperclip, FaTimes, FaFileAlt, FaReply, FaPen, FaRegSmile, FaMicrophone, FaTrash, FaLock } from "react-icons/fa";
import { useTypingEmitter } from "../../auth/server-state/chat/chat.hook";
import EmojiStickerPicker from "./EmojiStickerPicker";
import { ACCEPT_ATTR, ALLOWED_MIME, MAX_FILES, MAX_FILE_BYTES, formatSize } from "./chatUtils";

const MAX_VOICE_SECONDS = 5 * 60;
const VOICE_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
const VOICE_EXT = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };

const fmtSecs = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

export default function Composer({ conversationId, replyTo, editing, initialText = "", disabledReason = "", onCancelContext, onSend }) {
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const recRef = useRef({ mr: null, stream: null, chunks: [], timer: null, cancelled: false });
  const areaRef = useRef(null);
  const fileRef = useRef(null);
  const { onType, stopTyping } = useTypingEmitter(conversationId);

  const previews = useMemo(
    () => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [files],
  );

  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const resize = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resize();
    areaRef.current?.focus();
  }, [resize]);

  const replyId = replyTo?.id;

  useEffect(() => {
    if (replyId) areaRef.current?.focus();
  }, [replyId]);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files at a time.`);
        break;
      }
      if (!ALLOWED_MIME.includes(f.type)) {
        toast.error(`${f.name}: this file type isn't supported.`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is larger than ${formatSize(MAX_FILE_BYTES)}.`);
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  // ---- voice notes ----
  const stopTracks = () => {
    const r = recRef.current;
    clearInterval(r.timer);
    r.timer = null;
    r.stream?.getTracks().forEach((t) => t.stop());
    r.stream = null;
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice messages aren't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = VOICE_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const r = recRef.current;
      r.mr = mr;
      r.stream = stream;
      r.chunks = [];
      r.cancelled = false;
      mr.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
      mr.onstop = () => {
        stopTracks();
        setRecording(false);
        if (r.cancelled || !r.chunks.length) return;
        const base = (mr.mimeType || mime || "audio/webm").split(";")[0];
        const type = VOICE_EXT[base] ? base : "audio/webm";
        const file = new File(r.chunks, `voice-message.${VOICE_EXT[type]}`, { type });
        if (file.size > MAX_FILE_BYTES) toast.error("That voice message is too long.");
        else onSend({ text: "", files: [file] });
      };
      mr.start();
      setSecs(0);
      setRecording(true);
      setPickerOpen(false);
      r.timer = setInterval(() => {
        setSecs((n) => {
          if (n + 1 >= MAX_VOICE_SECONDS) mr.state === "recording" && mr.stop();
          return n + 1;
        });
      }, 1000);
    } catch {
      toast.error("Couldn't access the microphone. Please allow it in your browser.");
    }
  };

  const finishRecording = (cancel) => {
    const r = recRef.current;
    r.cancelled = cancel;
    if (r.mr && r.mr.state === "recording") r.mr.stop();
    else {
      stopTracks();
      setRecording(false);
    }
  };

  useEffect(
    () => () => {
      const r = recRef.current;
      r.cancelled = true;
      if (r.mr && r.mr.state === "recording") r.mr.stop();
      stopTracks();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const insertEmoji = (emoji) => {
    const el = areaRef.current;
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, 5000);
    setText(next);
    onType();
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      resize();
    });
  };

  const sendSticker = (id) => {
    if (editing) return;
    setPickerOpen(false);
    onSend({ text: "", files: [], sticker: id });
  };

  const submit = () => {
    const t = text.trim();
    if (editing) {
      if (!t) return;
      onSend({ text: t, files: [] });
    } else {
      if (!t && !files.length) return;
      onSend({ text: t, files });
    }
    setText("");
    setFiles([]);
    setPickerOpen(false);
    stopTyping();
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape" && (editing || replyTo)) onCancelContext();
  };

  const onPaste = (e) => {
    const pasted = e.clipboardData?.files;
    if (pasted && pasted.length && !editing) {
      e.preventDefault();
      addFiles(pasted);
    }
  };

  const canSend = editing ? !!text.trim() : !!text.trim() || files.length > 0;

  if (disabledReason) {
    return (
      <div className="border-t border-gray-100 bg-white px-4 py-3.5 flex items-center justify-center gap-2 text-xs text-gray-500">
        <FaLock className="text-[11px]" /> {disabledReason}
      </div>
    );
  }

  if (recording) {
    return (
      <div className="border-t border-gray-100 bg-white flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => finishRecording(true)} title="Cancel" className="w-9 h-9 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center">
          <FaTrash />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-700 tabular-nums">{fmtSecs(secs)}</span>
          <span className="text-xs text-gray-400">Recording…</span>
        </div>
        <button type="button" onClick={() => finishRecording(false)} title="Send voice message" className="w-9 h-9 rounded-full bg-[#730042] text-white flex items-center justify-center hover:bg-[#5c0035]">
          <FaPaperPlane className="text-sm" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 bg-white">
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 px-4 pt-2.5">
          <div className="flex-1 min-w-0 flex items-center gap-2 pl-2.5 border-l-2 border-[#730042] bg-gray-50 rounded-r-lg py-1.5 pr-2">
            {editing ? <FaPen className="text-[11px] text-[#730042] flex-shrink-0" /> : <FaReply className="text-[11px] text-[#730042] flex-shrink-0" />}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#730042]">
                {editing ? "Editing message" : `Replying to ${replyTo.name || "message"}`}
              </p>
              <p className="text-xs text-gray-500 truncate">{editing ? editing.text : replyTo.text}</p>
            </div>
          </div>
          <button type="button" onClick={onCancelContext} className="w-6 h-6 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
            <FaTimes className="text-xs" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex gap-2 px-4 pt-2.5 overflow-x-auto">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative flex-shrink-0">
              {previews[i] ? (
                <img src={previews[i]} alt={f.name} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="h-14 max-w-[150px] flex items-center gap-2 px-3 rounded-lg bg-gray-100 border border-gray-200">
                  <FaFileAlt className="text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700 truncate">{f.name}</p>
                    <p className="text-[10px] text-gray-400">{formatSize(f.size)}</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center"
              >
                <FaTimes className="text-[9px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-3">
        {!editing && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach files"
              className="w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center flex-shrink-0"
            >
              <FaPaperclip />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          title="Emoji & stickers"
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${pickerOpen ? "bg-[#F6E8EF] text-[#730042]" : "text-gray-500 hover:bg-gray-100"}`}
        >
          <FaRegSmile className="text-lg" />
        </button>

        <textarea
          ref={areaRef}
          rows={1}
          value={text}
          maxLength={5000}
          placeholder="Type a message"
          onChange={(e) => {
            setText(e.target.value);
            resize();
            if (e.target.value) onType();
          }}
          onBlur={stopTyping}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className="flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-2.5 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-[#730042]/40 max-h-[120px]"
        />

        {canSend || editing ? (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            title="Send"
            className="w-9 h-9 rounded-full bg-[#730042] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#5c0035] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FaPaperPlane className="text-sm" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            title="Record a voice message"
            className="w-9 h-9 rounded-full bg-[#730042] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#5c0035] transition-colors"
          >
            <FaMicrophone className="text-sm" />
          </button>
        )}
      </div>

      {pickerOpen && <EmojiStickerPicker onEmoji={insertEmoji} onSticker={sendSticker} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
