import React from "react";
import { FaTimes } from "react-icons/fa";

function BirthdayModal({ displayName, onClose, isClosing }) {
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
          aria-label="Close birthday message"
        >
          <FaTimes size={12} />
        </button>

        <div
          className="px-7 pb-6 pt-9 text-center"
          style={{ background: "linear-gradient(135deg, #fff7f1 0%, #fff0f6 45%, #f8e8f3 100%)" }}
        >
          <div className="text-[40px] leading-none">🎉🎂🎉</div>
          <h2 className="mt-4 text-[26px] font-semibold leading-tight text-[#6F163D]">
            Happy Birthday, {firstName}!
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-[14px] leading-6 text-[#7B5A68]">
            Wishing you a day full of joy and a year full of great moments — from all of us at Team TorchX.
          </p>
        </div>

        <div className="px-7 pb-7 pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isClosing}
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7A2148 0%, #A43D67 100%)" }}
          >
            {isClosing ? "Saving..." : "Thanks, Team TorchX!"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BirthdayModal);