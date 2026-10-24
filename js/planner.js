/* FORGE — kreator planu treningowego (silnik regułowy, bez AI).
   Czyta profil z ustawień, dobiera podział, objętość, zakresy powtórzeń, przerwy i ćwiczenia, sprawdza wynik walidatorem
   i zapisuje zwykły plan FORGE. Zasady i zakresy: F.KB (js/kb.js). Uzasadnienie dla użytkownika jest bez przypisów — źródła są w kompendium. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views; const KB = F.KB;

  /* ---------- słowniki ---------- */
  const GOALS = { hyp: ['Masa mięśniowa', 'Budowa mięśni: większa objętość, powtórzenia ok. 6–15'], str: ['Siła', 'Ciężkie serie wielostawowe, dłuższe przerwy'], sculpt: ['Rzeźba / redukcja', 'Zachowanie mięśni przy odchudzaniu, krótsze przerwy'], endur: ['Wytrzymałość', 'Więcej powtórzeń, krótkie przerwy, superserie'], health: ['Zdrowie i ogólna sprawność', 'Proste, bezpieczne, całe ciało 2–3 razy w tygodniu'] };
  const EXPS = { beg: ['Początkujący', 'do ok. roku regularnych treningów'], mid: ['Średniozaawansowany', '1–3 lata'], adv: ['Zaawansowany', 'ponad 3 lata'] };
  const EQUIPS = { gym: ['Siłownia', 'sztangi, maszyny, wyciągi'], home: ['Dom z hantlami', 'hantle, kettlebell, guma, masa ciała'], bw: ['Tylko masa ciała', 'bez sprzętu'] };
  const INJ = { shoulder: 'Barki', back: 'Dolny odcinek pleców', knee: 'Kolana', elbow: 'Łokcie / nadgarstki', hip: 'Biodra' };
  const AVOID = {
    shoulder: ['ohp', 'push_press', 'upright', 'dips', 'arnold', 'front_raise', 'snatch', 'thruster', 'bench_dec', 'fe_standing_dumbbell_upright_row'],
    back: ['deadlift', 'sumo', 'good_m', 'row_bb', 'row_tbar', 'hyper', 'rdl', 'clean', 'snatch', 'kb_swing', 'thruster', 'front_sq', 'fe_stiff_legged_dumbbell_deadlift', 'fe_bent_over_two_dumbbell_row'],
    knee: ['lunge', 'bulgar', 'step_up', 'leg_ext', 'hack', 'sled', 'fe_bodyweight_walking_lunge', 'fe_bodyweight_squat', 'burpee'],
    elbow: ['skull', 'dips', 'bench_dip', 'curl_bb', 'curl_pre', 'wrist_curl', 'tri_over', 'cgbp', 'pushup'],
    hip: ['sumo', 'sumo_sq', 'bulgar', 'lunge', 'abduct', 'adduct', 'good_m']
  };
  const RIG = ['dips', 'nordic', 'hyper', 'fe_inverted_row']; // wymagają sprzętu spoza „domu”
  const MAJOR = ['chest', 'back', 'quads', 'hams'];
  const MLABEL = { chest: 'Klatka', back: 'Plecy', shoulders: 'Barki', biceps: 'Biceps', triceps: 'Triceps', quads: 'Czworogłowe', hams: 'Dwugłowe', glutes: 'Pośladki', calves: 'Łydki', abs: 'Brzuch' };

  /* ---------- sloty ruchowe: kolejność = preferencja ---------- */
  const P = (all, beg) => ({ all, beg: beg || all });
  const SL = {
    chest_press: { m: 'chest', role: 'main', pool: P(['bench', 'db_bench', 'chest_mach', 'pushup', 'fe_incline_push_up'], ['chest_mach', 'db_bench', 'pushup', 'bench']) },
    chest_inc: { m: 'chest', role: 'sec', pool: P(['db_inc', 'bench_inc', 'chest_mach', 'fe_incline_push_up', 'pushup']) },
    chest_fly: { m: 'chest', role: 'iso', pool: P(['fly_cable', 'pec_deck', 'fly_db']) },
    back_vert: { m: 'back', role: 'main', pool: P(['pullup', 'lat_pull', 'chinup', 'fe_inverted_row'], ['lat_pull', 'chinup', 'pullup', 'fe_inverted_row']) },
    back_row: { m: 'back', role: 'main', pool: P(['row_bb', 'row_cable', 'row_db', 'row_mach', 'row_tbar', 'fe_bent_over_two_dumbbell_row', 'fe_inverted_row'], ['row_mach', 'row_cable', 'row_db', 'row_bb', 'fe_bent_over_two_dumbbell_row', 'fe_inverted_row']) },
    back_row2: { m: 'back', role: 'sec', pool: P(['row_db', 'row_cable', 'row_mach', 'row_tbar', 'row_bb', 'fe_bent_over_two_dumbbell_row', 'fe_inverted_row']) },
    sh_press: { m: 'shoulders', role: 'main', pool: P(['ohp', 'db_ohp', 'sh_mach', 'arnold', 'fe_incline_push_up'], ['sh_mach', 'db_ohp', 'ohp']) },
    sh_lat: { m: 'shoulders', role: 'iso', pool: P(['lateral', 'lateral_c']) },
    sh_rear: { m: 'shoulders', role: 'iso', pool: P(['rear_fly', 'facepull']) },
    bi: { m: 'biceps', role: 'iso', pool: P(['curl_ez', 'curl_db', 'curl_inc', 'curl_cab', 'curl_ham']) },
    tri: { m: 'triceps', role: 'iso', pool: P(['tri_rope', 'tri_push', 'skull', 'tri_over', 'kickback']) },
    tri_comp: { m: 'triceps', role: 'sec', pool: P(['cgbp', 'dips', 'bench_dip']) },
    quad_main: { m: 'quads', role: 'main', pool: P(['squat', 'leg_press', 'hack', 'smith_sq', 'goblet', 'front_sq', 'fe_bodyweight_squat'], ['leg_press', 'goblet', 'smith_sq', 'squat', 'hack', 'fe_bodyweight_squat']) },
    quad_uni: { m: 'quads', role: 'sec', pool: P(['bulgar', 'lunge', 'step_up', 'goblet', 'fe_bodyweight_walking_lunge'], ['step_up', 'lunge', 'goblet', 'bulgar', 'fe_bodyweight_walking_lunge']) },
    quad_iso: { m: 'quads', role: 'iso', pool: P(['leg_ext']) },
    ham_hinge: { m: 'hams', role: 'main', pool: P(['rdl', 'good_m', 'fe_stiff_legged_dumbbell_deadlift', 'kb_swing', 'fe_single_leg_glute_bridge'], ['rdl', 'fe_stiff_legged_dumbbell_deadlift', 'kb_swing', 'fe_single_leg_glute_bridge']) },
    ham_curl: { m: 'hams', role: 'iso', pool: P(['leg_curl', 'leg_curl_s', 'nordic', 'fe_single_leg_glute_bridge']) },
    glute: { m: 'glutes', role: 'sec', pool: P(['hip_thrust', 'glute_br', 'frog_pump', 'glute_kick', 'fe_single_leg_glute_bridge']) },
    calf: { m: 'calves', role: 'iso', pool: P(['calf_st', 'calf_se', 'calf_press', 'fe_standing_dumbbell_calf_raise']) },
    abs: { m: 'abs', role: 'iso', pool: P(['cab_crunch', 'crunch', 'leg_raise', 'plank', 'ab_wheel', 'fe_flat_bench_lying_leg_raise']) }
  };

  /* ---------- szablony dni ---------- */
  const T = {
    fbA: ['Całe ciało A', ['quad_main', 'chest_press', 'back_row', 'ham_curl', 'sh_lat', 'abs']],
    fbB: ['Całe ciało B', ['ham_hinge', 'sh_press', 'back_vert', 'chest_inc', 'glute', 'tri', 'bi']],
    fbC: ['Całe ciało C', ['quad_uni', 'chest_press', 'back_row2', 'ham_curl', 'bi', 'tri', 'calf']],
    fb1: ['Całe ciało', ['quad_main', 'ham_hinge', 'chest_press', 'back_row', 'back_vert', 'sh_press', 'abs']],
    up1: ['Góra 1', ['chest_press', 'back_row', 'sh_press', 'back_vert', 'bi', 'tri']],
    lo1: ['Dół 1', ['quad_main', 'ham_hinge', 'ham_curl', 'glute', 'calf', 'abs']],
    up2: ['Góra 2', ['chest_inc', 'back_vert', 'sh_lat', 'back_row2', 'sh_rear', 'tri', 'bi']],
    lo2: ['Dół 2', ['quad_uni', 'glute', 'ham_curl', 'quad_iso', 'calf', 'abs']],
    push: ['Push — klatka, barki, triceps', ['chest_press', 'sh_press', 'chest_inc', 'sh_lat', 'tri', 'chest_fly']],
    pull: ['Pull — plecy i biceps', ['back_vert', 'back_row', 'back_row2', 'sh_rear', 'bi']],
    legs: ['Nogi', ['quad_main', 'ham_hinge', 'quad_uni', 'ham_curl', 'calf', 'abs', 'glute']]
  };
  const SPLITS = {
    fbw1: { n: 'Całe ciało (1 dzień)', d: 'Jeden pełny trening tygodniowo — minimum dla utrzymania formy. Każda grupa raz.', days: ['fb1'], freq: 1 },
    fbw2: { n: 'FBW 2 dni (A/B)', d: 'Dwa treningi całego ciała tygodniowo. Każda grupa dwa razy w tygodniu przy mało dniach.', days: ['fbA', 'fbB'], freq: 2 },
    fbw3: { n: 'FBW 3 dni (A/B/C)', d: 'Trzy treningi całego ciała, każda grupa ok. 2–3 razy w tygodniu. Prosto i skutecznie.', days: ['fbA', 'fbB', 'fbC'], freq: 2.5 },
    ppl3: { n: 'Push / Pull / Nogi (3 dni)', d: 'Każda grupa raz w tygodniu, więcej ćwiczeń na jedną partię w treningu. Mniej optymalne dla masy niż FBW, ale wielu osobom odpowiada.', days: ['push', 'pull', 'legs'], freq: 1 },
    ul4: { n: 'Góra / Dół (4 dni)', d: 'Dwa treningi góry i dwa dołu — każda grupa 2 razy w tygodniu. Dobry balans objętości i regeneracji.', days: ['up1', 'lo1', 'up2', 'lo2'], freq: 2 },
    fbw4: { n: 'FBW 4 dni', d: 'Cztery krótsze treningi całego ciała; wysoka częstotliwość, mniejsza objętość na trening.', days: ['fbA', 'fbB', 'fbC', 'fbA'], freq: 3 },
    ulppl5: { n: 'Góra/Dół + Push/Pull/Nogi (5 dni)', d: 'Pięć dni: większość grup 2 razy w tygodniu, z dużą objętością dla zaawansowanych.', days: ['up1', 'lo1', 'push', 'pull', 'legs'], freq: 2 },
    ppl6: { n: 'Push / Pull / Nogi ×2 (6 dni)', d: 'Sześć dni, każda grupa 2 razy w tygodniu. Wymaga dobrej regeneracji i czasu.', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], freq: 2 }
  };
  const SPLIT_OPTS = { 1: ['fbw1'], 2: ['fbw2'], 3: ['fbw3', 'ppl3'], 4: ['ul4', 'fbw4'], 5: ['ulppl5'], 6: ['ppl6'] };
  const recommend = w => {
    return w.days === 4 && w.goal === 'health' ? 'fbw4' : SPLIT_OPTS[w.days][0];
  };

  /* ---------- pomocnicze ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const allowedEquip = w => { const a = w.equip === 'gym' ? null : w.equip === 'home' ? ['Hantle', 'Kettlebell', 'Masa ciała', 'Inne'] : ['Masa ciała']; if (a && w.bar) a.push('Drążek'); return a; };
  const okEx = (id, w) => {
    const ex = F.S.ex.get(id); if (!ex) return false;
    const ae = allowedEquip(w); if (ae && !ae.includes(ex.equip)) return false;
    if (w.equip !== 'gym' && RIG.includes(id)) { if (!(id === 'fe_inverted_row' && w.bar)) return false; }
    if (w.equip === 'bw' && ex.equip === 'Hantle') return false;
    for (const k of (w.inj || [])) if ((AVOID[k] || []).includes(id)) return false;
    return true;
  };
  const poolOf = (slot, w) => { const s = SL[slot]; const l = (w.exp === 'beg' || w.goal === 'health') ? s.pool.beg : s.pool.all; return l.filter(id => okEx(id, w)); };
  const exName = id => (F.S.ex.get(id) || {}).name || id;
  const range = (goal, exp, m) => { const r = KB.vol[goal][exp]; return MAJOR.includes(m) ? r.major : r.minor; };

  /* ---------- generator ---------- */
  F.planGen = (w0, variant = 0) => {
    const w = { days: 3, time: 60, goal: 'hyp', exp: 'beg', equip: 'gym', bar: true, inj: [], split: 'auto', ...w0 };
    const splitId = w.split && w.split !== 'auto' && SPLITS[w.split] && SPLIT_OPTS[w.days].includes(w.split) ? w.split : recommend(w);
    const sp = SPLITS[splitId]; const goal = w.goal, exp = w.exp;
    const used = {}; const days = sp.days.map((tid, di) => {
      const t = T[tid]; const items = []; const inDay = new Set();
      t[1].forEach(slot => {
        const s = SL[slot]; const pool = poolOf(slot, w).filter(id => !inDay.has(id)); if (!pool.length) return;
        used[slot] = (used[slot] || 0); let k = (goal === 'str' && s.role === 'main') ? 0 : used[slot] + variant; used[slot]++;
        const id = pool[k % pool.length]; inDay.add(id);
        items.push({ slot, m: s.m, role: s.role, exId: id });
      });
      return { name: t[0], tid, items };
    });
    // ---- przydział serii ----
    const budget = w.time || 90; const tight = !!w.time && w.time <= 60;
    const allI = () => days.flatMap(d => d.items);
    const setS = (i, v) => { i.sets = v; if (i.mate) i.mate.sets = v; };
    // superserie antagonistów (oszczędność czasu): zawsze biceps+triceps, a przy krótkim treningu / celu wytrzymałościowym także klatka+plecy i czworogłowe+dwugłowe
    const PAIRS = [['biceps', 'triceps'], ['chest', 'back'], ['quads', 'hams']];
    const ssAll = goal === 'endur' || goal === 'sculpt' || tight;
    days.forEach(d => {
      for (let k = 0; k < d.items.length - 1; k++) {
        const a = d.items[k], b = d.items[k + 1]; if (a.mate || b.mate) continue;
        const ok = PAIRS.some(p => (p[0] === a.m && p[1] === b.m) || (p[1] === a.m && p[0] === b.m)); if (!ok) continue;
        const arms = a.m === 'biceps' || a.m === 'triceps';
        if (!arms && !ssAll) continue; if (a.role === 'iso' && b.role !== 'iso') continue;
        const id = F.uid(); a.ss = id; b.ss = id; a.mate = b; b.mate = a; k++;
      }
    });
    const targetOf = m => { const [a, b] = range(goal, exp, m); const f = tight ? 0.15 : 0.4; return Math.round(a + f * (b - a)); };
    const muscles = [...new Set(allI().map(i => i.m))];
    muscles.forEach(m => { const es = allI().filter(i => i.m === m); const T0 = targetOf(m); es.forEach(i => setS(i, clamp(Math.round(T0 / es.length), i.role === 'main' ? 3 : 2, i.role === 'iso' || goal === 'str' ? 5 : 4))); });
    const direct = m => allI().filter(i => i.m === m).reduce((a, i) => a + i.sets, 0);
    const indirect = m => allI().reduce((a, i) => { if (i.m === m) return a; const ex = F.S.ex.get(i.exId); const inf = F.EXINFO && F.EXINFO[i.exId]; const sec = (ex && ex.sec) || (inf && inf.s) || []; return a + (ex && ex.compound && sec.includes(m) ? 0.5 * i.sets : 0); }, 0);
    const counted = m => direct(m) + (MAJOR.includes(m) ? 0 : indirect(m));
    // ---- czas ----
    const restOf = i => i.restX || KB.rest[goal][i.role];
    const minutes = d => { let sec = 480; const seen = new Set(); d.items.forEach(i => { if (i.ss) { if (seen.has(i.ss)) return; seen.add(i.ss); const g = d.items.filter(x => x.ss === i.ss); sec += i.sets * (40 * g.length + Math.max(...g.map(restOf))) + g.reduce((a, x) => a + (x.role === 'main' ? 150 : 45), 0); } else sec += i.sets * (40 + restOf(i)) + (i.role === 'main' ? 150 : 45); }); return Math.round(sec / 60); };
    days.forEach(d => {
      let guard = 80; while (minutes(d) > budget && guard--) {
        const cut = [...d.items].reverse().find(i => i.sets > 2 && i.role !== 'main') || [...d.items].reverse().find(i => i.sets > 2);
        if (cut) { setS(cut, cut.sets - 1); continue; }
        const long = d.items.find(i => restOf(i) > 90 && i.role !== 'iso');
        if (long) { long.restX = Math.max(90, restOf(long) - 30); continue; }
        if (d.items.length > 4) { const last = d.items[d.items.length - 1]; if (last.mate) { last.mate.mate = null; delete last.mate.ss; } d.items.pop(); } else break;
      }
    });
    // ---- walidator i korekty objętości ----
    let guard = 60; const notes = [];
    const dayOf = i => days.find(dd => dd.items.includes(i));
    while (guard--) {
      let changed = false;
      muscles.forEach(m => {
        const [lo, hi] = range(goal, exp, m); const c = counted(m);
        if (c < lo) { const capOf = i => (i.role === 'main' && goal !== 'str') || i.role === 'sec' ? 4 : 5; const es = allI().filter(i => i.m === m && i.sets < capOf(i)).sort((a, b) => (b.role === 'main') - (a.role === 'main')); const e0 = es.find(i => { const d = dayOf(i); return d && minutes(d) + 4 <= budget; }); if (e0) { setS(e0, e0.sets + 1); changed = true; } }
        else if (c > hi) { const es = allI().filter(i => i.m === m && i.sets > 2).reverse(); if (es[0]) { setS(es[0], es[0].sets - 1); changed = true; } }
      });
      const push = direct('chest') + allI().filter(i => i.slot === 'sh_press').reduce((a, i) => a + i.sets, 0), pull = direct('back') + allI().filter(i => i.slot === 'sh_rear').reduce((a, i) => a + i.sets, 0);
      if (pull < 0.85 * push) { const e0 = allI().filter(i => i.m === 'back' && i.sets < 4).find(i => { const d = dayOf(i); return d && minutes(d) + 4 <= budget; }); if (e0) { setS(e0, e0.sets + 1); changed = true; } }
      if (!changed) break;
    }
    muscles.forEach(m => { const c = counted(m), [lo, hi] = range(goal, exp, m); if (c < lo - 0.5) notes.push(`${MLABEL[m]}: ${Math.round(c)} serii tygodniowo (cel ${lo}–${hi}) — limit czasu lub sprzęt ogranicza objętość.`); else if (c > hi * 1.25 && MAJOR.includes(m)) notes.push(`${MLABEL[m]}: ${Math.round(c)} serii tygodniowo (cel ${lo}–${hi}).`); });
    if (sp.freq < 2 && w.days >= 3) notes.push('Przy tym podziale każda grupa mięśniowa jest trenowana raz w tygodniu. Jeśli celem jest masa, rozważ FBW lub górę/dół.');
    days.forEach(d => { const m = minutes(d); if (w.time && m > w.time + 5) notes.push(`${d.name}: ok. ${m} min — dłużej niż Twój limit ${w.time} min.`); if (d.items.length < 3) notes.push(`${d.name}: przy tym sprzęcie i ograniczeniach udało się dobrać tylko ${d.items.length} ćw. — rozważ inny sprzęt lub zmianę ograniczeń.`); d.min = m; });
    const volume = {}; muscles.forEach(m => { volume[m] = { sets: Math.round(counted(m) * 10) / 10, range: range(goal, exp, m) }; });
    const ps = direct('chest') + allI().filter(i => i.slot === 'sh_press').reduce((a, i) => a + i.sets, 0), pl = direct('back') + allI().filter(i => i.slot === 'sh_rear').reduce((a, i) => a + i.sets, 0);
    if (ps > 0 && pl < 0.8 * ps) notes.push('Ciągnięcie jest wyraźnie słabsze niż pchanie — dodaj serie pleców lub tylnych aktorów.');
    // ---- plan FORGE ----
    const reps = KB.reps[goal], rir = KB.rir[exp];
    const plan = {
      id: F.uid(), created: Date.now(), name: `${GOALS[goal][0]} · ${w.days} ${F.plur(w.days, 'dzień', 'dni', 'dni')}`,
      meta: { gen: 1, goal, exp, equip: w.equip, split: splitId, days: w.days, time: w.time, inj: w.inj, deloadEvery: KB.deloadEvery[exp] },
      days: days.map(d => ({ id: F.uid(), name: d.name, items: d.items.map(i => { const it = { id: F.uid(), exId: i.exId, sets: i.sets, reps: reps[i.role], rest: restOf(i), w: 0, note: `Zapas: ${rir[i.role]} powt. (RIR)` }; if (i.ss) it.ss = i.ss; return it; }) }))
    };
    plan.days.forEach(d => { F.cleanSS(d.items); const inf = F.ssInfo(d.items); d.items.forEach((it, k) => { const g = inf[k]; if (g) { const mx = Math.max(...d.items.slice(g.start, g.end + 1).map(x => x.rest || 0)); it.rest = mx; } }); });
    return { plan, work: w, splitId, split: sp, days, notes, volume, why: why(w, splitId, days) };
  };

  /* ---------- uzasadnienie (bez źródeł) ---------- */
  const why = (w, splitId, days) => {
    const sp = SPLITS[splitId], g = w.goal, e = w.exp; const r = KB.reps[g], rest = KB.rest[g], rir = KB.rir[e];
    const L = [];
    L.push(`<b>Podział: ${E(sp.n)}.</b> ${E(sp.d)} Wybrałem go dla ${w.days} ${F.plur(w.days, 'dnia', 'dni', 'dni')} treningowych tygodniowo${e === 'beg' ? ' i poziomu początkującego — prostota i częste powtarzanie ruchów szybciej uczą techniki' : ''}.`);
    const vol = KB.vol[g][e]; L.push(`<b>Objętość.</b> Celuję w ok. ${vol.major[0]}–${vol.major[1]} serii tygodniowo na duże grupy (klatka, plecy, nogi) i ${vol.minor[0]}–${vol.minor[1]} na mniejsze (barki, ręce, łydki, brzuch). Zaczynasz od dolnej połowy zakresu, żeby było miejsce na dokładanie serii, gdy się adaptujesz.`);
    L.push(`<b>Powtórzenia i obciążenie.</b> Ćwiczenia główne: ${r.main}, pomocnicze wielostawowe: ${r.sec}, izolowane: ${r.iso} powtórzeń. ${g === 'str' ? 'Ciężkie serie robią największą różnicę dla maksymalnej siły.' : g === 'endur' ? 'Wyższe powtórzenia i krótkie przerwy trenują wytrzymałość mięśniową.' : 'W tym zakresie przy odpowiedniej bliskości upadku mięśnie rosną podobnie, więc wybieram te, które są wygodne dla stawów.'}`);
    L.push(`<b>Zapas powtórzeń (RIR).</b> Kończ serie z zapasem: główne ${rir.main}, pomocnicze ${rir.sec}, izolowane ${rir.iso} powt. ${e === 'beg' ? 'Na początku zostawiaj większy zapas — ważniejsza jest technika niż walka do upadku.' : 'Izolacje możesz kończyć bliżej upadku niż ćwiczenia ze sztangą.'}`);
    L.push(`<b>Przerwy.</b> Ćwiczenia główne ${Math.round(rest.main / 30) / 2} min, pomocnicze ${Math.round(rest.sec / 30) / 2} min, izolowane ${Math.round(rest.iso / 30) / 2} min. Dłuższe przerwy w ciężkich ćwiczeniach pozwalają utrzymać liczbę powtórzeń w kolejnych seriach.`);
    if (days.some(d => d.items.some(i => i.ss))) L.push('<b>Superserie.</b> Niektóre ćwiczenia przeciwnych partii (np. biceps i triceps, klatka i plecy) są łączone w pary, żeby skrócić trening – mięsień z jednej serii odpoczywa, gdy pracuje drugi.');
    L.push(`<b>Progresja.</b> Gdy w kilku seriach dobijesz do górnej granicy powtórzeń z zachowanym zapasem, zwiększ ciężar o najmniejszy możliwy krok. Aplikacja będzie Ci to podpowiadać.`);
    L.push(`<b>Odciążenie.</b> Co ok. ${KB.deloadEvery[e]} tygodni (lub gdy czujesz przewlekłe zmęczenie i brak postępów) zrób lżejszy tydzień: mniej serii i ciężar o ok. 10–20% niższy.`);
    if ((w.inj || []).length) L.push(`<b>Ograniczenia.</b> Pominąłem ćwiczenia, które zwykle obciążają: ${w.inj.map(k => INJ[k].toLowerCase()).join(', ')}. To nie jest porada medyczna — przy bólu skonsultuj się z lekarzem lub fizjoterapeutą.`);
    return L;
  };

  /* ---------- stan i widoki ---------- */
  const defaults = () => { const s = F.S.settings, z = s.wiz || {}; return { days: z.days || 3, time: z.time == null ? 60 : z.time, goal: z.goal || 'hyp', exp: s.exp || z.exp || 'beg', equip: z.equip || 'gym', bar: z.bar !== false, inj: z.inj || [], split: 'auto' }; };
  F.wz = null; const W = () => F.wz || (F.wz = { w: defaults(), res: null, variant: 0 });
  const chips = (obj, cur, act, multi) => `<div class="chips wz">${Object.entries(obj).map(([k, v]) => `<button class="chip ${multi ? ((cur || []).includes(k) ? 'on' : '') : (String(cur) === k ? 'on' : '')}" data-a="${act}" data-v="${k}">${E(Array.isArray(v) ? v[0] : v)}</button>`).join('')}</div>`;
  const cardList = (obj, cur, act) => `<div class="wz-opts">${Object.entries(obj).map(([k, v]) => `<button class="wz-o ${cur === k ? 'on' : ''}" data-a="${act}" data-v="${k}"><b>${E(v[0])}</b><small>${E(v[1])}</small></button>`).join('')}</div>`;

  V.wizard = () => {
    const z = W(); if (z.res) return preview();
    const w = z.w, p = F.profile(); const rec = recommend(w), opts = SPLIT_OPTS[w.days];
    const prof = [p.sexKnown ? (p.sex === 'f' ? 'kobieta' : 'mężczyzna') : null, p.ageKnown ? p.age + ' lat' : null, p.heightKnown ? p.height + ' cm' : null, p.bwKnown ? F.fmtNum(p.bw, 1) + ' kg' : null].filter(Boolean);
    return {
      html: `${F.head('Kreator planu', { back: 1, sub: 'Plan dopasowany do Ciebie' })}
      <section class="card cut"><p class="small">Odpowiedz na kilka pytań, a ułożę plan: podział, serie, powtórzenia, przerwy i ćwiczenia. Potem możesz go dowolnie edytować.</p>
        <p class="dim small">Twoje dane: ${prof.length ? E(prof.join(' · ')) : 'brak'} — <a href="#/settings"><u>uzupełnij w ustawieniach</u></a>, aby plan i kalorie były dokładniejsze.</p></section>
      <h3 class="sec">Cel</h3><section class="card cut">${cardList(GOALS, w.goal, 'wzGoal')}</section>
      <h3 class="sec">Dni treningowe w tygodniu</h3><section class="card cut">${chips({ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' }, w.days, 'wzDays')}<p class="dim small">Rekomendowany podział: <b>${E(SPLITS[rec].n)}</b></p></section>
      <h3 class="sec">Podział</h3><section class="card cut"><div class="wz-opts"><button class="wz-o ${w.split === 'auto' ? 'on' : ''}" data-a="wzSplit" data-v="auto"><b>Wybierz za mnie</b><small>${E(SPLITS[rec].n)}</small></button>${opts.map(k => `<button class="wz-o ${w.split === k ? 'on' : ''}" data-a="wzSplit" data-v="${k}"><b>${E(SPLITS[k].n)}</b><small>${E(SPLITS[k].d)}</small></button>`).join('')}</div></section>
      <h3 class="sec">Czas jednego treningu</h3><section class="card cut">${chips({ 30: '30 min', 45: '45 min', 60: '60 min', 75: '75 min', 90: '90 min', 0: 'bez limitu' }, w.time, 'wzTime')}</section>
      <h3 class="sec">Doświadczenie</h3><section class="card cut">${cardList(EXPS, w.exp, 'wzExp')}</section>
      <h3 class="sec">Sprzęt</h3><section class="card cut">${cardList(EQUIPS, w.equip, 'wzEquip')}${w.equip !== 'gym' ? `<label class="sw"><span><b>Mam drążek do podciągania</b></span><input type="checkbox" data-b="wzBar" ${w.bar ? 'checked' : ''}><i></i></label>` : ''}</section>
      <h3 class="sec">Urazy i ograniczenia</h3><section class="card cut"><p class="dim small">Zaznacz partie, które bolą lub są po kontuzji — pominę ćwiczenia, które je zwykle obciążają.</p>${chips(INJ, w.inj, 'wzInj', true)}<p class="dim small">To nie jest porada medyczna. Przy bólu, chorobie serca, ciąży lub po urazie najpierw skonsultuj się z lekarzem.</p></section>
      <div class="sticky-act"><button class="btn primary grow" data-a="wzGo">${ic('sparkles', 18)} Zaproponuj plan</button></div>`
    };
  };
  const upd = () => { const z = W(); z.res = null; F.render(true); };
  const store = () => { const z = W(), s = F.S.settings; s.exp = z.w.exp; s.wiz = { days: z.w.days, time: z.w.time, goal: z.w.goal, equip: z.w.equip, bar: z.w.bar, inj: z.w.inj }; F.saveSettings(); };
  F.act.wzGoal = b => { W().w.goal = b.dataset.v; F.render(true); };
  F.act.wzDays = b => { const w = W().w; w.days = +b.dataset.v; w.split = 'auto'; F.render(true); };
  F.act.wzSplit = b => { W().w.split = b.dataset.v; F.render(true); };
  F.act.wzTime = b => { W().w.time = +b.dataset.v; F.render(true); };
  F.act.wzExp = b => { W().w.exp = b.dataset.v; F.render(true); };
  F.act.wzEquip = b => { W().w.equip = b.dataset.v; F.render(true); };
  F.act.wzInj = b => { const w = W().w, k = b.dataset.v; w.inj = w.inj.includes(k) ? w.inj.filter(x => x !== k) : [...w.inj, k]; F.render(true); };
  F.bind.wzBar = el => { W().w.bar = el.checked; };
  F.act.wzGo = () => { const z = W(); store(); z.variant = 0; z.res = F.planGen(z.w, 0); window.scrollTo(0, 0); F.render(true); };
  F.act.wzBack = () => { W().res = null; F.render(true); };
  F.act.wzAgain = () => { const z = W(); z.variant++; z.res = F.planGen(z.w, z.variant); window.scrollTo(0, 0); F.render(true); };
  F.act.wzSave = async () => { const z = W(); if (!z.res) return; const plan = z.res.plan; await F.savePlan(plan); F.wz = null; F.toast('Zapisano plan: ' + E(plan.name), 'hot'); F.go('#/plan/' + plan.id); };
  F.act.wzSwap = b => {
    const z = W(); const di = +b.dataset.di, ii = +b.dataset.ii; const d = z.res.days[di], i = d.items[ii]; const used = new Set(d.items.map(x => x.exId));
    const alts = poolOf(i.slot, z.res.work).filter(id => !used.has(id) || id === i.exId);
    F.sheet(`<div class="stack">${alts.map(id => `<button class="exrow ${id === i.exId ? 'sel' : ''}" data-a="wzPick" data-di="${di}" data-ii="${ii}" data-id="${id}"><span><b>${E(exName(id))}</b><small>${E((F.S.ex.get(id) || {}).equip || '')}</small></span><i>${ic('check', 16)}</i></button>`).join('') || '<p class="dim pad center">Brak alternatyw przy Twoim sprzęcie i ograniczeniach.</p>'}</div>`, { title: 'Zamień ćwiczenie' });
  };
  F.act.wzPick = b => { const z = W(); const di = +b.dataset.di, ii = +b.dataset.ii; z.res.days[di].items[ii].exId = b.dataset.id; z.res.plan.days[di].items[ii].exId = b.dataset.id; F.closeSheet(true); F.render(true); };
  const fmtRest = s => s >= 60 ? (Math.floor(s / 60) + (s % 60 ? ':' + String(s % 60).padStart(2, '0') : '') + ' min') : s + ' s';

  function preview() {
    const z = W(), r = z.res, w = r.work;
    const dayHtml = r.days.map((d, di) => { const pd = r.plan.days[di]; const inf = F.ssInfo(pd.items); return `<section class="card cut"><div class="wz-dh"><h3>${E(d.name)}</h3><small class="dim">ok. ${d.min} min</small></div>${d.items.map((i, ii) => { const it = pd.items[ii]; const g = inf[ii]; return `<div class="wz-ex ${g ? 'ss' : ''}"><div><b>${g ? `<em class="sslab">${g.tag}</em> ` : ''}${E(exName(i.exId))}</b><small>${it.sets} × ${E(it.reps)} · przerwa ${fmtRest(it.rest)} · ${E(it.note)}</small></div><button class="iconbtn" data-a="wzSwap" data-di="${di}" data-ii="${ii}" aria-label="Zamień ćwiczenie">${ic('repeat', 18)}</button></div>`; }).join('')}</section>`; }).join('');
    const vol = Object.entries(r.volume).map(([m, v]) => { const pct = clamp(v.sets / (v.range[1] * 1.3) * 100, 4, 100); const ok = v.sets >= v.range[0] - 0.5 && v.sets <= v.range[1] + 0.5; return `<div class="wz-v"><span>${MLABEL[m]}</span><div class="bar"><i style="width:${pct}%"></i></div><b class="${ok ? '' : 'warn'}">${Math.round(v.sets)}</b><small class="dim">${v.range[0]}–${v.range[1]}</small></div>`; }).join('');
    return {
      html: `${F.head('Twój plan', { sub: E(r.plan.name) })}
      <section class="card cut"><h3>${ic('sparkles', 18)} Dlaczego ten plan</h3><div class="wz-why">${r.why.map(t => `<p>${t}</p>`).join('')}</div></section>
      ${dayHtml}
      <section class="card cut"><h3>${ic('chart-column', 18)} Serie tygodniowo na grupę</h3>${vol}<p class="dim small">Pod pozycją: wynik i zalecany zakres. Serie ćwiczeń wielostawowych liczą się częściowo także dla ramion i barków.</p></section>
      ${r.notes.length ? `<section class="card cut"><h3>${ic('info', 18)} Uwagi</h3><ul class="tips">${r.notes.map(n => `<li>${E(n)}</li>`).join('')}</ul></section>` : ''}
      <p class="dim small pad">Plan jest wskazówką opartą na ogólnych zasadach treningu, nie zastępuje porady lekarza ani trenera. Przy bólu przerwij ćwiczenie. Ciężary dobierz sam — pierwszą serię zrób lekko, aby poznać swoje możliwości.</p>
      <div class="sticky-act"><button class="btn ghost" data-a="wzBack">Zmień odpowiedzi</button><button class="btn ghost" data-a="wzAgain">${ic('repeat', 16)} Inna wersja</button><button class="btn primary grow" data-a="wzSave">Zapisz plan</button></div>`
    };
  }
  F.act.newWizard = () => { F.wz = null; F.go('#/wizard'); };
})();
