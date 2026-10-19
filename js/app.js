/* FORGE — router, ekran startowy, plany, biblioteka ćwiczeń */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc;
  F.views = {}; F.ui = { exMetric: 'e1', statTab: 'over', histQ: '' };
  const exOf = id => F.S.ex.get(id);
  const exName = id => (exOf(id) || { name: 'Usunięte ćwiczenie' }).name;
  F.exName = exName;
  const mDot = m => `<i class="mdot" style="--mc:${F.MUSCLE_COLORS[m] || '#888'}"></i>`;
  F.mDot = mDot;

  /* ---------- helpers widoku ---------- */
  const head = (title, o = {}) => `<header class="ph">${o.back ? `<button class="ibtn back" data-a="back" aria-label="Wstecz">${ic('chevron-left', 24)}</button>` : ''}<div class="ph-t"><h1>${title}</h1>${o.sub ? `<p>${o.sub}</p>` : ''}</div><div class="ph-r">${o.right || ''}</div></header>`;
  F.head = head;
  const empty = (icon, title, text, cta) => `<div class="empty">${ic(icon, 40)}<h3>${title}</h3><p>${text}</p>${cta || ''}</div>`;
  F.empty = empty;
  F.act.back = () => { if (history.length > 1) history.back(); else location.hash = '#/home'; };
  F.go = h => { location.hash = h; };

  /* ---------- plan / następny trening ---------- */
  F.planOf = id => F.S.plans.find(p => p.id === id);
  F.nextWorkout = () => {
    if (!F.S.plans.length) return null;
    const last = F.S.sessions.find(s => s.planId && F.planOf(s.planId));
    const plan = (last && F.planOf(last.planId)) || F.S.plans.find(p => p.days.length) || F.S.plans[0];
    if (!plan || !plan.days.length) return null;
    let di = 0; if (last && last.planId === plan.id) { const i = plan.days.findIndex(d => d.id === last.dayId); di = i >= 0 ? (i + 1) % plan.days.length : 0; }
    return { plan, day: plan.days[di], di };
  };
  const estMin = day => Math.round(day.items.reduce((a, it) => a + (it.sets || 3) * (45 + (it.rest || 90)), 0) / 60);

  /* ---------- ROUTER ---------- */
  const routes = [
    [/^#\/home$/, () => home(), 'home'], [/^#\/plans$/, () => plans(), 'plans'], [/^#\/plan\/([^/]+)$/, m => planDetail(m[1]), 'plans'],
    [/^#\/plan\/([^/]+)\/edit$/, m => planEdit(m[1]), 'plans'], [/^#\/exercises$/, () => exercises(), 'plans'], [/^#\/ex\/([^/]+)$/, m => exDetail(m[1]), 'stats'],
    [/^#\/history$/, () => F.views.history(), 'history'], [/^#\/session\/([^/]+)$/, m => F.views.session(m[1]), 'history'],
    [/^#\/stats$/, () => F.views.stats(), 'stats'], [/^#\/tools$/, () => F.views.tools(), 'home'], [/^#\/settings$/, () => F.views.settings(), 'home'],
    [/^#\/workout$/, () => F.views.workout(), 'workout'], [/^#\/import(\?.*)?$/, () => F.views.import(), 'plans']
  ];
  let curTab = 'home';
  F.render = (keepScroll) => {
    const h = location.hash || '#/home'; const view = F.$('#view'); let out = null;
    for (const [re, fn, tab] of routes) { const m = h.match(re); if (m) { out = fn(m); curTab = tab; break; } }
    if (!out) { location.hash = '#/home'; return; }
    const sy = keepScroll ? window.scrollY : 0;
    document.body.dataset.route = curTab; document.body.classList.toggle('in-workout', curTab === 'workout');
    view.className = 'view' + (keepScroll ? '' : ' enter'); view.innerHTML = out.html;
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
    const strip = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'].map((l, i) => { const ts = ws + i * 864e5, k = F.dayKey(ts), tr = byDay[k]; return `<div class="wd ${tr ? 'tr' : ''} ${k === todayK ? 'today' : ''} ${ts > Date.now() ? 'fut' : ''}"><span>${l}</span><i>${tr ? ic('check', 14) : new Date(ts).getDate()}</i></div>`; }).join('');
    // hero
    let hero;
    if (d) {
      const done = d.exercises.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0);
      hero = `<section class="hero cut live"><div class="hero-k">Trening w toku</div><h2>${E(d.name || 'Trening')}</h2><p class="hero-m"><span data-wtime>${F.fmtDur((Date.now() - d.start) / 1000)}</span> · ${done} serii zaliczonych</p><a class="forge-btn" href="#/workout"><span>${ic('play', 22)} Wróć do treningu</span></a></section>`;
    } else if (nx) {
      const names = nx.day.items.slice(0, 4).map(it => exName(it.exId));
      hero = `<section class="hero cut"><div class="hero-k">${E(nx.plan.name)} · dzień ${nx.di + 1} z ${nx.plan.days.length}</div><h2>${E(nx.day.name)}</h2>
        <ul class="hero-l">${names.map(n => `<li>${E(n)}</li>`).join('')}${nx.day.items.length > 4 ? `<li class="more">+ ${nx.day.items.length - 4} więcej</li>` : ''}</ul>
        <p class="hero-m">${nx.day.items.length} ćwiczeń · ok. ${estMin(nx.day)} min</p>
        <button class="forge-btn" data-a="startNext"><span>${ic('flame', 22)} Zaczynamy</span></button></section>`;
    } else {
      hero = `<section class="hero cut"><div class="hero-k">Zacznij od zera</div><h2>Pora wykuć plan</h2><p class="hero-m">Zbuduj własny plan, wgraj ten, którego używasz dotąd (PDF lub zrzut ekranu) albo wystartuj z gotowego szablonu.</p>
        <div class="btn-row"><a class="btn primary" href="#/import">${ic('scan-text', 18)} Importuj plan</a><a class="btn ghost" href="#/plans">${ic('clipboard-list', 18)} Plany</a></div></section>`;
    }
    // rekordy
    const prs = []; F.S.sessions.slice(0, 8).forEach(se => (se.prs || []).forEach(p => prs.push({ ...p, ts: se.start }))); const prShow = prs.slice(0, 6);
    // banery
    let banners = '';
    if (t.count > 0 && Date.now() - (s.lastBackup || 0) > 14 * 864e5) banners += `<div class="banner"><div>${ic('download', 20)}</div><p><b>Zrób kopię zapasową</b><br><small>${t.count} treningów w pamięci urządzenia. Zapisz je w pliku.</small></p><button class="btn sm primary" data-a="backupNow">Zapisz</button></div>`;
    if (F.installEvt && !F.isStandalone()) banners += `<div class="banner"><div>${ic('smartphone', 20)}</div><p><b>Zainstaluj FORGE</b><br><small>Pełny ekran i działanie bez internetu.</small></p><button class="btn sm primary" data-a="installApp">Instaluj</button></div>`;
    else if (F.isIOS() && !F.isStandalone() && !s.installDismissed) banners += `<div class="banner"><div>${ic('smartphone', 20)}</div><p><b>Dodaj do ekranu początkowego</b><br><small>Safari → Udostępnij → „Do ekranu początkowego”.</small></p><button class="ibtn" data-a="dismissInstall" aria-label="Ukryj">${ic('x', 18)}</button></div>`;
    return {
      html: `${head(`${greet}${s.name ? ', ' + E(s.name) : ''}`, { sub: F.fmtDateLong(Date.now()), right: `<a class="ibtn" href="#/settings" aria-label="Ustawienia">${ic('settings', 22)}</a>` })}
      ${hero}
      <p class="quote">${E(quote)}</p>
      ${banners}
      <section class="card cut week"><div class="week-top"><div><h3>Ten tydzień</h3><p class="dim">${wk.count} z ${goal} treningów</p></div>${F.chart.ring(Math.min(1, wk.count / goal), 64, 7, `<b>${wk.count}<small>/${goal}</small></b>`)}</div><div class="strip">${strip}</div></section>
      <div class="tiles">
        <div class="tile cut"><span class="tl">${ic('flame', 16)} Seria tygodni</span><b class="tv" data-count="${F.weekStreak()}">0</b><small>cel ${goal}×/tydz.</small></div>
        <div class="tile cut"><span class="tl">${ic('weight', 16)} Tonaż w tygodniu</span><b class="tv" data-count="${F.toDisp(wk.vol) >= 10000 ? F.toDisp(wk.vol) / 1000 : F.toDisp(wk.vol)}" data-dec="${F.toDisp(wk.vol) >= 10000 ? 1 : 0}" data-suf="${F.toDisp(wk.vol) >= 10000 ? ' t' : ' ' + F.unit()}">0</b><small>łącznie ${F.fmtVol(t.vol)}</small></div>
        <div class="tile cut"><span class="tl">${ic('trophy', 16)} Rekordy</span><b class="tv" data-count="${F.prEvents()}">0</b><small>pobitych w sumie</small></div>
        <div class="tile cut"><span class="tl">${ic('calendar', 16)} Treningi</span><b class="tv" data-count="${t.count}">0</b><small>${F.fmtDurHuman(t.dur)} pod sztangą</small></div>
      </div>
      <section class="card cut rank"><div class="rank-top"><div><span class="dim">Ranga</span><h3 class="rk">${rk.name}</h3></div><div class="xp">${F.fmtNum(rk.xp, 0)} <small>XP</small></div></div><div class="bar"><i style="width:${(rk.pct * 100).toFixed(1)}%"></i></div><p class="dim">${rk.next ? `Jeszcze ${F.fmtNum(rk.toNext, 0)} XP do rangi <b>${rk.next}</b>` : 'Maksymalna ranga. Szacunek.'}</p></section>
      ${prShow.length ? `<h3 class="sec">Świeże rekordy</h3><div class="prow">${prShow.map(p => `<a class="prchip cut" href="#/ex/${E(p.exId)}">${ic('trophy', 16)}<span><b>${E(exName(p.exId))}</b><small>${E(p.text)} · ${F.relDay(p.ts)}</small></span></a>`).join('')}</div>` : ''}
      <h3 class="sec">Narzędzia</h3>
      <div class="qa">
        <a class="qa-i cut" href="#/import">${ic('scan-text', 24)}<span>Import planu</span></a>
        <a class="qa-i cut" href="#/tools">${ic('calculator', 24)}<span>Kalkulatory</span></a>
        <a class="qa-i cut" href="#/exercises">${ic('dumbbell', 24)}<span>Ćwiczenia</span></a>
        <a class="qa-i cut" href="#/stats" data-a="goBody">${ic('scale', 24)}<span>Waga ciała</span></a>
      </div>`,
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
  F.act.startNext = () => { const nx = F.nextWorkout(); if (nx) F.startWorkout({ plan: nx.plan, day: nx.day }); };
  F.act.backupNow = () => F.doBackup();

  /* ================= PLANY ================= */
  function plans() {
    const list = F.S.plans.map(p => {
      const n = p.days.reduce((a, d) => a + d.items.length, 0); const last = F.S.sessions.find(s => s.planId === p.id);
      return `<a class="plan cut" href="#/plan/${p.id}"><div class="plan-i">${ic('clipboard-list', 22)}</div><div class="plan-b"><h3>${E(p.name)}</h3><p>${p.days.length} ${p.days.length === 1 ? 'dzień' : 'dni'} · ${n} ćwiczeń${last ? ` · ostatnio ${F.relDay(last.start).toLowerCase()}` : ''}</p></div>${ic('chevron-right', 20)}</a>`;
    }).join('');
    return {
      html: `${head('Plany', { sub: 'Twoje programy treningowe', right: `<button class="btn sm primary" data-a="newPlan">${ic('plus', 16)} Nowy</button>` })}
      ${F.S.plans.length ? `<div class="stack">${list}</div>` : empty('clipboard-list', 'Brak planów', 'Stwórz własny plan, zaimportuj go z PDF-a lub zrzutu ekranu albo weź gotowy szablon.')}
      <a class="importcard cut" href="#/import"><div>${ic('scan-text', 30)}</div><p><b>Importuj plan z pliku</b><small>PDF, zrzut ekranu, zdjęcie, tekst, CSV z innej aplikacji</small></p>${ic('chevron-right', 20)}</a>
      <div class="btn-row split"><button class="btn ghost" data-a="templates">${ic('sparkles', 18)} Plany startowe</button><a class="btn ghost" href="#/exercises">${ic('dumbbell', 18)} Ćwiczenia</a></div>`
    };
  }
  F.act.newPlan = () => { const p = { id: F.uid(), name: 'Nowy plan', created: Date.now(), days: [{ id: F.uid(), name: 'Dzień 1', items: [] }] }; F.ui.edit = { plan: p, isNew: true }; F.go('#/plan/' + p.id + '/edit'); };
  F.act.templates = () => {
    F.sheet(`<p class="sheet-p dim">Dodaj gotowy plan jednym dotknięciem. Potem edytuj go dowolnie.</p><div class="stack">${F.TEMPLATES.map((t, i) => `<button class="tpl cut" data-a="addTpl" data-i="${i}"><b>${E(t[0])}</b><small>${E(t[1])}</small><em>${t[2].length} ${t[2].length === 1 ? 'dzień' : 'dni'} · ${t[2].reduce((a, d) => a + d[1].length, 0)} ćwiczeń</em></button>`).join('')}</div>`, { title: 'Plany startowe' });
  };
  F.act.addTpl = async b => {
    const t = F.TEMPLATES[+b.dataset.i];
    const plan = { id: F.uid(), name: t[0], created: Date.now(), days: t[2].map(d => ({ id: F.uid(), name: d[0], items: d[1].map(i => ({ id: F.uid(), exId: i[0], sets: i[1], reps: String(i[2]), rest: i[3] })) })) };
    await F.savePlan(plan); F.closeSheet(true); F.toast('Dodano plan: ' + E(t[0]), 'hot'); F.go('#/plan/' + plan.id);
  };

  function planDetail(id) {
    const p = F.planOf(id); if (!p) return { html: head('Plan', { back: 1 }) + empty('clipboard-list', 'Nie znaleziono planu', 'Ten plan został usunięty.') };
    return {
      html: `${head(E(p.name), { back: 1, sub: `${p.days.length} dni`, right: `<button class="ibtn" data-a="planMenu" data-id="${p.id}" aria-label="Więcej">${ic('ellipsis', 22)}</button>` })}
      ${p.days.map((d, di) => `<section class="card cut day"><div class="day-h"><div><span class="dim">Dzień ${di + 1}</span><h3>${E(d.name)}</h3></div><button class="btn sm primary" data-a="startDay" data-p="${p.id}" data-d="${d.id}">${ic('play', 16)} Start</button></div>
        ${d.items.length ? `<ul class="items">${d.items.map(it => `<li><a href="#/ex/${E(it.exId)}">${mDot((exOf(it.exId) || {}).muscle)}<span>${E(exName(it.exId))}</span></a><b>${it.sets}×${E(it.reps || '')}</b></li>`).join('')}</ul>` : `<p class="dim pad">Ten dzień jest pusty.</p>`}
        <p class="dim foot">${d.items.length} ćwiczeń · ok. ${estMin(d)} min</p></section>`).join('')}
      <a class="btn ghost wide" href="#/plan/${p.id}/edit">${ic('pencil', 18)} Edytuj plan</a>`
    };
  }
  F.act.startDay = b => { const p = F.planOf(b.dataset.p); const d = p && p.days.find(x => x.id === b.dataset.d); if (d) F.startWorkout({ plan: p, day: d }); };
  F.act.planMenu = b => {
    const id = b.dataset.id;
    F.sheet(`<div class="menu"><button data-a="planEditGo" data-id="${id}">${ic('pencil', 20)}Edytuj</button><button data-a="planDup" data-id="${id}">${ic('copy', 20)}Duplikuj</button><button data-a="planText" data-id="${id}">${ic('clipboard-paste', 20)}Kopiuj jako tekst</button><button data-a="planJson" data-id="${id}">${ic('file-json', 20)}Eksportuj do pliku</button><button class="danger" data-a="planDel" data-id="${id}">${ic('trash-2', 20)}Usuń plan</button></div>`, { title: 'Plan' });
  };
  F.act.planEditGo = b => { F.closeSheet(true); F.go('#/plan/' + b.dataset.id + '/edit'); };
  F.act.planDup = async b => { const p = F.planOf(b.dataset.id); const c = JSON.parse(JSON.stringify(p)); c.id = F.uid(); c.name = p.name + ' (kopia)'; c.created = Date.now(); c.days.forEach(d => { d.id = F.uid(); d.items.forEach(i => i.id = F.uid()); }); await F.savePlan(c); F.closeSheet(true); F.toast('Zduplikowano plan'); F.go('#/plan/' + c.id); };
  F.planToText = p => p.days.map(d => d.name + '\n' + d.items.map(i => `- ${exName(i.exId)} ${i.sets}x${i.reps}${i.rest ? ' (przerwa ' + i.rest + 's)' : ''}`).join('\n')).join('\n\n');
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
      ${p.days.map((d, di) => `<section class="card cut day edit" data-di="${di}">
        <div class="day-h"><label class="fld grow"><span>Dzień ${di + 1}</span><input data-b="dname" data-di="${di}" value="${E(d.name)}" maxlength="50"></label>
        <div class="mini-btns"><button class="ibtn" data-a="dayUp" data-di="${di}" ${di === 0 ? 'disabled' : ''} aria-label="W górę">${ic('arrow-up', 18)}</button><button class="ibtn" data-a="dayDel" data-di="${di}" aria-label="Usuń dzień">${ic('trash-2', 18)}</button></div></div>
        ${d.items.map((it, ii) => `<div class="pi"><div class="pi-top">${mDot((exOf(it.exId) || {}).muscle)}<b>${E(exName(it.exId))}</b><div class="mini-btns"><button class="ibtn" data-a="itUp" data-di="${di}" data-ii="${ii}" ${ii === 0 ? 'disabled' : ''} aria-label="W górę">${ic('arrow-up', 16)}</button><button class="ibtn" data-a="itDown" data-di="${di}" data-ii="${ii}" ${ii === d.items.length - 1 ? 'disabled' : ''} aria-label="W dół">${ic('arrow-down', 16)}</button><button class="ibtn" data-a="itDel" data-di="${di}" data-ii="${ii}" aria-label="Usuń">${ic('x', 16)}</button></div></div>
          <div class="pi-f four"><label><span>Serie</span><input inputmode="numeric" data-b="it" data-f="sets" data-di="${di}" data-ii="${ii}" value="${it.sets}"></label><label><span>Powtórzenia</span><input data-b="it" data-f="reps" data-di="${di}" data-ii="${ii}" value="${E(it.reps || '')}" placeholder="8-10"></label><label><span>Przerwa s</span><input inputmode="numeric" data-b="it" data-f="rest" data-di="${di}" data-ii="${ii}" value="${it.rest || ''}" placeholder="90"></label><label><span>Ciężar ${F.unit()}</span><input inputmode="decimal" data-b="it" data-f="w" data-di="${di}" data-ii="${ii}" value="${it.w ? F.fw(it.w).replace(',', '.') : ''}" placeholder="–"></label></div></div>`).join('')}
        <button class="btn ghost wide" data-a="itAdd" data-di="${di}">${ic('plus', 18)} Dodaj ćwiczenia</button></section>`).join('')}
      <button class="btn ghost wide" data-a="dayAdd">${ic('plus', 18)} Dodaj dzień treningowy</button>`
    };
  }
  const E_ = () => F.ui.edit.plan;
  F.bind.pname = el => { E_().name = el.value; };
  F.bind.dname = el => { E_().days[+el.dataset.di].name = el.value; };
  F.bind.it = el => { const it = E_().days[+el.dataset.di].items[+el.dataset.ii]; const f = el.dataset.f; it[f] = f === 'reps' ? el.value : f === 'w' ? F.fromDisp(parseFloat(String(el.value).replace(',', '.')) || 0) : (parseInt(el.value) || 0); };
  F.act.dayAdd = () => { E_().days.push({ id: F.uid(), name: 'Dzień ' + (E_().days.length + 1), items: [] }); F.render(true); };
  F.act.dayDel = async b => { const i = +b.dataset.di; if (E_().days[i].items.length && !(await F.confirm({ title: 'Usunąć dzień?', text: 'Dzień wraz z ćwiczeniami zniknie z planu.', ok: 'Usuń', danger: true }))) return; E_().days.splice(i, 1); F.render(true); };
  F.act.dayUp = b => { const i = +b.dataset.di, d = E_().days; [d[i - 1], d[i]] = [d[i], d[i - 1]]; F.render(true); };
  F.act.itUp = b => { const it = E_().days[+b.dataset.di].items, i = +b.dataset.ii; [it[i - 1], it[i]] = [it[i], it[i - 1]]; F.render(true); };
  F.act.itDown = b => { const it = E_().days[+b.dataset.di].items, i = +b.dataset.ii; [it[i + 1], it[i]] = [it[i], it[i + 1]]; F.render(true); };
  F.act.itDel = b => { E_().days[+b.dataset.di].items.splice(+b.dataset.ii, 1); F.render(true); };
  F.act.itAdd = async b => {
    const ids = await F.pickExercises(); if (!ids || !ids.length) return; const day = E_().days[+b.dataset.di];
    ids.forEach(id => { const ex = exOf(id); const rest = ex && ex.compound ? 120 : 75; day.items.push({ id: F.uid(), exId: id, sets: 3, reps: ex && ex.type === 'time' ? '45' : '8-12', rest }); }); F.render(true);
  };
  F.act.planSave = async () => {
    const p = E_(); if (!p.name.trim()) p.name = 'Plan bez nazwy'; p.days.forEach(d => { d.items.forEach(i => { if (!i.sets || i.sets < 1) i.sets = 1; }); });
    await F.savePlan(p); F.ui.edit = null; F.toast('Plan zapisany', 'hot'); F.go('#/plan/' + p.id);
  };

  /* ---------- wybierak ćwiczeń ---------- */
  F.pickExercises = ({ single = false } = {}) => new Promise(res => {
    const sel = new Set(); let q = '', mus = '';
    const list = () => {
      const nq = F.norm(q); let arr = [...F.S.ex.values()].filter(e => (!mus || e.muscle === mus) && (!nq || F.norm(e.name + ' ' + (e.alias || '')).includes(nq)));
      arr.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
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
      <div class="btn-row">${id ? `<button class="btn danger" data-a="xfDel">${ic('trash-2', 18)}</button>` : ''}<button class="btn primary grow" data-a="xfSave">Zapisz ćwiczenie</button></div>`, { title: id ? 'Edytuj ćwiczenie' : 'Nowe ćwiczenie', onclose: () => fin(null) });
    const g = s => el.querySelector(s);
    if (!id) setTimeout(() => g('#xf-n').focus(), 300);
    F.act.xfSave = async () => {
      const n = g('#xf-n').value.trim(); if (!n) { F.toast('Podaj nazwę ćwiczenia'); return; }
      const o = { ...ex, id: id || 'c_' + F.uid(), name: n, muscle: g('#xf-m').value, equip: g('#xf-e').value, type: g('#xf-t').value, compound: g('#xf-c').checked, custom: id ? ex.custom : true };
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
    return arr.map(e => { const p = F.PR[e.id]; const best = p ? (e.type === 'time' ? F.fmtDur(p.dur) : e.type === 'br' ? p.reps + ' powt.' : p.w ? F.fwu(p.w) : '') : ''; return `<a class="exrow" href="#/ex/${E(e.id)}">${mDot(e.muscle)}<span><b>${E(e.name)}</b><small>${F.MUSCLES[e.muscle]} · ${E(e.equip)}${e.custom ? ' · własne' : ''}</small></span>${best ? `<em>${best}</em>` : ''}${ic('chevron-right', 16)}</a>`; }).join('');
  }
  F.bind.exq = el => { F.ui.exQ = el.value; F.$('#ex-list').innerHTML = exList(F.ui.exQ, F.ui.exMus || ''); };
  F.act.exMus = b => { F.ui.exMus = b.dataset.m; F.render(true); };
  F.act.exNew = async () => { const ex = await F.exForm(null); if (ex) F.render(true); };

  /* ================= SZCZEGÓŁY ĆWICZENIA ================= */
  function exDetail(id) {
    const ex = exOf(id); if (!ex) return { html: head('Ćwiczenie', { back: 1 }) + empty('dumbbell', 'Nie znaleziono ćwiczenia', 'To ćwiczenie zostało usunięte.') };
    const hist = F.exHistory(id); const p = F.PR[id]; const m = F.ui.exMetric;
    const isT = ex.type === 'time', isB = ex.type === 'br';
    const metrics = isT ? [['dur', 'Czas']] : isB ? [['reps', 'Powtórzenia'], ['vol', 'Objętość']] : [['e1', '1RM (szac.)'], ['w', 'Max ciężar'], ['vol', 'Objętość'], ['reps', 'Powtórzenia']];
    const mk = metrics.find(x => x[0] === m) ? m : metrics[0][0];
    const best = {}; hist.forEach(h => { const v = h[mk]; if (best[mk] == null || v > best[mk]) best[mk] = v; });
    let prevMax = -1; const pts = hist.map(h => { const v = h[mk]; const isPR = v > prevMax && prevMax >= 0; if (v > prevMax) prevMax = v; const fv = mk === 'dur' ? F.fmtDur(v) : (mk === 'reps' ? v : mk === 'vol' || mk === 'w' || mk === 'e1' ? F.fw(v) + ' ' + F.unit() : v); return { x: h.ts, y: (mk === 'w' || mk === 'e1' || mk === 'vol') ? F.toDisp(v) : v, pr: isPR, tip: `${F.fmtDate(h.ts)}: ${fv}` }; });
    const cards = isT ? [['Najdłuższy czas', p ? F.fmtDur(p.dur) : '–']] : isB ? [['Max powtórzeń', p ? p.reps : '–']] : [['Max ciężar', p && p.w ? F.fwu(p.w) : '–'], ['Najlepsze 1RM', p && p.e1 ? F.fwu(p.e1) : '–'], ['Najcięższa seria (obj.)', p && p.vol ? F.fwu(p.vol) : '–'], ['Max powtórzeń', p ? p.reps : '–']];
    // tabela rep max
    let rmTable = ''; if (p && !isT && !isB && Object.keys(p.repAt).length) {
      const rows = []; for (let r = 1; r <= 12; r++) if (p.repAt[r]) rows.push(`<div class="rm"><span>${r} powt.</span><b>${F.fwu(p.repAt[r])}</b></div>`);
      if (rows.length) rmTable = `<h3 class="sec">Rekordy na powtórzenia</h3><div class="rmgrid">${rows.join('')}</div>`;
    }
    const sug = F.suggest(id); const histRows = [...hist].reverse().slice(0, 25).map(h => `<a class="hrow" href="#/session/${h.sid}"><span class="hd">${F.fmtDate(h.ts)}</span><span class="hs">${h.sets.map(s => ex.type === 'time' ? F.fmtDur(s.r) : isB ? s.r : `${F.fw(s.w)}×${s.r}`).join(' · ')}</span></a>`).join('');
    return {
      html: `${head(E(ex.name), { back: 1, sub: `${F.MUSCLES[ex.muscle]} · ${E(ex.equip)}`, right: `<button class="ibtn" data-a="exEdit" data-id="${id}" aria-label="Edytuj">${ic('pencil', 20)}</button>` })}
      <div class="tiles two">${cards.map(c => `<div class="tile cut"><span class="tl">${ic('trophy', 15)} ${c[0]}</span><b class="tv sm">${c[1]}</b></div>`).join('')}</div>
      ${sug ? `<div class="banner hot"><div>${ic('target', 20)}</div><p><b>Cel na następny trening</b><br><small>${ex.type === 'time' ? F.fmtDur(sug.r) : isB ? sug.r + ' powt.' : F.fwu(sug.w) + ' × ' + sug.r} — ${sug.note}</small></p></div>` : ''}
      <section class="card cut"><div class="seg">${metrics.map(x => `<button class="${x[0] === mk ? 'on' : ''}" data-a="exMetric" data-m="${x[0]}">${x[1]}</button>`).join('')}</div>${F.chart.line(pts, { w: 340, h: 200 })}<p class="dim small">Złote punkty oznaczają pobite rekordy.</p></section>
      ${rmTable}
      <h3 class="sec">Historia (${hist.length})</h3>${histRows ? `<div class="hlist">${histRows}</div>` : empty('history', 'Jeszcze nie trenowałeś tego ćwiczenia', 'Dodaj je do treningu, a tu pojawi się cała historia.')}`
    };
  }
  F.act.exMetric = b => { F.ui.exMetric = b.dataset.m; F.render(true); };
  F.act.exEdit = async b => { const ex = await F.exForm(b.dataset.id); if (ex) F.render(true); };

  /* ================= TABBAR ================= */
  F.act.tab = b => { const t = b.dataset.tab; if (t === 'workout') { if (F.S.draft) F.go('#/workout'); else F.startFlow(); } else F.go('#/' + t); };
})();
