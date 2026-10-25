/* FORGE — trening na żywo: serie, ciężar, powtórzenia, stoper przerw, rekordy, podsumowanie, karta do udostępnienia */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const exOf = id => F.S.ex.get(id);
  F.LOGO_PATH = 'M30 8H88L84 28H45.7L41.9 46H78L74 64H38L32 92H12Z';
  F.logo = (size = 40, cls = '') => `<svg class="logo ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="lg${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs><path d="${F.LOGO_PATH}" fill="url(#lg${size})"/></svg>`;

  const dayPart = () => { const h = new Date().getHours(); return h < 10 ? 'Poranny trening' : h < 15 ? 'Trening południowy' : h < 20 ? 'Popołudniowy trening' : 'Wieczorny trening'; };
  const parseRepsLo = r => { const m = String(r || '').match(/\d+/); return m ? +m[0] : 0; };
  const exRest = (e, ex) => e.rest || (ex && ex.compound ? F.S.settings.defaultRest : Math.max(30, Math.round(F.S.settings.defaultRest * 0.6 / 15) * 15));

  /* ---------- superserie / obwody: ciągłe grupy ćwiczeń o tym samym ss ---------- */
  F.ssInfo = arr => { const out = arr.map(() => null); let i = 0, g = 0; while (i < arr.length) { const id = arr[i].ss; let j = i; if (id) while (j + 1 < arr.length && arr[j + 1].ss === id) j++; if (id && j > i) { const L = String.fromCharCode(65 + (g++ % 26)); for (let k = i; k <= j; k++) out[k] = { tag: L + (k - i + 1), pos: k - i, size: j - i + 1, start: i, end: j, L }; } i = j + 1; } return out; };
  F.cleanSS = arr => { const inf = F.ssInfo(arr); arr.forEach((e, k) => { if (e.ss && !inf[k]) delete e.ss; }); };
  F.ssName = n => n >= 3 ? 'Obwód' : 'Superseria';
  const pgOf = it => (it.prog && it.prog !== 'auto') || it.inc || it.pct ? { prog: it.prog || 'auto', inc: it.inc || 0, pct: it.pct || 0 } : null;

  /* ---------- budowanie treningu ---------- */
  function buildSets(exId, count, reps, w0, pg) {
    pg = pg || {};
    const useSug = (F.S.settings.autoProg !== false && pg.prog !== 'off') || pg.pct;
    const ex = exOf(exId), last = F.LAST[exId], sug = useSug ? F.suggest(exId, reps, { mode: pg.prog === 'linear' ? 'linear' : 'auto', inc: pg.inc, pct: pg.pct }) : null, lo = parseRepsLo(reps); const sets = [];
    const topW = last ? Math.max(...last.sets.map(s => s.w || 0)) : 0;
    for (let i = 0; i < count; i++) {
      const prev = last ? (last.sets[i] || last.sets[last.sets.length - 1]) : null; let w = 0, r = 0;
      if (ex && ex.type === 'time') { r = prev ? prev.r : (ex.muscle === 'cardio' ? 1200 : (lo || 45)); }
      else if (ex && ex.type === 'br') { r = prev ? prev.r : (lo || 10); }
      else { w = sug ? sug.w : (prev ? prev.w : (w0 || 0)); r = prev ? prev.r : (lo || 10); if (sug && sug.w > topW && lo) r = lo; }
      const st = { w, r, t: 'n', done: false }; if (ex && ex.muscle === 'cardio' && ex.type === 'time') st.int = (pg && pg.cint) || (prev && prev.int) || 2; sets.push(st);
    }
    return sets;
  }
  F.startWorkout = (o = {}) => {
    if (F.S.draft) { F.go('#/workout'); return; }
    const d = { id: F.uid(), start: o.backdate || Date.now(), name: dayPart(), planId: null, dayId: null, note: '', backdate: !!o.backdate, exercises: [], rest: null };
    if (o.backdate) d.start = o.backdate;
    if (o.plan && o.day) { d.name = o.day.name; d.planId = o.plan.id; d.dayId = o.day.id; d.planName = o.plan.name; d.deload = F.deloadOn(); d.exercises = o.day.items.filter(i => exOf(i.exId)).map(i => { if (i.cardio) { const secs = +i.reps || 1800, ci = i.cardio.int || 2; return { k: F.uid(), exId: i.exId, note: i.note || '', rest: 0, target: { sets: 1, reps: String(secs) }, sets: [{ w: 0, r: secs, t: 'n', done: false, int: ci }], cardio: { int: ci, post: !!i.cardio.post } }; } const n = d.deload && (i.sets || 3) >= 3 ? (i.sets || 3) - 1 : (i.sets || 3); const pg = pgOf(i); const e = { k: F.uid(), exId: i.exId, note: i.note || '', rest: i.rest || 0, target: { sets: n, reps: i.reps }, sets: buildSets(i.exId, n, i.reps, i.w, pg) }; if (i.ss) e.ss = i.ss; if (pg) e.pg = pg; return e; }); { const inf = F.ssInfo(d.exercises); inf.forEach((g, k) => { if (g && g.pos === 0) ssEqualize(g.start, g.end, d.exercises); }); } }
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
    return `<div class="sr ${s.done ? 'done' : ''} t-${s.t || 'n'} ${noW ? 'no-w' : ''}" id="sr-${i}-${j}" data-i="${i}" data-j="${j}">
      <button class="sn" data-a="setMenu" data-i="${i}" data-j="${j}" aria-label="Opcje serii">${lab}</button>
      <button class="prev" data-a="usePrev" data-i="${i}" data-j="${j}" title="Użyj poprzedniego wyniku">${pv}</button>
      ${noW ? '' : `<div class="num"><button data-a="nudge" data-f="w" data-d="-1" data-i="${i}" data-j="${j}" aria-label="Mniej">${ic('minus', 14)}</button><input inputmode="decimal" data-b="wk" data-f="w" data-i="${i}" data-j="${j}" value="${wv}" placeholder="0" aria-label="Ciężar"><button data-a="nudge" data-f="w" data-d="1" data-i="${i}" data-j="${j}" aria-label="Więcej">${ic('plus', 14)}</button></div>`}
      <div class="num"><button data-a="nudge" data-f="r" data-d="-1" data-i="${i}" data-j="${j}" aria-label="Mniej">${ic('minus', 14)}</button><input inputmode="numeric" data-b="wk" data-f="r" data-i="${i}" data-j="${j}" value="${s.r || ''}" placeholder="0" aria-label="${isT ? 'Sekundy' : 'Powtórzenia'}"><button data-a="nudge" data-f="r" data-d="1" data-i="${i}" data-j="${j}" aria-label="Więcej">${ic('plus', 14)}</button></div>
      <button class="ck" data-a="check" data-i="${i}" data-j="${j}" aria-label="Zalicz serię" aria-pressed="${!!s.done}">${ic('check', 22)}</button>${s.pr && s.pr.length && s.done ? `<span class="sr-pr">${ic('trophy', 13)}</span>` : ''}</div>`;
  }
  const sugOpts = e => { const pg = e.pg || {}; return { mode: pg.prog === 'linear' ? 'linear' : pg.prog === 'off' ? 'off' : 'auto', inc: pg.inc, pct: pg.pct }; };
  function groupedCards() {
    const d = D(), inf = F.ssInfo(d.exercises); let html = '', i = 0;
    while (i < d.exercises.length) { const g = inf[i]; if (g && g.pos === 0) { html += ssCard(g.start, g.end); i = g.end + 1; } else { html += card(i); i++; } }
    return html;
  }
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
      hdr += `<div class="ssm"><div class="ssm-h"><span class="ss-tag">${tag}</span><a class="xc-n" href="#/ex/${E(e.exId)}"><h3>${E(ex.name)}</h3></a><button class="ibtn" data-a="techOpen" data-id="${E(e.exId)}" aria-label="Technika">${ic('info', 20)}</button><button class="ibtn" data-a="exMenu" data-i="${k}" aria-label="Opcje ćwiczenia">${ic('ellipsis', 22)}</button></div>
        <div class="xc-m">${F.wm(e.exId) === 2 ? `<span class="x2c">${F.x2Label(ex)}</span>` : ''}${e.target && e.target.reps ? `<span>Cel ${E(e.target.reps)} ${isT ? 's' : 'powt.'}</span>` : ''}${p ? `<span>Poprz. ${isT ? F.fmtDur(p.r) : isB ? p.r : F.fw(p.w / F.wm(e.exId)) + '×' + p.r}</span>` : ''}${sug ? `<span class="sug" data-a="applySug" data-i="${k}">${ic('target', 12)} ${sugT}</span>` : ''}</div>
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
  function card(i) {
    const d = D(), e = d.exercises[i], ex = exOf(e.exId) || { name: 'Usunięte ćwiczenie', muscle: 'full', type: 'wr' }; const last = F.LAST[e.exId];
    if (ex.muscle === 'cardio' && ex.type === 'time') return cardioCard(i, e, ex);
    const isT = ex.type === 'time', isB = ex.type === 'br'; const sug = F.suggest(e.exId, e.target && e.target.reps, sugOpts(e)); const inf = F.ssInfo(d.exercises)[i];
    const tgt = e.target && e.target.reps ? `Cel ${e.target.sets}×${E(e.target.reps)}` : '';
    const sugT = sug ? `${isT ? F.fmtDur(sug.r) : isB ? sug.r + ' powt.' : F.fw(sug.w / F.wm(e.exId)) + ' ' + F.unit() + ' × ' + sug.r}` : '';
    const doneN = e.sets.filter(s => s.done).length;
    return `<section class="xc cut ${doneN === e.sets.length && e.sets.length ? 'all' : ''}" id="xc-${i}">
      <div class="xc-h">${inf ? `<span class="ss-tag">${inf.tag}</span>` : F.mDot(ex.muscle)}<a class="xc-n" href="#/ex/${E(e.exId)}"><h3>${E(ex.name)}</h3></a><span class="xc-c">${doneN}/${e.sets.length}</span><button class="ibtn" data-a="techOpen" data-id="${E(e.exId)}" aria-label="Technika">${ic('info', 20)}</button><button class="ibtn" data-a="exMenu" data-i="${i}" aria-label="Opcje ćwiczenia">${ic('ellipsis', 22)}</button></div>
      <div class="xc-m">${F.wm(e.exId) === 2 ? `<span class="x2c">${F.x2Label(ex)}</span>` : ''}${tgt ? `<span>${tgt}</span>` : ''}<span>${ic('timer', 12)} ${F.fmtDur(exRest(e, ex))}</span>${sug ? `<span class="sug" data-a="applySug" data-i="${i}">${ic('target', 12)} ${sugT}</span>` : ''}</div>
      ${sug && (sug.stag || sug.pct || sug.off || d.deload) ? `<p class="xc-note hint ${sug.stag ? 'warn' : ''}">${ic(sug.stag ? 'zap' : 'target', 13)} ${E(sug.note)}</p>` : ''}
      ${e.note ? `<p class="xc-note">${ic('notebook-pen', 13)} ${E(e.note)}</p>` : ''}
      <div class="sh ${isT || isB ? 'no-w' : ''}"><span>Seria</span><span>Poprz.</span>${isT || isB ? '' : `<span>${F.wm(e.exId) === 2 ? '2× ' : ''}${ex.type === 'bwr' ? '+' : ''}${F.unit()}</span>`}<span>${isT ? 'Sek.' : 'Powt.'}</span><span></span></div>
      ${e.sets.map((s, j) => setRow(e, i, j)).join('')}
      <button class="addset" data-a="addSet" data-i="${i}">${ic('plus', 16)} Dodaj serię</button></section>`;
  }
  V.workout = () => {
    const d = D();
    if (!d) return { html: `<div class="wk">${F.empty('dumbbell', 'Brak aktywnego treningu', 'Rozpocznij trening z planu albo zacznij od zera.', `<button class="btn primary" data-a="tab" data-tab="workout">${ic('flame', 18)} Zacznij trening</button>`)}</div>` };
    rebuildWkIdx(); const st = wkStats();
    return {
      html: `<div class="wk"><header class="wk-h"><button class="ibtn" data-a="wkMin" aria-label="Zminimalizuj">${ic('chevron-down', 26)}</button><div class="wk-t"><input data-b="wname" value="${E(d.name)}" maxlength="50" aria-label="Nazwa treningu"><small>${d.deload ? '<span class="dl-tag">DELOAD</span> ' : ''}${d.planName ? E(d.planName) + ' · ' : ''}${d.backdate ? F.fmtDate(d.start) : '<span data-wtime>' + F.fmtDur((Date.now() - d.start) / 1000) + '</span>'}</small></div><button class="btn sm primary" data-a="wkFinish">${ic('flag', 16)} Zakończ</button></header>
      <div class="wk-s"><div><small>Czas</small><b data-wtime>${F.fmtDur((Date.now() - d.start) / 1000)}</b></div><div><small>Tonaż</small><b data-wk="vol">${F.fmtVol(st.vol)}</b></div><div><small>Serie</small><b data-wk="sets">${st.done}/${st.all}</b></div><div><small>Kcal</small><b data-wk="kcal">${F.fmtNum(Math.round(F.kcalDraft(d).net / 5) * 5, 0)}</b></div></div>
      <div id="wk-body">${groupedCards() || F.empty('dumbbell', 'Pusty trening', 'Dodaj pierwsze ćwiczenie i ruszaj.')}</div>
      <button class="btn ghost wide big" data-a="wkAdd">${ic('plus', 20)} Dodaj ćwiczenie</button>
      <label class="fld"><span>Notatka do treningu</span><textarea data-b="wnote" rows="2" placeholder="Samopoczucie, sen, uwagi…">${E(d.note || '')}</textarea></label>
      <button class="btn ghost wide danger-t" data-a="wkCancel">${ic('trash-2', 18)} Anuluj trening</button><div class="rest-space"></div></div><div id="rest-dock"></div>`,
      after: () => { F.refreshWorkoutRest(); F.wakeLock(); }
    };
  };

  /* ---------- dock przerwy ---------- */
  F.refreshWorkoutRest = () => {
    const el = F.$('#rest-dock'); if (!el) return;
    if (!F.rest) { el.className = ''; el.innerHTML = ''; return; }
    el.className = 'on';
    el.innerHTML = `<div class="rd cut"><i class="rd-bar" data-rest-bar></i><button class="rd-main" data-a="restFull"><span class="rd-l">Przerwa</span><b class="rd-t" data-rest-time>0:00</b></button><div class="rd-b"><button data-a="restAdd" data-s="-15">−15</button><button data-a="restAdd" data-s="15">+15</button><button class="skip" data-a="restSkip">${ic('skip-forward', 18)}<span>Pomiń</span></button></div></div>`;
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
  const updStats = () => { const st = wkStats(); const v = F.$('[data-wk=vol]'), s = F.$('[data-wk=sets]'), k = F.$('[data-wk=kcal]'); if (v) v.textContent = F.fmtVol(st.vol); if (s) s.textContent = st.done + '/' + st.all; if (k && D()) k.textContent = F.fmtNum(Math.round(F.kcalDraft(D()).net / 5) * 5, 0); };
  const num = v => parseFloat(String(v).replace(',', '.'));
  F.bind.wname = el => { D().name = el.value; persist(); };
  F.bind.wnote = el => { D().note = el.value; persist(); };
  F.bind.wk = el => { const e = D().exercises[+el.dataset.i], s = e.sets[+el.dataset.j]; const v = num(el.value) || 0; if (el.dataset.f === 'w') s.w = F.fromDisp(v) * F.wm(e.exId); else s.r = v; persist(); if (s.done) updStats(); };
  const redraw = i => { const g = F.ssInfo(D().exercises)[i]; if (g) { const el = F.$('#ssg-' + g.start); if (el) el.outerHTML = ssCard(g.start, g.end); } else { const el = F.$('#xc-' + i); if (el) el.outerHTML = card(i); } updStats(); };
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
      F.haptic(25); redraw(i);
      const nb = F.$(`#sr-${i}-${j} .ck`); if (nb) { nb.classList.add('pop'); if (!r.prs.length) F.burstAt(nb, 10, .5); }
      if (r.prs.length) celebrate(r.prs, ex, r.s, nb);
      const st = wkStats();
      if (F.S.settings.autoRest && st.done < st.all) F.restStart(r.s.t === 'w' ? 45 : exRest(e, ex), ex ? ex.name : '');
      else if (st.done === st.all) F.toast(ic('flag', 16) + ' Wszystkie serie zaliczone. Zakończ trening.', 'hot');
    } else { rebuildWkIdx(); redraw(i); }
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
    const nxt = F.$(`#ssr-${g.start}-${j + 1}`); if (nxt) setTimeout(() => nxt.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
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
    F.sheet(`<div class="menu">${F.ssInfo(d.exercises)[i] ? '' : `<button data-a="exWarm" data-i="${i}">${ic('flame', 20)}<span>Dodaj rozgrzewkę<small>Progresja serii rozgrzewkowych do ciężaru roboczego</small></span></button>`}<button data-a="exNote" data-i="${i}">${ic('notebook-pen', 20)}<span>Notatka do ćwiczenia</span></button>${ex.type === 'wr' || ex.type === 'bwr' ? `<button data-a="exX2" data-i="${i}">${ic('dumbbell', 20)}<span>${F.x2(ex) ? 'Wpisuję łączny ciężar' : 'Wpisuję ciężar jednej sztuki (×2)'}<small>${F.x2(ex) ? 'Teraz: jedna hantla/strona, razem ×2. Dotknij, by wpisywać sumę' : 'Np. 2 hantle po 10 kg wpisujesz jako 10. Zapis i tonaż liczone razem'}</small></span></button>` : ''}<button data-a="exRestSet" data-i="${i}">${ic('timer', 20)}<span>Czas przerwy<small>Obecnie ${F.fmtDur(exRest(e, ex))}</small></span></button>${ssItems(i)}<button data-a="exSwap" data-i="${i}">${ic('arrow-left-right', 20)}<span>Zamień ćwiczenie</span></button><button data-a="exUp" data-i="${i}" ${i === 0 ? 'disabled' : ''}>${ic('arrow-up', 20)}Przesuń wyżej</button><button data-a="exDown" data-i="${i}" ${i === d.exercises.length - 1 ? 'disabled' : ''}>${ic('arrow-down', 20)}Przesuń niżej</button><button class="danger" data-a="exRemove" data-i="${i}">${ic('trash-2', 20)}Usuń z treningu</button></div>`, { title: E(ex.name || 'Ćwiczenie') });
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
  F.act.exSwap = async b => { const i = +b.dataset.i; const ids = await F.pickExercises({ single: true }); if (!ids) return; const e = D().exercises[i]; e.exId = ids[0]; e.sets = buildSets(ids[0], e.sets.length || 3, e.target && e.target.reps); F.saveDraft(); rebuildWkIdx(); redraw(i); };
  F.act.exUp = b => { const i = +b.dataset.i, a = D().exercises; [a[i - 1], a[i]] = [a[i], a[i - 1]]; F.cleanSS(a); F.saveDraft(); F.closeSheet(true); F.render(true); };
  F.act.exDown = b => { const i = +b.dataset.i, a = D().exercises; [a[i + 1], a[i]] = [a[i], a[i + 1]]; F.cleanSS(a); F.saveDraft(); F.closeSheet(true); F.render(true); };
  F.act.exRemove = async b => { const i = +b.dataset.i; const e = D().exercises[i]; if (e.sets.some(s => s.done) && !(await F.confirm({ title: 'Usunąć ćwiczenie?', text: 'Zaliczone serie z tego ćwiczenia przepadną.', ok: 'Usuń', danger: true }))) return; D().exercises.splice(i, 1); F.cleanSS(D().exercises); F.saveDraft(); F.closeSheet(true); rebuildWkIdx(); F.render(true); };
  F.act.wkAdd = async () => {
    const ids = await F.pickExercises(); if (!ids || !ids.length) return;
    ids.forEach(id => { const ex = exOf(id); D().exercises.push({ k: F.uid(), exId: id, note: '', rest: 0, target: null, sets: buildSets(id, ex && ex.muscle === 'cardio' && ex.type === 'time' ? 1 : 3, ex && ex.type === 'time' ? '45' : '') }); }); F.saveDraft(); F.render(true);
    setTimeout(() => { const el = F.$('#xc-' + (D().exercises.length - 1)); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
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
    sess.prs = prs; if (pendC.length) sess.pend = pendC;
    await F.addSession(sess); F.S.draft = null; await F.saveDraft(); F.restStop(false); F.wakeRelease();
    summary(sess, F.xp() - xpBefore, F.rank().i > rankBefore);
  };
  F.act.wkCancelForce = async () => { F.S.draft = null; F.restStop(false); await F.saveDraft(); F.wakeRelease(); F.go('#/home'); };

  function summary(s, xpGain, rankUp) {
    const vol = F.sessionVolume(s); const rk = F.rank();
    F.go('#/home');
    const html = `<div class="sum"><div class="sum-top">${F.logo(54)}<h2>Trening<br>zaliczony</h2><p>${E(s.name)}</p></div>
      <div class="sum-stats"><div><small>Czas</small><b>${F.fmtMin(s.dur)}</b></div><div><small>Tonaż</small><b>${F.fmtVol(vol)}</b></div><div><small>Serie</small><b>${F.sessionSets(s)}</b></div><div><small>Kcal</small><b>${F.fmtNum(Math.round(F.sessKcal(s).net / 5) * 5, 0)}</b></div></div>
      ${s.pend && s.pend.length ? `<p class="small">${ic('timer', 14)} Do dokończenia: ${s.pend.map(p => E(F.exName(p.exId)) + ' ' + p.mins + ' min').join(', ')}. Dopiszesz to z ekranu głównego w ciągu 48 godzin — trening zostanie przeliczony.</p>` : ''}
      ${s.prs.length ? `<div class="sum-pr"><h3>${ic('trophy', 20)} ${s.prs.length === 1 ? 'Nowy rekord' : s.prs.length + ' nowe rekordy'}</h3>${s.prs.map(p => `<div><b>${E(F.exName(p.exId))}</b><span>${E(p.text)}</span></div>`).join('')}</div>` : ''}
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
    g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, W, H);
    let rg = g.createRadialGradient(W * .85, 0, 0, W * .85, 0, 900); rg.addColorStop(0, a1 + '99'); rg.addColorStop(1, 'transparent'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = .12; for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? a1 : a2; g.beginPath(); g.moveTo(-100 + i * 150, H); g.lineTo(60 + i * 150, H); g.lineTo(560 + i * 150, 0); g.lineTo(400 + i * 150, 0); g.fill(); } g.restore();
    const lg = g.createLinearGradient(0, 0, 100, 100); lg.addColorStop(0, a2); lg.addColorStop(1, a1);
    g.save(); g.translate(70, 70); g.scale(1.1, 1.1); g.fillStyle = lg; g.fill(new Path2D(F.LOGO_PATH)); g.restore();
    g.fillStyle = '#e8eaf0'; g.font = 'italic 800 64px "Barlow Condensed"'; g.fillText('FORGE', 200, 140);
    g.fillStyle = '#8b91a0'; g.font = '500 34px Barlow'; g.textAlign = 'right'; g.fillText(F.fmtDateLong(s.start), W - 70, 138); g.textAlign = 'left';
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
