// mediasoup SFU for calls / meetings.
//
// Every participant sends ONE audio (+ optional video / screen) stream to the server and the server
// forwards it to everybody else. There is no peer-to-peer link between participants any more, so
// "A cannot hear B" pair failures cannot happen.
//
// Big rooms: nobody can play 1000 audio streams at once, so for rooms bigger than SFU_ALL_BELOW
// people each listener gets the SFU_AUDIO_MAX most recent speakers (and SFU_VIDEO_MAX videos).
// The list follows the loudest people automatically, so whoever talks is heard by everyone.
//
// Scale: a room is spread over several mediasoup workers (CPU cores) and routers. Producers are
// piped between routers lazily, only when somebody on another router needs them.
//
// .env (see SETUP):
//   MEDIASOUP_ANNOUNCED_IP   public IP (or DNS name) of this server          (required in production)
//   MEDIASOUP_PORT           first media port, default 40000 (one port per worker, UDP + TCP)
//   MEDIASOUP_WORKERS        number of workers, default = CPU cores (max 8)
//   MEDIASOUP_LISTEN_IP      default 0.0.0.0
//   SFU_PEERS_PER_ROUTER     default 150
//   SFU_ALL_BELOW            default 24   (rooms up to this size: everybody hears / sees everybody)
//   SFU_AUDIO_MAX            default 16   (big rooms: audio streams per listener)
//   SFU_VIDEO_MAX            default 9    (big rooms: videos per viewer, 0 = audio only)
const os = require("os");
const mediasoup = require("mediasoup");
const rooms = require("./callRooms");
const { getIO } = require("../../config/socket");

const int = (v, d, min = 1) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= min ? n : d;
};

const CFG = {
  workers: int(process.env.MEDIASOUP_WORKERS, Math.max(1, Math.min(os.cpus().length, 8))),
  port: int(process.env.MEDIASOUP_PORT, 40000),
  listenIp: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
  announced: process.env.MEDIASOUP_ANNOUNCED_IP || "",
  peersPerRouter: int(process.env.SFU_PEERS_PER_ROUTER, 150),
  allBelow: int(process.env.SFU_ALL_BELOW, 24),
  audioMax: int(process.env.SFU_AUDIO_MAX, 16),
  videoMax: int(process.env.SFU_VIDEO_MAX, 9, 0),
};

const MEDIA_CODECS = [
  { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2, parameters: { useinbandfec: 1, usedtx: 1 } },
  { kind: "video", mimeType: "video/VP8", clockRate: 90000, parameters: { "x-google-start-bitrate": 1000 } },
  {
    kind: "video", mimeType: "video/H264", clockRate: 90000,
    parameters: { "packetization-mode": 1, "profile-level-id": "42e01f", "level-asymmetry-allowed": 1, "x-google-start-bitrate": 1000 },
  },
];

const SOURCES = { mic: "audio", cam: "video", screen: "video", screenAudio: "audio" };

const err = (message, statusCode = 400, code) => Object.assign(new Error(message), { statusCode, code });

// ------------------------------------------------------------------ workers

const workers = [];
let workersReady = null;

const ensureWorkers = () => {
  if (workersReady) return workersReady;
  workersReady = (async () => {
    if (!CFG.announced) console.warn("[sfu] MEDIASOUP_ANNOUNCED_IP is not set: only clients on the same network can connect.");
    for (let i = 0; i < CFG.workers; i += 1) {
      const worker = await mediasoup.createWorker({ logLevel: "warn" });
      worker.on("died", () => {
        console.error(`[sfu] worker ${worker.pid} died - exiting so the process manager restarts us`);
        setTimeout(() => process.exit(1), 1500);
      });
      const port = CFG.port + i;
      const base = { ip: CFG.listenIp, port, ...(CFG.announced ? { announcedAddress: CFG.announced } : {}) };
      worker.webRtcServer = await worker.createWebRtcServer({ listenInfos: [{ protocol: "udp", ...base }, { protocol: "tcp", ...base }] });
      worker.load = 0;
      workers.push(worker);
    }
    console.log(`[sfu] ${workers.length} workers, media ports ${CFG.port}-${CFG.port + workers.length - 1} (UDP+TCP), announced ${CFG.announced || "(none)"}`);
  })().catch((e) => {
    workersReady = null;
    throw e;
  });
  return workersReady;
};

