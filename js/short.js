/* FORGE — „Mam mało czasu”: skraca dzisiejszy trening do 30/45/60 min.
   Kolejność cięć (Iversen i in. 2021: przy małej ilości czasu najpierw ćwiczenia wielostawowe, liczy się tygodniowa liczba serii):
   1) izolowane do 2 serii, 2) pozostałe wielostawowe do 2 serii, 3) pomijanie izolowanych od końca, 4) ciężkie wielostawowe do 3 serii,
   5) pomijanie pozostałych wielostawowych od końca, 6) ciężkie do 2 serii, 7) pomijanie ciężkich od końca (pierwsze zostaje). */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s); const E = F.esc;
  const role = it => it.role || (F.PLN && F.PLN.roleOf ? F.PLN.roleOf(it.exId) : 'sec');
  F.shortenItems = (items, min) => {
    let arr = items.filter(i => !i.cardio).map(i => ({ ...i })); const cut = [], fewer = new Set();
    const est = () => F.PLN.estMin(arr); if (est() <= min) return { items: arr, cut, fewer: [] };
    const trim = (r, max) => { for (const it of arr) { if (est() <= min) return; if (role(it) === r && it.sets > max) { it.sets = max; fewer.add(it.exId); } } };
    const drop = (r, keepFirst) => { for (let k = arr.length - 1; k >= 0; k--) { if (est() <= min) return; if (role(arr[k]) !== r) continue; if (keepFirst && arr.filter(x => role(x) === r).length <= 1) return; cut.push(arr[k].exId); fewer.delete(arr[k].exId); arr.splice(k, 1); if (F.cleanSS) F.cleanSS(arr); } };
    trim('iso', 2); trim('sec', 2); drop('iso'); trim('main', 3); drop('sec'); trim('main', 2); drop('main', true);
    return { items: arr, cut, fewer: [...fewer] };
  };
  F.act.shortSheet = () => {
    const nx = F.nextWorkout(); if (!nx) return; const full = F.PLN.estMin(nx.day.items.filter(i => !i.cardio));
    const opts = [30, 45, 60].filter(m => m < full);
    if (!opts.length) { F.toast(`Ten trening trwa ${full} min — krócej się nie da bez pomijania wszystkiego.`); return; }
    const nm = id => (F.S.ex.get(id) || {}).name || id;
    F.sheet(`<p class="sheet-p dim">Pełny trening „${E(nx.day.name)}” trwa ${full} min. Wybierz, ile masz czasu. Zostają najpierw ćwiczenia wielostawowe, izolowane skracam albo pomijam (Iversen i in., 2021).</p><div class="stack">${opts.map(m => { const r = F.shortenItems(nx.day.items, m); const sets = r.items.reduce((a, i) => a + (+i.sets || 0), 0); return `<button class="tpl cut" data-a="shortGo" data-m="${m}"><b>${m} minut</b><small>${r.items.length} ${F.plur(r.items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')} · ${sets} ${F.plur(sets, 'seria', 'serie', 'serii')} · ${F.PLN.estMin(r.items)} min${r.cut.length ? `<br>Pomijam: ${r.cut.map(nm).map(E).join(', ')}` : ''}${r.fewer.length ? `<br>Mniej serii: ${r.fewer.map(nm).map(E).join(', ')}` : ''}</small></button>`; }).join('')}</div>`, { title: 'Mam mało czasu' });
  };
  F.act.shortGo = b => { const nx = F.nextWorkout(); if (!nx) return; const m = +b.dataset.m; const r = F.shortenItems(nx.day.items, m); F.closeSheet(true); F.startWorkout({ plan: nx.plan, day: { ...nx.day, items: r.items }, short: m }); };
})();
