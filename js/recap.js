/* FORGE — podsumowanie miesiąca i roku: karty do przewijania i udostępnienia (obraz 1080×1920 do relacji) */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s); const E = F.esc; const V = F.views;
  const MON = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const MONG = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const range = () => { const k = F.ui.recap || 'm', n = new Date(), off = F.ui.recapOff || 0; if (k === 'y') { const y = n.getFullYear() + off; return { k, a: new Date(y, 0, 1).getTime(), b: new Date(y + 1, 0, 1).getTime(), label: String(y), pa: new Date(y - 1, 0, 1).getTime() }; } const d = new Date(n.getFullYear(), n.getMonth() + off, 1); return { k, a: d.getTime(), b: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(), label: `${MON[d.getMonth()]} ${d.getFullYear()}`, pa: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime() }; };
  F.recapData = () => {
    const r = range(), ss = F.S.sessions.filter(s => s.start >= r.a && s.start < r.b), prev = F.S.sessions.filter(s => s.start >= r.pa && s.start < r.a);
    const vol = ss.reduce((a, s) => a + F.sessionVolume(s), 0), dur = ss.reduce((a, s) => a + (s.dur || 0), 0), sets = ss.reduce((a, s) => a + F.sessionSets(s), 0);
    const prs = ss.reduce((a, s) => a.concat((s.prs || []).map(p => ({ ...p, ts: s.start }))), []);
    const cnt = {}; ss.forEach(s => s.exercises.forEach(e => { if (e.sets.some(x => x.done)) cnt[e.exId] = (cnt[e.exId] || 0) + 1; })); const fav = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    // najmocniejszy okres: tydzień (miesiąc) lub miesiąc (rok) z największym tonażem
    const bucket = {}; ss.forEach(s => { const d = new Date(s.start); const key = r.k === 'y' ? d.getMonth() : F.startOfWeek(s.start); bucket[key] = (bucket[key] || 0) + F.sessionVolume(s); }); const top = Object.entries(bucket).sort((a, b) => b[1] - a[1])[0];
    const topTxt = top ? (r.k === 'y' ? MON[+top[0]] : 'tydzień od ' + new Date(+top[0]).getDate() + ' ' + MONG[new Date(+top[0]).getMonth()]) : '';
    // siła: pierwszy vs ostatni wyliczony maks w okresie dla najczęstszego ćwiczenia z ciężarem
    let str = null; const wr = Object.entries(cnt).filter(([id]) => (F.S.ex.get(id) || {}).type === 'wr').sort((a, b) => b[1] - a[1])[0];
    if (wr) { const p = []; ss.slice().reverse().forEach(s => { let bst = 0; s.exercises.forEach(e => { if (e.exId === wr[0]) e.sets.forEach(x => { if (F.isWork(x) && x.r <= 10) bst = Math.max(bst, F.e1rm(x.w, x.r)); }); }); if (bst) p.push(bst); }); if (p.length >= 2) str = { id: wr[0], a: p[0], b: Math.max(...p.slice(-3)) }; }
    return { r, n: ss.length, pn: prev.length, vol, pvol: prev.reduce((a, s) => a + F.sessionVolume(s), 0), dur, sets, prs, fav, topTxt, topVol: top ? top[1] : 0, str };
  };
  const cards = d => {
    const L = [];
    L.push(['calendar', d.r.k === 'y' ? 'Twój rok' : 'Twój miesiąc', `${d.n}`, `${F.plur(d.n, 'trening', 'treningi', 'treningów')} · ${F.fmtDurHuman(d.dur)}`, d.pn ? `${d.n >= d.pn ? '+' : '−'}${Math.abs(d.n - d.pn)} względem ${d.r.k === 'y' ? 'poprzedniego roku' : 'poprzedniego miesiąca'}` : '']);
    L.push(['weight', 'Podniesione', F.fmtVol(d.vol), `łącznie w ${F.fmtNum(d.sets, 0)} seriach`, d.pvol ? `${d.vol >= d.pvol ? '+' : '−'}${F.fmtVol(Math.abs(d.vol - d.pvol))} względem poprzedniego okresu` : '']);
    L.push(['trophy', 'Rekordy', `${d.prs.length}`, d.prs.length ? d.prs.slice(0, 3).map(p => F.exName(p.exId)).filter((v, i, a) => a.indexOf(v) === i).join(', ') : 'Następnym razem!', '']);
    if (d.topTxt) L.push(['flame', d.r.k === 'y' ? 'Najmocniejszy miesiąc' : 'Najmocniejszy tydzień', d.topTxt, F.fmtVol(d.topVol), '']);
    if (d.fav) L.push(['dumbbell', 'Ulubione ćwiczenie', F.exName(d.fav[0]), `${d.fav[1]} ${F.plur(d.fav[1], 'trening', 'treningi', 'treningów')}`, '']);
    if (d.str) L.push(['chart-line', 'Siła', `${d.str.b >= d.str.a ? '+' : '−'}${F.fw(Math.abs(d.str.b - d.str.a))} ${F.unit()}`, `${F.exName(d.str.id)}: wyliczony maks ${F.fw(d.str.a)} → ${F.fw(d.str.b)} ${F.unit()}`, '']);
    return L;
  };
  V.recap = () => {
    const d = F.recapData(), L = cards(d), k = d.r.k;
    return { html: `${F.head('Podsumowanie', { back: 1, sub: d.r.label })}
      <div class="seg"><button class="${k === 'm' ? 'on' : ''}" data-a="recapK" data-k="m">Miesiąc</button><button class="${k === 'y' ? 'on' : ''}" data-a="recapK" data-k="y">Rok</button></div>
      <div class="rc-nav"><button class="ibtn" data-a="recapOff" data-d="-1" aria-label="Wcześniej">${ic('chevron-left', 20)}</button><b>${E(d.r.label)}</b><button class="ibtn" data-a="recapOff" data-d="1" ${(F.ui.recapOff || 0) >= 0 ? 'disabled' : ''} aria-label="Później">${ic('chevron-right', 20)}</button></div>
      ${d.n ? `<div class="rc-list">${L.map((c, i) => `<section class="rc cut"><div class="rc-i">${ic(c[0], 26)}</div><small>${E(c[1])}</small><b>${E(c[2])}</b><p>${E(c[3])}</p>${c[4] ? `<em>${E(c[4])}</em>` : ''}<button class="linkbtn" data-a="recapShare" data-i="${i}">${ic('share-2', 15)} Udostępnij</button></section>`).join('')}</div>` : F.empty('calendar', 'Brak treningów w tym okresie', 'Wybierz inny miesiąc albo rok.')}` };
  };
  F.act.recapK = b => { F.ui.recap = b.dataset.k; F.ui.recapOff = 0; F.render(true); };
  F.act.recapOff = b => { F.ui.recapOff = Math.min(0, (F.ui.recapOff || 0) + +b.dataset.d); F.render(true); };
  F.act.recapShare = async b => {
    const d = F.recapData(), c0 = cards(d)[+b.dataset.i]; if (!c0) return;
    try { await Promise.all([document.fonts.load('italic 800 80px "Barlow Condensed"'), document.fonts.load('500 30px Barlow')]); } catch (e) { }
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const cs = getComputedStyle(document.documentElement); const a1 = cs.getPropertyValue('--a1').trim() || '#ff4b1f', a2 = cs.getPropertyValue('--a2').trim() || '#ff9a1f';
    const pic = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    const [bgI, logoI] = await Promise.all([pic('assets/bg/share.webp'), pic('assets/bg/logo.webp')]);
    g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, W, H); if (bgI) g.drawImage(bgI, 0, 0, W, W * bgI.naturalHeight / bgI.naturalWidth > H ? W * bgI.naturalHeight / bgI.naturalWidth : H);
    g.fillStyle = 'rgba(8,6,5,.55)'; g.fillRect(0, 0, W, H);
    if (logoI) g.drawImage(logoI, 80, 120, 380, 380 * logoI.naturalHeight / logoI.naturalWidth);
    g.fillStyle = '#c9c0b6'; g.font = '500 44px Barlow'; g.fillText(d.r.label.toUpperCase(), 80, 560);
    g.fillStyle = a2; g.font = '700 64px "Barlow Condensed"'; g.fillText(c0[1].toUpperCase(), 80, 820);
    let fs = 220; const big = c0[2]; g.font = `italic 800 ${fs}px "Barlow Condensed"`; while (g.measureText(big).width > W - 160 && fs > 70) { fs -= 8; g.font = `italic 800 ${fs}px "Barlow Condensed"`; } g.fillStyle = '#fff'; g.fillText(big, 80, 820 + fs + 10);
    const bar = g.createLinearGradient(80, 0, 600, 0); bar.addColorStop(0, a2); bar.addColorStop(1, a1); g.fillStyle = bar; g.fillRect(80, 860 + fs + 20, 460, 12);
    g.fillStyle = '#e8eaf0'; g.font = '500 46px Barlow'; const words = c0[3].split(' '); let line = '', y = 1000 + fs; words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 160) { g.fillText(line, 80, y); y += 62; line = w; } else line = t; }); if (line) g.fillText(line, 80, y);
    if (c0[4]) { g.fillStyle = '#9aa0ad'; g.font = '500 38px Barlow'; g.fillText(c0[4], 80, y + 80); }
    g.fillStyle = '#8b91a0'; g.font = '500 34px Barlow'; g.textAlign = 'right'; g.fillText('Kuj swoją siłę.', W - 80, H - 120); g.textAlign = 'left'; g.fillStyle = bar; g.fillRect(0, H - 18, W, 18);
    c.toBlob(async blob => { const file = new File([blob], 'forge-podsumowanie.png', { type: 'image/png' }); try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'FORGE — ' + c0[1] }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } F.download('forge-podsumowanie.png', blob); }, 'image/png');
  };
})();
