import toast from "react-hot-toast";

/**
 * Popup stays until the user closes it with the × button.
 * For auto-close, set a number here (e.g. 10000 = 10 seconds).
 */
const AUTO_CLOSE_MS = Infinity;

// Beetroot theme
const BEET = "#730042"; // border / icon / button
const BEET_DARK = "#4d0029"; // title text
const BEET_SOFT = "#fbeaf2"; // light beetroot background
const BEET_TEXT = "#7a4a63"; // description text

const Icon = ({ type }) => {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" };

  if (type === "success")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" fill={BEET} />
        <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  if (type === "info")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" fill={BEET} />
        <rect x="11" y="10.5" width="2" height="6.5" rx="1" fill="#fff" />
        <circle cx="12" cy="7.6" r="1.25" fill="#fff" />
      </svg>
    );

  // error + storage => filled warning triangle
  return (
    <svg {...common}>
      <path
        d="M10.3 3.9L1.9 18.2A2 2 0 0 0 3.6 21.2h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
        fill={BEET}
        stroke={BEET}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="11" y="9" width="2" height="5.5" rx="1" fill="#fff" />
      <circle cx="12" cy="17.2" r="1.2" fill="#fff" />
    </svg>
  );
};

// NOTE: all styling is inline on purpose, so it looks the same
// regardless of the Tailwind setup (no class scanning issues).
const showToast = ({ type, title, message, showUpgrade = false }) => {
  toast.custom(
    (t) => (
      <div
        role="alert"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          boxSizing: "border-box",
          width: 360,
          maxWidth: "calc(100vw - 32px)",
          padding: "12px 14px",
          backgroundColor: BEET_SOFT,
          border: `1.5px solid ${BEET}`,
          borderRadius: 18,
          boxShadow: "0 10px 28px -8px rgba(115,0,66,0.35)",
          transition: "all 0.45s ease",
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? "translateX(0)" : "translateX(40px)",
          fontFamily: "inherit",
        }}
      >
        {/* icon */}
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          <Icon type={type} />
        </div>

        {/* text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: BEET_DARK }}>
            {title}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.45, color: BEET_TEXT }}>
            {message}
          </p>

          {showUpgrade && (
            <a
              href="https://torchxsuite.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 9,
                padding: "5px 14px",
                backgroundColor: BEET,
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              Upgrade plan →
            </a>
          )}
        </div>

        {/* close */}
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          aria-label="Close"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
          style={{
            flexShrink: 0,
            background: "none",
            border: "none",
            padding: 2,
            cursor: "pointer",
            color: BEET,
            opacity: 0.6,
            lineHeight: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    ),
    {
      id: `${type}-${title}-${message}`, // same popup never stacks twice
      position: "top-right",
      duration: AUTO_CLOSE_MS,
    }
  );
};

export const showErrorToast = (message, title = "Something went wrong") =>
  showToast({ type: "error", title, message });

export const showInfoToast = (message, title = "Notice") =>
  showToast({ type: "info", title, message });

export const showSuccessToast = (message, title = "Success") =>
  showToast({ type: "success", title, message });

export const showStorageLimitToast = (message) =>
  showToast({ type: "storage", title: "Storage limit reached", message, showUpgrade: true });

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong. Please try again.";

// Works even if your API hook wraps the error and drops err.response.
export const isStorageLimitError = (err) => {
  const code = err?.response?.data?.code || err?.code;
  if (code === "STORAGE_LIMIT_EXCEEDED") return true;
  const msg = getErrorMessage(err);
  return /storage/i.test(msg) && /(upgrade|limit|used)/i.test(msg);
};

// Use for any API error: picks the right popup automatically.
export const showApiError = (err, title) => {
  const message = getErrorMessage(err);
  if (isStorageLimitError(err)) showStorageLimitToast(message);
  else showErrorToast(message, title);
};