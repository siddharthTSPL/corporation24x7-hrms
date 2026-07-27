import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FaTimes, FaHeadset, FaPaperPlane } from "react-icons/fa";
import { sendSupportRequest } from "../../auth/api/support/support.api";

export default function TechnicalSupportModal({ role, onClose }) {
  const location = useLocation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

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
      });
      setSent(true);
      toast.success("Your problem has been sent to our support team.");
    } catch (err) {
      toast.error(err?.message || "Couldn't send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white w-full max-w-md rounded-2xl border border-[#F4C0D1] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between" style={{ background: "#FBEAF0" }}>
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
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
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
                placeholder="Kya problem aa rahi hai, thoda detail mein likhein..."
                rows={5}
                maxLength={2000}
                className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#CD166E]/30 focus:border-[#CD166E]"
              />
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