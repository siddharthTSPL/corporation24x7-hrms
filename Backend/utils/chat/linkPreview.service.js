// Link preview cards (title / description / image) for URLs people paste in chat.
//
// The server fetches a URL that a USER typed, so this is an SSRF risk. Defences:
//   * http/https only, default ports only (80 / 443), no credentials in the URL
//   * the address is checked AT CONNECT TIME (custom DNS lookup), so DNS rebinding and
//     hostnames that resolve to private ranges (localhost, 10.x, 169.254.169.254 ...) are refused
//   * redirects are followed manually (max 3) and every hop goes through the same checks
//   * 5 s overall timeout, 512 KB body cap, HTML (or a direct image) only
//   * nothing from the page is ever executed; we only read <meta>/<title> text
// Only built-in modules are used.
const dns = require("dns");
const net = require("net");
const http = require("http");
const https = require("https");

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const OK_TTL = 6 * 60 * 60 * 1000;
const MISS_TTL = 10 * 60 * 1000;
const CACHE_MAX = 500;

// ---------- address filtering ----------

const blocked = new net.BlockList();
[
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
].forEach(([a, p]) => blocked.addSubnet(a, p, "ipv4"));
[
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32], ["64:ff9b::", 96], ["100::", 64],
].forEach(([a, p]) => blocked.addSubnet(a, p, "ipv6"));

const isBlockedIp = (ip) => {
  let addr = String(ip || "").trim();
  if (addr.startsWith("[") && addr.endsWith("]")) addr = addr.slice(1, -1);
  const family = net.isIP(addr);
  if (!family) return true; // not an IP at all -> refuse
  if (family === 6) {
    // IPv4-mapped (::ffff:a.b.c.d or ::ffff:7f00:1) -> judge the embedded IPv4 address
    const lower = addr.toLowerCase();
    const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isBlockedIp(dotted[1]);
    const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isBlockedIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
  }
  return blocked.check(addr, family === 4 ? "ipv4" : "ipv6");
};

// Used as the socket's DNS lookup: resolve, then refuse if ANY answer is a private address.
const safeLookup = (hostname, options, cb) => {
  const opts = options && typeof options === "object" ? options : { family: options || 0 };
  dns.lookup(hostname, { ...opts, all: true }, (err, addrs) => {
    if (err) return cb(err);
    const list = Array.isArray(addrs) ? addrs : [];
    if (!list.length || list.some((a) => isBlockedIp(a.address))) {
      return cb(Object.assign(new Error("Address not allowed"), { code: "EBLOCKED" }));
    }
    if (opts.all) return cb(null, list);
    return cb(null, list[0].address, list[0].family);
  });
};

// Throws on anything that is not a plain public http(s) URL.
const assertPublicUrl = (value) => {
  let u;
  try { u = new URL(String(value)); } catch { throw Object.assign(new Error("Invalid URL"), { code: "EBADURL" }); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw Object.assign(new Error("Only http(s) links are supported"), { code: "EBADURL" });
  if (u.username || u.password) throw Object.assign(new Error("Links with credentials are not supported"), { code: "EBADURL" });
  const defaultPort = u.protocol === "https:" ? "443" : "80";
  if (u.port && u.port !== defaultPort) throw Object.assign(new Error("Port not allowed"), { code: "EBLOCKED" });
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedIp(host)) throw Object.assign(new Error("Address not allowed"), { code: "EBLOCKED" });
  if (!net.isIP(host) && (!host.includes(".") || /\.(local|internal|localhost|lan|intranet)$/i.test(host))) {
    throw Object.assign(new Error("Address not allowed"), { code: "EBLOCKED" });
  }
  return u;
};

// ---------- html parsing ----------

const ENTITY = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decodeEntities = (s) =>
  String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ""; } })
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return ""; } })
    .replace(/&([a-z]+);/gi, (m, n) => (ENTITY[n.toLowerCase()] !== undefined ? ENTITY[n.toLowerCase()] : m));

const clean = (s, max) => decodeEntities(s).replace(/\s+/g, " ").trim().slice(0, max);

const parseAttrs = (tag) => {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
  }
  return attrs;
};

const absolute = (value, base) => {
  if (!value) return "";
  try {
    const u = new URL(decodeEntities(value).trim(), base);
    return /^https?:$/.test(u.protocol) ? u.href.slice(0, 1000) : "";
  } catch { return ""; }
};

