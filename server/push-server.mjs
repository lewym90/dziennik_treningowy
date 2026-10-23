// Serwer powiadomień Web Push dla FORGE. Lekka, osobna usługa: nasłuchuje tylko na 127.0.0.1.
// Aplikacja po zaliczeniu serii mówi serwerowi „za N sekund wyślij powiadomienie”; serwer o właściwej chwili wysyła push
// przez Apple/Google. Dzięki temu koniec przerwy dociera, nawet gdy telefon jest zablokowany, a aplikacja uśpiona,
// i nic nie gra w tle (muzyka z innych aplikacji nie jest ruszana).
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';

const cfg = {
  port: +(process.env.PORT || 8793),
  host: process.env.HOST || '127.0.0.1',
  dataFile: process.env.DATA_FILE || '/opt/forge-push/data/db.json',
  setupCode: process.env.SETUP_CODE || '',
  vapidPublic: process.env.VAPID_PUBLIC || '',
  vapidPrivate: process.env.VAPID_PRIVATE || '',
  subject: process.env.VAPID_SUBJECT || 'https://lewym90.github.io/dziennik_treningowy/',
  origin: process.env.ALLOW_ORIGIN || 'https://lewym90.github.io',
  maxDevices: +(process.env.MAX_DEVICES || 100),
  lateMs: +(process.env.LATE_MS || 90000),   // timer spóźniony o więcej (np. po restarcie serwera) jest pomijany
  tickMs: +(process.env.TICK_MS || 500),
  maxSec: 3600,
};

export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- Magazyn (plik JSON, zapis atomowy) ----------
let db = { devices: {} };
export function loadDb(file = cfg.dataFile) {
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { db = { devices: {} }; }
  db.devices ||= {};
  return db;
}
let dirty = false;
export function saveDb(file = cfg.dataFile) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(tmp, file);
  dirty = false;
}
const touch = () => { dirty = true; };
export const getDb = () => db;

// ---------- Wysyłka ----------
export let sender = (sub, payload, opts) => webpush.sendNotification(sub, payload, opts);
export const setSender = (f) => { sender = f; };

export async function sendTo(id, dev, n) {
  const payload = JSON.stringify({ title: n.title || 'FORGE', body: n.body || '', tag: n.tag || 'forge-rest', url: n.url || './#/workout' });
  try {
    await sender(dev.sub, payload, { TTL: 120, urgency: 'high', vapidDetails: { subject: cfg.subject, publicKey: cfg.vapidPublic, privateKey: cfg.vapidPrivate } });
    log(`wysłano do ${id.slice(0, 6)}: „${(n.title || '').slice(0, 40)}”`);
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) { delete db.devices[id]; touch(); log(`urządzenie ${id.slice(0, 6)} wygasło (${e.statusCode}) – usunięto`); }
    else log(`błąd wysyłki ${e.statusCode || ''} ${e.message || e} ${String(e.body || '').slice(0, 120)}`);
    return false;
  }
}

// Co tyknięcie: wyślij wszystkie timery, których czas minął.
export async function runDue(now = Date.now()) {
  let sent = 0;
  for (const [id, dev] of Object.entries(db.devices)) {
    const t = dev.timer;
    if (!t || t.at > now) continue;
    delete dev.timer; touch();
    if (t.at < now - cfg.lateMs) continue;       // przestarzały
    if (await sendTo(id, dev, t)) sent++;
  }
  if (dirty) saveDb();
  return sent;
}

// ---------- HTTP ----------
const hits = new Map();
const limited = (ip) => {
  const m = Math.floor(Date.now() / 60000);
  const k = `${ip}:${m}`;
  hits.set(k, (hits.get(k) || 0) + 1);
  if (hits.size > 5000) for (const x of hits.keys()) if (!x.endsWith(`:${m}`)) hits.delete(x);
  return hits.get(k) > 600;
};

function readBody(req, max = 20_000) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > max) { reject(Object.assign(new Error('za duże'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (_) { reject(Object.assign(new Error('zły JSON'), { code: 400 })); } });
    req.on('error', reject);
  });
}

const validSub = (s) => s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string';
const validId = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(s);
const str = (v, n) => String(v == null ? '' : v).slice(0, n);