// ------------------------------------------------------------------ rooms

const sfuRooms = new Map(); // roomKey -> sfu room

const getRoom = (roomKey) => {
  let sr = sfuRooms.get(roomKey);
  if (!sr) {
    sr = {
      roomKey, routers: [], peers: new Map(), speakers: [], producerOwner: new Map(), pipes: new Map(),
      q: Promise.resolve(), syncTimer: null, syncing: false, again: false, closed: false, breakoutWas: false,
    };
    sfuRooms.set(roomKey, sr);
  }
  return sr;
};

const serial = (sr, fn) => {
  const p = sr.q.then(fn);
  sr.q = p.catch(() => {});
  return p;
};

const emit = (socketId, event, payload) => {
  try { getIO()?.to(socketId).emit(event, payload); } catch { /* socket gone */ }
};

const createRouterRec = async (sr, worker) => {
  const router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });
  const rec = { idx: sr.routers.length, router, worker, peers: 0, observer: null };
  rec.observer = await router.createAudioLevelObserver({ maxEntries: 8, threshold: -65, interval: 250 });
  rec.observer.on("volumes", (volumes) => onVolumes(sr, volumes));
  sr.routers.push(rec);
  return rec;
};

const leastLoaded = (list, key) => list.reduce((best, x) => (!best || key(x) < key(best) ? x : best), null);

const pickRouter = async (sr) => {
  const least = leastLoaded(sr.routers, (r) => r.peers);
  if (least && least.peers < CFG.peersPerRouter) return least;
  const used = new Set(sr.routers.map((r) => r.worker));
  const free = workers.filter((w) => !used.has(w));
  if (!least || free.length) return createRouterRec(sr, leastLoaded(free.length ? free : workers, (w) => w.load));
  return least;
};

const transportParams = (t) => ({ id: t.id, iceParameters: t.iceParameters, iceCandidates: t.iceCandidates, dtlsParameters: t.dtlsParameters });

const makeTransport = (rec, sending) =>
  rec.router.createWebRtcTransport({
    webRtcServer: rec.worker.webRtcServer,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
  }).then(async (t) => {
    if (sending) await t.setMaxIncomingBitrate(3000000).catch(() => {});
    return t;
  });

// ------------------------------------------------------------------ peers

const closePeer = (sr, peer) => {
  if (peer.closed) return;
  peer.closed = true;
  try { peer.send && peer.send.close(); } catch { /* closed */ }
  try { peer.recv && peer.recv.close(); } catch { /* closed */ }
  for (const id of peer.producers.keys()) sr.producerOwner.delete(id);
  peer.producers.clear();
  peer.bySource.clear();
  peer.consumers.clear();
  peer.byProducer.clear();
  peer.routerRec.peers = Math.max(0, peer.routerRec.peers - 1);
  peer.routerRec.worker.load = Math.max(0, peer.routerRec.worker.load - 1);
  if (sr.peers.get(peer.id) === peer) sr.peers.delete(peer.id);
};

const getPeer = (roomKey, socketId) => {
  const sr = sfuRooms.get(roomKey);
  const peer = sr && sr.peers.get(socketId);
  if (!peer || peer.closed) throw err("Media session not found. Rejoin the call.", 404, "SFU_NO_PEER");
  return { sr, peer };
};