const parseHtml = (html, finalUrl) => {
  const head = String(html || "").slice(0, MAX_BYTES);
  const meta = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = parseAttrs(m[0]);
    const key = (a.property || a.name || "").toLowerCase();
    if (key && a.content !== undefined && meta[key] === undefined) meta[key] = a.content;
  }
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const host = new URL(finalUrl).hostname.replace(/^www\./, "");
  const title = clean(meta["og:title"] || meta["twitter:title"] || (titleTag && titleTag[1]) || "", 150);
  const description = clean(meta["og:description"] || meta["twitter:description"] || meta.description || "", 300);
  const image = absolute(meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] || meta["twitter:image:src"], finalUrl);
  const siteName = clean(meta["og:site_name"] || host, 60);
  if (!title && !description && !image) return null;
  return { url: finalUrl, title: title || host, description, image, siteName };
};

// ---------- fetching ----------

const fetchOnce = (urlStr) =>
  new Promise((resolve, reject) => {
    const u = assertPublicUrl(urlStr);
    const lib = u.protocol === "https:" ? https : http;
    let done = false;
    const finish = (fn, val) => { if (!done) { done = true; clearTimeout(timer); fn(val); } };
    const req = lib.request(
      u,
      {
        method: "GET",
        lookup: safeLookup,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HRMSLinkPreview/1.0)",
          Accept: "text/html,application/xhtml+xml,image/*;q=0.5",
          "Accept-Language": "en",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return finish(resolve, { redirect: new URL(res.headers.location, u).href });
        }
        if (status >= 400) { res.resume(); return finish(reject, Object.assign(new Error(`HTTP ${status}`), { code: "EHTTP" })); }
        const type = String(res.headers["content-type"] || "").toLowerCase();
        if (type.startsWith("image/")) { res.resume(); return finish(resolve, { image: u.href }); }
        if (!/text\/html|application\/xhtml/.test(type)) { res.resume(); return finish(reject, Object.assign(new Error("Not a web page"), { code: "ETYPE" })); }

        const charset = (type.match(/charset=([\w-]+)/) || [])[1] || "utf-8";
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          size += c.length;
          chunks.push(c);
          // title + meta tags live in <head>; stop reading as soon as we have enough
          if (size >= MAX_BYTES) { res.destroy(); }
        });
        const end = () => {
          let html;
          try { html = new TextDecoder(charset).decode(Buffer.concat(chunks)); } catch { html = Buffer.concat(chunks).toString("utf8"); }
          finish(resolve, { html, url: u.href });
        };
        res.on("end", end);
        res.on("close", end);
        res.on("error", (err) => finish(reject, err));
      }
    );
    const timer = setTimeout(() => { req.destroy(); finish(reject, Object.assign(new Error("Timed out"), { code: "ETIMEDOUT" })); }, TIMEOUT_MS);
    req.on("error", (err) => finish(reject, err));
    req.end();
  });

const fetchPreview = async (startUrl) => {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const r = await fetchOnce(url);
    if (r.redirect) { url = r.redirect; continue; }
    if (r.image) return { url: r.image, title: new URL(r.image).pathname.split("/").pop() || "Image", description: "", image: r.image, siteName: new URL(r.image).hostname.replace(/^www\./, "") };
    const parsed = parseHtml(r.html, r.url);
    return parsed ? { ...parsed, url: startUrl } : null;
  }
  throw Object.assign(new Error("Too many redirects"), { code: "EREDIRECT" });
};

// ---------- tiny TTL cache (+ de-dupe of concurrent requests) ----------

const cache = new Map(); // url -> { at, ttl, value }
const inflight = new Map();

const getPreview = async (url) => {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  if (inflight.has(url)) return inflight.get(url);

  const p = fetchPreview(url)
    .then((value) => ({ value, ttl: value ? OK_TTL : MISS_TTL }))
    .catch(() => ({ value: null, ttl: MISS_TTL }))
    .then(({ value, ttl }) => {
      cache.set(url, { at: Date.now(), ttl, value });
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
      inflight.delete(url);
      return value;
    });
  inflight.set(url, p);
  return p;
};

module.exports = { getPreview, fetchPreview, parseHtml, assertPublicUrl, isBlockedIp, safeLookup };
