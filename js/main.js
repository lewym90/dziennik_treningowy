/* FORGE — start aplikacji, pasek zakładek, service worker */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s);
  const tabs = () => `<div class="tb">
    <button class="t" data-a="tab" data-tab="home" aria-label="Dziś">${F.gly(0, 25)}<span>Dziś</span></button>
    <button class="t" data-a="tab" data-tab="plans" aria-label="Plany">${F.gly(1, 25)}<span>Plany</span></button>
    <div class="mid ${F.S.draft ? 'live' : ''}"><button data-a="tab" data-tab="workout" aria-label="${F.S.draft ? 'Wróć do treningu' : 'Rozpocznij trening'}">${ic(F.S.draft ? 'play' : 'flame', 34)}</button></div>
    <button class="t" data-a="tab" data-tab="history" aria-label="Historia">${F.gly(2, 25)}<span>Historia</span></button>
    <button class="t" data-a="tab" data-tab="stats" aria-label="Postępy">${F.gly(3, 25)}<span>Postępy</span></button></div>`;
  // pasek budujemy od nowa tylko, gdy zmienia się stan treningu; inaczej przełączamy zakładkę, żeby wskaźnik mógł płynnie przejechać
  let tbLive = null;
  F.drawTabs = () => { const el = F.$('#tabbar'); const live = !!F.S.draft; const fresh = live !== tbLive || !el.firstChild; if (fresh) { el.innerHTML = tabs(); tbLive = live; } const cur = document.body.dataset.route; F.$$('#tabbar [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === cur)); if (F.movePill) F.movePill(fresh); };
  const _r = F.render; F.render = k => { const go = () => { _r(k); F.drawTabs(); }; if (k && F.renderMorph) F.renderMorph(go); else go(); };

  F.act.reload = () => location.reload();

  async function boot() {
    const t0 = performance.now();
    try { await F.load(); } catch (e) { console.error(e); }
    F.applyAccent(); if (F.applyMotion) F.applyMotion(); F.resumeRest();
    const q = new URLSearchParams(location.search);
    if (!location.hash) location.hash = '#/home';
    F.render();
    if (F.S.draft && !location.hash.startsWith('#/workout')) F.updateDock();
    if (F.tourMaybe && !q.get('a') && !location.hash.startsWith('#/get/')) F.tourMaybe();
    setTimeout(() => { if (F.weekPush) F.weekPush(); }, 4000);
    // splash
    const sp = F.$('#splash'); const wait = Math.max(0, 1300 - (performance.now() - t0));
    setTimeout(() => F.burst(innerWidth / 2, innerHeight * .45, 40, 1.1), 700);
    setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 800); }, wait);
    // skróty z ikony aplikacji
    if (q.get('a') === 'start') setTimeout(() => { history.replaceState(null, '', location.pathname + location.hash); if (F.S.draft) F.go('#/workout'); else F.startFlow(); }, wait + 300);
    if (q.get('a') === 'history') { history.replaceState(null, '', location.pathname + '#/history'); F.render(); }
    // zawsze wznawiaj licznik treningu po powrocie do aplikacji
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { F.tickRest(); if (F.S.draft) F.updateDock(); } });
    // service worker
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => { const nw = reg.installing; if (!nw) return; nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) F.toast('Dostępna nowa wersja FORGE <button data-a="reload">Odśwież</button>', '', 9000); }); });
      }).catch(() => { });
    }
    // prośba o trwałe przechowywanie po pierwszym zapisanym treningu
    // trwałe przechowywanie: przeglądarka nie usunie danych sama przy braku miejsca (prosimy przy każdym starcie, aż się zgodzi)
    if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(ok => { if (!ok) return navigator.storage.persist(); }).then(ok => { if (ok) F.S.settings.persisted = 1; }).catch(() => { });
  }
  boot();
})();
