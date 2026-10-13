const geoip = require("geoip-lite");
const { getDistance } = require("geolib");
const LOGIN_IMPLAUSIBLE_SPEED_KPH = 900;

function getIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }
  return req.ip || "";
}

function locateIp(ip) {
  try {
    if (!ip) return null;
    const lookup = geoip.lookup(ip);
    if (!lookup) return null;
    return {
      latitude: Number.isFinite(lookup.ll?.[0]) ? lookup.ll[0] : null,
      longitude: Number.isFinite(lookup.ll?.[1]) ? lookup.ll[1] : null,
      city: lookup.city || null,
      country: lookup.country || null,
      at: new Date(),
    };
  } catch {
    return null;
  }
}

function checkImpossibleTravel(previousGeo, currentGeo) {
  if (!previousGeo || !currentGeo)
    return { isMocked: false, speedKph: null, distanceMeters: null };
  if (
    !Number.isFinite(previousGeo.latitude) ||
    !Number.isFinite(previousGeo.longitude) ||
    !Number.isFinite(currentGeo.latitude) ||
    !Number.isFinite(currentGeo.longitude)
  )
    return { isMocked: false, speedKph: null, distanceMeters: null };
  const prevAt = new Date(previousGeo.at).getTime();
  const currAt = new Date(currentGeo.at).getTime();
  if (!Number.isFinite(prevAt) || !Number.isFinite(currAt) || currAt <= prevAt)
    return { isMocked: false, speedKph: null, distanceMeters: null };
  const distanceMeters = getDistance(
    { latitude: previousGeo.latitude, longitude: previousGeo.longitude },
    { latitude: currentGeo.latitude, longitude: currentGeo.longitude },
  );
  const elapsedSeconds = (currAt - prevAt) / 1000;
  const speedKph = (distanceMeters / elapsedSeconds) * 3.6;
  const isMocked = speedKph > LOGIN_IMPLAUSIBLE_SPEED_KPH;
  return {
    isMocked,
    speedKph: Number(speedKph.toFixed(1)),
    distanceMeters,
  };
}

module.exports = { getIp, locateIp, checkImpossibleTravel };
