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