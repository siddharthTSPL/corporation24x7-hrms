import React from "react";
import { FaArrowRight, FaStar, FaTimes } from "react-icons/fa";

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
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#F3D6E2] bg-[#fffdfc] shadow-[0_30px_90px_rgba(88,28,58,0.22)]">
        <button
          type="button"
          onClick={onClose}
          disabled={isClosing}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#8A365A] shadow-sm transition-colors hover:bg-[#FFF1F6] hover:text-[#6F163D] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close welcome message"
        >
          <FaTimes size={12} />
        </button>

        <div
          className="px-7 pb-6 pt-9 text-center"
          style={{ background: "linear-gradient(135deg, #fff7f1 0%, #fff0f6 45%, #f8e8f3 100%)" }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
            <FaStar className="text-[#7A2148]" size={18} />
          </div>
          <h2 className="mt-4 text-[24px] font-semibold leading-tight text-[#6F163D]">
            Welcome, {firstName}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-[14px] leading-6 text-[#7B5A68]">
            Your TorchX workspace is ready — set up for your role, right from day one.
          </p>
          <p className="mt-3 inline-flex rounded-full border border-[#F1D0DD] bg-[#FFF7FA] px-3 py-1 text-[12px] font-medium text-[#8E4868]">
            {badgeLabel}
          </p>
        </div>

        <div className="px-7 pb-7 pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isClosing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7A2148 0%, #A43D67 100%)" }}
          >
            {isClosing ? "Saving..." : "Enter Workspace"}
            {!isClosing && <FaArrowRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WelcomeModal);