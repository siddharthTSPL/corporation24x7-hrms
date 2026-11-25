const svg = (from, to, accent) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1080" cy="140" r="220" fill="${accent}" fill-opacity="0.18"/><circle cx="160" cy="620" r="280" fill="${accent}" fill-opacity="0.12"/></svg>`,
  )}`;

const uri = (body) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">${body}</svg>`)}`;

const grad = (id, stops, x2 = 0, y2 = 1) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient></defs>`;

const books = (x, y, w, h, n, palette) => {
  let out = "";
  const bw = w / n;
  for (let i = 0; i < n; i += 1) {
    const bh = h * (0.72 + ((i * 37) % 28) / 100);
    out += `<rect x="${(x + i * bw + 1).toFixed(1)}" y="${(y + h - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${palette[i % palette.length]}"/>`;
  }
  return out;
};

// Illustrated "rooms" in the spirit of Teams / Meet / Zoom virtual backgrounds (no external images needed).
const office = uri(
  `${grad("w", [[0, "#e8eef5"], [1, "#cfd9e6"]])}<rect width="1280" height="720" fill="url(#w)"/>` +
  `<rect x="150" y="90" width="420" height="300" rx="10" fill="#9ccbee"/><rect x="150" y="90" width="420" height="300" rx="10" fill="none" stroke="#f8fafc" stroke-width="14"/><path d="M360 90v300M150 240h420" stroke="#f8fafc" stroke-width="8"/>` +
  `<circle cx="470" cy="160" r="30" fill="#fff6c8"/>` +
  `<rect x="700" y="120" width="440" height="14" rx="4" fill="#8b6b4a"/>${books(720, 40, 190, 80, 9, ["#b45309", "#1d4ed8", "#047857", "#9f1239", "#6d28d9"])}<rect x="940" y="70" width="60" height="50" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-width="3"/>` +
  `<rect x="700" y="300" width="440" height="14" rx="4" fill="#8b6b4a"/>${books(730, 220, 250, 80, 12, ["#0f766e", "#be123c", "#1e40af", "#a16207", "#7c3aed"])}` +
  `<rect x="0" y="600" width="1280" height="120" fill="#b9a083"/><rect x="0" y="600" width="1280" height="12" fill="#a38b6d"/>` +
  `<rect x="60" y="470" width="110" height="130" rx="10" fill="#c2692c"/><path d="M115 470c-60-90-30-130 0-170 30 40 60 80 0 170z" fill="#2f9e5b"/><path d="M115 470c60-70 70-110 20-150-10 50-40 90-20 150z" fill="#3fbf72"/>`
);

const livingRoom = uri(
  `${grad("w", [[0, "#f4efe8"], [1, "#e2d6c6"]])}<rect width="1280" height="720" fill="url(#w)"/>` +
  `<rect x="440" y="90" width="260" height="170" rx="6" fill="#fff" stroke="#c9b8a0" stroke-width="10"/><path d="M450 245l70-80 60 55 40-40 70 65z" fill="#7fb7a4"/><circle cx="640" cy="140" r="20" fill="#f6c453"/>` +
  `<rect x="760" y="110" width="150" height="120" rx="6" fill="#fff" stroke="#c9b8a0" stroke-width="10"/><rect x="780" y="130" width="110" height="80" fill="#e9a389"/>` +
  `<rect x="0" y="560" width="1280" height="160" fill="#b89b78"/>` +
  `<rect x="330" y="400" width="640" height="190" rx="30" fill="#5b7a86"/><rect x="300" y="430" width="90" height="160" rx="26" fill="#4b6874"/><rect x="910" y="430" width="90" height="160" rx="26" fill="#4b6874"/><rect x="380" y="380" width="520" height="90" rx="26" fill="#6e8f9b"/>` +
  `<rect x="1090" y="250" width="12" height="320" fill="#4b3b2c"/><path d="M1040 250h112l-22-80h-68z" fill="#f6dd9b"/><rect x="1060" y="560" width="72" height="14" rx="6" fill="#4b3b2c"/>` +
  `<rect x="150" y="440" width="90" height="120" rx="8" fill="#c2692c"/><path d="M195 440c-50-70-30-110 0-150 30 40 50 80 0 150z" fill="#2f9e5b"/>`
);

