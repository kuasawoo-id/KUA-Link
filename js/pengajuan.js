/* =====================================================================
 * LABUKU Link — pengajuan.js
 * Daftar pengajuan, menu aksi, cetak paket PDF, pembuat dokumen, detail.
 * ===================================================================== */
var Pengajuan = (function () {
  var esc = UI.esc, icon = UI.icon;
  var F = { id: '', nik: '', nama: '', jenis: '', status: '', desa: '', dari: '', sampai: '', q: '' };
  var page = 1, PAGE = 20, collapsed = false, lastParamsKey = '';

  function jenisLabel(v) { return v === 'REKOMENDASI_KELUAR' ? 'Rekomendasi Keluar' : v === 'NIKAH_DI_KUA' ? 'Nikah di KUA' : '–'; }
  function find(id) { return S.list.find(function (p) { return p.pengajuan_id === id; }); }

  function applyFilter(list) {
    var q = F.q.toLowerCase(), nama = F.nama.toLowerCase();
    return list.filter(function (p) {
      if (F.status === 'CETAK') { if (!(p.status === 'TERKUNCI' && lkBool(p.perlu_cetak_ulang))) return false; }
      else if (F.status && p.status !== F.status) return false;
      if (F.jenis && p.jenis !== F.jenis) return false;
      if (F.desa && p.desa_id !== F.desa) return false;
      if (F.id && p.pengajuan_id.toLowerCase().indexOf(F.id.toLowerCase()) < 0) return false;
      if (F.nik && String(p.nik_catin).indexOf(F.nik) < 0) return false;
      if (nama && (p.nama_catin + ' ' + p.nama_pasangan).toLowerCase().indexOf(nama) < 0) return false;
      if (F.dari && (!p.tanggal_akad || p.tanggal_akad < F.dari)) return false;
      if (F.sampai && (!p.tanggal_akad || p.tanggal_akad > F.sampai)) return false;
      if (q && [p.pengajuan_id, p.nama_catin, p.nama_pasangan, p.nik_catin, p.nomor_surat, App.desaName(p.desa_id)].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  var STATUS_OPTS = [{ v: 'DRAF', l: 'Draf' }, { v: 'TERKUNCI', l: 'Terkunci' }, { v: 'DIKEMBALIKAN', l: 'Dikembalikan' }, { v: 'CETAK', l: 'Perlu Cetak Ulang' }, { v: 'DIBATALKAN', l: 'Dibatalkan' }];
  var TITLES = { DRAF: 'Draf', TERKUNCI: 'Terkunci', DIKEMBALIKAN: 'Dikembalikan', CETAK: 'Perlu Cetak Ulang', DIBATALKAN: 'Dibatalkan' };

  /* ---------------- DAFTAR ---------------- */
  function renderList(main, params, soft) {
    var key = JSON.stringify(params || {});
    if (!soft && key !== lastParamsKey) {
      Object.keys(F).forEach(function (k) { F[k] = ''; });
      if (params.status) F.status = params.status;
      if (params.q) F.q = params.q;
      page = 1;
      lastParamsKey = key;
    }
    var kua = App.isKua();
    main.innerHTML = App.pageHead('Beranda / Pelayanan Nikah / Pengajuan Nikah', kua ? 'SEMUA PENGAJUAN' : 'DAFTAR PENGAJUAN', F.status ? TITLES[F.status] : 'Pengajuan Nikah') +
      '<div class="stack"><div class="card filter-card' + (collapsed ? ' collapsed' : '') + '" id="lf"><div class="fhead"><span class="t">' + icon('filter', 16) + 'Filter Pencarian</span><span class="sep"></span>' +
      '<span class="caption">Data Pengajuan</span><button class="toggle" data-toggle>' + (collapsed ? '▾ Tampilkan' : '▴ Sembunyikan') + '</button></div><div class="fbody"><div class="filter-grid">' +
      fi('id', 'No. Pengajuan', 'cth. LK-2026-00125') + fi('nik', 'NIK Catin', '16 digit NIK', 'numeric') + fi('nama', 'Nama Catin', 'min. 3 karakter') +
      '<div class="field"><label>Jenis</label><select class="select" data-f="jenis">' + UI.options([{ v: 'NIKAH_DI_KUA', l: 'Nikah di KUA' }, { v: 'REKOMENDASI_KELUAR', l: 'Rekomendasi Keluar' }], F.jenis, 'Semua') + '</select></div>' +
      '<div class="field"><label>Status</label><select class="select" data-f="status">' + UI.options(STATUS_OPTS, F.status, 'Semua Status') + '</select></div>' +
      (kua ? '<div class="field"><label>Desa</label><select class="select" data-f="desa">' + UI.options(S.master.desa.map(function (d) { return { v: d.desa_id, l: d.nama_desa }; }), F.desa, 'Semua Desa') + '</select></div>' : '') +
      '<div class="field"><label>Tgl Akad Dari</label><input class="input" type="date" data-f="dari" value="' + esc(F.dari) + '"></div>' +
      '<div class="field"><label>Tgl Akad Sampai</label><input class="input" type="date" data-f="sampai" value="' + esc(F.sampai) + '"></div>' +
      '<div class="actions"><button class="btn" data-reset>Reset</button><button class="btn btn-primary" data-apply>' + icon('search', 16) + 'Tampilkan</button></div>' +
      '</div>' + (F.q ? '<div class="banner neutral mt-s">' + icon('search') + '<div class="txt">Pencarian cepat: <b>' + esc(F.q) + '</b></div><a href="#" data-clearq>Hapus</a></div>' : '') + '</div></div>' +
      '<div class="row">' + (kua ? '' : '<a class="btn btn-primary" href="#/form/new" style="height:44px">' + icon('plus') + 'Pengajuan Baru</a><span class="muted">Isi data catin sekali — paket surat dibuat otomatis.</span>') +
      '<button class="btn" id="btnXls" style="margin-left:auto">' + icon('sheet') + 'Ekspor Excel</button></div>' +
      '<div class="card" id="listCard"></div></div>';
    App.bindRefresh(main);
    var lf = main.querySelector('#lf');
    lf.querySelector('[data-toggle]').onclick = function () { collapsed = !collapsed; lf.classList.toggle('collapsed'); this.textContent = collapsed ? '▾ Tampilkan' : '▴ Sembunyikan'; };
    var read = function () { UI.$$('[data-f]', lf).forEach(function (el) { F[el.dataset.f] = el.value.trim(); }); page = 1; drawTable(); };
    lf.querySelector('[data-apply]').onclick = read;
    lf.querySelector('[data-reset]').onclick = function () { Object.keys(F).forEach(function (k) { F[k] = ''; }); page = 1; renderList(main, {}, true); };
    var cq = lf.querySelector('[data-clearq]');
    if (cq) cq.onclick = function (e) { e.preventDefault(); F.q = ''; renderList(main, {}, true); };
    var deb = UI.debounce(read, 300);
    UI.$$('input[data-f]', lf).forEach(function (el) { el.addEventListener('input', deb); el.addEventListener('keydown', function (e) { if (e.key === 'Enter') read(); }); });
    UI.$$('select[data-f]', lf).forEach(function (el) { el.onchange = read; });
    main.querySelector('#btnXls').onclick = function (e) { exportExcel(applyFilter(S.list), e.currentTarget); };
    drawTable();
  }
  function fi(k, label, ph, mode) {
    return '<div class="field"><label>' + esc(label) + '</label><input class="input" data-f="' + k + '" value="' + esc(F[k]) + '" placeholder="' + esc(ph) + '"' + (mode ? ' inputmode="' + mode + '"' : '') + '></div>';
  }

  function drawTable() {
    var card = document.getElementById('listCard');
    if (!card) return;
    var kua = App.isKua();
    var rows = applyFilter(S.list);
    var pg = UI.pager(rows.length, page, PAGE);
    page = pg.page;
    var view = rows.slice((page - 1) * PAGE, page * PAGE);
    if (!rows.length) {
      card.innerHTML = UI.emptyState(S.list.length ? 'Tidak ada pengajuan yang cocok' : 'Belum ada pengajuan', S.list.length ? 'Ubah atau reset filter pencarian.' : (kua ? 'Pengajuan dari desa akan tampil di sini.' : 'Tekan tombol Pengajuan Baru untuk mulai.'),
        kua ? '' : '<a class="btn btn-primary" href="#/form/new">' + icon('plus') + 'Buat Pengajuan</a>');
      return;
    }
    card.innerHTML = '<div class="table-wrap"><table class="tbl cards"><thead><tr><th class="c" style="width:52px">No</th><th class="c" style="width:64px">Action</th><th>No. Pengajuan</th>' + (kua ? '<th>Desa</th>' : '') +
      '<th>Tgl. Dibuat</th><th>NIK Catin</th><th>Nama Catin</th><th class="c">Peran</th><th>Nama Pasangan</th><th>Tanggal Akad</th><th class="c">Status</th></tr></thead><tbody>' +
      view.map(function (p, i) {
        return '<tr><td class="c" data-l="No">' + ((page - 1) * PAGE + i + 1) + '</td><td class="c"><button class="btn btn-menu" data-menu-anchor data-act="' + esc(p.pengajuan_id) + '" aria-label="Aksi">' + icon('menu', 16) + '</button></td>' +
          '<td data-l="No. Pengajuan"><a class="mono" href="#/detail/' + esc(p.pengajuan_id) + '" style="color:var(--text);font-weight:600">' + esc(p.pengajuan_id) + '</a></td>' +
          (kua ? '<td data-l="Desa">' + esc(App.desaName(p.desa_id)) + '</td>' : '') +
          '<td data-l="Tgl. Dibuat" class="nowrap">' + UI.tgl(p.dibuat_pada) + '</td><td data-l="NIK Catin" class="mono">' + esc(p.nik_catin || '–') + '</td>' +
          '<td class="nm" data-l="Nama Catin">' + esc((p.nama_catin || '(belum diisi)').toUpperCase()) + '</td>' +
          '<td class="c" data-l="Peran">' + (p.peran_catin ? '<span class="pill s-NEUTRAL">' + esc(p.peran_catin) + '</span>' : '–') + '</td>' +
          '<td data-l="Nama Pasangan">' + esc((p.nama_pasangan || '–').toUpperCase()) + (p.pasangan_pengajuan_id ? ' <span title="Tertaut ' + esc(p.pasangan_pengajuan_id) + '">' + icon('link', 13) + '</span>' : '') + '</td>' +
          '<td data-l="Tanggal Akad" class="nowrap">' + UI.tgl(p.tanggal_akad) + '</td><td class="c">' + UI.statusPills(p) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot">' + pg.html + '</div>';
    UI.$$('[data-act]', card).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var p = find(b.dataset.act); if (p) actionMenu(p, b); }; });
    UI.$$('[data-pg]', card).forEach(function (b) { b.onclick = function () { page = Number(b.dataset.pg); drawTable(); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); }; });
  }

  /* ---------------- MENU AKSI ---------------- */
  function actionMenu(p, anchor) {
    var kua = App.isKua();
    var st = p.status;
    var editable = st === 'DRAF' || st === 'DIKEMBALIKAN';
    var items = [{ label: 'Lihat Detail', icon: 'eye', onClick: function () { App.go('#/detail/' + p.pengajuan_id); } }];
    if (kua && st === 'TERKUNCI') items.push({ label: 'Koreksi Data', icon: 'pencil', onClick: function () { App.go('#/koreksi/' + p.pengajuan_id); } });
    else items.push({ label: 'Edit', icon: 'pencil', disabled: !editable, title: st === 'TERKUNCI' ? 'Data terkunci — hubungi KUA' : '', onClick: function () { App.go('#/form/' + p.pengajuan_id); } });
    items.push({ label: 'Cetak Paket PDF', icon: 'printer', disabled: !(st === 'TERKUNCI' || st === 'DIBATALKAN'), title: editable ? 'Kunci data dulu (Simpan & Siap Cetak)' : '', onClick: function () { printPackage(p.pengajuan_id); } });
    if (!kua) items.push({ label: 'Buat Pengajuan Pasangan', icon: 'userPlus', disabled: !!p.pasangan_pengajuan_id || st === 'DIBATALKAN', title: p.pasangan_pengajuan_id ? 'Sudah tertaut ' + p.pasangan_pengajuan_id : '', onClick: function () { createPartner(p); } });
    if (kua) {
      items.push({ label: 'Kembalikan ke Desa', icon: 'rotate', disabled: st !== 'TERKUNCI', onClick: function () { returnToDesa(p); } });
      items.push({ label: 'Tautkan Pasangan', icon: 'link', disabled: st === 'DIBATALKAN', onClick: function () { linkPartner(p); } });
    }
    items.push('-');
    if (st === 'DIBATALKAN') items.push({ label: 'Aktifkan Kembali', icon: 'rotate', onClick: function () { reactivate(p); } });
    else items.push({ label: 'Batalkan', icon: 'xCircle', danger: true, onClick: function () { cancel(p); } });
    UI.menu(anchor, 'Aksi Pengajuan', items);
  }

  function afterChange(row, msg) {
    if (row) App.upsertRow(row);
    if (msg) UI.toast(msg);
    App.rerender();
    if (window.Detail && Detail.currentId()) Detail.reload();
  }

  async function cancel(p) {
    var alasan = await UI.prompt({
      title: 'Batalkan Pengajuan', icon: 'xCircle', danger: true, ok: 'Batalkan Pengajuan', label: 'Alasan pembatalan',
      html: '<p style="margin-top:0"><b class="mono">' + esc(p.pengajuan_id) + '</b> — ' + esc(p.nama_catin || '') + '<br><span class="muted">Data tidak dihapus dan dapat diaktifkan kembali.</span></p>',
      placeholder: 'Mis. Pernikahan dibatalkan oleh keluarga'
    });
    if (!alasan) return;
    var r = await API.call('cancelPengajuan', { id: p.pengajuan_id, alasan: alasan });
    if (!r.success) return UI.toast(r.message, 'error');
    afterChange(r.data.row, r.message);
  }

  async function reactivate(p) {
    var ok = await UI.confirm({ title: 'Aktifkan Kembali', icon: 'rotate', message: 'Status ' + p.pengajuan_id + ' akan kembali ke ' + (p.status_sebelum_batal || 'DRAF') + '.', ok: 'Aktifkan' });
    if (!ok) return;
    var r = await API.call('reactivatePengajuan', { id: p.pengajuan_id });
    if (!r.success) return UI.toast(r.message, 'error');
    afterChange(r.data.row, r.message);
  }

  async function createPartner(p) {
    var ke = p.peran_catin === 'SUAMI' ? 'Calon Istri' : 'Calon Suami';
    var dari = p.peran_catin === 'SUAMI' ? 'Calon Suami' : 'Calon Istri';
    var ok = await UI.confirm({
      title: 'Buat Pengajuan Pasangan', icon: 'userPlus', ok: 'Buat Draf Pasangan',
      html: 'Seluruh data <b class="mono">' + esc(p.pengajuan_id) + '</b> akan disalin dan peran ditukar: <b>' + dari + ' → ' + ke + '</b>.<br><br>Catin baru: <b>' + esc(p.nama_pasangan || '(belum diisi)') + '</b>. Nomor surat desa dikosongkan untuk diisi ulang.'
    });
    if (!ok) return;
    var r = await API.call('createPartner', { id: p.pengajuan_id });
    if (!r.success) return UI.toast(r.message, 'error');
    App.upsertRow(r.data.asal);
    App.upsertRow(r.data.row);
    UI.toast(r.message);
    App.go('#/form/' + r.data.id);
  }

  async function returnToDesa(p) {
    var catatan = await UI.prompt({
      title: 'Kembalikan ke Desa', icon: 'rotate', ok: 'Kembalikan', label: 'Catatan untuk desa',
      html: '<p style="margin-top:0"><b class="mono">' + esc(p.pengajuan_id) + '</b> — Desa ' + esc(App.desaName(p.desa_id)) + '<br><span class="muted">Desa akan bisa mengedit lagi, lalu mencetak &amp; menandatangani ulang.</span></p>',
      placeholder: 'Mis. NIK ayah calon istri salah, sesuaikan dengan KK'
    });
    if (!catatan) return;
    var r = await API.call('returnToDesa', { id: p.pengajuan_id, catatan: catatan });
    if (!r.success) return UI.toast(r.message, 'error');
    afterChange(r.data.row, r.message);
  }

  function linkPartner(p) {
    var cands = S.list.filter(function (x) { return x.pengajuan_id !== p.pengajuan_id && x.status !== 'DIBATALKAN'; });
    var m = UI.modal({
      title: 'Tautkan Pasangan', icon: 'link', size: 'wide',
      body: '<p style="margin-top:0">Tautkan <b class="mono">' + esc(p.pengajuan_id) + '</b> (' + esc(p.nama_catin) + ' & ' + esc(p.nama_pasangan) + ') dengan pengajuan pasangannya dari desa lain.</p>' +
        '<input class="input" data-q placeholder="Cari nama, NIK, atau nomor pengajuan…" autofocus><div class="table-wrap mt-s" data-res style="max-height:340px;overflow:auto"></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok disabled>Tautkan</button>'
    });
    var sel = null;
    var draw = function () {
      var q = m.root.querySelector('[data-q]').value.toLowerCase();
      var pn = (p.nama_pasangan || '').toLowerCase();
      var list = cands.filter(function (x) { return !q || [x.pengajuan_id, x.nama_catin, x.nama_pasangan, x.nik_catin].join(' ').toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return (b.nama_catin.toLowerCase() === pn) - (a.nama_catin.toLowerCase() === pn); }).slice(0, 30);
      m.root.querySelector('[data-res]').innerHTML = '<table class="tbl"><thead><tr><th></th><th>No. Pengajuan</th><th>Desa</th><th>Catin</th><th>Pasangan</th><th class="c">Status</th></tr></thead><tbody>' +
        (list.map(function (x) {
          return '<tr><td class="c"><input type="radio" name="pp" value="' + esc(x.pengajuan_id) + '"' + (sel === x.pengajuan_id ? ' checked' : '') + '></td><td class="mono">' + esc(x.pengajuan_id) + '</td><td>' + esc(App.desaName(x.desa_id)) + '</td><td class="nm">' + esc(x.nama_catin) + '</td><td>' + esc(x.nama_pasangan) + '</td><td class="c">' + UI.pill(x.status) + '</td></tr>';
        }).join('') || '<tr><td colspan="6" class="tbl-empty">Tidak ditemukan.</td></tr>') + '</tbody></table>';
      UI.$$('input[name=pp]', m.root).forEach(function (r) { r.onchange = function () { sel = r.value; m.root.querySelector('[data-ok]').disabled = false; }; });
    };
    m.root.querySelector('[data-q]').addEventListener('input', UI.debounce(draw, 200));
    draw();
    m.root.querySelector('[data-ok]').onclick = function (e) {
      UI.busy(e.currentTarget, async function () {
        var r = await API.call('linkPartner', { id: p.pengajuan_id, pasangan_id: sel });
        if (!r.success) return UI.toast(r.message, 'error');
        App.upsertRow(r.data.pasangan);
        m.close();
        afterChange(r.data.row, r.message);
      });
    };
  }

  /* ---------------- PEMBUAT DOKUMEN (progres per surat) ---------------- */
  /** Buat dokumen satu per satu agar tidak melewati batas waktu Apps Script. Resolve {ok:[], gagal:[]} */
  function generateDocs(id, kodes, title) {
    return new Promise(function (resolve) {
      var tpl = {};
      S.master.templates.forEach(function (t) { if (lkBool(t.aktif)) tpl[t.kode] = t.nama; });
      var state = kodes.map(function (k) { return { k: k, st: 'wait', msg: '' }; });
      var m = UI.modal({ title: title || 'Membuat dokumen…', icon: 'fileCheck', sticky: true, body: '<div data-pb></div>', foot: '<button class="btn hidden" data-retry>' + icon('refresh') + 'Ulangi yang Gagal</button><button class="btn btn-primary hidden" data-done>Selesai</button>' });
      m.root.dataset.sticky = '1';
      m.root.querySelector('.x').remove();
      var draw = function () {
        var done = state.filter(function (s) { return s.st === 'ok'; }).length;
        m.root.querySelector('[data-pb]').innerHTML = '<div class="row" style="justify-content:space-between"><b>' + done + ' dari ' + state.length + ' surat</b><span class="muted">' + Math.round(done / state.length * 100) + '%</span></div>' +
          '<div class="progress mt-s"><div style="width:' + (done / state.length * 100) + '%"></div></div><div class="plist">' +
          state.map(function (s) {
            var ic = s.st === 'ok' ? '<span style="color:var(--emerald)">' + icon('check', 18) + '</span>' : s.st === 'run' ? '<span class="spin" style="display:inline-block;width:16px;height:16px;border:2px solid var(--emerald);border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span>' : s.st === 'fail' ? '<span style="color:var(--danger)">' + icon('xCircle', 18) + '</span>' : '<span class="muted">○</span>';
            return '<div><span class="st">' + ic + '</span><span><b>' + esc(s.k) + '</b> ' + esc(tpl[s.k] || '') + (s.msg ? ' <span class="muted">— ' + esc(s.msg) + '</span>' : '') + '</span></div>';
          }).join('') + '</div><p class="muted" style="font-size:12.5px;margin-bottom:0">Setiap surat dibuat dari template Google Docs (±5–10 detik per surat). Jangan tutup halaman ini.</p>';
      };
      var run = async function () {
        m.root.querySelector('[data-retry]').classList.add('hidden');
        m.root.querySelector('[data-done]').classList.add('hidden');
        for (var i = 0; i < state.length; i++) {
          if (state[i].st === 'ok') continue;
          state[i].st = 'run'; state[i].msg = ''; draw();
          var r = await API.call('generateDoc', { id: id, kode: state[i].k }, { timeout: 120000 });
          if (r.success) { state[i].st = 'ok'; state[i].msg = 'v' + r.data.versi_dokumen; }
          else { state[i].st = 'fail'; state[i].msg = r.message; }
          draw();
        }
        var gagal = state.filter(function (s) { return s.st === 'fail'; });
        if (gagal.length) m.root.querySelector('[data-retry]').classList.remove('hidden');
        var d = m.root.querySelector('[data-done]');
        d.classList.remove('hidden');
        d.textContent = gagal.length ? 'Tutup' : 'Selesai';
      };
      m.root.querySelector('[data-retry]').onclick = run;
      m.root.querySelector('[data-done]').onclick = function () {
        m.close();
        resolve({ ok: state.filter(function (s) { return s.st === 'ok'; }).map(function (s) { return s.k; }), gagal: state.filter(function (s) { return s.st === 'fail'; }).map(function (s) { return s.k; }) });
      };
      draw();
      run();
    });
  }

  /* ---------------- CETAK PAKET ---------------- */
  function tplOrder(kode) {
    var t = S.master.templates.find(function (x) { return x.kode === kode && lkBool(x.aktif); }) || S.master.templates.find(function (x) { return x.kode === kode; });
    return t ? Number(t.urutan_paket) || 99 : 99;
  }

  async function printPackage(id, btn) {
    var win = UI.preOpen();
    var work = async function () {
      var st = await API.call('docsStatus', { id: id });
      if (!st.success) { if (win) win.close(); return UI.toast(st.message, 'error'); }
      var p = find(id) || {};
      if (st.data.dokumen_perlu.length && p.status === 'TERKUNCI') {
        if (win) win.close();
        var ok = await UI.confirm({ title: 'Dokumen belum lengkap', icon: 'fileCheck', message: 'Surat berikut belum dibuat / belum sesuai data terbaru: ' + st.data.dokumen_perlu.join(', ') + '. Buat sekarang?', ok: 'Buat Dokumen' });
        if (!ok) return;
        await generateDocs(id, st.data.dokumen_perlu, 'Melengkapi dokumen ' + id);
        if (window.Detail && Detail.currentId() === id) Detail.reload();
        return printPackage(id);
      }
      var aktif = st.data.dokumen.filter(function (d) { return d.aktif; }).sort(function (a, b) { return tplOrder(a.template_kode) - tplOrder(b.template_kode); });
      if (!aktif.length) { if (win) win.close(); return UI.toast('Belum ada dokumen untuk dicetak.', 'warning'); }
      var pdfs = await Promise.all(aktif.map(function (d) { return API.call('getDocPdf', { dokumen_id: d.dokumen_id }); }));
      var bad = pdfs.find(function (r) { return !r.success; });
      if (bad) { if (win) win.close(); return UI.toast(bad.message, 'error'); }
      var blob = await UI.mergePdf(pdfs.map(function (r) { return { base64: r.data.base64 }; }), pdfs[0].data.dibatalkan ? 'DIBATALKAN' : '');
      UI.openBlob(blob, win, id + '_paket.pdf');
    };
    try { await (btn ? UI.busy(btn, work) : work()); } catch (e) { if (win) win.close(); UI.toast(e.message, 'error'); }
  }

  async function downloadDoc(d, btn) {
    await UI.busy(btn, async function () {
      var r = await API.call('getDocPdf', { dokumen_id: d.dokumen_id });
      if (!r.success) return UI.toast(r.message, 'error');
      var wm = r.data.dibatalkan ? 'DIBATALKAN' : (!r.data.aktif ? 'VERSI LAMA' : '');
      var blob = wm ? await UI.mergePdf([{ base64: r.data.base64 }], wm) : new Blob([UI.b64ToBytes(r.data.base64)], { type: 'application/pdf' });
      UI.downloadBlob(blob, r.data.nama);
    });
  }

  /* ---------------- EKSPOR EXCEL ---------------- */
  async function exportExcel(rows, btn) {
    if (!rows.length) return UI.toast('Tidak ada data untuk diekspor.', 'warning');
    await UI.busy(btn, async function () {
      var r = await API.call('exportRows', { ids: rows.map(function (p) { return p.pengajuan_id; }) });
      if (!r.success) return UI.toast(r.message, 'error');
      var fs = App.fields().filter(function (f) { return lkBool(f.aktif) && !f.turunan; });
      var data = r.data.map(function (p) {
        var o = {
          'No. Pengajuan': p.pengajuan_id, 'Desa': App.desaName(p.desa_id), 'Status': p.status,
          'Perlu Cetak Ulang': lkBool(p.perlu_cetak_ulang) ? 'Ya' : '', 'Dibuat': p.dibuat_pada, 'Diubah': p.diubah_pada, 'Dikunci': p.dikunci_pada,
          'Koreksi KUA': p.jumlah_koreksi_kua, 'Pasangan Tertaut': p.pasangan_pengajuan_id, 'Alasan Batal': p.alasan_batal, 'Catatan KUA': p.catatan_kua
        };
        fs.forEach(function (f) {
          var v = p.data[f.field_key];
          o[f.label + ' [' + f.field_key + ']'] = v === undefined ? '' : (f.tipe === 'PILIHAN' ? lkOpsiLabel(f, v) : v);
        });
        return o;
      });
      await UI.exportXlsx('LABUKU-Link_Pengajuan_' + UI.today() + '.xlsx', [{ name: 'Pengajuan', rows: data }]);
      UI.toast(data.length + ' baris diekspor.');
    });
  }

  return {
    renderList: renderList, actionMenu: actionMenu, cancel: cancel, reactivate: reactivate, createPartner: createPartner,
    returnToDesa: returnToDesa, linkPartner: linkPartner, generateDocs: generateDocs, printPackage: printPackage,
    downloadDoc: downloadDoc, jenisLabel: jenisLabel, find: find, exportExcel: exportExcel, tplOrder: tplOrder
  };
})();

/* =====================================================================
 * DETAIL PENGAJUAN (overlay layar penuh)
 * ===================================================================== */
var Detail = (function () {
  var esc = UI.esc, icon = UI.icon;
  var cur = null, data = null, openSec = { ringkas: true, dok: true };

  function el() { return document.getElementById('detailOv'); }
  function close(silent) {
    var o = el();
    if (o) o.remove();
    cur = null; data = null;
    if (!silent) App.go(S.baseHash || '#/dashboard');
  }

  function open(id) {
    if (window.Formulir) Formulir.forceClose(true);
    cur = id;
    var root = document.getElementById('overlayRoot');
    var o = el();
    if (!o) { o = document.createElement('div'); o.className = 'overlay'; o.id = 'detailOv'; root.appendChild(o); }
    o.innerHTML = '<div class="ov-top"><div class="ttl"><b>Detail Pengajuan</b><span class="mono">' + esc(id) + '</span></div><div class="end"><button class="btn btn-ghost btn-icon" data-x>' + icon('x', 22) + '</button></div></div>' +
      '<div class="ov-scroll"><div class="ov-inner"><div class="card card-body">' + '<div class="skel" style="width:40%;height:20px"></div><div class="skel mt-s" style="width:70%"></div><div class="skel mt-s" style="width:55%"></div>' + '</div></div></div>';
    o.querySelector('[data-x]').onclick = function () { close(); };
    load(id);
  }

  async function load(id) {
    var r = await API.call('getPengajuan', { id: id });
    if (cur !== id) return;
    if (!r.success) {
      el().querySelector('.ov-inner').innerHTML = '<div class="banner danger">' + icon('xCircle') + '<div class="txt">' + esc(r.message) + '</div></div>';
      return;
    }
    data = r.data;
    App.upsertRow(data.pengajuan);
    render();
  }
  function reload() { if (cur) load(cur); }

  function lastAudit(aksi) { return (data.riwayat || []).find(function (a) { return a.aksi === aksi; }); }

  function render() {
    var p = data.pengajuan, d = data.data, kua = App.isKua();
    var st = p.status, editable = st === 'DRAF' || st === 'DIKEMBALIKAN';
    var o = el();
    var der = lkDerive(d, App.fields(), { id: p.pengajuan_id, desa: App.desaName(p.desa_id), kua: App.kuaName() });

    var actions = '';
    if (st === 'TERKUNCI' || st === 'DIBATALKAN') actions += '<button class="btn btn-primary" data-print>' + icon('printer') + 'Cetak Paket PDF</button>';
    if (editable) actions += '<a class="btn' + (st === 'DIKEMBALIKAN' && !kua ? ' btn-primary' : '') + '" href="#/form/' + esc(p.pengajuan_id) + '">' + icon('pencil') + (st === 'DIKEMBALIKAN' ? 'Perbaiki Data' : 'Lanjutkan Mengisi') + '</a>';
    if (kua && st === 'TERKUNCI') actions += '<a class="btn" href="#/koreksi/' + esc(p.pengajuan_id) + '">' + icon('pencil') + 'Koreksi Data</a><button class="btn" data-return>' + icon('rotate') + 'Kembalikan ke Desa</button>';
    actions += '<button class="btn" data-more data-menu-anchor>' + icon('menu') + 'Aksi Lain</button>';

    var banners = '';
    if (st === 'TERKUNCI' && lkBool(p.perlu_cetak_ulang)) {
      var k = lastAudit('KOREKSI_KUA');
      banners += '<div class="banner info">' + icon('printer') + '<div class="txt"><b>Diubah KUA' + (k ? ' ' + UI.waktu(k.waktu) : '') + '</b>' + (k && k.alasan ? ' — ' + esc(k.alasan) : '') +
        '. Dokumen versi terbaru perlu dicetak &amp; ditandatangani ulang Kepala Desa.</div>' + (!kua ? '<button class="btn btn-sm" data-reprinted>' + icon('check', 15) + 'Tandai Sudah Dicetak Ulang</button>' : '') + '</div>';
    }
    if (st === 'DIKEMBALIKAN') banners += '<div class="banner warn">' + icon('rotate') + '<div class="txt"><b>Dikembalikan KUA:</b> ' + esc(p.catatan_kua || '-') + '</div></div>';
    if (st === 'DIBATALKAN') banners += '<div class="banner danger">' + icon('xCircle') + '<div class="txt"><b>Dibatalkan:</b> ' + esc(p.alasan_batal || '-') + '. Data tetap tersimpan.</div><button class="btn btn-sm" data-reactivate>' + icon('rotate', 15) + 'Aktifkan Kembali</button></div>';
    if (st === 'TERKUNCI' && data.dokumen_perlu && data.dokumen_perlu.length) banners += '<div class="banner warn">' + icon('fileCheck') + '<div class="txt">Dokumen belum lengkap / belum sesuai data terbaru: <b>' + esc(data.dokumen_perlu.join(', ')) + '</b>.</div><button class="btn btn-sm" data-gen>' + icon('refresh', 15) + 'Buat Dokumen</button></div>';
    if (st === 'TERKUNCI' && !kua) banners += '<div class="row muted" style="font-size:13px">' + icon('lock', 16) + 'Data terkunci — koreksi melalui KUA.</div>';

    o.innerHTML = '<div class="ov-top"><div class="ttl"><b>Detail Pengajuan</b><span><span class="mono" style="color:var(--text);font-weight:600">' + esc(p.pengajuan_id) + '</span> · Desa ' + esc(App.desaName(p.desa_id)) + ' · ' + esc(Pengajuan.jenisLabel(p.jenis)) + '</span></div>' +
      '<div class="row">' + UI.statusPills(p) + '</div><div class="end">' + actions + '<button class="btn btn-ghost btn-icon" data-x aria-label="Tutup">' + icon('x', 22) + '</button></div></div>' +
      '<div class="ov-scroll"><div class="ov-inner"><div class="stack" style="gap:12px">' + banners + '</div><div class="mt">' +
      acc('ringkas', 'file', 'Ringkasan', ringkasan(p, d, der)) +
      acc('catin', 'users', 'Data Calon Pengantin', groupsView(d, der, 2, true)) +
      acc('adm', 'building', 'Administrasi & Rencana Akad', groupsView(d, der, 1, false)) +
      acc('saksi', 'users', 'Saksi & Kondisi Khusus', groupsView(d, der, 3, false) + groupsView(d, der, 4, false)) +
      acc('dok', 'fileCheck', 'Dokumen & Versi (' + data.dokumen.length + ')', dokumenView()) +
      acc('riwayat', 'history', 'Riwayat Perubahan (' + data.riwayat.length + ')', riwayatView()) +
      '</div></div></div>';
    bind(p);
  }

  function acc(key, ic, title, body) {
    return '<section class="acc' + (openSec[key] ? ' open' : '') + '" data-acc="' + key + '"><button class="acc-h">' + icon(ic, 20) + '<h3>' + esc(title) + '</h3><span class="chev">' + icon('chevD', 16) + '</span></button><div class="acc-b">' + body + '</div></section>';
  }

  function ringkasan(p, d, der) {
    var fm = App.fieldMap();
    var f = function (k) { return lkFormat(der[k], fm[k]); };
    return '<div class="kv">' +
      App.kv('Desa', App.desaName(p.desa_id)) + App.kv('Jenis Pengajuan', f('jenis_pengajuan')) +
      App.kv('Pengajuan Untuk', f('peran_catin')) + App.kv('Catin', (d[(p.peran_catin === 'SUAMI' ? 'suami' : 'istri') + '_nama'] || '–')) +
      App.kv('Pasangan', p.nama_pasangan || '–') + App.kv('Hari, Tanggal Akad', d.akad_tanggal ? lkHari(d.akad_tanggal) + ', ' + lkTanggalPanjang(d.akad_tanggal) : '–') +
      App.kv('Jam & Tempat Akad', [d.akad_jam, d.akad_tempat].filter(Boolean).join(' · ') || '–') + App.kv('Nomor / Tanggal Surat Desa', (d.adm_nomor_surat || '–') + ' / ' + (d.adm_tanggal_surat ? lkTanggalPanjang(d.adm_tanggal_surat) : '–')) +
      App.kv('Umur saat Akad', 'Suami ' + (der.suami_umur_saat_akad || '–') + ' th · Istri ' + (der.istri_umur_saat_akad || '–') + ' th') +
      App.kv('Pengajuan Pasangan', data.pasangan ? data.pasangan.pengajuan_id + ' · ' + data.pasangan.nama_catin + ' (' + App.desaName(data.pasangan.desa_id) + ', ' + data.pasangan.status + ')' : 'Belum tertaut') +
      App.kv('Dibuat', UI.waktu(p.dibuat_pada) + ' — ' + p.dibuat_oleh) + App.kv('Terakhir Diubah', UI.waktu(p.diubah_pada) + ' — ' + p.diubah_oleh) +
      App.kv('Dikunci', p.dikunci_pada ? UI.waktu(p.dikunci_pada) : '–') + App.kv('Koreksi oleh KUA', (p.jumlah_koreksi_kua || 0) + ' kali') +
      '</div>';
  }

  function groupsView(d, der, step, tabs) {
    var fs = App.fields().filter(function (f) { return lkBool(f.aktif) && !f.turunan; });
    var groups = LK_GROUPS.filter(function (g) { return g.step === step; });
    var parts = groups.map(function (g) {
      var list = fs.filter(function (f) { return f.grup === g.key && lkVisible(f, der); });
      if (!list.length) return null;
      return { g: g, html: '<div class="kv">' + list.map(function (f) { return App.kv(f.label, lkFormat(d[f.field_key], f)); }).join('') + '</div>' };
    }).filter(Boolean);
    if (!parts.length) return step === 4 ? '<p class="muted">Tidak ada kondisi khusus (catin bukan duda/janda).</p>' : '<p class="muted">Belum ada data.</p>';
    if (!tabs) return parts.map(function (x) { return '<div class="caption mt-s" style="margin-bottom:10px">' + esc(x.g.label || x.g.key) + '</div>' + x.html; }).join('<hr style="border:0;border-top:1px solid var(--border);margin:16px 0">');
    return '<div class="subtabs" style="margin:0 -20px 16px;border-top:1px solid var(--border)">' + parts.map(function (x, i) { return '<button class="subtab' + (i ? '' : ' active') + '" data-dtab="' + i + '">' + esc(x.g.key) + '</button>'; }).join('') + '</div>' +
      parts.map(function (x, i) { return '<div data-dpane="' + i + '"' + (i ? ' class="hidden"' : '') + '>' + x.html + '</div>'; }).join('');
  }

  function dokumenView() {
    var docs = data.dokumen || [];
    if (!docs.length) return '<p class="muted">Dokumen dibuat setelah desa menekan <b>Simpan &amp; Siap Cetak</b>.</p>';
    var alasan = { AWAL: 'Awal', KOREKSI_KUA: 'Koreksi KUA', REVISI_DESA: 'Revisi Desa' };
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Surat</th><th class="c">Versi</th><th class="c">Template</th><th>Dibuat</th><th>Keterangan</th><th class="c">Aksi</th></tr></thead><tbody>' +
      docs.slice().sort(function (a, b) { return Pengajuan.tplOrder(a.template_kode) - Pengajuan.tplOrder(b.template_kode) || Number(b.versi_dokumen) - Number(a.versi_dokumen); }).map(function (d) {
        return '<tr style="' + (d.aktif ? '' : 'color:var(--muted)') + '"><td class="nm"><b>' + esc(d.template_kode) + '</b> ' + esc(d.template_nama) + '</td><td class="c"><span class="pill ' + (d.aktif ? 's-OK' : 's-NEUTRAL') + '">v' + esc(d.versi_dokumen) + '</span></td>' +
          '<td class="c">v' + esc(d.template_versi) + '</td><td class="nowrap">' + UI.waktu(d.dibuat_pada) + '<span class="sub">' + esc(d.dibuat_oleh) + '</span></td>' +
          '<td>' + esc(alasan[d.alasan] || d.alasan) + ' ' + (d.aktif ? '<span class="tag">Aktif</span>' : '<span class="tag gray">Usang</span>') + '</td>' +
          '<td class="c"><button class="btn btn-sm" data-dl="' + esc(d.dokumen_id) + '">' + icon('download', 15) + 'Unduh</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var AKSI = {
    BUAT_PENGAJUAN: 'Membuat draf', SIMPAN_SIAP_CETAK: 'Simpan & Siap Cetak (dikunci)', KOREKSI_KUA: 'Koreksi oleh KUA', EDIT_KUA: 'Diedit KUA',
    REVISI_DESA: 'Revisi oleh desa', KEMBALIKAN_KE_DESA: 'Dikembalikan ke desa', BATALKAN: 'Dibatalkan', AKTIFKAN_KEMBALI: 'Diaktifkan kembali',
    SUDAH_CETAK_ULANG: 'Ditandai sudah dicetak ulang', BUAT_PASANGAN: 'Dibuat dari pengajuan pasangan', TAUTKAN_PASANGAN: 'Ditautkan dengan pasangan'
  };
  function riwayatView() {
    var list = data.riwayat || [];
    if (!list.length) return '<p class="muted">Belum ada riwayat.</p>';
    var fm = App.fieldMap();
    return '<div class="timeline">' + list.map(function (a) {
      var ch = lkJson(a.perubahan_json, null), diff = '';
      if (ch && typeof ch === 'object') {
        var keys = Object.keys(ch).filter(function (k) { return Array.isArray(ch[k]); });
        if (keys.length) diff = '<div class="diff">' + keys.slice(0, 20).map(function (k) {
          return '<div><b>' + esc(fm[k] ? fm[k].label : k) + ':</b> <s>' + esc(ch[k][0] || '(kosong)') + '</s> → <ins>' + esc(ch[k][1] || '(kosong)') + '</ins></div>';
        }).join('') + (keys.length > 20 ? '<div class="muted">… ' + (keys.length - 20) + ' perubahan lain</div>' : '') + '</div>';
      }
      return '<div class="tl"><div class="w">' + UI.waktu(a.waktu) + ' · ' + esc(a.nama_operator || a.aktor_peran) + '</div><div class="a">' + esc(AKSI[a.aksi] || a.aksi) + '</div>' +
        (a.alasan ? '<div>Alasan/catatan: ' + esc(a.alasan) + '</div>' : '') + diff + '</div>';
    }).join('') + '</div>';
  }

  function bind(p) {
    var o = el();
    o.querySelector('[data-x]').onclick = function () { close(); };
    UI.$$('[data-acc]', o).forEach(function (s) {
      s.querySelector('.acc-h').onclick = function () { s.classList.toggle('open'); openSec[s.dataset.acc] = s.classList.contains('open'); };
    });
    UI.$$('[data-dtab]', o).forEach(function (b) {
      b.onclick = function () {
        var box = b.closest('.acc-b');
        UI.$$('[data-dtab]', box).forEach(function (x) { x.classList.toggle('active', x === b); });
        UI.$$('[data-dpane]', box).forEach(function (x) { x.classList.toggle('hidden', x.dataset.dpane !== b.dataset.dtab); });
      };
    });
    var pr = o.querySelector('[data-print]');
    if (pr) pr.onclick = function () { Pengajuan.printPackage(p.pengajuan_id, pr); };
    var rt = o.querySelector('[data-return]');
    if (rt) rt.onclick = function () { Pengajuan.returnToDesa(p); };
    var ra = o.querySelector('[data-reactivate]');
    if (ra) ra.onclick = function () { Pengajuan.reactivate(p); };
    var gen = o.querySelector('[data-gen]');
    if (gen) gen.onclick = async function () { await Pengajuan.generateDocs(p.pengajuan_id, data.dokumen_perlu, 'Membuat dokumen'); reload(); };
    var rp = o.querySelector('[data-reprinted]');
    if (rp) rp.onclick = function () {
      UI.busy(rp, async function () {
        var r = await API.call('markReprinted', { id: p.pengajuan_id });
        if (!r.success) return UI.toast(r.message, 'error');
        App.upsertRow(r.data.row); UI.toast(r.message); reload();
      });
    };
    o.querySelector('[data-more]').onclick = function (e) { Pengajuan.actionMenu(p, e.currentTarget); };
    UI.$$('[data-dl]', o).forEach(function (b) {
      b.onclick = function () { var d = data.dokumen.find(function (x) { return x.dokumen_id === b.dataset.dl; }); Pengajuan.downloadDoc(d, b); };
    });
  }

  return { open: open, close: close, reload: reload, currentId: function () { return cur; } };
})();
