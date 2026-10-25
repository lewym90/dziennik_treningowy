/* FORGE — silnik planu treningowego (reguły, bez AI).
   Wejście: odpowiedzi z wywiadu (F.planGen(w)). Wyjście: zwykły plan FORGE + raport (objętość, czas, uwagi, mezocykl, uzasadnienie).
   Zasady i zakresy: F.KB (js/kb.js). Uzasadnienie dla użytkownika nie zawiera przypisów — źródła są w kompendium. */
(function () {
  const F = window.F; const E = F.esc; const KB = F.KB;

  /* ---------- słowniki ---------- */
  const MLABEL = { chest: 'Klatka', back: 'Plecy', shoulders: 'Barki', biceps: 'Biceps', triceps: 'Triceps', quads: 'Czworogłowe', hams: 'Dwugłowe', glutes: 'Pośladki', calves: 'Łydki', abs: 'Brzuch', forearms: 'Przedramiona' };
  const MAJOR = ['chest', 'back', 'quads', 'hams'];
  F.PLN = {
    GOALS: { hyp: ['Masa mięśniowa', 'Budowa mięśni, więcej objętości'], str: ['Siła', 'Ciężkie serie wielostawowe, dłuższe przerwy'], sculpt: ['Rzeźba / redukcja', 'Zachowanie mięśni przy spadku tkanki tłuszczowej'], endur: ['Wytrzymałość', 'Więcej powtórzeń i krótkie przerwy'], health: ['Zdrowie i sprawność', 'Proste, bezpieczne, całe ciało'] },
    EXPS: { beg: ['Początkujący', 'do ok. roku regularnego treningu'], mid: ['Średniozaawansowany', '1–3 lata'], adv: ['Zaawansowany', 'ponad 3 lata'] },
    MLABEL
  };
  const AVOID = {
    shoulder: ['ohp', 'push_press', 'upright', 'dips', 'arnold', 'front_raise', 'snatch', 'thruster', 'bench_dec', 'fe_standing_dumbbell_upright_row', 'chest_mach', 'fly_db'],
    back: ['deadlift', 'sumo', 'good_m', 'row_bb', 'row_tbar', 'hyper', 'rdl', 'clean', 'snatch', 'kb_swing', 'thruster', 'front_sq', 'fe_stiff_legged_dumbbell_deadlift', 'fe_bent_over_two_dumbbell_row', 'squat'],
    knee: ['lunge', 'bulgar', 'step_up', 'leg_ext', 'hack', 'sled', 'fe_bodyweight_walking_lunge', 'fe_bodyweight_squat', 'burpee', 'jump_rope', 'run', 'stairs'],
    elbow: ['skull', 'dips', 'bench_dip', 'curl_bb', 'curl_pre', 'wrist_curl', 'tri_over', 'cgbp', 'pushup', 'kickback'],
    wrist: ['curl_bb', 'wrist_curl', 'pushup', 'front_sq', 'clean', 'snatch', 'ohp', 'fe_incline_push_up'],
    hip: ['sumo', 'sumo_sq', 'bulgar', 'lunge', 'abduct', 'adduct', 'good_m'],
    neck: ['shrug', 'upright', 'ohp', 'push_press', 'sh_mach'],
    ankle: ['jump_rope', 'run', 'stairs', 'step_up', 'burpee', 'calf_st', 'calf_se']
  };
  F.PLN.INJ = { shoulder: 'Barki', back: 'Dolny odcinek pleców', knee: 'Kolana', elbow: 'Łokcie', wrist: 'Nadgarstki', hip: 'Biodra', neck: 'Szyja / kark', ankle: 'Kostki / stopy' };
  const NEEDS_BENCH = ['bench', 'bench_inc', 'bench_dec', 'db_bench', 'db_inc', 'fly_db', 'skull', 'curl_inc', 'cgbp', 'bench_dip', 'hip_thrust', 'curl_pre', 'row_tbar'];
  const NEEDS_RACK = ['squat', 'front_sq', 'bench', 'bench_inc', 'bench_dec', 'ohp', 'good_m', 'cgbp', 'push_press'];
  const NEEDS_MACH = ['dips', 'nordic', 'hyper'];

  /* ---------- sloty ruchowe (kolejność w puli = preferencja) ---------- */
  const P = (all, beg) => ({ all, beg: beg || all });
  const SL = {
    chest_press: { m: 'chest', role: 'main', pool: P(['bench', 'db_bench', 'chest_mach', 'pushup', 'fe_incline_push_up'], ['chest_mach', 'db_bench', 'pushup', 'bench']) },
    chest_press2: { m: 'chest', role: 'sec', pool: P(['db_bench', 'chest_mach', 'bench_dec', 'bench', 'pushup', 'fe_incline_push_up']) },
    chest_inc: { m: 'chest', role: 'sec', pool: P(['db_inc', 'bench_inc', 'chest_mach', 'fe_incline_push_up', 'pushup']) },
    chest_fly: { m: 'chest', role: 'iso', pool: P(['fly_cable', 'pec_deck', 'fly_db']) },
    back_vert: { m: 'back', role: 'main', pool: P(['pullup', 'lat_pull', 'chinup', 'fe_inverted_row'], ['lat_pull', 'chinup', 'pullup', 'fe_inverted_row']) },
    back_row: { m: 'back', role: 'main', pool: P(['row_bb', 'row_cable', 'row_db', 'row_mach', 'row_tbar', 'fe_bent_over_two_dumbbell_row', 'fe_inverted_row'], ['row_mach', 'row_cable', 'row_db', 'row_bb', 'fe_bent_over_two_dumbbell_row', 'fe_inverted_row']) },
    back_row2: { m: 'back', role: 'sec', pool: P(['row_db', 'row_cable', 'row_mach', 'row_tbar', 'row_bb', 'fe_bent_over_two_dumbbell_row', 'fe_inverted_row']) },
    back_iso: { m: 'back', role: 'iso', pool: P(['pullover', 'lat_pull', 'row_cable']) },
    trap: { m: 'back', role: 'iso', pool: P(['shrug']) },
    sh_press: { m: 'shoulders', role: 'main', pool: P(['ohp', 'db_ohp', 'sh_mach', 'arnold', 'fe_incline_push_up'], ['sh_mach', 'db_ohp', 'ohp']) },
    sh_press2: { m: 'shoulders', role: 'sec', pool: P(['arnold', 'db_ohp', 'sh_mach', 'ohp']) },
    sh_lat: { m: 'shoulders', role: 'iso', pool: P(['lateral', 'lateral_c']) },
    sh_lat2: { m: 'shoulders', role: 'iso', pool: P(['lateral_c', 'lateral']) },
    sh_rear: { m: 'shoulders', role: 'iso', pool: P(['rear_fly', 'facepull']) },
    bi: { m: 'biceps', role: 'iso', pool: P(['curl_ez', 'curl_db', 'curl_inc', 'curl_cab', 'curl_ham']) },
    bi2: { m: 'biceps', role: 'iso', pool: P(['curl_inc', 'curl_ham', 'curl_cab', 'curl_db', 'curl_ez']) },
    tri: { m: 'triceps', role: 'iso', pool: P(['tri_rope', 'tri_push', 'skull', 'tri_over', 'kickback']) },
    tri2: { m: 'triceps', role: 'iso', pool: P(['tri_over', 'skull', 'kickback', 'tri_push', 'tri_rope']) },
    tri_comp: { m: 'triceps', role: 'sec', pool: P(['cgbp', 'dips', 'bench_dip']) },
    quad_main: { m: 'quads', role: 'main', pool: P(['squat', 'leg_press', 'hack', 'smith_sq', 'goblet', 'front_sq', 'fe_bodyweight_squat'], ['leg_press', 'goblet', 'smith_sq', 'squat', 'hack', 'fe_bodyweight_squat']) },
    quad_main2: { m: 'quads', role: 'sec', pool: P(['leg_press', 'hack', 'smith_sq', 'front_sq', 'goblet', 'fe_bodyweight_squat']) },
    quad_uni: { m: 'quads', role: 'sec', pool: P(['bulgar', 'lunge', 'step_up', 'goblet', 'fe_bodyweight_walking_lunge'], ['step_up', 'lunge', 'goblet', 'bulgar', 'fe_bodyweight_walking_lunge']) },
    quad_iso: { m: 'quads', role: 'iso', pool: P(['leg_ext']) },
    ham_hinge: { m: 'hams', role: 'main', pool: P(['rdl', 'good_m', 'fe_stiff_legged_dumbbell_deadlift', 'kb_swing', 'fe_single_leg_glute_bridge'], ['rdl', 'fe_stiff_legged_dumbbell_deadlift', 'kb_swing', 'fe_single_leg_glute_bridge']) },
    ham_curl: { m: 'hams', role: 'iso', pool: P(['leg_curl', 'leg_curl_s', 'nordic', 'fe_single_leg_glute_bridge']) },
    glute: { m: 'glutes', role: 'sec', pool: P(['hip_thrust', 'glute_br', 'frog_pump', 'glute_kick', 'fe_single_leg_glute_bridge']) },
    glute2: { m: 'glutes', role: 'iso', pool: P(['glute_kick', 'abduct', 'frog_pump', 'glute_br']) },
    calf: { m: 'calves', role: 'iso', pool: P(['calf_st', 'calf_se', 'calf_press', 'fe_standing_dumbbell_calf_raise']) },
    calf2: { m: 'calves', role: 'iso', pool: P(['calf_se', 'calf_press', 'calf_st', 'fe_standing_dumbbell_calf_raise']) },
    abs: { m: 'abs', role: 'iso', pool: P(['cab_crunch', 'crunch', 'leg_raise', 'plank', 'ab_wheel', 'fe_flat_bench_lying_leg_raise']) },
    abs2: { m: 'abs', role: 'iso', pool: P(['leg_raise', 'plank', 'ab_wheel', 'crunch', 'cab_crunch', 'side_plank']) }
  };

  /* ---------- szablony dni: [nazwa, sloty, tag] (tag: pw = ciężko/siła, hy = hipertrofia w PHUL/PHAT) ---------- */
  const T = {
    fbA: ['Całe ciało A', ['quad_main', 'chest_press', 'back_row', 'ham_curl', 'sh_lat', 'abs']],
    fbB: ['Całe ciało B', ['ham_hinge', 'sh_press', 'back_vert', 'chest_inc', 'glute', 'tri', 'bi']],
    fbC: ['Całe ciało C', ['quad_uni', 'chest_press', 'back_row2', 'ham_curl', 'bi', 'tri', 'calf']],
    fbF: ['Całe ciało', ['quad_main', 'chest_press', 'back_row', 'sh_press', 'ham_curl', 'abs']],
    fb1: ['Całe ciało', ['quad_main', 'ham_hinge', 'chest_press', 'back_row', 'back_vert', 'sh_press', 'abs']],
    up1: ['Góra 1', ['chest_press', 'back_row', 'sh_press', 'back_vert', 'bi', 'tri']],
    lo1: ['Dół 1', ['quad_main', 'ham_hinge', 'ham_curl', 'glute', 'calf', 'abs']],
    up2: ['Góra 2', ['chest_inc', 'back_vert', 'sh_lat', 'back_row2', 'sh_rear', 'tri', 'bi']],
    lo2: ['Dół 2', ['quad_uni', 'glute', 'ham_curl', 'quad_iso', 'calf', 'abs']],
    push: ['Push — klatka, barki, triceps', ['chest_press', 'sh_press', 'chest_inc', 'sh_lat', 'tri', 'chest_fly']],
    pull: ['Pull — plecy i biceps', ['back_vert', 'back_row', 'back_row2', 'sh_rear', 'bi', 'bi2']],
    legs: ['Nogi', ['quad_main', 'ham_hinge', 'quad_uni', 'ham_curl', 'calf', 'abs', 'glute']],
    chestD: ['Klatka', ['chest_press', 'chest_inc', 'chest_press2', 'chest_fly']],
    backD: ['Plecy', ['back_vert', 'back_row', 'back_row2', 'back_iso']],
    legsD: ['Nogi', ['quad_main', 'quad_uni', 'quad_iso', 'ham_hinge', 'ham_curl', 'calf', 'calf2']],
    shD: ['Barki', ['sh_press', 'sh_lat', 'sh_lat2', 'sh_rear', 'trap', 'abs']],
    armsD: ['Ramiona', ['bi', 'tri_comp', 'tri', 'bi2', 'tri2', 'abs2']],
    chestTri: ['Klatka i triceps', ['chest_press', 'chest_inc', 'chest_fly', 'tri_comp', 'tri', 'tri2']],
    backBi: ['Plecy i biceps', ['back_vert', 'back_row', 'back_row2', 'sh_rear', 'bi', 'bi2']],
    legsSh: ['Nogi i barki', ['quad_main', 'ham_hinge', 'ham_curl', 'sh_press', 'sh_lat', 'calf']],
    chestBack: ['Klatka i plecy', ['chest_press', 'back_row', 'chest_inc', 'back_vert', 'chest_fly', 'sh_rear']],
    shArms: ['Barki i ramiona', ['sh_press', 'sh_lat', 'bi', 'tri', 'bi2', 'tri2']],
    shAbs: ['Barki i brzuch', ['sh_press', 'sh_lat', 'sh_rear', 'abs', 'abs2']],
    torso1: ['Tułów 1', ['chest_press', 'back_row', 'sh_press', 'back_vert', 'chest_fly', 'sh_rear']],
    torso2: ['Tułów 2', ['chest_inc', 'back_vert', 'back_row2', 'sh_lat', 'chest_fly', 'trap']],
    limbs1: ['Kończyny 1', ['quad_main', 'ham_hinge', 'bi', 'tri', 'calf', 'abs']],
    limbs2: ['Kończyny 2', ['quad_uni', 'ham_curl', 'bi2', 'tri2', 'glute', 'calf']],
    pwUp: ['Góra — siła', ['chest_press', 'back_row', 'sh_press', 'back_vert', 'bi', 'tri'], 'pw'],
    pwLo: ['Dół — siła', ['quad_main', 'ham_hinge', 'glute', 'calf'], 'pw'],
    hyUp: ['Góra — hipertrofia', ['chest_inc', 'back_row2', 'chest_fly', 'sh_lat', 'back_iso', 'bi2', 'tri2'], 'hy'],
    hyLo: ['Dół — hipertrofia', ['quad_uni', 'ham_curl', 'quad_iso', 'glute2', 'calf2', 'abs'], 'hy'],
    hyBackSh: ['Plecy i barki — hipertrofia', ['back_vert', 'back_row2', 'sh_press2', 'sh_lat', 'trap', 'sh_rear'], 'hy'],
    hyChestArms: ['Klatka i ramiona — hipertrofia', ['chest_inc', 'chest_fly', 'bi', 'tri', 'bi2', 'tri2'], 'hy']
  };
  const SPLITS = {
    fb1: { n: 'Całe ciało (1 dzień)', d: 'Jeden pełny trening tygodniowo — minimum, które wystarcza, by utrzymać formę. Każda grupa raz.', days: ['fb1'] },
    fbw2: { n: 'FBW A/B (2 dni)', d: 'Dwa treningi całego ciała tygodniowo; każda grupa dwa razy.', days: ['fbA', 'fbB'] },
    ul2: { n: 'Góra / Dół (2 dni)', d: 'Jeden trening góry i jeden dołu. Każda grupa raz w tygodniu — dobre, gdy masz tylko 2 dni, ale FBW daje częstszy kontakt.', days: ['up1', 'lo1'] },
    fbw3: { n: 'FBW A/B/C (3 dni)', d: 'Trzy treningi całego ciała; każda grupa 2–3 razy w tygodniu. Proste i skuteczne, świetne na start.', days: ['fbA', 'fbB', 'fbC'] },
    ppl3: { n: 'Push / Pull / Nogi (3 dni)', d: 'Pchanie, ciągnięcie i nogi, każda grupa raz w tygodniu, więcej ćwiczeń na partię w jednym treningu.', days: ['push', 'pull', 'legs'] },
    ulf3: { n: 'Góra / Dół / Całe ciało (3 dni)', d: 'Kompromis między FBW a podziałem: dwa kontakty z większością grup tygodniowo.', days: ['up1', 'lo1', 'fbF'] },
    antag3: { n: 'Antagoniści (3 dni)', d: 'Klatka+plecy / barki+ręce / nogi. Ćwiczenia przeciwnych partii w parach oszczędzają czas.', days: ['chestBack', 'shArms', 'legs'] },
    bro3: { n: 'Klasyczny split 3-dniowy', d: 'Klatka i triceps / plecy i biceps / nogi i barki. Każda grupa raz w tygodniu.', days: ['chestTri', 'backBi', 'legsSh'] },
    ul4: { n: 'Góra / Dół ×2 (4 dni)', d: 'Dwa treningi góry i dwa dołu; każda grupa 2 razy w tygodniu. Dobry balans objętości i regeneracji.', days: ['up1', 'lo1', 'up2', 'lo2'] },
    phul4: { n: 'PHUL (4 dni)', d: 'Power Hypertrophy Upper Lower: dwa dni ciężkie (siła) i dwa lżejsze (hipertrofia), góra i dół. Łączy siłę i masę.', days: ['pwUp', 'pwLo', 'hyUp', 'hyLo'] },
    torso4: { n: 'Tułów / Kończyny ×2 (4 dni)', d: 'Tułów (klatka, plecy, barki) i kończyny (nogi, ramiona) naprzemiennie; każda grupa 2 razy w tygodniu.', days: ['torso1', 'limbs1', 'torso2', 'limbs2'] },
    bro4: { n: 'Klasyczny split 4-dniowy', d: 'Klatka i triceps / plecy i biceps / nogi / barki i brzuch. Każda grupa raz w tygodniu, długie, skupione treningi.', days: ['chestTri', 'backBi', 'legsD', 'shAbs'] },
    fbw4: { n: 'FBW (4 dni)', d: 'Cztery krótsze treningi całego ciała; wysoka częstotliwość, mniej serii na trening.', days: ['fbA', 'fbB', 'fbC', 'fbF'] },
    bro5: { n: 'Klasyczny split 5-dniowy', d: 'Klatka / plecy / nogi / barki / ramiona — jedna partia dziennie, każda raz w tygodniu. Wysoka objętość dla zaawansowanych.', days: ['chestD', 'backD', 'legsD', 'shD', 'armsD'] },
    ulppl5: { n: 'Góra/Dół + Push/Pull/Nogi (5 dni)', d: 'Większość grup 2 razy w tygodniu, duża objętość.', days: ['up1', 'lo1', 'push', 'pull', 'legs'] },
    phat5: { n: 'PHAT (5 dni)', d: 'Power Hypertrophy Adaptive Training: dwa dni siłowe (góra, dół) i trzy dni hipertrofii. Wymagający, dla zaawansowanych.', days: ['pwUp', 'pwLo', 'hyBackSh', 'hyLo', 'hyChestArms'] },
    ppl6: { n: 'Push / Pull / Nogi ×2 (6 dni)', d: 'Każda grupa 2 razy w tygodniu; wymaga dobrej regeneracji i czasu.', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
    arnold6: { n: 'Split Arnolda (6 dni)', d: 'Klatka+plecy / barki+ramiona / nogi, dwa razy w tygodniu. Klasyka kulturystyki, bardzo duża objętość.', days: ['chestBack', 'shArms', 'legs', 'chestBack', 'shArms', 'legs'] },
    ul6: { n: 'Góra / Dół ×3 (6 dni)', d: 'Trzy treningi góry i trzy dołu tygodniowo (3 kontakty z każdą grupą).', days: ['up1', 'lo1', 'up2', 'lo2', 'up1', 'lo1'] }
  };
  F.PLN.SPLITS = SPLITS; F.PLN.T = T;
  const SPLIT_BY_DAYS = {}; Object.entries(SPLITS).forEach(([id, s]) => { s.id = id; s.nd = s.days.length; (SPLIT_BY_DAYS[s.nd] = SPLIT_BY_DAYS[s.nd] || []).push(id); });
  F.PLN.splitsFor = n => (SPLIT_BY_DAYS[n] || []).map(id => SPLITS[id]);
  // częstotliwość: ile razy w tygodniu występuje grupa w podziale
  const freqMap = sp => { const c = {}; sp.days.forEach(tid => { const ms = new Set(T[tid][1].map(s => SL[s].m)); ms.forEach(m => c[m] = (c[m] || 0) + 1); }); return c; };
  F.PLN.freqOf = id => freqMap(SPLITS[id]);
  const minFreq = sp => { const c = freqMap(sp); return Math.min(...MAJOR.map(m => c[m] || 0)); };

  /* ---------- pomocnicze ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const exName = id => (F.S.ex.get(id) || {}).name || id;
  F.PLN.exName = exName;
  const okEx = (id, w) => {
    const ex = F.S.ex.get(id); if (!ex) return false;
    const eq = w.equip || ['Sztanga', 'Hantle', 'Maszyna', 'Wyciąg', 'Kettlebell', 'Masa ciała', 'Drążek', 'Inne'];
    if (ex.equip !== 'Masa ciała' && !eq.includes(ex.equip)) return false;
    if (w.bench === false && NEEDS_BENCH.includes(id)) return false;
    if (w.rack === false && NEEDS_RACK.includes(id)) return false;
    if (!eq.includes('Maszyna') && NEEDS_MACH.includes(id)) return false;
    if (id === 'fe_inverted_row' && !eq.includes('Drążek')) return false;
    if ((w.avoid || []).includes(id)) return false;
    for (const k of (w.inj || [])) if ((AVOID[k] || []).includes(id)) return false;
    return true;
  };
  const poolOf = (slot, w) => {
    const s = SL[slot]; const useBeg = w.exp === 'beg' || w.goal === 'health' || w.cautious || w.bmi >= 30;
    let l = (useBeg ? s.pool.beg : s.pool.all).filter(id => okEx(id, w));
    // ulubione ćwiczenia użytkownika idą na początek puli
    const fav = (w.fav || []).filter(id => s.pool.all.includes(id) && okEx(id, w)); if (fav.length) l = [...fav, ...l.filter(id => !fav.includes(id))];
    return l;
  };
  // awaryjny dobór z całej bazy, gdy pula slotu jest pusta (sprzęt/ograniczenia)
  const INJ_MUSCLE = { shoulder: ['shoulders'], elbow: ['biceps', 'triceps'], back: ['lower back'], hip: ['adductors', 'abductors'], knee: ['quadriceps'], wrist: ['forearms'], neck: ['traps', 'neck'], ankle: ['calves'] };
  const fallbackPool = (slot, w, inDay) => {
    const s = SL[slot]; const bad = new Set((w.inj || []).flatMap(k => INJ_MUSCLE[k] || []));
    const c = [...F.S.ex.values()].filter(e => e.muscle === s.m && !inDay.has(e.id) && e.type !== 'time' || (s.m === 'abs' && e.muscle === 'abs' && !inDay.has(e.id)));
    const sc = e => { let v = 0; const db = F.EXDB && F.EXDB[e.id]; if (!e.id.startsWith('fe_')) v += 5; if (db) { if (db.lv === 'beginner') v += 3; else if (db.lv === 'expert') v -= 5; if ((db.pm || []).some(m => bad.has(m))) v -= 100; if (s.role === 'iso' && db.me === 'isolation') v += 2; if (s.role !== 'iso' && db.me === 'compound') v += 2; if (db.ca && db.ca !== 'strength') v -= 10; } else if (s.role === (e.compound ? 'main' : 'iso')) v += 2; return v; };
    return c.filter(e => okEx(e.id, w)).map(e => [e, sc(e)]).filter(x => x[1] > -50).sort((a, b) => b[1] - a[1]).map(x => x[0].id).slice(0, 6);
  };
  F.PLN.poolOf = poolOf;
  const rangeOf = (goal, exp, m) => { if (KB.volSmall[m]) return KB.volSmall[m]; const r = KB.vol[goal][exp]; return MAJOR.includes(m) ? r.major : r.minor; };
  const firstNum = s => parseInt(String(s).split('-')[0], 10) || 8;
  const lastNum = s => parseInt(String(s).split('-').pop(), 10) || 12;

  /* ---------- ranking podziałów ---------- */
  F.PLN.rank = w0 => {
    const w = { time: 60, goal: 'hyp', exp: 'beg', ...w0 }; const n = (w.days || []).length || 3;
    const ids = SPLIT_BY_DAYS[n] || []; const out = [];
    ids.forEach(id => {
      const sp = SPLITS[id]; const mf = minFreq(sp); let sc = 50; const why = [];
      if (w.goal === 'str') { if (mf >= 2) { sc += 15; why.push('każda grupa i boje ≥ 2 razy w tygodniu (zalecane dla siły)'); } else { sc -= 20; why.push('każda grupa tylko raz w tygodniu — dla siły zalecane są ≥ 2 sesje'); } if (/phul|phat/.test(id)) sc += 8; }
      else if (w.goal === 'hyp') { if (mf >= 2) { sc += 4; } why.push('przy tej samej objętości częstotliwość nie rozstrzyga o przyroście — liczy się rozłożenie serii'); }
      else { if (mf >= 2) { sc += 8; why.push('każda grupa ≥ 2 razy w tygodniu'); } else sc -= 4; }
      if (w.exp === 'beg') { if (/^fb|^ul|^ulf/.test(id)) { sc += 12; why.push('prostota i częste powtarzanie ruchów ułatwiają naukę techniki'); } if (/bro5|phat|arnold|ppl6|phul/.test(id)) sc -= 15; }
      if (w.exp === 'adv' && /phat|bro5|ppl6|arnold|phul|torso/.test(id) && w.goal !== 'health') sc += 7;
      if (w.exp === 'mid' && /ul4|phul|torso|ulppl|ulf|fbw3/.test(id)) sc += 6;
      if (w.time && w.time <= 45 && /bro|ppl|arnold|phat/.test(id)) { sc -= 6; why.push('długie sesje jednej partii trudno zmieścić w krótkim treningu'); }
      if ((w.prio || []).length) { const c = freqMap(sp); const pm = w.prio.map(p => ({ arms: ['biceps', 'triceps'], legs: ['quads', 'hams'] }[p] || [p])).flat(); const avg = pm.reduce((a, m) => a + (c[m] || 0), 0) / pm.length; if (avg >= 2) { sc += 6; why.push('częsty kontakt z Twoimi priorytetowymi partiami'); } }
      out.push({ id, sp, sc, why });
    });
    out.sort((a, b) => b.sc - a.sc); return out;
  };

  /* ---------- generator planu ---------- */
  F.planGen = (w0, variant = 0) => {
    const w = { days: [0, 2, 4], time: 60, goal: 'hyp', exp: 'beg', equip: null, bench: true, rack: true, inj: [], avoid: [], fav: [], prio: [], split: 'auto', sleep: 3, active: true, age: 0, bmi: 0, cardioMin: 0, cardioAdd: false, cardioPref: 'walk', ...w0 };
    const nd = (w.days || []).length || 3; const goal = w.goal, exp = w.exp;
    const older = w.age >= 60; const cautious = !!w.cautious || older || w.age > 0 && w.age < 18;
    w.cautious = cautious;
    const ranking = F.PLN.rank({ ...w, days: w.days });
    const splitId = w.split && w.split !== 'auto' && SPLITS[w.split] && SPLITS[w.split].nd === nd ? w.split : (ranking[0] ? ranking[0].id : 'fbw3');
    const sp = SPLITS[splitId];
    const prioM = (w.prio || []).flatMap(p => ({ arms: ['biceps', 'triceps'], legs: ['quads', 'hams', 'glutes', 'calves'], back: ['back'], chest: ['chest'], shoulders: ['shoulders'], glutes: ['glutes'], abs: ['abs'] }[p] || [p]));
    const used = {};
    const days = sp.days.map((tid, di) => {
      const t = T[tid]; const items = []; const inDay = new Set();
      t[1].forEach(slot => {
        const s = SL[slot]; let pool = poolOf(slot, w).filter(id => !inDay.has(id)); if (!pool.length) pool = fallbackPool(slot, w, inDay); if (!pool.length) return;
        used[slot] = used[slot] || 0; const k = (goal === 'str' && s.role === 'main') ? 0 : used[slot] + variant; used[slot]++;
        const id = pool[k % pool.length]; inDay.add(id); items.push({ slot, m: s.m, role: s.role, exId: id });
      });
      return { name: t[0], tid, tag: t[2] || '', items };
    });
    const allI = () => days.flatMap(d => d.items);
    const dayOf = i => days.find(dd => dd.items.includes(i));
    const notes = [];
    // ---- przycinanie nadmiaru ćwiczeń na grupę (min. 2 serie na ćwiczenie) ----
    const muscles0 = [...new Set(allI().map(i => i.m))];
    muscles0.forEach(m => { const hi = rangeOf(goal, exp, m)[1]; let es = allI().filter(i => i.m === m); while (es.length * 2 > hi + 2 && es.length > 1) { const cand = es.filter(i => i.role === 'iso').pop() || es[es.length - 1]; const d = dayOf(cand); d.items.splice(d.items.indexOf(cand), 1); es = allI().filter(i => i.m === m); } });
    // ---- superserie antagonistów ----
    const budget = w.time || 90; const tight = !!w.time && w.time <= 60;
    days.forEach((d, di) => { d.bud = (w.timeByDay && w.timeByDay[di]) || budget; });
    const PAIRS = [['biceps', 'triceps'], ['chest', 'back'], ['quads', 'hams'], ['shoulders', 'back']];
    const ssAll = goal === 'endur' || goal === 'sculpt' || tight;
    const setS = (i, v) => { i.sets = v; if (i.mate) i.mate.sets = v; };
    days.forEach(d => { for (let k = 0; k < d.items.length - 1; k++) { const a = d.items[k], b = d.items[k + 1]; if (a.mate || b.mate) continue; if (!PAIRS.some(p => (p[0] === a.m && p[1] === b.m) || (p[1] === a.m && p[0] === b.m))) continue; const arms = a.m === 'biceps' || a.m === 'triceps'; if (!arms && !ssAll) continue; if ((a.role === 'iso') !== (b.role === 'iso') && !ssAll) continue; if (a.m === 'shoulders' || b.m === 'shoulders') { if (!(a.role === 'iso' && b.role === 'iso')) continue; } const id = F.uid(); a.ss = id; b.ss = id; a.mate = b; b.mate = a; k++; } });
    // ---- przydział serii ----
    const fBase = tight ? 0.15 : 0.4; const fSleep = w.sleep === 1 ? 0.6 : 1;
    const targetOf = m => { const [a, b] = rangeOf(goal, exp, m); let f = fBase; if (prioM.length) f = prioM.includes(m) ? 1 : Math.min(f, 0.3); f *= fSleep; if (cautious) f = Math.min(f, 0.3); return Math.round(a + f * (b - a)); };
    const capMain = goal === 'str' ? 3 : 4;
    const capOf = i => i.role === 'main' ? capMain : 4;
    const musclesNow = () => [...new Set(allI().map(i => i.m))];
    musclesNow().forEach(m => { const es = allI().filter(i => i.m === m); const T0 = targetOf(m); es.forEach(i => setS(i, clamp(Math.round(T0 / es.length), i.role === 'main' ? 3 : 2, capOf(i)))); });
    const direct = m => allI().filter(i => i.m === m).reduce((a, i) => a + i.sets, 0);
    const indirect = m => allI().reduce((a, i) => { if (i.m === m) return a; const ex = F.S.ex.get(i.exId); const inf = F.EXINFO && F.EXINFO[i.exId]; const sec = (ex && ex.sec) || (inf && inf.s) || []; return a + (ex && ex.compound && sec.includes(m) ? 0.5 * i.sets : 0); }, 0);
    const counted = m => direct(m) + (MAJOR.includes(m) || KB.volSmall[m] || prioM.includes(m) ? 0 : indirect(m));
    // ---- czas ----
    const restOf = i => i.restX || KB.rest[goal][i.role];
    const minutes = d => { let sec = 480; const seen = new Set(); d.items.forEach(i => { if (i.ss) { if (seen.has(i.ss)) return; seen.add(i.ss); const g = d.items.filter(x => x.ss === i.ss); sec += i.sets * (40 * g.length + Math.max(...g.map(restOf))) + g.reduce((a, x) => a + (x.role === 'main' ? 150 : 45), 0); } else sec += i.sets * (40 + restOf(i)) + (i.role === 'main' ? 150 : 45); }); return Math.round(sec / 60); };
    const dropLast = d => { const last = d.items[d.items.length - 1]; if (last.mate) { delete last.mate.ss; last.mate.mate = null; } d.items.pop(); };
    const sessionCap = KB.perSession[exp] + (goal === 'str' ? -2 : 0); const capM = m => sessionCap + (prioM.includes(m) ? 2 : 0);
    days.forEach(d => { // limit serii jednej grupy w sesji
      musclesNow().forEach(m => { let es = d.items.filter(i => i.m === m), tot = es.reduce((a, i) => a + i.sets, 0), g = 20; while (tot > capM(m) && g--) { const c = [...es].reverse().find(i => i.sets > 2); if (!c) break; setS(c, c.sets - 1); tot--; } });
      let guard = 80; while (minutes(d) > d.bud && guard--) {
        const cut = [...d.items].reverse().find(i => i.sets > 2 && i.role !== 'main') || [...d.items].reverse().find(i => i.sets > 2);
        if (cut) { setS(cut, cut.sets - 1); continue; }
        const long = d.items.find(i => restOf(i) > 90 && i.role !== 'iso'); if (long) { long.restX = Math.max(90, restOf(long) - 30); continue; }
        if (d.items.length > 4) dropLast(d); else break;
      }
    });
    // ---- walidator i korekty objętości ----
    const perSess = (d, m) => d.items.filter(i => i.m === m).reduce((a, i) => a + i.sets, 0);
    const EXTRA = { chest: ['chest_fly', 'chest_press2'], back: ['back_row2', 'back_iso'], shoulders: ['sh_lat', 'sh_rear'], biceps: ['bi2', 'bi'], triceps: ['tri2', 'tri_comp', 'tri'], quads: ['quad_iso', 'quad_uni'], hams: ['ham_curl'], glutes: ['glute2', 'glute'], calves: ['calf2', 'calf'], abs: ['abs2', 'abs'] };
    const addEntry = m => {
      const ds = days.filter(d => d.items.some(i => i.m === m)).sort((a, b) => minutes(a) - minutes(b));
      for (const d of ds) { if (d.items.length >= 9 || perSess(d, m) + 2 > capM(m) || minutes(d) + 6 > d.bud) continue; const inD = new Set(d.items.map(i => i.exId)); for (const slot of (EXTRA[m] || [])) { const sl = SL[slot]; let pool = poolOf(slot, w).filter(id => !inD.has(id)); if (!pool.length) continue; d.items.push({ slot, m, role: sl.role, exId: pool[(used[slot] || 0) % pool.length], sets: 2 }); used[slot] = (used[slot] || 0) + 1; return true; } }
      return false;
    };
    const mfreq0 = m => days.filter(d => d.items.some(i => i.m === m)).length;
    let guard = 80;
    while (guard--) {
      let changed = false;
      musclesNow().forEach(m => {
        const [lo, hi] = rangeOf(goal, exp, m); const c = counted(m);
        if (c < lo) { const es = allI().filter(i => i.m === m && i.sets < capOf(i)).sort((a, b) => (b.role === 'main') - (a.role === 'main')); const e0 = es.find(i => { const d = dayOf(i); return d && minutes(d) + 4 <= d.bud && perSess(d, m) < capM(m); });
          if (e0) { setS(e0, e0.sets + 1); changed = true; }
          else if (addEntry(m)) changed = true;
          else { // brak czasu: zabierz serię z grupy, która ma nadwyżkę nad dolną granicą, w tym samym dniu
            for (const t of es) { const d = dayOf(t); if (!d || perSess(d, m) >= capM(m)) continue; const donor = [...d.items].reverse().find(x => x.m !== m && !prioM.includes(x.m) && x.sets > 2 && counted(x.m) - (x.mate && x.mate.m === x.m ? 2 : 1) >= rangeOf(goal, exp, x.m)[0] && !(x.mate && x.mate.m === m)); if (donor) { setS(donor, donor.sets - 1); setS(t, t.sets + 1); changed = true; break; } } } }
        else if (c > hi) { const es = allI().filter(i => i.m === m && i.sets > 2).reverse(); if (es[0]) { setS(es[0], es[0].sets - 1); changed = true; } }
      });
      const push = direct('chest') + allI().filter(i => i.slot === 'sh_press').reduce((a, i) => a + i.sets, 0), pull = direct('back') + allI().filter(i => i.slot === 'sh_rear').reduce((a, i) => a + i.sets, 0);
      if (push > 0 && pull < 0.85 * push) { const e0 = allI().filter(i => i.m === 'back' && i.sets < 4).find(i => { const d = dayOf(i); return d && minutes(d) + 4 <= d.bud && perSess(d, 'back') < capM('back'); }); if (e0) { setS(e0, e0.sets + 1); changed = true; } }
      if (!changed) break;
    }

    // ---- wykorzystanie zadeklarowanego czasu: najpierw partie priorytetowe, potem reszta ----
    if (w.time || w.timeByDay) {
      let pass = 0; const wantOf = m => { const [lo, hi] = rangeOf(goal, exp, m); if (cautious) return Math.min(hi, lo + 0.3 * (hi - lo)); if (prioM.includes(m)) return hi; const mid = lo + 0.6 * (hi - lo); return pass === 0 || w.sleep === 1 ? mid : hi; };
      const spare = d => d.bud - minutes(d);
      const addAnywhere = m => { // priorytet: dołóż ćwiczenie także do dnia, w którym ta partia normalnie nie występuje (częstsza stymulacja)
        const ds = days.filter(d => spare(d) >= 9 && d.items.length < 9 && !d.items.some(i => i.m === m)).sort((a, b) => spare(b) - spare(a));
        for (const d of ds) { const inD = new Set(d.items.map(i => i.exId)); for (const slot of (EXTRA[m] || [])) { const sl = SL[slot]; let pool = poolOf(slot, w).filter(id => !inD.has(id)); if (!pool.length) continue; d.items.push({ slot, m, role: sl.role, exId: pool[(used[slot] || 0) % pool.length], sets: 2 }); used[slot] = (used[slot] || 0) + 1; return true; } }
        return false;
      };
      const takeFrom = (d, m, n) => { // zabierz n serii partiom nie-priorytetowym (z zachowaniem ich dolnej granicy) w tym samym dniu
        const taken = []; for (let k = 0; k < n; k++) { const x = [...d.items].reverse().find(y => y.m !== m && !prioM.includes(y.m) && y.sets > 2 && counted(y.m) - (y.mate && y.mate.m === y.m ? 2 : 1) >= rangeOf(goal, exp, y.m)[0] && !(y.mate && y.mate.m === m) && !taken.includes(y)); if (!x) { taken.forEach(t => setS(t, t.sets + 1)); return false; } setS(x, x.sets - 1); taken.push(x); } return true; };
      const swapIn = m => {
        for (const d of days.filter(dd => dd.items.some(i => i.m === m) || dd.items.length < 9)) {
          if (perSess(d, m) + 1 > capM(m)) continue; const mine = d.items.filter(i => i.m === m && i.sets < capOf(i));
          if (mine.length) { if (takeFrom(d, m, 1)) { setS(mine[0], mine[0].sets + 1); return true; } continue; }
          if (d.items.length >= 9) continue; const inD = new Set(d.items.map(i => i.exId));
          for (const slot of (EXTRA[m] || [])) { const sl = SL[slot]; let pool = poolOf(slot, w).filter(id => !inD.has(id)); if (!pool.length) continue; if (!takeFrom(d, m, 2)) break; d.items.push({ slot, m, role: sl.role, exId: pool[(used[slot] || 0) % pool.length], sets: 2 }); used[slot] = (used[slot] || 0) + 1; return true; }
        }
        return false;
      };
      let g2 = 300; const order = () => { const ms = musclesNow(); return [...ms.filter(m => prioM.includes(m)), ...ms.filter(m => !prioM.includes(m))]; };
      while (g2--) {
        let did = false;
        for (const m of order()) {
          if (counted(m) >= wantOf(m)) continue;
          const es = allI().filter(i => i.m === m && i.sets < capOf(i)).sort((a, b) => (b.role === 'main') - (a.role === 'main'));
          const e0 = es.find(i => { const d = dayOf(i); return d && minutes(d) + 4 <= d.bud && perSess(d, m) < capM(m); });
          if (e0) { setS(e0, e0.sets + 1); did = true; break; }
          if (addEntry(m)) { did = true; break; }
          if (prioM.includes(m) && swapIn(m)) { did = true; break; }
          if (prioM.includes(m) && mfreq0(m) < 3 && addAnywhere(m)) { did = true; break; }
        }
        if (!did) { if (pass === 0) { pass = 1; continue; } break; }
      }
      // zostało dużo czasu — wydłuż przerwy przy ćwiczeniach głównych (więcej odpoczynku = lepsza jakość serii)
      days.forEach(d => { let gg = 12; while (spare(d) > 6 && gg--) { const i = d.items.find(x => x.role === 'main' && restOf(x) < 180); if (!i) break; i.restX = Math.min(180, restOf(i) + 30); if (minutes(d) > d.bud) { i.restX -= 30; break; } } });
      // partie priorytetowe na początku sesji (przy największej świeżości), ćwiczenia główne przed izolowanymi
      if (prioM.length) days.forEach(d => { const blocks = []; const seen = new Set(); d.items.forEach(i => { if (i.ss) { if (seen.has(i.ss)) return; seen.add(i.ss); blocks.push(d.items.filter(x => x.ss === i.ss)); } else blocks.push([i]); }); const key = (b, ix) => [b.some(x => x.role === 'main') ? 0 : 1, b.some(x => prioM.includes(x.m)) ? 0 : 1, ix]; const sorted = blocks.map((b, ix) => ({ b, k: key(b, ix) })).sort((a, c) => a.k[0] - c.k[0] || a.k[1] - c.k[1] || a.k[2] - c.k[2]); d.items = sorted.flatMap(x => x.b); });
    }
    const muscles = musclesNow();
    muscles.forEach(m => { const c = counted(m), [lo, hi] = rangeOf(goal, exp, m); if (c < lo - 0.5) notes.push(`${MLABEL[m]}: ${Math.round(c)} serii tygodniowo (cel ${lo}–${hi}) — ogranicza to limit czasu, sprzęt lub podział.`); else if (c > hi * 1.25 && MAJOR.includes(m)) notes.push(`${MLABEL[m]}: ${Math.round(c)} serii tygodniowo (cel ${lo}–${hi}).`); });
    const mfreq = freqMap(sp);
    if (goal === 'str' && minFreq(sp) < 2) notes.push('Przy tym podziale główne grupy mięśni są trenowane raz w tygodniu, a dla siły zalecane są co najmniej 2 sesje tygodniowo (ACSM). Rozważ FBW, górę/dół lub PHUL.');
    if (nd < 2) notes.push('WHO zaleca ćwiczenia wzmacniające mięśnie co najmniej 2 dni w tygodniu — przy jednym treningu zadbaj o dodatkową aktywność.');
    days.forEach(d => { const m = minutes(d); if (d.bud && w.time && m > d.bud + 5) notes.push(`${d.name}: ok. ${m} min — dłużej niż limit ${d.bud} min.`); if (d.items.length < 3) notes.push(`${d.name}: przy tym sprzęcie i ograniczeniach dobrałem tylko ${d.items.length} ćw. — rozważ zmianę sprzętu lub ograniczeń.`); d.min = m; if (w.time && d.bud - m >= 14 && d.items.length >= 5) notes.push(`${d.name}: plan zajmuje ok. ${m} z ${d.bud} min — więcej serii jednej partii w jednej sesji nie przyniosłoby korzyści, więc zostawiłem zapas (możesz go wykorzystać na dłuższe przerwy lub rozgrzewkę).`); });
    if (w.cautious) notes.push(older ? 'Ze względu na wiek zostawiaj większy zapas powtórzeń i nie dochodź do upadku mięśniowego; zadbaj też o ćwiczenia równowagi (WHO: 3+ dni w tygodniu dla osób 65+).' : 'Ustawiłem ostrożniejszy plan (większy zapas powtórzeń). Rozważ konsultację z lekarzem lub trenerem.');
    if (!w.active && exp !== 'beg') notes.push('Wracasz po przerwie: pierwsze 2 tygodnie zrób z ok. 70% zaplanowanych serii i lżejszymi ciężarami.');
    if (w.sleep === 1) notes.push('Śpisz mniej niż 6 godzin — ograniczyłem objętość. Konsensus towarzystw zaleca regularnie co najmniej 7 godzin snu dla dorosłych.');
    const volume = {}; muscles.forEach(m => { volume[m] = { sets: Math.round(counted(m) * 10) / 10, range: rangeOf(goal, exp, m), freq: mfreq[m] || 0 }; });
    // ---- plan FORGE ----
    const reps0 = KB.reps[goal]; const rirB = KB.rir[exp];
    const repsFor = (d, role) => { let r = d.tag === 'pw' ? KB.repsPower[role] : d.tag === 'hy' ? KB.repsHyp[role] : reps0[role]; if (older && goal === 'str' && role === 'main') r = '6-8'; return r; };
    const step = F.S.settings.step || 2.5; const rnd = v => Math.max(0, Math.round(v / step) * step);
    const startW = (exId, reps, rirTxt) => { try { const e1 = F.bestE1(exId); if (!e1) return 0; const r = firstNum(reps) + Math.max(1, lastNum(rirTxt)); return rnd(e1 / (1 + r / 30)); } catch (_) { return 0; } };
    const plan = {
      id: F.uid(), created: Date.now(), name: `${F.PLN.GOALS[goal][0]} · ${nd} ${F.plur(nd, 'dzień', 'dni', 'dni')} · ${sp.n.replace(/ \(.*\)/, '')}`,
      meta: { gen: 2, goal, exp, split: splitId, weekdays: w.days, time: w.time, inj: w.inj, meso: KB.meso[exp] },
      days: days.map((d, di) => ({ id: F.uid(), name: dayLabel(w.days[di], d.name), items: d.items.map((i, ii) => { const reps = repsFor(d, i.role); const rir = rirB[i.role] + (w.cautious ? '+' : ''); const wk = i.m && F.S.ex.get(i.exId).type !== 'time' ? startW(i.exId, reps, rirB[i.role]) : 0; const parts = [`Zapas: ${rirB[i.role]} powt. (RIR)${w.cautious ? ', zostaw więcej' : ''}`]; if (ii === 0 && i.role === 'main') parts.push('rozgrzewka: 2–3 lżejsze serie'); if (wk) parts.push('ciężar startowy z Twojej historii'); const it = { id: F.uid(), exId: i.exId, sets: i.sets, reps, rest: restOf(i), w: wk, note: parts.join(' · ') }; if (i.ss) it.ss = i.ss; return it; }) }))
    };
    plan.days.forEach(d => { F.cleanSS(d.items); const inf = F.ssInfo(d.items); d.items.forEach((it, k) => { const g = inf[k]; if (g) { const mx = Math.max(...d.items.slice(g.start, g.end + 1).map(x => x.rest || 0)); it.rest = mx; } }); });
    // ---- cardio (opcjonalne dni) ----
    let cardio = null;
    if (w.cardioAdd) {
      const need = Math.max(0, 150 - (w.cardioMin || 0)); const cnt = clamp(Math.ceil(need / 35), need ? 1 : 0, 3); const mapC = { walk: 'incline_walk', bike: 'bike', run: 'run', row: 'rower', ellip: 'elliptical', stairs: 'stairs' };
      let cid = mapC[w.cardioPref] || 'incline_walk'; if (!okEx(cid, { ...w, equip: w.equip })) cid = 'incline_walk';
      if (cnt > 0 && F.S.ex.has(cid)) { const mins = need >= 105 ? 35 : 30; cardio = { exId: cid, sessions: cnt, mins }; for (let k = 0; k < cnt; k++) plan.days.push({ id: F.uid(), name: `Cardio ${k + 1} (opcjonalnie)`, items: [{ id: F.uid(), exId: cid, sets: 1, reps: String(mins * 60), rest: 0, w: 0, note: 'Umiarkowany wysiłek: da się rozmawiać, ale nie śpiewać' }] }); }
    }
    return { plan, work: w, splitId, split: sp, days, notes, volume, ranking, cardio, meso: mesoOf(w, goal, exp), why: why(w, splitId, days, ranking, cardio) };
  };
  const WD = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const dayLabel = (wd, name) => (wd == null ? '' : WD[wd] + ' — ') + name;

  /* ---------- mezocykl ---------- */
  const mesoOf = (w, goal, exp) => {
    const L = KB.meso[exp]; const rows = []; const target = { beg: 2, mid: 1, adv: 1 }[exp];
    for (let k = 1; k < L; k++) { const rir = clamp(3 - Math.round((k - 1) * (3 - target) / Math.max(1, L - 2)), target, 3); rows.push({ week: k, text: `RIR ok. ${rir}${k === 1 && !w.active ? ' · ok. 70% serii (powrót po przerwie)' : ''}` }); }
    rows.push({ week: L, text: 'Odciążenie: ok. połowa serii, ten sam lub nieco niższy ciężar, zapas 4+ powtórzeń', deload: true });
    return { weeks: L, rows };
  };

  /* ---------- uzasadnienie (bez źródeł) ---------- */
  const why = (w, splitId, days, ranking, cardio) => {
    const sp = SPLITS[splitId], g = w.goal, e = w.exp; const r = KB.reps[g], rest = KB.rest[g], rir = KB.rir[e]; const nd = (w.days || []).length;
    const L = []; const top = ranking.find(x => x.id === splitId);
    L.push(`<b>Podział: ${E(sp.n)}.</b> ${E(sp.d)} Wybrałem go dla ${nd} ${F.plur(nd, 'dnia', 'dni', 'dni')} treningowych w tygodniu${top && top.why.length ? ': ' + E(top.why.slice(0, 2).join('; ')) : ''}.`);
    const vol = KB.vol[g][e]; L.push(`<b>Objętość.</b> Celuję w ok. ${vol.major[0]}–${vol.major[1]} serii tygodniowo na duże grupy (klatka, plecy, nogi) oraz ${vol.minor[0]}–${vol.minor[1]} na mniejsze (barki, ręce). Zaczynasz od dolnej połowy zakresu, żeby było miejsce na dokładanie serii, gdy się zaadaptujesz.${(w.prio || []).length ? ' Partie priorytetowe dostały więcej serii.' : ''}`);
    L.push(`<b>Powtórzenia i obciążenie.</b> Ćwiczenia główne: ${r.main}, pomocnicze wielostawowe: ${r.sec}, izolowane: ${r.iso} powtórzeń. ${g === 'str' ? 'Ciężkie serie (ok. 80% maksymalnego ciężaru i więcej) najlepiej zwiększają siłę.' : g === 'endur' ? 'Wyższe powtórzenia i krótkie przerwy trenują wytrzymałość mięśniową.' : 'Mięśnie rosną w szerokim zakresie obciążeń, jeśli seria jest wymagająca — wybieram zakresy wygodne dla stawów.'}`);
    L.push(`<b>Zapas powtórzeń (RIR).</b> Kończ serie z zapasem: główne ${rir.main}, pomocnicze ${rir.sec}, izolowane ${rir.iso} powtórzeń. Do upadku nie musisz dochodzić — blisko upadku w zupełności wystarcza.${e === 'beg' ? ' Na początku ważniejsza jest technika.' : ''}`);
    L.push(`<b>Przerwy.</b> Główne ${Math.round(rest.main / 30) / 2} min, pomocnicze ${Math.round(rest.sec / 30) / 2} min, izolowane ${Math.round(rest.iso / 30) / 2} min. Dłuższy odpoczynek w ciężkich ćwiczeniach pozwala utrzymać liczbę powtórzeń.`);
    if (days.some(d => d.items.some(i => i.ss))) L.push('<b>Superserie.</b> Niektóre ćwiczenia przeciwnych partii są łączone w pary (np. biceps i triceps) — oszczędzasz czas, a mięsień odpoczywa, gdy pracuje drugi.');
    L.push('<b>Kolejność.</b> Najpierw duże, wielostawowe ćwiczenia, potem pomocnicze i izolowane — wtedy najważniejsze ruchy wykonujesz na świeżo.');
    L.push('<b>Progresja.</b> Gdy w seriach dobijesz do górnej granicy powtórzeń z zachowanym zapasem, zwiększ ciężar o najmniejszy możliwy krok (ok. 2–10%) i wróć do dolnej granicy. Aplikacja będzie Ci to podpowiadać.');
    L.push(`<b>Mezocykl i odciążenie.</b> Plan zakłada ${KB.meso[e]} tygodni: stopniowo mniejszy zapas powtórzeń, a ostatni tydzień lżejszy. To orientacyjny schemat — jeśli czujesz przewlekłe zmęczenie, odciąż się wcześniej.`);
    if (cardio) L.push(`<b>Cardio.</b> Dodałem ${cardio.sessions} ${F.plur(cardio.sessions, 'opcjonalną sesję', 'opcjonalne sesje', 'opcjonalnych sesji')} po ok. ${cardio.mins} min o umiarkowanej intensywności, żeby razem z Twoją aktywnością zbliżyć się do zalecanych 150 minut tygodniowo. Jeśli zależy Ci na masie mięśniowej, rower lub marsz mogą mniej kolidować z treningiem siłowym niż bieganie, ale dowody są ograniczone.`);
    if ((w.inj || []).length) L.push(`<b>Ograniczenia.</b> Pominąłem ćwiczenia, które zwykle obciążają: ${w.inj.map(k => F.PLN.INJ[k].toLowerCase()).join(', ')}. To nie jest porada medyczna — przy bólu skonsultuj się z lekarzem lub fizjoterapeutą.`);
    return L;
  };
})();