const library = uri(
  `${grad("w", [[0, "#2a1d15"], [1, "#4a3426"]])}<rect width="1280" height="720" fill="url(#w)"/>` +
  [60, 250, 440, 630, 820, 1010].map((x) => `<rect x="${x}" y="40" width="180" height="620" rx="6" fill="#3a281c" stroke="#1f1510" stroke-width="4"/>`).join("") +
  [0, 1, 2, 3, 4].map((r) => [60, 250, 440, 630, 820, 1010].map((x, c) => books(x + 8, 52 + r * 122, 164, 110, 8, ["#9f1239", "#1e3a8a", "#065f46", "#92400e", "#6b21a8", "#115e59"].slice(c % 3, (c % 3) + 4))).join("")).join("") +
  `<rect x="0" y="650" width="1280" height="70" fill="#1c130d"/>`
);

const cafe = uri(
  `${grad("w", [[0, "#f6e7d3"], [1, "#e0c4a0"]])}<rect width="1280" height="720" fill="url(#w)"/>` +
  `<rect x="0" y="0" width="1280" height="90" fill="#6b4226"/>` +
  [180, 420, 660, 900, 1120].map((x) => `<line x1="${x}" y1="90" x2="${x}" y2="190" stroke="#3b2a1a" stroke-width="4"/><path d="M${x - 40} 190h80l-16-44h-48z" fill="#f3b84b"/><ellipse cx="${x}" cy="196" rx="40" ry="8" fill="#ffe29a" fill-opacity=".7"/>`).join("") +
  `<rect x="90" y="270" width="320" height="230" rx="8" fill="#fdf8ef" stroke="#6b4226" stroke-width="10"/><path d="M130 470v-130M210 470v-100M290 470v-150M370 470v-90" stroke="#a16a3c" stroke-width="22" stroke-linecap="round"/>` +
  `<rect x="520" y="300" width="670" height="30" fill="#6b4226"/><rect x="520" y="330" width="670" height="300" fill="#8a5a33"/><rect x="560" y="236" width="70" height="64" rx="8" fill="#fff"/><rect x="700" y="244" width="90" height="56" rx="8" fill="#d9d4cc"/>` +
  `<rect x="0" y="630" width="1280" height="90" fill="#4a2f1c"/>`
);

const beach = uri(
  `${grad("sky", [[0, "#74c0fc"], [0.7, "#ffe8b0"], [1, "#ffd59a"]])}<rect width="1280" height="720" fill="url(#sky)"/>` +
  `<circle cx="960" cy="250" r="80" fill="#fff3b0"/><circle cx="960" cy="250" r="120" fill="#fff3b0" fill-opacity=".25"/>` +
  `<rect y="360" width="1280" height="210" fill="#2f9fc7"/><path d="M0 420q80-26 160 0t160 0 160 0 160 0 160 0 160 0 160 0 160 0v40H0z" fill="#58b8dc"/>` +
  `<path d="M0 520q120-40 240 0t240 0 240 0 240 0 240 0 160 0v80H0z" fill="#e8f7ff" fill-opacity=".7"/>` +
  `<path d="M0 560q320-60 640-20t640-30v210H0z" fill="#f2d49b"/>` +
  `<path d="M190 720c10-160 20-260 -10-380" stroke="#7a5230" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M180 340c-70-40-130-20-170 30 70-20 120-10 170-30zM180 340c60-60 130-60 190-20-70-10-130 0-190 20zM180 340c-20-70-10-120 40-150-20 60-20 100-40 150z" fill="#2f9e5b"/>`
);

const city = uri(
  `${grad("sky", [[0, "#0b1030"], [1, "#6b3a7a"]])}<rect width="1280" height="720" fill="url(#sky)"/>` +
  [[80, 380], [190, 300], [300, 420], [420, 260], [540, 350], [650, 200], [770, 330], [880, 270], [1000, 400], [1110, 310]]
    .map(([x, y], i) => `<rect x="${x}" y="${y}" width="105" height="${720 - y}" fill="${i % 2 ? "#161a3f" : "#1d2150"}"/>` +
      Array.from({ length: 14 }, (_, k) => `<rect x="${x + 14 + (k % 3) * 28}" y="${y + 20 + Math.floor(k / 3) * 34}" width="14" height="18" fill="${(k * 7 + i) % 4 ? "#ffd166" : "#273063"}"/>`).join("")).join("") +
  Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 137) % 1280}" cy="${(i * 71) % 220}" r="${1 + (i % 3) * 0.6}" fill="#fff" fill-opacity=".8"/>`).join("") +
  `<circle cx="1120" cy="110" r="42" fill="#fdf2c4"/>`
);

