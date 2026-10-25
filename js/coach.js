/* FORGE — trener w telefonie: raport tygodnia i korekty planu (#/report) oraz żywienie (#/nutrition). */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const DAY = 864e5, WK = 7 * DAY;
  const round = (v, n = 0) => { const k = Math.pow(10, n); return Math.round(v * k) / k; };
  const MU = { chest: 'Klatka', back: 'Plecy', shoulders: 'Barki', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Przedramiona', abs: 'Brzuch', quads: 'Czworogłowe', hams: 'Dwugłowe', glutes: 'Pośladki', calves: 'Łydki', full: 'Całe ciało', cardio: 'Cardio' };

  /* ---------- wspólne ---------- */
  const activePlan = () => { const last = F.S.sessions.find(s => s.planId && F.planOf(s.planId)); return (last && F.planOf(last.planId)) || null; };
  const workSets = (sess, exId) => { const out = []; sess.exercises.forEach(e => { if (e.exId === exId) e.sets.forEach(s => { if (F.isWork(s)) out.push(s); }); }); return out; };
  const parseReps = r => { const m = String(r || '').match(/(\d+)(?:\s*[-–]\s*(\d+))?/); return m ? [+m[1], +(m[2] || m[1])] : [0, 0]; };
  const e1 = (ex, s, ts) => F.e1rm(F.effLoad(ex, s, ts), s.r);
  const weekSets = (a, b) => { const out = {}; F.S.sessions.forEach(se => { if (se.start < a || se.start >= b) return; se.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); if (!ex) return; const n = e.sets.filter(F.isWork).length; out[ex.muscle] = (out[ex.muscle] || 0) + n; }); }); return out; };
  const planSets = plan => { const out = {}; plan.days.forEach(d => d.items.forEach(i => { const ex = F.S.ex.get(i.exId); if (ex && ex.muscle !== 'cardio') out[ex.muscle] = (out[ex.muscle] || 0) + (+i.sets || 0); })); return out; };

  /* ---------- analiza planu (punkt 1: plan reagujący na postępy) ---------- */
  F.coachAnalyze = plan => {
    const out = []; const now = Date.now(); const strength = plan.days.length;
    const sess = F.S.sessions.filter(s => s.planId === plan.id).sort((a, b) => b.start - a.start);
    const wk = Math.floor((now - plan.created) / WK) + 1; const mesoW = plan.meta && plan.meta.meso || 0;
    // adherencja: ostatnie 2 pełne tygodnie
    const ws = F.startOfWeek(now); const c1 = F.S.sessions.filter(s => s.start >= ws - WK && s.start < ws).length, c2 = F.S.sessions.filter(s => s.start >= ws - 2 * WK && s.start < ws - WK).length;
    const planned = plan.days.filter(d => !/^Cardio/.test(d.name)).length || strength;
    if (sess.length >= 2 && c1 < planned * 0.5 && c2 < planned * 0.5) out.push({ k: 'adh', sev: 2, t: `Wykonujesz mniej niż połowę zaplanowanych treningów (${c1} i ${c2} z ${planned} w ostatnich dwóch tygodniach).`, d: 'Lepiej mieć plan na mniej dni, który zrealizujesz, niż idealny na papierze. Ułóż go ponownie w kreatorze na realną liczbę dni.', act: { id: 'coachWizard', l: 'Ułóż plan na mniej dni' } });
    // mezocykl / odciążenie
    if (mesoW && wk > mesoW && !F.deloadOn() && sess.length) out.push({ k: 'deload', sev: 1, t: `Tydzień ${wk} planu: czas na tydzień odciążenia.`, d: 'Zaplanowany cykl (' + mesoW + ' tygodni) się skończył. Lżejszy tydzień (mniej serii przy podobnym ciężarze i większym zapasie powtórzeń) to praktyka oparta na konsensusie ekspertów. Aplikacja obniży ciężary o ok. 10% na 7 dni.', act: { id: 'coachDeload', l: 'Włącz tydzień odciążenia' } });
    // per ćwiczenie
    const seen = new Set();
    plan.days.forEach((d, di) => d.items.forEach((it, ii) => {
      if (seen.has(it.exId)) return; seen.add(it.exId); const ex = F.S.ex.get(it.exId); if (!ex || ex.type === 'time') return;
      const hist = sess.filter(s => workSets(s, it.exId).length).slice(0, 5); if (hist.length < 3) return;
      const [lo, hi] = parseReps(it.reps); const last2 = hist.slice(0, 2);
      // za ciężko: powtórzenia poniżej zakresu w obu ostatnich sesjach lub RPE ≥ 9,5
      const below = last2.every(s => { const w = workSets(s, it.exId); return lo && w.filter(x => x.r < lo).length >= Math.ceil(w.length / 2); });
      const rp = last2.flatMap(s => workSets(s, it.exId)).map(x => x.rpe).filter(Boolean); const rpAvg = rp.length >= 4 ? rp.reduce((a, b) => a + b, 0) / rp.length : 0;
      const tooHard = below || (rpAvg >= 9.5 && (+it.sets || 0) > 2);
      // stagnacja: najlepszy e1RM nie rośnie w 4 sesjach
      const best = hist.slice(0, 4).map(s => Math.max(...workSets(s, it.exId).map(x => e1(ex, x, s.start)))).reverse();
      const stag = hist.length >= 4 && best[3] <= best[0] * 1.005 && best[2] <= best[0] * 1.02 && best[1] <= best[0] * 1.02;
      if (tooHard && (+it.sets || 0) > 2) out.push({ k: 'hard', sev: 2, t: `${ex.name}: wygląda na zbyt ciężkie.`, d: below ? `W dwóch ostatnich treningach większość serii była poniżej ${lo} powtórzeń.` : 'Średnie RPE w ostatnich seriach to ' + round(rpAvg, 1) + '.', act: { id: 'coachSets', l: 'Zmniejsz o 1 serię', a: { p: plan.id, di, ii, dl: -1 } } });
      else if (stag) out.push({ k: 'stag', sev: 1, t: `${ex.name}: brak postępu od 4 treningów.`, d: 'Najlepszy szacowany ciężar maksymalny nie rośnie. Sprawdź sen i jedzenie, a jeśli to nic nie zmienia — zamień ćwiczenie na wariant (inny kąt, inny sprzęt).', act: { id: 'coachSwap', l: 'Zamień ćwiczenie', a: { p: plan.id, di, ii } } });
    }));
    // objętość: realizowana vs zaplanowana (ostatnie 7 dni)
    const ps = planSets(plan), ds = weekSets(now - WK, now + 1); const low = [];
    if (sess.length >= 3) Object.entries(ps).forEach(([m, n]) => { if (n >= 6 && (ds[m] || 0) < n * 0.6) low.push(MU[m] || m); });
    if (low.length && c1 >= planned * 0.5) out.push({ k: 'vol', sev: 1, t: 'Mniej serii niż w planie: ' + low.join(', ') + '.', d: 'W ostatnich 7 dniach zrobiłeś(aś) wyraźnie mniej serii tych grup, niż przewiduje plan. Jeśli to nie przypadek, rozważ skrócenie planu o ćwiczenia pomocnicze.' });
    let nh = 0; const outF = out.filter(i => i.k !== 'hard' || ++nh <= 3);
    return { items: outF.sort((a, b) => b.sev - a.sev), week: wk, meso: mesoW, planned, done: [c1, c2], plan };
  };

  /* ---------- akcje korekt ---------- */
  F.act.coachWizard = () => { F.wz = null; F.go('#/wizard'); };
  F.act.coachDeload = async () => { F.S.settings.deloadUntil = Date.now() + WK; F.saveSettings(); F.toast('Tydzień odciążenia włączony — ciężary obniżone o ok. 10%'); F.render(true); };
  F.act.coachSets = async b => { const a = JSON.parse(b.dataset.args), p = F.planOf(a.p); if (!p) return; const it = p.days[a.di].items[a.ii]; it.sets = Math.max(2, (+it.sets || 3) + a.dl); await F.savePlan(p); F.toast('Zmieniono liczbę serii'); F.render(true); };
  F.act.coachSwap = async b => { const a = JSON.parse(b.dataset.args), p = F.planOf(a.p); if (!p) return; const it = p.days[a.di].items[a.ii]; const cur = F.S.ex.get(it.exId); const ids = await F.pickExercises({ single: true }); if (!ids || !ids[0]) return; if (!F.S.ex.get(ids[0])) return; it.exId = ids[0]; await F.savePlan(p); F.toast('Zamieniono ćwiczenie' + (cur ? ' (' + cur.name + ')' : '')); F.render(true); };

  /* ---------- raport tygodnia (punkt 6) ---------- */
  const wkStats = (a, b) => { let n = 0, sets = 0, vol = 0, pr = 0, min = 0, kc = 0; F.S.sessions.forEach(s => { if (s.start >= a && s.start < b) { n++; vol += F.sessionVolume(s); min += (s.dur || 0) / 60; s.exercises.forEach(e => e.sets.forEach(x => { if (F.isWork(x)) sets++; if (x.pr && x.pr.length) pr++; })); try { kc += F.sessKcal(s).net || 0; } catch (e) { } } }); return { n, sets, vol, pr, min: Math.round(min), kc: Math.round(kc) }; };
  const delta = (cur, prev, unit = '') => { if (!prev) return ''; const d = cur - prev; return d === 0 ? '<small class="dim"> bez zmian</small>' : `<small class="${d > 0 ? 'up' : 'dn'}"> ${d > 0 ? '+' : ''}${F.fmtNum ? F.fmtNum(round(d, 1)) : round(d, 1)}${unit} vs poprzedni</small>`; };
  const cardioCard = (plan, ws, now) => {
    if (!F.cardioWeek) return '';
    const c = F.cardioWeek(ws, now + 1); const m = plan && plan.meta && plan.meta.cardio; const band = m && m.band;
    const decl = (F.S.settings.wiz && F.S.settings.wiz.cNow && F.S.settings.wiz.cAct || []).filter(a => !a.plan);
    if (!c.raw && !band && !decl.length) return '';
    const lo = band ? band[0] : 0, hi = band ? band[1] : 0;
    const st = !band ? '' : c.eq >= lo ? `<p class="small">${ic('check', 16)} Cel tygodnia (${lo}–${hi} min w przeliczeniu na umiarkowane) osiągnięty lub blisko.</p>` : `<p class="small">Do dolnej granicy celu (${lo} min) brakuje jeszcze ok. ${lo - c.eq} min w przeliczeniu na umiarkowane. Cardio możesz dopisać ręcznie (np. pływanie, rolki) w nowym treningu.</p>`;
    const dl = decl.length ? `<p class="dim small">Poza aplikacją deklarowałeś: ${decl.map(a => E(F.CARDIO.label(a))).join(', ')} — wpisuj to ręcznie, jeśli chcesz, żeby się liczyło.</p>` : '';
    return `<section class="card cut"><h3>${ic('heart-pulse', 18)} Cardio w tym tygodniu</h3><p class="small">Zapisane: <b>${c.raw} min</b> (ok. ${c.eq} min w przeliczeniu na umiarkowane; intensywne liczy się podwójnie, lekkie wcale).</p>${st}${dl}</section>`;
  };

  V.report = () => {
    const now = Date.now(), ws = F.startOfWeek(now); const cur = wkStats(ws, ws + WK), prev = wkStats(ws - WK, ws), prev2 = wkStats(ws - 2 * WK, ws - WK);
    const last = prev.n || prev2.n ? { lab: 'Ostatni pełny tydzień', s: prev, p: prev2 } : null;
    if (!F.S.sessions.length) return { html: `${F.head('Raport tygodnia', { back: 1 })}<div class="empty"><h3>Brak danych</h3><p>Po pierwszym treningu pojawi się tu podsumowanie tygodnia i propozycje korekt planu.</p></div>` };
    const plan = activePlan(); const an = plan ? F.coachAnalyze(plan) : null;
    const bw = F.S.bw.filter(b => b.date >= now - 14 * DAY); const bwNow = bw.length ? bw[bw.length - 1].kg : 0; const bwOld = bw.length > 1 ? bw[0].kg : 0;
    const tile = (l, v, d) => `<div><small>${l}</small><b>${v}</b>${d || ''}</div>`;
    const stat = (s, p) => `<div class="sum-stats">${tile('Treningi', s.n, delta(s.n, p && p.n))}${tile('Serie', s.sets, delta(s.sets, p && p.sets))}${tile('Tonaż', F.fmtVol(s.vol), '')}${tile('Rekordy', s.pr, '')}</div>`;
    const ps = plan ? planSets(plan) : {}, d7 = weekSets(now - WK, now + 1);
    const vol = Object.keys(ps).length ? `<section class="card cut"><h3>${ic('chart-column', 18)} Serie: plan a wykonanie (7 dni)</h3>${Object.entries(ps).map(([m, n]) => { const d = d7[m] || 0; const pct = Math.min(100, Math.round(d / Math.max(n, 1) * 100)); return `<div class="wz-v"><span>${MU[m] || m}</span><div class="bar"><i style="width:${Math.max(pct, 3)}%"></i></div><b class="${d >= n * 0.8 ? '' : 'warn'}">${d}</b><small class="dim">z ${n}</small></div>`; }).join('')}</section>` : '';
    const sug = an ? (an.items.length ? an.items.map(i => `<div class="coach-i sev${i.sev}"><b>${E(i.t)}</b><p class="small">${E(i.d)}</p>${i.act ? `<button class="btn ghost sm" data-a="${i.act.id}" data-args="${i.act.a ? E(JSON.stringify(i.act.a)) : ''}">${E(i.act.l)}</button>` : ''}</div>`).join('') : `<p class="small">${ic('check', 16)} Plan „${E(plan.name)}” działa jak należy. Nie widzę powodu do zmian — kontynuuj, a ciężary zwiększaj zgodnie z podpowiedziami podczas treningu.</p>`) : `<p class="small dim">Korekty pojawią się, gdy zaczniesz trenować według zapisanego planu.</p>`;
    return { html: `${F.head('Raport tygodnia', { back: 1, sub: 'Jak Ci idzie i co zmienić' })}
      <section class="card cut"><h3>${ic('calendar', 18)} Ten tydzień</h3>${stat(cur, prev)}<p class="dim small">${cur.n ? `Czas: ${cur.min} min · spalone ok. ${F.fmtNum ? F.fmtNum(cur.kc) : cur.kc} kcal` : 'Jeszcze bez treningu w tym tygodniu.'}</p></section>
      ${last ? `<section class="card cut"><h3>${ic('rotate-ccw', 18)} ${last.lab}</h3>${stat(last.s, last.p)}</section>` : ''}
      ${bwNow && bwOld ? `<section class="card cut"><h3>${ic('scale', 18)} Masa ciała</h3><p class="small">Ostatnie 2 tygodnie: ${F.fwu(bwOld)} → <b>${F.fwu(bwNow)}</b> (${bwNow - bwOld > 0 ? '+' : ''}${F.fwu(Math.abs(bwNow - bwOld)).replace(/^/, bwNow - bwOld < 0 ? '−' : '')}). Pojedyncze ważenia wahają się o 1–2 kg przez wodę i zawartość jelit — patrz na trend z kilku tygodni.</p></section>` : ''}
      ${vol}
      ${cardioCard(plan, ws, now)}
      <section class="card cut"><h3>${ic('sparkles', 18)} Co zmienić${plan ? ' w planie „' + E(plan.name) + '”' : ''}</h3>${an && an.meso ? `<p class="dim small">Tydzień ${an.week} planu${an.week <= an.meso ? ' z ' + an.meso + ' (potem odciążenie)' : ''}.</p>` : ''}${sug}</section>
      <p class="dim small pad">Korekty to propozycje oparte na Twoich zapisanych treningach — decyzja zawsze należy do Ciebie. Przy bólu lub chorobie skonsultuj się ze specjalistą.</p>` };
  };

  /* ---------- żywienie (punkt 5) ---------- */
  // wartości na 100 g produktu (surowego, chyba że podano inaczej), przybliżone: [kcal, białko, węgle, tłuszcz]
  const FOOD = {
    oats: ['Płatki owsiane', 370, 13, 60, 7], rice: ['Ryż biały (ugotowany)', 130, 2.7, 28, 0.3], potato: ['Ziemniaki (ugotowane)', 77, 2, 17, 0.1], bread: ['Chleb razowy', 250, 9, 45, 3], pasta: ['Makaron (ugotowany)', 158, 6, 31, 1],
    chicken: ['Pierś z kurczaka (surowa)', 120, 22.5, 0, 2.6], turkey: ['Pierś z indyka (surowa)', 110, 22, 0, 2], beef: ['Chuda wołowina (surowa)', 135, 21, 0, 5], salmon: ['Łosoś (surowy)', 208, 20, 0, 13], cod: ['Dorsz (surowy)', 82, 18, 0, 0.7],
    egg: ['Jajka', 143, 12.6, 0.7, 9.5], skyr: ['Skyr naturalny', 63, 11, 4, 0.2], cottage: ['Twaróg półtłusty', 98, 11, 3.4, 4.3], yogurt: ['Jogurt grecki', 97, 9, 4, 5], milk: ['Mleko 2%', 50, 3.4, 4.8, 2],
    banana: ['Banan', 89, 1.1, 23, 0.3], apple: ['Jabłko', 52, 0.3, 14, 0.2], berries: ['Owoce jagodowe', 50, 0.7, 12, 0.3], oil: ['Oliwa z oliwek', 884, 0, 0, 100], pb: ['Masło orzechowe', 588, 25, 20, 50], almonds: ['Migdały', 579, 21, 22, 50], veg: ['Warzywa (mieszanka)', 30, 1.8, 5, 0.3],
    lentils: ['Soczewica (ugotowana)', 116, 9, 20, 0.4], chickpeas: ['Ciecierzyca (ugotowana)', 164, 9, 27, 2.6], tofu: ['Tofu', 76, 8, 1.9, 4.8]
  };
  const NUT_T = {
    bf: [['oats', 'carb'], ['skyr', 'prot'], ['banana', 'fix', 100], ['almonds', 'fat']],
    bf2: [['bread', 'carb'], ['egg', 'prot'], ['veg', 'fix', 100], ['oil', 'fat']],
    mainA: [['rice', 'carb'], ['chicken', 'prot'], ['veg', 'fix', 200], ['oil', 'fat']],
    mainB: [['potato', 'carb'], ['salmon', 'prot'], ['veg', 'fix', 200], ['oil', 'fat']],
    mainC: [['pasta', 'carb'], ['turkey', 'prot'], ['veg', 'fix', 200], ['oil', 'fat']],
    mainD: [['rice', 'carb'], ['beef', 'prot'], ['veg', 'fix', 200], ['oil', 'fat']],
    mainV: [['rice', 'carb'], ['tofu', 'prot'], ['veg', 'fix', 200], ['oil', 'fat']],
    mainV2: [['pasta', 'carb'], ['lentils', 'prot'], ['veg', 'fix', 200], ['oil', 'fat']],
    sn: [['cottage', 'prot'], ['apple', 'carb'], ['almonds', 'fat']],
    sn2: [['yogurt', 'prot'], ['berries', 'carb'], ['pb', 'fat']]
  };
  const nutPlan = () => {
    const s = F.S.settings, nu = s.nut || {}; const p = F.profile(); const age = F.ageNow();
    if (!p.sexKnown || !age || !p.heightKnown || !p.bwKnown || !s.activity) return { missing: true };
    if (age < 18) return { block: 'Dla osób poniżej 18. roku życia nie podaję celów kalorycznych ani odchudzania — organizm jest w okresie wzrostu. Porozmawiaj z lekarzem lub dietetykiem.' };
    if (nu.ed) return { block: 'Przy zaburzeniach odżywiania liczenie kalorii i makroskładników może szkodzić. Nie podaję liczb — omów żywienie z lekarzem, psychologiem lub dietetykiem.' };
    const tdee = F.tdee(p); let train = 0; try { train = F.kcalTotals(28) / 28; } catch (e) { }
    const total = tdee + train; const bmi = p.bw / Math.pow(p.height / 100, 2);
    const mode = nu.mode || ((s.wiz && s.wiz.goal === 'sculpt') ? 'cut' : (s.wiz && s.wiz.goal === 'hyp' && bmi < 27 ? 'bulk' : 'keep'));
    const preg = (s.wiz && s.wiz.special === 'preg');
    let k = total, note = '';
    if (mode === 'cut' && !preg) { k = total * 0.85; note = 'Deficyt ok. 15% — umiarkowane tempo, które lepiej chroni mięśnie.'; }
    else if (mode === 'bulk' && !preg) { if (bmi >= 27) { k = total; note = 'Przy BMI od 27 nie zalecam nadwyżki — lepiej budować siłę i mięśnie przy zbilansowanej diecie.'; } else { k = total * 1.08; note = 'Niewielka nadwyżka ok. 8% — mniej tłuszczu w przyroście.'; } }
    else note = 'Utrzymanie masy ciała.';
    const floor = Math.max(F.bmr(p), p.sex === 'f' ? 1200 : 1500); if (k < floor) { k = floor; note += ' Podniosłem do bezpiecznego minimum.'; }
    k = Math.round(k / 10) * 10;
    // masa referencyjna dla białka: przy BMI ≥ 30 licz od masy należnej (BMI 25)
    const ref = bmi >= 30 ? 25 * Math.pow(p.height / 100, 2) : p.bw;
    const pLo = round(ref * 1.4), pHi = round(ref * 2.0); const prot = Math.round(ref * (mode === 'cut' ? 1.9 : 1.7)); const fat = Math.round(k * 0.27 / 9); const carb = Math.max(0, Math.round((k - prot * 4 - fat * 9) / 4));
    return { k, tdee: Math.round(total), train: Math.round(train), mode, note, prot, pLo, pHi, fat, carb, bmi, refMass: Math.round(ref), floor: Math.round(floor), p };
  };
  const mealPlan = (np, n, veg, seed) => {
    const names = n === 3 ? ['Śniadanie', 'Obiad', 'Kolacja'] : n === 4 ? ['Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'] : ['Śniadanie', 'II śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];
    const share = n === 3 ? [0.28, 0.4, 0.32] : n === 4 ? [0.25, 0.33, 0.12, 0.3] : [0.22, 0.12, 0.3, 0.12, 0.24];
    const mains = veg ? ['mainV', 'mainV2'] : ['mainA', 'mainB', 'mainC', 'mainD']; let mi = seed;
    return names.map((nm, i) => {
      const small = /Przekąska|II śn/.test(nm); const tpl = i === 0 ? (seed % 2 ? 'bf2' : 'bf') : small ? (seed % 2 ? 'sn2' : 'sn') : mains[mi++ % mains.length];
      const K = np.k * share[i], P = np.prot * share[i], C = np.carb * share[i], Fa = np.fat * share[i]; const T = NUT_T[tpl]; const g = {};
      let p0 = 0, c0 = 0, f0 = 0; T.forEach(([id, role, fx]) => { if (role === 'fix') { g[id] = fx; const d = FOOD[id]; p0 += d[2] * fx / 100; c0 += d[3] * fx / 100; f0 += d[4] * fx / 100; } });
      const protId = T.find(t => t[1] === 'prot')[0], carbId = (T.find(t => t[1] === 'carb') || [])[0], fatId = (T.find(t => t[1] === 'fat') || [])[0];
      const fatIn = (id, x) => FOOD[id][4] * x / 100;
      // białko: dobierz porcję produktu białkowego
      const pd = FOOD[protId]; let gp = Math.max(40, (P - p0) / (pd[2] / 100) * 0.9); gp = Math.min(gp, 350); g[protId] = gp; p0 += pd[2] * gp / 100; c0 += pd[3] * gp / 100; f0 += pd[4] * gp / 100;
      if (carbId) { const cd = FOOD[carbId]; let gc = Math.max(30, (C - c0) / (cd[3] / 100)); gc = Math.min(gc, 450); g[carbId] = gc; p0 += cd[2] * gc / 100; c0 += cd[3] * gc / 100; f0 += cd[4] * gc / 100; }
      if (fatId) { const fd = FOOD[fatId]; let gf = Math.max(5, (Fa - f0) / (fd[4] / 100)); gf = Math.min(gf, fatId === 'oil' ? 25 : 40); g[fatId] = gf; p0 += fd[2] * gf / 100; c0 += fd[3] * gf / 100; f0 += fd[4] * gf / 100; }
      if (carbId) { const cd = FOOD[carbId]; const cur = Object.entries(g).reduce((a, [id, x]) => a + FOOD[id][1] * x / 100, 0); g[carbId] = Math.min(450, Math.max(30, g[carbId] + (K - cur) / (cd[1] / 100))); }
      if (g.egg) g.egg = Math.min(g.egg, 240);
      const rows = Object.entries(g).map(([id, x]) => { const unit = id === 'egg' ? Math.round(x / 60) : 0; const step = id === 'oil' ? 5 : 10; return { id, name: FOOD[id][0], g: Math.max(step, Math.round(x / step) * step), unit }; });
      const tot = rows.reduce((a, r) => { const d = FOOD[r.id]; a.k += d[1] * r.g / 100; a.p += d[2] * r.g / 100; a.c += d[3] * r.g / 100; a.f += d[4] * r.g / 100; return a; }, { k: 0, p: 0, c: 0, f: 0 });
      return { name: nm, rows, tot, target: K };
    });
  };
  F.act.nutSet = b => { const s = F.S.settings; s.nut = { ...(s.nut || {}), [b.dataset.k]: b.dataset.n ? +b.dataset.v : b.dataset.v === '1' ? true : b.dataset.v === '0' ? false : b.dataset.v }; F.saveSettings(); F.render(true); };
  F.act.nutAgain = () => { F.ui.nutSeed = (F.ui.nutSeed || 0) + 1; F.render(true); };
  V.nutrition = () => {
    const np = nutPlan(); const s = F.S.settings, nu = s.nut || {}; const head = F.head('Żywienie', { back: 1, sub: 'Kalorie i przykładowy dzień' });
    if (np.missing) return { html: `${head}<div class="empty"><h3>Uzupełnij dane</h3><p>Do wyliczenia potrzebuję płci, daty urodzenia, wzrostu, masy ciała i poziomu aktywności w ciągu dnia. Wpiszesz je w profilu lub w kreatorze planu.</p><a class="btn primary" href="#/settings">Otwórz profil</a></div>` };
    const ed = `<label class="sw"><span><b>Mam lub miałem(am) zaburzenia odżywiania</b><small>wtedy nie pokażę liczb</small></span><input type="checkbox" data-a="nutSet" data-k="ed" data-v="${nu.ed ? '0' : '1'}" ${nu.ed ? 'checked' : ''}><i></i></label>`;
    if (np.block) return { html: `${head}<section class="card cut"><p class="small">${E(np.block)}</p>${nu.ed ? ed : ''}</section>` };
    const n = nu.meals || 4, veg = !!nu.veg, seed = F.ui.nutSeed || 0; const meals = mealPlan(np, n, veg, seed);
    const chip = (on, k, v, l, num) => `<button class="chip ${on ? 'on' : ''}" data-a="nutSet" data-k="${k}" data-v="${v}" ${num ? 'data-n="1"' : ''}>${l}</button>`;
    const modeL = { cut: 'Redukcja', keep: 'Utrzymanie', bulk: 'Przyrost' }; const tot = meals.reduce((a, m) => ({ k: a.k + m.tot.k, p: a.p + m.tot.p, c: a.c + m.tot.c, f: a.f + m.tot.f }), { k: 0, p: 0, c: 0, f: 0 });
    return { html: `${head}
      <section class="card cut"><h3>${ic('flame', 18)} Twoje zapotrzebowanie</h3>
        <div class="chips">${['cut', 'keep', 'bulk'].map(m => chip(np.mode === m, 'mode', m, modeL[m])).join('')}</div>
        <div class="sum-stats"><div><small>Cel dzienny</small><b>${F.fmtNum ? F.fmtNum(np.k) : np.k} kcal</b></div><div><small>Białko</small><b>${np.prot} g</b></div><div><small>Tłuszcz</small><b>${np.fat} g</b></div><div><small>Węglowodany</small><b>${np.carb} g</b></div></div>
        <p class="small">${E(np.note)}</p>
        <p class="dim small">Zapotrzebowanie bez treningu ≈ ${np.tdee - np.train} kcal + średnio ${np.train} kcal dziennie z treningów (ostatnie 4 tygodnie). Szacunek ma błąd rzędu ±10% — po 2–3 tygodniach porównaj z trendem masy ciała i skoryguj o 100–200 kcal.</p>
        <p class="dim small">Białko: dla większości osób ćwiczących wystarcza 1,4–2,0 g na kg masy ciała (zalecenie ISSN)${np.bmi >= 30 ? `; przy BMI ≥ 30 liczę od masy należnej (${np.refMass} kg)` : ''}, czyli ${np.pLo}–${np.pHi} g dziennie, rozłożone na kilka posiłków po ok. 0,25 g/kg. Tłuszcz ≈ 27% kalorii, resztę wypełniają węglowodany.</p></section>
      <section class="card cut"><h3>${ic('layers', 18)} Przykładowy dzień</h3>
        <div class="chips">${[3, 4, 5].map(x => chip(n === x, 'meals', x, x + (x === 5 ? ' posiłków' : ' posiłki'), 1)).join('')}${chip(veg, 'veg', veg ? '0' : '1', 'Bez mięsa i ryb')}</div>
        ${meals.map(m => `<div class="meal"><div class="wz-dh"><h4>${m.name}</h4><small class="dim">${Math.round(m.tot.k)} kcal · B ${Math.round(m.tot.p)} g</small></div>${m.rows.map(r => `<div class="meal-r"><span>${E(r.name)}</span><b>${r.id === 'egg' ? r.unit + ' szt.' : r.g + ' g'}</b></div>`).join('')}</div>`).join('')}
        <p class="small"><b>Razem:</b> ${Math.round(tot.k)} kcal · białko ${Math.round(tot.p)} g · węgle ${Math.round(tot.c)} g · tłuszcz ${Math.round(tot.f)} g.</p>
        <button class="btn ghost sm" data-a="nutAgain">${ic('repeat', 16)} Inna propozycja</button>
        <p class="dim small">To jeden z wielu możliwych zestawów — wagi produktów surowych, jeśli nie podano inaczej; wartości odżywcze są przybliżone. Zamieniaj produkty na podobne i dopasuj do smaku. Przy chorobach, ciąży, alergiach lub zaburzeniach odżywiania skonsultuj dietę ze specjalistą.</p></section>
      <section class="card cut">${ed}</section>` };
  };
})();
