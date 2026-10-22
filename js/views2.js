/* FORGE — historia, szczegóły treningu, postępy, narzędzia, ustawienia, kopie zapasowe */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const exOf = id => F.S.ex.get(id);
  const setTxt = (ex, s) => !ex ? `${F.fw(s.w)}×${s.r}` : ex.type === 'time' ? F.fmtDur(s.r || 0) : ex.type === 'br' ? `${s.r} powt.` : `${F.fw(s.w || 0)} ${F.unit()} × ${s.r}`;
  F.setTxt = setTxt;
  const stype = { n: '', w: 'rozgrzewka', d: 'drop set', f: 'do upadku' };

  /* ================= HISTORIA ================= */
  V.history = () => {
    const t = F.totals();
    return {
      html: `${F.head('Historia', { sub: `${t.count} ${t.count === 1 ? 'trening' : 'treningów'} zapisanych na zawsze`, right: `<button class="ibtn" data-a="exportSheet" aria-label="Eksport">${ic('download', 22)}</button>` })}
      ${t.count ? `<div class="tiles three"><div class="tile cut"><span class="tl">Treningi</span><b class="tv" data-count="${t.count}">0</b></div><div class="tile cut"><span class="tl">Tonaż</span><b class="tv sm">${F.fmtVol(t.vol)}</b></div><div class="tile cut"><span class="tl">Czas</span><b class="tv sm">${F.fmtDurHuman(t.dur)}</b></div></div>
      <section class="card cut"><h3>Aktywność · 18 tygodni</h3>${F.chart.heat(18)}</section>
      <div class="search">${ic('search', 18)}<input data-b="hq" placeholder="Szukaj po nazwie lub ćwiczeniu…" value="${E(F.ui.histQ)}" autocomplete="off"></div>` : ''}
      <div id="h-list">${histList(F.ui.histQ)}</div>
      <button class="btn ghost wide" data-a="backdate">${ic('calendar', 18)} Dodaj trening z przeszłości</button>`
    };
  };
  function histList(q) {
    const nq = F.norm(q); let arr = F.S.sessions;
    if (nq) arr = arr.filter(s => F.norm((s.name || '') + ' ' + s.exercises.map(e => (exOf(e.exId) || {}).name || '').join(' ')).includes(nq));
    if (!arr.length) return F.empty('history', F.S.sessions.length ? 'Brak wyników' : 'Historia jest pusta', F.S.sessions.length ? 'Zmień frazę wyszukiwania.' : 'Pierwszy trening zapisze się tutaj. Zostanie na zawsze, bez limitów.');
    let out = '', cur = '';
    arr.forEach(s => {
      const d = new Date(s.start), key = d.getFullYear() + '-' + d.getMonth();
      if (key !== cur) { cur = key; out += `<h3 class="sec month">${MONTHS[d.getMonth()]} ${d.getFullYear()}</h3>`; }
      const names = s.exercises.map(e => (exOf(e.exId) || { name: '?' }).name);
      out += `<a class="sess cut" href="#/session/${s.id}"><div class="sd"><b>${d.getDate()}</b><small>${F.MON[d.getMonth()]}</small></div><div class="sb"><h3>${E(s.name || 'Trening')}</h3><p class="meta"><span>${ic('timer', 13)} ${F.fmtMin(s.dur)}</span><span>${ic('weight', 13)} ${F.fmtVol(F.sessionVolume(s))}</span><span>${ic('layers', 13)} ${F.sessionSets(s)} serii</span><span>${ic('flame', 13)} ${F.fmtNum(Math.round(F.sessKcal(s).net / 5) * 5, 0)} kcal</span></p><p class="sx">${E(names.slice(0, 3).join(', '))}${names.length > 3 ? ` +${names.length - 3}` : ''}</p></div>${s.prs && s.prs.length ? `<span class="prb">${ic('trophy', 14)}${s.prs.length}</span>` : ''}</a>`;
    });
    return out;
  }
  F.bind.hq = el => { F.ui.histQ = el.value; F.$('#h-list').innerHTML = histList(F.ui.histQ); };
  F.act.backdate = () => {
    F.sheet(`<label class="fld"><span>Data treningu</span><input type="date" id="bd-d" value="${F.dateInput(Date.now())}" max="${F.dateInput(Date.now())}"></label><p class="sheet-p dim">Zapiszesz trening tak, jakby odbył się w wybranym dniu. Potem możesz dodać ćwiczenia i serie.</p><div class="btn-row"><button class="btn primary grow" data-a="backdateGo">Dalej</button></div>`, { title: 'Trening z przeszłości', cls: 'compact' });
  };
  F.act.backdateGo = () => { const v = F.$('#bd-d').value; if (!v) return; const [y, m, d] = v.split('-').map(Number); F.closeSheet(true); F.startWorkout({ empty: true, backdate: new Date(y, m - 1, d, 18, 0).getTime() }); };

  /* ---------- eksport ---------- */
  F.act.exportSheet = () => {
    F.sheet(`<div class="menu"><button data-a="expJson">${ic('file-json', 20)}<span>Pełna kopia zapasowa (JSON)<small>Wszystko: historia, plany, ćwiczenia, ustawienia</small></span></button><button data-a="expCsv">${ic('file-spreadsheet', 20)}<span>Historia treningów (CSV)<small>Do Excela, Arkuszy Google lub innych aplikacji</small></span></button><button data-a="expRestore">${ic('upload', 20)}<span>Przywróć z kopii<small>Wczytaj plik JSON wygenerowany przez FORGE</small></span></button></div>`, { title: 'Eksport i kopie' });
  };
  F.doBackup = async withPhotos => {
    const stamp = F.dateInput(Date.now()); const json = JSON.stringify(await F.exportFull(withPhotos !== false));
    const file = new File([json], `forge-backup-${stamp}.json`, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] }) && F.isStandalone()) { await navigator.share({ files: [file], title: 'Kopia FORGE' }); } else F.download(file.name, file); }
    catch (e) { if (e && e.name === 'AbortError') return; F.download(file.name, file); }
    F.S.settings.lastBackup = Date.now(); await F.saveSettings(); F.toast('Kopia zapisana', 'hot'); if (location.hash === '#/home') F.render(true);
  };
  F.act.expJson = () => { F.closeSheet(true); F.doBackup(); };
  F.act.expCsv = () => { F.closeSheet(true); F.download(`forge-historia-${F.dateInput(Date.now())}.csv`, F.exportCSV(), 'text/csv;charset=utf-8'); F.toast('Wyeksportowano CSV'); };
  F.act.expRestore = () => { F.closeSheet(true); F.pickFile('.json,application/json').then(async f => { if (!f) return; try { const data = JSON.parse(await f.text()); if (data.kind === 'plan') { await F.importPlanFile(data); return; } F.restoreSheet(data); } catch (e) { F.toast('Nie udało się odczytać pliku', 'err'); } }); };
  F.pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.oncancel = () => res(null); i.click(); });
  F.restoreSheet = data => {
    if (!data || data.app !== 'FORGE') { F.toast('To nie jest kopia FORGE', 'err'); return; }
    F.sheet(`<p class="sheet-p">W pliku: <b>${(data.sessions || []).length}</b> treningów, <b>${(data.plans || []).length}</b> planów, <b>${(data.exercises || []).length}</b> ćwiczeń.</p><div class="menu"><button data-a="restMerge">${ic('layers', 20)}<span>Połącz z obecnymi danymi<small>Dodaje brakujące, nic nie kasuje</small></span></button><button class="danger" data-a="restReplace">${ic('rotate-ccw', 20)}<span>Zastąp wszystko<small>Obecne dane zostaną usunięte</small></span></button></div>`, { title: 'Przywracanie kopii' });
    const run = async mode => { try { const r = await F.importAll(data, mode); F.closeSheet(true); F.toast(`Wczytano ${r.sessions} treningów i ${r.plans} planów`, 'hot'); F.render(); } catch (e) { F.toast(e.message, 'err'); } };
    F.act.restMerge = () => run('merge'); F.act.restReplace = async () => { if (await F.confirm({ title: 'Zastąpić wszystko?', text: 'Wszystkie obecne dane zostaną nadpisane danymi z pliku.', ok: 'Zastąp', danger: true })) run('replace'); };
  };

  /* ================= TRENING — SZCZEGÓŁY ================= */
  V.session = id => {
    const s = F.S.sessions.find(x => x.id === id); if (!s) return { html: F.head('Trening', { back: 1 }) + F.empty('history', 'Nie znaleziono treningu', 'Ten trening został usunięty.') };
    const edit = F.ui.sessEdit === id; const vol = F.sessionVolume(s);
    const prMap = new Set((s.prs || []).map(p => p.exId));
    const sinf = F.ssInfo(s.exercises); const kc = F.sessKcal(s); const kcOf = id => { const x = kc.perEx.find(p => p.exId === id); return x ? `<span class="xk">${F.icon ? '' : ''}${F.fmtNum(Math.round(x.kcal), 0)} kcal</span>` : ''; };
    const ssBlock = g => {
      const mem = s.exercises.slice(g.start, g.end + 1); const R = Math.max(...mem.map(e => e.sets.filter(x => x.done).length)); let rows = '';
      for (let j = 0; j < R; j++) rows += `<div class="ser ssrow"><span class="sn">${j + 1}</span><div class="ssr-l">${mem.map((e, n) => { const ex = exOf(e.exId); const x = e.sets.filter(q => q.done)[j]; return `<div><span class="ss-tag">${g.L}${n + 1}</span>${x ? `<b>${setTxt(ex, x)}</b>${x.rpe ? `<em class="tag">RPE ${x.rpe}</em>` : ''}${x.pr && x.pr.length ? `<span class="prb sm">${ic('trophy', 12)} PR</span>` : ''}` : '<span class="dim">–</span>'}</div>`; }).join('')}</div></div>`;
      return `<section class="card cut xblk ssblk"><div class="xb-h"><span class="ssc-t">${ic('link-2', 15)} ${F.ssName(g.size)} ${g.L}</span><span class="xk">${F.fmtNum(Math.round(mem.reduce((a, e) => a + ((kc.perEx.find(p => p.exId === e.exId) || {}).kcal || 0), 0)), 0)} kcal</span></div>${mem.map((e, n) => `<a class="ssn" href="#/ex/${E(e.exId)}"><span class="ss-tag">${g.L}${n + 1}</span>${E(F.exName(e.exId))}</a>`).join('')}${rows}</section>`;
    };
    const blocks = s.exercises.map((e, ei) => {
      if (!edit && sinf[ei]) { if (sinf[ei].pos > 0) return ''; if (s.exercises.slice(sinf[ei].start, sinf[ei].end + 1).some(m => m.sets.some(x => x.done))) return ssBlock(sinf[ei]); }
      const ex = exOf(e.exId); const isT = ex && ex.type === 'time', isB = ex && ex.type === 'br'; let n = 0;
      const rows = e.sets.map((x, si) => {
        if (!edit && !x.done) return ''; if (x.t !== 'w') n++;
        const e1 = ex && !isT && !isB && x.w && x.r ? F.e1rm(F.effLoad(ex, x, s.start), x.r) : 0;
        if (edit) return `<div class="ser edit"><span class="sn t-${x.t || 'n'}">${x.t === 'w' ? 'R' : x.t === 'd' ? 'D' : x.t === 'f' ? 'F' : n}</span><div class="se-in">${isT || isB ? '' : `<input inputmode="decimal" data-b="se" data-ei="${ei}" data-si="${si}" data-f="w" value="${F.fw(x.w || 0).replace(',', '.')}"><em>${F.unit()}</em>`}<input inputmode="decimal" data-b="se" data-ei="${ei}" data-si="${si}" data-f="r" value="${x.r || 0}"><em>${isT ? 's' : 'powt.'}</em></div><button class="ibtn" data-a="seDel" data-ei="${ei}" data-si="${si}" aria-label="Usuń serię">${ic('x', 16)}</button></div>`;
        return `<div class="ser ${x.t === 'w' ? 'warm' : ''}"><span class="sn t-${x.t || 'n'}">${x.t === 'w' ? 'R' : x.t === 'd' ? 'D' : x.t === 'f' ? 'F' : n}</span><b>${setTxt(ex, x)}</b>${x.t && x.t !== 'n' ? `<em class="tag">${stype[x.t]}</em>` : ''}${x.rpe ? `<em class="tag">RPE ${x.rpe}</em>` : ''}${x.pr && x.pr.length ? `<span class="prb sm">${ic('trophy', 12)} PR</span>` : ''}<span class="e1">${e1 ? '1RM ≈ ' + F.fw(e1) : ''}</span></div>`;
      }).join('');
      if (!rows.trim() && !edit) return '';
      return `<section class="card cut xblk"><div class="xb-h"><a href="#/ex/${E(e.exId)}">${sinf[ei] ? `<span class="ss-tag">${sinf[ei].tag}</span>` : F.mDot(ex && ex.muscle)}<h3>${E(ex ? ex.name : 'Usunięte ćwiczenie')}</h3></a>${edit ? '' : kcOf(e.exId)}${prMap.has(e.exId) ? `<span class="prb">${ic('trophy', 14)}</span>` : ''}</div>${rows}${edit ? `<button class="btn ghost sm" data-a="seAdd" data-ei="${ei}">${ic('plus', 15)} Dodaj serię</button>` : ''}${e.note ? `<p class="note">${ic('notebook-pen', 14)} ${E(e.note)}</p>` : ''}</section>`;
    }).join('');
    return {
      html: `${F.head(edit ? 'Edycja treningu' : E(s.name || 'Trening'), { back: 1, sub: `${F.fmtDateLong(s.start)} · ${F.fmtTime(s.start)}`, right: edit ? `<button class="btn sm primary" data-a="sessDone">${ic('check', 16)} Gotowe</button>` : `<button class="ibtn" data-a="sessMenu" data-id="${s.id}" aria-label="Więcej">${ic('ellipsis', 22)}</button>` })}
      ${edit ? `<div class="card cut"><label class="fld"><span>Nazwa</span><input data-b="sname" value="${E(s.name || '')}"></label><label class="fld"><span>Data</span><input type="date" data-b="sdate" value="${F.dateInput(s.start)}"></label><label class="fld"><span>Czas trwania (min)</span><input inputmode="numeric" data-b="sdur" value="${Math.round((s.dur || 0) / 60)}"></label></div>` : `<div class="tiles"><div class="tile cut"><span class="tl">Czas</span><b class="tv sm">${F.fmtMin(s.dur)}</b></div><div class="tile cut"><span class="tl">Tonaż</span><b class="tv sm">${F.fmtVol(vol)}</b></div><div class="tile cut"><span class="tl">Serie</span><b class="tv sm">${F.sessionSets(s)}</b></div><div class="tile cut"><span class="tl">Powt.</span><b class="tv sm">${F.sessionReps(s)}</b></div></div>`}
      ${edit ? '' : F.kcalCard(F.sessKcal(s), s.id)}
      ${!edit && s.prs && s.prs.length ? `<section class="card cut prs"><h3>${ic('trophy', 18)} Rekordy z tego treningu</h3>${s.prs.map(p => `<a href="#/ex/${E(p.exId)}"><b>${E(F.exName(p.exId))}</b><span>${E(p.label)} · ${E(p.text)}</span></a>`).join('')}</section>` : ''}
      ${blocks}
      ${s.note && !edit ? `<p class="note big">${ic('notebook-pen', 16)} ${E(s.note)}</p>` : ''}
      ${edit ? `<label class="fld"><span>Notatka do treningu</span><textarea data-b="snote" rows="3">${E(s.note || '')}</textarea></label>` : ''}`
    };
  };
  const SS = () => F.S.sessions.find(x => x.id === (location.hash.match(/session\/([^/]+)/) || [])[1]);
  let saveT = 0; const saveSess = s => { clearTimeout(saveT); saveT = setTimeout(() => F.dbPut('sessions', s), 300); };
  F.bind.se = el => { const s = SS(); const set = s.exercises[+el.dataset.ei].sets[+el.dataset.si]; const v = parseFloat(String(el.value).replace(',', '.')) || 0; if (el.dataset.f === 'w') set.w = F.fromDisp(v); else set.r = v; saveSess(s); };
  F.bind.sname = el => { const s = SS(); s.name = el.value; saveSess(s); };
  F.bind.snote = el => { const s = SS(); s.note = el.value; saveSess(s); };
  F.bind.sdur = el => { const s = SS(); s.dur = (parseInt(el.value) || 0) * 60; saveSess(s); };
  F.bind.sdate = el => { const s = SS(); const [y, m, d] = el.value.split('-').map(Number); if (!y) return; const t = new Date(s.start); s.start = new Date(y, m - 1, d, t.getHours(), t.getMinutes()).getTime(); saveSess(s); };
  F.act.seDel = b => { const s = SS(); s.exercises[+b.dataset.ei].sets.splice(+b.dataset.si, 1); saveSess(s); F.render(true); };
  F.act.seAdd = b => { const s = SS(); const e = s.exercises[+b.dataset.ei]; const l = e.sets[e.sets.length - 1] || { w: 0, r: 0 }; e.sets.push({ w: l.w, r: l.r, t: 'n', done: true }); saveSess(s); F.render(true); };
  F.act.sessDone = async () => { const s = SS(); F.ui.sessEdit = null; s.start = s.start; F.S.sessions.sort((a, b) => b.start - a.start); await F.dbPut('sessions', s); F.rebuild(); F.toast('Zapisano zmiany', 'hot'); F.render(true); };
  F.act.sessMenu = b => {
    const id = b.dataset.id;
    F.sheet(`<div class="menu"><button data-a="sessEdit" data-id="${id}">${ic('pencil', 20)}Edytuj trening</button><button data-a="sessRepeat" data-id="${id}">${ic('repeat', 20)}Powtórz ten trening</button><button data-a="sessShare" data-id="${id}">${ic('share-2', 20)}Udostępnij kartę treningu</button><button class="danger" data-a="sessDel" data-id="${id}">${ic('trash-2', 20)}Usuń trening</button></div>`, { title: 'Trening' });
  };
  F.act.sessEdit = b => { F.ui.sessEdit = b.dataset.id; F.closeSheet(true); F.render(true); };
  F.act.sessRepeat = b => { const s = F.S.sessions.find(x => x.id === b.dataset.id); F.closeSheet(true); F.startWorkout({ fromSession: s }); };
  F.act.sessShare = b => { const s = F.S.sessions.find(x => x.id === b.dataset.id); F.closeSheet(true); F.shareCard(s); };
  F.act.sessDel = async b => { const s = F.S.sessions.find(x => x.id === b.dataset.id); if (await F.confirm({ title: 'Usunąć trening?', text: `„${E(s.name || 'Trening')}” z ${F.fmtDate(s.start)} zniknie razem z rekordami, które pobił.`, ok: 'Usuń', danger: true })) { await F.delSession(s.id); F.toast('Trening usunięty'); F.go('#/history'); } };

  /* ================= POSTĘPY ================= */
  V.stats = () => {
    const tab = F.ui.statTab; const t = F.totals();
    const tabs = [['over', 'Przegląd'], ['mus', 'Mięśnie'], ['str', 'Siła'], ['prs', 'Rekordy'], ['body', 'Ciało']];
    let body = '';
    if (!t.count && tab !== 'body' && tab !== 'str') body = F.empty('chart-line', 'Brak danych do analizy', 'Zrób pierwszy trening. Wykresy, rekordy i rangi ruszą od razu.');
    else if (tab === 'over') body = statsOver(t); else if (tab === 'mus') body = F.statsMuscles(); else if (tab === 'str') body = F.statsStrength(); else if (tab === 'prs') body = statsPR(); else body = F.statsBody();
    return { html: `${F.head('Postępy', { sub: 'Liczby nie kłamią' })}<div class="seg big five">${tabs.map(x => `<button class="${x[0] === tab ? 'on' : ''}" data-a="statTab" data-t="${x[0]}">${x[1]}</button>`).join('')}</div>${body}`, after: root => F.chart.bindTips(root) };
  };
  F.act.statTab = b => { F.ui.statTab = b.dataset.t; F.render(true); };
  function statsOver(t) {
    const wk = F.weekCounts(12); const mv = F.muscleVolume(30); const rk = F.rank(); const ach = F.achievements();
    const mus = Object.entries(mv).sort((a, b) => b[1] - a[1]).map(([m, v]) => ({ label: F.MUSCLES[m], value: v, color: F.MUSCLE_COLORS[m], text: v + ' serii' }));
    const cnt = {}; F.S.sessions.forEach(s => s.exercises.forEach(e => { if (e.sets.some(x => x.done)) cnt[e.exId] = (cnt[e.exId] || 0) + 1; }));
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return `<div class="tiles"><div class="tile cut"><span class="tl">Tonaż łącznie</span><b class="tv sm">${F.fmtVol(t.vol)}</b></div><div class="tile cut"><span class="tl">Serie</span><b class="tv" data-count="${t.sets}">0</b></div><div class="tile cut"><span class="tl">Powtórzenia</span><b class="tv" data-count="${t.reps}">0</b></div><div class="tile cut"><span class="tl">Czas pod sztangą</span><b class="tv sm">${F.fmtDurHuman(t.dur)}</b></div></div>
    <div class="tiles two"><div class="tile cut"><span class="tl">${ic('flame', 15)} Kalorie — 7 dni</span><b class="tv sm">${F.fmtNum(Math.round(F.kcalTotals(7) / 5) * 5, 0)} kcal</b></div><div class="tile cut"><span class="tl">${ic('flame', 15)} Kalorie — razem</span><b class="tv sm">${F.fmtNum(Math.round(F.kcalTotals(0)), 0)} kcal</b></div></div>
    <section class="card cut"><h3>Spalone kalorie tygodniowo <small class="dim">netto, szacunek</small></h3>${F.chart.bars(F.kcalWeeks(12).map((w, i, a) => ({ label: F.fmtDateShort(w.start).split(' ')[0] + '.' + String(new Date(w.start).getMonth() + 1).padStart(2, '0'), value: w.kcal, tip: `Tydzień od ${F.fmtDate(w.start)}: ${F.fmtNum(Math.round(w.kcal), 0)} kcal`, hl: i === a.length - 1 })), { labelEvery: 3 })}</section>
    <section class="card cut"><h3>Tonaż tygodniowy</h3>${F.chart.bars(wk.map((w, i) => ({ label: F.fmtDateShort(w.start).split(' ')[0] + '.' + String(new Date(w.start).getMonth() + 1).padStart(2, '0'), value: w.vol, tip: `Tydzień od ${F.fmtDate(w.start)}: ${F.fmtVol(w.vol)}`, hl: i === wk.length - 1 })), { labelEvery: 3 })}</section>
    <section class="card cut"><h3>Treningi w tygodniu <small class="dim">cel ${F.S.settings.weeklyGoal}</small></h3>${F.chart.bars(wk.map((w, i) => ({ label: F.fmtDateShort(w.start).split(' ')[0], value: w.count, tip: `Tydzień od ${F.fmtDate(w.start)}: ${w.count} tr.`, hl: i === wk.length - 1 })), { labelEvery: 3, values: it => it.value })}</section>
    <section class="card cut"><h3>Podział partii <small class="dim">ostatnie 30 dni</small></h3>${mus.length ? F.chart.hbars(mus) : '<p class="dim">Brak treningów w ostatnich 30 dniach.</p>'}</section>
    ${F.progressHtml()}
    <section class="card cut rank"><div class="rank-top"><div><span class="dim">Ranga</span><h3 class="rk">${rk.name}</h3></div><div class="xp">${F.fmtNum(rk.xp, 0)} <small>XP</small></div></div><div class="bar"><i style="width:${(rk.pct * 100).toFixed(1)}%"></i></div><p class="dim">${rk.next ? `Do rangi ${rk.next}: ${F.fmtNum(rk.toNext, 0)} XP` : 'Maksymalna ranga.'} Punkty zdobywasz za tonaż, serie, treningi i rekordy.</p></section>
    <h3 class="sec">Osiągnięcia <small class="dim">${ach.filter(a => a.done).length}/${ach.length}</small></h3>
    <div class="badges">${ach.map(a => `<div class="badge cut ${a.done ? 'done' : ''}">${ic(a.icon, 26)}<b>${E(a.name)}</b><small>${E(a.desc)}</small>${a.done ? '' : `<div class="bar sm"><i style="width:${(a.cur / a.goal * 100).toFixed(0)}%"></i></div>`}</div>`).join('')}</div>
    ${top.length ? `<h3 class="sec">Najczęściej trenowane</h3><div class="exlist">${top.map(([id, c]) => { const ex = exOf(id); return ex ? `<a class="exrow" href="#/ex/${E(id)}">${F.mDot(ex.muscle)}<span><b>${E(ex.name)}</b><small>${c} treningów</small></span>${ic('chevron-right', 16)}</a>` : ''; }).join('')}</div>` : ''}`;
  }
  function statsPR() {
    const items = Object.entries(F.PR).map(([id, p]) => ({ id, ex: exOf(id), p })).filter(x => x.ex).sort((a, b) => Math.max(...Object.values(b.p.ts || { 0: 0 })) - Math.max(...Object.values(a.p.ts || { 0: 0 })));
    const big = id => (F.PR[id] ? F.PR[id].w : 0); const sq = big('squat'), bn = big('bench'), dl = big('deadlift');
    const total = sq + bn + dl;
    const top = total ? `<section class="card cut total"><h3>Suma trójboju</h3><div class="big-n">${F.fw(total)} <small>${F.unit()}</small></div><div class="trio"><div><small>Przysiad</small><b>${sq ? F.fw(sq) : '–'}</b></div><div><small>Wyciskanie</small><b>${bn ? F.fw(bn) : '–'}</b></div><div><small>Martwy</small><b>${dl ? F.fw(dl) : '–'}</b></div></div></section>` : '';
    return `${top}<h3 class="sec">Tablica rekordów <small class="dim">${items.length}</small></h3><div class="exlist">${items.map(({ id, ex, p }) => {
      let main = '', sub = ''; if (ex.type === 'time') { main = F.fmtDur(p.dur); } else if (ex.type === 'br') { main = p.reps + ' powt.'; } else { const r = p.byW[Math.round(p.w * 100)] || 0; main = `${F.fw(p.w)} ${F.unit()} × ${r}`; sub = p.e1 ? `1RM ≈ ${F.fw(p.e1)}` : ''; }
      const last = Math.max(...Object.values(p.ts || { 0: 0 }));
      return `<a class="exrow pr" href="#/ex/${E(id)}">${F.mDot(ex.muscle)}<span><b>${E(ex.name)}</b><small>${sub ? sub + ' · ' : ''}${F.fmtDate(last)}</small></span><em>${main}</em></a>`;
    }).join('')}</div>`;
  }
  function statsBody() {
    const bw = F.S.bw; const last = bw[bw.length - 1]; const first = bw[0];
    const pts = bw.map(b => ({ x: b.date, y: F.toDisp(b.kg), tip: `${F.fmtDate(b.date)}: ${F.fw(b.kg)} ${F.unit()}` }));
    const delta = last && first && bw.length > 1 ? last.kg - first.kg : 0;
    return `<div class="tiles two"><div class="tile cut"><span class="tl">${ic('scale', 15)} Aktualna waga</span><b class="tv sm">${last ? F.fwu(last.kg) : '–'}</b></div><div class="tile cut"><span class="tl">Zmiana od początku</span><b class="tv sm ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${bw.length > 1 ? (delta > 0 ? '+' : '') + F.fw(delta) + ' ' + F.unit() : '–'}</b></div></div>
    <section class="card cut"><h3>Wpis wagi</h3><div class="bw-form"><label class="fld"><span>Waga (${F.unit()})</span><input id="bw-v" inputmode="decimal" placeholder="${last ? F.fw(last.kg) : '80,0'}"></label><label class="fld"><span>Data</span><input id="bw-d" type="date" value="${F.dateInput(Date.now())}"></label><button class="btn primary" data-a="bwAdd">${ic('plus', 18)} Dodaj</button></div><p class="dim small">Waga ciała przelicza obciążenie w podciąganiu, dipach i pompkach.</p></section>
    <section class="card cut"><h3>${ic('user', 18)} Twoje dane</h3>${F.profileHtml()}</section>
    <section class="card cut"><h3>Trend wagi</h3>${F.chart.line(pts, { w: 340, h: 200 })}</section>
    ${bw.length ? `<h3 class="sec">Wpisy</h3><div class="hlist">${[...bw].reverse().slice(0, 30).map(b => `<div class="hrow"><span class="hd">${F.fmtDate(b.date)}</span><span class="hs"><b>${F.fwu(b.kg)}</b></span><button class="ibtn" data-a="bwDel" data-id="${b.id}" aria-label="Usuń">${ic('x', 16)}</button></div>`).join('')}</div>` : ''}`;
  }
  F.statsWeight = statsBody;
  F.act.bwAdd = async () => { const v = parseFloat(F.$('#bw-v').value.replace(',', '.')); if (!v || v < 20 || v > 400) { F.toast('Podaj poprawną wagę'); return; } const d = F.$('#bw-d').value.split('-').map(Number); await F.addBW(F.fromDisp(v), new Date(d[0], d[1] - 1, d[2], 8).getTime()); F.rebuild(); F.toast('Zapisano wagę', 'hot'); F.render(true); };
  F.act.bwDel = async b => { await F.delBW(b.dataset.id); F.rebuild(); F.render(true); };

  /* ================= NARZĘDZIA ================= */
  const T = F.ui.tools = { plate: '', oneW: '', oneR: '', warm: '' };
  V.tools = () => {
    const s = F.S.settings; const pc = plateCalc();
    return {
      html: `${F.head('Narzędzia', { back: 1, sub: 'Kalkulatory pod ręką' })}
      <section class="card cut tool"><h3>${ic('timer', 20)} Stoper przerw</h3><div class="rest-big" id="t-rest">${restBlock()}</div></section>
      <section class="card cut tool"><h3>${ic('weight', 20)} Kalkulator talerzy</h3><div class="two"><label class="fld"><span>Ciężar docelowy (${F.unit()})</span><input data-b="tplate" inputmode="decimal" value="${E(T.plate)}" placeholder="100"></label><label class="fld"><span>Gryf (${F.unit()})</span><input data-b="tbar" inputmode="decimal" value="${F.fw(s.bar).replace(',', '.')}"></label></div><div id="t-plate">${pc}</div></section>
      <section class="card cut tool"><h3>${ic('percent', 20)} Kalkulator 1RM</h3><div class="two"><label class="fld"><span>Ciężar (${F.unit()})</span><input data-b="tone" data-f="w" inputmode="decimal" value="${E(T.oneW)}" placeholder="100"></label><label class="fld"><span>Powtórzenia</span><input data-b="tone" data-f="r" inputmode="numeric" value="${E(T.oneR)}" placeholder="5"></label></div><div id="t-one">${oneRM()}</div></section>
      <section class="card cut tool"><h3>${ic('trophy', 20)} Planer podejść na zawodach</h3><div id="t-comp">${F.compHtml()}</div></section>
      <section class="card cut tool"><h3>${ic('flame', 20)} Rozgrzewka</h3><label class="fld"><span>Ciężar roboczy (${F.unit()})</span><input data-b="twarm" inputmode="decimal" value="${E(T.warm)}" placeholder="120"></label><div id="t-warm">${warmup()}</div></section>`
    };
  };
  const num = v => parseFloat(String(v).replace(',', '.'));
  function restBlock() {
    if (F.rest) return `<div class="rest-live"><div class="rbar"><i data-rest-bar></i></div><b class="rt" data-rest-time>0:00</b><div class="btn-row"><button class="btn ghost" data-a="restAdd" data-s="-15">−15 s</button><button class="btn ghost" data-a="restAdd" data-s="15">+15 s</button><button class="btn danger" data-a="restSkip">Stop</button></div></div>`;
    return `<p class="dim">Dotknij czas, aby odliczać przerwę między seriami.</p><div class="chips">${[30, 45, 60, 90, 120, 180, 240, 300].map(s => `<button class="chip" data-a="restGo" data-s="${s}">${F.fmtDur(s)}</button>`).join('')}</div>`;
  }
  F.act.restGo = b => F.restStart(+b.dataset.s, 'Stoper'); F.act.restAdd = b => F.restAdd(+b.dataset.s); F.act.restSkip = () => F.restStop(false);
  F.onRestChange = () => { const el = F.$('#t-rest'); if (el) el.innerHTML = restBlock(); if (F.refreshWorkoutRest) F.refreshWorkoutRest(); };
  function plateCalc() {
    const s = F.S.settings; const target = F.fromDisp(num(T.plate)); const bar = s.bar;
    if (!target || target < bar) return `<p class="dim">${target ? 'Ciężar mniejszy niż gryf.' : 'Wpisz ciężar, a pokażę, jakie talerze założyć na każdą stronę.'}</p>`;
    let side = (target - bar) / 2; const out = []; [...s.plates].sort((a, b) => b - a).forEach(p => { const n = Math.floor((side + 1e-6) / p); if (n > 0) { out.push([p, n]); side -= n * p; } });
    const loaded = target - side * 2; const col = { 25: '#e5484d', 20: '#3b82f6', 15: '#f5c542', 10: '#34c759', 5: '#e8eaf0', 2.5: '#8b91a0', 1.25: '#6b7280', .5: '#4b5563' };
    let x = 30, svg = ''; const H = 74; out.forEach(([p, n]) => { for (let i = 0; i < n; i++) { const h = Math.max(26, Math.min(H, 22 + p * 2.2)); svg += `<rect x="${x}" y="${(80 - h) / 2}" width="9" height="${h}" rx="2" fill="${col[p] || '#888'}"/>`; x += 11; } });
    return `<div class="plates"><svg viewBox="0 0 220 80"><rect x="0" y="35" width="220" height="10" rx="3" class="bar-s"/><rect x="22" y="22" width="6" height="36" rx="2" class="coll"/>${svg}</svg></div>
      <div class="plist">${out.length ? out.map(([p, n]) => `<span class="pl" style="--pc:${col[p] || '#888'}"><b>${F.fmtNum(F.toDisp(p), 2)}</b> × ${n}</span>`).join('') : '<span class="dim">Sam gryf.</span>'}</div>
      <p class="dim small">Na każdą stronę. Razem: <b>${F.fwu(loaded)}</b>${side > 0.01 ? ` · brakuje ${F.fwu(side * 2)} (za mało talerzy)` : ''}</p>`;
  }
  F.bind.tplate = el => { T.plate = el.value; F.$('#t-plate').innerHTML = plateCalc(); };
  F.bind.tbar = el => { const v = F.fromDisp(num(el.value)); if (v > 0) { F.S.settings.bar = v; F.saveSettings(); } F.$('#t-plate').innerHTML = plateCalc(); };
  function oneRM() {
    const w = F.fromDisp(num(T.oneW)), r = parseInt(T.oneR); if (!w || !r) return '<p class="dim">Podaj ciężar i liczbę powtórzeń, a oszacuję maksymalny ciężar na jedno powtórzenie.</p>';
    const ep = F.e1rm(w, r), br = r < 37 ? w * 36 / (37 - r) : ep, est = (ep + br) / 2;
    const rows = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50].map(p => `<div class="rm"><span>${p}%</span><b>${F.fwu(est * p / 100)}</b><em>${p === 100 ? '1' : Math.max(1, Math.round((est / (est * p / 100) - 1) * 30))} powt.</em></div>`).join('');
    return `<div class="big-n">${F.fw(est)} <small>${F.unit()}</small></div><p class="dim small">Szacunek z wzorów Epleya i Brzyckiego${r > 12 ? ' — przy więcej niż 12 powtórzeniach mniej dokładny' : ''}.</p><div class="rmgrid">${rows}</div>`;
  }
  F.bind.tone = el => { if (el.dataset.f === 'w') T.oneW = el.value; else T.oneR = el.value; F.$('#t-one').innerHTML = oneRM(); };
  F.warmupSets = (kgWork) => { const bar = F.S.settings.bar; const sc = [[bar, 10, 'Sam gryf'], [.4, 8], [.6, 5], [.75, 3], [.9, 1]]; const round = v => Math.round(v / 2.5) * 2.5; const out = []; sc.forEach((x, i) => { const w = i === 0 ? bar : Math.max(bar, round(kgWork * x[0])); if (w < kgWork && (!out.length || out[out.length - 1].w < w)) out.push({ w, r: x[1], pct: i === 0 ? 0 : x[0] }); }); return out; };
  function warmup() {
    const w = F.fromDisp(num(T.warm)); if (!w || w <= F.S.settings.bar) return '<p class="dim">Wpisz ciężar roboczy, a ułożę progresję serii rozgrzewkowych.</p>';
    return `<div class="rmgrid">${F.warmupSets(w).map((s, i) => `<div class="rm"><span>${i + 1}. ${s.pct ? Math.round(s.pct * 100) + '%' : 'gryf'}</span><b>${F.fwu(s.w)}</b><em>${s.r} powt.</em></div>`).join('')}</div><p class="dim small">Rozgrzewkę możesz też dodać w trakcie treningu z menu ćwiczenia.</p>`;
  }
  F.bind.twarm = el => { T.warm = el.value; F.$('#t-warm').innerHTML = warmup(); };

  /* ================= USTAWIENIA ================= */
  V.settings = () => {
    const s = F.S.settings; const rk = F.rank(); const t = F.totals();
    const sw = (k, label, sub) => `<label class="sw"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" data-b="set" data-k="${k}" ${s[k] ? 'checked' : ''}><i></i></label>`;
    const step = (k, label, val, unit, min, max, st) => `<div class="stp"><span><b>${label}</b></span><div class="num"><button data-a="setStep" data-k="${k}" data-d="${-st}" data-min="${min}" data-max="${max}">${ic('minus', 16)}</button><output>${val}${unit ? ' ' + unit : ''}</output><button data-a="setStep" data-k="${k}" data-d="${st}" data-min="${min}" data-max="${max}">${ic('plus', 16)}</button></div></div>`;
    const accents = [['ember', 'Żar', '#ff4b1f', '#ff9a1f'], ['crimson', 'Karmin', '#ff2a55', '#ff6a3d'], ['volt', 'Volt', '#b6ff1f', '#3dff9a'], ['ice', 'Lód', '#3db8ff', '#7a5cff']];
    return {
      html: `${F.head('Ustawienia', { back: 1 })}
      <section class="card cut"><label class="fld"><span>Twoje imię (na ekranie startowym)</span><input data-b="set" data-k="name" value="${E(s.name)}" maxlength="24" placeholder="np. Kasia"></label><div class="rank-mini">${ic('crown', 18)} Ranga <b>${rk.name}</b> · ${F.fmtNum(rk.xp, 0)} XP</div></section>
      <h3 class="sec">Profil</h3><section class="card cut">${F.profileHtml()}<p class="dim small">Wagę wpiszesz w Postępy → Ciało.</p></section>
      <h3 class="sec">Trening</h3><section class="card cut list">
        <div class="stp"><span><b>Jednostki</b></span><div class="seg tiny"><button class="${s.unit === 'kg' ? 'on' : ''}" data-a="setUnit" data-u="kg">kg</button><button class="${s.unit === 'lb' ? 'on' : ''}" data-a="setUnit" data-u="lb">lb</button></div></div>
        ${step('weeklyGoal', 'Cel tygodniowy', s.weeklyGoal, 'tr.', 1, 7, 1)}${step('defaultRest', 'Domyślna przerwa', F.fmtDur(s.defaultRest), '', 30, 600, 15)}
        <div class="stp"><span><b>Krok ciężaru</b></span><div class="seg tiny">${[1, 1.25, 2.5, 5].map(v => `<button class="${s.step === v ? 'on' : ''}" data-a="setStepW" data-v="${v}">${String(v).replace('.', ',')}</button>`).join('')}</div></div>
        ${sw('autoRest', 'Automatyczna przerwa', 'Stoper rusza po zaliczeniu serii')}${sw('autoProg', 'Automatyczna progresja', 'Ciężar i powtórzenia z planu uzupełniane na podstawie ostatniego treningu')}${sw('sound', 'Dźwięk stopera')}${sw('vibrate', 'Wibracje')}${sw('wake', 'Nie wygaszaj ekranu w treningu')}</section>
      <h3 class="sec">Sprzęt</h3><section class="card cut"><p class="dim small">Talerze dostępne na Twojej siłowni (kalkulator talerzy):</p><div class="chips">${[25, 20, 15, 10, 5, 2.5, 1.25, .5].map(p => `<button class="chip ${s.plates.includes(p) ? 'on' : ''}" data-a="setPlate" data-p="${p}">${String(p).replace('.', ',')}</button>`).join('')}</div></section>
      <h3 class="sec">Wygląd</h3><section class="card cut"><div class="accents">${accents.map(a => `<button class="acc ${s.accent === a[0] ? 'on' : ''}" data-a="setAccent" data-v="${a[0]}" style="--x1:${a[2]};--x2:${a[3]}"><i></i><span>${a[1]}</span></button>`).join('')}</div></section>
      <h3 class="sec">Dane</h3><section class="card cut list">
        <button class="lrow" data-a="doBackupBtn">${ic('download', 20)}<span><b>Kopia zapasowa (JSON, ze zdjęciami)</b><small>${s.lastBackup ? 'Ostatnia: ' + F.fmtDate(s.lastBackup) : 'Jeszcze nie robiona'}</small></span></button>
        <button class="lrow" data-a="doBackupLite">${ic('file-json', 20)}<span><b>Kopia bez zdjęć (lżejsza)</b><small>Historia, plany, pomiary — bez zdjęć sylwetki</small></span></button>
        <button class="lrow" data-a="expCsv">${ic('file-spreadsheet', 20)}<span><b>Eksport historii (CSV)</b><small>${t.count} treningów, ${t.sets} serii</small></span></button>
        <button class="lrow" data-a="expRestore">${ic('upload', 20)}<span><b>Przywróć z kopii</b><small>Plik JSON z FORGE</small></span></button>
        <a class="lrow" href="#/import">${ic('scan-text', 20)}<span><b>Import planów i historii</b><small>PDF, zdjęcia, CSV (Strong, Hevy, FitNotes)</small></span></a>
        <button class="lrow" data-a="persist">${ic('lock', 20)}<span><b>Chroń dane przed czyszczeniem</b><small id="stor">Prośba o trwałe przechowywanie w przeglądarce</small></span></button>
        <button class="lrow danger" data-a="wipe">${ic('trash-2', 20)}<span><b>Usuń wszystkie dane</b><small>Nieodwracalne. Najpierw zrób kopię.</small></span></button></section>
      <p class="about">FORGE 1.2 · Zdjęcia i opisy ćwiczeń: Free Exercise DB (domena publiczna). · Dane trzymane wyłącznie na Twoim urządzeniu. Bez kont, bez chmury, bez limitów.</p>`,
      after: () => { if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const el = F.$('#stor'); if (el) el.textContent = `Zajęte: ${(e.usage / 1048576).toFixed(1)} MB · dotknij, aby zabezpieczyć dane`; }); }
    };
  };
  F.act.doBackupBtn = () => F.doBackup().then(() => F.render(true));
  F.act.doBackupLite = () => F.doBackup(false).then(() => F.render(true));
  F.bind.set = (el, type) => { const k = el.dataset.k; const s = F.S.settings; s[k] = el.type === 'checkbox' ? el.checked : el.value; F.saveSettings(); };
  F.act.setStep = b => { const k = b.dataset.k; const v = Math.max(+b.dataset.min, Math.min(+b.dataset.max, F.S.settings[k] + +b.dataset.d)); F.S.settings[k] = v; F.saveSettings(); F.render(true); };
  F.act.setStepW = b => { F.S.settings.step = +b.dataset.v; F.saveSettings(); F.render(true); };
  F.act.setUnit = b => { F.S.settings.unit = b.dataset.u; F.saveSettings(); F.render(true); };
  F.act.setPlate = b => { const p = +b.dataset.p, a = F.S.settings.plates; F.S.settings.plates = a.includes(p) ? a.filter(x => x !== p) : [...a, p].sort((x, y) => y - x); F.saveSettings(); F.render(true); };
  F.applyAccent = () => { document.documentElement.dataset.accent = F.S.settings.accent; const m = { ember: '#ff4b1f', crimson: '#ff2a55', volt: '#b6ff1f', ice: '#3db8ff' }; };
  F.act.setAccent = b => { F.S.settings.accent = b.dataset.v; F.saveSettings(); F.applyAccent(); F.render(true); };
  F.act.persist = async () => { try { const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; F.toast(ok ? 'Dane zabezpieczone przed automatycznym czyszczeniem' : 'Przeglądarka nie przyznała trwałej pamięci. Rób kopie zapasowe.', ok ? 'hot' : ''); } catch (e) { F.toast('Niedostępne w tej przeglądarce'); } };
  F.act.wipe = async () => {
    if (!(await F.confirm({ title: 'Usunąć wszystkie dane?', text: 'Zniknie cała historia, plany i własne ćwiczenia. Tej operacji nie da się cofnąć.', ok: 'Usuń wszystko', danger: true }))) return;
    if (!(await F.confirm({ title: 'Na pewno?', text: 'Ostatnie ostrzeżenie. Czy zrobiłeś kopię zapasową?', ok: 'Tak, usuń', danger: true }))) return;
    await F.wipe(); await F.kvDel('draft'); await F.kvDel('seeded'); location.hash = '#/home'; location.reload();
  };
})();
