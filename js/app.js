/* =====================================================================
 * KUA-Link — app.js : state, login, kerangka (header + sidebar), router SPA
 * Navigasi antar halaman instan (tanpa panggilan server) — data diambil
 * sekali lewat "bootstrap", lalu disegarkan di latar belakang.
 * ===================================================================== */
var S = { user: null, desa: null, master: null, list: [], notif: { items: [], unread: 0 }, listAt: 0, baseHash: '#/dashboard' };

var App = (function () {
  var esc = UI.esc, icon = UI.icon;
  var pollTimer = null;
  var sidebarOpenGroups = { pengajuan: true, master: true };

  /* ---------------- PERAN ---------------- */
  function isKua() { return S.user && (S.user.peran === 'SUPER_ADMIN' || S.user.peran === 'PETUGAS_KUA'); }
  function isAdmin() { return S.user && S.user.peran === 'SUPER_ADMIN'; }
  function roleLabel() { return { SUPER_ADMIN: 'Super Admin KUA', PETUGAS_KUA: 'Petugas KUA', OPERATOR_DESA: 'Operator Desa' }[S.user.peran] || S.user.peran; }
  function desaName(id) { var d = (S.master ? S.master.desa : []).find(function (x) { return x.desa_id === id; }); return d ? d.nama_desa : (id || '–'); }
  function fields() { return S.master ? S.master.fields : []; }
  function fieldMap() { return lkFieldMap(fields()); }
  function kuaName() { return (S.master && S.master.config.nama_kua) || 'KUA'; }

  /* ---------------- INIT & LOGIN ---------------- */
  function init() {
    window.addEventListener('hashchange', route);
    window.addEventListener('beforeunload', function (e) {
      if (window.Formulir && Formulir.isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });
    if (/GANTI_DENGAN_ID_DEPLOYMENT/.test(LK_CONFIG.GAS_URL)) {
      document.getElementById('root').innerHTML = '<div class="login-wrap"><div class="login-card"><div class="wordmark">KUA-Link<small>by Ahzani Labs</small></div>' +
        '<h1>Belum dikonfigurasi</h1><p class="sub">Isi <b>GAS_URL</b> di file <code>js/config.js</code> dengan URL Web App Apps Script (berakhiran <code>/exec</code>), lalu upload ulang.</p></div></div>';
      return;
    }
    if (API.session()) bootstrap(); else renderLogin();
  }

  function renderLogin(msg) {
    stopPolling();
    document.getElementById('root').innerHTML =
      '<div class="login-wrap"><form class="login-card" id="loginForm" autocomplete="on">' +
      '<div class="wordmark">KUA-Link<small>by Ahzani Labs</small></div>' +
      '<h1>Masuk</h1><p class="sub">Administrasi Surat Pengantar Nikah – Desa &amp; KUA</p>' +
      (msg ? '<div class="banner warn" style="margin-bottom:16px">' + icon('alert') + '<div class="txt">' + esc(msg) + '</div></div>' : '') +
      '<div class="banner danger hidden" id="loginErr" style="margin-bottom:16px">' + icon('xCircle') + '<div class="txt"></div></div>' +
      '<div class="stack" style="gap:14px">' +
      '<div class="field"><label for="lu">Username</label><input class="input" id="lu" name="username" autocomplete="username" required autofocus></div>' +
      '<div class="field"><label for="lp">Password</label><div class="input-wrap"><input class="input" id="lp" type="password" name="password" autocomplete="current-password" required style="padding-right:44px">' +
      '<button type="button" class="btn btn-ghost btn-icon" id="lpShow" style="position:absolute;right:4px;top:4px" aria-label="Tampilkan password">' + icon('eye') + '</button></div></div>' +
      '<div class="field"><label for="lo">Nama Operator (opsional)</label><input class="input" id="lo" maxlength="60" placeholder="Mis. Sri Wahyuni"></div>' +
      '<button class="btn btn-primary" id="lbtn" style="width:100%;height:44px" data-busy-text="Memeriksa…">Masuk</button>' +
      '<button type="button" class="btn btn-ghost hidden" data-pwa-install style="width:100%">' + icon('download') + 'Pasang Aplikasi di Perangkat Ini</button>' +
      '</div><div class="login-foot">' + 'KUA-Link · Ahzani Labs</div></form></div>';
    if (window.PWA) PWA.bind(document.getElementById('root'));
    try { var last = localStorage.getItem('lk_last_op'); if (last) document.getElementById('lo').value = last; } catch (e) { /* abaikan */ }
    document.getElementById('lpShow').onclick = function () { var i = document.getElementById('lp'); i.type = i.type === 'password' ? 'text' : 'password'; };
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('lbtn');
      UI.busy(btn, async function () {
        var op = document.getElementById('lo').value.trim();
        var r = await API.call('login', {
          username: document.getElementById('lu').value, password: document.getElementById('lp').value,
          nama_operator: op, perangkat: navigator.userAgent
        });
        if (!r.success) {
          var box = document.getElementById('loginErr');
          box.querySelector('.txt').textContent = r.message;
          box.classList.remove('hidden');
          return;
        }
        try { localStorage.setItem('lk_last_op', op); } catch (e2) { /* abaikan */ }
        API.setSession({ token: r.data.token, user: r.data.user });
        if (r.data.user.wajib_ganti_pw) { S.user = r.data.user; forcePasswordChange(); return; }
        if (r.data.boot) { applyBoot(r.data.boot); saveBootCache(r.data.boot); startPolling(); }
        else await bootstrap();
      });
    });
  }

  /* ---------- Cache data awal di perangkat (stale-while-revalidate) ----------
   * Tampilan langsung dirender dari cache (0 detik), lalu data terbaru diambil
   * dari server di latar belakang. Cache dihapus saat Keluar / sesi berakhir. */
  var BOOT_PREFIX = 'lk_boot_';
  function bootKey(userId) { return BOOT_PREFIX + userId; }
  function readBootCache() {
    var s = API.session();
    if (!s || !s.user) return null;
    try { return JSON.parse(localStorage.getItem(bootKey(s.user.user_id)) || 'null'); } catch (e) { return null; }
  }
  function saveBootCache(data) {
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf(BOOT_PREFIX) === 0 && k !== bootKey(data.user.user_id)) localStorage.removeItem(k); });
      localStorage.setItem(bootKey(data.user.user_id), JSON.stringify(Object.assign({ cachedAt: Date.now() }, data)));
    } catch (e) { /* penyimpanan penuh/diblokir: abaikan */ }
  }
  /** Simpan state terkini ke cache (ditunda 1 detik agar tidak menulis berulang). */
  var persistTimer = null;
  function persistState() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      if (S.user && S.master) saveBootCache({ user: S.user, desa: S.desa, master: S.master, pengajuan: S.list, notif: S.notif });
    }, 1000);
  }
  function clearBootCache() {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(BOOT_PREFIX) === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ }
  }

  /** Terapkan data awal ke state. Render penuh pertama kali, selanjutnya hanya render ulang halaman aktif. */
  function applyBoot(d, fromCache) {
    var first = !S.master || !document.getElementById('main');
    S.user = d.user;
    S.desa = d.desa;
    S.master = d.master;
    S.list = d.pengajuan || [];
    S.notif = d.notif || { items: [], unread: 0 };
    S.listAt = fromCache ? (d.cachedAt || Date.now()) : Date.now();
    if (first) { renderShell(); route(); }
    else { updateBell(); if (!(window.Formulir && Formulir.isOpen())) rerender(); else refreshSidebar(); }
  }

  async function bootstrap() {
    var root = document.getElementById('root');
    var cached = readBootCache();
    if (cached && !S.master) applyBoot(cached, true);
    else if (!S.master) root.innerHTML = '<div class="boot"><div style="text-align:center"><div class="wordmark" style="margin-bottom:10px">KUA-Link</div><span class="muted">Menyiapkan data…</span></div></div>';
    var r = await API.call('bootstrap');
    if (!r.success) {
      if (r.code === 'AUTH' || r.code === 'GANTI_PW') return;
      if (S.master) { UI.toast('Menampilkan data tersimpan di perangkat — ' + r.message, 'warning'); startPolling(); return; }
      root.innerHTML = '<div class="login-wrap"><div class="login-card"><h1>Gagal memuat</h1><p class="sub">' + esc(r.message) + '</p><button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button> <button class="btn" onclick="App.logout()">Keluar</button></div></div>';
      return;
    }
    applyBoot(r.data, false);
    saveBootCache(r.data);
    startPolling();
  }

  function sessionExpired(msg) {
    clearBootCache();
    API.setSession(null);
    S.user = null; S.master = null;
    if (window.Formulir) Formulir.forceClose();
    renderLogin(msg || 'Sesi berakhir. Silakan masuk kembali.');
  }

  async function logout() {
    if (window.Formulir && Formulir.isDirty()) {
      var ok = await UI.confirm({ title: 'Keluar sekarang?', message: 'Ada isian formulir yang belum tersimpan di server. Tetap keluar?', ok: 'Keluar', danger: true });
      if (!ok) return;
    }
    API.call('logout');
    clearBootCache();
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('lk_draft_') === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ }
    API.setSession(null);
    S.user = null; S.master = null; S.list = [];
    if (window.Formulir) Formulir.forceClose();
    history.replaceState(null, '', location.pathname);
    renderLogin();
  }

  /* ---------------- GANTI PASSWORD ---------------- */
  function pwForm() {
    // Kolom username tersembunyi: agar pengelola password browser tidak mengisi kolom lain (mis. pencarian menu) dengan username
    return '<form class="stack" style="gap:14px" autocomplete="on" onsubmit="return false">' +
      '<input type="text" name="username" autocomplete="username" value="' + esc(S.user ? S.user.username : '') + '" hidden readonly tabindex="-1" aria-hidden="true">' +
      '<div class="field"><label>Password Lama / Awal</label><input class="input" type="password" data-pw="lama" autocomplete="current-password"></div>' +
      '<div class="field"><label>Password Baru</label><input class="input" type="password" data-pw="baru" autocomplete="new-password"><div class="help">Minimal 8 karakter, berisi huruf dan angka.</div></div>' +
      '<div class="field"><label>Ulangi Password Baru</label><input class="input" type="password" data-pw="ulang" autocomplete="new-password"></div>' +
      '<div class="msg hidden" data-pwmsg style="color:var(--danger);font-size:13px"></div></form>';
  }
  async function submitPw(root, btn) {
    var g = function (k) { return root.querySelector('[data-pw="' + k + '"]').value; };
    var m = root.querySelector('[data-pwmsg]');
    var show = function (t) { m.textContent = t; m.classList.remove('hidden'); };
    if (g('baru') !== g('ulang')) return show('Ulangi password baru tidak sama.'), false;
    var r;
    await UI.busy(btn, async function () { r = await API.call('changePassword', { lama: g('lama'), baru: g('baru') }); });
    if (!r.success) return show(r.message), false;
    var s = API.session();
    if (s) { s.user = r.data.user; API.setSession(s); }
    UI.toast(r.message);
    return true;
  }
  function forcePasswordChange() {
    var m = UI.modal({
      title: 'Ganti Password Awal', icon: 'key', sticky: true,
      body: '<p style="margin-top:0">Ganti password awal dengan password Anda sendiri sebelum melanjutkan.</p>' + pwForm(),
      foot: '<button class="btn" data-out>Keluar</button><button class="btn btn-primary" data-ok>Simpan Password</button>'
    });
    m.root.dataset.sticky = '1';
    m.root.querySelector('.x').remove();
    m.root.querySelector('[data-out]').onclick = function () { m.close(); logout(); };
    m.root.querySelector('[data-ok]').onclick = async function (e) {
      if (await submitPw(m.root, e.currentTarget)) { m.close(); bootstrap(); }
    };
  }

  /* ---------------- KERANGKA ---------------- */
  function counts() {
    var c = { DRAF: 0, SELESAI: 0, DIBATALKAN: 0, AKTIF: 0, ALL: S.list.length };
    S.list.forEach(function (p) { c[p.status] = (c[p.status] || 0) + 1; if (p.status !== 'DIBATALKAN') c.AKTIF++; });
    return c;
  }

  function navLink(hash, ic, label, badge, red) {
    return '<a class="nav-item" href="' + hash + '" data-nav="' + hash + '">' + (ic ? icon(ic, 19) : '') + '<span class="lbl">' + esc(label) + '</span>' +
      (badge ? '<span class="nav-badge' + (red ? ' red' : '') + '">' + badge + '</span>' : '') + '</a>';
  }
  function navGroup(key, ic, label, inner) {
    var open = sidebarOpenGroups[key];
    return '<button class="nav-item' + (open ? ' open' : '') + '" data-group="' + key + '">' + icon(ic, 19) + '<span class="lbl">' + esc(label) + '</span><span class="chev">' + icon('chevR', 16) + '</span></button>' +
      '<div class="nav-sub' + (open ? '' : ' collapsed') + '" data-groupbody="' + key + '">' + inner + '</div>';
  }

  function sidebarHtml() {
    var c = counts();
    // type=search + autocomplete=off: cegah browser mengisi username tersimpan ke kolom ini
    var h = '<div class="search">' + icon('search', 16) + '<input id="navSearch" type="search" name="kl-menu-search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Cari menu / no. pengajuan…"></div>';
    // Menu datar (tanpa sub-menu): Dashboard · Pengajuan Nikah · Riwayat Pengajuan · Profil Desa
    h += navLink('#/dashboard', 'grid', 'Dashboard');
    if (!isKua()) h += navLink('#/form/new', 'plus', 'Pengajuan Nikah');
    h += navLink('#/pengajuan', 'file', 'Riwayat Pengajuan', c.ALL || '');
    if (!isKua()) {
      h += navLink('#/profil', 'building', 'Profil Desa');
    } else {
      if (isAdmin()) {
        h += navGroup('master', 'database', 'Data Master',
          navLink('#/master/akun', '', 'Akun Desa') + navLink('#/master/field', '', 'Field Surat') +
          navLink('#/master/template', '', 'Template Surat') + navLink('#/master/aturan', '', 'Aturan Paket Surat') +
          navLink('#/master/libur', '', 'Hari Libur') + navLink('#/master/integrasi', '', 'Integrasi & WhatsApp'));
      }
      h += navLink('#/riwayat', 'history', 'Riwayat & Arsip');
      h += navLink('#/profil', 'user', 'Profil Akun');
    }
    h += '<div class="spacer"></div><div class="bottom">' +
      '<button class="nav-item hidden" data-pwa-install>' + icon('download', 19) + '<span class="lbl">Pasang Aplikasi</span></button>' +
      navLink('#/panduan', 'help', 'Panduan Singkat') +
      '<button class="nav-item logout" data-act="logout">' + icon('logout', 19) + '<span class="lbl">Keluar</span></button></div>';
    return h;
  }

  function renderShell() {
    var name = isKua() ? kuaName() : (S.desa ? 'Desa ' + S.desa.nama_desa : desaName(S.user.desa_id));
    var person = S.user.nama_operator || S.user.nama_tampilan || S.user.username;
    document.getElementById('root').innerHTML =
      '<div class="app"><header class="header">' +
      '<button class="btn btn-ghost btn-icon menu-btn" id="menuBtn" aria-label="Menu">' + icon('menu', 22) + '</button>' +
      '<div class="wordmark">KUA-Link<small>by Ahzani Labs</small></div><div class="divider"></div>' +
      '<div class="welcome"><div class="hi"><span class="greet">Selamat datang,</span><b>' + esc(name) + '</b></div><div class="tagline">Surat Pengantar Nikah – ' + esc(kuaName()) + '</div></div>' +
      '<div class="right"><button class="icon-btn" id="hdrRefresh" aria-label="Segarkan data" title="Segarkan data">' + icon('refresh', 19) + '</button>' +
      '<button class="icon-btn" id="themeBtn" aria-label="Mode malam" title="Mode malam / terang">' + icon(UI.theme() === 'dark' ? 'sun' : 'moon', 19) + '</button>' +
      '<button class="icon-btn" id="bellBtn" aria-label="Notifikasi">' + icon('bell', 20) + '<span class="count hidden" id="bellCount"></span></button>' +
      '<button class="account" id="accBtn" data-menu-anchor><span class="avatar">' + esc(UI.initials(person)) + '</span><span class="who"><b>' + esc(person) + '</b><span>' + esc(roleLabel()) + '</span></span>' + icon('chevD', 16) + '</button></div></header>' +
      '<div class="body"><nav class="sidebar" id="sidebar">' + sidebarHtml() + '</nav><div class="sidebar-backdrop" id="sbBack"></div>' +
      '<main class="main" id="main"></main></div>' + bottomNavHtml() + '</div><div id="overlayRoot"></div>';
    bindShell();
    updateBell();
  }

  /**
   * Navigasi bawah (HP, tanpa sidebar): Dashboard · Riwayat · [tombol bulat tengah] · Profil · Panduan.
   * Tombol tengah: desa = Pengajuan baru · Admin KUA = Data Master (lembar menu) · Petugas KUA = Riwayat & Arsip.
   */
  function bottomNavHtml() {
    var mid = !isKua() ? ['#/form/new', 'plus', 'Pengajuan'] : isAdmin() ? ['sheet:master', 'database', 'Master'] : ['#/riwayat', 'history', 'Arsip'];
    var items = [['#/dashboard', 'grid', 'Dashboard'], ['#/pengajuan', 'file', 'Riwayat'], mid, ['#/profil', isKua() ? 'user' : 'building', 'Profil'], ['#/panduan', 'help', 'Panduan']];
    return '<nav class="bnav" id="bnav">' + items.map(function (x, i) {
      var fab = i === 2 ? ' fab' : '';
      if (x[0].indexOf('sheet:') === 0) return '<button type="button" class="bn' + fab + '" data-bnav="#/master/" data-sheet="' + x[0].slice(6) + '"><span class="bi">' + icon(x[1], 22) + '</span><span class="bl">' + esc(x[2]) + '</span></button>';
      return '<a class="bn' + fab + '" href="' + x[0] + '" data-bnav="' + x[0] + '"><span class="bi">' + icon(x[1], 22) + '</span><span class="bl">' + esc(x[2]) + '</span></a>';
    }).join('') + '</nav>';
  }

  /** Lembar menu Data Master dari tombol tengah navigasi bawah (Admin KUA, HP). */
  function masterSheet() {
    var old = document.getElementById('bsheet');
    if (old) { old.remove(); return; }
    var items = [['#/master/akun', 'users', 'Akun Desa & Modin'], ['#/master/field', 'list', 'Field Surat'], ['#/master/template', 'file', 'Template Surat'],
      ['#/master/aturan', 'fileCheck', 'Aturan Paket Surat'], ['#/master/libur', 'calendar', 'Hari Libur'], ['#/master/integrasi', 'plug', 'Integrasi & WhatsApp'], ['#/riwayat', 'history', 'Riwayat & Arsip']];
    var b = document.createElement('div');
    b.id = 'bsheet';
    b.className = 'bsheet-back';
    b.innerHTML = '<div class="bsheet" role="menu"><div class="grab"></div><div class="bs-t">Data Master</div>' + items.map(function (x) {
      return '<a href="' + x[0] + '" role="menuitem">' + icon(x[1], 20) + '<span>' + esc(x[2]) + '</span>' + icon('chevR', 16) + '</a>';
    }).join('') + '</div>';
    document.body.appendChild(b);
    b.addEventListener('click', function (e) { if (e.target === b || e.target.closest('a')) b.remove(); });
  }

  function refreshSidebar() {
    var sb = document.getElementById('sidebar');
    if (!sb) return;
    var q = (document.getElementById('navSearch') || {}).value || '';
    sb.innerHTML = sidebarHtml();
    bindSidebar();
    var inp = document.getElementById('navSearch');
    if (q) { inp.value = q; filterNav(q); }
    markActiveNav();
  }

  function bindShell() {
    bindSidebar();
    UI.$$('#bnav [data-sheet]').forEach(function (x) { x.onclick = masterSheet; });
    document.getElementById('menuBtn').onclick = function () { document.getElementById('sidebar').classList.toggle('show'); document.getElementById('sbBack').classList.toggle('show'); };
    document.getElementById('sbBack').onclick = closeSidebar;
    document.getElementById('bellBtn').onclick = openNotif;
    // v1.5: segarkan semua data (daftar, notifikasi, data master) tanpa memuat ulang halaman
    document.getElementById('hdrRefresh').onclick = function () {
      var b = this;
      if (b.classList.contains('spinning')) return;
      b.classList.add('spinning');
      // satu panggilan: data master + daftar pengajuan + notifikasi sekaligus
      API.call('bootstrap').then(function (r) {
        b.classList.remove('spinning');
        if (!r.success) return UI.toast(r.message, 'error');
        applyBoot(r.data, false); saveBootCache(r.data);
        UI.toast('Data diperbarui.', 'info');
      });
    };
    document.getElementById('themeBtn').onclick = function () {
      var t = UI.theme() === 'dark' ? 'light' : 'dark';
      UI.setTheme(t);
      this.innerHTML = icon(t === 'dark' ? 'sun' : 'moon', 19);
    };
    document.getElementById('accBtn').onclick = function (e) {
      var mi = [
        { label: isKua() ? 'Profil Akun' : 'Profil Desa', icon: 'user', onClick: function () { go('#/profil'); } },
        { label: 'Ganti Password', icon: 'key', onClick: changePasswordModal },
        { label: 'Panduan Singkat', icon: 'help', onClick: function () { go('#/panduan'); } }
      ];
      if (window.PWA && PWA.canInstall && PWA.canInstall()) mi.push({ label: 'Pasang Aplikasi', icon: 'download', onClick: function () { PWA.install(); } });
      UI.menu(e.currentTarget, S.user.username, mi.concat(['-',
        { label: 'Keluar', icon: 'logout', danger: true, onClick: logout }
      ]));
    };
  }
  function closeSidebar() { var s = document.getElementById('sidebar'); if (s) s.classList.remove('show'); var b = document.getElementById('sbBack'); if (b) b.classList.remove('show'); }

  function filterNav(q) {
    q = q.toLowerCase();
    UI.$$('#sidebar .nav-item[data-nav]').forEach(function (a) { a.style.display = !q || a.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
    if (q) UI.$$('#sidebar .nav-sub').forEach(function (s) { s.classList.remove('collapsed'); });
  }
  function bindSidebar() {
    var sb = document.getElementById('sidebar');
    sb.querySelectorAll('[data-group]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.group;
        sidebarOpenGroups[k] = !sidebarOpenGroups[k];
        b.classList.toggle('open');
        sb.querySelector('[data-groupbody="' + k + '"]').classList.toggle('collapsed');
      };
    });
    sb.querySelectorAll('[data-nav]').forEach(function (a) { a.addEventListener('click', closeSidebar); });
    sb.querySelector('[data-act="logout"]').onclick = logout;
    if (window.PWA) PWA.bind(sb);
    var inp = document.getElementById('navSearch');
    inp.value = '';
    inp.addEventListener('input', function (e) {
      // Isian otomatis browser (bukan ketikan) diabaikan agar menu tidak hilang
      if (e.isTrusted === false || (e.inputType === undefined && !e.data && inp.value && document.activeElement !== inp)) { inp.value = ''; filterNav(''); return; }
      filterNav(inp.value);
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && inp.value.trim()) { go('#/pengajuan?q=' + encodeURIComponent(inp.value.trim())); inp.value = ''; filterNav(''); closeSidebar(); }
    });
  }

  function markActiveNav() {
    var h = location.hash || '#/dashboard';
    if (/^#\/(form|detail)\//.test(h)) h = S.baseHash;
    var best = null;
    UI.$$('#sidebar [data-nav]').forEach(function (a) {
      a.classList.remove('active');
      var n = a.dataset.nav;
      if (h === n) best = a;
    });
    if (!best) UI.$$('#sidebar [data-nav]').forEach(function (a) { if (!best && h.split('?')[0] === a.dataset.nav) best = a; });
    if (best) best.classList.add('active');
    var hb = h.split('?')[0];
    UI.$$('#bnav [data-bnav]').forEach(function (a) {
      var n = a.dataset.bnav;
      a.classList.toggle('active', hb === n || (n === '#/master/' && hb.indexOf('#/master/') === 0));
    });
  }

  /* ---------------- ROUTER ---------------- */
  function parseHash() {
    var h = (location.hash || '#/dashboard').slice(2);
    var qi = h.indexOf('?');
    var path = qi >= 0 ? h.slice(0, qi) : h;
    var params = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { path: path || 'dashboard', params: params };
  }

  var PAGES = function () {
    var p = {
      dashboard: Dashboard.render, laporan: Dashboard.render, pengajuan: Pengajuan.renderList, profil: renderProfil, panduan: renderPanduan
    };
    if (isKua()) p.riwayat = Laporan.riwayat;
    if (isAdmin()) { p['master/akun'] = Master.akun; p['master/field'] = Master.field; p['master/template'] = Master.template; p['master/aturan'] = Master.aturan; p['master/libur'] = Master.libur; p['master/integrasi'] = Master.integrasi; }
    return p;
  };

  var currentPage = null;
  function route() {
    if (!S.user || !S.master || !document.getElementById('main')) return;
    UI.closeMenu();
    var r = parseHash();
    var ov = /^(form|detail|koreksi)\/(.+)$/.exec(r.path);
    if (ov) {
      if (!currentPage) renderPage(PAGES().dashboard, { path: 'dashboard', params: {} });
      if (ov[1] === 'detail') Detail.open(ov[2]);
      else Formulir.open(ov[2] === 'new' ? null : ov[2]);
      markActiveNav();
      return;
    }
    if (window.Formulir) Formulir.forceClose(true);
    if (window.Detail) Detail.close(true);
    S.baseHash = location.hash || '#/dashboard';
    var fn = PAGES()[r.path];
    if (!fn) { go('#/dashboard'); return; }
    renderPage(fn, r);
    markActiveNav();
  }

  function renderPage(fn, r) {
    currentPage = { fn: fn, r: r };
    var main = document.getElementById('main');
    main.scrollTop = 0;
    window.scrollTo(0, 0);
    fn(main, r.params);
  }

  /** Render ulang halaman aktif (mis. setelah data disegarkan). */
  function rerender() {
    refreshSidebar();
    if (currentPage && document.getElementById('main') && currentPage.fn !== renderProfil && currentPage.fn !== renderPanduan) {
      var keep = window.scrollY;
      currentPage.fn(document.getElementById('main'), currentPage.r.params, true);
      window.scrollTo(0, keep);
    }
  }

  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  function pageHead(crumb, title, sub) {
    return '<div class="page-head"><div><div class="crumb">' + esc(crumb) + '</div><h1 class="page-title">' + esc(title) + (sub ? ' <span>/ ' + esc(sub) + '</span>' : '') + '</h1></div>' +
      '<div class="updated" title="Data disegarkan otomatis tiap 2 menit">' + icon('clock', 16) + 'Diperbarui ' + new Date(S.listAt || Date.now()).toTimeString().slice(0, 5) + ' WIB' +
      '<button class="btn btn-ghost btn-xs" data-refresh title="Segarkan sekarang">' + icon('refresh', 14) + '</button></div></div>';
  }
  function bindRefresh(root) {
    var b = root.querySelector('[data-refresh]');
    if (b) b.onclick = function () { UI.busy(b, function () { return refreshList(true); }); };
  }

  /* ---------------- DATA LATAR BELAKANG ---------------- */
  async function refreshList(showToast) {
    var r = await API.call('listPengajuan');
    if (r.success) {
      S.list = r.data;
      S.listAt = Date.now();
      persistState();
      rerender();
      updateBell();
      if (showToast) UI.toast('Data diperbarui.', 'info');
    } else if (showToast) UI.toast(r.message, 'error');
  }
  function upsertRow(row) {
    if (!row || !row.pengajuan_id) return;
    var i = S.list.findIndex(function (p) { return p.pengajuan_id === row.pengajuan_id; });
    if (i >= 0) S.list[i] = row; else S.list.unshift(row);
    persistState();
    refreshSidebar();
    updateBell();
  }
  async function refreshNotif() {
    var r = await API.call('listNotif');
    if (r.success) { S.notif = r.data; updateBell(); }
  }
  /** Desa: draf yang bisa dilanjutkan (lonceng desa). */
  function drafList() { return isKua() ? [] : S.list.filter(function (p) { return p.status === 'DRAF'; }); }
  function updateBell() {
    var c = document.getElementById('bellCount');
    if (!c) return;
    var n = (S.notif.unread || 0) + drafList().length;
    c.textContent = n > 99 ? '99+' : n;
    c.classList.toggle('hidden', !n);
  }
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      if (document.hidden || !S.user) return;
      refreshNotif();
      if (!(window.Formulir && Formulir.isOpen())) refreshList();
    }, 120000);
  }
  function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }

  /* ---------------- NOTIFIKASI ---------------- */
  function openNotif(e) {
    var old = document.getElementById('notifPop');
    if (old) { old.remove(); return; }
    var btn = e.currentTarget;
    var pop = document.createElement('div');
    pop.className = 'notif-pop';
    pop.id = 'notifPop';
    var items = S.notif.items || [];
    var draf = drafList();
    var notifHtml = items.map(function (n) {
      return '<button class="notif-item' + (lkBool(n.dibaca) ? '' : ' unread') + '" data-id="' + esc(n.pengajuan_id) + '"><div>' + esc(n.pesan) + '</div><div class="w">' + UI.waktu(n.waktu) + '</div></button>';
    }).join('');
    // KUA: hasil kiriman ke Akad Tracker & LABUKU Desk · Desa: draf yang belum selesai + pemberitahuan dari KUA
    pop.innerHTML = '<div class="card-head"><h3 style="font-size:15px">' + (isKua() ? 'Kiriman ke Akad Tracker & LABUKU Desk' : 'Notifikasi') + '</h3></div>' +
      (draf.length ? '<div class="notif-sec">Draf — lanjutkan isian (' + draf.length + ')</div>' + draf.slice(0, 20).map(function (p) {
        return '<button class="notif-item unread" data-form="' + esc(p.pengajuan_id) + '"><div><b class="mono">' + esc(p.pengajuan_id) + '</b> · ' + esc(p.nama_catin || '(nama belum diisi)') + '</div><div class="w">Akad ' + UI.tgl(p.tanggal_akad) + ' · diubah ' + UI.waktu(p.diubah_pada) + '</div></button>';
      }).join('') : '') +
      (draf.length && items.length ? '<div class="notif-sec">Dari KUA</div>' : '') +
      (notifHtml || (draf.length ? '' : '<div class="empty">' + (isKua() ? 'Belum ada kiriman.' : 'Tidak ada draf atau pemberitahuan.') + '</div>'));
    document.body.appendChild(pop);
    var r = btn.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = Math.max(12, Math.min(window.innerWidth - pop.offsetWidth - 12, r.right - pop.offsetWidth)) + 'px';
    pop.addEventListener('click', function (ev) {
      var f = ev.target.closest('[data-form]');
      if (f) { pop.remove(); go('#/form/' + f.dataset.form); return; }
      var b = ev.target.closest('[data-id]');
      if (b && b.dataset.id) { pop.remove(); go('#/detail/' + b.dataset.id); }
    });
    setTimeout(function () {
      var close = function (ev) { if (!pop.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    }, 0);
    if (S.notif.unread) {
      API.call('markNotifRead').then(function (res) { if (res.success) { S.notif = res.data; updateBell(); } });
    }
  }

  /* ---------------- PROFIL ---------------- */
  function renderProfil(main) {
    var d = S.desa;
    main.innerHTML = pageHead('Beranda / Profil', isKua() ? 'Profil Akun' : 'Profil Desa') +
      '<div class="split"><div class="stack">' +
      (d ? '<div class="card topline tone-gold"><div class="card-head"><h2>Data Desa</h2></div><div class="card-body" id="desaBox"><div class="form-grid">' +
        '<div class="field"><label>Nama Desa</label><input class="input" value="' + esc(d.nama_desa) + '" readonly></div>' +
        '<div class="field"><label>Kecamatan / Kabupaten</label><input class="input" value="' + esc(S.master.config.kecamatan + ' / ' + S.master.config.kabupaten) + '" readonly></div>' +
        '<div class="field full"><label for="pdKades">Nama Kepala Desa</label><input class="input" id="pdKades" value="' + esc(d.kepala_desa || '') + '" placeholder="mis. H. Ahmad Sutrisno"><div class="help">Terisi otomatis di formulir pengajuan.</div></div>' +
        '<div class="field full"><label for="pdAlamat">Alamat Kantor Desa</label><input class="input" id="pdAlamat" value="' + esc(d.alamat_kantor || '') + '"></div>' +
        '<div class="field"><label>Nomor Surat Terakhir</label><input class="input mono" value="' + esc(d.nomor_surat_terakhir || '–') + '" readonly></div>' +
        '<div class="field"><label>Modin</label><input class="input" value="' + esc(lkModinList(d).map(function (x) { return x.nama; }).join(', ') || 'Belum diatur Admin KUA') + '" readonly></div></div>' +
        '<div class="row end mt"><button class="btn btn-primary" id="pdSave">' + icon('save') + 'Simpan Data Desa</button></div></div></div>' : '') +
      '<div class="card topline"><div class="card-head"><h2>Akun</h2></div><div class="card-body" id="akunBox"><div class="form-grid">' +
      '<div class="field"><label for="paUser">Username</label><input class="input mono" id="paUser" value="' + esc(S.user.username) + '" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="help">Huruf kecil, angka, titik.</div></div>' +
      '<div class="field"><label for="paNama">Nama Tampilan</label><input class="input" id="paNama" value="' + esc(S.user.nama_tampilan || '') + '" autocomplete="off"></div>' +
      '<div class="field"><label>Peran</label><input class="input" value="' + esc(roleLabel()) + '" readonly></div>' +
      '<div class="field"><label>Operator Sesi Ini</label><input class="input" value="' + esc(S.user.nama_operator || '–') + '" readonly></div></div>' +
      '<div class="row end mt"><button class="btn btn-primary" id="paSave">' + icon('save') + 'Simpan Akun</button></div>' +
      '</div></div></div>' +
      '<div class="card"><div class="card-head"><h2>Ganti Password</h2></div><div class="card-body" id="pwBox">' + pwForm() +
      '<div class="row end mt"><button class="btn btn-primary" id="pwSave">' + icon('save') + 'Simpan Password</button></div></div></div></div>';
    bindRefresh(main);
    document.getElementById('pwSave').onclick = async function (e) {
      if (await submitPw(document.getElementById('pwBox'), e.currentTarget)) UI.$$('#pwBox input[type=password]').forEach(function (i) { i.value = ''; });
    };
    document.getElementById('paSave').onclick = function () {
      var b = this;
      UI.busy(b, async function () {
        var r = await API.call('updateProfil', { username: document.getElementById('paUser').value, nama_tampilan: document.getElementById('paNama').value });
        if (!r.success) return UI.toast(r.message, 'error');
        S.user = Object.assign({}, S.user, r.data.user);
        var sess = API.session(); if (sess) { sess.user = S.user; API.setSession(sess); }
        persistState(); renderShell(); route();
        UI.toast(r.message);
      });
    };
    var pd = document.getElementById('pdSave');
    if (pd) pd.onclick = function () {
      UI.busy(pd, async function () {
        var r = await API.call('saveProfilDesa', { kepala_desa: document.getElementById('pdKades').value, alamat_kantor: document.getElementById('pdAlamat').value });
        if (!r.success) return UI.toast(r.message, 'error');
        setDesa(r.data.desa);
        UI.toast(r.message);
      });
    };
  }
  /** Perbarui data desa di state (Profil Desa ⇄ formulir: kepala desa & nomor surat terakhir). */
  function setDesa(d) {
    if (!d || !d.desa_id) return;
    if (S.desa && S.desa.desa_id === d.desa_id) S.desa = Object.assign({}, S.desa, d);
    if (S.master) {
      var i = S.master.desa.findIndex(function (x) { return x.desa_id === d.desa_id; });
      if (i >= 0) S.master.desa[i] = Object.assign({}, S.master.desa[i], d);
    }
    persistState();
  }
  function kv(k, v) { return '<div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v || '–') + '</div></div>'; }

  function changePasswordModal() {
    var m = UI.modal({ title: 'Ganti Password', icon: 'key', body: pwForm(), foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>' });
    m.root.querySelector('[data-ok]').onclick = async function (e) { if (await submitPw(m.root, e.currentTarget)) m.close(); };
  }

  /* ---------------- PANDUAN SINGKAT (halaman) ---------------- */
  function sec(ic, title, items) {
    return '<div class="card guide"><div class="card-head"><h2>' + icon(ic, 18) + ' ' + title + '</h2></div><div class="card-body"><ol>' +
      items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div></div>';
  }
  function renderPanduan(main) {
    var desa = !isKua();
    var html = desa ? [
      sec('plus', 'Membuat pengajuan nikah', [
        'Tekan <b>Pengajuan</b> (tombol bulat di bawah, atau menu <b>Pengajuan Nikah</b>). Isi 4 langkah: <b>Jadwal Akad → Data Calon Suami → Data Calon Istri → Validasi</b>.',
        '<b>Langkah 1 — Jadwal Akad.</b> Pilih Jenis Pengajuan (nikah di wilayah ' + esc(kuaName()) + ' atau rekomendasi ke luar wilayah) dan Pengajuan Untuk. Kepala Desa &amp; nomor surat terakhir terisi otomatis. <b>Modin</b> terisi otomatis bila desa punya satu modin; bila lebih dari satu, pilih dari daftar.',
        'Pengajuan baru tercatat sebagai <b>Draf</b> setelah Jadwal Akad terisi (jenis, pengajuan untuk, tanggal akad). Sebelum itu isian hanya tersimpan di perangkat ini.',
        '<b>Tanggal akad</b> paling cepat <b>sehari sesudah tanggal surat</b>. Akad di Kantor KUA hanya pada hari &amp; jam kerja (Sabtu, Minggu, hari libur disilang). Kurang dari ' + esc(S.master.config.min_hari_kerja) + ' hari kerja → perlu dispensasi Camat.',
        '<b>Langkah 2 &amp; 3</b> dibagi tab: <b>Calon | Ayah | Ibu</b> (+ <b>Pemberi Izin</b> bila catin &lt; 21 tahun dan kedua orang tua tiada) dan <b>Wali Nikah</b> di langkah calon istri. Bin/binti otomatis dari nama ayah.',
        'Isian bertanda <span style="color:var(--danger)">*</span> wajib. Yang belum lengkap berwarna merah; tab yang kurang diberi titik oranye.'
      ]),
      sec('calendar', 'Masa iddah (calon istri janda)', [
        'Cerai hidup: ' + esc(S.master.config.iddah_cerai_hidup) + ' hari sejak tanggal akta cerai. Cerai mati: ' + esc(S.master.config.iddah_cerai_mati) + ' hari sejak tanggal meninggal suami.',
        'Tanggal surat desa paling cepat 1 hari dan akad paling cepat 2 hari sesudah iddah selesai. Bila tanggal belum memenuhi, tekan tombol hijau <b>Pakai tanggal …</b> untuk memperbaiki sekali ketuk.',
        'Duda cerai talak yang mantan istrinya masih dalam iddah (syibhul iddah): Surat Pernyataan Tidak Akan Merujuk otomatis masuk paket.'
      ]),
      sec('printer', 'Cetak &amp; kirim ke KUA', [
        'Di langkah <b>Validasi</b> tekan <b>Simpan &amp; Cetak</b>. Paket PDF terunduh, lalu <b>WhatsApp KUA terbuka</b> berisi bukti daftar &amp; tautan PDF — tekan <b>Kirim</b>.',
        'Data otomatis masuk ke KUA: nikah di wilayah → Akad Tracker &amp; LABUKU Desk; luar wilayah → LABUKU Desk (rekomendasi).',
        'Cetak → tanda tangan Kepala Desa → stempel → bawa berkas ke KUA.'
      ]),
      sec('history', 'Riwayat, edit &amp; batal', [
        '<b>Riwayat Pengajuan</b> memuat semua pengajuan desa (Draf, Siap Cetak, Batal). Cari dengan nomor, NIK, atau nama.',
        'Data bisa diedit kapan saja; setelah diedit, cetak ulang &amp; tanda tangan ulang. Bila KUA yang mengubah, Anda mendapat pemberitahuan di lonceng.',
        'Batal: Riwayat → ☰ → <b>Batalkan</b>. Status menjadi Batal (data tetap ada) dan bisa diaktifkan kembali. KUA ikut menerima perubahan status.',
        '<b>Lonceng</b> menampilkan draf yang belum selesai — ketuk untuk melanjutkan — serta pemberitahuan dari KUA.'
      ]),
      sec('key', 'Akun &amp; keamanan', [
        'Password awal dari KUA wajib diganti saat masuk pertama. Lupa password? Hubungi Admin KUA untuk reset.',
        'Isi <b>Nama Operator</b> saat masuk agar riwayat mencatat siapa yang bertugas. Data berisi NIK — jangan tinggalkan perangkat dalam keadaan masuk.',
        'Aplikasi bisa dipasang di HP/laptop: menu akun (kanan atas) → <b>Pasang Aplikasi</b>.'
      ])
    ] : [
      sec('grid', 'Alur kerja KUA', [
        'Desa mengisi &amp; mencetak sendiri. Setelah <b>Simpan &amp; Cetak</b>, data langsung terkirim ke Akad Tracker / LABUKU Desk dan desa mengirim WhatsApp ke nomor KUA.',
        '<b>Lonceng</b> berisi hasil kiriman ke Akad Tracker &amp; LABUKU Desk (berhasil / gagal). Kiriman gagal dikirim ulang otomatis tiap 5 menit sampai berhasil.',
        'Berkas salah: buka pengajuan → <b>Edit Data</b>. Desa mendapat pemberitahuan untuk cetak &amp; tanda tangan ulang.'
      ]),
      sec('users', 'Akun Desa &amp; Modin', [
        'Setiap desa punya satu akun (desa.&lt;nama desa&gt;). Password awal sama untuk semua desa dan wajib diganti saat masuk pertama.',
        'Modin per desa diatur di menu ☰ → <b>Edit Desa &amp; Modin</b>. Bila desa punya satu modin, nama modin terisi otomatis di formulir; lebih dari satu → desa memilih.',
        'Tombol <b>WhatsApp</b> di samping modin mengirim tautan KUA-Link, username, dan password awal. Bila akun sudah memakai password sendiri, Anda ditawari reset ke password awal dulu.',
        'Desa lupa password: ☰ → <b>Reset Password</b> (kembali ke password awal).'
      ]),
      sec('database', 'Data Master', [
        '<b>Template Surat</b>: buat di Google Docs dengan penanda <span class="code-chip">{{field_key}}</span> di folder 01_Template_Sumber, lalu daftarkan. Template bawaan adalah CONTOH — ganti dengan format resmi.',
        '<b>Aturan Paket Surat</b>: surat untuk setiap kombinasi Jenis Pengajuan × Pengajuan Untuk.',
        '<b>Hari Libur</b>: tanggal yang disilang di kalender akad Kantor KUA. Tambahkan libur tahun berikutnya setelah SKB terbit.',
        '<b>Integrasi &amp; WhatsApp</b>: nomor WhatsApp KUA serta URL /exec &amp; kunci Akad Tracker dan LABUKU Desk. Tekan <b>Uji Koneksi</b> setelah menyimpan.'
      ])
    ];
    main.innerHTML = pageHead('Beranda / Panduan', 'PANDUAN SINGKAT') + '<div class="guide-grid">' + html.join('') + '</div>';
    bindRefresh(main);
  }

  return {
    init: init, bootstrap: bootstrap, sessionExpired: sessionExpired, forcePasswordChange: forcePasswordChange, logout: logout,
    isKua: isKua, isAdmin: isAdmin, desaName: desaName, fields: fields, fieldMap: fieldMap, kuaName: kuaName, go: go, route: route,
    rerender: rerender, refreshList: refreshList, upsertRow: upsertRow, refreshSidebar: refreshSidebar, pageHead: pageHead,
    bindRefresh: bindRefresh, counts: counts, kv: kv, refreshNotif: refreshNotif, setDesa: setDesa
  };
})();