// Step 1 (client): load the device with the router's capabilities and get both transports.
const init = async (roomKey, socketId) => {
  await ensureWorkers();
  const sr = getRoom(roomKey);
  return serial(sr, async () => {
    if (sr.closed) throw err("This call has ended.", 404, "CALL_ENDED");
    const old = sr.peers.get(socketId);
    if (old) closePeer(sr, old);
    const routerRec = await pickRouter(sr);
    const peer = {
      id: socketId, roomKey, routerRec, send: null, recv: null, rtpCapabilities: null, ready: false, closed: false,
      producers: new Map(), bySource: new Map(), consumers: new Map(), byProducer: new Map(),
    };
    peer.send = await makeTransport(routerRec, true);
    peer.recv = await makeTransport(routerRec, false);
    routerRec.peers += 1;
    routerRec.worker.load += 1;
    sr.peers.set(socketId, peer);
    return { rtpCapabilities: routerRec.router.rtpCapabilities, send: transportParams(peer.send), recv: transportParams(peer.recv) };
  });
};

const connectTransport = async (roomKey, socketId, { transportId, dtlsParameters }) => {
  const { peer } = getPeer(roomKey, socketId);
  const t = peer.send && peer.send.id === transportId ? peer.send : peer.recv && peer.recv.id === transportId ? peer.recv : null;
  if (!t) throw err("Unknown transport.", 404);
  await t.connect({ dtlsParameters });
};

// Step 2 (client): transports are ready, start sending me streams.
const ready = async (roomKey, socketId, { rtpCapabilities }) => {
  const { sr, peer } = getPeer(roomKey, socketId);
  if (!rtpCapabilities || typeof rtpCapabilities !== "object") throw err("rtpCapabilities missing.", 400);
  peer.rtpCapabilities = rtpCapabilities;
  peer.ready = true;
  scheduleSync(sr);
};

const closeProducer = (sr, peer, producer) => {
  peer.producers.delete(producer.id);
  if (peer.bySource.get(producer.appData.source) === producer) peer.bySource.delete(producer.appData.source);
  sr.producerOwner.delete(producer.id);
  try { producer.close(); } catch { /* closed */ }
};

const produce = async (roomKey, socketId, { transportId, kind, rtpParameters, appData }) => {
  const { sr, peer } = getPeer(roomKey, socketId);
  if (!peer.send || peer.send.id !== transportId) throw err("Unknown transport.", 404);
  const source = appData && appData.source;
  if (!SOURCES[source] || SOURCES[source] !== kind) throw err("Invalid media source.", 400);

  const old = peer.bySource.get(source);
  if (old) closeProducer(sr, peer, old);

  const producer = await peer.send.produce({ kind, rtpParameters, appData: { source } });
  peer.producers.set(producer.id, producer);
  peer.bySource.set(source, producer);
  sr.producerOwner.set(producer.id, socketId);
  producer.on("transportclose", () => closeProducer(sr, peer, producer));
  if (source === "mic") peer.routerRec.observer.addProducer({ producerId: producer.id }).catch(() => {});
  scheduleSync(sr);
  return { id: producer.id };
};

const closeProducerById = async (roomKey, socketId, { producerId }) => {
  const { sr, peer } = getPeer(roomKey, socketId);
  const producer = peer.producers.get(String(producerId));
  if (producer) closeProducer(sr, peer, producer);
  scheduleSync(sr);
};

const resumeConsumer = async (roomKey, socketId, { consumerId }) => {
  const { peer } = getPeer(roomKey, socketId);
  const rec = peer.consumers.get(String(consumerId));
  if (rec) await rec.consumer.resume();
};

const removePeer = (roomKey, socketId) => {
  const sr = sfuRooms.get(roomKey);
  const peer = sr && sr.peers.get(socketId);
  if (!peer) return;
  closePeer(sr, peer);
  sr.speakers = sr.speakers.filter((id) => id !== socketId);
  scheduleSync(sr);
};

