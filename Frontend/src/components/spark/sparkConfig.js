// Where Spark lives. Same domain in production (torchxsuite.com/spark), so the
// login cookie / tab session is shared with Talent.
// For local dev set VITE_SPARK_URL=http://localhost:5174/spark in .env.local
const RAW = import.meta.env.VITE_SPARK_URL || "/spark";

const toAbsolute = (u) => new URL(u, window.location.origin);

export const SPARK_URL = toAbsolute(RAW).toString();
export const SPARK_ORIGIN = toAbsolute(RAW).origin;

// ?embed=1 tells Spark to render its compact "frame" layout
// (no left rail, no big header) - see SPARK-EMBED-GUIDE.md.
export const SPARK_EMBED_URL = (() => {
  const u = toAbsolute(RAW);
  u.searchParams.set("embed", "1");
  return u.toString();
})();

export const SPARK_MSG_SOURCE = "torchx-spark";
