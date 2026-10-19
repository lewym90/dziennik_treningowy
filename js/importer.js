/* FORGE — import planów i historii: PDF (PDF.js), zrzuty ekranu i zdjęcia (OCR Tesseract), tekst, CSV (Strong/Hevy/FitNotes), JSON */
(function () {
  const F = window.F; const ic = (n, s, c) => window.icon(n, s, c); const E = F.esc; const V = F.views;
  const U = p => new URL(p, document.baseURI).href;
  F.imp = F.imp || { stage: 'idle', plan: null, text: '', lang: 'pol', create: true, busy: null };
  const I = () => F.imp;

  /* ---------- ładowanie bibliotek (lokalnie, z cache PWA) ---------- */
  let pdfP = null, tessP = null;
  const loadPdf = () => pdfP || (pdfP = import(U('vendor/pdfjs/pdf.min.mjs')).then(m => { m.GlobalWorkerOptions.workerSrc = U('vendor/pdfjs/pdf.worker.min.mjs'); return m; }));
  const loadTess = () => tessP || (tessP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = U('vendor/tesseract/tesseract.min.js'); s.onload = () => res(window.Tesseract); s.onerror = () => { tessP = null; rej(new Error('Nie udało się załadować modułu OCR. Sprawdź połączenie przy pierwszym użyciu.')); }; document.head.appendChild(s); }));
  let tw = null; // {w, lang, holder}
  async function getWorker(lang, onP) {
    const T = await loadTess();
    if (tw && tw.lang === lang) { tw.holder.fn = onP; return tw.w; }
    if (tw) { try { await tw.w.terminate(); } catch (e) { } tw = null; }
    const holder = { fn: onP };
    const w = await T.createWorker(lang, 1, { workerPath: U('vendor/tesseract/worker.min.js'), corePath: U('vendor/tesseract/core.wasm.js'), langPath: U('vendor/tesseract/lang'), gzip: true, cacheMethod: 'none', logger: m => holder.fn && holder.fn(m) });
    await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    tw = { w, lang, holder }; return w;
  }

  /* ---------- postęp ---------- */
  const prog = (txt, pct) => { const t = F.$('#ip-txt'), b = F.$('#ip-bar'); if (t && txt != null) t.textContent = txt; if (b && pct != null) b.style.width = Math.round(Math.max(0, Math.min(1, pct)) * 100) + '%'; };

  /* ---------- OCR obrazu ---------- */
  function prepCanvas(src, sw, sh) {
    let scale = 1; if (sw < 1100) scale = Math.min(2.5, 1400 / sw); if (sw * scale > 2600) scale = 2600 / sw;
    const c = document.createElement('canvas'); c.width = Math.round(sw * scale); c.height = Math.round(sh * scale); const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data, n = c.width * c.height; const hist = new Uint32Array(256); let sum = 0;
    for (let i = 0; i < n; i++) { const y = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0; d[i * 4] = y; hist[y]++; sum += y; }
    const mean = sum / n, inv = mean < 118; let lo = 0, hi = 255, acc = 0; for (; lo < 255; lo++) { acc += hist[lo]; if (acc > n * 0.02) break; } acc = 0; for (; hi > 0; hi--) { acc += hist[hi]; if (acc > n * 0.02) break; }
    const rng = Math.max(40, hi - lo);
    for (let i = 0; i < n; i++) { let y = (d[i * 4] - lo) / rng; y = y < 0 ? 0 : y > 1 ? 1 : y; if (inv) y = 1 - y; y = Math.round(y * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = y; d[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0); return c;
  }
  async function ocrCanvas(canvas, lang, label, base, span) {
    const w = await getWorker(lang, m => { if (m.status === 'recognizing text') prog(label + ' — rozpoznawanie tekstu…', base + span * (m.progress || 0)); else if (/load|init/.test(m.status || '')) prog('Przygotowanie modułu OCR… (przy pierwszym użyciu chwilę trwa)', base); });
    const TH = 2400, OV = 120; const texts = [];
    if (canvas.height <= TH + 400) { texts.push((await w.recognize(canvas)).data.text); }
    else {
      const tiles = Math.ceil(canvas.height / (TH - OV)); for (let k = 0; k < tiles; k++) {
        const y = k * (TH - OV), h = Math.min(TH, canvas.height - y); const t = document.createElement('canvas'); t.width = canvas.width; t.height = h; t.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        const txt = (await w.recognize(t)).data.text; texts.push(txt); prog(label + ` — fragment ${k + 1}/${tiles}`, base + span * ((k + 1) / tiles));
      }
    }
    // sklej fragmenty, usuwając zdublowane linie na zakładce
    let out = []; texts.forEach(t => { const ls = t.split('\n'); if (out.length) { const tail = out.slice(-8).map(F.norm); while (ls.length && (F.norm(ls[0]) === '' || tail.includes(F.norm(ls[0])))) ls.shift(); } out = out.concat(ls); });
    return out.join('\n');
  }
  async function ocrImageFile(file, lang, label, base, span) {
    prog(label + ' — wczytywanie obrazu…', base);
    let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Nie można odczytać obrazu.')); im.src = URL.createObjectURL(file); }); }
    const sw = bmp.width || bmp.naturalWidth, sh = bmp.height || bmp.naturalHeight; const c = prepCanvas(bmp, sw, sh); if (bmp.close) bmp.close();
    return ocrCanvas(c, lang, label, base, span);
  }

  /* ---------- PDF ---------- */
  async function pdfToText(file, lang, label, base, span) {
    const pdfjs = await loadPdf(); const buf = await file.arrayBuffer(); const doc = await pdfjs.getDocument({ data: buf }).promise; const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      prog(`${label} — strona ${p}/${doc.numPages}`, base + span * ((p - 1) / doc.numPages) * 0.5);
      const page = await doc.getPage(p); const tc = await page.getTextContent(); const rows = new Map();
      tc.items.forEach(it => { if (!it.str || !it.str.trim()) { if (it.str === ' ') return; return; } const y = Math.round(it.transform[5] / 3); let r = rows.get(y); if (!r) { for (const k of [y + 1, y - 1]) if (rows.has(k)) { r = rows.get(k); break; } } if (!r) { r = []; rows.set(y, r); } r.push({ x: it.transform[4], w: it.width, h: Math.abs(it.transform[3]) || 10, s: it.str }); });
      const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => { r.sort((a, b) => a.x - b.x); let s = '', end = null; r.forEach(it => { if (end != null) { const gap = it.x - end; s += gap > it.h * 1.6 ? ' | ' : gap > it.h * 0.15 ? ' ' : ''; } s += it.s; end = it.x + it.w; }); return s; });
      pages.push(lines.join('\n'));
    }
    const text = pages.join('\n\n'); const chars = text.replace(/\s/g, '').length;
    if (chars >= 25 * doc.numPages) return text;
    // skan — OCR stron
    let out = '';
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p); const vp = page.getViewport({ scale: 2.2 }); const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise; const pc = prepCanvas(cv, cv.width, cv.height);
      out += '\n' + await ocrCanvas(pc, lang, `${label} (skan) strona ${p}/${doc.numPages}`, base + span * 0.5 + span * 0.5 * ((p - 1) / doc.numPages), span * 0.5 / doc.numPages);
    }
    return out;
  }

  /* ---------- obsługa plików ---------- */
  async function handleFiles(files) {
    files = [...files].filter(Boolean); if (!files.length) return; const im = I(); im.stage = 'work'; F.render(true);
    const texts = []; const lang = im.lang; let done = 0; const total = files.length;
    try {
      for (const f of files) {
        const name = f.name || 'plik'; const ext = (name.split('.').pop() || '').toLowerCase(); const base = done / total, span = 1 / total; const label = `${name}`;
        if (f.type === 'application/pdf' || ext === 'pdf') texts.push(await pdfToText(f, lang, label, base, span));
        else if (/^image\//.test(f.type) || /^(png|jpe?g|webp|heic|heif|bmp|gif)$/.test(ext)) texts.push(await ocrImageFile(f, lang, label, base, span));
        else if (ext === 'json') { const data = JSON.parse(await f.text()); if (data.kind === 'plan') { await F.importPlanFile(data); im.stage = 'idle'; return; } if (data.app === 'FORGE') { im.stage = 'idle'; F.render(true); F.restoreSheet(data); return; } throw new Error('Nieznany format JSON.'); }
        else if (ext === 'csv' || ext === 'tsv') { const txt = await f.text(); const rows = F.parseCSV(txt); if (F.isHistoryCSV(rows)) { im.stage = 'idle'; F.render(true); historyPreview(rows, name); return; } texts.push(rows.map(r => r.join(' | ')).join('\n')); }
        else if (ext === 'docx' || ext === 'xlsx' || ext === 'doc' || ext === 'xls') throw new Error('Pliki Word i Excel zapisz najpierw jako PDF lub CSV (Plik → Zapisz jako), potem zaimportuj tutaj.');
        else texts.push(await f.text());
        done++; prog(null, done / total);
      }
      finishText(texts.join('\n\n'), files[0].name);
    } catch (e) { console.error(e); im.stage = 'idle'; F.render(true); F.toast(E(e.message || 'Import nie powiódł się'), 'err', 5000); }
  }
  function finishText(text, fname) {
    const im = I(); im.text = text;
    if (!text.replace(/\s/g, '').length) { im.stage = 'idle'; F.render(true); F.toast('Nie rozpoznano żadnego tekstu. Spróbuj ostrzejszego zdjęcia lub zrzutu ekranu.', 'err', 5000); return; }
    const nm = fname && files_ok(fname) ? fname.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() : '';
    im.plan = F.parsePlanText(text, {}); if (!im.plan.name) im.plan.name = nm || 'Zaimportowany plan';
    im.stage = 'review'; F.render(); window.scrollTo(0, 0);
    const n = im.plan.days.reduce((a, d) => a + d.items.length, 0); if (!n) F.toast('Nie znalazłem ćwiczeń w tekście. Popraw rozpoznany tekst poniżej.', 'err', 5000);
  }
  const files_ok = n => !/^(image|img|screenshot|zrzut|photo|dsc|scan|pxl)/i.test(n);

  /* ---------- widok ---------- */
  V.import = () => {
    const im = I(); if (/shared=1/.test(location.hash)) { setTimeout(loadShared, 50); }
    if (im.stage === 'work') return { html: `${F.head('Import', { sub: 'Przetwarzanie…' })}<section class="card cut imp-work"><div class="spinner">${F.logo(48, 'spin')}</div><h3>Czytam Twój plan</h3><p class="dim" id="ip-txt">Start…</p><div class="bar big"><i id="ip-bar" style="width:3%"></i></div><p class="dim small">Wszystko dzieje się na Twoim urządzeniu. Pliki nigdzie nie są wysyłane.</p></section>` };
    if (im.stage === 'review' && im.plan) return review();
    return {
      html: `${F.head('Import', { back: 1, sub: 'Plany i historia z innych źródeł' })}
      <section class="drop cut" id="drop"><div class="drop-i">${ic('scan-text', 40)}</div><h2>Wgraj swój plan</h2><p>PDF, zrzut ekranu, zdjęcie kartki, plik tekstowy lub CSV. FORGE rozpozna ćwiczenia, serie i powtórzenia.</p>
        <div class="btn-row"><button class="btn primary" data-a="impPick">${ic('file-up', 18)} Wybierz pliki</button><button class="btn ghost" data-a="impCam">${ic('camera', 18)} Zdjęcie</button></div><small class="dim">Możesz zaznaczyć kilka plików naraz (np. cały cykl na kilku zrzutach).</small></section>
      <section class="card cut"><h3>Albo wklej tekst</h3><textarea id="imp-paste" rows="5" placeholder="Dzień 1 – Push&#10;Wyciskanie sztangi leżąc 4x8&#10;Wznosy bokiem 3x15&#10;…"></textarea><div class="btn-row"><button class="btn primary grow" data-a="impPaste">${ic('wand-sparkles', 18)} Rozpoznaj plan</button></div></section>
      <section class="card cut"><div class="two"><label class="fld"><span>Język tekstu na obrazach</span><select data-b="implang"><option value="pol" ${im.lang === 'pol' ? 'selected' : ''}>Polski</option><option value="eng" ${im.lang === 'eng' ? 'selected' : ''}>Angielski</option></select></label><div class="hint">${ic('info', 16)}<small>Ostre zdjęcie lub zrzut ekranu daje najlepszy wynik. Przed zapisem zawsze sprawdzisz i poprawisz wynik.</small></div></div></section>
      <h3 class="sec">Historia z innej aplikacji</h3>
      <button class="importcard cut" data-a="impHist"><div>${ic('file-spreadsheet', 28)}</div><p><b>Importuj historię treningów (CSV)</b><small>Strong, Hevy, FitNotes i podobne. Zachowasz całą dotychczasową historię i rekordy.</small></p>${ic('chevron-right', 20)}</button>
      <button class="importcard cut" data-a="impBackup"><div>${ic('upload', 28)}</div><p><b>Przywróć kopię FORGE</b><small>Plik JSON z kopii zapasowej lub wyeksportowany plan.</small></p>${ic('chevron-right', 20)}</button>
      <h3 class="sec">Praca bez internetu</h3>
      <section class="card cut"><p class="dim small">Moduły rozpoznawania tekstu i PDF (ok. 11 MB) są częścią aplikacji i pobierają się przy pierwszym użyciu. Możesz pobrać je teraz, żeby import działał także offline na siłowni.</p><button class="btn ghost wide" data-a="impOffline" id="imp-off">${ic('download', 18)} Pobierz moduły offline</button></section>`,
      after: root => {
        const dz = F.$('#drop', root); if (!dz) return;
        ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
        ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
        dz.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
      }
    };
  };
  F.bind.implang = el => { I().lang = el.value; };
  const pickMulti = (accept, capture) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !capture; if (capture) i.capture = 'environment'; i.onchange = () => res([...i.files]); i.click(); });
  F.act.impPick = () => pickMulti('.pdf,application/pdf,image/*,.txt,.md,.csv,.tsv,.json,text/plain').then(handleFiles);
  F.act.impCam = () => pickMulti('image/*', true).then(handleFiles);
  F.act.impPaste = () => { const t = F.$('#imp-paste').value; if (!t.trim()) { F.toast('Wklej najpierw tekst planu'); return; } finishText(t, ''); };
  F.act.impHist = () => pickMulti('.csv,.tsv,text/csv').then(async fs => { if (!fs.length) return; const rows = F.parseCSV(await fs[0].text()); if (!F.isHistoryCSV(rows)) { F.toast('Nie rozpoznaję tego CSV jako historii treningów (brak kolumn: data, ćwiczenie, powtórzenia).', 'err', 5000); return; } historyPreview(rows, fs[0].name); });
  F.act.impBackup = () => F.act.expRestore();
  F.act.impOffline = async () => {
    const b = F.$('#imp-off'); b.disabled = true; const urls = ['vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs', 'vendor/tesseract/tesseract.min.js', 'vendor/tesseract/worker.min.js', 'vendor/tesseract/core.wasm.js', 'vendor/tesseract/lang/pol.traineddata.gz', 'vendor/tesseract/lang/eng.traineddata.gz'];
    try { let i = 0; for (const u of urls) { b.innerHTML = `${ic('download', 18)} Pobieranie ${++i}/${urls.length}…`; const r = await fetch(U(u)); if (!r.ok) throw new Error(u); await r.arrayBuffer(); } b.innerHTML = `${ic('check', 18)} Gotowe — import działa offline`; F.toast('Moduły zapisane do pracy offline', 'hot'); }
    catch (e) { b.disabled = false; b.innerHTML = `${ic('download', 18)} Pobierz moduły offline`; F.toast('Nie udało się pobrać. Sprawdź połączenie.', 'err'); }
  };
  async function loadShared() { // pliki przekazane z menu „Udostępnij” (Android)
    try { history.replaceState(null, '', location.pathname + '#/import'); const c = await caches.open('forge-share'); const reqs = await c.keys(); const files = []; for (const r of reqs) { const res = await c.match(r); const blob = await res.blob(); files.push(new File([blob], decodeURIComponent(r.url.split('/').pop()) || 'udostepnione', { type: blob.type })); await c.delete(r); } if (files.length) handleFiles(files); } catch (e) { }
  }

  /* ---------- edytor wyniku ---------- */
  function review() {
    const im = I(), p = im.plan; const total = p.days.reduce((a, d) => a + d.items.length, 0); const ok = p.days.reduce((a, d) => a + d.items.filter(i => i.exId && i.conf >= 0.85).length, 0); const chk = p.days.reduce((a, d) => a + d.items.filter(i => i.exId && i.conf < 0.85).length, 0); const nw = total - ok - chk;
    const exN = id => (F.S.ex.get(id) || {}).name || '?';
    const itemHtml = (it, di, ii) => {
      const cls = !it.exId ? 'new' : it.conf >= 0.85 ? 'ok' : 'chk'; const ex = it.exId && F.S.ex.get(it.exId);
      const alts = (it.alts || []).filter(a => a !== it.exId).slice(0, 2);
      return `<div class="ri ${cls}"><div class="ri-top"><span class="ri-st">${cls === 'ok' ? ic('circle-check', 18) : cls === 'chk' ? ic('info', 18) : ic('circle-plus', 18)}</span><div class="ri-n">${it.exId ? `<b>${E(exN(it.exId))}</b>` : `<input class="ri-new" data-b="ipnew" data-di="${di}" data-ii="${ii}" value="${E(it.newName)}" aria-label="Nazwa nowego ćwiczenia">`}<small>${it.exId ? (cls === 'chk' ? 'Sprawdź dopasowanie · ' : '') : 'Nowe ćwiczenie · '}z pliku: „${E((it.raw || '').slice(0, 60))}”</small></div><button class="ibtn" data-a="ipDel" data-di="${di}" data-ii="${ii}" aria-label="Usuń">${ic('x', 18)}</button></div>
        ${alts.length && cls !== 'ok' ? `<div class="chips tiny">${alts.map(a => `<button class="chip" data-a="ipAlt" data-di="${di}" data-ii="${ii}" data-ex="${E(a)}">${E(exN(a))}</button>`).join('')}</div>` : ''}
        <div class="pi-f four"><label><span>Serie</span><input inputmode="numeric" data-b="ipit" data-f="sets" data-di="${di}" data-ii="${ii}" value="${it.sets}"></label><label><span>Powt.</span><input data-b="ipit" data-f="reps" data-di="${di}" data-ii="${ii}" value="${E(it.reps)}"></label><label><span>Przerwa s</span><input inputmode="numeric" data-b="ipit" data-f="rest" data-di="${di}" data-ii="${ii}" value="${it.rest || ''}" placeholder="auto"></label><label><span>${F.unit()}</span><input inputmode="decimal" data-b="ipit" data-f="w" data-di="${di}" data-ii="${ii}" value="${it.w ? F.fw(it.w).replace(',', '.') : ''}" placeholder="–"></label></div>
        <button class="linkbtn" data-a="ipPick" data-di="${di}" data-ii="${ii}">${it.exId ? 'Zmień ćwiczenie' : 'Wybierz z biblioteki'}</button>${it.defaulted ? '<span class="dim small"> · domyślne serie, dostosuj</span>' : ''}</div>`;
    };
    return {
      html: `${F.head('Sprawdź plan', { back: 1, sub: 'Popraw, zanim zapiszesz' })}
      <div class="rsum cut"><div><b>${total}</b><small>ćwiczeń</small></div><div class="g"><b>${ok}</b><small>pewnych</small></div><div class="y"><b>${chk}</b><small>do sprawdzenia</small></div><div class="r"><b>${nw}</b><small>nowych</small></div></div>
      <label class="fld"><span>Nazwa planu</span><input data-b="ipname" value="${E(p.name)}" maxlength="60"></label>
      ${p.days.map((d, di) => `<section class="card cut day edit"><div class="day-h"><label class="fld grow"><span>Dzień ${di + 1}</span><input data-b="ipday" data-di="${di}" value="${E(d.name)}" maxlength="50"></label><button class="ibtn" data-a="ipDayDel" data-di="${di}" aria-label="Usuń dzień">${ic('trash-2', 18)}</button></div>${d.items.map((it, ii) => itemHtml(it, di, ii)).join('')}<button class="btn ghost wide" data-a="ipAdd" data-di="${di}">${ic('plus', 18)} Dodaj ćwiczenie</button></section>`).join('') || F.empty('search', 'Nic nie znaleziono', 'Popraw rozpoznany tekst poniżej i przetwórz ponownie.')}
      <details class="card cut raw"><summary>${ic('scan-text', 18)} Rozpoznany tekst <small class="dim">(popraw i przetwórz ponownie)</small></summary><textarea data-b="imptext" rows="10">${E(im.text)}</textarea><button class="btn ghost wide" data-a="ipReparse">${ic('rotate-ccw', 18)} Przetwórz ponownie</button></details>
      <div class="sticky-act"><button class="btn ghost" data-a="ipCancel">Anuluj</button><button class="btn primary grow" data-a="ipSave" ${total ? '' : 'disabled'}>${ic('save', 18)} Zapisz plan</button></div>`
    };
  }
  const num = v => parseFloat(String(v).replace(',', '.'));
  F.bind.ipname = el => { I().plan.name = el.value; };
  F.bind.ipday = el => { I().plan.days[+el.dataset.di].name = el.value; };
  F.bind.ipnew = el => { I().plan.days[+el.dataset.di].items[+el.dataset.ii].newName = el.value; };
  F.bind.imptext = el => { I().text = el.value; };
  F.bind.ipit = el => { const it = I().plan.days[+el.dataset.di].items[+el.dataset.ii]; const f = el.dataset.f; if (f === 'reps') it.reps = el.value; else if (f === 'w') it.w = F.fromDisp(num(el.value) || 0); else it[f] = parseInt(el.value) || 0; it.defaulted = false; };
  F.act.ipDel = b => { I().plan.days[+b.dataset.di].items.splice(+b.dataset.ii, 1); F.render(true); };
  F.act.ipDayDel = b => { I().plan.days.splice(+b.dataset.di, 1); F.render(true); };
  F.act.ipAlt = b => { const it = I().plan.days[+b.dataset.di].items[+b.dataset.ii]; it.exId = b.dataset.ex; it.conf = 1; F.render(true); };
  F.act.ipPick = async b => { const ids = await F.pickExercises({ single: true }); if (!ids) return; const it = I().plan.days[+b.dataset.di].items[+b.dataset.ii]; it.exId = ids[0]; it.conf = 1; F.render(true); };
  F.act.ipAdd = async b => { const ids = await F.pickExercises(); if (!ids) return; ids.forEach(id => { const ex = F.S.ex.get(id); I().plan.days[+b.dataset.di].items.push({ id: F.uid(), raw: '(dodane ręcznie)', exId: id, conf: 1, alts: [], newName: ex.name, sets: 3, reps: ex.type === 'time' ? '45' : '8-12', rest: 0, w: 0, note: '', defaulted: false }); }); F.render(true); };
  F.act.ipReparse = () => { const im = I(); const nm = im.plan && im.plan.name; im.plan = F.parsePlanText(im.text, {}); if (!im.plan.name) im.plan.name = nm || 'Zaimportowany plan'; F.render(true); F.toast('Przetworzono ponownie'); };
  F.act.ipCancel = () => { I().stage = 'idle'; I().plan = null; F.render(); };
  F.act.ipSave = async () => {
    const im = I(), p = im.plan; const made = new Map(); let created = 0;
    for (const d of p.days) for (const it of d.items) {
      if (!it.exId) { const nm = (it.newName || '').trim(); if (!nm) continue; const key = F.norm(nm); if (!made.has(key)) { const ex = { id: 'c_' + F.uid(), name: nm.charAt(0).toUpperCase() + nm.slice(1), muscle: F.guessMuscle(nm), equip: 'Inne', type: it.time ? 'time' : 'wr', compound: false, alias: '', custom: true }; await F.saveEx(ex); made.set(key, ex.id); created++; } it.exId = made.get(key); }
    }
    F.invalidateIdx();
    const plan = { id: F.uid(), name: (p.name || '').trim() || 'Zaimportowany plan', created: Date.now(), days: p.days.filter(d => d.items.some(i => i.exId)).map(d => ({ id: F.uid(), name: d.name || 'Trening', items: d.items.filter(i => i.exId).map(i => { const ex = F.S.ex.get(i.exId); return { id: F.uid(), exId: i.exId, sets: Math.max(1, i.sets || 3), reps: i.reps || '8-12', rest: i.rest || (ex && ex.compound ? 120 : 75), w: i.w || 0, note: i.note || '' }; }) })) };
    await F.savePlan(plan); im.stage = 'idle'; im.plan = null; F.toast(`Zapisano plan „${E(plan.name)}”${created ? ` i ${created} now${created === 1 ? 'e ćwiczenie' : 'ych ćwiczeń'}` : ''}`, 'hot', 3500); F.go('#/plan/' + plan.id);
  };

  /* ---------- plik planu FORGE (JSON) ---------- */
  F.importPlanFile = async data => {
    const exs = data.exercises || []; for (const e of exs) if (!F.S.ex.has(e.id)) await F.saveEx({ ...e, custom: true });
    const p = JSON.parse(JSON.stringify(data.plan)); p.id = F.uid(); p.created = Date.now(); p.days.forEach(d => { d.id = F.uid(); d.items.forEach(i => i.id = F.uid()); });
    await F.savePlan(p); F.toast('Zaimportowano plan: ' + E(p.name), 'hot'); F.go('#/plan/' + p.id);
  };

  /* ---------- historia z CSV ---------- */
  function historyPreview(rows, fname) {
    const r = F.parseHistoryRows(rows); if (!r.sessions.length) { F.toast('Nie znalazłem treningów w tym pliku.', 'err'); return; }
    const first = r.sessions[0].start, last = r.sessions[r.sessions.length - 1].start;
    F.sheet(`<div class="tiles two"><div class="tile cut"><span class="tl">Treningi</span><b class="tv">${r.sessions.length}</b></div><div class="tile cut"><span class="tl">Serie</span><b class="tv">${r.sets}</b></div></div>
      <p class="sheet-p">Zakres: <b>${F.fmtDate(first)}</b> – <b>${F.fmtDate(last)}</b>${r.skipped ? `<br><span class="dim small">Pominięto wierszy bez daty lub ćwiczenia: ${r.skipped}</span>` : ''}</p>
      ${r.newEx.length ? `<p class="sheet-p"><b>${r.newEx.length}</b> ćwiczeń nie ma w bibliotece. Dodam je jako własne:</p><div class="chips tiny">${r.newEx.slice(0, 14).map(e => `<span class="chip">${E(e.name)}</span>`).join('')}${r.newEx.length > 14 ? `<span class="chip">+${r.newEx.length - 14}</span>` : ''}</div>` : ''}
      <p class="dim small">Treningi, które już masz w FORGE (ta sama data i nazwa), nie zostaną zdublowane.</p><div class="btn-row"><button class="btn ghost" data-a="closeSheet">Anuluj</button><button class="btn primary grow" data-a="histGo">${ic('download', 18)} Importuj</button></div>`, { title: 'Import historii', cls: 'compact' });
    F.act.histGo = async () => {
      F.closeSheet(true); F.toast('Importuję…'); for (const e of r.newEx) await F.saveEx(e); F.invalidateIdx();
      const have = new Set(F.S.sessions.map(s => Math.round(s.start / 60000) + '|' + (s.name || ''))); const fresh = r.sessions.filter(s => !have.has(Math.round(s.start / 60000) + '|' + (s.name || '')));
      await F.dbPutMany('sessions', fresh); F.S.sessions.push(...fresh); F.S.sessions.sort((a, b) => b.start - a.start); F.rebuild(); await F.recomputeAllPRs();
      F.toast(`Zaimportowano ${fresh.length} treningów`, 'hot', 3500); F.go('#/history');
    };
  }
})();
