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
    if (m) { const k = m[1] ? (NUMW[m[1]] || +m[1]) : 1; const u = UNIT(m[2]); return range(now - k * u, now + 1, k === 1 ? `w ostatnim ${ulabel(1, m[2]).replace('dzień', 'dniu').replace('tydzień', 'tygodniu').replace('miesiąc', 'miesiącu').replace('rok', 'roku')}` : `w ostatnich ${k} ${UF[/^(dzien|dni|dob)/.test(m[2]) ? 'd' : /^(tydz|tyg)/.test(m[2]) ? 't' : /^mies/.test(m[2]) ? 'm' : /^kwart/.test(m[2]) ? 'k' : 'r'][2]}`); }
    const ws = F.startOfWeek(now), d0 = new Date(today), ms = new Date(d0.getFullYear(), d0.getMonth(), 1).getTime(), ys = new Date(d0.getFullYear(), 0, 1).getTime();
    if (/\b(w tym|ten|obecnym|biezacym) tygodni|\btego tygodnia\b/.test(n)) return range(ws, now + 1, 'w tym tygodniu');
    if (/\b(zeszl|poprzedn|ubiegl)\w* tygodni|\b(zeszly|poprzedni|ubiegly) tydzien/.test(n)) return range(ws - WK, ws, 'w zeszłym tygodniu');
    if (/\b(w tym|ten|obecnym|biezacym) miesiac|\btego miesiaca\b/.test(n)) return range(ms, now + 1, 'w tym miesiącu');
    if (/\b(zeszl|poprzedn|ubiegl)\w* miesi/.test(n)) return range(new Date(d0.getFullYear(), d0.getMonth() - 1, 1).getTime(), ms, 'w zeszłym miesiącu');
    if (/\b(w tym|ten|obecnym|biezacym) roku?\b|\btego roku\b/.test(n)) return range(ys, now + 1, 'w tym roku');
    if (/\b(zeszl|poprzedn|ubiegl)\w* rok/.test(n)) return range(new Date(d0.getFullYear() - 1, 0, 1).getTime(), ys, 'w zeszłym roku');
    const dayR = (y, mo, d, label) => { const a = new Date(y, mo, d).getTime(); return range(a, a + DAY, label); };
    let dm = n.match(/\b([12]?\d|3[01])\s+(stycz\w*|lut\w*|mar(?:ca|zec|cu)|kwie\w*|maj\w*|czerw\w*|lip\w*|sierp\w*|wrzes\w*|pazdz\w*|listop\w*|grud\w*)(?:\s+(20\d\d))?/);
    if (dm) { const mi = MSTEM.findIndex(st => dm[2].startsWith(st)); let y = dm[3] ? +dm[3] : d0.getFullYear(); if (!dm[3] && new Date(y, mi, +dm[1]).getTime() > now) y--; return dayR(y, mi, +dm[1], `${+dm[1]} ${MONG[mi]}${y !== d0.getFullYear() ? ' ' + y : ''}`); }
    dm = String(q).match(/(?:^|\s)([0-3]?\d)[./]([01]?\d)(?:[./](20\d\d))?(?!\s*(?:kg|lb|%))(?=\s|$|\?|,)/);
    if (dm && +dm[2] >= 1 && +dm[2] <= 12 && +dm[1] >= 1) { let y = dm[3] ? +dm[3] : d0.getFullYear(); if (!dm[3] && new Date(y, +dm[2] - 1, +dm[1]).getTime() > now) y--; return dayR(y, +dm[2] - 1, +dm[1], `${+dm[1]} ${MONG[+dm[2] - 1]}`); }
    const wdi = ['niedziel', 'poniedzial', 'wtor', 'srod', 'czwart', 'piat', 'sobot'].findIndex(w => new RegExp('\\b' + w).test(n));
    if (wdi >= 0 && /(robil|trenowal|cwiczyl|mial|bylo|zrobil|zeszl|ostatni|poprzedni)/.test(n)) { let d = today - DAY; if (/zeszl|poprzedni/.test(n)) d = Math.min(d, ws - DAY); while (new Date(d).getDay() !== wdi) d -= DAY; return range(d, d + DAY, `${['w niedzielę', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę'][wdi]} (${dd(d)})`); }
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
  const weekSets = (m, from, to) => { let d = 0, ind = 0; S().forEach(se => { if (se.start < from || se.start >= to) return; se.exercises.forEach(e => { const ex = F.S.ex.get(e.exId); if (!ex) return; const n = e.sets.filter(isWork).length; if (ex.muscle === m) d += n; else if (F.secondaryOf(e.exId).includes(m)) ind += n * 0.5; }); }); return { d, ind, all: d + ind }; };
  const volRange = m => F.volFor(m);
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
    const html = `<p>${t.kind === 'point' ? `Najbliższy trening do daty „${t.label}”: <b>${dd(s0.start)}</b>.` : t.to - t.from <= DAY ? `${cap(t.label)}:` : `${cap(t.label)} najlepsza seria była <b>${dd(s0.start)}</b>.`}</p>
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
    return { html: `${tiles([{ l: 'Maks z całej historii', v: kg(b), hot: 1 }, { l: 'Maks z 6 tygodni', v: rec ? kg(rec) : '–' }])}<p>Na tej podstawie ciężar roboczy: ${[[.85, 5], [.75, 8], [.7, 10], [.65, 12]].map(([p, r]) => `<b>${r}</b> powt. — ${kg(Math.round(b * p / (F.S.settings.step || 2.5)) * (F.S.settings.step || 2.5))}`).join(', ')}.</p><p class="ak-s">Wyliczone wzorem Epleya.</p>`, acts: [exLink(ex)], chips: [`Postęp — ${ex.name}`, `Rekord — ${ex.name}`] };
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
    const m = c.q.toLowerCase().replace(/(\d)[,.](\d)/g, '$1.$2').match(/(\d+(?:\.\d+)?)/); if (!m && /jakie|moje|mam\b/.test(c.n)) return H.settings(c); if (!m) return { html: '<p>Podaj ciężar, np. „talerze na 120”.</p>', chips: ['Talerze na 100', 'Talerze na 140'] };
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
    if (/jak dlugo|ile (trwa|godzin)|ile czasu/.test(c.n)) { const k = H.know({ ...c, q: 'regeneracja ile trwa regeneracja' }); if (k) { const r = S().length ? H.recovery({ ...c, n: '', q: '' }) : null; return { html: `<p>W FORGE regeneracja partii jest liczona modelem: duże partie 24–72 h, małe 18–48 h — im więcej serii zrobiłeś, tym dłużej.</p>${k.html}${r ? r.html : ''}`, acts: [{ l: 'Mapa regeneracji', i: 'activity', href: '#/stats', a: 'askRegen' }], chips: ['Czy mogę dziś trenować nogi?', 'Czy trening do upadku ma sens?'] }; } }
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
    return { html: `<p>${when === 'dziś' ? 'Dziś' : when === 'jutro' ? 'Jutro' : 'Następny trening'}: <b>${E(day.name)}</b>${when !== 'dziś' && when !== 'jutro' && q0 ? ` — ${when}` : ''}${est ? `, ${est} min` : ''}.</p>${rows(day.items.slice(0, 9).map(i => { const ex = F.S.ex.get(i.exId); return { i: F.mDot(ex && ex.muscle), l: E(ex ? ex.name : i.exId), v: i.cardio ? F.fmtDur(+i.reps || 0) : `${i.sets}×${i.reps}` }; }))}`, acts: [{ l: 'Zacznij trening', i: 'play', a: 'startDay', d: { p: nx.plan.id, d: day.id } }, { l: 'Kalendarz', i: 'calendar', href: '#/calendar' }], chips: ['Jakie mam ciężary na dziś?', 'Czy mogę dziś trenować nogi?', 'Kiedy ostatnio trenowałem?'] };
  };

  H.muscleSets = c => {
    if (!S().length) return noData(); const ms = c.mus || (c.ex ? [c.ex.muscle] : null); const t = c.time && c.time.kind === 'range' ? c.time : { from: F.startOfWeek(Date.now()), to: Date.now() + 1, label: 'w tym tygodniu' };
    const list = (ms || F.BODY_ORDER).map(m => ({ m, v: weekSets(m, t.from, t.to), r: volRange(m) }));
    const wk = Math.max(1, (t.to - t.from) / WK);
    if (!ms && !list.some(x => x.v.all > 0)) return { html: `<p>${cap(t.label)} nie ma jeszcze serii. Ostatni trening: ${dd(S()[0].start)}.</p>`, chips: ['Ile serii w zeszłym tygodniu?', 'Co zaniedbuję?'] };
    return { html: `<p>Serie ${t.label} (ruch główny liczy się za 1, mięśnie pomocnicze za 0,5 — jak na ekranie Mięśnie)${wk > 1.5 ? ', średnio na tydzień' : ''}:</p>${rows(list.filter(x => ms || x.v.all > 0).map(x => ({ i: F.mDot(x.m), l: cap(mName(x.m)), v: `${F.fmtNum(x.v.all / (wk > 1.5 ? wk : 1), 1)} <small>/ ${x.r[0]}–${x.r[1]}</small>` })))}<p class="ak-s">Obok zalecany zakres FORGE dla celu: ${F.volLabel()} (oparty na ACSM 2026).</p>`, chips: ['Co zaniedbuję?', 'Ile serii robić tygodniowo?'] };
  };

  H.neglect = c => {
    if (!S().length) return noData(); const now = Date.now(); const list = F.BODY_ORDER.map(m => ({ m, v: weekSets(m, now - 28 * DAY, now + 1).all / 4, r: volRange(m) })).filter(x => x.r[1] > 0);
    const low = list.filter(x => x.v < x.r[0]).sort((a, b) => a.v / a.r[0] - b.v / b.r[0]), high = list.filter(x => x.v > x.r[1] * 1.25);
    return { html: `<p>Średnio z ostatnich 4 tygodni, względem zaleceń dla Twojego celu:</p>${low.length ? `<p><b>Za mało:</b></p>${rows(low.map(x => ({ i: F.mDot(x.m), l: cap(mName(x.m)), v: `${F.fmtNum(x.v, 1)} <small>/ min. ${x.r[0]}</small>` })))}` : '<p>Żadna partia nie jest zaniedbana.</p>'}${high.length ? `<p><b>Dużo powyżej zakresu:</b> ${high.map(x => mName(x.m)).join(', ')}. Więcej nie zawsze znaczy lepiej — nadmiar utrudnia regenerację.</p>` : ''}`, chips: low.length ? [`Ćwiczenia na ${ACC[low[0].m]}`, 'Ile serii robić tygodniowo?'] : ['Jak mi poszedł ten miesiąc?'] };
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
    const extraF = /na mase|nadwyz|przytyc/.test(c.n) ? 'bulk' : /redukc|schudn|chudn|deficyt/.test(c.n) ? 'cutRate' : ''; const extra = extraF ? `<p>${extraF === 'bulk' ? `Na masę: <b>${F.fmtNum(Math.round(np.tdee * 1.1 / 10) * 10, 0)} kcal</b> (nadwyżka 10%).` : `Na redukcję: <b>${F.fmtNum(Math.round((np.tdee - Math.min(np.tdee * 0.15, 500)) / 10) * 10, 0)} kcal</b> (deficyt 15%, maks. 500 kcal).`} Tryb zmienisz na ekranie Żywienie.</p><p class="ak-s">${E(F.KB.facts[extraF].pl)}</p>` : '';
    return { html: `${extra}${tiles([{ l: 'Zapotrzebowanie', v: `${F.fmtNum(np.tdee, 0)} kcal`, s: `w tym treningi ${F.fmtNum(np.train, 0)} kcal/dzień` }, { l: 'Cel · ' + MODE[np.mode], v: `${F.fmtNum(np.k, 0)} kcal`, hot: 1 }])}${rows([{ l: 'Białko', v: `${np.prot} g` }, { l: 'Tłuszcze', v: `${np.fat} g` }, { l: 'Węglowodany', v: `${np.carb} g` }])}<p>${E(np.note)}</p><p class="ak-s">Zapotrzebowanie wyliczone wzorem Mifflina–St Jeora z poziomem aktywności i spalaniem z Twoich treningów z 4 tygodni.</p>`, acts: [{ l: 'Żywienie', i: 'flame', href: '#/nutrition' }], chips: ['Ile białka jeść?', 'Ile ważę?', 'Jak schudnąć?'] };
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
    return { html: `<p>Twój plan: <b>${E(p.name)}</b>${g ? ` — cel: ${E(g.toLowerCase())}` : ''}.${wd ? ` Dni treningowe: ${wd}.` : ''}</p>${rows(p.days.map(d => ({ l: E(d.name), v: `${d.items.length} ćw. · ${F.PLN && F.PLN.estMin ? F.PLN.estMin(d.items) : '–'} min` })))}`, acts: [{ l: 'Otwórz plan', i: 'clipboard-list', href: '#/plan/' + p.id }, { l: 'Kalendarz', i: 'calendar', href: '#/calendar' }], chips: ['Kiedy trenuję w tym tygodniu?', 'Co mam dziś?', 'Ile mam przerwy?'] };
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
    return { html: `${tiles([{ l: 'Ostatni trening', v: F.fmtDurHuman(l[0].dur), s: dd(l[0].start) }, { l: `Średnio (${l.length} ost.)`, v: F.fmtDurHuman(avg), hot: 1 }])}${nx && F.PLN && F.PLN.estMin ? `<p>Najbliższy trening (${E(nx.day.name)}) według planu: ${F.PLN.estMin(nx.day.items)} min.</p>` : ''}<p class="ak-s">Czas liczony od startu do zakończenia treningu w aplikacji.</p>`, chips: ['Ile treningów w tym miesiącu?', 'Ile mam przerwy?'] }; };
  H.since = c => { if (!S().length) return noData(); const t = F.totals(), first = S()[S().length - 1]; const fav = topUsed(3);
    return { html: `<p>Trenujesz z FORGE od <b>${dd(first.start)}</b> (${ago(first.start)}).</p>${tiles([{ l: 'Treningi', v: t.count, hot: 1 }, { l: 'Tonaż łącznie', v: F.fmtVol(t.vol) }, { l: 'Serie', v: F.fmtNum(t.sets, 0) }])}${rows([{ l: 'Czas pod sztangą', v: F.fmtDurHuman(t.dur) }, { l: 'Powtórzenia', v: F.fmtNum(t.reps, 0) }, { l: 'Rekordy', v: t.prs }])}${fav.length ? `<p>Najczęściej robisz: ${fav.map(e => `<b>${E(e.name)}</b>`).join(', ')}.</p>` : ''}`, acts: [{ l: 'Historia', i: 'history', href: '#/history' }], chips: ['Moje rekordy', 'Jaka jest moja ranga?', 'Jak mi idzie?'] }; };
  H.burn = c => { if (!S().length) return noData(); const t = c.time && c.time.kind === 'range' ? c.time : { from: F.startOfWeek(Date.now()), to: Date.now() + 1, label: 'w tym tygodniu' }; let list = S().filter(s => inRange(t, s));
    if ((/ostatni|tym treningu|dzisiejsz|spala (moj )?trening|jeden trening/.test(c.n) || !list.length) && !c.time) { list = S().slice(0, 1); t.label = `na ostatnim treningu (${dd(list[0].start)})`; }
    const k = list.reduce((a, s) => a + F.sessKcal(s).net, 0);
    return { html: `<p>${cap(t.label)}: ok. <b>${F.fmtNum(Math.round(k / 10) * 10, 0)} kcal</b> ponad spoczynek${list.length > 1 ? ` w ${list.length} treningach` : ''}.</p><p class="ak-s">Wyliczone z czasu treningu, masy ciała i wykonanej pracy, w zakresie wydatku energii treningu oporowego z Kompendium Aktywności Fizycznych 2024 (3,5–6 MET).</p>`, acts: [{ l: 'Żywienie', i: 'flame', href: '#/nutrition' }], chips: ['Ile kalorii potrzebuję?', 'Ile białka jeść?'] }; };
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
    return { html: `<p>Najbliższy trening <b>${E(nx.day.name)}</b> to ${full} min. Przy mniejszej ilości czasu zrób najpierw ćwiczenia wielostawowe — ACSM (2009) zaleca kolejność: duże partie i ćwiczenia wielostawowe przed izolowanymi.</p>${rows(main.map(i => { const ex = F.S.ex.get(i.exId); return { i: F.mDot(ex.muscle), l: E(ex.name), v: `${i.sets}×${i.reps}` }; }))}<p>Same ćwiczenia wielostawowe: ok. <b>${est} min</b>${lim ? (est <= lim ? ` — zmieścisz się w ${lim} min.` : ` — więcej niż ${lim} min, więc zrób po jednej serii mniej w każdym.`) : '.'}</p>`, acts: [{ l: 'Zacznij trening', i: 'play', a: 'startDay', d: { p: nx.plan.id, d: nx.day.id } }], chips: ['Ile mam przerwy?', 'Jakie mam ciężary na dziś?'] }; };
  H.tired = c => { const a = S().length ? H.recovery({ ...c, mus: null, ex: null }) : null;
    return { html: `<p>Twoje samopoczucie, sen i stres nie są w danych, więc tego nie ocenię. Z treningów widzę stan mięśni:</p>${a ? a.html : '<p>Brak treningów do oceny.</p>'}<p>Przy słabszym dniu możesz zrobić trening z większym zapasem powtórzeń. Gdy zmęczenie trwa dłużej, a wyniki stoją, rozważ tydzień odciążenia.</p>`, chips: ['Czy potrzebuję odciążenia?', 'Ile spać?', 'Mam mało czasu dziś'] }; };
  H.ack = c => ({ html: '<p>Jasne. W czym jeszcze mogę pomóc?</p>', chips: startChips() });


  /* ================= ŻYWIENIE ================= */
  const npOk = () => { const np = F.nutPlan ? F.nutPlan() : { missing: true }; if (np.block) return { err: { html: `<p>${E(np.block)}</p>` } }; if (np.missing) return { err: { html: '<p>Do wyliczeń żywienia potrzebuję płci, daty urodzenia, wzrostu, masy ciała i aktywności w ciągu dnia. Uzupełnisz je w Ustawieniach → Profil.</p>', acts: [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }] } }; return { np }; };
  const mealHtml = m => `<div class="ak-meal"><div class="ak-meal-h"><b>${E(m.name)}</b><small>${Math.round(m.tot.k)} kcal · B ${Math.round(m.tot.p)} g · W ${Math.round(m.tot.c)} g · T ${Math.round(m.tot.f)} g</small></div>${m.rows.map(r => `<div class="ak-r"><span>${E(r.name)}</span><b>${r.id === 'egg' ? Math.max(1, r.unit) + ' szt.' : r.g + ' g'}</b></div>`).join('')}</div>`;
  const vegOf = n => /bez miesa|wege|wegetar|wegan|roslinn/.test(n) || !!((F.S.settings.nut || {}).veg);
  let seedN = 0;
  H.meals = c => { const o = npOk(); if (o.err) return o.err; const np = o.np, nu = F.S.settings.nut || {}; const m = c.n.match(/\b([345])\s*posil/); const n = m ? +m[1] : nu.meals || 4, veg = vegOf(c.n);
    const meals = F.mealPlan(np, n, veg, (F.ui.nutSeed || 0) + seedN++); const tot = meals.reduce((a, x) => ({ k: a.k + x.tot.k, p: a.p + x.tot.p }), { k: 0, p: 0 });
    return { html: `<p>Przykładowy dzień pod Twój cel: <b>${F.fmtNum(np.k, 0)} kcal</b>, białko <b>${np.prot} g</b>${veg ? ', bez mięsa i ryb' : ''}.</p>${meals.map(mealHtml).join('')}<p><b>Razem:</b> ${Math.round(tot.k)} kcal · białko ${Math.round(tot.p)} g.</p><p class="ak-s">Ten sam układ co na ekranie Żywienie. Wagi produktów surowych, chyba że podano inaczej. Zamieniaj produkty na podobne.</p>`, acts: [{ l: 'Żywienie', i: 'flame', href: '#/nutrition' }], chips: ['Inna propozycja posiłków', veg ? 'Rozpisz posiłki na dziś z mięsem' : 'Posiłki na dziś bez mięsa', 'Posiłek po treningu', n === 4 ? 'Rozpisz 5 posiłków' : 'Rozpisz 4 posiłki'] }; };
  const oneMeal = (np, K, P, veg, snack) => { const sh = snack ? 0.12 : 0.4, idx = snack ? 2 : 1, ratio = K / np.k; const f = { ...np, k: K / sh, prot: P / sh, carb: np.carb * ratio / sh, fat: np.fat * ratio / sh }; return F.mealPlan(f, snack ? 4 : 3, veg, seedN++)[idx]; };
  H.postMeal = c => { const o = npOk(); if (o.err) return o.err; const np = o.np, veg = vegOf(c.n), pre = /przed trening/.test(c.n);
    const per = Math.round(0.25 * np.refMass / 5) * 5; const full = oneMeal(np, np.k * 0.3, Math.max(per, np.prot * 0.3), veg, false); full.name = pre ? 'Posiłek przed treningiem' : 'Posiłek po treningu'; const quick = oneMeal(np, np.k * 0.14, per, veg, true); quick.name = 'Szybka opcja';
    return { html: `<p>W jednym posiłku miej co najmniej ok. <b>${per} g białka</b> (0,25 g na kg masy ciała; ISSN 2017 podaje 20–40 g na porcję). Twój cel dzienny to ${np.prot} g — rozłóż go na kilka posiłków co 3–4 godziny.</p>${mealHtml(full)}${mealHtml(quick)}<p class="ak-s">ISSN (2017): najważniejsza jest dzienna suma białka rozłożona mniej więcej co 3 godziny; białko przed lub po treningu może wspierać siłę i skład ciała, a po treningu najlepiej w ciągu ok. 2 godzin. Produkty z planu żywienia w aplikacji.</p>`, acts: [{ l: 'Żywienie', i: 'flame', href: '#/nutrition' }], chips: ['Inna propozycja posiłku po treningu', 'Rozpisz posiłki na dziś', 'Ile białka jeść?'] }; };
  H.foodLeft = c => { const o = npOk(); if (o.err) return o.err; return { html: `<p>FORGE nie zapisuje tego, co jesz, więc nie wiem, ile już zjadłeś. Cel na cały dzień: <b>${o.np.k} kcal</b>, białko <b>${o.np.prot} g</b>, tłuszcz ${o.np.fat} g, węglowodany ${o.np.carb} g.</p>`, chips: ['Rozpisz posiłki na dziś', 'Posiłek po treningu'] }; };

  /* ================= CARDIO ================= */
  H.cardio = c => { const ws = F.startOfWeek(Date.now()); const t = c.time && c.time.kind === 'range' ? c.time : { from: ws, to: Date.now() + 1, label: 'w tym tygodniu' }; const w = F.cardioWeek(t.from, t.to);
    const p = planNow(); const band = p && p.meta && p.meta.cardio && p.meta.cardio.band; const pend = F.pendCardio ? F.pendCardio() : [];
    return { html: `<p>Cardio ${t.label}: <b>${w.raw} min</b> zapisane (ok. ${w.eq} min w przeliczeniu na umiarkowane — intensywne liczy się podwójnie, lekkie wcale).</p>${band ? `<p>Cel z Twojego planu: ${band[0]}–${band[1]} min tygodniowo. ${w.eq >= band[0] ? '<b>Osiągnięty.</b>' : `Brakuje ok. <b>${band[0] - w.eq} min</b>.`}</p>` : ''}${pend.length ? `<p>Do dokończenia: ${pend.map(x => `${E(F.exName(x.p.exId))} ${x.p.mins} min`).join(', ')}.</p>` : ''}<p class="ak-s">WHO: dorośli 150–300 min umiarkowanej albo 75–150 min intensywnej aktywności tlenowej tygodniowo.</p>`, acts: [{ l: 'Raport', i: 'file-text', href: '#/report' }], chips: ['Czy cardio zabija mięśnie?', 'Ile kalorii spaliłem w tym tygodniu?'] }; };

  /* ================= SIŁA: NORMY, DOTS, ZAWODY, % ================= */
  const sexK = () => F.S.settings.sex === 'f' ? 'f' : F.S.settings.sex === 'm' ? 'm' : '';
  H.strength = c => { const sx = sexK(), bw = F.latestBW(); if (!sx || !bw) return { html: '<p>Do poziomu siły potrzebuję płci i masy ciała. Uzupełnisz je w Postępy → Siła.</p>', acts: [{ l: 'Postępy', i: 'chart-line', href: '#/stats', a: 'askStr' }] };
    const { STD, LV } = F.STRSTD; const ids = c.ex && STD[c.ex.id] ? [c.ex.id] : Object.keys(STD);
    const r = ids.map(id => { const e1 = F.bestE1(id), ratio = e1 / bw, th = STD[id][sx]; let lv = 0; th.forEach(x => { if (ratio >= x) lv++; }); return { id, n: STD[id].n, e1, ratio, lv, next: lv < 5 ? th[lv] * bw - e1 : 0 }; });
    const l3 = ['squat', 'bench', 'deadlift'].map(F.bestE1), tot = l3.every(x => x > 0) ? l3.reduce((a, b) => a + b, 0) : 0;
    return { html: `<p>Poziom siły (wielokrotność masy ciała ${kg(bw)}):</p>${rows(r.map(x => ({ l: `${E(x.n)} <small>${x.e1 ? `${kg(x.e1)} · ${F.fmtNum(x.ratio, 2)}× masy${x.lv < 5 ? ` · do „${LV[x.lv + 1]}” brakuje ${kg(Math.max(0, x.next))}` : ''}` : 'brak serii do 10 powt.'}</small>`, v: x.e1 ? LV[x.lv] : '–' })))}${tot ? tiles([{ l: 'Trójbój', v: kg(tot), hot: 1, s: 'suma maksów' }, { l: 'DOTS', v: F.fmtNum(F.dots(tot, bw, sx), 1), s: 'wzór DOTS' }, { l: 'Wilks', v: F.fmtNum(F.wilks(tot, bw, sx), 1), s: 'wzór 2020' }]) : ''}<p class="ak-s">Progi poziomów to wielokrotności masy ciała przyjęte w FORGE (nie z badania naukowego); DOTS i Wilks to wzory używane w trójboju. Liczone z wyliczonych maksów (serie do 10 powtórzeń).</p>`, acts: [{ l: 'Postępy → Siła', i: 'chart-line', href: '#/stats', a: 'askStr' }], chips: ['Podejścia na zawody', 'Moje rekordy', 'Co stoi w miejscu?'] }; };
  H.comp = c => { const nums = (c.q.match(/\d+(?:[.,]\d+)?/g) || []).map(x => +x.replace(',', '.')).filter(x => x >= 20);
    const lifts = c.ex && ['squat', 'bench', 'deadlift'].includes(c.ex.id) ? [[c.ex.id, c.ex.name]] : [['squat', 'Przysiad'], ['bench', 'Wyciskanie leżąc'], ['deadlift', 'Martwy ciąg']];
    const r25 = v => Math.round(v / 2.5) * 2.5; let out = lifts.map(([id, nm], i) => { const t = nums.length === 1 ? F.fromDisp(nums[0]) : nums[i] ? F.fromDisp(nums[i]) : r25(F.bestE1(id)); return { nm, t }; }).filter(x => x.t > 0); if (nums.length === 1 && lifts.length > 1) out = [{ nm: 'Plan na 3. podejście ' + kg(F.fromDisp(nums[0])), t: F.fromDisp(nums[0]) }];
    if (!out.length) return { html: '<p>Podaj planowany ciężar 3. podejścia, np. „podejścia na zawody 180”.</p>' };
    return { html: `<p>Plan podejść (otwarcie ok. 91%, drugie 96,5%, trzecie 100%, zaokrąglone do 2,5 kg):</p>${rows(out.map(x => ({ l: E(x.nm), v: [.91, .965, 1].map(p => F.fw(r25(x.t * p))).join(' → ') + ' ' + F.unit() })))}${nums.length ? '' : '<p class="ak-s">Jako 3. podejście wziąłem Twoje wyliczone maksy.</p>'}`, acts: [{ l: 'Narzędzia', i: 'calculator', href: '#/tools' }], chips: ['Jaki mam poziom siły?', 'Moje rekordy'] }; };
  H.pct = c => { const m = c.q.replace(/(\d),(\d)/g, '$1.$2').match(/(\d{2,3})\s*%/); const p = m ? +m[1] : 0; const nums = (c.q.replace(/\d{2,3}\s*%/, '').match(/\d+(?:[.,]\d+)?/g) || []).map(x => +x.replace(',', '.'));
    const base = nums.length ? F.fromDisp(nums[0]) : c.ex ? F.bestE1(c.ex.id) : 0; if (!base) return needEx(c, 'pct', 'Od którego ćwiczenia liczyć procent maksa?');
    const step = F.S.settings.step || 2.5, rr = v => Math.round(v / step) * step;
    const lab = nums.length ? kg(base) : `wyliczonego maksa (${kg(base)}) — ${E(c.ex.name)}`;
    return { html: p ? `<p><b>${p}%</b> z ${lab} to <b>${kg(rr(base * p / 100))}</b>.</p>` : `<p>Procenty z ${lab}:</p>${rows([95, 90, 85, 80, 75, 70, 65, 60].map(x => ({ l: `${x}%`, v: kg(rr(base * x / 100)) })))}`, chips: c.ex ? [`Talerze na ${F.fmtNum(F.toDisp(rr(base * (p || 80) / 100)), 1)}`, `Postęp — ${c.ex.name}`] : [] }; };
  H.repBest = c => { if (!c.ex) return needEx(c, 'repBest', 'Dla którego ćwiczenia?'); const m = c.n.match(/(\d+)\s*(powt|razy|x)/) || c.n.match(/na (\d+)/); const r = m ? +m[1] : 0; if (!r) return H.record(c);
    let best = null; S().forEach(s => s.exercises.forEach(e => { if (e.exId !== c.ex.id) return; e.sets.filter(isWork).forEach(x => { if ((x.r || 0) >= r && (!best || (x.w || 0) > best.w)) best = { w: x.w || 0, r: x.r, ts: s.start }; }); }));
    if (!best) return { html: `<p>Nie masz serii z co najmniej ${r} powtórzeniami w ćwiczeniu <b>${E(c.ex.name)}</b>.</p>` };
    const e1 = F.bestE1(c.ex.id), est = e1 ? e1 / (1 + r / 30) : 0;
    return { html: `<p>Najwięcej na ${r} ${F.plur(r, 'powtórzenie', 'powtórzenia', 'powtórzeń')} w <b>${E(c.ex.name)}</b>: <b>${kg(best.w)} × ${best.r}</b> (${dd(best.ts)}).</p>${est ? `<p>Z wyliczonego maksa wynika, że na ${r} powtórzeń stać Cię na ok. <b>${kg(Math.round(est / 2.5) * 2.5)}</b> (wzór Epleya).</p>` : ''}`, acts: [exLink(c.ex)], chips: [`Rekord — ${c.ex.name}`, `Postęp — ${c.ex.name}`] }; };

  /* ================= CIAŁO: POMIARY, BMI ================= */
  const MK = [[/talia|talii|w pasie|pas\b/, 'waist'], [/klat/, 'chest'], [/biodr/, 'hips'], [/ramie|ramienia|biceps|bicka/, 'arm'], [/przedrami/, 'forearm'], [/udo|uda\b|udzie/, 'thigh'], [/lydk/, 'calf'], [/kark|szyj/, 'neck'], [/bark/, 'shoulders'], [/tluszcz|fat|bf\b/, 'bf']];
  H.measure = c => { const ms = F.S.measures || []; if (!ms.length) return { html: '<p>Nie masz jeszcze pomiarów. Dodasz je w Postępy → Ciało → Pomiary: klatka, talia, biodra, ramię, udo, łydka i inne.</p>', acts: [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }] };
    const MF = F.MEASF; const k = (MK.find(([re]) => re.test(c.n)) || [])[1]; const keys = k ? [k] : MF.map(x => x[0]);
    const latest = key => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i].v[key] != null) return ms[i]; return null; }; const first = key => ms.find(m => m.v[key] != null);
    const r = keys.map(key => { const l = latest(key), f = first(key), def = MF.find(x => x[0] === key); if (!l) return null; const d = l.v[key] - f.v[key]; return { l: `${def[1]} <small>${dd(l.date)}</small>`, v: `${F.fmtNum(l.v[key], 1)} ${def[2]}${l !== f ? ` <small>${d > 0 ? '+' : d < 0 ? '−' : ''}${F.fmtNum(Math.abs(d), 1)} od ${dd(f.date)}</small>` : ''}` }; }).filter(Boolean);
    if (!r.length) return { html: `<p>Nie masz pomiaru: ${MF.find(x => x[0] === k)[1].toLowerCase()}.</p>`, acts: [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }] };
    const pts = k ? ms.filter(m => m.v[k] != null).map(m => ({ x: m.date, y: m.v[k], tip: `${dd(m.date)}: ${F.fmtNum(m.v[k], 1)}` })) : [];
    return { html: `<p>Twoje pomiary:</p>${rows(r)}${spark(pts)}`, acts: [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }], chips: ['Ile ważę?', 'Jakie mam BMI?'] }; };
  H.bmi = c => { const p = F.profile(); if (!p.heightKnown || !p.bwKnown) return { html: '<p>Do BMI potrzebuję wzrostu i masy ciała. Uzupełnij je w Ustawieniach → Profil.</p>', acts: [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }] };
    const b = p.bw / Math.pow(p.height / 100, 2); const cat = b < 18.5 ? 'niedowaga' : b < 25 ? 'prawidłowa masa ciała' : b < 30 ? 'nadwaga' : 'otyłość';
    return { html: `${tiles([{ l: 'BMI', v: F.fmtNum(b, 1), hot: 1, s: cat }, { l: 'Masa / wzrost', v: `${F.fmtNum(p.bw, 1)} kg`, s: `${p.height} cm` }])}<p class="ak-s">Klasyfikacja WHO: poniżej 18,5 niedowaga, 18,5–24,9 norma, 25–29,9 nadwaga, od 30 otyłość. Przy dużej masie mięśniowej BMI zawyża wynik — dokładniej pokazuje obwód talii albo procent tłuszczu.</p>`, chips: ['Moje pomiary', 'Ile kalorii potrzebuję?'] }; };

  /* ================= OSIĄGNIĘCIA, ANALIZA PLANU ================= */
  H.achieve = c => { const a = F.achievements(), done = a.filter(x => x.done), todo = a.filter(x => !x.done).sort((x, y) => y.cur / y.goal - x.cur / x.goal);
    const f = (x, v) => x.id.startsWith('v') ? F.fmtVol(v) : x.id.match(/bench|squat|dead/) ? kg(v) : F.fmtNum(v, 0);
    return { html: `<p>Masz <b>${done.length}</b> z ${a.length} osiągnięć.</p>${done.length ? `<p>Zdobyte: ${done.map(x => `<b>${E(x.name)}</b>`).join(', ')}.</p>` : ''}${todo.length ? `<p>Najbliżej:</p>${todo.slice(0, 4).map(x => `<div class="ak-goal"><div><b>${E(x.name)}</b><span>${f(x, x.cur)} / ${f(x, x.goal)}</span></div><i class="bar"><i style="width:${Math.min(100, x.cur / x.goal * 100).toFixed(0)}%"></i></i><small class="ak-s">${E(x.desc)}</small></div>`).join('')}` : ''}`, acts: [{ l: 'Osiągnięcia', i: 'trophy', href: '#/stats', a: 'askOver' }], chips: ['Jaka jest moja ranga?', 'Moje rekordy'] }; };
  H.coach = c => { const p = planNow(); if (!p) return { html: '<p>Nie masz planu do oceny.</p>', acts: [{ l: 'Kreator planu', i: 'sparkles', href: '#/wizard' }] }; const an = F.coachAnalyze(p);
    return { html: `<p>Analiza planu <b>${E(p.name)}</b>${an.meso ? ` — tydzień ${an.week} z ${an.meso}` : ''}. Ostatnie 2 tygodnie: ${an.done[1]} i ${an.done[0]} z ${an.planned} treningów.</p>${an.items.length ? `<ul class="ak-ul">${an.items.map(i => `<li><b>${E(i.t)}</b> ${E(i.d)}</li>`).join('')}</ul>` : '<p>Nie widzę nic do zmiany — plan działa.</p>'}<p class="ak-s">Ta sama analiza co w Raporcie. Przyciski do korekt (seria mniej, zamiana ćwiczenia) są w Raporcie.</p>`, acts: [{ l: 'Raport i korekty', i: 'file-text', href: '#/report' }], chips: ['Co stoi w miejscu?', 'Czy potrzebuję odciążenia?', 'Co zaniedbuję?'] }; };

  /* ================= TRENINGI: KONKRETNY DZIEŃ, TRWAJĄCY, STOPER ================= */
  const sessHtml = s => `<div class="ak-meal"><div class="ak-meal-h"><b>${E(s.name)}</b><small>${dd(s.start)} · ${s.dur ? F.fmtDurHuman(s.dur) + ' · ' : ''}${F.fmtVol(F.sessionVolume(s))}</small></div>${s.exercises.map(e => { const ex = F.S.ex.get(e.exId); const ws = e.sets.filter(isWork); return ws.length ? `<div class="ak-r">${F.mDot(ex && ex.muscle)}<span>${E(F.exName(e.exId))}</span><b>${ws.map(x => ex && ex.type === 'time' ? F.fmtDur(x.r) : ex && ex.type === 'br' ? x.r : `${F.fw(x.w)}×${x.r}`).join(', ')}</b></div>` : ''; }).join('')}</div>`;
  H.session = c => { if (!S().length) return noData(); let list = c.time && c.time.kind === 'range' ? S().filter(s => inRange(c.time, s)) : S().slice(0, 1);
    if (!list.length) { const near = c.time ? nearest(S(), (c.time.from + c.time.to) / 2) : null; return { html: `<p>${cap(c.time.label)} nie było treningu.${near ? ` Najbliższy: <b>${E(near.name)}</b>, ${dd(near.start)}.` : ''}</p>`, chips: near ? [`Co robiłem ${near.start ? new Date(near.start).getDate() + ' ' + MONG[new Date(near.start).getMonth()] : ''}?`] : [] }; }
    list = list.slice(0, 3);
    return { html: `<p>${c.time ? cap(c.time.label) : 'Ostatni trening'}:</p>${list.map(sessHtml).join('')}`, acts: list.length === 1 ? [{ l: 'Otwórz trening', i: 'history', href: '#/session/' + list[0].id }] : [{ l: 'Historia', i: 'history', href: '#/history' }], chips: ['Jak mi idzie?', 'Najlepszy trening'] }; };
  H.live = c => { const d = F.S.draft; if (!d) return { html: '<p>Nie masz teraz trwającego treningu.</p>', chips: ['Co mam dziś?'] };
    const all = d.exercises.reduce((a, e) => a + e.sets.length, 0), done = d.exercises.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0); const cur = d.exercises.find(e => e.sets.some(x => !x.done));
    const left = d.exercises.filter(e => e.sets.some(x => !x.done)).length;
    return { html: `<p>Trening <b>${E(d.name)}</b> trwa ${F.fmtDurHuman((Date.now() - d.start) / 1000)}.</p>${tiles([{ l: 'Serie', v: `${done} / ${all}`, hot: 1 }, { l: 'Ćwiczenia do końca', v: left }])}${cur ? `<p>Teraz: <b>${E(F.exName(cur.exId))}</b>.</p>` : '<p>Wszystkie serie odhaczone — możesz zakończyć trening.</p>'}${F.rest ? `<p>Przerwa: zostało ${F.fmtDur(Math.max(0, Math.round((F.rest.end - Date.now()) / 1000)))}.</p>` : ''}`, acts: [{ l: 'Wróć do treningu', i: 'play', href: '#/workout' }], chips: cur ? [`Technika — ${F.exName(cur.exId)}`, `Cel na dziś — ${F.exName(cur.exId)}`] : [] }; };
  H.timer = c => { const n = c.n;
    if (/(zatrzymaj|stop|pomin|wylacz|koniec|anuluj)/.test(n)) { if (!F.rest) return { html: '<p>Stoper nie działa.</p>' }; F.restStop(false); return { html: '<p>Zatrzymałem przerwę.</p>', chips: ['Włącz przerwę 90 s'] }; }
    if (/(ile zostal|ile jeszcze)/.test(n) && F.rest) return { html: `<p>Do końca przerwy: <b>${F.fmtDur(Math.max(0, Math.round((F.rest.end - Date.now()) / 1000)))}</b>.</p>` };
    let sec = 0; const m = n.match(/(\d+(?:[.,]\d+)?)\s*(min|minut|m\b)/) , m2 = n.match(/(\d+)\s*(s|sek|sekund)/), m3 = n.match(/(\d+):(\d\d)/);
    if (m3) sec = +m3[1] * 60 + +m3[2]; else if (m) sec = Math.round(parseFloat(m[1].replace(',', '.')) * 60) + (m2 ? +m2[1] : 0); else if (m2) sec = +m2[1]; else if (/poltorej|pol(tora)? minut/.test(n)) sec = 90;
    if (!sec) { sec = F.autoRest({ compound: true }); }
    sec = Math.min(1800, Math.max(5, sec)); F.restStart(sec, 'Przerwa');
    return { html: `<p>Włączyłem przerwę: <b>${F.fmtDur(sec)}</b>. Sygnał usłyszysz na końcu${F.S.settings.restWarn ? `, ostrzeżenie ${F.S.settings.restWarn} s wcześniej` : ''}.</p>`, acts: [{ l: 'Stoper', i: 'timer', href: '#/tools' }], chips: ['Ile zostało przerwy?', 'Zatrzymaj przerwę', 'Dodaj 30 s'] }; };
  H.timerAdd = c => { if (!F.rest) return H.timer(c); const m = c.n.match(/(\d+)/); const s = m ? +m[1] * (/min/.test(c.n) ? 60 : 1) : 30; F.restAdd(/odejm|minus|krocej|mniej/.test(c.n) ? -s : s); return { html: `<p>Zmieniłem przerwę. Zostało: <b>${F.fmtDur(Math.max(0, Math.round((F.rest.end - Date.now()) / 1000)))}</b>.</p>`, chips: ['Zatrzymaj przerwę'] }; };

  /* ================= APLIKACJA: USTAWIENIA, BAZA, PLANY, PORADY, INFO ================= */
  H.settings = c => { const s = F.S.settings; const vol = { n: 'normalna', l: 'głośna', m: 'maks' }[s.vol] || 'głośna';
    return { html: `<p>Twoje ustawienia:</p>${rows([{ l: 'Jednostki', v: s.unit === 'lb' ? 'funty' : 'kilogramy' }, { l: 'Gryf', v: kg(s.bar) }, { l: 'Talerze', v: [...s.plates].sort((a, b) => b - a).map(p => F.fmtNum(F.toDisp(p), 2)).join(', ') }, { l: 'Krok ciężaru', v: kg(s.step) }, { l: 'Przerwy w planie', v: (() => { const r = F.restProfile(F.curPlan()); return `${rt(r.main)} / ${rt(r.sec)} / ${rt(r.iso)}`; })() }, { l: 'Cel tygodniowy', v: `${s.weeklyGoal} ${F.plur(s.weeklyGoal, 'trening', 'treningi', 'treningów')}` }, { l: 'Głośność sygnału', v: vol }, { l: 'Ostrzeżenie przed końcem przerwy', v: s.restWarn ? s.restWarn + ' s' : 'wyłączone' }, { l: 'Automatyczna progresja', v: s.autoProg === false ? 'wyłączona' : 'włączona' }, { l: 'Powiadomienia z serwera', v: F.pushOn && F.pushOn() ? 'połączone' : 'wyłączone' }, { l: 'Ostatnia kopia zapasowa', v: s.lastBackup ? dd(s.lastBackup) : 'nigdy' }])}${!s.lastBackup || Date.now() - s.lastBackup > 14 * DAY ? '<p><b>Zrób kopię zapasową</b> — dane są tylko w tym telefonie.</p>' : ''}`, acts: [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }], chips: ['Jak zrobić kopię zapasową?', 'Jakie mam talerze?'] }; };
  H.exdb = c => { const all = [...F.S.ex.values()], mine = all.filter(e => e.custom); const ms = findMus(c.q); const eq = findEq(c.n);
    const sub = all.filter(e => (!ms || ms.includes(e.muscle)) && (!eq || eq.includes(e.equip)));
    return { html: `<p>W bazie jest <b>${all.length}</b> ćwiczeń${ms || eq ? `, z tego ${ms ? 'na ' + mAcc(ms) : ''}${eq ? ' ze sprzętem: ' + eq.join(', ').toLowerCase() : ''}: <b>${sub.length}</b>` : ''}. Twoich własnych: <b>${mine.length}</b>${mine.length ? ` (${mine.slice(0, 6).map(e => E(e.name)).join(', ')}${mine.length > 6 ? '…' : ''})` : ''}.</p>${!ms && !eq ? rows(F.BODY_ORDER.map(m => ({ i: F.mDot(m), l: cap(mName(m)), v: all.filter(e => e.muscle === m).length }))) : ''}`, acts: [{ l: 'Ćwiczenia', i: 'dumbbell', href: '#/exercises' }], chips: ['Ćwiczenia na plecy', 'Jak dodać nowe ćwiczenie?'] }; };
  H.plans = c => { const ps = F.S.plans; if (!ps.length) return H.plan(c); const cur = planNow();
    return { html: `<p>Masz ${ps.length} ${F.plur(ps.length, 'plan', 'plany', 'planów')}:</p>${rows(ps.map(p => ({ l: `${E(p.name)}${cur && p.id === cur.id ? ' <small>aktualny</small>' : ''}`, v: `${p.days.length} ${F.plur(p.days.length, 'dzień', 'dni', 'dni')}` })))}`, acts: [{ l: 'Plany', i: 'clipboard-list', href: '#/plans' }], chips: ['Jaki mam plan?', 'Kiedy trenuję w tym tygodniu?'] }; };
  H.guide = c => { const A = F.GUIDE || []; const CATN = { base: 'Podstawy', plan: 'Układanie treningu', tech: 'Technika i bezpieczeństwo', rec: 'Regeneracja i odżywianie', myth: 'Mity' };
    return { html: `<p>W „Porady i nauka” jest ${A.length} artykułów:</p><div class="ak-exl">${A.map(a => `<a class="ak-ex" href="#/guide/${a.id}"><span><b>${E(a.t)}</b><small>${CATN[a.c] || ''}</small></span>${ic('chevron-right', 16)}</a>`).join('')}</div>`, chips: ['Ile białka jeść?', 'Ile serii robić tygodniowo?'] }; };
  H.appInfo = c => ({ html: `<p>FORGE ${E(F.APPVER)}. Działa w całości bez internetu, bez konta. Wszystkie dane (treningi, plany, pomiary, zdjęcia) są tylko w tym telefonie — nic nie wysyłam na zewnątrz. Wyjątek: jeśli włączysz powiadomienia z serwera, wysyłana jest tylko informacja o końcu przerwy.</p><p>Bo dane są tylko u Ciebie, rób co jakiś czas kopię zapasową${F.S.settings.lastBackup ? ` (ostatnia: ${dd(F.S.settings.lastBackup)})` : ' (jeszcze jej nie robiłeś)'}.</p>`, acts: [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }], chips: ['Jak zrobić kopię zapasową?', 'Co umiesz?'] });

  /* ================= SZUKANIE W PORADACH (ostatnia deska) ================= */
  const guideSearch = q => { const qt = toks(q).filter(t => t.length >= 4); if (!qt.length) return null; let best = null, bs = 0;
    (F.GUIDE || []).forEach(a => { let head = a.t; (a.b || []).forEach(bl => { if (bl[0] === 'h') { head = bl[1]; return; } const txt = Array.isArray(bl[1]) ? bl[1].join(' ') : String(bl[1] || ''); const w = N(head + ' ' + txt).split(' '); const hit = qt.filter(u => w.some(x => tmatch(x, u))).length; const sc = hit / qt.length + hit * 0.1; if (hit >= Math.min(2, qt.length) && sc > bs) { bs = sc; best = { a, head, txt, list: Array.isArray(bl[1]) ? bl[1] : null }; } }); });
    return bs >= 0.6 ? best : null; };
  H.guideHit = c => { const g = guideSearch(c.q); if (!g) return null; return { html: `<p class="ak-s">Z porad: ${E(g.a.t)} → ${E(g.head)}</p>${g.list ? `<ul class="ak-ul">${g.list.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : `<p>${E(g.txt)}</p>`}`, acts: [{ l: 'Czytaj cały artykuł', i: 'book-open', href: '#/guide/' + g.a.id }], chips: ['Co umiesz?', 'Pokaż porady'] }; };

  // ---- wiedza (kompendium) ----
  const KN = [
    [/suplement|odzywk/, 'SUPP', 'supp'],
    [/kreatyn/, 'creatine', 'supp'], [/kofein|\bkaw[aeyi]\b|przedtreningow\w* (suplement|odzywk)|pre ?workout/, 'caffeine', 'supp'], [/nawodn|odwodn|ile (wody|pic)|pic wode|picie wody/, 'hydration', 'supp'],
    [/tempo (redukcji|chudniecia|odchudzania)|jak szybko (chudnac|schudnac|tracic)|ile (kg )?(tygodniowo )?(chudnac|tracic)|(za szybko|zbyt szybko) chudn/, 'cutRate+proteinCut', 'goals'],
    [/nadwyzk|budow\w* masy|na mase|ile (przytyc|tyc)|tempo przybierania/, 'bulk+proteinMax', 'goals'],
    [/(jesc|jedz|diet).*(redukc|deficyt|odchudz)|(redukc|deficyt|odchudz).*(jesc|jedz|diet)|bialk\w* .*(redukc|deficyt)/, 'proteinCut+cutRate', 'goals'],
    [/kiedy (jesc|jem|przyjmowac|brac)|pora posilk|okno anaboliczn|po treningu (jesc|bialko)|przed treningiem (jesc|bialko)|zaraz po treningu/, 'timing+protein', 'protein'], [/bialk|protein/, 'protein+proteinMax', 'protein'],
    [/\brir\b|zapas powt|do upadku|upadek|upadku/, 'failure2+failure', 'reps'], [/tempo (powtorz|ruchu|ćwicz)|jak (wolno|szybko) (opuszczac|robic powt)|ekscentr|negatyw|faza opuszczania/, 'tempo+eccentric', 'reps'],
    [/odciaz|deload/, 'deload+deload2', 'recovery'], [/jak dlugo (trwa )?regenerac|ile (trwa )?regenerac|ile odpoczywac miedzy treningami/, 'recov', 'recovery'], [/\bsen\b|snu|spac|spanie|wyspa/, 'sleep', 'recovery'],
    [/zakwas|doms|bol miesni po/, 'doms', 'pain'], [/ile serii|objetosc|serii tygodniowo|\bserii\b.*(robic|tygodn)|(robic|trzeba|powinien\w*) .*\bserii\b/, 'volume+volDose', 'volume'], [/jak czesto|czestotliw|ile razy w tygodniu/, 'freq2+freq', 'volume'],
    [/malo czasu|krotk\w* trening|szybk\w* trening|nie mam czasu|minimum serii|minimaln/, 'timeEff', 'time'],
    [/rozciag|stretch|gibkos|mobiln/, 'stretch', 'warmup'], [/rozgrzew/, 'warmup', 'warmup'],
    [/cardio|bieg|rower|aerob/, 'concurrent2', 'cardio'],
    [/kobiet|dziewczyn|dla pan\b/, 'women', 'groups'], [/starsz|senior|po (60|65|70)|w podeszlym/, 'older', 'groups'], [/\bciaz|ciezarn|po porodzie|\bporod/, 'preg', 'groups'],
    [/piramid/, 'pyramid', 'pyramid'], [/redukc|rzezb|spalic|spalanie|schudnac|odchudz|tluszcz/, 'cutTrain+cutRate', 'goals'], [/podzial|split|fbw|full body|gora dol|push pull/, 'split', 'splits'],
    [/periodyz|cykl\w* treningow|mezocykl/, 'period', 'progress'], [/maszyn|wolne ciezary|wolnych ciezar/, 'freeMach', 'progress'],
    [/kolejnosc/, 'order2+order', 'progress'], [/progresj|kiedy (dolozyc|zwiekszyc)|zwiekszac ciezar|zwiekszyc ciezar|dokladac ciezar/, 'progression', 'progress'], [/powtorzen|zakres powt|ile powt|ciezar a powt|ciezko czy lekko/, 'reps', 'reps'],
    [/kontuzj|urazom|zapobieg/, 'injury', 'technique'], [/tetno|hr max|maksymaln\w* tetn/, 'hrmax', 'cardio'], [/zdrowi|who|zalecenia/, 'who', 'start'], [/przerw/, 'restGoal', 'rest'], [/zakres ruchu/, 'rom', 'progress'],
    [/metabolizm|bmr|przemian|ile kalorii spala trening|met\b/, 'bmr+met', 'protein']
  ];
  H.know = c => {
    const n = N(c.q); let k = c.key ? [null, c.key, 'progress'] : KN.find(([re]) => re.test(n));
    if (k && k[1] === 'SUPP') return { html: '<p>W bazie mam zweryfikowane stanowiska tylko dla <b>kreatyny</b> i <b>kofeiny</b> — to suplementy z najlepiej udokumentowanym działaniem (ISSN 2017 i 2021). O innych suplementach nie odpowiem, bo nie mam dla nich potwierdzonych źródeł w bazie.</p>', acts: [{ l: 'Czytaj w poradach', i: 'book-open', href: '#/guide/supp' }], chips: ['Czy brać kreatynę?', 'Ile kofeiny przed treningiem?', 'Ile pić wody?'] };
    if (c.key === 'warmup') k = [null, 'warmup', 'warmup'];
    const keys = k ? k[1].split('+') : []; const fs = keys.map(x => F.KB.facts[x]).filter(Boolean); if (!fs.length) return null; const f = { pl: fs.map(x => x.pl).join('\n'), src: [...new Set(fs.flatMap(x => x.src))] };
    let mine = ''; const kex = c.ex || findEx(c.q), kms = findMus(c.q);
    if (keys[0] === 'reps' && kex) { const pi = planItem(kex.id); if (pi) mine = `<p><b>W Twoim planie:</b> ${E(kex.name)} — ${pi.it.sets} × ${E(String(pi.it.reps))}.</p>`; }
    if (keys[0] === 'volume' && kms) { const now = Date.now(); mine = `<p><b>U Ciebie:</b> ${kms.map(m => `${mName(m)} — ${F.fmtNum(weekSets(m, now - 28 * DAY, now + 1).all / 4, 1)} tygodniowo (zalecam ${volRange(m).join('–')})`).join(', ')}; średnio z 4 tygodni, ruch główny za 1, mięśnie pomocnicze za 0,5.</p>`; }
    if (keys[0] === 'protein' && F.nutPlan) { const np = F.nutPlan(); if (np && !np.missing && !np.block) mine = `<p><b>Dla Ciebie:</b> ${np.pLo}–${np.pHi} g białka dziennie (od ${np.refMass} kg masy ciała), w Twoim planie żywienia ${np.prot} g.</p>`; }
    const srcs = (f.src || []).map(s => F.KB.src[s]).filter(Boolean).map(s => { let a = s.a.replace(/\s*\(.*\)\s*$/, ''); if (a.includes(',')) a = a.split(',')[0].replace(/ [A-Z]{1,3}$/, '') + ' i in.'; return `${a}, ${s.y}`; });
    return { html: `${mine}${f.pl.split('\n').map(x => `<p>${E(x)}</p>`).join('')}${srcs.length ? `<p class="ak-src">${ic('book-open', 14)} ${srcs.join(' · ')}</p>` : ''}`, acts: k[2] ? [{ l: 'Czytaj w poradach', i: 'book-open', href: '#/guide/' + k[2] }] : [], chips: KN_CH[keys[0]] || ['Ile białka jeść?', 'Jak długie przerwy robić?', 'Co to jest odciążenie?'] };
  };
  const KN_CH = { creatine: ['Ile kofeiny przed treningiem?', 'Ile pić wody?', 'Ile białka jeść?'], caffeine: ['Czy brać kreatynę?', 'Ile spać?'], hydration: ['Czy brać kreatynę?', 'Posiłek po treningu'], cutRate: ['Ile kalorii potrzebuję?', 'Rozpisz posiłki na dziś'], bulk: ['Ile kalorii potrzebuję?', 'Rozpisz posiłki na dziś'], proteinCut: ['Ile kalorii potrzebuję?', 'Jak szybko chudnąć?'], stretch: ['Rozgrzewka do 100 kg', 'Czy trening do upadku ma sens?'], warmup: ['Rozgrzewka do 100 kg', 'Czy trzeba się rozciągać?'], timeEff: ['Mam mało czasu dziś', 'Ile serii robić tygodniowo?'], women: ['Ile serii robić tygodniowo?', 'Ile białka jeść?'], older: ['Ile serii robić tygodniowo?', 'Czy trening do upadku ma sens?'], preg: ['Ile cardio w tym tygodniu?', 'Co umiesz?'], tempo: ['Ile powtórzeń robić?', 'Co to jest RIR?'], period: ['Czy potrzebuję odciążenia?', 'Co stoi w miejscu?'], freeMach: ['Ćwiczenia na plecy', 'Czym zastąpić wyciskanie?'], failure2: ['Ile serii robić tygodniowo?', 'Ile powtórzeń robić?'], deload2: ['Czy potrzebuję odciążenia?', 'Co stoi w miejscu?'], concurrent2: ['Ile cardio w tym tygodniu?', 'Ile kalorii spaliłem w tym tygodniu?'], volDose: ['Co zaniedbuję?', 'Jak często trenować partię?'], freq2: ['Ile serii robić tygodniowo?', 'Jaki podział wybrać?'], protein: ['Ile kalorii potrzebuję?', 'Co jeść na redukcji?'], failure: ['Ile serii robić tygodniowo?', 'Ile powtórzeń robić?'], deload: ['Co stoi w miejscu?', 'Ile serii robić tygodniowo?'], volume: ['Co zaniedbuję?', 'Jak często trenować partię?'], restGoal: ['Ile mam przerwy?', 'Co to jest RIR?'], cutTrain: ['Ile kalorii potrzebuję?', 'Ile białka jeść?'] };

  // ---- pomoc do aplikacji ----
  const HOW = [
    [/(dodac|ulozyc|stworzyc|zrobic|nowy) plan|kreator/, 'Plan ułożysz w <b>Plany → Kreator planu</b> (pytania o cel, sprzęt i czas) albo dodasz własny: <b>Plany → Nowy plan</b>.', [{ l: 'Kreator planu', i: 'sparkles', href: '#/wizard' }, { l: 'Plany', i: 'clipboard-list', href: '#/plans' }]],
    [/zmienic przerw|ustawic przerw|dlugosc przerw/, 'Przerwy ustawiasz w planie: <b>Plany → plan → Edytuj → Przerwy w tym planie</b> (osobno dla ciężkich wielostawowych, pozostałych wielostawowych i izolowanych). Przy jednym ćwiczeniu zmienisz ją w pozycji planu albo w treningu w menu ⋯ → Czas przerwy.', [{ l: 'Plany', i: 'clipboard-list', href: '#/plans' }]],
    [/kopi\w* zapasow|backup|przywroc|eksport/, 'Kopię zapasową zrobisz w <b>Ustawienia → Dane i kopia → Kopia zapasowa</b>. Zapisz plik w bezpiecznym miejscu, np. w chmurze — przywrócisz go tam samo.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/import|wczytac plan|pdf|zrzut/, 'Plan z PDF-a, zdjęcia albo zrzutu ekranu wczytasz w <b>Plany → Importuj plan z pliku</b>. Historię przeniesiesz ze Strong, Hevy i FitNotes w tym samym miejscu.', [{ l: 'Import', i: 'download', href: '#/import' }]],
    [/powiadomien|serwer/, 'Powiadomienia o końcu przerwy przy zablokowanym telefonie włączysz w <b>Ustawienia → Dźwięk i powiadomienia</b>.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/zainstal|ekran (glowny|poczatkowy)/, 'iPhone: Safari → Udostępnij → „Do ekranu początkowego”. Android: Chrome → ⋮ → „Zainstaluj aplikację”. Potem otwieraj FORGE z ikony.', []],
    [/(dodac|nowe|wlasne) cwiczeni/, 'Własne ćwiczenie dodasz w <b>Plany → Baza ćwiczeń</b> albo w oknie wyboru ćwiczenia przyciskiem „Nowe”.', [{ l: 'Ćwiczenia', i: 'dumbbell', href: '#/exercises' }]],
    [/przeniesc trening|przesunac trening|pominac trening|kalendarz/, 'W <b>Historia → Kalendarz</b> stuknij dzień z treningiem: możesz go przenieść, przesunąć cały plan o dzień albo pominąć. Stuknięcie w wolny dzień pozwala przenieść tam najbliższy trening.', [{ l: 'Kalendarz', i: 'calendar', href: '#/calendar' }]],
    [/profil|wiek|wzrost|plec|aktywnosc/, 'Płeć, wiek, wzrost, aktywność i staż wpisujesz w <b>Ustawienia → Profil</b>. Wiek sam rośnie co rok.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/raport/, 'Raport tygodnia i miesiąca jest w <b>Postępy → Przegląd → Ten tydzień → Pełny raport</b>.', [{ l: 'Raport', i: 'file-text', href: '#/report' }]],
    [/jednostk|funty|\blb\b/, 'Kilogramy albo funty przełączysz w <b>Ustawienia → Trening → Jednostki</b>.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/kolor|motyw|wyglad/, 'Kolor aplikacji zmienisz w <b>Ustawienia → Wygląd</b>.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/pomiar|obwod|zdjeci\w* sylwet|wage|wagi ciala/, 'Wagę wpiszesz szybko przyciskiem <b>Wpisz wagę</b> na ekranie Dziś. Wykres wagi, obwody i zdjęcia sylwetki są w <b>Postępy → Ciało</b>.', [{ l: 'Ciało', i: 'ruler', href: '#/stats', a: 'askBody' }]],
    [/superseri/, 'Superserię zrobisz w edytorze planu: ikona łańcucha łączy ćwiczenie z następnym. W treningu oba ćwiczenia są na jednej karcie.', [{ l: 'Plany', i: 'clipboard-list', href: '#/plans' }]],
    [/progresj\w* dziala|skad ciezar|automatyczn\w* progres/, 'Automatyczna progresja: gdy we wszystkich seriach dojdziesz do górnej granicy powtórzeń z zachowanym zapasem, aplikacja podpowie większy ciężar. Gdy wynik stoi 3 treningi, podpowie lżejszy ciężar i budowanie od nowa.', []],
    [/glosnosc|dzwiek|sygnal/, 'Głośność sygnału i ostrzeżenie przed końcem przerwy ustawisz w <b>Ustawienia → Dźwięk i powiadomienia</b>.', [{ l: 'Ustawienia', i: 'settings', href: '#/settings' }]],
    [/cel(e|u|ow)? (miesieczn|dodac)|dodac cel/, 'Cele miesięczne dodasz w <b>Postępy → Przegląd</b> (sekcja Cele): liczba treningów, tonaż albo ciężar w ćwiczeniu.', [{ l: 'Cele', i: 'target', href: '#/stats', a: 'askOver' }]]
  ];
  H.how = c => { const n = N(c.q); const h = HOW.find(([re]) => re.test(n)); if (!h) return null; return { html: `<p>${h[1]}</p>`, acts: h[2], chips: ['Co umiesz?', 'Co mam dziś?'] }; };

  H.copyai = c => ({ html: '<p>Przygotuję podsumowanie Twojego planu, ostatnich treningów, rekordów i wagi. Wklejasz je w dowolnym czacie AI i dopisujesz pytanie.</p>', acts: [{ l: 'Kopiuj podsumowanie dla AI', i: 'copy', a: 'askCopyAI' }], chips: ['Co umiesz?', 'Co mam dziś?'] });
  H.hello = c => ({ html: `<p>Cześć${F.S.settings.name ? ', ' + E(F.S.settings.name) : ''}! Jestem asystentem FORGE. Odpowiadam na pytania o Twoje treningi, plan, rekordy, regenerację, ćwiczenia i wiedzę treningową — w całości w telefonie, bez internetu.</p>`, chips: startChips() });
  H.thanks = c => ({ html: '<p>Nie ma sprawy. W czym jeszcze mogę pomóc?</p>', chips: startChips() });
  H.caps = c => ({ html: `<p>To nie jest AI — nie zgaduję. Liczę z Twoich treningów i odpowiadam tylko tym, co potwierdzają badania. Przykłady:</p><ul class="ak-ul"><li><b>Wyniki:</b> „ile robiłem w przysiadzie miesiąc temu”, „rekord w wyciskaniu”, „postęp w martwym ciągu”, „porównaj przysiad i martwy ciąg”, „najlepszy trening”.</li><li><b>Plan:</b> „co mam dziś”, „co mam w środę”, „kiedy trenuję w tym tygodniu”, „ile mam dziś ważyć”, „ile mam przerwy”.</li><li><b>Analiza:</b> „co stoi w miejscu”, „dlaczego przysiad stoi”, „co zaniedbuję”, „czy potrzebuję odciążenia”, „podsumuj miesiąc”.</li><li><b>Regeneracja:</b> „czy mogę dziś trenować nogi”, „które partie są gotowe”.</li><li><b>Ćwiczenia:</b> „czym zastąpić wyciskanie hantlami”, „jak robić hip thrust”, „ćwiczenia na plecy bez sprzętu”.</li><li><b>Ciało:</b> „ile ważę”, „ile ważyłem miesiąc temu”, „moje pomiary”, „obwód talii”, „jakie mam BMI”.</li><li><b>Żywienie:</b> „rozpisz posiłki na dziś”, „posiłek po treningu”, „bez mięsa”, „ile kalorii potrzebuję”, „makro”.</li><li><b>Siła:</b> „jaki mam poziom siły”, „DOTS”, „podejścia na zawody”, „80% z maksa w przysiadzie”, „ile robię na 5 powtórzeń”.</li><li><b>Treningi:</b> „co robiłem 3 listopada”, „pokaż ostatni trening”, „jak idzie trening”, „ile cardio w tym tygodniu”, „moje osiągnięcia”, „co zmienić w planie”.</li><li><b>Stoper:</b> „włącz przerwę 90 s”, „dodaj 30 s”, „zatrzymaj przerwę”.</li><li><b>Aplikacja:</b> „moje ustawienia”, „jakie mam plany”, „ile ćwiczeń w bazie”, „pokaż porady”, „gdzie są moje dane”.</li><li><b>Wiedza i narzędzia:</b> „ile białka jeść”, „co to jest RIR”, „talerze na 120”, „100 kg na 5”.</li></ul><p class="ak-s">Możesz też pytać głosem — przycisk mikrofonu w polu pytania.</p>`, chips: startChips() });
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
    ['timerAdd', /(dodaj|dorzuc|odejmij|skroc|wydluz)\w* .*\d+\s*(s|sek|min)|dodaj 30 s/], ['timer', /(wlacz|odpal|uruchom|ustaw|start|zacznij|odlicz|nastaw)\w* .*(przerw|stoper|minutnik|odlicz|timer)|^(przerwa|stoper|minutnik|timer) (na )?(\d|poltorej)|(zatrzymaj|stop|pomin|wylacz|anuluj) (przerw|stoper|timer)|ile (zostalo|jeszcze) przerw|^odlicz/],
    ['live', /trwajac\w* trening|aktualn\w* trening|ile (mi )?zostalo (serii|cwiczen|do konca)|ile serii zostalo|jak idzie (mi )?(ten |dzisiejszy )?trening|na ktorym (jestem )?cwiczeniu/],
    ['postMeal', /(posil\w*|jesc|zjesc|jedzenie|zjem|przekask\w*) (po|przed) trening|(po|przed) treningu? (co )?(zjesc|jesc|posil)|potreningow|przedtreningow/], ['foodLeft', /ile (bialka|kalorii|kcal) (mi )?(zostalo|brakuje)|ile (jeszcze )?(musze|powinienem) zjesc dzis/],
    ['meals', /(rozpisz|zaproponuj|daj|pokaz|ulóz|uloz|wymysl)\w* .*(posil|jadlospis|diet|menu|co jesc)|jadlospis|przykladow\w* (dzien|posil|menu)|co (mam )?(dzis )?(zjesc|jesc)|inna propozycja posil|posilki na dzis|plan (zywienia|diety|posilkow)|(\d) posilk/],
    ['cardio', /(ile|moje|zrobilem|zapisane) .*cardio|cardio (w|na) (tym|ten|tydzien|tygodni)|ile (biegal|jezdzil|chodzil|maszerowal)|minut (cardio|aerob)|aktywnosc\w* tlenow/],
    ['strength', /poziom\w* sily|norm\w* sily|jak (silny|mocny) jestem|dots|wilks|trojboj|jak wypadam|(moja|jaka) sila wzgledem/], ['comp', /podejsci\w*|zawod/],
    ['pct', /\bprocent/], ['repBest', /(najwiecej|ile|jaki ciezar|ile robie|ile robilem|ile zrobie) .*na \d+ (powt|razy)|\d+ ?rm\b/],
    ['bmi', /\bbmi\b/], ['measure', /obwod|pomiar|w pasie|talii|\bcm\b|tkank\w* tluszcz|procent tluszcz|ile mam (w talii|w klatce|w bicepsie|w udzie)/],
    ['achieve', /osiagniec|odznak|medal|trofe|klub 100|klub 140|klub 180/], ['coach', /co zmienic|korekt|czy (moj )?plan (jest )?(dobry|ok|w porzadku)|ocen (moj )?plan|analiz\w* planu|co poprawic/],
    ['session', /co (robilem|cwiczylem|trenowalem|zrobilem)|jaki trening (mialem|robilem|zrobilem)|pokaz (ostatni |mi )?trening|szczegol\w* trening|ostatni trening (szczeg|dokladnie|pokaz)|trening z (dnia|\d)/],
    ['settings', /ustawien|jakie mam talerze|ile wazy (moj )?gryf|(kiedy|ostatnia|ostatnio) .*kopi\w* zapas|moje ustawienia|domysln\w* przerw|cel tygodniow\w* (mam|jaki)/],
    ['exdb', /ile (jest )?cwiczen (w bazie|jest|mam)|baz\w* cwiczen|moje (wlasne )?cwiczenia|wlasne cwiczenia/], ['plans', /jakie (mam )?plany|moje plany|wszystkie plany|ile (mam )?planow/], ['guide', /porad|artykul|poradnik|czego sie (moge )?nauczyc|kompendium/],
    ['appInfo', /wersj\w* (aplikacji|forge)|jaka wersja|czy dzialasz (bez|offline)|offline|bez internetu|gdzie (sa|trzymane|zapisane) (moje )?dane|prywatn|czy wysylasz|czy (ktos|ktos) widzi|bezpieczne dane/],
    ['today', /jaki (jest )?dzis dzien|ktory (jest )?dzis|jaka (jest )?(dzis )?data|ktorego dzis/], ['profile', /ile mam lat|moj (wiek|wzrost|profil)|ile mam wzrostu|moje dane/],
    ['short', /malo czasu|nie mam czasu|krotk\w* trening|szybk\w* trening|spiesze|tylko \d+ min|mam \d+ min/], ['tired', /nie mam (dzis )?sil|zmeczon|slabo sie|kiepsko sie|nie chce mi sie|brak sil|bez sil/],
    ['grow', /(jak|co).*(zwiekszyc|zbudowac|rozbudowac|powiekszyc|wiekszy|wieksza|wieksze|urosnac|urosl|napompowac)/],
    ['compare', /porown|\bvs\b|versus|co (mocniej|lepiej) (rosnie|idzie)/], ['deloadQ', /(czy|kiedy|czas na|potrzebuj\w*|powinien\w*|zrobic|mam zrobic) .*(odciaz|deload)|(odciaz|deload)\w* .*(teraz|juz|czas|potrzeb)/],
    ['best', /najlepsz\w* trening|najciezsz\w* trening|najwieksz\w* tonaz|rekordow\w* trening/], ['burn', /spalil|spalon|spalam|spala (moj )?trening|ile spala|ile kalorii (na|w|przy) trening|kalorie z trening/],
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
    ['bw', /ile waz|moja waga|wag\w* ciala|przytyl|masa ciala|ile przybral|ile schudl/], ['kcal', /kalori|zapotrzebow|ile (jesc|kcal)|tdee|makro|ile (wegli|weglowodanow|tluszczu)/], ['goals', /\bcel(e|ow|u)?\b/], ['rank', /\brang|\bxp\b|poziom|osiagniec/]
  ];
  const pickIntent = n => { for (const [id, re] of INT) if (re.test(n)) return id; return null; };

  /* ================= SILNIK ================= */
  const CTX = { ex: null, mus: null, time: null, intent: null, pending: null };
  F.ask = (q, ctx = CTX) => {
    q = String(q).replace(/×/g, ' x '); const n = N(q); const c = { q, n };
    const genKn = /^(co to|czym (jest|sa)|po co|dlaczego|ile\b.*\b(bialka|razy w tygodniu)\b|ile\b.*\b(serii|powtorzen)\b.*\b(robic|trzeba|powinien\w*|zalec\w*|najlepiej|optymal\w*)\b|ile (robic|trzeba|powinienem)\b.*\b(serii|powtorzen)|jak (czesto|dlugo) (trenowac|robic)|jaki podzial|czy (warto|trzeba|powinienem|powinnam|brac|mozna))/.test(n);
    if (/odciaz|deload/.test(n) && /(czy|kiedy|czas|potrzeb|powinien|zrobic|juz|teraz)/.test(n) && !/co to|czym jest|na czym polega|jak (robic|wyglada)/.test(n)) return remember(c, ctx, 'deloadQ', H.deloadQ(c));
    if (genKn && !/zostal|brakuj/.test(n)) { const kn = KN.some(([re]) => re.test(n)) ? H.know(c) : null; if (kn) { ctx.intent = null; ctx.pending = null; return kn; } if (/^(co to|czym (jest|sa)|po co|czy (warto|trzeba|mozna|powinienem|powinnam))/.test(n)) { const g = H.guideHit(c); if (g) { ctx.intent = null; return g; } } }
    let intent0 = /\d{1,3}\s*%/.test(q) && !/talerz/.test(n) ? 'pct' : pickIntent(n); if (intent0 === 'grow' && !findMus(q)) intent0 = null; if (intent0 === 'session' && findEx(q)) intent0 = 'histAt';
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
      if (exHit && !musHit && /^(jak|czy|dlaczego|kiedy|co|po co|gdzie)\b/.test(n) && !/\bile\b|robil|ciezar/.test(n)) { const g = H.guideHit(c); if (g) return remember(c, ctx, null, g); intent = /^jak/.test(n) ? 'tech' : (/^(czy|dlaczego|po co)\b/.test(n) && !S().some(se => se.exercises.some(e => e.exId === exHit.id)) ? null : 'exCard'); if (!intent) c.ex = null; }
      else if (exHit && !musHit) intent = /\bile\b|robil|ciezar/.test(n) ? 'histAt' : 'exCard';
      else if (musHit) intent = /cwicz/.test(n) ? 'exFor' : 'musCard';
    }
    if (intent === 'histAt' && !c.ex && c.mus) intent = 'muscleSets';
    return finish(c, ctx, intent);
  };
  const finish = (c, ctx, intent) => {
    let a = null;
    if (intent === 'exCard') a = exCard(c); else if (intent === 'musCard') a = musCard(c); else if (intent && H[intent]) a = H[intent](c, ctx);
    if (!a && intent === 'how') a = H.know(c);
    if (!a) { const g = H.guideHit(c); if (g) return remember(c, ctx, null, g); return remember(c, ctx, null, fallback(c)); }
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
    ['calculator', 'Siła', 'Poziom, DOTS, zawody', 'Jaki mam poziom siły?'], ['flame', 'Żywienie', 'Posiłki, kalorie, białko', 'Rozpisz posiłki na dziś']];
  const heroHtml = () => `<section class="ak-hero"><div><span class="ak-tag">${ic('shield', 14)} To nie jest AI</span><h2>Nie zgaduje.<br>Liczy.</h2><p>Odpowiedzi liczę z Twoich treningów albo biorę z badań — zawsze ze źródłem. Nic nie zmyślam. Działam bez internetu, dane zostają w telefonie.</p><p class="ak-hero-s">Ciężarów za Ciebie nie podniosę — ale powiem, ile dziś założyć.</p></div></section>
    <div class="ak-caps">${CAPS.map(([i, t, d, q]) => `<button class="ak-cap" data-a="askQ" data-q="${E(q)}">${ic(i, 20)}<b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
  // podpowiedzi przy wpisywaniu
  const SUG = ['Co mam dziś?', 'Co mam jutro?', 'Kiedy trenuję w tym tygodniu?', 'Jaki mam plan?', 'Jakie mam ciężary na dziś?', 'Ile mam przerwy?', 'Czy mogę dziś trenować nogi?', 'Które partie są gotowe?', 'Co stoi w miejscu?', 'Co zaniedbuję?', 'Czy potrzebuję odciążenia?', 'Jak mi idzie?', 'Podsumuj ten miesiąc', 'Ostatnie rekordy', 'Moje rekordy', 'Najlepszy trening', 'Ile treningów w tym miesiącu?', 'Tonaż w tym tygodniu', 'Ile trwa mój trening?', 'Od kiedy trenuję?', 'Ile tygodni z rzędu trenuję?', 'Jaka jest moja ranga?', 'Moje cele', 'Ile ważę?', 'Ile kalorii potrzebuję?', 'Ile kalorii spaliłem w tym tygodniu?', 'Ile białka jeść?', 'Co to jest RIR?', 'Co to jest odciążenie?', 'Ile serii robić tygodniowo?', 'Ile powtórzeń robić?', 'Jaki podział wybrać?', 'Jak schudnąć?', 'Czym są zakwasy?', 'Ile spać?', 'Talerze na 100 kg', 'Rozgrzewka do 100 kg', '100 kg na 5', 'Ćwiczenia na plecy', 'Ćwiczenia na klatkę bez sprzętu', 'Ćwiczenia na pośladki', 'Porównaj przysiad i martwy ciąg', 'Kopiuj podsumowanie dla AI', 'Rozpisz posiłki na dziś', 'Posiłek po treningu', 'Posiłki na dziś bez mięsa', 'Makro', 'Ile cardio w tym tygodniu?', 'Jaki mam poziom siły?', 'Podejścia na zawody', '80% z maksa w przysiadzie', 'Moje pomiary', 'Obwód talii', 'Jakie mam BMI?', 'Moje osiągnięcia', 'Co zmienić w planie?', 'Pokaż ostatni trening', 'Co robiłem wczoraj?', 'Jak idzie trening?', 'Włącz przerwę 90 s', 'Zatrzymaj przerwę', 'Moje ustawienia', 'Jakie mam plany?', 'Ile ćwiczeń jest w bazie?', 'Pokaż porady', 'Gdzie są moje dane?', 'Porównaj przysiad i martwy ciąg', 'Czy potrzebuję odciążenia?', 'Mam mało czasu dziś', 'Jak zrobić kopię zapasową?', 'Jak dodać plan?'];
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
  F.act.askStr = () => { F.ui.statTab = 'str'; };
  F.act.askRegen = () => { F.ui.statTab = 'mus'; F.ui.musView = 'rec'; };
  F.act.askBody = () => { F.ui.statTab = 'body'; };
  F.act.askOver = () => { F.ui.statTab = 'over'; };
  F.act.askPrs = () => { F.ui.statTab = 'str'; };
})();
