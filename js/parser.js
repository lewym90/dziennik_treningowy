/* FORGE — parser planów: rozpoznawanie ćwiczeń, serii, powtórzeń, przerw w tekście z PDF/OCR/schowka + import historii z CSV */
(function () {
  const F = window.F;
  const STOP = new Set(['ze', 'z', 'na', 'w', 'do', 'po', 'i', 'a', 'o', 'the', 'with', 'on', 'of', 'and', 'oraz', 'dla', 'przy', 'lub', 'or']);
  const EQ = new Set(['sztan', 'hantl', 'maszy', 'wycia', 'linka', 'kettl', 'gryf', 'drazk', 'suwni', 'barbe', 'dumbb', 'cable', 'machi', 'kettle']);
  const stem = t => t.length > 5 ? t.slice(0, 5) : t;
  const toks = s => F.norm(s).split(' ').filter(t => t && !STOP.has(t) && !/^\d+$/.test(t)).map(stem);
  const wt = t => EQ.has(t) ? 0.4 : 1;

  /* ---------- Levenshtein ---------- */
  function lev(a, b) {
    if (a === b) return 0; const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1); for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) { cur[0] = i; for (let j = 1; j <= n; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1)); } [prev, cur] = [cur, prev]; }
    return prev[n];
  }

  /* ---------- indeks ćwiczeń ---------- */
  let IDX = null, IDX_N = -1;
  const buildIdx = () => {
    IDX = []; F.S.ex.forEach(ex => { const names = [ex.name, ...String(ex.alias || '').split(';').map(s => s.trim()).filter(Boolean)]; names.forEach((n, k) => { const s = F.norm(n); if (s) IDX.push({ ex, s, t: toks(n), primary: k === 0 }); }); }); IDX_N = F.S.ex.size;
  };
  F.invalidateIdx = () => { IDX = null; };
  // zwraca posortowaną listę kandydatów [{ex, score}]
  F.matchExercise = raw => {
    if (!IDX || IDX_N !== F.S.ex.size) buildIdx();
    const s = F.norm(raw.replace(/\([^)]*\)/g, ' $& ')); const a = toks(raw); if (!s || !a.length) return [];
    const best = new Map();
    for (const c of IDX) {
      let score = 0;
      if (c.s === s) score = 1;
      else {
        let inter = 0, ua = 0, ub = 0, interA = 0;
        const setB = new Set(c.t), setA = new Set(a);
        a.forEach(t => { ua += wt(t); if (setB.has(t)) { inter += wt(t); interA += wt(t); } });
        c.t.forEach(t => { ub += wt(t); });
        const union = ua + ub - inter; const jac = union ? inter / union : 0; const covA = ua ? interA / ua : 0, covB = ub ? inter / ub : 0;
        score = 0.45 * jac + 0.4 * covA + 0.15 * covB;
        // kara za sprzeczny sprzęt (hantle vs sztanga)
        const ea = a.filter(t => EQ.has(t)), eb = c.t.filter(t => EQ.has(t)); if (ea.length && eb.length && !ea.some(t => eb.includes(t))) score -= 0.18;
        if (score < 0.9 && Math.abs(s.length - c.s.length) <= Math.max(6, s.length * 0.4) && (s.slice(0, 2) === c.s.slice(0, 2) || score > 0.25)) {
          const L = 1 - lev(s, c.s) / Math.max(s.length, c.s.length); score = Math.max(score, L * 0.97);
        }
        if (!c.primary) score *= 0.99;
      }
      const cur = best.get(c.ex.id); if (!cur || score > cur.score) best.set(c.ex.id, { ex: c.ex, score });
    }
    return [...best.values()].sort((x, y) => y.score - x.score).slice(0, 4);
  };
  F.guessMuscle = raw => {
    const n = F.norm(raw);
    const rules = [['chest', /klat|pompk|wyciskanie lez|bench|chest|rozpie|fly|dips|dipy|butterfly|pec/], ['back', /plec|wioslo|podciag|sciag|martwy|pull|row|lat |deadlift|szrug|grzbiet/], ['shoulders', /bark|ohp|zolnier|arnold|wznos|lateral|face pull|shoulder|akton|delt/], ['biceps', /biceps|uginanie|curl|mlotk|modlitew/], ['triceps', /triceps|francusk|prostowanie ramion|pushdown|skull|kickback/], ['abs', /brzuch|plank|crunch|spiec|abs|core|russian|unoszenie nog/], ['quads', /przysiad|squat|wykrok|suwnic|hack|prostowanie nog|leg press|extension|lunge|quad|czworog/], ['hams', /dwugl|leg curl|uginanie nog|rumunsk|rdl|good morning|hamstring/], ['glutes', /posladk|hip thrust|glute|odwodzenie|mostek|kickback/], ['calves', /lydk|calf|wspiecia/], ['cardio', /bieg|bieznia|rower|orbitrek|cardio|skakank|run|bike|rowing|wioslarz|stepper/]];
    for (const [m, re] of rules) if (re.test(n)) return m; return 'full';
  };

  /* ---------- normalizacja tekstu ---------- */
  const cleanText = t => String(t || '').replace(/\r/g, '\n').replace(/[   ]/g, ' ').replace(/[×✕✖✗хХ]/g, 'x').replace(/[–—−‒]/g, '-').replace(/[“”„]/g, '"').replace(/[’‘`´]/g, "'").replace(/…/g, '...')
    .replace(/(\d)\s*[Oo](?=\s|$|[^a-zA-Z])/g, '$10').replace(/\b[lI](?=\d{1,2}\s*(?:x|powt|kg))/g, '1')
    .replace(/(\d)\s*,\s*(\d)/g, '$1,$2')
    .replace(/[→➔➜⇒➡⟶»]/g, ' ').replace(/(^|\s)(?:-{1,2}>|={1,2}>|>{1,2})(?=\s|$)/g, ' ');
  const MARK = /^\s*(?:[-*•●▪◦►▶→■□☐✓✔]|\d{1,2}\s*[.)]|[a-dA-D]\d?\s*[.)])\s+/;
  const LETTERS = s => (s.match(/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/g) || []).length;

  /* ---------- rozpoznawanie schematu serii ---------- */
  const num = s => parseFloat(String(s).replace(',', '.'));
  function scheme(line) {
    let t = ' ' + line + ' '; const r = { sets: 0, reps: '', w: 0, unit: '', rest: 0, time: false, rpe: 0, amrap: false, note: [], single: null };
    const cut = (re, fn) => { const m = t.match(re); if (m) { fn(m); t = t.replace(re, ' '); return true; } return false; };
    // przerwa
    cut(/(?:przerwa|przerwy|odpoczynek|odp\.?|rest|r)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(min[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|m\b|sek[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|s\b|'|")/i, m => { const v = num(m[1]), u = m[2].toLowerCase(); r.rest = Math.round(/^m/.test(u) || u === "'" ? v * 60 : v); })
      || cut(/(\d+(?:[.,]\d+)?)\s*(min[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|sek[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|s)\s*(?:przerwy|rest|odpoczynku|przerwa)/i, m => { const v = num(m[1]), u = m[2].toLowerCase(); r.rest = Math.round(/^m/.test(u) ? v * 60 : v); });
    // RPE
    cut(/@\s*(\d+(?:[.,]\d)?)(?![\d.,])(?!\s*(?:kg|lb|kilo|funt))|rpe\s*[:=]?\s*(\d+(?:[.,]\d)?)|rir\s*[:=]?\s*(\d)/i, m => { r.rpe = num(m[1] || m[2] || m[3]); r.note.push(m[3] ? 'RIR ' + m[3] : 'RPE ' + r.rpe); });
    // % 1RM
    cut(/(\d{2,3})\s*%\s*(?:1\s*rm|rm|max[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*)?/i, m => { r.note.push(m[1] + '% 1RM'); });
    // ciężar
    cut(/(\d+(?:[.,]\d+)?)\s*(kg|kilo[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|lbs?|funt[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*)\b/i, m => { r.w = num(m[1]); r.unit = /^l|^f/i.test(m[2]) ? 'lb' : 'kg'; });
    cut(/(?:^|[^a-z0-9])(\d{1,2})\s*[x*]\s*(?=(?:amrap|max|do\s+(?:upadku|odmowy|zalamania|załamania)|failure))/i, m => { r.sets = +m[1]; });
    // czas: SxN s
    if (!cut(/(?:^|[^a-z0-9])(\d{1,2})\s*[x*]\s*(\d{1,3})\s*(min[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|sek[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|s\b|")/i, m => { r.sets = +m[1]; r.reps = String(/^m/i.test(m[3]) ? +m[2] * 60 : +m[2]); r.time = true; })) {
      // SxN/M/K
      if (!cut(/(?:^|[^a-z0-9])(\d{1,2})\s*[x*]\s*(\d{1,3}(?:\s*\/\s*\d{1,3})+)(?!\d)/i, m => { r.sets = +m[1]; r.reps = m[2].replace(/\s/g, ''); }) && !cut(/(?:^|[^a-z0-9])(\d{1,2})\s*[x*]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?(?!\d)(?!\s*\/\s*\d)/i, m => { let s = +m[1], a = +m[2]; if (s > 12 && a <= 8 && !m[3]) { [s, a] = [a, s]; } r.sets = s; r.reps = m[3] ? a + '-' + m[3] : String(a); })) {
        if (!cut(/(\d{1,2})\s*(?:serie|serii|seri[ęe]|seria|sets?)\s*(?:po|x|of|:|-|,)?\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*(?:powt[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|reps?|razy)?/i, m => { r.sets = +m[1]; r.reps = m[3] ? m[2] + '-' + m[3] : m[2]; })) {
          // osobno: serie / powtórzenia
          cut(/(\d{1,2})\s*(?:serie|serii|seri[ęe]|seria|sets?)\b/i, m => { r.sets = +m[1]; });
          cut(/(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*(?:powt[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|reps?|razy)\b/i, m => { r.reps = m[2] ? m[1] + '-' + m[2] : m[1]; });
          // lista po ukośniku 12/10/8
          if (!r.sets && !r.reps) cut(/(?:^|[^\d/])(\d{1,3}(?:\s*\/\s*\d{1,3}){1,6})(?![\d/])/, m => { const parts = m[1].split('/').map(x => +x); if (!(parts.length === 3 && parts[2] > 31) && parts.every(x => x > 0 && x <= 100)) { r.sets = parts.length; r.reps = parts.join('/'); } else t += ' ' + m[1]; });
          // pojedyncza seria: "60 x 10" (po usunięciu ciężaru zostaje "x 10")
          if (!r.sets && !r.reps) cut(/(?:^|\s)[x*]\s*(\d{1,3})(?!\d)/i, m => { r.sets = 1; r.reps = m[1]; r.single = true; });
        }
      }
    }
    if (cut(/\b(amrap|do upadku|do odmowy|do zalamania|max(?:imum)?|failure|to failure)\b/i, () => { r.amrap = true; })) { if (!r.reps) r.reps = 'AMRAP'; }
    // przerwa zapisana samym czasem na końcu linii („4x8 90s”, „3x10 2 min”)
    if ((r.sets || r.reps) && !r.time && !r.rest) cut(/(?:^|\s)(\d{2,3})\s*(?:s|sek[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*)(?=\s*$)/i, m => { if (+m[1] >= 20 && +m[1] <= 600) r.rest = +m[1]; else t += ' ' + m[0]; })
      || cut(/(?:^|\s)(\d(?:[.,]\d)?)\s*(?:min[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|')(?=\s*$)/i, m => { if (num(m[1]) <= 10) r.rest = Math.round(num(m[1]) * 60); else t += ' ' + m[0]; });
    cut(/\/\s*(?:noga|nog[ęe]|stron\w*|r[ęe]k\w+)\b|\bka[żz]d\w*\b|\bna\s+(?:nog[ęe]|stron[ęe]|r[ęe]k[ęe])\b/i, () => { });
    r.clean = t.replace(/\s+/g, ' ').replace(/^[\s\-:;,.|/()x*@]+|[\s\-:;,.|/()x*@]+$/g, '').trim();
    r.has = !!(r.sets || r.reps);
    return r;
  }
  F.scheme = scheme;

  // linia pojedynczej serii w stylu Strong/Hevy: „1  60 kg x 10”, „80 kg × 8”
  const setLine = line => { let m = line.match(/^\s*(?:\d{1,2}\s+)?(\d+(?:[.,]\d+)?)\s*(kg|lbs?)\s*[x*]\s*(\d{1,3})\s*(?:[@(].*)?$/i); if (m) return { w: num(m[1]), unit: /^l/i.test(m[2]) ? 'lb' : 'kg', r: +m[3] }; m = line.match(/^\s*\d{1,2}\s+(\d{2,3}(?:[.,]\d+)?)\s*[x*]\s*(\d{1,3})\s*$/); if (m) return { w: num(m[1]), unit: 'kg', r: +m[2] }; return null; };

  /* ---------- nagłówki dni ---------- */
  const DAYRE = /^(?:dzie[nń]|day|trening|training|workout|sesja|session|jednostka|unit|blok|cz[eę]sc|part|cykl|tydzie[nń]|week)\s*[:.#-]?\s*(?:[a-z]\b|\d+|[ivx]+\b|\w+)?/i;
  const WEEKDAY = /^(?:poniedzia[lł]ek|wtorek|[sś]roda|czwartek|pi[aą]tek|sobota|niedziela|pon\b|wt\b|[sś]r\b|czw\b|pt\b|sob\b|ndz\b|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon\b|tue\b|wed\b|thu\b|fri\b|sat\b|sun\b)/i;
  const SPLIT = /^(?:push|pull|legs?|upper|lower|full\s*body|fbw|ppl|nogi|plecy|klatka|barki|ramiona|brzuch|g[oó]ra|d[oó][lł]|cardio|rest day|dzie[nń] wolny)\b/i;
  const TABLE_HEAD = { name: /cwicz|exerc|nazwa|name/, sets: /^serie$|^serii$|^sets?$|^seria$|^s$/, reps: /powt|^reps?$|^rep$/, w: /ciez|obciaz|^kg$|weight|^w$/, rest: /przerw|^rest$|odpocz/ };

  /* ---------- zawinięte linie (zrzuty ekranu łamią długie wiersze) ---------- */
  const OPEN_END = /(?:[x\/,+(]|\bserii?|\bseria|\bpo)\s*$/i;
  const START_REM = /^(?:serie|serii|seria|x\s*\d|ka[żz]d\w*|\/|noga\b|nog[ęe]\b|stron\w*|powt\w*|razy|po\s+\d)/i;
  const NUM_ONLY = /^\d{1,3}(?:\s*-\s*\d{1,3})?(?:\s*\/\s*[a-ząćęłńóśźż]+)?(?:\s+ka[żz]d\w*)?$/i;
  const SS_HEAD = /^(?:\d{1,2}\s*[.)]\s*)?(?:super\s*-?\s*set|superseria|biseria|triseria|giant\s*set)\b/i;
  const joinWrapped = lines => {
    const out = [];
    lines.forEach(raw => {
      const l = raw.trim(); if (!l) { out.push(''); return; }
      const prev = out.length ? out[out.length - 1] : '';
      const join = prev && ((OPEN_END.test(prev) && (NUM_ONLY.test(l) || START_REM.test(l) || /^\d/.test(l)))
        || (START_REM.test(l) && /\d/.test(prev) && LETTERS(prev) >= 3)
        || (SS_HEAD.test(prev) && !/\d\s*(?:serie|serii|series|sets?|x)\b/i.test(prev) && /^\d/.test(l)));
      if (join) out[out.length - 1] = prev + ' ' + l; else out.push(l);
    });
    return out.filter(x => x !== '');
  };
  const REST_RULE = /^[^A-Za-ząćęłńóśźż]*(?:odpoczynek|przerw[aey]?|rest)\b[^0-9]{0,30}?(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*(min\w*|m\b|sek\w*|s\b|')(.*)$/i;
  const RULES_HEAD = /^[^A-Za-ząćęłńóśźż]*(?:zasady|uwagi|wskaz[oó]wki|notatki|informacje|rules|notes|tips|porady|jak trenowa[cć])\b/i;
  const ACRO = /^(?:ppl|fbw|ppluL|ul|ab|abc)$/i;
  const prettyTitle = t => { const w = t.replace(/\s+/g, ' ').trim(); if (w !== w.toUpperCase()) return w; return w.toLowerCase().split(' ').map((x, i) => ACRO.test(x) ? x.toUpperCase() : i === 0 ? x.charAt(0).toUpperCase() + x.slice(1) : x).join(' '); };

  /* ---------- główny parser ---------- */
  F.parsePlanText = (raw, opts = {}) => {
    let lines = joinWrapped(cleanText(raw).split('\n').map(l => l.replace(/\s+$/g, '')).filter(l => l.trim()));
    // ogólne zasady przerw z opisu planu („Odpoczynek: 3-4 min na duże ćwiczenia”) — nie są ćwiczeniami
    const restRules = {}; const ruleNotes = [];
    lines = lines.filter(l => {
      const m = l.match(REST_RULE); if (!m || /\d\s*x\s*\d/i.test(l)) return true;
      const a = num(m[1]), b = m[2] ? num(m[2]) : a, u = m[3].toLowerCase(); const secs = Math.round((a + b) / 2 * (/^m(in|\b)/.test(u) || u === "'" ? 60 : 1) / 15) * 15; if (secs < 15 || secs > 900) return true;
      const sc = F.norm(m[4] || ''); const kind = /duz|ciezk|glown|wielostaw|podstaw|bojow|compound|main|heavy|big/.test(sc) ? 'big' : /mal|izolow|akcesor|pomocnic|isolation|light/.test(sc) ? 'small' : 'all';
      restRules[kind] = secs; ruleNotes.push(l.trim().replace(/^[^\p{L}\d]+/u, '')); return false;
    });
    let skipRules = false;
    const plan = { name: opts.name || '', days: [] }; let day = null, pending = null, prev = null, headerMap = null, headerOrder = null, firstSeen = false;
    const newDay = name => { day = { id: F.uid(), name: name || 'Trening ' + (plan.days.length + 1), items: [] }; plan.days.push(day); pending = null; prev = null; };
    const addItem = (name, sc, src) => {
      if (!day) newDay(plan.days.length ? null : null);
      let alt = ''; let cands = F.matchExercise(name);
      if (!(cands[0] && cands[0].score >= 0.95)) {
        let nm = name, rest = '';
        const par = name.match(/^(.*?)\s*\(([^)]*\blub\b[^)]*)\)?\s*$/i);
        if (par) { nm = par[1]; rest = par[2]; }
        else { const parts = name.split(/\s+\/\s+|\s+(?:lub|albo|or)\s+|(?<=[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])\/(?=[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])/i).map(x => x.trim()).filter(Boolean); if (parts.length > 1) { nm = parts[0]; rest = parts.slice(1).join(' / '); } }
        if (rest && LETTERS(nm) >= 3) {
          const c1 = F.matchExercise(nm);
          if (c1[0] && (!cands[0] || c1[0].score >= cands[0].score - 0.05)) {
            const extra = rest.split(/\s*\/\s*|\s+lub\s+/i).map(x => F.matchExercise(x)[0]).filter(Boolean);
            cands = [...c1]; extra.forEach(e => { if (!cands.some(c => c.ex.id === e.ex.id)) cands.push(e); });
            name = nm.trim(); alt = rest.trim();
          }
        }
      }
      const top = cands[0];
      const it = { id: F.uid(), raw: name, src: src || name, exId: top && top.score >= 0.6 ? top.ex.id : null, conf: top ? top.score : 0, alts: cands.map(c => c.ex.id), newName: name.replace(/\s+/g, ' ').trim(), sets: sc.sets || 0, reps: sc.reps || '', rest: sc.rest || 0, w: sc.w ? (sc.unit === 'lb' ? sc.w / 2.2046 : sc.w) : 0, note: [...(sc.note && sc.note.length ? sc.note : []), ...(alt ? ['lub ' + alt] : [])].join(', '), defaulted: !sc.has, time: !!sc.time };
      if (!it.sets) it.sets = 3; const noReps = !it.reps; if (!it.reps) it.reps = '8-12';
      const ex = it.exId && F.S.ex.get(it.exId); if (ex && ex.type === 'time' && (noReps || !/\d/.test(it.reps))) it.reps = '45';
      const pm = String(src || '').match(/(\d{2,3})\s*%(?!\s*(?:rpe))/i); if (pm && +pm[1] >= 30 && +pm[1] <= 100 && /%\s*(?:1\s*rm|rm|max|ciężaru|ciezaru|1pm|\b)/i.test(src)) it.pct = +pm[1];
      day.items.push(it); prev = it; pending = null; return it;
    };
    for (let idx = 0; idx < lines.length; idx++) {
      let line = lines[idx].trim(); if (!line || /^[-_=~.\s]{3,}$/.test(line)) continue;
      // numer strony / stopki
      if (/^(?:strona|page|str\.?)\s*\d+(?:\s*\/\s*\d+)?$/i.test(line) || /^\d+\s*\/\s*\d+$/.test(line)) continue;
      const hadMark = MARK.test(line); line = line.replace(MARK, '');
      // sekcje „ZASADY / UWAGI” nie są ćwiczeniami — pomijamy do następnego dnia
      if (RULES_HEAD.test(line) && LETTERS(line) < 40) { skipRules = true; continue; }
      if (skipRules) { if ((DAYRE.test(line) || WEEKDAY.test(line)) && !/[:]\s*\S/.test(line)) skipRules = false; else continue; }
      if (/gotowy na screen|^\W*plan treningowy\W*$/i.test(line)) continue;
      // nazwa planu z linii typu „PPL 3 DNI / TYDZIEŃ”
      if (!plan.name && !opts.name && !scheme(line).has && /\b(?:ppl|fbw|upper\s*\/?\s*lower|push\s*pull\s*legs|split)\b/i.test(line) && line.length < 60 && !SS_HEAD.test(line)) { plan.name = prettyTitle(line); continue; }
      // superseria: „Superset: A + B   3 serie x 8-10 każde” → dwa ćwiczenia z tym samym schematem
      if (SS_HEAD.test(line)) {
        const body = line.replace(SS_HEAD, '').replace(/^\s*[:\-.]\s*/, ''); const sc = scheme(body);
        const names = sc.clean.split(/\s*\+\s*|\s+oraz\s+|\s+i\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/).map(x => x.replace(/\b(?:ka[żz]d\w*|na\s+stron\w+)\b/gi, '').replace(/^[\s,.:;\-/]+|[\s,.:;\-/]+$/g, '').trim()).filter(x => LETTERS(x) >= 3);
        if (names.length >= 2) {
          const sc2 = { ...sc, note: [...(sc.note || []), 'Superset'], has: !!(sc.sets || sc.reps) };
          if (!day) newDay(null); const gid = F.uid(); names.forEach(n => { addItem(n, sc2, line).ss = gid; }); continue;
        }
      }
      // ---- tabela ze spacjami zamiast kresek (typowe dla OCR): nagłówek „Ćwiczenie  Serie Powt. Przerwa” ----
      if (/[|\t;]/.test(line)) { /* tabela z kreskami — obsługuje ją kod poniżej */ }
      else if (!/\d/.test(line)) {
        const keys = []; F.norm(line).split(/[\s|;\t]+/).forEach(w => { for (const k in TABLE_HEAD) if (k !== 'name' && TABLE_HEAD[k].test(w) && !keys.includes(k)) keys.push(k); });
        if (keys.length >= 2 && LETTERS(line) < 60) { headerOrder = keys; headerMap = null; continue; }
      } else if (headerOrder) {
        const mt = line.match(/^(.*?[^\d\s|;])\s+((?:\d[\d.,\-\/]*\s*(?:sek[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|min[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|kg|lbs?|s\b|'|")?\s*){2,})$/i);
        const nm0 = mt && mt[1].replace(/^\d+[.)]\s*/, '').trim();
        if (mt && LETTERS(nm0) >= 3) {
          const vals = mt[2].match(/\d[\d.,\-\/]*\s*(?:sek[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|min[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*|kg|lbs?|s\b|'|")?/gi) || [];
          const sc = { sets: 0, reps: '', rest: 0, w: 0, unit: '', note: [], time: false };
          headerOrder.forEach((k, i) => {
            const v = (vals[i] || '').trim(); if (!v) return; const n = num(v); const un = (v.match(/[a-ząćęłńóśźż'"]+$/i) || [''])[0].toLowerCase();
            if (k === 'sets') sc.sets = Math.round(n) || 0;
            else if (k === 'reps') { if (/^(s|sek|min)/.test(un) || un === '"') { sc.time = true; sc.reps = String(/^m/.test(un) ? Math.round(n * 60) : Math.round(n)); } else sc.reps = v.replace(/[^\d\-\/]/g, ''); }
            else if (k === 'rest') sc.rest = Math.round(/^m/.test(un) || un === "'" ? n * 60 : (!un && n <= 6 ? n * 60 : n));
            else if (k === 'w') { sc.w = n; sc.unit = /^l/.test(un) ? 'lb' : 'kg'; }
          });
          sc.has = !!(sc.sets || sc.reps); addItem(nm0, sc, line); continue;
        }
      }
      // ---- wiersz tabeli ----
      const cells = line.split(/\s*\|\s*|\t|;|\s{3,}/).map(c => c.trim()).filter(c => c !== '');
      if (cells.length >= 2 && /[|\t;]|\s{3,}/.test(line)) {
        const low = cells.map(c => F.norm(c));
        const hm = {}; low.forEach((c, i) => { for (const k in TABLE_HEAD) if (hm[k] == null && TABLE_HEAD[k].test(c) && !/\d/.test(c)) hm[k] = i; });
        if (Object.keys(hm).length >= 2 && !scheme(line).has) { headerMap = hm; continue; }
        if (headerMap && headerMap.name != null && cells[headerMap.name]) {
          const nm = cells[headerMap.name]; if (LETTERS(nm) >= 3) {
            const g = k => headerMap[k] != null ? (cells[headerMap[k]] || '') : '';
            const sc = { sets: parseInt(g('sets')) || 0, reps: g('reps').replace(/[xX×]/g, '').replace(/(\d+)\s*min\w*/i, (m, a) => String(+a * 60)).replace(/\s*(sek[\wąćęłńóśźż]*|s|")\s*$/i, '').replace(/\s/g, '').trim(), rest: 0, w: 0, unit: '', note: [] };
            const rs = g('rest'); if (rs) { const m = rs.match(/(\d+(?:[.,]\d+)?)\s*(min\w*|m\b|')?/i); if (m) sc.rest = Math.round(num(m[1]) * (m[2] ? 60 : (num(m[1]) <= 6 ? 60 : 1))); }
            const ws = g('w'); if (ws) { const m = ws.match(/(\d+(?:[.,]\d+)?)\s*(lbs?|kg)?/i); if (m) { sc.w = num(m[1]); sc.unit = (m[2] || '').toLowerCase().startsWith('l') ? 'lb' : 'kg'; } }
            const s2 = scheme(cells.filter((c, i) => i !== headerMap.name).join(' '));
            if (!sc.sets && s2.sets) { sc.sets = s2.sets; if (!sc.reps) sc.reps = s2.reps; } if (!sc.rest && s2.rest) sc.rest = s2.rest;
            sc.has = !!(sc.sets || sc.reps); addItem(nm.replace(/^\d+[.)]?\s*/, ''), sc, line); continue;
          }
        }
      }
      // ---- pojedyncza seria ----
      const sl = setLine(line);
      if (sl && (pending || prev)) {
        const kg = sl.unit === 'lb' ? sl.w / 2.2046 : sl.w;
        if (pending) { addItem(pending.name, { has: true, sets: 1, reps: String(sl.r), w: sl.w, unit: sl.unit, note: [] }, pending.src); }
        else if (prev.defaulted) { prev.defaulted = false; prev.sets = 1; prev.reps = String(sl.r); prev.w = kg; }
        else { prev.sets += 1; const rs = (prev.reps.match(/\d+/g) || []).map(Number).concat(sl.r); prev.reps = Math.min(...rs) === Math.max(...rs) ? String(rs[0]) : Math.min(...rs) + '-' + Math.max(...rs); if (kg > prev.w) prev.w = kg; }
        continue;
      }
      // ---- zwykła linia ----
      const sc = scheme(line);
      const name = sc.clean.replace(/^\d{1,2}[.)]?\s+(?=[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])/, '').replace(/\(\s*\)/g, '').trim();
      const letters = LETTERS(name);
      if (sc.has && letters < 3) { // sama liczba serii/powtórzeń — dotyczy poprzedniej nazwy
        if (pending) { const it = addItem(pending.name, sc, pending.src + ' ' + line); continue; }
        if (prev && prev.defaulted) { prev.sets = sc.sets || prev.sets; prev.reps = sc.reps || prev.reps; prev.rest = sc.rest || prev.rest; if (sc.w) prev.w = sc.unit === 'lb' ? sc.w / 2.2046 : sc.w; prev.defaulted = false; }
        continue;
      }
      if (sc.has && letters >= 3) { // nazwa + schemat w jednej linii
        if (!day) newDay(null); addItem(name, sc, line); continue;
      }
      if (!sc.has && !sc.rest && !sc.w && sc.note.length === 0 && letters < 2) continue; // śmieci OCR
      // brak schematu: nagłówek dnia, nazwa ćwiczenia (oczekująca) lub notatka
      const cands = letters >= 3 ? F.matchExercise(name) : []; const top = cands[0]; const exLike = top && top.score >= 0.72;
      const isCaps = letters >= 4 && name === name.toUpperCase() && !/\d{2,}/.test(name);
      const isHead = !exLike && letters >= 2 && name.length <= 60 && (DAYRE.test(name) || WEEKDAY.test(name) || SPLIT.test(name) || /:\s*$/.test(lines[idx].trim()) || isCaps);
      if (isHead) {
        const h = name.replace(/:\s*$/, '').replace(/\s+/g, ' ').trim();
        if (!plan.days.length && !firstSeen && !DAYRE.test(h) && !WEEKDAY.test(h) && !SPLIT.test(h) && !plan.name && /plan|program|cykl|split|mikrocykl|ppl|fbw/i.test(h)) { plan.name = h; firstSeen = true; continue; }
        firstSeen = true; if (day && !day.items.length) { day.name = h; pending = null; } else newDay(h); continue;
      }
      if (!firstSeen && !plan.name && letters >= 3 && name.length <= 70 && !exLike) { plan.name = name.replace(/:\s*$/, ''); firstSeen = true; continue; }
      firstSeen = true;
      if (exLike || (letters >= 4 && lines[idx + 1] && scheme(lines[idx + 1]).has && LETTERS(scheme(lines[idx + 1]).clean) < 3)) { pending = { name, src: line }; if (!day) newDay(null); continue; }
      if (letters >= 4 && prev && /^(?:tempo|uwaga|notatka|note|tip|wskaz|porada)/i.test(name)) { prev.note = (prev.note ? prev.note + '; ' : '') + name; continue; }
      if (letters >= 4 && !hadMark && !prev && !pending && name.length < 50 && cands[0] && cands[0].score >= 0.5) { pending = { name, src: line }; if (!day) newDay(null); continue; }
      if (letters >= 4 && hadMark) { pending = { name, src: line }; if (!day) newDay(null); }
    }
    // oczekująca nazwa bez schematu → dodaj z domyślnymi seriami
    if (pending) addItem(pending.name, { has: false, note: [] }, pending.src);
    plan.days = plan.days.filter(d => d.items.length);
    plan.days = plan.days.filter(d => d.items.some(it => it.exId || it.conf >= 0.35));
    // przerwy z zasad planu dla ćwiczeń, które nie mają własnej przerwy
    if (Object.keys(restRules).length) {
      let applied = 0;
      plan.days.forEach(d => d.items.forEach(it => {
        if (it.rest) return; const ex = it.exId && F.S.ex.get(it.exId); const big = ex ? !!ex.compound : false;
        const v = big ? (restRules.big || restRules.all) : (restRules.small || restRules.all || (restRules.big && ex && !ex.compound ? 0 : 0));
        if (v) { it.rest = v; it.restRule = true; applied++; }
      }));
      plan.restInfo = { rules: restRules, applied, lines: ruleNotes };
    }
    const dn = plan.days.map(d => { const m = d.name.match(/(?:dzie[nń]|day|trening|workout|sesja)\s*#?(\d{1,2})\b/i); return m ? +m[1] : null; });
    if (dn.length > 1 && dn.every(x => x != null) && new Set(dn).size === dn.length) plan.days = plan.days.map((d, i) => [dn[i], d]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    // scal oczekujące elementy (nazwa bez schematu na końcu dnia już dodane przez addItem)
    plan.days.forEach(d => { const seen = new Set(); d.items = d.items.filter(it => { const key = (it.exId || it.newName) + '|' + it.sets + '|' + it.reps; if (seen.has(key) && it.defaulted) return false; seen.add(key); return true; }); });
    return plan;
  };

  /* ---------- CSV ---------- */
  F.parseCSV = text => {
    text = String(text || '').replace(/^﻿/, ''); const first = text.split('\n')[0] || ''; const cnt = c => (first.match(new RegExp(c === '\t' ? '\t' : '\\' + c, 'g')) || []).length;
    const delim = [',', ';', '\t'].sort((a, b) => cnt(b) - cnt(a))[0]; const rows = []; let cur = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"') q = true; else if (ch === delim) { cur.push(f); f = ''; } else if (ch === '\n') { cur.push(f.replace(/\r$/, '')); rows.push(cur); cur = []; f = ''; } else f += ch;
    }
    if (f || cur.length) { cur.push(f.replace(/\r$/, '')); rows.push(cur); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  };
  const HCOL = {
    date: ['date', 'data', 'start_time', 'start time', 'workout date', 'datetime', 'created'], wname: ['workout name', 'workout', 'nazwa treningu', 'title', 'routine', 'trening', 'workout title'],
    ex: ['exercise name', 'exercise', 'exercise_title', 'cwiczenie', 'nazwa cwiczenia', 'movement'], w: ['weight', 'weight (kg)', 'weight_kg', 'ciezar', 'ciezar (kg)', 'weight (lbs)', 'weight_lbs', 'weight (lb)', 'obciazenie'],
    r: ['reps', 'repetitions', 'powtorzenia', 'powt', 'rep'], ord: ['set order', 'set_index', 'set', 'seria', 'set number', 'set #'], sec: ['seconds', 'duration_seconds', 'time', 'czas (s)', 'sek'],
    dur: ['duration', 'czas trwania', 'workout duration'], note: ['notes', 'notatki', 'exercise_notes', 'notatka', 'comment'], rpe: ['rpe'], stype: ['set_type', 'set type', 'typ serii'], end: ['end_time', 'end time']
  };
  F.isHistoryCSV = rows => { if (rows.length < 2) return false; const h = rows[0].map(c => F.norm(c)); const has = k => HCOL[k].some(x => h.includes(F.norm(x))); return has('ex') && has('r') && has('date'); };
  const MONTH_EN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }, MONTH_PL = { sty: 0, lut: 1, mar: 2, kwi: 3, maj: 4, cze: 5, lip: 6, sie: 7, wrz: 8, paz: 9, lis: 10, gru: 11 };
  F.parseDateLoose = s => {
    s = String(s || '').trim(); if (!s) return NaN;
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/); if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0), +(m[6] || 0)).getTime();
    m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2}))?/); if (m) { let d = +m[1], mo = +m[2]; if (mo > 12 && d <= 12) [d, mo] = [mo, d]; return new Date(+m[3], mo - 1, d, +(m[4] || 12), +(m[5] || 0)).getTime(); }
    m = s.match(/^(\d{1,2})\s+([A-Za-zżźćńółęąś]{3})[a-z.]*\s+(\d{4})(?:[ ,]+(\d{1,2}):(\d{2}))?/i); if (m) { const k = F.norm(m[2]); const mo = MONTH_EN[k] != null ? MONTH_EN[k] : MONTH_PL[k]; if (mo != null) return new Date(+m[3], mo, +m[1], +(m[4] || 12), +(m[5] || 0)).getTime(); }
    const t = Date.parse(s); return isNaN(t) ? NaN : t;
  };
  // zwraca {sessions:[...], newEx:[...], stats}
  F.parseHistoryRows = rows => {
    const h = rows[0].map(c => F.norm(c)); const col = k => { for (const x of HCOL[k]) { const i = h.indexOf(F.norm(x)); if (i >= 0) return i; } return -1; };
    const C = {}; Object.keys(HCOL).forEach(k => C[k] = col(k)); const lb = C.w >= 0 && /lb/.test(h[C.w]);
    const groups = new Map(); const exMap = new Map(); const newEx = new Map(); let skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; const ts = F.parseDateLoose(r[C.date]); const exn = (r[C.ex] || '').trim(); if (isNaN(ts) || !exn) { skipped++; continue; }
      const wn = C.wname >= 0 ? (r[C.wname] || '').trim() : ''; const key = ts + '|' + wn; // różne daty z godziną → osobne treningi
      const dayKey = C.date >= 0 && /\d{1,2}:\d{2}/.test(r[C.date]) ? key : F.dayKey(ts) + '|' + wn;
      let g = groups.get(dayKey); if (!g) { g = { start: ts, name: wn || 'Trening', dur: 0, exercises: new Map() }; groups.set(dayKey, g); }
      if (!exMap.has(exn)) { const c = F.matchExercise(exn)[0]; if (c && c.score >= 0.72) exMap.set(exn, c.ex.id); else { const nid = 'c_' + F.norm(exn).replace(/ /g, '_').slice(0, 40); exMap.set(exn, nid); if (!newEx.has(nid) && !F.S.ex.has(nid)) newEx.set(nid, { id: nid, name: exn, muscle: F.guessMuscle(exn), equip: 'Inne', type: 'wr', compound: false, alias: '', custom: true }); } }
      const exId = exMap.get(exn); let e = g.exercises.get(exId); if (!e) { e = { exId, note: '', rest: 0, sets: [] }; g.exercises.set(exId, e); }
      const wv = C.w >= 0 ? num(r[C.w]) || 0 : 0; const secs = C.sec >= 0 ? num(r[C.sec]) || 0 : 0; const reps = C.r >= 0 ? num(r[C.r]) || 0 : 0;
      const st = C.stype >= 0 ? F.norm(r[C.stype]) : ''; const type = /warm|rozgrz/.test(st) ? 'w' : /drop/.test(st) ? 'd' : /fail|upad/.test(st) ? 'f' : 'n';
      if (!wv && !reps && !secs) continue;
      const exObj = F.S.ex.get(exId) || newEx.get(exId);
      if (!reps && secs && exObj && exObj.type === 'wr' && !wv) { exObj.type = 'time'; }
      e.sets.push({ w: lb ? wv / 2.2046226 : wv, r: reps || secs, t: type, rpe: C.rpe >= 0 ? (num(r[C.rpe]) || null) : null, done: true });
      if (C.note >= 0 && r[C.note] && !e.note) e.note = r[C.note].trim();
      if (C.dur >= 0 && !g.dur) { const d = String(r[C.dur] || ''); const mh = d.match(/(\d+)\s*h/i), mm = d.match(/(\d+)\s*m/i); g.dur = mh || mm ? ((mh ? +mh[1] : 0) * 3600 + (mm ? +mm[1] : 0) * 60) : (num(d) > 0 ? num(d) * (num(d) < 600 ? 60 : 1) : 0); }
      if (C.end >= 0 && !g.dur && r[C.end]) { const te = F.parseDateLoose(r[C.end]); if (!isNaN(te) && te > ts) g.dur = Math.round((te - ts) / 1000); }
    }
    const sessions = [...groups.values()].map(g => ({ id: F.uid(), start: g.start, end: g.start + g.dur * 1000, dur: g.dur, name: g.name, planId: null, dayId: null, note: '', exercises: [...g.exercises.values()].filter(e => e.sets.length), prs: [] })).filter(s => s.exercises.length).sort((a, b) => a.start - b.start);
    return { sessions, newEx: [...newEx.values()], skipped, sets: sessions.reduce((a, s) => a + s.exercises.reduce((x, e) => x + e.sets.length, 0), 0) };
  };

  // Przelicza rekordy (znaczniki PR) dla całej historii chronologicznie
  F.recomputeAllPRs = async () => {
    const idx = {}; const ordered = [...F.S.sessions].sort((a, b) => a.start - b.start);
    for (const se of ordered) {
      const prs = [];
      se.exercises.forEach(e => {
        const ex = F.S.ex.get(e.exId); if (!ex) return;
        e.sets.forEach(s => { s.pr = null; if (!F.isWork(s)) return; const p = F.checkPR(idx, ex, s, se.start); F.addToIdx(idx, ex, s, se.start); if (p.length) { s.pr = p.map(x => x.k); const txt = ex.type === 'time' ? F.fmtDur(s.r) : ex.type === 'br' ? s.r + ' powt.' : `${F.fw(s.w)} ${F.unit()} × ${s.r}`; const rec = { exId: e.exId, k: p[0].k, label: p[0].label, text: txt }; const i = prs.findIndex(q => q.exId === e.exId); if (i >= 0) prs[i] = rec; else prs.push(rec); } });
      });
      se.prs = prs;
    }
    await F.dbPutMany('sessions', F.S.sessions); F.rebuild();
  };
})();