const closeRoom = (roomKey) => {
  const sr = sfuRooms.get(roomKey);
  if (!sr) return;
  sr.closed = true;
  clearTimeout(sr.syncTimer);
  for (const peer of [...sr.peers.values()]) closePeer(sr, peer);
  for (const rec of sr.routers) {
    try { rec.router.close(); } catch { /* closed */ }
  }
  sfuRooms.delete(roomKey);
};

// ------------------------------------------------------------------ who hears / sees whom

const onVolumes = (sr, volumes) => {
  const ids = [];
  for (const v of volumes || []) {
    const id = sr.producerOwner.get(v.producer.id);
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) return;
  sr.speakers = [...ids, ...sr.speakers.filter((id) => !ids.includes(id))].slice(0, 64);
  scheduleSync(sr);
};

const scheduleSync = (sr) => {
  if (sr.closed || sr.syncTimer) return;
  sr.syncTimer = setTimeout(() => {
    sr.syncTimer = null;
    runSync(sr).catch((e) => console.error("[sfu] sync failed:", e.message));
  }, 200);
  if (sr.syncTimer.unref) sr.syncTimer.unref();
};

const runSync = async (sr) => {
  if (sr.closed) return;
  if (sr.syncing) {
    sr.again = true;
    return;
  }
  sr.syncing = true;
  try {
    const rr = rooms.get(sr.roomKey);
    if (!rr) return;
    const peers = [...sr.peers.values()];
    const spoken = sr.speakers.filter((id) => sr.peers.has(id));
    const spokenSet = new Set(spoken);
    const ranked = [...spoken, ...peers.map((p) => p.id).filter((id) => !spokenSet.has(id))];
    const presenters = peers.filter((p) => p.bySource.has("screen") || p.bySource.has("screenAudio")).map((p) => p.id);
    const viewers = peers.filter((p) => p.ready && !p.closed);
    for (let i = 0; i < viewers.length; i += 20) {
      await Promise.all(viewers.slice(i, i + 20).map((v) => syncViewer(sr, rr, v, ranked, presenters).catch((e) => console.error("[sfu] viewer sync:", e.message))));
    }
  } finally {
    sr.syncing = false;
    if (sr.again) {
      sr.again = false;
      scheduleSync(sr);
    }
  }
};

const breakoutActive = (rr) => !!(rr.live && rr.live.breakout && rr.live.breakout.active);

const wantedFor = (sr, rr, viewer, ranked, presenters) => {
  const small = sr.peers.size <= CFG.allBelow;
  const bo = breakoutActive(rr);
  const live = bo ? require("./meetingLive.service") : null;
  const allowed = (id) => id !== viewer.id && sr.peers.has(id) && (!bo || live.canSignal(rr, viewer.id, id));
  const want = new Map(); // producerId -> { owner, source }
  const add = (id, source) => {
    const p = sr.peers.get(id).bySource.get(source);
    if (p) want.set(p.id, { owner: id, source });
  };
  let a = 0;
  let v = 0;
  for (const id of ranked) {
    if (!small && a >= CFG.audioMax && v >= CFG.videoMax) break;
    if (!allowed(id)) continue;
    if (small || a < CFG.audioMax) { add(id, "mic"); a += 1; }
    if (small || v < CFG.videoMax) { add(id, "cam"); v += 1; }
  }
  for (const id of presenters) {
    if (!allowed(id)) continue;
    add(id, "screen");
    add(id, "screenAudio");
  }
  return want;
};

const dropConsumer = (viewer, consumerId) => {
  const rec = viewer.consumers.get(consumerId);
  if (!rec) return;
  viewer.consumers.delete(consumerId);
  viewer.byProducer.delete(rec.producerId);
  try { rec.consumer.close(); } catch { /* closed */ }
  if (!viewer.closed) emit(viewer.id, "sfu:consumer-closed", { roomKey: viewer.roomKey, consumerId });
};

