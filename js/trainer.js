/* FORGE — tryb trenera bez serwera i bez kont.
   Trener → podopieczny: plan jako link (skompresowany w adresie) albo kod QR. Podopieczny → trener: plik z wynikami (JSON) przez dowolny komunikator.
   Trener wczytuje pliki i widzi listę podopiecznych z ostatnimi treningami. Wszystko zostaje w telefonach. */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s); const E = F.esc; const V = F.views; const DAY = 864e5;
  const b64u = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
  const pipe = async (bytes, T) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new T('deflate-raw'))).arrayBuffer());
  const pack = async obj => { const raw = new TextEncoder().encode(JSON.stringify(obj)); if (window.CompressionStream) { try { return 'z' + b64u(await pipe(raw, CompressionStream)); } catch (e) { } } return 'j' + b64u(raw); };
  const unpack = async str => { const k = str[0], b = unb64u(str.slice(1)); const raw = k === 'z' ? await pipe(b, DecompressionStream) : b; return JSON.parse(new TextDecoder().decode(raw)); };
  const base = () => location.href.split('#')[0].split('?')[0];

  /* ---------- trener: wyślij plan ---------- */
  const planPayload = p => { const custom = []; const days = p.days.map(d => ({ n: d.name, it: d.items.map(i => { const ex = F.S.ex.get(i.exId); if (ex && ex.custom && !custom.some(c => c.id === ex.id)) custom.push({ id: ex.id, name: ex.name, muscle: ex.muscle, equip: ex.equip, type: ex.type, compound: !!ex.compound, custom: true }); return [i.exId, i.sets, i.reps, i.rest || 0, i.role || '', i.ss || '', i.note || '']; }) })); return { v: 1, k: 'plan', n: p.name, from: F.S.settings.name || '', meta: p.meta ? { goal: p.meta.goal, exp: p.meta.exp, rest: p.meta.rest, weekdays: p.meta.weekdays, meso: p.meta.meso } : {}, days, ex: custom }; };
  F.act.planSend = async b => {
    const p = F.planOf(b.dataset.id); if (!p) return; F.closeSheet(true);
    const url = base() + '#/get/' + await pack(planPayload(p));
    let qr = ''; try { await new Promise((res, rej) => { if (window.qrcode) return res(); const s = document.createElement('script'); s.src = 'lib/qrcode.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); const q = window.qrcode(0, 'L'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 3, margin: 2, scalable: true }); } catch (e) { qr = ''; }
    F.sheet(`<p class="sheet-p dim">Podopieczny otwiera link albo skanuje kod aparatem — plan „${E(p.name)}” doda się w jego FORGE. Link zawiera tylko plan, bez Twoich treningów.</p>
      ${qr && url.length < 2900 ? `<div class="qr">${qr}</div>` : ''}
      <button class="btn primary wide" data-a="linkShare">${ic('share-2', 18)} Wyślij link</button><button class="btn ghost wide" data-a="linkCopy">${ic('copy', 18)} Kopiuj link</button>`, { title: 'Wyślij plan podopiecznemu' });
    F._link = url;
  };
  F.act.linkShare = async () => { try { if (navigator.share) { await navigator.share({ title: 'Plan treningowy — FORGE', url: F._link }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } F.act.linkCopy(); };
  F.act.linkCopy = async () => { try { await navigator.clipboard.writeText(F._link); F.toast('Skopiowano link', 'hot'); } catch (e) { F.toast('Nie udało się skopiować'); } };

  /* ---------- podopieczny: odbierz plan ---------- */
  let GET = { k: null, o: null };
  V.get = data => {
    if (GET.k !== data) { GET = { k: data, o: undefined }; unpack(data).then(o => { GET.o = o; }, () => { GET.o = null; }).then(() => { if (location.hash.includes(data)) F.render(true); }); }
    if (GET.o === undefined) return { html: `${F.head('Plan od trenera', { back: 1 })}<p class="dim">Wczytuję plan…</p>` };
    const obj = GET.o;
    if (!obj || obj.k !== 'plan') return { html: `${F.head('Plan od trenera', { back: 1 })}${F.empty('clipboard-list', 'Nie da się odczytać planu', 'Link jest niepełny albo uszkodzony. Poproś trenera o wysłanie go jeszcze raz.')}` };
    F._incoming = obj; const n = obj.days.reduce((a, d) => a + d.it.length, 0); const nm = id => (F.S.ex.get(id) || (obj.ex || []).find(x => x.id === id) || { name: id }).name;
    return { html: `${F.head('Plan od trenera', { back: 1, sub: obj.from ? 'od: ' + E(obj.from) : '' })}
      <button class="btn primary wide" data-a="getSave">${ic('plus', 18)} Dodaj ten plan</button>
      <section class="card cut"><h3>${E(obj.n)}</h3><p class="dim small">${obj.days.length} ${F.plur(obj.days.length, 'dzień', 'dni', 'dni')} · ${n} ${F.plur(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}</p>
      ${obj.days.map(d => `<h4 class="lbl">${E(d.n)}</h4><ul class="pl-prev">${d.it.map(i => `<li><span>${E(nm(i[0]))}</span><b>${i[1]} × ${E(String(i[2]))}</b></li>`).join('')}</ul>`).join('')}</section>` };
  };
  F.act.getSave = async () => {
    const o = F._incoming; if (!o) return; for (const x of (o.ex || [])) if (!F.S.ex.has(x.id)) await F.saveEx(x);
    const plan = { id: F.uid(), name: o.n, created: Date.now(), meta: { ...(o.meta || {}), from: o.from || 'trener' }, days: o.days.map(d => ({ id: F.uid(), name: d.n, items: d.it.filter(i => F.S.ex.has(i[0])).map(i => { const it = { id: F.uid(), exId: i[0], sets: i[1], reps: String(i[2]), rest: i[3] }; if (i[4]) it.role = i[4]; if (i[5]) it.ss = i[5]; if (i[6]) it.note = i[6]; return it; }) })) };
    await F.savePlan(plan); F.setCurPlan(plan.id); F._incoming = null; F.toast('Dodano plan: ' + E(plan.name), 'hot'); F.go('#/plan/' + plan.id);
  };

  /* ---------- podopieczny: wyślij wyniki trenerowi ---------- */
  F.act.resSheet = () => F.sheet(`<p class="sheet-p dim">Przygotuję plik z Twoimi treningami z wybranego okresu (ćwiczenia, serie, rekordy, samopoczucie, ból). Wyślij go trenerowi dowolnym komunikatorem — trener wczyta go w swoim FORGE.</p>
      <label class="fld"><span>Twoje imię (zobaczy je trener)</span><input id="res-name" type="text" maxlength="40" value="${E(F.S.settings.name || '')}" placeholder="np. Kasia"></label>
      <div class="stack">${[[28, '4 tygodnie'], [91, '3 miesiące'], [0, 'Cała historia']].map(([d, l]) => `<button class="btn ghost wide" data-a="resSend" data-d="${d}">${ic('share-2', 18)} ${l}</button>`).join('')}</div>`, { title: 'Wyniki dla trenera' });
  F.act.resSend = async b => {
    const d = +b.dataset.d, since = d ? Date.now() - d * DAY : 0; const s = F.S.settings; const nm = (F.$('#res-name') || {}).value; if (nm != null && nm.trim()) { s.name = nm.trim(); F.saveSettings(); } else if (!s.name) { F.toast('Wpisz imię, żeby trener wiedział, od kogo jest plik'); return; }
    const ss = F.S.sessions.filter(x => x.start >= since).map(x => ({ id: x.id, start: x.start, dur: x.dur, name: x.name, prs: x.prs, feel: x.feel, pain: x.pain, ex: x.exercises.map(e => ({ id: e.exId, n: F.exName(e.exId), s: e.sets.filter(F.isWork).map(t => [t.w, t.r, t.rpe || 0]) })) }));
    if (!s.clientId) { s.clientId = F.uid(); F.saveSettings(); }
    const obj = { app: 'FORGE', kind: 'results', v: 1, id: s.clientId, name: s.name || 'Podopieczny', made: Date.now(), bw: F.latestBW() || 0, sessions: ss };
    const name = `forge-wyniki-${F.norm(obj.name).replace(/ /g, '-')}-${F.dateInput(Date.now())}.json`; const file = new File([JSON.stringify(obj)], name, { type: 'application/json' }); F.closeSheet(true);
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Wyniki FORGE' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    F.download(name, file); F.toast('Plik z wynikami zapisany', 'hot');
  };

  /* ---------- trener: podopieczni ---------- */
  let CLI = null;
  const clients = async () => { if (!CLI) CLI = (await F.kvGet('clients')) || []; return CLI; };
  const saveCli = async L => { CLI = L; await F.kvSet('clients', L); };
  F.cliCache = () => CLI; F.cliLoad = clients; F.cliReset = () => { CLI = null; };
  const cliSync = () => { if (CLI) return CLI; clients().then(() => F.render(true)); return null; };
  F.act.cliImport = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json'; i.onchange = async () => { const f = i.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); if (o.app !== 'FORGE' || o.kind !== 'results') throw new Error('To nie jest plik z wynikami FORGE'); const L = await clients(); const k = L.findIndex(c => c.id === o.id); const rec = { id: o.id, name: o.name, upd: Date.now(), made: o.made, bw: o.bw, sessions: o.sessions }; if (k >= 0) { const old = L[k]; const ids = new Set(o.sessions.map(x => x.id)); rec.sessions = [...o.sessions, ...old.sessions.filter(x => !ids.has(x.id))].sort((a, b) => b.start - a.start); L[k] = { ...old, ...rec }; } else L.push(rec); await saveCli(L); F.toast('Wczytano wyniki: ' + E(o.name), 'hot'); F.render(true); } catch (e) { F.toast(e.message || 'Nie udało się wczytać pliku', 'err'); } }; i.click(); };
  V.clients = () => {
    const L0 = cliSync(); if (!L0) return { html: F.head('Podopieczni', { back: 1 }) };
    const L = [...L0].sort((a, b) => ((b.sessions[0] || {}).start || 0) - ((a.sessions[0] || {}).start || 0)); const now = Date.now();
    return { html: `${F.head('Podopieczni', { back: 1, sub: 'Tryb trenera' })}
      <section class="card cut"><p class="small">1. Wyślij plan: Plany → plan → ⋯ → „Wyślij podopiecznemu”.<br>2. Podopieczny wysyła Ci plik: Historia → eksport → „Wyniki dla trenera”.<br>3. Wczytaj plik tutaj.</p><button class="btn primary wide" data-a="cliImport">${ic('upload', 18)} Wczytaj wyniki podopiecznego</button></section>
      ${L.length ? `<div class="stack">${L.map(c => { const s4 = c.sessions.filter(x => now - x.start < 28 * DAY).length, pr = c.sessions.filter(x => now - x.start < 28 * DAY).reduce((a, x) => a + (x.prs || []).length, 0), pain = c.sessions.filter(x => now - x.start < 28 * DAY && x.pain && x.pain.length).length, last = c.sessions[0]; return `<a class="plan cut" href="#/client/${E(c.id)}"><div class="plan-i">${ic('user', 22)}</div><div class="plan-b"><h3>${E(c.name)}</h3><p>${last ? 'ostatni trening ' + F.relDay(last.start).toLowerCase() : 'brak treningów'} · 4 tyg.: ${s4} tr., ${pr} rek.${pain ? ` · <b class="warn-t">ból: ${pain}×</b>` : ''}</p><small class="dim">dane z ${F.fmtDate(c.made)}</small></div>${ic('chevron-right', 20)}</a>`; }).join('')}</div>` : F.empty('users', 'Brak podopiecznych', 'Wczytaj pierwszy plik z wynikami.')}` };
  };
  // kolejne identyczne serie łączę: 3 × 5 · 127,5 kg
  const grp = sets => { const g = []; for (const t of sets) { const l = g[g.length - 1]; if (l && l.w === t[0] && l.r === t[1]) l.n++; else g.push({ w: t[0], r: t[1], n: 1 }); } return g.map(x => `${x.n > 1 ? x.n + ' × ' : ''}${x.r}${x.w ? ' · ' + F.fwu(x.w) : ''}`).join(', ') || '—'; };
  V.client = id => {
    const L0 = cliSync(); if (!L0) return { html: F.head('Podopieczny', { back: 1 }) };
    const c = L0.find(x => x.id === id); if (!c) return { html: `${F.head('Podopieczny', { back: 1 })}${F.empty('user', 'Nie znaleziono', '')}` };
    return { html: `${F.head(E(c.name), { back: 1, sub: `dane z ${F.fmtDate(c.made)}${c.bw ? ' · masa ' + F.fwu(c.bw) : ''}`, right: `<button class="ibtn" data-a="cliDel" data-id="${E(c.id)}" aria-label="Usuń">${ic('trash-2', 20)}</button>` })}
      ${c.sessions.slice(0, 30).map(s => `<section class="card cut cli-s"><div class="cli-h"><b>${E(s.name || 'Trening')}</b><small>${F.fmtDate(s.start)}${s.dur ? ' · ' + Math.round(s.dur / 60) + ' min' : ''}</small></div>
        ${s.feel ? `<p class="dim small">Sen ${s.feel.sleep}/5 · energia ${s.feel.energy}/5</p>` : ''}${s.pain && s.pain.length ? `<p class="small warn-t">${ic('heart-pulse', 14)} Ból: ${s.pain.map(p => ((F.PLN && F.PLN.INJ[p.at]) || 'inne') + ' (' + E(F.exName(p.exId)) + ')').join(', ')}</p>` : ''}
        ${s.ex.map(e => `<div class="cli-e"><span>${E(e.n)}</span><b>${grp(e.s)}</b></div>`).join('')}
        ${s.prs && s.prs.length ? `<p class="small">${ic('trophy', 14)} ${s.prs.length} ${F.plur(s.prs.length, 'rekord', 'rekordy', 'rekordów')}</p>` : ''}</section>`).join('')}` };
  };
  F.act.cliDel = async b => { if (!(await F.confirm({ title: 'Usunąć podopiecznego?', text: 'Usuniesz tylko wczytane wyniki w tym telefonie.', ok: 'Usuń', danger: true }))) return; await saveCli((await clients()).filter(c => c.id !== b.dataset.id)); F.go('#/clients'); };
})();
