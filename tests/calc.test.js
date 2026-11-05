/* Testy obliczeń FORGE w prawdziwej przeglądarce. Uruchom: node tests/calc.test.js (potrzebny Playwright). */
const { chromium } = require('playwright'), { spawn } = require('child_process'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms)), PORT = 8171;
(async () => {
  const s = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await sleep(800);
  const b = await chromium.launch(), c = await b.newContext({ serviceWorkers: 'block', timezoneId: 'Europe/Warsaw' }), q = await c.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
  await q.addInitScript(() => { const t = new Date('2026-11-05T17:40:00+01:00').getTime(), R = Date; window.Date = class extends R { constructor(...a) { a.length ? super(...a) : super(t); } static now() { return t; } }; });
  await q.goto(`http://127.0.0.1:${PORT}/`); await q.waitForFunction(() => window.F && F.S.ex.size > 100 && F.render); await sleep(1200);
  const res = await q.evaluate(async () => {
    const out = [], eq = (n, a, b) => out.push([n, Math.abs(a - b) < 1e-6 || a === b, a, b]), ok = (n, v) => out.push([n, !!v, v, true]);
    const DAY = 864e5, now = Date.now();
    // 1RM (Epley), objętość
    eq('e1rm 100×1', F.e1rm(100, 1), 100); eq('e1rm 100×10', F.e1rm(100, 10), 100 * (1 + 10 / 30)); eq('e1rm limit 20', F.e1rm(100, 30), 100 * (1 + 20 / 30)); eq('e1rm zero', F.e1rm(0, 5), 0);
    ok('rozgrzewka nie jest serią roboczą', !F.isWork({ done: true, t: 'w' })); ok('niezaliczona nie jest robocza', !F.isWork({ done: false, t: 'n' }));
    const mk = (id, st, day, ex) => ({ id, start: st, end: st + 36e5, dur: 3600, name: day, planId: 'p', dayId: day, deload: false, exercises: ex, prs: [] });
    const set = (w, r) => ({ w, r, t: 'n', done: true, pr: null, rpe: null });
    eq('tonaż sesji', F.sessionVolume(mk('t', now, 'A', [{ exId: 'bench', sets: [set(100, 5), set(100, 5), { w: 60, r: 5, t: 'w', done: true }] }])), 1000);
    // kolejka i kalendarz: czw 5.11, dni Pn Wt Cz Pt
    const plan = { id: 'p', name: 'P', created: now - 30 * DAY, days: ['A', 'B', 'C', 'D'].map(n => ({ id: n, name: n, items: [{ id: n + '1', exId: 'squat', sets: 3, reps: '5', rest: 60 }] })) }; await F.savePlan(plan);
    F.S.settings.cal = { wd: [0, 1, 3, 4], moves: {}, pauses: [], skips: [] };
    await F.addSession(mk('s1', new Date('2026-11-02T18:00:00+01:00').getTime(), 'A', [{ exId: 'squat', sets: [set(100, 5), set(100, 5), set(100, 5)] }]));
    await F.addSession(mk('s2', new Date('2026-11-03T18:00:00+01:00').getTime(), 'B', [{ exId: 'squat', sets: [set(100, 5)] }]));
    let q = F.calQueue(21); const str = () => F.calQueue(21).slice(0, 4).map(x => x.key % 100 + x.day.name).join(' ');
    eq('kolejka start', str(), '5C 6D 9A 10B');
    F.S.settings.cal.moves = { 20261106: 20261107 }; eq('przeniesienie nie rusza reszty', str(), '5C 7D 9A 10B');
    F.S.settings.cal.moves = {}; F.S.settings.cal.pauses = [20261106]; eq('przesunięcie o dzień', str(), '5C 7D 10A 11B');
    F.S.settings.cal.pauses = []; F.S.settings.cal.skips = [{ key: 20261106, dayId: 'D', after: 's2' }]; eq('pominięcie przyszłego', str(), '5C 9A 10B 12C');
    F.S.settings.cal.skips = [{ key: 20261105, dayId: 'C', after: 's2' }]; eq('pominięcie dzisiejszego zmienia następny trening', F.nextWorkout().day.name, 'D'); eq('pominięcie dzisiejszego', str(), '6D 9A 10B 12C');
    F.S.settings.cal.skips = [];
    // regeneracja
    eq('duża partia, 12 serii', F.recoveryNeed('quads', 12), 66); eq('limit dużej partii', F.recoveryNeed('quads', 30), 72); eq('mała partia, 4 serie', F.recoveryNeed('biceps', 4), 28);
    const fresh = mk('s3', now - 3 * 36e5, 'C', [{ exId: 'leg_ext', sets: Array.from({ length: 12 }, () => set(40, 10)) }]); await F.addSession(fresh);
    const rc = F.recovery(); eq('świeżo po pracy', rc.quads.st, 'fresh'); eq('niepracujące gotowe', rc.biceps.st, 'ready'); eq('nieaktywne po czasie', F.recovery(now + 5 * DAY).quads.st, 'ready');
    // stagnacja i wniosek, porównanie z poprzednim treningiem
    for (let i = 5; i >= 1; i--) await F.addSession(mk('st' + i, now - i * 7 * DAY, 'E', [{ exId: 'ohp', sets: [set(60, 5)] }])); await F.recomputeAllPRs();
    ok('stagnacja daje wskazówkę', F.exHint('ohp')); ok('brak wskazówki bez historii', !F.exHint('curl_bb'));
    const a = mk('v1', now - 2 * DAY, 'F', [{ exId: 'bench', sets: [set(100, 5)] }]), bb = mk('v2', now - DAY, 'F', [{ exId: 'bench', sets: [set(110, 5)] }]); await F.addSession(a); await F.addSession(bb);
    ok('tonaż +10%', /\+10%/.test(F.sessChanges(bb)[0].t));
    // raport i cele
    const m = F.reportPeriodStats(new Date('2026-11-01T00:00:00+01:00').getTime(), new Date('2026-12-01T00:00:00+01:00').getTime()); ok('raport liczy treningi', m.n >= 4);
    const g = { id: 'g', m: '2026-11', k: 's', n: 4 }; ok('cel ukończony', F.goalProg(g).p >= 1); eq('cel ciężar', F.goalProg({ m: '2026-11', k: 'l', n: 200, ex: 'bench' }).v, 110);
    return out;
  });
  let bad = 0; res.forEach(([n, pass, a, e]) => { if (!pass) { bad++; console.log('BŁĄD', n, 'jest', a, 'powinno', e); } });
  console.log(`${res.length - bad}/${res.length} testów OK`, errs.length ? errs : ''); s.kill(); await b.close(); process.exit(bad || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
