/* Minigolf – skóre: jednoduchý offline cache.
   Aplikace se načte i bez signálu, zápisy se pošlou, jakmile je internet zpátky. */
var CACHE = 'minigolf-v4';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './bg.webp'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Data z Apps Scriptu se nikdy necachují – vždy jdou po síti.
  if (url.hostname.indexOf('script.google') > -1 || url.hostname.indexOf('googleusercontent') > -1) return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.status === 200 && url.origin === location.origin) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
