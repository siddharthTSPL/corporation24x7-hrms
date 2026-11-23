// Where Convs lives. Same domain in production (torchxsuite.com/convs), so the
// login cookie / tab session is shared with Talent.
// For local dev set VITE_CONVS_URL=http://localhost:5174/convs in .env.local
const RAW = import.meta.env.VITE_CONVS_URL || "/convs";

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
