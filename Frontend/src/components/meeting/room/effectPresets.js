const svg = (from, to, accent) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1080" cy="140" r="220" fill="${accent}" fill-opacity="0.18"/><circle cx="160" cy="620" r="280" fill="${accent}" fill-opacity="0.12"/></svg>`,
  )}`;

export const PRESET_BACKGROUNDS = [
  { id: "preset-brand", name: "TorchX", url: svg("#3b0022", "#cd166e", "#ffffff") },
  { id: "preset-ocean", name: "Ocean", url: svg("#0f2027", "#2c7a9b", "#a5f3fc") },
  { id: "preset-forest", name: "Forest", url: svg("#0b3d2e", "#3f9c6b", "#d9f99d") },
  { id: "preset-sunset", name: "Sunset", url: svg("#7c2d12", "#f59e0b", "#fde68a") },
  { id: "preset-night", name: "Night", url: svg("#0f172a", "#4338ca", "#c7d2fe") },
  { id: "preset-slate", name: "Slate", url: svg("#1f2937", "#6b7280", "#e5e7eb") },
  { id: "preset-rose", name: "Rose", url: svg("#4c0519", "#f43f5e", "#fecdd3") },
  { id: "preset-mint", name: "Mint", url: svg("#134e4a", "#5eead4", "#ccfbf1") },
];

export const EFFECT_STORAGE_KEY = "torchx_meeting_effect";

export const readSavedEffect = () => {
  try {
    const d = JSON.parse(localStorage.getItem(EFFECT_STORAGE_KEY) || "null");
    return d && ["blur", "image", "none"].includes(d.effect) ? d : null;
  } catch {
    return null;
  }
};

export const writeSavedEffect = (cfg) => {
  try {
    localStorage.setItem(EFFECT_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    return;
  }
};
