import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaPaperPlane, FaPaperclip, FaTimes, FaFileAlt, FaReply, FaPen } from "react-icons/fa";
import { useTypingEmitter } from "../../auth/server-state/chat/chat.hook";
import { ACCEPT_ATTR, ALLOWED_MIME, MAX_FILES, MAX_FILE_BYTES, formatSize } from "./chatUtils";

export default function Composer({ conversationId, replyTo, editing, initialText = "", onCancelContext, onSend }) {
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState([]);
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

        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          title="Send"
          className="w-9 h-9 rounded-full bg-[#730042] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#5c0035] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FaPaperPlane className="text-sm" />
        </button>
      </div>
    </div>
  );
}
