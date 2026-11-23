/* FORGE — ruch: przejścia między ekranami (View Transitions), morfing kart, wspólne ustawienie animacji,
   zamykanie okienek przeciągnięciem, przesuwany wskaźnik zakładki, wykresy (rysowanie przy wejściu, przeciąganie palcem),
   wejście ekranu Dziś. Wszystko wyłącza się przy „ograniczaniu ruchu” w telefonie i przy ustawieniu „Oszczędne”. */
(function () {
  const F = window.F; const root = document.documentElement;
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  F.motionOn = () => !RM() && (F.S.settings.motion || 'full') === 'full';
  F.applyMotion = () => root.classList.toggle('motion-low', !F.motionOn());
  F.act.setMotion = b => { F.S.settings.motion = b.dataset.v; F.saveSettings(); F.applyMotion(); F.render(true); };
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => F.applyMotion()); } catch (e) { }

  /* ---------- przejścia między ekranami ---------- */
  const TABS = ['home', 'plans', 'history', 'stats'];
  const depth = h => (h || '#/home').replace(/^#\/?/, '').split(/[/?]/).filter(Boolean).length || 1;
  let prev = location.hash || '#/home', morphSrc = null, morphAt = 0;
  // stuknięcie w kartę z data-vt: ten element (albo jego [data-vt-src]) „przefrunie” na nowy ekran
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-vt]'); if (el) { morphSrc = el.querySelector('[data-vt-src]') || el; morphAt = Date.now(); } }, true);
  const clearNames = () => document.querySelectorAll('[data-vtn]').forEach(x => { x.style.viewTransitionName = ''; x.removeAttribute('data-vtn'); });
  const nameIt = (el, n) => { el.style.viewTransitionName = n; el.setAttribute('data-vtn', ''); };
  F.navRender = () => {
    const h = location.hash || '#/home'; const from = prev; prev = h;
    const src = morphSrc && morphSrc.isConnected && Date.now() - morphAt < 10000 ? morphSrc : null; morphSrc = null;
    if (!document.startViewTransition || !F.motionOn() || document.hidden) { F.render(); return; }
    const t0 = F.tabOf(from), t1 = F.tabOf(h); let dir = 'fade';
    if (t1 === 'workout' && t0 !== 'workout') dir = 'up'; else if (t0 === 'workout' && t1 !== 'workout') dir = 'down';
    else if (t0 !== t1) { const a = TABS.indexOf(t0), b = TABS.indexOf(t1); dir = a < 0 || b < 0 ? 'fade' : b > a ? 'left' : 'right'; }
    else { const d0 = depth(from), d1 = depth(h); dir = d1 > d0 ? 'fwd' : d1 < d0 ? 'back' : 'fade'; }
    clearNames(); if (src) nameIt(src, 'morph');
    root.dataset.vt = dir; root.classList.add('vt-run');
    let vt; try {
      vt = document.startViewTransition(() => { clearNames(); F.render(); if (src) { const dst = document.querySelector('#view [data-vt-dst]'); if (dst) nameIt(dst, 'morph'); } });
    } catch (e) { root.classList.remove('vt-run'); clearNames(); F.render(); return; }
    vt.finished.finally(() => { root.classList.remove('vt-run'); delete root.dataset.vt; clearNames(); });
  };

  // zmiana zakresu lub filtra na ekranie z wykresem: wykres płynnie przechodzi w nowy kształt
  let chartVT = false;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#view .seg button, #view .chips .chip, #view [data-a="statTab"]'); chartVT = !!(b && document.querySelector('#view .chart, #view .heat')); }, true);
  F.afterRender = F.afterRender || [];
  F.renderMorph = fn => {
    if (!chartVT || !document.startViewTransition || !F.motionOn()) { fn(); return; } chartVT = false;
    const nm = () => document.querySelectorAll('#view .chart, #view .heat').forEach((c, i) => nameIt(c, 'chart-' + i));
    clearNames(); nm(); root.dataset.vt = 'fade'; root.classList.add('vt-run');
    try { const vt = document.startViewTransition(() => { clearNames(); fn(); nm(); }); vt.finished.finally(() => { root.classList.remove('vt-run'); delete root.dataset.vt; clearNames(); }); }
    catch (e) { root.classList.remove('vt-run'); clearNames(); fn(); }
  };

  /* ---------- wykresy: rysowanie, gdy wjadą na ekran; podpowiedź pod palcem ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('vis'); io.unobserve(x.target); } }), { threshold: .25 }) : null;
  F.afterRender.push(view => { view.querySelectorAll('.chart, .hbars, .heat').forEach(c => { if (io) io.observe(c); else c.classList.add('vis'); }); });
  const showTip = (ch, g) => {
    const tip = ch.querySelector('.tip'); if (!tip) return; if (!g) { tip.hidden = true; return; }
    ch.querySelectorAll('.pt.on').forEach(e => e.classList.remove('on')); g.classList.add('on');
    tip.textContent = g.dataset.tip; tip.hidden = false;
    const r = ch.getBoundingClientRect(), gr = g.getBoundingClientRect();
    let x = gr.left + gr.width / 2 - r.left; x = Math.max(40, Math.min(r.width - 40, x));
    tip.style.left = x + 'px'; tip.style.top = Math.max(0, gr.top - r.top - 8) + 'px';
  };
  const nearest = (ch, cx) => { let best = null, bd = 1e9; ch.querySelectorAll('.pt').forEach(g => { const r = g.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - cx); if (d < bd) { bd = d; best = g; } }); return best; };
  let scrub = null;
  document.addEventListener('pointerdown', e => { const ch = e.target.closest && e.target.closest('#view .chart'); scrub = ch; if (ch) showTip(ch, e.target.closest('.pt') || nearest(ch, e.clientX)); });
  document.addEventListener('pointermove', e => { if (!scrub || !(e.buttons || e.pointerType === 'touch')) return; const g = nearest(scrub, e.clientX); if (g && !g.classList.contains('on')) { showTip(scrub, g); if (F.haptic && e.pointerType === 'touch') F.haptic(4); } });
  ['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => { scrub = null; }));

  /* ---------- ekran Dziś: wejście kaskadą raz dziennie ---------- */
  F.afterRender.push((view, tab, keep) => {
    if (tab !== 'home' || keep || !F.motionOn()) return; const k = F.dayKey(Date.now()); let last = ''; try { last = localStorage.getItem('forge-intro') || ''; } catch (e) { }
    if (last === k) return; try { localStorage.setItem('forge-intro', k); } catch (e) { }
    view.classList.add('intro'); setTimeout(() => view.classList.remove('intro'), 1800);
  });

  /* ---------- okienka od dołu: zamykanie przeciągnięciem w dół ---------- */
  let drag = null;
  document.addEventListener('touchstart', e => {
    const sh = e.target.closest && e.target.closest('#sheet-root.open .sheet'); if (!sh || e.touches.length !== 1) return;
    const body = sh.querySelector('.sheet-b'); const onHead = !!e.target.closest('.sheet-grab, .sheet-h'); if (!onHead && body && body.scrollTop > 0) return;
    if (e.target.closest('input, textarea, select, .seg, .chips, [data-noswipe]')) return;
    drag = { sh, y0: e.touches[0].clientY, t0: Date.now(), dy: 0, head: onHead, on: false };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!drag) return; const dy = e.touches[0].clientY - drag.y0; drag.dy = dy;
    if (!drag.on) { if (dy > 8) { drag.on = true; drag.sh.classList.add('drag'); } else if (dy < -4) { drag = null; return; } else return; }
    drag.sh.style.transform = `translate(-50%, ${Math.max(0, dy)}px)`; if (e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!drag) return; const d = drag; drag = null; if (!d.on) return; d.sh.classList.remove('drag');
    const v = d.dy / Math.max(1, Date.now() - d.t0);
    if (d.dy > Math.min(160, d.sh.offsetHeight * .3) || (v > .6 && d.dy > 40)) { d.sh.style.transform = ''; F.closeSheet(); } else d.sh.style.transform = '';
  });

  /* ---------- pasek zakładek: wskaźnik przesuwa się do wybranej zakładki ---------- */
  F.movePill = (instant) => {
    const tb = document.querySelector('#tabbar .tb'); if (!tb) return; let pill = tb.querySelector('.tb-pill'); if (!pill) { pill = document.createElement('i'); pill.className = 'tb-pill'; tb.appendChild(pill); tb.classList.add('has-pill'); }
    const on = tb.querySelector('button.t.on'); if (!on) { pill.style.opacity = '0'; return; }
    const x = on.offsetLeft + on.offsetWidth / 2 - 14; if (instant) { pill.style.transition = 'none'; requestAnimationFrame(() => { pill.style.transition = ''; }); }
    pill.style.opacity = '1'; pill.style.transform = `translateX(${x}px) skewX(-30deg)`;
  };
  window.addEventListener('resize', () => F.movePill(true));
})();
