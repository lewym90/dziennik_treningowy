// Testy serwera FORGE push: node test.mjs (używa podstawionej wysyłki, bez sieci).
import assert from 'node:assert/strict';
process.env.VAPID_PUBLIC = 'x'; process.env.VAPID_PRIVATE = 'y'; process.env.SETUP_CODE = 'KOD123';
process.env.DATA_FILE = '/tmp/forge-push-test.json';
const m = await import('./push-server.mjs');
m.loadDb('/nonexistent'); const sentLog = []; m.setSender(async (sub, p) => { sentLog.push(JSON.parse(p)); });
const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'a', auth: 'b' } };
const ID = 'device_0123456789abcdef';
let r = await m.handle('POST', '/subscribe', {}, { deviceId: ID, setup: 'zly', subscription: sub }); assert.equal(r[0], 401);
r = await m.handle('POST', '/subscribe', {}, { deviceId: ID, setup: 'KOD123', subscription: sub }); assert.equal(r[0], 200); const token = r[1].token; assert.ok(token);
r = await m.handle('POST', '/timer', {}, { deviceId: ID, sec: 30 }); assert.equal(r[0], 401);
const t0 = 1_000_000;
r = await m.handle('POST', '/timer', {}, { deviceId: ID, token, sec: 30, body: 'Superseria A' }, t0); assert.equal(r[0], 200); assert.equal(r[1].at, t0 + 30000);
assert.equal(await m.runDue(t0 + 29000), 0);
r = await m.handle('POST', '/timer', { authorization: 'Bearer ' + token }, { deviceId: ID, sec: 45 }, t0 + 1000); assert.equal(r[1].at, t0 + 46000, 'nowy timer zastępuje stary');
assert.equal(await m.runDue(t0 + 40000), 0);
assert.equal(await m.runDue(t0 + 46500), 1); assert.equal(sentLog.length, 1); assert.equal(sentLog[0].title, 'Przerwa skończona');
assert.equal(await m.runDue(t0 + 50000), 0, 'tylko raz');
await m.handle('POST', '/timer', {}, { deviceId: ID, token, sec: 20 }, t0); r = await m.handle('POST', '/cancel', {}, { deviceId: ID, token }); assert.equal(r[0], 200);
assert.equal(await m.runDue(t0 + 99999), 0, 'anulowany');
await m.handle('POST', '/timer', {}, { deviceId: ID, token, sec: 20 }, t0);
assert.equal(await m.runDue(t0 + 20000 + 120000), 0, 'przestarzały timer pomijany');
r = await m.handle('POST', '/timer', {}, { deviceId: ID, token, sec: 99999 }); assert.equal(r[0], 400);
r = await m.handle('POST', '/test', {}, { deviceId: ID, token }); assert.equal(r[0], 200);
m.setSender(async () => { throw Object.assign(new Error('gone'), { statusCode: 410 }); });
await m.handle('POST', '/timer', {}, { deviceId: ID, token, sec: 1 }, t0); await m.runDue(t0 + 2000);
assert.equal(Object.keys(m.getDb().devices).length, 0, 'wygasłe urządzenie usunięte');
// kilka osób naraz: każdy telefon ma własny timer i dostaje wyłącznie własne powiadomienie
{
  m.loadDb('/nonexistent'); const got = []; m.setSender(async (s, p) => { got.push({ to: s.endpoint, ...JSON.parse(p) }); });
  const mk = n => ({ endpoint: 'https://push.example/' + n, keys: { p256dh: 'a', auth: 'b' } });
  const ids = ['user_A_0123456789abcd', 'user_B_0123456789abcd', 'user_C_0123456789abcd']; const tok = {};
  for (const [i, id] of ids.entries()) { const r = await m.handle('POST', '/subscribe', {}, { deviceId: id, setup: 'KOD123', subscription: mk('abc'[i]) }); tok[id] = r[1].token; }
  const T = 5_000_000;
  await m.handle('POST', '/timer', {}, { deviceId: ids[0], token: tok[ids[0]], sec: 60, body: 'A' }, T);
  await m.handle('POST', '/timer', {}, { deviceId: ids[1], token: tok[ids[1]], sec: 90, body: 'B' }, T);
  assert.equal((await m.handle('POST', '/timer', {}, { deviceId: ids[2], token: tok[ids[0]], sec: 5 }, T))[0], 401, 'cudzy token nie działa');
  await m.runDue(T + 61000); assert.deepEqual(got.map(x => x.to + ':' + x.body), ['https://push.example/a:A'], 'po 60 s tylko A');
  await m.handle('POST', '/cancel', {}, { deviceId: ids[1], token: tok[ids[1]] }, T + 62000); // B pomija przerwę
  await m.runDue(T + 100000); assert.equal(got.length, 1, 'B anulował, C nic nie planował');
  await m.handle('POST', '/timer', {}, { deviceId: ids[2], token: tok[ids[2]], sec: 10, body: 'C' }, T + 100000); await m.runDue(T + 111000);
  assert.deepEqual(got.map(x => x.body), ['A', 'C']);
}
console.log('OK — wszystkie testy serwera przeszły');
