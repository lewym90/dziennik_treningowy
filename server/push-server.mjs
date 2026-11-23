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
  // Bez kodu: aplikacja łączy się jednym przyciskiem. REQUIRE_CODE=1 przywraca obowiązkowy kod połączenia.
  requireCode: process.env.REQUIRE_CODE === '1',
  maxDevices: Math.max(+(process.env.MAX_DEVICES || 0), 5000),
  idleDays: +(process.env.IDLE_DAYS || 60),   // przy komplecie urządzeń zwalniamy najdłużej nieużywane (dłużej niż tyle dni)
  newPerIpHour: +(process.env.NEW_PER_IP_HOUR || 10),
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
    const p = dev.pre;
    if (p && p.at <= now) { delete dev.pre; touch(); if (p.at >= now - cfg.lateMs && !(dev.timer && dev.timer.at <= now) && await sendTo(id, dev, p)) sent++; }
    // podsumowanie tygodnia (niedziela wieczorem): osobny termin, nie koliduje z przerwami; może się spóźnić najwyżej 6 godzin
    const w = dev.week;
    if (w && w.at <= now) { delete dev.week; touch(); if (w.at >= now - 6 * 3600000 && await sendTo(id, dev, w)) sent++; }
    const t = dev.timer;
    if (!t || t.at > now) continue;
    delete dev.timer; delete dev.pre; touch();
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

const newHits = new Map();
const tooManyNew = (ip, now) => {
  if (!ip) return false; const h = Math.floor(now / 3600000), k = `${ip}:${h}`;
  newHits.set(k, (newHits.get(k) || 0) + 1);
  if (newHits.size > 5000) for (const x of newHits.keys()) if (!x.endsWith(`:${h}`)) newHits.delete(x);
  return newHits.get(k) > cfg.newPerIpHour;
};
// zwolnij miejsce: usuń najdłużej nieużywane urządzenie, jeśli nie było używane od cfg.idleDays
const evictIdle = (now) => {
  let oldId = null, oldT = Infinity;
  for (const [id, d] of Object.entries(db.devices)) { const t = d.used || d.created || 0; if (t < oldT) { oldT = t; oldId = id; } }
  if (oldId && now - oldT > cfg.idleDays * 864e5) { delete db.devices[oldId]; log(`zwolniono nieużywane urządzenie ${oldId.slice(0, 6)}`); return true; }
  return false;
};

export async function handle(method, url, headers, body, now = Date.now(), ip = '') {
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
    const codeOk = cfg.setupCode && typeof setup === 'string' && setup !== '' && safeEq(setup, cfg.setupCode);
    if (cfg.requireCode && !codeOk) return [401, { error: 'zły kod połączenia' }];
    if (!codeOk && setup && cfg.setupCode) return [401, { error: 'zły kod połączenia' }];
    if (!codeOk && tooManyNew(ip, now)) return [429, { error: 'za dużo nowych połączeń, spróbuj za godzinę' }];
    if (Object.keys(db.devices).length >= cfg.maxDevices && !evictIdle(now)) return [403, { error: 'serwer jest pełny, spróbuj później' }];
    const token = crypto.randomBytes(24).toString('base64url');
    db.devices[deviceId] = { tokenHash: sha(token), sub: subscription, created: now, used: now };
    touch(); saveDb();
    return [200, { ok: true, token }];
  }
  const id = body && body.deviceId;
  const dev = validId(id) ? db.devices[id] : null;
  if (!dev || !auth || !safeEq(sha(auth), dev.tokenHash)) return [401, { error: 'brak uprawnień' }];
  if (now - (dev.used || 0) > 864e5) { dev.used = now; touch(); }
  if (method === 'POST' && route === '/timer') {
    const sec = Math.round(+body.sec);
    if (!Number.isFinite(sec) || sec < 1 || sec > cfg.maxSec) return [400, { error: 'zły czas' }];
    // Czas liczymy od chwili odebrania; telefon odejmuje własne opóźnienie sieci, wysyłając „sec” pomniejszone o nie.
    dev.timer = { at: now + sec * 1000, title: str(body.title || 'Przerwa skończona', 80), body: str(body.body || 'Do roboty — czas na kolejną serię.', 200), tag: 'forge-rest', url: './#/workout' };
    // ostrzeżenie przed końcem przerwy (np. 30 s wcześniej); ten sam znacznik, więc końcowe powiadomienie je zastępuje
    const pre = Math.round(+body.pre || 0); delete dev.pre;
    if (pre >= 5 && pre < sec - 2) dev.pre = { at: dev.timer.at - pre * 1000, title: str(body.preTitle || `Za ${pre} s koniec przerwy`, 80), body: str(body.preBody || 'Przygotuj się do kolejnej serii.', 200), tag: 'forge-rest', url: './#/workout' };
    touch(); saveDb();
    return [200, { ok: true, at: dev.timer.at }];
  }
  if (method === 'POST' && route === '/week') {
    // termin jako znacznik czasu (telefon liczy niedzielę 19:00 w swojej strefie); off — wyłącz
    if (body.off) { if (dev.week) { delete dev.week; touch(); saveDb(); } return [200, { ok: true }]; }
    const at = Math.round(+body.at);
    if (!Number.isFinite(at) || at <= now || at > now + 8 * 864e5) return [400, { error: 'zły termin' }];
    dev.week = { at, title: str(body.title || 'Twój tydzień w FORGE', 80), body: str(body.body || '', 200), tag: 'forge-week', url: './#/stats' };
    touch(); saveDb(); return [200, { ok: true, at }];
  }
  if (method === 'POST' && route === '/cancel') { if (dev.timer || dev.pre) { delete dev.timer; delete dev.pre; touch(); saveDb(); } return [200, { ok: true }]; }
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
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',').pop().trim(); // ostatni wpis dopisuje nasz proxy — pierwszego może podrobić klient
    if (limited(ip)) return send(429, { error: 'za dużo żądań' });
    try {
      const body = req.method === 'POST' ? await readBody(req) : {};
      const [code, obj] = await handle(req.method, req.url, req.headers, body, Date.now(), ip);
      send(code, obj);
    } catch (e) { send(e.code === 413 || e.code === 400 ? e.code : 500, { error: e.message || 'błąd' }); }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!cfg.vapidPublic || !cfg.vapidPrivate) { console.error('Brak VAPID_PUBLIC / VAPID_PRIVATE w środowisku.'); process.exit(1); }
  if (cfg.requireCode && !cfg.setupCode) { console.error('REQUIRE_CODE=1, ale brak SETUP_CODE.'); process.exit(1); }
  loadDb();
  const srv = createServer();
  srv.listen(cfg.port, cfg.host, () => log(`FORGE push: ${cfg.host}:${cfg.port}, urządzeń: ${Object.keys(db.devices).length}`));
  setInterval(() => { runDue().catch((e) => log('tick', e.message)); }, cfg.tickMs);
  const bye = () => { try { if (dirty) saveDb(); } catch (_) { /* nic */ } process.exit(0); };
  process.on('SIGTERM', bye); process.on('SIGINT', bye);
}
