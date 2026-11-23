/* FORGE — kalendarz i kolejka treningów (#/calendar). Działa offline; zapis w ustawieniach: dni tygodnia, przeniesienia, przesunięcia, pominięcia. */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const DEF = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
  const WD = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'], WL = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
  const MON = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const cfg = () => { const s = F.S.settings; if (!s.cal) s.cal = {}; const c = s.cal; c.moves = c.moves || {}; c.pauses = c.pauses || []; c.skips = c.skips || []; return c; };
  const add = (ts, n) => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };
  const wdOf = ts => (new Date(ts).getDay() + 6) % 7;
  const fromKey = k => new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100).getTime();
  const cardioOnly = d => /^Cardio/.test(d.name) || (d.items.length > 0 && d.items.every(i => i.cardio));
  const weekdays = plan => { const c = cfg(); if (c.wd && c.wd.length) return c.wd; const m = plan && plan.meta && plan.meta.weekdays; if (m && m.length) return m; return DEF[Math.min(7, Math.max(1, F.S.settings.weeklyGoal || 3))]; };
  F.calWeekdays = weekdays; F.WD_SHORT = WD;
  F.calWhen = ts => { const t = F.startOfDay(Date.now()), k = Math.round((F.startOfDay(ts) - t) / 864e5); return k <= 0 ? 'dziś' : k === 1 ? 'jutro' : k < 7 ? WL[wdOf(ts)] : new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }); };
  const shift = (ts, pauses) => { let n = 0; pauses.forEach(p => { if (F.dayKey(add(ts, n)) >= p) n++; }); return add(ts, n); };

  // kolejka: kolejne dni planu rozłożone na najbliższe dni treningowe
  F.calQueue = (days = 75) => {
    const nx = F.nextWorkout(true); if (!nx) return []; const c = cfg(), now = Date.now(), today = F.startOfDay(now), tk = F.dayKey(now);
    const seq = []; const n = nx.plan.days.length; for (let k = 0; k < n; k++) { const d = nx.plan.days[(nx.di + k) % n]; if (!cardioOnly(d)) seq.push(d); }
    if (!seq.length) seq.push(nx.day);
    const cdIds = new Set(nx.plan.days.filter(cardioOnly).map(d => d.id)); const doneToday = F.S.sessions.some(s => F.dayKey(s.start) === tk && !cdIds.has(s.dayId) && !((s.exercises || []).length && s.exercises.every(e => e.cardio))); const startK = doneToday ? F.dayKey(add(today, 1)) : tk;
    const wd = weekdays(nx.plan), pauses = [...c.pauses].sort((a, b) => a - b), slots = [];
    for (let i = -14; i <= days; i++) {
      const b = add(today, i); if (!wd.includes(wdOf(b))) continue;
      const src = F.dayKey(shift(b, pauses)), dk = c.moves[src] || src; if (dk >= startK) slots.push({ src, key: dk });
    }
    // dzień planu przypisujemy według pierwotnej kolejności (src), więc przeniesiony trening zabiera swój dzień ze sobą
    slots.sort((a, b) => a.src - b.src);
    const out = []; let idx = 0;
    slots.forEach(s => {
      const sk = c.skips.find(x => x.key === s.src);
      if (sk) { if (sk.key > tk) idx++; return; } // pominięty dziś lub wcześniej ominęła już funkcja F.nextWorkout
      out.push({ ...s, ts: fromKey(s.key), day: seq[idx % seq.length], plan: nx.plan }); idx++;
    });
    return out.sort((a, b) => a.key - b.key);
  };

  /* ---------- osobne sesje cardio: własne dni tygodnia, poza kolejką siłową ---------- */
  const cdDays = plan => plan ? plan.days.filter(cardioOnly) : [];
  // dni cardio: zapisane przez użytkownika albo automatycznie — najpierw dni bez treningu siłowego, rozłożone równo w tygodniu
  const cardioWd = plan => { const n = Math.min(7, cdDays(plan).length); if (!n) return []; const c = cfg(); if (c.cwd && c.cwd.length) return c.cwd;
    const sw = weekdays(plan), free = [0, 1, 2, 3, 4, 5, 6].filter(i => !sw.includes(i)); const pick = [];
    if (free.length >= n) { for (let k = 0; k < n; k++) pick.push(free[Math.round(k * free.length / n)]); }
    else { pick.push(...free); const rest = sw.filter(i => !pick.includes(i)), need = n - free.length; for (let k = 0; k < need; k++) pick.push(rest[Math.round(k * rest.length / need)]); }
    return [...new Set(pick)].sort((a, b) => a - b); };
  F.cardioWd = plan => cardioWd(plan || (F.nextWorkout(true) || {}).plan);
  // sesje cardio od dziś na najbliższe dni; k-ta sesja tygodnia = k-ty dzień cardio w planie
  F.cardioQueue = (days = 14, from = Date.now()) => { const nx = F.nextWorkout(true); if (!nx) return []; const plan = nx.plan, cds = cdDays(plan); if (!cds.length) return [];
    const wd = cardioWd(plan), out = [], today = F.startOfDay(from), ids = new Set(cds.map(d => d.id));
    const doneK = new Set(F.S.sessions.filter(x => ids.has(x.dayId)).map(x => F.dayKey(x.start)));
    for (let i = 0; i <= days; i++) { const b = add(today, i), w = wdOf(b); const pos = wd.indexOf(w); if (pos < 0) continue; const k = F.dayKey(b); out.push({ key: k, ts: b, day: cds[pos % cds.length], plan, done: doneK.has(k), cardio: true }); }
    return out; };
  F.cardioToday = () => { const t = F.cardioQueue(0)[0]; return t && !t.done ? t : null; };
  F.cardioOnly = cardioOnly;

  const rel = ts => { const d = Math.round((F.startOfDay(ts) - F.startOfDay(Date.now())) / 864e5); return d === 0 ? 'dziś' : d === 1 ? 'jutro' : WL[wdOf(ts)]; };
  F.calLine = () => { const q = F.calQueue(21).slice(0, 2); if (!q.length) return 'Rozkład treningów na najbliższe tygodnie'; const t = q.map(x => `${rel(x.ts)}: ${x.day.name}`).join(' · '); return t.charAt(0).toUpperCase() + t.slice(1); };
  const est = d => F.PLN && F.PLN.estMin ? F.PLN.estMin(d.items) : 0;
  const cdInfo = d => { const it = d.items[0]; return it ? `${Math.round((+it.reps || 0) / 60)} min${it.note && it.note.split(' · ')[1] ? ' · ' + E(it.note.split(' · ')[1].split(':')[0].toLowerCase()) : ''}` : ''; };
  const info = d => `${d.items.length} ${F.plur(d.items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}${est(d) ? ` · ${est(d)} min` : ''}`;

  // kalendarz jest częścią Historii (przełącznik Lista | Kalendarz); stara trasa #/calendar przekierowuje
  V.calendar = () => { F.ui.histView = 'cal'; return F.views.history(); };
  F.calBody = () => {
    const nx = F.nextWorkout(); const head = '';
    if (!nx) return { html: `${F.empty('calendar', 'Brak planu', 'Dodaj plan, a tutaj zobaczysz rozkład treningów.')}<a class="btn primary wide" href="#/plans">${ic('clipboard-list', 18)} Plany</a>` };
    const off = F.ui.calM || 0, b = new Date(), first = new Date(b.getFullYear(), b.getMonth() + off, 1), y = first.getFullYear(), m = first.getMonth();
    const q = F.calQueue(Math.max(75, (off + 2) * 31)), plan = {}; q.forEach(x => { plan[x.key] = x; });
    const done = new Set(F.S.sessions.map(s => F.dayKey(s.start))), tk = F.dayKey(Date.now()), skip = new Set(cfg().skips.map(x => x.key));
    const cq = {}; F.cardioQueue(Math.max(75, (off + 2) * 31)).forEach(x => { if (!x.done) cq[x.key] = x; });
    let g = WD.map(l => `<div class="cal-l">${l.charAt(0)}</div>`).join('');
    const lead = wdOf(first.getTime()); for (let i = lead; i > 0; i--) g += `<div class="wd off"><i>${new Date(y, m, 1 - i).getDate()}</i></div>`;
    const dim = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const k = y * 10000 + (m + 1) * 100 + d, tr = done.has(k), cl = [tr ? 'tr' : '', k === tk ? 'today' : '', !tr && plan[k] ? 'pl' : '', k > tk && !plan[k] && !cq[k] ? 'fut' : '', skip.has(k) && !tr ? 'sk' : '', !tr && !plan[k] && cq[k] && k >= tk ? 'cdp' : ''].join(' ');
      g += `<button class="wd ${cl}" data-a="calDay" data-k="${k}" aria-label="${d} ${MON[m].toLowerCase()}"><i>${tr ? ic('check', 14) : d}</i>${cq[k] && k >= tk ? `<em class="cd-dot" aria-hidden="true">${ic('heart', 9)}</em>` : ''}</button>`;
    }
    const cl3 = F.cardioQueue(13).filter(x => !x.done).slice(0, 3);
    const list = q.slice(0, 3).map((x, i) => `<div class="q-row"><div class="q-d">${new Date(x.ts).getDate()}<small>${WD[wdOf(x.ts)].toLowerCase()}</small></div><button class="grow q-b" data-a="calDay" data-k="${x.key}"><b>${E(x.day.name)}</b><small>${x.key === tk ? 'dziś · ' : ''}${info(x.day)}</small></button>${i === 0 && x.key === tk ? `<button class="btn sm primary" data-a="startDay" data-p="${x.plan.id}" data-d="${x.day.id}">${ic('play', 16)} Start</button>` : ic('chevron-right', 18)}</div>`).join('');
    return { html: `${head}<section class="card cut"><div class="cal-h"><button class="ibtn" data-a="calNav" data-d="-1" aria-label="Poprzedni miesiąc">${ic('chevron-left', 20)}</button><h3>${MON[m]} ${y}</h3><button class="ibtn" data-a="calNav" data-d="1" aria-label="Następny miesiąc">${ic('chevron-right', 20)}</button></div><div class="cal-g">${g}</div></section>
      <h3 class="sec">Kolejka</h3><section class="card cut">${list || '<p class="dim">Brak zaplanowanych treningów.</p>'}</section>
      ${cl3.length ? `<h3 class="sec">Cardio</h3><section class="card cut">${cl3.map(x => `<div class="q-row"><div class="q-d cd">${new Date(x.ts).getDate()}<small>${WD[wdOf(x.ts)].toLowerCase()}</small></div><button class="grow q-b" data-a="calDay" data-k="${x.key}"><b>${E(x.day.name)}</b><small>${x.key === tk ? 'dziś · ' : ''}${cdInfo(x.day)}</small></button>${x.key === tk ? `<button class="btn sm primary" data-a="startDay" data-p="${x.plan.id}" data-d="${x.day.id}">${ic('play', 16)} Start</button>` : ic('chevron-right', 18)}</div>`).join('')}</section>` : ''}
      <button class="btn ghost wide" data-a="calDays">${ic('calendar', 18)} Dni treningowe</button>` };
  };

  const longDay = ts => { const s = WL[wdOf(ts)], d = new Date(ts); return `${s.charAt(0).toUpperCase() + s.slice(1)}, ${d.getDate()} ${['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'][d.getMonth()]}`; };
  const refresh = () => { F.saveSettings(); F.closeSheet(true); F.render(true); };
  const title = (t, s) => `<h3 class="cal-st">${E(t)}</h3><p class="dim cal-ss">${E(s)}</p>`;
  F.act.calNav = b => { F.ui.calM = (F.ui.calM || 0) + +b.dataset.d; F.render(true); };
  F.act.goCal = () => { F.ui.calM = 0; F.ui.histView = 'cal'; if (location.hash === '#/history') F.render(true); else F.go('#/history'); };
  F.act.calDay = b => {
    const k = +b.dataset.k, ts = fromKey(k), sess = F.S.sessions.find(s => F.dayKey(s.start) === k); if (sess) { F.go('#/session/' + sess.id); return; }
    const sk = cfg().skips.find(x => x.key === k);
    if (sk) { F.sheet(`${title(longDay(ts), 'Pominięty trening')}<div class="menu"><button data-a="calRestore" data-k="${k}">${ic('rotate-ccw', 20)}<span>Przywróć ten trening</span></button></div>`); return; }
    const Q = F.calQueue(Math.max(75, (F.ui.calM || 0) * 31 + 62)), x = Q.find(q => q.key === k);
    const cx = k >= F.dayKey(Date.now()) ? F.cardioQueue(Math.max(75, (F.ui.calM || 0) * 31 + 62)).find(q => q.key === k && !q.done) : null;
    const cdBtn = cx ? `<button data-a="startDay" data-p="${cx.plan.id}" data-d="${cx.day.id}">${ic('heart', 20)}<span>${k === F.dayKey(Date.now()) ? 'Zacznij teraz' : 'Zacznij'}: ${E(cx.day.name)}<small>${cdInfo(cx.day)} · osobna sesja cardio</small></span></button>` : '';
    if (!x && cx) { F.sheet(`${title(longDay(ts), `${cx.day.name} · ${cdInfo(cx.day)}`)}<div class="menu">${cdBtn}<button data-a="calDays">${ic('calendar', 20)}<span>Zmień dni cardio</span></button></div>`); return; }
    if (!x) { // dzień wolny
      const tk = F.dayKey(Date.now()), nx = Q[0], past = k < tk;
      F.sheet(`${title(longDay(ts), past ? 'W tym dniu nie było treningu.' : 'Dzień wolny od treningu.')}${!past && nx ? `<div class="menu"><button data-a="calHere" data-k="${k}" data-s="${nx.src}">${ic('calendar', 20)}<span>Przenieś tu najbliższy trening<small>${E(nx.day.name)}, zaplanowany na ${longDay(nx.ts).toLowerCase()}</small></span></button>${k === tk ? `<button data-a="startDay" data-p="${nx.plan.id}" data-d="${nx.day.id}">${ic('play', 20)}<span>Zacznij teraz: ${E(nx.day.name)}</span></button>` : ''}</div>` : ''}`);
      return;
    }
    const moved = cfg().moves[x.src];
    F.sheet(`${title(longDay(ts), `${x.day.name} · ${info(x.day)}`)}<div class="menu"><button data-a="startDay" data-p="${x.plan.id}" data-d="${x.day.id}">${ic('play', 20)}<span>Zacznij teraz</span></button>
      <button data-a="calMove" data-k="${x.src}">${ic('calendar', 20)}<span>Przenieś na inny dzień<small>reszta kolejki zostaje bez zmian</small></span></button>
      <button data-a="calShift" data-k="${x.key}">${ic('arrow-right', 20)}<span>Przesuń cały plan o dzień<small>wszystkie kolejne treningi idą o jeden dzień dalej</small></span></button>
      ${moved ? `<button data-a="calUnmove" data-k="${x.src}">${ic('rotate-ccw', 20)}<span>Wróć na pierwotny dzień</span></button>` : ''}
      <button data-a="calSkip" data-k="${x.src}" data-d="${x.day.id}">${ic('x', 20)}<span>Pomiń ten trening</span></button>${cdBtn}</div>`);
  };
  F.act.calMove = b => { F.sheet(`${title('Przenieś trening', 'Wybierz nowy dzień')}<label class="fld"><span>Dzień</span><input type="date" id="cal-to" min="${F.dateInput(Date.now())}"></label><button class="btn primary wide" data-a="calMoveGo" data-k="${b.dataset.k}">Przenieś</button>`); };
  F.act.calMoveGo = b => {
    const v = F.$('#cal-to').value; if (!v) { F.toast('Wybierz dzień'); return; } const [y, m, d] = v.split('-').map(Number), to = y * 10000 + m * 100 + d, src = +b.dataset.k;
    if (to < F.dayKey(Date.now())) { F.toast('Ten dzień już minął'); return; }
    if (F.calQueue(90).some(q => q.key === to && q.src !== src)) { F.toast('Tego dnia masz już trening'); return; }
    const c = cfg(); if (to === src) delete c.moves[src]; else c.moves[src] = to; refresh();
  };
  F.act.calHere = b => { const c = cfg(), src = +b.dataset.s, to = +b.dataset.k; if (to === src) delete c.moves[src]; else c.moves[src] = to; refresh(); };
  F.act.calUnmove = b => { delete cfg().moves[+b.dataset.k]; refresh(); };
  F.act.calShift = b => { cfg().pauses.push(+b.dataset.k); refresh(); };
  F.act.calSkip = b => {
    const c = cfg(), last = F.S.sessions.find(s => s.planId === F.nextWorkout().plan.id), lim = F.dayKey(Date.now() - 30 * 864e5);
    c.skips = c.skips.filter(x => x.key >= lim); c.skips.push({ key: +b.dataset.k, dayId: b.dataset.d, after: last ? last.id : '' }); refresh();
  };
  F.act.calRestore = b => { const c = cfg(); c.skips = c.skips.filter(x => x.key !== +b.dataset.k); refresh(); };
  F.act.calDays = () => { const nx = F.nextWorkout(); F.ui.calWd = [...weekdays(nx && nx.plan)]; F.ui.calCwd = [...cardioWd(nx && nx.plan)]; calDaysSheet(); };
  const calDaysSheet = () => { const nx = F.nextWorkout(true), ncd = cdDays(nx && nx.plan).length;
    F.sheet(`${title('Dni treningowe', 'W które dni zwykle trenujesz?')}<h4 class="lbl">Trening siłowy</h4><div class="chips cal-chips">${WD.map((l, i) => `<button class="chip ${F.ui.calWd.includes(i) ? 'on' : ''}" data-a="calWd" data-i="${i}">${l}</button>`).join('')}</div>
    ${ncd ? `<h4 class="lbl">Osobne sesje cardio (${ncd} w tygodniu)</h4><div class="chips cal-chips">${WD.map((l, i) => `<button class="chip ${F.ui.calCwd.includes(i) ? 'on' : ''}" data-a="calCwd" data-i="${i}">${ic('heart', 12)} ${l}</button>`).join('')}</div><p class="dim small">Najlepiej w dni bez siłowni. Zaznacz ${ncd} ${F.plur(ncd, 'dzień', 'dni', 'dni')}.</p>` : ''}
    <p class="dim small">Zapis ustawi kolejkę od nowa. Przeniesione dni wrócą na swoje miejsca.</p><button class="btn primary wide" data-a="calWdSave">Zapisz</button>`); };
  F.act.calCwd = b => { const i = +b.dataset.i, w = F.ui.calCwd; F.ui.calCwd = w.includes(i) ? w.filter(x => x !== i) : [...w, i].sort((a, c) => a - c); calDaysSheet(); };
  F.act.calWd = b => { const i = +b.dataset.i, w = F.ui.calWd; F.ui.calWd = w.includes(i) ? w.filter(x => x !== i) : [...w, i].sort((a, c) => a - c); calDaysSheet(); };
  F.act.calWdSave = () => { if (!F.ui.calWd.length) { F.toast('Wybierz co najmniej jeden dzień'); return; } const c = cfg(); c.wd = F.ui.calWd; if (F.ui.calCwd && F.ui.calCwd.length) c.cwd = F.ui.calCwd; else delete c.cwd; c.moves = {}; c.pauses = []; refresh(); };
})();
