/* FORGE — service worker: działanie offline, odświeżanie w tle, odbiór plików z menu „Udostępnij” */
const VERSION = 'forge-v1.13.0';
const LIBS = 'forge-libs-1'; // moduły OCR i PDF (ok. 11 MB): osobna pamięć, która przetrwa aktualizacje aplikacji; zmień numer przy podmianie plików w vendor/
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/icons.js', 'js/data.js', 'js/exinfo.js', 'js/exdb.js', 'js/kb.js', 'js/features.js', 'js/kcal.js', 'js/body-data.js', 'js/body.js', 'js/alert.js', 'js/inputs.js', 'js/core.js', 'js/charts.js', 'js/ui.js', 'js/parser.js', 'js/app.js', 'js/views2.js', 'js/workout.js', 'js/importer.js', 'js/planner.js', 'js/cardio.js', 'js/wizard.js', 'js/coach.js', 'js/guide.js', 'js/main.js',
  'assets/body/m.webp', 'assets/body/m-id.png', 'assets/body/f.webp', 'assets/body/f-id.png', 'assets/rank/0.webp', 'assets/rank/1.webp', 'assets/rank/2.webp', 'assets/rank/3.webp', 'assets/rank/4.webp', 'assets/rank/5.webp', 'assets/rank/6.webp', 'assets/ach/0.webp', 'assets/ach/1.webp', 'assets/ach/2.webp', 'assets/ach/3.webp', 'assets/ach/4.webp', 'assets/ach/5.webp', 'assets/ach/6.webp', 'assets/ach/7.webp', 'assets/ach/8.webp', 'assets/ach/9.webp', 'assets/ach/10.webp', 'assets/ach/11.webp', 'assets/ach/12.webp', 'assets/ach/13.webp', 'assets/ach/14.webp',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2', 'fonts/barlow-condensed-latin-800-normal.woff2',
  'fonts/barlow-condensed-latin-600-italic.woff2', 'fonts/barlow-condensed-latin-700-italic.woff2', 'fonts/barlow-condensed-latin-800-italic.woff2',
  'fonts/barlow-condensed-latin-ext-600-normal.woff2', 'fonts/barlow-condensed-latin-ext-700-normal.woff2', 'fonts/barlow-condensed-latin-ext-800-normal.woff2',
  'fonts/barlow-condensed-latin-ext-600-italic.woff2', 'fonts/barlow-condensed-latin-ext-700-italic.woff2', 'fonts/barlow-condensed-latin-ext-800-italic.woff2',
  'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-500-normal.woff2', 'fonts/barlow-latin-600-normal.woff2',
  'fonts/barlow-latin-ext-400-normal.woff2', 'fonts/barlow-latin-ext-500-normal.woff2', 'fonts/barlow-latin-ext-600-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const libs = await caches.open(LIBS);
    for (const k of await caches.keys()) {
      if (k.startsWith('forge-libs') && k !== LIBS) { await caches.delete(k); continue; }
      if (!k.startsWith('forge-v') || k === VERSION) continue;
      // moduły pobrane przez starsze wersje przenosimy, żeby nie pobierać ich drugi raz
      const old = await caches.open(k);
      for (const r of await old.keys()) { if (r.url.includes('/vendor/')) { const res = await old.match(r); if (res) await libs.put(r, res); } }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData(); const files = fd.getAll('files'); const c = await caches.open('forge-share');
        for (const f of files) await c.put(new Request(new URL('shared/' + encodeURIComponent(f.name || 'plik'), self.registration.scope).href), new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }));
      } catch (err) { }
      return Response.redirect(new URL('./#/import?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  // zdjęcia ćwiczeń (Free Exercise DB): pobierane raz, potem działają offline
  if (req.method === 'GET' && /^(cdn\.jsdelivr\.net|raw\.githubusercontent\.com)$/.test(url.hostname) && /free-exercise-db/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open('forge-media'); const hit = await cache.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res && res.ok) cache.put(req, res.clone()); return res; } catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  const heavy = url.pathname.includes('/vendor/') || url.pathname.includes('/fonts/');
  e.respondWith((async () => {
    const cache = await caches.open(url.pathname.includes('/vendor/') ? LIBS : VERSION);
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit && heavy) return hit;
    const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; });
    if (hit) { net.catch(() => { }); return hit; }
    try { return await net; } catch (err) {
      if (req.mode === 'navigate') { const idx = await cache.match('index.html'); if (idx) return idx; }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});

// Push z serwera FORGE: { title, body, tag, url }. iOS wymaga pokazania powiadomienia przy każdym pushu.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { try { d = { body: e.data.text() }; } catch (__) { d = {}; } }
  e.waitUntil(self.registration.showNotification(d.title || 'FORGE', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', tag: d.tag || 'forge-rest', renotify: true, vibrate: [300, 120, 300, 120, 500], data: { url: d.url || './#/workout' } }));
});
