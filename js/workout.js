/* FORGE — trening na żywo: serie, ciężar, powtórzenia, stoper przerw, rekordy, podsumowanie, karta do udostępnienia */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const exOf = id => F.S.ex.get(id);
  F.LOGO_PATH = 'M30 8H88L84 28H45.7L41.9 46H78L74 64H38L32 92H12Z';
  F.logo = (size = 40, cls = '') => `<svg class="logo ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="lg${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs><path d="${F.LOGO_PATH}" fill="url(#lg${size})"/></svg>`;

  const dayPart = () => { const h = new Date().getHours(); return h < 10 ? 'Poranny trening' : h < 15 ? 'Trening południowy' : h < 20 ? 'Popołudniowy trening' : 'Wieczorny trening'; };
  const parseRepsLo = r => { const m = String(r || '').match(/\d+/); return m ? +m[0] : 0; };
  const dPlan = () => { const d = F.S.draft; return (d && d.planId && F.planOf && F.planOf(d.planId)) || F.curPlan(); };
  const exRest = (e, ex) => e.rest || F.autoRest(ex, dPlan());

  /* ---------- superserie / obwody: ciągłe grupy ćwiczeń o tym samym ss ---------- */
  F.ssInfo = arr => { const out = arr.map(() => null); let i = 0, g = 0; while (i < arr.length) { const id = arr[i].ss; let j = i; if (id) while (j + 1 < arr.length && arr[j + 1].ss === id) j++; if (id && j > i) { const L = String.fromCharCode(65 + (g++ % 26)); for (let k = i; k <= j; k++) out[k] = { tag: L + (k - i + 1), pos: k - i, size: j - i + 1, start: i, end: j, L }; } i = j + 1; } return out; };
  F.cleanSS = arr => { const inf = F.ssInfo(arr); arr.forEach((e, k) => { if (e.ss && !inf[k]) delete e.ss; }); };
  F.ssName = n => n >= 3 ? 'Obwód' : 'Superseria';
  const pgOf = it => (it.prog && it.prog !== 'auto') || it.inc || it.pct || it.scheme === 'pyr' ? { prog: it.prog || 'auto', inc: it.inc || 0, pct: it.pct || 0, scheme: it.scheme === 'pyr' ? 'pyr' : '' } : null;

  /* ---------- budowanie treningu ---------- */
  function buildSets(exId, count, reps, w0, pg, cx) {
    pg = pg || {}; cx = cx || {};
    const useSug = (F.S.settings.autoProg !== false && pg.prog !== 'off') || pg.pct;
    const ex = exOf(exId), last = F.LAST[exId], sug = useSug ? F.suggest(exId, reps, { mode: pg.prog === 'linear' ? 'linear' : 'auto', inc: pg.inc, pct: pg.pct, role: cx.role, goal: cx.goal }) : null, lo = parseRepsLo(reps); const sets = [];
    const hiR = (String(reps || '').match(/\d+(?:\s*[-–]\s*(\d+))?/) || [])[1] ? +String(reps).match(/[-–]\s*(\d+)/)[1] : lo; const startR = F.progModel(exId, cx) === 'load' ? hiR : lo; // pierwszy trening: dół zakresu (siła, boje: stała liczba = góra zakresu)
    const topW = last ? Math.max(...last.sets.map(s => s.w || 0)) : 0;
    // piramida: powtórzenia maleją od góry zakresu do dołu, ciężar rośnie tak, by zapas powtórzeń był podobny w każdej serii (wzór Epleya); ostatnia seria = ciężar „górny”
    const pyrOn = !!(pg.scheme === 'pyr' && ex && ex.type !== 'time' && ex.type !== 'br' && count >= 3); const pyrR = [], pyrW = [];
    if (pyrOn) {
      const mm = String(reps || '').match(/(\d+)(?:\s*[-–]\s*(\d+))?/); const lo2 = mm ? +mm[1] : 6, hi2 = mm ? +(mm[2] || mm[1]) : 10; const st = F.S.settings.step || 2.5; const incr = pg.inc > 0 ? pg.inc : F.stepFor(ex);
      let topW2 = w0 || 0; if (last && last.sets.length) { topW2 = Math.max(...last.sets.map(s => s.w || 0)); const planned = []; for (let k = 0; k < count; k++) planned.push(Math.round(hi2 - (hi2 - lo2) * k / (count - 1))); const hit = last.sets.length >= count && planned.every((pr, k) => (last.sets[k].r || 0) >= pr); if (hit && !F.deloadOn()) topW2 += incr; }
      const rir0 = 2, e1 = topW2 * (1 + (lo2 + rir0) / 30);
      for (let k = 0; k < count; k++) { const rk = Math.round(hi2 - (hi2 - lo2) * k / (count - 1)); pyrR.push(rk); pyrW.push(topW2 ? Math.max(0, Math.round(e1 / (1 + (rk + rir0) / 30) / st) * st) : 0); }
    }
    const shaped = !pyrOn && !!(sug && !sug.pct && last && last.sets.length > 1 && new Set(last.sets.map(s => s.w || 0)).size > 1 && ex && ex.type !== 'time' && ex.type !== 'br'); const delta = shaped ? (sug.w - topW) : 0;
    for (let i = 0; i < count; i++) {
      const prev = last ? (last.sets[i] || last.sets[last.sets.length - 1]) : null; let w = 0, r = 0;
      if (ex && ex.type === 'time') { r = prev ? prev.r : (ex.muscle === 'cardio' ? 1200 : (lo || 45)); }
      else if (ex && ex.type === 'br') { r = prev ? prev.r : (lo || 10); }
      else if (pyrOn) { w = pyrW[i]; r = pyrR[i]; }
      else if (shaped && prev) { w = Math.max(0, Math.round((prev.w + delta) / (F.S.settings.step || 2.5)) * (F.S.settings.step || 2.5)); r = prev.r; } // zachowaj Twój schemat (np. piramidę): kolejne serie dalej cięższe, a progresja przesuwa cały schemat
      else { w = sug ? sug.w : (prev ? prev.w : (w0 || 0)); const tg = sug && !sug.pct && !sug.off ? sug.r : 0; // konkretny cel: z progresji, a bez historii — start z zakresu
        if (tg && (sug.w > topW || sug.load || !prev)) r = tg; else if (tg) r = Math.min(Math.max(prev.r || 0, tg), hiR || 99); else r = prev ? prev.r : (startR || 10); }
      const st = { w, r, t: 'n', done: false }; if (ex && ex.muscle === 'cardio' && ex.type === 'time') st.int = (pg && pg.cint) || (prev && prev.int) || 2; sets.push(st);
    }
    return sets;
  }
  F.startWorkout = (o = {}) => {
    if (F.S.draft) { F.go('#/workout'); return; }
    const d = { id: F.uid(), start: o.backdate || Date.now(), name: dayPart(), planId: null, dayId: null, note: '', backdate: !!o.backdate, exercises: [], rest: null };
    if (o.backdate) d.start = o.backdate;
    if (o.plan && o.day) { if (F.S.settings.curPlan !== o.plan.id && F.setCurPlan) F.setCurPlan(o.plan.id); d.name = o.day.name; if (o.short) d.short = o.short; d.planId = o.plan.id; d.dayId = o.day.id; d.planName = o.plan.name; d.deload = F.deloadOn(); d.exercises = o.day.items.filter(i => exOf(i.exId)).map(i => { if (i.cardio) { const secs = +i.reps || 1800, ci = i.cardio.int || 2; return { k: F.uid(), exId: i.exId, note: i.note || '', rest: 0, target: { sets: 1, reps: String(secs) }, sets: [{ w: 0, r: secs, t: 'n', done: false, int: ci }], cardio: { int: ci, post: !!i.cardio.post } }; } const n = d.deload ? Math.max(1, Math.ceil((i.sets || 3) / 2)) : (i.sets || 3); const pg = pgOf(i); const cx = { role: i.role || F.restRole(i.exId), goal: (o.plan.meta || {}).goal }; const e = { k: F.uid(), exId: i.exId, note: i.note || '', rest: i.rest || 0, role: cx.role, goal: cx.goal, target: { sets: n, reps: i.reps }, sets: buildSets(i.exId, n, i.reps, i.w, pg, cx) }; if (i.ss) e.ss = i.ss; if (pg) e.pg = pg; return e; }); { const inf = F.ssInfo(d.exercises); inf.forEach((g, k) => { if (g && g.pos === 0) ssEqualize(g.start, g.end, d.exercises); }); } }
    else if (o.fromSession) { const s = o.fromSession; d.name = s.name; d.planId = s.planId; d.dayId = s.dayId; d.exercises = s.exercises.filter(e => exOf(e.exId)).map(e => { const o2 = { k: F.uid(), exId: e.exId, note: '', rest: e.rest || 0, target: { sets: e.sets.filter(x => x.t !== 'w').length, reps: '' }, sets: e.sets.filter(x => x.t !== 'w' && x.done).map(x => ({ w: x.w, r: x.r, t: x.t || 'n', done: false })) }; if (e.ss) o2.ss = e.ss; return o2; }); }
    F.S.draft = d; F.saveDraft(); F.wakeLock(); F.haptic(30); F.go('#/workout');
  };
  F.startFlow = () => {
    const nx = F.nextWorkout();
    const next = nx ? `<button class="tpl cut hot" data-a="flowNext"><small>Następny w kolejce</small><b>${E(nx.day.name)}</b><em>${E(nx.plan.name)} · ${nx.day.items.length} ${F.plur(nx.day.items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}</em></button>` : '';
    const rest = F.S.plans.map(p => `<div class="flow-plan"><h4>${E(p.name)}</h4><div class="chips">${p.days.map(d => `<button class="chip" data-a="startDay" data-p="${p.id}" data-d="${d.id}">${E(d.name)}</button>`).join('')}</div></div>`).join('');
    F.sheet(`${next}<button class="tpl cut" data-a="flowEmpty"><b>Pusty trening</b><em>Dodawaj ćwiczenia na bieżąco</em></button>${rest ? `<h3 class="sec">Z planu</h3>${rest}` : `<p class="dim center pad">Nie masz jeszcze planów. <a href="#/plans">Stwórz pierwszy</a> albo trenuj bez planu.</p>`}`, { title: 'Co dziś ciśniemy?' });
    F.act.startDay = b => { const p = F.planOf(b.dataset.p); const d = p && p.days.find(x => x.id === b.dataset.d); F.closeSheet(true); if (d) F.startWorkout({ plan: p, day: d }); };
  };
  F.act.flowNext = () => { F.closeSheet(true); F.act.startNext(); };
  F.act.flowEmpty = () => { F.closeSheet(true); F.startWorkout({ empty: true }); };
  F.act.startDay = b => { const p = F.planOf(b.dataset.p); const d = p && p.days.find(x => x.id === b.dataset.d); F.closeSheet(true); if (d) F.startWorkout({ plan: p, day: d }); };

  /* ---------- widok treningu ---------- */
  const D = () => F.S.draft;
  let wkIdx = null; // robocza kopia indeksu rekordów
  const rebuildWkIdx = () => {
    wkIdx = F.cloneIdx(); const d = D(); if (!d) return;
    d.exercises.forEach(e => { const ex = exOf(e.exId); if (!ex) return; e.sets.forEach(s => { if (F.isWork(s)) F.addToIdx(wkIdx, ex, s, d.start); }); });
  };
  const wkStats = () => { const d = D(); let vol = 0, sets = 0, all = 0; d.exercises.forEach(e => { if (e.later || e.skip) return; const ex = exOf(e.exId); e.sets.forEach(s => { all++; if (F.isWork(s)) { sets++; vol += F.setVolume(ex, s, d.start); } }); }); return { vol, sets, all, done: d.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0) }; };
  const stepDisp = () => F.unit() === 'lb' ? 5 : F.S.settings.step;

  function setRow(e, i, j) {
    const ex = exOf(e.exId) || { type: 'wr' }; const s = e.sets[j]; const last = F.LAST[e.exId];
    const prev = last && last.sets[j]; const isT = ex.type === 'time', isB = ex.type === 'br'; const noW = isT || isB; const m = F.wm(e.exId);
    let n = 0; for (let k = 0; k <= j; k++) if (e.sets[k].t !== 'w') n++;
    const lab = s.t === 'w' ? 'R' : s.t === 'd' ? 'D' : s.t === 'f' ? 'F' : n;
    const wv = s.w ? F.fw(s.w / m) : ''; const pv = prev ? (isT ? F.fmtDur(prev.r) : isB ? prev.r : `${F.fw(prev.w / m)}×${prev.r}`) : '–';
    const active = e.sets.findIndex(x => !x.done) === j;
    return `<div class="sr ${s.done ? 'done' : ''} ${active ? 'active' : ''} t-${s.t || 'n'} ${noW ? 'no-w' : ''}" id="sr-${i}-${j}" data-i="${i}" data-j="${j}">
      <button class="sn" data-a="setMenu" data-i="${i}" data-j="${j}" aria-label="Opcje serii">${lab}</button>
      <button class="prev" data-a="usePrev" data-i="${i}" data-j="${j}" title="Użyj poprzedniego wyniku">${pv}</button>
      ${noW ? '' : `<div class="num"><button data-a="nudge" data-f="w" data-d="-1" data-i="${i}" data-j="${j}" aria-label="Mniej">${ic('minus', 14)}</button><input inputmode="decimal" data-b="wk" data-f="w" data-i="${i}" data-j="${j}" value="${wv}" placeholder="0" aria-label="Ciężar"><button data-a="nudge" data-f="w" data-d="1" data-i="${i}" data-j="${j}" aria-label="Więcej">${ic('plus', 14)}</button></div>`}
      <div class="num"><button data-a="nudge" data-f="r" data-d="-1" data-i="${i}" data-j="${j}" aria-label="Mniej">${ic('minus', 14)}</button><input inputmode="numeric" data-b="wk" data-f="r" data-i="${i}" data-j="${j}" value="${s.r || ''}" placeholder="0" aria-label="${isT ? 'Sekundy' : 'Powtórzenia'}"><button data-a="nudge" data-f="r" data-d="1" data-i="${i}" data-j="${j}" aria-label="Więcej">${ic('plus', 14)}</button></div>
      <button class="ck" data-a="check" data-i="${i}" data-j="${j}" aria-label="Zalicz serię" aria-pressed="${!!s.done}">${ic('check', 22)}</button>${s.pr && s.pr.length && s.done ? `<span class="sr-pr">${ic('trophy', 13)}</span>` : ''}</div>`;
  }
  const sugOpts = e => { const pg = e.pg || {}; return { mode: pg.prog === 'linear' ? 'linear' : pg.prog === 'off' ? 'off' : 'auto', inc: pg.inc, pct: pg.pct, role: e.role, goal: e.goal }; };
  // cel na kartę ćwiczenia: konkretna liczba powtórzeń (zakres w nawiasie)
  const tgtR = (e, sug) => { const t = e.target || {}; const m = String(t.reps || '').match(/(\d+)(?:\s*[-–]\s*(\d+))?/); if (!m) return null; const lo = +m[1], hi = +(m[2] || m[1]); const load = F.progModel(e.exId, { role: e.role, goal: e.goal }) === 'load'; return { r: sug && !sug.pct && !sug.off && sug.r ? sug.r : (load ? hi : lo), lo, hi, load }; };
  const tgtTxt = (e, sug) => { const t = tgtR(e, sug); if (!t) return ''; return `Cel ${(e.target || {}).sets}×${t.r}${t.hi > t.lo ? ` <small>(zakres ${t.lo}–${t.hi})</small>` : ''}`; };
  // pierwszy raz z tym ćwiczeniem: jak dobrać ciężar do konkretnej liczby powtórzeń
  const firstTip = (e, sug, ex) => { if (sug || F.LAST[e.exId] || !ex || ex.type === 'time' || ex.type === 'br') return ''; const t = tgtR(e, null); if (!t) return ''; return `<p class="xc-note hint">${ic('target', 13)} Pierwszy raz: dobierz ciężar, z którym zrobisz ${t.r} powtórzeń i zostanie zapas z opisu ćwiczenia. ${t.load || t.hi === t.lo ? `Gdy zrobisz ${t.hi} we wszystkich seriach — więcej ciężaru.` : `Co trening dokładaj po 1 powtórzeniu; przy ${t.hi} we wszystkich seriach — więcej ciężaru i znów od ${t.lo}.`}</p>`; };
  /* ---------- strony: jedna karta = jedno ćwiczenie albo cała superseria / obwód ---------- */
  const pagesOf = () => { const d = D(), inf = F.ssInfo(d.exercises), out = []; let i = 0; while (i < d.exercises.length) { const g = inf[i]; if (g && g.pos === 0) { out.push({ st: g.start, en: g.end }); i = g.end + 1; } else { out.push({ st: i, en: i }); i++; } } return out; };
  const slides = () => { const d = D(); return pagesOf().map((p, k) => { const ids = d.exercises.slice(p.st, p.en + 1).map(e => e.exId); return `<div class="wk-slide" data-pg="${k}">${F.exArt(ids)}${p.en > p.st ? ssCard(p.st, p.en) : card(p.st)}</div>`; }).join(''); };
  const pageSets = p => { const a = D().exercises.slice(p.st, p.en + 1).filter(e => !e.later && !e.skip); return { all: a.reduce((x, e) => x + e.sets.length, 0), done: a.reduce((x, e) => x + e.sets.filter(s => s.done).length, 0) }; };
  const updProg = () => { const ps = pagesOf(), n = ps.length, cur = Math.min(F.ui.wkPage || 0, n); const lab = F.$('#wk-pos'); if (lab) lab.textContent = cur >= n ? 'Podsumowanie' : `Ćwiczenie ${cur + 1} z ${n}`; F.$$('#wk-prog > span').forEach((el, k) => { const p = ps[k]; if (!p) return; const c = pageSets(p); el.classList.toggle('cur', k === cur); el.firstChild.style.width = (c.all ? c.done / c.all * 100 : 0) + '%'; }); };
  const goPage = (k, smooth) => { const el = F.$('#wk-pager'); F.ui.wkPage = k; F.ui.sel = null; if (el) el.scrollTo({ left: k * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); updProg(); if (F.refreshSetDock) F.refreshSetDock(); };
  function bindPager() {
    const el = F.$('#wk-pager'); if (!el) return; const n = pagesOf().length; if (F.ui.wkId !== D().id) { F.ui.wkId = D().id; const f = pagesOf().findIndex(p => { const c = pageSets(p); return c.done < c.all; }); F.ui.wkPage = f >= 0 ? f : 0; }
    F.ui.wkPage = Math.max(0, Math.min(F.ui.wkPage || 0, n)); el.scrollLeft = F.ui.wkPage * el.clientWidth; updProg();
    let t = 0; el.addEventListener('scroll', () => { const k = Math.round(el.scrollLeft / el.clientWidth); if (k !== F.ui.wkPage) { F.ui.wkPage = k; F.ui.sel = null; updProg(); F.refreshSetDock(); F.haptic(6); } clearTimeout(t); t = setTimeout(hideHint, 200); }, { passive: true });
    if (!F.S.settings.swipeSeen && n > 1) { const h = F.$('#wk-hint'); if (h) h.hidden = false; }
  }
  const hideHint = () => { if (F.ui.wkPage > 0 && !F.S.settings.swipeSeen) { F.S.settings.swipeSeen = true; F.saveSettings(); const h = F.$('#wk-hint'); if (h) h.hidden = true; } };
  addEventListener('resize', () => { const el = F.$('#wk-pager'); if (el) el.scrollLeft = (F.ui.wkPage || 0) * el.clientWidth; });
  document.addEventListener('focusin', e => { if (e.target.closest && e.target.closest('.wk-slide') && e.target.matches('input,textarea')) document.body.classList.add('kbd'); });
  document.addEventListener('focusout', () => { setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input,textarea')) document.body.classList.remove('kbd'); }, 60); });
  /* ---------- lista ćwiczeń: skok do karty, zmiana kolejności, dodawanie ---------- */
  const listHtml = () => { const d = D(), ps = pagesOf(), cur = F.ui.wkPage || 0; return `<div class="wl">${ps.map((p, k) => { const c = pageSets(p), names = d.exercises.slice(p.st, p.en + 1).map(e => E(F.exName(e.exId))); return `<div class="wl-r ${k === cur ? 'on' : ''} ${c.all && c.done === c.all ? 'ok' : ''}"><button class="wl-m" data-a="wkGo" data-p="${k}"><i>${c.all && c.done === c.all ? ic('check', 16) : k + 1}</i><span><b>${names.join(' + ')}</b><small>${p.en > p.st ? F.ssName(p.en - p.st + 1) + ' · ' : ''}${c.done} z ${c.all} serii</small></span></button><button class="ibtn" data-a="wlMove" data-p="${k}" data-d="-1" ${k === 0 ? 'disabled' : ''} aria-label="Wyżej">${ic('arrow-up', 18)}</button><button class="ibtn" data-a="wlMove" data-p="${k}" data-d="1" ${k === ps.length - 1 ? 'disabled' : ''} aria-label="Niżej">${ic('arrow-down', 18)}</button></div>`; }).join('')}</div><div class="btn-row"><button class="btn ghost grow" data-a="wkAdd">${ic('plus', 18)} Dodaj ćwiczenie</button><button class="btn primary grow" data-a="wkGo" data-p="${ps.length}">${ic('flag', 18)} Podsumowanie</button></div>`; };
  F.act.wkList = () => { F.sheet(listHtml(), { title: 'Lista ćwiczeń' }); };
  F.act.wkGo = b => { F.closeSheet(true); goPage(+b.dataset.p, true); };
  F.act.wlMove = b => { const d = D(), k = +b.dataset.p, t = k + +b.dataset.d, ps = pagesOf(); if (t < 0 || t >= ps.length) return; [ps[k], ps[t]] = [ps[t], ps[k]]; const a = d.exercises; d.exercises = ps.flatMap(p => a.slice(p.st, p.en + 1)); const cur = F.ui.wkPage; F.ui.wkPage = cur === k ? t : cur === t ? k : cur; F.saveDraft(); F.closeSheet(true); F.render(true); F.act.wkList(); };
  /* ---------- superseria: jedna karta, wiersz = runda ---------- */
  const ssRounds = (st, en, arr) => { const a = arr || D().exercises; let R = 0; for (let k = st; k <= en; k++) R = Math.max(R, a[k].sets.length); return R; };
  const ssEqualize = (st, en, arr) => { const a = arr || D().exercises; const R = ssRounds(st, en, a); for (let k = st; k <= en; k++) { const e = a[k]; while (e.sets.length < R) { const l = e.sets[e.sets.length - 1] || { w: 0, r: 0 }; e.sets.push({ w: l.w, r: l.r, t: 'n', done: false }); } } };
  function ssLine(i, j, tag) {
    const d = D(), e = d.exercises[i], ex = exOf(e.exId) || { type: 'wr' }, s = e.sets[j]; const isT = ex.type === 'time', isB = ex.type === 'br'; const noW = isT || isB; const m = F.wm(e.exId);
    if (!s) return `<div class="ssl empty"><span class="ss-tag">${tag}</span><span class="dim small">brak serii</span></div>`;
    return `<div class="ssl ${noW ? 'no-w' : ''}" id="sr-${i}-${j}"><span class="ss-tag" title="${E(ex.name || '')}">${tag}</span>
      ${noW ? '' : `<div class="num"><button data-a="nudge" data-f="w" data-d="-1" data-i="${i}" data-j="${j}" aria-label="Mniej">${ic('minus', 13)}</button><input inputmode="decimal" data-b="wk" data-f="w" data-i="${i}" data-j="${j}" value="${s.w ? F.fw(s.w / m) : ''}" placeholder="0" aria-label="Ciężar ${E(ex.name || '')}${m === 2 ? ' na jedną sztukę' : ''}"><button data-a="nudge" data-f="w" data-d="1" data-i="${i}" data-j="${j}" aria-label="Więcej">${ic('plus', 13)}</button></div>`}
      <div class="num"><button data-a="nudge" data-f="r" data-d="-1" data-i="${i}" data-j="${j}" aria-label="Mniej">${ic('minus', 13)}</button><input inputmode="numeric" data-b="wk" data-f="r" data-i="${i}" data-j="${j}" value="${s.r || ''}" placeholder="0" aria-label="${isT ? 'Sekundy' : 'Powtórzenia'} ${E(ex.name || '')}"><button data-a="nudge" data-f="r" data-d="1" data-i="${i}" data-j="${j}" aria-label="Więcej">${ic('plus', 13)}</button></div></div>`;
  }
  function ssCard(st, en) {
    const d = D(), info = F.ssInfo(d.exercises)[st], R = ssRounds(st, en), size = en - st + 1; let doneR = 0, rest = 0, hdr = '', rows = '';
    for (let k = st; k <= en; k++) {
      const e = d.exercises[k], ex = exOf(e.exId) || { name: 'Usunięte ćwiczenie', muscle: 'full', type: 'wr' }; const tag = F.ssInfo(d.exercises)[k].tag; const last = F.LAST[e.exId];
      const isT = ex.type === 'time', isB = ex.type === 'br'; const sug = F.suggest(e.exId, e.target && e.target.reps, sugOpts(e));
      const sugT = sug ? (isT ? F.fmtDur(sug.r) : isB ? sug.r + ' powt.' : F.fw(sug.w / F.wm(e.exId)) + ' ' + F.unit() + ' × ' + sug.r) : ''; const p = last && last.sets[0];
      rest = Math.max(rest, exRest(e, ex));
      hdr += `<div class="ssm"><div class="ssm-h"><span class="ss-tag">${tag}</span><a class="xc-n" href="#/ex/${E(e.exId)}"><h3>${E(ex.name)}</h3></a><button class="ibtn${F.exHint(e.exId, e.target && e.target.reps) ? ' hnt' : ''}" data-a="techOpen" data-id="${E(e.exId)}" aria-label="Technika">${ic('info', 20)}</button><button class="ibtn" data-a="exMenu" data-i="${k}" aria-label="Opcje ćwiczenia">${ic('ellipsis', 22)}</button></div>
        <div class="xc-m">${F.wm(e.exId) === 2 ? `<span class="x2c">${F.x2Label(ex)}</span>` : ''}${e.target && e.target.reps ? `<span>Cel ${isT ? E(e.target.reps) + ' s' : (() => { const t = tgtR(e, sug); return t ? `${t.r} powt.${t.hi > t.lo ? ` (${t.lo}–${t.hi})` : ''}` : E(e.target.reps) + ' powt.'; })()}</span>` : ''}${p ? `<span>Poprz. ${isT ? F.fmtDur(p.r) : isB ? p.r : F.fw(p.w / F.wm(e.exId)) + '×' + p.r}</span>` : ''}${sug ? `<span class="sug" data-a="applySug" data-i="${k}">${ic('target', 12)} ${sugT}</span>` : ''}</div>
        ${sug && (sug.stag || sug.pct || sug.off || d.deload) ? `<p class="xc-note hint ${sug.stag ? 'warn' : ''}">${ic(sug.stag ? 'zap' : 'target', 13)} ${E(sug.note)}</p>` : ''}${e.note ? `<p class="xc-note">${ic('notebook-pen', 13)} ${E(e.note)}</p>` : ''}</div>`;
    }
    for (let j = 0; j < R; j++) {
      let lines = '', all = true, any = false; for (let k = st; k <= en; k++) { const s = d.exercises[k].sets[j]; lines += ssLine(k, j, F.ssInfo(d.exercises)[k].tag); if (s) { any = true; if (!s.done) all = false; } }
      const rd = any && all; if (rd) doneR++;
      rows += `<div class="ssr ${rd ? 'done' : ''}" id="ssr-${st}-${j}"><button class="sn" data-a="ssMenu" data-s="${st}" data-j="${j}" aria-label="Opcje rundy">${j + 1}</button><div class="ssr-lines">${lines}</div><button class="ck tall" data-a="ssCheck" data-s="${st}" data-j="${j}" aria-label="Zalicz rundę" aria-pressed="${rd}">${ic('check', 24)}</button></div>`;
    }
    return `<section class="xc cut ssc ${doneR === R && R ? 'all' : ''}" id="ssg-${st}"><div class="ssc-h"><span class="ssc-t">${ic('link-2', 15)} ${F.ssName(size)} ${info.L}</span><span class="xc-c">${doneR}/${R} rund</span><span class="ssc-r">${ic('timer', 13)} ${F.fmtDur(rest)}</span></div>${hdr}<div class="ssh2"><span>Runda</span><span>${F.unit()} · powt.</span><span></span></div>${rows}<button class="addset" data-a="ssAddRound" data-s="${st}">${ic('plus', 16)} Dodaj rundę</button></section>`;
  }
  /* ---------- cardio: minuty zamiast serii; zrobione / zrobię później / pomiń ---------- */
  const CI = { 1: 'Lekko', 2: 'Umiarkowanie', 3: 'Intensywnie' };
  function cardioCard(i, e, ex) {
    const s = e.sets[0] || (e.sets[0] = { w: 0, r: 1200, t: 'n', done: false, int: 2 }); const mins = Math.round((s.r || 0) / 60); const it = s.int || (e.cardio && e.cardio.int) || 2; const st = e.later ? 'later' : e.skip ? 'skip' : s.done ? 'done' : '';
    const plan = e.target && +e.target.reps ? Math.round(+e.target.reps / 60) : 0;
    return `<section class="xc cut cd ${st}" id="xc-${i}"><div class="xc-h">${F.mDot(ex.muscle)}<a class="xc-n" href="#/ex/${E(e.exId)}"><h3>${E(ex.name)}</h3></a><span class="xc-c">${st === 'done' ? 'zrobione' : st === 'later' ? 'później' : st === 'skip' ? 'pominięte' : ''}</span><button class="ibtn" data-a="exMenu" data-i="${i}" aria-label="Opcje ćwiczenia">${ic('ellipsis', 22)}</button></div>
      <div class="xc-m"><span>Cardio${plan ? ' · plan ' + plan + ' min' : ''}</span></div>
      ${e.later ? '' : `<div class="cd-main"><div class="num"><button data-a="cdNudge" data-d="-1" data-i="${i}" aria-label="Mniej">${ic('minus', 14)}</button><input inputmode="numeric" data-b="wkcm" data-i="${i}" value="${mins || ''}" placeholder="0" aria-label="Minuty"><button data-a="cdNudge" data-d="1" data-i="${i}" aria-label="Więcej">${ic('plus', 14)}</button></div><span class="cd-u">min</span></div>
      <div class="chips tiny">${[1, 2, 3].map(x => `<button class="chip ${it === x ? 'on' : ''}" data-a="cdInt" data-i="${i}" data-v="${x}">${CI[x]}</button>`).join('')}</div>`}
      <div class="cd-btns"><button class="btn sm ${s.done ? 'primary' : 'ghost'}" data-a="cdDone" data-i="${i}">${ic('check', 16)} Zrobione</button><button class="btn sm ghost ${e.later ? 'on' : ''}" data-a="cdLater" data-i="${i}">Zrobię później</button><button class="btn sm ghost ${e.skip ? 'on' : ''}" data-a="cdSkip" data-i="${i}">Pomiń</button></div>
      ${e.later ? `<p class="xc-note hint">${ic('timer', 13)} Zakończ trening — to cardio dopiszesz później (przypomnienie na ekranie głównym przez 48 godzin).</p>` : ''}${e.note ? `<p class="xc-note">${ic('notebook-pen', 13)} ${E(e.note)}</p>` : ''}</section>`;
  }
  F.bind.wkcm = el => { const e = D().exercises[+el.dataset.i], s = e.sets[0]; const v = num(el.value) || 0; s.r = Math.round(v * 60); persist(); if (s.done) updStats(); };
  F.act.cdNudge = b => { const i = +b.dataset.i, e = D().exercises[i], s = e.sets[0]; s.r = Math.max(0, (s.r || 0) + (+b.dataset.d) * 300); F.haptic(8); F.saveDraft(); redraw(i); };
  F.act.cdInt = b => { const i = +b.dataset.i, e = D().exercises[i]; e.sets[0].int = +b.dataset.v; if (e.cardio) e.cardio.int = +b.dataset.v; F.saveDraft(); redraw(i); };
  F.act.cdDone = b => { const i = +b.dataset.i, e = D().exercises[i], s = e.sets[0]; s.done = !s.done; if (s.done) { e.later = false; e.skip = false; if (!s.r) s.r = 1200; F.haptic(25); } F.saveDraft(); rebuildWkIdx(); redraw(i); };
  F.act.cdLater = b => { const i = +b.dataset.i, e = D().exercises[i]; e.later = !e.later; if (e.later) { e.skip = false; e.sets[0].done = false; } F.saveDraft(); redraw(i); };
  F.act.cdSkip = b => { const i = +b.dataset.i, e = D().exercises[i]; e.skip = !e.skip; if (e.skip) { e.later = false; e.sets[0].done = false; } F.saveDraft(); redraw(i); };
  const muscTxt = id => { const m = F.exMuscles(id); return [...m.p, ...m.s].filter(x => F.MUSCLES[x]).slice(0, 4).map(x => F.MUSCLES[x]).join(' · '); };
  const lastTxt = (e, ex) => { const l = F.LAST[e.exId]; if (!l) return 'Pierwszy raz'; const s = l.sets[0]; if (ex.type === 'time') return l.sets.length + ' × ' + F.fmtDur(s.r); if (ex.type === 'br') return l.sets.length + ' × ' + s.r + ' powt.'; return `${l.sets.length} × ${F.fw(s.w / F.wm(e.exId))} ${F.unit()} × ${s.r}`; };
  /* ---------- serie jako kafelki + dolny panel (zaliczanie jednym dotknięciem) ---------- */
  const setNo = (e, j) => { const s = e.sets[j]; if (s.t === 'w') return 'R'; let n = 0; for (let k = 0; k <= j; k++) if (e.sets[k].t !== 'w') n++; return s.t === 'd' ? n + 'D' : s.t === 'f' ? n + 'F' : n; };
  const workN = e => e.sets.filter(x => x.t !== 'w').length;
  const selOf = i => { const e = D().exercises[i]; if (!e) return -1; const u = F.ui.sel; if (u && u.i === i && e.sets[u.j]) return u.j; return e.sets.findIndex(x => !x.done); };
  const short = (ex, e, s) => { const m = F.wm(e.exId); return ex.type === 'time' ? F.fmtDur(s.r || 0) : ex.type === 'br' ? (s.r || 0) + ' powt.' : `${F.fw((s.w || 0) / m)}×${s.r || 0}`; };
  function chips(i) {
    const e = D().exercises[i], ex = exOf(e.exId) || { type: 'wr' }, sel = selOf(i);
    return e.sets.map((s, j) => `<button class="sxc ${s.done ? 'ok' : ''} ${j === sel ? 'cur' : ''} ${s.t === 'w' ? 'w' : ''}" data-a="selSet" data-i="${i}" data-j="${j}">${setNo(e, j)}${s.done ? ' · ' + short(ex, e, s) + ' ' + ic('check', 14) : j === sel ? ' · teraz' : ''}${s.done && s.pr && s.pr.length ? ' ' + ic('trophy', 13) : ''}</button>`).join('') + `<button class="sxc add" data-a="addSet" data-i="${i}">${ic('plus', 14)} seria</button>`;
  }
  const curPage = () => { const ps = pagesOf(); return ps[F.ui.wkPage || 0] || null; };
  function nextInfo() { const d = D(); for (let i = 0; i < d.exercises.length; i++) { const e = d.exercises[i]; if (e.later || e.skip) continue; const j = e.sets.findIndex(s => !s.done); if (j >= 0) { const ex = exOf(e.exId) || { type: 'wr' }; return { i, j, e, ex }; } } return null; }
  F.refreshSetDock = () => {
    const el = F.$('#set-dock'); if (!el || !D()) return; const d = D();
    if (F.rest) {
      const n = nextInfo(), lc = F.ui.lastChk, le = lc && d.exercises[lc.i], ls = le && le.sets[lc.j];
      const rc = 2 * Math.PI * 40;
      el.className = 'sdk on rest';
      el.innerHTML = `<div class="sd-rest"><button class="sd-ring" data-a="restFull" aria-label="Duży stoper"><svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="40" class="rg-bg" stroke-width="8" fill="none"/><circle cx="48" cy="48" r="40" class="rd-fg" data-rest-ring stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${rc}" transform="rotate(-90 48 48)"/></svg><b data-rest-time>0:00</b></button>
        <p><span>Przerwa</span>${n ? `<b>Następna: ${n.e.sets[n.j].t === 'w' ? 'rozgrzewka' : 'seria ' + setNo(n.e, n.j) + ' z ' + workN(n.e)}</b><small>${E(n.ex.name || '')} · ${short(n.ex, n.e, n.e.sets[n.j])}</small>` : '<b>Ostatnia seria za Tobą</b>'}</p></div>
        <div class="sd-btns"><button class="btn ghost" data-a="restAdd" data-s="30">+30 s</button><button class="btn primary" data-a="restSkip">${ic('skip-forward', 18)} Pomiń przerwę</button></div>
        ${ls && ls.done ? `<p class="sd-tip">Zapisano: ${short(exOf(le.exId) || { type: 'wr' }, le, ls)} · <button class="linkbtn" data-a="undoChk">Cofnij</button></p>` : ''}`;
      F.tickRest(); return;
    }
    const pg = curPage(); if (!pg || pg.st !== pg.en) { el.className = 'sdk'; el.innerHTML = ''; return; }
    const i = pg.st, e = d.exercises[i], ex = exOf(e.exId) || { type: 'wr' };
    if (!e || (ex.muscle === 'cardio' && ex.type === 'time')) { el.className = 'sdk'; el.innerHTML = ''; return; }
    const j = selOf(i); if (j < 0) { el.className = 'sdk on'; el.innerHTML = `<div class="sd-done">${ic('circle-check', 22)} <span>Wszystkie serie zaliczone</span><button class="btn sm ghost" data-a="addSet" data-i="${i}">${ic('plus', 16)} Seria</button><button class="btn sm primary" data-a="wkNextEx">Dalej ${ic('chevron-right', 16)}</button></div>`; return; }
    const s = e.sets[j], isT = ex.type === 'time', isB = ex.type === 'br', m = F.wm(e.exId), last = F.LAST[e.exId], prev = last && last.sets[j];
    const fld = (f, val, unit, mode) => `<div class="sd-f"><button data-a="pNudge" data-f="${f}" data-d="-1" data-i="${i}" data-j="${j}" aria-label="Mniej">${ic('minus', 22)}</button><label><input inputmode="${mode}" data-b="wk" data-f="${f}" data-i="${i}" data-j="${j}" value="${val}" placeholder="0" aria-label="${unit}"><small>${unit}</small></label><button data-a="pNudge" data-f="${f}" data-d="1" data-i="${i}" data-j="${j}" aria-label="Więcej">${ic('plus', 22)}</button></div>`;
    el.className = 'sdk on';
    el.innerHTML = `<div class="sd-top"><b>${s.t === 'w' ? 'Rozgrzewka' : 'Seria ' + setNo(e, j) + ' z ' + workN(e)}${s.done ? ' · zaliczona' : ''}</b><span>${prev ? 'poprzednio ' + short(ex, e, prev) : ''}</span>${F.voiceOk && !s.done ? `<button class="ibtn" data-a="pVoice" data-i="${i}" data-j="${j}" aria-label="Powiedz wynik">${ic('mic', 19)}</button>` : ''}<button class="ibtn" data-a="setMenu" data-i="${i}" data-j="${j}" aria-label="Opcje serii">${ic('ellipsis', 20)}</button></div>
      <div class="sd-row ${isT || isB ? 'one' : ''}">${isT || isB ? '' : fld('w', s.w ? F.fw(s.w / m) : '', (m === 2 ? '2× ' : '') + (ex.type === 'bwr' ? '+' : '') + F.unit(), 'decimal')}${fld('r', s.r || '', isT ? 'sek.' : 'powt.', 'numeric')}</div>
      <button class="sd-go ${s.done ? 'undo' : ''}" data-a="check" data-i="${i}" data-j="${j}">${s.done ? ic('rotate-ccw', 20) + ' Cofnij zaliczenie' : ic('check', 22) + ' Zalicz serię'}</button>`;
  };
  F.act.selSet = b => { F.ui.sel = { i: +b.dataset.i, j: +b.dataset.j }; const el = F.$('#sx-' + b.dataset.i); if (el) el.innerHTML = chips(+b.dataset.i); if (F.rest) F.restStop(false); else F.refreshSetDock(); };
  F.act.pNudge = b => {
    const i = +b.dataset.i, j = +b.dataset.j, e = D().exercises[i], s = e.sets[j], ex = exOf(e.exId) || {}; const dir = +b.dataset.d, m = F.wm(e.exId);
    if (b.dataset.f === 'w') { const cur = F.toDisp(s.w || 0) / m; const nv = Math.max(0, Math.round((cur + dir * stepDisp()) * 100) / 100); s.w = F.fromDisp(nv) * m; }
    else { const st = ex.type === 'time' ? 5 : 1; s.r = Math.max(0, (s.r || 0) + dir * st); }
    const inp = F.$(`#set-dock input[data-f=${b.dataset.f}]`); if (inp) inp.value = b.dataset.f === 'w' ? (s.w ? F.fw(s.w / m) : '') : (s.r || '');
    F.haptic(8); persist(); const c = F.$('#sx-' + i); if (c) c.innerHTML = chips(i); if (s.done) updStats();
  };
  F.act.pVoice = async b => {
    const i = +b.dataset.i, j = +b.dataset.j; const alts = await F.voiceSet(i, j); if (!alts) return;
    const e = D().exercises[i], s = e.sets[j], ex = exOf(e.exId) || {}, m = F.wm(e.exId), noW = ex.type === 'time' || ex.type === 'br';
    let nums = null; for (const a of alts) { const n = F.voiceNums(a); if (noW ? n.length >= 1 : n.length >= 2) { nums = n; break; } }
    if (!nums) { F.toast('Nie zrozumiałem: „' + E(alts[0] || '') + '”. Powiedz np. „sto na pięć”.'); return; }
    if (noW) s.r = Math.round(nums[0]); else { const w = nums[0], r = Math.round(nums[1]); if (!(w > 0 && w < 1000 && r > 0 && r < 100)) { F.toast('Nie zrozumiałem wyniku. Spróbuj jeszcze raz.'); return; } s.w = F.fromDisp(w) * m; s.r = r; }
    persist(); F.act.check({ dataset: { i, j } }); F.toast(`${ic('mic', 15)} Zapisano: ${short(ex, e, s)}`, 'hot');
  };
  // ból przy ćwiczeniu: zapis + bezpieczne opcje (bez oceniania urazu)
  F.act.exPain = b => { const i = +b.dataset.i, ex = exOf(D().exercises[i].exId) || {}; const P = (F.PLN && F.PLN.INJ) || {}; F.closeSheet(true);
    setTimeout(() => F.sheet(`<p class="sheet-p">Gdzie boli?</p><div class="chips">${Object.entries(P).map(([k, t]) => `<button class="chip" data-a="exPainAt" data-i="${i}" data-k="${k}">${t}</button>`).join('')}<button class="chip" data-a="exPainAt" data-i="${i}" data-k="other">Inne miejsce</button></div>`, { title: 'Boli: ' + E(ex.name || '') }), 260); };
  F.act.exPainAt = b => {
    const i = +b.dataset.i, k = b.dataset.k, d = D(), e = d.exercises[i]; const st = F.S.settings; st.painLog = (st.painLog || []).filter(x => Date.now() - x.ts < 365 * 864e5);
    const rec = { exId: e.exId, at: k, ts: Date.now() }; st.painLog.push(rec); F.saveSettings(); d.pain = d.pain || []; d.pain.push(rec); F.saveDraft();
    const same = st.painLog.filter(x => x.at === k && Date.now() - x.ts < 14 * 864e5).length; const P = (F.PLN && F.PLN.INJ) || {}; const place = k === 'other' ? 'to miejsce' : (P[k] || k).toLowerCase();
    F.closeSheet(true);
    setTimeout(() => F.sheet(`<p class="sheet-p">Przerwij to ćwiczenie. Ostry ból w stawie, ból promieniujący, drętwienie albo obrzęk to sygnał, żeby skonsultować się z lekarzem lub fizjoterapeutą — aplikacja nie ocenia urazów.</p>
      ${same >= 2 ? `<p class="sheet-p warn-t">${ic('heart-pulse', 16)} To już ${same}. zgłoszenie bólu (${E(place)}) w ciągu 2 tygodni. Umów się na konsultację z lekarzem lub fizjoterapeutą, zanim wrócisz do ćwiczeń, które bolą.</p>` : ''}
      <div class="menu"><button data-a="painSwap" data-i="${i}">${ic('arrow-left-right', 20)}<span>Zamień na inne ćwiczenie<small>Wybierz takie, które nie boli</small></span></button>
      <button data-a="painLight" data-i="${i}">${ic('arrow-down', 20)}<span>Dokończ lżej (−10%)<small>Tylko jeśli ruch jest bez bólu</small></span></button>
      <button data-a="painSkip" data-i="${i}">${ic('skip-forward', 20)}<span>Pomiń to ćwiczenie dziś</span></button></div>
      <p class="dim small">Zapisałem to w historii treningu. Przez 4 tygodnie przy tym ćwiczeniu zobaczysz przypomnienie.</p>`, { title: 'Zapisano' }), 260);
  };
  F.act.painSwap = b => { F.closeSheet(true); setTimeout(() => F.act.exSwap(b), 260); };
  F.act.painLight = b => { const e = D().exercises[+b.dataset.i]; const st = F.unit() === 'lb' ? F.fromDisp(5) : F.S.settings.step; e.sets.forEach(x => { if (!x.done && x.w) x.w = Math.max(0, Math.round(x.w * .9 / st) * st); }); F.saveDraft(); F.closeSheet(true); F.render(true); F.toast('Pozostałe serie lżejsze o 10%'); };
  F.act.painSkip = b => { const i = +b.dataset.i, e = D().exercises[i]; e.sets = e.sets.filter(x => x.done); if (!e.sets.length) { D().exercises.splice(i, 1); F.cleanSS(D().exercises); } F.ui.sel = null; F.saveDraft(); F.closeSheet(true); rebuildWkIdx(); F.render(true); F.toast('Pominięte'); };
  F.act.restSkip = () => F.restStop(false);
  F.act.undoChk = () => { const lc = F.ui.lastChk; if (!lc) return; F.restStop(false); const e = D().exercises[lc.i]; if (e && e.sets[lc.j] && e.sets[lc.j].done) { F.ui.sel = { i: lc.i, j: lc.j }; F.act.check({ dataset: { i: lc.i, j: lc.j } }); } F.ui.lastChk = null; F.refreshSetDock(); };
  F.act.wkNextEx = () => goPage(Math.min((F.ui.wkPage || 0) + 1, pagesOf().length), true);
  const feelHtml = () => { const row = (k, l) => `<div class="fl-r"><span>${l}</span><div>${[1, 2, 3, 4, 5].map(v => `<button data-a="feelSet" data-k="${k}" data-v="${v}" class="${(F.ui.feel || {})[k] === v ? 'on' : ''}" aria-label="${l} ${v} z 5">${v}</button>`).join('')}</div></div>`; return `<div class="feel" id="feel"><p class="fl-q">Jak się dziś czujesz? Dwa dotknięcia — po kilku treningach pokażę, jak sen i energia łączą się z Twoimi wynikami.</p>${row('sleep', 'Sen')}${row('energy', 'Energia')}<button class="btn ghost wide fl-skip" data-a="feelSkip">Pomiń</button></div>`; };
  F.feelAsk = () => { const d = D(); if (!d || d.feel || d.feelSkip || d.backdate || F.$('#feel')) return; F.sheet(feelHtml(), { title: 'Przed treningiem', cls: 'compact', onclose: () => { const dd = D(); if (dd && !dd.feel) { dd.feelSkip = 1; F.saveDraft(); } } }); };
  F.act.feelSet = b => { const f = F.ui.feel = F.ui.feel || {}; f[b.dataset.k] = +b.dataset.v; if (f.sleep && f.energy) { const d = D(); d.feel = { sleep: f.sleep, energy: f.energy }; F.ui.feel = null; F.saveDraft(); F.closeSheet(true); if (f.sleep <= 2 || f.energy <= 2) F.toast('Słabszy dzień. Dobieraj ciężar po zapasie powtórzeń: jeśli pierwsza seria jest wyraźnie cięższa niż zwykle, zmniejsz ciężar.'); else F.toast('Zapisane. Dobrego treningu!'); } else { const el = F.$('#feel'); if (el) el.outerHTML = feelHtml(); } };
  F.act.feelSkip = () => { D().feelSkip = 1; F.saveDraft(); F.closeSheet(true); };
  function card(i) {
    const d = D(), e = d.exercises[i], ex = exOf(e.exId) || { name: 'Usunięte ćwiczenie', muscle: 'full', type: 'wr' }; const last = F.LAST[e.exId];
    if (ex.muscle === 'cardio' && ex.type === 'time') return cardioCard(i, e, ex);
    const isT = ex.type === 'time', isB = ex.type === 'br'; const sug = F.suggest(e.exId, e.target && e.target.reps, sugOpts(e)); const inf = F.ssInfo(d.exercises)[i];
    const tgt = e.target && e.target.reps && !isT ? tgtTxt(e, sug) || `Cel ${e.target.sets}×${E(e.target.reps)}` : e.target && e.target.reps ? `Cel ${e.target.sets}×${E(e.target.reps)}` : '';
    const sugT = sug ? `${isT ? F.fmtDur(sug.r) : isB ? sug.r + ' powt.' : F.fw(sug.w / F.wm(e.exId)) + ' ' + F.unit() + ' × ' + sug.r}` : '';
    const doneN = e.sets.filter(s => s.done).length;
    return `<section class="xc cut ${doneN === e.sets.length && e.sets.length ? 'all' : ''}" id="xc-${i}">
      <div class="xc-h">${inf ? `<span class="ss-tag">${inf.tag}</span>` : F.mDot(ex.muscle)}<a class="xc-n" href="#/ex/${E(e.exId)}"><h3>${E(ex.name)}</h3></a><span class="xc-c">${doneN}/${e.sets.length}</span><button class="ibtn${F.exHint(e.exId, e.target && e.target.reps) ? ' hnt' : ''}" data-a="techOpen" data-id="${E(e.exId)}" aria-label="Technika">${ic('info', 20)}</button><button class="ibtn" data-a="exMenu" data-i="${i}" aria-label="Opcje ćwiczenia">${ic('ellipsis', 22)}</button></div>
      <div class="xc-m"><span class="xc-mus">${E(muscTxt(e.exId))}</span>${F.wm(e.exId) === 2 ? `<span class="x2c">${F.x2Label(ex)}</span>` : ''}${doneN < e.sets.length ? `<button class="busy" data-a="exBusy" data-i="${i}">${ic('clock', 14)} Zajęte</button>` : ''}</div>
      ${(() => { const pl = (F.S.settings.painLog || []).filter(x => x.exId === e.exId && Date.now() - x.ts < 28 * 864e5); if (!pl.length) return ''; const l = pl[pl.length - 1]; return `<p class="xc-note pain">${ic('heart-pulse', 13)} Bolało: ${E((F.PLN && F.PLN.INJ[l.at]) || l.at)} · ${F.fmtDateShort(l.ts)}${pl.length > 1 ? ` (${pl.length}×)` : ''} — zacznij lżej, przerwij przy bólu</p>`; })()}
      ${(() => { if (i !== 0 || !d.planId || d.deload) return ''; const b = F.blockInfo && F.blockInfo(F.planOf(d.planId)); if (!b || b.over) return ''; return `<p class="xc-note hint">${ic('layers', 13)} Blok: tydzień ${b.week} z ${b.weeks} — ${b.deload ? 'tydzień odciążenia: mniej serii, większy zapas' : `kończ serie z zapasem ${b.rir} ${F.plur(b.rir, 'powtórzenia', 'powtórzeń', 'powtórzeń')}`}</p>`; })()}
      <div class="sx" id="sx-${i}">${chips(i)}</div>
      <div class="xc-2"><div><small>Poprzedni trening</small><b>${lastTxt(e, ex)}</b></div><button class="${sug ? 'hot' : ''}" ${sug ? `data-a="applySug" data-i="${i}"` : ''}><small>Cel na dziś</small><b>${sug ? `${!isT && !isB ? e.sets.filter(s => s.t !== 'w').length + ' × ' : ''}${sugT}` : tgt.replace('Cel ', '') || '–'}</b></button></div>
      ${sug && (sug.stag || sug.pct || sug.off || d.deload) ? `<p class="xc-note hint ${sug.stag ? 'warn' : ''}">${ic(sug.stag ? 'zap' : 'target', 13)} ${E(sug.note)}</p>` : ''}${firstTip(e, sug, ex)}
      ${e.note ? `<p class="xc-note">${ic('notebook-pen', 13)} ${E(e.note)}</p>` : ''}

</section>`;
  }
  V.workout = () => {
    const d = D();
    if (!d) return { html: `<div class="wk-none">${F.empty('dumbbell', 'Brak aktywnego treningu', 'Rozpocznij trening z planu albo zacznij od zera.', `<button class="btn primary" data-a="tab" data-tab="workout">${ic('flame', 18)} Zacznij trening</button>`)}</div>` };
    rebuildWkIdx(); const st = wkStats(); const ps = pagesOf();
    return {
      html: `<div class="wk wk2"><header class="wk-h"><button class="ibtn" data-a="wkMin" aria-label="Zminimalizuj">${ic('chevron-down', 26)}</button><div class="wk-t"><input data-b="wname" value="${E(d.name)}" maxlength="50" aria-label="Nazwa treningu"><small>${d.deload ? '<span class="dl-tag">Odciążenie</span> ' : ''}${d.backdate ? F.fmtDate(d.start) : `${ic('timer', 12)} <span data-wtime>${F.fmtDur((Date.now() - d.start) / 1000)}</span>`}${F.gymCur && F.gyms().length > 1 ? ` · <button class="wk-gym" data-a="gymPick">${ic('map-pin', 12)} ${E(F.gymCur().n)}</button>` : ''}</small></div><button class="btn sm primary" data-a="wkFinish">${ic('flag', 16)} Zakończ</button></header>
      <div class="wk-prog" id="wk-prog">${ps.map(() => '<span><i></i></span>').join('')}</div>
      <button class="wk-pos" data-a="wkList" aria-label="Otwórz listę ćwiczeń"><span>${ic('list-checks', 17)} <b id="wk-pos">Ćwiczenie 1 z ${ps.length}</b></span><em>Lista ćwiczeń ${ic('chevron-down', 16)}</em></button>
      <div class="wk-pager" id="wk-pager">${slides()}<div class="wk-slide wk-end" data-pg="${ps.length}"><h2>Podsumowanie</h2>
        <div class="wk-s"><div><small>Czas</small><b data-wtime>${F.fmtDur((Date.now() - d.start) / 1000)}</b></div><div><small>Tonaż</small><b data-wk="vol">${F.fmtVol(st.vol)}</b></div><div><small>Serie</small><b data-wk="sets">${st.done}/${st.all}</b></div><div><small>Kcal</small><b data-wk="kcal">${F.fmtNum(Math.round(F.kcalDraft(d).net / 5) * 5, 0)}</b></div></div>
        <button class="btn primary wide big" data-a="wkFinish">${ic('flag', 20)} Zakończ trening</button>
        <button class="btn ghost wide" data-a="wkAdd">${ic('plus', 20)} Dodaj ćwiczenie</button>
        <label class="fld"><span>Notatka do treningu</span><textarea data-b="wnote" rows="2" placeholder="Samopoczucie, sen, uwagi…">${E(d.note || '')}</textarea></label>
        <button class="btn ghost wide danger-t" data-a="wkCancel">${ic('trash-2', 18)} Anuluj trening</button></div></div>
      <div class="wk-hint" id="wk-hint" hidden>${ic('chevron-left', 16)} Przesuń palcem w lewo: następne ćwiczenie</div></div><div id="set-dock" class="sdk"></div>`,
      after: () => { bindPager(); F.refreshWorkoutRest(); F.wakeLock(); if (!d.exercises.some(e => e.sets.some(x => x.done))) setTimeout(() => F.feelAsk && F.feelAsk(), 400); }
    };
  };

  /* ---------- dock przerwy ---------- */
  F.refreshWorkoutRest = () => {
    if (F.$('#set-dock')) { F.refreshSetDock(); return; }
    const el = F.$('#rest-dock'); if (!el) return;
    if (!F.rest) { el.className = ''; el.innerHTML = ''; return; }
    el.className = 'on';
    const rc = 2 * Math.PI * 25; el.innerHTML = `<div class="rd"><button class="rd-main" data-a="restFull"><svg class="rd-ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" class="rg-bg" stroke-width="5" fill="none"/><circle cx="30" cy="30" r="25" class="rd-fg" data-rest-ring stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="${rc}" transform="rotate(-90 30 30)"/></svg><span><span class="rd-l">Przerwa</span><b class="rd-t" data-rest-time>0:00</b></span></button><div class="rd-b"><button data-a="restAdd" data-s="-15">−15</button><button data-a="restAdd" data-s="15">+15</button><button class="skip" data-a="restSkip">${ic('skip-forward', 18)}<span>Pomiń</span></button></div></div>`;
    F.tickRest();
  };
  F.act.restFull = () => {
    const c = 2 * Math.PI * 118; const d = D(); let nextTxt = '';
    if (d) { for (let i = 0; i < d.exercises.length && !nextTxt; i++) { const e = d.exercises[i]; const j = e.sets.findIndex(s => !s.done); if (j >= 0) { const ex = exOf(e.exId); nextTxt = `<small>Następna seria</small><b>${E(ex ? ex.name : '')}</b><span>${F.setTxt(ex, e.sets[j])}</span>`; } } }
    F.sheet(`<div class="rest-full"><div class="ringbig"><svg viewBox="0 0 260 260"><circle cx="130" cy="130" r="118" class="rg-bg" stroke-width="12" fill="none"/><circle cx="130" cy="130" r="118" class="rg-fg" data-rest-ring stroke="url(#rgrad)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${c}" transform="rotate(-90 130 130)"/><defs><linearGradient id="rgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs></svg><div class="ringbig-in"><small>Przerwa</small><b data-rest-time>0:00</b></div></div>
      <div class="btn-row split"><button class="btn ghost" data-a="restAdd" data-s="-15">−15 s</button><button class="btn ghost" data-a="restAdd" data-s="15">+15 s</button></div>${nextTxt ? `<div class="next-set">${nextTxt}</div>` : ''}<button class="btn primary wide" data-a="restSkipClose">${ic('skip-forward', 18)} Pomiń przerwę</button></div>`, { cls: 'full-rest' });
    F.tickRest();
  };
  F.act.restSkipClose = () => { F.restStop(false); F.closeSheet(true); };
  const _orc = F.onRestChange; F.onRestChange = () => { if (_orc) _orc(); if (!F.rest && F.$('.full-rest')) F.closeSheet(true); };

  /* ---------- edycja danych treningu ---------- */
  let dt = 0; const persist = () => { clearTimeout(dt); dt = setTimeout(() => F.saveDraft(), 350); };
  const updStats = () => { updProg(); const st = wkStats(); const v = F.$('[data-wk=vol]'), s = F.$('[data-wk=sets]'), k = F.$('[data-wk=kcal]'); if (v) v.textContent = F.fmtVol(st.vol); if (s) s.textContent = st.done + '/' + st.all; if (k && D()) k.textContent = F.fmtNum(Math.round(F.kcalDraft(D()).net / 5) * 5, 0); };
  const num = v => parseFloat(String(v).replace(',', '.'));
  F.bind.wname = el => { D().name = el.value; persist(); };
  F.bind.wnote = el => { D().note = el.value; persist(); };
  F.bind.wk = el => { const e = D().exercises[+el.dataset.i], s = e.sets[+el.dataset.j]; const v = num(el.value) || 0; if (el.dataset.f === 'w') s.w = F.fromDisp(v) * F.wm(e.exId); else s.r = v; persist(); if (s.done) updStats(); if (el.closest('#set-dock') && s.done) { const c = F.$('#sx-' + el.dataset.i); if (c) c.innerHTML = chips(+el.dataset.i); } };
  const redraw = i => { const g = F.ssInfo(D().exercises)[i]; if (g) { const el = F.$('#ssg-' + g.start); if (el) el.outerHTML = ssCard(g.start, g.end); } else { const el = F.$('#xc-' + i); if (el) el.outerHTML = card(i); } updStats(); if (F.refreshSetDock) F.refreshSetDock(); };
  F.act.nudge = b => {
    const i = +b.dataset.i, j = +b.dataset.j, e = D().exercises[i], s = e.sets[j], ex = exOf(e.exId) || {}; const dir = +b.dataset.d, m = F.wm(e.exId);
    if (b.dataset.f === 'w') { const cur = F.toDisp(s.w || 0) / m; const nv = Math.max(0, Math.round((cur + dir * stepDisp()) * 100) / 100); s.w = F.fromDisp(nv) * m; }
    else { const st = ex.type === 'time' ? 5 : 1; s.r = Math.max(0, (s.r || 0) + dir * st); }
    const row = F.$('#sr-' + i + '-' + j); if (!row) return; const wi = row.querySelector('input[data-f=w]'), ri = row.querySelector('input[data-f=r]');
    if (wi) wi.value = s.w ? F.fw(s.w / m) : ''; if (ri) ri.value = s.r || ''; F.haptic(8); persist(); if (s.done) updStats();
  };
  F.act.usePrev = b => { const i = +b.dataset.i, j = +b.dataset.j, e = D().exercises[i]; const last = F.LAST[e.exId]; const p = last && last.sets[j]; if (!p) return; e.sets[j].w = p.w; e.sets[j].r = p.r; persist(); redraw(i); };
  F.act.applySug = b => { const i = +b.dataset.i, e = D().exercises[i]; const sug = F.suggest(e.exId, e.target && e.target.reps, sugOpts(e)); if (!sug) return; e.sets.forEach(s => { if (!s.done && s.t !== 'w') { s.w = sug.w; s.r = sug.r; } }); persist(); redraw(i); F.toast('Ustawiono cel: ' + sug.note); };
  F.act.addSet = b => { const i = +b.dataset.i, e = D().exercises[i]; const l = [...e.sets].reverse().find(s => s.t !== 'w') || e.sets[e.sets.length - 1] || { w: 0, r: 0 }; e.sets.push({ w: l.w, r: l.r, t: 'n', done: false }); F.saveDraft(); redraw(i); };

  // przełącza serię; zwraca informacje o rekordach
  function toggleDone(i, j) {
    const d = D(), e = d.exercises[i], s = e.sets[j], ex = exOf(e.exId); if (!s) return null;
    s.done = !s.done;
    if (!s.done) { s.pr = null; return { on: false }; }
    if (ex && ex.type !== 'time') { const last = F.LAST[e.exId]; const p = last && last.sets[j]; if (p) { if (!s.r) s.r = p.r; if (!s.w && ex.type !== 'br') s.w = p.w; } }
    const prs = F.checkPR(wkIdx, ex, s, d.start); s.pr = prs.map(p => p.k); if (ex && F.isWork(s)) F.addToIdx(wkIdx, ex, s, d.start);
    return { on: true, prs, s, ex };
  }
  F.act.check = b => {
    const i = +b.dataset.i, j = +b.dataset.j, d = D(), e = d.exercises[i], ex = exOf(e.exId);
    const r = toggleDone(i, j); if (!r) return; F.saveDraft();
    if (r.on) {
      F.ui.lastChk = { i, j }; F.ui.sel = null;
      F.haptic(25); redraw(i);
      const nb = F.$(`#sr-${i}-${j} .ck`); if (nb) { nb.classList.add('pop'); if (!r.prs.length) F.burstAt(nb, 10, .5); }
      if (r.prs.length) celebrate(r.prs, ex, r.s, nb);
      const st = wkStats();
      if (F.S.settings.autoRest && st.done < st.all) F.restStart(r.s.t === 'w' ? 45 : exRest(e, ex), ex ? ex.name : '');
      else if (st.done === st.all) F.toast(ic('flag', 16) + ' Wszystkie serie zaliczone. Zakończ trening.', 'hot');
    } else { F.ui.sel = { i, j }; rebuildWkIdx(); redraw(i); }
    F.refreshSetDock();
  };
  // zaliczenie całej rundy superserii jednym przyciskiem
  F.act.ssCheck = b => {
    const st0 = +b.dataset.s, j = +b.dataset.j, d = D(), g = F.ssInfo(d.exercises)[st0]; if (!g) return;
    const mem = []; for (let k = g.start; k <= g.end; k++) if (d.exercises[k].sets[j]) mem.push(k);
    if (mem.every(k => d.exercises[k].sets[j].done)) { mem.forEach(k => { const s = d.exercises[k].sets[j]; s.done = false; s.pr = null; }); F.saveDraft(); rebuildWkIdx(); redraw(st0); return; }
    const res = []; mem.forEach(k => { if (!d.exercises[k].sets[j].done) { const r = toggleDone(k, j); if (r) res.push([k, r]); } });
    F.saveDraft(); F.haptic(25); redraw(st0);
    const nb = F.$(`#ssr-${g.start}-${j} .ck`); if (nb) nb.classList.add('pop');
    const pr = res.filter(x => x[1].prs && x[1].prs.length); if (!pr.length && nb) F.burstAt(nb, 12, .6);
    pr.forEach(([k, r], n) => setTimeout(() => celebrate(r.prs, exOf(d.exercises[k].exId), r.s, nb), n * 3400));
    const stt = wkStats(); let rs = 0; for (let k = g.start; k <= g.end; k++) rs = Math.max(rs, exRest(d.exercises[k], exOf(d.exercises[k].exId)));
    if (F.S.settings.autoRest && stt.done < stt.all) F.restStart(rs, F.ssName(g.size) + ' ' + g.L);
    else if (stt.done === stt.all) F.toast(ic('flag', 16) + ' Wszystkie serie zaliczone. Zakończ trening.', 'hot');
    const nxt = F.$(`#ssr-${g.start}-${j + 1}`); if (nxt) setTimeout(() => nxt.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }), 120);
  };
  F.act.ssAddRound = b => { const d = D(), g = F.ssInfo(d.exercises)[+b.dataset.s]; for (let k = g.start; k <= g.end; k++) { const e = d.exercises[k]; const l = [...e.sets].reverse().find(x => x.t !== 'w') || e.sets[e.sets.length - 1] || { w: 0, r: 0 }; e.sets.push({ w: l.w, r: l.r, t: 'n', done: false }); } ssEqualize(g.start, g.end); F.saveDraft(); redraw(g.start); };
  F.act.ssMenu = b => {
    const d = D(), st0 = +b.dataset.s, j = +b.dataset.j, g = F.ssInfo(d.exercises)[st0]; let h = '';
    for (let k = g.start; k <= g.end; k++) { const s = d.exercises[k].sets[j]; if (!s) continue; h += `<h4 class="lbl"><span class="ss-tag">${F.ssInfo(d.exercises)[k].tag}</span> ${E(F.exName(d.exercises[k].exId))} — RPE</h4><div class="chips">${[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => `<button class="chip ${s.rpe === r ? 'on' : ''}" data-a="setRpe" data-r="${r}" data-i="${k}" data-j="${j}">${String(r).replace('.', ',')}</button>`).join('')}</div>`; }
    F.sheet(`${h}<div class="btn-row"><button class="btn ghost" data-a="ssDup" data-s="${st0}" data-j="${j}">${ic('copy', 18)} Duplikuj rundę</button><button class="btn danger" data-a="ssDel" data-s="${st0}" data-j="${j}">${ic('trash-2', 18)} Usuń rundę</button></div>`, { title: `Runda ${j + 1}`, cls: 'compact' });
  };
  F.act.ssDup = b => { const d = D(), g = F.ssInfo(d.exercises)[+b.dataset.s], j = +b.dataset.j; for (let k = g.start; k <= g.end; k++) { const e = d.exercises[k], s = e.sets[j]; if (s) e.sets.splice(j + 1, 0, { w: s.w, r: s.r, t: 'n', done: false }); } F.saveDraft(); F.closeSheet(true); redraw(g.start); };
  F.act.ssDel = b => { const d = D(), g = F.ssInfo(d.exercises)[+b.dataset.s], j = +b.dataset.j; if (ssRounds(g.start, g.end) <= 1) { F.toast('To ostatnia runda'); return; } for (let k = g.start; k <= g.end; k++) d.exercises[k].sets.splice(j, 1); F.saveDraft(); F.closeSheet(true); rebuildWkIdx(); redraw(g.start); };
  function celebrate(prs, ex, s, btn) {
    const p = prs[0]; const txt = ex.type === 'time' ? F.fmtDur(s.r) : ex.type === 'br' ? s.r + ' powt.' : `${F.fwt(s.w, ex)} ${F.unit()} × ${s.r}`;
    const el = document.createElement('div'); el.className = 'pr-banner'; el.innerHTML = `${ic('trophy', 28)}<div><b>Nowy rekord</b><span>${E(p.label)}</span><em>${E(ex.name)} · ${txt}</em></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { const bst = document.createElement('img'); bst.className = 'pr-burst'; bst.src = 'assets/bg/burst.webp'; bst.alt = ''; document.body.appendChild(bst); setTimeout(() => bst.remove(), 1300); }
    F.haptic([60, 40, 60, 40, 160]); F.beep([[660, .09], [880, .09], [1175, .09], [1568, .26]]);
    if (btn) F.burstAt(btn, 70, 1.3); setTimeout(() => F.burst(innerWidth / 2, 90, 60, 1.1), 180);
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 3200);
  }

  /* ---------- menu serii ---------- */
  F.act.setMenu = b => {
    const i = +b.dataset.i, j = +b.dataset.j, s = D().exercises[i].sets[j];
    F.sheet(`<div class="seg big wrap">${[['n', 'Normalna'], ['w', 'Rozgrzewka'], ['d', 'Drop set'], ['f', 'Do upadku']].map(t => `<button class="${(s.t || 'n') === t[0] ? 'on' : ''}" data-a="setType" data-t="${t[0]}" data-i="${i}" data-j="${j}">${t[1]}</button>`).join('')}</div>
      <h4 class="lbl">RPE (jak ciężko było)</h4><div class="chips">${[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => `<button class="chip ${s.rpe === r ? 'on' : ''}" data-a="setRpe" data-r="${r}" data-i="${i}" data-j="${j}">${String(r).replace('.', ',')}</button>`).join('')}</div>
      <div class="btn-row"><button class="btn ghost" data-a="setDup" data-i="${i}" data-j="${j}">${ic('copy', 18)} Duplikuj</button><button class="btn danger" data-a="setDel" data-i="${i}" data-j="${j}">${ic('trash-2', 18)} Usuń serię</button></div>`, { title: `Seria ${j + 1}`, cls: 'compact' });
  };
  F.act.setType = b => { D().exercises[+b.dataset.i].sets[+b.dataset.j].t = b.dataset.t; F.saveDraft(); F.closeSheet(true); rebuildWkIdx(); redraw(+b.dataset.i); };
  F.act.setRpe = b => { const s = D().exercises[+b.dataset.i].sets[+b.dataset.j]; s.rpe = s.rpe === +b.dataset.r ? null : +b.dataset.r; F.saveDraft(); F.closeSheet(true); F.toast(s.rpe ? 'RPE ' + s.rpe : 'RPE usunięte'); };
  F.act.setDup = b => { const e = D().exercises[+b.dataset.i]; const s = e.sets[+b.dataset.j]; e.sets.splice(+b.dataset.j + 1, 0, { w: s.w, r: s.r, t: s.t, done: false }); F.saveDraft(); F.closeSheet(true); redraw(+b.dataset.i); };
  F.act.setDel = b => { const e = D().exercises[+b.dataset.i]; e.sets.splice(+b.dataset.j, 1); F.saveDraft(); F.closeSheet(true); rebuildWkIdx(); redraw(+b.dataset.i); };

  /* ---------- menu ćwiczenia ---------- */
  F.act.exX2 = b => { const e = D().exercises[+b.dataset.i], ex = exOf(e.exId); if (!ex) return; const st = F.S.settings; st.x2 = st.x2 || {}; st.x2[ex.id] = !F.x2(ex); F.saveSettings(); F.closeSheet(true); F.render(true); F.toast(st.x2[ex.id] ? 'Wpisujesz ciężar jednej sztuki — razem ×2' : 'Wpisujesz ciężar łączny'); };
  F.act.exMenu = b => {
    const i = +b.dataset.i, d = D(), e = d.exercises[i], ex = exOf(e.exId) || {};
    F.sheet(`<div class="menu"><button data-a="exSwap" data-i="${i}">${ic('arrow-left-right', 20)}<span>Zamień ćwiczenie</span></button><button data-a="exPain" data-i="${i}">${ic('heart-pulse', 20)}<span>Boli przy tym ćwiczeniu<small>Zapiszę to i podpowiem, co dalej</small></span></button><button data-a="exRestSet" data-i="${i}">${ic('timer', 20)}<span>Czas przerwy<small>Obecnie ${F.fmtDur(exRest(e, ex))}</small></span></button>${F.ssInfo(d.exercises)[i] ? '' : `<button data-a="exWarm" data-i="${i}">${ic('flame', 20)}<span>Dodaj rozgrzewkę<small>Progresja serii rozgrzewkowych do ciężaru roboczego</small></span></button>`}<button data-a="exNote" data-i="${i}">${ic('notebook-pen', 20)}<span>Notatka do ćwiczenia</span></button>${ex.type === 'wr' || ex.type === 'bwr' ? `<button data-a="exX2" data-i="${i}">${ic('dumbbell', 20)}<span>${F.x2(ex) ? 'Wpisuję łączny ciężar' : 'Wpisuję ciężar jednej sztuki (×2)'}<small>${F.x2(ex) ? 'Teraz: jedna hantla/strona, razem ×2. Dotknij, by wpisywać sumę' : 'Np. 2 hantle po 10 kg wpisujesz jako 10. Zapis i tonaż liczone razem'}</small></span></button>` : ''}${ssItems(i)}<div class="menu-2"><button data-a="exUp" data-i="${i}" ${i === 0 ? 'disabled' : ''}>${ic('arrow-up', 20)}Przesuń wyżej</button><button data-a="exDown" data-i="${i}" ${i === d.exercises.length - 1 ? 'disabled' : ''}>${ic('arrow-down', 20)}Przesuń niżej</button></div><button class="danger" data-a="exRemove" data-i="${i}">${ic('trash-2', 20)}Usuń z treningu</button></div>`, { title: E(ex.name || 'Ćwiczenie') });
  };
  function ssItems(i) {
    const d = D(), arr = d.exercises, inf = F.ssInfo(arr)[i]; let h = '';
    if (i < arr.length - 1) h += `<button data-a="exLink" data-i="${i}">${ic('link-2', 20)}<span>Połącz z następnym ćwiczeniem<small>Superseria / obwód — serie na przemian, przerwa po całej rundzie</small></span></button>`;
    if (inf) h += `<button data-a="exUnlink" data-i="${i}">${ic('x', 20)}<span>Wyjmij z ${F.ssName(inf.size).toLowerCase() === 'obwód' ? 'obwodu' : 'superserii'}<small>Obecnie ${inf.tag}</small></span></button>`;
    return h;
  }
  F.act.exLink = b => { const i = +b.dataset.i, a = D().exercises; const id = a[i].ss || a[i + 1].ss || F.uid(); a[i].ss = id; a[i + 1].ss = id; F.cleanSS(a); { const g = F.ssInfo(a)[i]; if (g) ssEqualize(g.start, g.end); } F.saveDraft(); F.closeSheet(true); F.render(true); F.toast('Połączono w superserię'); };
  F.act.exUnlink = b => { const i = +b.dataset.i, a = D().exercises; delete a[i].ss; F.cleanSS(a); F.saveDraft(); F.closeSheet(true); F.render(true); };
  F.act.exWarm = b => {
    const i = +b.dataset.i, e = D().exercises[i]; const work = e.sets.find(s => s.t !== 'w' && s.w); if (!work) { F.closeSheet(true); F.toast('Najpierw wpisz ciężar roboczy'); return; }
    const ws = F.warmupSets(work.w).map(x => ({ w: x.w, r: x.r, t: 'w', done: false })); e.sets = [...ws, ...e.sets.filter(s => s.t !== 'w')]; F.saveDraft(); F.closeSheet(true); redraw(i); F.toast(`Dodano ${ws.length} serie rozgrzewkowe`);
  };
  F.act.exNote = async b => { const i = +b.dataset.i; const e = D().exercises[i]; F.closeSheet(true); const v = await F.prompt({ title: 'Notatka', label: 'Co warto zapamiętać? (np. ustawienie maszyny)', value: e.note || '' }); if (v != null) { e.note = v; F.saveDraft(); redraw(i); } };
  F.act.exRestSet = async b => { const i = +b.dataset.i; const e = D().exercises[i]; F.closeSheet(true); const v = await F.prompt({ title: 'Czas przerwy', label: 'Sekundy', value: String(exRest(e, exOf(e.exId))), type: 'number' }); if (v != null && +v > 0) { e.rest = +v; F.saveDraft(); redraw(i); } };
  const swapTo = (i, id) => { const e = D().exercises[i]; if ((F.restRole(e.exId) === 'iso') !== (F.restRole(id) === 'iso') || !e.rest) e.rest = F.restFor(id, dPlan()); e.exId = id; e.sets = buildSets(id, e.sets.length || 3, e.target && e.target.reps); F.ui.sel = null; F.saveDraft(); F.render(true); };
  F.act.exSwap = async b => { const i = +b.dataset.i; const e0 = D().exercises[i]; const id = await F.swapSheet(e0.exId, D().exercises.map(x => x.exId)); if (!id) return; swapTo(i, id); };
  // „Zajęte”: zrób później albo szybki zamiennik na sprzęt z aktywnego miejsca
  F.act.exBusy = b => {
    const i = +b.dataset.i, d = D(), e = d.exercises[i], cur = exOf(e.exId) || {}; const list = F.similarEx(e.exId, d.exercises.map(x => x.exId), 6); const later = d.exercises.length > 1 && i < d.exercises.length - 1 && !F.ssInfo(d.exercises)[i];
    F.sheet(`${later ? `<button class="btn primary wide" data-a="exLater" data-i="${i}">${ic('arrow-down', 18)} Zrób później — przesuń na koniec</button>` : ''}
      <p class="dim small sw-h">${later ? 'Albo zamień na:' : 'Zamień na:'} ${F.gymCur ? `<span>sprzęt: ${E(F.gymCur().n)}</span>` : ''}</p>
      ${list.length ? `<div class="exlist">${list.map(x => `<button class="exrow" data-a="busyPick" data-i="${i}" data-id="${E(x.id)}">${F.mDot(x.muscle)}<span><b>${E(x.name)}</b><small>${F.MUSCLES[x.muscle]} · ${E(x.equip)}</small></span>${ic('chevron-right', 16)}</button>`).join('')}</div>` : '<p class="dim small">Brak zamienników na ten sprzęt.</p>'}`, { title: 'Zajęte: ' + E(cur.name || '') });
  };
  F.act.busyPick = b => { F.closeSheet(true); swapTo(+b.dataset.i, b.dataset.id); F.toast('Zamieniono ćwiczenie'); };
  F.act.exLater = b => { const i = +b.dataset.i, a = D().exercises; const [x] = a.splice(i, 1); a.push(x); F.cleanSS(a); F.ui.sel = null; F.saveDraft(); F.closeSheet(true); F.render(true); F.toast('Przesunięte na koniec treningu'); };
  F.act.exUp = b => { const i = +b.dataset.i, a = D().exercises; [a[i - 1], a[i]] = [a[i], a[i - 1]]; F.cleanSS(a); F.saveDraft(); F.closeSheet(true); F.render(true); };
  F.act.exDown = b => { const i = +b.dataset.i, a = D().exercises; [a[i + 1], a[i]] = [a[i], a[i + 1]]; F.cleanSS(a); F.saveDraft(); F.closeSheet(true); F.render(true); };
  F.act.exRemove = async b => { const i = +b.dataset.i; const e = D().exercises[i]; if (e.sets.some(s => s.done) && !(await F.confirm({ title: 'Usunąć ćwiczenie?', text: 'Zaliczone serie z tego ćwiczenia przepadną.', ok: 'Usuń', danger: true }))) return; D().exercises.splice(i, 1); F.cleanSS(D().exercises); F.saveDraft(); F.closeSheet(true); rebuildWkIdx(); F.render(true); };
  F.act.wkAdd = async () => {
    const ids = await F.pickExercises(); if (!ids || !ids.length) return;
    ids.forEach(id => { const ex = exOf(id); D().exercises.push({ k: F.uid(), exId: id, note: '', rest: ex && ex.muscle === 'cardio' ? 0 : F.restFor(id, dPlan()), target: null, sets: buildSets(id, ex && ex.muscle === 'cardio' && ex.type === 'time' ? 1 : 3, ex && ex.type === 'time' ? '45' : '') }); }); F.closeSheet(true); F.saveDraft(); F.ui.wkPage = pagesOf().length - 1; F.render(true);
  };
  F.act.wkMin = () => F.go('#/home');
  F.act.wkCancel = async () => {
    if (!(await F.confirm({ title: 'Anulować trening?', text: 'Wszystkie wpisane serie przepadną. Tej operacji nie da się cofnąć.', ok: 'Anuluj trening', cancel: 'Wróć', danger: true }))) return;
    F.S.draft = null; F.restStop(false); await F.saveDraft(); F.wakeRelease(); F.toast('Trening anulowany'); F.go('#/home');
  };

  /* ---------- zakończenie treningu ---------- */
  F.act.wkFinish = async () => {
    const d = D(), st = wkStats();
    if (!st.done) { if (await F.confirm({ title: 'Nic nie zaliczone', text: 'Nie zaliczyłeś żadnej serii. Anulować ten trening?', ok: 'Anuluj trening', cancel: 'Wróć', danger: true })) F.act.wkCancelForce(); return; }
    const pend = st.all - st.done;
    if (pend > 0 && !(await F.confirm({ title: 'Zakończyć trening?', text: `Masz ${pend} ${pend === 1 ? 'niezaliczoną serię' : 'niezaliczonych serii'}. Zostaną pominięte i nie trafią do historii.`, ok: 'Zakończ', cancel: 'Wróć' }))) return;
    const xpBefore = F.xp(); const rankBefore = F.rank().i;
    const now = Date.now();
    const sess = { id: d.id, start: d.start, end: now, dur: d.backdate ? 0 : Math.round((now - d.start) / 1000), name: d.name || 'Trening', deload: !!d.deload, planId: d.planId, dayId: d.dayId, note: d.note || '', exercises: [] };
    const idx = F.cloneIdx(); const prs = [];
    const pendC = [];
    d.exercises.forEach(e => {
      if (e.later && !e.sets.some(s => s.done)) { pendC.push({ id: F.uid(), exId: e.exId, mins: Math.max(5, Math.round(((e.sets[0] && e.sets[0].r) || 1200) / 60)), int: (e.sets[0] && e.sets[0].int) || 2, until: now + 48 * 36e5 }); return; }
      const ex = exOf(e.exId); const sets = e.sets.filter(s => s.done).map(s => ({ w: s.w || 0, r: s.r || 0, t: s.t || 'n', rpe: s.rpe || null, done: true, ...(s.int ? { int: s.int } : {}) }));
      if (!sets.length) return;
      sets.forEach(s => { s.pr = null; const p = ex ? F.checkPR(idx, ex, s, d.start) : []; if (ex && F.isWork(s)) F.addToIdx(idx, ex, s, d.start); if (p.length) { s.pr = p.map(x => x.k); const txt = ex.type === 'time' ? F.fmtDur(s.r) : ex.type === 'br' ? s.r + ' powt.' : `${F.fwt(s.w, ex)} ${F.unit()} × ${s.r}`; const k = p[0]; const prev = prs.findIndex(q => q.exId === e.exId); const rec = { exId: e.exId, k: k.k, label: k.label, text: txt }; if (prev >= 0) prs[prev] = rec; else prs.push(rec); } });
      const rec = { exId: e.exId, note: e.note || '', rest: e.rest || 0, sets }; if (e.ss) rec.ss = e.ss; sess.exercises.push(rec);
    });
    sess.prs = prs; if (pendC.length) sess.pend = pendC; if (d.pain && d.pain.length) sess.pain = d.pain; if (d.feel) sess.feel = d.feel;
    await F.addSession(sess); F.S.draft = null; await F.saveDraft(); F.restStop(false); F.wakeRelease();
    summary(sess, F.xp() - xpBefore, F.rank().i > rankBefore);
  };
  F.act.wkCancelForce = async () => { F.S.draft = null; F.restStop(false); await F.saveDraft(); F.wakeRelease(); F.go('#/home'); };

  function summary(s, xpGain, rankUp) {
    const vol = F.sessionVolume(s); const rk = F.rank();
    F.go('#/home');
    const html = `<div class="sum"><div class="sum-top"><img class="sum-logo" src="assets/bg/logo.webp" alt="FORGE"><h2>Trening<br>zaliczony</h2><p>${E(s.name)}</p></div>
      <div class="sum-stats"><div><small>Czas</small><b>${F.fmtMin(s.dur)}</b></div><div><small>Tonaż</small><b>${F.fmtVol(vol)}</b></div><div><small>Serie</small><b>${F.sessionSets(s)}</b></div><div><small>Kcal</small><b>${F.fmtNum(Math.round(F.sessKcal(s).net / 5) * 5, 0)}</b></div></div>
      ${s.pend && s.pend.length ? `<p class="small">${ic('timer', 14)} Do dokończenia: ${s.pend.map(p => E(F.exName(p.exId)) + ' ' + p.mins + ' min').join(', ')}. Dopiszesz to z ekranu głównego w ciągu 48 godzin — trening zostanie przeliczony.</p>` : ''}
      ${s.prs.length ? `<div class="sum-pr"><h3>${ic('trophy', 20)} ${s.prs.length === 1 ? 'Nowy rekord' : s.prs.length + ' nowe rekordy'}</h3>${s.prs.map(p => `<div><b>${E(F.exName(p.exId))}</b><span>${E(p.text)}</span></div>`).join('')}</div>` : ''}
      ${F.changesHtml(s)}
      <div class="sum-xp"><span>+${F.fmtNum(xpGain, 0)} XP</span><i class="bar"><i style="width:${(rk.pct * 100).toFixed(0)}%"></i></i><small>${rankUp ? `Awans! Nowa ranga: <b>${rk.name}</b>` : rk.next ? `Ranga ${rk.name} · ${F.fmtNum(rk.toNext, 0)} XP do ${rk.next}` : 'Ranga maksymalna'}</small></div>
      <div class="btn-row"><button class="btn ghost" data-a="sumShare" data-id="${s.id}">${ic('share-2', 18)} Karta</button><button class="btn primary grow" data-a="closeSheet">Gotowe</button></div></div>`;
    setTimeout(() => {
      F.sheet(html, { cls: 'full-sum' }); F.haptic([80, 50, 80]); F.beep([[523, .1], [659, .1], [784, .2]]);
      F.burst(innerWidth / 2, innerHeight * .35, s.prs.length ? 90 : 40, s.prs.length ? 1.4 : .9); if (s.prs.length) setTimeout(() => F.burst(innerWidth * .25, innerHeight * .4, 40, 1), 300), setTimeout(() => F.burst(innerWidth * .75, innerHeight * .4, 40, 1), 500);
    }, 220);
  }
  F.act.sumShare = b => { const s = F.S.sessions.find(x => x.id === b.dataset.id); if (s) F.shareCard(s); };

  /* ---------- karta do udostępnienia ---------- */
  F.shareCard = async s => {
    try { await Promise.all([document.fonts.load('italic 800 80px "Barlow Condensed"'), document.fonts.load('700 40px "Barlow Condensed"'), document.fonts.load('500 30px Barlow')]); } catch (e) { }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const cs = getComputedStyle(document.documentElement); const a1 = cs.getPropertyValue('--a1').trim() || '#ff4b1f', a2 = cs.getPropertyValue('--a2').trim() || '#ff9a1f';
    const pic = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    const [bgI, logoI] = await Promise.all([pic('assets/bg/share.webp'), pic('assets/bg/logo.webp')]);
    g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, W, H); if (bgI) g.drawImage(bgI, 0, 0, W, H);
    if (logoI) g.drawImage(logoI, 70, 74, 360, 360 * logoI.naturalHeight / logoI.naturalWidth);
    g.fillStyle = '#c9c0b6'; g.font = '500 34px Barlow'; g.textAlign = 'right'; g.fillText(F.fmtDateLong(s.start), W - 70, 124); g.textAlign = 'left';
    let fs = 170; const title = (s.name || 'Trening').toUpperCase(); g.font = `italic 800 ${fs}px "Barlow Condensed"`; while (g.measureText(title).width > W - 140 && fs > 60) { fs -= 6; g.font = `italic 800 ${fs}px "Barlow Condensed"`; }
    g.fillStyle = '#fff'; g.fillText(title, 70, 380);
    const bar = g.createLinearGradient(70, 0, 500, 0); bar.addColorStop(0, a2); bar.addColorStop(1, a1); g.fillStyle = bar; g.fillRect(70, 410, 420, 10);
    const stats = [['CZAS', F.fmtMin(s.dur)], ['TONAŻ', F.fmtVol(F.sessionVolume(s))], ['SERIE', String(F.sessionSets(s))]];
    stats.forEach((st, i) => { const x = 70 + i * 330; g.fillStyle = '#8b91a0'; g.font = '700 30px "Barlow Condensed"'; g.fillText(st[0], x, 500); g.fillStyle = '#fff'; g.font = 'italic 800 96px "Barlow Condensed"'; g.fillText(st[1], x, 590); });
    g.fillStyle = '#ffffff22'; g.fillRect(70, 640, W - 140, 2);
    let y = 720; const rows = s.exercises.map(e => { const ex = exOf(e.exId); const ws = e.sets.filter(F.isWork); if (!ex || !ws.length) return null; const best = ws.reduce((a, b) => (F.setMetrics(ex, b, s.start).e1 || b.r || 0) > (F.setMetrics(ex, a, s.start).e1 || a.r || 0) ? b : a, ws[0]); return { name: ex.name, txt: `${F.setTxt(ex, best).replace(' ' + F.unit(), '')}`, pr: (s.prs || []).some(p => p.exId === e.exId), sets: ws.length }; }).filter(Boolean).slice(0, 6);
    rows.forEach(r => { g.fillStyle = r.pr ? '#ffd34d' : '#e8eaf0'; g.font = '700 46px "Barlow Condensed"'; let nm = r.name; while (g.measureText(nm).width > 560 && nm.length > 4) nm = nm.slice(0, -2); if (nm !== r.name) nm += '…'; g.fillText((r.pr ? '★ ' : '') + nm, 70, y); g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = 'italic 800 54px "Barlow Condensed"'; g.fillText(r.txt, W - 70, y); g.textAlign = 'left'; g.fillStyle = '#8b91a0'; g.font = '500 26px Barlow'; g.fillText(r.sets + ' ' + (r.sets === 1 ? 'seria' : 'serie'), 70, y + 34); y += 96; });
    if (s.prs && s.prs.length) { g.fillStyle = '#ffd34d'; g.font = 'italic 800 52px "Barlow Condensed"'; g.fillText(`★ ${s.prs.length} ${s.prs.length === 1 ? 'NOWY REKORD' : 'NOWE REKORDY'}`, 70, 1235); }
    g.fillStyle = '#8b91a0'; g.font = '500 28px Barlow'; g.textAlign = 'right'; g.fillText('Kuj swoją siłę.', W - 70, 1285); g.textAlign = 'left';
    g.fillStyle = bar; g.fillRect(0, H - 14, W, 14);
    c.toBlob(async blob => {
      const file = new File([blob], 'forge-trening.png', { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Mój trening — FORGE' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      F.download('forge-trening.png', blob); F.toast('Karta zapisana jako obraz');
    }, 'image/png');
  };
})();
