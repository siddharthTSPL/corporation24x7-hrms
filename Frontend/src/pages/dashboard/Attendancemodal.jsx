import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import AttendancePage from "../attendance/attendancepage";

/**
 * "My Attendance" modal — opened from the Check In / Check Out button on the
 * admin Dashboard's Today banner.
 *
 * It shows the app's standard check-in screen (the exact same UI and flow as
 * /mark-attendance: live clock, location + selfie check-in, Session Time
 * gauge, Active/Idle status, check-out) inside a modal, so the two never
 * drift apart.
 *
 * NOT the team directory modal — that is Attendancedetailsmodal.jsx.
 *
 * Props: `user` (accepted for backwards compatibility with Dashboard.jsx;
 * the page loads the logged-in user itself) and `onClose`.
 */
// eslint-disable-next-line no-unused-vars
export default function AttendanceModal({ user, onClose }) {
  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 border border-gray-200 text-[#7B1C3E] hover:bg-[#FDF2F8] shadow-sm cursor-pointer"
        >
          <FaTimes />
        </button>

        {/* The page is built as a full screen (min-h-screen); neutralise that so it sizes to the modal and scrolls inside it. */}
        <div className="overflow-y-auto [&_.min-h-screen]:min-h-0">
          <AttendancePage />
        </div>
      </div>
    </div>
  );
}