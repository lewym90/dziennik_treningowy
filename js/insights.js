/* FORGE — regeneracja mięśni, wnioski z treningów, raporty miesięczne i roczne, cele miesięczne. Same obliczenia na danych z telefonu, bez sieci. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const MG = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'quads', 'hams', 'glutes', 'calves'], BIG = new Set(['chest', 'back', 'quads', 'hams', 'glutes']);
  const GREEN = '#8fcb72'; const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pct = (a, b) => b ? Math.round((a - b) / b * 100) : 0; const sign = n => (n > 0 ? '+' : '') + n;
  const MON = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- regeneracja ---------- */
  // szacunek: im więcej serii na partię w jednym treningu, tym dłuższa przerwa; duże partie 24–72 h, małe 18–48 h
  F.recoveryNeed = (m, sets) => BIG.has(m) ? clamp(24 + sets * 3.5, 24, 72) : clamp(18 + sets * 2.5, 18, 48);
  F.recovery = (now = Date.now()) => {
    const out = {}; MG.forEach(m => { out[m] = { rem: 0, need: 0, st: 'ready', sets: 0 }; });
    F.S.sessions.forEach(se => {
      const end = se.end || se.start; if (now - end > 4 * 864e5 || end > now) return; const eff = {};
      se.exercises.forEach(e => {
        const ex = F.S.ex.get(e.exId); if (!ex) return; const n = e.sets.filter(F.isWork).length; if (!n) return;
        if (out[ex.muscle]) eff[ex.muscle] = (eff[ex.muscle] || 0) + n;
        F.secondaryOf(e.exId).forEach(m => { if (out[m] && m !== ex.muscle) eff[m] = (eff[m] || 0) + n * .5; });
      });
      const el = (now - end) / 36e5;
      Object.entries(eff).forEach(([m, sets]) => {
        if (sets < 2) return; const need = F.recoveryNeed(m, sets), rem = need - el;
        if (rem > out[m].rem) out[m] = { rem, need, sets, st: el < need * .4 ? 'fresh' : 'rec' };
      });
    });
    return out;
  };
  const STT = { ready: 'Gotowe', rec: 'W regeneracji', fresh: 'Świeżo po pracy' };
  F.statsRecovery = () => {
    const r = F.recovery(), colors = {}; MG.forEach(m => { colors[m] = r[m].st === 'fresh' ? 'a1' : r[m].st === 'rec' ? 'a2' : GREEN; });
    const sorted = [...MG].sort((a, b) => r[b].rem - r[a].rem), tired = sorted.filter(m => r[m].rem > 0);
    const nx = F.nextWorkout(); let tip;
    const busy = nx ? [...new Set(nx.day.items.flatMap(i => F.exMuscles(i.exId).p))].filter(m => r[m] && r[m].st === 'fresh') : [];
    if (!F.S.sessions.length) tip = 'Zrób pierwszy trening, a mapa pokaże, co odpoczywa.';
    else if (busy.length) tip = `Następny trening <b>${E(nx.day.name)}</b> obciąża partie świeżo po pracy: <b>${busy.map(m => F.MUSCLES[m].toLowerCase()).join(', ')}</b>.`;
    else if (tired.length) tip = `Jeszcze odpoczywają: <b>${tired.slice(0, 4).map(m => F.MUSCLES[m].toLowerCase()).join(', ')}</b>. Reszta jest gotowa.`;
    else tip = 'Wszystkie partie są gotowe do pracy.';
    const legend = [['ready', GREEN], ['rec', 'var(--a2)'], ['fresh', 'var(--a1)']].map(([k, c]) => `<span><i style="background:${c}"></i>${STT[k]}</span>`).join('');
    return `<section class="card cut mmap"><div class="mmap-b"><figure>${F.bodyCv('f', colors, { tap: 1, dim: .75 })}<figcaption>Przód</figcaption></figure><figure>${F.bodyCv('b', colors, { tap: 1, dim: .75 })}<figcaption>Tył</figcaption></figure></div>
      <div class="mleg">${legend}</div><p class="dim small">Szacunek z Twoich serii i czasu od treningu. Sen, jedzenie i samopoczucie mogą to zmienić. Dotknij partii, aby zobaczyć szczegóły.</p></section>
      <div class="banner hot"><div>${ic('target', 20)}</div><p>${tip}</p></div>
      <h3 class="sec">Gotowość partii</h3><section class="card cut">${sorted.map(m => `<button class="rg" data-a="musTap" data-m="${m}"><span>${F.mDot(m)}${F.MUSCLES[m]}</span><em>${r[m].rem > 0 ? `ok. ${Math.max(1, Math.round(r[m].rem))} h` : 'gotowe'}</em></button>`).join('')}</section>`;
  };
  F.recoverySheet = m => { const x = F.recovery()[m]; F.sheet(`<div class="tiles two"><div class="tile cut"><span class="tl">Stan</span><b class="tv sm">${STT[x.st]}</b></div><div class="tile cut"><span class="tl">Do gotowości</span><b class="tv sm">${x.rem > 0 ? `ok. ${Math.max(1, Math.round(x.rem))} h` : 'teraz'}</b></div></div><p class="sheet-p">${x.rem > 0 ? `Ostatni trening tej partii to około ${F.fmtNum(x.sets, 1)} serii, a to szacunkowo ${Math.round(x.need)} h przerwy.` : 'W ostatnich dniach ta partia nie miała dużego obciążenia albo zdążyła odpocząć.'}</p>`, { title: E(F.MUSCLES[m]) }); };
  F.act.musRec = () => { F.ui.musView = 'rec'; F.render(true); };

  /* ---------- wnioski ---------- */
  F.exHint = (exId, reps) => {
    if (F.deloadOn()) return null; const st = F.stagnation(exId); if (!st || st.stuck < 2) return null;
    const sug = F.suggest(exId, reps), ex = F.S.ex.get(exId), t = `${st.stuck} ${F.plur(st.stuck, 'trening', 'treningi', 'treningów')} bez postępu`;
    return { t, d: sug && sug.stag ? `Dlatego cel na dziś jest lżejszy: ${F.fwt(sug.w, ex && ex.id)} ${F.unit()}. Wejdź od nowa i dokładaj ciężar na kolejnych treningach.` : 'Sprawdź sen i jedzenie. Jeśli to nic nie zmieni, zamień ćwiczenie na inny wariant.' };
  };
  F.hintHtml = id => { const h = F.exHint(id); return h ? `<div class="banner hot"><div>${ic('target', 20)}</div><p><b>${E(h.t)}</b><br><small>${E(h.d)}</small></p></div>` : ''; };
  F.sessChanges = s => {
    const rows = [], prev = F.S.sessions.find(x => x.id !== s.id && x.start < s.start && !x.deload && !s.deload && ((s.dayId && x.dayId === s.dayId && x.planId === s.planId) || (!s.dayId && x.name === s.name)));
    if (prev) {
      const a = F.sessionVolume(s), b = F.sessionVolume(prev), p = pct(a, b); const vol = se => { const o = {}; se.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); o[e.exId] = (o[e.exId] || 0) + e.sets.reduce((t, x) => t + (F.isWork(x) ? F.setVolume(ex, x, se.start) : 0), 0); }); return o; };
      if (b > 0) {
        const va = vol(s), vb = vol(prev); let best = null, bd = 0; Object.keys(va).forEach(id => { if (!(id in vb)) return; const d = va[id] - vb[id]; if (p >= 0 ? d > bd : d < bd) { bd = d; best = id; } });
        rows.push({ t: p === 0 ? `Tonaż bez zmian do poprzedniego: ${s.name}` : `Tonaż ${sign(p)}% do poprzedniego: ${s.name}`, d: best ? `${p >= 0 ? 'Najwięcej dało' : 'Najwięcej ubyło'}: ${F.exName(best)}.` : '' });
      }
    }
    s.exercises.forEach(e => { if (rows.length >= 3 || !(F.S.ex.get(e.exId) || {}).compound) return; const h = F.exHint(e.exId); if (h) rows.push({ t: `${F.exName(e.exId)}: ${h.t.toLowerCase()}`, d: 'Następny cel będzie lżejszy, żeby wejść od nowa.' }); });
    return rows;
  };
  F.changesHtml = s => { const r = F.sessChanges(s); return r.length ? `<section class="card cut sum-ch"><h3>Co się zmieniło</h3>${r.map(x => `<div class="ins"><b>${E(x.t)}</b>${x.d ? `<p>${E(x.d)}</p>` : ''}</div>`).join('')}</section>` : ''; };

  /* ---------- raporty ---------- */
  const period = (a, b) => {
    const o = { n: 0, sets: 0, vol: 0, pr: 0, mus: {}, lifts: {} };
    F.S.sessions.forEach(s => {
      if (s.start < a || s.start >= b) return; o.n++; o.vol += F.sessionVolume(s); o.pr += (s.prs || []).length;
      s.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); e.sets.forEach(x => { if (!F.isWork(x)) return; o.sets++; if (ex && ex.muscle) o.mus[ex.muscle] = (o.mus[ex.muscle] || 0) + 1; if (ex && ex.compound && ex.type !== 'time' && ex.type !== 'br') { const v = F.e1rm(F.effLoad(ex, x, s.start), x.r); if (v > (o.lifts[e.exId] || 0)) o.lifts[e.exId] = v; } }); });
    });
    return o;
  };
  F.reportPeriodStats = period;
  const lastMonthDefault = () => { const n = new Date(), a = new Date(n.getFullYear(), n.getMonth() - 1, 1).getTime(), b = new Date(n.getFullYear(), n.getMonth(), 1).getTime(); return F.S.sessions.some(s => s.start >= a && s.start < b) ? -1 : 0; };
  const nav = t => `<div class="cal-h"><button class="ibtn" data-a="repNav" data-d="-1" aria-label="Wcześniej">${ic('chevron-left', 20)}</button><h3>${t}</h3><button class="ibtn" data-a="repNav" data-d="1" aria-label="Później">${ic('chevron-right', 20)}</button></div>`;
  const stats = o => `<div class="sum-stats"><div><small>Treningi</small><b>${o.n}</b></div><div><small>Serie</small><b>${o.sets}</b></div><div><small>Tonaż</small><b>${F.fmtVol(o.vol)}</b></div><div><small>Rekordy</small><b>${o.pr}</b></div></div>`;
  const compare = (c, p, lab, planned) => {
    const r = []; if (p.n) r.push([`Tonaż ${sign(pct(c.vol, p.vol))}%`, (() => { const up = Object.keys(c.mus).map(m => [m, c.mus[m] - (p.mus[m] || 0)]).sort((a, b) => b[1] - a[1])[0]; return up && up[1] > 0 ? `Najmocniej urosło: ${F.MUSCLES[up[0]].toLowerCase()}, ${sign(up[1])} serii.` : ''; })()]);
    if (planned) r.push([`Frekwencja ${Math.round(c.n / planned * 100)}%`, `${c.n} z ${planned} zaplanowanych treningów.`]);
    const l = Object.keys(c.lifts).filter(id => p.lifts[id]).map(id => [id, c.lifts[id] - p.lifts[id]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
    if (l.length) r.push(['Szacowany maks', l.map(([id, d]) => `${F.exName(id)}: ${sign(+F.fw(Math.abs(d)).replace(',', '.') * Math.sign(d)).replace('.', ',')} ${F.unit()}`).join(', ') + '.']);
    return r.length ? `<section class="card cut"><h3>${lab}</h3>${r.map(x => `<div class="ins"><b>${E(x[0])}</b>${x[1] ? `<p>${E(x[1])}</p>` : ''}</div>`).join('')}</section>` : '';
  };
  F.repSeg = () => { const t = F.ui.repTab || 'w'; return `<div class="seg">${[['w', 'Tydzień'], ['m', 'Miesiąc'], ['y', 'Rok']].map(x => `<button class="${x[0] === t ? 'on' : ''}" data-a="repTab" data-t="${x[0]}">${x[1]}</button>`).join('')}</div>`; };
  F.act.repTab = b => { F.ui.repTab = b.dataset.t; F.ui.repOff = b.dataset.t === 'm' ? lastMonthDefault() : 0; F.render(true); };
  F.act.repNav = b => { const d = +b.dataset.d, o = F.ui.repOff || 0; if (o + d > 0) return; F.ui.repOff = o + d; F.render(true); };
  F.reportPeriod = tab => {
    const off = F.ui.repOff || 0, n = new Date(); const head = `${F.head('Raport', { back: 1, sub: 'Jak Ci idzie i co zmienić' })}${F.repSeg()}`;
    if (tab === 'm') {
      const s = new Date(n.getFullYear(), n.getMonth() + off, 1), a = s.getTime(), e = new Date(s.getFullYear(), s.getMonth() + 1, 1).getTime(), a0 = new Date(s.getFullYear(), s.getMonth() - 1, 1).getTime();
      const c = period(a, e), p = period(a0, a), m = s.getMonth(), days = Math.round((Math.min(e, F.startOfDay(Date.now()) + 864e5) - a) / 864e5), planned = Math.round(days / 7 * (F.S.settings.weeklyGoal || 3));
      return { html: `${head}<section class="card cut">${nav(`${cap(MON[m])} ${s.getFullYear()}`)}${stats(c)}</section>${compare(c, p, `Względem: ${MON[(m + 11) % 12]}`, planned)}${F.goalsHtml(goalKey(s), true)}` };
    }
    const y = n.getFullYear() + off, c = period(new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()), p = period(new Date(y - 1, 0, 1).getTime(), new Date(y, 0, 1).getTime());
    const bars = MON.map((l, i) => ({ label: l.slice(0, 3), value: period(new Date(y, i, 1).getTime(), new Date(y, i + 1, 1).getTime()).vol, tip: `${cap(l)}: ${F.fmtVol(period(new Date(y, i, 1).getTime(), new Date(y, i + 1, 1).getTime()).vol)}`, hl: y === n.getFullYear() && i === n.getMonth() }));
    return { html: `${head}<section class="card cut">${nav(String(y))}${stats(c)}</section><section class="card cut"><h3>Tonaż w miesiącach</h3>${F.chart.bars(bars, { labelEvery: 2 })}</section>${compare(c, p, `Względem roku ${y - 1}`, 0)}`, after: root => F.chart.bindTips(root) };
  };

  /* ---------- cele miesięczne ---------- */
  const goalKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const goals = () => F.S.settings.goals || (F.S.settings.goals = []);
  const monthRange = ym => { const [y, m] = ym.split('-').map(Number); return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]; };
  F.goalProg = g => {
    const [a, b] = monthRange(g.m), ss = F.S.sessions.filter(s => s.start >= a && s.start < b);
    if (g.k === 's') return { v: ss.length, t: `${g.n} ${F.plur(g.n, 'trening', 'treningi', 'treningów')}`, s: `${ss.length} z ${g.n}`, p: ss.length / g.n };
    if (g.k === 'v') { const v = ss.reduce((x, s) => x + F.sessionVolume(s), 0); return { v, t: `Tonaż ${F.fmtVol(g.n)}`, s: F.fmtVol(v), p: v / g.n }; }
    let w = 0; ss.forEach(s => s.exercises.forEach(e => { if (e.exId === g.ex) e.sets.forEach(x => { if (F.isWork(x) && (x.w || 0) > w) w = x.w; }); }));
    return { v: w, t: `${F.exName(g.ex)} ${F.fw(g.n)} ${F.unit()}`, s: `${F.fw(w)} ${F.unit()}`, p: w / g.n };
  };
  F.goalsHtml = (ym, ro) => {
    ym = ym || goalKey(new Date()); const list = goals().filter(g => g.m === ym);
    if (ro && !list.length) return ''; const done = list.filter(g => F.goalProg(g).p >= 1).length;
    const rows = list.map(g => { const p = F.goalProg(g); return `<button class="goal" data-a="${ro ? 'noop' : 'goalDel'}" data-id="${g.id}"><div><b>${E(p.t)}</b><span>${E(p.s)}</span></div><div class="bar"><i style="width:${Math.min(100, p.p * 100).toFixed(0)}%"></i></div></button>`; }).join('');
    const label = MON[+ym.split('-')[1] - 1];
    return `<h3 class="sec">${ro ? 'Cele miesiąca' : `Cele: ${label}`}${list.length ? ` <small class="dim">${done} z ${list.length}</small>` : ''}</h3><section class="card cut">${rows}${ro ? '' : `<button class="btn ghost wide goal-add" data-a="goalNew">${ic('plus', 18)} Dodaj cel</button>`}</section>`;
  };
  const goalSheet = () => {
    const k = F.ui.gK || 's', cnt = {}; F.S.sessions.slice(0, 40).forEach(s => s.exercises.forEach(e => { if ((F.S.ex.get(e.exId) || {}).type !== 'time') cnt[e.exId] = (cnt[e.exId] || 0) + 1; }));
    const ids = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 25);
    F.sheet(`<div class="seg">${[['s', 'Treningi'], ['v', 'Tonaż'], ['l', 'Ciężar']].map(x => `<button class="${x[0] === k ? 'on' : ''}" data-a="goalK" data-k="${x[0]}">${x[1]}</button>`).join('')}</div>
      ${k === 'l' ? `<label class="fld"><span>Ćwiczenie</span><select id="g-ex">${ids.map(i => `<option value="${E(i)}">${E(F.exName(i))}</option>`).join('')}</select></label>` : ''}
      <label class="fld"><span>${k === 's' ? 'Liczba treningów' : k === 'v' ? 'Tonaż w tonach' : `Ciężar (${F.unit()})`}</span><input id="g-n" type="number" inputmode="decimal" min="0"></label>
      <button class="btn primary wide" data-a="goalSave">Dodaj cel</button>`, { title: 'Nowy cel na ten miesiąc' });
  };
  F.act.goalNew = () => { if (goals().filter(g => g.m === goalKey(new Date())).length >= 6) { F.toast('Maksymalnie 6 celów w miesiącu'); return; } F.ui.gK = 's'; goalSheet(); };
  F.act.goalK = b => { F.ui.gK = b.dataset.k; goalSheet(); };
  F.act.goalSave = () => {
    const k = F.ui.gK || 's', n = parseFloat(String(F.$('#g-n').value).replace(',', '.')); if (!(n > 0)) { F.toast('Wpisz wartość celu'); return; }
    const ex = k === 'l' ? (F.$('#g-ex') || {}).value : ''; if (k === 'l' && !ex) { F.toast('Najpierw zrób trening z tym ćwiczeniem'); return; }
    goals().push({ id: F.uid(), m: goalKey(new Date()), k, n: k === 'l' ? F.fromDisp(n) : k === 'v' ? F.fromDisp(n * 1000) : Math.round(n), ex }); F.saveSettings(); F.closeSheet(true); F.render(true);
  };
  F.act.goalDel = async b => { if (!(await F.confirm({ title: 'Usunąć ten cel?', text: 'Postęp treningów zostaje bez zmian.', ok: 'Usuń', cancel: 'Wróć', danger: true }))) return; F.S.settings.goals = goals().filter(g => g.id !== b.dataset.id); F.saveSettings(); F.render(true); };
  F.act.noop = () => { };
})();
