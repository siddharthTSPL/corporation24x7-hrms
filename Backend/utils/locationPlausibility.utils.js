const { getDistance } = require("geolib");
const { IMPLAUSIBLE_SPEED_KPH } = require("./fieldWorkConstants");

function checkLocationPlausibility({ previous, point }) {
  if (!previous || !point)
    return { isMocked: false, speedKph: null, distanceMeters: null };

  const prevLat = Number(previous.latitude);
  const prevLng = Number(previous.longitude);
  const newLat = Number(point.latitude);
  const newLng = Number(point.longitude);

  if (
    !Number.isFinite(prevLat) ||
    !Number.isFinite(prevLng) ||
    !Number.isFinite(newLat) ||
    !Number.isFinite(newLng)
  )
    return { isMocked: false, speedKph: null, distanceMeters: null };

  const distanceMeters = getDistance(
    { latitude: prevLat, longitude: prevLng },
    { latitude: newLat, longitude: newLng },
  );

  const prevTime = new Date(previous.capturedAt || 0).getTime();
  const newTime = new Date(point.capturedAt || Date.now()).getTime();
  let elapsedSeconds = (newTime - prevTime) / 1000;
  if (elapsedSeconds <= 0) elapsedSeconds = 1;

  const speedKph = (distanceMeters / elapsedSeconds) * 3.6;
  const isMocked = speedKph > IMPLAUSIBLE_SPEED_KPH;

  return {
    isMocked,
    speedKph: Number(speedKph.toFixed(1)),
    distanceMeters,
  };
}

module.exports = { checkLocationPlausibility };
