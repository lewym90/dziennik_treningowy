/* FORGE — szacowanie spalonych kalorii (netto) z wykonanej pracy, masy ciała, płci, wieku i wzrostu */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = v => parseFloat(String(v).replace(',', '.'));
  const YEAR = 365.25 * 864e5;

  /* ---------- profil ---------- */
  F.profile = ts => {
    const s = F.S.settings; const sex = s.sex === 'f' ? 'f' : 'm';
    const bwKnown = F.latestBW(ts) || F.latestBW(); const bw = bwKnown || (sex === 'f' ? 65 : 80);
    const age = F.ageNow(ts);
    const h = s.height || 0; const bf = s.bf >= 4 && s.bf <= 60 ? s.bf : 0;
    const hrRest = s.hrRest >= 30 && s.hrRest <= 120 ? s.hrRest : 0;
    const a = age || 30; const hrMax = s.hrMax >= 120 && s.hrMax <= 230 ? s.hrMax : Math.round(208 - 0.7 * a); // Tanaka 2001
    return { sex, sexKnown: !!s.sex, bw, bwKnown: !!bwKnown, age: a, ageKnown: !!age, height: h || (sex === 'f' ? 165 : 178), heightKnown: !!h, bf, hrRest, hrMax, hrMaxKnown: s.hrMax >= 120 && s.hrMax <= 230, activity: s.activity || 0, exp: s.exp || '' };
  };
  // wiek: z daty urodzenia (dokładnie), a gdy jej brak — ze starego pola „wiek”
  F.ageNow = ts => {
    const s = F.S.settings; const t = ts ? new Date(ts) : new Date();
    if (s.dob && /^\d{4}-\d{2}-\d{2}$/.test(s.dob)) { const [y, m, d] = s.dob.split('-').map(Number); let a = t.getFullYear() - y; if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--; return a >= 10 && a <= 100 ? a : 0; }
    return s.age ? Math.round(s.age + (Date.now() - (s.ageAt || Date.now())) / YEAR) : 0;
  };
  // podstawowa przemiana materii, Mifflin–St Jeor (kcal/dobę)
  F.bmr = p => p.bf ? 370 + 21.6 * p.bw * (1 - p.bf / 100) /* Katch–McArdle: dokładniejszy, gdy znasz % tkanki tłuszczowej */ : 10 * p.bw + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  const PAL = { 1: ['Siedzący tryb życia', 1.2], 2: ['Lekko aktywny', 1.375], 3: ['Umiarkowanie aktywny', 1.55], 4: ['Bardzo aktywny', 1.725] };
  // dzienne zapotrzebowanie BEZ treningów (PAL dotyczy codziennych zajęć); treningi dolicza się osobno
  F.tdee = p => p.activity && PAL[p.activity] ? F.bmr(p) * PAL[p.activity][1] : 0;

  /* ---------- praca mechaniczna serii ---------- */
  const ROM = { chest: .42, back: .5, shoulders: .5, biceps: .42, triceps: .38, forearms: .25, abs: .3, quads: .6, hams: .5, glutes: .4, calves: .22, full: .5, cardio: .5 };
  const ROM_ID = { deadlift: .62, sumo: .6, rdl: .55, squat: .62, front_sq: .6, hip_thrust: .3, good_m: .45, pushup: .35, dips: .45, pullup: .55, chinup: .55, shrug: .1, lateral: .45, leg_ext: .45, leg_curl: .4, leg_press: .55, hack: .55, ohp: .5, bench: .4, facepull: .4 };
  const SEG = { squat: .55, front_sq: .55, goblet: .55, lunge: .5, bulgar: .5, deadlift: .4, sumo: .35, calf_st: .9, good_m: .4, hyper: .35 };
  const BWF = { pullup: 1, chinup: 1, dips: .85, pushup: .64, crunch: .3, leg_raise: .35 };
  // ile pracy (J) wykonuje seria i ile kosztuje
  function setWork(ex, s, bw) {
    if (ex.type === 'time') return (ex.muscle === 'cardio' ? 80 : 25) * (s.r || 0);
    const reps = s.r || 0; if (!reps) return 0;
    let m = s.w || 0;
    if (ex.type === 'bwr') m += bw * (BWF[ex.id] || .9);
    else if (ex.type === 'br') m = bw * (BWF[ex.id] || .5);
    m += bw * (SEG[ex.id] || 0);
    if (m <= 0) return 0;
    const rom = ROM_ID[ex.id] || ROM[ex.muscle] || .45;
    return m * 9.81 * rom * reps;
  }
  const calFactor = () => { const a = F.S.settings.kcalCal; return a && a.length ? clamp(a.reduce((x, y) => x + y, 0) / a.length, .5, 2) : 1; };

  /* ---------- główny model ---------- */
  // sess: { start, dur (s), exercises:[{exId, rest, sets:[{w,r,t,done}]}] }
  F.kcal = sess => {
    const p = F.profile(sess.start); const exs = (sess.exercises || []).map(e => ({ e, ex: F.S.ex.get(e.exId), sets: (e.sets || []).filter(s => s.done) })).filter(x => x.ex && x.sets.length);
    if (!exs.length) return { net: 0, lo: 0, hi: 0, gross: 0, met: 0, perEx: [], approx: true, raw: 0 };
    let W = 0, est = 0; const parts = exs.map(x => {
      let w = 0; x.sets.forEach(s => { w += setWork(x.ex, s, p.bw); est += (x.ex.type === 'time' ? (s.r || 30) : 40) + (x.e.rest || (x.ex.compound ? F.S.settings.defaultRest : 75)); });
      W += w; return { exId: x.e.exId, w, n: x.sets.length };
    });
    const dur = sess.dur > 0 ? sess.dur : est;
    const dEff = Math.min(dur, Math.max(est * 1.6, 1200)); const h = dEff / 3600;
    const P = W / dEff; // moc średnia (W)
    const met = clamp(3 + 8 * P / p.bw, 3, 8.5);
    const rmr = F.bmr(p) / 24 / p.bw; // kcal na kg na godzinę
    const rf = clamp(rmr, .75, 1.1);
    let net = (met - 1) * p.bw * h * rf * 1.05; const gross = net + rmr * p.bw * h;
    // tętno średnie z treningu (opcjonalne): wzór Keytel 2005 powstał dla wysiłku tlenowego, a w treningu siłowym tętno
    // bywa zawyżone (ciśnienie, stres) — dlatego to tylko 30% wyniku, reszta to model z pracy mechanicznej
    let hrUsed = false;
    if (sess.hrAvg >= 80 && sess.hrAvg <= 200 && p.ageKnown) {
      const kpm = (p.sex === 'f' ? (-20.4022 + 0.4472 * sess.hrAvg - 0.1263 * p.bw + 0.074 * p.age) : (-55.0969 + 0.6309 * sess.hrAvg + 0.1988 * p.bw + 0.2017 * p.age)) / 4.184;
      const netHR = kpm * (dEff / 60) - rmr * p.bw * h;
      if (netHR > 0) { net = 0.7 * net + 0.3 * clamp(netHR, net * .6, net * 1.6); hrUsed = true; }
    }
    const raw = net; const cal = calFactor(); net *= cal;
    const unc = (p.ageKnown && p.heightKnown && p.bwKnown && p.sexKnown ? .17 : .27) + (sess.dur > 0 ? 0 : .05) - (hrUsed ? .02 : 0);
    const base = parts.reduce((a, x) => a + x.w + 1500 * x.n, 0) || 1;
    const perEx = parts.map(x => ({ exId: x.exId, kcal: net * (x.w + 1500 * x.n) / base }));
    return { net, lo: net * (1 - unc), hi: net * (1 + unc), gross: gross * cal, met, perEx, approx: !(p.ageKnown && p.heightKnown && p.bwKnown && p.sexKnown), raw, p, hrUsed };
  };
  F.kcalDraft = d => F.kcal({ start: d.start, dur: d.backdate ? 0 : (Date.now() - d.start) / 1000, exercises: d.exercises });
  const sessKcalCache = new Map();
  F.sessKcal = s => { const k = s.id + '|' + (s.dur || 0) + '|' + s.exercises.length + '|' + F.S.settings.sex + F.S.settings.age + F.S.settings.dob + F.S.settings.height + F.S.settings.bf + F.S.settings.hrMax + '|' + (s.hrAvg || 0) + (F.S.settings.kcalCal || []).join(',') + '|' + F.latestBW(s.start) + '|' + s.exercises.reduce((a, e) => a + e.sets.length, 0); let r = sessKcalCache.get(k); if (!r) { r = F.kcal(s); sessKcalCache.set(k, r); if (sessKcalCache.size > 3000) sessKcalCache.clear(); } return r; };
  F.kcalRange = r => `${F.fmtNum(Math.round(r.lo / 5) * 5, 0)}–${F.fmtNum(Math.round(r.hi / 5) * 5, 0)}`;
  F.kcalTotals = (days) => { const since = days ? Date.now() - days * 864e5 : 0; let k = 0; F.S.sessions.forEach(s => { if (s.start >= since) k += F.sessKcal(s).net; }); return k; };
  F.kcalWeeks = (weeks = 12) => { const now = F.startOfWeek(Date.now()); const out = []; for (let i = weeks - 1; i >= 0; i--) { const a = now - i * 7 * 864e5, b = a + 7 * 864e5; let k = 0; F.S.sessions.forEach(s => { if (s.start >= a && s.start < b) k += F.sessKcal(s).net; }); out.push({ start: a, kcal: k }); } return out; };

  /* ---------- kalibracja z zegarkiem ---------- */
  F.act.kcalCal = async b => {
    const s = F.S.sessions.find(x => x.id === b.dataset.id); if (!s) return; const r = F.kcal(s);
    const v = await F.prompt({ title: 'Kalibracja kalorii', label: 'Ile kcal aktywnych pokazał Twój zegarek/pulsometr dla tego treningu?', type: 'number', value: '' });
    if (v == null || !(+v > 20)) return; const ratio = clamp(+v / (r.raw || 1), .4, 2.5);
    const a = [...(F.S.settings.kcalCal || []), ratio].slice(-5); F.S.settings.kcalCal = a; await F.saveSettings(); sessKcalCache.clear(); F.toast(`Zapisano. Współczynnik osobisty: ×${F.fmtNum(calFactor(), 2)}`, 'hot'); F.render(true);
  };
  F.act.kcalCalReset = async () => { F.S.settings.kcalCal = []; await F.saveSettings(); sessKcalCache.clear(); F.toast('Kalibracja wyzerowana'); F.render(true); };

  /* ---------- pola profilu (wzrost, wiek, płeć) ---------- */
  F.profileHtml = () => {
    const s = F.S.settings; const p = F.profile(); const td = F.tdee(p);
    const opt = (o, v) => Object.entries(o).map(([k, x]) => `<option value="${k}" ${String(v) === k ? 'selected' : ''}>${x}</option>`).join('');
    const hasAdv = s.bf || s.hrRest || s.hrMax;
    return `<div class="prof"><div class="seg tiny sx"><button class="${s.sex === 'm' ? 'on' : ''}" data-a="setSex" data-v="m">Mężczyzna</button><button class="${s.sex === 'f' ? 'on' : ''}" data-a="setSex" data-v="f">Kobieta</button></div>
      <div class="two"><label class="fld"><span>Wzrost (cm)</span><input data-b="prof" data-k="height" inputmode="numeric" value="${s.height || ''}" placeholder="178"></label><label class="fld"><span>Data urodzenia</span><input type="date" data-b="prof" data-k="dob" value="${s.dob || ''}" max="${F.dateInput(Date.now())}">${!s.dob && s.age ? `<small class="dim">Teraz: ${F.ageNow()} lat — wpisz datę, a wiek będzie liczył się sam.</small>` : ''}</label></div>
      <label class="fld"><span>Aktywność w ciągu dnia (poza treningiem)</span><select data-b="prof" data-k="activity"><option value="">— wybierz —</option>${opt({ 1: 'Siedząca praca, mało ruchu', 2: 'Lekka — trochę chodzenia', 3: 'Umiarkowana — dużo na nogach', 4: 'Wysoka — praca fizyczna' }, s.activity)}</select></label>
      <label class="fld"><span>Doświadczenie w treningu siłowym</span><select data-b="prof" data-k="exp"><option value="">— wybierz —</option>${opt({ beg: 'Początkujący (do ok. 1 roku)', mid: 'Średniozaawansowany (1–3 lata)', adv: 'Zaawansowany (3+ lata regularnie)' }, s.exp)}</select></label>
      <details class="adv" ${hasAdv ? 'open' : ''}><summary class="dim small">Dodatkowe dane (opcjonalne, zwiększają dokładność)</summary>
        <div class="two"><label class="fld"><span>Tkanka tłuszczowa (%)</span><input data-b="prof" data-k="bf" inputmode="decimal" value="${s.bf || ''}" placeholder="np. 18"></label><label class="fld"><span>Tętno spoczynkowe</span><input data-b="prof" data-k="hrRest" inputmode="numeric" value="${s.hrRest || ''}" placeholder="np. 60"></label></div>
        <label class="fld"><span>Tętno maksymalne</span><input data-b="prof" data-k="hrMax" inputmode="numeric" value="${s.hrMax || ''}" placeholder="${p.hrMaxKnown ? '' : 'zostaw puste — wyliczę: ' + p.hrMax}"></label>
        <p class="dim small">Znasz % tłuszczu? Użyję dokładniejszego wzoru na przemianę materii. Po treningu możesz wpisać średnie tętno z zegarka — kalorie będą trochę trafniejsze.</p></details>
      ${td ? `<p class="small">Szacunkowe zapotrzebowanie dobowe <b>bez treningu: ≈ ${F.fmtNum(Math.round(td / 10) * 10, 0)} kcal</b>${p.ageKnown && p.heightKnown && p.bwKnown && p.sexKnown ? '' : ' <span class="dim">(uzupełnij dane, aby zawęzić)</span>'}. To orientacyjna wartość ±10%, nie zalecenie dietetyczne.</p>` : ''}
      <p class="dim small">Dane zostają tylko na tym urządzeniu.</p></div>`;
  };
  F.bind.prof = el => {
    const s = F.S.settings, k = el.dataset.k, v = num(el.value);
    if (k === 'height') s.height = v >= 100 && v <= 250 ? Math.round(v) : 0;
    else if (k === 'dob') { s.dob = /^\d{4}-\d{2}-\d{2}$/.test(el.value) && new Date(el.value) < new Date() ? el.value : ''; }
    else if (k === 'age') { s.age = v >= 10 && v <= 100 ? Math.round(v) : 0; s.ageAt = Date.now(); }
    else if (k === 'bf') s.bf = v >= 4 && v <= 60 ? Math.round(v * 10) / 10 : 0;
    else if (k === 'hrRest') s.hrRest = v >= 30 && v <= 120 ? Math.round(v) : 0;
    else if (k === 'hrMax') s.hrMax = v >= 120 && v <= 230 ? Math.round(v) : 0;
    else if (k === 'activity') s.activity = +el.value || 0;
    else if (k === 'exp') s.exp = el.value || '';
    F.saveSettings(); sessKcalCache.clear();
  };

  /* ---------- kafelek kalorii (reużywalny) ---------- */
  F.kcalCard = (r, sessId) => `<section class="card cut kcal"><div class="kc-h"><span class="kc-i">${ic('flame', 22)}</span><div><small>Spalone kalorie (netto)</small><b>≈ ${F.fmtNum(Math.round(r.net / 5) * 5, 0)} <em>kcal</em></b></div></div>
    <p class="dim small">Zakres ${F.kcalRange(r)} kcal · ponad spoczynek, na podstawie ciężarów, powtórzeń, czasu i Twoich danych.${r.approx ? ' <a href="#/stats" data-a="goProfile"><u>Uzupełnij wiek, wzrost i wagę</u></a>, aby zawęzić.' : ''}</p>
    ${sessId ? `<button class="linkbtn" data-a="sessHr" data-id="${sessId}">${r.hrUsed ? 'Zmień średnie tętno' : 'Dodaj średnie tętno z treningu'}</button> <button class="linkbtn" data-a="kcalCal" data-id="${sessId}">Mam kalorie z zegarka — skalibruj</button>${(F.S.settings.kcalCal || []).length ? ` <button class="linkbtn dim" data-a="kcalCalReset">Wyzeruj kalibrację</button>` : ''}` : ''}</section>`;
  F.act.sessHr = async b => {
    const s = F.S.sessions.find(x => x.id === b.dataset.id); if (!s) return;
    const v = await F.prompt({ title: 'Średnie tętno', label: 'Średnie tętno z treningu (uderzenia/min), z zegarka lub opaski. Zostaw puste, aby usunąć.', type: 'number', value: s.hrAvg || '' });
    if (v == null) return; const n = Math.round(+v);
    if (v === '' || !n) delete s.hrAvg; else if (n < 80 || n > 200) { F.toast('Podaj wartość od 80 do 200', 'err'); return; } else s.hrAvg = n;
    await F.dbPut('sessions', s); sessKcalCache.clear(); F.toast(s.hrAvg ? 'Zapisano. Kalorie przeliczone.' : 'Usunięto tętno', 'hot'); F.render(true);
  };
  F.act.goProfile = () => { F.ui.statTab = 'body'; F.ui.bodyTab = 'w'; };
})();
