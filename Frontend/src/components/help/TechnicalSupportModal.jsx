import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FaTimes, FaHeadset, FaPaperPlane, FaPaperclip, FaFileAlt, FaFileImage, FaFilePdf } from "react-icons/fa";
import { sendSupportRequest } from "../../auth/api/support/Support.api";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — mirrors the backend's multer limit
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
]);

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function fileIcon(type) {
  if (type.startsWith("image/")) return <FaFileImage className="text-[#730042]" size={13} />;
  if (type === "application/pdf") return <FaFilePdf className="text-[#730042]" size={13} />;
  return <FaFileAlt className="text-[#730042]" size={13} />;
}

export default function TechnicalSupportModal({ role, onClose }) {
  const location = useLocation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (!ALLOWED_TYPES.has(f.type)) {
        toast.error(`"${f.name}" isn't a supported file type.`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" is too large (max 8MB).`);
        continue;
      }
      if (next.some((existing) => existing.name === f.name && existing.size === f.size)) continue; // skip dupes
      next.push(f);
    }
    setFiles(next);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both subject and problem details.");
      return;
    }

    setSubmitting(true);
    try {
      await sendSupportRequest(role, {
        subject: subject.trim(),
        message: message.trim(),
        page: location.pathname,
        files,
      });
      setSent(true);
      toast.success("Your problem has been sent to our support team.");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Couldn't send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white w-full max-w-md rounded-2xl border border-[#F4C0D1] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-shrink-0" style={{ background: "#FBEAF0" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#F7C1C1] flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
              <FaHeadset className="text-[#730042]" size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#730042]">Technical Support</h3>
              <p className="text-[11px] text-[#993556]">We'll reply on your registered email</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#993556] hover:text-[#730042]">
            <FaTimes size={14} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-700 mb-1">Thanks — your message has been sent.</p>
            <p className="text-xs text-gray-500 mb-5">Our team will get back to you over email shortly.</p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-[12px] font-medium text-white hover:opacity-90"
              style={{ background: "#730042" }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Unable to mark attendance"
                maxLength={120}
                className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CD166E]/30 focus:border-[#CD166E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Describe the problem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe the issue you're facing, with as much detail as possible..."
                rows={5}
                maxLength={2000}
                className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#CD166E]/30 focus:border-[#CD166E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Attachments <span className="text-gray-400 font-normal">(optional — screenshots, files, up to {MAX_FILES})</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="w-full flex items-center justify-center gap-2 text-[12px] font-medium rounded-lg border border-dashed border-[#e8b8cf] text-[#730042] px-3 py-2.5 hover:bg-[#FBEAF0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FaPaperclip size={11} />
                {files.length ? "Add more files" : "Attach a file"}
              </button>

              {files.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                      {fileIcon(f.type)}
                      <span className="flex-1 min-w-0 text-[12px] text-gray-700 truncate">{f.name}</span>
                      <span className="text-[10.5px] text-gray-400 whitespace-nowrap">{fmtSize(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                        aria-label={`Remove ${f.name}`}
                      >
                        <FaTimes size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#F4C0D1] text-[12px] font-medium text-[#730042] hover:bg-[#FBEAF0] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
                style={{ background: "#730042" }}
              >
                {submitting ? "Sending..." : (<>Send <FaPaperPlane size={10} /></>)}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}