const ensurePiped = (sr, producerId, from, to) => {
  const key = `${producerId}|${to.idx}`;
  if (!sr.pipes.has(key)) {
    const p = from.router.pipeToRouter({ producerId, router: to.router }).catch((e) => {
      sr.pipes.delete(key);
      throw e;
    });
    sr.pipes.set(key, p);
  }
  return sr.pipes.get(key);
};

const spatialFor = (camCount) => (camCount <= 4 ? 2 : camCount <= 9 ? 1 : 0);

const setLayers = (rec, spatial) => {
  if (rec.source !== "cam" || rec.spatial === spatial) return;
  rec.spatial = spatial;
  if (rec.consumer.type === "simulcast" || rec.consumer.type === "svc") rec.consumer.setPreferredLayers({ spatialLayer: spatial, temporalLayer: 2 }).catch(() => {});
};

const addConsumer = async (sr, viewer, producerId, info, spatial) => {
  const owner = sr.peers.get(info.owner);
  if (!owner || owner.closed || !viewer.recv || viewer.closed) return;
  if (owner.routerRec !== viewer.routerRec) await ensurePiped(sr, producerId, owner.routerRec, viewer.routerRec);
  if (!viewer.routerRec.router.canConsume({ producerId, rtpCapabilities: viewer.rtpCapabilities })) return;
  const consumer = await viewer.recv.consume({ producerId, rtpCapabilities: viewer.rtpCapabilities, paused: true });
  if (viewer.closed) {
    consumer.close();
    return;
  }
  const rec = { consumer, producerId, owner: info.owner, source: info.source, spatial: null };
  viewer.consumers.set(consumer.id, rec);
  viewer.byProducer.set(producerId, rec);
  consumer.on("producerclose", () => dropConsumer(viewer, consumer.id));
  consumer.on("transportclose", () => {
    viewer.consumers.delete(consumer.id);
    viewer.byProducer.delete(producerId);
  });
  emit(viewer.id, "sfu:new-consumer", {
    roomKey: viewer.roomKey,
    consumerId: consumer.id,
    producerId,
    peerSocketId: info.owner,
    kind: consumer.kind,
    source: info.source,
    rtpParameters: consumer.rtpParameters,
  });
  setLayers(rec, spatial);
};

const syncViewer = async (sr, rr, viewer, ranked, presenters) => {
  if (viewer.closed || !viewer.recv) return;
  const want = wantedFor(sr, rr, viewer, ranked, presenters);
  for (const [cid, rec] of [...viewer.consumers]) {
    if (!want.has(rec.producerId)) dropConsumer(viewer, cid);
  }
  let cams = 0;
  for (const info of want.values()) if (info.source === "cam") cams += 1;
  const spatial = spatialFor(cams);
  for (const [producerId, info] of want) {
    const have = viewer.byProducer.get(producerId);
    if (have) setLayers(have, spatial);
    else await addConsumer(sr, viewer, producerId, info, spatial).catch((e) => console.warn("[sfu] consume failed:", e.message));
  }
};

// Breakout rooms open / close without any SFU event: re-check them every few seconds.
const breakoutTimer = setInterval(() => {
  for (const sr of sfuRooms.values()) {
    const rr = rooms.get(sr.roomKey);
    const active = !!rr && breakoutActive(rr);
    if (active || sr.breakoutWas) scheduleSync(sr);
    sr.breakoutWas = active;
  }
}, 3000);
if (breakoutTimer.unref) breakoutTimer.unref();

const stats = () => ({
  workers: workers.length,
  rooms: sfuRooms.size,
  peers: [...sfuRooms.values()].reduce((n, r) => n + r.peers.size, 0),
  consumers: [...sfuRooms.values()].reduce((n, r) => n + [...r.peers.values()].reduce((m, p) => m + p.consumers.size, 0), 0),
});

module.exports = { init, connectTransport, ready, produce, closeProducerById, resumeConsumer, removePeer, closeRoom, stats, CFG };
