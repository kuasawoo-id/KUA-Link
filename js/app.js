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
      '<div class="field"><label for="lo">Nama Operator (opsional)</label><input class="input" id="lo" maxlength="60" placeholder="Mis. Sri Wahyuni"><div class="help">Dicatat di riwayat login — membantu KUA mengetahui siapa yang bertugas.</div></div>' +
      '<button class="btn btn-primary" id="lbtn" style="width:100%;height:44px" data-busy-text="Memeriksa…">Masuk</button>' +
      '<button type="button" class="btn btn-ghost hidden" data-pwa-install style="width:100%">' + icon('download') + 'Pasang Aplikasi di Perangkat Ini</button>' +
      '</div><div class="login-foot">Akun terkunci 15 menit setelah 5 kali gagal masuk.<br>KUA Sawoo · Ahzani Labs</div></form></div>';
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
      body: '<p style="margin-top:0">Demi keamanan data pribadi catin, ganti password awal dari Admin KUA dengan password milik Anda sendiri sebelum melanjutkan.</p>' + pwForm(),
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
    h += navLink('#/dashboard', 'grid', 'Dashboard');
    var sub = (isKua() ? '' : navLink('#/form/new', '', 'Pengajuan Baru')) + navLink('#/pengajuan', '', 'Daftar Pengajuan', c.AKTIF) +
      navLink('#/pengajuan?status=DIBATALKAN', '', 'Dibatalkan', c.DIBATALKAN || '');
    h += navGroup('pengajuan', 'file', 'Pengajuan Nikah', sub);
    if (!isKua()) {
      h += navLink('#/profil', 'building', 'Profil Desa');
    } else {
      if (isAdmin()) {
        h += navGroup('master', 'database', 'Data Master',
          navLink('#/master/akun', '', 'Akun Desa') + navLink('#/master/field', '', 'Field Surat') +
          navLink('#/master/template', '', 'Template Surat') + navLink('#/master/aturan', '', 'Aturan Paket Surat') +
          navLink('#/master/libur', '', 'Hari Libur'));
      }
      h += navLink('#/riwayat', 'history', 'Riwayat & Arsip');
      h += navLink('#/profil', 'user', 'Profil Akun');
    }
    h += '<div class="spacer"></div><div class="bottom">' +
      '<button class="nav-item hidden" data-pwa-install>' + icon('download', 19) + '<span class="lbl">Pasang Aplikasi</span></button>' +
      '<button class="nav-item" data-act="panduan">' + icon('help', 19) + '<span class="lbl">Panduan Singkat</span></button>' +
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
      '<div class="welcome"><div class="hi">Selamat datang,<b>' + esc(name) + '</b></div><div class="tagline">Administrasi Surat Pengantar Nikah – ' + esc(kuaName()) + '</div></div>' +
      '<div class="right"><button class="icon-btn" id="bellBtn" aria-label="Notifikasi">' + icon('bell', 20) + '<span class="count' + (S.notif.unread ? '' : ' hidden') + '" id="bellCount">' + S.notif.unread + '</span></button>' +
      '<button class="account" id="accBtn" data-menu-anchor><span class="avatar">' + esc(UI.initials(person)) + '</span><span class="who"><b>' + esc(person) + '</b><span>' + esc(roleLabel()) + '</span></span>' + icon('chevD', 16) + '</button></div></header>' +
      '<div class="body"><nav class="sidebar" id="sidebar">' + sidebarHtml() + '</nav><div class="sidebar-backdrop" id="sbBack"></div>' +
      '<main class="main" id="main"></main></div></div><div id="overlayRoot"></div>';
    bindShell();
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
    document.getElementById('menuBtn').onclick = function () { document.getElementById('sidebar').classList.toggle('show'); document.getElementById('sbBack').classList.toggle('show'); };
    document.getElementById('sbBack').onclick = closeSidebar;
    document.getElementById('bellBtn').onclick = openNotif;
    document.getElementById('accBtn').onclick = function (e) {
      UI.menu(e.currentTarget, S.user.username, [
        { label: isKua() ? 'Profil Akun' : 'Profil Desa', icon: 'user', onClick: function () { go('#/profil'); } },
        { label: 'Ganti Password', icon: 'key', onClick: changePasswordModal },
        '-',
        { label: 'Keluar', icon: 'logout', danger: true, onClick: logout }
      ]);
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
    sb.querySelector('[data-act="panduan"]').onclick = panduan;
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
      dashboard: Dashboard.render, laporan: Dashboard.render, pengajuan: Pengajuan.renderList, profil: renderProfil
    };
    if (isKua()) p.riwayat = Laporan.riwayat;
    if (isAdmin()) { p['master/akun'] = Master.akun; p['master/field'] = Master.field; p['master/template'] = Master.template; p['master/aturan'] = Master.aturan; p['master/libur'] = Master.libur; }
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
    if (currentPage && document.getElementById('main') && currentPage.fn !== renderProfil) {
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
      if (showToast) UI.toast('Data diperbarui.', 'info');
    } else if (showToast) UI.toast(r.message, 'error');
  }
  function upsertRow(row) {
    if (!row || !row.pengajuan_id) return;
    var i = S.list.findIndex(function (p) { return p.pengajuan_id === row.pengajuan_id; });
    if (i >= 0) S.list[i] = row; else S.list.unshift(row);
    persistState();
    refreshSidebar();
  }
  async function refreshNotif() {
    var r = await API.call('listNotif');
    if (r.success) { S.notif = r.data; updateBell(); }
  }
  function updateBell() {
    var c = document.getElementById('bellCount');
    if (!c) return;
    c.textContent = S.notif.unread > 99 ? '99+' : S.notif.unread;
    c.classList.toggle('hidden', !S.notif.unread);
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
    pop.innerHTML = '<div class="card-head"><h3 style="font-size:15px">Notifikasi</h3><span class="end muted" style="font-size:12px">' + (S.notif.unread || 0) + ' belum dibaca</span></div>' +
      (items.length ? items.map(function (n) {
        return '<button class="notif-item' + (lkBool(n.dibaca) ? '' : ' unread') + '" data-id="' + esc(n.pengajuan_id) + '"><div>' + esc(n.pesan) + '</div><div class="w">' + UI.waktu(n.waktu) + '</div></button>';
      }).join('') : '<div class="empty">Belum ada notifikasi.</div>');
    document.body.appendChild(pop);
    var r = btn.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = Math.max(12, Math.min(window.innerWidth - pop.offsetWidth - 12, r.right - pop.offsetWidth)) + 'px';
    pop.addEventListener('click', function (ev) {
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
      (d ? '<div class="card topline tone-gold"><div class="card-head"><h2>Data Desa</h2><span class="sub">Diisi oleh operator desa</span></div><div class="card-body" id="desaBox"><div class="form-grid">' +
        '<div class="field"><label>Nama Desa</label><input class="input" value="' + esc(d.nama_desa) + '" readonly></div>' +
        '<div class="field"><label>Kecamatan / Kabupaten</label><input class="input" value="' + esc(S.master.config.kecamatan + ' / ' + S.master.config.kabupaten) + '" readonly></div>' +
        '<div class="field full"><label for="pdKades">Nama Kepala Desa</label><input class="input" id="pdKades" value="' + esc(d.kepala_desa || '') + '" placeholder="mis. H. Ahmad Sutrisno"><div class="help">Otomatis mengisi formulir pengajuan &amp; tanda tangan di surat. Bila diubah di formulir, data ini ikut berubah.</div></div>' +
        '<div class="field full"><label for="pdAlamat">Alamat Kantor Desa</label><input class="input" id="pdAlamat" value="' + esc(d.alamat_kantor || '') + '"></div>' +
        '<div class="field"><label>Nomor Surat Terakhir</label><input class="input mono" value="' + esc(d.nomor_surat_terakhir || '–') + '" readonly><div class="help">Terisi otomatis dari pengajuan terakhir.</div></div></div>' +
        '<div class="row end mt"><button class="btn btn-primary" id="pdSave">' + icon('save') + 'Simpan Data Desa</button></div></div></div>' : '') +
      '<div class="card topline"><div class="card-head"><h2>Akun</h2></div><div class="card-body" id="akunBox"><div class="form-grid">' +
      '<div class="field"><label for="paUser">Username</label><input class="input mono" id="paUser" value="' + esc(S.user.username) + '" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="help">Huruf kecil, angka, titik. Dipakai saat masuk.</div></div>' +
      '<div class="field"><label for="paNama">Nama Tampilan</label><input class="input" id="paNama" value="' + esc(S.user.nama_tampilan || '') + '" autocomplete="off"></div>' +
      '<div class="field"><label>Peran</label><input class="input" value="' + esc(roleLabel()) + '" readonly><div class="help">Peran hanya dapat diubah Admin KUA (Data Master → Akun).</div></div>' +
      '<div class="field"><label>Operator Sesi Ini</label><input class="input" value="' + esc(S.user.nama_operator || '–') + '" readonly></div></div>' +
      '<div class="row end mt"><button class="btn btn-primary" id="paSave">' + icon('save') + 'Simpan Akun</button></div>' +
      (isKua() ? '' : '<div class="banner neutral mt">' + icon('info') + '<div class="txt">Akun desa dapat dipakai bersama di beberapa perangkat. Isi <b>Nama Operator</b> saat masuk agar riwayat mencatat siapa yang bertugas.</div></div>') +
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

  function panduan() {
    var desa = !isKua();
    UI.modal({
      title: 'Panduan Singkat', icon: 'help', size: 'wide',
      body: desa ?
        '<ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px">' +
        '<li><b>Pengajuan Baru</b> → isi 4 langkah: <b>Jadwal Akad</b>, <b>Data Calon Suami</b>, <b>Data Calon Istri</b>, <b>Validasi</b>. Isian tersimpan otomatis.</li>' +
        '<li>Bila calon suami &amp; calon istri sama-sama warga desa ini, pilih <b>Pengajuan Untuk: Calon Suami &amp; Calon Istri</b> — cukup satu pengajuan.</li>' +
        '<li>Isian bertanda <span style="color:var(--danger)">*</span> wajib diisi; yang belum terisi berubah merah dan langkah berikutnya tidak bisa dibuka.</li>' +
        '<li>Di langkah <b>Validasi</b> tekan <b>Simpan &amp; Cetak</b> → cetak → tanda tangan Kepala Desa → stempel → bawa ke KUA.</li>' +
        '<li>Ada yang salah? Data <b>tetap bisa diedit</b> kapan saja, lalu cetak ulang &amp; tanda tangan ulang. Bila KUA yang mengubah, Anda menerima notifikasi.</li>' +
        '<li>Nama Kepala Desa &amp; nomor surat terakhir tersimpan otomatis untuk pengajuan berikutnya.</li></ol>' :
        '<ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px">' +
        '<li>Desa mengisi data dan mencetak sendiri; tidak ada penguncian atau pengembalian berkas.</li>' +
        '<li>Bila berkas salah: buka pengajuan → <b>Edit Data</b>. Desa otomatis mendapat notifikasi untuk mencetak &amp; menandatangani ulang.</li>' +
        '<li><b>Template Surat</b>: buat surat di Google Docs dengan penanda <span class="code-chip">{{field_key}}</span> di folder 01_Template_Sumber, lalu daftarkan.</li>' +
        '<li><b>Aturan Paket Surat</b>: tentukan surat untuk setiap kombinasi <i>Jenis Pengajuan × Pengajuan Untuk</i> (lihat Peta Paket Surat).</li>' +
        '<li><b>Hari Libur</b>: tanggal yang disilang di kalender akad Kantor KUA. Tambahkan libur tahun berikutnya setelah SKB terbit.</li>' +
        '<li>Template bawaan adalah <b>CONTOH</b> — wajib diganti format resmi yang berlaku.</li></ol>'
    });
  }

  return {
    init: init, bootstrap: bootstrap, sessionExpired: sessionExpired, forcePasswordChange: forcePasswordChange, logout: logout,
    isKua: isKua, isAdmin: isAdmin, desaName: desaName, fields: fields, fieldMap: fieldMap, kuaName: kuaName, go: go, route: route,
    rerender: rerender, refreshList: refreshList, upsertRow: upsertRow, refreshSidebar: refreshSidebar, pageHead: pageHead,
    bindRefresh: bindRefresh, counts: counts, kv: kv, refreshNotif: refreshNotif, setDesa: setDesa
  };
})();
