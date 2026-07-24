// Talks to the TorchX Attendance desktop agent via its custom protocol
// (torchx-agent://) instead of a localhost HTTP server. Uses a hidden
// iframe so that on machines without the agent installed, nothing
// visible happens (no navigation error, no blank page).
const callAgent = (url) => {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  } catch (_) {}
};

export const setAgentToken = (token) => {
  if (!token) return;
  callAgent(`torchx-agent://set-token?token=${encodeURIComponent(token)}`);
};

export const clearAgentToken = () => {
  callAgent("torchx-agent://clear-token");
};