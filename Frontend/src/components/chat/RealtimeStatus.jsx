import { useEffect, useState } from "react";
import { getSocket, connectSocket } from "../../realtime/socket";

// Small "Live / Connecting / Offline" pill for the chat header.
// If it says Offline, hover it: the tooltip shows the exact reason
// (no_token_cookie, xhr poll error, websocket error, ...). Click = retry now.
const REASON_HELP = {
  no_token_cookie: "Login cookie not sent to the socket (login again / cookie settings)",
  unknown_role: "Your role is not allowed on the socket",
  account_not_found: "Account not found",
  inactive: "Account is not active",
  server_busy: "Server busy, retrying",
  "xhr poll error": "Server not reachable at /socket.io (proxy / web.config / port issue)",
  "websocket error": "WebSocket blocked by proxy (polling should still work)",
};

export default function RealtimeStatus() {
  const [state, setState] = useState(() => (getSocket().connected ? "live" : "connecting"));
  const [reason, setReason] = useState("");

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => { setState("live"); setReason(""); };
    const onDisconnect = (r) => { setState("connecting"); setReason(r || ""); };
    const onError = (err) => { setState("offline"); setReason(err?.message || "connect_error"); };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onError);
    setState(s.connected ? "live" : "connecting");
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onError);
    };
  }, []);

  const color = state === "live" ? "bg-emerald-500" : state === "offline" ? "bg-red-500" : "bg-amber-400";
  const label = state === "live" ? "Live" : state === "offline" ? "Offline" : "Connecting";
  const help = reason ? `${reason}${REASON_HELP[reason] ? " - " + REASON_HELP[reason] : ""}` : "";

  return (
    <button
      type="button"
      onClick={() => connectSocket()}
      title={state === "live" ? "Real-time connection is working" : `${help || "Not connected"} (click to retry)`}
      className="flex items-center gap-1.5 text-[11px] text-gray-500 px-2 py-1 rounded-full hover:bg-gray-100"
    >
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </button>
  );
}