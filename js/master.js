/* =====================================================================
 * KUA-Link — master.js : Data Master (khusus Super Admin)
 * Akun Desa · Field Surat · Template Surat · Aturan Paket Surat & Peringatan
 * ===================================================================== */
var Master = (function () {
  var esc = UI.esc, icon = UI.icon;
  var users = null;

  function setMaster(m) { if (m) { S.master = m; } }
  function head(title, sub) { return App.pageHead('Beranda / Data Master', title, sub); }
  function fieldOptions(selected, includeTurunan) {
    var fs = App.fields().filter(function (f) { return lkBool(f.aktif) && (includeTurunan || !f.turunan); });
    var html = '<option value="">— Pilih field —</option>';
    LK_GROUPS.forEach(function (g) {
      var list = fs.filter(function (f) { return f.grup === g.key; });
      if (!list.length) return;
      html += '<optgroup label="' + esc(g.key) + '">' + list.map(function (f) {
        return '<option value="' + esc(f.field_key) + '"' + (f.field_key === selected ? ' selected' : '') + '>' + esc(f.label) + ' (' + esc(f.field_key) + ')</option>';
      }).join('') + '</optgroup>';
    });
    return html;
  }
  function describe(logika, kondisi) {
    var fm = App.fieldMap();
    if (!kondisi || !kondisi.length) return '—';
    return kondisi.map(function (c) {
      var f = fm[c.field], op = (LK_OPS.find(function (o) { return o.v === c.op; }) || {}).s || c.op;
      var n = String(c.nilai || '').split(';').join(', ');
      if (n.charAt(0) === '@') { var g = fm[n.slice(1)]; n = '[' + (g ? g.label : n.slice(1)) + ']'; }
      return (f ? f.label : c.field) + ' ' + op + (c.op === 'kosong' || c.op === 'tidak_kosong' ? '' : ' ' + n);
    }).join(logika === 'SALAH_SATU' ? ' ATAU ' : ' DAN ');
  }

  /* ---------------- PEMBANGUN KONDISI ---------------- */
  function condBuilder(box, init, opts) {
    opts = opts || {};
    var st = { logika: (init && init.logika) || 'SEMUA', kondisi: ((init && init.kondisi) || []).map(function (c) { return { field: c.field, op: c.op, nilai: c.nilai }; }) };
    if (!st.kondisi.length && opts.minOne) st.kondisi.push({ field: '', op: '=', nilai: '' });
    function draw() {
      var fm = App.fieldMap();
      box.innerHTML = '<div class="row" style="margin-bottom:10px"><span>' + esc(opts.prefix || 'Berlaku jika') + '</span><select class="select" data-logika style="width:auto;height:36px">' +
        UI.options([{ v: 'SEMUA', l: 'SEMUA kondisi (DAN)' }, { v: 'SALAH_SATU', l: 'SALAH SATU kondisi (ATAU)' }], st.logika) + '</select><span>terpenuhi:</span></div>' +
        st.kondisi.map(function (c, i) {
          var f = fm[c.field];
          var opsi = f && f.tipe === 'PILIHAN' ? lkParseOpsi(f.opsi) : [];
          return '<div class="cond-row"><select class="select" data-c="field" data-i="' + i + '">' + fieldOptions(c.field, true) + '</select>' +
            '<select class="select" data-c="op" data-i="' + i + '">' + UI.options(LK_OPS, c.op) + '</select>' +
            '<input class="input" data-c="nilai" data-i="' + i + '" value="' + esc(c.nilai) + '" placeholder="' + (opsi.length ? 'mis. ' + esc(opsi[0].v) : 'nilai / @field_lain') + '"' + (opsi.length ? ' list="dl_' + i + '"' : '') + (c.op === 'kosong' || c.op === 'tidak_kosong' ? ' disabled' : '') + '>' +
            (opsi.length ? '<datalist id="dl_' + i + '">' + opsi.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join('') + '</datalist>' : '') +
            '<button class="btn btn-ghost btn-icon" data-del="' + i + '" title="Hapus">' + icon('trash', 16) + '</button></div>';
        }).join('') +
        '<button class="btn btn-sm" data-add>' + icon('plus', 15) + 'Tambah Kondisi</button>' +
        '<div class="help mt-s">Nilai diawali <span class="code-chip">@</span> membandingkan dengan field lain, mis. <span class="code-chip">@adm_tanggal_surat</span>. Tanggal ditulis TTTT-BB-HH.</div>';
      box.querySelector('[data-logika]').onchange = function () { st.logika = this.value; };
      UI.$$('[data-c]', box).forEach(function (x) {
        var h = function () { st.kondisi[Number(x.dataset.i)][x.dataset.c] = x.value; if (x.dataset.c !== 'nilai') draw(); };
        x.addEventListener(x.tagName === 'SELECT' ? 'change' : 'input', h);
      });
      UI.$$('[data-del]', box).forEach(function (b) { b.onclick = function () { st.kondisi.splice(Number(b.dataset.del), 1); draw(); }; });
      box.querySelector('[data-add]').onclick = function () { st.kondisi.push({ field: '', op: '=', nilai: '' }); draw(); };
    }
    draw();
    return function () { return { logika: st.logika, kondisi: st.kondisi.filter(function (c) { return c.field; }) }; };
  }

  /* =================================================================
   * AKUN DESA
   * ================================================================= */
  async function akun(main, params, soft) {
    if (!users || !soft) {
      main.innerHTML = head('AKUN DESA', 'Data Master') + '<div class="card"><table class="tbl"><tbody>' + UI.skeletonRows(6, 6) + '</tbody></table></div>';
      var r = await API.call('listUsers');
      if (location.hash.indexOf('#/master/akun') !== 0) return; // pengguna sudah pindah halaman
      if (!r.success) { main.innerHTML = head('AKUN DESA', 'Data Master') + '<div class="banner danger">' + icon('xCircle') + '<div class="txt">' + esc(r.message) + '</div></div>'; return; }
      users = r.data;
    }
    drawAkun(main);
  }

  function drawAkun(main) {
    var desaUsers = function (id) { return users.filter(function (u) { return u.peran === 'OPERATOR_DESA' && u.desa_id === id; }); };
    var kuaUsers = users.filter(function (u) { return u.peran !== 'OPERATOR_DESA'; });
    var statusPill = function (u) {
      if (!u) return '<span class="pill s-DIKEMBALIKAN">Belum Ada Akun</span>';
      if (!u.aktif) return '<span class="pill s-NEUTRAL">Nonaktif</span>';
      if (u.terkunci) return '<span class="pill s-DIBATALKAN">Terkunci</span>';
      if (u.wajib_ganti_pw) return '<span class="pill s-CETAK">Belum Ganti Password</span>';
      return '<span class="pill s-TERKUNCI">Aktif</span>';
    };
    main.innerHTML = head('AKUN DESA', 'Data Master') +
      '<div class="stack"><div class="row"><button class="btn btn-primary" data-newdesa>' + icon('plus') + 'Tambah Desa</button><button class="btn" data-newuser>' + icon('userPlus') + 'Tambah Akun</button>' +
      '<span class="muted" style="margin-left:auto">' + S.master.desa.length + ' desa · ' + users.length + ' akun</span></div>' +
      '<div class="card"><div class="card-head"><h2>Desa &amp; Akun Operator</h2><span class="sub">Satu akun per desa dapat dipakai bersama di beberapa perangkat</span></div><div class="table-wrap"><table class="tbl cards"><thead><tr>' +
      '<th class="c" style="width:52px">No</th><th class="c" style="width:64px">Action</th><th>Desa</th><th>Username</th><th>Kepala Desa</th><th>Login Terakhir</th><th class="c">Status</th></tr></thead><tbody>' +
      S.master.desa.map(function (d, i) {
        var us = desaUsers(d.desa_id), u = us[0];
        return '<tr' + (lkBool(d.aktif) ? '' : ' style="opacity:.6"') + '><td class="c" data-l="No">' + (i + 1) + '</td><td class="c"><button class="btn btn-menu" data-menu-anchor data-desa="' + esc(d.desa_id) + '">' + icon('menu', 16) + '</button></td>' +
          '<td class="nm" data-l="Desa">' + esc(d.nama_desa) + '<span class="sub">Kode ' + esc(d.kode) + (lkBool(d.aktif) ? '' : ' · desa nonaktif') + '</span></td>' +
          '<td class="mono" data-l="Username">' + (u ? esc(u.username) + (us.length > 1 ? ' <span class="muted">+' + (us.length - 1) + '</span>' : '') : '–') + '</td>' +
          '<td data-l="Kepala Desa">' + (d.kepala_desa ? esc(d.kepala_desa) : '<span class="muted">belum diisi</span>') + '</td>' +
          '<td data-l="Login Terakhir" class="nowrap">' + (u ? UI.waktu(u.terakhir_login) : '–') + '</td><td class="c">' + statusPill(u) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-head"><h2>Akun KUA</h2><span class="sub">Akun individual — riwayat mencatat siapa yang mengubah</span></div><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th class="c" style="width:64px">Action</th><th>Username</th><th>Nama</th><th>Peran</th><th>Login Terakhir</th><th class="c">Status</th></tr></thead><tbody>' +
      kuaUsers.map(function (u) {
        return '<tr><td class="c"><button class="btn btn-menu" data-menu-anchor data-user="' + esc(u.user_id) + '">' + icon('menu', 16) + '</button></td><td class="mono">' + esc(u.username) + '</td><td class="nm">' + esc(u.nama_tampilan) + '</td>' +
          '<td>' + (u.peran === 'SUPER_ADMIN' ? 'Super Admin' : 'Petugas KUA') + '</td><td class="nowrap">' + UI.waktu(u.terakhir_login) + '</td><td class="c">' + statusPill(u) + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';
    App.bindRefresh(main);
    main.querySelector('[data-newdesa]').onclick = function () { editDesa(null, main); };
    main.querySelector('[data-newuser]').onclick = function () { editUser(null, main); };
    UI.$$('[data-desa]', main).forEach(function (b) {
      b.onclick = function () {
        var d = S.master.desa.find(function (x) { return x.desa_id === b.dataset.desa; });
        var u = desaUsers(d.desa_id)[0];
        var items = [{ label: 'Edit Data Desa', icon: 'building', onClick: function () { editDesa(d, main); } }];
        if (u) {
          items.push({ label: 'Edit Akun ' + u.username, icon: 'pencil', onClick: function () { editUser(u, main); } });
          items.push({ label: 'Reset Password', icon: 'key', onClick: function () { resetPw(u, main); } });
          if (u.terkunci) items.push({ label: 'Buka Kunci Akun', icon: 'unlock', onClick: function () { unlock(u, main); } });
          items.push({ label: 'Tambah Akun Operator Lain', icon: 'userPlus', onClick: function () { editUser({ peran: 'OPERATOR_DESA', desa_id: d.desa_id, _new: true }, main); } });
          items.push('-');
          items.push({ label: u.aktif ? 'Nonaktifkan Akun' : 'Aktifkan Akun', icon: u.aktif ? 'xCircle' : 'check', danger: u.aktif, onClick: function () { toggleUser(u, main); } });
        } else items.push({ label: 'Buat Akun Desa', icon: 'userPlus', onClick: function () { editUser({ peran: 'OPERATOR_DESA', desa_id: d.desa_id, username: 'desa.' + d.nama_desa.toLowerCase().replace(/[^a-z0-9]/g, ''), nama_tampilan: 'Operator Desa ' + d.nama_desa, _new: true }, main); } });
        UI.menu(b, 'Desa ' + d.nama_desa, items);
      };
    });
    UI.$$('[data-user]', main).forEach(function (b) {
      b.onclick = function () {
        var u = users.find(function (x) { return x.user_id === b.dataset.user; });
        var items = [{ label: 'Edit Akun', icon: 'pencil', onClick: function () { editUser(u, main); } }, { label: 'Reset Password', icon: 'key', onClick: function () { resetPw(u, main); } }];
        if (u.terkunci) items.push({ label: 'Buka Kunci Akun', icon: 'unlock', onClick: function () { unlock(u, main); } });
        if (u.user_id !== S.user.user_id) { items.push('-'); items.push({ label: u.aktif ? 'Nonaktifkan Akun' : 'Aktifkan Akun', icon: u.aktif ? 'xCircle' : 'check', danger: u.aktif, onClick: function () { toggleUser(u, main); } }); }
        UI.menu(b, u.username, items);
      };
    });
  }

  function editDesa(d, main) {
    d = d || { aktif: 'TRUE' };
    var m = UI.modal({
      title: d.desa_id ? 'Edit Data Desa' : 'Tambah Desa', icon: 'building',
      body: '<div class="form-grid"><div class="field"><label>Nama Desa<span class="req">*</span></label><input class="input" data-v="nama_desa" value="' + esc(d.nama_desa) + '"></div>' +
        '<div class="field"><label>Kode Desa</label><input class="input" data-v="kode" value="' + esc(d.kode) + '"></div>' +
        '<div class="field full"><label>Nama Kepala Desa</label><input class="input" value="' + esc(d.kepala_desa || '— belum diisi desa —') + '" readonly><div class="help">Diisi operator desa di Profil Desa atau saat mengisi pengajuan.</div></div>' +
        '<div class="field full"><label>Alamat Kantor Desa</label><input class="input" data-v="alamat_kantor" value="' + esc(d.alamat_kantor) + '"></div>' +
        '<label class="switch"><input type="checkbox" data-v="aktif"' + (lkBool(d.aktif) ? ' checked' : '') + '>Desa aktif</label></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>'
    });
    m.root.querySelector('[data-ok]').onclick = function () {
      var b = this, g = function (k) { var x = m.root.querySelector('[data-v="' + k + '"]'); return x.type === 'checkbox' ? x.checked : x.value.trim(); };
      UI.busy(b, async function () {
        var r = await API.call('saveDesa', { desa_id: d.desa_id, nama_desa: g('nama_desa'), kode: g('kode'), alamat_kantor: g('alamat_kantor'), aktif: g('aktif') });
        if (!r.success) return UI.toast(r.message, 'error');
        setMaster(r.data.master); m.close(); UI.toast(r.message); drawAkun(main);
      });
    };
  }

  function editUser(u, main) {
    var isNew = !u || u._new;
    u = u || { peran: 'OPERATOR_DESA' };
    var m = UI.modal({
      title: isNew ? 'Tambah Akun' : 'Edit Akun', icon: 'user',
      body: '<div class="form-grid"><div class="field"><label>Peran<span class="req">*</span></label><select class="select" data-v="peran">' +
        UI.options([{ v: 'OPERATOR_DESA', l: 'Operator Desa' }, { v: 'PETUGAS_KUA', l: 'Petugas KUA' }, { v: 'SUPER_ADMIN', l: 'Super Admin KUA' }], u.peran) + '</select></div>' +
        '<div class="field" data-desawrap><label>Desa<span class="req">*</span></label><select class="select" data-v="desa_id">' + UI.options(S.master.desa.map(function (d) { return { v: d.desa_id, l: d.nama_desa }; }), u.desa_id, '— Pilih desa —') + '</select></div>' +
        '<div class="field"><label>Username<span class="req">*</span></label><input class="input mono" data-v="username" value="' + esc(u.username) + '" autocomplete="off"><div class="help">Huruf kecil, angka, titik.</div></div>' +
        '<div class="field"><label>Nama Tampilan</label><input class="input" data-v="nama_tampilan" value="' + esc(u.nama_tampilan) + '"></div>' +
        (isNew ? '<div class="field"><label>Password Awal<span class="req">*</span></label><input class="input" type="password" data-v="password" autocomplete="new-password"><div class="help">Min. 8 karakter, huruf + angka.</div></div>' +
        '<div class="field"><label>Ulangi Password<span class="req">*</span></label><input class="input" type="password" data-v="password2" autocomplete="new-password"></div>' +
        '<div class="field full"><div class="banner neutral">' + icon('key') + '<div class="txt">Sampaikan password awal ini langsung ke pemilik akun (bukan lewat grup). Pemilik akun <b>wajib menggantinya</b> saat login pertama.</div></div></div>' : '') +
        '<label class="switch"><input type="checkbox" data-v="aktif"' + (u.aktif === false ? '' : ' checked') + '>Akun aktif</label></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>'
    });
    var sync = function () { m.root.querySelector('[data-desawrap]').style.display = m.root.querySelector('[data-v="peran"]').value === 'OPERATOR_DESA' ? '' : 'none'; };
    m.root.querySelector('[data-v="peran"]').onchange = sync; sync();
    m.root.querySelector('[data-ok]').onclick = function () {
      var b = this, g = function (k) { var x = m.root.querySelector('[data-v="' + k + '"]'); return x.type === 'checkbox' ? x.checked : x.value.trim(); };
      if (isNew && g('password') !== g('password2')) return UI.toast('Ulangi password tidak sama.', 'error');
      UI.busy(b, async function () {
        var r = await API.call('saveUser', { user_id: isNew ? '' : u.user_id, peran: g('peran'), desa_id: g('desa_id'), username: g('username'), nama_tampilan: g('nama_tampilan'), aktif: g('aktif'), password: isNew ? g('password') : '' });
        if (!r.success) return UI.toast(r.message, 'error');
        m.close();
        var i = users.findIndex(function (x) { return x.user_id === r.data.user.user_id; });
        if (i >= 0) users[i] = r.data.user; else users.push(r.data.user);
        drawAkun(main);
        UI.toast(r.message);
      });
    };
  }

  function resetPw(u, main) {
    var m = UI.modal({
      title: 'Reset Password — ' + u.username, icon: 'key',
      body: '<p style="margin-top:0">Ketik password awal baru. Sesi yang sedang aktif di akun ini akan dikeluarkan, dan pemilik akun <b>wajib menggantinya</b> saat login berikutnya.</p>' +
        '<div class="form-grid"><div class="field"><label>Password Baru<span class="req">*</span></label><input class="input" type="password" data-v="password" autocomplete="new-password" autofocus><div class="help">Min. 8 karakter, huruf + angka.</div></div>' +
        '<div class="field"><label>Ulangi Password<span class="req">*</span></label><input class="input" type="password" data-v="password2" autocomplete="new-password"></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>' + icon('key', 16) + 'Reset Password</button>'
    });
    m.root.querySelector('[data-ok]').onclick = function () {
      var b = this, pw = m.root.querySelector('[data-v="password"]').value, pw2 = m.root.querySelector('[data-v="password2"]').value;
      if (pw !== pw2) return UI.toast('Ulangi password tidak sama.', 'error');
      UI.busy(b, async function () {
        var r = await API.call('resetPassword', { user_id: u.user_id, password: pw });
        if (!r.success) return UI.toast(r.message, 'error');
        m.close();
        var i = users.findIndex(function (x) { return x.user_id === u.user_id; }); users[i] = r.data.user;
        drawAkun(main);
        UI.toast(r.message);
      });
    };
  }
  async function unlock(u, main) {
    var r = await API.call('unlockUser', { user_id: u.user_id });
    if (!r.success) return UI.toast(r.message, 'error');
    var i = users.findIndex(function (x) { return x.user_id === u.user_id; }); users[i] = r.data.user;
    UI.toast(r.message); drawAkun(main);
  }
  async function toggleUser(u, main) {
    if (u.aktif) {
      var ok = await UI.confirm({ title: 'Nonaktifkan akun?', message: u.username + ' tidak akan bisa masuk dan sesinya dicabut. Data pengajuan tetap aman.', ok: 'Nonaktifkan', danger: true });
      if (!ok) return;
    }
    var r = await API.call('saveUser', { user_id: u.user_id, peran: u.peran, desa_id: u.desa_id, username: u.username, nama_tampilan: u.nama_tampilan, aktif: !u.aktif });
    if (!r.success) return UI.toast(r.message, 'error');
    var i = users.findIndex(function (x) { return x.user_id === u.user_id; }); users[i] = r.data.user;
    UI.toast(r.message); drawAkun(main);
  }

  /* =================================================================
   * FIELD SURAT
   * ================================================================= */
  var FF = { q: '', grup: '', tipe: '', nonaktif: false };
  function usage(key) {
    return S.master.templates.filter(function (t) { return lkBool(t.aktif) && lkJson(t.placeholder_list, []).indexOf(key) >= 0; }).map(function (t) { return t.kode; });
  }
  function field(main) {
    main.innerHTML = head('FIELD SURAT', 'Data Master') +
      '<div class="stack"><div class="banner neutral">' + icon('info') + '<div class="txt">Field = isian formulir desa sekaligus <b>penanda</b> di template Google Docs, ditulis <span class="code-chip">{{kode_field}}</span>. Field baru otomatis muncul di formulir desa sesuai grupnya. Field <b>Turunan</b> dihitung otomatis (umur, alamat lengkap, data catin) dan hanya dipakai di template/aturan.</div></div>' +
      '<div class="card filter-card"><div class="fhead"><span class="t">' + icon('filter', 16) + 'Filter</span></div><div class="fbody"><div class="filter-grid" style="grid-template-columns:2fr 1fr 1fr auto auto">' +
      '<div class="field"><label>Cari</label><input class="input" data-ff="q" value="' + esc(FF.q) + '" placeholder="kode atau label"></div>' +
      '<div class="field"><label>Grup</label><select class="select" data-ff="grup">' + UI.options(LK_GROUPS.map(function (g) { return g.key; }), FF.grup, 'Semua Grup') + '</select></div>' +
      '<div class="field"><label>Tipe</label><select class="select" data-ff="tipe">' + UI.options(LK_TYPES, FF.tipe, 'Semua Tipe') + '</select></div>' +
      '<div class="field"><label>&nbsp;</label><label class="check" style="height:42px"><input type="checkbox" data-ff="nonaktif"' + (FF.nonaktif ? ' checked' : '') + '>Tampilkan nonaktif</label></div>' +
      '<div class="field"><label>&nbsp;</label><button class="btn btn-primary" data-newfield>' + icon('plus') + 'Tambah Field</button></div>' +
      '</div></div></div><div class="card" id="fieldTbl"></div></div>';
    App.bindRefresh(main);
    var redraw = function () { drawFields(main); };
    UI.$$('[data-ff]', main).forEach(function (x) {
      x.addEventListener(x.tagName === 'INPUT' && x.type !== 'checkbox' ? 'input' : 'change', UI.debounce(function () { FF[x.dataset.ff] = x.type === 'checkbox' ? x.checked : x.value; redraw(); }, 200));
    });
    main.querySelector('[data-newfield]').onclick = function () { editField(null, function () { redraw(); }); };
    redraw();
  }
  function drawFields(main) {
    var q = FF.q.toLowerCase();
    var list = S.master.fields.filter(function (f) {
      if (!FF.nonaktif && !lkBool(f.aktif)) return false;
      if (FF.grup && f.grup !== FF.grup) return false;
      if (FF.tipe && f.tipe !== FF.tipe) return false;
      if (q && (f.field_key + ' ' + f.label).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var box = main.querySelector('#fieldTbl');
    box.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th class="c" style="width:52px">No</th><th class="c" style="width:64px">Action</th><th>Kode Field</th><th>Label</th><th>Grup</th><th class="c">Tipe</th><th class="c">Wajib</th><th>Dipakai di Surat</th><th class="c">Status</th></tr></thead><tbody>' +
      (list.map(function (f, i) {
        var u = usage(f.field_key);
        return '<tr' + (lkBool(f.aktif) ? '' : ' style="opacity:.55"') + '><td class="c">' + (i + 1) + '</td><td class="c"><button class="btn btn-menu" data-menu-anchor data-fk="' + esc(f.field_key) + '">' + icon('menu', 16) + '</button></td>' +
          '<td><span class="code-chip" data-copyk="' + esc(f.field_key) + '" title="Salin penanda">' + esc(f.field_key) + '</span>' + (lkBool(f.sistem) ? ' <span title="Field sistem">' + icon('lock', 12) + '</span>' : '') + '</td>' +
          '<td class="nm">' + esc(f.label) + (f.turunan ? '<span class="sub">otomatis: ' + esc(f.turunan) + '</span>' : (f.tampil_jika ? '<span class="sub">tampil bersyarat</span>' : '')) + '</td>' +
          '<td>' + esc(f.grup) + (f.seksi ? '<span class="sub">' + esc(f.seksi) + '</span>' : '') + '</td><td class="c"><span class="pill s-NEUTRAL">' + esc(f.tipe) + '</span></td>' +
          '<td class="c">' + (f.turunan ? '–' : lkBool(f.wajib) ? 'Ya' : 'Tidak') + '</td><td>' + (u.length ? u.map(function (k) { return '<span class="tag blue">' + esc(k) + '</span>'; }).join(' ') : '<span class="muted">–</span>') + '</td>' +
          '<td class="c">' + (lkBool(f.aktif) ? '<span class="pill s-TERKUNCI">Aktif</span>' : '<span class="pill s-NEUTRAL">Nonaktif</span>') + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="tbl-empty">Tidak ada field.</td></tr>') + '</tbody></table></div><div class="tbl-foot"><span class="muted">' + list.length + ' field</span></div>';
    UI.$$('[data-copyk]', box).forEach(function (c) { c.onclick = function () { UI.copyText('{{' + c.dataset.copyk + '}}'); }; });
    UI.$$('[data-fk]', box).forEach(function (b) {
      b.onclick = function () {
        var f = S.master.fields.find(function (x) { return x.field_key === b.dataset.fk; });
        var items = [];
        if (!f.turunan) items.push({ label: 'Edit Field', icon: 'pencil', onClick: function () { editField(f, function () { drawFields(main); }); } });
        items.push({ label: 'Salin Penanda {{' + f.field_key + '}}', icon: 'copy', onClick: function () { UI.copyText('{{' + f.field_key + '}}'); } });
        if (!lkBool(f.sistem)) {
          items.push('-');
          items.push({ label: lkBool(f.aktif) ? 'Nonaktifkan' : 'Aktifkan', icon: lkBool(f.aktif) ? 'xCircle' : 'check', danger: lkBool(f.aktif), onClick: async function () {
            var r = await API.call('toggleField', { field_key: f.field_key, aktif: !lkBool(f.aktif) });
            if (!r.success) return UI.toast(r.message, 'error');
            setMaster(r.data.master); UI.toast(r.message); drawFields(main);
          } });
        }
        UI.menu(b, f.field_key, items);
      };
    });
  }

  /** Drawer tambah/edit field. pre = {field_key} untuk prefill dari template. */
  function editField(f, done, pre) {
    var isNew = !f;
    f = f || Object.assign({ tipe: 'TEKS', wajib: 'FALSE', grup: 'Administrasi', aktif: 'TRUE' }, pre || {});
    var sistem = lkBool(f.sistem);
    var seksiList = {};
    S.master.fields.forEach(function (x) { if (x.seksi) seksiList[x.seksi] = 1; });
    var tj = lkJson(f.tampil_jika, null);
    var d = UI.drawer({
      title: isNew ? 'Tambah Field' : 'Edit Field',
      body: '<div class="stack" style="gap:14px">' +
        '<div class="field"><label>Kode Field<span class="req">*</span></label><input class="input mono" data-v="field_key" value="' + esc(f.field_key) + '"' + (isNew ? '' : ' readonly') + ' placeholder="mis. istri_no_hp"><div class="help">Huruf kecil, angka, garis bawah. Dipakai di template: <span class="code-chip">{{' + esc(f.field_key || 'kode_field') + '}}</span></div></div>' +
        '<div class="field"><label>Label<span class="req">*</span></label><input class="input" data-v="label" value="' + esc(f.label) + '"></div>' +
        '<div class="form-grid"><div class="field"><label>Grup Formulir<span class="req">*</span></label><select class="select" data-v="grup"' + (sistem ? ' disabled' : '') + '>' + UI.options(LK_GROUPS.filter(function (g) { return g.key !== 'Turunan'; }).map(function (g) { return { v: g.key, l: 'Langkah ' + g.step + ' · ' + g.key }; }), f.grup) + '</select></div>' +
        '<div class="field"><label>Tipe<span class="req">*</span></label><select class="select" data-v="tipe"' + (sistem ? ' disabled' : '') + '>' + UI.options(LK_TYPES, f.tipe) + '</select></div></div>' +
        '<div class="field"><label>Seksi (judul kartu)</label><input class="input" data-v="seksi" list="seksiList" value="' + esc(f.seksi) + '" placeholder="mis. IDENTITAS"><datalist id="seksiList">' + Object.keys(seksiList).map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist></div>' +
        '<div class="field" data-opsiwrap><label>Daftar Pilihan</label><textarea class="textarea" data-v="opsi" rows="4" placeholder="Satu pilihan per baris. Format opsional: KODE=Label">' + esc(lkStr(f.opsi).split(';').join('\n')) + '</textarea></div>' +
        '<div class="form-grid"><div class="field"><label>Urutan</label><input class="input" type="number" data-v="urutan" value="' + esc(f.urutan || '') + '" placeholder="otomatis"></div>' +
        '<div class="field"><label>&nbsp;</label><label class="switch" style="height:42px"><input type="checkbox" data-v="wajib"' + (lkBool(f.wajib) ? ' checked' : '') + '>Wajib diisi</label></div></div>' +
        '<div class="field"><label>Teks Bantuan</label><input class="input" data-v="bantuan" value="' + esc(f.bantuan) + '"></div>' +
        '<div class="field"><label>Pola Validasi (regex, opsional)</label><input class="input mono" data-v="validasi" value="' + esc(f.validasi) + '" placeholder="mis. ^08\\d{8,11}$"></div>' +
        '<div class="field"><label>Tampil Jika (opsional)</label><div class="card card-body" data-cond style="padding:14px"></div><div class="help">Kosongkan bila field selalu tampil. Field tersembunyi tidak divalidasi.</div></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>' + icon('save', 16) + 'Simpan Field</button>'
    });
    var getCond = condBuilder(d.root.querySelector('[data-cond]'), tj, { prefix: 'Tampilkan jika' });
    var syncOpsi = function () { d.root.querySelector('[data-opsiwrap]').style.display = d.root.querySelector('[data-v="tipe"]').value === 'PILIHAN' ? '' : 'none'; };
    d.root.querySelector('[data-v="tipe"]').onchange = syncOpsi; syncOpsi();
    d.root.querySelector('[data-ok]').onclick = function () {
      var b = this, g = function (k) { var x = d.root.querySelector('[data-v="' + k + '"]'); return x.type === 'checkbox' ? x.checked : x.value.trim(); };
      var cond = getCond();
      UI.busy(b, async function () {
        var r = await API.call('saveField', {
          isNew: isNew, field_key: g('field_key'), label: g('label'), grup: g('grup'), seksi: g('seksi'), tipe: g('tipe'),
          opsi: g('opsi').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).join(';'), wajib: g('wajib'), urutan: g('urutan'),
          bantuan: g('bantuan'), validasi: g('validasi'), tampil_jika: cond.kondisi.length ? cond : ''
        });
        if (!r.success) return UI.toast(r.message, 'error');
        setMaster(r.data.master); d.close(); UI.toast(r.message);
        if (done) done(g('field_key'));
      });
    };
  }

  /* =================================================================
   * TEMPLATE SURAT
   * ================================================================= */
  function kodes() {
    var by = {};
    S.master.templates.forEach(function (t) { (by[t.kode] = by[t.kode] || []).push(t); });
    return Object.keys(by).map(function (k) {
      var vs = by[k].sort(function (a, b) { return Number(b.versi) - Number(a.versi); });
      var act = vs.find(function (t) { return lkBool(t.aktif); });
      return { kode: k, versions: vs, aktif: act, show: act || vs[0] };
    }).sort(function (a, b) { return (Number(a.show.urutan_paket) || 99) - (Number(b.show.urutan_paket) || 99); });
  }
  function docUrl(id) { return 'https://docs.google.com/document/d/' + id + '/edit'; }

  function template(main) {
    var list = kodes();
    main.innerHTML = head('TEMPLATE SURAT', 'Data Master') +
      '<div class="stack"><div class="banner warn">' + icon('alert') + '<div class="txt"><b>Verifikasi acuan formulir resmi yang berlaku</b> (PMA 30/2024 dan ketetapan Dirjen tentang bentuk formulir) sebelum mengaktifkan template. Template bawaan bertanda <b>CONTOH</b> wajib diganti.</div></div>' +
      '<div class="row"><button class="btn btn-primary" data-reg>' + icon('plus') + 'Daftarkan Template</button><span class="muted">Buat surat di Google Docs (folder 01_Template_Sumber) dengan penanda {{kode_field}}, lalu daftarkan.</span></div>' +
      '<div class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th class="c" style="width:60px">Urutan</th><th class="c" style="width:64px">Action</th><th>Kode</th><th>Nama Surat</th><th class="c">Versi Aktif</th><th class="c">Penanda</th><th>Dasar Regulasi</th><th>Berlaku Sejak</th><th class="c">Status</th></tr></thead><tbody>' +
      (list.map(function (x) {
        var t = x.show;
        return '<tr' + (x.aktif ? '' : ' style="opacity:.6"') + '><td class="c">' + esc(t.urutan_paket) + '</td><td class="c"><button class="btn btn-menu" data-menu-anchor data-kode="' + esc(x.kode) + '">' + icon('menu', 16) + '</button></td>' +
          '<td><b class="mono">' + esc(x.kode) + '</b></td><td class="nm">' + esc(t.nama) + '<span class="sub">' + x.versions.length + ' versi tersimpan</span></td>' +
          '<td class="c">' + (x.aktif ? '<span class="pill s-OK">v' + esc(x.aktif.versi) + '</span>' : '–') + '</td><td class="c">' + lkJson(t.placeholder_list, []).length + '</td>' +
          '<td>' + esc(t.dasar_regulasi || '–') + '</td><td class="nowrap">' + UI.tgl(t.berlaku_sejak) + '</td>' +
          '<td class="c">' + (x.aktif ? '<span class="pill s-TERKUNCI">Aktif</span>' : '<span class="pill s-NEUTRAL">Nonaktif</span>') + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="tbl-empty">Belum ada template.</td></tr>') + '</tbody></table></div></div>' +
      '<section class="acc"><button class="acc-h">' + icon('list', 20) + '<h3>Daftar Penanda (untuk ditulis di Google Docs)</h3><span class="chev">' + icon('chevD', 16) + '</span></button><div class="acc-b">' +
      '<input class="input" data-phq placeholder="Cari penanda…" style="max-width:360px"><div class="help mt-s">Klik untuk menyalin. Format tambahan: ' + LK_FORMATS.map(function (f) { return '<span class="code-chip">|' + f + '</span>'; }).join(' ') + ' — contoh <span class="code-chip">{{akad_tanggal|hari}}</span>, <span class="code-chip">{{catin_nama|huruf_besar}}</span>. Penanda <b>catin_*</b> otomatis merujuk catin pengajuan (suami/istri), <b>pasangan_*</b> ke pasangannya.</div>' +
      '<div data-phlist class="mt-s" style="display:flex;flex-wrap:wrap;gap:6px;max-height:420px;overflow:auto"></div></div></section></div>';
    App.bindRefresh(main);
    main.querySelector('[data-reg]').onclick = function () { registerTemplate(null, main); };
    var acc = main.querySelector('.acc');
    acc.querySelector('.acc-h').onclick = function () { acc.classList.toggle('open'); };
    var drawPh = function () {
      var q = main.querySelector('[data-phq]').value.toLowerCase();
      main.querySelector('[data-phlist]').innerHTML = S.master.fields.filter(function (f) { return lkBool(f.aktif) && (!q || (f.field_key + ' ' + f.label).toLowerCase().indexOf(q) >= 0); }).map(function (f) {
        return '<span class="code-chip" data-ph="' + esc(f.field_key) + '" title="' + esc(f.label + ' — ' + f.grup) + '">{{' + esc(f.field_key) + '}}</span>';
      }).join('');
      UI.$$('[data-ph]', main).forEach(function (c) { c.onclick = function () { UI.copyText('{{' + c.dataset.ph + '}}'); }; });
    };
    main.querySelector('[data-phq]').addEventListener('input', UI.debounce(drawPh, 200));
    drawPh();
    UI.$$('[data-kode]', main).forEach(function (b) {
      b.onclick = function () {
        var x = list.find(function (k) { return k.kode === b.dataset.kode; });
        var items = [
          { label: 'Lihat Versi', icon: 'history', onClick: function () { versions(x, main); } },
          { label: 'Daftarkan Versi Baru', icon: 'plus', onClick: function () { registerTemplate(x, main); } },
          { label: 'Uji PDF (data contoh)', icon: 'eye', disabled: !x.aktif, onClick: function () { testPdf(x.aktif.beku_doc_id, '', b); } },
          { label: 'Buka Docs Sumber', icon: 'external', onClick: function () { window.open(docUrl(x.show.sumber_doc_id), '_blank'); } },
          '-'
        ];
        if (x.aktif) items.push({ label: 'Nonaktifkan Template', icon: 'xCircle', danger: true, onClick: function () { toggleTpl(x.kode, false, '', main); } });
        else items.push({ label: 'Aktifkan v' + x.versions[0].versi, icon: 'check', onClick: function () { toggleTpl(x.kode, true, x.versions[0].template_id, main); } });
        UI.menu(b, x.kode + ' — ' + x.show.nama, items);
      };
    });
  }

  async function toggleTpl(kode, aktif, tid, main) {
    if (!aktif) {
      var ok = await UI.confirm({ title: 'Nonaktifkan ' + kode + '?', message: 'Surat ini tidak akan masuk paket untuk pengajuan berikutnya. Dokumen yang sudah dibuat tetap tersimpan.', ok: 'Nonaktifkan', danger: true });
      if (!ok) return;
    }
    var r = await API.call('toggleTemplate', { kode: kode, aktif: aktif, template_id: tid });
    if (!r.success) return UI.toast(r.message, 'error');
    setMaster(r.data.master); UI.toast(r.message); template(main);
  }

  function versions(x, main) {
    var m = UI.modal({
      title: 'Versi Template ' + x.kode, icon: 'history', size: 'wide',
      body: '<div class="table-wrap"><table class="tbl"><thead><tr><th class="c">Versi</th><th>Nama</th><th>Dibuat</th><th>Berlaku Sejak</th><th class="c">Status</th><th class="c">Aksi</th></tr></thead><tbody>' +
        x.versions.map(function (t) {
          return '<tr><td class="c"><b>v' + esc(t.versi) + '</b></td><td>' + esc(t.nama) + '<span class="sub">' + lkJson(t.placeholder_list, []).length + ' penanda</span></td><td class="nowrap">' + UI.waktu(t.dibuat_pada) + '<span class="sub">' + esc(t.dibuat_oleh) + '</span></td>' +
            '<td>' + UI.tgl(t.berlaku_sejak) + '</td><td class="c">' + (lkBool(t.aktif) ? '<span class="pill s-TERKUNCI">Aktif</span>' : '<span class="pill s-NEUTRAL">Arsip</span>') + '</td>' +
            '<td class="c nowrap"><a class="btn btn-xs" target="_blank" rel="noopener" href="' + docUrl(t.beku_doc_id) + '">' + icon('external', 13) + 'Beku</a> ' +
            (lkBool(t.aktif) ? '' : '<button class="btn btn-xs" data-act="' + esc(t.template_id) + '">Jadikan Aktif</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="muted" style="font-size:12.5px">Salinan beku tidak boleh diedit. Dokumen yang sudah dibuat selalu memakai versi template saat dibuat.</p>',
      foot: '<button class="btn" data-close>Tutup</button>'
    });
    UI.$$('[data-act]', m.root).forEach(function (b) { b.onclick = function () { m.close(); toggleTpl(x.kode, true, b.dataset.act, main); }; });
  }

  async function testPdf(docId, pengajuanId, btn) {
    var win = UI.preOpen();
    try {
      await UI.busy(btn, async function () {
        var r = await API.call('testTemplate', { doc: docId, pengajuan_id: pengajuanId || '' }, { timeout: 120000 });
        if (!r.success) { if (win) win.close(); return UI.toast(r.message, 'error'); }
        var blob = await UI.mergePdf([{ base64: r.data.base64 }], 'UJI TEMPLATE');
        UI.openBlob(blob, win, r.data.nama);
      });
    } catch (e) { if (win) win.close(); UI.toast(e.message, 'error'); }
  }

  /** Modal 3 langkah: Pilih Dokumen → Cek Penanda → Uji & Aktifkan */
  function registerTemplate(x, main) {
    var st = { step: 1, docs: null, doc: '', scan: null, kode: x ? x.kode : '', nama: x ? x.show.nama : '', urutan: x ? x.show.urutan_paket : (kodes().length + 1), dasar: x ? x.show.dasar_regulasi : '', sejak: UI.today(), sample: '' };
    var m = UI.modal({ title: x ? 'Versi Baru ' + x.kode : 'Daftarkan Template', icon: 'fileCheck', size: 'xwide', body: '<div data-rb></div>', foot: '<div data-rf class="row" style="width:100%;justify-content:flex-end"></div>' });
    var nextVer = function () { var vs = S.master.templates.filter(function (t) { return t.kode === st.kode.toUpperCase(); }); return vs.reduce(function (mx, t) { return Math.max(mx, Number(t.versi) || 0); }, 0) + 1; };
    var steps = function () {
      return '<div class="steps" style="padding:0 0 16px;grid-template-columns:repeat(3,minmax(0,1fr))">' + ['Pilih Dokumen', 'Cek Penanda', 'Uji & Aktifkan'].map(function (s, i) {
        return '<div class="step' + (st.step === i + 1 ? ' active' : st.step > i + 1 ? ' done' : '') + '" style="cursor:default"><span class="n">' + (st.step > i + 1 ? icon('check', 13) : i + 1) + '</span><span class="t">' + (i + 1) + '. ' + s + '</span></div>';
      }).join('') + '</div>';
    };
    var draw = async function () {
      var rb = m.root.querySelector('[data-rb]'), rf = m.root.querySelector('[data-rf]');
      if (st.step === 1) {
        rb.innerHTML = steps() + '<div class="split"><div><div class="caption" style="margin-bottom:8px">Google Docs di folder 01_Template_Sumber</div><div data-docs class="doclist" style="max-height:340px;overflow:auto"><div class="skel"></div><div class="skel mt-s"></div></div>' +
          '<div class="field mt"><label>atau tempel link Google Docs</label><input class="input" data-doclink placeholder="https://docs.google.com/document/d/…" value="' + esc(/^http/.test(st.doc) ? st.doc : '') + '"></div></div>' +
          '<div class="stack" style="gap:14px"><div class="form-grid"><div class="field"><label>Kode<span class="req">*</span></label><input class="input mono" data-k="kode" value="' + esc(st.kode) + '"' + (x ? ' readonly' : '') + ' placeholder="mis. N1"></div>' +
          '<div class="field"><label>Urutan dalam Paket</label><input class="input" type="number" data-k="urutan" value="' + esc(st.urutan) + '"></div></div>' +
          '<div class="field"><label>Nama Surat<span class="req">*</span></label><input class="input" data-k="nama" value="' + esc(st.nama) + '"></div>' +
          '<div class="field"><label>Dasar Regulasi</label><input class="input" data-k="dasar" value="' + esc(st.dasar) + '" placeholder="mis. Kepdirjen Bimas Islam No. …"></div>' +
          '<div class="field"><label>Berlaku Sejak</label><input class="input" type="date" data-k="sejak" value="' + esc(st.sejak) + '"></div></div></div>';
        rf.innerHTML = '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-next>Cek Penanda ' + icon('arrowR', 16) + '</button>';
        rf.querySelector('[data-close]').onclick = m.close;
        UI.$$('[data-k]', rb).forEach(function (i) { i.oninput = function () { st[i.dataset.k] = i.value; }; });
        rb.querySelector('[data-doclink]').oninput = function () { st.doc = this.value.trim(); UI.$$('input[name=srcdoc]', rb).forEach(function (r) { r.checked = false; }); };
        rf.querySelector('[data-next]').onclick = function () {
          if (!st.doc) return UI.toast('Pilih dokumen atau tempel link Google Docs.', 'warning');
          if (!st.kode.trim() || !st.nama.trim()) return UI.toast('Kode dan nama surat wajib diisi.', 'warning');
          st.step = 2; st.scan = null; draw();
        };
        if (!st.docs) {
          var r = await API.call('listSourceDocs');
          st.docs = r.success ? r.data.dokumen : [];
          st.folderUrl = r.success ? r.data.folder_url : '';
        }
        var box = rb.querySelector('[data-docs]');
        if (!box) return;
        box.innerHTML = st.docs.length ? st.docs.map(function (d) {
          return '<label class="docitem" style="cursor:pointer"><input type="radio" name="srcdoc" value="' + esc(d.id) + '"' + (st.doc === d.id ? ' checked' : '') + '><span class="ic">' + icon('file', 18) + '</span><div class="nm"><b>' + esc(d.nama) + '</b><span>Diubah ' + esc(d.diubah) + '</span></div><a href="' + esc(d.url) + '" target="_blank" rel="noopener" class="btn btn-xs">' + icon('external', 13) + 'Buka</a></label>';
        }).join('') : '<div class="muted">Belum ada Google Docs di folder sumber.' + (st.folderUrl ? ' <a target="_blank" rel="noopener" href="' + esc(st.folderUrl) + '">Buka folder</a>' : '') + '</div>';
        UI.$$('input[name=srcdoc]', box).forEach(function (r) { r.onchange = function () { st.doc = r.value; rb.querySelector('[data-doclink]').value = ''; }; });
      } else if (st.step === 2) {
        rb.innerHTML = steps() + '<div data-scan><div class="row muted"><span class="spin" style="display:inline-block;width:16px;height:16px;border:2px solid var(--emerald);border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span>Memindai penanda di dokumen…</div></div>';
        rf.innerHTML = '<button class="btn" data-back>' + icon('arrowL', 16) + 'Kembali</button><button class="btn" data-rescan>' + icon('refresh', 16) + 'Pindai Ulang</button><button class="btn btn-primary" data-next disabled>Berikutnya ' + icon('arrowR', 16) + '</button>';
        rf.querySelector('[data-back]').onclick = function () { st.step = 1; draw(); };
        rf.querySelector('[data-rescan]').onclick = function () { st.scan = null; draw(); };
        if (!st.scan) {
          var s = await API.call('scanTemplate', { doc: st.doc }, { timeout: 60000 });
          if (!s.success) { rb.querySelector('[data-scan]').innerHTML = '<div class="banner danger">' + icon('xCircle') + '<div class="txt">' + esc(s.message) + '</div></div>'; return; }
          st.scan = s.data;
        }
        var sc = st.scan, ph = sc.placeholders;
        var bad = ph.filter(function (p) { return p.status !== 'OK'; });
        var lab = { OK: '<span class="pill s-TERKUNCI">Dikenal</span>', TIDAK_DIKENAL: '<span class="pill s-DIBATALKAN">Tidak Dikenal</span>', NONAKTIF: '<span class="pill s-DIKEMBALIKAN">Field Nonaktif</span>', FORMAT_SALAH: '<span class="pill s-DIKEMBALIKAN">Format Salah</span>' };
        rb.querySelector('[data-scan]').innerHTML = '<div class="row" style="margin-bottom:12px"><b>' + esc(sc.nama) + '</b><a class="btn btn-xs" target="_blank" rel="noopener" href="' + esc(sc.url) + '">' + icon('external', 13) + 'Buka di Docs</a></div>' +
          '<div class="banner ' + (sc.ok ? 'ok' : 'warn') + '">' + icon(sc.ok ? 'checkCircle' : 'alert') + '<div class="txt"><b>' + ph.length + ' penanda ditemukan · ' + (ph.length - bad.length) + ' dikenal · ' + bad.length + ' bermasalah.</b>' +
          (ph.length ? (sc.ok ? ' Siap diuji.' : ' Perbaiki di Google Docs (lalu Pindai Ulang) atau buat field baru.') : ' Dokumen tidak berisi penanda {{…}}.') + '</div></div>' +
          '<div class="table-wrap mt-s" style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th>Penanda</th><th>Lokasi</th><th>Field</th><th class="c">Status</th><th class="c">Aksi</th></tr></thead><tbody>' +
          ph.map(function (p) {
            return '<tr><td class="mono">' + esc(p.ph) + '</td><td>' + esc(p.lokasi) + '</td><td>' + esc(p.label || '–') + '</td><td class="c">' + (lab[p.status] || esc(p.status)) + '</td>' +
              '<td class="c">' + (p.status === 'TIDAK_DIKENAL' ? '<button class="btn btn-xs" data-mkfield="' + esc(p.key) + '">' + icon('plus', 13) + 'Buat Field</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        UI.$$('[data-mkfield]', rb).forEach(function (b) { b.onclick = function () { editField(null, function () { st.scan = null; draw(); }, { field_key: b.dataset.mkfield, label: '' }); }; });
        var nx = rf.querySelector('[data-next]');
        nx.disabled = !sc.ok;
        nx.onclick = function () { st.step = 3; draw(); };
      } else {
        var cand = S.list.filter(function (p) { return p.status !== 'DIBATALKAN'; }).slice(0, 100);
        rb.innerHTML = steps() + '<div class="split"><div class="stack" style="gap:14px"><div class="field"><label>Data untuk Uji</label><select class="select" data-sample>' +
          '<option value="">Data contoh (fiktif)</option>' + cand.map(function (p) { return '<option value="' + esc(p.pengajuan_id) + '"' + (st.sample === p.pengajuan_id ? ' selected' : '') + '>' + esc(p.pengajuan_id + ' — ' + p.nama_catin + ' (' + App.desaName(p.desa_id) + ')') + '</option>'; }).join('') + '</select></div>' +
          '<button class="btn" data-test>' + icon('eye') + 'Buat PDF Uji</button><p class="muted" style="font-size:12.5px;margin:0">Periksa tata letak, nilai, dan format tanggal di PDF uji sebelum mengaktifkan.</p></div>' +
          '<div class="card card-body"><div class="caption">Ringkasan</div><div class="kv mt-s">' + App.kv('Kode', st.kode.toUpperCase()) + App.kv('Versi baru', 'v' + nextVer()) + App.kv('Nama Surat', st.nama) + App.kv('Penanda', st.scan.placeholders.length) +
          App.kv('Urutan Paket', st.urutan) + App.kv('Berlaku Sejak', UI.tgl(st.sejak)) + '</div><div class="banner neutral mt">' + icon('info') + '<div class="txt">' + (nextVer() > 1 ? 'Versi v' + (nextVer() - 1) + ' akan dinonaktifkan; ' : '') + 'dokumen lama tetap memakai versinya masing-masing.</div></div></div></div>';
        rf.innerHTML = '<button class="btn" data-back>' + icon('arrowL', 16) + 'Kembali</button><button class="btn btn-emerald" data-activate>' + icon('check', 16) + 'Aktifkan sebagai v' + nextVer() + '</button>';
        rb.querySelector('[data-sample]').onchange = function () { st.sample = this.value; };
        rb.querySelector('[data-test]').onclick = function () { testPdf(st.doc, st.sample, this); };
        rf.querySelector('[data-back]').onclick = function () { st.step = 2; draw(); };
        rf.querySelector('[data-activate]').onclick = function () {
          var b = this;
          UI.busy(b, async function () {
            var r = await API.call('activateTemplate', { doc: st.doc, kode: st.kode, nama: st.nama, urutan_paket: st.urutan, dasar_regulasi: st.dasar, berlaku_sejak: st.sejak }, { timeout: 60000 });
            if (!r.success) return UI.toast(r.message, 'error');
            setMaster(r.data.master); m.close(); UI.toast(r.message); template(main);
          });
        };
      }
    };
    draw();
  }

  /* =================================================================
   * ATURAN PAKET SURAT & PERINGATAN
   * ================================================================= */
  var tabAturan = 'paket';
  function aturan(main) {
    main.innerHTML = head('ATURAN PAKET SURAT', 'Data Master') +
      '<div class="tabs"><button class="tab' + (tabAturan === 'paket' ? ' active' : '') + '" data-tab="paket">Aturan Paket</button><button class="tab' + (tabAturan === 'warn' ? ' active' : '') + '" data-tab="warn">Peringatan</button></div><div data-tabbody></div>';
    App.bindRefresh(main);
    UI.$$('[data-tab]', main).forEach(function (b) { b.onclick = function () { tabAturan = b.dataset.tab; aturan(main); }; });
    var box = main.querySelector('[data-tabbody]');
    if (tabAturan === 'paket') drawRules(box, main); else drawWarnings(box, main);
  }

  var JENIS = [{ v: 'NIKAH_DI_KUA', l: 'Nikah di Wilayah' }, { v: 'REKOMENDASI_KELUAR', l: 'Rekomendasi' }];
  var PERAN = LK_PERAN.map(function (x) { return { v: x.v, l: x.v === 'SUAMI_ISTRI' ? 'Suami & Istri' : x.l }; });
  function jenisText(j) {
    if (!j || j === 'SEMUA') return 'Semua jenis';
    return j.split(';').map(function (x) { var o = JENIS.find(function (y) { return y.v === x; }); return o ? o.l : x; }).join(', ');
  }
  function peranText(j) {
    if (!j || j === 'SEMUA') return 'Semua catin';
    return j.split(';').map(function (x) { var o = PERAN.find(function (y) { return y.v === x; }); return o ? o.l : x; }).join(', ');
  }
  function ruleHits(r, jenis, peran) {
    var bj = lkStr(r.berlaku_untuk_jenis), bp = lkStr(r.berlaku_untuk_peran);
    return lkBool(r.aktif) && (!bj || bj === 'SEMUA' || bj.split(';').indexOf(jenis) >= 0) && (!bp || bp === 'SEMUA' || bp.split(';').indexOf(peran) >= 0);
  }
  /** Peta Paket Surat: template × (Jenis Pengajuan × Pengajuan Untuk). */
  function matrixHtml(tplK) {
    var combos = [];
    JENIS.forEach(function (j) { PERAN.forEach(function (p) { combos.push({ j: j, p: p }); }); });
    return '<div class="card"><div class="card-head"><div><h2>Peta Paket Surat</h2><div class="sub">Surat yang dicetak untuk setiap kombinasi. Klik sel untuk mengatur.</div></div>' +
      '<div class="end legend"><span>' + '<b class="mx on">✓</b> selalu</span><span><b class="mx cond">⚡</b> bersyarat</span><span><b class="mx two">×2</b> per catin</span></div></div>' +
      '<div class="table-wrap"><table class="tbl matrix"><thead><tr><th rowspan="2">Surat</th>' + JENIS.map(function (j) { return '<th class="c" colspan="3">' + esc(j.l) + '</th>'; }).join('') + '</tr><tr>' +
      combos.map(function (c) { return '<th class="c">' + esc(c.p.l) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      tplK.filter(function (x) { return x.aktif; }).map(function (x) {
        return '<tr><td class="nm"><b class="mono">' + esc(x.kode) + '</b><span class="sub">' + esc(x.show.nama) + '</span></td>' + combos.map(function (c) {
          var rs = S.master.rules.filter(function (r) { return r.template_kode === x.kode && ruleHits(r, c.j.v, c.p.v); });
          var always = rs.some(function (r) { return r.mode === 'SELALU'; });
          var two = c.p.v === 'SUAMI_ISTRI' && rs.some(function (r) { return r.lingkup === 'PER_CATIN'; });
          var cell = !rs.length ? '<span class="muted">–</span>' : (always ? '<b class="mx on">✓</b>' : '<b class="mx cond">⚡</b>') + (two ? '<b class="mx two">×2</b>' : '');
          return '<td class="c mxcell" data-mx="' + esc(x.kode) + '|' + c.j.v + '|' + c.p.v + '" title="' + esc(x.kode + ' · ' + c.j.l + ' · ' + c.p.l) + '">' + cell + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function drawRules(box, main) {
    var tplK = kodes();
    var noRule = tplK.filter(function (x) { return x.aktif && !S.master.rules.some(function (r) { return r.template_kode === x.kode && lkBool(r.aktif); }); });
    box.innerHTML = '<div class="stack">' +
      '<div class="banner neutral">' + icon('info') + '<div class="txt">Aturan menentukan surat yang dicetak untuk setiap kombinasi <b>Jenis Pengajuan × Pengajuan Untuk</b>. Contoh: <b>N5</b> muncul bila <i>Umur Catin saat Akad &lt; 21</i>. Gunakan field <b>catin_*</b> agar aturan merujuk catin yang bersangkutan. Lingkup <b>Per catin</b> pada pengajuan Suami &amp; Istri mencetak surat untuk masing-masing catin.</div></div>' +
      matrixHtml(tplK) +
      (noRule.length ? '<div class="banner warn">' + icon('alert') + '<div class="txt">Template aktif tanpa aturan (tidak akan pernah muncul di paket): <b>' + noRule.map(function (x) { return esc(x.kode); }).join(', ') + '</b></div></div>' : '') +
      '<div class="row"><button class="btn btn-primary" data-newrule>' + icon('plus') + 'Tambah Aturan</button></div>' +
      '<div class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th class="c" style="width:52px">No</th><th class="c" style="width:64px">Action</th><th>Surat</th><th class="c">Muncul</th><th>Kondisi</th><th>Berlaku Untuk</th><th class="c">Lingkup</th><th class="c">Status</th></tr></thead><tbody>' +
      (S.master.rules.slice().sort(function (a, b) { return Pengajuan.tplOrder(a.template_kode) - Pengajuan.tplOrder(b.template_kode); }).map(function (r, i) {
        var t = tplK.find(function (x) { return x.kode === r.template_kode; });
        return '<tr' + (lkBool(r.aktif) ? '' : ' style="opacity:.55"') + '><td class="c">' + (i + 1) + '</td><td class="c"><button class="btn btn-menu" data-menu-anchor data-rule="' + esc(r.rule_id) + '">' + icon('menu', 16) + '</button></td>' +
          '<td class="nm"><b class="mono">' + esc(r.template_kode) + '</b> ' + esc(t ? t.show.nama : '(template tidak ada)') + (r.keterangan ? '<span class="sub">' + esc(r.keterangan) + '</span>' : '') + '</td>' +
          '<td class="c">' + (r.mode === 'SELALU' ? '<span class="pill s-NEUTRAL">Selalu</span>' : '<span class="pill s-INFO">Bersyarat</span>') + '</td>' +
          '<td>' + (r.mode === 'SELALU' ? '<span class="muted">—</span>' : esc(describe(r.logika, lkJson(r.kondisi_json, [])))) + '</td><td>' + esc(jenisText(r.berlaku_untuk_jenis)) + '<span class="sub">' + esc(peranText(r.berlaku_untuk_peran)) + '</span></td>' +
          '<td class="c">' + (r.lingkup === 'PER_CATIN' ? '<span class="tag">Per catin</span>' : '<span class="tag gray">Sekali</span>') + '</td>' +
          '<td class="c">' + (lkBool(r.aktif) ? '<span class="pill s-TERKUNCI">Aktif</span>' : '<span class="pill s-NEUTRAL">Nonaktif</span>') + '</td></tr>';
      }).join('') || '<tr><td colspan="8" class="tbl-empty">Belum ada aturan.</td></tr>') + '</tbody></table></div></div></div>';
    box.querySelector('[data-newrule]').onclick = function () { editRule(null, main); };
    UI.$$('[data-mx]', box).forEach(function (td) {
      td.onclick = function () {
        var a = td.dataset.mx.split('|');
        var rs = S.master.rules.filter(function (r) { return r.template_kode === a[0] && ruleHits(r, a[1], a[2]); });
        if (rs.length === 1) return editRule(rs[0], main);
        if (rs.length > 1) return UI.menu(td, a[0] + ' — pilih aturan', rs.map(function (r) { return { label: (r.mode === 'SELALU' ? 'Selalu' : 'Bersyarat') + ' · ' + jenisText(r.berlaku_untuk_jenis) + ' · ' + peranText(r.berlaku_untuk_peran), icon: 'pencil', onClick: function () { editRule(r, main); } }; }));
        editRule({ template_kode: a[0], mode: 'SELALU', logika: 'SEMUA', kondisi_json: '[]', berlaku_untuk_jenis: a[1], berlaku_untuk_peran: a[2], lingkup: 'PER_CATIN', aktif: 'TRUE' }, main);
      };
    });
    UI.$$('[data-rule]', box).forEach(function (b) {
      b.onclick = function () {
        var r = S.master.rules.find(function (x) { return x.rule_id === b.dataset.rule; });
        UI.menu(b, 'Aturan ' + r.template_kode, [
          { label: 'Edit Aturan', icon: 'pencil', onClick: function () { editRule(r, main); } },
          { label: lkBool(r.aktif) ? 'Nonaktifkan' : 'Aktifkan', icon: lkBool(r.aktif) ? 'xCircle' : 'check', danger: lkBool(r.aktif), onClick: async function () {
            var res = await API.call('saveRule', { rule_id: r.rule_id, template_kode: r.template_kode, mode: r.mode, logika: r.logika, kondisi: lkJson(r.kondisi_json, []), berlaku_untuk_jenis: r.berlaku_untuk_jenis, berlaku_untuk_peran: r.berlaku_untuk_peran, lingkup: r.lingkup, aktif: !lkBool(r.aktif), keterangan: r.keterangan });
            if (!res.success) return UI.toast(res.message, 'error');
            setMaster(res.data.master); UI.toast(res.message); aturan(main);
          } }
        ]);
      };
    });
  }

  function editRule(r, main) {
    r = r || { mode: 'SELALU', logika: 'SEMUA', kondisi_json: '[]', berlaku_untuk_jenis: 'SEMUA', berlaku_untuk_peran: 'SEMUA', lingkup: 'PER_CATIN', aktif: 'TRUE' };
    var jenis = lkStr(r.berlaku_untuk_jenis), peran = lkStr(r.berlaku_untuk_peran);
    var all = !jenis || jenis === 'SEMUA', allP = !peran || peran === 'SEMUA';
    var m = UI.modal({
      title: r.rule_id ? 'Edit Aturan — ' + r.template_kode : 'Tambah Aturan', icon: 'sliders', size: 'xwide',
      body: '<div class="split"><div class="stack" style="gap:14px"><div class="form-grid"><div class="field"><label>Surat<span class="req">*</span></label><select class="select" data-v="kode">' +
        UI.options(kodes().map(function (x) { return { v: x.kode, l: x.kode + ' — ' + x.show.nama }; }), r.template_kode, '— Pilih —') + '</select></div>' +
        '<div class="field"><label>Muncul</label><select class="select" data-v="mode">' + UI.options([{ v: 'SELALU', l: 'Selalu dalam paket' }, { v: 'KONDISI', l: 'Bersyarat (jika kondisi terpenuhi)' }], r.mode) + '</select></div></div>' +
        '<div class="field" data-condwrap><label>Kondisi</label><div class="card card-body" data-cond style="padding:14px"></div></div>' +
        '<div class="field"><label>Berlaku untuk Jenis Pengajuan</label><div class="row">' + JENIS.map(function (x) { return '<label class="check"><input type="checkbox" data-j="' + x.v + '"' + (all || jenis.split(';').indexOf(x.v) >= 0 ? ' checked' : '') + '>' + esc(x.l) + '</label>'; }).join('') + '</div></div>' +
        '<div class="field"><label>Berlaku untuk Pengajuan Untuk</label><div class="row">' + PERAN.map(function (x) { return '<label class="check"><input type="checkbox" data-p="' + x.v + '"' + (allP || peran.split(';').indexOf(x.v) >= 0 ? ' checked' : '') + '>' + esc(x.l) + '</label>'; }).join('') + '</div></div>' +
        '<div class="field"><label>Lingkup pada pengajuan Suami &amp; Istri</label><select class="select" data-v="lingkup">' + UI.options([{ v: 'PER_CATIN', l: 'Per catin — dicetak untuk suami DAN istri (×2)' }, { v: 'SEKALI', l: 'Sekali — satu surat untuk pasangan' }], r.lingkup || 'PER_CATIN') + '</select></div>' +
        '<div class="field"><label>Keterangan / Dasar</label><input class="input" data-v="ket" value="' + esc(r.keterangan) + '"></div>' +
        '<label class="switch"><input type="checkbox" data-v="aktif"' + (lkBool(r.aktif) ? ' checked' : '') + '>Aturan aktif</label></div>' +
        '<div class="card"><div class="card-head"><h3 style="font-size:15px">' + icon('eye', 18) + ' Uji Aturan</h3></div><div class="card-body"><select class="select" data-uji>' +
        UI.options(S.list.slice(0, 200).map(function (p) { return { v: p.pengajuan_id, l: p.pengajuan_id + ' — ' + p.nama_catin }; }), '', '— Pilih pengajuan —') + '</select><div data-ujires class="mt-s muted">Pilih pengajuan untuk melihat hasil aturan & paket suratnya.</div></div></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>' + icon('save', 16) + 'Simpan Aturan</button>'
    });
    var getCond = condBuilder(m.root.querySelector('[data-cond]'), { logika: r.logika, kondisi: lkJson(r.kondisi_json, []) }, { prefix: 'Tampilkan surat jika', minOne: true });
    var sync = function () { m.root.querySelector('[data-condwrap]').style.display = m.root.querySelector('[data-v="mode"]').value === 'KONDISI' ? '' : 'none'; };
    m.root.querySelector('[data-v="mode"]').onchange = sync; sync();
    var current = function () {
      var j = UI.$$('[data-j]', m.root).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.j; });
      var pp = UI.$$('[data-p]', m.root).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.p; });
      var c = getCond();
      return {
        rule_id: r.rule_id, template_kode: m.root.querySelector('[data-v="kode"]').value, mode: m.root.querySelector('[data-v="mode"]').value,
        logika: c.logika, kondisi: c.kondisi, berlaku_untuk_jenis: j.length === JENIS.length || !j.length ? 'SEMUA' : j.join(';'),
        berlaku_untuk_peran: pp.length === PERAN.length || !pp.length ? 'SEMUA' : pp.join(';'), lingkup: m.root.querySelector('[data-v="lingkup"]').value,
        aktif: m.root.querySelector('[data-v="aktif"]').checked, keterangan: m.root.querySelector('[data-v="ket"]').value.trim()
      };
    };
    m.root.querySelector('[data-uji]').onchange = async function () {
      var id = this.value, res = m.root.querySelector('[data-ujires]');
      if (!id) return;
      res.innerHTML = '<div class="skel"></div>';
      var g = await API.call('getPengajuan', { id: id });
      if (!g.success) { res.textContent = g.message; return; }
      var der = lkDerive(g.data.data, App.fields(), { id: id, cfg: S.master.config });
      var cr = current();
      var hit = cr.mode === 'SELALU' || lkEvalGroup(der, { logika: cr.logika, kondisi: cr.kondisi });
      var rules = S.master.rules.filter(function (x) { return !r.rule_id || x.rule_id !== r.rule_id; }).concat([{ template_kode: cr.template_kode, mode: cr.mode, logika: cr.logika, kondisi_json: JSON.stringify(cr.kondisi), berlaku_untuk_jenis: cr.berlaku_untuk_jenis, berlaku_untuk_peran: cr.berlaku_untuk_peran, lingkup: cr.lingkup, aktif: cr.aktif ? 'TRUE' : 'FALSE' }]);
      var pkg = lkPackage(der, rules, S.master.templates, App.fields());
      res.classList.remove('muted');
      res.innerHTML = '<div class="banner ' + (hit ? 'ok' : 'neutral') + '">' + icon(hit ? 'checkCircle' : 'info') + '<div class="txt">Aturan ini <b>' + (hit ? 'TERPENUHI' : 'tidak terpenuhi') + '</b> untuk ' + esc(id) + '.</div></div>' +
        '<div class="caption mt-s" style="margin-bottom:6px">Paket surat hasil uji</div>' + (pkg.map(function (t) { return '<div style="padding:3px 0"><b class="mono">' + esc(t.kode) + '</b> ' + esc(t.label) + (t.alasan ? '<span class="sub muted" style="display:block;font-size:12px">' + esc(t.alasan) + '</span>' : '') + '</div>'; }).join('') || '<span class="muted">Kosong</span>');
    };
    m.root.querySelector('[data-ok]').onclick = function () {
      var b = this, cr = current();
      if (!cr.template_kode) return UI.toast('Pilih surat.', 'warning');
      UI.busy(b, async function () {
        var res = await API.call('saveRule', cr);
        if (!res.success) return UI.toast(res.message, 'error');
        setMaster(res.data.master); m.close(); UI.toast(res.message); aturan(main);
      });
    };
  }

  function drawWarnings(box, main) {
    var tingkat = { INFO: '<span class="pill s-INFO">Info</span>', PERINGATAN: '<span class="pill s-WARN">Peringatan</span>', BLOKIR: '<span class="pill s-DIBATALKAN">Blokir</span>' };
    box.innerHTML = '<div class="stack"><div class="banner neutral">' + icon('info') + '<div class="txt">Peringatan tampil di langkah <b>Validasi</b>. Tingkat <b>Blokir</b> mencegah surat dicetak sampai diperbaiki. Pemeriksaan bawaan (hari/jam kerja Kantor KUA, batas 10 hari kerja pendaftaran, poligami, wali) selalu aktif.</div></div>' +
      '<div class="row"><button class="btn btn-primary" data-neww>' + icon('plus') + 'Tambah Peringatan</button></div>' +
      '<div class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th class="c" style="width:64px">Action</th><th>Pesan</th><th class="c">Tingkat</th><th>Kondisi</th><th class="c">Status</th></tr></thead><tbody>' +
      (S.master.warnings.map(function (w) {
        return '<tr' + (lkBool(w.aktif) ? '' : ' style="opacity:.55"') + '><td class="c"><button class="btn btn-menu" data-menu-anchor data-w="' + esc(w.rule_id) + '">' + icon('menu', 16) + '</button></td><td class="nm">' + esc(w.pesan) + '</td>' +
          '<td class="c">' + (tingkat[w.tingkat] || esc(w.tingkat)) + '</td><td>' + esc(describe(w.logika, lkJson(w.kondisi_json, []))) + '</td>' +
          '<td class="c">' + (lkBool(w.aktif) ? '<span class="pill s-TERKUNCI">Aktif</span>' : '<span class="pill s-NEUTRAL">Nonaktif</span>') + '</td></tr>';
      }).join('') || '<tr><td colspan="5" class="tbl-empty">Belum ada peringatan.</td></tr>') + '</tbody></table></div></div></div>';
    box.querySelector('[data-neww]').onclick = function () { editWarning(null, main); };
    UI.$$('[data-w]', box).forEach(function (b) { b.onclick = function () { editWarning(S.master.warnings.find(function (x) { return x.rule_id === b.dataset.w; }), main); }; });
  }

  function editWarning(w, main) {
    w = w || { tingkat: 'PERINGATAN', logika: 'SEMUA', kondisi_json: '[]', aktif: 'TRUE' };
    var m = UI.modal({
      title: w.rule_id ? 'Edit Peringatan' : 'Tambah Peringatan', icon: 'alert', size: 'wide',
      body: '<div class="stack" style="gap:14px"><div class="field"><label>Pesan<span class="req">*</span></label><input class="input" data-v="pesan" value="' + esc(w.pesan) + '"></div>' +
        '<div class="field"><label>Tingkat</label><select class="select" data-v="tingkat">' + UI.options([{ v: 'INFO', l: 'Info' }, { v: 'PERINGATAN', l: 'Peringatan (boleh lanjut)' }, { v: 'BLOKIR', l: 'Blokir (wajib diperbaiki)' }], w.tingkat) + '</select></div>' +
        '<div class="field"><label>Kondisi</label><div class="card card-body" data-cond style="padding:14px"></div></div>' +
        '<label class="switch"><input type="checkbox" data-v="aktif"' + (lkBool(w.aktif) ? ' checked' : '') + '>Aktif</label></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>'
    });
    var getCond = condBuilder(m.root.querySelector('[data-cond]'), { logika: w.logika, kondisi: lkJson(w.kondisi_json, []) }, { prefix: 'Tampilkan jika', minOne: true });
    m.root.querySelector('[data-ok]').onclick = function () {
      var b = this, c = getCond();
      UI.busy(b, async function () {
        var r = await API.call('saveWarning', { rule_id: w.rule_id, pesan: m.root.querySelector('[data-v="pesan"]').value, tingkat: m.root.querySelector('[data-v="tingkat"]').value, logika: c.logika, kondisi: c.kondisi, aktif: m.root.querySelector('[data-v="aktif"]').checked });
        if (!r.success) return UI.toast(r.message, 'error');
        setMaster(r.data.master); m.close(); UI.toast(r.message); aturan(main);
      });
    };
  }

  /* =================================================================
   * HARI LIBUR (tanggal disilang di kalender akad Kantor KUA)
   * ================================================================= */
  var liburTahun = String(new Date().getFullYear());
  function libur(main) {
    var all = S.master.libur || [];
    var tahunList = {};
    tahunList[liburTahun] = 1; tahunList[String(new Date().getFullYear() + 1)] = 1;
    all.forEach(function (x) { tahunList[x.tanggal.slice(0, 4)] = 1; });
    var list = all.filter(function (x) { return x.tanggal.slice(0, 4) === liburTahun; });
    var JL = { LIBUR_NASIONAL: 'Libur Nasional', CUTI_BERSAMA: 'Cuti Bersama', LAINNYA: 'Lainnya' };
    main.innerHTML = head('HARI LIBUR', 'Data Master') +
      '<div class="stack"><div class="banner neutral">' + icon('calendar') + '<div class="txt">Tanggal di sini <b>disilang</b> pada kalender akad bila desa memilih <b>Nikah di Kantor KUA</b>, dan tidak dihitung sebagai hari kerja untuk batas pendaftaran 10 hari kerja. Data awal: SKB 3 Menteri libur nasional &amp; cuti bersama 2026–2027. Tambahkan tahun berikutnya setelah SKB terbit.</div></div>' +
      '<div class="split"><div class="card"><div class="card-head"><h2>Daftar Hari Libur</h2><div class="end"><select class="select" data-ty style="width:120px;height:36px">' + UI.options(Object.keys(tahunList).sort(), liburTahun) + '</select></div></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Keterangan</th><th class="c">Jenis</th><th class="c" style="width:64px">Hapus</th></tr></thead><tbody>' +
      (list.map(function (x) {
        return '<tr><td class="nowrap"><b>' + esc(lkHari(x.tanggal)) + '</b>, ' + esc(lkTanggalPanjang(x.tanggal)) + '</td><td>' + esc(x.keterangan) + '</td><td class="c"><span class="tag ' + (x.jenis === 'CUTI_BERSAMA' ? 'amber' : x.jenis === 'LAINNYA' ? 'gray' : '') + '">' + esc(JL[x.jenis] || x.jenis) + '</span></td>' +
          '<td class="c"><button class="btn btn-ghost btn-icon" data-del="' + esc(x.tanggal) + '" title="Hapus">' + icon('trash', 16) + '</button></td></tr>';
      }).join('') || '<tr><td colspan="4" class="tbl-empty">Belum ada hari libur tahun ' + esc(liburTahun) + '.</td></tr>') + '</tbody></table></div>' +
      '<div class="tbl-foot"><span class="muted">' + list.length + ' tanggal · tahun ' + esc(liburTahun) + '</span></div></div>' +
      '<div class="card topline tone-gold"><div class="card-head"><h2>Tambah / Ubah</h2></div><div class="card-body"><div class="stack" style="gap:14px">' +
      '<div class="field"><label>Tanggal<span class="req">*</span></label><input class="input" type="date" data-lt></div>' +
      '<div class="field"><label>Keterangan<span class="req">*</span></label><input class="input" data-lk placeholder="mis. Cuti Bersama Idulfitri"></div>' +
      '<div class="field"><label>Jenis</label><select class="select" data-lj>' + UI.options(Object.keys(JL).map(function (k) { return { v: k, l: JL[k] }; }), 'LIBUR_NASIONAL') + '</select></div>' +
      '<div class="help">Tanggal yang sudah ada akan diperbarui. Libur khusus KUA (mis. rapat dinas) bisa ditambahkan sebagai "Lainnya".</div>' +
      '<div class="row end"><button class="btn btn-primary" data-ladd>' + icon('save') + 'Simpan</button></div></div></div></div></div></div>';
    App.bindRefresh(main);
    main.querySelector('[data-ty]').onchange = function () { liburTahun = this.value; libur(main); };
    main.querySelector('[data-ladd]').onclick = function () {
      var b = this;
      UI.busy(b, async function () {
        var r = await API.call('saveLibur', { tanggal: main.querySelector('[data-lt]').value, keterangan: main.querySelector('[data-lk]').value, jenis: main.querySelector('[data-lj]').value });
        if (!r.success) return UI.toast(r.message, 'error');
        setMaster(r.data.master); liburTahun = main.querySelector('[data-lt]').value.slice(0, 4) || liburTahun; UI.toast(r.message); libur(main);
      });
    };
    UI.$$('[data-del]', main).forEach(function (b) {
      b.onclick = async function () {
        var ok = await UI.confirm({ title: 'Hapus hari libur?', message: lkTanggalPanjang(b.dataset.del) + ' akan bisa dipilih untuk akad di Kantor KUA.', ok: 'Hapus', danger: true });
        if (!ok) return;
        var r = await API.call('deleteLibur', { tanggal: b.dataset.del });
        if (!r.success) return UI.toast(r.message, 'error');
        setMaster(r.data.master); UI.toast(r.message); libur(main);
      };
    });
  }

  return { akun: akun, field: field, template: template, aturan: aturan, libur: libur, editField: editField, describe: describe };
})();
