/* =====================================================================
 * KUA-Link — sw.js (Service Worker / PWA)
 * - Kerangka aplikasi (HTML/CSS/JS/ikon) disimpan di perangkat → dibuka instan.
 * - Strategi stale-while-revalidate: tampilkan versi tersimpan, sekaligus
 *   cek versi terbaru di GitHub Pages. Bila berubah, halaman diberi tahu
 *   ("Versi baru tersedia → Muat ulang"). Tidak perlu mengubah file ini setiap update.
 * - Permintaan ke Apps Script (data) TIDAK PERNAH disentuh/di-cache di sini.
 * Naikkan VERSION hanya bila menambah/menghapus file di daftar SHELL_FILES.
 * ===================================================================== */
var VERSION = 'v1.3';
var SHELL = 'kualink-shell-' + VERSION;
var RUNTIME = 'kualink-runtime-v1';
var SHELL_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/config.js', 'js/rules.js', 'js/api.js', 'js/ui.js', 'js/pwa.js', 'js/app.js', 'js/dashboard.js',
  'js/pengajuan.js', 'js/formulir.js', 'js/master.js', 'js/laporan.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];

function abs(p) { return new URL(p, self.registration.scope).href; }

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return c.addAll(SHELL_FILES.map(function (f) { return new Request(abs(f), { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('kualink-shell-') === 0 && k !== SHELL; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

var notified = false;
function notifyUpdate() {
  if (notified) return;
  notified = true;
  self.clients.matchAll({ type: 'window' }).then(function (list) {
    list.forEach(function (c) { c.postMessage({ type: 'lk-update' }); });
  });
}
function changed(a, b) {
  var h = ['etag', 'last-modified', 'content-length'];
  for (var i = 0; i < h.length; i++) {
    var x = a.headers.get(h[i]), y = b.headers.get(h[i]);
    if (x && y) return x !== y;
  }
  return false;
}

/** Kerangka aplikasi: dari cache dulu, perbarui di latar belakang. */
function shell(e, key) {
  return caches.open(SHELL).then(function (cache) {
    return cache.match(key, { ignoreSearch: true }).then(function (cached) {
      var net = fetch(key, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
        if (res && res.ok) {
          if (cached && changed(cached, res)) notifyUpdate();
          return cache.put(key, res.clone()).then(function () { return res; });
        }
        return res;
      }).catch(function () { return null; });
      if (cached) { e.waitUntil(net); return cached; }
      return net.then(function (r) {
        return r || cache.match(abs('index.html')).then(function (x) { return x || Response.error(); });
      });
    });
  });
}

/** Pustaka CDN berversi tetap (pdf-lib, SheetJS) & file font: cukup unduh sekali. */
function cacheFirst(req) {
  return caches.open(RUNTIME).then(function (cache) {
    return cache.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      });
    });
  });
}

/** CSS Google Fonts: dari cache, perbarui di latar belakang. */
function runtimeSwr(e, req) {
  return caches.open(RUNTIME).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(function () { return hit; });
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // POST ke Apps Script tidak pernah disentuh
  var url = new URL(req.url);
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  if (url.origin === self.location.origin) {
    if (url.href.indexOf(self.registration.scope) !== 0) return;
    if (req.mode === 'navigate') return e.respondWith(shell(e, abs('index.html')));
    if (url.pathname.slice(-6) === '/sw.js') return;
    return e.respondWith(shell(e, url.origin + url.pathname));
  }
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com') return e.respondWith(cacheFirst(req));
  if (url.hostname === 'fonts.googleapis.com') return e.respondWith(runtimeSwr(e, req));
});
