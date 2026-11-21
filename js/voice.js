/* FORGE — zapis serii głosem: „sto na pięć”, „82,5 razy 6”, „45 sekund”. Rozpoznawanie mowy przeglądarki (pl-PL), bez internetu, jeśli telefon to obsługuje. */
(function () {
  const F = window.F; const ic = (n, s) => window.icon(n, s);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; F.voiceOk = !!SR;
  const U = { zero: 0, jeden: 1, jedna: 1, jedno: 1, dwa: 2, dwie: 2, trzy: 3, cztery: 4, piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9, dziesiec: 10, jedenascie: 11, dwanascie: 12, trzynascie: 13, czternascie: 14, pietnascie: 15, szesnascie: 16, siedemnascie: 17, osiemnascie: 18, dziewietnascie: 19 };
  const T = { dwadziescia: 20, trzydziesci: 30, czterdziesci: 40, piecdziesiat: 50, szescdziesiat: 60, siedemdziesiat: 70, osiemdziesiat: 80, dziewiecdziesiat: 90 };
  const H = { sto: 100, dwiescie: 200, trzysta: 300, czterysta: 400, piecset: 500 };
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/(\d),(\d)/g, '$1.$2');
  // zamienia słowa na liczby; zwraca listę liczb w kolejności
  F.voiceNums = txt => {
    const w = norm(txt).replace(/[^a-z0-9. ]/g, ' ').split(/\s+/).filter(Boolean); const out = []; let cur = null;
    const push = () => { if (cur != null) out.push(cur); cur = null; };
    for (let k = 0; k < w.length; k++) {
      const t = w[k];
      if (/^\d+(\.\d+)?$/.test(t)) { push(); cur = parseFloat(t); continue; }
      if (H[t] != null) { if (cur != null && cur >= 100) push(); cur = (cur || 0) + H[t]; continue; }
      if (T[t] != null) { if (cur != null && cur % 100 !== 0) push(); cur = (cur || 0) + T[t]; continue; }
      if (U[t] != null) { if (cur != null && (cur % 10 !== 0 || cur < 20 && cur !== 0)) push(); cur = (cur || 0) + U[t]; continue; }
      if (t === 'pol' && w[k - 1] === 'i' && cur != null) { cur += .5; continue; }
      if (t === 'przecinek' && /^\d$/.test(w[k + 1] || '') ) { cur = parseFloat((cur || 0) + '.' + w[k + 1]); k++; continue; }
      if (t === 'przecinek' && U[w[k + 1]] != null) { cur = parseFloat((cur || 0) + '.' + U[w[k + 1]]); k++; continue; }
      if (/^(na|razy|x|po|kilo|kg|kilogramow|kilogramy|powtorzen|powtorzenia|sekund|sekundy|i)$/.test(t)) { if (t !== 'i') push(); continue; }
    }
    push(); return out;
  };
  F.voiceSet = (i, j) => new Promise(res => {
    if (!SR) { F.toast('Ten telefon nie obsługuje rozpoznawania mowy'); res(null); return; }
    const r = new SR(); r.lang = 'pl-PL'; r.interimResults = false; r.maxAlternatives = 3; let got = false;
    const tip = document.createElement('div'); tip.className = 'voice-tip'; tip.innerHTML = `${ic('mic', 22)}<span>Słucham… powiedz np. „sto na pięć”</span>`; document.body.appendChild(tip);
    const end = v => { tip.remove(); res(v); };
    r.onresult = ev => { got = true; const alts = [...ev.results[0]].map(a => a.transcript); end(alts); };
    r.onerror = () => { if (!got) { F.toast('Nie usłyszałem. Spróbuj jeszcze raz.'); end(null); } };
    r.onend = () => { if (!got) end(null); };
    try { r.start(); F.haptic(20); } catch (e) { end(null); }
  });
})();
