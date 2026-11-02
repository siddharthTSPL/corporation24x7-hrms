import './lib/Tabsession'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async'
import toast, { Toaster, ToastBar } from "react-hot-toast";
import { FaTimes } from "react-icons/fa";
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const key = 'torchx-preload-reload';
  const lastReload = sessionStorage.getItem(key);
  const now = Date.now();

  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem(key, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
        >
          {(t) => (
            <ToastBar
              toast={t}
              style={t.type === "custom" ? { background: "transparent", boxShadow: "none", padding: 0 } : undefined}
            >
              {({ icon, message }) => (
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box", paddingRight: 30 }}>
                  {t.type !== "custom" && icon}
                  <div style={{ flex: 1, minWidth: 0 }}>{message}</div>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    title="Dismiss"
                    onClick={(event) => {
                      event.stopPropagation();
                      toast.dismiss(t.id);
                    }}
                    style={{ position: "absolute", top: 2, right: 2, display: "grid", placeItems: "center", width: 26, height: 26, padding: 0, border: 0, borderRadius: 999, background: "rgba(255,255,255,.88)", color: "#64748b", cursor: "pointer", zIndex: 2 }}
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)
