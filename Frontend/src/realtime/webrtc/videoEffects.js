const BASE = `${import.meta.env.BASE_URL || "/"}mediapipe/selfie_segmentation/`;
const MAX_WIDTH = 960;
const FPS = 24;

let libPromise = null;

const loadLib = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("Not supported here."));
  if (window.SelfieSegmentation) return Promise.resolve(window.SelfieSegmentation);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = `${BASE}selfie_segmentation.js`;
    el.async = true;
    el.onload = () => (window.SelfieSegmentation ? resolve(window.SelfieSegmentation) : reject(new Error("Background effects failed to load.")));
    el.onerror = () => reject(new Error("Background effects failed to load."));
    document.head.appendChild(el);
  }).catch((err) => {
    libPromise = null;
    throw err;
  });
  return libPromise;
};

const safe = (fn) => {
  try {
    fn();
  } catch {
    return;
  }
};

const imageCache = new Map();

export const loadEffectImage = (url) => {
  if (!url) return Promise.resolve(null);
  if (imageCache.has(url)) return imageCache.get(url);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that background image."));
    img.src = url;
  }).catch((err) => {
    imageCache.delete(url);
    throw err;
  });
  imageCache.set(url, p);
  return p;
};

const makeTicker = (fps, fn) => {
  let worker = null;
  let url = null;
  try {
    const src = `let t=null;onmessage=(e)=>{if(e.data==='start'){clearInterval(t);t=setInterval(()=>postMessage(1),${Math.round(1000 / fps)});}else{clearInterval(t);}};`;
    url = URL.createObjectURL(new Blob([src], { type: "application/javascript" }));
    worker = new Worker(url);
    worker.onmessage = fn;
    worker.postMessage("start");
    return () => {
      worker.postMessage("stop");
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    if (url) URL.revokeObjectURL(url);
    const t = setInterval(fn, Math.round(1000 / fps));
    return () => clearInterval(t);
  }
};

const drawCover = (ctx, img, w, h) => {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

export const createEffectProcessor = async (cameraTrack) => {
  const SelfieSegmentation = await loadLib();

  const settings = cameraTrack.getSettings ? cameraTrack.getSettings() : {};
  const srcW = settings.width || 640;
  const srcH = settings.height || 360;
  const scale = srcW > MAX_WIDTH ? MAX_WIDTH / srcW : 1;
  const width = Math.round(srcW * scale);
  const height = Math.round(srcH * scale);

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([cameraTrack]);
  await video.play().catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const small = document.createElement("canvas");
  const sctx = small.getContext("2d");
  const supportsFilter = typeof ctx.filter === "string";

  const seg = new SelfieSegmentation({ locateFile: (f) => `${BASE}${f}` });
  seg.setOptions({ modelSelection: 1, selfieMode: false });

  let config = { effect: "blur", blurIntensity: 50, image: null };
  let busy = false;
  let stopped = false;
  let paused = false;
  let ready = false;

  const drawBlurred = (source) => {
    const strength = Math.max(10, Math.min(100, config.blurIntensity || 50));
    if (supportsFilter) {
      ctx.filter = `blur(${Math.round((strength / 100) * (height / 28) + 2)}px)`;
      ctx.drawImage(source, 0, 0, width, height);
      ctx.filter = "none";
      return;
    }
    const factor = Math.max(4, Math.round(strength / 6));
    small.width = Math.max(8, Math.round(width / factor));
    small.height = Math.max(8, Math.round(height / factor));
    sctx.drawImage(source, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, width, height);
  };

  seg.onResults((results) => {
    if (stopped) return;
    ready = true;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(results.segmentationMask, 0, 0, width, height);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(results.image, 0, 0, width, height);
    ctx.globalCompositeOperation = "destination-over";
    if (config.effect === "image" && config.image) drawCover(ctx, config.image, width, height);
    else drawBlurred(results.image);
    ctx.restore();
  });

  await seg.initialize();

  const pump = async () => {
    if (busy || stopped || paused || video.readyState < 2) return;
    busy = true;
    try {
      await seg.send({ image: video });
    } catch {
      busy = false;
      return;
    }
    busy = false;
  };

  const stopTicker = makeTicker(FPS, pump);

  const stream = canvas.captureStream(FPS);
  const track = stream.getVideoTracks()[0];

  await pump();
  if (!ready) await new Promise((r) => setTimeout(r, 120));

  return {
    track,
    setConfig: (next) => {
      config = { ...config, ...next };
    },
    setPaused: (value) => {
      paused = !!value;
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      stopTicker();
      safe(() => track.stop());
      safe(() => seg.close());
      video.srcObject = null;
    },
  };
};
