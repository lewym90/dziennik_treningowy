/* FORGE — kreator planu: wywiad krok po kroku (jak u trenera), podgląd i zapis planu. Silnik: js/planner.js */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views; const P = F.PLN;
  const num = v => parseFloat(String(v).replace(',', '.'));
  const WD = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const STEPS = ['intro', 'about', 'health', 'exp', 'goal', 'cardio', 'sched', 'equip', 'limits', 'split'];
  const STEP_T = { intro: 'Start', health: 'Zdrowie', about: 'O Tobie', exp: 'Doświadczenie', goal: 'Cel', cardio: 'Cardio', sched: 'Terminarz', equip: 'Sprzęt', limits: 'Ograniczenia', split: 'Podział' };
  const SCR = [
    'Czy lekarz kiedykolwiek stwierdził u Ciebie chorobę serca lub zalecił ćwiczenia wyłącznie pod nadzorem medycznym?',
    'Czy podczas wysiłku fizycznego czujesz ból w klatce piersiowej?',
    'Czy w ostatnim miesiącu miałeś(aś) ból w klatce piersiowej w spoczynku?',
    'Czy zdarza Ci się tracić równowagę z powodu zawrotów głowy albo tracić przytomność?',
    'Czy masz problem z kośćmi, stawami lub mięśniami, który mógłby się nasilić przez ćwiczenia?',
    'Czy przyjmujesz obecnie leki na ciśnienie lub na serce?',
    'Czy znasz jakikolwiek inny powód, dla którego nie powinieneś(aś) teraz ćwiczyć?'
  ];
  const EQ_ALL = ['Sztanga', 'Hantle', 'Maszyna', 'Wyciąg', 'Kettlebell', 'Drążek', 'Inne'];
  const EQ_L = { Sztanga: 'Sztangi i talerze', Hantle: 'Hantle', Maszyna: 'Maszyny', Wyciąg: 'Wyciągi / linki', Kettlebell: 'Kettlebell', Drążek: 'Drążek do podciągania', Inne: 'Guma, piłka, inne' };
  const PRESET = { gym: ['Siłownia', 'wszystko: sztangi, maszyny, wyciągi', { equip: [...EQ_ALL], bench: true, rack: true }], home: ['Dom: hantle', 'hantle, kettlebell, guma, drążek', { equip: ['Hantle', 'Kettlebell', 'Drążek', 'Inne'], bench: true, rack: false }], bw: ['Tylko masa ciała', 'bez sprzętu', { equip: ['Drążek'], bench: false, rack: false }] };
  const PRIO = { chest: 'Klatka', back: 'Plecy', shoulders: 'Barki', arms: 'Ramiona', legs: 'Nogi', glutes: 'Pośladki', abs: 'Brzuch' };
  const CARDIO = { walk: 'Marsz / podejście', bike: 'Rower', run: 'Bieganie', row: 'Wioślarz', ellip: 'Orbitrek' };

  /* ---------- stan ---------- */
  // dane zapisane przez starsze wersje kreatora mogą mieć inny kształt — przyjmujemy tylko poprawne typy
  const arr = (v, ok) => Array.isArray(v) ? v.filter(ok) : null;
  const defaults = () => {
    const s = F.S.settings, z = (s.wiz && typeof s.wiz === 'object') ? s.wiz : {}, p = F.profile(); const hist = F.S.sessions.length; const last = hist ? F.S.sessions[0].start : 0;
    const str = x => typeof x === 'string'; const nm = x => typeof x === 'number' && isFinite(x);
    const days = arr(z.days, d => Number.isInteger(d) && d >= 0 && d <= 6); const equip = arr(z.equip, str);
    return {
      scr: Array(7).fill(null), preg: s.sex === 'f' ? null : 'no', doc: false,
      exp: P.EXPS[s.exp] ? s.exp : (P.EXPS[z.exp] ? z.exp : ''), active: hist ? (Date.now() - last < 56 * 864e5) : null,
      goal: P.GOALS[z.goal] ? z.goal : 'hyp', prio: arr(z.prio, x => PRIO[x]) || [], cardioMin: [0, 60, 120, 180].includes(z.cardioMin) ? z.cardioMin : 0, cardioAdd: typeof z.cardioAdd === 'boolean' ? z.cardioAdd : null, cardioPref: CARDIO[z.cardioPref] ? z.cardioPref : 'walk',
      days: days && days.length ? [...new Set(days)].sort((x, y) => x - y) : [0, 2, 4], time: [0, 30, 45, 60, 75, 90].includes(z.time) ? z.time : 60,
      equip: equip && equip.length ? equip : [...EQ_ALL], bench: z.bench !== false, rack: z.rack !== false, preset: PRESET[z.preset] ? z.preset : (equip && equip.length ? '' : 'gym'),
      cAct: (arr(z.cAct, x => F.CARDIO.valid(x)) || []).map(x => ({ t: x.t, n: x.n, m: x.m, i: x.i, plan: !!x.plan && !!F.CARDIO.T[x.t][2], place: x.place === 'sep' ? 'sep' : 'after' })), cNow: typeof z.cNow === 'boolean' ? z.cNow : null, cChoice: typeof z.cChoice === 'string' ? z.cChoice : '', cAddType: F.CARDIO.T[z.cAddType] ? z.cAddType : '',
      inj: arr(z.inj, x => P.INJ[x]) || [], avoid: arr(z.avoid, str) || [], fav: arr(z.fav, str) || [], split: 'auto', sleep: [1, 2, 3].includes(s.sleep) ? s.sleep : 0, bw: p.bwKnown ? p.bw : ''
    };
  };
  F.wz = null; const Z = () => F.wz || (F.wz = { step: 'intro', w: defaults(), res: null, variant: 0, bwEdit: null });
  const cur = () => STEPS.indexOf(Z().step);
  const goalDefaultsCardio = g => g === 'sculpt' || g === 'health' || g === 'endur';

  const chip = (on, act, attrs, label) => `<button class="chip ${on ? 'on' : ''}" data-a="${act}" ${attrs}>${E(label)}</button>`;
  const opt = (on, act, attrs, t, sub) => `<button class="wz-o ${on ? 'on' : ''}" data-a="${act}" ${attrs}><b>${E(t)}</b>${sub ? `<small>${E(sub)}</small>` : ''}</button>`;
  const yn = (k, i, v) => `<div class="wz-yn ${v === null ? 'miss' : ''}"><p>${E(SCR[i])}</p><div class="chips">${chip(v === false, 'wzScr', `data-i="${i}" data-v="0"`, 'Nie')}${chip(v === true, 'wzScr', `data-i="${i}" data-v="1"`, 'Tak')}</div></div>`;

  /* ---------- kroki ---------- */
  const bodies = {
    intro: () => `<section class="card cut"><h3>${ic('sparkles', 18)} Twój osobisty plan</h3>
      <p class="small">Ułożę plan tak, jak zrobiłby to trener: zapytam o zdrowie, Twoje dane, doświadczenie, cel, dni i sprzęt, a potem dobiorę podział, serie, powtórzenia, przerwy i ćwiczenia.</p>
      <p class="small">Ok. ${STEPS.length - 1} krótkich kroków. Dane zostają tylko w tym telefonie, a to, co wpiszesz o sobie, zapiszę w profilu, żeby nie pytać drugi raz.</p>
      <p class="dim small">Plan jest wskazówką opartą na ogólnych zasadach treningu. Nie zastępuje lekarza ani trenera; przy chorobie, kontuzji lub ciąży skonsultuj się ze specjalistą.</p></section>`,
    health: () => { const w = Z().w; const f = F.S.settings.sex === 'f'; return `<section class="card cut"><h3>${ic('shield', 18)} Zdrowie i bezpieczeństwo</h3>
      <p class="dim small">Pytania wzorowane na powszechnie stosowanym kwestionariuszu gotowości do aktywności fizycznej (PAR-Q+). Odpowiedz szczerze — to dla Twojego bezpieczeństwa.</p>
      ${SCR.map((q, i) => yn('scr', i, w.scr[i])).join('')}
      ${f ? `<div class="wz-yn"><p>Czy jesteś w ciąży lub w ciągu 12 miesięcy po porodzie?</p><div class="chips">${chip(w.preg === 'no', 'wzPreg', 'data-v="no"', 'Nie')}${chip(w.preg === 'preg', 'wzPreg', 'data-v="preg"', 'W ciąży')}${chip(w.preg === 'post', 'wzPreg', 'data-v="post"', 'Po porodzie')}</div></div>` : ''}
      ${healthVerdict()}</section>`; },
    about: () => { const s = F.S.settings, w = Z().w; const u = F.unit();
      return `<section class="card cut"><h3>${ic('user', 18)} O Tobie</h3>
      <p class="dim small">Te dane pomagają dobrać objętość, intensywność i policzyć kalorie. Zapisują się w profilu.</p>
      <div class="seg tiny sx"><button class="${s.sex === 'm' ? 'on' : ''}" data-a="wzSex" data-v="m">Mężczyzna</button><button class="${s.sex === 'f' ? 'on' : ''}" data-a="wzSex" data-v="f">Kobieta</button></div>
      <div class="two"><label class="fld"><span>Data urodzenia</span><input type="date" data-b="prof" data-k="dob" value="${s.dob || ''}" max="${F.dateInput(Date.now())}">${!s.dob && s.age ? `<small class="dim">Wiek: ${F.ageNow()} lat</small>` : ''}</label>
        <label class="fld"><span>Wzrost (cm)</span><input data-b="prof" data-k="height" inputmode="numeric" value="${s.height || ''}" placeholder="178"></label></div>
      <div class="two"><label class="fld"><span>Masa ciała (${u})</span><input data-b="wzBw" inputmode="decimal" value="${w.bw === '' ? '' : F.fw(w.bw)}" placeholder="80"></label>
        <label class="fld"><span>% tłuszczu (opc.)</span><input data-b="prof" data-k="bf" inputmode="decimal" value="${s.bf || ''}" placeholder="np. 18"></label></div>
      <label class="fld"><span>Aktywność w ciągu dnia (poza treningiem)</span><select data-b="prof" data-k="activity"><option value="">— wybierz —</option>${[[1, 'Siedząca praca, mało ruchu'], [2, 'Lekka — trochę chodzenia'], [3, 'Umiarkowana — dużo na nogach'], [4, 'Wysoka — praca fizyczna']].map(([k, t]) => `<option value="${k}" ${s.activity === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <h4 class="lbl">Ile średnio śpisz?</h4><div class="chips" id="wz-sleep">${chip(w.sleep === 1, 'wzSet', 'data-k="sleep" data-v="1" data-n="1"', 'poniżej 6 h')}${chip(w.sleep === 2, 'wzSet', 'data-k="sleep" data-v="2" data-n="1"', '6–7 h')}${chip(w.sleep === 3, 'wzSet', 'data-k="sleep" data-v="3" data-n="1"', '7 h i więcej')}</div>
      </section>`; },
    exp: () => { const w = Z().w, n = F.S.sessions.length; return `<section class="card cut"><h3>${ic('dumbbell', 18)} Doświadczenie</h3>
      ${n ? `<p class="dim small">W aplikacji masz zapisanych ${n} ${F.plur(n, 'trening', 'treningi', 'treningów')}${w.active === false ? ', ostatni dawniej niż 8 tygodni temu' : ''}.</p>` : ''}
      <div class="wz-opts">${Object.entries(P.EXPS).map(([k, v]) => opt(w.exp === k, 'wzSet', `data-k="exp" data-v="${k}"`, v[0], v[1])).join('')}</div>
      <h4 class="lbl">Czy trenujesz regularnie od co najmniej 8 tygodni?</h4>
      <div class="chips" id="wz-active">${chip(w.active === true, 'wzSet', 'data-k="active" data-v="1" data-b1="1"', 'Tak')}${chip(w.active === false, 'wzSet', 'data-k="active" data-v="0" data-b1="1"', 'Nie, wracam po przerwie')}</div>
      <p class="dim small">Jeśli nie jesteś pewien, wybierz niższy poziom — łatwiej dołożyć niż się przeciążyć.</p></section>`; },
    goal: () => { const w = Z().w; return `<section class="card cut"><h3>${ic('trophy', 18)} Cel</h3>
      <div class="wz-opts">${Object.entries(P.GOALS).map(([k, v]) => opt(w.goal === k, 'wzGoal', `data-v="${k}"`, v[0], v[1])).join('')}</div>
      <h4 class="lbl">Partie priorytetowe (do 3, opcjonalnie)</h4><div class="chips">${Object.entries(PRIO).map(([k, t]) => chip(w.prio.includes(k), 'wzPrio', `data-v="${k}"`, t)).join('')}</div>
      <p class="dim small">Priorytetowe partie dostaną więcej serii, pozostałe utrzymam na rozsądnym poziomie.</p>
      <p class="dim small">Cardio omówimy w następnym kroku.</p></section>`; },
    cardio: () => { const w = Z().w; const C = F.CARDIO; const adv = F.cardioAdvice(wFull()); const nTxt = n => n + ' ' + F.plur(n, 'raz', 'razy', 'razy');
      const step = (i, k, v, d) => `<div class="stepper"><button data-a="wzCStep" data-i="${i}" data-k="${k}" data-d="-1" aria-label="Mniej">−</button><input inputmode="numeric" data-b="wzCf" data-i="${i}" data-k="${k}" value="${v}"><button data-a="wzCStep" data-i="${i}" data-k="${k}" data-d="1" aria-label="Więcej">+</button></div>`;
      const act = (a, i) => `<div class="cact"><div class="cact-h"><b>Aktywność ${i + 1}</b><button class="iconbtn" data-a="wzCDel" data-i="${i}" aria-label="Usuń">${ic('trash-2', 18)}</button></div>
        <label class="fld"><span>Rodzaj</span><select data-b="wzCf" data-i="${i}" data-k="t">${Object.entries(C.T).map(([k, v]) => `<option value="${k}" ${a.t === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label>
        <div class="two"><div class="fld"><span>Razy w tygodniu</span>${step(i, 'n', a.n)}</div><div class="fld"><span>Minut na sesję</span>${step(i, 'm', a.m)}</div></div>
        <h4 class="lbl">Jak ciężko?</h4><div class="chips">${[1, 2, 3].map(x => chip(a.i === x, 'wzCInt', `data-i="${i}" data-v="${x}"`, C.INT[x][0].toUpperCase() + C.INT[x].slice(1))).join('')}</div><p class="dim small">${C.INT_D[a.i]}</p>
        ${C.T[a.t][2] ? `<h4 class="lbl">Uwzględnić to w planie?</h4><div class="chips">${chip(a.plan, 'wzCPlan', `data-i="${i}" data-v="1"`, 'Tak, wstaw do planu')}${chip(!a.plan, 'wzCPlan', `data-i="${i}" data-v="0"`, 'Nie, robię to poza planem')}</div>
        ${a.plan ? `<div class="chips">${chip(a.place === 'after', 'wzCPlace', `data-i="${i}" data-v="after"`, 'Po treningu siłowym')}${chip(a.place === 'sep', 'wzCPlace', `data-i="${i}" data-v="sep"`, 'Osobna sesja (np. w domu)')}</div>` : ''}` : `<p class="dim small">Tego nie zrobisz na siłowni, więc policzę to do Twoich tygodniowych minut, ale nie wstawię do planu.</p>`}</div>`;
      const showAdv = w.cNow === false || (w.cNow && w.cAct.length);
      const types = Object.entries(C.T).filter(([k, v]) => v[2]);
      return `<section class="card cut"><h3>${ic('heart', 18)} Cardio</h3>
      <h4 class="lbl" id="wz-cnow">Czy teraz regularnie robisz cardio (rower, bieganie, marsz, pływanie, rolki…)?</h4>
      <div class="chips">${chip(w.cNow === true, 'wzCNow', 'data-v="1"', 'Tak')}${chip(w.cNow === false, 'wzCNow', 'data-v="0"', 'Nie robię')}</div>
      ${w.cNow ? `<div id="wz-cacts">${w.cAct.map(act).join('')}<button class="btn ghost sm" data-a="wzCAdd">${ic('plus', 16)} Dodaj ${w.cAct.length ? 'kolejną ' : ''}aktywność</button></div>` : ''}
      ${showAdv ? `<div class="cadv"><b>Moja ocena</b><p>${E(adv.text)}</p></div>
      <h4 class="lbl">Co chcesz zrobić?</h4><div class="wz-opts">${adv.opts.map(o => opt(adv.chosen.id === o.id, 'wzCChoice', `data-v="${o.id}"`, o.label, o.desc)).join('')}</div>
      ${adv.canPickType && adv.chosen.id === 'add' ? `<h4 class="lbl">Rodzaj dodawanego cardio</h4><div class="chips">${types.map(([k, v]) => chip(adv.addT === k, 'wzCType', `data-v="${k}"`, v[0])).join('')}</div>` : ''}` : ''}
      <p class="dim small">Minuta intensywnego wysiłku liczy się jak dwie umiarkowane, a wysiłek lekki nie liczy się do zaleceń WHO (150–300 min umiarkowanej aktywności tlenowej tygodniowo).</p></section>`; },
    sched: () => { const w = Z().w; const n = w.days.length; return `<section class="card cut"><h3>${ic('calendar', 18)} Terminarz</h3>
      <h4 class="lbl">W które dni tygodnia możesz trenować?</h4><div class="chips" id="wz-days">${WD.map((t, i) => chip(w.days.includes(i), 'wzDay', `data-v="${i}"`, t)).join('')}</div>
      <p class="small">${n ? `Wybrano ${n} ${F.plur(n, 'dzień', 'dni', 'dni')} tygodniowo.` : 'Wybierz co najmniej jeden dzień.'}${n >= 6 ? ' Zostaw przynajmniej jeden dzień na pełny odpoczynek.' : ''}</p>
      ${timeBlock(w)}</section>`; },
    equip: () => { const w = Z().w; return `<section class="card cut"><h3>${ic('dumbbell', 18)} Sprzęt</h3>
      <div class="wz-opts">${Object.entries(PRESET).map(([k, v]) => opt(w.preset === k, 'wzPreset', `data-v="${k}"`, v[0], v[1])).join('')}</div>
      <h4 class="lbl">Dostosuj</h4>
      ${EQ_ALL.map(k => `<label class="sw"><span><b>${EQ_L[k]}</b></span><input type="checkbox" data-b="wzEq" data-k="${k}" ${w.equip.includes(k) ? 'checked' : ''}><i></i></label>`).join('')}
      <label class="sw"><span><b>Ławka (płaska / regulowana)</b></span><input type="checkbox" data-b="wzFlag" data-k="bench" ${w.bench ? 'checked' : ''}><i></i></label>
      <label class="sw"><span><b>Stojak do przysiadów i wyciskania</b><small>bez stojaka pominę ciężkie ćwiczenia ze sztangą</small></span><input type="checkbox" data-b="wzFlag" data-k="rack" ${w.rack ? 'checked' : ''}><i></i></label></section>`; },
    limits: () => { const w = Z().w; const nm = id => E(P.exName(id)); const list = (arr, act) => arr.length ? `<div class="chips">${arr.map(id => `<button class="chip on" data-a="${act}" data-id="${id}">${nm(id)} ✕</button>`).join('')}</div>` : ''; return `<section class="card cut"><h3>${ic('shield', 18)} Ograniczenia i preferencje</h3>
      <h4 class="lbl">Bolące lub kontuzjowane miejsca</h4><div class="chips">${Object.entries(P.INJ).map(([k, t]) => chip(w.inj.includes(k), 'wzInj', `data-v="${k}"`, t)).join('')}</div>
      <p class="dim small">Pominę ćwiczenia, które zwykle je obciążają. To nie jest porada medyczna — przy bólu skonsultuj się z lekarzem lub fizjoterapeutą.</p>
      <h4 class="lbl">Ćwiczenia, których nie chcę</h4>${list(w.avoid, 'wzUnavoid')}<button class="btn ghost sm" data-a="wzAddAvoid">${ic('plus', 16)} Dodaj</button>
      <h4 class="lbl">Ćwiczenia, które lubię (wstawię je, gdy pasują)</h4>${list(w.fav, 'wzUnfav')}<button class="btn ghost sm" data-a="wzAddFav">${ic('plus', 16)} Dodaj</button></section>`; },
    split: () => { const z = Z(), w = z.w; const gen = wFull(); const rk = P.rank(gen); const top = rk[0]; const lab = (i, r) => i === 0 ? 'Rekomendowany' : r.sc >= top.sc - 8 ? 'Dobry wybór' : r.sc >= top.sc - 20 ? 'Możliwy' : 'Mniej pasujący';
      const fr = id => { const f = P.freqOf(id); return ['chest', 'back', 'shoulders', 'quads', 'hams'].map(m => `${P.MLABEL[m]} ${f[m] || 0}×`).join(' · '); };
      return `<section class="card cut"><h3>${ic('layers', 18)} Podział treningowy</h3>
      <p class="dim small">Dla ${gen.days.length} ${F.plur(gen.days.length, 'dnia', 'dni', 'dni')} tygodniowo. Możesz wybrać dowolny — pod nazwą widzisz, ile razy w tygodniu trenowana jest każda grupa.</p>
      <div class="wz-opts">${rk.map((r, i) => `<button class="wz-o ${(w.split === r.id) || (w.split === 'auto' && i === 0) ? 'on' : ''}" data-a="wzSplit" data-v="${r.id}"><b>${E(r.sp.n)} <em class="tag ${i === 0 ? 'hot' : ''}">${lab(i, r)}</em></b><small>${E(r.sp.d)}</small><small class="dim">${fr(r.id)}</small></button>`).join('') || '<p class="dim">Brak podziałów dla tej liczby dni.</p>'}</div></section>`; }
  };

  const healthVerdict = () => { const w = Z().w; const yes = w.scr.some(x => x === true); const pr = w.preg;
    if (pr === 'preg' || pr === 'post') return `<div class="wz-warn"><b>${pr === 'preg' ? 'Ciąża' : 'Po porodzie'}.</b> WHO zaleca aktywność fizyczną kobietom w ciąży i po porodzie, jeśli nie ma przeciwwskazań. Ułożę łagodniejszy plan (umiarkowany wysiłek, duży zapas powtórzeń, bez ćwiczeń na brzuch, w leżeniu na plecach i ciężkich ćwiczeń ze sztangą). Wymaga to zgody lekarza prowadzącego${pr === 'post' ? ' lub położnej' : ' lub położnej'}.<label class="sw"><span><b>Mam zgodę lekarza lub położnej na ćwiczenia</b></span><input type="checkbox" data-b="wzFlag" data-k="doc" ${w.doc ? 'checked' : ''}><i></i></label></div>`;
    if (yes || pr === 'post') return `<div class="wz-warn"><b>Zalecamy konsultację z lekarzem</b> przed rozpoczęciem treningu${pr === 'post' ? ' (po porodzie zwykle potrzebna jest zgoda lekarza)' : ''}. Mogę ułożyć ostrożniejszy plan (większy zapas powtórzeń, mniej serii), ale nie zastąpi on opinii lekarza. Zatrzymaj ćwiczenie przy bólu w klatce piersiowej, zawrotach głowy lub duszności.</div>`;
    if (w.scr.every(x => x === false)) return `<div class="wz-ok">Brak zastrzeżeń w ankiecie. Pamiętaj, żeby przerwać ćwiczenie przy bólu w klatce piersiowej, zawrotach głowy lub nietypowej duszności.</div>`;
    return ''; };

  // czas na trening: gdy cardio jest po treningu, limit obejmuje siłownię i cardio razem
  const timeBlock = w => { const adv = F.cardioAdvice(wFull()); const C = F.CARDIO; const aft = adv.acts.filter(a => C.valid(a) && C.T[a.t][2] && a.plan && a.place === 'after'); const mx = aft.reduce((m, a) => Math.max(m, a.m), 0);
    const chips = `<div class="chips">${[[30, '30 min'], [45, '45 min'], [60, '60 min'], [75, '75 min'], [90, '90 min'], [120, '120 min'], [0, 'bez limitu']].map(([v, t]) => chip(w.time === v, 'wzSet', `data-k="time" data-v="${v}" data-n="1"`, t)).join('')}</div>`;
    if (!mx) return `<h4 class="lbl">Ile czasu masz na trening siłowy?</h4>${chips}<p class="dim small">Podany czas obejmuje rozgrzewkę i przerwy. Cardio poza siłownią do niego nie wlicza się.</p>`;
    const sw = w.time ? Math.max(30, w.time - mx) : 0;
    return `<h4 class="lbl">Ile masz czasu na jedno wejście na siłownię — RAZEM z cardio po treningu?</h4>${chips}<div class="cadv"><b>Podany czas to siłownia + cardio łącznie.</b><p>${w.time ? `Przy ${w.time} min i cardio ${mx} min po treningu na część siłową zostanie ok. ${sw} min (${sw} + ${mx} = ${sw + mx} min).${w.time - mx < 40 ? ' To mało — cardio, które się nie mieści, przeniosę na osobną sesję.' : ''}` : 'Bez limitu: część siłowa nie będzie skracana.'} Dni bez cardio po treningu dostaną pełny czas.</p></div>`; };

  // pełny zestaw danych dla silnika
  const wFull = () => { const z = Z(), w = z.w, p = F.profile(); const bw = w.bw || p.bw; const h = p.height; const bmi = bw && h ? bw / Math.pow(h / 100, 2) : 0;
    const scrYes = w.scr.some(x => x === true) || w.preg === 'post' || w.preg === 'preg';
    const special = w.preg === 'preg' ? 'preg' : w.preg === 'post' ? 'post' : (p.ageKnown && p.age >= 65 ? 'senior' : '');
    const SP_AVOID = { preg: ['crunch', 'sit_up', 'leg_raise', 'cab_crunch', 'ab_wheel', 'russian', 'woodchop', 'bench', 'bench_inc', 'bench_dec', 'db_bench', 'db_inc', 'chest_mach_', 'skull', 'pullover', 'hip_thrust', 'nordic', 'good_m', 'push_press', 'deadlift', 'sumo', 'jump_rope', 'run', 'pushup'], post: ['crunch', 'sit_up', 'leg_raise', 'cab_crunch', 'ab_wheel', 'russian', 'woodchop', 'jump_rope', 'run', 'good_m', 'push_press'], senior: ['good_m', 'push_press', 'jump_rope', 'nordic', 'upright', 'sit_up'] }[special] || [];
    return { ...w, special, avoid: [...new Set([...w.avoid, ...SP_AVOID])], cardioPref: special === 'preg' || special === 'post' || special === 'senior' ? 'walk' : w.cardioPref, time: special && w.time === 0 ? 60 : w.time, days: [...w.days].sort((a, b) => a - b), age: p.ageKnown ? p.age : 0, sex: p.sex, bw, bmi, cautious: scrYes, exp: w.exp || 'beg', active: w.active !== false, cardioAdd: false, cAct: w.cNow ? w.cAct : [], equip: w.preset === 'gym' && w.equip.length >= EQ_ALL.length ? null : [...w.equip, 'Masa ciała'], bench: special === 'preg' ? false : w.bench, rack: special ? false : w.rack, sleep: w.sleep || 3 }; };

  const SPN = { preg: ['Plan w ciąży: umiarkowany wysiłek (powinieneś(aś) móc swobodnie rozmawiać), zapas powtórzeń co najmniej 3, bez ćwiczeń leżąc na plecach i bez wstrzymywania oddechu.', 'Przerwij ćwiczenie i skontaktuj się z lekarzem przy krwawieniu, bólu brzucha lub klatki piersiowej, zawrotach głowy, duszności, wyciekaniu płynu lub osłabieniu mięśni. Plan zawsze uzgodnij z lekarzem prowadzącym.', 'WHO zaleca kobietom w ciąży co najmniej 150 minut aktywności tlenowej o umiarkowanej intensywności tygodniowo oraz ćwiczenia siłowe, jeśli nie ma przeciwwskazań. Marsz jest bezpieczną formą cardio.'], post: ['Po porodzie: wracaj stopniowo; pominąłem ćwiczenia brzucha i skoki do czasu zgody lekarza lub fizjoterapeuty uroginekologicznego. Zwracaj uwagę na dno miednicy i objawy (parcie, popuszczanie moczu) — to powód, by zgłosić się do fizjoterapeuty uroginekologicznego.', 'WHO zaleca kobietom po porodzie aktywność fizyczną, jeśli nie ma przeciwwskazań.'], senior: ['Po 65. roku życia WHO zaleca wieloskładnikową aktywność z naciskiem na równowagę i funkcjonalną siłę co najmniej 3 dni w tygodniu: dodaj do treningu stanie na jednej nodze, chodzenie po linii i wstawanie z krzesła bez pomocy rąk.', 'Zostawiaj duży zapas powtórzeń i nie dochodź do upadku mięśniowego.'] };
  F.wzGen = v => gen(v);
  const gen = v => { const w = wFull(); const adv = F.cardioAdvice(w); const prep = F.cardioPrepare(w, adv.acts); const hasAfter = prep.attach.some(x => x.length); const tb = hasAfter ? prep.timeByDay : null;
    const w2 = { ...w, cardioAdd: false, timeByDay: tb, time: tb && w.time ? Math.min(...tb.filter(x => x > 0)) : w.time };
    const r = F.planGen(w2, v); if (w.special) { r.plan.meta = { ...(r.plan.meta || {}), special: w.special }; r.notes = [...(SPN[w.special] || []), ...r.notes]; }
    F.cardioApply(r, prep, adv.acts, adv); r.adv = adv; r.why = [...r.why, `<b>Cardio.</b> ${E(adv.text)}`]; return r; };

  /* ---------- widok ---------- */
  V.wizard = () => {
    const z = Z(); if (z.res) return preview();
    const i = cur(); const total = STEPS.length;
    return { html: `${F.head('Kreator planu', { back: 1, sub: z.step === 'intro' ? 'Plan dopasowany do Ciebie' : `Krok ${i} z ${total - 1}: ${STEP_T[z.step]}` })}
      ${z.step !== 'intro' ? `<div class="wz-prog"><i style="width:${Math.round(i / (total - 1) * 100)}%"></i></div>` : ''}
      ${bodies[z.step]()}
      <div class="wz-spacer"></div><div class="wz-bar">${i > 0 ? `<button class="btn ghost" data-a="wzPrev">Wstecz</button>` : ''}<button class="btn primary ${i > 0 ? '' : 'full'}" data-a="wzNext">${z.step === 'split' ? ic('sparkles', 16) + ' Zaproponuj plan' : z.step === 'intro' ? 'Zaczynamy' : 'Dalej'}</button></div>` };
  };
  const rerender = () => { F.render(true); };

  /* ---------- akcje ---------- */
  F.act.newWizard = () => { F.wz = null; };
  F.act.wzScr = b => { Z().w.scr[+b.dataset.i] = b.dataset.v === '1'; rerender(); };
  F.act.wzPreg = b => { Z().w.preg = b.dataset.v; rerender(); };
  F.act.wzSex = b => { F.S.settings.sex = b.dataset.v; F.saveSettings(); const w = Z().w; if (b.dataset.v === 'f') { if (w.preg === 'no') w.preg = null; } else w.preg = 'no'; rerender(); };
  F.act.wzSet = b => { const w = Z().w, k = b.dataset.k; let v = b.dataset.v; if (b.dataset.n) v = +v; if (b.dataset.b1) v = v === '1'; w[k] = v; if (k === 'goal') { } rerender(); };
  F.act.wzGoal = b => { const w = Z().w; w.goal = b.dataset.v; w.cChoice = ''; rerender(); };
  F.act.wzPrio = b => { const w = Z().w, v = b.dataset.v; w.prio = w.prio.includes(v) ? w.prio.filter(x => x !== v) : (w.prio.length < 3 ? [...w.prio, v] : w.prio); rerender(); };
  F.act.wzDay = b => { const w = Z().w, v = +b.dataset.v; if (w.days.includes(v)) w.days = w.days.filter(x => x !== v); else if (w.days.length < 6) w.days = [...w.days, v].sort((a, c) => a - c); else F.toast('Maksymalnie 6 dni — jeden dzień odpoczynku jest potrzebny'); w.split = 'auto'; rerender(); };
  F.act.wzPreset = b => { const w = Z().w, p = PRESET[b.dataset.v]; w.preset = b.dataset.v; Object.assign(w, JSON.parse(JSON.stringify(p[2]))); rerender(); };
  F.bind.wzEq = el => { const w = Z().w, k = el.dataset.k; w.equip = el.checked ? [...new Set([...w.equip, k])] : w.equip.filter(x => x !== k); w.preset = ''; };
  F.bind.wzFlag = el => { const w = Z().w; w[el.dataset.k] = el.checked; w.preset = ''; };
  F.bind.wzBw = el => { const v = num(el.value); Z().w.bw = v > 20 && v < 400 ? F.fromDisp(v) : ''; };
  F.act.wzInj = b => { const w = Z().w, v = b.dataset.v; w.inj = w.inj.includes(v) ? w.inj.filter(x => x !== v) : [...w.inj, v]; rerender(); };
  const pickInto = async key => { const ids = await F.pickExercises(); if (!ids || !ids.length) return; const w = Z().w; w[key] = [...new Set([...w[key], ...ids])]; const other = key === 'avoid' ? 'fav' : 'avoid'; w[other] = w[other].filter(x => !ids.includes(x)); rerender(); };
  F.act.wzAddAvoid = () => pickInto('avoid'); F.act.wzAddFav = () => pickInto('fav');
  F.act.wzUnavoid = b => { const w = Z().w; w.avoid = w.avoid.filter(x => x !== b.dataset.id); rerender(); };
  F.act.wzUnfav = b => { const w = Z().w; w.fav = w.fav.filter(x => x !== b.dataset.id); rerender(); };
  F.act.wzSplit = b => { Z().w.split = b.dataset.v; rerender(); };
  F.act.wzCNow = b => { const w = Z().w; w.cNow = b.dataset.v === '1'; if (w.cNow && !w.cAct.length) w.cAct.push({ t: 'bike', n: 3, m: 45, i: 2, plan: false, place: 'after' }); if (!w.cNow) { w.cAct = []; } w.cChoice = ''; rerender(); };
  F.act.wzCAdd = () => { const w = Z().w; if (w.cAct.length >= 5) { F.toast('Maksymalnie 5 aktywności'); return; } w.cAct.push({ t: 'tread', n: 2, m: 30, i: 2, plan: false, place: 'after' }); w.cChoice = ''; rerender(); };
  F.act.wzCDel = b => { const w = Z().w; w.cAct.splice(+b.dataset.i, 1); if (!w.cAct.length) w.cNow = null; w.cChoice = ''; rerender(); };
  F.act.wzCInt = b => { Z().w.cAct[+b.dataset.i].i = +b.dataset.v; Z().w.cChoice = ''; rerender(); };
  F.act.wzCPlan = b => { const a = Z().w.cAct[+b.dataset.i]; a.plan = b.dataset.v === '1'; rerender(); };
  F.act.wzCPlace = b => { Z().w.cAct[+b.dataset.i].place = b.dataset.v; rerender(); };
  F.act.wzCStep = b => { const a = Z().w.cAct[+b.dataset.i], k = b.dataset.k, d = +b.dataset.d; if (k === 'n') a.n = Math.max(1, Math.min(7, a.n + d)); else a.m = Math.max(5, Math.min(240, a.m + 5 * d)); Z().w.cChoice = ''; rerender(); };
  F.bind.wzCf = (el, ev) => { const a = Z().w.cAct[+el.dataset.i]; if (!a) return; const k = el.dataset.k; if (k === 't') { a.t = el.value; if (!F.CARDIO.T[a.t][2]) a.plan = false; } else { const v = parseInt(el.value, 10) || 0; if (k === 'n') a.n = Math.max(1, Math.min(7, v || 1)); else a.m = Math.max(5, Math.min(240, v || 5)); } Z().w.cChoice = ''; if (ev === 'change') rerender(); };
  F.act.wzCChoice = b => { Z().w.cChoice = b.dataset.v; rerender(); };
  F.act.wzCType = b => { Z().w.cAddType = b.dataset.v; rerender(); };
  F.act.wzPrev = () => { const z = Z(); z.step = STEPS[Math.max(0, cur() - 1)]; window.scrollTo(0, 0); rerender(); };
  const validate = () => { const z = Z(), w = z.w, s = F.S.settings;
    const R = (m, sel) => [m, sel];
    switch (z.step) {
      case 'health': if (w.scr.some(x => x === null)) return R('Odpowiedz na wszystkie pytania', '.wz-yn.miss'); if (w.preg === null) return R('Odpowiedz na pytanie o ciążę', '.wz-yn.miss'); if ((w.preg === 'preg' || w.preg === 'post') && !w.doc) return R('Potrzebna zgoda lekarza lub położnej', '.wz-warn'); return null;
      case 'about': if (!s.sex) return R('Wybierz płeć', '.seg'); if (!F.ageNow()) return R('Podaj datę urodzenia', '[data-k=dob]'); if (!s.height) return R('Podaj wzrost', '[data-k=height]'); if (!(w.bw > 20)) return R('Podaj masę ciała', '[data-b=wzBw]'); if (F.ageNow() < 14) return R('Aplikacja jest przeznaczona dla osób od 14 lat; młodsze osoby powinny trenować pod opieką trenera', '[data-k=dob]'); if (!w.sleep) return R('Wybierz, ile średnio śpisz', '#wz-sleep'); return null;
      case 'exp': if (!w.exp) return R('Wybierz poziom doświadczenia', '.wz-opts'); if (w.active === null) return R('Odpowiedz, czy trenujesz regularnie', '#wz-active'); return null;
      case 'cardio': if (w.cNow === null) return R('Odpowiedz, czy teraz robisz cardio', '#wz-cnow'); if (w.cNow && !w.cAct.length) return R('Dodaj aktywność albo wybierz „Nie robię”', '#wz-cacts'); if (w.cNow && w.cAct.some(a => !F.CARDIO.valid(a))) return R('Uzupełnij dane aktywności (razy w tygodniu i minuty)', '.cact'); { const ad = F.cardioAdvice(wFull()); if (ad.status === 'low' && !w.cChoice) return R('Wybierz, co robimy z cardio', '.cadv'); } return null;
      case 'sched': if (!w.days.length) return R('Wybierz co najmniej jeden dzień', '#wz-days'); return null;
      case 'equip': if (!w.equip.length && !w.bench) return R('Zaznacz dostępny sprzęt lub wybierz „Tylko masa ciała”', '.wz-opts'); return null;
      default: return null; } };
  F.act.wzNext = async () => {
    const z = Z(); const err = validate(); if (err) { F.toast(err[0], 'err'); const el = document.querySelector(err[1]); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('need'); setTimeout(() => el.classList.remove('need'), 1800); } return; }
    if (z.step === 'about') { const w = z.w; const last = F.latestBW(); if (w.bw > 20 && (!last || Math.abs(last - w.bw) > 0.05)) { await F.addBW(w.bw); } }
    if (z.step === 'split') { storeAnswers(); z.variant = 0; z.res = gen(0); window.scrollTo(0, 0); rerender(); return; }
    const prev = z.step; z.step = STEPS[cur() + 1]; window.scrollTo(0, 0);
    try { rerender(); } catch (e) { console.error(e); z.step = prev; F.toast('Coś poszło nie tak — spróbuj ponownie', 'err'); }
  };
  const storeAnswers = () => { const w = Z().w, s = F.S.settings; s.exp = w.exp; s.sleep = w.sleep; s.wiz = { exp: w.exp, goal: w.goal, prio: w.prio, cardioMin: w.cardioMin, cardioAdd: w.cardioAdd, cardioPref: w.cardioPref, days: w.days, time: w.time, equip: w.equip, bench: w.bench, rack: w.rack, preset: w.preset, inj: w.inj, avoid: w.avoid, fav: w.fav, cAct: w.cAct, cNow: w.cNow, cChoice: w.cChoice, cAddType: w.cAddType, special: wFull().special }; F.saveSettings(); };
  F.act.wzBack = () => { Z().res = null; rerender(); };
  F.act.wzAgain = () => { const z = Z(); z.variant++; z.res = gen(z.variant); window.scrollTo(0, 0); rerender(); };
  F.act.wzSave = async () => { const z = Z(); if (!z.res) return; const plan = z.res.plan; await F.savePlan(plan); F.wz = null; F.toast('Zapisano plan: ' + E(plan.name), 'hot'); F.go('#/plan/' + plan.id); };
  F.act.wzSwap = b => {
    const z = Z(); const di = +b.dataset.di, ii = +b.dataset.ii; const d = z.res.days[di], i = d.items[ii]; const used = new Set(d.items.map(x => x.exId));
    const alts = P.poolOf(i.slot, z.res.work).filter(id => !used.has(id) || id === i.exId);
    F.sheet(`<div class="stack">${alts.map(id => `<button class="exrow ${id === i.exId ? 'sel' : ''}" data-a="wzPick" data-di="${di}" data-ii="${ii}" data-id="${id}"><span><b>${E(P.exName(id))}</b><small>${E((F.S.ex.get(id) || {}).equip || '')}</small></span><i>${ic('check', 16)}</i></button>`).join('') || '<p class="dim pad center">Brak alternatyw przy Twoim sprzęcie i ograniczeniach.</p>'}</div>`, { title: 'Zamień ćwiczenie' });
  };
  F.act.wzPick = b => { const z = Z(); const di = +b.dataset.di, ii = +b.dataset.ii; z.res.days[di].items[ii].exId = b.dataset.id; z.res.plan.days[di].items[ii].exId = b.dataset.id; F.closeSheet(true); rerender(); };

  /* ---------- podgląd ---------- */
  const fmtRest = s => s >= 60 ? (Math.floor(s / 60) + (s % 60 ? ':' + String(s % 60).padStart(2, '0') : '') + ' min') : s + ' s';
  const nutrition = r => { const w = r.work; if (!['hyp', 'sculpt', 'str'].includes(w.goal)) return ''; const bw = w.bw; const prot = w.bmi >= 30 || !bw ? 'Przy większej masie ciała białko warto liczyć od masy należnej — omów to z dietetykiem.' : `Białko: ok. ${Math.round(bw * 1.4 / 5) * 5}–${Math.round(bw * 2.0 / 5) * 5} g dziennie (1,4–2,0 g na kg masy ciała), rozłożone na kilka posiłków.`; const cal = w.goal === 'sculpt' ? 'Redukcja wymaga umiarkowanego deficytu kalorycznego; wolniejsze tempo lepiej chroni mięśnie.' : w.goal === 'hyp' ? 'Przyrost masy wymaga lekkiej nadwyżki kalorii.' : ''; return `<section class="card cut"><h3>${ic('flame', 18)} Żywienie (orientacyjnie)</h3><p class="small">${prot}</p>${cal ? `<p class="small">${cal}</p>` : ''}<p class="dim small">Więcej w „Porady i nauka”. Przy chorobach, ciąży lub zaburzeniach odżywiania skonsultuj dietę ze specjalistą.</p></section>`; };

  function preview() {
    const z = Z(), r = z.res, w = r.work; const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const dayHtml = r.days.map((d, di) => { const pd = r.plan.days[di]; const inf = F.ssInfo(pd.items); return `<section class="card cut"><div class="wz-dh"><h3>${E(pd.name)}</h3><small class="dim">ok. ${d.min} min${pd.items.length > d.items.length ? ' + cardio ' + pd.items.slice(d.items.length).reduce((a, x) => a + Math.round((+x.reps || 0) / 60), 0) + ' min' : ''}</small></div>${d.items.map((i, ii) => { const it = pd.items[ii]; const g = inf[ii]; return `<div class="wz-ex ${g ? 'ss' : ''}"><div><b>${g ? `<em class="sslab">${g.tag}</em> ` : ''}${E(P.exName(i.exId))}</b><small>${it.sets} × ${E(it.reps)} · przerwa ${fmtRest(it.rest)}${it.w ? ` · start ${F.fwu(it.w)}` : ''}</small><small class="dim">${E(it.note)}</small></div><button class="iconbtn" data-a="wzSwap" data-di="${di}" data-ii="${ii}" aria-label="Zamień ćwiczenie">${ic('repeat', 18)}</button></div>`; }).join('')}${pd.items.slice(d.items.length).map(c => `<div class="wz-ex cd-row"><div><b>${ic('heart', 14)} ${E(P.exName(c.exId))} — cardio po treningu</b><small>${Math.round((+c.reps || 0) / 60)} min · ${E(c.note)}</small></div></div>`).join('')}</section>`; }).join('');
    const cardioHtml = r.plan.days.slice(r.days.length).map(d => { const it = d.items[0], mn = Math.round((+it.reps || 0) / 60); return `<section class="card cut"><div class="wz-dh"><h3>${E(d.name)}</h3><small class="dim">${mn} min</small></div><div class="wz-ex"><div><b>${E(P.exName(it.exId))}</b><small>${mn} min · ${E(it.note)}</small></div></div></section>`; }).join('');
    const cardioAfter = d => d.items.length ? '' : '';
    const vol = Object.entries(r.volume).map(([m, v]) => { const pct = clamp(v.sets / (v.range[1] * 1.3) * 100, 4, 100); const ok = v.sets >= v.range[0] - 0.5 && v.sets <= v.range[1] + 0.5; return `<div class="wz-v"><span>${P.MLABEL[m]}</span><div class="bar"><i style="width:${pct}%"></i></div><b class="${ok ? '' : 'warn'}">${Math.round(v.sets)}</b><small class="dim">${v.range[0]}–${v.range[1]} · ${v.freq}×/tyg.</small></div>`; }).join('');
    const meso = `<table class="wz-meso">${r.meso.rows.map(x => `<tr class="${x.deload ? 'dl' : ''}"><th>Tydz. ${x.week}</th><td>${E(x.text)}</td></tr>`).join('')}</table>`;
    return { html: `${F.head('Twój plan', { sub: E(r.plan.name) })}
      <section class="card cut"><h3>${ic('sparkles', 18)} Dlaczego ten plan</h3><div class="wz-why">${r.why.map(t => `<p>${t}</p>`).join('')}</div></section>
      ${dayHtml}${cardioHtml ? `<h3 class="sec">Cardio (opcjonalnie)</h3>${cardioHtml}` : ''}
      ${r.adv ? `<section class="card cut"><h3>${ic('heart', 18)} Cardio w tygodniu</h3><p class="small">Po zmianach: ok. <b>${F.CARDIO.eq(r.adv.acts)} min</b> umiarkowanego cardio tygodniowo (zakres przy Twoim celu: ${r.adv.band[0]}–${r.adv.band[1]} min; zalecenie WHO: 150–300 min).${r.adv.acts.some(a => !F.CARDIO.T[a.t][2]) ? ' Aktywności poza siłownią (np. pływanie, rolki) liczę do tej sumy, ale nie wstawiam ich do planu.' : ''}</p><p class="dim small">Cardio po treningu możesz w trakcie oznaczyć jako „Zrobię później” — dopiszesz je w domu, a trening zostanie przeliczony.</p></section>` : ''}
      <section class="card cut"><h3>${ic('calendar', 18)} Mezocykl — jak prowadzić plan</h3>${meso}<p class="dim small">Powtarzaj plan przez ${r.meso.weeks} tygodni; ciężar zwiększaj, gdy dobijasz do górnej granicy powtórzeń z zachowanym zapasem. To schemat orientacyjny — jeśli czujesz przewlekłe zmęczenie, odciąż się wcześniej, a jeśli czujesz się świetnie, możesz przesunąć odciążenie.</p></section>
      <section class="card cut"><h3>${ic('chart-column', 18)} Serie tygodniowo na grupę</h3>${vol}<p class="dim small">Wynik, zalecany zakres i liczba treningów grupy w tygodniu. Serie ćwiczeń wielostawowych liczą się częściowo także dla ramion i barków.</p></section>
      ${nutrition(r)}
      ${r.notes.length ? `<section class="card cut"><h3>${ic('info', 18)} Uwagi</h3><ul class="tips">${r.notes.map(n => `<li>${E(n)}</li>`).join('')}</ul></section>` : ''}
      <p class="dim small pad">Plan jest wskazówką opartą na ogólnych zasadach treningu, nie zastępuje porady lekarza ani trenera. Przy bólu przerwij ćwiczenie. Ciężary dobierz sam — pierwszą serię zrób lekko, aby poznać swoje możliwości.</p>
      <div class="wz-spacer"></div><div class="wz-bar"><button class="btn primary full" data-a="wzSave">Zapisz plan</button><button class="btn ghost" data-a="wzBack">Zmień odpowiedzi</button><button class="btn ghost" data-a="wzAgain">${ic('repeat', 16)} Inna wersja</button></div>` };
  }
})();
