/* =====================================================================
 * KUA-Link — pwa.js : pasang aplikasi (desktop & HP) + pemberitahuan versi baru
 * - Chrome/Edge (Windows, Mac, Android): tombol "Pasang Aplikasi" memakai
 *   prompt resmi browser (beforeinstallprompt).
 * - iPhone/iPad: browser tidak punya prompt otomatis → tampilkan langkah
 *   "Bagikan → Tambah ke Layar Utama".
 * ===================================================================== */
var PWA = (function () {
  var deferred = null;

  function standalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function ios() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function canInstall() { return !standalone() && (!!deferred || ios()); }

  function refresh() {
    document.querySelectorAll('[data-pwa-install]').forEach(function (el) { el.classList.toggle('hidden', !canInstall()); });
  }
  function bind(root) {
    (root || document).querySelectorAll('[data-pwa-install]').forEach(function (el) { el.onclick = install; });
    refresh();
  }

  async function install() {
    if (deferred) {
      var ev = deferred;
      deferred = null;
      ev.prompt();
      try { await ev.userChoice; } catch (e) { /* abaikan */ }
      refresh();
      return;
    }
    if (ios()) {
      UI.modal({
        title: 'Pasang KUA-Link di iPhone/iPad', icon: 'download',
        body: '<ol style="margin:0;padding-left:20px;line-height:1.9">' +
          '<li>Buka halaman ini di <b>Safari</b>.</li>' +
          '<li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas).</li>' +
          '<li>Pilih <b>Tambah ke Layar Utama</b> → <b>Tambah</b>.</li></ol>' +
          '<p class="muted" style="margin-bottom:0">Ikon KUA-Link muncul di layar utama dan terbuka layaknya aplikasi.</p>',
        foot: '<button class="btn btn-primary" data-close>Mengerti</button>'
      });
    }
  }

  function showUpdate() {
    if (document.getElementById('pwaUpdate')) return;
    var d = document.createElement('div');
    d.id = 'pwaUpdate';
    d.className = 'pwa-update';
    d.setAttribute('role', 'status');
    d.innerHTML = UI.icon('refresh', 18) + '<span>Versi baru KUA-Link tersedia.</span>' +
      '<button class="btn btn-sm btn-primary" data-reload>Muat Ulang</button><button class="btn btn-sm btn-ghost" data-later>Nanti</button>';
    document.body.appendChild(d);
    d.querySelector('[data-reload]').onclick = function () { location.reload(); };
    d.querySelector('[data-later]').onclick = function () { d.remove(); };
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; refresh(); });
  window.addEventListener('appinstalled', function () { deferred = null; refresh(); if (window.UI) UI.toast('KUA-Link terpasang di perangkat ini.'); });

  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'lk-update') showUpdate(); });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) { console.warn('Service worker gagal didaftarkan:', err); });
    });
  }

  return { bind: bind, install: install, canInstall: canInstall, refresh: refresh };
})();