const mountains = uri(
  `${grad("sky", [[0, "#7cc4f5"], [1, "#e9f6ff"]])}<rect width="1280" height="720" fill="url(#sky)"/>` +
  `<circle cx="1010" cy="170" r="60" fill="#fff6c2"/>` +
  `<path d="M0 520L240 250l130 170 150-230 220 330 160-190 190 260 190-120v330H0z" fill="#8aa7c7"/>` +
  `<path d="M240 250l55 72-35-14-25 28-30-24zM520 190l62 84-40-12-22 30-38-26zM1010 330l40 70-28-8-18 22-22-18z" fill="#fff"/>` +
  `<path d="M0 600L200 450l180 120 180-100 200 130 200-110 320 140v90H0z" fill="#4f7c5a"/>` +
  `<path d="M0 680l260-60 280 40 260-50 480 60v50H0z" fill="#2f5d3d"/>`
);

const space = uri(
  `<defs><radialGradient id="s" cx=".7" cy=".3" r="1"><stop offset="0" stop-color="#2b1b5a"/><stop offset=".6" stop-color="#0c0a24"/><stop offset="1" stop-color="#05040f"/></radialGradient></defs><rect width="1280" height="720" fill="url(#s)"/>` +
  Array.from({ length: 90 }, (_, i) => `<circle cx="${(i * 173) % 1280}" cy="${(i * 97) % 720}" r="${0.8 + (i % 4) * 0.5}" fill="#fff" fill-opacity="${0.45 + (i % 5) * 0.1}"/>`).join("") +
  `<circle cx="300" cy="520" r="170" fill="#c2410c"/><circle cx="260" cy="480" r="150" fill="#ea580c"/><ellipse cx="300" cy="520" rx="260" ry="36" fill="none" stroke="#fdba74" stroke-width="8" stroke-opacity=".7" transform="rotate(-14 300 520)"/>` +
  `<circle cx="1040" cy="170" r="70" fill="#7dd3fc"/><circle cx="1015" cy="150" r="60" fill="#38bdf8"/>`
);

const gradient = (from, to, accent) =>
  uri(`${grad("g", [[0, from], [1, to]], 1, 1)}<rect width="1280" height="720" fill="url(#g)"/><circle cx="1080" cy="140" r="220" fill="${accent}" fill-opacity="0.18"/><circle cx="160" cy="620" r="280" fill="${accent}" fill-opacity="0.12"/>`);

export const PRESET_GROUPS = [
  {
    title: "Office & home",
    items: [
      { id: "preset-office", name: "Office", url: office },
      { id: "preset-living", name: "Living room", url: livingRoom },
      { id: "preset-library", name: "Library", url: library },
      { id: "preset-cafe", name: "Café", url: cafe },
    ],
  },
  {
    title: "Places",
    items: [
      { id: "preset-beach", name: "Beach", url: beach },
      { id: "preset-city", name: "City night", url: city },
      { id: "preset-mountains", name: "Mountains", url: mountains },
      { id: "preset-space", name: "Space", url: space },
    ],
  },
  {
    title: "Colours",
    items: [
      { id: "preset-brand", name: "TorchX", url: gradient("#3b0022", "#cd166e", "#ffffff") },
      { id: "preset-ocean", name: "Ocean", url: gradient("#0f2027", "#2c7a9b", "#a5f3fc") },
      { id: "preset-forest", name: "Forest", url: gradient("#0b3d2e", "#3f9c6b", "#d9f99d") },
      { id: "preset-sunset", name: "Sunset", url: gradient("#7c2d12", "#f59e0b", "#fde68a") },
      { id: "preset-night", name: "Night", url: gradient("#0f172a", "#4338ca", "#c7d2fe") },
      { id: "preset-slate", name: "Slate", url: gradient("#1f2937", "#6b7280", "#e5e7eb") },
      { id: "preset-rose", name: "Rose", url: gradient("#4c0519", "#f43f5e", "#fecdd3") },
      { id: "preset-mint", name: "Mint", url: gradient("#134e4a", "#5eead4", "#ccfbf1") },
    ],
  },
];

export const PRESET_BACKGROUNDS = PRESET_GROUPS.flatMap((g) => g.items);

// Blur choices shown as one-tap options (the slider still fine-tunes them)
export const BLUR_LEVELS = [
  { id: "slight", label: "Slight blur", value: 30 },
  { id: "blur", label: "Blur", value: 60 },
  { id: "strong", label: "Strong blur", value: 100 },
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
