/* FORGE — rozszerzenia 1.1: mapa mięśni, normy siły i DOTS/Wilks, planer startu, pomiary i zdjęcia sylwetki, technika ćwiczeń, deload */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const exOf = id => F.S.ex.get(id);
  const num = v => parseFloat(String(v).replace(',', '.'));
  const DAY = 864e5;

  /* =====================================================================
     MAPA MIĘŚNI
     ===================================================================== */
  const MG = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'quads', 'hams', 'glutes', 'calves'];
  // zakres tygodniowych serii efektywnych (poniżej = za mało, powyżej = dużo)
  const TARGET = { chest: [10, 20], back: [10, 20], shoulders: [8, 16], biceps: [6, 14], triceps: [6, 14], forearms: [2, 8], abs: [6, 14], quads: [10, 20], hams: [6, 14], glutes: [6, 14], calves: [6, 14] };
  const ST = {
    none: { c: '#3a3f4e', t: 'Brak serii', o: .55 }, low: { c: '#ffb02e', t: 'Za mało', o: .95 }, ok: { c: '#3ddc84', t: 'W normie', o: .95 }, high: { c: '#ff4b1f', t: 'Dużo', o: 1 }
  };
  F.secondaryOf = id => { const ex = exOf(id); const i = F.EXINFO && F.EXINFO[id]; return (ex && ex.sec) || (i && i.s) || []; };
  // serie efektywne: ruch główny = 1, mięśnie pomocnicze = 0,5
  F.muscleSets = days => {
    const since = Date.now() - days * DAY; const out = {}; MG.forEach(m => out[m] = { eff: 0, direct: 0, ex: {} });
    F.S.sessions.forEach(se => { if (se.start < since) return; se.exercises.forEach(e => {
      const ex = exOf(e.exId); if (!ex) return; const n = e.sets.filter(F.isWork).length; if (!n) return;
      if (out[ex.muscle]) { out[ex.muscle].eff += n; out[ex.muscle].direct += n; out[ex.muscle].ex[e.exId] = (out[ex.muscle].ex[e.exId] || 0) + n; }
      F.secondaryOf(e.exId).forEach(m => { if (out[m] && m !== ex.muscle) { out[m].eff += n * 0.5; out[m].ex[e.exId] = (out[m].ex[e.exId] || 0) + n * 0.5; } });
    }); });
    const wk = days / 7; MG.forEach(m => { out[m].perWeek = out[m].eff / wk; });
    return out;
  };
  const status = (m, v) => { const [lo, hi] = TARGET[m]; return v <= 0 ? 'none' : v < lo ? 'low' : v <= hi ? 'ok' : 'high'; };

  const FRONT = {
    shoulders: ['72,58 58,60 46,70 42,86 50,98 60,92 66,78 70,66'],
    chest: ['98,66 72,60 68,74 64,90 70,104 84,110 98,108'],
    biceps: ['42,88 51,98 53,125 46,134 37,128 35,104'],
    forearms: ['37,134 46,138 45,168 38,188 30,184 31,152'],
    abs: ['98,112 84,112 81,148 84,184 98,190', '83,113 72,108 69,148 73,182 83,184'],
    quads: ['97,196 76,192 67,212 65,252 71,290 86,294 96,286 98,240'],
    calves: ['86,298 72,298 69,328 73,360 82,364 88,334']
  };
  const BACK = {
    back: ['100,46 84,52 66,62 76,78 100,90', '100,92 76,82 68,96 66,126 78,148 100,156', '100,158 82,152 80,180 100,188'],
    shoulders: ['66,62 50,68 42,86 50,98 62,90 72,78'],
    triceps: ['42,88 51,98 53,125 46,134 37,128 35,104'],
    forearms: ['37,134 46,138 45,168 38,188 30,184 31,152'],
    glutes: ['100,190 78,186 68,204 72,228 88,236 100,232'],
    hams: ['98,238 74,234 66,258 69,290 84,294 97,286'],
    calves: ['86,298 72,298 69,328 73,360 82,364 88,334']
  };
  function bodySvg(shapes, info, label) {
    const polysOf = m => (shapes[m] || []);
    const half = (mir) => {
      const t = mir ? ' transform="translate(200 0) scale(-1 1)"' : '';
      let g = '';
      Object.keys(shapes).forEach(m => { const s = info[m]; polysOf(m).forEach(p => { g += `<polygon points="${p}" fill="${ST[s].c}" fill-opacity="${ST[s].o}" class="mp" data-a="musTap" data-m="${m}"/>`; }); });
      return `<g${t}>${g}</g>`;
    };
    const base = Object.keys(shapes).flatMap(m => polysOf(m)).map(p => `<polygon points="${p}"/>`).join('');
    const baseHalf = mir => `<g${mir ? ' transform="translate(200 0) scale(-1 1)"' : ''}>${base}</g>`;
    return `<svg viewBox="0 0 200 380" class="mbody" role="img" aria-label="${label}"><g class="mbase">${baseHalf(0)}${baseHalf(1)}<circle cx="100" cy="27" r="17"/><rect x="91" y="40" width="18" height="18" rx="4"/><rect x="62" y="196" width="76" height="24" rx="10"/><circle cx="34" cy="192" r="6"/><circle cx="166" cy="192" r="6"/><rect x="66" y="360" width="26" height="12" rx="5"/><rect x="108" y="360" width="26" height="12" rx="5"/></g>${half(0)}${half(1)}<text x="100" y="378" class="mlab" text-anchor="middle">${label}</text></svg>`;
  }
  F.statsMuscles = () => {
    const rng = F.ui.musRange || 7; const data = F.muscleSets(rng); const info = {}; MG.forEach(m => info[m] = status(m, data[m].perWeek));
    const sorted = [...MG].sort((a, b) => { const o = { none: 0, low: 1, high: 2, ok: 3 }; return o[info[a]] - o[info[b]] || data[a].perWeek - data[b].perWeek; });
    const lacking = MG.filter(m => info[m] === 'none' || info[m] === 'low'); const heavy = MG.filter(m => info[m] === 'high');
    const tip = !F.S.sessions.length ? 'Zrób pierwszy trening, a mapa zapali się na kolorowo.' : lacking.length ? `Do dołożenia: <b>${lacking.slice(0, 4).map(m => F.MUSCLES[m].toLowerCase()).join(', ')}</b>.${heavy.length ? ` Dużo pracy: <b>${heavy.slice(0, 3).map(m => F.MUSCLES[m].toLowerCase()).join(', ')}</b>.` : ''}` : heavy.length ? `Wszystko w normie, a najwięcej pracy dostają: <b>${heavy.slice(0, 3).map(m => F.MUSCLES[m].toLowerCase()).join(', ')}</b>.` : 'Wszystkie partie w zakresie. Tak trzymać.';
    return `<div class="seg"><button class="${rng === 7 ? 'on' : ''}" data-a="musRange" data-r="7">Ostatnie 7 dni</button><button class="${rng === 28 ? 'on' : ''}" data-a="musRange" data-r="28">4 tyg. (średnio)</button></div>
    <section class="card cut mmap"><div class="mmap-b">${bodySvg(FRONT, info, 'PRZÓD')}${bodySvg(BACK, info, 'TYŁ')}</div>
      <div class="mleg">${['none', 'low', 'ok', 'high'].map(k => `<span><i style="background:${ST[k].c}"></i>${ST[k].t}</span>`).join('')}</div>
      <p class="dim small">Serie efektywne na tydzień: ruch główny liczy się za 1, mięśnie pomocnicze za 0,5. Dotknij partii, aby zobaczyć szczegóły.</p></section>
    <div class="banner hot"><div>${ic('target', 20)}</div><p>${tip}</p></div>
    <h3 class="sec">Serie tygodniowo vs zalecany zakres</h3>
    <section class="card cut">${sorted.map(m => { const v = data[m].perWeek, [lo, hi] = TARGET[m]; const pct = Math.min(100, v / (hi * 1.4) * 100); const a = lo / (hi * 1.4) * 100, b = hi / (hi * 1.4) * 100; return `<button class="mrow" data-a="musTap" data-m="${m}"><span class="mn">${F.mDot(m)}${F.MUSCLES[m]}</span><span class="mb"><i class="mz" style="left:${a}%;width:${b - a}%"></i><i class="mf" style="width:${pct}%;background:${ST[info[m]].c}"></i></span><b>${F.fmtNum(v, 1)}</b><em>${lo}–${hi}</em></button>`; }).join('')}</section>`;
  };
  F.act.musRange = b => { F.ui.musRange = +b.dataset.r; F.render(true); };
  F.act.musTap = b => {
    const m = b.dataset.m; const rng = F.ui.musRange || 7; const d = F.muscleSets(rng)[m]; const s = status(m, d.perWeek); const [lo, hi] = TARGET[m];
    const ex = Object.entries(d.ex).sort((a, c) => c[1] - a[1]).slice(0, 8);
    F.sheet(`<div class="tiles two"><div class="tile cut"><span class="tl">Serie / tydzień</span><b class="tv">${F.fmtNum(d.perWeek, 1)}</b></div><div class="tile cut"><span class="tl">Zalecany zakres</span><b class="tv">${lo}–${hi}</b></div></div>
      <p class="sheet-p"><span class="stbadge" style="--sc:${ST[s].c}">${ST[s].t}</span> ${rng === 7 ? 'w ostatnich 7 dniach' : 'średnio w ostatnich 4 tygodniach'}. Bezpośrednich serii: <b>${d.direct}</b>.</p>
      ${ex.length ? `<h4 class="lbl">Co je pracowało</h4><div class="exlist">${ex.map(([id, n]) => `<a class="exrow" href="#/ex/${E(id)}" data-a="closeSheet">${F.mDot(exOf(id).muscle)}<span><b>${E(F.exName(id))}</b></span><em>${F.fmtNum(n, 1)} serii</em></a>`).join('')}</div>` : '<p class="dim">Nic w tym okresie. Dodaj ćwiczenia na tę partię.</p>'}`, { title: F.MUSCLES[m] });
  };

  /* =====================================================================
     SIŁA: normy, DOTS, Wilks, planer startu
     ===================================================================== */
  const LV = ['Start', 'Początkujący', 'Podstawowy', 'Średni', 'Zaawansowany', 'Elita'];
  const STD = {
    squat: { n: 'Przysiad', m: [.75, 1.25, 1.75, 2.25, 2.75], f: [.5, .75, 1.25, 1.75, 2.25] },
    bench: { n: 'Wyciskanie leżąc', m: [.5, .75, 1.25, 1.75, 2.25], f: [.25, .5, .75, 1.0, 1.5] },
    deadlift: { n: 'Martwy ciąg', m: [1, 1.5, 2, 2.5, 3], f: [.5, 1, 1.5, 2, 2.5] },
    ohp: { n: 'Wyciskanie nad głowę', m: [.35, .55, .8, 1.1, 1.4], f: [.2, .35, .5, .75, 1.0] },
    row_bb: { n: 'Wiosłowanie sztangą', m: [.5, .75, 1.1, 1.5, 1.85], f: [.25, .5, .75, 1.0, 1.4] }
  };
  // najlepsze szacowane 1RM z serii do 10 powtórzeń (dłuższe serie zawyżają szacunek)
  F.bestE1 = id => {
    const ex = exOf(id); if (!ex) return 0; let best = 0;
    F.S.sessions.forEach(se => se.exercises.forEach(e => { if (e.exId !== id) return; e.sets.forEach(s => { if (F.isWork(s) && s.w && s.r && s.r <= 10) best = Math.max(best, F.e1rm(F.effLoad(ex, s, se.start), s.r)); }); }));
    return best;
  };
  const poly = (c, x) => c.reduce((a, k, i) => a + k * Math.pow(x, i), 0);
  F.dots = (total, bw, sex) => { const c = sex === 'f' ? [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706] : [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]; const d = poly(c, bw); return d > 0 ? total * 500 / d : 0; };
  F.wilks = (total, bw, sex) => { const c = sex === 'f' ? [-125.4255398, 13.71219419, -0.03307250631, -0.001050400051, 0.00000938773881462799, -0.000000023334613884954] : [47.46178854, 8.472061379, 0.07369410346, -0.001395833811, 0.00000707665973070743, -0.0000000120804336482315]; const d = poly(c, bw); return d > 0 ? total * 600 / d : 0; };
  const dotsLabel = d => d >= 500 ? 'poziom elitarny' : d >= 400 ? 'poziom krajowy/regionalny' : d >= 300 ? 'mocny amator' : d >= 200 ? 'solidny początek' : 'początek drogi';
  const sexKey = () => F.S.settings.sex === 'f' ? 'f' : F.S.settings.sex === 'm' ? 'm' : '';
  F.statsStrength = () => {
    const sex = sexKey(), bw = F.latestBW();
    const setup = `<section class="card cut"><h3>${ic('user', 18)} Twoje dane</h3><p class="dim small">Normy siły zależą od płci i masy ciała.</p><div class="seg tiny sx"><button class="${sex === 'm' ? 'on' : ''}" data-a="setSex" data-v="m">Mężczyzna</button><button class="${sex === 'f' ? 'on' : ''}" data-a="setSex" data-v="f">Kobieta</button></div>
      <div class="bw-form"><label class="fld"><span>Masa ciała (${F.unit()})</span><input id="st-bw" inputmode="decimal" placeholder="${bw ? F.fw(bw) : '80'}"></label><button class="btn primary" data-a="stBw">${ic('plus', 18)} Zapisz</button></div>${bw ? `<p class="dim small">Aktualnie: <b>${F.fwu(bw)}</b></p>` : ''}</section>`;
    if (!sex || !bw) return setup + `<p class="dim center pad">Wybierz płeć i wpisz masę ciała, a pokażę poziom siły w głównych bojach oraz DOTS i Wilks.</p>`;
    const rows = Object.keys(STD).map(id => {
      const th = STD[id][sex], e1 = F.bestE1(id); const ratio = e1 / bw; let lv = 0; th.forEach(t => { if (ratio >= t) lv++; });
      const next = lv < 5 ? th[lv] * bw : 0; const prevT = lv > 0 ? th[lv - 1] : 0; const pct = lv >= 5 ? 100 : Math.max(0, Math.min(100, ((ratio - prevT) / (th[lv] - prevT)) * 100));
      return `<a class="card cut std" href="#/ex/${id}"><div class="std-h"><div><h3>${STD[id].n}</h3><small class="dim">${e1 ? `1RM ≈ ${F.fwu(e1)} · ${F.fmtNum(ratio, 2)}× masy ciała` : 'Brak zapisanych serii (do 10 powtórzeń)'}</small></div><span class="lvl l${lv}">${LV[lv]}</span></div>
        <div class="lvbar">${th.map((t, i) => `<i class="${lv > i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="lvrow">${th.map(t => `<small>${F.fmtNum(F.toDisp(t * bw), 0)}</small>`).join('')}</div>
        ${e1 && lv < 5 ? `<p class="dim small">Do poziomu <b>${LV[lv + 1]}</b>: jeszcze ${F.fwu(Math.max(0, next - e1))}.</p>` : e1 ? '<p class="dim small">Najwyższy poziom. Szacunek.</p>' : ''}</a>`;
    }).join('');
    const l3 = ['squat', 'bench', 'deadlift'].map(id => F.bestE1(id)); const have3 = l3.every(x => x > 0); const tot = l3.reduce((a, b) => a + b, 0);
    const dots = have3 ? F.dots(tot, bw, sex) : 0, wil = have3 ? F.wilks(tot, bw, sex) : 0;
    const tri = have3 ? `<section class="card cut total"><h3>Trójbój — szacunek</h3><div class="big-n">${F.fw(tot)} <small>${F.unit()}</small></div><div class="trio"><div><small>Przysiad</small><b>${F.fw(l3[0])}</b></div><div><small>Wyciskanie</small><b>${F.fw(l3[1])}</b></div><div><small>Martwy</small><b>${F.fw(l3[2])}</b></div></div>
      <div class="tiles two"><div class="tile cut"><span class="tl">DOTS</span><b class="tv">${F.fmtNum(dots, 1)}</b><small>${dotsLabel(dots)}</small></div><div class="tile cut"><span class="tl">Wilks</span><b class="tv">${F.fmtNum(wil, 1)}</b><small>wzór 2020</small></div></div>
      <p class="dim small">Liczone z szacowanych 1RM (serie do 10 powtórzeń) i masy ciała ${F.fwu(bw)}. Planer podejść zawodów znajdziesz w <a href="#/tools"><u>Narzędziach</u></a>.</p></section>` : `<p class="dim small center">Żeby policzyć DOTS i Wilks, zapisz przysiad, wyciskanie leżąc i martwy ciąg (id ćwiczeń: Przysiad ze sztangą, Wyciskanie sztangi leżąc, Martwy ciąg).</p>`;
    return tri + `<h3 class="sec">Poziomy siły</h3>` + rows + setup + `<p class="dim small">Normy są orientacyjne — oparte na powszechnie przyjętych zestawieniach mnożników masy ciała, nie na oficjalnej tabeli. Pokazują, gdzie jesteś względem typowych trenujących.</p>`;
  };
  F.act.setSex = b => { F.S.settings.sex = b.dataset.v; F.saveSettings(); F.render(true); };
  F.act.stBw = async () => { const v = num(F.$('#st-bw').value); if (!v || F.fromDisp(v) < 20 || F.fromDisp(v) > 400) { F.toast('Podaj poprawną wagę'); return; } await F.addBW(F.fromDisp(v), Date.now()); F.rebuild(); F.toast('Zapisano wagę', 'hot'); F.render(true); };

  // planer podejść na zawodach (w Narzędziach)
  const roundC = v => Math.round(v / 2.5) * 2.5;
  F.compHtml = () => {
    const C = F.ui.tools.comp || (F.ui.tools.comp = {}); const lifts = [['squat', 'Przysiad'], ['bench', 'Wyciskanie'], ['deadlift', 'Martwy ciąg']];
    lifts.forEach(([id]) => { if (C[id] == null) { const e = F.bestE1(id); C[id] = e ? String(roundC(F.toDisp(e))) : ''; } });
    const sex = sexKey(), bw = F.latestBW(); let total = 0, ok = true;
    const rows = lifts.map(([id, n]) => {
      return `<div class="comp"><label class="fld"><span>${n} — plan na 3. podejście (${F.unit()})</span><input data-b="tcomp" data-id="${id}" inputmode="decimal" value="${E(String(C[id] ?? ''))}" placeholder="np. 180"></label><div class="att" id="att-${id}">${attHtml(id)}</div></div>`;
    }).join('');
    return `<p class="dim small">Wpisz ciężar, który chcesz zrobić w 3. podejściu. Otwarcie ≈ 91%, drugie ≈ 96,5% (zaokrąglone do 2,5). Domyślnie wpisałem Twoje szacowane 1RM.</p>${rows}<div id="comp-sum">${compSum()}</div>`;
  };
  const attHtml = id => { const t = F.fromDisp(num((F.ui.tools.comp || {})[id])); if (!t) return '<small class="dim">Wpisz ciężar</small>'; return [.91, .965, 1].map(p => roundC(t * p)).map((w, i) => `<div><small>${i + 1}. podejście</small><b>${F.fw(w)}</b><em>${[91, 96.5, 100][i]}%</em></div>`).join(''); };
  const compSum = () => {
    const C = F.ui.tools.comp || {}; const sex = sexKey(), bw = F.latestBW(); let total = 0, ok = true;
    ['squat', 'bench', 'deadlift'].forEach(id => { const t = F.fromDisp(num(C[id])); if (!t) ok = false; else total += roundC(t); });
    return ok ? `<div class="tiles two"><div class="tile cut"><span class="tl">Suma (3× udane)</span><b class="tv sm">${F.fwu(total)}</b></div>${sex && bw ? `<div class="tile cut"><span class="tl">DOTS / Wilks</span><b class="tv sm">${F.fmtNum(F.dots(total, bw, sex), 0)} / ${F.fmtNum(F.wilks(total, bw, sex), 0)}</b></div>` : `<div class="tile cut"><span class="tl">DOTS / Wilks</span><small>Uzupełnij płeć i wagę w Postępy → Siła</small></div>`}</div>` : '';
  };
  F.bind.tcomp = el => { F.ui.tools.comp[el.dataset.id] = el.value; const a = F.$('#att-' + el.dataset.id); if (a) a.innerHTML = attHtml(el.dataset.id); const s = F.$('#comp-sum'); if (s) s.innerHTML = compSum(); };

  /* =====================================================================
     CIAŁO: pomiary i zdjęcia
     ===================================================================== */
  const MF = [['chest', 'Klatka', 'cm'], ['waist', 'Talia', 'cm'], ['hips', 'Biodra', 'cm'], ['arm', 'Ramię', 'cm'], ['forearm', 'Przedramię', 'cm'], ['thigh', 'Udo', 'cm'], ['calf', 'Łydka', 'cm'], ['neck', 'Kark', 'cm'], ['shoulders', 'Barki', 'cm'], ['bf', 'Tłuszcz', '%']];
  F.statsBody = () => {
    const t = F.ui.bodyTab || 'w'; const tabs = [['w', 'Waga'], ['m', 'Pomiary'], ['p', 'Zdjęcia']];
    const sub = `<div class="seg tiny sub">${tabs.map(x => `<button class="${x[0] === t ? 'on' : ''}" data-a="bodyTab" data-t="${x[0]}">${x[1]}</button>`).join('')}</div>`;
    return sub + (t === 'm' ? bodyMeasures() : t === 'p' ? bodyPhotos() : F.statsWeight());
  };
  F.act.bodyTab = b => { F.ui.bodyTab = b.dataset.t; F.render(true); };
  function bodyMeasures() {
    const ms = F.S.measures; const key = F.ui.mKey || 'waist'; const def = MF.find(x => x[0] === key) || MF[1];
    const last = ms[ms.length - 1]; const first = ms[0];
    const pts = ms.filter(m => m.v[key] != null).map(m => ({ x: m.date, y: m.v[key], tip: `${F.fmtDate(m.date)}: ${F.fmtNum(m.v[key], 1)} ${def[2]}` }));
    const latest = k => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i].v[k] != null) return [ms[i].v[k], i]; return null; };
    const prevOf = (k, idx) => { for (let i = idx - 1; i >= 0; i--) if (ms[i].v[k] != null) return ms[i].v[k]; return null; };
    const table = MF.map(([k, n, u]) => { const l = latest(k); if (!l) return ''; const p = prevOf(k, l[1]); const d = p != null ? l[0] - p : null; const f0 = ms.find(m => m.v[k] != null).v[k]; const dt = l[0] - f0;
      return `<button class="mrow2 ${k === key ? 'on' : ''}" data-a="mKey" data-k="${k}"><span>${n}</span><b>${F.fmtNum(l[0], 1)} <small>${u}</small></b><em class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d == null ? '' : (d > 0 ? '+' : '') + F.fmtNum(d, 1)}</em><em class="tot ${dt > 0 ? 'up' : dt < 0 ? 'down' : ''}">${ms.length > 1 && ms.filter(m => m.v[k] != null).length > 1 ? (dt > 0 ? '+' : '') + F.fmtNum(dt, 1) : ''}</em></button>`; }).join('');
    return `<button class="btn primary wide" data-a="mAdd">${ic('plus', 18)} Dodaj pomiar</button>
      ${ms.length ? `<section class="card cut"><h3>${def[1]} <small class="dim">${def[2]}</small></h3>${F.chart.line(pts, { w: 340, h: 190 })}<div class="chips scroll">${MF.map(x => `<button class="chip ${x[0] === key ? 'on' : ''}" data-a="mKey" data-k="${x[0]}">${x[1]}</button>`).join('')}</div></section>
      <h3 class="sec">Ostatnie wartości <small class="dim">zmiana od poprzedniego · od początku</small></h3><section class="card cut mtable">${table}</section>
      <h3 class="sec">Wpisy (${ms.length})</h3><div class="hlist">${[...ms].reverse().slice(0, 30).map(m => `<div class="hrow"><span class="hd">${F.fmtDate(m.date)}</span><span class="hs">${MF.filter(f => m.v[f[0]] != null).map(f => `${f[1]} ${F.fmtNum(m.v[f[0]], 1)}`).join(' · ')}</span><button class="ibtn" data-a="mDel" data-id="${m.id}" aria-label="Usuń">${ic('x', 16)}</button></div>`).join('')}</div>` : F.empty('ruler', 'Brak pomiarów', 'Mierz raz na 2–4 tygodnie, rano, w tych samych miejscach. Waga bywa kłamliwa — centymetry nie.')}`;
  }
  F.act.mKey = b => { F.ui.mKey = b.dataset.k; F.render(true); };
  F.act.mAdd = () => {
    const ms = F.S.measures; const lastV = k => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i].v[k] != null) return ms[i].v[k]; return null; };
    F.sheet(`<label class="fld"><span>Data</span><input type="date" id="m-date" value="${F.dateInput(Date.now())}"></label><div class="mgrid">${MF.map(([k, n, u]) => `<label class="fld"><span>${n} (${u})</span><input id="m-${k}" inputmode="decimal" placeholder="${lastV(k) != null ? F.fmtNum(lastV(k), 1) : '–'}"></label>`).join('')}</div><p class="dim small">Wpisz tylko to, co zmierzyłeś. Puste pola zostaną pominięte.</p><div class="btn-row"><button class="btn ghost" data-a="closeSheet">Anuluj</button><button class="btn primary grow" data-a="mSave">${ic('save', 18)} Zapisz</button></div>`, { title: 'Nowy pomiar' });
  };
  F.act.mSave = async () => {
    const v = {}; MF.forEach(([k]) => { const x = num(F.$('#m-' + k).value); if (x > 0 && x < 300) v[k] = x; });
    if (!Object.keys(v).length) { F.toast('Wpisz przynajmniej jeden pomiar'); return; }
    const d = F.$('#m-date').value.split('-').map(Number); const e = { id: F.uid(), date: new Date(d[0], d[1] - 1, d[2], 8).getTime(), v };
    F.S.measures.push(e); F.S.measures.sort((a, b) => a.date - b.date); await F.dbPut('measures', e); F.closeSheet(true); F.toast('Zapisano pomiary', 'hot'); F.render(true);
  };
  F.act.mDel = async b => { F.S.measures = F.S.measures.filter(m => m.id !== b.dataset.id); await F.dbDel('measures', b.dataset.id); F.render(true); };

  // ---- zdjęcia ----
  const POSES = { front: 'Przód', side: 'Bok', back: 'Tył' };
  function bodyPhotos() {
    const ph = F.ui.photos;
    if (!ph) { F.loadPhotos().then(() => { if (F.ui.statTab === 'body' && F.ui.bodyTab === 'p') F.render(true); }); return `<p class="dim center pad">Wczytuję zdjęcia…</p>`; }
    const pose = F.ui.pPose || '';
    const list = ph.filter(p => !pose || p.pose === pose);
    const canCmp = ['front', 'side', 'back'].some(k => ph.filter(p => p.pose === k).length >= 2);
    return `<div class="btn-row"><button class="btn primary grow" data-a="pAdd">${ic('camera', 18)} Dodaj zdjęcie</button><button class="btn ghost" data-a="pCompare" ${canCmp ? '' : 'disabled'}>${ic('arrow-left-right', 18)} Porównaj</button></div>
      <div class="chips"><button class="chip ${!pose ? 'on' : ''}" data-a="pFilter" data-p="">Wszystkie</button>${Object.entries(POSES).map(([k, n]) => `<button class="chip ${pose === k ? 'on' : ''}" data-a="pFilter" data-p="${k}">${n}</button>`).join('')}</div>
      ${list.length ? `<div class="pgrid">${list.map(p => `<button class="pth" data-a="pView" data-id="${p.id}"><img src="${p.th}" alt="Zdjęcie sylwetki ${F.fmtDate(p.date)}" loading="lazy"><span>${POSES[p.pose] || ''}<small>${F.fmtDate(p.date)}</small></span></button>`).join('')}</div>` : F.empty('camera', 'Brak zdjęć', 'Rób zdjęcia co 2–4 tygodnie: to samo światło, ta sama odległość, ta sama poza. Porównanie przed/po robi różnicę.')}
      <p class="dim small">${ic('lock', 13)} Zdjęcia zostają wyłącznie na tym urządzeniu (w pamięci przeglądarki). Nie są nigdzie wysyłane. Trafiają do kopii zapasowej, jeśli wybierzesz kopię ze zdjęciami.</p>`;
  }
  F.loadPhotos = async () => { F.ui.photos = (await F.dbAll('photos')).sort((a, b) => b.date - a.date); return F.ui.photos; };
  F.act.pFilter = b => { F.ui.pPose = b.dataset.p; F.render(true); };
  const resize = (img, max, q) => { const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); };
  F.fileToImages = async (file, big = 1080, small = 280) => {
    const url = URL.createObjectURL(file); try { const img = new Image(); img.src = url; await img.decode(); return { data: resize(img, big, .82), th: resize(img, small, .7) }; } finally { URL.revokeObjectURL(url); }
  };
  F.act.pAdd = () => {
    let pose = 'front', file = null;
    F.sheet(`<div class="seg tiny pose">${Object.entries(POSES).map(([k, n]) => `<button class="${k === pose ? 'on' : ''}" data-a="pPose" data-p="${k}">${n}</button>`).join('')}</div><label class="fld"><span>Data</span><input type="date" id="p-date" value="${F.dateInput(Date.now())}"></label>
      <button class="drop2" data-a="pPick" id="p-pick">${ic('camera', 28)}<b>Zrób zdjęcie lub wybierz z galerii</b><small>Stój prosto, dobre światło, ta sama odległość</small></button><img id="p-prev" class="p-prev" alt="" hidden>
      <div class="btn-row"><button class="btn ghost" data-a="closeSheet">Anuluj</button><button class="btn primary grow" data-a="pSave" id="p-save" disabled>${ic('save', 18)} Zapisz</button></div>`, { title: 'Nowe zdjęcie' });
    F.act.pPose = b => { pose = b.dataset.p; F.$$('.pose button').forEach(x => x.classList.toggle('on', x.dataset.p === pose)); };
    F.act.pPick = async () => { const f = await F.pickFile('image/*'); if (!f) return; try { file = await F.fileToImages(f); const pv = F.$('#p-prev'); pv.src = file.th; pv.hidden = false; F.$('#p-pick').hidden = true; F.$('#p-save').disabled = false; } catch (e) { F.toast('Nie udało się wczytać zdjęcia', 'err'); } };
    F.act.pSave = async () => { if (!file) return; const d = F.$('#p-date').value.split('-').map(Number); const rec = { id: F.uid(), date: new Date(d[0], d[1] - 1, d[2], 8).getTime(), pose, th: file.th, data: file.data }; await F.dbPut('photos', rec); await F.loadPhotos(); F.closeSheet(true); F.toast('Zdjęcie zapisane', 'hot'); F.render(true); };
  };
  F.act.pView = b => {
    const p = (F.ui.photos || []).find(x => x.id === b.dataset.id); if (!p) return; const bw = F.latestBW(p.date + DAY);
    F.sheet(`<img class="p-big" src="${p.data}" alt="Zdjęcie sylwetki"><p class="sheet-p center"><b>${POSES[p.pose] || ''}</b> · ${F.fmtDate(p.date)}${bw ? ` · ${F.fwu(bw)}` : ''}</p><div class="btn-row"><button class="btn danger" data-a="pDel" data-id="${p.id}">${ic('trash-2', 18)} Usuń</button><button class="btn ghost grow" data-a="closeSheet">Zamknij</button></div>`, { title: 'Zdjęcie', cls: 'tall' });
  };
  F.act.pDel = async b => { if (!(await F.confirm({ title: 'Usunąć zdjęcie?', text: 'Zniknie na stałe z tego urządzenia.', ok: 'Usuń', danger: true }))) return; await F.dbDel('photos', b.dataset.id); await F.loadPhotos(); F.closeSheet(true); F.render(true); };
  F.act.pCompare = () => {
    const ph = F.ui.photos || []; let pose = ['front', 'side', 'back'].find(k => ph.filter(p => p.pose === k).length >= 2) || 'front';
    const draw = () => {
      const l = ph.filter(p => p.pose === pose).sort((a, b) => a.date - b.date); const A = F.ui.cmpA && l.find(p => p.id === F.ui.cmpA) || l[0], B = F.ui.cmpB && l.find(p => p.id === F.ui.cmpB) || l[l.length - 1];
      const opt = (sel) => l.map(p => `<option value="${p.id}" ${p.id === sel.id ? 'selected' : ''}>${F.fmtDate(p.date)}</option>`).join('');
      const d = A && B ? Math.round((B.date - A.date) / DAY) : 0; const w1 = A && F.latestBW(A.date + DAY), w2 = B && F.latestBW(B.date + DAY);
      return `<div class="seg tiny pose">${Object.entries(POSES).map(([k, n]) => `<button class="${k === pose ? 'on' : ''}" data-a="cmpPose" data-p="${k}" ${ph.filter(p => p.pose === k).length < 2 ? 'disabled' : ''}>${n}</button>`).join('')}</div>
        <div class="two"><label class="fld"><span>Przed</span><select data-b="cmpSel" data-w="a">${opt(A)}</select></label><label class="fld"><span>Po</span><select data-b="cmpSel" data-w="b">${opt(B)}</select></label></div>
        <div class="cmp" id="cmp"><img src="${B.data}" alt="Po"><div class="cmp-a" id="cmp-a"><img src="${A.data}" alt="Przed"></div><i class="cmp-h" id="cmp-h"></i><span class="cmp-l l">PRZED · ${F.fmtDateShort(A.date)}</span><span class="cmp-l r">PO · ${F.fmtDateShort(B.date)}</span><input type="range" min="0" max="100" value="50" id="cmp-r" aria-label="Przesuń porównanie"></div>
        <p class="dim small center">${d} ${F.plur(d, 'dzień', 'dni', 'dni')} różnicy${w1 && w2 ? ` · ${F.fwu(w1)} → ${F.fwu(w2)}` : ''}</p>`;
    };
    const el = F.sheet('<div id="cmp-wrap"></div>', { title: 'Przed / po', cls: 'tall' }); const wrap = () => el.querySelector('#cmp-wrap');
    const apply = () => { wrap().innerHTML = draw(); const r = el.querySelector('#cmp-r'); const set = () => { el.querySelector('#cmp-a').style.clipPath = `inset(0 ${100 - r.value}% 0 0)`; el.querySelector('#cmp-h').style.left = r.value + '%'; }; r.addEventListener('input', set); set(); };
    F.act.cmpPose = b => { pose = b.dataset.p; F.ui.cmpA = F.ui.cmpB = null; apply(); };
    F.bind.cmpSel = e => { if (e.dataset.w === 'a') F.ui.cmpA = e.value; else F.ui.cmpB = e.value; apply(); };
    apply();
  };

  /* =====================================================================
     TECHNIKA ĆWICZEŃ: zdjęcia, opis, mięśnie
     ===================================================================== */
  const IMG1 = (d, n) => `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${d}/${n}.jpg`;
  const IMG2 = (d, n) => `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${d}/${n}.jpg`;
  document.addEventListener('error', e => {
    const t = e.target; if (!t || t.tagName !== 'IMG' || !t.dataset.d) return;
    if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = IMG2(t.dataset.d, t.dataset.n); } else { const box = t.closest('.tech-img'); if (box) box.classList.add('off'); }
  }, true);
  F.exMuscles = id => { const ex = exOf(id); if (!ex) return { p: [], s: [] }; const i = F.EXINFO && F.EXINFO[id]; const p = i && i.p && i.p.length ? i.p : [ex.muscle]; const s = F.secondaryOf(id); return { p, s: s.filter(m => !p.includes(m)) }; };
  F.techHtml = id => {
    const ex = exOf(id); if (!ex) return ''; const i = F.EXINFO && F.EXINFO[id]; const mu = F.exMuscles(id);
    const chips = (arr, cls) => arr.filter(m => F.MUSCLES[m]).map(m => `<span class="mchip ${cls}" style="--mc:${F.MUSCLE_COLORS[m] || '#888'}">${F.MUSCLES[m]}</span>`).join('');
    let media = '';
    if (ex.img) media = `<div class="tech-img one"><img src="${ex.img}" alt="${E(ex.name)}"></div>`;
    else if (i && i.d) media = `<div class="tech-img n${i.n}">${Array.from({ length: Math.min(2, i.n) }, (_, k) => `<img crossorigin="anonymous" loading="lazy" decoding="async" data-d="${E(i.d)}" data-n="${k}" src="${IMG1(i.d, k)}" alt="${E(ex.name)} — ${k ? 'koniec' : 'start'} ruchu">`).join('')}<em class="tech-off">Zdjęcia pobiorą się po połączeniu z internetem.</em></div>`;
    const tips = ex.tip ? String(ex.tip).split(/\n+/).filter(Boolean) : ((i && i.t) || []);
    const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' technika')}`;
    return `${media}<div class="tech-m"><div><small>Główne</small><div class="mchips">${chips(mu.p, 'p')}</div></div>${mu.s.length ? `<div><small>Pomocnicze</small><div class="mchips">${chips(mu.s, 's')}</div></div>` : ''}</div>
      ${tips.length ? `<h4 class="lbl">Technika</h4><ul class="tips">${tips.map(t => `<li>${E(t)}</li>`).join('')}</ul>` : `<p class="dim small">Brak opisu techniki. Dodaj własny w edycji ćwiczenia.</p>`}
      ${i && i.i && i.i.length ? `<details class="en"><summary>Instrukcja krok po kroku (angielski)</summary><ol>${i.i.map(t => `<li>${E(t)}</li>`).join('')}</ol></details>` : ''}
      <a class="btn ghost wide" href="${yt}" target="_blank" rel="noopener">${ic('play', 18)} Szukaj filmu z techniką</a>
      ${i && i.d ? `<p class="dim tiny credit">Zdjęcia i angielskie instrukcje: Free Exercise DB (domena publiczna).</p>` : ''}`;
  };
  F.act.techOpen = b => { const ex = exOf(b.dataset.id); if (!ex) return; F.sheet(F.techHtml(ex.id), { title: E(ex.name), cls: 'tall' }); };

  /* =====================================================================
     DELOAD + wskazówki progresji
     ===================================================================== */
  F.deloadBanner = () => {
    const s = F.S.settings;
    if (F.deloadOn()) return `<div class="banner hot"><div>${ic('shield', 20)}</div><p><b>Tydzień deload do ${F.fmtDateShort(s.deloadUntil)}</b><br><small>Ciężary −10%, o jedną serię mniej. Regeneruj się.</small></p><button class="btn sm ghost" data-a="deloadStop">Zakończ</button></div>`;
    const adv = F.deloadAdvice(); if (!adv || (s.deloadDismiss || 0) > Date.now() - 7 * DAY) return '';
    return `<div class="banner"><div>${ic('zap', 20)}</div><p><b>Rozważ tydzień deload</b><br><small>${E(adv.why)}.</small></p><button class="btn sm primary" data-a="deloadStart">Włącz</button><button class="ibtn" data-a="deloadDismiss" aria-label="Ukryj">${ic('x', 18)}</button></div>`;
  };
  F.act.deloadStart = async () => { F.S.settings.deloadUntil = Date.now() + 7 * DAY; F.S.settings.lastDeload = Date.now(); await F.saveSettings(); F.toast('Deload włączony na 7 dni: −10% ciężaru, −1 seria', 'hot', 3500); F.render(true); };
  F.act.deloadStop = async () => { F.S.settings.deloadUntil = 0; await F.saveSettings(); F.toast('Deload zakończony'); F.render(true); };
  F.act.deloadDismiss = async () => { F.S.settings.deloadDismiss = Date.now(); await F.saveSettings(); F.render(true); };
  F.progressHtml = () => {
    const st = F.stagnating(); const dl = F.deloadOn();
    const list = st.slice(0, 5).map(x => `<a class="exrow" href="#/ex/${E(x.exId)}">${F.mDot(exOf(x.exId).muscle)}<span><b>${E(F.exName(x.exId))}</b><small>${x.stuck} ${F.plur(x.stuck, 'trening', 'treningi', 'treningów')} bez nowego rekordu 1RM</small></span>${ic('chevron-right', 16)}</a>`).join('');
    return `<section class="card cut"><h3>${ic('chart-line', 18)} Progresja</h3>
      ${st.length ? `<p class="dim small">Ćwiczenia wielostawowe, w których od 3+ treningów nie ma postępu. Aplikacja zasugeruje ciężar −10% (reset), a gdy takich ćwiczeń jest więcej — tydzień deload.</p><div class="exlist">${list}</div>` : `<p class="dim small">Brak stagnacji w ćwiczeniach wielostawowych. Postęp idzie.</p>`}
      <div class="btn-row">${dl ? `<button class="btn ghost grow" data-a="deloadStop">${ic('x', 18)} Zakończ deload (do ${F.fmtDateShort(F.S.settings.deloadUntil)})</button>` : `<button class="btn ghost grow" data-a="deloadStart">${ic('shield', 18)} Włącz tydzień deload</button>`}</div></section>`;
  };
})();
