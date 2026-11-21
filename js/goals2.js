/* FORGE — cel z prognozą: „100 kg w wyciskaniu do czerwca”.
   Tempo = nachylenie prostej (metoda najmniejszych kwadratów) przez najlepszy wyliczony maks (Epley, serie do 10 powt.) z każdego treningu z ostatnich 8 tygodni. */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s); const E = F.esc; const DAY = 864e5, WK = 7 * DAY;
  const list = () => F.S.settings.lgoals || (F.S.settings.lgoals = []);
  const pts = (id, since) => { const out = []; F.S.sessions.forEach(s => { if (s.start < since) return; let b = 0; s.exercises.forEach(e => { if (e.exId !== id) return; e.sets.forEach(x => { if (F.isWork(x) && x.r <= 10) b = Math.max(b, F.e1rm(x.w, x.r)); }); }); if (b) out.push({ t: s.start, v: b }); }); return out.sort((a, b) => a.t - b.t); };
  F.goalForecast = g => {
    const now = Date.now(), p = pts(g.ex, now - 8 * WK); const cur = p.length ? p[p.length - 1].v : (F.bestE1 ? F.bestE1(g.ex) : 0);
    if (cur >= g.n) return { cur, done: true };
    if (p.length < 3) return { cur, few: true, n: p.length };
    const mx = p.reduce((a, x) => a + x.t, 0) / p.length, my = p.reduce((a, x) => a + x.v, 0) / p.length;
    const sl = p.reduce((a, x) => a + (x.t - mx) * (x.v - my), 0) / (p.reduce((a, x) => a + (x.t - mx) ** 2, 0) || 1); const perWk = sl * WK;
    const fit = my + sl * (now - mx); const base = Math.max(cur, fit);
    if (perWk <= 0) return { cur, perWk, flat: true };
    const eta = now + (g.n - base) / sl; return { cur, perWk, eta, ok: eta <= g.d };
  };
  const dd = ts => new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  F.longGoalsHtml = () => {
    const L = list(); const rows = L.map(g => {
      const f = F.goalForecast(g), need = g.n - f.cur, weeks = Math.max(1, (g.d - Date.now()) / WK), needWk = need / weeks;
      const msg = f.done ? `<b class="up">Cel osiągnięty.</b>` : f.few ? `Za mało danych do prognozy: ${f.n} z 3 treningów z tym ćwiczeniem w ostatnich 8 tygodniach.` : f.flat ? `Przez ostatnie 8 tygodni wynik nie rośnie. Potrzebujesz ${F.fw(Math.max(0, needWk))} ${F.unit()} tygodniowo — zajrzyj do porad o stagnacji.` : f.ok ? `Tempo ${F.fw(f.perWk)} ${F.unit()}/tydz. Przy tym tempie cel osiągniesz ${dd(f.eta)} — zdążysz przed terminem.` : `Tempo ${F.fw(f.perWk)} ${F.unit()}/tydz. Przy tym tempie cel dopiero ${dd(f.eta)}. Do terminu potrzebujesz ${F.fw(needWk)} ${F.unit()}/tydz.`;
      const steps = []; if (!f.done) { const s0 = Date.now(); for (let k = 1; k <= 3; k++) { const t = s0 + (g.d - s0) * k / 4; steps.push(`${new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}: ${F.fw(f.cur + need * k / 4)}`); } }
      return `<div class="lg"><div class="lg-h"><b>${E(F.exName(g.ex))}: ${F.fw(g.n)} ${F.unit()}</b><button class="ibtn" data-a="lgDel" data-id="${g.id}" aria-label="Usuń cel">${ic('x', 16)}</button></div><small class="dim">do ${dd(g.d)} · teraz ${F.fw(f.cur)} ${F.unit()} (wyliczony maks)</small><div class="bar"><i style="width:${Math.min(100, f.cur / g.n * 100).toFixed(0)}%"></i></div><p class="small">${msg}</p>${steps.length ? `<p class="dim small">Punkty kontrolne: ${steps.join(' · ')}</p>` : ''}</div>`;
    }).join('');
    return `<h3 class="sec">Cel na dłużej</h3><section class="card cut">${rows || '<p class="dim small">Np. „100 kg w wyciskaniu do czerwca”. Policzę tempo z Twoich treningów i powiem, czy zdążysz.</p>'}${L.length < 3 ? `<button class="btn ghost wide goal-add" data-a="lgNew">${ic('target', 18)} Ustaw cel z terminem</button>` : ''}</section>`;
  };
  F.act.lgNew = () => {
    const cnt = {}; F.S.sessions.slice(0, 40).forEach(s => s.exercises.forEach(e => { const x = F.S.ex.get(e.exId) || {}; if (x.type === 'wr' || x.type === 'bwr') cnt[e.exId] = (cnt[e.exId] || 0) + 1; }));
    const ids = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 25); if (!ids.length) { F.toast('Najpierw zrób trening z ćwiczeniem z ciężarem'); return; }
    const d0 = new Date(Date.now() + 16 * WK); const dv = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
    F.sheet(`<label class="fld"><span>Ćwiczenie</span><select id="lg-ex">${ids.map(i => `<option value="${E(i)}">${E(F.exName(i))}</option>`).join('')}</select></label>
      <label class="fld"><span>Cel: maks na 1 powtórzenie (${F.unit()})</span><input id="lg-n" type="number" inputmode="decimal" min="0"></label>
      <label class="fld"><span>Termin</span><input id="lg-d" type="date" value="${dv}"></label>
      <p class="dim small">Maks liczę wzorem Epleya z Twoich serii do 10 powtórzeń — nie musisz robić prób na jedno powtórzenie.</p>
      <button class="btn primary wide" data-a="lgSave">Ustaw cel</button>`, { title: 'Cel z terminem' });
  };
  F.act.lgSave = () => { const ex = F.$('#lg-ex').value, n = parseFloat(String(F.$('#lg-n').value).replace(',', '.')), d = new Date(F.$('#lg-d').value).getTime(); if (!(n > 0)) { F.toast('Wpisz ciężar celu'); return; } if (!(d > Date.now() + DAY)) { F.toast('Termin musi być w przyszłości'); return; } list().push({ id: F.uid(), ex, n: F.fromDisp(n), d }); F.saveSettings(); F.closeSheet(true); F.render(true); };
  F.act.lgDel = async b => { if (!(await F.confirm({ title: 'Usunąć cel?', ok: 'Usuń', cancel: 'Wróć', danger: true }))) return; F.S.settings.lgoals = list().filter(g => g.id !== b.dataset.id); F.saveSettings(); F.render(true); };
  // samopoczucie a wyniki: średni tonaż treningu przy dobrym (4–5) i słabym (1–2) śnie/energii
  F.feelHtml = () => {
    const ss = F.S.sessions.filter(s => s.feel); if (ss.length < 6) return '';
    const avg = a => a.length ? a.reduce((x, s) => x + F.sessionVolume(s), 0) / a.length : 0;
    const row = (k, l) => { const hi = ss.filter(s => s.feel[k] >= 4), lo = ss.filter(s => s.feel[k] <= 2); if (hi.length < 2 || lo.length < 2) return ''; const a = avg(hi), b = avg(lo); return `<div class="fe-r"><b>${l}</b><span>dobry: ${F.fmtVol(a)} <small>(${hi.length} tr.)</small></span><span>słaby: ${F.fmtVol(b)} <small>(${lo.length} tr.)</small></span></div>`; };
    const h = row('sleep', 'Sen') + row('energy', 'Energia'); if (!h) return '';
    return `<h3 class="sec">Samopoczucie a wyniki</h3><section class="card cut">${h}<p class="dim small">Średni tonaż treningu z Twoich ocen przed treningiem (${ss.length} treningów z oceną).</p></section>`;
  };
})();
