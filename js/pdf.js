/* FORGE — raport PDF (A4): podsumowanie, wykresy, siła, rekordy, mięśnie, ciało, lista treningów.
   Generowany w telefonie (jsPDF, licencja MIT; czcionki Barlow, SIL OFL). Biblioteki ładowane dopiero przy pierwszym użyciu. */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s); const E = F.esc; const DAY = 864e5, WK = 7 * DAY;
  const load = src => new Promise((res, rej) => { if (document.querySelector(`script[data-src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error('Nie udało się wczytać ' + src)); document.head.appendChild(s); });
  const PER = [['4w', '4 tygodnie', 28], ['3m', '3 miesiące', 91], ['12m', '12 miesięcy', 365], ['all', 'Cała historia', 0]];

  F.act.pdfSheet = () => {
    const k = F.ui.pdfP || '3m';
    F.sheet(`<p class="sheet-p dim">Profesjonalny raport do wydruku albo dla trenera, fizjoterapeuty lub lekarza: podsumowanie, wykresy, siła, rekordy, mięśnie, masa ciała i lista treningów. Powstaje w telefonie, bez internetu.</p>
      <h4 class="lbl">Okres</h4><div class="chips">${PER.map(p => `<button class="chip ${p[0] === k ? 'on' : ''}" data-a="pdfP" data-v="${p[0]}">${p[1]}</button>`).join('')}</div>
      <button class="btn primary wide" data-a="pdfMake" style="margin-top:14px">${ic('file-text', 18)} Utwórz raport PDF</button>`, { title: 'Raport PDF' });
  };
  F.act.pdfP = b => { F.ui.pdfP = b.dataset.v; F.act.pdfSheet(); };

  /* ---------- wykresy rysowane na płótnie (obraz do PDF) ---------- */
  const K = 3.4; // logiczne piksele na milimetr: wymiary wykresów podajemy w mm, tekst 10–11 px ≈ 8–9 pt na wydruku
  const CV = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w * 3); c.height = Math.round(h * 3); const g = c.getContext('2d'); g.scale(3, 3); g.font = '10.5px Barlow, sans-serif'; return [c, g]; };
  const accent = () => { const cs = getComputedStyle(document.documentElement); return [cs.getPropertyValue('--a1').trim() || '#ff4b1f', cs.getPropertyValue('--a2').trim() || '#ff9a1f']; };
  const nice = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  function barChart(vals, labels, wm, hm, fmt) {
    const w = wm * K, h = hm * K; const [c, g] = CV(w, h), [a1, a2] = accent(); const L = 40, R = 6, T = 8, B = 22, max = nice(Math.max(...vals, 1)); const bw = (w - L - R) / vals.length;
    g.strokeStyle = '#e6e1dc'; g.fillStyle = '#7a716a'; g.lineWidth = .6; g.textAlign = 'right';
    for (let i = 0; i <= 4; i++) { const y = T + (h - T - B) * (1 - i / 4); g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke(); g.fillText(fmt(max * i / 4), L - 5, y + 3.5); }
    vals.forEach((v, i) => { const x = L + i * bw + bw * .18, bh = (h - T - B) * v / max, y = h - B - bh; const gr = g.createLinearGradient(0, y, 0, h - B); gr.addColorStop(0, a2); gr.addColorStop(1, a1); g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(x, y, bw * .64, bh, [2, 2, 0, 0]) : g.rect(x, y, bw * .64, bh); g.fill(); });
    g.fillStyle = '#7a716a'; g.textAlign = 'center'; const ev = Math.ceil(vals.length / 8); labels.forEach((l, i) => { if (i % ev === 0) g.fillText(l, L + i * bw + bw / 2, h - 7); });
    return c.toDataURL('image/png');
  }
  function lineChart(pts, wm, hm, fmt, opts = {}) {
    const w = wm * K, h = hm * K; const [c, g] = CV(w, h), [a1, a2] = accent(); const L = 40, R = 8, T = 10, B = 20; if (pts.length < 2) return null;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y); let lo = Math.min(...ys), hi = Math.max(...ys); const pad = Math.max((hi - lo) * .15, hi * .02 || 1); lo -= pad; hi += pad;
    const X = x => L + (w - L - R) * (x - xs[0]) / ((xs[xs.length - 1] - xs[0]) || 1), Y = y => T + (h - T - B) * (1 - (y - lo) / ((hi - lo) || 1));
    g.strokeStyle = '#e6e1dc'; g.fillStyle = '#7a716a'; g.lineWidth = .6; g.textAlign = 'right';
    for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3, y = Y(v); g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke(); g.fillText(fmt(v), L - 5, y + 3.5); }
    const gr = g.createLinearGradient(0, T, 0, h - B); gr.addColorStop(0, a2 + '55'); gr.addColorStop(1, a2 + '00'); g.fillStyle = gr; g.beginPath(); g.moveTo(X(xs[0]), h - B); pts.forEach(p => g.lineTo(X(p.x), Y(p.y))); g.lineTo(X(xs[xs.length - 1]), h - B); g.fill();
    g.strokeStyle = a1; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))); g.stroke();
    g.fillStyle = a1; [pts[0], pts[pts.length - 1]].forEach(p => { g.beginPath(); g.arc(X(p.x), Y(p.y), 2.6, 0, 7); g.fill(); });
    g.fillStyle = '#7a716a'; g.textAlign = 'left'; g.fillText(new Date(xs[0]).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }), L, h - 6); g.textAlign = 'right'; g.fillText(new Date(xs[xs.length - 1]).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: opts.year ? 'numeric' : undefined }), w - R, h - 6);
    return c.toDataURL('image/png');
  }
  function hbars(rows, wm, hm) { // rows: [label, value, lo, hi]
    const w = wm * K, h = hm * K; const [c, g] = CV(w, h), [a1, a2] = accent(); const L = 110, R = 40, rh = (h - 8) / rows.length; const max = Math.max(...rows.map(r => Math.max(r[1], r[3])), 1) * 1.08;
    rows.forEach((r, i) => { const y = 4 + i * rh, bh = Math.min(10, rh * .55), cy = y + rh / 2; g.fillStyle = '#3a332e'; g.textAlign = 'right'; g.font = '10.5px Barlow, sans-serif'; g.fillText(r[0], L - 8, cy + 3.5);
      const X = v => L + (w - L - R) * v / max; g.fillStyle = '#efe9e3'; g.fillRect(X(r[2]), cy - bh / 2 - 2, X(r[3]) - X(r[2]), bh + 4);
      const gr = g.createLinearGradient(L, 0, X(r[1]), 0); gr.addColorStop(0, a1); gr.addColorStop(1, a2); g.fillStyle = r[1] < r[2] ? '#b9b0a8' : gr; g.fillRect(L, cy - bh / 2, Math.max(1, X(r[1]) - L), bh);
      g.fillStyle = '#3a332e'; g.textAlign = 'left'; g.fillText(F.fmtNum(r[1], 1), X(Math.max(r[1], r[3])) + 4, cy + 3.5); });
    return c.toDataURL('image/png');
  }
  const imgData = src => new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); res({ d: c.toDataURL('image/png'), w: i.naturalWidth, h: i.naturalHeight }); }; i.onerror = () => res(null); i.src = src; });

  /* ---------- dane ---------- */
  function data(days) {
    const now = Date.now(), all = F.S.sessions.slice().sort((a, b) => a.start - b.start); const a = days ? now - days * DAY : (all[0] ? all[0].start : now);
    const ss = all.filter(s => s.start >= a); const vol = ss.reduce((x, s) => x + F.sessionVolume(s), 0), dur = ss.reduce((x, s) => x + (s.dur || 0), 0), sets = ss.reduce((x, s) => x + F.sessionSets(s), 0), prs = ss.reduce((x, s) => x + (s.prs || []).length, 0);
    const weeks = Math.max(1, Math.round((now - a) / WK)); const wb = []; const w0 = F.startOfWeek(now) - (Math.min(weeks, 52) - 1) * WK;
    for (let k = 0; k < Math.min(weeks, 52); k++) { const s0 = w0 + k * WK, s1 = s0 + WK; const x = ss.filter(s => s.start >= s0 && s.start < s1); wb.push({ s: s0, n: x.length, v: x.reduce((y, s) => y + F.sessionVolume(s), 0) }); }
    const cnt = {}; ss.forEach(s => s.exercises.forEach(e => { if ((F.S.ex.get(e.exId) || {}).type === 'wr' && e.sets.some(F.isWork)) cnt[e.exId] = (cnt[e.exId] || 0) + 1; }));
    const top = Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([id]) => { const p = []; ss.forEach(s => { let b = 0; s.exercises.forEach(e => { if (e.exId === id) e.sets.forEach(x => { if (F.isWork(x) && x.r <= 10) b = Math.max(b, F.e1rm(x.w, x.r)); }); }); if (b) p.push({ x: s.start, y: F.toDisp(b) }); }); return { id, p }; }).filter(t => t.p.length >= 2);
    const recs = []; ss.forEach(s => (s.prs || []).forEach(p => recs.push({ ...p, ts: s.start }))); recs.sort((x, y) => y.ts - x.ts);
    const msd = Math.min(Math.max(days || (now - a) / DAY, 7), 84); const mus = F.muscleSets(msd);
    const bw = F.S.bw.filter(b => b.date >= a); const meas = (F.S.measures || []).filter(m => m.date >= a);
    return { a, now, ss, vol, dur, sets, prs, weeks, wb, top, recs, mus, msd, bw, meas };
  }

  F.act.pdfMake = async () => {
    const btn = document.querySelector('[data-a=pdfMake]'); if (btn) { btn.disabled = true; btn.innerHTML = 'Tworzę raport…'; }
    try {
      await load('lib/jspdf.umd.min.js'); await load('lib/pdf-fonts.js');
      try { await Promise.all([document.fonts.load('11px Barlow'), document.fonts.load('700 11px Barlow')]); } catch (e) { }
      const per = PER.find(p => p[0] === (F.ui.pdfP || '3m')) || PER[1]; const D = data(per[2]); if (!D.ss.length) { F.toast('Brak treningów w tym okresie'); return; }
      const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true }); const FT = window.FORGE_PDF_FONTS;
      [['reg', 'Barlow', 'normal'], ['bold', 'Barlow', 'bold'], ['cb', 'BarlowC', 'bold'], ['cbi', 'BarlowC', 'bolditalic']].forEach(([k, fam, st]) => { doc.addFileToVFS(k + '.ttf', FT[k]); doc.addFont(k + '.ttf', fam, st); });
      const [a1, a2] = accent(); const rgb = h => { const m = h.replace('#', ''); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; };
      const A1 = rgb(a1.length === 7 ? a1 : '#ff4b1f'), DARK = [21, 16, 12], TX = [40, 34, 30], MUT = [122, 113, 106], LINE = [230, 225, 220];
      const W = 210, H = 297, M = 14; let y = 0, page = 1;
      const logo = await imgData('assets/bg/logo.webp'); const s = F.S.settings; const who = s.name ? s.name : '';
      const pd = ts => new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
      const head = (title, sub) => { doc.setFillColor(...DARK); doc.rect(0, 0, W, 28, 'F'); doc.setFillColor(...A1); doc.rect(0, 28, W, 1.2, 'F'); if (logo) doc.addImage(logo.d, 'PNG', M, 6, 44, 44 * logo.h / logo.w); doc.setTextColor(255, 255, 255); doc.setFont('BarlowC', 'bold'); doc.setFontSize(17); doc.text(title, W - M, 13, { align: 'right' }); doc.setFont('Barlow', 'normal'); doc.setFontSize(9); doc.setTextColor(210, 200, 190); doc.text(sub, W - M, 20, { align: 'right' }); y = 38; };
      const foot = () => { doc.setDrawColor(...LINE); doc.line(M, H - 12, W - M, H - 12); doc.setFont('Barlow', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUT); doc.text('FORGE — dziennik treningowy · raport wygenerowany w telefonie ' + pd(Date.now()), M, H - 7); doc.text('Strona ' + page, W - M, H - 7, { align: 'right' }); };
      const newPage = (title) => { foot(); doc.addPage(); page++; head(title, (who ? who + ' · ' : '') + pd(D.a) + ' – ' + pd(D.now)); };
      const sec = (t) => { if (y > H - 40) newPage('Raport treningowy'); doc.setFont('BarlowC', 'bold'); doc.setFontSize(14); doc.setTextColor(...TX); doc.text(t.toUpperCase(), M, y); doc.setFillColor(...A1); doc.rect(M, y + 1.6, 16, .9, 'F'); y += 8; };
      const para = (t, size = 9, col = MUT) => { doc.setFont('Barlow', 'normal'); doc.setFontSize(size); doc.setTextColor(...col); const L = doc.splitTextToSize(t, W - 2 * M); doc.text(L, M, y); y += L.length * size * .42 + 2; };

      // ---- strona 1: podsumowanie ----
      head('RAPORT TRENINGOWY', (who ? who + ' · ' : '') + pd(D.a) + ' – ' + pd(D.now));
      doc.setFont('BarlowC', 'bolditalic'); doc.setFontSize(26); doc.setTextColor(...TX); doc.text(per[1].toUpperCase(), M, y + 4); y += 12;
      const p = F.profile(); const meta = [F.S.settings.sex ? (F.S.settings.sex === 'f' ? 'Kobieta' : 'Mężczyzna') : '', F.ageNow() ? F.ageNow() + ' lat' : '', p.heightKnown ? p.height + ' cm' : '', p.bwKnown ? F.fwu(p.bw) : ''].filter(Boolean).join(' · ');
      if (meta) para(meta, 10, TX);
      const nx = F.nextWorkout && F.nextWorkout(); if (nx) para('Aktualny plan: ' + nx.plan.name, 10, TX);
      y += 2; const tiles = [['Treningi', String(D.ss.length)], ['Czas', F.fmtDurHuman(D.dur)], ['Tonaż', F.fmtVol(D.vol)], ['Serie', F.fmtNum(D.sets, 0)], ['Rekordy', String(D.prs)], ['Średnio / tydz.', F.fmtNum(D.ss.length / D.weeks, 1) + ' tr.']];
      const tw = (W - 2 * M - 5 * 3) / 6; tiles.forEach((t, i) => { const x = M + i * (tw + 3); doc.setFillColor(248, 245, 242); doc.setDrawColor(...LINE); doc.roundedRect(x, y, tw, 19, 2, 2, 'FD'); doc.setFont('Barlow', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUT); doc.text(t[0].toUpperCase(), x + 2.5, y + 5.5); doc.setFont('BarlowC', 'bold'); doc.setFontSize(t[1].length > 8 ? 11 : 14); doc.setTextColor(...TX); doc.text(t[1], x + 2.5, y + 14); });
      y += 27;
      const lab = D.wb.map(w => { const d = new Date(w.s); return d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0'); });
      sec('Tonaż tygodniowy'); doc.addImage(barChart(D.wb.map(w => F.toDisp(w.v)), lab, W - 2 * M, 62, v => v >= 1000 ? F.fmtNum(v / 1000, 0) + ' t' : F.fmtNum(v, 0)), 'PNG', M, y, W - 2 * M, 62); y += 68;
      sec('Treningi w tygodniu'); doc.addImage(barChart(D.wb.map(w => w.n), lab, W - 2 * M, 46, v => F.fmtNum(v, 0)), 'PNG', M, y, W - 2 * M, 46); y += 50;
      para(`Cel tygodniowy w aplikacji: ${F.S.settings.weeklyGoal || 3} treningi. Tonaż = ciężar × powtórzenia ze wszystkich serii roboczych.`, 8);

      // ---- strona 2: siła i rekordy ----
      newPage('SIŁA I REKORDY');
      if (D.top.length) {
        sec('Wyliczony maks w najczęstszych ćwiczeniach'); const cw = (W - 2 * M - 6) / 2, ch = 50;
        D.top.forEach((t, i) => { const x = M + (i % 2) * (cw + 6), yy = y + Math.floor(i / 2) * (ch + 14); const f = t.p[0].y, l = t.p[t.p.length - 1].y; doc.setFont('Barlow', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...TX); doc.text(F.exName(t.id), x, yy); doc.setFont('Barlow', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...(l >= f ? [46, 140, 85] : [190, 70, 50])); doc.text(`z ${F.fmtNum(f, 1)} do ${F.fmtNum(l, 1)} ${F.unit()} (${l >= f ? '+' : '−'}${F.fmtNum(Math.abs(l - f), 1)})`, x + cw, yy, { align: 'right' }); const im = lineChart(t.p, cw, ch, v => F.fmtNum(v, 0)); if (im) doc.addImage(im, 'PNG', x, yy + 2, cw, ch); });
        y += Math.ceil(D.top.length / 2) * (ch + 14) + 2; para('Maks wyliczony wzorem Epleya z najlepszej serii do 10 powtórzeń na każdym treningu — bez prób na jedno powtórzenie.', 8);
      }
      if (D.recs.length) {
        sec('Rekordy z tego okresu'); const cols = [M, M + 22, M + 100, W - M]; doc.setFont('Barlow', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...MUT); doc.text('DATA', cols[0], y); doc.text('ĆWICZENIE', cols[1], y); doc.text('REKORD', cols[2], y); y += 2; doc.setDrawColor(...LINE); doc.line(M, y, W - M, y); y += 4.5;
        D.recs.slice(0, 15).forEach((r, i) => { if (y > H - 20) newPage('SIŁA I REKORDY'); if (i % 2 === 0) { doc.setFillColor(250, 248, 246); doc.rect(M, y - 3.6, W - 2 * M, 5.4, 'F'); } doc.setFont('Barlow', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TX); doc.text(new Date(r.ts).toLocaleDateString('pl-PL'), cols[0], y); doc.text(doc.splitTextToSize(F.exName(r.exId), 74)[0], cols[1], y); doc.text(`${r.label || ''}${r.text ? ': ' + r.text : ''}`.slice(0, 70), cols[2], y); y += 5.4; });
        if (D.recs.length > 15) { y += 1; para(`Pokazano 15 najnowszych z ${D.recs.length} rekordów.`, 8); }
      }

      // ---- strona 3: mięśnie i ciało ----
      newPage('MIĘŚNIE I CIAŁO');
      sec(`Serie tygodniowo na partię (ostatnie ${Math.round(D.msd / 7)} tyg.)`);
      const MG = (F.BODY_ORDER || Object.keys(D.mus)).filter(m => D.mus[m] && F.volFor(m)[1] > 0); const rows = MG.map(m => { const [lo, hi] = F.volFor(m); return [F.MUSCLES[m], D.mus[m].perWeek, lo, hi]; });
      const hh = rows.length * 7.5 + 4; doc.addImage(hbars(rows, W - 2 * M, hh), 'PNG', M, y, W - 2 * M, hh); y += hh + 3;
      para(`Jasne pole = zalecany zakres FORGE dla celu planu (${F.volLabel ? F.volLabel() : ''}). Ruch główny liczony jako 1 seria, mięśnie pomocnicze jako 0,5 (Pelland i in., 2026).`, 8);
      if (D.bw.length >= 2) { sec('Masa ciała'); const pts = D.bw.map(b => ({ x: b.date, y: F.toDisp(b.kg) })); const im = lineChart(pts, W - 2 * M, 55, v => F.fmtNum(v, 1), { year: true }); if (im) { doc.addImage(im, 'PNG', M, y, W - 2 * M, 55); y += 58; } para(`Od ${F.fwu(D.bw[0].kg)} do ${F.fwu(D.bw[D.bw.length - 1].kg)} (${D.bw.length} wpisów).`, 9, TX); }
      if (D.meas.length >= 1) { sec('Pomiary'); const f0 = D.meas[0], l0 = D.meas[D.meas.length - 1]; (F.MEASF || []).forEach(([k, n, u]) => { const a = f0.v[k], b = l0.v[k]; if (a == null && b == null) return; if (y > H - 20) newPage('MIĘŚNIE I CIAŁO'); doc.setFont('Barlow', 'normal'); doc.setFontSize(9); doc.setTextColor(...TX); doc.text(n, M, y); doc.text(`${a != null ? F.fmtNum(a, 1) : '–'}  do  ${b != null ? F.fmtNum(b, 1) : '–'} ${u}`, M + 60, y); y += 5; }); }

      // ---- lista treningów ----
      newPage('LISTA TRENINGÓW'); sec(`Treningi (${D.ss.length})`);
      const c2 = [M, M + 24, M + 92, M + 112, M + 134, M + 150]; const th = () => { doc.setFont('Barlow', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUT); ['DATA', 'TRENING', 'CZAS', 'TONAŻ', 'SERIE', 'UWAGI'].forEach((t, i) => doc.text(t, c2[i], y)); y += 2; doc.setDrawColor(...LINE); doc.line(M, y, W - M, y); y += 4.5; }; th();
      D.ss.slice().reverse().forEach((x, i) => { if (y > H - 22) { newPage('LISTA TRENINGÓW'); th(); } doc.setFont('Barlow', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TX);
        const notes = [(x.prs || []).length ? `${x.prs.length} rek.` : '', x.feel ? `sen ${x.feel.sleep}/5 · en. ${x.feel.energy}/5` : '', x.pain && x.pain.length ? 'ból: ' + x.pain.map(q => ((F.PLN && F.PLN.INJ[q.at]) || 'inne').toLowerCase()).join(', ') : ''].filter(Boolean).join(' · ');
        doc.text(new Date(x.start).toLocaleDateString('pl-PL'), c2[0], y); doc.text(doc.splitTextToSize(x.name || 'Trening', 66)[0], c2[1], y); doc.text(x.dur ? Math.round(x.dur / 60) + ' min' : '–', c2[2], y); doc.text(F.fmtVol(F.sessionVolume(x)), c2[3], y); doc.text(String(F.sessionSets(x)), c2[4], y); const nl = notes ? doc.splitTextToSize(notes, W - M - c2[5]).slice(0, 3) : []; if (nl.length) doc.text(nl, c2[5], y); y += 1.8 + Math.max(0, nl.length - 1) * 3.8; doc.setDrawColor(240, 236, 232); doc.line(M, y, W - M, y); y += 3.6; });
      foot();
      const blob = doc.output('blob'); const name = `forge-raport-${F.dateInput(Date.now())}.pdf`; const file = new File([blob], name, { type: 'application/pdf' });
      F.closeSheet(true);
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Raport FORGE' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      F.download(name, blob); F.toast('Raport PDF zapisany', 'hot');
    } catch (e) { console.error(e); F.toast('Nie udało się utworzyć raportu: ' + (e.message || e), 'err'); }
    finally { const b = document.querySelector('[data-a=pdfMake]'); if (b) { b.disabled = false; b.innerHTML = 'Utwórz raport PDF'; } }
  };
})();
