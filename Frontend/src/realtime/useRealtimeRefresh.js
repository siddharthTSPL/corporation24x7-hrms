import { useEffect, useRef } from "react";
import { getSocket } from "./socket";

const DEBOUNCE_MS = 1200;

// For pages that load their own data (useState/useEffect + axios) instead of
// React Query: call `callback` (e.g. your load()) whenever one of `modules`
// changes in the organisation, or a notification of that type arrives.
//
//   useRealtimeRefresh(["training"], load);
//
// The socket itself is connected once by useRealtimeSync in MainLayout.
export default function useRealtimeRefresh(modules, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const key = Array.isArray(modules) ? modules.join("|") : String(modules);

  useEffect(() => {
    const wanted = key.split("|");
    const socket = getSocket();
    let timer = null;

    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current && callbackRef.current(), DEBOUNCE_MS);
    };

    const onData = (evt) => {
      if (wanted.includes(evt?.module)) trigger();
    };
    const onNotification = (n) => {
      if (wanted.includes(n?.type)) trigger();
    };
    // After a reconnect, catch up on anything missed.
    const onReconnect = () => trigger();

    socket.on("data:changed", onData);
    socket.on("notification:new", onNotification);
    socket.io.on("reconnect", onReconnect);

    return () => {
      clearTimeout(timer);
      socket.off("data:changed", onData);
      socket.off("notification:new", onNotification);
      socket.io.off("reconnect", onReconnect);
    };
  }, [key]);
}