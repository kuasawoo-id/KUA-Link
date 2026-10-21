/* =====================================================================
 * LABUKU Link — app.js : state, login, kerangka (header + sidebar), router SPA
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
      document.getElementById('root').innerHTML = '<div class="login-wrap"><div class="login-card"><div class="wordmark">LABUKU Link<small>by Ahzani Labs</small></div>' +
        '<h1>Belum dikonfigurasi</h1><p class="sub">Isi <b>GAS_URL</b> di file <code>js/config.js</code> dengan URL Web App Apps Script (berakhiran <code>/exec</code>), lalu upload ulang.</p></div></div>';
      return;
    }
    if (API.session()) bootstrap(); else renderLogin();
  }

  function renderLogin(msg) {
    stopPolling();
    document.getElementById('root').innerHTML =
      '<div class="login-wrap"><form class="login-card" id="loginForm" autocomplete="on">' +
      '<div class="wordmark">LABUKU Link<small>by Ahzani Labs</small></div>' +
      '<h1>Masuk</h1><p class="sub">Administrasi Surat Pengantar Nikah – Desa &amp; KUA</p>' +
      (msg ? '<div class="banner warn" style="margin-bottom:16px">' + icon('alert') + '<div class="txt">' + esc(msg) + '</div></div>' : '') +
      '<div class="banner danger hidden" id="loginErr" style="margin-bottom:16px">' + icon('xCircle') + '<div class="txt"></div></div>' +
      '<div class="stack" style="gap:14px">' +
      '<div class="field"><label for="lu">Username</label><input class="input" id="lu" name="username" autocomplete="username" required autofocus></div>' +
      '<div class="field"><label for="lp">Password</label><div class="input-wrap"><input class="input" id="lp" type="password" name="password" autocomplete="current-password" required style="padding-right:44px">' +
      '<button type="button" class="btn btn-ghost btn-icon" id="lpShow" style="position:absolute;right:4px;top:4px" aria-label="Tampilkan password">' + icon('eye') + '</button></div></div>' +
      '<div class="field"><label for="lo">Nama Operator (opsional)</label><input class="input" id="lo" maxlength="60" placeholder="Mis. Sri Wahyuni"><div class="help">Dicatat di riwayat login — membantu KUA mengetahui siapa yang bertugas.</div></div>' +
      '<button class="btn btn-primary" id="lbtn" style="width:100%;height:44px" data-busy-text="Memeriksa…">Masuk</button>' +
      '</div><div class="login-foot">Akun terkunci 15 menit setelah 5 kali gagal masuk.<br>KUA Kecamatan Sawoo · Ahzani Labs</div></form></div>';
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
        await bootstrap();
      });
    });
  }

  async function bootstrap() {
    var root = document.getElementById('root');
    if (!S.master) root.innerHTML = '<div class="boot"><div style="text-align:center"><div class="wordmark" style="margin-bottom:10px">LABUKU Link</div><span class="muted">Menyiapkan data…</span></div></div>';
    var r = await API.call('bootstrap');
    if (!r.success) {
      if (r.code === 'AUTH' || r.code === 'GANTI_PW') return;
      root.innerHTML = '<div class="login-wrap"><div class="login-card"><h1>Gagal memuat</h1><p class="sub">' + esc(r.message) + '</p><button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button> <button class="btn" onclick="App.logout()">Keluar</button></div></div>';
      return;
    }
    S.user = r.data.user;
    S.desa = r.data.desa;
    S.master = r.data.master;
    S.list = r.data.pengajuan || [];
    S.notif = r.data.notif || { items: [], unread: 0 };
    S.listAt = Date.now();
    renderShell();
    route();
    startPolling();
  }

  function sessionExpired(msg) {
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
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('lk_draft_') === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ }
    API.setSession(null);
    S.user = null; S.master = null; S.list = [];
    if (window.Formulir) Formulir.forceClose();
    history.replaceState(null, '', location.pathname);
    renderLogin();
  }

  /* ---------------- GANTI PASSWORD ---------------- */
  function pwForm() {
    return '<div class="stack" style="gap:14px">' +
      '<div class="field"><label>Password Lama / Sementara</label><input class="input" type="password" data-pw="lama" autocomplete="current-password"></div>' +
      '<div class="field"><label>Password Baru</label><input class="input" type="password" data-pw="baru" autocomplete="new-password"><div class="help">Minimal 8 karakter, berisi huruf dan angka.</div></div>' +
      '<div class="field"><label>Ulangi Password Baru</label><input class="input" type="password" data-pw="ulang" autocomplete="new-password"></div>' +
      '<div class="msg hidden" data-pwmsg style="color:var(--danger);font-size:13px"></div></div>';
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
      title: 'Ganti Password Sementara', icon: 'key', sticky: true,
      body: '<p style="margin-top:0">Demi keamanan data pribadi catin, ganti password sementara dari Admin KUA sebelum melanjutkan.</p>' + pwForm(),
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
    var c = { DRAF: 0, TERKUNCI: 0, DIKEMBALIKAN: 0, DIBATALKAN: 0, CETAK: 0, ALL: S.list.length };
    S.list.forEach(function (p) { c[p.status] = (c[p.status] || 0) + 1; if (p.status === 'TERKUNCI' && lkBool(p.perlu_cetak_ulang)) c.CETAK++; });
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
    var h = '<div class="search">' + icon('search', 16) + '<input id="navSearch" placeholder="Cari menu / no. pengajuan…"></div>';
    h += navLink('#/dashboard', 'grid', 'Dashboard');
    if (!isKua()) {
      h += navGroup('pengajuan', 'file', 'Pengajuan Nikah',
        navLink('#/form/new', '', 'Pengajuan Baru') + navLink('#/pengajuan', '', 'Daftar Pengajuan', c.ALL) +
        navLink('#/pengajuan?status=DIKEMBALIKAN', '', 'Dikembalikan', c.DIKEMBALIKAN || '', true) +
        navLink('#/pengajuan?status=CETAK', '', 'Perlu Cetak Ulang', c.CETAK || '', true) +
        navLink('#/pengajuan?status=DIBATALKAN', '', 'Dibatalkan', c.DIBATALKAN || ''));
      h += navLink('#/laporan', 'chart', 'Laporan Rekapitulasi');
      h += navLink('#/profil', 'building', 'Profil Desa');
    } else {
      h += navGroup('pengajuan', 'file', 'Pengajuan Nikah',
        navLink('#/pengajuan', '', 'Semua Pengajuan', c.ALL) + navLink('#/pengajuan?status=TERKUNCI', '', 'Terkunci', c.TERKUNCI || '') +
        navLink('#/pengajuan?status=DIKEMBALIKAN', '', 'Dikembalikan', c.DIKEMBALIKAN || '') +
        navLink('#/pengajuan?status=CETAK', '', 'Perlu Cetak Ulang', c.CETAK || '') +
        navLink('#/pengajuan?status=DRAF', '', 'Draf Desa', c.DRAF || '') +
        navLink('#/pengajuan?status=DIBATALKAN', '', 'Dibatalkan', c.DIBATALKAN || ''));
      if (isAdmin()) {
        h += navGroup('master', 'database', 'Data Master',
          navLink('#/master/akun', '', 'Akun Desa') + navLink('#/master/field', '', 'Field Surat') +
          navLink('#/master/template', '', 'Template Surat') + navLink('#/master/aturan', '', 'Aturan Paket Surat'));
      }
      h += navLink('#/laporan', 'chart', 'Laporan Rekapitulasi');
      h += navLink('#/riwayat', 'history', 'Riwayat & Arsip');
      h += navLink('#/profil', 'user', 'Profil Akun');
    }
    h += '<div class="spacer"></div><div class="bottom">' +
      '<button class="nav-item" data-act="panduan">' + icon('help', 19) + '<span class="lbl">Panduan Teknis</span></button>' +
      '<button class="nav-item logout" data-act="logout">' + icon('logout', 19) + '<span class="lbl">Keluar</span></button></div>';
    return h;
  }

  function renderShell() {
    var name = isKua() ? kuaName() : (S.desa ? 'Desa ' + S.desa.nama_desa : desaName(S.user.desa_id));
    var person = S.user.nama_operator || S.user.nama_tampilan || S.user.username;
    document.getElementById('root').innerHTML =
      '<div class="app"><header class="header">' +
      '<button class="btn btn-ghost btn-icon menu-btn" id="menuBtn" aria-label="Menu">' + icon('menu', 22) + '</button>' +
      '<div class="wordmark">LABUKU Link<small>by Ahzani Labs</small></div><div class="divider"></div>' +
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
    var inp = document.getElementById('navSearch');
    inp.addEventListener('input', function () { filterNav(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && inp.value.trim()) { go('#/pengajuan?q=' + encodeURIComponent(inp.value.trim())); inp.value = ''; filterNav(''); closeSidebar(); }
    });
  }

  function markActiveNav() {
    var h = location.hash || '#/dashboard';
    if (/^#\/(form|detail|koreksi)\//.test(h)) h = S.baseHash;
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
      dashboard: Dashboard.render, pengajuan: Pengajuan.renderList, laporan: Laporan.render, profil: renderProfil
    };
    if (isKua()) p.riwayat = Laporan.riwayat;
    if (isAdmin()) { p['master/akun'] = Master.akun; p['master/field'] = Master.field; p['master/template'] = Master.template; p['master/aturan'] = Master.aturan; }
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
      if (ov[1] === 'form') Formulir.open(ov[2] === 'new' ? null : ov[2], 'edit');
      else if (ov[1] === 'koreksi') Formulir.open(ov[2], 'koreksi');
      else Detail.open(ov[2]);
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
      rerender();
      if (showToast) UI.toast('Data diperbarui.', 'info');
    } else if (showToast) UI.toast(r.message, 'error');
  }
  function upsertRow(row) {
    if (!row || !row.pengajuan_id) return;
    var i = S.list.findIndex(function (p) { return p.pengajuan_id === row.pengajuan_id; });
    if (i >= 0) S.list[i] = row; else S.list.unshift(row);
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
      (d ? '<div class="card topline"><div class="card-head"><h2>Data Desa</h2><span class="sub">Perubahan data desa melalui Admin KUA</span></div><div class="card-body"><div class="kv">' +
        kv('Nama Desa', d.nama_desa) + kv('Kode Desa', d.kode) + kv('Kecamatan', S.master.config.kecamatan) + kv('Kabupaten', S.master.config.kabupaten) +
        kv('Kepala Desa', d.kepala_desa || '– (belum diisi Admin KUA)') + kv('Alamat Kantor', d.alamat_kantor || '–') + '</div></div></div>' : '') +
      '<div class="card"><div class="card-head"><h2>Akun</h2></div><div class="card-body"><div class="kv">' +
      kv('Username', S.user.username) + kv('Nama Akun', S.user.nama_tampilan) + kv('Peran', roleLabel()) + kv('Operator Sesi Ini', S.user.nama_operator || '–') +
      '</div><div class="banner neutral mt">' + icon('info') + '<div class="txt">Akun desa dapat dipakai bersama di beberapa perangkat. Isi <b>Nama Operator</b> saat masuk agar riwayat mencatat siapa yang bertugas.</div></div></div></div></div>' +
      '<div class="card"><div class="card-head"><h2>Ganti Password</h2></div><div class="card-body" id="pwBox">' + pwForm() +
      '<div class="row end mt"><button class="btn btn-primary" id="pwSave">' + icon('save') + 'Simpan Password</button></div></div></div></div>';
    bindRefresh(main);
    document.getElementById('pwSave').onclick = async function (e) {
      if (await submitPw(document.getElementById('pwBox'), e.currentTarget)) UI.$$('#pwBox input').forEach(function (i) { i.value = ''; });
    };
  }
  function kv(k, v) { return '<div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v || '–') + '</div></div>'; }

  function changePasswordModal() {
    var m = UI.modal({ title: 'Ganti Password', icon: 'key', body: pwForm(), foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>' });
    m.root.querySelector('[data-ok]').onclick = async function (e) { if (await submitPw(m.root, e.currentTarget)) m.close(); };
  }

  function panduan() {
    var desa = !isKua();
    UI.modal({
      title: 'Panduan Teknis Singkat', icon: 'help', size: 'wide',
      body: desa ?
        '<ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px">' +
        '<li><b>Pengajuan Baru</b> — isi data per catin yang berdomisili di desa Anda. Isian tersimpan otomatis.</li>' +
        '<li>Bila kedua catin dari desa yang sama, setelah selesai pilih <b>Buat Pengajuan Pasangan</b> agar data tidak diketik ulang.</li>' +
        '<li>Di langkah <b>Periksa &amp; Cetak</b>, cek daftar surat dan peringatan, lalu tekan <b>Simpan &amp; Siap Cetak</b>. Setelah itu data terkunci.</li>' +
        '<li><b>Cetak Paket PDF</b> → tanda tangan Kepala Desa → stempel → bawa ke KUA.</li>' +
        '<li>Bila ada kesalahan setelah terkunci, hubungi KUA. KUA dapat <b>mengembalikan</b> berkas atau mengoreksi langsung — bila dikoreksi KUA, muncul tanda <b>Perlu Cetak Ulang</b>.</li>' +
        '<li>Pembatalan tidak menghapus data dan dapat diaktifkan kembali.</li></ol>' :
        '<ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px">' +
        '<li>Desa mengerjakan seluruh input; data terkunci saat desa menekan <b>Simpan &amp; Siap Cetak</b>.</li>' +
        '<li>Bila berkas fisik salah: <b>Kembalikan ke Desa</b> (dengan catatan) atau <b>Koreksi Data</b> langsung dengan alasan — dokumen terdampak dibuat versi baru dan desa mendapat tanda Perlu Cetak Ulang.</li>' +
        '<li><b>Template Surat</b>: buat surat di Google Docs dengan penanda <span class="code-chip">{{field_key}}</span> di folder 01_Template_Sumber, lalu daftarkan. Template yang sudah aktif dibekukan; mengedit Docs sumber tidak mengubah dokumen lama.</li>' +
        '<li><b>Aturan Paket Surat</b> menentukan surat yang muncul otomatis (mis. N5 bila catin di bawah 21 tahun saat akad).</li>' +
        '<li>Template bawaan adalah <b>CONTOH</b> — wajib diganti format resmi yang berlaku.</li></ol>'
    });
  }

  return {
    init: init, bootstrap: bootstrap, sessionExpired: sessionExpired, forcePasswordChange: forcePasswordChange, logout: logout,
    isKua: isKua, isAdmin: isAdmin, desaName: desaName, fields: fields, fieldMap: fieldMap, kuaName: kuaName, go: go, route: route,
    rerender: rerender, refreshList: refreshList, upsertRow: upsertRow, refreshSidebar: refreshSidebar, pageHead: pageHead,
    bindRefresh: bindRefresh, counts: counts, kv: kv, refreshNotif: refreshNotif
  };
})();
