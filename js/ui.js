/* =====================================================================
 * KUA-Link — ui.js : komponen & utilitas tampilan
 * ===================================================================== */
var UI = (function () {
  /* ---------------- IKON (garis, gaya Lucide) ---------------- */
  var P = {
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    grid: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
    xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    sheet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    list: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    arrowL: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    arrowR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    sliders: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    fileCheck: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
  };
  function icon(name, size) {
    var s = size || 18;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /* ---------------- TEKS & FORMAT ---------------- */
  function esc(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function tgl(s) { return s ? lkTanggalPendek(String(s).slice(0, 10)) : '–'; }
  function waktu(s) {
    if (!s) return '–';
    var d = String(s);
    return lkTanggalPendek(d.slice(0, 10)) + (d.length > 11 ? ' ' + d.slice(11, 16) : '');
  }
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function nowTime() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function initials(name) {
    var w = String(name || '?').replace(/\(.*\)/, '').trim().split(/\s+/).filter(Boolean);
    return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
  }
  var STATUS_LABEL = { DRAF: 'Draf', TERKUNCI: 'Terkunci', DIKEMBALIKAN: 'Dikembalikan', DIBATALKAN: 'Dibatalkan' };
  function pill(status) { return '<span class="pill s-' + esc(status) + '">' + esc(status || '–') + '</span>'; }
  function pillCetak() { return '<span class="pill s-CETAK">Perlu Cetak Ulang</span>'; }
  function statusPills(p) { return pill(p.status) + (lkBool(p.perlu_cetak_ulang) && p.status === 'TERKUNCI' ? ' ' + pillCetak() : ''); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------- TOAST ---------------- */
  function toast(msg, type) {
    var box = document.getElementById('toasts');
    if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'success');
    var ic = { success: 'checkCircle', error: 'xCircle', info: 'info', warning: 'alert' }[type || 'success'];
    t.innerHTML = icon(ic, 18) + '<div>' + esc(msg) + '</div>';
    box.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, type === 'error' ? 6000 : 3500);
    setTimeout(function () { t.remove(); }, type === 'error' ? 6400 : 3900);
  }

  /* ---------------- MODAL ---------------- */
  var modalStack = [];
  function modal(opts) {
    var back = document.createElement('div');
    back.className = 'backdrop';
    back.innerHTML = '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head">' + (opts.icon ? '<div class="lead-ico">' + icon(opts.icon, 22) + '</div>' : '') +
      '<h3>' + esc(opts.title || '') + '</h3><button class="btn btn-ghost btn-icon x" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.foot !== undefined ? '<div class="modal-foot">' + opts.foot + '</div>' : '') + '</div>';
    document.body.appendChild(back);
    var api = {
      root: back,
      el: back.querySelector('.modal'),
      body: back.querySelector('.modal-body'),
      foot: back.querySelector('.modal-foot'),
      close: function () {
        back.remove();
        modalStack = modalStack.filter(function (x) { return x !== api; });
        if (opts.onClose) opts.onClose();
      }
    };
    back.addEventListener('mousedown', function (e) { if (e.target === back && !opts.sticky) api.close(); });
    back.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', api.close); });
    modalStack.push(api);
    var f = back.querySelector('[autofocus]') || back.querySelector('input,select,textarea');
    if (f) setTimeout(function () { f.focus(); }, 30);
    return api;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalStack.length) { var m = modalStack[modalStack.length - 1]; if (!m.root.dataset.sticky) m.close(); }
  });

  /** Konfirmasi. Resolve true/false. */
  function confirm(opts) {
    return new Promise(function (resolve) {
      var done = false;
      var m = modal({
        title: opts.title, icon: opts.icon || 'alert', body: '<p style="margin:0">' + (opts.html || esc(opts.message || '')) + '</p>',
        foot: '<button class="btn" data-close>' + esc(opts.cancel || 'Batal') + '</button><button class="btn ' + (opts.danger ? 'btn-danger-solid' : 'btn-primary') + '" data-ok>' + esc(opts.ok || 'Ya, Lanjutkan') + '</button>',
        onClose: function () { if (!done) resolve(false); }
      });
      m.root.querySelector('[data-ok]').addEventListener('click', function () { done = true; m.close(); resolve(true); });
    });
  }

  /** Minta isian teks (alasan/catatan). Resolve string atau null. */
  function prompt(opts) {
    return new Promise(function (resolve) {
      var done = false;
      var m = modal({
        title: opts.title, icon: opts.icon || 'pencil', size: opts.size,
        body: (opts.html || (opts.message ? '<p style="margin-top:0">' + esc(opts.message) + '</p>' : '')) +
          '<div class="field"><label>' + esc(opts.label || 'Keterangan') + '<span class="req">*</span></label>' +
          (opts.input ? '<input class="input" data-in autofocus placeholder="' + esc(opts.placeholder || '') + '">' : '<textarea class="textarea" data-in autofocus placeholder="' + esc(opts.placeholder || '') + '"></textarea>') +
          '<div class="msg hidden" data-msg>Wajib diisi.</div></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn ' + (opts.danger ? 'btn-danger-solid' : 'btn-primary') + '" data-ok>' + esc(opts.ok || 'Simpan') + '</button>',
        onClose: function () { if (!done) resolve(null); }
      });
      var go = function () {
        var v = m.root.querySelector('[data-in]').value.trim();
        if (!v || (opts.match && v !== opts.match)) { var e = m.root.querySelector('[data-msg]'); e.textContent = opts.match ? 'Ketik persis: ' + opts.match : 'Wajib diisi.'; e.classList.remove('hidden'); return; }
        done = true; m.close(); resolve(v);
      };
      m.root.querySelector('[data-ok]').addEventListener('click', go);
    });
  }

  /* ---------------- DRAWER ---------------- */
  function drawer(opts) {
    var back = document.createElement('div');
    back.className = 'drawer-back';
    var d = document.createElement('aside');
    d.className = 'drawer';
    d.innerHTML = '<div class="modal-head"><h3>' + esc(opts.title) + '</h3><button class="btn btn-ghost btn-icon x" data-close>' + icon('x') + '</button></div>' +
      '<div class="modal-body" style="flex:1">' + opts.body + '</div><div class="modal-foot">' + (opts.foot || '') + '</div>';
    document.body.appendChild(back);
    document.body.appendChild(d);
    var api = { root: d, body: d.querySelector('.modal-body'), close: function () { back.remove(); d.remove(); } };
    back.addEventListener('click', api.close);
    d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', api.close); });
    return api;
  }

  /* ---------------- MENU AKSI ---------------- */
  var openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }
  /** items: [{label, icon, onClick, danger, disabled, title} | '-'] */
  function menu(anchor, title, items) {
    closeMenu();
    var m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = (title ? '<div class="mh">' + esc(title) + '</div>' : '') + items.map(function (it, i) {
      if (it === '-') return '<hr>';
      return '<button data-i="' + i + '"' + (it.disabled ? ' disabled' : '') + (it.title ? ' title="' + esc(it.title) + '"' : '') + ' class="' + (it.danger ? 'danger' : '') + '">' + icon(it.icon || 'chevR', 17) + '<span>' + esc(it.label) + '</span></button>';
    }).join('');
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var top = r.bottom + 4, left = r.left;
    var mh = m.offsetHeight, mw = m.offsetWidth;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    m.style.top = top + 'px';
    m.style.left = left + 'px';
    m.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b || b.disabled) return;
      var it = items[Number(b.dataset.i)];
      closeMenu();
      it.onClick();
    });
    openMenu = m;
  }
  document.addEventListener('mousedown', function (e) { if (openMenu && !openMenu.contains(e.target) && !e.target.closest('[data-menu-anchor]')) closeMenu(); });
  window.addEventListener('scroll', closeMenu, true);
  window.addEventListener('resize', closeMenu);

  /* ---------------- TOMBOL SIBUK ---------------- */
  async function busy(btn, fn) {
    if (!btn) return fn();
    if (btn.dataset.busy) return;
    var html = btn.innerHTML;
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>' + (btn.dataset.busyText ? esc(btn.dataset.busyText) : '<span>Memproses…</span>');
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; delete btn.dataset.busy; }
  }

  /* ---------------- PUSTAKA EKSTERNAL (dimuat saat perlu) ---------------- */
  var libs = {};
  function loadScript(url) {
    if (!libs[url]) {
      libs[url] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = url;
        s.onload = resolve;
        s.onerror = function () { delete libs[url]; reject(new Error('Gagal memuat pustaka dari ' + url)); };
        document.head.appendChild(s);
      });
    }
    return libs[url];
  }

  function b64ToBytes(b64) {
    var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /**
   * Gabung beberapa PDF (base64) jadi satu, opsional diberi watermark.
   * Resolve Blob PDF.
   */
  async function mergePdf(list, watermark) {
    await loadScript(LK_CONFIG.LIB_PDF);
    var L = window.PDFLib;
    var out = await L.PDFDocument.create();
    var font = await out.embedFont(L.StandardFonts.HelveticaBold);
    for (var i = 0; i < list.length; i++) {
      var src = await L.PDFDocument.load(b64ToBytes(list[i].base64));
      var pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach(function (pg) {
        out.addPage(pg);
        var wm = list[i].watermark || watermark;
        if (wm) {
          var sz = pg.getSize();
          var fs = Math.min(sz.width, sz.height) / (wm.length > 12 ? 9 : 6);
          var tw = font.widthOfTextAtSize(wm, fs);
          pg.drawText(wm, {
            x: sz.width / 2 - (tw / 2) * Math.cos(Math.PI / 4), y: sz.height / 2 - (tw / 2) * Math.sin(Math.PI / 4),
            size: fs, font: font, color: L.rgb(0.86, 0.15, 0.15), opacity: 0.18, rotate: L.degrees(45)
          });
        }
      });
    }
    var bytes = await out.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /** Buka blob di tab baru. win = jendela yang sudah dibuka saat klik (agar tidak diblokir). */
  function openBlob(blob, win, filename) {
    var url = URL.createObjectURL(blob);
    if (win && !win.closed) { win.location.href = url; }
    else {
      var a = document.createElement('a');
      a.href = url; a.download = filename || 'dokumen.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Pop-up diblokir browser — berkas diunduh sebagai gantinya.', 'info');
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  /** Buka jendela kosong segera saat klik (cegah pemblokir pop-up). */
  function preOpen() {
    var w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    if (w) {
      try { w.document.write('<title>Menyiapkan PDF…</title><p style="font-family:sans-serif;padding:24px;color:#475569">Menyiapkan dokumen PDF, mohon tunggu…</p>'); } catch (e) { /* abaikan */ }
    }
    return w;
  }

  /** Ekspor Excel. sheets: [{name, rows:[{...}] }] */
  async function exportXlsx(filename, sheets) {
    await loadScript(LK_CONFIG.LIB_XLSX);
    var wb = XLSX.utils.book_new();
    sheets.forEach(function (s) {
      var ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ Keterangan: 'Tidak ada data' }]);
      var keys = Object.keys(s.rows[0] || { Keterangan: '' });
      ws['!cols'] = keys.map(function (k) {
        var w = Math.max(k.length, 8);
        s.rows.slice(0, 200).forEach(function (r) { w = Math.max(w, String(r[k] === undefined ? '' : r[k]).length); });
        return { wch: Math.min(w + 2, 50) };
      });
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  }

  /* ---------------- KOMPONEN HTML ---------------- */
  function emptyState(title, sub, action) {
    return '<div class="empty">' + icon('file', 40) + '<b>' + esc(title) + '</b><div>' + esc(sub || '') + '</div>' + (action ? '<div class="mt-s">' + action + '</div>' : '') + '</div>';
  }
  function skeletonRows(n, cols) {
    var r = '';
    for (var i = 0; i < n; i++) { r += '<tr>'; for (var j = 0; j < cols; j++) r += '<td><div class="skel" style="width:' + (40 + ((i * 7 + j * 13) % 50)) + '%"></div></td>'; r += '</tr>'; }
    return r;
  }
  function pager(total, page, size) {
    var pages = Math.max(1, Math.ceil(total / size));
    if (page > pages) page = pages;
    var from = total ? (page - 1) * size + 1 : 0, to = Math.min(total, page * size);
    var nums = [];
    for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    return {
      page: page, from: from, to: to,
      html: '<div class="muted">Menampilkan <b>' + from + '–' + to + '</b> dari <b>' + total + '</b></div><div class="pager">' +
        '<button data-pg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>‹ Sebelumnya</button>' +
        nums.map(function (n) { return n === '…' ? '<span class="muted">…</span>' : '<button data-pg="' + n + '" class="' + (n === page ? 'cur' : '') + '">' + n + '</button>'; }).join('') +
        '<button data-pg="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>Berikutnya ›</button></div>'
    };
  }
  function options(list, selected, placeholder) {
    return (placeholder !== undefined ? '<option value="">' + esc(placeholder) + '</option>' : '') + list.map(function (o) {
      var v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }
  function copyText(t) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Disalin: ' + t, 'info'); });
  }

  return {
    icon: icon, esc: esc, tgl: tgl, waktu: waktu, today: today, nowTime: nowTime, initials: initials, pill: pill, pillCetak: pillCetak,
    statusPills: statusPills, STATUS_LABEL: STATUS_LABEL, debounce: debounce, $: $, $$: $$, toast: toast, modal: modal, confirm: confirm,
    prompt: prompt, drawer: drawer, menu: menu, closeMenu: closeMenu, busy: busy, loadScript: loadScript, mergePdf: mergePdf,
    openBlob: openBlob, downloadBlob: downloadBlob, preOpen: preOpen, exportXlsx: exportXlsx, emptyState: emptyState,
    skeletonRows: skeletonRows, pager: pager, options: options, copyText: copyText, b64ToBytes: b64ToBytes
  };
})();
