/* FORGE — cardio: ocena względem zaleceń WHO i celu, rozmieszczenie w planie, cardio „zrobię później”, minuty w tygodniu. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc;
  const DAY = 864e5;
  // typ: [nazwa, id ćwiczenia, czy da się zrobić na siłowni/w domu na sprzęcie (czyli można wstawić do planu)]
  const T = {
    bike: ['Rower (stacjonarny)', 'bike', 1], tread: ['Bieżnia / marsz', 'incline_walk', 1], run: ['Bieganie na bieżni', 'run', 1], row: ['Wioślarz', 'rower', 1], ellip: ['Orbitrek', 'elliptical', 1], stairs: ['Schody / steper', 'stairs', 1],
    bikeout: ['Rower na zewnątrz', 'bike_out', 0], walkout: ['Spacer / marsz na zewnątrz', 'walk', 0], swim: ['Pływanie', 'swim', 0], skate: ['Rolki', 'skate', 0], other: ['Inne', 'cardio_other', 0]
  };
  const INT = { 1: 'lekko', 2: 'umiarkowanie', 3: 'intensywnie' };
  const INT_D = { 1: 'bez zadyszki, swobodnie rozmawiasz i śpiewasz', 2: 'da się rozmawiać, ale nie śpiewać', 3: 'mówisz tylko pojedyncze słowa' };
  const BANDS = { hyp: [150, 225], str: [150, 225], sculpt: [150, 300], health: [150, 300], endur: [200, 300] };
  const r5 = (v, up) => (up ? Math.ceil(v / 5) : Math.round(v / 5)) * 5;
  const wgt = i => i === 3 ? 2 : i === 2 ? 1 : 0; // WHO: minuta intensywna = 2 umiarkowane; wysiłek lekki nie liczy się do zaleceń
  const valid = a => a && T[a.t] && a.n >= 1 && a.n <= 7 && a.m >= 5 && a.m <= 240 && [1, 2, 3].includes(a.i);
  const eq = acts => Math.round(acts.filter(valid).reduce((s, a) => s + a.n * a.m * wgt(a.i), 0));
  const label = a => `${T[a.t][0].toLowerCase()} ${a.n} × ${a.m} min (${INT[a.i]})`;
  const nTxt = n => n + ' ' + F.plur(n, 'raz', 'razy', 'razy');
  F.CARDIO = { T, INT, INT_D, eq, valid, label };

  const bandOf = w => { const b = (BANDS[w.goal] || BANDS.health).slice(); if (w.cautious || w.special) b[1] = Math.min(b[1], 225); return b; };
  const REASON = {
    hyp: 'Dla przyrostu masy wystarcza minimum WHO; więcej cardio nie jest potrzebne, a przy bieganiu może minimalnie osłabiać przyrost mięśni (dowody są ograniczone) — dlatego proponuję rower lub marsz.',
    str: 'Dla siły wystarcza minimum WHO; więcej cardio nie jest potrzebne, a przy bieganiu może minimalnie osłabiać przyrost mięśni (dowody są ograniczone) — dlatego proponuję rower lub marsz.',
    sculpt: 'Cardio nie jest konieczne do redukcji (decyduje bilans kalorii), ale zwiększa wydatek energetyczny i pomaga utrzymać deficyt, więc celuję w wyższą część zakresu WHO.',
    health: 'Dla zdrowia i sprawności cardio jest ważną częścią tygodnia, więc celuję w pełny zakres zaleceń WHO.',
    endur: 'Przy celu wytrzymałościowym cardio to ważna część planu, więc celuję w wyższą część zakresu WHO.'
  };

  // ocena + propozycje zmian
  F.cardioAdvice = w => {
    const acts = (w.cAct || []).filter(valid); const band = bandOf(w); const cur = eq(acts);
    const status = cur < band[0] ? 'low' : cur > band[1] ? 'high' : 'ok'; const list = acts.map(label).join(', ');
    const lightMin = acts.filter(a => a.i === 1).reduce((s, a) => s + a.n * a.m, 0);
    let text = ''; const opts = []; const need = Math.max(0, band[0] - cur);
    const safe = w.cautious || w.special || w.bmi >= 30;
    const gymActs = acts.filter(a => T[a.t][2]);
    let addT = T[w.cAddType] && T[w.cAddType][2] ? w.cAddType : (gymActs.sort((a, b) => b.n * b.m - a.n * a.m)[0] || {}).t || (w.goal === 'hyp' || w.goal === 'str' ? 'bike' : 'tread');
    if (safe && (addT === 'run' || addT === 'stairs')) addT = 'bike';
    if (!acts.length) text = `Teraz nie robisz cardio. WHO zaleca dorosłym 150–300 min umiarkowanej aktywności tlenowej tygodniowo; przy Twoim celu celuję w ${band[0]}–${band[1]} min. ${REASON[w.goal] || ''}`;
    else if (status === 'ok') text = `Robisz ok. ${cur} min umiarkowanego cardio tygodniowo (${list}). To mieści się w zakresie ${band[0]}–${band[1]} min, który przyjmuję przy Twoim celu — nie musisz nic dokładać.`;
    else if (status === 'high') text = `Robisz ok. ${cur} min umiarkowanego cardio tygodniowo (${list}) — to więcej niż ${band[1]} min, które wystarczają przy Twoim celu. Nie dokładaj; jeśli czujesz się przemęczony(a) albo siła stoi w miejscu, możesz je skrócić.`;
    else text = `${cur ? `Robisz ok. ${cur} min umiarkowanego cardio tygodniowo (${list}).` : `Twoje cardio (${list}) to wysiłek lekki, a do zaleceń WHO liczy się umiarkowany lub intensywny.`} Do dolnej granicy ${band[0]} min brakuje ok. ${need} min. ${REASON[w.goal] || ''}`;
    if (status === 'low') {
      if (lightMin && cur + lightMin >= band[0]) opts.push({ id: 'raise', label: 'Podnieś intensywność', desc: `Te same sesje, ale tak, by dało się rozmawiać, a nie śpiewać — to daje ok. ${cur + lightMin} min.`, acts: acts.map(a => a.i === 1 ? { ...a, i: 2 } : a) });
      const cnt = acts.filter(a => a.i >= 2); const wsum = cnt.reduce((s, a) => s + a.n * wgt(a.i), 0);
      if (wsum) { const x = r5(need / wsum, true); if (x <= 30) opts.push({ id: 'extend', label: `Wydłuż sesje o ${x} min`, desc: `Każdą z obecnych sesji o ${x} min — razem ok. ${cur + x * wsum} min tygodniowo.`, acts: acts.map(a => a.i >= 2 ? { ...a, m: a.m + x } : a) }); }
      const nd = (w.days || []).length || 3, sepMax = Math.max(0, 6 - nd); let s, m, place;
      const sA = Math.min(nd, Math.max(1, Math.ceil(need / 30)));
      const pickAfter = () => { s = sA; m = Math.max(15, r5(need / sA, true)); place = 'after'; };
      const pickSep = () => { s = Math.max(1, Math.min(3, sepMax || 1, Math.ceil(need / 60))); m = Math.max(20, r5(need / s, true)); place = 'sep'; };
      if (w.cPlaceNew === 'after') pickAfter();
      else if (w.cPlaceNew === 'sep') pickSep();
      else if (need / sA <= 30) pickAfter();
      else { s = Math.min(3, sepMax, Math.max(1, Math.ceil(need / 60))); if (s >= 1 && need / s <= 90) pickSep(); else pickAfter(); }
      opts.push({ id: 'add', label: `Dodaj ${s} ${F.plur(s, 'sesję', 'sesje', 'sesji')} po ${m} min`, desc: `${T[addT][0]}, umiarkowanie: razem ok. ${cur + s * m} min tygodniowo. ${place === 'after' ? 'Zaraz po treningu siłowym (możesz wtedy kliknąć „zrobię później” i zrobić w domu).' : 'Jako osobna sesja w dzień bez siłowni (np. w domu).'}`, acts: [...acts, { t: addT, n: s, m, i: 2, plan: true, place, added: true }] });
      opts.push({ id: 'keep', label: 'Zostaw jak jest', desc: 'Zostajesz poniżej zalecenia WHO — to Twoja decyzja.', acts });
    } else opts.push({ id: 'keep', label: 'Zostaw jak jest', desc: status === 'ok' ? 'Zalecane.' : 'Zalecane — nic nie dokładam.', acts });
    const chosen = opts.find(o => o.id === w.cChoice) || opts[0];
    return { cur, band, status, text, opts, chosen, acts: chosen.acts, addT, canPickType: opts.some(o => o.id === 'add') };
  };

  // rozmieszczenie: po treningu siłowym (z kontrolą czasu) lub osobne sesje
  F.cardioPrepare = (w, acts) => {
    const nd = w.days.length, total = w.time || 0; const attach = Array.from({ length: nd }, () => []); const sep = []; const notes = [];
    const planned = acts.filter(a => valid(a) && T[a.t][2] && a.plan);
    planned.forEach(a => {
      let after = a.place === 'after' ? a.n : 0; const sepN = a.n - after;
      const k = Math.min(after, nd); let moved = 0;
      for (let s = 0; s < k; s++) {
        const di = Math.min(nd - 1, Math.floor((s + 0.5) * nd / k)); const have = attach[di].reduce((x, y) => x + y.m, 0);
        if (total && total - have - a.m < 40) { moved++; continue; }
        attach[di].push(a);
      }
      const rest = (after - k) + moved + sepN; if (rest > 0) sep.push({ a, n: rest });
      if (moved) notes.push(`${T[a.t][0]} ${a.m} min nie mieści się po treningu w Twoim limicie ${total} min (na siłownię zostałoby mniej niż 40 min), więc ${F.plur(moved, 'wstawiłem tę sesję', 'wstawiłem te sesje', 'wstawiłem te sesje')} jako ${moved > 1 ? 'osobne' : 'osobną'} (np. w domu).`);
    });
    const timeByDay = attach.map(x => total ? Math.max(30, total - x.reduce((s, a) => s + a.m, 0)) : 0);
    return { attach, sep, timeByDay, notes };
  };
  const item = (a, post) => { const id = T[a.t][1]; const ex = F.S.ex.has(id) ? id : 'incline_walk'; return { id: F.uid(), exId: ex, sets: 1, reps: String(a.m * 60), rest: 0, w: 0, note: `${post ? 'Po treningu siłowym' : 'Osobna sesja'} · ${INT[a.i]}: ${INT_D[a.i]}`, cardio: { int: a.i, post: !!post } }; };
  F.cardioApply = (res, prep, acts, adv) => {
    const plan = res.plan; res.cardioDays = [];
    prep.attach.forEach((arr, di) => arr.forEach(a => { plan.days[di].items.push(item(a, true)); }));
    prep.sep.forEach(({ a, n }) => { for (let k = 0; k < n; k++) plan.days.push({ id: F.uid(), name: `Cardio: ${T[a.t][0]}${n > 1 ? ' ' + (k + 1) : ''}`, items: [item(a, false)] }); });
    plan.meta = { ...(plan.meta || {}), cardio: { acts: acts.filter(valid), band: adv.band, cur: eq(acts) } };
    res.cardioPrep = prep; res.notes = [...prep.notes, ...res.notes];
  };
  F.cardioItemIs = it => !!(it && it.cardio);

  /* ---------- minuty cardio w tygodniu (z zapisanych treningów) ---------- */
  F.cardioWeek = (a, b) => { let raw = 0, e = 0; F.S.sessions.forEach(s => { if (s.start < a || s.start >= b) return; s.exercises.forEach(x => { const ex = F.S.ex.get(x.exId); if (!ex || ex.muscle !== 'cardio' || ex.type !== 'time') return; x.sets.forEach(st => { if (!st.done) return; const m = (st.r || 0) / 60; raw += m; e += m * wgt(st.int || 2); }); }); }); return { raw: Math.round(raw), eq: Math.round(e) }; };

  /* ---------- cardio „zrobię później” ---------- */
  F.pendCardio = () => { const now = Date.now(); const out = []; F.S.sessions.forEach(s => (s.pend || []).forEach(p => { if (p.until > now) out.push({ s, p }); })); return out.sort((x, y) => y.s.start - x.s.start); };
  F.pendHtml = () => { const l = F.pendCardio(); if (!l.length) return ''; return `<section class="card cut pend"><h3>${ic('timer', 18)} Cardio do dokończenia</h3>${l.map(({ s, p }) => `<div class="pend-r"><div><b>${E(F.exName(p.exId))} · ${p.mins} min</b><small>po treningu „${E(s.name)}” (${F.fmtDate ? F.fmtDate(s.start) : ''}) — do ${new Date(p.until).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}</small></div><div class="pend-b"><button class="btn primary sm" data-a="cdLog" data-s="${s.id}" data-p="${p.id}">Wpisz</button><button class="btn ghost sm" data-a="cdDrop" data-s="${s.id}" data-p="${p.id}">Pomiń</button></div></div>`).join('')}<p class="dim small">Po wpisaniu cardio dołączy do tego treningu, a kalorie i statystyki zostaną przeliczone.</p></section>`; };
  const find = b => { const s = F.S.sessions.find(x => x.id === b.dataset.s); const p = s && (s.pend || []).find(x => x.id === b.dataset.p); return s && p ? { s, p } : null; };
  F.act.cdLog = b => { const f = find(b); if (!f) return; F.ui.cdl = { sid: f.s.id, pid: f.p.id, mins: f.p.mins, int: f.p.int || 2 }; cdSheet(); };
  const cdSheet = () => { const c = F.ui.cdl; const s = F.S.sessions.find(x => x.id === c.sid); const p = s && (s.pend || []).find(x => x.id === c.pid); if (!p) return; F.sheet(`<p class="small dim">${E(F.exName(p.exId))} — dopisuję do treningu „${E(s.name)}”.</p><label class="fld"><span>Ile minut zrobiłeś(aś)?</span><input inputmode="numeric" data-b="cdm" value="${c.mins}"></label><h4 class="lbl">Jak ciężko?</h4><div class="chips">${[1, 2, 3].map(i => `<button class="chip ${c.int === i ? 'on' : ''}" data-a="cdLInt" data-v="${i}">${INT[i]}</button>`).join('')}</div><p class="dim small">${INT_D[c.int]}</p><div class="btn-row"><button class="btn primary grow" data-a="cdSave">Zapisz w treningu</button></div>`, { title: 'Wpisz cardio', cls: 'compact' }); };
  F.bind.cdm = el => { const v = parseFloat(String(el.value).replace(',', '.')); F.ui.cdl.mins = v > 0 ? Math.min(600, Math.round(v)) : 0; };
  F.act.cdLInt = b => { F.ui.cdl.int = +b.dataset.v; F.closeSheet(true); cdSheet(); };
  F.act.cdSave = async () => {
    const c = F.ui.cdl; const s = F.S.sessions.find(x => x.id === c.sid); const p = s && (s.pend || []).find(x => x.id === c.pid); if (!p) return; if (!(c.mins > 0)) { F.toast('Wpisz liczbę minut', 'err'); return; }
    let before = 0; try { before = F.sessKcal(s).net; } catch (e) { }
    s.exercises.push({ exId: p.exId, note: '', rest: 0, late: true, sets: [{ w: 0, r: c.mins * 60, t: 'n', rpe: null, done: true, int: c.int }] });
    s.pend = s.pend.filter(x => x.id !== p.id); if (!s.pend.length) delete s.pend;
    await F.dbPut('sessions', s); F.rebuild(); F.closeSheet(true);
    let after = 0; try { after = F.sessKcal(s).net; } catch (e) { }
    F.toast(`Dopisano cardio. Trening przeliczony: ok. ${Math.round(after / 5) * 5} kcal (było ${Math.round(before / 5) * 5}).`, 'hot'); F.render(true);
  };
  F.act.cdDrop = async b => { const f = find(b); if (!f) return; if (!(await F.confirm({ title: 'Pominąć cardio?', text: 'Nie będzie liczone w tym treningu.', ok: 'Pomiń', cancel: 'Wróć' }))) return; f.s.pend = f.s.pend.filter(x => x.id !== f.p.id); if (!f.s.pend.length) delete f.s.pend; await F.dbPut('sessions', f.s); F.render(true); };
})();
