/* Testy całych scenariuszy FORGE w prawdziwej przeglądarce (Playwright, Chromium).
   Uruchom: node tests/e2e.test.js   — albo wszystko naraz: bash tests/run.sh
   Sprawdzają: trening (seria, przerwa, przejście do następnego ćwiczenia, cofanie, superseria, obrót),
   serie rozgrzewkowe, jadłospis (wszystkie wykluczenia), przejścia między ekranami, rekord, podsumowanie,
   przeciąganie okienka, wszystkie ekrany bez błędów, czat o żywieniu. */
const { chromium } = require('playwright'), { spawn } = require('child_process'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms)), PORT = 8219;
let fails = 0, passes = 0; const ok = (name, v, info) => { if (v) passes++; else { fails++; console.log('✗', name, info !== undefined ? JSON.stringify(info) : ''); } };

async function page(b, o = {}) {
  const c = await b.newContext({ serviceWorkers: 'block', viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/Warsaw' }); const q = await c.newPage(); const errs = [];
  q.on('pageerror', e => errs.push(e.message));
  await q.goto(`http://127.0.0.1:${PORT}/`); await q.waitForFunction(() => window.F && F.S.ex.size > 100 && F.planGen); await sleep(1800);
  await q.evaluate(() => { F.S.settings.tourSeen = 1; F.S.settings.feelAsk = false; document.querySelectorAll('[class*=tour]').forEach(e => e.remove()); });
  return { c, q, errs };
}

async function workoutFlow(b) {
  const { c, q, errs } = await page(b);
  const st = () => q.evaluate(() => { const el = document.getElementById('wk-pager'); return { page: F.ui.wkPage, rest: !!F.rest, dock: ((document.querySelector('#set-dock') || {}).innerText || '').replace(/\s+/g, ' ') }; });
  const chk = async () => { await q.evaluate(() => document.querySelector('#set-dock [data-a="check"]').click()); await sleep(400); };
  await q.evaluate(async () => {
    const p = { id: 'pf', name: 'T', meta: { goal: 'hyp' }, days: [{ id: 'd1', name: 'A', items: [
      { id: 'a', exId: 'bench', sets: 2, reps: '8-12', rest: 4, role: 'main', w: 60 }, { id: 'b', exId: 'row_bb', sets: 2, reps: '8-12', rest: 4, role: 'main', w: 50 },
      { id: 'c', exId: 'curl_bb', sets: 2, reps: '10-15', rest: 4, role: 'iso', w: 30, ss: 'A' }, { id: 'd', exId: 'tri_rope', sets: 2, reps: '10-15', rest: 4, role: 'iso', w: 25, ss: 'A' },
      { id: 'e', exId: 'lateral', sets: 1, reps: '10-15', rest: 4, role: 'iso', w: 10 }] }] };
    await F.savePlan(p); F.setCurPlan(p.id); F.startWorkout({ plan: p, day: p.days[0] });
  });
  await sleep(1200); await q.evaluate(() => F.act.feelSkip && F.act.feelSkip()); await sleep(400);
  let s = await st(); ok('trening: start na karcie 1', s.page === 0 && /Zalicz serię/.test(s.dock), s);
  await chk(); s = await st(); ok('trening: po serii przerwa', s.rest, s);
  ok('trening: kafelek serii animuje się', await q.evaluate(() => !!document.querySelector('.sxc.just')));
  await q.evaluate(() => F.act.restSkip()); await sleep(900); s = await st(); ok('trening: pominięta przerwa, ta sama karta', s.page === 0 && !s.rest, s);
  await chk(); s = await st(); ok('trening: napis „Następne ćwiczenie”', /NASTĘPNE ĆWICZENIE|Następne ćwiczenie/.test(s.dock), s);
  await sleep(5200); s = await st(); ok('trening: po końcu przerwy karta 2', s.page === 1 && !s.rest, s);
  await chk(); await q.evaluate(() => F.act.restSkip()); await sleep(900); await chk(); await q.evaluate(() => document.querySelector('[data-a="undoChk"]').click()); await sleep(900);
  s = await st(); ok('trening: Cofnij zostawia kartę 2', s.page === 1 && !s.rest, s);
  await chk(); await q.evaluate(() => { document.getElementById('wk-pager').scrollLeft = 0; }); await sleep(400); await q.evaluate(() => F.act.restSkip()); await sleep(900);
  s = await st(); ok('trening: ręczny powrót w przerwie nie przeskakuje', s.page === 0, s);
  await q.evaluate(() => { const el = document.getElementById('wk-pager'); el.scrollLeft = el.clientWidth * 2; }); await sleep(500);
  for (let r = 0; r < 2; r++) { await q.evaluate(() => { const x = [...document.querySelectorAll('.wk-slide[data-pg="2"] [data-a="ssCheck"]')].find(y => !y.closest('.done') && !y.classList.contains('ok')); x.click(); }); await sleep(400); if (r === 0) await q.evaluate(() => F.rest && F.act.restSkip()); await sleep(500); }
  await q.evaluate(() => F.rest && F.act.restSkip()); await sleep(900); s = await st(); ok('trening: po superserii następna karta', s.page === 3, s);
  await q.evaluate(() => { const el = document.getElementById('wk-pager'); el.scrollLeft = el.clientWidth; }); await sleep(500);
  await q.setViewportSize({ width: 852, height: 393 }); await sleep(900); await q.setViewportSize({ width: 393, height: 852 }); await sleep(1000);
  ok('trening: obrót nie zmienia karty', (await st()).page === 1);
  ok('trening: brak błędów JS', !errs.length, errs); await c.close();
}

async function warmups(b) {
  const { c, q, errs } = await page(b);
  const r = await q.evaluate(async () => {
    const p = { id: 'pw', name: 'W', meta: { goal: 'hyp', warm: true }, days: [{ id: 'd1', name: 'A', items: [
      { id: 'a', exId: 'squat', sets: 3, reps: '6-8', role: 'main', w: 100 }, { id: 'b', exId: 'bench', sets: 3, reps: '8-10', role: 'main', w: 60 }, { id: 'c', exId: 'db_bench', sets: 3, reps: '8-10', role: 'sec', w: 50 }, { id: 'd', exId: 'lateral', sets: 3, reps: '12-15', role: 'iso', w: 10 }] }] };
    await F.savePlan(p); F.startWorkout({ plan: p, day: p.days[0] }); const d = F.S.draft; const out = d.exercises.map(e => e.sets.filter(s => s.t === 'w').map(s => s.w + '×' + s.r).join(','));
    F.S.draft = null; await F.saveDraft(); return out;
  });
  ok('rozgrzewka: pierwsze ćwiczenie 3 serie', r[0] === '50×8,70×5,85×2', r); ok('rozgrzewka: nowa partia 2 serie', r[1] === '35×5,47.5×3' || r[1] === '35×5,47,5×3' || /^\d/.test(r[1]) && r[1].split(',').length === 2, r);
  ok('rozgrzewka: ta sama partia bez serii', r[2] === '', r); ok('rozgrzewka: izolowane bez serii', r[3] === '', r);
  const r2 = await q.evaluate(async () => { const p = F.planOf('pw'); p.meta.warm = false; F.startWorkout({ plan: p, day: p.days[0] }); const n = F.S.draft.exercises[0].sets.filter(s => s.t === 'w').length; F.S.draft = null; await F.saveDraft(); return n; });
  ok('rozgrzewka: wyłączona — nic nie dodaje', r2 === 0, r2);
  ok('rozgrzewka: brak błędów JS', !errs.length, errs); await c.close();
}

async function nutrition(b) {
  const { c, q, errs } = await page(b);
  const R = await q.evaluate(async () => {
    const profiles = [{ sex: 'm', bw: 85, h: 180, mode: 'cut', act: 2 }, { sex: 'f', bw: 60, h: 165, mode: 'cut', act: 1 }, { sex: 'm', bw: 75, h: 178, mode: 'bulk', act: 3 }, { sex: 'f', bw: 55, h: 160, mode: 'keep', act: 2 }, { sex: 'm', bw: 110, h: 185, mode: 'cut', act: 1 }];
    const keys = ['meat', 'fish', 'dairy', 'egg', 'gluten', 'nuts']; const out = [];
    for (const pr of profiles) {
      Object.assign(F.S.settings, { sex: pr.sex, age: 35, ageAt: Date.now(), height: pr.h, activity: pr.act, nut: { mode: pr.mode } }); F.S.bw = [{ id: 'x', kg: pr.bw, date: Date.now() }];
      const np = F.nutPlan(); let worst = 0, pLow = 0, mainLow = 0, excl = 0, empty = 0, n = 0;
      for (let m = 0; m < 64; m++) { const ex = {}; keys.forEach((k, i) => { if (m & (1 << i)) ex[k] = 1; });
        for (const meals of [3, 4, 5]) for (let day = 0; day < 7; day++) { const ms = F.mealPlan(np, meals, { ex, day }, 0); n++;
          const tk = ms.reduce((a, x) => a + x.tot.k, 0), tp = ms.reduce((a, x) => a + x.tot.p, 0); worst = Math.max(worst, Math.abs(tk - np.k) / np.k); if (tp < np.prot * 0.9) pLow++;
          ms.forEach(x => { if (x.empty) empty++; if (x.slot !== 'sn' && x.tot.p < 0.4 * np.refMass * 0.9) mainLow++; x.rows.forEach(r => { if (F.FOOD[r.id][8].split(' ').some(t => t && ex[t])) excl++; }); }); } }
      out.push({ pr: pr.sex + pr.bw + pr.mode, n, worst, pLow, mainLow, excl, empty, fat: np.fatPct, carbKg: np.carb / pr.bw, cR: np.cR });
    }
    return out;
  });
  R.forEach(r => { ok(`żywienie ${r.pr}: kalorie ±5%`, r.worst <= 0.05, r.worst); ok(`żywienie ${r.pr}: białko ≥ 90% celu`, r.pLow === 0, r.pLow); ok(`żywienie ${r.pr}: 0,4 g/kg w głównych posiłkach`, r.mainLow === 0, r.mainLow); ok(`żywienie ${r.pr}: wykluczenia przestrzegane`, r.excl === 0 && r.empty === 0, r); ok(`żywienie ${r.pr}: tłuszcz 20–30%`, r.fat >= 0.2 && r.fat <= 0.3, r.fat); });
  // ekran: zamiana produktu i lista zakupów
  await q.evaluate(() => { F.S.settings.nut = { mode: 'keep' }; location.hash = '#/nutrition'; }); await sleep(700);
  await q.click('.meal-sw >> nth=1'); await sleep(400); ok('żywienie: okienko zamiany', await q.evaluate(() => /Zamień/.test(document.querySelector('.sheet').innerText)));
  await q.evaluate(() => document.querySelector('.sheet .menu button').click()); await sleep(400); ok('żywienie: po zamianie zapisana zmiana', await q.evaluate(() => Object.keys(F.S.settings.nut.sw || {}).length === 1));
  await q.click('[data-a="nutShop"]'); await sleep(400); ok('żywienie: lista zakupów', await q.evaluate(() => /Mięso i ryby|Nabiał/i.test(document.querySelector('.sheet').innerText)));
  ok('żywienie: brak błędów JS', !errs.length, errs); await c.close();
}

async function motion(b) {
  const { c, q, errs } = await page(b);
  await q.evaluate(async () => { const res = F.planGen({ goal: 'hyp', exp: 'mid', days: [0, 2, 4], prio: [], time: 60 }); await F.savePlan(res.plan); F.setCurPlan(res.plan.id);
    await F.addSession({ id: 's0', start: Date.now() - 3 * 864e5, end: Date.now() - 3 * 864e5 + 36e5, dur: 3600, name: res.plan.days[0].name, planId: res.plan.id, dayId: res.plan.days[0].id, exercises: res.plan.days.flatMap(d => d.items).map(it => ({ exId: it.exId, sets: [{ w: 10, r: 8, t: 'n', done: true }] })), prs: [] });
    location.hash = '#/home'; F.render(); });
  await sleep(700); const log = []; await q.exposeFunction('vtl', x => log.push(x));
  await q.evaluate(() => { const o = document.startViewTransition.bind(document); document.startViewTransition = cb => { window.vtl(document.documentElement.dataset.vt + (document.querySelector('[data-vtn]') ? '+morph' : '')); return o(cb); }; });
  for (const sel of ['#tabbar [data-tab="plans"]', '.pc-name']) { await q.click(sel); await sleep(700); }
  await q.evaluate(() => history.back()); await sleep(700); for (const t of ['history', 'stats', 'home']) { await q.click(`#tabbar [data-tab="${t}"]`); await sleep(700); }
  ok('ruch: kierunki przejść', log.join(',') === 'left,fwd+morph,back,left,left,right', log);
  await q.evaluate(() => F.act.startNext()); await sleep(1200); ok('ruch: start treningu od dołu', log[log.length - 1] === 'up+morph' || log[log.length - 1] === 'up', log);
  await q.evaluate(() => { const d = F.S.draft; d.exercises[0].sets[0].w = 200; F.act.check({ dataset: { i: 0, j: 0 } }); }); await sleep(300);
  ok('ruch: moment rekordu', await q.evaluate(() => !!document.querySelector('.pr-moment'))); await sleep(2700); ok('ruch: rekord sam znika', await q.evaluate(() => !document.querySelector('.pr-moment')));
  await q.evaluate(() => { F.rest.end = Date.now() + 9000; F.tickRest(); }); await sleep(300); ok('ruch: ostatnie 10 s przerwy', await q.evaluate(() => !!document.querySelector('.sd-ring.fin')));
  await q.evaluate(() => { F.rest.end = Date.now() - 1; F.tickRest(); }); await sleep(100); ok('ruch: błysk końca przerwy', await q.evaluate(() => document.querySelector('#set-dock').classList.contains('flash')));
  await q.evaluate(() => { F.act.wkFinish(); }); await sleep(600); await q.evaluate(() => { const x = [...document.querySelectorAll('.sheet button')].reverse().find(y => /Zakończ/.test(y.innerText)); x.click(); }); await sleep(1800);
  ok('ruch: podsumowanie z mapą mięśni', await q.evaluate(() => !!document.querySelector('.full-sum .sum-map canvas')));
  const box = await q.evaluate(() => { const r = document.querySelector('.sheet-grab').getBoundingClientRect(); return [r.x + r.width / 2, r.y + 3]; });
  const cdp = await c.newCDPSession(q); const tp = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: box[0], y }] });
  await tp('touchStart', box[1]); for (let k = 1; k <= 10; k++) { await tp('touchMove', box[1] + k * 30); await sleep(16); } await tp('touchEnd'); await sleep(600);
  ok('ruch: okienko zamyka się przeciągnięciem', await q.evaluate(() => !document.querySelector('#sheet-root').classList.contains('open')));
  await q.evaluate(() => { location.hash = '#/settings'; }); await sleep(600); await q.click('[data-a="setMotion"][data-v="low"]'); await sleep(300); const n = log.length;
  await q.evaluate(() => { location.hash = '#/plans'; }); await sleep(500); ok('ruch: „Oszczędne” wyłącza przejścia', log.length === n && await q.evaluate(() => document.documentElement.classList.contains('motion-low')));
  ok('ruch: brak błędów JS', !errs.length, errs); await c.close();
}

