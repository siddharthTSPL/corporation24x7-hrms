// Raw GPS pings are sparse (a ping every N metres/seconds), so joining them
// with straight lines cuts diagonally across blocks and buildings whenever
// two consecutive points are far apart. OSRM's Map Matching API snaps a
// sequence of noisy GPS points onto the actual road network, so the drawn
// trail follows the street the employee walked/drove instead of a straight
// line "through" it.
//
// Uses the public OSRM demo server by default. That server is rate-limited
// and meant for light/non-commercial use — for real production traffic,
// self-host OSRM (or point VITE_OSRM_MATCH_URL at a paid map-matching
// service) instead of relying on the demo endpoint indefinitely.
const OSRM_MATCH_BASE_URL =
  import.meta.env.VITE_OSRM_MATCH_URL ||
  "https://router.project-osrm.org/match/v1/driving";

// The public OSRM server rejects requests with too many coordinates in one
// call, so long segments are split into overlapping chunks (the 1-point
// overlap keeps the joined result continuous instead of leaving a gap).
const MAX_POINTS_PER_REQUEST = 95;
// How far (metres) a raw point may sit from the matched road before OSRM
// gives up matching it. GPS noise in dense areas is commonly 20-60m.
const DEFAULT_RADIUS_METERS = 50;
// Be polite to the shared public server: space sequential requests out
// instead of firing them all at once.
const REQUEST_GAP_MS = 350;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function matchChunk(chunk, signal) {
  const coordinates = chunk.map(([lat, lon]) => `${lon},${lat}`).join(";");
  const radiuses = chunk.map(() => DEFAULT_RADIUS_METERS).join(";");
  const url = `${OSRM_MATCH_BASE_URL}/${coordinates}?geometries=geojson&overview=full&radiuses=${radiuses}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`OSRM match request failed (${response.status})`);
  const data = await response.json();
  if (data.code !== "Ok" || !data.matchings?.length)
    throw new Error("No confident road match for this stretch");
  return data.matchings.flatMap((matching) =>
    matching.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
  );
}

// Snaps one continuous trail (array of [lat, lon]) to roads. Falls back to
// the original straight-line points for any chunk OSRM can't match (e.g. no
// nearby road data, or the demo server is rate-limiting us) so the map
// never ends up with a gap. Returns { coords, dashed } — `dashed: true`
// means part (or all) of this stretch is the raw straight-line fallback,
// not an actual road match, so the caller can render it visibly different
// (dashed/grey) instead of a solid line that looks just as confident as a
// real snapped road — which is what made a failed match look like the
// drawn path was cutting through buildings on purpose.
export async function snapSegmentToRoads(segment, signal) {
  if (segment.length < 2) return { coords: segment, dashed: false };
  const chunks = [];
  for (let i = 0; i < segment.length; i += MAX_POINTS_PER_REQUEST - 1) {
    chunks.push(segment.slice(i, i + MAX_POINTS_PER_REQUEST));
    if (i + MAX_POINTS_PER_REQUEST >= segment.length) break;
  }
  const snappedChunks = [];
  let anyFallback = false;
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(REQUEST_GAP_MS);
    try {
      snappedChunks.push(await matchChunk(chunks[i], signal));
    } catch (error) {
      if (error.name === "AbortError") throw error;
      anyFallback = true;
      snappedChunks.push(chunks[i]);
    }
  }
  return { coords: snappedChunks.flat(), dashed: anyFallback };
}

// Snaps every segment (the trail is already split into segments wherever
// there's a cross-session gap) and returns them in the same shape the map
// expects: an array of { coords, dashed } polylines.
export async function snapPathToRoads(segments, signal) {
  const results = [];
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) await sleep(REQUEST_GAP_MS);
    results.push(await snapSegmentToRoads(segments[i], signal));
  }
  return results;
}

// ── Incremental / live variant ──────────────────────────────────────────
// A live duty trail grows by a few points every ~15s. Re-running
// snapPathToRoads on the WHOLE day's path on every one of those refreshes
// re-sends every earlier, already-correct stretch back to the shared OSRM
// demo server — which is rate-limited for light use. In practice that means
// the demo server starts rejecting requests within a few minutes of a duty
// session running, and every stretch silently falls back to the dashed
// straight-line rendering — which looks exactly like "road snapping isn't
// working" even though the code path is fine.
//
// Fix: a segment is chunked the same way as above (fixed MAX_POINTS_PER_REQUEST
// windows with a 1-point overlap), and because new pings only ever get
// appended to the END of the current segment, every chunk except the last
// one in a segment is permanently finished the moment it reaches full size —
// it will never need to be matched again. Only the last (still-filling)
// chunk of each segment is ever re-sent, so a session running for hours
// costs the same handful of requests per poll as one running for minutes,
// not a request per point ever recorded.
//
// createRoadSnapCache() returns an opaque cache object the caller holds
// (e.g. in a useRef) across polls and passes into snapPathToRoadsCached.
// Pass a *new* cache whenever the underlying route changes identity (a
// different employee or a different day) — reusing one across routes would
// let one person's matched roads leak into another's.
const RETRY_COOLDOWN_MS = 60000;

export function createRoadSnapCache() {
  return { segments: [] };
}

async function resolveChunk(chunk, cached, signal) {
  const lenUnchanged = Boolean(cached) && cached.len === chunk.length;
  if (lenUnchanged && cached.result && !cached.dashed) {
    // Already confidently matched and nothing new appended — settled for good.
    return cached;
  }
  if (
    lenUnchanged &&
    cached.dashed &&
    cached.failedAt &&
    Date.now() - cached.failedAt < RETRY_COOLDOWN_MS
  ) {
    // Failed recently (most likely the shared demo server rate-limiting us)
    // and nothing new to try with — don't hammer it again immediately.
    return cached;
  }
  try {
    const coords = await matchChunk(chunk, signal);
    return { len: chunk.length, result: coords, dashed: false };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return { len: chunk.length, result: chunk, dashed: true, failedAt: Date.now() };
  }
}

async function snapSegmentToRoadsCached(segment, cacheSegment, signal) {
  if (segment.length < 2) return { coords: segment, dashed: false };
  const chunks = [];
  for (let i = 0; i < segment.length; i += MAX_POINTS_PER_REQUEST - 1) {
    chunks.push(segment.slice(i, i + MAX_POINTS_PER_REQUEST));
    if (i + MAX_POINTS_PER_REQUEST >= segment.length) break;
  }
  const resolved = [];
  let anyFallback = false;
  for (let c = 0; c < chunks.length; c++) {
    const isLastChunk = c === chunks.length - 1;
    const cached = cacheSegment.chunks[c];
    if (!isLastChunk && cached && cached.len === chunks[c].length && !cached.dashed) {
      resolved.push(cached);
      continue;
    }
    if (c > 0) await sleep(REQUEST_GAP_MS);
    const result = await resolveChunk(chunks[c], cached, signal);
    cacheSegment.chunks[c] = result;
    resolved.push(result);
    if (result.dashed) anyFallback = true;
  }
  // A segment can't shrink (pings are only ever appended), but trim any
  // stale trailing cache entries just in case a re-render passes fewer
  // chunks than before.
  cacheSegment.chunks.length = chunks.length;
  return { coords: resolved.flatMap((r) => r.result), dashed: anyFallback };
}

export async function snapPathToRoadsCached(segments, cache, signal) {
  const results = [];
  for (let i = 0; i < segments.length; i++) {
    cache.segments[i] = cache.segments[i] || { chunks: [] };
    if (i > 0) await sleep(REQUEST_GAP_MS);
    results.push(
      await snapSegmentToRoadsCached(segments[i], cache.segments[i], signal),
    );
  }
  cache.segments.length = segments.length;
  return results;
}