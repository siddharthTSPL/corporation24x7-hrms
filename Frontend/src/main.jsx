import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from "react-hot-toast";
import './index.css'
import App from './App.jsx'


const queryClient = new QueryClient();

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
  />

        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)