export async function handle(method, url, headers, body, now = Date.now()) {
  const route = url.split('?')[0].replace(/\/+$/, '') || '/';
  if (method === 'GET' && route === '/health') return [200, { ok: true, devices: Object.keys(db.devices).length }];
  if (method === 'GET' && route === '/vapid') return [200, { publicKey: cfg.vapidPublic }];
  const auth = (headers.authorization || '').replace(/^Bearer\s+/i, '') || (body && typeof body.token === 'string' ? body.token : '');
  if (method === 'POST' && route === '/subscribe') {
    const { deviceId, setup, subscription } = body || {};
    if (!validId(deviceId) || !validSub(subscription)) return [400, { error: 'nieprawidłowe dane' }];
    const dev = db.devices[deviceId];
    if (dev) {
      if (!auth || !safeEq(sha(auth), dev.tokenHash)) return [401, { error: 'brak uprawnień' }];
      dev.sub = subscription; touch(); saveDb();
      return [200, { ok: true }];
    }
    if (!cfg.setupCode || typeof setup !== 'string' || !safeEq(setup, cfg.setupCode)) return [401, { error: 'zły kod połączenia' }];
    if (Object.keys(db.devices).length >= cfg.maxDevices) return [403, { error: 'za dużo urządzeń' }];
    const token = crypto.randomBytes(24).toString('base64url');
    db.devices[deviceId] = { tokenHash: sha(token), sub: subscription, created: now };
    touch(); saveDb();
    return [200, { ok: true, token }];
  }
  const id = body && body.deviceId;
  const dev = validId(id) ? db.devices[id] : null;
  if (!dev || !auth || !safeEq(sha(auth), dev.tokenHash)) return [401, { error: 'brak uprawnień' }];
  if (method === 'POST' && route === '/timer') {
    const sec = Math.round(+body.sec);
    if (!Number.isFinite(sec) || sec < 1 || sec > cfg.maxSec) return [400, { error: 'zły czas' }];
    // Czas liczymy od chwili odebrania; telefon odejmuje własne opóźnienie sieci, wysyłając „sec” pomniejszone o nie.
    dev.timer = { at: now + sec * 1000, title: str(body.title || 'Przerwa skończona', 80), body: str(body.body || 'Do roboty — czas na kolejną serię.', 200), tag: 'forge-rest', url: './#/workout' };
    touch(); saveDb();
    return [200, { ok: true, at: dev.timer.at }];
  }
  if (method === 'POST' && route === '/cancel') { if (dev.timer) { delete dev.timer; touch(); saveDb(); } return [200, { ok: true }]; }
  if (method === 'POST' && route === '/unsubscribe') { delete db.devices[id]; touch(); saveDb(); return [200, { ok: true }]; }
  if (method === 'POST' && route === '/test') {
    const ok = await sendTo(id, dev, { title: 'FORGE', body: 'Działa. Tak będzie wyglądać koniec przerwy.' });
    return [ok ? 200 : 502, { ok }];
  }
  return [404, { error: 'nie znaleziono' }];
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = { 'Access-Control-Allow-Origin': origin && origin === cfg.origin ? origin : cfg.origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors }); res.end(JSON.stringify(obj)); };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return send(429, { error: 'za dużo żądań' });
    try {
      const body = req.method === 'POST' ? await readBody(req) : {};
      const [code, obj] = await handle(req.method, req.url, req.headers, body);
      send(code, obj);
    } catch (e) { send(e.code === 413 || e.code === 400 ? e.code : 500, { error: e.message || 'błąd' }); }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!cfg.vapidPublic || !cfg.vapidPrivate || !cfg.setupCode) { console.error('Brak VAPID_PUBLIC / VAPID_PRIVATE / SETUP_CODE w środowisku.'); process.exit(1); }
  loadDb();
  const srv = createServer();
  srv.listen(cfg.port, cfg.host, () => log(`FORGE push: ${cfg.host}:${cfg.port}, urządzeń: ${Object.keys(db.devices).length}`));
  setInterval(() => { runDue().catch((e) => log('tick', e.message)); }, cfg.tickMs);
  const bye = () => { try { if (dirty) saveDb(); } catch (_) { /* nic */ } process.exit(0); };
  process.on('SIGTERM', bye); process.on('SIGINT', bye);
}
