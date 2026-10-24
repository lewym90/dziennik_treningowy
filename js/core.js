/* FORGE — rdzeń: baza IndexedDB, stan, statystyki, rekordy, rangi, osiągnięcia */
(function () {
  const F = window.F;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  F.uid = uid;

  /* ---------- BAZA ---------- */
  const DB_NAME = 'forge-db', STORES = ['exercises', 'plans', 'sessions', 'bodyweight', 'kv', 'measures', 'photos'];
  let idb = null, memOnly = false;
  const mem = {}; STORES.forEach(s => mem[s] = new Map());

  F.dbOpen = () => new Promise(res => {
    if (!('indexedDB' in window)) { memOnly = true; return res(); }
    let req;
    try { req = indexedDB.open(DB_NAME, 2); } catch (e) { memOnly = true; return res(); }
    req.onupgradeneeded = () => { const d = req.result; STORES.forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); }); };
    req.onsuccess = () => { idb = req.result; res(); };
    req.onerror = () => { memOnly = true; res(); };
  });
  const tx = (store, mode) => idb.transaction(store, mode).objectStore(store);
  F.dbAll = store => new Promise(res => {
    if (memOnly) return res([...mem[store].values()]);
    const r = tx(store, 'readonly').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => res([]);
  });
  F.dbPut = (store, obj) => new Promise(res => {
    if (memOnly) { mem[store].set(obj.id, obj); return res(); }
    const r = tx(store, 'readwrite').put(obj); r.onsuccess = () => res(); r.onerror = () => res();
  });
  F.dbPutMany = (store, arr) => new Promise(res => {
    if (memOnly) { arr.forEach(o => mem[store].set(o.id, o)); return res(); }
    const t = idb.transaction(store, 'readwrite'); const s = t.objectStore(store);
    arr.forEach(o => s.put(o)); t.oncomplete = () => res(); t.onerror = () => res();
  });
  F.dbDel = (store, id) => new Promise(res => {
    if (memOnly) { mem[store].delete(id); return res(); }
    const r = tx(store, 'readwrite').delete(id); r.onsuccess = () => res(); r.onerror = () => res();
  });
  F.dbClear = store => new Promise(res => {
    if (memOnly) { mem[store].clear(); return res(); }
    const r = tx(store, 'readwrite').clear(); r.onsuccess = () => res(); r.onerror = () => res();
  });
  F.kvGet = async id => { if (memOnly) return (mem.kv.get(id) || {}).v; return new Promise(res => { const r = tx('kv', 'readonly').get(id); r.onsuccess = () => res(r.result ? r.result.v : undefined); r.onerror = () => res(); }); };
  F.kvSet = (id, v) => F.dbPut('kv', { id, v });
  F.kvDel = id => F.dbDel('kv', id);

  /* ---------- STAN ---------- */
  // polska odmiana liczebników: 1 trening, 2–4 treningi, 5+ treningów
  F.plur = (n, one, few, many) => { n = Math.abs(Math.round(n)); const l = n % 10, t = n % 100; return n === 1 ? one : (l >= 2 && l <= 4 && !(t >= 12 && t <= 14)) ? few : many; };
  F.S = { ex: new Map(), plans: [], sessions: [], bw: [], measures: [], settings: { ...F.DEFAULT_SETTINGS }, draft: null };

  F.load = async () => {
    await F.dbOpen();
    const [ex, plans, sessions, bw, set, draft, meas] = await Promise.all([F.dbAll('exercises'), F.dbAll('plans'), F.dbAll('sessions'), F.dbAll('bodyweight'), F.kvGet('settings'), F.kvGet('draft'), F.dbAll('measures')]);
    const first = ex.length === 0 && (await F.kvGet('seeded')) !== true;
    if (first) {
      const seeds = F.SEED.map(s => ({ id: s[0], name: s[1], muscle: s[2], equip: s[3], type: s[4], compound: !!s[5], alias: s[6] || '', custom: false }));
      await F.dbPutMany('exercises', seeds); await F.kvSet('seeded', true); ex.push(...seeds);
    } else {
      // dołóż nowe ćwiczenia z kolejnych wersji biblioteki (bez nadpisywania zmian użytkownika)
      const have = new Set(ex.map(e => e.id)); const add = [];
      F.SEED.forEach(s => { if (!have.has(s[0])) add.push({ id: s[0], name: s[1], muscle: s[2], equip: s[3], type: s[4], compound: !!s[5], alias: s[6] || '', custom: false }); });
      const removed = (await F.kvGet('removedSeed')) || [];
      const add2 = add.filter(a => !removed.includes(a.id));
      if (add2.length) { await F.dbPutMany('exercises', add2); ex.push(...add2); }
    }
    ex.forEach(e => F.S.ex.set(e.id, e));
    // zabezpieczenie danych: gdy są dane, a ostatnia migawka ma >12 h (lub zmieniła się wersja aplikacji), zapisz kopię w tej samej bazie
    try { await F.autoSnap(ex, plans, sessions, bw, meas, set); } catch (e) { console.warn('snap', e); }
    F.S.plans = plans.sort((a, b) => (a.order || 0) - (b.order || 0) || a.created - b.created);
    F.S.sessions = sessions.sort((a, b) => b.start - a.start);
    F.S.bw = bw.sort((a, b) => a.date - b.date);
    F.S.measures = (meas || []).sort((a, b) => a.date - b.date);
    F.S.settings = { ...F.DEFAULT_SETTINGS, ...(set || {}) };
    F.S.draft = draft || null;
    F.rebuild();
  };
  F.APPVER = '1.10.0';
  F.autoSnap = async (ex, plans, sessions, bw, meas, set) => {
    if (!sessions.length && !plans.length) return;
    const cur = await F.kvGet('snap'); const ver = await F.kvGet('appVer');
    const stale = !cur || Date.now() - cur.at > 12 * 36e5 || ver !== F.APPVER;
    if (!stale) return;
    // przy zmianie wersji zachowaj poprzednią migawkę jako „przed aktualizacją” (najstarsza dobra kopia nie jest nadpisywana)
    if (cur && ver !== F.APPVER && cur.sessions && cur.sessions.length) await F.kvSet('snapPrev', cur);
    const data = { at: Date.now(), ver: F.APPVER, from: ver || '', settings: set || {}, exercises: ex.filter(e => e.custom), plans, sessions, bodyweight: bw, measures: meas || [] };
    await F.kvSet('snap', data); await F.kvSet('appVer', F.APPVER);
  };
  F.snapInfo = async () => { const a = await F.kvGet('snap'), b = await F.kvGet('snapPrev'); return { a, b }; };
  F.restoreSnap = async which => {
    const d = await F.kvGet(which); if (!d) return false;
    return F.importAll({ app: 'FORGE', version: 2, settings: d.settings, exercises: d.exercises, plans: d.plans, sessions: d.sessions, bodyweight: d.bodyweight, measures: d.measures }, 'merge');
  };
  F.saveSettings = () => F.kvSet('settings', F.S.settings);
  F.saveDraft = () => F.S.draft ? F.kvSet('draft', F.S.draft) : F.kvDel('draft');

  /* ---------- JEDNOSTKI ---------- */
  const LB = 2.2046226218;
  F.unit = () => F.S.settings.unit;
  F.toDisp = kg => F.S.settings.unit === 'lb' ? kg * LB : kg;
  F.fromDisp = v => F.S.settings.unit === 'lb' ? v / LB : v;
  F.fmtNum = (n, d = 1) => { if (n == null || isNaN(n)) return '–'; const r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d); return String(r).replace('.', ','); };
  F.fw = kg => F.fmtNum(F.toDisp(kg), 1);
  F.fwu = kg => F.fw(kg) + ' ' + F.unit();
  /* Ciężar „na sztukę / na stronę”: w danych zawsze zapisujemy SUMĘ (stąd historia, tonaż i rekordy bez zmian),
     a przy ćwiczeniach z hantlami i jednostronnych wpisujemy i pokazujemy jedną sztukę (2 × 10 kg). */
  const X2_OFF = new Set(['row_db', 'pullover', 'tri_over', 'curl_con', 'kickback', 'sumo_sq']); // domyślnie jedna hantla
  F.x2 = id => { const ex = id && typeof id === 'object' ? id : F.S.ex.get(id); if (!ex || (ex.type !== 'wr' && ex.type !== 'bwr')) return false; const o = (F.S.settings.x2 || {})[ex.id]; if (o != null) return !!o; return ex.equip === 'Hantle' && !X2_OFF.has(ex.id); };
  F.wm = id => F.x2(id) ? 2 : 1;
  F.fwt = (kg, id) => F.wm(id) === 2 ? '2×' + F.fw(kg / 2) : F.fw(kg);
  F.fwtu = (kg, id) => F.fwt(kg, id) + ' ' + F.unit();
  F.x2Label = ex => ex && ex.equip === 'Hantle' ? 'Wpisz ciężar jednej hantli (×2)' : 'Wpisz ciężar jednej strony (×2)';
  F.fmtVol = kg => { const v = F.toDisp(kg), lb = F.unit() === 'lb'; if (v >= 1e6) return F.fmtNum(v / 1e6, 2) + (lb ? ' M lb' : ' kt'); if (v >= 10000) return F.fmtNum(v / 1000, 1) + (lb ? ' k lb' : ' t'); return F.fmtNum(v, 0) + (lb ? ' lb' : ' kg'); };
  F.fmtDur = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
  F.fmtMin = s => !s ? '–' : s < 60 ? Math.round(s) + ' s' : Math.round(s / 60) + ' min';
  F.fmtDurHuman = s => { const m = Math.round(s / 60); if (m < 60) return m + ' min'; return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };

  /* ---------- DATY ---------- */
  const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const MON = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  F.DAYS = DAYS; F.MON = MON;
  F.dayKey = ts => { const d = new Date(ts); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  F.startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  F.startOfWeek = ts => { const d = new Date(F.startOfDay(ts)); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); };
  F.fmtDate = ts => { const d = new Date(ts); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  F.fmtDateShort = ts => { const d = new Date(ts); return `${d.getDate()} ${MON[d.getMonth()]}`; };
  F.fmtDateLong = ts => { const d = new Date(ts); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
  F.fmtTime = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  F.relDay = ts => {
    const diff = Math.round((F.startOfDay(Date.now()) - F.startOfDay(ts)) / 864e5);
    if (diff === 0) return 'Dziś'; if (diff === 1) return 'Wczoraj'; if (diff < 7) return diff + ' dni temu';
    return F.fmtDateShort(ts);
  };
  F.dateInput = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  /* ---------- OBLICZENIA ---------- */
  F.e1rm = (w, r) => { if (!w || !r) return 0; if (r === 1) return w; return w * (1 + Math.min(r, 20) / 30); };
  F.latestBW = (ts) => { let v = 0; for (const b of F.S.bw) { if (ts && b.date > ts) break; v = b.kg; } return v; };
  const isWork = s => s.done && s.t !== 'w';
  F.isWork = isWork;
  // obciążenie efektywne serii
  F.effLoad = (ex, s, ts) => {
    if (!ex) return s.w || 0;
    if (ex.type === 'bwr') { const bw = F.latestBW(ts) || 0; return (s.w || 0) + bw; }
    if (ex.type === 'br') return F.latestBW(ts) || 0;
    if (ex.type === 'time') return 0;
    return s.w || 0;
  };
  F.setVolume = (ex, s, ts) => {
    if (!ex || !s.r) return 0;
    if (ex.type === 'time') return 0;
    return F.effLoad(ex, s, ts) * s.r;
  };
  F.sessionVolume = sess => { let v = 0; (sess.exercises || []).forEach(e => { const ex = F.S.ex.get(e.exId); e.sets.forEach(s => { if (isWork(s)) v += F.setVolume(ex, s, sess.start); }); }); return v; };
  F.sessionSets = sess => (sess.exercises || []).reduce((a, e) => a + e.sets.filter(isWork).length, 0);
  F.sessionReps = sess => (sess.exercises || []).reduce((a, e) => a + e.sets.filter(isWork).reduce((x, s) => x + (s.r || 0), 0), 0);

  // wartość rekordowa serii dla różnych kategorii
  F.setMetrics = (ex, s, ts) => {
    if (!ex) return {};
    if (ex.type === 'time') return { dur: s.r || 0 };
    if (ex.type === 'br') return { reps: s.r || 0, e1: 0, w: 0 };
    const l = F.effLoad(ex, s, ts);
    return { w: l, e1: F.e1rm(l, s.r), reps: s.r || 0, vol: l * (s.r || 0) };
  };

  // indeks rekordów: { exId: { w, e1, vol, reps, dur, repAt: {rep: w}, byW: {w: maxReps} } }
  F.PR = {};
  const addToIdx = (idx, ex, s, ts) => {
    const m = F.setMetrics(ex, s, ts);
    let p = idx[ex.id]; if (!p) p = idx[ex.id] = { w: 0, e1: 0, vol: 0, reps: 0, dur: 0, repAt: {}, byW: {}, ts: {} };
    if (p.first == null || ts < p.first) p.first = ts;
    const hit = {};
    const up = (k, v) => { if (v > p[k]) { p[k] = v; p.ts[k] = ts; hit[k] = true; } };
    if (ex.type === 'time') { up('dur', m.dur); return hit; }
    if (ex.type === 'br') { up('reps', m.reps); return hit; }
    up('w', m.w); up('e1', m.e1); up('vol', m.vol); up('reps', m.reps);
    if (s.r) {
      const r = Math.min(s.r, 30), wk = Math.round(m.w * 100);
      if (!(p.repAt[r] >= m.w)) p.repAt[r] = m.w;
      if (!(p.byW[wk] >= s.r)) { p.byW[wk] = s.r; }
    }
    return hit;
  };
  F.rebuild = () => {
    const idx = {}; const sess = [...F.S.sessions].sort((a, b) => a.start - b.start);
    sess.forEach(se => se.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); if (!ex) return; e.sets.forEach(s => { if (isWork(s)) addToIdx(idx, ex, s, se.start); }); }));
    F.PR = idx;
    // ostatnie wykonanie każdego ćwiczenia
    const last = {}; F.S.sessions.forEach(se => se.exercises.forEach(e => { if (!last[e.exId] && e.sets.some(isWork)) last[e.exId] = { sets: e.sets.filter(isWork), ts: se.start, sid: se.id }; }));
    F.LAST = last;
  };

  // sprawdzenie, czy seria bije rekord, względem indeksu (kopia roboczego indeksu w treningu)
  F.checkPR = (workIdx, ex, s, ts) => {
    if (!ex || !isWork(s) || (!s.r && ex.type !== 'time')) return [];
    const m = F.setMetrics(ex, s, ts);
    const p = workIdx[ex.id];
    const hadAny = p && (p.w || p.reps || p.dur) && p.first < ts; // rekord liczy się dopiero względem wcześniejszych treningów
    const out = [];
    if (ex.type === 'time') { if (hadAny && m.dur > p.dur) out.push({ k: 'dur', label: 'Najdłuższy czas' }); }
    else if (ex.type === 'br') { if (hadAny && m.reps > p.reps) out.push({ k: 'reps', label: 'Rekord powtórzeń' }); }
    else if (hadAny) {
      if (m.w > p.w) out.push({ k: 'w', label: 'Rekord ciężaru' });
      else if (m.e1 > p.e1 + 0.001) out.push({ k: 'e1', label: 'Rekord 1RM (szac.)' });
      else {
        const wk = Math.round(m.w * 100);
        const prevBest = p.byW[wk];
        if (prevBest != null && s.r > prevBest && m.w > 0) out.push({ k: 'reps', label: 'Więcej powtórzeń na tym ciężarze' });
      }
    }
    return out;
  };
  F.cloneIdx = () => JSON.parse(JSON.stringify(F.PR));
  F.addToIdx = addToIdx;

  /* ---------- STATYSTYKI ---------- */
  F.totals = () => {
    let vol = 0, sets = 0, reps = 0, dur = 0;
    F.S.sessions.forEach(s => { vol += F.sessionVolume(s); sets += F.sessionSets(s); reps += F.sessionReps(s); dur += s.dur || 0; });
    let prs = 0; Object.values(F.PR).forEach(p => { prs += (p.w > 0 ? 1 : 0) + (p.reps > 0 && !p.w ? 1 : 0); });
    return { vol, sets, reps, dur, count: F.S.sessions.length, prs };
  };
  F.prEvents = () => { // liczba rekordów zdobytych w historii (zapisane w sesjach)
    return F.S.sessions.reduce((a, s) => a + (s.prs ? s.prs.length : 0), 0);
  };
  F.xp = () => { const t = F.totals(); return Math.round(t.vol / 100 + t.count * 60 + F.prEvents() * 40 + t.sets * 2); };
  F.rank = () => {
    const xp = F.xp(); let i = 0; F.RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; });
    const cur = F.RANKS[i], nxt = F.RANKS[i + 1];
    return { i, name: cur.n, xp, next: nxt ? nxt.n : null, pct: nxt ? (xp - cur.xp) / (nxt.xp - cur.xp) : 1, toNext: nxt ? nxt.xp - xp : 0 };
  };
  F.weekCounts = (weeks = 12) => {
    const now = F.startOfWeek(Date.now()); const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const a = now - i * 7 * 864e5, b = a + 7 * 864e5; let c = 0, v = 0;
      F.S.sessions.forEach(s => { if (s.start >= a && s.start < b) { c++; v += F.sessionVolume(s); } });
      out.push({ start: a, count: c, vol: v });
    }
    return out;
  };
  F.weekStreak = () => {
    const goal = F.S.settings.weeklyGoal || 1; const w = F.weekCounts(104); let streak = 0;
    for (let i = w.length - 1; i >= 0; i--) {
      if (w[i].count >= goal) streak++;
      else if (i === w.length - 1) continue; // bieżący tydzień jeszcze trwa
      else break;
    }
    return streak;
  };
  F.dayStreak = () => { // dni z rzędu z treningiem (z tolerancją 1 dnia przerwy = dzień odpoczynku)
    const days = new Set(F.S.sessions.map(s => F.dayKey(s.start)));
    let streak = 0, d = F.startOfDay(Date.now()), gap = 0;
    if (!days.has(F.dayKey(d))) d -= 864e5;
    while (true) {
      if (days.has(F.dayKey(d))) { streak++; gap = 0; } else { gap++; if (gap >= 3) break; }
      d -= 864e5; if (streak === 0 && gap > 2) break;
    }
    return streak;
  };
  F.muscleVolume = (days = 30) => {
    const since = Date.now() - days * 864e5; const out = {};
    F.S.sessions.forEach(se => { if (se.start < since) return; se.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); if (!ex) return; const n = e.sets.filter(isWork).length; out[ex.muscle] = (out[ex.muscle] || 0) + n; }); });
    return out;
  };
  // serie historii danego ćwiczenia: [{ts, w, e1, vol, reps, dur}]
  F.exHistory = exId => {
    const ex = F.S.ex.get(exId); const out = [];
    [...F.S.sessions].reverse().forEach(se => se.exercises.forEach(e => {
      if (e.exId !== exId) return; const ws = e.sets.filter(isWork); if (!ws.length) return;
      let best = { w: 0, e1: 0, reps: 0, dur: 0 }, vol = 0;
      ws.forEach(s => { const m = F.setMetrics(ex, s, se.start); best.w = Math.max(best.w, m.w || 0); best.e1 = Math.max(best.e1, m.e1 || 0); best.reps = Math.max(best.reps, m.reps || 0); best.dur = Math.max(best.dur, m.dur || 0); vol += F.setVolume(ex, s, se.start); });
      out.push({ ts: se.start, sid: se.id, ...best, vol, sets: ws });
    }));
    return out;
  };

  /* ---------- PROGRESJA (sugestia następnego celu) ---------- */
  const roundTo = (v, st) => Math.round(v / st) * st;
  F.stepFor = ex => (ex && ex.compound && (ex.muscle === 'quads' || ex.muscle === 'hams' || ex.muscle === 'glutes' || ex.id === 'deadlift')) ? Math.max(F.S.settings.step * 2, 5) : F.S.settings.step;
  F.deloadOn = () => (F.S.settings.deloadUntil || 0) > Date.now();
  // opts: { mode: 'auto'|'linear'|'off', inc: kg, pct: % 1RM }
  F.suggest = (exId, targetReps, opts = {}) => {
    const ex = F.S.ex.get(exId); const last = F.LAST[exId]; if (!ex) return null;
    let hi = 0, lo = 0;
    if (targetReps) { const m = String(targetReps).match(/(\d+)(?:\s*[-–]\s*(\d+))?/); if (m) { lo = +m[1]; hi = +(m[2] || m[1]); } }
    const mode = opts.mode || 'auto';
    const dl = F.deloadOn();
    const dlw = w => dl ? Math.max(0, roundTo(w * 0.9, F.S.settings.step)) : w;
    if (!last) {
      // brak historii: ewentualnie % 1RM z innych źródeł nie istnieje — zwracamy null
      return null;
    }
    if (ex.type === 'time') { const mx = Math.max(...last.sets.map(s => s.r || 0)); return dl ? { w: 0, r: mx, note: 'Deload: bez progresji' } : { w: 0, r: mx + 5, note: 'Dołóż 5 s' }; }
    const sets = last.sets.filter(s => s.t !== 'd'); if (!sets.length) return null;
    const top = sets.reduce((a, s) => (s.w || 0) >= (a.w || 0) ? s : a, sets[0]);
    if (ex.type === 'br') return dl ? { w: 0, r: top.r || 0, note: 'Deload: utrzymaj' } : { w: 0, r: (top.r || 0) + 1, note: '+1 powtórzenie' };
    const incr = opts.inc > 0 ? opts.inc : F.stepFor(ex);
    // % 1RM z planu
    if (opts.pct > 0) {
      const p = F.PR[exId]; const base = p && p.e1;
      if (base) { const w = Math.max(0, roundTo(base * opts.pct / 100, F.S.settings.step)); return { w: dlw(w), r: lo || top.r, note: `${opts.pct}% 1RM (≈ ${F.fw(base)} ${F.unit()})`, pct: true }; }
    }
    if (mode === 'off') return { w: dlw(top.w), r: top.r, note: 'Bez automatycznej progresji', off: true };
    const st = F.stagnation(exId);
    if (dl) return { w: dlw(top.w), r: lo || top.r, note: 'Tydzień deload: −10% ciężaru' };
    if (st && st.stuck >= 2) return { w: Math.max(0, roundTo(top.w * 0.9, F.S.settings.step)), r: lo || top.r, note: `Stagnacja (${st.n} tr. bez postępu) — zbij ciężar o 10% i wejdź od nowa`, stag: true };
    if (mode === 'linear') {
      // liniowa: cały zestaw na dolnej granicy powtórzeń → dodaj ciężar; przy dwóch porażkach pod rząd −10%
      const need = lo || hi || top.r; const topSets = sets.filter(s => s.w === top.w); const ok = topSets.length && topSets.every(s => (s.r || 0) >= need);
      if (ok) return { w: top.w + incr, r: need, note: `Liniowo +${F.fmtNum(F.toDisp(incr), 2)} ${F.unit()}` };
      return { w: top.w, r: need, note: 'Powtórz ciężar — domknij wszystkie serie' };
    }
    const allHit = hi && sets.filter(s => s.w === top.w).every(s => (s.r || 0) >= hi);
    if (allHit) return { w: top.w + incr, r: lo || top.r, note: 'Dołóż ciężar' };
    return { w: top.w, r: Math.min((top.r || 0) + 1, hi || 99), note: 'Spróbuj +1 powtórzenie' };
  };
  // wykrywanie stagnacji: ile ostatnich treningów bez poprawy względem najlepszego e1RM z wcześniejszych
  F.stagnation = exId => {
    const ex = F.S.ex.get(exId); if (!ex || ex.type === 'time' || ex.type === 'br') return null;
    const h = F.exHistory(exId); if (h.length < 4) return null;
    const key = h.some(x => x.e1) ? 'e1' : 'reps';
    let bestBefore = 0, bestIdx = -1; h.forEach((x, i) => { if (x[key] > bestBefore + 0.001) { bestBefore = x[key]; bestIdx = i; } });
    const stuck = h.length - 1 - bestIdx; // ile treningów od ostatniej poprawy
    return { n: h.length, stuck, since: h[bestIdx] ? h[bestIdx].ts : 0, best: bestBefore, key };
  };
  F.stagnating = () => {
    const out = []; Object.keys(F.PR).forEach(id => { const ex = F.S.ex.get(id); if (!ex || !ex.compound) return; const st = F.stagnation(id); if (st && st.stuck >= 3) out.push({ exId: id, ...st }); });
    return out.sort((a, b) => b.stuck - a.stuck);
  };
  F.deloadAdvice = () => {
    const sess = F.S.sessions; if (sess.length < 6) return null;
    if (F.deloadOn()) return null;
    const st = F.stagnating(); const lastDl = F.S.settings.lastDeload || 0;
    const weeksSince = (Date.now() - Math.max(lastDl, sess[sess.length - 1].start)) / (7 * 864e5);
    const wk = F.weekCounts(8).filter(w => w.count > 0).length;
    if (st.length >= 2) return { why: `Stagnacja w ${st.length} ćwiczeniach wielostawowych`, st };
    if (weeksSince >= 8 && wk >= 7) return { why: `Trenujesz regularnie od ${Math.floor(weeksSince)} tygodni bez lżejszego tygodnia`, st };
    return null;
  };

  /* ---------- OSIĄGNIĘCIA ---------- */
  F.achievements = () => {
    const t = F.totals(); const out = [];
    const best = id => (F.PR[id] ? F.PR[id].w : 0);
    const A = (id, icon, name, desc, cur, goal) => out.push({ id, icon, name, desc, cur: Math.min(cur, goal), goal, done: cur >= goal });
    A('first', 'flag', 'Pierwszy krok', 'Zakończ pierwszy trening', t.count, 1);
    A('w10', 'dumbbell', 'Regularny', '10 zakończonych treningów', t.count, 10);
    A('w50', 'shield', 'Weteran sali', '50 zakończonych treningów', t.count, 50);
    A('w100', 'swords', 'Setka', '100 zakończonych treningów', t.count, 100);
    A('w300', 'crown', 'Żelazna rutyna', '300 zakończonych treningów', t.count, 300);
    A('v10', 'weight', '10 ton', 'Podnieś łącznie 10 000 kg', t.vol, 1e4);
    A('v100', 'weight', '100 ton', 'Podnieś łącznie 100 000 kg', t.vol, 1e5);
    A('v1000', 'mountain', 'Milion kilogramów', 'Podnieś łącznie 1 000 000 kg', t.vol, 1e6);
    A('pr10', 'trophy', 'Łamacz rekordów', '10 pobitych rekordów', F.prEvents(), 10);
    A('pr50', 'medal', 'Rekordzista', '50 pobitych rekordów', F.prEvents(), 50);
    A('bench100', 'target', 'Klub 100 — wyciskanie', 'Wyciśnij 100 kg leżąc', best('bench'), 100);
    A('squat140', 'target', 'Klub 140 — przysiad', 'Przysiad z 140 kg', best('squat'), 140);
    A('dead180', 'target', 'Klub 180 — martwy ciąg', 'Martwy ciąg 180 kg', best('deadlift'), 180);
    A('streak4', 'flame', 'Miesiąc ognia', '4 tygodnie z rzędu z realizacją celu', F.weekStreak(), 4);
    A('streak12', 'zap', 'Kwartał bez litości', '12 tygodni z rzędu z realizacją celu', F.weekStreak(), 12);
    return out;
  };

  /* ---------- OPERACJE NA DANYCH ---------- */
  F.addSession = async sess => { F.S.sessions.push(sess); F.S.sessions.sort((a, b) => b.start - a.start); await F.dbPut('sessions', sess); F.rebuild(); };
  F.delSession = async id => { F.S.sessions = F.S.sessions.filter(s => s.id !== id); await F.dbDel('sessions', id); F.rebuild(); };
  F.savePlan = async plan => { const i = F.S.plans.findIndex(p => p.id === plan.id); if (i >= 0) F.S.plans[i] = plan; else F.S.plans.push(plan); await F.dbPut('plans', plan); };
  F.delPlan = async id => { F.S.plans = F.S.plans.filter(p => p.id !== id); await F.dbDel('plans', id); };
  F.saveEx = async ex => { F.S.ex.set(ex.id, ex); await F.dbPut('exercises', ex); };
  F.delEx = async id => {
    const ex = F.S.ex.get(id); F.S.ex.delete(id); await F.dbDel('exercises', id);
    if (ex && !ex.custom) { const r = (await F.kvGet('removedSeed')) || []; r.push(id); await F.kvSet('removedSeed', r); }
  };
  F.addBW = async (kg, date) => { const e = { id: uid(), kg, date: date || Date.now() }; F.S.bw.push(e); F.S.bw.sort((a, b) => a.date - b.date); await F.dbPut('bodyweight', e); };
  F.delBW = async id => { F.S.bw = F.S.bw.filter(b => b.id !== id); await F.dbDel('bodyweight', id); };

  /* ---------- EKSPORT / IMPORT DANYCH ---------- */
  F.exportAll = () => ({
    app: 'FORGE', version: 1, exported: new Date().toISOString(),
    settings: F.S.settings, exercises: [...F.S.ex.values()], plans: F.S.plans, sessions: F.S.sessions, bodyweight: F.S.bw, measures: F.S.measures
  });
  F.exportFull = async (withPhotos = true) => { const o = F.exportAll(); o.version = 2; if (withPhotos) o.photos = await F.dbAll('photos'); return o; };
  F.exportCSV = () => {
    const rows = [['Data', 'Nazwa treningu', 'Czas trwania (min)', 'Ćwiczenie', 'Partia', 'Seria', 'Typ serii', 'Ciężar (kg)', 'Powtórzenia / sekundy', 'RPE', 'Notatka']];
    const esc = v => { v = v == null ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    [...F.S.sessions].reverse().forEach(se => se.exercises.forEach(e => {
      const ex = F.S.ex.get(e.exId); let n = 0;
      e.sets.forEach(s => { if (!s.done) return; n++; rows.push([new Date(se.start).toISOString().slice(0, 19).replace('T', ' '), se.name || '', Math.round((se.dur || 0) / 60), ex ? ex.name : e.exId, ex ? F.MUSCLES[ex.muscle] : '', n, { n: 'normalna', w: 'rozgrzewka', d: 'drop', f: 'do upadku' }[s.t || 'n'], s.w || 0, s.r || 0, s.rpe || '', e.note || '']); });
    }));
    return '﻿' + rows.map(r => r.map(esc).join(',')).join('\n');
  };
  F.importAll = async (data, mode) => { // mode: 'merge' | 'replace'
    if (!data || data.app !== 'FORGE') throw new Error('To nie jest kopia zapasowa FORGE.');
    if (mode === 'replace') { for (const s of ['exercises', 'plans', 'sessions', 'bodyweight', 'measures']) await F.dbClear(s); if (data.photos) await F.dbClear('photos'); await F.kvSet('seeded', true); }
    const put = async (store, arr) => { if (arr && arr.length) await F.dbPutMany(store, arr); };
    await put('exercises', data.exercises); await put('plans', data.plans); await put('sessions', data.sessions); await put('bodyweight', data.bodyweight); await put('measures', data.measures); await put('photos', data.photos);
    if (data.settings && mode === 'replace') { F.S.settings = { ...F.DEFAULT_SETTINGS, ...data.settings }; await F.saveSettings(); }
    const [ex, plans, sessions, bw, meas] = await Promise.all([F.dbAll('exercises'), F.dbAll('plans'), F.dbAll('sessions'), F.dbAll('bodyweight'), F.dbAll('measures')]); F.S.measures = meas.sort((a, b) => a.date - b.date);
    F.S.ex = new Map(ex.map(e => [e.id, e])); F.S.plans = plans.sort((a, b) => (a.order || 0) - (b.order || 0) || a.created - b.created);
    F.S.sessions = sessions.sort((a, b) => b.start - a.start); F.S.bw = bw.sort((a, b) => a.date - b.date); F.rebuild();
    if (F.ui) F.ui.photos = null;
    return { sessions: (data.sessions || []).length, plans: (data.plans || []).length, photos: (data.photos || []).length };
  };
  F.wipe = async () => { for (const s of STORES) await F.dbClear(s); F.S = { ex: new Map(), plans: [], sessions: [], bw: [], measures: [], settings: { ...F.DEFAULT_SETTINGS }, draft: null }; };
})();
