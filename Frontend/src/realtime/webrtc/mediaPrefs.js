// Device + audio-processing choices (pre-join screen and in-meeting device switch).
// Kept in localStorage so the next meeting starts with the same mic / camera / noise settings.
const KEY = "torchx_media_prefs";

const DEFAULTS = {
  audioDeviceId: "",
  videoDeviceId: "",
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

export const getMediaPrefs = () => {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "null") || {}) };
  } catch {
    return { ...DEFAULTS };
  }
};

export const setMediaPrefs = (patch) => {
  const next = { ...getMediaPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode - the choice only lasts for this page */
  }
  return next;
};

// `exact` = true when the user explicitly picked a device (fail loudly instead of silently using another one).
export const audioConstraints = (override = {}) => {
  const p = { ...getMediaPrefs(), ...override };
  return {
    echoCancellation: p.echoCancellation,
    noiseSuppression: p.noiseSuppression,
    autoGainControl: p.autoGainControl,
    ...(p.audioDeviceId ? { deviceId: { ideal: p.audioDeviceId } } : {}),
  };
};

export const videoConstraints = (override = {}) => {
  const p = { ...getMediaPrefs(), ...override };
  return {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    ...(p.videoDeviceId ? { deviceId: { ideal: p.videoDeviceId } } : {}),
  };
};
