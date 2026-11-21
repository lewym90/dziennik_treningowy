/* FORGE — miejsca treningu (Siłownia / Dom / Hotel) ze sprzętem; zamienniki i „Zajęte” biorą sprzęt z aktywnego miejsca */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s); const E = F.esc;
  const EQ_ALL = ['Sztanga', 'Hantle', 'Maszyna', 'Wyciąg', 'Kettlebell', 'Drążek', 'Inne'];
  const EQ_L = { Sztanga: 'Sztangi i talerze', Hantle: 'Hantle', Maszyna: 'Maszyny', Wyciąg: 'Wyciągi / linki', Kettlebell: 'Kettlebell', Drążek: 'Drążek do podciągania', Inne: 'Guma, piłka, inne' };
  F.EQ_ALL = EQ_ALL;
  F.gyms = () => { const s = F.S.settings; if (!s.gyms || !s.gyms.length) s.gyms = [{ id: 'gym', n: 'Siłownia', eq: [...EQ_ALL] }]; return s.gyms; };
  F.gymCur = () => { const g = F.gyms(); return g.find(x => x.id === F.S.settings.gymId) || g[0]; };
  F.gymOk = e => { const g = F.gymCur(); if (!g || g.eq.length >= EQ_ALL.length) return true; return e.equip === 'Masa ciała' || g.eq.includes(e.equip) || !EQ_ALL.includes(e.equip) && e.equip !== 'Masa ciała' && g.eq.includes('Inne'); };
  const save = () => F.saveSettings();
  F.gymSheet = (cb) => {
    const g = F.gyms(), cur = F.gymCur();
    F.sheet(`<p class="sheet-p dim">Zamienniki ćwiczeń i przycisk „Zajęte” podpowiadają tylko ćwiczenia na sprzęt z wybranego miejsca.</p>
      <div class="stack">${g.map(x => `<div class="gym cut ${x.id === cur.id ? 'on' : ''}"><button class="gym-h" data-a="gymSel" data-id="${x.id}">${ic(x.id === cur.id ? 'circle-check' : 'map-pin', 20)}<b>${E(x.n)}</b><small>${x.eq.length >= EQ_ALL.length ? 'cały sprzęt' : x.eq.map(k => EQ_L[k]).join(', ') || 'tylko masa ciała'}</small></button><button class="ibtn" data-a="gymEdit" data-id="${x.id}" aria-label="Edytuj">${ic('pencil', 18)}</button></div>`).join('')}</div>
      ${g.length < 5 ? `<button class="btn ghost wide" data-a="gymAdd">${ic('plus', 18)} Dodaj miejsce</button>` : ''}`, { title: 'Miejsca treningu' });
    F._gymCb = cb || null;
  };
  F.act.gymPick = () => F.gymSheet(() => F.render(true));
  F.act.gymSel = b => { F.S.settings.gymId = b.dataset.id; save(); F.closeSheet(true); F.toast('Miejsce: ' + E(F.gymCur().n)); if (F._gymCb) F._gymCb(); else F.render(true); };
  F.act.gymAdd = () => { const g = F.gyms(); const names = ['Dom', 'Hotel', 'Druga siłownia', 'Plener']; const n = names.find(x => !g.some(y => y.n === x)) || 'Miejsce ' + (g.length + 1); const x = { id: F.uid(), n, eq: n === 'Dom' ? ['Hantle'] : n === 'Hotel' ? ['Hantle', 'Maszyna'] : n === 'Plener' ? ['Drążek'] : [...EQ_ALL] }; g.push(x); save(); F.act.gymEdit({ dataset: { id: x.id } }); };
  F.act.gymEdit = b => {
    const x = F.gyms().find(y => y.id === b.dataset.id); if (!x) return;
    F.sheet(`<label class="fld"><span>Nazwa</span><input data-b="gymName" data-id="${x.id}" value="${E(x.n)}" maxlength="24"></label>
      <p class="dim small">Dostępny sprzęt (ćwiczenia z masą ciała są zawsze dostępne):</p><div class="card cut list">${EQ_ALL.map(k => `<label class="sw"><span><b>${EQ_L[k]}</b></span><input type="checkbox" data-b="gymEq" data-id="${x.id}" data-k="${k}" ${x.eq.includes(k) ? 'checked' : ''}><i></i></label>`).join('')}</div>
      <button class="btn primary wide" data-a="gymDone">${ic('check', 18)} Gotowe</button>${F.gyms().length > 1 ? `<button class="btn ghost wide danger-t" data-a="gymDel" data-id="${x.id}">${ic('trash-2', 18)} Usuń miejsce</button>` : ''}`, { title: 'Miejsce treningu' });
  };
  F.bind.gymName = el => { const x = F.gyms().find(y => y.id === el.dataset.id); if (x) { x.n = el.value.trim() || x.n; save(); } };
  F.bind.gymEq = el => { const x = F.gyms().find(y => y.id === el.dataset.id); if (!x) return; const k = el.dataset.k; x.eq = el.checked ? [...new Set([...x.eq, k])] : x.eq.filter(q => q !== k); save(); };
  F.act.gymDone = () => { F.closeSheet(true); F.gymSheet(F._gymCb); };
  F.act.gymDel = b => { const s = F.S.settings; s.gyms = F.gyms().filter(y => y.id !== b.dataset.id); if (s.gymId === b.dataset.id) s.gymId = s.gyms[0].id; save(); F.closeSheet(true); F.gymSheet(F._gymCb); };
})();
