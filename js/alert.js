/* FORGE — przerwa działa też przy zablokowanym telefonie / zminimalizowanej aplikacji.
   1) cichy, zapętlony dźwięk utrzymuje stronę przy życiu i pokazuje na ekranie blokady odliczanie (Media Session),
   2) po końcu przerwy: głośny sygnał + wibracja + powiadomienie systemowe. */
(function () {
  const F = window.F; const S = () => F.S.settings;
  let audio = null, urls = {}, endTimer = 0, active = false;

  function wav(samples, rate = 22050) {
    const n = samples.length, b = new DataView(new ArrayBuffer(44 + n * 2)); const w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
    b.setUint32(24, rate, true); b.setUint32(28, rate * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) b.setInt16(44 + i * 2, samples[i], true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function silence() { const a = new Int16Array(22050); for (let i = 0; i < a.length; i++) a[i] = (i & 1) ? 1 : -1; return wav(a); } // 1 s, prawie cisza
  function alarm() { // 3 głośne sygnały
    const rate = 22050, out = []; const tone = (f, d) => { const n = Math.floor(rate * d); for (let i = 0; i < n; i++) { const env = Math.min(1, i / 200, (n - i) / 400); out.push(Math.sign(Math.sin(2 * Math.PI * f * i / rate)) * 14000 * env); } for (let i = 0; i < rate * .08; i++) out.push(0); };
    tone(880, .22); tone(880, .22); tone(1320, .5); return wav(Int16Array.from(out));
  }
  const on = () => S().lockRest === true; // odliczanie na ekranie blokady (cichy dźwięk — wstrzymuje muzykę z innych aplikacji)
  const wantNotif = () => S().notifRest !== false;
  const ms = () => ('mediaSession' in navigator) ? navigator.mediaSession : null;

  function ensureAudio() {
    if (!audio) { audio = new Audio(); audio.setAttribute('playsinline', ''); audio.preload = 'auto'; urls.sil = urls.sil || silence(); urls.alarm = urls.alarm || alarm(); }
    return audio;
  }
  function setSession() {
    const m = ms(), r = F.rest; if (!m || !r) return;
    try {
      m.metadata = new MediaMetadata({ title: 'Przerwa', artist: r.label ? 'FORGE · ' + r.label : 'FORGE', album: 'Trening', artwork: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      m.playbackState = 'playing';
      const pos = Math.max(0, Math.min(r.total, r.total - (r.end - Date.now()) / 1000));
      m.setPositionState({ duration: r.total, playbackRate: 1, position: pos });
    } catch (e) { }
  }
  function handlers() {
    const m = ms(); if (!m) return; const set = (a, f) => { try { m.setActionHandler(a, f); } catch (e) { } };
    set('seekforward', () => F.restAdd(15)); set('seekbackward', () => F.restAdd(-15));
    set('nexttrack', () => F.restSkipNow && F.restSkipNow()); set('previoustrack', () => F.restAdd(-15));
    set('pause', () => { audio && audio.play().catch(() => { }); }); set('play', () => { audio && audio.play().catch(() => { }); }); // nie da się „zapauzować” przerwy
    set('stop', null);
  }
  function startKeepAlive() {
    if (!on()) return; const a = ensureAudio();
    try { if (a.src !== urls.sil) { a.src = urls.sil; } a.loop = true; a.volume = 1; const p = a.play(); if (p && p.catch) p.catch(() => { }); active = true; handlers(); setSession(); } catch (e) { }
  }
  function stopKeepAlive(delay = 0) {
    active = false; const m = ms();
    setTimeout(() => { if (active || !audio) return; try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) { } if (m) { try { m.playbackState = 'none'; m.metadata = null; } catch (e) { } } }, delay);
  }
  async function ensurePermission() {
    try { if ('Notification' in window && Notification.permission === 'default' && !F._askedNotif) { F._askedNotif = true; await Notification.requestPermission(); } } catch (e) { }
  }
  async function notify() {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      const o = { body: 'Do roboty — czas na kolejną serię.', tag: 'forge-rest', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', vibrate: [300, 120, 300, 120, 500], requireInteraction: false, data: { url: './#/workout' } };
      if (reg) await reg.showNotification('Przerwa skończona', o); else new Notification('Przerwa skończona', o);
    } catch (e) { }
  }
  function closeNotif() { try { navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications({ tag: 'forge-rest' }).then(l => l.forEach(n => n.close()))); } catch (e) { } }

  // ---- podpięcie pod stoper ----
  const _start = F.restStart, _stop = F.restStop, _add = F.restAdd;
  F.restStart = (sec, label) => { _start(sec, label); if (F.rest) { closeNotif(); startKeepAlive(); if (wantNotif()) ensurePermission(); armEnd(); } };
  F.restAdd = s => { _add(s); if (F.rest) { setSession(); armEnd(); } };
  F.restSkipNow = () => { if (F.rest) F.restStop(false); };
  F.restStop = finished => {
    const was = !!F.rest; clearTimeout(endTimer); _stop(finished);
    if (!was) return;
    if (finished && wantNotif() && (document.hidden || !document.hasFocus())) notify();
    if (finished && on() && active) { // głośny sygnał w tle (tylko w trybie z odliczaniem na ekranie blokady)
      try { const a = ensureAudio(); a.loop = false; a.src = urls.alarm; a.play().catch(() => { }); } catch (e) { }
      stopKeepAlive(2200);
    } else stopKeepAlive(0);
  };
  // zegar z dokładnością do ułamka sekundy, nawet gdy przeglądarka spowolni interwał
  function armEnd() { clearTimeout(endTimer); if (!F.rest) return; endTimer = setTimeout(() => { if (F.rest) F.tickRest(); }, Math.max(0, F.rest.end - Date.now()) + 30); }
  document.addEventListener('visibilitychange', () => { if (F.rest && !document.hidden) setSession(); });
  // zgoda na powiadomienia przy włączeniu opcji w ustawieniach
  document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.k === 'notifRest' && t.checked) { F._askedNotif = false; ensurePermission(); } });
})();
