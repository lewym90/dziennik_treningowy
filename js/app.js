/* FORGE — router, ekran startowy, plany, biblioteka ćwiczeń */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc;
  F.views = {}; F.ui = { exMetric: 'e1', statTab: 'over', histQ: '' };
  const exOf = id => F.S.ex.get(id);
  const exName = id => (exOf(id) || { name: 'Usunięte ćwiczenie' }).name;
  F.exName = exName;
  const mDot = m => { const i = Object.keys(F.MUSCLES).indexOf(m); return `<i class="mdot" style="-webkit-mask-image:url(assets/mus/${i < 0 ? 11 : i}.webp);mask-image:url(assets/mus/${i < 0 ? 11 : i}.webp)"></i>`; };
  F.gly = (n, s = 24) => `<i class="gly" style="-webkit-mask-image:url(assets/ic/${n}.webp);mask-image:url(assets/ic/${n}.webp);width:${s}px;height:${s}px"></i>`;
  F.mDot = mDot;
  F.rankImg = (i, s = 64) => `<img class="rk-em" src="assets/rank/${i}.webp" width="${s}" height="${s}" alt="">`;

  /* ---------- helpers widoku ---------- */
  const head = (title, o = {}) => `<header class="ph">${o.back ? `<button class="ibtn back" data-a="${typeof o.back === 'string' ? o.back : 'back'}" aria-label="Wstecz">${ic('chevron-left', 24)}</button>` : ''}<div class="ph-t"><h1>${title}</h1>${o.sub ? `<p>${o.sub}</p>` : ''}</div><div class="ph-r">${o.right || ''}</div></header>`;
  F.head = head;
  const EMPTY = { 'clipboard-list': 0, history: 1, 'chart-line': 2, ruler: 3, camera: 4, search: 5 };
  const empty = (icon, title, text, cta) => `<div class="empty">${EMPTY[icon] != null ? `<img src="assets/empty/${EMPTY[icon]}.webp" width="130" height="130" alt="">` : ic(icon, 40)}<h3>${title}</h3><p>${text}</p>${cta || ''}</div>`;
  F.empty = empty;
  F.act.back = () => { if (history.length > 1) history.back(); else location.hash = '#/home'; };
  F.go = h => { location.hash = h; };

  /* ---------- plan / następny trening ---------- */
  F.planOf = id => F.S.plans.find(p => p.id === id);
  F.nextWorkout = raw => {
    if (!F.S.plans.length) return null;
    const last = F.S.sessions.find(s => s.planId && F.planOf(s.planId));
    const pick = F.S.settings.curPlan && F.planOf(F.S.settings.curPlan);
    const plan = (pick && pick.days.length ? pick : null) || (last && F.planOf(last.planId)) || F.S.plans.find(p => p.days.length) || F.S.plans[0];
    if (!plan || !plan.days.length) return null;
    // osobne sesje cardio nie biorą udziału w kolejce dni siłowych (i jej nie przesuwają); wybierasz je z listy dni planu
    const cardioOnly = d => /^Cardio/.test(d.name) || (d.items.length > 0 && d.items.every(i => i.cardio));
    const n = plan.days.length; let di = plan.days.findIndex(d => !cardioOnly(d)); if (di < 0) di = 0;
    const lastS = F.S.sessions.find(s => { if (s.planId !== plan.id) return false; const d = plan.days.find(x => x.id === s.dayId); return d && !cardioOnly(d); });
    if (lastS) { const i = plan.days.findIndex(d => d.id === lastS.dayId); for (let k = 1; k <= n; k++) { const c = (i + k) % n; if (!cardioOnly(plan.days[c])) { di = c; break; } } }
    // trening pominięty w kalendarzu: kolejka idzie dalej aż do następnego zapisanego treningu
    const sk = (F.S.settings.cal && F.S.settings.cal.skips) || [], tk = F.dayKey(Date.now()), after = (F.S.sessions.find(s => s.planId === plan.id) || {}).id || '';
    for (let k = 0; k < n; k++) { if (!sk.some(x => x.dayId === plan.days[di].id && x.after === after && x.key <= tk)) break; for (let j = 1; j <= n; j++) { const c = (di + j) % n; if (!cardioOnly(plan.days[c])) { di = c; break; } } }
    // trening przeniesiony w kalendarzu za inny: następny jest ten, który w kalendarzu wypada najwcześniej
    const cal = F.S.settings.cal; if (!raw && cal && cal.moves && Object.keys(cal.moves).length && F.calQueue) { const q0 = F.calQueue(21)[0]; if (q0 && q0.plan.id === plan.id) { const k = plan.days.indexOf(q0.day); if (k >= 0) return { plan, day: q0.day, di: k }; } }
    return { plan, day: plan.days[di], di };
  };
  const estMin = day => F.PLN && F.PLN.estMin ? F.PLN.estMin(day.items) : 0;

  /* ---------- ROUTER ---------- */
  const routes = [
    [/^#\/home$/, () => home(), 'home'], [/^#\/plans$/, () => plans(), 'plans'], [/^#\/plan\/([^/]+)$/, m => planDetail(m[1]), 'plans'],
    [/^#\/plan\/([^/]+)\/edit$/, m => planEdit(m[1]), 'plans'], [/^#\/exercises$/, () => exercises(), 'plans'], [/^#\/ex\/([^/]+)$/, m => exDetail(m[1]), 'stats'],
    [/^#\/history$/, () => F.views.history(), 'history'], [/^#\/session\/([^/]+)$/, m => F.views.session(m[1]), 'history'],
    [/^#\/stats$/, () => F.views.stats(), 'stats'], [/^#\/tools$/, () => F.views.tools(), 'home'], [/^#\/settings$/, () => F.views.settings(), 'home'],
    [/^#\/workout$/, () => F.views.workout(), 'workout'], [/^#\/import(\?.*)?$/, () => F.views.import(), 'plans'], [/^#\/wizard$/, () => F.views.wizard(), 'plans'], [/^#\/calendar$/, () => F.views.calendar(), 'history'], [/^#\/ask$/, () => F.views.ask(), 'home'], [/^#\/recap$/, () => F.views.recap(), 'stats'], [/^#\/report$/, () => F.views.report(), 'stats'], [/^#\/nutrition$/, () => F.views.nutrition(), 'home'], [/^#\/guide$/, () => F.views.guide(), 'home'], [/^#\/guide\/([^/]+)$/, m => F.views.guideArt(m[1]), 'home'], [/^#\/get\/([A-Za-z0-9_-]+)$/, m => F.views.get(m[1]), 'plans'], [/^#\/clients$/, () => F.views.clients(), 'plans'], [/^#\/client\/([^/]+)$/, m => F.views.client(m[1]), 'plans']
  ];
  let curTab = 'home';
  F.render = (keepScroll) => {
    const h = location.hash || '#/home'; const view = F.$('#view'); let out = null;
    for (const [re, fn, tab] of routes) { const m = h.match(re); if (m) { out = fn(m); curTab = tab; break; } }
    if (!out) { location.hash = '#/home'; return; }
    const sy = keepScroll ? window.scrollY : 0;
    document.body.dataset.route = curTab; document.body.classList.toggle('in-workout', curTab === 'workout');
    view.className = 'view' + (keepScroll || out.html.includes('wz-bar') ? '' : ' enter'); view.innerHTML = out.html;
    // bez animacji z transform w kreatorze: odebrałaby paskowi przycisków pozycję fixed i przycisk skakałby
    F.$$('#tabbar [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === curTab));
    window.scrollTo(0, sy); F.countUp(view); if (out.after) out.after(view); F.updateDock();
    if (!keepScroll) setTimeout(() => view.classList.remove('enter'), 500);
  };
  window.addEventListener('hashchange', () => { F.closeSheet(true); F.render(); });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a]'); if (!t) return; const fn = F.act[t.dataset.a];
    if (fn) { if (!t.matches('a[href]')) e.preventDefault(); fn(t, e); }
  });
  const onInput = e => { const t = e.target.closest('[data-b]'); if (!t) return; const fn = F.bind[t.dataset.b]; if (fn) fn(t, e.type, e); };
  document.addEventListener('input', onInput); document.addEventListener('change', onInput);
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not(textarea)') && !e.target.closest('.sheet')) e.target.blur(); });

  /* ================= EKRAN STARTOWY ================= */
  function home() {
    const s = F.S.settings, t = F.totals(), rk = F.rank(), nx = F.nextWorkout(), d = F.S.draft;
    const hr = new Date().getHours(); const greet = hr < 5 ? 'Nocna zmiana' : hr < 12 ? 'Dzień dobry' : hr < 18 ? 'Czas na żelazo' : 'Wieczorna sesja';
    const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5); const quote = F.QUOTES[doy % F.QUOTES.length];
    const ws = F.startOfWeek(Date.now()); const wk = F.weekCounts(1)[0]; const goal = s.weeklyGoal;
    const byDay = {}; F.S.sessions.forEach(x => { byDay[F.dayKey(x.start)] = (byDay[F.dayKey(x.start)] || 0) + 1; });
    const todayK = F.dayKey(Date.now());
    // plan tygodnia: trening siłowy (obwódka) i osobne sesje cardio (serduszko)
    const plK = new Set((F.calQueue ? F.calQueue(30) : []).map(x => x.key)), cdK = new Set((F.cardioQueue ? F.cardioQueue(7, ws) : []).filter(x => !x.done && x.key >= todayK).map(x => x.key));
    const strip = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'].map((l, i) => { const ts = ws + i * 864e5, k = F.dayKey(ts), tr = byDay[k]; return `<div class="wd ${tr ? 'tr' : ''} ${k === todayK ? 'today' : ''} ${ts > Date.now() && !plK.has(k) && !cdK.has(k) ? 'fut' : ''}"><span>${l}</span><i>${tr ? ic('check', 14) : new Date(ts).getDate()}</i><b class="st-m">${!tr && plK.has(k) ? '<em class="st-s" aria-label="trening siłowy"></em>' : ''}${!tr && cdK.has(k) ? '<em class="st-c" aria-label="cardio"></em>' : ''}</b></div>`; }).join('');
    const ct = F.cardioToday ? F.cardioToday() : null, q0 = F.calQueue ? F.calQueue(60)[0] : null, strToday = !!q0 && q0.key === todayK; // calQueue(60): także trening przeniesiony na dziś z dalszego dnia
    const cdMin = dd => Math.round((+(dd.items[0] || {}).reps || 0) / 60);
    // hero
    let hero;
    if (d) {
      const done = d.exercises.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0);
      hero = `<section class="hero cut live"><div class="hero-k">Trening w toku</div><h2>${E(d.name || 'Trening')}</h2><p class="hero-m"><span data-wtime>${F.fmtDur((Date.now() - d.start) / 1000)}</span> · ${done} serii zaliczonych</p><a class="forge-btn" href="#/workout"><span>${ic('play', 22)} Wróć do treningu</span></a></section>`;
    } else if (ct && !strToday) {
      hero = `<section class="hero cut cd"><div class="hero-k">${ic('heart-pulse', 14)} Dziś cardio</div><h2>${E(ct.day.name)}</h2>
        <p class="hero-m"><span>${ic('timer', 15)} ${cdMin(ct.day)} min</span><span>${ic('heart-pulse', 15)} osobna sesja</span></p>
        <button class="forge-btn" data-a="startDay" data-p="${ct.plan.id}" data-d="${ct.day.id}"><span>${ic('play', 20)} Zacznij cardio</span></button>${nx ? `<p class="hero-n">Następny trening siłowy: <b>${E(nx.day.name)}</b>${q0 ? ' — ' + F.calWhen(q0.ts) : ''}</p>` : ''}</section>`;
    } else if (nx) {
            hero = `<section class="hero cut"><div class="hero-k">${strToday ? 'Dziś' : 'Następny trening'}</div><h2>${E(nx.day.name)}</h2>
        <p class="hero-m"><span>${ic('calendar', 15)} Dzień ${nx.di + 1} z ${nx.plan.days.length}</span><span>${ic('timer', 15)} ${estMin(nx.day)} min</span><span>${ic('dumbbell', 15)} ${nx.day.items.length} ${F.plur(nx.day.items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}</span></p>
        <button class="forge-btn" data-a="startNext"><span>${ic('play', 20)} Rozpocznij trening</span></button><button class="short-l" data-a="shortSheet">${ic('timer', 16)} Mam mało czasu</button>${ct ? `<button class="hero-cd" data-a="startDay" data-p="${ct.plan.id}" data-d="${ct.day.id}">${ic('heart-pulse', 16)} Dziś też cardio: ${E(ct.day.name.replace(/^Cardio:\s*/, ''))} · ${cdMin(ct.day)} min</button>` : ''}</section>`;
    } else {
      hero = `<section class="hero cut"><div class="hero-k">Zacznij od zera</div><h2>Pora wykuć plan</h2><p class="hero-m">Ułóż plan w kreatorze, weź gotowy plan startowy albo wgraj ten, którego używasz dotąd (PDF lub zrzut ekranu).</p>
        <div class="btn-row"><a class="btn primary" href="#/wizard" data-a="newWizard">${ic('sparkles', 18)} Kreator planu</a><a class="btn ghost" href="#/plans">${ic('clipboard-list', 18)} Plany</a></div></section>`;
    }
    // rekordy
    const prs = []; F.S.sessions.slice(0, 8).forEach(se => (se.prs || []).forEach(p => prs.push({ ...p, ts: se.start }))); const prShow = prs.slice(0, 6);
    // banery
    let banners = F.deloadBanner();
    if (t.count > 0 && Date.now() - (s.lastBackup || 0) > 14 * 864e5) banners += `<div class="banner"><div>${ic('download', 20)}</div><p><b>Zrób kopię zapasową</b><br><small>${t.count} ${F.plur(t.count, 'trening', 'treningi', 'treningów')} w pamięci urządzenia. Zapisz je w pliku.</small></p><button class="btn sm primary" data-a="backupNow">Zapisz</button></div>`;
    if (F.installEvt && !F.isStandalone()) banners += `<div class="banner"><div>${ic('smartphone', 20)}</div><p><b>Zainstaluj FORGE</b><br><small>Pełny ekran i działanie bez internetu.</small></p><button class="btn sm primary" data-a="installApp">Instaluj</button></div>`;
    else if (F.isIOS() && !F.isStandalone() && !s.installDismissed) banners += `<div class="banner"><div>${ic('smartphone', 20)}</div><p><b>Dodaj do ekranu początkowego</b><br><small>Safari → Udostępnij → „Do ekranu początkowego”.</small></p><button class="ibtn" data-a="dismissInstall" aria-label="Ukryj">${ic('x', 18)}</button></div>`;
    return {
      html: `<header class="hm-top"><img class="hm-logo" src="assets/bg/logo.webp" alt="FORGE"><div class="hm-r"><a class="ibtn ask" href="#/ask" aria-label="Zapytaj FORGE"><img src="assets/bg/ask.webp" alt="" width="44" height="44"></a><a class="ibtn" href="#/settings" aria-label="Ustawienia">${ic('settings', 22)}</a></div></header>
      <section class="hm-greet"><div><h1>${greet}${s.name ? ', ' + E(s.name) : ''}</h1><p>${F.fmtDateLong(Date.now())}</p></div><a class="hm-rank" href="#/stats" data-a="goOver">${F.chart.ring(rk.pct, 76, 4, F.rankImg(rk.i, 50))}<small>${rk.name}</small></a></section>
      ${hero}
      ${F.pendHtml ? F.pendHtml() : ""}
      ${banners}
      <div class="qa">
        <a class="qa-i cut" href="#/nutrition">${F.gly(6, 26)}<span>Żywienie</span></a>
        <a class="qa-i cut" href="#/guide">${F.gly(7, 26)}<span>Porady i nauka</span></a>
        <a class="qa-i cut" href="#/tools">${F.gly(9, 26)}<span>Narzędzia</span></a>
        <button class="qa-i cut" data-a="bwSheet">${F.gly(11, 26)}<span>Wpisz wagę</span></button>
      </div>
      <section class="card cut week" data-a="goCal" role="button" aria-label="Otwórz kalendarz"><div class="week-top"><div><h3>Ten tydzień</h3><p class="dim">${wk.count} z ${goal} treningów</p><span class="wk-cal">${ic('calendar', 15)} Kalendarz ${ic('chevron-right', 15)}</span></div>${F.chart.ring(Math.min(1, wk.count / goal), 64, 7, `<b>${wk.count}<small>/${goal}</small></b>`)}</div><div class="strip">${strip}</div>${cdK.size ? '<div class="strip-l"><span><i class="st-s"></i>siłowy</span><span><i class="st-c"></i>cardio</span></div>' : ''}</section>
      <div class="tiles">
        <div class="tile cut"><span class="tl">${ic('flame', 16)} Seria tygodni</span><b class="tv" data-count="${F.weekStreak()}">0</b><small>cel ${goal}×/tydz.</small></div>
        <div class="tile cut"><span class="tl">${ic('weight', 16)} Tonaż w tygodniu</span><b class="tv" data-count="${F.toDisp(wk.vol) >= 10000 ? F.toDisp(wk.vol) / 1000 : F.toDisp(wk.vol)}" data-dec="${F.toDisp(wk.vol) >= 10000 ? 1 : 0}" data-suf="${F.toDisp(wk.vol) >= 10000 ? ' t' : ' ' + F.unit()}">0</b><small>łącznie ${F.fmtVol(t.vol)}</small></div>
        <div class="tile cut"><span class="tl">${ic('trophy', 16)} Rekordy</span><b class="tv" data-count="${F.prEvents()}">0</b><small>pobitych w sumie</small></div>
        <div class="tile cut"><span class="tl">${ic('calendar', 16)} Treningi</span><b class="tv" data-count="${t.count}">0</b><small>${F.fmtDurHuman(t.dur)} pod sztangą</small></div>
      </div>
      <section class="card cut rank"><div class="rank-top">${F.rankImg(rk.i, 72)}<div class="grow"><span class="dim">Ranga</span><h3 class="rk">${rk.name}</h3></div><div class="xp">${F.fmtNum(rk.xp, 0)} <small>XP</small></div></div><div class="bar"><i style="width:${(rk.pct * 100).toFixed(1)}%"></i></div><p class="dim">${rk.next ? `Jeszcze ${F.fmtNum(rk.toNext, 0)} XP do rangi <b>${rk.next}</b>` : 'Maksymalna ranga. Szacunek.'}</p></section>
      ${prShow.length ? `<h3 class="sec">Świeże rekordy</h3><div class="prow">${prShow.map(p => `<a class="prchip cut" href="#/ex/${E(p.exId)}">${ic('trophy', 16)}<span><b>${E(exName(p.exId))}</b><small>${E(p.text)} · ${F.relDay(p.ts)}</small></span></a>`).join('')}</div>` : ''}
      <p class="quote">${E(quote)}</p>`,
      after: () => { }
    };
  }
  F.isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  F.isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); F.installEvt = e; if (location.hash === '#/home' || !location.hash) F.render(true); });
  window.addEventListener('appinstalled', () => { F.installEvt = null; F.toast('FORGE zainstalowany. Szukaj go na ekranie głównym.', 'hot'); });
  F.act.installApp = async () => { if (!F.installEvt) return; F.installEvt.prompt(); await F.installEvt.userChoice; F.installEvt = null; F.render(true); };
  F.act.dismissInstall = () => { F.S.settings.installDismissed = 1; F.saveSettings(); F.render(true); };
  F.act.goBody = () => { F.ui.statTab = 'body'; };
  F.act.goOver = () => { F.ui.statTab = 'over'; };
  F.act.startNext = () => { const nx = F.nextWorkout(); if (nx) F.startWorkout({ plan: nx.plan, day: nx.day }); };
  F.act.backupNow = () => F.doBackup();

  /* ================= PLANY ================= */
  function plans() {
    const nx = F.nextWorkout(), cur = nx ? nx.plan : null, d = F.S.draft;
    const cnt = p => p.days.reduce((a, x) => a + x.items.length, 0), G = F.PLN && F.PLN.GOALS, X = F.PLN && F.PLN.EXPS;
    const tagOf = p => { const m = p.meta || {}; return [m.goal && G && G[m.goal] ? G[m.goal][0] : '', m.exp && X && X[m.exp] ? X[m.exp][0].toLowerCase() : ''].filter(Boolean).join(' · '); };
    const card = p => { const n = cnt(p), last = F.S.sessions.find(s => s.planId === p.id);
      return `<a class="plan cut" href="#/plan/${p.id}"><div class="plan-i">${ic('clipboard-list', 22)}</div><div class="plan-b"><h3>${E(p.name)}</h3><p>${tagOf(p) ? E(tagOf(p)) + ' · ' : ''}${p.days.length} ${F.plur(p.days.length, 'dzień', 'dni', 'dni')} · ${n} ${F.plur(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}${last ? ` · ostatnio ${F.relDay(last.start).toLowerCase()}` : ''}</p></div>${ic('chevron-right', 20)}</a>`; };
    let top = '';
    if (cur) {
      const n = cnt(cur), tag = tagOf(cur);
      const q0 = F.calQueue ? F.calQueue(21)[0] : null, wd = F.calWeekdays ? F.calWeekdays(cur) : [];
      const when = q0 ? F.calWhen(q0.ts) : '', nd = q0 ? q0.day : nx.day;
      top = `<section class="plancur cut"><div class="pc-k">${ic('flame', 15)} Aktualny plan</div>
        <a class="pc-name" href="#/plan/${cur.id}"><h2>${E(cur.name)}</h2></a>
        <p class="pc-m">${tag ? `<span>${E(tag)}</span>` : ''}<span>${cur.days.length} ${F.plur(cur.days.length, 'dzień', 'dni', 'dni')} · ${n} ${F.plur(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}</span></p>
        <div class="pc-row"><span class="dim">Następny</span><b>${E(nd.name.replace(/^(Pn|Wt|Śr|Cz|Pt|So|Nd) — /, ''))}</b>${when ? `<em>${E(when)}</em>` : ''}</div>
        ${(() => { const b = F.blockInfo && F.blockInfo(cur); if (!b) return ''; return b.over ? `<button class="pc-row" data-a="blockSum"><span class="dim">Blok</span><b>Zakończony</b><em>podsumowanie</em></button>` : `<div class="pc-row pc-blk"><span class="dim">Blok</span><b>Tydzień ${b.week} z ${b.weeks}${b.deload ? ' · odciążenie' : ` · zapas ${b.rir} powt.`}</b><i class="pc-bar"><i style="width:${(b.week / b.weeks * 100).toFixed(0)}%"></i></i></div>`; })()}
        ${wd.length ? `<button class="pc-row pc-days" data-a="calDays"><span class="dim">Dni</span><b>${wd.map(i => F.WD_SHORT[i]).join(' · ')}</b><em>zmień</em></button>` : ''}${F.cardioWd && F.cardioWd(cur).length ? `<button class="pc-row pc-days" data-a="calDays"><span class="dim">Cardio</span><b>${F.cardioWd(cur).map(i => F.WD_SHORT[i]).join(' · ')}</b><em>zmień</em></button>` : ''}
        ${d ? `<a class="forge-btn" href="#/workout"><span>${ic('play', 20)} Wróć do treningu</span></a>` : `<button class="forge-btn" data-a="startNext"><span>${ic('play', 20)} Rozpocznij trening</span></button><button class="short-l" data-a="shortSheet">${ic('timer', 16)} Mam mało czasu</button>`}</section>`;
    }
    const others = F.S.plans.filter(p => p !== cur);
    return {
      html: `${head('Plany', { sub: 'Twoje programy treningowe', right: `<button class="btn sm primary" data-a="newPlan">${ic('plus', 16)} Nowy</button>` })}
      ${F.S.plans.length ? (F.hint ? F.hint('plans') : '') : ''}${F.S.plans.length ? top : empty('clipboard-list', 'Brak planów', 'Ułóż plan w kreatorze, weź gotowy plan startowy albo zaimportuj ten, którego używasz.')}
      ${others.length ? `<h3 class="sec">${cur ? 'Inne plany' : 'Twoje plany'}</h3><div class="stack">${others.map(card).join('')}</div>` : ''}
      <h3 class="sec">Nowy plan</h3>
      <a class="importcard cut" href="#/wizard" data-a="newWizard"><div>${ic('sparkles', 30)}</div><p><b>Kreator planu</b><small>Odpowiesz na kilka pytań — ułożę plan pod Twój cel, staż, sprzęt i czas</small></p>${ic('chevron-right', 20)}</a>
      <button class="importcard cut" data-a="templates"><div>${ic('clipboard-list', 30)}</div><p><b>Plany startowe</b><small>Dziewięć gotowych planów: siłownia, dom, bez sprzętu, zdrowie</small></p>${ic('chevron-right', 20)}</button>
      <a class="importcard cut" href="#/import"><div>${ic('scan-text', 30)}</div><p><b>Importuj plan z pliku</b><small>PDF, zrzut ekranu, zdjęcie, tekst, CSV z innej aplikacji</small></p>${ic('chevron-right', 20)}</a>
      <a class="btn ghost wide" href="#/exercises">${ic('dumbbell', 18)} Baza ćwiczeń</a>
      ${F.S.settings.coachMode ? `<h3 class="sec">Tryb trenera</h3><a class="importcard cut" href="#/clients"><div>${ic('users', 30)}</div><p><b>Podopieczni</b><small>Wczytane wyniki osób, którym układasz plany</small></p>${ic('chevron-right', 20)}</a>` : ''}`
    };
  }
  F.setCurPlan = id => { F.S.settings.curPlan = id; F.saveSettings(); };
  F.act.setCur = b => { F.setCurPlan(b.dataset.id); F.closeSheet(true); F.toast('Ustawiono jako aktualny plan', 'hot'); F.render(true); };
  F.act.newPlan = () => { const cp = F.curPlan(); const g = cp && cp.meta && cp.meta.goal; const p = { id: F.uid(), name: 'Nowy plan', created: Date.now(), meta: { goal: g || undefined, exp: cp && cp.meta && cp.meta.exp || undefined, rest: { ...F.restProfile(cp) } }, days: [{ id: F.uid(), name: 'Dzień 1', items: [] }] }; F.ui.edit = { plan: p, isNew: true }; F.go('#/plan/' + p.id + '/edit'); };
  const tplItems = t => { const m = t[3]; return t[2].map(d => ({ name: d[0], items: d[1].map(([id, sets, r]) => { const role = F.PLN.roleOf(id), ex = F.S.ex.get(id) || {}; const reps = r || (ex.type === 'time' ? '45' : (d[2] === 'hy' ? F.KB.repsHyp : F.KB.reps[m.goal])[role]); return { exId: id, sets, reps: String(reps), rest: F.KB.restOf(m.goal, m.exp, role), role }; }) })); };
  F.tplItems = tplItems;
  F.act.templates = () => {
    const G = F.PLN.GOALS, X = F.PLN.EXPS;
    F.sheet(`<p class="sheet-p dim">Gotowe plany ze stałym układem. Serie, powtórzenia i przerwy dobrane do celu i stażu podanego przy planie. Plan pod Twój sprzęt, czas i ograniczenia ułoży kreator.</p>${[['gym', 'Siłownia'], ['home', 'Dom i bez sprzętu'], ['health', 'Zdrowie']].map(([c, cn]) => `<h3 class="sec">${cn}</h3><div class="stack">${F.TEMPLATES.map((t, i) => [t, i]).filter(([t]) => (t[3].cat || 'gym') === c).map(([t, i]) => { const n = t[2].reduce((a, d) => a + d[1].length, 0), m = t[3]; return `<button class="tpl cut" data-a="addTpl" data-i="${i}"><b>${E(t[0])}</b><small>${E(t[1])}</small><em>${G[m.goal][0]} · ${X[m.exp][0].toLowerCase()} · ${m.weekdays.length} ${F.plur(m.weekdays.length, 'trening', 'treningi', 'treningów')} w tygodniu · ${n} ${F.plur(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}</em></button>`; }).join('')}</div>`).join('')}`, { title: 'Plany startowe' });
  };
  F.act.addTpl = async b => {
    const t = F.TEMPLATES[+b.dataset.i], m = t[3];
    const plan = { id: F.uid(), name: t[0], created: Date.now(), meta: { goal: m.goal, exp: m.exp, weekdays: [...m.weekdays], tpl: 1, rest: { main: F.KB.restOf(m.goal, m.exp, 'main'), sec: F.KB.restOf(m.goal, m.exp, 'sec'), iso: F.KB.restOf(m.goal, m.exp, 'iso') } }, days: tplItems(t).map(d => ({ id: F.uid(), name: d.name, items: d.items.map(i => ({ id: F.uid(), ...i })) })) };
    await F.savePlan(plan); F.setCurPlan(plan.id); F.closeSheet(true); F.toast('Dodano plan: ' + E(t[0]), 'hot'); F.go('#/plan/' + plan.id);
  };

  function planDetail(id) {
    const p = F.planOf(id); if (!p) return { html: head('Plan', { back: 1 }) + empty('clipboard-list', 'Nie znaleziono planu', 'Ten plan został usunięty.') };
    return {
      html: `${head(E(p.name), { back: 1, sub: `${p.days.length} ${F.plur(p.days.length, 'dzień', 'dni', 'dni')}`, right: `<button class="ibtn" data-a="planMenu" data-id="${p.id}" aria-label="Więcej">${ic('ellipsis', 22)}</button>` })}
      ${(F.nextWorkout() || {}).plan === p ? '' : `<div class="pc-note cut"><p>To nie jest Twój aktualny plan. Następny trening na ekranie Dziś i kalendarz biorą dni z aktualnego planu.</p><button class="btn sm primary" data-a="setCur" data-id="${p.id}">${ic('flame', 16)} Ustaw jako aktualny</button></div>`}
      ${p.days.map((d, di) => `<section class="card cut day"><div class="day-h"><div><span class="dim">Dzień ${di + 1}</span><h3>${E(d.name)}</h3></div><button class="btn sm primary" data-a="startDay" data-p="${p.id}" data-d="${d.id}">${ic('play', 16)} Start</button></div>
        ${d.items.length ? `<ul class="items">${planDetItems(d)}</ul>` : `<p class="dim pad">Ten dzień jest pusty.</p>`}
        <p class="dim foot">${d.items.length} ${F.plur(d.items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')} · wyliczony czas: ${estMin(d)} min</p></section>`).join('')}
      <a class="btn ghost wide" href="#/plan/${p.id}/edit">${ic('pencil', 18)} Edytuj plan</a>`
    };
  }

  function planDetItems(d) {
    const inf = F.ssInfo(d.items); let h = '', i = 0;
    while (i < d.items.length) {
      const g = inf[i];
      if (g && g.pos === 0) {
        const f = d.items[g.start];
        h += `<li class="blk"><div class="blk-h"><span class="ssc-t">${ic('link-2', 15)} ${F.ssName(g.size)} ${g.L}</span><small>${f.sets} ${F.plur(f.sets, 'runda', 'rundy', 'rund')}${f.rest ? ' · przerwa ' + F.fmtDur(f.rest) : ''}</small></div><ul>${d.items.slice(g.start, g.end + 1).map((it, n) => `<li><a href="#/ex/${E(it.exId)}"><span class="ss-tag">${g.L}${n + 1}</span><span>${E(exName(it.exId))}${it.pct ? ` <em class="ss-chip">${it.pct}% 1RM</em>` : ''}</span></a><b>${E(it.reps || '')}${it.w ? `<small> · ${F.fwtu(it.w, it.exId)}</small>` : ''}</b></li>`).join('')}</ul></li>`; i = g.end + 1;
      } else {
        const it = d.items[i]; h += `<li><a href="#/ex/${E(it.exId)}">${mDot((exOf(it.exId) || {}).muscle)}<span>${E(exName(it.exId))}${it.pct ? ` <em class="ss-chip">${it.pct}% 1RM</em>` : ''}</span></a><b>${it.cardio ? Math.round((+it.reps || 0) / 60) + ' min' : it.sets + '×' + E(it.reps || '')}${it.rest && !it.cardio ? `<small> · ${F.fmtDur(it.rest)}</small>` : ''}</b></li>`; i++;
      }
    }
    return h;
  }
  F.act.startDay = b => { const p = F.planOf(b.dataset.p); const d = p && p.days.find(x => x.id === b.dataset.d); if (d) F.startWorkout({ plan: p, day: d }); };
  F.act.planMenu = b => {
    const id = b.dataset.id;
    const isCur = (F.nextWorkout() || {}).plan === F.planOf(id);
    F.sheet(`<div class="menu">${isCur ? '' : `<button data-a="setCur" data-id="${id}">${ic('flame', 20)}Ustaw jako aktualny</button>`}<button data-a="planEditGo" data-id="${id}">${ic('pencil', 20)}Edytuj</button><button data-a="planDup" data-id="${id}">${ic('copy', 20)}Duplikuj</button><button data-a="planSend" data-id="${id}">${ic('send', 20)}Wyślij podopiecznemu</button><button data-a="planText" data-id="${id}">${ic('clipboard-paste', 20)}Kopiuj jako tekst</button><button data-a="planJson" data-id="${id}">${ic('file-json', 20)}Eksportuj do pliku</button><button class="danger" data-a="planDel" data-id="${id}">${ic('trash-2', 20)}Usuń plan</button></div>`, { title: 'Plan' });
  };
  F.act.planEditGo = b => { F.closeSheet(true); F.go('#/plan/' + b.dataset.id + '/edit'); };
  F.act.planDup = async b => { const p = F.planOf(b.dataset.id); const c = JSON.parse(JSON.stringify(p)); c.id = F.uid(); c.name = p.name + ' (kopia)'; c.created = Date.now(); c.days.forEach(d => { d.id = F.uid(); d.items.forEach(i => i.id = F.uid()); }); await F.savePlan(c); F.closeSheet(true); F.toast('Zduplikowano plan'); F.go('#/plan/' + c.id); };
  F.planToText = p => p.days.map(d => { const inf = F.ssInfo(d.items); return d.name + '\n' + d.items.map((i, k) => `- ${inf[k] ? inf[k].tag + '. ' : ''}${exName(i.exId)} ${i.sets}x${i.reps}${i.pct ? ' @' + i.pct + '%' : ''}${i.rest ? ' (przerwa ' + i.rest + 's)' : ''}`).join('\n'); }).join('\n\n');
  F.act.planText = async b => { const p = F.planOf(b.dataset.id); const txt = p.name + '\n\n' + F.planToText(p); try { await navigator.clipboard.writeText(txt); F.toast('Skopiowano plan do schowka'); } catch (e) { F.toast('Nie udało się skopiować'); } F.closeSheet(true); };
  F.download = (name, data, type) => { const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); };
  F.act.planJson = b => { const p = F.planOf(b.dataset.id); F.download('forge-plan-' + F.norm(p.name).replace(/ /g, '-') + '.json', JSON.stringify({ app: 'FORGE', kind: 'plan', plan: p, exercises: p.days.flatMap(d => d.items.map(i => exOf(i.exId))).filter(Boolean) }, null, 1), 'application/json'); F.closeSheet(true); };
  F.act.planDel = async b => { const p = F.planOf(b.dataset.id); if (await F.confirm({ title: 'Usunąć plan?', text: `„${E(p.name)}” zniknie. Historia treningów zostanie nietknięta.`, ok: 'Usuń', danger: true })) { await F.delPlan(p.id); F.toast('Usunięto plan'); F.go('#/plans'); } };

  /* ---------- edytor planu ---------- */
  function planEdit(id) {
    let st = F.ui.edit && F.ui.edit.plan.id === id ? F.ui.edit : null;
    if (!st) { const p = F.planOf(id); if (!p) return { html: head('Plan', { back: 1 }) + empty('clipboard-list', 'Nie znaleziono planu', '') }; st = F.ui.edit = { plan: JSON.parse(JSON.stringify(p)), isNew: false }; }
    const p = st.plan;
    return {
      html: `${head(st.isNew ? 'Nowy plan' : 'Edycja planu', { back: 1, right: `<button class="btn sm primary" data-a="planSave">${ic('save', 16)} Zapisz</button>` })}
      <label class="fld"><span>Nazwa planu</span><input data-b="pname" value="${E(p.name)}" maxlength="60"></label>
      ${restBox(p, st.isNew)}
      ${p.days.map((d, di) => `<section class="card cut day edit" data-di="${di}">
        <div class="day-h"><label class="fld grow"><span>Dzień ${di + 1}</span><input data-b="dname" data-di="${di}" value="${E(d.name)}" maxlength="50"></label>
        <div class="mini-btns"><button class="ibtn" data-a="dayUp" data-di="${di}" ${di === 0 ? 'disabled' : ''} aria-label="W górę">${ic('arrow-up', 18)}</button><button class="ibtn" data-a="dayDel" data-di="${di}" aria-label="Usuń dzień">${ic('trash-2', 18)}</button></div></div>
        ${planItemsHtml(d, di)}
        <button class="btn ghost wide" data-a="itAdd" data-di="${di}">${ic('plus', 18)} Dodaj ćwiczenia</button></section>`).join('')}
      <button class="btn ghost wide" data-a="dayAdd">${ic('plus', 18)} Dodaj dzień treningowy</button>`
    };
  }

  // przerwy planu: trzy rodzaje ćwiczeń z przykładami; nowe i zamieniane ćwiczenia biorą przerwę stąd
  const REST_K = [['main', 'Ciężkie wielostawowe', 'przysiad, martwy ciąg, wyciskanie leżąc, wyciskanie nad głowę, wiosłowanie, podciąganie, ściąganie drążka, wypychanie nogami'], ['sec', 'Pozostałe wielostawowe', 'wykroki, przysiad bułgarski, hip thrust, wyciskanie hantli na skosie, pompki na poręczach, pompki'], ['iso', 'Izolowane (jeden staw)', 'uginanie ramion, prostowanie ramion na wyciągu, wznosy bokiem, prostowanie i uginanie nóg na maszynie, wspięcia na palce']];
  const restBox = (p, open) => { const r = F.restProfile(p); return `<details class="card cut rest-box" ${open ? 'open' : ''}><summary><b>${ic('timer', 18)} Przerwy w tym planie</b><small>${REST_K.map(k => F.fmtDur(r[k[0]])).join(' · ')}</small></summary>
      <p class="dim small">Każde ćwiczenie dodane do planu albo w trakcie treningu dostaje przerwę stąd, według swojego rodzaju. Przy pojedynczym ćwiczeniu możesz ją zmienić niżej.</p>
      ${REST_K.map(([k, l, ex]) => `<label class="fld rest-f"><span>${l}</span><div class="rest-in"><input data-b="prest" data-k="${k}" inputmode="numeric" value="${r[k]}" maxlength="3"><em>s</em><b>${F.fmtDur(r[k])}</b></div><small class="dim">np. ${ex}</small></label>`).join('')}
      ${p.meta && F.KB.restT[p.meta.goal] ? `<p class="dim small">Zalecane dla celu „${E((F.PLN.GOALS[p.meta.goal] || [''])[0])}”: ${['main', 'sec', 'iso'].map(k => F.fmtDur(F.KB.restOf(p.meta.goal, p.meta.exp || 'mid', k))).join(' · ')}.</p>` : `<p class="dim small">Zalecenia: ciężkie wielostawowe 2–3 min (przy treningu siły 3–5 min), pozostałe 1,5–2 min, izolowane 1–1,5 min (ACSM).</p>`}
      <button class="btn ghost wide" data-a="restApply">${ic('repeat', 16)} Zastosuj do wszystkich ćwiczeń w planie</button></details>`; };
  F.bind.prest = (el, type) => { if (type !== 'change') return; const p = E_(); p.meta = p.meta || {}; p.meta.rest = { ...F.restProfile(p) }; const v = Math.max(15, Math.min(600, parseInt(el.value) || 0)); p.meta.rest[el.dataset.k] = v; F.render(true); };
  F.act.restApply = async () => { const p = E_(); p.meta = p.meta || {}; const r = p.meta.rest = { ...F.restProfile(p) }; if (!(await F.confirm({ title: 'Zastosować przerwy do wszystkich ćwiczeń?', text: 'Przerwy wpisane ręcznie przy pojedynczych ćwiczeniach zostaną zastąpione.', ok: 'Zastosuj', cancel: 'Wróć' }))) return; p.days.forEach(d => { d.items.forEach(it => { if (it.cardio) return; const role = it.role || F.restRole(it.exId); it.rest = r[role]; }); const inf = F.ssInfo(d.items); d.items.forEach((it, k) => { const g = inf[k]; if (g) it.rest = Math.max(...d.items.slice(g.start, g.end + 1).map(x => x.rest || 0)); }); }); F.toast('Przerwy ustawione', 'hot'); F.render(true); };

  /* ---------- elementy edytora: pojedyncze ćwiczenia i bloki superserii ---------- */
  const piAdv = (it, di, ii) => `<details class="pi-adv" ${it.prog && it.prog !== 'auto' || it.inc || it.pct || it.scheme ? 'open' : ''}><summary>Progresja i % 1RM</summary><div class="pi-f three"><label><span>Progresja</span><select data-b="it" data-f="prog" data-di="${di}" data-ii="${ii}">${[['auto', 'Podwójna (auto)'], ['linear', 'Liniowa'], ['off', 'Wyłączona']].map(o => `<option value="${o[0]}" ${(it.prog || 'auto') === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label><label><span>Skok ${F.unit()}</span><input inputmode="decimal" data-b="it" data-f="inc" data-di="${di}" data-ii="${ii}" value="${it.inc ? F.fw(it.inc / F.wm(it.exId)).replace(',', '.') : ''}" placeholder="auto"></label><label><span>% 1RM</span><input inputmode="numeric" data-b="it" data-f="pct" data-di="${di}" data-ii="${ii}" value="${it.pct || ''}" placeholder="–"></label></div><div class="pi-f"><label><span>Schemat serii</span><select data-b="it" data-f="scheme" data-di="${di}" data-ii="${ii}"><option value="" ${it.scheme === 'pyr' ? '' : 'selected'}>Jeden ciężar</option><option value="pyr" ${it.scheme === 'pyr' ? 'selected' : ''}>Narastająco (piramida)</option></select></label></div><p class="dim small">Podwójna: najpierw powtórzenia do góry zakresu, potem więcej kilogramów. Liniowa: stały schemat, ciężar rośnie co trening. % 1RM liczy ciężar z Twojego najlepszego wyliczonego 1RM.</p></details>`;
  const fld = (lab, f, di, ii, v, ph, mode) => `<label><span>${lab}</span><input ${mode ? `inputmode="${mode}"` : ''} data-b="it" data-f="${f}" data-di="${di}" data-ii="${ii}" value="${E(String(v))}" placeholder="${ph || ''}"></label>`;
  const runsOf = items => { const inf = F.ssInfo(items); const runs = []; let i = 0; while (i < items.length) { const e = inf[i] ? inf[i].end : i; runs.push([i, e]); i = e + 1; } return runs; };
  function singleHtml(d, di, ii) {
    const it = d.items[ii]; const runs = runsOf(d.items); const ri = runs.findIndex(r => r[0] === ii);
    return `<div class="pi"><div class="pi-top">${mDot((exOf(it.exId) || {}).muscle)}<button class="pi-n" data-a="itSwap" data-di="${di}" data-ii="${ii}" aria-label="Zamień ćwiczenie"><b>${E(exName(it.exId))}</b>${ic('repeat', 15)}</button><div class="mini-btns"><button class="ibtn" data-a="itLink" data-di="${di}" data-ii="${ii}" ${ii === d.items.length - 1 ? 'disabled' : ''} aria-label="Połącz z następnym w superserię" title="Połącz z następnym w superserię">${ic('link-2', 16)}</button><button class="ibtn" data-a="blkMove" data-d="-1" data-di="${di}" data-ii="${ii}" ${ri === 0 ? 'disabled' : ''} aria-label="W górę">${ic('arrow-up', 16)}</button><button class="ibtn" data-a="blkMove" data-d="1" data-di="${di}" data-ii="${ii}" ${ri === runs.length - 1 ? 'disabled' : ''} aria-label="W dół">${ic('arrow-down', 16)}</button><button class="ibtn" data-a="itDel" data-di="${di}" data-ii="${ii}" aria-label="Usuń">${ic('x', 16)}</button></div></div>
      ${it.cardio ? `<div class="pi-f"><label><span>Czas (min)</span><input inputmode="numeric" data-b="it" data-f="cmin" data-di="${di}" data-ii="${ii}" value="${Math.round((+it.reps || 0) / 60)}"></label></div>` : `<div class="pi-f four">${fld('Serie', 'sets', di, ii, it.sets, '', 'numeric')}${fld('Powtórzenia', 'reps', di, ii, it.reps || '', '8-10')}${fld('Przerwa s', 'rest', di, ii, it.rest || '', '90', 'numeric')}${fld('Ciężar ' + (F.wm(it.exId) === 2 ? '2× ' : '') + F.unit(), 'w', di, ii, it.w ? F.fw(it.w / F.wm(it.exId)).replace(',', '.') : '', '–', 'decimal')}</div>${piAdv(it, di, ii)}`}</div>`;
  }
  function blockHtml(d, di, g) {
    const items = d.items, first = items[g.start]; const runs = runsOf(items); const ri = runs.findIndex(r => r[0] === g.start);
    let h = `<div class="pi ssb"><div class="ssb-h"><span class="ssc-t">${ic('link-2', 15)} ${F.ssName(g.size)} ${g.L}</span><div class="mini-btns"><button class="ibtn" data-a="blkMove" data-d="-1" data-di="${di}" data-ii="${g.start}" ${ri === 0 ? 'disabled' : ''} aria-label="Blok w górę">${ic('arrow-up', 16)}</button><button class="ibtn" data-a="blkMove" data-d="1" data-di="${di}" data-ii="${g.start}" ${ri === runs.length - 1 ? 'disabled' : ''} aria-label="Blok w dół">${ic('arrow-down', 16)}</button><button class="ibtn" data-a="blkSplit" data-di="${di}" data-ii="${g.start}" aria-label="Rozdziel superserię" title="Rozdziel na osobne ćwiczenia">${ic('x', 16)}</button></div></div>
      <div class="pi-f two ssb-sh"><label><span>Rundy</span><input inputmode="numeric" data-b="itss" data-f="sets" data-di="${di}" data-ii="${g.start}" value="${first.sets}"></label><label><span>Przerwa po rundzie (s)</span><input inputmode="numeric" data-b="itss" data-f="rest" data-di="${di}" data-ii="${g.start}" value="${first.rest || ''}" placeholder="90"></label></div>`;
    for (let k = g.start; k <= g.end; k++) {
      const it = items[k], tag = F.ssInfo(items)[k].tag;
      h += `<div class="ssb-m"><div class="pi-top"><span class="ss-tag">${tag}</span><button class="pi-n" data-a="itSwap" data-di="${di}" data-ii="${k}" aria-label="Zamień ćwiczenie"><b>${E(exName(it.exId))}</b>${ic('repeat', 15)}</button><div class="mini-btns"><button class="ibtn" data-a="itUp" data-di="${di}" data-ii="${k}" ${k === g.start ? 'disabled' : ''} aria-label="W górę">${ic('arrow-up', 16)}</button><button class="ibtn" data-a="itDown" data-di="${di}" data-ii="${k}" ${k === g.end ? 'disabled' : ''} aria-label="W dół">${ic('arrow-down', 16)}</button><button class="ibtn" data-a="itUnlink" data-di="${di}" data-ii="${k}" aria-label="Wyjmij z superserii" title="Wyjmij z superserii">${ic('arrow-left-right', 16)}</button><button class="ibtn" data-a="itDel" data-di="${di}" data-ii="${k}" aria-label="Usuń">${ic('x', 16)}</button></div></div>
        <div class="pi-f two">${fld('Powtórzenia', 'reps', di, k, it.reps || '', '10')}${fld('Ciężar ' + (F.wm(it.exId) === 2 ? '2× ' : '') + F.unit(), 'w', di, k, it.w ? F.fw(it.w / F.wm(it.exId)).replace(',', '.') : '', '–', 'decimal')}</div>${piAdv(it, di, k)}</div>`;
    }
    const canJoin = g.end < items.length - 1 && !(F.ssInfo(items)[g.end + 1]);
    h += `<div class="btn-row split"><button class="btn ghost sm" data-a="itAddSS" data-di="${di}" data-ii="${g.end}">${ic('plus', 16)} Dodaj ćwiczenie</button>${canJoin ? `<button class="btn ghost sm" data-a="itLink" data-di="${di}" data-ii="${g.end}">${ic('link-2', 16)} Dołącz następne</button>` : ''}</div></div>`;
    return h;
  }
  function planItemsHtml(d, di) {
    const inf = F.ssInfo(d.items); let h = '', i = 0;
    while (i < d.items.length) { const g = inf[i]; if (g && g.pos === 0) { h += blockHtml(d, di, g); i = g.end + 1; } else { h += singleHtml(d, di, i); i++; } }
    return h;
  }
  const E_ = () => F.ui.edit.plan;
  F.bind.pname = el => { E_().name = el.value; };
  F.bind.dname = el => { E_().days[+el.dataset.di].name = el.value; };
  F.bind.it = el => { const it = E_().days[+el.dataset.di].items[+el.dataset.ii]; const f = el.dataset.f; const pf = () => parseFloat(String(el.value).replace(',', '.')) || 0; if (f === 'cmin') { it.reps = String(Math.max(1, Math.min(240, parseInt(el.value) || 1)) * 60); it.sets = 1; } else if (f === 'scheme') { if (el.value === 'pyr') it.scheme = 'pyr'; else delete it.scheme; } else if (f === 'reps' || f === 'prog') it[f] = el.value; else if (f === 'w' || f === 'inc') it[f] = F.fromDisp(pf()) * F.wm(it.exId); else if (f === 'pct') it.pct = Math.max(0, Math.min(100, parseInt(el.value) || 0)); else it[f] = parseInt(el.value) || 0; };
  F.act.dayAdd = () => { E_().days.push({ id: F.uid(), name: 'Dzień ' + (E_().days.length + 1), items: [] }); F.render(true); };
  F.act.dayDel = async b => { const i = +b.dataset.di; if (E_().days[i].items.length && !(await F.confirm({ title: 'Usunąć dzień?', text: 'Dzień wraz z ćwiczeniami zniknie z planu.', ok: 'Usuń', danger: true }))) return; E_().days.splice(i, 1); F.render(true); };
  F.act.dayUp = b => { const i = +b.dataset.di, d = E_().days; [d[i - 1], d[i]] = [d[i], d[i - 1]]; F.render(true); };
  F.act.itUp = b => { const it = E_().days[+b.dataset.di].items, i = +b.dataset.ii; [it[i - 1], it[i]] = [it[i], it[i - 1]]; F.cleanSS(it); F.render(true); };
  F.act.itDown = b => { const it = E_().days[+b.dataset.di].items, i = +b.dataset.ii; [it[i + 1], it[i]] = [it[i], it[i + 1]]; F.cleanSS(it); F.render(true); };
  F.act.itSwap = async b => { const day = E_().days[+b.dataset.di], it = day.items[+b.dataset.ii]; const id = await F.swapSheet(it.exId, day.items.map(x => x.exId)); if (!id) return; const r0 = it.role || F.restRole(it.exId), r1 = F.restRole(id); if ((r0 === 'iso') !== (r1 === 'iso')) { it.rest = F.restFor(id, E_(), r1); it.role = r1; } it.exId = id; F.render(true); };
  F.act.itDel = b => { const it = E_().days[+b.dataset.di].items; it.splice(+b.dataset.ii, 1); F.cleanSS(it); F.render(true); };
  const unify = (items, st, en, src) => { for (let k = st; k <= en; k++) { items[k].sets = src.sets; items[k].rest = src.rest; } };
  F.act.itLink = b => {
    const it = E_().days[+b.dataset.di].items, i = +b.dataset.ii; const linked = it[i].ss && it[i + 1] && it[i + 1].ss === it[i].ss;
    if (linked) { const nid = F.uid(); for (let k = i + 1; k < it.length && it[k].ss === it[i].ss; k++) it[k].ss = nid; }
    else { const src = it[i + 1].ss ? it[i + 1] : it[i]; const id = it[i].ss || it[i + 1].ss || F.uid(); it[i].ss = id; it[i + 1].ss = id; const sets = src.sets, rest = src.rest; F.cleanSS(it); const g = F.ssInfo(it)[i]; if (g) unify(it, g.start, g.end, { sets, rest }); }
    F.cleanSS(it); F.render(true);
  };
  F.bind.itss = el => { const it = E_().days[+el.dataset.di].items; const g = F.ssInfo(it)[+el.dataset.ii]; if (!g) return; const v = Math.max(0, parseInt(el.value) || 0); for (let k = g.start; k <= g.end; k++) it[k][el.dataset.f] = v; };
  F.act.itUnlink = b => { const it = E_().days[+b.dataset.di].items, i = +b.dataset.ii; const id = it[i].ss; delete it[i].ss; const nid = F.uid(); for (let k = i + 1; k < it.length && it[k].ss === id; k++) it[k].ss = nid; F.cleanSS(it); F.render(true); };
  F.act.blkSplit = b => { const it = E_().days[+b.dataset.di].items; const g = F.ssInfo(it)[+b.dataset.ii]; if (!g) return; for (let k = g.start; k <= g.end; k++) delete it[k].ss; F.render(true); };
  F.act.blkMove = b => { const day = E_().days[+b.dataset.di], items = day.items; const runs = runsOf(items); const r = runs.findIndex(x => x[0] === +b.dataset.ii), t = r + +b.dataset.d; if (r < 0 || t < 0 || t >= runs.length) return; [runs[r], runs[t]] = [runs[t], runs[r]]; const out = []; runs.forEach(([a, e]) => out.push(...items.slice(a, e + 1))); day.items = out; F.render(true); };
  F.act.itAddSS = async b => { const day = E_().days[+b.dataset.di], i = +b.dataset.ii; const ids = await F.pickExercises(); if (!ids || !ids.length) return; const g = F.ssInfo(day.items)[i]; const first = day.items[g.start]; const add = ids.map(id => { const ex = exOf(id); return { id: F.uid(), exId: id, sets: first.sets, reps: ex && ex.type === 'time' ? '45' : '10', rest: first.rest, ss: first.ss }; }); day.items.splice(g.end + 1, 0, ...add); F.render(true); };
  F.act.itAdd = async b => {
    const ids = await F.pickExercises(); if (!ids || !ids.length) return; const day = E_().days[+b.dataset.di];
    ids.forEach(id => { const ex = exOf(id); const role = F.restRole(id); day.items.push({ id: F.uid(), exId: id, sets: 3, reps: ex && ex.type === 'time' ? '45' : '8-12', rest: F.restFor(id, E_(), role), role }); }); F.render(true);
  };
  F.act.planSave = async () => {
    const p = E_(); p.meta = p.meta || {}; if (!p.meta.rest) p.meta.rest = { ...F.restProfile(p) }; p.days.forEach(d => F.cleanSS(d.items)); if (!p.name.trim()) p.name = 'Plan bez nazwy'; p.days.forEach(d => { d.items.forEach(i => { if (!i.sets || i.sets < 1) i.sets = 1; }); });
    const isNew = F.ui.edit && F.ui.edit.isNew; await F.savePlan(p); if (isNew) F.setCurPlan(p.id); F.ui.edit = null; F.toast('Plan zapisany', 'hot'); F.go('#/plan/' + p.id);
  };

  /* ---------- wybierak ćwiczeń ---------- */
  // zamiana ćwiczenia: najpierw podobne na tę samą partię, potem cała baza
  const OLY = /podrzut|rwani|clean|snatch|jerk|pullover/i;
  F.similarEx = (id, skip = [], n = 12) => {
    const cur = F.S.ex.get(id); if (!cur) return []; const cdb = (F.EXDB && F.EXDB[id]) || { ca: 'strength' }; const ms = new Set(F.exMuscles(id).s), use = {}, no = new Set([id, ...skip]);
    F.S.sessions.forEach(x => x.exercises.forEach(e => { use[e.exId] = (use[e.exId] || 0) + 1; }));
    const sc = e => { let v = 0; const db = F.EXDB && F.EXDB[e.id]; if (e.equip === cur.equip) v += 3; if (!!e.compound === !!cur.compound) v += 2; F.exMuscles(e.id).s.forEach(m => { if (ms.has(m)) v += 1; }); v += Math.min(use[e.id] || 0, 10) * .5; if (!e.id.startsWith('fe_')) v += 3; if (OLY.test(e.name + ' ' + (e.alias || '')) !== OLY.test(cur.name + ' ' + (cur.alias || ''))) v -= 15; if (db) { if (db.lv === 'expert') v -= 3; if (db.ca && db.ca !== 'strength' && db.ca !== 'powerlifting' && db.ca !== cdb.ca) v -= 20; if (db.me && cdb.me && db.me === cdb.me) v += 1; } return v; };
    return [...F.S.ex.values()].filter(e => e.muscle === cur.muscle && !no.has(e.id) && ((e.type === 'time') === (cur.type === 'time')) && (!F.gymOk || F.gymOk(e))).map(e => [e, sc(e)]).filter(x => x[1] > -10).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name, 'pl')).slice(0, n).map(x => x[0]);
  };
  F.swapSheet = (id, skip = []) => new Promise(res => {
    const cur = F.S.ex.get(id) || {}, list = F.similarEx(id, skip); let done = false; const fin = v => { if (done) return; done = true; res(v); };
    F.sheet(`<p class="dim small sw-h">Zamiast: <b>${E(cur.name || '')}</b>${F.gymCur ? ` · sprzęt: ${E(F.gymCur().n)}` : ''}</p>${list.length ? `<p class="dim small sw-h">Podobne, na tę samą partię</p><div class="exlist">${list.map(e => `<button class="exrow" data-a="swPick" data-id="${E(e.id)}">${mDot(e.muscle)}<span><b>${E(e.name)}</b><small>${F.MUSCLES[e.muscle]} · ${E(e.equip)}</small></span>${ic('chevron-right', 16)}</button>`).join('')}</div>` : ''}
      <button class="btn ghost wide sw-all" data-a="swAll">${ic('search', 18)} Wszystkie ćwiczenia</button>`, { title: 'Zamień ćwiczenie', cls: 'tall', onclose: () => fin(null) });
    F.act.swPick = b => { const v = b.dataset.id; fin(v); F.closeSheet(true); };
    F.act.swAll = async () => { done = true; F.closeSheet(true); const ids = await F.pickExercises({ single: true, muscle: cur.muscle || '' }); res(ids && ids[0] || null); };
  });
  F.pickExercises = ({ single = false, muscle = '' } = {}) => new Promise(res => {
    const sel = new Set(); let q = '', mus = muscle;
    const list = () => {
      const nq = F.norm(q); let arr = [...F.S.ex.values()].filter(e => (!mus || e.muscle === mus) && (!nq || F.norm(e.name + ' ' + (e.alias || '')).includes(nq)));
      const use = {}; F.S.sessions.forEach(x => x.exercises.forEach(e => { use[e.exId] = (use[e.exId] || 0) + 1; }));
      arr.sort((a, b) => (nq ? (F.norm(b.name).startsWith(nq) - F.norm(a.name).startsWith(nq)) : 0) || (use[b.id] || 0) - (use[a.id] || 0) || (b.compound ? 1 : 0) - (a.compound ? 1 : 0) || (a.muscle === 'cardio') - (b.muscle === 'cardio') || a.name.localeCompare(b.name, 'pl'));
      return arr.length ? arr.map(e => `<button class="exrow ${sel.has(e.id) ? 'sel' : ''}" data-a="pickToggle" data-id="${e.id}">${mDot(e.muscle)}<span><b>${E(e.name)}</b><small>${F.MUSCLES[e.muscle]} · ${E(e.equip)}</small></span><i>${ic('check', 16)}</i></button>`).join('') : `<p class="dim pad center">Brak wyników. Dodaj nowe ćwiczenie poniżej.</p>`;
    };
    const chips = () => `<div class="chips"><button class="chip ${!mus ? 'on' : ''}" data-a="pickMus" data-m="">Wszystkie</button>${Object.keys(F.MUSCLES).map(m => `<button class="chip ${mus === m ? 'on' : ''}" data-a="pickMus" data-m="${m}">${F.MUSCLES[m]}</button>`).join('')}</div>`;
    const html = () => `<div class="search">${ic('search', 18)}<input id="pk-q" placeholder="Szukaj ćwiczenia…" value="${E(q)}" autocomplete="off"></div><div id="pk-chips">${chips()}</div><div class="exlist" id="pk-list">${list()}</div>
      <div class="sticky-act"><button class="btn ghost" data-a="pickNew">${ic('plus', 18)} Nowe</button><button class="btn primary grow" data-a="pickOk" id="pk-ok">${single ? 'Wybierz' : 'Dodaj (0)'}</button></div>`;
    let done = false; const fin = v => { if (done) return; done = true; res(v); };
    const el = F.sheet(html(), { title: 'Wybierz ćwiczenie', cls: 'tall', onclose: () => fin(null) });
    const upd = () => { el.querySelector('#pk-list').innerHTML = list(); el.querySelector('#pk-chips').innerHTML = chips(); const ok = el.querySelector('#pk-ok'); ok.textContent = single ? 'Wybierz' : `Dodaj (${sel.size})`; ok.disabled = !sel.size; };
    el.querySelector('#pk-ok').disabled = true;
    el.querySelector('#pk-q').addEventListener('input', e => { q = e.target.value; el.querySelector('#pk-list').innerHTML = list(); });
    F.act.pickToggle = b => { const id = b.dataset.id; if (single) { sel.clear(); sel.add(id); fin([id]); F.closeSheet(true); return; } sel.has(id) ? sel.delete(id) : sel.add(id); b.classList.toggle('sel'); const ok = el.querySelector('#pk-ok'); ok.textContent = `Dodaj (${sel.size})`; ok.disabled = !sel.size; };
    F.act.pickMus = b => { mus = b.dataset.m; upd(); };
    F.act.pickOk = () => { fin([...sel]); F.closeSheet(true); };
    F.act.pickNew = async () => { const ex = await F.exForm(null, el.querySelector('#pk-q').value); if (ex) { if (single) { fin([ex.id]); F.closeSheet(true); } else { sel.add(ex.id); F.sheetReopen && 0; fin([...sel]); F.closeSheet(true); } } };
  });

  /* ---------- formularz ćwiczenia ---------- */
  F.exForm = (id, name = '') => new Promise(res => {
    const ex = id ? exOf(id) : { name, muscle: 'chest', equip: 'Sztanga', type: 'wr', compound: false, alias: '' };
    let done = false; const fin = v => { if (done) return; done = true; res(v); };
    const el = F.sheet(`<label class="fld"><span>Nazwa</span><input id="xf-n" value="${E(ex.name)}" maxlength="70" autocomplete="off"></label>
      <div class="two"><label class="fld"><span>Partia</span><select id="xf-m">${Object.keys(F.MUSCLES).map(m => `<option value="${m}" ${ex.muscle === m ? 'selected' : ''}>${F.MUSCLES[m]}</option>`).join('')}</select></label>
      <label class="fld"><span>Sprzęt</span><select id="xf-e">${F.EQUIP.map(m => `<option ${ex.equip === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>
      <label class="fld"><span>Rodzaj zapisu</span><select id="xf-t">${Object.keys(F.TYPES).map(t => `<option value="${t}" ${ex.type === t ? 'selected' : ''}>${F.TYPES[t]}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" id="xf-c" ${ex.compound ? 'checked' : ''}><i></i><span>Ćwiczenie wielostawowe (dłuższa przerwa)</span></label>
      <div class="fld"><span>Mięśnie pomocnicze</span><div class="chips tiny" id="xf-sec">${Object.keys(F.MUSCLES).filter(m => m !== 'full' && m !== 'cardio').map(m => `<button type="button" class="chip ${(F.secondaryOf(ex.id).includes(m)) ? 'on' : ''}" data-a="xfSec" data-m="${m}">${F.MUSCLES[m]}</button>`).join('')}</div></div>
      <label class="fld"><span>Opis / wskazówki techniczne</span><textarea id="xf-tip" rows="3" placeholder="Ustawienie, tor ruchu, na co uważać…">${E(ex.tip || '')}</textarea></label>
      <div class="fld"><span>Własne zdjęcie</span><div class="xf-img" id="xf-img"></div></div>
      <div class="btn-row">${id ? `<button class="btn danger" data-a="xfDel">${ic('trash-2', 18)}</button>` : ''}<button class="btn primary grow" data-a="xfSave">Zapisz ćwiczenie</button></div>`, { title: id ? 'Edytuj ćwiczenie' : 'Nowe ćwiczenie', onclose: () => fin(null) });
    const g = s => el.querySelector(s);
    let img = ex.img || ''; const drawImg = () => { g('#xf-img').innerHTML = img ? `<img src="${img}" alt=""><button type="button" class="btn ghost sm" data-a="xfImgDel">Usuń zdjęcie</button>` : `<button type="button" class="btn ghost sm" data-a="xfImg">${ic('camera', 16)} Dodaj zdjęcie</button>`; }; drawImg();
    F.act.xfSec = b => b.classList.toggle('on');
    F.act.xfImg = async () => { const f = await F.pickFile('image/*'); if (!f) return; try { img = (await F.fileToImages(f, 640, 120)).data; drawImg(); } catch (e) { F.toast('Nie udało się wczytać zdjęcia', 'err'); } };
    F.act.xfImgDel = () => { img = ''; drawImg(); };
    if (!id) setTimeout(() => g('#xf-n').focus(), 300);
    F.act.xfSave = async () => {
      const n = g('#xf-n').value.trim(); if (!n) { F.toast('Podaj nazwę ćwiczenia'); return; }
      const o = { ...ex, id: id || 'c_' + F.uid(), name: n, muscle: g('#xf-m').value, equip: g('#xf-e').value, type: g('#xf-t').value, compound: g('#xf-c').checked, custom: id ? ex.custom : true, sec: [...el.querySelectorAll('#xf-sec .chip.on')].map(c => c.dataset.m).filter(m => m !== g('#xf-m').value), tip: g('#xf-tip').value.trim(), img };
      await F.saveEx(o); F.rebuild(); fin(o); F.closeSheet(true); F.toast('Zapisano: ' + E(n), 'hot');
    };
    F.act.xfDel = async () => { if (await F.confirm({ title: 'Usunąć ćwiczenie?', text: 'Zapisane treningi zachowają dane, ale ćwiczenie zniknie z biblioteki.', ok: 'Usuń', danger: true })) { await F.delEx(id); fin(null); F.closeSheet(true); F.go('#/exercises'); } };
  });

  /* ================= BIBLIOTEKA ĆWICZEŃ ================= */
  function exercises() {
    const q = F.ui.exQ || '', mus = F.ui.exMus || '';
    return {
      html: `${head('Ćwiczenia', { back: 1, sub: `${F.S.ex.size} w bibliotece`, right: `<button class="btn sm primary" data-a="exNew">${ic('plus', 16)} Nowe</button>` })}
      <div class="search">${ic('search', 18)}<input data-b="exq" placeholder="Szukaj ćwiczenia…" value="${E(q)}" autocomplete="off"></div>
      <div class="chips scroll"><button class="chip ${!mus ? 'on' : ''}" data-a="exMus" data-m="">Wszystkie</button>${Object.keys(F.MUSCLES).map(m => `<button class="chip ${mus === m ? 'on' : ''}" data-a="exMus" data-m="${m}">${F.MUSCLES[m]}</button>`).join('')}</div>
      <div class="exlist" id="ex-list">${exList(q, mus)}</div>`
    };
  }
  function exList(q, mus) {
    const nq = F.norm(q); const arr = [...F.S.ex.values()].filter(e => (!mus || e.muscle === mus) && (!nq || F.norm(e.name + ' ' + (e.alias || '')).includes(nq))).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    if (!arr.length) return empty('search', 'Nic nie znaleziono', 'Spróbuj innej frazy lub dodaj własne ćwiczenie.');
    return arr.map(e => { const p = F.PR[e.id]; const best = p ? (e.type === 'time' ? F.fmtDur(p.dur) : e.type === 'br' ? p.reps + ' powt.' : p.w ? F.fwtu(p.w, e) : '') : ''; return `<a class="exrow" href="#/ex/${E(e.id)}">${mDot(e.muscle)}<span><b>${E(e.name)}</b><small>${F.MUSCLES[e.muscle]} · ${E(e.equip)}${e.custom ? ' · własne' : ''}</small></span>${best ? `<em>${best}</em>` : ''}${ic('chevron-right', 16)}</a>`; }).join('');
  }
  F.bind.exq = el => { F.ui.exQ = el.value; F.$('#ex-list').innerHTML = exList(F.ui.exQ, F.ui.exMus || ''); };
  F.act.exMus = b => { F.ui.exMus = b.dataset.m; F.render(true); };
  F.act.exNew = async () => { const ex = await F.exForm(null); if (ex) F.render(true); };

  /* ================= SZCZEGÓŁY ĆWICZENIA ================= */
  function exDetail(id) {
    const ex = exOf(id); if (!ex) return { html: head('Ćwiczenie', { back: 1 }) + empty('dumbbell', 'Nie znaleziono ćwiczenia', 'To ćwiczenie zostało usunięte.') };
    const hist = F.exHistory(id); const p = F.PR[id]; const m = F.ui.exMetric;
    const isT = ex.type === 'time', isB = ex.type === 'br';
    const metrics = isT ? [['dur', 'Czas']] : isB ? [['reps', 'Powtórzenia'], ['vol', 'Objętość']] : [['e1', '1RM'], ['w', 'Ciężar'], ['vol', 'Objętość'], ['reps', 'Powtórzenia']];
    const mk = metrics.find(x => x[0] === m) ? m : metrics[0][0];
    const best = {}; hist.forEach(h => { const v = h[mk]; if (best[mk] == null || v > best[mk]) best[mk] = v; });
    let prevMax = -1; const pts = hist.map(h => { const v = h[mk]; const isPR = v > prevMax && prevMax >= 0; if (v > prevMax) prevMax = v; const fv = mk === 'dur' ? F.fmtDur(v) : (mk === 'reps' ? v : mk === 'vol' || mk === 'w' || mk === 'e1' ? F.fw(v) + ' ' + F.unit() : v); return { x: h.ts, y: (mk === 'w' || mk === 'e1' || mk === 'vol') ? F.toDisp(v) : v, pr: isPR, tip: `${F.fmtDate(h.ts)}: ${fv}` }; });
    const cards = isT ? [['Najdłuższy czas', p ? F.fmtDur(p.dur) : '–']] : isB ? [['Maks. powtórzeń', p ? p.reps : '–']] : [['Maks. ciężar', p && p.w ? F.fwtu(p.w, ex) : '–'], ['Najlepsze 1RM', p && p.e1 ? F.fwu(p.e1) : '–'], ['Najcięższa seria (obj.)', p && p.vol ? F.fwu(p.vol) : '–'], ['Maks. powtórzeń', p ? p.reps : '–']];
    // tabela rep max
    let rmTable = ''; if (p && !isT && !isB && Object.keys(p.repAt).length) {
      const rows = []; for (let r = 1; r <= 12; r++) if (p.repAt[r]) rows.push(`<div class="rm"><span>${r} powt.</span><b>${F.fwu(p.repAt[r])}</b></div>`);
      if (rows.length) rmTable = `<h3 class="sec">Rekordy na powtórzenia</h3><div class="rmgrid">${rows.join('')}</div>`;
    }
    const sug = F.suggest(id); const histRows = [...hist].reverse().slice(0, 25).map(h => `<a class="hrow" href="#/session/${h.sid}"><span class="hd">${F.fmtDate(h.ts)}</span><span class="hs">${h.sets.map(s => ex.type === 'time' ? F.fmtDur(s.r) : isB ? s.r : `${F.fw(s.w)}×${s.r}`).join(' · ')}</span></a>`).join('');
    return {
      html: `${head(E(ex.name), { back: 1, sub: `${F.MUSCLES[ex.muscle]} · ${E(ex.equip)}`, right: `<button class="ibtn" data-a="exEdit" data-id="${id}" aria-label="Edytuj">${ic('pencil', 20)}</button>` })}
      <div class="tiles two">${cards.map(c => `<div class="tile cut"><span class="tl">${ic('trophy', 15)} ${c[0]}</span><b class="tv sm">${c[1]}</b></div>`).join('')}</div>
      ${sug ? `<div class="banner hot"><div>${ic('target', 20)}</div><p><b>Cel na następny trening</b><br><small>${ex.type === 'time' ? F.fmtDur(sug.r) : isB ? sug.r + ' powt.' : F.fwtu(sug.w, ex) + ' × ' + sug.r} — ${sug.note}</small></p></div>` : ''}
      <section class="card cut"><div class="seg m${metrics.length}">${metrics.map(x => `<button class="${x[0] === mk ? 'on' : ''}" data-a="exMetric" data-m="${x[0]}">${x[1]}</button>`).join('')}</div>${F.chart.line(pts, { w: 340, h: 200 })}<p class="dim small">Złote punkty oznaczają pobite rekordy.</p></section>
      ${rmTable}
      <section class="card cut tech"><h3>${ic('info', 18)} Technika i mięśnie</h3>${F.techHtml(id)}</section>
      <h3 class="sec">Historia (${hist.length})</h3>${histRows ? `<div class="hlist">${histRows}</div>` : empty('history', 'Jeszcze nie trenowałeś tego ćwiczenia', 'Dodaj je do treningu, a tu pojawi się cała historia.')}`
    };
  }
  F.act.exMetric = b => { F.ui.exMetric = b.dataset.m; F.render(true); };
  F.act.exEdit = async b => { const ex = await F.exForm(b.dataset.id); if (ex) F.render(true); };

  /* ================= TABBAR ================= */
  F.act.tab = b => { const t = b.dataset.tab; if (t === 'workout') { if (F.S.draft) F.go('#/workout'); else F.startFlow(); } else F.go('#/' + t); };
})();
