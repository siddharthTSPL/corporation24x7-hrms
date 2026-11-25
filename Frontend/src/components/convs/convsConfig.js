// Where Convs lives.
//  - Production: same origin as Talent (torchxsuite.com/convs), so the login session is shared.
//  - Local dev (npm run dev): the Convs dev server on port 5174, e.g. http://localhost:5174/convs/
//    ("Open in new tab" and the chat frame both use it; Talent itself has no /convs route).
// Override anything with VITE_CONVS_URL in .env.local.
const RAW =
  import.meta.env.VITE_CONVS_URL ||
  (import.meta.env.DEV ? `http://${window.location.hostname}:5174/convs/` : "/convs/");

const toAbsolute = (u) => new URL(u, window.location.origin);

export const CONVS_URL = toAbsolute(RAW).toString();
export const CONVS_ORIGIN = toAbsolute(RAW).origin;

// ?embed=1 tells Convs to render its compact "frame" layout
// (no left rail, no big header) - see CONVS-EMBED-GUIDE.md.
export const CONVS_EMBED_URL = (() => {
  const u = toAbsolute(RAW);
  u.searchParams.set("embed", "1");
  return u.toString();
})();

export const CONVS_MSG_SOURCE = "torchx-convs";