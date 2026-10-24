/* FORGE — wygodne pola liczbowe: zaznaczanie całej wartości po dotknięciu i przytrzymanie plusa/minusa */
(function () {
  const F = window.F;
  const NUM = 'input[inputmode="decimal"],input[inputmode="numeric"]';
  const sel = el => { try { el.select(); el.setSelectionRange(0, 9999); } catch (e) { } };
  const fit = el => { if (el.closest('.sr,.ssl')) el.classList.toggle('lg', String(el.value).length > 4); };
  // po dotknięciu zaznacz wszystko: pierwszy znak od razu nadpisuje starą wartość (iOS ustawia kursor dopiero po chwili, więc kilka prób)
  document.addEventListener('focusin', e => { const t = e.target; if (t && t.matches && t.matches(NUM)) { sel(t); setTimeout(() => sel(t), 0); setTimeout(() => sel(t), 40); setTimeout(() => sel(t), 140); fit(t); } });
  document.addEventListener('input', e => { const t = e.target; if (t && t.matches && t.matches(NUM)) fit(t); });
  // pola po przerysowaniu mają od razu właściwą wielkość czcionki
  const fitAll = () => document.querySelectorAll('.sr input,.ssl input').forEach(fit);
  new MutationObserver(fitAll).observe(document.body, { childList: true, subtree: true }); fitAll();

  // przytrzymanie plusa/minusa: po chwili powtarza zmianę, potem przyspiesza
  let hold = null, swallow = false;
  const stop = () => { if (!hold) return; clearTimeout(hold.t); clearInterval(hold.i); hold = null; };
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('[data-a="nudge"]'); if (!b) return; stop(); swallow = false;
    const h = hold = { t: 0, i: 0 }; let n = 0;
    h.t = setTimeout(() => {
      swallow = true; F.act.nudge(b); n++;
      h.i = setInterval(() => { F.act.nudge(b); n++; if (n === 10) { clearInterval(h.i); h.i = setInterval(() => F.act.nudge(b), 55); } }, 120);
    }, 380);
  });
  ['pointerup', 'pointercancel', 'pointerleave', 'dragstart', 'contextmenu'].forEach(ev => document.addEventListener(ev, stop, true));
  window.addEventListener('blur', stop);
  // kliknięcie kończące długie przytrzymanie nie może dodać jeszcze jednego kroku
  document.addEventListener('click', e => { if (swallow && e.target.closest && e.target.closest('[data-a="nudge"]')) { e.stopPropagation(); e.preventDefault(); } swallow = false; }, true);
})();
