import { useEffect, useState } from "react";
import { useGenerateCompanionLink } from "../../auth/server-state/companion/companion.hook";

// Lets a person who is checked in on one browser generate a short-lived
// sign-in link to open on another browser (Chrome vs Edge vs Firefox, or
// a different device) so activity pings start counting from there too -
// cookies are per-browser, so without this the second browser would need
// its password re-entered to be "seen" at all.
export default function CompanionLoginModal({ onClose }) {
  const generateLink = useGenerateCompanionLink();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateLink.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link = generateLink.data?.link;
  const expiresInMinutes = generateLink.data?.expiresInMinutes ?? 60;

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions/insecure context) — the link
      // is still visible and selectable in the text box below, so this
      // isn't a dead end even if copy silently fails.
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,26,22,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          width: 440,
          maxWidth: "100%",
          padding: 24,
          boxShadow: "0 20px 60px rgba(42,26,22,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#730042" }}>Track from another browser</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#b0948a" }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginTop: 0 }}>
          Cookies (your login) only apply to the browser you signed in on — that's why activity isn't
          counted from a different browser or device. Open this link there once to sign in on that
          browser too; after that its activity pings will count normally.
        </p>

        {generateLink.isPending && (
          <div style={{ padding: 20, textAlign: "center", color: "#b0948a", fontSize: 13 }}>Generating link…</div>
        )}

        {generateLink.isError && (
          <div style={{ background: "#fcebeb", color: "#E24B4A", padding: "10px 12px", borderRadius: 8, fontSize: 13 }}>
            {generateLink.error?.message || "Couldn't generate a link. Please try again."}
          </div>
        )}

        {link && (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: "#F9F8F2",
                border: "1px solid #ede5e0",
                borderRadius: 8,
                padding: "8px 10px",
                marginTop: 6,
              }}
            >
              <input
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 12,
                  color: "#2a1a16",
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "#1D9E75" : "#CD166E",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#c9bab5", marginTop: 10, marginBottom: 0 }}>
              This link works once and expires in {expiresInMinutes} minutes. Don't share it with
              anyone else — whoever opens it signs in as you.
            </p>
          </>
        )}
      </div>
    </div>
  );
}