import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useExchangeSsoTicket } from "../../auth/server-state/sso/sso.hook";
import { setAgentToken } from "../utils/Desktopagent";

// Public route. The backend sends the browser here after Microsoft / Zoho
// sign-in with either ?ticket=… (success) or ?error=… (failure). The ticket
// is swapped for the normal session cookie, then the usual role redirect runs.
export default function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exchange = useExchangeSsoTicket();
  const attempted = useRef(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const ticket = searchParams.get("ticket");
    if (error) return;
    if (!ticket) {
      setError("Sign-in could not be completed. Please try again.");
      return;
    }

    exchange.mutate(ticket, {
      onSuccess: (data) => {
        // Single-device approval mode: hand off to the login screen's
        // "waiting for approval" step.
        if (data?.challenge) {
          navigate("/login", {
            replace: true,
            state: {
              ssoChallenge: {
                sessionId: data.sessionId,
                expiresAt: data.expiresAt,
                activeDevice: data.activeDevice || null,
              },
            },
          });
          return;
        }
        if (data?.token) setAgentToken(data.token);
        // Remember the provider so the login page can sign this person in
        // automatically next time; clear the "logged out" pause.
        if (data?.provider) localStorage.setItem("sso_last_provider", data.provider);
        localStorage.removeItem("sso_auto_off");
        localStorage.setItem("role", data.accountType);
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        navigate("/redirect", { replace: true });
      },
      onError: (err) => setError(err.message || "Sign-in failed. Please try again."),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9F8F2", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 10px 40px rgba(42,26,22,0.12)" }}>
        {!error ? (
          <>
            <div style={{ width: 36, height: 36, margin: "0 auto 16px", border: "3px solid #ede5e0", borderTop: "3px solid #730042", borderRadius: "50%", animation: "sso-spin 0.7s linear infinite" }} />
            <style>{`@keyframes sso-spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ margin: 0, fontSize: 14, color: "#2a1a16", fontWeight: 600 }}>Signing you in…</p>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 15, color: "#E24B4A", fontWeight: 700 }}>Couldn't sign you in</p>
            <p style={{ margin: "8px 0 20px", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{error}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              style={{ background: "#730042", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}