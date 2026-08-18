import React from "react";
import { FaArrowRight, FaBriefcase, FaStar, FaTimes } from "react-icons/fa";

function WelcomeModal({ displayName, professionLabel, roleLabel, onClose, isClosing }) {
  const badgeLabel =
    professionLabel && roleLabel && professionLabel !== roleLabel
      ? `${professionLabel} · ${roleLabel}`
      : professionLabel || roleLabel || "TorchX Member";

  const firstName = displayName?.trim()?.split(" ")?.[0] || "there";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: "rgba(77, 33, 53, 0.28)", backdropFilter: "blur(8px)" }}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-[#F3D6E2] bg-[#fffdfc] shadow-[0_30px_90px_rgba(88,28,58,0.22)]">
        <button
          type="button"
          onClick={onClose}
          disabled={isClosing}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#8A365A] shadow-sm transition-colors hover:bg-[#FFF1F6] hover:text-[#6F163D] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close welcome message"
        >
          <FaTimes size={13} />
        </button>

        <div
          className="relative overflow-hidden px-7 pb-7 pt-7"
          style={{ background: "linear-gradient(135deg, #fff7f1 0%, #fff0f6 42%, #f8e8f3 100%)" }}
        >
          <div
            className="absolute -right-8 -top-10 h-32 w-32 rounded-full"
            style={{ background: "rgba(201, 76, 134, 0.14)" }}
          />
          <div
            className="absolute bottom-0 left-0 h-28 w-28 -translate-x-8 translate-y-10 rounded-full"
            style={{ background: "rgba(115, 0, 66, 0.07)" }}
          />
          <div
            className="absolute right-16 top-8 h-20 w-20 rounded-full"
            style={{ background: "rgba(255, 255, 255, 0.38)" }}
          />

          <div className="relative flex items-start gap-4">
            <div className="flex h-15 w-15 min-h-15 min-w-15 items-center justify-center rounded-[22px] border border-white/80 bg-white shadow-sm">
              <FaStar className="text-[#7A2148]" size={18} />
            </div>

            <div className="flex-1">
              
              <h2 className="mt-2 text-[28px] font-semibold leading-tight text-[#6F163D]">
                Welcome, {firstName}
              </h2>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-[#7B5A68]">
                Your TorchX workspace is ready. We have set things up so you can start working with clarity from day one.
              </p>
            </div>
          </div>
        </div>

        <div className="px-7 pb-7 pt-6">
          <div className="rounded-[24px] border border-[#F2DCE6] bg-white p-5 shadow-[0_12px_30px_rgba(94,30,61,0.06)]">
            <div className="flex items-start gap-4">
              <div className="flex h-13 w-13 min-h-13 min-w-13 items-center justify-center rounded-[18px] bg-[#FFF4F8] text-[#7A2148]">
                <FaBriefcase size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#B16485]">
                  Account Ready
                </p>
                <h3 className="mt-1 text-[23px] font-semibold leading-tight text-[#52112C]">
                  {displayName || "Welcome to TorchX"}
                </h3>
                <p className="mt-2 inline-flex rounded-full border border-[#F1D0DD] bg-[#FFF7FA] px-3 py-1 text-[12px] font-medium text-[#8E4868]">
                  {badgeLabel}
                </p>
              </div>
            </div>

            <p className="mt-4 text-[14px] leading-7 text-[#695561]">
              Thanks for choosing TorchX. This space is tailored for your role, so your key tools, workflows, and updates are ready for you right away.
            </p>
          </div>

          

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#9C6B82]">
              Built to feel simple, focused, and ready to use.
            </p>
            <button
              type="button"
              onClick={onClose}
              disabled={isClosing}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7A2148 0%, #A43D67 100%)" }}
            >
              {isClosing ? "Saving..." : "Enter Workspace"}
              {!isClosing && <FaArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WelcomeModal);
