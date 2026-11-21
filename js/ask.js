/* FORGE — „Zapytaj FORGE”: czat-asystent działający w całości offline.
   Bez AI: rozpoznaje temat pytania, ćwiczenie, partię i okres, a odpowiedź liczy z danych użytkownika i z bazy wiedzy (js/kb.js).
   Pamięta kontekst rozmowy (ostatnie ćwiczenie, partię, okres i temat), więc działa „a w wyciskaniu?” czy „a rok temu?”. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views; const N = F.norm;
  const DAY = 864e5, WK = 7 * DAY;
  const MON = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const MONG = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const MONL = ['styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu', 'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu'];
  const WDG = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  const WD = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const dd = ts => { const d = new Date(ts); return `${d.getDate()} ${MONG[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
  const ago = ts => { const n = Math.round((F.startOfDay(Date.now()) - F.startOfDay(ts)) / DAY); return n <= 0 ? 'dziś' : n === 1 ? 'wczoraj' : n < 14 ? `${n} dni temu` : n < 60 ? `${Math.round(n / 7)} ${F.plur(Math.round(n / 7), 'tydzień', 'tygodnie', 'tygodni')} temu` : `${Math.round(n / 30)} ${F.plur(Math.round(n / 30), 'miesiąc', 'miesiące', 'miesięcy')} temu`; };
  const kg = v => `${F.fw(v)} ${F.unit()}`;
  const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + F.fmtNum(Math.abs(v), d);
  const rt = v => { v = Math.round(v || 0); return v < 60 ? `${v} s` : v % 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')} min` : `${v / 60} min`; };
  const ACC = { chest: 'klatkę', back: 'plecy', shoulders: 'barki', biceps: 'biceps', triceps: 'triceps', forearms: 'przedramiona', abs: 'brzuch', quads: 'czworogłowe', hams: 'dwugłowe uda', glutes: 'pośladki', calves: 'łydki' };
  const mAcc = (ms) => ms && ms.length > 2 ? 'nogi' : ms && ms.length === 2 && ms.includes('biceps') ? 'ręce' : ACC[ms && ms[0] || ms] || mName(ms[0]);
  const mName = m => (F.MUSCLES[m] || m).toLowerCase();

  /* ================= ROZPOZNAWANIE ================= */
  const STOP = new Set('dzien dobry a i o u w z ze na do od po przy dla ze za pod nad przed czy co ile jak jaki jaka jakie jakim jaka kiedy gdzie mam masz moj moja moje moim mojej mi mnie sie sobie to ten ta te tego tej tym tych jest sa byl bylo bylem robilem robie robic zrobilem zrobic dzis dzisiaj wczoraj jutro teraz tydzien tygodnia tygodniu tygodni miesiac miesiaca miesiacu miesiecy rok roku lat lata temu ostatnio ostatni ostatnie ostatnich ostatniego ostatnim raz razy razem plan planie planu trening treningu treningi treningow treningach cwiczenie cwiczenia cwiczeniu cwiczen kg ciezar ciezaru ciezarem seria serii serie mozna moge powinienem powinnam dobrze lepiej najlepiej bardzo prosze pokaz powiedz podaj daj sprawdz czym zastapic zamiast zamien zamiennik technika techniki jak robic wykonac wykonywac poprawnie rekord rekordy przerwa przerwy przerwe postep postepy stoi zastoj w ogole tez jeszcze juz bo ale lub albo czyli nie tak'.split(' '));
  const tmatch = (a, b) => { if (a === b) return true; const s = a.length <= b.length ? a : b, l = a.length <= b.length ? b : a; if (s.length < 3) return false; if (s.length < 5) return l.startsWith(s) && l.length - s.length <= 3; let k = 0; while (k < s.length && s[k] === l[k]) k++; return k >= 5; };
  const lev1 = (a, b) => { // odległość edycji ≤ 1 (z przestawieniem sąsiednich liter)
    if (a === b) return true; const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false; let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1); };
  const fuzzy = (a, b) => a.length >= 5 && b.length >= 5 && (lev1(a, b) || lev1(a.slice(0, 7), b.slice(0, 7)));
  const toks = s => N(s).split(' ').filter(t => t && !STOP.has(t));
  let EXIDX = null, EXVER = '';
  const exIndex = () => {
    const ver = F.S.ex.size + ':' + F.S.sessions.length; if (EXIDX && EXVER === ver) return EXIDX; EXVER = ver;
    const use = {}; F.S.sessions.forEach(s => s.exercises.forEach(e => { use[e.exId] = (use[e.exId] || 0) + 1; }));
    EXIDX = [...F.S.ex.values()].map(ex => ({ ex, use: use[ex.id] || 0, names: [ex.name, ...String(ex.alias || '').split(';')].map(x => toks(x)).filter(t => t.length) }));
    return EXIDX;
  };
  const findEx = q => {
    const qt = toks(q); if (!qt.length) return null; let best = null, bs = 0; const mt = (t, u) => tmatch(t, u) || fuzzy(t, u);
    exIndex().forEach(r => r.names.forEach(nt => {
      const hit = nt.filter(t => qt.some(u => mt(t, u))).length; if (!hit) return; const qcov = qt.filter(u => nt.some(t => mt(t, u))).length;
      let sc = 0; if (hit === nt.length) sc = 10 * qcov + 5; else if (nt.length >= 2 && qt.some(u => mt(nt[0], u)) && hit >= Math.ceil(nt.length / 2)) sc = 8 * qcov - 3 * (nt.length - hit); else return;
      sc += -4 * (qt.length - qcov) + Math.min(r.use, 30) * 0.1 + (r.ex.id.startsWith('fe_') ? 0 : 2) - nt.length * 0.1;
      if (sc > bs) { bs = sc; best = r.ex; }
    }));
    return bs > 0 ? best : null;
  };
  const findExAll = q => { const out = []; String(q).split(/\s+(?:i|vs\.?|versus|czy|a|oraz|z|do)\s+|,|\/|\+/i).forEach(part => { const e = findEx(part); if (e && !out.includes(e)) out.push(e); }); return out; };
  const MUS = [[/^(klat|piers|klac|klaty)/, ['chest']], [/^(plec|grzbiet|najszersz|kaptur)/, ['back']], [/^(bark|naramien|delt)/, ['shoulders']], [/^(bicep|bicek|bica|bick|bicki)/, ['biceps']], [/^(tricep|tric|trojglow|tricki)/, ['triceps']], [/^przedram/, ['forearms']], [/^(brzuch|brzuszk|abs|kaloryfer|core|miesnie brzucha)/, ['abs']], [/^(czworog|quad)/, ['quads']], [/^(dwuglow|hamstr)/, ['hams']], [/^(poslad|pupa|pupy|pupe|tylek|tylka|glute)/, ['glutes']], [/^(lydk|lydek|lydka)/, ['calves']], [/^(nog|nozk|uda|udo)/, ['quads', 'hams', 'glutes', 'calves']], [/^(rece|rak|ramiona|ramion)$/, ['biceps', 'triceps']]];
  const findMus = q => { for (const t of N(q).split(' ')) for (const [re, ms] of MUS) if (re.test(t)) return ms; return null; };
  const NUMW = { jeden: 1, jedna: 1, jedno: 1, dwa: 2, dwie: 2, trzy: 3, cztery: 4, piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9, dziesiec: 10, pol: 0.5 };
  const UNIT = t => /^(dzien|dni|dnia|doba|dob)/.test(t) ? DAY : /^(tydz|tyg)/.test(t) ? WK : /^(mies)/.test(t) ? 30.44 * DAY : /^(rok|lat|roku)/.test(t) ? 365.25 * DAY : /^kwartal/.test(t) ? 91.3 * DAY : 0;
  const UF = { d: ['dzień', 'dni', 'dni'], t: ['tydzień', 'tygodnie', 'tygodni'], m: ['miesiąc', 'miesiące', 'miesięcy'], r: ['rok', 'lata', 'lat'], k: ['kwartał', 'kwartały', 'kwartałów'] };
  const ulabel = (k, u) => { const f = UF[/^(dzien|dni|dob)/.test(u) ? 'd' : /^(tydz|tyg)/.test(u) ? 't' : /^mies/.test(u) ? 'm' : /^kwart/.test(u) ? 'k' : 'r']; return k === 0.5 ? `pół ${f === UF.r ? 'roku' : f === UF.m ? 'miesiąca' : f[0]}` : `${k === 1 ? '' : k + ' '}${k === 1 ? f[0] : F.plur(k, f[0], f[1], f[2])}`; };
  const MSTEM = ['stycz', 'lut', 'mar', 'kwie', 'maj', 'czerw', 'lip', 'sierp', 'wrzes', 'pazdz', 'listop', 'grud'];
  const findTime = q => {
    const n = N(q), now = Date.now(), today = F.startOfDay(now);
    const range = (from, to, label) => ({ kind: 'range', from, to, label });
    if (/\b(od poczatku|kiedykolwiek|wszech czasow|w historii|ogolnie|od zawsze|calej historii)\b/.test(n)) return range(0, now + DAY, 'od początku');
    if (/\bprzedwczoraj\b/.test(n)) return range(today - 2 * DAY, today - DAY, 'przedwczoraj');
    if (/\bwczoraj\b/.test(n)) return range(today - DAY, today, 'wczoraj');
    if (/\b(dzis|dzisiaj)\b/.test(n) && !/ile (mam )?(dzis )?(wazyc|zalozyc|dac)|co (mam )?dzis|na dzis/.test(n)) return range(today, today + DAY, 'dziś');
    let m = n.match(/\b(\d+|jeden|jedna|jedno|dwa|dwie|trzy|cztery|piec|szesc|siedem|osiem|dziewiec|dziesiec|pol)\s+(dni|dzien|dnia|doby|dob|tydzien|tygodnie|tygodni|tygodnia|miesiac|miesiace|miesiecy|miesiaca|rok|roku|lata|lat|kwartal\w*)\s+temu\b/);
    if (m) { const k = NUMW[m[1]] != null ? NUMW[m[1]] : +m[1]; const at = now - k * UNIT(m[2]); return { kind: 'point', at, label: `${ulabel(k, m[2])} temu` }; }
    m = n.match(/\b(dzien|tydzien|miesiac|rok|kwartal)\s+temu\b/); if (m) return { kind: 'point', at: now - UNIT(m[1]), label: `${m[1] === 'tydzien' ? 'tydzień' : m[1] === 'miesiac' ? 'miesiąc' : m[1]} temu` };
    m = n.match(/\bostatni\w*\s+(\d+|dwa|dwie|trzy|cztery|piec|szesc)?\s*(dni|dzien|tydzien|tygodni\w*|miesiac\w*|miesiecy|rok|lat\w*|kwartal\w*)\b/);
    if (m) { const k = m[1] ? (NUMW[m[1]] || +m[1]) : 1; const u = UNIT(m[2]); return range(now - k * u, now + 1, k === 1 ? `w ostatnim ${ulabel(1, m[2]).replace('dzień', 'dniu').replace('tydzień', 'tygodniu').replace('miesiąc', 'miesiącu').replace('rok', 'roku')}` : `w ostatnich ${ulabel(k, m[2])}`); }
    const ws = F.startOfWeek(now), d0 = new Date(today), ms = new Date(d0.getFullYear(), d0.getMonth(), 1).getTime(), ys = new Date(d0.getFullYear(), 0, 1).getTime();
    if (/\b(w tym|ten|obecnym|biezacym) tygodni|\btego tygodnia\b/.test(n)) return range(ws, now + 1, 'w tym tygodniu');
    if (/\b(zeszl|poprzedn|ubiegl)\w* tygodni|\b(zeszly|poprzedni|ubiegly) tydzien/.test(n)) return range(ws - WK, ws, 'w zeszłym tygodniu');
    if (/\b(w tym|ten|obecnym|biezacym) miesiac|\btego miesiaca\b/.test(n)) return range(ms, now + 1, 'w tym miesiącu');
    if (/\b(zeszl|poprzedn|ubiegl)\w* miesi/.test(n)) return range(new Date(d0.getFullYear(), d0.getMonth() - 1, 1).getTime(), ms, 'w zeszłym miesiącu');
    if (/\b(w tym|ten|obecnym|biezacym) roku?\b|\btego roku\b/.test(n)) return range(ys, now + 1, 'w tym roku');
    if (/\b(zeszl|poprzedn|ubiegl)\w* rok/.test(n)) return range(new Date(d0.getFullYear() - 1, 0, 1).getTime(), ys, 'w zeszłym roku');
    for (const t of n.split(' ')) { const i = MSTEM.findIndex(s => t.startsWith(s) && (s !== 'mar' || /^mar(zec|ca|cu)$/.test(t)) && (s !== 'maj' || /^maj(a|u)?$/.test(t)) && (s !== 'lut' || /^lut(y|ego|ym)$/.test(t)) && (s !== 'lip' || /^lip(iec|ca|cu)$/.test(t))); if (i >= 0) {
      const ym = n.match(/\b(20\d\d)\b/); let y = ym ? +ym[1] : d0.getFullYear(); if (!ym && i > d0.getMonth()) y--;
      return range(new Date(y, i, 1).getTime(), new Date(y, i + 1, 1).getTime(), `w ${MONL[i]}${y !== d0.getFullYear() ? ' ' + y : ''}`); } }
    return null;
  };

  const EQW = [[/bez sprzetu|w domu|wlasn\w* mas|masa ciala|masa wlasn|kalistenik/, ['Masa ciała', 'Drążek']], [/hantl/, ['Hantle']], [/kettl|odwazn/, ['Kettlebell']], [/maszyn/, ['Maszyna']], [/wyciag/, ['Wyciąg']], [/sztang/, ['Sztanga']]];
  const findEq = (n, ex) => { const exn = ex ? N(ex.name + ' ' + (ex.alias || '')) : ''; for (const [re, eq] of EQW) { const m = n.match(re); if (m && !exn.includes(m[0])) return /dom/.test(m[0]) ? ['Masa ciała', 'Drążek', 'Hantle', 'Kettlebell'] : eq; } return null; };

  /* ================= DANE ================= */
  const S = () => F.S.sessions; // najnowsze pierwsze
  const isWork = s => F.isWork(s);
  const hist = id => F.exHistory(id).filter(x => !x.deload); // od najstarszych
  const bestSet = (exId, sess) => { const e = sess.exercises.find(x => x.exId === exId); if (!e) return null; const ex = F.S.ex.get(exId); let b = null; e.sets.filter(isWork).forEach(s => { const v = F.e1rm(F.effLoad(ex, s, sess.start), s.r); if (!b || v > b.e1 || (ex.type === 'br' && (s.r || 0) > (b.r || 0))) b = { w: s.w || 0, r: s.r || 0, e1: v }; }); return b; };
  const sessWith = id => S().filter(s => s.exercises.some(e => e.exId === id && e.sets.some(isWork)));
  const inRange = (t, s) => s.start >= t.from && s.start < t.to;
  const nearest = (list, at) => { let b = null; list.forEach(s => { if (!b || Math.abs(s.start - at) < Math.abs(b.start - at)) b = s; }); return b; };
  const planNow = () => { const nx = F.nextWorkout && F.nextWorkout(); return nx ? nx.plan : F.S.plans[0]; };
  const planItem = id => { const p = planNow(); if (!p) return null; for (const d of p.days) { const it = d.items.find(i => i.exId === id); if (it) return { plan: p, day: d, it }; } return null; };
  const goalOf = () => { const p = planNow(); return (p && p.meta && p.meta.goal) || 'hyp'; };
  const expOf = () => { const p = planNow(); return (p && p.meta && p.meta.exp) || F.S.settings.exp || 'mid'; };
  const weekSets = (m, from, to) => { let d = 0, ind = 0; S().forEach(se => { if (se.start < from || se.start >= to) return; se.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); if (!ex) return; const n = e.sets.filter(isWork).length; if (ex.muscle === m) d += n; else if (ex.compound && F.secondaryOf(e.exId).includes(m)) ind += n * 0.5; }); }); return { d, ind, all: d + ind }; };
  const volRange = m => { const g = goalOf(), e = expOf(); const K = F.KB; if (K.volSmall[m]) return K.volSmall[m]; const r = (K.vol[g] || K.vol.hyp)[e] || K.vol.hyp.mid; return ['chest', 'back', 'quads', 'hams'].includes(m) ? r.major : r.minor; };
  const topUsed = (n, filter) => exIndex().filter(r => r.use > 0 && r.ex.type !== 'time' && (!filter || filter(r.ex))).sort((a, b) => b.use - a.use).slice(0, n).map(r => r.ex);
  const noData = () => ({ html: `<p>Nie masz jeszcze zapisanych treningów, więc nie mam z czego liczyć. Zrób pierwszy trening, a od razu będę odpowiadać na pytania o Twoje wyniki.</p>`, acts: [{ l: 'Plany', i: 'clipboard-list', href: '#/plans' }, { l: 'Kreator planu', i: 'sparkles', href: '#/wizard' }], chips: ['Co umiesz?', 'Ile białka jeść?', 'Jak długie przerwy robić?'] });

  /* ================= ELEMENTY ODPOWIEDZI ================= */
  const tiles = arr => `<div class="ak-tiles n${arr.length}">${arr.map(t => `<div${t.hot ? ' class="hot"' : ''}><small>${t.l}</small><b>${t.v}</b>${t.s ? `<em>${t.s}</em>` : ''}</div>`).join('')}</div>`;
  const rows = arr => `<div class="ak-rows">${arr.map(r => `<div class="ak-r">${r.i || ''}<span>${r.l}</span><b>${r.v}</b></div>`).join('')}</div>`;
  const delta = (v, unit = '') => `<span class="ak-d ${v > 0 ? 'up' : v < 0 ? 'dn' : ''}">${sgn(v)}${unit}</span>`;
  const spark = pts => pts.length >= 2 ? `<div class="ak-chart">${F.chart.line(pts, { w: 320, h: 150 })}</div>` : '';
  const exLink = ex => ({ l: 'Historia ćwiczenia', i: 'chart-line', href: '#/ex/' + encodeURIComponent(ex.id) });
  const setTxt = (ex, b) => ex.type === 'br' ? `${b.r} powt.` : ex.type === 'time' ? F.fmtDur(b.r) : `${kg(b.w)} × ${b.r}`;

  /* ================= TEMATY ================= */
  const H = {};
  const needEx = (ctx, intent, what) => { const top = topUsed(4); ctx.pending = intent; return { html: `<p>${what || 'Którego ćwiczenia dotyczy pytanie?'} Wybierz albo wpisz nazwę.</p>`, chips: top.length ? top.map(e => e.name) : ['Przysiad ze sztangą', 'Wyciskanie sztangi leżąc', 'Martwy ciąg'] }; };

  H.histAt = c => {
    if (!S().length) return noData(); const ex = c.ex; if (!ex) return needEx(c, 'histAt', 'O które ćwiczenie chodzi?');
    const all = sessWith(ex.id); if (!all.length) return { html: `<p>Nie masz jeszcze zapisanego treningu z ćwiczeniem <b>${E(ex.name)}</b>.</p>`, chips: [`Zamiennik — ${ex.name}`, `Technika — ${ex.name}`] };
    const t = c.time || { kind: 'point', at: Date.now() - 30.44 * DAY, label: 'miesiąc temu' };
    let s0; if (t.kind === 'range') { const inn = all.filter(s => inRange(t, s)); s0 = inn.sort((a, b) => (bestSet(ex.id, b).e1) - (bestSet(ex.id, a).e1))[0]; if (!s0) return { html: `<p>${cap(t.label)} nie robiłeś ćwiczenia <b>${E(ex.name)}</b>. Najbliżej: ${dd(nearest(all, (t.from + t.to) / 2).start)}.</p>`, chips: [`Kiedy ostatnio — ${ex.name}?`, `Postęp — ${ex.name}`] }; }
    else s0 = nearest(all, t.at);
    const b0 = bestSet(ex.id, s0), sN = all[0], bN = bestSet(ex.id, sN), cur = s0 === sN;
    const d = bN.e1 - b0.e1;
    const html = `<p>${t.kind === 'point' ? `Najbliższy trening do daty „${t.label}”: <b>${dd(s0.start)}</b>.` : `${cap(t.label)} najlepsza seria była <b>${dd(s0.start)}</b>.`}</p>
      ${tiles([{ l: dd(s0.start), v: setTxt(ex, b0), s: ex.type === 'wr' || ex.type === 'bwr' ? `maks ${kg(b0.e1)}` : '' }, cur ? null : { l: 'Ostatnio · ' + dd(sN.start), v: setTxt(ex, bN), s: ex.type === 'wr' || ex.type === 'bwr' ? `maks ${kg(bN.e1)}` : '' }].filter(Boolean))}
      ${!cur && (ex.type === 'wr' || ex.type === 'bwr') ? `<p>${Math.abs(d) < 0.05 ? 'Od tamtej pory wyliczony maks <b>bez zmian</b>.' : `Od tamtej pory wyliczony maks: ${delta(F.toDisp(d), ' ' + F.unit())}${b0.e1 ? ` (${sgn(d / b0.e1 * 100, 0)}%)` : ''}.`}</p>` : ''}`;
    return { html, acts: [exLink(ex)], chips: [`Postęp — ${ex.name}`, `Cel na dziś — ${ex.name}`, `Rekord — ${ex.name}`] };
  };

  H.record = c => {
    if (!S().length) return noData(); const ex = c.ex;
    if (!ex) { const list = [...F.S.ex.values()].filter(e => e.compound && (e.type === 'wr' || e.type === 'bwr')).map(e => ({ e, b: F.bestE1(e.id) })).filter(x => x.b > 0).sort((a, b) => b.b - a.b).slice(0, 6);
      if (!list.length) return { html: '<p>Nie masz jeszcze rekordów w ćwiczeniach wielostawowych.</p>' };
      return { html: `<p>Twoje najwyższe wyliczone maksy (na jedno powtórzenie) w ćwiczeniach wielostawowych:</p>${rows(list.map(x => ({ i: F.mDot(x.e.muscle), l: E(x.e.name), v: kg(x.b) })))}`, acts: [{ l: 'Wszystkie rekordy', i: 'trophy', href: '#/stats', a: 'askPrs' }], chips: ['Ostatnie rekordy', `Postęp — ${list[0].e.name}`, 'Co stoi w miejscu?'] }; }
    const h = hist(ex.id); if (!h.length) return { html: `<p>Nie masz jeszcze serii w ćwiczeniu <b>${E(ex.name)}</b>.</p>` };
    if (ex.type === 'br' || ex.type === 'time') { const b = h.reduce((a, x) => (ex.type === 'time' ? x.dur : x.reps) > (ex.type === 'time' ? a.dur : a.reps) ? x : a, h[0]); return { html: `<p>Rekord — <b>${E(ex.name)}</b>: <b>${ex.type === 'time' ? F.fmtDur(b.dur) : b.reps + ' powtórzeń'}</b> (${dd(b.ts)}).</p>`, acts: [exLink(ex)] }; }
    const bw = h.reduce((a, x) => x.w > a.w ? x : a, h[0]), be = h.reduce((a, x) => x.e1 > a.e1 ? x : a, h[0]);
    const bwSet = bw.sets.reduce((a, s) => (s.w || 0) > (a.w || 0) ? s : a, bw.sets[0]);
    return { html: `<p>Rekordy — <b>${E(ex.name)}</b>:</p>${tiles([{ l: 'Największy ciężar', v: kg(bwSet.w), s: `× ${bwSet.r} · ${dd(bw.ts)}`, hot: 1 }, { l: 'Wyliczony maks', v: kg(be.e1), s: dd(be.ts) }])}<p class="ak-s">Maks liczę wzorem Epleya z najlepszej serii do 10 powtórzeń.</p>`, acts: [exLink(ex)], chips: [`Postęp — ${ex.name}`, `Cel na dziś — ${ex.name}`, `Czy stoi w miejscu — ${ex.name}?`] };
  };

  H.recentPr = c => {
    const t = c.time || { from: Date.now() - 30 * DAY, to: Date.now() + 1, label: 'w ostatnich 30 dniach' }; const list = [];
    S().forEach(s => { if (s.start >= t.from && s.start < t.to) (s.prs || []).forEach(p => list.push({ p, s })); });
    if (!list.length) return { html: `<p>${cap(t.label)} nie było nowych rekordów. Rekordy wracają, gdy ciężar rośnie systematycznie — sprawdź, czy któreś ćwiczenie nie stoi w miejscu.</p>`, chips: ['Co stoi w miejscu?', 'Jak mi poszedł ten miesiąc?'] };
    const txt = p => { const ex = F.S.ex.get(p.exId); return { n: ex ? ex.name : p.exId, m: ex ? ex.muscle : '', v: p.text || '' }; };
    const uniq = []; list.forEach(x => { const t2 = txt(x.p); if (!uniq.some(u => u.n === t2.n)) uniq.push({ ...t2, ts: x.s.start }); });
    return { html: `<p>${cap(t.label)}: <b>${list.length}</b> ${F.plur(list.length, 'rekord', 'rekordy', 'rekordów')} w ${uniq.length} ${F.plur(uniq.length, 'ćwiczeniu', 'ćwiczeniach', 'ćwiczeniach')}.</p>${rows(uniq.slice(0, 8).map(u => ({ i: F.mDot(u.m), l: `${E(u.n)}<small>${dd(u.ts)}</small>`, v: E(u.v) })))}`, chips: ['Moje rekordy', 'Jak mi poszedł ten miesiąc?'] };
  };

  H.e1rm = c => {
    if (!c.ex) return needEx(c, 'e1rm', 'Dla którego ćwiczenia policzyć maks?'); const ex = c.ex, b = F.bestE1(ex.id); if (!b) return { html: `<p>Nie mam serii do 10 powtórzeń z ciężarem w ćwiczeniu <b>${E(ex.name)}</b>, więc nie wyliczę maksa.</p>` };
    const rec = S().filter(s => s.start > Date.now() - 42 * DAY).map(s => bestSet(ex.id, s)).filter(Boolean).reduce((a, x) => Math.max(a, x.e1), 0);
    return { html: `${tiles([{ l: 'Maks z całej historii', v: kg(b), hot: 1 }, { l: 'Maks z 6 tygodni', v: rec ? kg(rec) : '–' }])}<p>Na tej podstawie ciężar roboczy: ${[[.85, 5], [.75, 8], [.7, 10], [.65, 12]].map(([p, r]) => `<b>${r}</b> powt. ≈ ${kg(Math.round(b * p / (F.S.settings.step || 2.5)) * (F.S.settings.step || 2.5))}`).join(', ')}.</p><p class="ak-s">Wyliczone wzorem Epleya.</p>`, acts: [exLink(ex)], chips: [`Postęp — ${ex.name}`, `Rekord — ${ex.name}`] };
  };

  H.calc1rm = c => {
    const m = c.q.toLowerCase().replace(/(\d)[,.](\d)/g, '$1.$2').match(/(\d+(?:\.\d+)?)\s*(?:kg|lb)?\s*(?:x|×|na|razy|po)\s*(\d+)/); if (!m) return { html: '<p>Podaj ciężar i powtórzenia, np. „100 kg na 5”.</p>', chips: ['100 kg na 5', '80 kg na 8'] };
    const w = +m[1], r = +m[2]; if (r > 30) return { html: '<p>Przy ponad 30 powtórzeniach wzory na maks tracą sens. Weź cięższą serię.</p>' };
    const ep = F.e1rm(w, r), br = r < 37 ? w * 36 / (37 - r) : 0;
    return { html: `${tiles([{ l: 'Wzór Epleya', v: `${F.fmtNum(ep, 1)} ${F.unit()}`, hot: 1 }, { l: 'Wzór Brzyckiego', v: `${F.fmtNum(br, 1)} ${F.unit()}` }])}<p>Z serii ${F.fmtNum(w, 1)} × ${r}. ${r > 12 ? 'Najdokładniej oba wzory działają do 12 powtórzeń.' : 'Średnio: <b>' + F.fmtNum((ep + br) / 2, 1) + ' ' + F.unit() + '</b>.'}</p>`, acts: [{ l: 'Kalkulatory', i: 'calculator', href: '#/tools' }], chips: [`Talerze na ${F.fmtNum(Math.round(ep / 2.5) * 2.5, 1)} ${F.unit()}`, `Rozgrzewka do ${F.fmtNum(w, 1)} ${F.unit()}`] };
  };

  // gryf z talerzami po obu stronach; kolory jak w talerzach zawodniczych (25 czerwony, 20 niebieski, 15 żółty, 10 zielony, 5 biały)
  const PC = { 25: '#d8343a', 20: '#2f6fd6', 15: '#e2b21f', 10: '#3c9a52', 5: '#e9e4dc', 2.5: '#b8323a', 1.25: '#a8acb6', 0.5: '#8d929c' };
  const plateSvg = disc => {
    const hh = p => p >= 10 ? 84 : p >= 5 ? 58 : p >= 2.5 ? 44 : 34, ww = p => p >= 20 ? 13 : p >= 10 ? 10 : p >= 5 ? 8 : 6, hub = 46, sw = disc.reduce((a, p) => a + ww(p) + 1.5, 0); const W = Math.max(340, 2 * (hub + sw + 24)), H = 104, cx = W / 2, cy = 52;
    let side = '', x = cx + hub + 4; const lab = [];
    disc.forEach(p => { const h = hh(p), w = ww(p), c = PC[p] || '#9aa0aa'; side += `<rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2.5" fill="${c}"/><rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2.5" fill="url(#akpg)"/>`; lab.push([x + w / 2, p]); x += w + 1.5; });
    const end = Math.max(x + 14, cx + hub + 70);
    const mirror = side ? `<g transform="translate(${2 * cx} 0) scale(-1 1)">${side}</g>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="akpg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient><linearGradient id="akbg" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#d7dbe2"/><stop offset="1" stop-color="#6e737d"/></linearGradient></defs>
      <rect x="${2 * cx - end}" y="${cy - 4}" width="${2 * end - 2 * cx}" height="8" rx="3" fill="url(#akbg)"/><rect x="${cx - hub}" y="${cy - 3}" width="${2 * hub}" height="6" fill="#8b9099"/>
      <rect x="${cx - hub - 4}" y="${cy - 12}" width="5" height="24" rx="1.5" fill="url(#akbg)"/><rect x="${cx + hub - 1}" y="${cy - 12}" width="5" height="24" rx="1.5" fill="url(#akbg)"/>${side}${mirror}</svg>`;
  };
  H.plates = c => {
    const m = c.q.toLowerCase().replace(/(\d)[,.](\d)/g, '$1.$2').match(/(\d+(?:\.\d+)?)/); if (!m) return { html: '<p>Podaj ciężar, np. „talerze na 120”.</p>', chips: ['Talerze na 100', 'Talerze na 140'] };
    const s = F.S.settings, target = F.fromDisp(+m[1]), bar = s.bar || 20; if (target < bar) return { html: `<p>${kg(target)} to mniej niż sam gryf (${kg(bar)}).</p>` };
    let side = (target - bar) / 2; const out = []; [...(s.plates || [25, 20, 15, 10, 5, 2.5, 1.25])].sort((a, b) => b - a).forEach(p => { const k = Math.floor((side + 1e-6) / p); if (k > 0) { out.push([p, k]); side -= k * p; } });
    const rest = Math.round(side * 2 * 100) / 100;
    const disc = out.flatMap(([p, k]) => Array(k).fill(p)), svg = plateSvg(disc);
    return { html: `<div class="ak-plates">${svg}</div><p>Na <b>${kg(target)}</b> (gryf ${kg(bar)}) na każdą stronę: <b>${out.length ? out.map(([p, k]) => `${k}× ${F.fmtNum(F.toDisp(p), 2)}`).join(' + ') : 'nic'}</b>.${rest > 0.01 ? ` Brakuje ${F.fmtNum(F.toDisp(rest), 2)} ${F.unit()} — Twoje talerze nie pozwalają dokładnie.` : ''}</p>`, acts: [{ l: 'Kalkulator talerzy', i: 'calculator', href: '#/tools' }], chips: [`Rozgrzewka do ${m[1]} ${F.unit()}`] };
  };

  H.warmup = c => {
    const m = c.q.toLowerCase().replace(/(\d)[,.](\d)/g, '$1.$2').match(/(\d+(?:\.\d+)?)/);
    if (!m) { const it = c.ex && F.LAST[c.ex.id]; if (!it) return H.know({ ...c, key: 'warmup' }); }
    const w = m ? F.fromDisp(+m[1]) : Math.max(...F.LAST[c.ex.id].sets.map(s => s.w || 0)); const ws = F.warmupSets(w);
    return { html: `<p>Rozgrzewka przed serią roboczą <b>${kg(w)}</b>:</p>${rows(ws.map((s, i) => ({ l: `${i + 1}. ${s.pct ? Math.round(s.pct * 100) + '% ciężaru' : 'sam gryf'}`, v: `${kg(s.w)} × ${s.r}` })))}<p class="ak-s">Schemat jak w kalkulatorze rozgrzewki: sam gryf, potem 40, 60, 75 i 90% ciężaru roboczego, z malejącą liczbą powtórzeń.</p>`, chips: [`Talerze na ${m ? m[1] : Math.round(F.toDisp(w))}`] };
  };

  H.progress = c => {
    if (!S().length) return noData(); const ex = c.ex;
    if (!ex) { const now = Date.now(), A = (a, b) => S().filter(s => s.start >= a && s.start < b); const cur = A(now - 28 * DAY, now + 1), prev = A(now - 56 * DAY, now - 28 * DAY); const v = l => l.reduce((x, s) => x + F.sessionVolume(s), 0);
      const vc = v(cur), vp = v(prev); const imp = [...F.S.ex.values()].filter(e => e.compound && e.type === 'wr').map(e => { const h = hist(e.id); if (h.length < 3) return null; const r = h.filter(x => x.ts >= now - 28 * DAY), o = h.filter(x => x.ts < now - 28 * DAY && x.ts >= now - 120 * DAY); if (!r.length || !o.length) return null; const a = Math.max(...o.map(x => x.e1)), b = Math.max(...r.map(x => x.e1)); return { e, d: b - a, p: a ? (b - a) / a * 100 : 0 }; }).filter(Boolean).sort((a, b) => b.p - a.p);
      return { html: `<p>Ostatnie 4 tygodnie względem 4 wcześniejszych:</p>${tiles([{ l: 'Treningi', v: cur.length, s: `wcześniej ${prev.length}` }, { l: 'Tonaż', v: F.fmtVol(vc), s: vp ? `${sgn((vc - vp) / vp * 100, 0)}%` : '' }])}${imp.some(x => x.p > 0) ? `<p>Największy wzrost wyliczonego maksa:</p>${rows(imp.filter(x => x.p > 0).slice(0, 4).map(x => ({ i: F.mDot(x.e.muscle), l: E(x.e.name), v: `${sgn(x.p, 0)}%` })))}` : ''}${imp.some(x => x.p <= 0) ? `<p>Bez wzrostu: ${imp.filter(x => x.p <= 0).slice(0, 3).map(x => E(x.e.name)).join(', ')}.</p>` : ''}`, acts: [{ l: 'Raport', i: 'file-text', href: '#/report' }], chips: imp.length ? [`Postęp — ${imp[0].e.name}`, 'Co stoi w miejscu?', 'Ostatnie rekordy'] : ['Co stoi w miejscu?', 'Ostatnie rekordy'] }; }
    const h = hist(ex.id); if (h.length < 2) return { html: `<p>Mam za mało treningów z ćwiczeniem <b>${E(ex.name)}</b>, żeby ocenić postęp (potrzebne co najmniej 2).</p>`, acts: [exLink(ex)] };
    const key = ex.type === 'br' ? 'reps' : ex.type === 'time' ? 'dur' : 'e1'; const from = c.time ? (c.time.kind === 'range' ? c.time.from : c.time.at) : Date.now() - 91 * DAY;
    let hh = h.filter(x => x.ts >= from); if (hh.length < 2) hh = h.slice(-Math.min(h.length, 8));
    const a = hh[0][key], b = Math.max(...hh.slice(-3).map(x => x[key])); const d = b - a; const fmt = v => key === 'e1' ? kg(v) : key === 'dur' ? F.fmtDur(v) : `${v} powt.`;
    const pts = hh.map(x => ({ x: x.ts, y: key === 'e1' ? F.toDisp(x[key]) : x[key], tip: `${dd(x.ts)}: ${fmt(x[key])}` }));
    const st = F.stagnation(ex.id);
    return { html: `<p>${key === 'e1' ? 'Wyliczony maks' : key === 'dur' ? 'Najdłuższy czas' : 'Najwięcej powtórzeń'} — <b>${E(ex.name)}</b>, od ${dd(hh[0].ts)}:</p>${tiles([{ l: dd(hh[0].ts), v: fmt(a) }, { l: 'Teraz', v: fmt(b), hot: 1 }, { l: 'Zmiana', v: (d > 0 ? '+' : d < 0 ? '−' : '') + (key === 'e1' ? kg(Math.abs(d)) : key === 'dur' ? F.fmtDur(Math.abs(d)) : Math.abs(d)), s: a ? `${sgn(d / a * 100, 0)}%` : '' }])}${spark(pts)}${st && st.stuck >= 3 ? `<p>Uwaga: od <b>${st.stuck}</b> ${F.plur(st.stuck, 'treningu', 'treningów', 'treningów')} bez poprawy.</p>` : ''}`, acts: [exLink(ex)], chips: st && st.stuck >= 2 ? [`Dlaczego stoi w miejscu — ${ex.name}?`, `Zamiennik — ${ex.name}`] : [`Rekord — ${ex.name}`, `Cel na dziś — ${ex.name}`] };
  };

  H.stag = c => {
    if (!S().length) return noData(); const ex = c.ex;
    if (!ex) { const list = [...F.S.ex.values()].map(e => ({ e, s: F.stagnation(e.id) })).filter(x => x.s && x.s.stuck >= 3).sort((a, b) => b.s.stuck - a.s.stuck);
      if (!list.length) return { html: '<p>Żadne ćwiczenie nie stoi w miejscu: w każdym poprawiłeś wynik w ciągu ostatnich 3 treningów. Tak trzymaj.</p>', chips: ['Jak mi poszedł ten miesiąc?', 'Ostatnie rekordy'] };
      return { html: `<p>Bez poprawy od co najmniej 3 treningów:</p>${rows(list.slice(0, 6).map(x => ({ i: F.mDot(x.e.muscle), l: E(x.e.name), v: `${x.s.stuck} tr.` })))}`, chips: list.slice(0, 2).map(x => `Dlaczego stoi w miejscu — ${x.e.name}?`).concat(['Co zaniedbuję?']) }; }
    const st = F.stagnation(ex.id); const h = hist(ex.id);
    if (!st || st.stuck < 2) return { html: `<p><b>${E(ex.name)}</b> nie stoi w miejscu${h.length < 4 ? ' — mam za mało treningów, żeby to ocenić (potrzebne 4)' : ': ostatnia poprawa była w ciągu 2 ostatnich treningów'}.</p>`, acts: [exLink(ex)], chips: [`Postęp — ${ex.name}`] };
    // diagnoza z danych
    const now = Date.now(), m = ex.muscle, why = [];
    const ws = weekSets(m, now - 28 * DAY, now + 1).all / 4, [lo] = volRange(m); if (ws < lo) why.push(`<b>Za mało serii.</b> Na partię „${mName(m)}” przypada ok. ${F.fmtNum(ws, 0)} serii tygodniowo, a dla Twojego celu zalecam co najmniej ${lo}.`);
    const freq = new Set(S().filter(s => s.start >= now - 28 * DAY && s.exercises.some(e => e.exId === ex.id)).map(s => F.startOfWeek(s.start))).size; const cnt = S().filter(s => s.start >= now - 28 * DAY && s.exercises.some(e => e.exId === ex.id)).length;
    if (cnt / 4 < 1) why.push(`<b>Za rzadko.</b> W ostatnich 4 tygodniach ${cnt} ${F.plur(cnt, 'trening', 'treningi', 'treningów')} z tym ćwiczeniem. Dla siły ACSM (2026) zaleca co najmniej 2 sesje tygodniowo.`);
    const pi = planItem(ex.id); if (pi && pi.it.rest && ex.compound && pi.it.rest < F.KB.restOf(goalOf(), expOf(), 'main')) why.push(`<b>Krótka przerwa.</b> Masz w planie ${rt(pi.it.rest)}; przy ciężkim ćwiczeniu wielostawowym zalecam ${rt(F.KB.restOf(goalOf(), expOf(), 'main'))}, żeby w kolejnych seriach nie tracić powtórzeń.`);
    const lastDl = F.S.settings.lastDeload || 0; if (h.length >= 8 && now - lastDl > 56 * DAY) why.push('<b>Zmęczenie.</b> Od ponad 8 tygodni nie było tygodnia odciążenia. Odciążenie (mniej serii, podobny ciężar) ma ograniczyć narastające zmęczenie — Bell i in. (2023).');
    const hint = F.exHint && F.exHint(ex.id);
    return { html: `<p><b>${E(ex.name)}</b>: ${st.stuck} ${F.plur(st.stuck, 'trening', 'treningi', 'treningów')} bez poprawy. Co pokazują Twoje dane:</p>${why.length ? `<ul class="ak-ul">${why.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p>Objętość, częstotliwość i przerwy są w porządku — to zwykły zastój, który mija po zmianie bodźca.</p>'}<p><b>Co zrobić:</b> ${hint ? E(hint.d) : 'zejdź o 10% z ciężarem i buduj od nowa, dokładając powtórzenia — tak liczy automatyczna progresja FORGE.'}</p>`, acts: [exLink(ex)], chips: [`Zamiennik — ${ex.name}`, `Ile serii na ${ACC[m] || mName(m)} w tym tygodniu?`, 'Co to jest odciążenie?'] };
  };

  H.last = c => {
    if (!S().length) return noData();
    if (c.ex) { const l = sessWith(c.ex.id)[0]; if (!l) return { html: `<p>Nie robiłeś jeszcze ćwiczenia <b>${E(c.ex.name)}</b>.</p>` }; const e = l.exercises.find(x => x.exId === c.ex.id); const ws = e.sets.filter(isWork);
      return { html: `<p>Ostatnio <b>${E(c.ex.name)}</b>: <b>${dd(l.start)}</b> (${ago(l.start)}), trening „${E(l.name)}”.</p>${rows(ws.map((s, i) => ({ l: `Seria ${i + 1}`, v: setTxt(c.ex, s) })))}`, acts: [{ l: 'Otwórz trening', i: 'history', href: '#/session/' + l.id }], chips: [`Cel na dziś — ${c.ex.name}`, `Postęp — ${c.ex.name}`] }; }
    if (c.mus) { const l = S().find(s => s.exercises.some(e => { const ex = F.S.ex.get(e.exId); return ex && c.mus.includes(ex.muscle) && e.sets.some(isWork); })); if (!l) return { html: `<p>Nie trenowałeś jeszcze tej partii.</p>` }; return { html: `<p>Ostatni trening na ${c.mus.map(mName).join(', ')}: <b>${dd(l.start)}</b> (${ago(l.start)}), „${E(l.name)}”.</p>`, acts: [{ l: 'Otwórz trening', i: 'history', href: '#/session/' + l.id }], chips: [`Czy mogę dziś trenować ${mAcc(c.mus)}?`] }; }
    const l = S()[0]; return { html: `<p>Ostatni trening: <b>${dd(l.start)}</b> (${ago(l.start)}), „${E(l.name)}”, ${l.exercises.length} ${F.plur(l.exercises.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}, tonaż ${F.fmtVol(F.sessionVolume(l))}.</p>`, acts: [{ l: 'Otwórz trening', i: 'history', href: '#/session/' + l.id }], chips: ['Co mam dziś?', 'Ile trenowałem w tym miesiącu?'] };
  };

  H.target = c => {
    if (!c.ex) { const nx = F.nextWorkout && F.nextWorkout(); if (!nx) return needEx(c, 'target', 'Dla którego ćwiczenia podać ciężar?');
      const out = nx.day.items.filter(i => !i.cardio).map(i => { const ex = F.S.ex.get(i.exId); const sg = ex && F.suggest(i.exId, i.reps); return ex ? { i: F.mDot(ex.muscle), l: E(ex.name), v: sg && sg.w ? `${kg(sg.w)} × ${sg.r || i.reps}` : sg && sg.r ? `${sg.r} powt.` : `${i.sets}×${i.reps}` } : null; }).filter(Boolean);
      return { html: `<p>Cele na najbliższy trening — <b>${E(nx.day.name)}</b>:</p>${rows(out)}<p class="ak-s">Ciężary z automatycznej progresji na podstawie ostatnich wyników.</p>`, acts: [{ l: 'Zacznij trening', i: 'play', a: 'startDay', d: { p: nx.plan.id, d: nx.day.id } }], chips: ['Ile mam przerwy?', 'Czy mogę dziś trenować nogi?'] }; }
    const pi = planItem(c.ex.id), sg = F.suggest(c.ex.id, pi ? pi.it.reps : null);
    if (!sg) return { html: `<p>Nie robiłeś jeszcze <b>${E(c.ex.name)}</b>, więc nie mam z czego wyliczyć ciężaru. Na pierwszym treningu zacznij lekko i dobierz ciężar tak, żeby zostawał zapas 2–3 powtórzeń.</p>`, chips: [`Technika — ${c.ex.name}`] };
    return { html: `<p>Cel na dziś — <b>${E(c.ex.name)}</b>:</p>${tiles([{ l: 'Cel', v: sg.w ? `${kg(sg.w)} × ${sg.r}` : `${sg.r} powt.`, hot: 1 }, pi ? { l: 'W planie', v: `${pi.it.sets} × ${pi.it.reps}` } : null].filter(Boolean))}${sg.note ? `<p>${E(sg.note)}.</p>` : ''}<p class="ak-s">Zasada: gdy we wszystkich seriach dojdziesz do górnej granicy powtórzeń z zapasem, dokładasz najmniejszy krok ciężaru.</p>`, acts: [exLink(c.ex)], chips: [`Rozgrzewka do ${sg.w ? Math.round(F.toDisp(sg.w)) : ''} ${F.unit()}`.trim(), `Przerwa — ${c.ex.name}`] };
  };

  H.rest = c => {
    const g = goalOf(), e = expOf(), R = role => F.KB.restOf(g, e, role); const GN = (F.PLN && F.PLN.GOALS[g] || ['Masa'])[0];
    const why = { str: 'Przy bojach przerwa musi być pełna, bo każda seria ma być tak ciężka jak pierwsza.', endur: 'Krótkie przerwy są częścią bodźca: mięsień uczy się pracować w zmęczeniu.', health: 'Przerwa pozwala spokojnie wrócić do równego oddechu.' }[g] || 'Taka przerwa pozwala w kolejnej serii powtórzyć prawie tyle samo powtórzeń, a to przekłada się na przyrost mięśni.';
    if (c.ex) { const pi = planItem(c.ex.id); const role = !c.ex.compound ? 'iso' : pi && pi.it.rest >= 150 ? 'main' : 'sec';
      return { html: `<p>${pi ? `W planie „${E(pi.plan.name)}” przy <b>${E(c.ex.name)}</b> masz przerwę <b>${rt(pi.it.rest)}</b>.` : `<b>${E(c.ex.name)}</b> nie ma w Twoim planie. Dla celu „${GN}” zalecam ${rt(R(role))}.`}</p><p>${why}</p>`, chips: ['Dlaczego takie przerwy?', 'Jakie mam ciężary na dziś?'] }; }
    const nx = F.nextWorkout && F.nextWorkout(); const pr = nx ? nx.day.items.filter(i => !i.cardio && i.rest) : [];
    const planHtml = pr.length ? `<p>W planie — <b>${E(nx.day.name)}</b>:</p>${rows(pr.map(i => { const ex = F.S.ex.get(i.exId); return { i: F.mDot(ex && ex.muscle), l: E(ex ? ex.name : i.exId), v: rt(i.rest) }; }))}` : '';
    return { html: `${planHtml}<p>Zalecane dla celu „${GN}”:</p>${rows([{ l: 'Ćwiczenia główne', v: rt(R('main')) }, { l: 'Pomocnicze wielostawowe', v: rt(R('sec')) }, { l: 'Izolowane', v: rt(R('iso')) }])}<p>${why}</p>`, acts: [{ l: 'Czytaj w poradach', i: 'book-open', href: '#/guide/rest' }], chips: ['Dlaczego takie przerwy?', 'Co to jest RIR?'] };
  };

  H.recovery = c => {
    if (!S().length) return noData(); const r = F.recovery(); const ms = c.mus || (c.ex ? [c.ex.muscle] : null);
    const st = m => r[m].rem > 0 ? `ok. ${Math.max(1, Math.round(r[m].rem))} h` : 'gotowe';
    if (ms) { const notReady = ms.filter(m => r[m] && r[m].rem > 0); const all = ms.filter(m => r[m]);
      return { html: `<p>${notReady.length ? `<b>Jeszcze nie w pełni.</b> Do gotowości: ${notReady.map(m => `${mName(m)} — ${st(m)}`).join(', ')}.${notReady.length < all.length ? ` Gotowe: ${all.filter(m => !notReady.includes(m)).map(mName).join(', ')}.` : ''}` : `<b>Tak.</b> Gotowe do pracy: ${all.map(mName).join(', ')}.`}</p>${rows(all.map(m => ({ i: F.mDot(m), l: cap(mName(m)), v: st(m) })))}<p class="ak-s">Liczone z Twoich serii i czasu od ostatniego treningu każdej partii.</p>`, acts: [{ l: 'Mapa regeneracji', i: 'activity', href: '#/stats', a: 'askRegen' }], chips: ['Co mam dziś?', 'Które partie są gotowe?'] }; }
    const ready = Object.keys(r).filter(m => r[m].rem <= 0), tired = Object.keys(r).filter(m => r[m].rem > 0).sort((a, b) => r[b].rem - r[a].rem);
    return { html: `<p>${tired.length ? `Odpoczywają: <b>${tired.map(mName).join(', ')}</b>. Gotowe: ${ready.map(mName).join(', ') || 'brak'}.` : 'Wszystkie partie są gotowe do pracy.'}</p>${tired.length ? rows(tired.slice(0, 6).map(m => ({ i: F.mDot(m), l: cap(mName(m)), v: st(m) }))) : ''}`, acts: [{ l: 'Mapa regeneracji', i: 'activity', href: '#/stats', a: 'askRegen' }], chips: ['Co mam dziś?', 'Czy mogę dziś trenować nogi?'] };
  };

  H.next = c => {
    const q = F.calQueue ? F.calQueue(21) : []; const nx = F.nextWorkout && F.nextWorkout();
    if (!nx) return { html: '<p>Nie masz planu treningowego. Ułóż go w kreatorze albo wybierz gotowy.</p>', acts: [{ l: 'Kreator planu', i: 'sparkles', href: '#/wizard' }, { l: 'Plany', i: 'clipboard-list', href: '#/plans' }] };
    const tk = F.dayKey(Date.now()), tm = /\bjutro\b/.test(N(c.q)); let q0 = q[0];
    if (tm) { q0 = q.find(x => x.key === F.dayKey(Date.now() + DAY)); if (!q0) { const nn = q.find(x => x.key > F.dayKey(Date.now() + DAY)); return { html: `<p>Jutro masz dzień wolny od treningu.${nn ? ` Następny: <b>${E(nn.day.name)}</b>, ${dd(nn.ts)}.` : ''}</p>`, chips: ['Czy mogę dziś trenować nogi?', 'Ile treningów w tym tygodniu?'] }; } }
    const day = q0 ? q0.day : nx.day; const when = q0 ? (q0.key === tk ? 'dziś' : q0.key === F.dayKey(Date.now() + DAY) ? 'jutro' : `${WD[new Date(q0.ts).getDay()]}, ${dd(q0.ts)}`) : 'najbliższy';
    const est = F.PLN && F.PLN.estMin ? F.PLN.estMin(day.items) : 0;
    return { html: `<p>${when === 'dziś' ? 'Dziś' : when === 'jutro' ? 'Jutro' : 'Następny trening'}: <b>${E(day.name)}</b>${when !== 'dziś' && when !== 'jutro' && q0 ? ` — ${when}` : ''}${est ? `, ok. ${est} min` : ''}.</p>${rows(day.items.slice(0, 9).map(i => { const ex = F.S.ex.get(i.exId); return { i: F.mDot(ex && ex.muscle), l: E(ex ? ex.name : i.exId), v: i.cardio ? F.fmtDur(+i.reps || 0) : `${i.sets}×${i.reps}` }; }))}`, acts: [{ l: 'Zacznij trening', i: 'play', a: 'startDay', d: { p: nx.plan.id, d: day.id } }, { l: 'Kalendarz', i: 'calendar', href: '#/calendar' }], chips: ['Jakie mam ciężary na dziś?', 'Czy mogę dziś trenować nogi?', 'Kiedy ostatnio trenowałem?'] };
  };

  H.muscleSets = c => {
    if (!S().length) return noData(); const ms = c.mus || (c.ex ? [c.ex.muscle] : null); const t = c.time && c.time.kind === 'range' ? c.time : { from: F.startOfWeek(Date.now()), to: Date.now() + 1, label: 'w tym tygodniu' };
    const list = (ms || F.BODY_ORDER).map(m => ({ m, v: weekSets(m, t.from, t.to), r: volRange(m) }));
    const wk = Math.max(1, (t.to - t.from) / WK);
    if (!ms && !list.some(x => x.v.all > 0)) return { html: `<p>${cap(t.label)} nie ma jeszcze serii. Ostatni trening: ${dd(S()[0].start)}.</p>`, chips: ['Ile serii w zeszłym tygodniu?', 'Co zaniedbuję?'] };
    return { html: `<p>Serie ${t.label} (bezpośrednie + połowa pośrednich z ćwiczeń wielostawowych)${wk > 1.5 ? ', średnio na tydzień' : ''}:</p>${rows(list.filter(x => ms || x.v.all > 0).map(x => ({ i: F.mDot(x.m), l: cap(mName(x.m)), v: `${F.fmtNum(x.v.all / (wk > 1.5 ? wk : 1), 1)} <small>/ ${x.r[0]}–${x.r[1]}</small>` })))}<p class="ak-s">Obok zalecany zakres tygodniowy dla Twojego celu i poziomu.</p>`, chips: ['Co zaniedbuję?', 'Ile serii robić tygodniowo?'] };
  };

  H.neglect = c => {
    if (!S().length) return noData(); const now = Date.now(); const list = F.BODY_ORDER.map(m => ({ m, v: weekSets(m, now - 28 * DAY, now + 1).all / 4, r: volRange(m) })).filter(x => x.r[1] > 0);
    const low = list.filter(x => x.v < x.r[0]).sort((a, b) => a.v / a.r[0] - b.v / b.r[0]), high = list.filter(x => x.v > x.r[1] * 1.25);
    return { html: `<p>Średnio z ostatnich 4 tygodni, względem zaleceń dla Twojego celu:</p>${low.length ? `<p><b>Za mało:</b></p>${rows(low.slice(0, 6).map(x => ({ i: F.mDot(x.m), l: cap(mName(x.m)), v: `${F.fmtNum(x.v, 1)} <small>/ min. ${x.r[0]}</small>` })))}` : '<p>Żadna partia nie jest zaniedbana.</p>'}${high.length ? `<p><b>Dużo powyżej zakresu:</b> ${high.map(x => mName(x.m)).join(', ')}. Więcej nie zawsze znaczy lepiej — nadmiar utrudnia regenerację.</p>` : ''}`, chips: low.length ? [`Ćwiczenia na ${ACC[low[0].m]}`, 'Ile serii robić tygodniowo?'] : ['Jak mi poszedł ten miesiąc?'] };
  };

  H.count = c => {
    if (!S().length) return noData(); const t = c.time && c.time.kind === 'range' ? c.time : { from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(), to: Date.now() + 1, label: 'w tym miesiącu' };
    const list = S().filter(s => inRange(t, s)); const wk = Math.max(1, (Math.min(t.to, Date.now()) - Math.max(t.from, S()[S().length - 1].start)) / WK);
    if (c.ex) { const n = list.filter(s => s.exercises.some(e => e.exId === c.ex.id)).length; return { html: `<p>${cap(t.label)}: <b>${E(c.ex.name)}</b> — <b>${n}</b> ${F.plur(n, 'trening', 'treningi', 'treningów')}.</p>`, chips: [`Postęp — ${c.ex.name}`] }; }
    const goal = F.S.settings.weeklyGoal || 3;
    return { html: `<p>${cap(t.label)}: <b>${list.length}</b> ${F.plur(list.length, 'trening', 'treningi', 'treningów')}${wk >= 1.5 ? `, średnio ${F.fmtNum(list.length / wk, 1)} na tydzień (Twój cel: ${goal})` : ''}.</p>${tiles([{ l: 'Tonaż', v: F.fmtVol(list.reduce((a, s) => a + F.sessionVolume(s), 0)) }, { l: 'Serie', v: list.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.filter(isWork).length, 0), 0) }, { l: 'Czas', v: F.fmtDurHuman(list.reduce((a, s) => a + (s.dur || 0), 0)) }])}`, acts: [{ l: 'Historia', i: 'history', href: '#/history' }], chips: ['Jak mi poszedł ten miesiąc?', 'Ile tygodni z rzędu trenuję?'] };
  };

  H.volume = c => { if (!S().length) return noData(); const t = c.time && c.time.kind === 'range' ? c.time : { from: F.startOfWeek(Date.now()), to: Date.now() + 1, label: 'w tym tygodniu' }; const list = S().filter(s => inRange(t, s)); const v = list.reduce((a, s) => a + F.sessionVolume(s), 0);
    const b = []; for (let i = 7; i >= 0; i--) { const a = F.startOfWeek(Date.now()) - i * WK; const vv = S().filter(s => s.start >= a && s.start < a + WK).reduce((x, s) => x + F.sessionVolume(s), 0); b.push({ label: `${new Date(a).getDate()}.${new Date(a).getMonth() + 1}`, value: F.toDisp(vv), tip: F.fmtVol(vv), hl: i === 0 }); }
    return { html: `<p>${list.length ? `${cap(t.label)} podniosłeś łącznie <b>${F.fmtVol(v)}</b> w ${list.length} ${F.plur(list.length, 'treningu', 'treningach', 'treningach')}.` : `${cap(t.label)} jeszcze nie trenowałeś.`}</p><div class="ak-chart">${F.chart.bars(b, { w: 320, h: 130, labelEvery: 2 })}</div><p class="ak-s">Tonaż tygodniowy z 8 ostatnich tygodni.</p>`, chips: ['Jak mi poszedł ten miesiąc?', 'Ile treningów w tym miesiącu?'] }; };

  H.summary = c => {
    if (!S().length) return noData(); const n = N(c.q); const t = c.time && c.time.kind === 'range' ? c.time : /miesi/.test(n) ? { from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(), to: Date.now() + 1, label: 'w tym miesiącu' } : /\brok/.test(n) ? { from: new Date(new Date().getFullYear(), 0, 1).getTime(), to: Date.now() + 1, label: 'w tym roku' } : { from: F.startOfWeek(Date.now()), to: Date.now() + 1, label: 'w tym tygodniu' };
    let o = F.reportPeriodStats(t.from, t.to); if (!o.n && !c.time && t.label === 'w tym tygodniu') { t.from = Date.now() - 30 * DAY; t.to = Date.now() + 1; t.label = 'z ostatnich 30 dni'; o = F.reportPeriodStats(t.from, t.to); } const len = t.to - t.from, p = F.reportPeriodStats(t.from - len, t.from);
    const topEx = {}; S().filter(s => inRange(t, s)).forEach(s => s.exercises.forEach(e => { topEx[e.exId] = (topEx[e.exId] || 0) + e.sets.filter(isWork).length; })); const te = Object.keys(topEx).sort((a, b) => topEx[b] - topEx[a])[0];
    return { html: `<p>Podsumowanie ${t.label}:</p>${tiles([{ l: 'Treningi', v: o.n, s: p.n ? `wcześniej ${p.n}` : '' }, { l: 'Tonaż', v: F.fmtVol(o.vol), s: p.vol ? `${sgn((o.vol - p.vol) / p.vol * 100, 0)}%` : '' }, { l: 'Rekordy', v: o.pr, hot: o.pr > 0 }])}${te ? `<p>Najwięcej serii: <b>${E(F.exName(te))}</b> (${topEx[te]}).</p>` : ''}`, acts: [{ l: 'Pełny raport', i: 'file-text', href: '#/report' }], chips: ['Ostatnie rekordy', 'Co zaniedbuję?', 'Co stoi w miejscu?'] };
  };

  H.bw = c => {
    const B = F.S.bw; if (!B.length) return { html: '<p>Nie masz jeszcze zapisanej wagi ciała. Dodasz ją w Postępy → Ciało.</p>', acts: [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }] };
    const last = B[B.length - 1], at = ts => { let v = null; B.forEach(b => { if (b.date <= ts) v = b; }); return v; }; const m1 = at(Date.now() - 30 * DAY), m3 = at(Date.now() - 91 * DAY);
    if (c.time) { const ts = c.time.kind === 'point' ? c.time.at : c.time.to - 1; const b0 = at(ts); if (!b0) return { html: `<p>Nie mam pomiaru wagi z okresu „${c.time.label}”. Pierwszy pomiar: ${dd(B[0].date)}.</p>` };
      return { html: `<p>${c.time.kind === 'point' ? `Najbliższy pomiar sprzed daty „${c.time.label}”` : cap(c.time.label)}: <b>${kg(b0.kg)}</b> (${dd(b0.date)}). Teraz: <b>${kg(last.kg)}</b>, zmiana ${delta(F.toDisp(last.kg - b0.kg), ' ' + F.unit())}.</p>`, acts: [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }], chips: ['Ile ważę?', 'Ile kalorii potrzebuję?'] }; }
    const pts = B.filter(b => b.date >= Date.now() - 182 * DAY).map(b => ({ x: b.date, y: F.toDisp(b.kg), tip: `${dd(b.date)}: ${kg(b.kg)}` }));
    return { html: `${tiles([{ l: 'Teraz · ' + dd(last.date), v: kg(last.kg), hot: 1 }, m1 ? { l: '30 dni', v: `${sgn(F.toDisp(last.kg - m1.kg))} ${F.unit()}` } : null, m3 ? { l: '3 miesiące', v: `${sgn(F.toDisp(last.kg - m3.kg))} ${F.unit()}` } : null].filter(Boolean))}${spark(pts)}`, acts: [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }], chips: ['Ile kalorii potrzebuję?', 'Ile białka jeść?'] };
  };

  H.kcal = c => {
    const np = F.nutPlan ? F.nutPlan() : { missing: true };
    if (np.block) return { html: `<p>${E(np.block)}</p>` };
    if (np.missing) return { html: '<p>Do wyliczenia zapotrzebowania potrzebuję płci, wieku, wzrostu, wagi i poziomu aktywności. Uzupełnij je w Ustawieniach → Profil.</p>', acts: [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }], chips: ['Ile białka jeść?', 'Ile ważę?'] };
    const MODE = { cut: 'Redukcja', bulk: 'Budowa masy', keep: 'Utrzymanie' };
    return { html: `${tiles([{ l: 'Zapotrzebowanie', v: `${F.fmtNum(np.tdee, 0)} kcal`, s: `w tym treningi ${F.fmtNum(np.train, 0)} kcal/dzień` }, { l: 'Cel · ' + MODE[np.mode], v: `${F.fmtNum(np.k, 0)} kcal`, hot: 1 }])}${rows([{ l: 'Białko', v: `${np.prot} g` }, { l: 'Tłuszcze', v: `${np.fat} g` }, { l: 'Węglowodany', v: `${np.carb} g` }])}<p>${E(np.note)}</p><p class="ak-s">Zapotrzebowanie wyliczone wzorem Mifflina–St Jeora z poziomem aktywności i spalaniem z Twoich treningów z 4 tygodni.</p>`, acts: [{ l: 'Żywienie', i: 'flame', href: '#/nutrition' }], chips: ['Ile białka jeść?', 'Ile ważę?', 'Jak schudnąć?'] };
  };

  H.goals = c => { const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`; const list = (F.S.settings.goals || []).filter(g => g.m === ym);
    if (!list.length) return { html: '<p>Nie masz celów na ten miesiąc. Dodasz je w Postępy → Przegląd: liczba treningów, tonaż albo ciężar w ćwiczeniu.</p>', acts: [{ l: 'Dodaj cel', i: 'target', href: '#/stats', a: 'askOver' }], chips: ['Ile treningów w tym miesiącu?', 'Ile tygodni z rzędu trenuję?'] };
    return { html: `<p>Cele na ${MON[new Date().getMonth()]}:</p>${list.map(g => { const p = F.goalProg(g); return `<div class="ak-goal"><div><b>${E(p.t)}</b><span>${E(p.s)}</span></div><i class="bar"><i style="width:${Math.min(100, p.p * 100).toFixed(0)}%"></i></i></div>`; }).join('')}`, chips: ['Ile treningów w tym miesiącu?', 'Jak mi poszedł ten miesiąc?'] }; };

  H.rank = c => { const rk = F.rank(); return { html: `<div class="ak-rank">${F.rankImg(rk.i, 56)}<div><b>${E(rk.name)}</b><span>${F.fmtNum(rk.xp, 0)} XP${rk.next ? ` · do rangi „${E(rk.next)}” brakuje ${F.fmtNum(rk.toNext, 0)} XP` : ' · najwyższa ranga'}</span></div></div>${rk.next ? `<i class="bar ak-rbar"><i style="width:${Math.min(100, rk.pct * 100).toFixed(0)}%"></i></i>` : ''}<p>XP dostajesz za każdy trening, serie i rekordy.</p>`, acts: [{ l: 'Osiągnięcia', i: 'trophy', href: '#/stats', a: 'askOver' }], chips: ['Ile tygodni z rzędu trenuję?', 'Ostatnie rekordy'] }; };

  H.streak = c => { if (!S().length) return noData(); const goal = F.S.settings.weeklyGoal || 3; const st = F.weekStreak(); const cn = F.weekCounts(1)[0].count;
    return { html: `<p>${st ? `<b>${st}</b> ${F.plur(st, 'tydzień', 'tygodnie', 'tygodni')} z rzędu z celem ${goal} ${F.plur(goal, 'trening', 'treningi', 'treningów')} w tygodniu.` : 'W zeszłym tygodniu cel tygodniowy nie został osiągnięty, więc seria zaczyna się od nowa.'} W tym tygodniu: <b>${cn}</b> z ${goal}.</p>`, chips: ['Co mam dziś?', 'Ile treningów w tym miesiącu?'] }; };

  H.sub = c => {
    if (!c.ex) return needEx(c, 'sub', 'Do którego ćwiczenia szukasz zamiennika?'); const eq = findEq(c.n, c.ex); let list = F.similarEx(c.ex.id, [], eq ? 60 : 8);
    if (eq) list = list.filter(e => eq.includes(e.equip)).slice(0, 8);
    if (!list.length) return { html: `<p>Nie znalazłem podobnych ćwiczeń dla <b>${E(c.ex.name)}</b>${eq ? ` ze sprzętem: ${eq.join(', ').toLowerCase()}` : ''}.</p>`, chips: eq ? [`Zamiennik — ${c.ex.name}`] : [] };
    return { html: `<p>Zamiast <b>${E(c.ex.name)}</b> — ta sama partia (${mName(c.ex.muscle)})${eq ? `, sprzęt: ${eq.join(', ').toLowerCase()}` : ''}, od najbardziej podobnych:</p><div class="ak-exl">${list.map(e => `<a class="ak-ex" href="#/ex/${encodeURIComponent(e.id)}">${F.mDot(e.muscle)}<span><b>${E(e.name)}</b><small>${E(e.equip)}</small></span>${ic('chevron-right', 16)}</a>`).join('')}</div><p class="ak-s">W planie zamienisz ćwiczenie, stukając w jego nazwę w edytorze planu.</p>`, chips: [`Technika — ${list[0].name}`, eq ? `Zamiennik — ${c.ex.name}` : `${c.ex.name} — zamiennik bez sprzętu`, `Mięśnie — ${c.ex.name}`] };
  };

  H.tech = c => {
    if (!c.ex) return needEx(c, 'tech', 'Technikę którego ćwiczenia pokazać?'); const i = F.EXINFO && F.EXINFO[c.ex.id]; const tips = i && i.t && i.t.length ? i.t : null;
    return { html: tips ? `<p>Technika — <b>${E(c.ex.name)}</b>:</p><ol class="ak-ol">${tips.map(t => `<li>${E(t)}</li>`).join('')}</ol>` : `<p>Dla <b>${E(c.ex.name)}</b> nie mam opisu techniki, ale mam zdjęcia i pracujące mięśnie.</p>`, acts: [{ l: 'Zdjęcia i mięśnie', i: 'info', a: 'techOpen', d: { id: c.ex.id } }], chips: [`Zamiennik — ${c.ex.name}`, `Mięśnie — ${c.ex.name}`] };
  };

  H.musWork = c => { if (!c.ex) return needEx(c, 'musWork', 'Dla którego ćwiczenia pokazać mięśnie?'); const m = F.exMuscles(c.ex.id);
    const colors = {}; m.s.forEach(x => { if (F.BODY_ORDER.includes(x)) colors[x] = 'a2'; }); m.p.forEach(x => { if (F.BODY_ORDER.includes(x)) colors[x] = 'a1'; });
    return { html: `<p><b>${E(c.ex.name)}</b> — główne: <b>${m.p.map(mName).join(', ') || '–'}</b>${m.s.length ? `; pomocnicze: ${m.s.map(mName).join(', ')}` : ''}.</p><div class="ak-body">${F.bodyCv('f', colors, { dim: .75 })}${F.bodyCv('b', colors, { dim: .75 })}</div>`, chips: [`Technika — ${c.ex.name}`, `Zamiennik — ${c.ex.name}`] }; };

  H.exFor = c => { const ms = c.mus; if (!ms) return { html: '<p>Na jaką partię? Np. „ćwiczenia na plecy”.</p>', chips: ['Ćwiczenia na klatkę', 'Ćwiczenia na pośladki', 'Ćwiczenia na barki'] };
    const eq = findEq(c.n); const okEq = e => !eq || eq.includes(e.equip);
    const out = ms.slice(0, 4).map(m => { const used = topUsed(3, e => e.muscle === m && okEq(e)).map(e => e.id); const core = [...F.S.ex.values()].filter(e => e.muscle === m && okEq(e) && !e.id.startsWith('fe_') && e.type !== 'time').sort((a, b) => (b.compound ? 1 : 0) - (a.compound ? 1 : 0)).map(e => e.id); const ids = [...new Set([...used, ...core])].slice(0, ms.length > 2 ? 4 : 6); return { m, ids }; });
    return { html: (eq ? `<p class="ak-s">Sprzęt: ${eq.join(', ').toLowerCase()}.</p>` : '') + out.map(o => !o.ids.length ? `<p>${cap(mName(o.m))}: brak ćwiczeń z tym sprzętem w bazie.</p>` : `<p>${cap(mName(o.m))}:</p><div class="ak-exl">${o.ids.map(id => { const e = F.S.ex.get(id); return `<a class="ak-ex" href="#/ex/${encodeURIComponent(id)}">${F.mDot(e.muscle)}<span><b>${E(e.name)}</b><small>${E(e.equip)}${e.compound ? ' · wielostawowe' : ''}</small></span>${ic('chevron-right', 16)}</a>`; }).join('')}</div>`).join(''), chips: [eq ? `Ćwiczenia na ${mAcc(ms)}` : `Ćwiczenia na ${mAcc(ms)} bez sprzętu`, `Ile serii na ${mAcc(ms)} w tym tygodniu?`, `Czy mogę dziś trenować ${mAcc(ms)}?`] }; };


  // ---- porównanie ćwiczeń ----
  H.compare = c => {
    const list = findExAll(c.q).slice(0, 3); if (list.length < 2) return list.length ? H.progress({ ...c, ex: list[0] }) : { html: '<p>Podaj dwa ćwiczenia, np. „porównaj przysiad i martwy ciąg”.</p>', chips: ['Porównaj przysiad i martwy ciąg', 'Porównaj wyciskanie leżąc i OHP'] };
    const rowsH = list.map(ex => { const h = hist(ex.id); const b = F.bestE1(ex.id); const r = h.filter(x => x.ts >= Date.now() - 91 * DAY); const d = r.length >= 2 ? r[r.length - 1].e1 - r[0].e1 : null;
      return `<div class="ak-cmp"><div class="ak-cmp-h">${F.mDot(ex.muscle)}<b>${E(ex.name)}</b></div>${tiles([{ l: 'Wyliczony maks', v: b ? kg(b) : '–', hot: 1 }, { l: 'Treningi', v: h.length }, { l: '3 miesiące', v: d == null ? '–' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${F.fmtNum(F.toDisp(Math.abs(d)), 1)} ${F.unit()}` }])}</div>`; }).join('');
    const [a, b] = list.map(e => F.bestE1(e.id)); const ratio = a && b ? `<p>${E(list[1].name)} to <b>${F.fmtNum(b / a * 100, 0)}%</b> wyliczonego maksa z ćwiczenia ${E(list[0].name)}.</p>` : '';
    return { html: `<p>Porównanie:</p>${rowsH}${ratio}`, chips: list.map(e => `Postęp — ${e.name}`).slice(0, 2).concat(['Co stoi w miejscu?']) };
  };

  // ---- plan i rozkład ----
  H.plan = c => {
    const p = planNow(); if (!p) return { html: '<p>Nie masz jeszcze planu. Ułożysz go w kreatorze w kilka minut.</p>', acts: [{ l: 'Kreator planu', i: 'sparkles', href: '#/wizard' }] };
    const g = p.meta && p.meta.goal ? (F.PLN.GOALS[p.meta.goal] || [p.meta.goal])[0] : '';
    const wd = p.meta && p.meta.weekdays ? p.meta.weekdays.map(d => WD[(d + 1) % 7]).join(', ') : '';
    return { html: `<p>Twój plan: <b>${E(p.name)}</b>${g ? ` — cel: ${E(g.toLowerCase())}` : ''}.${wd ? ` Dni treningowe: ${wd}.` : ''}</p>${rows(p.days.map(d => ({ l: E(d.name), v: `${d.items.length} ćw. · ok. ${F.PLN && F.PLN.estMin ? F.PLN.estMin(d.items) : '–'} min` })))}`, acts: [{ l: 'Otwórz plan', i: 'clipboard-list', href: '#/plan/' + p.id }, { l: 'Kalendarz', i: 'calendar', href: '#/calendar' }], chips: ['Kiedy trenuję w tym tygodniu?', 'Co mam dziś?', 'Ile mam przerwy?'] };
  };
  const WDS = ['niedziel', 'poniedzial', 'wtor', 'srod', 'czwart', 'piat', 'sobot'];
  H.week = c => {
    const q = F.calQueue ? F.calQueue(21) : []; if (!q.length) return H.plan(c);
    const n = c.n, wi = WDS.findIndex(w => new RegExp('\\b' + w).test(n));
    if (wi >= 0) { const hit = q.find(x => new Date(x.ts).getDay() === wi); if (!hit) { const days = [...new Set(q.slice(0, 7).map(x => new Date(x.ts).getDay()))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => WD[d]); return { html: `<p>W ${WDG[wi]} nie masz treningu. Trenujesz w: ${days.join(', ')}.</p>`, chips: ['Kiedy trenuję w tym tygodniu?', 'Jaki mam plan?'] }; }
      return { html: `<p>${cap(WDG[wi])}, ${dd(hit.ts)}: <b>${E(hit.day.name)}</b>.</p>${rows(hit.day.items.slice(0, 9).map(i => { const ex = F.S.ex.get(i.exId); return { i: F.mDot(ex && ex.muscle), l: E(ex ? ex.name : i.exId), v: `${i.sets}×${i.reps}` }; }))}`, acts: [{ l: 'Kalendarz', i: 'calendar', href: '#/calendar' }], chips: ['Kiedy trenuję w tym tygodniu?', 'Co mam dziś?'] }; }
    const end = /nastepn|przyszl/.test(n) ? F.startOfWeek(Date.now()) + 2 * WK : F.startOfWeek(Date.now()) + WK, from = /nastepn|przyszl/.test(n) ? F.startOfWeek(Date.now()) + WK : 0;
    const list = q.filter(x => x.ts < end && x.ts >= from); const tk = F.dayKey(Date.now());
    if (!list.length) { const nn = q.find(x => x.ts >= end); return { html: `<p>${from ? 'W przyszłym tygodniu' : 'Do końca tygodnia'} nie masz już treningów w planie.${nn ? ` Następny: <b>${E(nn.day.name)}</b> — ${WD[new Date(nn.ts).getDay()]}, ${dd(nn.ts)}.` : ''}</p>`, chips: ['Kiedy trenuję w przyszłym tygodniu?', 'Co mam dziś?'] }; }
    return { html: `<p>${from ? 'W przyszłym tygodniu' : 'Do końca tego tygodnia'}: ${list.length} ${F.plur(list.length, 'trening', 'treningi', 'treningów')}.</p>${rows(list.map(x => ({ l: `${cap(x.key === tk ? 'dziś' : WD[new Date(x.ts).getDay()])} <small>${dd(x.ts)}</small>`, v: E(x.day.name) })))}`, acts: [{ l: 'Kalendarz', i: 'calendar', href: '#/calendar' }], chips: [from ? 'Kiedy trenuję w tym tygodniu?' : 'Kiedy trenuję w przyszłym tygodniu?', 'Co mam dziś?'] };
  };

  // ---- odciążenie: czy już czas ----
  H.deloadQ = c => {
    if (F.deloadOn()) return { html: `<p>Masz włączony tydzień odciążenia do ${dd(F.S.settings.deloadUntil)}: połowa serii, ten sam ciężar, duży zapas powtórzeń.</p>`, chips: ['Co to jest odciążenie?'] };
    const adv = F.deloadAdvice(), st = F.stagnating(), last = F.S.settings.lastDeload;
    const html = adv ? `<p><b>Tak, warto.</b> ${E(adv.why)}.</p>${st.length ? rows(st.slice(0, 5).map(x => ({ i: F.mDot((F.S.ex.get(x.exId) || {}).muscle), l: E(F.exName(x.exId)), v: `${x.stuck} tr. bez poprawy` }))) : ''}<p>Tydzień odciążenia w FORGE: połowa serii, ten sam ciężar, duży zapas powtórzeń. Po tygodniu plan wraca do normy.</p>`
      : `<p><b>Na razie nie.</b> ${st.length ? `Tylko ${st.length} ćwiczenie wielostawowe stoi w miejscu` : 'Żadne ćwiczenie wielostawowe nie stoi w miejscu'}${last ? `, ostatnie odciążenie: ${dd(last)}` : ''}. FORGE podpowie odciążenie, gdy zastój obejmie co najmniej 2 ćwiczenia wielostawowe albo trenujesz regularnie 8 tygodni bez lżejszego tygodnia.</p>`;
    return { html: html + '<p class="ak-s">Odciążenie: Bell i in. (2023), konsensus 21 ekspertów.</p>', acts: adv ? [{ l: 'Włącz tydzień odciążenia', i: 'shield', a: 'askDeload' }] : [], chips: ['Co to jest odciążenie?', 'Co stoi w miejscu?'] };
  };

  // ---- czas treningu, staż, kalorie spalone, najlepszy trening ----
  H.duration = c => { if (!S().length) return noData(); const l = S().filter(s => s.dur > 0).slice(0, 10); if (!l.length) return { html: '<p>Twoje treningi nie mają zapisanego czasu.</p>' };
    const avg = l.reduce((a, s) => a + s.dur, 0) / l.length; const nx = F.nextWorkout && F.nextWorkout();
    return { html: `${tiles([{ l: 'Ostatni trening', v: F.fmtDurHuman(l[0].dur), s: dd(l[0].start) }, { l: `Średnio (${l.length} ost.)`, v: F.fmtDurHuman(avg), hot: 1 }])}${nx && F.PLN && F.PLN.estMin ? `<p>Najbliższy trening (${E(nx.day.name)}) według planu: ok. ${F.PLN.estMin(nx.day.items)} min.</p>` : ''}<p class="ak-s">Czas liczony od startu do zakończenia treningu w aplikacji.</p>`, chips: ['Ile treningów w tym miesiącu?', 'Ile mam przerwy?'] }; };
  H.since = c => { if (!S().length) return noData(); const t = F.totals(), first = S()[S().length - 1]; const fav = topUsed(3);
    return { html: `<p>Trenujesz z FORGE od <b>${dd(first.start)}</b> (${ago(first.start)}).</p>${tiles([{ l: 'Treningi', v: t.count, hot: 1 }, { l: 'Tonaż łącznie', v: F.fmtVol(t.vol) }, { l: 'Serie', v: F.fmtNum(t.sets, 0) }])}${rows([{ l: 'Czas pod sztangą', v: F.fmtDurHuman(t.dur) }, { l: 'Powtórzenia', v: F.fmtNum(t.reps, 0) }, { l: 'Rekordy', v: t.prs }])}${fav.length ? `<p>Najczęściej robisz: ${fav.map(e => `<b>${E(e.name)}</b>`).join(', ')}.</p>` : ''}`, acts: [{ l: 'Historia', i: 'history', href: '#/history' }], chips: ['Moje rekordy', 'Jaka jest moja ranga?', 'Jak mi idzie?'] }; };
  H.burn = c => { if (!S().length) return noData(); const t = c.time && c.time.kind === 'range' ? c.time : { from: F.startOfWeek(Date.now()), to: Date.now() + 1, label: 'w tym tygodniu' }; let list = S().filter(s => inRange(t, s));
    if (/ostatni|tym treningu|dzisiejsz/.test(c.n) && !c.time) { list = S().slice(0, 1); t.label = 'na ostatnim treningu'; }
    const k = list.reduce((a, s) => a + F.sessKcal(s).net, 0);
    return { html: `<p>${cap(t.label)}: ok. <b>${F.fmtNum(Math.round(k / 10) * 10, 0)} kcal</b> ponad spoczynek${list.length > 1 ? ` w ${list.length} treningach` : ''}.</p><p class="ak-s">Wyliczone tym samym sposobem co na ekranie Żywienie: z czasu treningu, masy ciała i wykonanej pracy.</p>`, acts: [{ l: 'Żywienie', i: 'flame', href: '#/nutrition' }], chips: ['Ile kalorii potrzebuję?', 'Ile białka jeść?'] }; };
  H.best = c => { if (!S().length) return noData(); const t = c.time && c.time.kind === 'range' ? c.time : { from: 0, to: Date.now() + 1, label: 'od początku' }; const list = S().filter(s => inRange(t, s)); if (!list.length) return { html: `<p>${cap(t.label)} nie było treningów.</p>` };
    const b = list.reduce((a, s) => F.sessionVolume(s) > F.sessionVolume(a) ? s : a, list[0]);
    return { html: `<p>Największy tonaż ${t.label}: <b>${E(b.name)}</b>, ${dd(b.start)}.</p>${tiles([{ l: 'Tonaż', v: F.fmtVol(F.sessionVolume(b)), hot: 1 }, { l: 'Serie', v: b.exercises.reduce((a, e) => a + e.sets.filter(isWork).length, 0) }, { l: 'Czas', v: b.dur ? F.fmtDurHuman(b.dur) : '–' }])}`, acts: [{ l: 'Otwórz trening', i: 'history', href: '#/session/' + b.id }], chips: ['Moje rekordy', 'Podsumuj ten miesiąc'] }; };


  // ---- jak rozbudować partię ----
  H.grow = c => { const ms = c.mus; if (!ms) return H.exFor(c); const a = H.exFor(c); const now = Date.now();
    const st = ms.slice(0, 3).map(m => { const v = weekSets(m, now - 28 * DAY, now + 1).all / 4, r = volRange(m); return { m, v, r }; });
    const f = F.KB.facts.volume;
    return { html: `<p>Na ${mAcc(ms)} liczą się dwie rzeczy: wystarczająca liczba serii w tygodniu i systematyczny wzrost ciężaru lub powtórzeń.</p>${S().length ? rows(st.map(x => ({ i: F.mDot(x.m), l: `${cap(mName(x.m))} <small>${x.v < x.r[0] ? 'za mało' : x.v > x.r[1] ? 'powyżej zakresu' : 'w zakresie'}</small>`, v: `${F.fmtNum(x.v, 1)} <small>/ ${x.r[0]}–${x.r[1]}</small>` }))) + '<p class="ak-s">Twoje serie tygodniowo (średnio z 4 tygodni) i zalecany zakres dla Twojego celu.</p>' : ''}${a.html}<p class="ak-src">${ic('book-open', 14)} ${E(f.pl.split('.')[0])}.</p>`, chips: [`Ile serii na ${mAcc(ms)} w tym tygodniu?`, 'Ile białka jeść?', 'Co stoi w miejscu?'] }; };

  // ---- profil, data, mało czasu, zmęczenie, potwierdzenia ----
  H.profile = c => { const p = F.profile(); const r = [p.sexKnown ? { l: 'Płeć', v: p.sex === 'f' ? 'kobieta' : 'mężczyzna' } : null, p.ageKnown ? { l: 'Wiek', v: `${p.age} lat` } : null, p.heightKnown ? { l: 'Wzrost', v: `${p.height} cm` } : null, p.bwKnown ? { l: 'Waga', v: kg(p.bw) } : null].filter(Boolean);
    return { html: r.length ? `<p>Dane z Twojego profilu:</p>${rows(r)}` : '<p>Profil jest pusty. Uzupełnij go w Ustawieniach — wtedy policzę kalorie i białko.</p>', acts: [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }], chips: ['Ile kalorii potrzebuję?', 'Ile ważę?'] }; };
  H.today = c => { const d = new Date(); return { html: `<p>Dziś jest ${WD[d.getDay()]}, ${d.getDate()} ${MONG[d.getMonth()]} ${d.getFullYear()}.</p>`, chips: ['Co mam dziś?', 'Kiedy trenuję w tym tygodniu?'] }; };
  H.short = c => { const nx = F.nextWorkout && F.nextWorkout(); if (!nx) return H.next(c);
    const m = c.n.match(/(\d+)\s*min/); const lim = m ? +m[1] : 0; const items = nx.day.items.filter(i => !i.cardio); const main = items.filter(i => (F.S.ex.get(i.exId) || {}).compound);
    const est = F.PLN && F.PLN.estMin ? F.PLN.estMin(main) : 0, full = F.PLN && F.PLN.estMin ? F.PLN.estMin(items) : 0;
    return { html: `<p>Najbliższy trening <b>${E(nx.day.name)}</b> to ok. ${full} min. Przy mniejszej ilości czasu zrób najpierw ćwiczenia wielostawowe — ACSM (2009) zaleca kolejność: duże partie i ćwiczenia wielostawowe przed izolowanymi.</p>${rows(main.map(i => { const ex = F.S.ex.get(i.exId); return { i: F.mDot(ex.muscle), l: E(ex.name), v: `${i.sets}×${i.reps}` }; }))}<p>Same ćwiczenia wielostawowe: ok. <b>${est} min</b>${lim ? (est <= lim ? ` — zmieścisz się w ${lim} min.` : ` — więcej niż ${lim} min, więc zrób po jednej serii mniej w każdym.`) : '.'}</p>`, acts: [{ l: 'Zacznij trening', i: 'play', a: 'startDay', d: { p: nx.plan.id, d: nx.day.id } }], chips: ['Ile mam przerwy?', 'Jakie mam ciężary na dziś?'] }; };
  H.tired = c => { const a = S().length ? H.recovery({ ...c, mus: null, ex: null }) : null;
    return { html: `<p>Twoje samopoczucie, sen i stres nie są w danych, więc tego nie ocenię. Z treningów widzę stan mięśni:</p>${a ? a.html : '<p>Brak treningów do oceny.</p>'}<p>Przy słabszym dniu możesz zrobić trening z większym zapasem powtórzeń. Gdy zmęczenie trwa dłużej, a wyniki stoją, rozważ tydzień odciążenia.</p>`, chips: ['Czy potrzebuję odciążenia?', 'Ile spać?', 'Mam mało czasu dziś'] }; };
  H.ack = c => ({ html: '<p>Jasne. W czym jeszcze mogę pomóc?</p>', chips: startChips() });

  // ---- wiedza (kompendium) ----
  const KN = [
    [/(jesc|jedz|diet).*(redukc|deficyt|odchudz)|(redukc|deficyt|odchudz).*(jesc|jedz|diet)/, 'cut', 'protein'],
    [/bialk|protein/, 'protein', 'protein'], [/\brir\b|zapas powt|do upadku|upadek|upadku/, 'failure', 'reps'], [/odciaz|deload/, 'deload', 'volume'], [/\bsen\b|snu|spac|spanie|wyspa/, 'sleep', 'recovery'],
    [/zakwas|doms|bol miesni po/, 'doms', 'pain'], [/ile serii|objetosc|serii tygodniowo|\bserii\b.*(robic|tygodn)|(robic|trzeba|powinien\w*) .*\bserii\b/, 'volume', 'volume'], [/jak czesto|czestotliw|ile razy w tygodniu/, 'freq', 'volume'], [/cardio|bieg|rower|aerob/, 'concurrent', 'cardio'],
    [/piramid/, 'pyramid', 'pyramid'], [/redukc|rzezb|spalic|spalanie|schudnac|odchudz|tluszcz/, 'cutTrain', 'myths'], [/podzial|split|fbw|full body|gora dol|push pull/, 'split', 'splits'],
    [/kolejnosc/, 'order', 'progress'], [/progresj|kiedy (dolozyc|zwiekszyc)|zwiekszac ciezar|zwiekszyc ciezar|dokladac ciezar/, 'progression', 'progress'], [/powtorzen|zakres powt|ile powt|ciezar a powt|ciezko czy lekko/, 'reps', 'reps'],
    [/kontuzj|urazom|zapobieg/, 'injury', 'technique'], [/tetno|hr max|maksymaln\w* tetn/, 'hrmax', 'cardio'], [/zdrowi|who|zalecenia/, 'who', 'start'], [/przerw/, 'restGoal', 'rest'], [/zakres ruchu|maszyn\w* czy wolne|wolne ciezary/, 'rom', 'progress'],
    [/metabolizm|bmr|przemian/, 'bmr', 'protein'], [/kreatyn/, null, null]
  ];
  H.know = c => {
    const n = N(c.q); let k = c.key ? [null, c.key, 'progress'] : KN.find(([re]) => re.test(n));
    if (k && k[1] === null) return { html: '<p>Na temat suplementów nie mam zweryfikowanej wiedzy w bazie, więc nie odpowiem. W kompendium są tylko treści sprawdzone w badaniach.</p>', chips: ['Ile białka jeść?'] };
    if (c.key === 'warmup') return { html: '<p>Rozgrzewka w FORGE to kilka serii tego samego ćwiczenia z rosnącym ciężarem: sam gryf, potem 40, 60, 75 i 90% ciężaru roboczego, z coraz mniejszą liczbą powtórzeń. Dodasz je jednym stuknięciem w menu ćwiczenia podczas treningu. Podaj ciężar, a rozpiszę serie.</p>', chips: ['Rozgrzewka do 100 kg', 'Jak długie przerwy robić?'] };
    const f = k && F.KB.facts[k[1]]; if (!f) return null;
    let mine = ''; const kex = c.ex || findEx(c.q), kms = findMus(c.q);
    if (k[1] === 'reps' && kex) { const pi = planItem(kex.id); if (pi) mine = `<p><b>W Twoim planie:</b> ${E(kex.name)} — ${pi.it.sets} × ${E(String(pi.it.reps))}.</p>`; }
    if (k[1] === 'volume' && kms) { const now = Date.now(); mine = `<p><b>U Ciebie:</b> ${kms.map(m => `${mName(m)} — ${F.fmtNum(weekSets(m, now - 28 * DAY, now + 1).all / 4, 1)} tygodniowo (zalecam ${volRange(m).join('–')})`).join(', ')}; średnio z 4 tygodni, serie bezpośrednie + połowa pośrednich.</p>`; }
    if (k[1] === 'protein' && F.nutPlan) { const np = F.nutPlan(); if (np && !np.missing && !np.block) mine = `<p><b>Dla Ciebie:</b> ${np.pLo}–${np.pHi} g białka dziennie (od ${np.refMass} kg masy ciała), w Twoim planie żywienia ${np.prot} g.</p>`; }
    const srcs = (f.src || []).map(s => F.KB.src[s]).filter(Boolean).map(s => { let a = s.a.replace(/\s*\(.*\)\s*$/, ''); if (a.includes(',')) a = a.split(',')[0].replace(/ [A-Z]{1,3}$/, '') + ' i in.'; return `${a}, ${s.y}`; });
    return { html: `${mine}<p>${E(f.pl)}</p>${srcs.length ? `<p class="ak-src">${ic('book-open', 14)} ${srcs.join(' · ')}</p>` : ''}`, acts: k[2] ? [{ l: 'Czytaj w poradach', i: 'book-open', href: '#/guide/' + k[2] }] : [], chips: KN_CH[k[1]] || ['Ile białka jeść?', 'Jak długie przerwy robić?', 'Co to jest odciążenie?'] };
  };
  const KN_CH = { protein: ['Ile kalorii potrzebuję?', 'Co jeść na redukcji?'], failure: ['Ile serii robić tygodniowo?', 'Ile powtórzeń robić?'], deload: ['Co stoi w miejscu?', 'Ile serii robić tygodniowo?'], volume: ['Co zaniedbuję?', 'Jak często trenować partię?'], restGoal: ['Ile mam przerwy?', 'Co to jest RIR?'], cutTrain: ['Ile kalorii potrzebuję?', 'Ile białka jeść?'] };

  // ---- pomoc do aplikacji ----
  const HOW = [
    [/(dodac|ulozyc|stworzyc|zrobic|nowy) plan|kreator/, 'Plan ułożysz w <b>Plany → Kreator planu</b> (pytania o cel, sprzęt i czas) albo dodasz własny: <b>Plany → Nowy plan</b>.', [{ l: 'Kreator planu', i: 'sparkles', href: '#/wizard' }, { l: 'Plany', i: 'clipboard-list', href: '#/plans' }]],
    [/zmienic przerw|ustawic przerw|dlugosc przerw/, 'Przerwę przy ćwiczeniu zmienisz w edytorze planu (pole „Przerwa s”). Domyślną przerwę ustawisz w <b>Ustawienia → Trening</b>. W trakcie treningu stoper ma przyciski −15 / +15 s.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/kopi\w* zapasow|backup|przywroc|eksport/, 'Kopię zapasową zrobisz w <b>Ustawienia → Dane → Kopia zapasowa</b>. Zapisz plik w bezpiecznym miejscu, np. w chmurze — przywrócisz go tam samo.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/import|wczytac plan|pdf|zrzut/, 'Plan z PDF-a, zdjęcia albo zrzutu ekranu wczytasz w <b>Plany → Import</b>. Historię przeniesiesz ze Strong, Hevy i FitNotes w tym samym miejscu.', [{ l: 'Import', i: 'download', href: '#/import' }]],
    [/powiadomien|serwer/, 'Powiadomienia o końcu przerwy przy zablokowanym telefonie włączysz w <b>Ustawienia → Powiadomienia z serwera</b> (adres i kod połączenia).', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/zainstal|ekran (glowny|poczatkowy)/, 'iPhone: Safari → Udostępnij → „Do ekranu początkowego”. Android: Chrome → ⋮ → „Zainstaluj aplikację”. Potem otwieraj FORGE z ikony.', []],
    [/(dodac|nowe|wlasne) cwiczeni/, 'Własne ćwiczenie dodasz w <b>Plany → Ćwiczenia</b> albo w oknie wyboru ćwiczenia przyciskiem „Nowe”.', [{ l: 'Ćwiczenia', i: 'dumbbell', href: '#/exercises' }]],
    [/przeniesc trening|przesunac trening|pominac trening|kalendarz/, 'W <b>Kalendarzu</b> stuknij dzień z treningiem: możesz go przenieść, przesunąć cały plan o dzień albo pominąć. Stuknięcie w wolny dzień pozwala przenieść tam najbliższy trening.', [{ l: 'Kalendarz', i: 'calendar', href: '#/calendar' }]],
    [/jednostk|funty|\blb\b/, 'Kilogramy albo funty przełączysz w <b>Ustawienia → Trening → Jednostki</b>.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/kolor|motyw|wyglad/, 'Kolor aplikacji zmienisz w <b>Ustawienia → Wygląd</b>.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/pomiar|obwod|zdjeci\w* sylwet|wage|wagi ciala/, 'Wagę, obwody i zdjęcia sylwetki dodasz w <b>Postępy → Ciało</b>.', [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }]],
    [/superseri/, 'Superserię zrobisz w edytorze planu: ikona łańcucha łączy ćwiczenie z następnym. W treningu oba ćwiczenia są na jednej karcie.', [{ l: 'Plany', i: 'clipboard-list', href: '#/plans' }]],
    [/progresj\w* dziala|skad ciezar|automatyczn\w* progres/, 'Automatyczna progresja: gdy we wszystkich seriach dojdziesz do górnej granicy powtórzeń z zachowanym zapasem, aplikacja podpowie większy ciężar. Gdy wynik stoi 3 treningi, podpowie lżejszy ciężar i budowanie od nowa.', []],
    [/glosnosc|dzwiek|sygnal/, 'Głośność sygnału i ostrzeżenie przed końcem przerwy ustawisz w <b>Ustawienia → Trening</b>.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/cel(e|u|ow)? (miesieczn|dodac)|dodac cel/, 'Cele miesięczne dodasz w <b>Postępy → Przegląd → Cele</b>: liczba treningów, tonaż albo ciężar w ćwiczeniu.', [{ l: 'Cele', i: 'target', href: '#/stats', a: 'askOver' }]]
  ];
  H.how = c => { const n = N(c.q); const h = HOW.find(([re]) => re.test(n)); if (!h) return null; return { html: `<p>${h[1]}</p>`, acts: h[2], chips: ['Co umiesz?', 'Co mam dziś?'] }; };

  H.copyai = c => ({ html: '<p>Przygotuję podsumowanie Twojego planu, ostatnich treningów, rekordów i wagi. Wklejasz je w dowolnym czacie AI i dopisujesz pytanie.</p>', acts: [{ l: 'Kopiuj podsumowanie dla AI', i: 'copy', a: 'askCopyAI' }], chips: ['Co umiesz?', 'Co mam dziś?'] });
  H.hello = c => ({ html: `<p>Cześć${F.S.settings.name ? ', ' + E(F.S.settings.name) : ''}! Jestem asystentem FORGE. Odpowiadam na pytania o Twoje treningi, plan, rekordy, regenerację, ćwiczenia i wiedzę treningową — w całości w telefonie, bez internetu.</p>`, chips: startChips() });
  H.thanks = c => ({ html: '<p>Nie ma sprawy. W czym jeszcze mogę pomóc?</p>', chips: startChips() });
  H.caps = c => ({ html: `<p>To nie jest AI — nie zgaduję. Liczę z Twoich treningów i odpowiadam tylko tym, co potwierdzają badania. Przykłady:</p><ul class="ak-ul"><li><b>Wyniki:</b> „ile robiłem w przysiadzie miesiąc temu”, „rekord w wyciskaniu”, „postęp w martwym ciągu”, „porównaj przysiad i martwy ciąg”, „najlepszy trening”.</li><li><b>Plan:</b> „co mam dziś”, „co mam w środę”, „kiedy trenuję w tym tygodniu”, „ile mam dziś ważyć”, „ile mam przerwy”.</li><li><b>Analiza:</b> „co stoi w miejscu”, „dlaczego przysiad stoi”, „co zaniedbuję”, „czy potrzebuję odciążenia”, „podsumuj miesiąc”.</li><li><b>Regeneracja:</b> „czy mogę dziś trenować nogi”, „które partie są gotowe”.</li><li><b>Ćwiczenia:</b> „czym zastąpić wyciskanie hantlami”, „jak robić hip thrust”, „ćwiczenia na plecy bez sprzętu”.</li><li><b>Ciało:</b> „ile ważę”, „ile kalorii potrzebuję”, „ile spaliłem w tym tygodniu”.</li><li><b>Wiedza i narzędzia:</b> „ile białka jeść”, „co to jest RIR”, „talerze na 120”, „100 kg na 5”.</li></ul><p class="ak-s">Możesz też pytać głosem — przycisk mikrofonu w polu pytania.</p>`, chips: startChips() });
  H.pain = c => ({ html: '<p>Przy bólu przerwij ćwiczenie. Ostry ból w stawie, ból promieniujący, drętwienie albo obrzęk to sygnał, żeby skonsultować się z lekarzem lub fizjoterapeutą — nie oceniam urazów. Zakwasy po 1–2 dniach od treningu są normalne.</p><p>W kreatorze planu możesz zaznaczyć ograniczenia (np. barki, kolana), a plan pominie ćwiczenia obciążające te miejsca.</p>', acts: [{ l: 'Kreator planu', i: 'sparkles', href: '#/wizard' }], chips: ['Czym są zakwasy?', 'Czym zastąpić wyciskanie?'] });

  /* ================= WYBÓR TEMATU ================= */
  const INT = [
    ['hello', /^(czesc|hej|siema|witaj|dzien dobry|dobry wieczor|elo|yo|hejka|cze)\b/], ['thanks', /^(dzieki|dziekuje|thx|super|ok dzieki|spoko)\b/], ['ack', /^(ok|okej|okey|dobra|jasne|tak|nie|aha|rozumiem|git|w porzadku)$/], ['caps', /co (umiesz|potrafisz)|w czym (mozesz|pomozesz)|jak (dzialasz|cie uzywac)|pomoc$|^pomoc|kim jestes/],
    ['copyai', /kopiuj|skopiuj|podsumowanie dla ai|chat ?gpt|gemini|dla ai\b/],
    ['pain', /\b(boli|bol\b|bolu|kontuzj|uraz|naderwa|lekarz|chory|choroba|choruje)\b/],
    ['how', /\bjak (dodac|zmienic|usunac|zrobic kopi|zaimport|wczytac|polaczyc|zainstal|przeniesc|przesunac|pominac|wlaczyc|wylaczyc|ustawic|edytow|dziala progres)|jak zrobic superseri|gdzie (jest|zmienic|ustawic|znajde)/],
    ['calc1rm', /\d+(?:[.,]\d+)?\s*(?:kg|lb)?\s*(?:x|na|razy|po)\s*\d+\b/], ['plates', /talerz|krazk|co (zalozyc|nalozyc) na (sztange|gryf)/], ['warmup', /rozgrzewk/],
    ['sub', /zastap|zamien|zamiennik|zamiast|alternatyw|nie mam (sprzetu|maszyny|sztangi|lawki)|inne cwiczenie/], ['tech', /jak (robic|wykonac|wykonywac|zrobic poprawnie|prawidlowo)|techni(k|c)|wskazowk/],
    ['musWork', /^miesnie\b|jakie miesnie|co pracuje|na co (jest|dziala)|na jakie miesnie|jakie partie pracuj/], ['exFor', /(cwiczeni\w*|co robic|czym trenowac|jak trenowac|jak zbudowac|jak rozbudowac) (na|dla)\b/],
    ['today', /jaki (jest )?dzis dzien|ktory (jest )?dzis|jaka (jest )?(dzis )?data|ktorego dzis/], ['profile', /ile mam lat|moj (wiek|wzrost|profil)|ile mam wzrostu|moje dane/],
    ['short', /malo czasu|nie mam czasu|krotk\w* trening|szybk\w* trening|spiesze|tylko \d+ min|mam \d+ min/], ['tired', /nie mam (dzis )?sil|zmeczon|slabo sie|kiepsko sie|nie chce mi sie|brak sil|bez sil/],
    ['grow', /(jak|co).*(zwiekszyc|zbudowac|rozbudowac|powiekszyc|wiekszy|wieksza|wieksze|urosnac|urosl|napompowac)/],
    ['compare', /porown|\bvs\b|versus|co (mocniej|lepiej) (rosnie|idzie)/], ['deloadQ', /(czy|kiedy|czas na|potrzebuj\w*|powinien\w*|zrobic|mam zrobic) .*(odciaz|deload)|(odciaz|deload)\w* .*(teraz|juz|czas|potrzeb)/],
    ['best', /najlepsz\w* trening|najciezsz\w* trening|najwieksz\w* tonaz|rekordow\w* trening/], ['burn', /spalil|spalon|spalam|ile kalorii (na|w|przy) trening|kalorie z trening/],
    ['since', /od kiedy trenuj|moj staz|statystyk|w sumie|lacznie|lacznym|najczesciej (robie|cwicze)|ulubion/], ['duration', /(jak dlugo|ile) trwa (moj |moje |twoj )?trening|czas trening|dlugosc trening|dlugo trenuje|ile czasu trenuje/],
    ['week', /kiedy trenuj|rozklad|grafik|harmonogram|co mam w (ten |tym |przyszl\w* |nastepn\w* )?(tygodni|poniedzial|wtor|srod|czwart|piat|sobot|niedziel)|kiedy (mam )?treningi|w (poniedzial|wtor|srod|czwart|piat|sobot|niedziel)\w* (mam|trenuj)/], ['plan', /jaki (mam )?plan|moj plan|plan treningowy|ile dni (w|ma) plan|pokaz plan/],
    ['recentPr', /(ostatnie|nowe|swieze) rekordy|rekordy (w tym|ostatnio)/], ['stag', /\bstoi\b|\bstoja\b|zastoj|stagnac|nie rosnie|nie idzie|utknal|plateau|bez postepu|nie poprawiam/],
    ['progress', /jak mi idzie|postep|progres|rosnie|poprawil|idzie mi|rozwoj|zwiekszyl|przybylo sily/], ['e1rm', /\b1rm\b|maks\w* na (jedno|raz)|na jeden raz|ile (wycisne|podniose|przysiadne)/],
    ['record', /rekord|najlepsz|zyciowk|\bpr\b|\bmax\b|maks/], ['last', /kiedy (ostatnio|ostatni raz)|ostatni raz|dawno nie/],
    ['target', /ile (mam )?(dzis |dzisiaj )?(wazyc|zalozyc|dac|dorzucic|brac)|jaki ciezar (na|w|do|dzis)|ile (zalozyc|dac) na|jaki (ciezar|ciezary) (dzis|na dzis|mam)|jakie (mam )?ciezary|na ile dzis|cel na dzis/],
    ['rest', /przerw/], ['recovery', /regener|odpoczel|odpoczal|zmeczon|gotow|moge (dzis |juz )?trenow|kiedy (moge|mozna) (znow|znowu|trenowac)/],
    ['next', /co (mam )?(dzis|dzisiaj|jutro)|nastepny trening|kolejny trening|kiedy (mam )?(nastepny |najblizszy )?trening|jaki (mam )?trening|plan na (dzis|jutro|tydzien)|co (robie|cwicze)/],
    ['muscleSets', /ile serii/], ['neglect', /zaniedb|za malo|najslabsz|ktor\w* parti|niedotrenow|zapomin/],
    ['count', /ile (razy|treningow)|jak czesto trenuj|ile (bylem|trenowal)|ile dni trenow/], ['volume', /tonaz|ile (kg|kilogram\w*|ton) (podnio|przerzuc)|ile podnioslem|objetosc (w|tygodn)/],
    ['summary', /podsum|jak mi (poszl|poszedl)|raport|bilans/], ['streak', /z rzedu|seria tygodni|regularn|passa|ile tygodni|(moja|jaka) (jest )?(moja )?seria$/],
    ['bw', /ile waz|moja waga|wag\w* ciala|przytyl|masa ciala|ile przybral|ile schudl/], ['kcal', /kalori|zapotrzebow|ile (jesc|kcal)|tdee/], ['goals', /\bcel(e|ow|u)?\b/], ['rank', /\brang|\bxp\b|poziom|osiagniec/]
  ];
  const pickIntent = n => { for (const [id, re] of INT) if (re.test(n)) return id; return null; };

  /* ================= SILNIK ================= */
  const CTX = { ex: null, mus: null, time: null, intent: null, pending: null };
  F.ask = (q, ctx = CTX) => {
    q = String(q).replace(/×/g, ' x '); const n = N(q); const c = { q, n };
    const genKn = /^(co to|czym (jest|sa)|po co|dlaczego|ile\b.*\b(bialka|razy w tygodniu)\b|ile\b.*\b(serii|powtorzen)\b.*\b(robic|trzeba|powinien\w*|zalec\w*|najlepiej|optymal\w*)\b|ile (robic|trzeba|powinienem)\b.*\b(serii|powtorzen)|jak (czesto|dlugo) (trenowac|robic)|jaki podzial|czy (warto|trzeba|powinienem|powinnam|brac|mozna))/.test(n);
    if (/odciaz|deload/.test(n) && /(czy|kiedy|czas|potrzeb|powinien|zrobic|juz|teraz)/.test(n) && !/co to|czym jest|na czym polega|jak (robic|wyglada)/.test(n)) return remember(c, ctx, 'deloadQ', H.deloadQ(c));
    if (genKn) { const kn = KN.some(([re]) => re.test(n)) ? H.know(c) : null; if (kn) { ctx.intent = null; ctx.pending = null; return kn; } }
    let intent0 = pickIntent(n); if (intent0 === 'grow' && !findMus(q)) intent0 = null;
    const exHit = findEx(q), timeHit = findTime(q); let musHit = findMus(q);
    if (exHit && musHit) { const en = N(exHit.name + ' ' + (exHit.alias || '')).split(' '); if (N(q).split(' ').some(t => MUS.some(([re]) => re.test(t)) && en.some(w => tmatch(w, t)))) musHit = null; }
    // odpowiedź na pytanie „które ćwiczenie?”
    if (!intent0 && ctx.pending && exHit) { c.ex = exHit; c.time = ctx.time; const id = ctx.pending; ctx.pending = null; return finish(c, ctx, id); }
    ctx.pending = null;
    let intent = intent0;
    const followUp = !intent && ctx.intent && ((exHit || musHit || timeHit) && /^(a|i|oraz|to|no) /.test(n + ' ') || (timeHit && !exHit && !musHit && n.split(' ').length <= 4));
    if (followUp) intent = ctx.intent;
    c.ex = exHit || (intent && (followUp || !musHit) && ['histAt', 'record', 'progress', 'stag', 'last', 'target', 'e1rm', 'sub', 'tech', 'musWork', 'rest', 'warmup'].includes(intent) && !intent0 ? ctx.ex : null) || (intent0 && ['histAt', 'record', 'progress', 'stag', 'target', 'e1rm', 'sub', 'tech', 'musWork'].includes(intent0) && /\b(to|tego|tym|niego|nim|tamto)\b/.test(n) ? ctx.ex : null);
    c.mus = musHit || (followUp && !exHit ? ctx.mus : null); c.time = timeHit || (followUp && !exHit && !musHit ? ctx.time : null);
    if (!intent) { // samo ćwiczenie / partia / wiedza
      const kn = H.how(c) || (KN.some(([re]) => re.test(n)) ? H.know(c) : null); if (kn) return remember(c, ctx, null, kn);
      if (exHit && !musHit) intent = /\bile\b|robil|ciezar/.test(n) ? 'histAt' : 'exCard';
      else if (musHit) intent = /cwicz/.test(n) ? 'exFor' : 'musCard';
    }
    if (intent === 'histAt' && !c.ex && c.mus) intent = 'muscleSets';
    return finish(c, ctx, intent);
  };
  const finish = (c, ctx, intent) => {
    let a = null;
    if (intent === 'exCard') a = exCard(c); else if (intent === 'musCard') a = musCard(c); else if (intent && H[intent]) a = H[intent](c, ctx);
    if (!a && intent === 'how') a = H.know(c);
    if (!a) return remember(c, ctx, null, fallback(c));
    return remember(c, ctx, intent, a);
  };
  const remember = (c, ctx, intent, a) => { if (c.pending) ctx.pending = c.pending; if (['hello', 'thanks', 'ack', 'caps', 'pain', 'how', 'copyai', 'today', 'profile'].includes(intent)) return a; if (!intent) { ctx.intent = null; return a; } if (c.ex) ctx.ex = c.ex; if (c.mus) ctx.mus = c.mus; if (c.time) ctx.time = c.time; if (intent && !['hello', 'thanks', 'caps', 'pain', 'how'].includes(intent)) ctx.intent = intent; if (a.pendingFor) ctx.pending = a.pendingFor; return a; };
  const exCard = c => { const ex = c.ex, h = hist(ex.id); if (!h.length) return { html: `<p><b>${E(ex.name)}</b> — ${mName(ex.muscle)}, ${E(String(ex.equip || '').toLowerCase())}. Nie masz go jeszcze w historii.</p>`, acts: [{ l: 'Zdjęcia i technika', i: 'info', a: 'techOpen', d: { id: ex.id } }], chips: [`Technika — ${ex.name}`, `Zamiennik — ${ex.name}`, `Mięśnie — ${ex.name}`] };
    const l = h[h.length - 1], b = F.bestE1(ex.id), sg = F.suggest(ex.id, (planItem(ex.id) || { it: {} }).it.reps), st = F.stagnation(ex.id);
    return { html: `<p><b>${E(ex.name)}</b> — ${h.length} ${F.plur(h.length, 'trening', 'treningi', 'treningów')}, ostatnio ${ago(l.ts)}.</p>${tiles([{ l: 'Ostatnio', v: ex.type === 'wr' || ex.type === 'bwr' ? kg(Math.max(...l.sets.map(s => s.w || 0))) : `${l.reps} powt.`, s: dd(l.ts) }, b ? { l: 'Wyliczony maks', v: kg(b) } : null, sg && sg.w ? { l: 'Cel na dziś', v: `${kg(sg.w)} × ${sg.r}`, hot: 1 } : null].filter(Boolean))}${st && st.stuck >= 3 ? `<p>Od ${st.stuck} treningów bez poprawy.</p>` : ''}`, acts: [exLink(ex)], chips: [`Postęp — ${ex.name}`, `Rekord — ${ex.name}`, `Zamiennik — ${ex.name}`] }; };
  const musCard = c => { const a = H.recovery(c), b = H.muscleSets({ ...c, time: null }); return { html: a.html + b.html, acts: a.acts, chips: [`Ćwiczenia na ${mAcc(c.mus)}`, 'Co zaniedbuję?'] }; };
  const fallback = c => ({ html: '<p>Na to pytanie nie umiem odpowiedzieć. Odpowiadam tylko na podstawie Twoich danych i sprawdzonej bazy wiedzy, więc nie zgaduję. Spróbuj innymi słowami albo wybierz podobne pytanie.</p><p class="ak-s">Możesz też skopiować podsumowanie swoich treningów i zadać pytanie w dowolnym czacie AI.</p>', acts: [{ l: 'Kopiuj podsumowanie dla AI', i: 'copy', a: 'askCopyAI' }], chips: guessChips(c) });
  const guessChips = c => { const out = []; if (c.ex || findEx(c.q)) { const e = c.ex || findEx(c.q); out.push(`Postęp — ${e.name}`, `Zamiennik — ${e.name}`, `Technika — ${e.name}`); } if (findMus(c.q)) out.push('Co zaniedbuję?'); return [...out, 'Co umiesz?', 'Co mam dziś?'].slice(0, 4); };
  const startChips = () => { const out = []; const top = topUsed(1)[0]; if (F.S.plans.length) out.push('Co mam dziś?'); if (top) out.push(`Postęp — ${top.name}`); if (S().length) out.push('Co stoi w miejscu?', 'Czy mogę dziś trenować nogi?', 'Podsumuj ten miesiąc'); out.push('Ile białka jeść?', 'Co umiesz?'); return out.slice(0, 6); };
  F.askStartChips = startChips;

  /* ================= PODSUMOWANIE DLA AI ================= */
  F.askSummary = () => {
    const s = F.S.settings, p = F.profile ? F.profile() : {}, L = [];
    L.push('Moje dane treningowe z aplikacji FORGE (dziennik treningowy). Odpowiadaj po polsku.');
    const pr = [p.sexKnown ? (p.sex === 'f' ? 'kobieta' : 'mężczyzna') : '', p.ageKnown ? `${p.age} lat` : '', p.heightKnown ? `${p.height} cm` : '', p.bwKnown ? `${F.fmtNum(p.bw, 1)} kg` : '', s.exp ? `staż: ${{ beg: 'początkujący', mid: 'średniozaawansowany', adv: 'zaawansowany' }[s.exp] || s.exp}` : ''].filter(Boolean);
    L.push(`Profil: ${pr.length ? pr.join(', ') : 'brak danych'}. Ciężary w ${F.unit()}.`);
    const pl = planNow(); if (pl) { L.push(`\nPlan: ${pl.name}${pl.meta && pl.meta.goal ? ` (cel: ${(F.PLN.GOALS[pl.meta.goal] || [pl.meta.goal])[0]})` : ''}`); pl.days.forEach(d => L.push(`- ${d.name}: ${d.items.map(i => `${F.exName(i.exId)} ${i.sets}×${i.reps}${i.rest ? ` (przerwa ${i.rest}s)` : ''}`).join('; ')}`)); }
    if (S().length) L.push('\nOstatnie treningi:'); S().slice(0, 10).forEach(se => L.push(`- ${new Date(se.start).toISOString().slice(0, 10)} ${se.name}: ${se.exercises.map(e => { const ws = e.sets.filter(isWork); return `${F.exName(e.exId)} ${ws.map(x => x.w ? `${F.fmtNum(F.toDisp(x.w), 1)}×${x.r}` : `${x.r}`).join(', ')}`; }).join('; ')}`));
    const recs = [...F.S.ex.values()].filter(e => e.type === 'wr').map(e => ({ e, b: F.bestE1(e.id) })).filter(x => x.b).sort((a, b) => b.b - a.b).slice(0, 10); if (recs.length) L.push('\nNajlepsze wyliczone maksy (1RM): ' + recs.map(x => `${x.e.name} ${F.fmtNum(F.toDisp(x.b), 1)}`).join('; '));
    if (S().length) { const now = Date.now(); L.push('\nSerie na partię tygodniowo (średnio z 4 tygodni): ' + F.BODY_ORDER.map(m => `${F.MUSCLES[m].toLowerCase()} ${F.fmtNum(weekSets(m, now - 28 * DAY, now + 1).all / 4, 1)}`).join('; ')); }
    const bw = F.S.bw.slice(-8); if (bw.length) L.push('\nWaga ciała: ' + bw.map(b => `${new Date(b.date).toISOString().slice(0, 10)} ${F.fmtNum(b.kg, 1)}`).join('; '));
    L.push('\nMoje pytanie: '); return L.join('\n');
  };

  /* ================= WIDOK ================= */
  let LOG = null, busy = false; const MAXLOG = 60;
  const loadLog = async () => { if (LOG) return LOG; try { LOG = (await F.kvGet('askLog')) || []; } catch (e) { LOG = []; } return LOG; };
  const saveLog = () => { try { F.kvSet('askLog', LOG.slice(-MAXLOG)); } catch (e) { } };
  const actHtml = a => a.href ? `<a class="ak-act" href="${a.href}"${a.a ? ` data-a="${a.a}"` : ''}${a.d ? Object.entries(a.d).map(([k, v]) => ` data-${k}="${E(v)}"`).join('') : ''}>${ic(a.i || 'arrow-right', 16)}${E(a.l)}</a>` : `<button class="ak-act" data-a="${a.a}"${a.d ? Object.entries(a.d).map(([k, v]) => ` data-${k}="${E(v)}"`).join('') : ''}>${ic(a.i || 'arrow-right', 16)}${E(a.l)}</button>`;
  const avatar = () => `<span class="ak-av"><img src="assets/bg/ask.webp" alt=""></span>`;
  const msgHtml = (m, last) => m.w === 'u' ? `<div class="ak-m me"><div class="ak-b">${E(m.t)}</div></div>`
    : `<div class="ak-m bot">${avatar()}<div class="ak-w"><div class="ak-b">${m.h}</div>${m.a && m.a.length ? `<div class="ak-acts">${m.a.map(actHtml).join('')}</div>` : ''}${last && m.c && m.c.length ? `<div class="ak-more"><small>W czym jeszcze mogę pomóc?</small><div class="ak-chips">${m.c.map(q => `<button class="chip" data-a="askQ" data-q="${E(q)}">${E(q)}</button>`).join('')}</div></div>` : ''}</div></div>`;
  const welcome = () => ({ w: 'b', h: `<p>${(() => { const hr = new Date().getHours(); return hr < 12 ? 'Dzień dobry' : hr < 18 ? 'Cześć' : 'Dobry wieczór'; })()}${F.S.settings.name ? ', ' + E(F.S.settings.name) : ''}. W czym mogę pomóc? Wybierz temat powyżej albo zadaj pytanie — wpisz je${SR ? ' lub powiedz' : ''}.</p>`, c: startChips(), a: [] });
  const CAPS = [['chart-line', 'Wyniki', 'Rekordy, postęp, maks', 'Jak mi idzie?'], ['calendar', 'Plan', 'Co dziś, ciężary, przerwy', 'Co mam dziś?'], ['activity', 'Regeneracja', 'Co jest gotowe', 'Czy mogę dziś trenować nogi?'],
    ['target', 'Analiza', 'Zastój, zaniedbane partie', 'Co stoi w miejscu?'], ['dumbbell', 'Ćwiczenia', 'Technika, zamienniki', 'Ćwiczenia na plecy'], ['book-open', 'Wiedza', 'Tylko z badań, ze źródłem', 'Ile białka jeść?'],
    ['calculator', 'Narzędzia', '1RM, talerze, rozgrzewka', '100 kg na 5'], ['flame', 'Ciało', 'Waga, kalorie, białko', 'Ile ważę?']];
  const heroHtml = () => `<section class="ak-hero"><div><span class="ak-tag">${ic('shield', 14)} To nie jest AI</span><h2>Nie zgaduje.<br>Liczy.</h2><p>Odpowiedzi liczę z Twoich treningów albo biorę z badań — zawsze ze źródłem. Nic nie zmyślam. Działam bez internetu, dane zostają w telefonie.</p><p class="ak-hero-s">Ciężarów za Ciebie nie podniosę — ale powiem, ile dziś założyć.</p></div></section>
    <div class="ak-caps">${CAPS.map(([i, t, d, q]) => `<button class="ak-cap" data-a="askQ" data-q="${E(q)}">${ic(i, 20)}<b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
  // podpowiedzi przy wpisywaniu
  const SUG = ['Co mam dziś?', 'Co mam jutro?', 'Kiedy trenuję w tym tygodniu?', 'Jaki mam plan?', 'Jakie mam ciężary na dziś?', 'Ile mam przerwy?', 'Czy mogę dziś trenować nogi?', 'Które partie są gotowe?', 'Co stoi w miejscu?', 'Co zaniedbuję?', 'Czy potrzebuję odciążenia?', 'Jak mi idzie?', 'Podsumuj ten miesiąc', 'Ostatnie rekordy', 'Moje rekordy', 'Najlepszy trening', 'Ile treningów w tym miesiącu?', 'Tonaż w tym tygodniu', 'Ile trwa mój trening?', 'Od kiedy trenuję?', 'Ile tygodni z rzędu trenuję?', 'Jaka jest moja ranga?', 'Moje cele', 'Ile ważę?', 'Ile kalorii potrzebuję?', 'Ile kalorii spaliłem w tym tygodniu?', 'Ile białka jeść?', 'Co to jest RIR?', 'Co to jest odciążenie?', 'Ile serii robić tygodniowo?', 'Ile powtórzeń robić?', 'Jaki podział wybrać?', 'Jak schudnąć?', 'Czym są zakwasy?', 'Ile spać?', 'Talerze na 100 kg', 'Rozgrzewka do 100 kg', '100 kg na 5', 'Ćwiczenia na plecy', 'Ćwiczenia na klatkę bez sprzętu', 'Ćwiczenia na pośladki', 'Porównaj przysiad i martwy ciąg', 'Kopiuj podsumowanie dla AI', 'Jak zrobić kopię zapasową?', 'Jak dodać plan?'];
  const sugFor = v => { const t = N(v).split(' ').filter(Boolean); if (!t.length || N(v).length < 2) return []; const last = t[t.length - 1], head = t.slice(0, -1);
    const ok = x => { const w = N(x).split(' '); return head.every(h => w.some(z => z.startsWith(h))) && w.some(z => z.startsWith(last)); };
    const out = SUG.filter(ok); const ex = findEx(v); if (ex && out.length < 3) [`Postęp — ${ex.name}`, `Rekord — ${ex.name}`, `Cel na dziś — ${ex.name}`, `Technika — ${ex.name}`, `Zamiennik — ${ex.name}`].forEach(x => { if (!out.includes(x)) out.push(x); });
    return out.slice(0, 3); };
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  V.ask = () => {
    const log = LOG || [];
    const list = log.length ? log : [welcome()];
    return { html: `${F.head('Zapytaj FORGE', { back: 1, sub: 'Asystent treningowy · offline', right: `<button class="ibtn" data-a="askMenu" aria-label="Więcej">${ic('ellipsis', 22)}</button>` })}
      ${log.length <= 1 ? heroHtml() : ''}
      <div class="ak-log" id="ak-log" aria-live="polite">${list.map((m, i) => msgHtml(m, i === list.length - 1)).join('')}</div>
      <div class="ak-spacer"></div>
      <form class="ak-bar" id="ak-form" autocomplete="off"><div class="ak-sug" id="ak-sug"></div><div class="ak-in-w"><input id="ak-in" enterkeyhint="send" placeholder="Zadaj pytanie…" maxlength="200" aria-label="Pytanie">${SR ? `<button class="ak-mic" type="button" data-a="askMic" aria-label="Powiedz pytanie">${ic('mic', 19)}</button>` : ''}</div><button class="ak-send" type="submit" aria-label="Wyślij">${ic('send', 20)}</button></form>`,
      after: root => { if (!LOG) loadLog().then(() => { if (LOG.length) F.render(true); });
        const f = F.$('#ak-form', root), inp = F.$('#ak-in', root), sg = F.$('#ak-sug', root);
        const showSug = () => { const l = sugFor(inp.value); sg.innerHTML = l.map(x => `<button type="button" class="chip" data-a="askQ" data-q="${E(x)}">${E(x)}</button>`).join(''); sg.classList.toggle('on', !!l.length); };
        inp.addEventListener('input', showSug); inp.addEventListener('blur', () => setTimeout(() => { sg.classList.remove('on'); }, 250)); inp.addEventListener('focus', showSug);
        f.addEventListener('submit', e => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; inp.value = ''; sg.classList.remove('on'); send(v); });
        F.chart.bindTips(root); if (log.length > 1) scrollEnd(false); } };
  };
  const scrollEnd = smooth => requestAnimationFrame(() => { const l = F.$('#ak-log'); if (!l) return; const last = l.lastElementChild; if (!last) return; const top = last.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' }); });
  const send = async q => {
    if (busy) return; busy = true; await loadLog(); if (!LOG.length) LOG.push(welcome());
    LOG.push({ w: 'u', t: q, ts: Date.now() }); const hero = F.$('.ak-hero'); if (hero) { hero.classList.add('out'); setTimeout(() => hero.remove(), 260); }
    const l = F.$('#ak-log'); if (l) { l.querySelectorAll('.ak-more').forEach(x => x.remove()); l.insertAdjacentHTML('beforeend', msgHtml(LOG[LOG.length - 1]) + `<div class="ak-m bot ak-typing">${avatar()}<div class="ak-w"><div class="ak-b"><i></i><i></i><i></i></div></div></div>`); scrollEnd(true); }
    let a; try { a = F.ask(q); } catch (e) { console.error(e); a = { html: '<p>Coś poszło nie tak przy liczeniu odpowiedzi. Spróbuj zadać pytanie inaczej.</p>', chips: startChips() }; }
    await new Promise(r => setTimeout(r, 380 + Math.min(500, q.length * 8)));
    const m = { w: 'b', h: a.html, a: a.acts || [], c: (a.chips || []).filter(Boolean).slice(0, 4), ts: Date.now() }; LOG.push(m); if (LOG.length > MAXLOG) LOG = LOG.slice(-MAXLOG); saveLog();
    const l2 = F.$('#ak-log'); if (l2) { const t = l2.querySelector('.ak-typing'); if (t) t.remove(); l2.insertAdjacentHTML('beforeend', msgHtml(m, true)); F.chart.bindTips(l2); scrollEnd(true); }
    busy = false;
  };
  F.act.askQ = b => { const i = F.$('#ak-in'); if (i) i.value = ''; const sg = F.$('#ak-sug'); if (sg) sg.classList.remove('on'); send(b.dataset.q); };
  let rec = null;
  F.act.askMic = b => {
    if (!SR) return; if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = 'pl-PL'; rec.interimResults = true; rec.maxAlternatives = 1; const inp = F.$('#ak-in'); let fin = '';
    b.classList.add('on'); inp.placeholder = 'Słucham…';
    rec.onresult = e => { let t = ''; for (const r of e.results) { t += r[0].transcript; if (r.isFinal) fin = t; } inp.value = t; };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') F.toast('Brak dostępu do mikrofonu. Zezwól na mikrofon w ustawieniach przeglądarki.', '', 3500); else if (e.error === 'network') F.toast('Rozpoznawanie mowy w tej przeglądarce wymaga internetu. Wpisz pytanie.', '', 3500); };
    rec.onend = () => { b.classList.remove('on'); inp.placeholder = 'Zadaj pytanie…'; rec = null; const v = (fin || inp.value).trim(); if (v) { inp.value = ''; send(v); } };
    try { rec.start(); } catch (e) { b.classList.remove('on'); rec = null; }
  };
  F.act.goAsk = () => { F.go('#/ask'); };
  F.act.askMenu = () => F.sheet(`<div class="menu"><button data-a="askCapsQ">${ic('sparkles', 20)}<span>Co potrafię<small>Lista tematów z przykładami pytań</small></span></button><button data-a="askCopyAI">${ic('copy', 20)}<span>Kopiuj podsumowanie dla AI<small>Twój plan, ostatnie treningi i rekordy — do wklejenia w dowolnym czacie AI</small></span></button><button data-a="askClear">${ic('trash-2', 20)}<span>Wyczyść rozmowę</span></button></div>`, { title: 'Zapytaj FORGE' });
  F.act.askCapsQ = () => { F.closeSheet(true); send('Co umiesz?'); };
  F.act.askClear = async () => { F.closeSheet(true); if (!(await F.confirm({ title: 'Wyczyścić rozmowę?', text: 'Twoje treningi i dane zostają bez zmian.', ok: 'Wyczyść', cancel: 'Wróć', danger: true }))) return; LOG = []; saveLog(); Object.assign(CTX, { ex: null, mus: null, time: null, intent: null, pending: null }); F.render(true); };
  F.act.askCopyAI = async () => {
    const t = F.askSummary(); let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { }
    if (ok) { F.closeSheet(true); F.toast(ic('copy', 16) + ' Skopiowano. Wklej w czacie AI i dopisz pytanie.', 'hot', 3200); return; }
    F.sheet(`<p class="dim small">Zaznacz tekst i skopiuj go ręcznie:</p><textarea class="ak-ta" readonly>${E(t)}</textarea>`, { title: 'Podsumowanie dla AI' }); setTimeout(() => { const ta = F.$('.ak-ta'); if (ta) { ta.focus(); ta.select(); } }, 200);
  };
  F.act.askDeload = () => F.act.deloadStart();
  F.act.askRegen = () => { F.ui.statTab = 'mus'; F.ui.musView = 'rec'; };
  F.act.askBody = () => { F.ui.statTab = 'body'; };
  F.act.askOver = () => { F.ui.statTab = 'over'; };
  F.act.askPrs = () => { F.ui.statTab = 'prs'; };
})();
