/* FORGE — start aplikacji, pasek zakładek, service worker */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s);
  const tabs = () => `<div class="tb">
    <button class="t" data-a="tab" data-tab="home" aria-label="Dziś">${ic('house', 24)}<span>Dziś</span></button>
    <button class="t" data-a="tab" data-tab="plans" aria-label="Plany">${ic('clipboard-list', 24)}<span>Plany</span></button>
    <div class="mid ${F.S.draft ? 'live' : ''}"><button data-a="tab" data-tab="workout" aria-label="${F.S.draft ? 'Wróć do treningu' : 'Rozpocznij trening'}">${ic(F.S.draft ? 'play' : 'flame', 34)}</button></div>
    <button class="t" data-a="tab" data-tab="history" aria-label="Historia">${ic('history', 24)}<span>Historia</span></button>
    <button class="t" data-a="tab" data-tab="stats" aria-label="Postępy">${ic('chart-line', 24)}<span>Postępy</span></button></div>`;
  F.drawTabs = () => { const el = F.$('#tabbar'); el.innerHTML = tabs(); const cur = document.body.dataset.route; F.$$('#tabbar [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === cur)); };
  const _r = F.render; F.render = k => { _r(k); F.drawTabs(); };

  F.act.reload = () => location.reload();

  async function boot() {
    const t0 = performance.now();
    try { await F.load(); } catch (e) { console.error(e); }
    F.applyAccent(); F.resumeRest();
    const q = new URLSearchParams(location.search);
    if (!location.hash) location.hash = '#/home';
    F.render();
    if (F.S.draft && !location.hash.startsWith('#/workout')) F.updateDock();
    // splash
    const sp = F.$('#splash'); const wait = Math.max(0, 2100 - (performance.now() - t0));
    setTimeout(() => F.burst(innerWidth / 2, innerHeight * .45, 40, 1.1), 900);
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
    if (navigator.storage && navigator.storage.persist && F.S.sessions.length) navigator.storage.persist().catch(() => { });
  }
  boot();
})();