async function crawl(b) {
  const { c, q, errs } = await page(b);
  await q.evaluate(async () => { Object.assign(F.S.settings, { sex: 'm', age: 35, ageAt: Date.now(), height: 180, activity: 2 });
    const res = F.planGen({ goal: 'hyp', exp: 'mid', days: [0, 2, 4], prio: [], time: 60 }); await F.savePlan(res.plan); F.setCurPlan(res.plan.id);
    for (let i = 0; i < 12; i++) { const d = res.plan.days[i % 3]; await F.addSession({ id: 'c' + i, start: Date.now() - (i * 3 + 1) * 864e5, end: Date.now() - (i * 3 + 1) * 864e5 + 36e5, dur: 3600, name: d.name, planId: res.plan.id, dayId: d.id, exercises: d.items.map(it => ({ exId: it.exId, sets: [{ w: 52 - i, r: 8, t: 'n', done: true }, { w: 52 - i, r: 8, t: 'n', done: true }] })), prs: [] }); await F.addBW(82 + i * 0.1, Date.now() - (i * 3 + 1) * 864e5); }
    await F.saveSettings(); });
  const routes = ['#/home', '#/plans', '#/history', '#/stats', '#/nutrition', '#/guide', '#/guide/energy', '#/guide/protmeal', '#/guide/carbfat', '#/guide/protein', '#/guide/goals', '#/settings', '#/tools', '#/ask', '#/report', '#/calendar', '#/exercises', '#/recap', '#/wizard'];
  const glueOf = () => q.evaluate(() => { const g = []; document.querySelectorAll('#view b, .sheet b').forEach(bb => { const nx = bb.nextSibling; if (!nx || nx.nodeType !== 1 || !/^(SMALL|SPAN|EM)$/.test(nx.tagName)) return; const a = bb.getBoundingClientRect(), z = nx.getBoundingClientRect(); if (a.width && z.width && Math.abs(a.top - z.top) < 6 && z.left - a.right < 3 && z.left >= a.right - 1) g.push(bb.textContent); }); return g; });
  for (const r of routes) { await q.evaluate(h => { location.hash = h; }, r); await sleep(450); const bad = await q.evaluate(() => (document.querySelector('#view').innerText.match(/undefined|NaN|\[object/) || [])[0]); ok('ekran ' + r + ' bez „undefined/NaN”', !bad, bad); const g = await glueOf(); ok('ekran ' + r + ': tytuły oddzielone od opisów', !g.length, g); }
  for (const st of ['about', 'health', 'exp', 'goal', 'cardio', 'sched', 'equip', 'limits']) { await q.evaluate(st => { location.hash = '#/wizard'; setTimeout(() => { F.wz.quick = false; F.wz.step = st; F.render(); }, 50); }, st); await sleep(350); const g = await glueOf(); ok('kreator ' + st + ': tytuły oddzielone od opisów', !g.length, g); }
  await q.evaluate(() => { location.hash = '#/stats'; }); await sleep(500);
  for (let t = 0; t < 4; t++) { await q.evaluate(t => document.querySelectorAll('[data-a="statTab"]')[t].click(), t); await sleep(500); const n = await q.evaluate(() => document.querySelectorAll('#view .seg button, #view .chips .chip').length); for (let k = 0; k < Math.min(n, 8); k++) { await q.evaluate(k => { const x = document.querySelectorAll('#view .seg button, #view .chips .chip')[k]; if (x && x.dataset.a !== 'statTab') x.click(); }, k); await sleep(300); } }
  ok('ekrany: brak błędów JS', !errs.length, errs); await c.close();
}

async function chat(b) {
  const { c, q, errs } = await page(b);
  const r = await q.evaluate(async () => { Object.assign(F.S.settings, { sex: 'm', age: 35, ageAt: Date.now(), height: 180, activity: 2, nut: { mode: 'cut' } }); await F.addBW(85); F.askDry = true; const o = {};
    for (const x of ['Ile białka w jednym posiłku?', 'Ile wody pić?', 'Ile błonnika dziennie?', 'Czy brać witaminę D?', 'Dlaczego tak mało kalorii?', 'Gdzie jest lista zakupów?', 'Jadłospis bez glutenu', 'Ile kalorii potrzebuję?']) o[x] = String((await F.ask(x)).html).replace(/<[^>]+>/g, ' ');
    return o; });
  ok('czat: białko w posiłku', /0,4 g/.test(r['Ile białka w jednym posiłku?'])); ok('czat: woda', /2,0 l/.test(r['Ile wody pić?'])); ok('czat: błonnik', /25 g/.test(r['Ile błonnika dziennie?']));
  ok('czat: witamina D', /1000–2000/.test(r['Czy brać witaminę D?'])); ok('czat: współczynnik aktywności', /FAO/.test(r['Dlaczego tak mało kalorii?'])); ok('czat: lista zakupów', /Lista zakupów/.test(r['Gdzie jest lista zakupów?']));
  ok('czat: bez glutenu', /bez glutenu/.test(r['Jadłospis bez glutenu']) && !/Chleb żytni|Makaron|Kuskus|Bulgur|Płatki owsiane/.test(r['Jadłospis bez glutenu']), r['Jadłospis bez glutenu'].slice(0, 300));
  ok('czat: kalorie z wyjaśnieniem', /Jak liczę/.test(r['Ile kalorii potrzebuję?']));
  const r2 = await q.evaluate(async () => { F.askDry = false; const o = {}; for (const x of ['Przejdź na redukcję', 'Jem 5 posiłków dziennie', 'Nie jem ryb', 'Mam celiakię', 'Obniż kalorie o 150 kcal', 'Lista zakupów na 3 dni', 'Jadłospis dzień 3', 'Wyłącz animacje']) o[x] = String((await F.ask(x)).html).replace(/<[^>]+>/g, ' '); o.nut = JSON.stringify(F.S.settings.nut); o.motion = F.S.settings.motion; return o; });
  const nut = JSON.parse(r2.nut); ok('czat: polecenia żywienia zapisane', nut.mode === 'cut' && nut.meals === 5 && nut.ex.fish && nut.ex.gluten && nut.adj === -150, nut);
  ok('czat: lista zakupów w odpowiedzi', /Lista zakupów z Twojego jadłospisu na dni 1–3/.test(r2['Lista zakupów na 3 dni'])); ok('czat: jadłospis na wybrany dzień', /Dzień 3 jadłospisu/.test(r2['Jadłospis dzień 3']));
  ok('czat: wyłącz animacje', r2.motion === 'low');
  ok('czat: brak błędów JS', !errs.length, errs); await c.close();
}

(async () => {
  const s = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await sleep(800);
  const b = await chromium.launch();
  try { for (const t of [workoutFlow, warmups, nutrition, motion, crawl, chat]) { const n0 = fails; await t(b); console.log((fails === n0 ? '✓ ' : '✗ ') + t.name); } }
  catch (e) { fails++; console.log('✗ wyjątek:', e.message); }
  await b.close(); s.kill();
  console.log(`\n${passes} OK, ${fails} błędów`); process.exit(fails ? 1 : 0);
})();
