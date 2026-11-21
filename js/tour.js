/* FORGE — przewodnik przy pierwszym uruchomieniu i jednorazowe podpowiedzi na ekranach */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s);
  const STEPS = [
    ['flame', 'Dziś', 'Tu zaczynasz trening. Pomarańczowy przycisk na dole ekranu też go uruchamia — z każdego miejsca.'],
    ['clipboard-list', 'Plany', 'Na górze Twój aktualny plan. Nowy ułożysz w kreatorze, weźmiesz gotowy albo wczytasz z PDF-a lub zdjęcia.'],
    ['chart-line', 'Historia i Postępy', 'Historia to zrobione treningi i kalendarz. Postępy pokazują, jak Ci idzie. Wszystkie dane zostają tylko w Twoim telefonie.']
  ];
  F.tourShow = (k = 0) => {
    let el = document.getElementById('tour'); if (!el) { el = document.createElement('div'); el.id = 'tour'; el.className = 'tour'; document.body.appendChild(el); }
    const s = STEPS[k], last = k === STEPS.length - 1;
    el.innerHTML = `<div class="tour-c"><div class="tour-i">${ic(s[0], 40)}</div><small>${k + 1} z ${STEPS.length}</small><h2>${s[1]}</h2><p>${s[2]}</p>
      <div class="tour-dots">${STEPS.map((_, i) => `<i class="${i === k ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn primary wide" data-a="tourNext" data-k="${k + 1}">${last ? 'Zaczynamy' : 'Dalej'}</button>${last ? '' : '<button class="linkbtn tour-skip" data-a="tourEnd">Pomiń</button>'}</div>`;
  };
  F.act.tourNext = b => { const k = +b.dataset.k; if (k >= STEPS.length) F.act.tourEnd(); else F.tourShow(k); };
  F.act.tourEnd = () => { F.S.settings.tourSeen = 1; F.saveSettings(); const el = document.getElementById('tour'); if (el) el.remove(); if (!F.S.plans.length) F.go('#/plans'); };
  // pokaż tylko nowym użytkownikom (bez planów i treningów)
  F.tourMaybe = () => { const s = F.S.settings; if (s.tourSeen) return; if (F.S.sessions.length || F.S.plans.length) { s.tourSeen = 1; F.saveSettings(); return; } setTimeout(() => { if (!F.S.sessions.length && !F.S.plans.length && !F.S.settings.tourSeen && !location.hash.startsWith('#/get/')) F.tourShow(0); }, 1600); };

  // jednorazowe podpowiedzi: pokazują się raz, przy pierwszym wejściu na ekran
  const HINTS = {
    plans: 'Na górze jest Twój aktualny plan z przyciskiem startu. Niżej tworzysz nowy: kreator, plany startowe albo import.',
    history: 'Przełącz na „Kalendarz”, żeby zobaczyć zaplanowane treningi. Stuknij dzień, aby przenieść lub pominąć trening.',
    stats: 'Cztery zakładki: Przegląd, Mięśnie, Siła i Ciało. Raport tygodnia jest na górze Przeglądu.'
  };
  F.hint = key => { const h = F.S.settings.hints || {}; if (h[key] || !HINTS[key]) return ''; return `<div class="hint1" id="hint-${key}">${ic('info', 18)}<p>${HINTS[key]}</p><button class="ibtn" data-a="hintOk" data-k="${key}" aria-label="Rozumiem">${ic('x', 16)}</button></div>`; };
  F.act.hintOk = b => { const s = F.S.settings; s.hints = s.hints || {}; s.hints[b.dataset.k] = 1; F.saveSettings(); const el = document.getElementById('hint-' + b.dataset.k); if (el) el.remove(); };
})();
