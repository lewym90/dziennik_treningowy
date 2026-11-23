/* FORGE — trener w telefonie: raport tygodnia i korekty planu (#/report). Żywienie: js/nutrition.js. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const DAY = 864e5, WK = 7 * DAY;
  const round = (v, n = 0) => { const k = Math.pow(10, n); return Math.round(v * k) / k; };
  const MU = { chest: 'Klatka', back: 'Plecy', shoulders: 'Barki', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Przedramiona', abs: 'Brzuch', quads: 'Czworogłowe', hams: 'Dwugłowe', glutes: 'Pośladki', calves: 'Łydki', full: 'Całe ciało', cardio: 'Cardio' };

  /* ---------- wspólne ---------- */
  const activePlan = () => { const nx = F.nextWorkout && F.nextWorkout(); return nx ? nx.plan : null; };
  const workSets = (sess, exId) => { const out = []; sess.exercises.forEach(e => { if (e.exId === exId) e.sets.forEach(s => { if (F.isWork(s)) out.push(s); }); }); return out; };
  const parseReps = r => { const m = String(r || '').match(/(\d+)(?:\s*[-–]\s*(\d+))?/); return m ? [+m[1], +(m[2] || m[1])] : [0, 0]; };
  const e1 = (ex, s, ts) => F.e1rm(F.effLoad(ex, s, ts), s.r);
  const weekSets = (a, b) => { const out = {}; F.S.sessions.forEach(se => { if (se.start < a || se.start >= b) return; se.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); if (!ex) return; const n = e.sets.filter(F.isWork).length; out[ex.muscle] = (out[ex.muscle] || 0) + n; }); }); return out; };
  const planSets = plan => { const out = {}; plan.days.forEach(d => d.items.forEach(i => { const ex = F.S.ex.get(i.exId); if (ex && ex.muscle !== 'cardio') out[ex.muscle] = (out[ex.muscle] || 0) + (+i.sets || 0); })); return out; };

  /* ---------- blok treningowy (mezocykl): tydzień, docelowy zapas powtórzeń, odciążenie ---------- */
  F.blockInfo = plan => {
    if (!plan || !plan.meta || !plan.meta.meso) return null; const L = plan.meta.meso, exp = plan.meta.exp || 'mid', now = Date.now(), st = F.S.settings;
    const dlStart = Math.max(st.lastDeload || 0, (st.deloadUntil || 0) - WK); const cycle = Math.max(dlStart > plan.created ? dlStart + WK : plan.created, plan.meta.blockStart || 0);
    const wk = Math.max(1, Math.floor((now - cycle) / WK) + 1); const target = { beg: 2, mid: 1, adv: 1 }[exp] || 1;
    const rir = wk >= L ? null : Math.min(3, Math.max(target, 3 - Math.round((wk - 1) * (3 - target) / Math.max(1, L - 2))));
    return { week: Math.min(wk, L), weeks: L, over: wk > L, deload: wk === L, rir, start: cycle };
  };
  F.act.blockNext = async () => { const nx = F.nextWorkout(); if (!nx) return; nx.plan.meta = nx.plan.meta || {}; nx.plan.meta.blockStart = Date.now(); await F.savePlan(nx.plan); F.closeSheet(true); F.toast('Nowy blok: tydzień 1', 'hot'); F.render(true); };
  F.act.blockSum = () => {
    const nx = F.nextWorkout(); if (!nx) return; const b = F.blockInfo(nx.plan); if (!b) return; const ss = F.S.sessions.filter(s => s.planId === nx.plan.id && s.start >= b.start);
    const w1 = ss.filter(s => s.start < b.start + WK), wl = ss.filter(s => s.start >= b.start + (b.weeks - 2) * WK && s.start < b.start + (b.weeks - 1) * WK);
    const vol = a => a.reduce((x, s) => x + F.sessionVolume(s), 0), prs = ss.reduce((x, s) => x + (s.prs || []).length, 0);
    F.sheet(`<div class="tiles three"><div class="tile cut"><span class="tl">Treningi</span><b class="tv sm">${ss.length}</b></div><div class="tile cut"><span class="tl">Rekordy</span><b class="tv sm">${prs}</b></div><div class="tile cut"><span class="tl">Tonaż</span><b class="tv sm">${F.fmtVol(vol(ss))}</b></div></div>
      <p class="sheet-p">Tonaż tygodnia: na początku bloku ${F.fmtVol(vol(w1))}, w ostatnim tygodniu przed odciążeniem ${F.fmtVol(vol(wl))}.</p>
      <p class="dim small">Kolejny blok zaczyna się od większego zapasu powtórzeń i znowu go zmniejsza. Ciężary zostają — zwiększasz je, gdy dobijasz do górnej granicy powtórzeń z zapasem.</p>
      <button class="btn primary wide" data-a="blockNext">${ic('repeat', 18)} Zacznij następny blok</button><a class="btn ghost wide" href="#/wizard" data-a="newWizard">${ic('sparkles', 18)} Ułóż nowy plan w kreatorze</a>`, { title: 'Blok zakończony' });
  };

  /* ---------- analiza planu (punkt 1: plan reagujący na postępy) ---------- */
  F.coachAnalyze = plan => {
    const out = []; const now = Date.now(); const strength = plan.days.length;
    const sess = F.S.sessions.filter(s => s.planId === plan.id).sort((a, b) => b.start - a.start);
    // cykl liczymy od utworzenia planu, a po odciążeniu od jego końca
    const st = F.S.settings; const dlStart = Math.max(st.lastDeload || 0, (st.deloadUntil || 0) - WK); const cycle = Math.max(dlStart > plan.created ? dlStart + WK : plan.created, (plan.meta && plan.meta.blockStart) || 0);
    const wk = Math.max(1, Math.floor((now - cycle) / WK) + 1); const mesoW = plan.meta && plan.meta.meso || 0;
    // adherencja: ostatnie 2 pełne tygodnie
    const ws = F.startOfWeek(now); const c1 = F.S.sessions.filter(s => s.start >= ws - WK && s.start < ws).length, c2 = F.S.sessions.filter(s => s.start >= ws - 2 * WK && s.start < ws - WK).length;
    const planned = plan.days.filter(d => !/^Cardio/.test(d.name)).length || strength;
    if (sess.length >= 2 && c1 < planned * 0.5 && c2 < planned * 0.5) out.push({ k: 'adh', sev: 2, t: `Wykonujesz mniej niż połowę zaplanowanych treningów (${c1} i ${c2} z ${planned} w ostatnich dwóch tygodniach).`, d: 'Lepiej mieć plan na mniej dni, który zrealizujesz, niż idealny na papierze. Ułóż go ponownie w kreatorze na realną liczbę dni.', act: { id: 'coachWizard', l: 'Ułóż plan na mniej dni' } });
    // mezocykl / odciążenie
    if (mesoW && wk >= mesoW && !F.deloadOn() && sess.length) out.push({ k: 'deload', sev: 1, t: `Tydzień ${wk} planu: czas na tydzień odciążenia.`, d: 'To koniec zaplanowanego cyklu (' + mesoW + ' tygodni). Lżejszy tydzień (mniej serii przy podobnym ciężarze i większym zapasie powtórzeń) to praktyka oparta na konsensusie ekspertów. Przez 7 dni aplikacja zmniejszy liczbę serii o połowę, a ciężar zostawi bez zmian.', act: { id: 'coachDeload', l: 'Włącz tydzień odciążenia' } });
    // per ćwiczenie
    const seen = new Set();
    plan.days.forEach((d, di) => d.items.forEach((it, ii) => {
      if (seen.has(it.exId)) return; seen.add(it.exId); const ex = F.S.ex.get(it.exId); if (!ex || ex.type === 'time') return;
      const hist = sess.filter(s => !s.deload && workSets(s, it.exId).length).slice(0, 5); if (hist.length < 3) return;
      const [lo, hi] = parseReps(it.reps); const last2 = hist.slice(0, 2);
      // za ciężko: powtórzenia poniżej zakresu w obu ostatnich sesjach lub RPE ≥ 9,5
      const below = last2.every(s => { const w = workSets(s, it.exId); return lo && w.filter(x => x.r < lo).length >= Math.ceil(w.length / 2); });
      const rp = last2.flatMap(s => workSets(s, it.exId)).map(x => x.rpe).filter(Boolean); const rpAvg = rp.length >= 4 ? rp.reduce((a, b) => a + b, 0) / rp.length : 0;
      const tooHard = below || (rpAvg >= 9.5 && (+it.sets || 0) > 2);
      // stagnacja: najlepszy e1RM nie rośnie w 4 sesjach
      const best = hist.slice(0, 4).map(s => Math.max(...workSets(s, it.exId).map(x => e1(ex, x, s.start)))).reverse();
      const stag = hist.length >= 4 && best[3] <= best[0] * 1.005 && best[2] <= best[0] * 1.02 && best[1] <= best[0] * 1.02;
      if (tooHard && (+it.sets || 0) > 2) out.push({ k: 'hard', sev: 2, t: `${ex.name}: wygląda na zbyt ciężkie.`, d: below ? `W dwóch ostatnich treningach większość serii była poniżej ${lo} powtórzeń.` : 'Średnie RPE w ostatnich seriach to ' + round(rpAvg, 1) + '.', act: { id: 'coachSets', l: 'Zmniejsz o 1 serię', a: { p: plan.id, di, ii, dl: -1 } } });
      else if (stag) out.push({ k: 'stag', sev: 1, t: `${ex.name}: brak postępu od 4 treningów.`, d: 'Najlepszy wyliczony ciężar maksymalny (1RM) nie rośnie. Sprawdź sen i jedzenie, a jeśli to nic nie zmienia — zamień ćwiczenie na wariant (inny kąt, inny sprzęt).', act: { id: 'coachSwap', l: 'Zamień ćwiczenie', a: { p: plan.id, di, ii } } });
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
  F.act.coachDeload = async () => { F.S.settings.deloadUntil = Date.now() + WK; F.S.settings.lastDeload = Date.now(); F.saveSettings(); F.toast('Tydzień odciążenia włączony: połowa serii, ten sam ciężar'); F.render(true); };
  F.act.coachSets = async b => { const a = JSON.parse(b.dataset.args), p = F.planOf(a.p); if (!p) return; const it = p.days[a.di].items[a.ii]; it.sets = Math.max(2, (+it.sets || 3) + a.dl); await F.savePlan(p); F.toast('Zmieniono liczbę serii'); F.render(true); };
  F.act.coachSwap = async b => { const a = JSON.parse(b.dataset.args), p = F.planOf(a.p); if (!p) return; const it = p.days[a.di].items[a.ii]; const cur = F.S.ex.get(it.exId); const nid = await F.swapSheet(it.exId, p.days[a.di].items.map(x => x.exId)); if (!nid || !F.S.ex.get(nid)) return; const r0 = it.role || F.restRole(it.exId), r1 = F.restRole(nid); if ((r0 === 'iso') !== (r1 === 'iso')) it.rest = F.restFor(nid, p, r1); const kc = { goal: (p.meta || {}).goal, prio: (p.meta || {}).prio || [] }; const k0 = F.PLN && F.PLN.keyOf ? F.PLN.keyOf(it, kc).join() : ''; it.role = r1; it.exId = nid; const day = p.days[a.di]; if (F.placeInPlan && F.PLN.keyOf(it, kc).join() !== k0) F.placeInPlan(p, day, day.items.indexOf(it)); await F.savePlan(p); F.toast('Zamieniono ćwiczenie' + (cur ? ' (' + cur.name + ')' : '')); F.render(true); };

  /* ---------- raport tygodnia (punkt 6) ---------- */
  const wkStats = (a, b) => { let n = 0, sets = 0, vol = 0, pr = 0, min = 0, kc = 0; F.S.sessions.forEach(s => { if (s.start >= a && s.start < b) { n++; vol += F.sessionVolume(s); min += (s.dur || 0) / 60; s.exercises.forEach(e => e.sets.forEach(x => { if (F.isWork(x)) sets++; if (x.pr && x.pr.length) pr++; })); try { kc += F.sessKcal(s).net || 0; } catch (e) { } } }); return { n, sets, vol, pr, min: Math.round(min), kc: Math.round(kc) }; };
  const delta = (cur, prev, unit = '') => { if (!prev) return ''; const d = cur - prev; return d === 0 ? '<small class="dim"> bez zmian</small>' : `<small class="${d > 0 ? 'up' : 'dn'}"> ${d > 0 ? '+' : ''}${F.fmtNum ? F.fmtNum(round(d, 1)) : round(d, 1)}${unit} vs poprzedni</small>`; };
  const cardioCard = (plan, ws, now) => {
    if (!F.cardioWeek) return '';
    const c = F.cardioWeek(ws, now + 1); const m = plan && plan.meta && plan.meta.cardio; const band = m && m.band;
    const decl = (F.S.settings.wiz && F.S.settings.wiz.cNow && F.S.settings.wiz.cAct || []).filter(a => !a.plan);
    if (!c.raw && !band && !decl.length) return '';
    const lo = band ? band[0] : 0, hi = band ? band[1] : 0;
    const st = !band ? '' : c.eq >= lo ? `<p class="small">${ic('check', 16)} Cel tygodnia (${lo}–${hi} min w przeliczeniu na umiarkowane) osiągnięty lub blisko.</p>` : `<p class="small">Do dolnej granicy celu (${lo} min) brakuje jeszcze ${lo - c.eq} min w przeliczeniu na umiarkowane. Cardio możesz dopisać ręcznie (np. pływanie, rolki) w nowym treningu.</p>`;
    const dl = decl.length ? `<p class="dim small">Poza aplikacją deklarowałeś: ${decl.map(a => E(F.CARDIO.label(a))).join(', ')} — wpisuj to ręcznie, jeśli chcesz, żeby się liczyło.</p>` : '';
    return `<section class="card cut"><h3>${ic('heart-pulse', 18)} Cardio w tym tygodniu</h3><p class="small">Zapisane: <b>${c.raw} min</b> (${c.eq} min w przeliczeniu na umiarkowane; intensywne liczy się podwójnie, lekkie wcale).</p>${st}${dl}</section>`;
  };

  V.report = () => {
    const tab = F.ui.repTab || 'w'; if (tab !== 'w' && F.S.sessions.length) return F.reportPeriod(tab);
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
    return { html: `${F.head('Raport', { back: 1, sub: 'Jak Ci idzie i co zmienić' })}${F.repSeg()}
      <section class="card cut"><h3>${ic('calendar', 18)} Ten tydzień</h3>${stat(cur, prev)}<p class="dim small">${cur.n ? `Czas: ${cur.min} min · wyliczone spalanie ${F.fmtNum ? F.fmtNum(cur.kc) : cur.kc} kcal` : 'Jeszcze bez treningu w tym tygodniu.'}</p></section>
      ${last ? `<section class="card cut"><h3>${ic('rotate-ccw', 18)} ${last.lab}</h3>${stat(last.s, last.p)}</section>` : ''}
      ${bwNow && bwOld ? `<section class="card cut"><h3>${ic('scale', 18)} Masa ciała</h3><p class="small">Ostatnie 2 tygodnie: ${F.fwu(bwOld)} → <b>${F.fwu(bwNow)}</b> (${bwNow - bwOld > 0 ? '+' : ''}${F.fwu(Math.abs(bwNow - bwOld)).replace(/^/, bwNow - bwOld < 0 ? '−' : '')}). Pojedyncze ważenia wahają się z dnia na dzień (woda, zawartość jelit) — patrz na trend z kilku tygodni.</p></section>` : ''}
      ${vol}
      ${cardioCard(plan, ws, now)}
      <section class="card cut"><h3>${ic('sparkles', 18)} Co zmienić${plan ? ' w planie „' + E(plan.name) + '”' : ''}</h3>${an && an.meso ? `<p class="dim small">Tydzień ${an.week} planu${an.week < an.meso ? ' z ' + an.meso + ' (ostatni to odciążenie)' : an.week === an.meso ? ' z ' + an.meso + ' (czas na odciążenie)' : ''}.</p>` : ''}${sug}</section>
      <p class="dim small pad">Korekty to propozycje oparte na Twoich zapisanych treningach — decyzja zawsze należy do Ciebie. Przy bólu lub chorobie skonsultuj się ze specjalistą.</p>` };
  };

})();
