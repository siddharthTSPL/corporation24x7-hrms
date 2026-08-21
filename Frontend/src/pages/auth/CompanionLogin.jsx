import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRedeemCompanionLink } from "../../auth/server-state/companion/companion.hook";

// Public route (no session required to LAND here — that's the whole
// point): opened from a link generated on a different, already-logged-in
// browser. Exchanges the link's token for a real session cookie on THIS
// browser, then hands off to the normal role-based redirect.
export default function CompanionLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const redeem = useRedeemCompanionLink();
  const attempted = useRef(false);

  const [status, setStatus] = useState("working"); // working | error

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    redeem.mutate(token, {
      onSuccess: (data) => {
        localStorage.setItem("role", data.accountType);
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        setTimeout(() => navigate("/redirect", { replace: true }), 600);
      },
      onError: () => setStatus("error"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F9F8F2",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(42,26,22,0.12)",
        }}
      >
        {status === "working" && (
          <>
            <div
              style={{
                width: 36,
                height: 36,
                margin: "0 auto 16px",
                border: "3px solid #ede5e0",
                borderTop: "3px solid #CD166E",
                borderRadius: "50%",
                animation: "companion-spin 0.7s linear infinite",
              }}
            />
            <style>{`@keyframes companion-spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ margin: 0, fontSize: 14, color: "#2a1a16", fontWeight: 600 }}>Signing you in…</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#b0948a" }}>Setting up this browser</p>
          </>
        )}

        {status === "error" && (
          <>
            <p style={{ margin: 0, fontSize: 15, color: "#E24B4A", fontWeight: 700 }}>Link invalid or expired</p>
            <p style={{ margin: "8px 0 20px", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
              {redeem.error?.message ||
                "This sign-in link couldn't be used. Go back to your other browser and generate a fresh one from Attendance → \"Track from another browser\"."}
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "#CD166E",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}