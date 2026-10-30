/* =====================================================================
 * KUA-Link — pengajuan.js
 * Daftar pengajuan, menu aksi, cetak paket PDF, pembuat dokumen, detail.
 * ===================================================================== */
var Pengajuan = (function () {
  var esc = UI.esc, icon = UI.icon;
  var F = { id: '', nik: '', nama: '', jenis: '', status: '', desa: '', dari: '', sampai: '', q: '' };
  var page = 1, PAGE = 20, collapsed = false, lastParamsKey = '';

  function jenisLabel(v) { return v === 'REKOMENDASI_KELUAR' ? 'Rekomendasi (Luar Wilayah)' : v === 'NIKAH_DI_KUA' ? 'Nikah di Wilayah' : '–'; }
  function peranLabel(v) { var x = LK_PERAN.find(function (o) { return o.v === v; }); return x ? x.l.replace('Calon Suami & Calon Istri', 'Suami & Istri') : '–'; }
  function find(id) { return S.list.find(function (p) { return p.pengajuan_id === id; }); }

  function applyFilter(list) {
    var q = F.q.toLowerCase(), nama = F.nama.toLowerCase();
    return list.filter(function (p) {
      if (F.status && p.status !== F.status) return false;   // default: semua status, yang batal tetap tampil (status Batal)
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

  var STATUS_OPTS = [{ v: 'DRAF', l: 'Draf (belum lengkap)' }, { v: 'SELESAI', l: 'Siap Cetak' }, { v: 'DIBATALKAN', l: 'Batal' }];
  var TITLES = { DRAF: 'Draf', SELESAI: 'Siap Cetak', DIBATALKAN: 'Batal' };

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
    main.innerHTML = App.pageHead('Beranda / Riwayat Pengajuan', 'RIWAYAT PENGAJUAN', F.status ? TITLES[F.status] : 'Semua Status') +
      '<div class="stack"><div class="card filter-card' + (collapsed ? ' collapsed' : '') + '" id="lf"><div class="fhead"><span class="t">' + icon('filter', 16) + 'Filter Pencarian</span><span class="sep"></span>' +
      '<span class="caption hide-sm">Data Pengajuan</span><button class="toggle" data-toggle>' + (collapsed ? '▾ Tampilkan' : '▴ Sembunyikan') + '</button></div><div class="fbody"><div class="filter-grid">' +
      fi('id', 'No. Pengajuan', 'cth. LK-2026-00125') + fi('nik', 'NIK Catin', '16 digit NIK', 'numeric') + fi('nama', 'Nama Catin', 'min. 3 karakter') +
      '<div class="field"><label>Jenis</label><select class="select" data-f="jenis">' + UI.options([{ v: 'NIKAH_DI_KUA', l: 'Nikah di Wilayah' }, { v: 'REKOMENDASI_KELUAR', l: 'Rekomendasi (Luar Wilayah)' }], F.jenis, 'Semua') + '</select></div>' +
      '<div class="field"><label>Status</label><select class="select" data-f="status">' + UI.options(STATUS_OPTS, F.status, 'Semua Status') + '</select></div>' +
      (kua ? '<div class="field"><label>Desa</label><select class="select" data-f="desa">' + UI.options(S.master.desa.map(function (d) { return { v: d.desa_id, l: d.nama_desa }; }), F.desa, 'Semua Desa') + '</select></div>' : '') +
      '<div class="field"><label>Tgl Akad Dari</label><input class="input" type="date" data-f="dari" value="' + esc(F.dari) + '"></div>' +
      '<div class="field"><label>Tgl Akad Sampai</label><input class="input" type="date" data-f="sampai" value="' + esc(F.sampai) + '"></div>' +
      '<div class="actions"><button class="btn" data-reset>Reset</button><button class="btn btn-primary" data-apply>' + icon('search', 16) + 'Tampilkan</button></div>' +
      '</div>' + (F.q ? '<div class="banner neutral mt-s">' + icon('search') + '<div class="txt">Pencarian cepat: <b>' + esc(F.q) + '</b></div><a href="#" data-clearq>Hapus</a></div>' : '') + '</div></div>' +
      '<div class="row">' + (kua ? '' : '<a class="btn btn-primary btn-gold" href="#/form/new" style="height:44px">' + icon('plus') + 'Pengajuan Baru</a>') +
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
          '<td class="c" data-l="Peran">' + (p.peran_catin ? '<span class="pill s-NEUTRAL">' + esc(peranLabel(p.peran_catin)) + '</span>' : '–') + '</td>' +
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
    var items = [{ label: 'Lihat Detail', icon: 'eye', onClick: function () { App.go('#/detail/' + p.pengajuan_id); } }];
    items.push({ label: kua ? 'Edit Data (KUA)' : 'Edit', icon: 'pencil', disabled: st === 'DIBATALKAN', title: st === 'DIBATALKAN' ? 'Aktifkan kembali dulu' : '', onClick: function () { App.go('#/form/' + p.pengajuan_id); } });
    items.push({ label: 'Cetak Paket PDF', icon: 'printer', disabled: !(st === 'SELESAI' || st === 'DIBATALKAN'), title: st === 'DRAF' ? 'Lengkapi data lalu tekan Simpan & Cetak di langkah Validasi' : '', onClick: function () { printPackage(p.pengajuan_id); } });
    if (!kua) items.push({ label: 'Kirim ke KUA (WhatsApp)', icon: 'send', disabled: st !== 'SELESAI', title: st === 'DRAF' ? 'Lengkapi data lalu Simpan & Cetak' : '', onClick: function () { kirimKua(p.pengajuan_id); } });
    if (kua) items.push({ label: 'Tautkan Pasangan', icon: 'link', disabled: st === 'DIBATALKAN' || p.peran_catin === 'SUAMI_ISTRI', onClick: function () { linkPartner(p); } });
    items.push('-');
    if (st === 'DIBATALKAN') items.push({ label: 'Aktifkan Kembali', icon: 'rotate', onClick: function () { reactivate(p); } });
    else items.push({ label: 'Batalkan (status: Batal)', icon: 'xCircle', danger: true, onClick: function () { cancel(p); } });
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
  /** v1.5.2: PDF hasil generateDoc disimpan di memori → paket digabung tanpa mengunduh ulang setiap surat. */
  var PDF_CACHE = {};
  var PARALEL = 3;   // surat dibuat bersamaan (Apps Script melayani beberapa permintaan sekaligus)

  /**
   * Buat surat dengan progres. v1.5.2: 3 surat sekaligus (lebih cepat), PDF disimpan di memori.
   * opts.siapkan(): dijalankan sesudah 100% tanpa kegagalan (mis. menggabungkan paket) sebelum tombol Selesai.
   * opts.onSelesai(): dipanggil saat tombol Selesai DIKLIK (gestur pengguna → unduh & buka tab baru tidak diblokir).
   * Resolve {ok:[], gagal:[]}.
   */
  function generateDocs(id, kodes, title, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var tpl = {};
      S.master.templates.forEach(function (t) { if (lkBool(t.aktif)) tpl[t.kode] = t.nama; });
      var nm = function (key) { var x = lkSplitKey(key); return (tpl[x.kode] || '') + (x.untuk ? ' — ' + lkUntukLabel(x.untuk) : ''); };
      var state = kodes.map(function (k) { return { k: k, st: 'wait', msg: '' }; });
      var tahap = '';
      var m = UI.modal({ title: title || 'Membuat dokumen…', icon: 'fileCheck', sticky: true, body: '<div data-pb></div>', foot: '<button class="btn hidden" data-retry>' + icon('refresh') + 'Ulangi yang Gagal</button><button class="btn btn-primary hidden" data-done>Selesai</button>' });
      m.root.dataset.sticky = '1';
      m.root.querySelector('.x').remove();
      var draw = function () {
        var done = state.filter(function (s) { return s.st === 'ok'; }).length, total = state.length || 1;
        var pct = state.length ? Math.round(done / total * 100) : 100;
        m.root.querySelector('[data-pb]').innerHTML = '<div class="row" style="justify-content:space-between"><b>' + done + ' dari ' + state.length + ' surat</b><span class="muted">' + pct + '%</span></div>' +
          '<div class="progress mt-s"><div style="width:' + pct + '%"></div></div><div class="plist">' +
          state.map(function (s) {
            var ic = s.st === 'ok' ? '<span style="color:var(--emerald)">' + icon('check', 18) + '</span>' : s.st === 'run' ? '<span class="spin" style="display:inline-block;width:16px;height:16px;border:2px solid var(--emerald);border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span>' : s.st === 'fail' ? '<span style="color:var(--danger)">' + icon('xCircle', 18) + '</span>' : '<span class="muted">○</span>';
            return '<div><span class="st">' + ic + '</span><span><b>' + esc(lkSplitKey(s.k).kode) + '</b> ' + esc(nm(s.k)) + (s.msg ? ' <span class="muted">— ' + esc(s.msg) + '</span>' : '') + '</span></div>';
          }).join('') + '</div><p class="muted" style="font-size:12.5px;margin-bottom:0">' + (tahap ? esc(tahap) : (state.length ? PARALEL + ' surat dibuat bersamaan. Jangan tutup halaman ini.' : 'Semua surat sudah sesuai data terbaru.')) + '</p>';
      };
      var satu = async function (s) {
        s.st = 'run'; s.msg = ''; draw();
        var r = await API.call('generateDoc', { id: id, kode: s.k }, { timeout: 120000 });
        if (r.success) {
          s.st = 'ok'; s.msg = 'v' + r.data.versi_dokumen;
          if (r.data.pdf_base64) PDF_CACHE[r.data.dokumen_id] = r.data.pdf_base64;
        } else { s.st = 'fail'; s.msg = r.message; }
        draw();
      };
      var run = async function () {
        m.root.querySelector('[data-retry]').classList.add('hidden');
        m.root.querySelector('[data-done]').classList.add('hidden');
        var antre = state.filter(function (s) { return s.st !== 'ok'; });
        var pekerja = function () { var s = antre.shift(); return s ? satu(s).then(pekerja) : Promise.resolve(); };
        var jalan = [];
        for (var i = 0; i < Math.min(PARALEL, antre.length); i++) jalan.push(pekerja());
        await Promise.all(jalan);
        var gagal = state.filter(function (s) { return s.st === 'fail'; });
        var d = m.root.querySelector('[data-done]');
        if (gagal.length) {
          m.root.querySelector('[data-retry]').classList.remove('hidden');
          d.classList.remove('hidden');
          d.textContent = 'Tutup';
          return;
        }
        // 100%: siapkan paket (bila diminta) lalu tampilkan tombol Selesai
        if (opts.siapkan) {
          tahap = 'Menggabungkan paket PDF…'; draw();
          try { await opts.siapkan(); tahap = 'Paket PDF siap. Tekan Selesai untuk mengunduh & membuka paket.'; }
          catch (e) { tahap = 'Paket belum bisa digabung: ' + (e && e.message ? e.message : e) + ' — bisa diulang lewat Cetak Paket PDF.'; }
          draw();
        }
        d.classList.remove('hidden');
        d.textContent = 'Selesai';
        d.focus();
      };
      var selesai = function () {
        if (opts.onSelesai && !state.some(function (s) { return s.st === 'fail'; })) { try { opts.onSelesai(); } catch (e) { /* abaikan */ } }
        m.close();
        resolve({ ok: state.filter(function (s) { return s.st === 'ok'; }).map(function (s) { return s.k; }), gagal: state.filter(function (s) { return s.st === 'fail'; }).map(function (s) { return s.k; }) });
      };
      m.root.querySelector('[data-retry]').onclick = run;
      m.root.querySelector('[data-done]').onclick = selesai;
      draw();
      run();
    });
  }

  /* ---------------- CETAK PAKET ---------------- */
  function tplOrder(kode) {
    var t = S.master.templates.find(function (x) { return x.kode === kode && lkBool(x.aktif); }) || S.master.templates.find(function (x) { return x.kode === kode; });
    return t ? Number(t.urutan_paket) || 99 : 99;
  }
  /** Urutkan dokumen: urutan paket, lalu calon suami sebelum calon istri. */
  function sortDocs(list) {
    var ord = { '': 0, suami: 1, istri: 2 };
    return list.slice().sort(function (a, b) { return tplOrder(a.template_kode) - tplOrder(b.template_kode) || (ord[a.untuk || ''] - ord[b.untuk || '']) || Number(b.versi_dokumen) - Number(a.versi_dokumen); });
  }

  /** Gabungkan semua surat aktif → Blob PDF. Melempar Error bila gagal. */
  async function buildPackage(id, st) {
    st = st || await API.call('docsStatus', { id: id });
    if (!st.success) throw new Error(st.message);
    var aktif = sortDocs(st.data.dokumen.filter(function (d) { return d.aktif; }));
    if (!aktif.length) throw new Error('Belum ada dokumen untuk dicetak.');
    // v1.5.2: surat yang baru dibuat sudah ada di memori → hanya surat lama yang diunduh
    var pdfs = await Promise.all(aktif.map(function (d) {
      return PDF_CACHE[d.dokumen_id] ? Promise.resolve({ success: true, data: { base64: PDF_CACHE[d.dokumen_id] } }) : API.call('getDocPdf', { dokumen_id: d.dokumen_id });
    }));
    var bad = pdfs.find(function (r) { return !r.success; });
    if (bad) throw new Error(bad.message);
    var batal = (find(id) || {}).status === 'DIBATALKAN' || pdfs.some(function (r) { return r.data.dibatalkan; });
    return UI.mergePdf(pdfs.map(function (r) { return { base64: r.data.base64 }; }), batal ? 'DIBATALKAN' : '');
  }

  async function printPackage(id, btn, regenerated) {
    var win = UI.preOpen();
    var work = async function () {
      var st = await API.call('docsStatus', { id: id });
      if (!st.success) { if (win) win.close(); return UI.toast(st.message, 'error'); }
      var p = find(id) || {};
      if (p.status === 'DRAF') { if (win) win.close(); return UI.toast('Data belum lengkap. Buka Edit → langkah Validasi → Simpan & Cetak.', 'warning'); }
      if (st.data.dokumen_perlu.length && p.status === 'SELESAI') {
        if (win) win.close();
        var ok = await UI.confirm({ title: 'Perbarui surat?', icon: 'fileCheck', message: 'Surat berikut belum dibuat / belum sesuai data terbaru: ' + st.data.dokumen_perlu.join(', ') + '. Buat sekarang, lalu cetak?', ok: 'Buat & Cetak' });
        if (!ok) return;
        await generateDocs(id, st.data.dokumen_perlu, 'Melengkapi dokumen ' + id);
        if (window.Detail && Detail.currentId() === id) Detail.reload();
        return printPackage(id, null, true);
      }
      var blob = await buildPackage(id, st);
      UI.openBlob(blob, win, namaPaket(id));
      // Surat baru dibuat ulang (data berubah) → perbarui tautan PDF & data di KUA / Akad Tracker / LABUKU Desk di latar belakang
      if (regenerated && p.status === 'SELESAI') uploadPaket(id, blob).then(function (r) { if (r.success) UI.toast('Berkas di KUA ikut diperbarui.', 'info'); });
    };
    try { await (btn ? UI.busy(btn, work) : work()); } catch (e) { if (win) win.close(); UI.toast(e.message, 'error'); }
  }

  /** v1.5.2: nama berkas paket = Kode_Desa_Suami_Istri.pdf */
  function namaPaket(id) {
    var p = find(id) || {};
    var istri = p.peran_catin === 'ISTRI';
    var bersih = function (x) { return String(x || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim(); };
    return [id, bersih(App.desaName(p.desa_id)), bersih(istri ? p.nama_pasangan : p.nama_catin), bersih(istri ? p.nama_catin : p.nama_pasangan)].filter(Boolean).join('_') + '.pdf';
  }

  /* ---------------- KIRIM KE KUA (WhatsApp + Akad Tracker + LABUKU Desk) ---------------- */
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { reject(new Error('Gagal membaca berkas PDF.')); };
      fr.readAsDataURL(blob);
    });
  }
  async function uploadPaket(id, blob) {
    var b64 = await blobToBase64(blob);
    return API.call('savePaket', { id: id, base64: b64 }, { timeout: 120000 });
  }
  function waUrl(wa) { return 'https://wa.me/' + (wa && wa.nomor ? wa.nomor : '') + '?text=' + encodeURIComponent(wa ? wa.text : ''); }
  /** Buka WhatsApp; false bila diblokir browser (tampilkan tombol). */
  function openWa(wa) {
    var w = null;
    // Tanpa fitur "noopener": dengan noopener window.open selalu mengembalikan null (tak bisa tahu diblokir/tidak)
    try { w = window.open(waUrl(wa), '_blank'); if (w) w.opener = null; } catch (e) { w = null; }
    return !!w;
  }
  /** Ringkasan hasil kiriman ke aplikasi tujuan. */
  function integrasiHtml(list) {
    if (!list || !list.length) return '';
    return '<div class="doclist">' + list.map(function (h) {
      var ok = h.status === 'TERKIRIM', none = h.status === 'BELUM_DIATUR';
      return '<div class="docitem"><span class="ic" style="' + (ok ? '' : none ? 'color:var(--muted)' : 'color:var(--danger)') + '">' + icon(ok ? 'checkCircle' : none ? 'plug' : 'xCircle', 18) + '</span><div class="nm"><b>' + esc(h.nama) + ' — ' + esc(h.layanan) + '</b><span>' +
        (ok ? 'Terkirim' : none ? 'Belum disambungkan' : 'Gagal — dikirim ulang otomatis: ' + esc(h.pesan)) + '</span></div></div>';
    }).join('') + '</div>';
  }
  /** Dari menu aksi / detail: gabung PDF → unggah → kirim → buka WhatsApp KUA. */
  async function kirimKua(id, btn) {
    var p = find(id) || {};
    if (p.status !== 'SELESAI') return UI.toast('Hanya pengajuan Siap Cetak yang bisa dikirim ke KUA.', 'warning');
    var work = async function () {
      var st = await API.call('docsStatus', { id: id });
      if (!st.success) return UI.toast(st.message, 'error');
      if (st.data.dokumen_perlu.length) {
        await generateDocs(id, st.data.dokumen_perlu, 'Melengkapi dokumen ' + id);
        st = await API.call('docsStatus', { id: id });
      }
      var blob = await buildPackage(id, st);
      var r = await uploadPaket(id, blob);
      if (!r.success) return UI.toast(r.message, 'error');
      kirimModal(id, r.data);
    };
    try { await (btn ? UI.busy(btn, work) : work()); } catch (e) { UI.toast(e.message, 'error'); }
  }
  function kirimModal(id, res) {
    var opened = openWa(res.wa);
    var m = UI.modal({
      title: 'Kirim ke KUA', icon: 'send',
      body: '<p style="margin-top:0">' + (opened ? 'WhatsApp sudah dibuka — tekan <b>Kirim</b>.' : 'Buka WhatsApp dengan tombol hijau, lalu tekan <b>Kirim</b>.') + '</p>' +
        (res.wa && !res.wa.nomor ? '<div class="banner warn">' + icon('alert') + '<div class="txt">Nomor WhatsApp KUA belum diatur — pilih kontak KUA manual.</div></div>' : '') +
        (res.catatan_link ? '<div class="banner warn mt-s">' + icon('alert') + '<div class="txt">' + esc(res.catatan_link) + '</div></div>' : '') +
        integrasiHtml(res.integrasi) +
        '<div class="row mt-s" style="gap:8px;flex-wrap:wrap"><a class="btn btn-wa" href="' + esc(waUrl(res.wa)) + '" target="_blank" rel="noopener">' + icon('chat') + 'Buka WhatsApp KUA</a>' +
        '<a class="btn" href="' + esc(res.paket_url) + '" target="_blank" rel="noopener">' + icon('file') + 'Buka PDF</a>' +
        '<button class="btn" data-copy>' + icon('copy') + 'Salin Pesan</button></div>',
      foot: '<button class="btn btn-primary" data-close>Selesai</button>'
    });
    m.root.querySelector('[data-copy]').onclick = function () {
      try { navigator.clipboard.writeText(res.wa.text).then(function () { UI.toast('Pesan disalin.'); }); } catch (e) { UI.toast('Salin tidak didukung perangkat ini.', 'warning'); }
    };
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
          'No. Pengajuan': p.pengajuan_id, 'Desa': App.desaName(p.desa_id), 'Status': UI.STATUS_LABEL[p.status] || p.status,
          'Dibuat': p.dibuat_pada, 'Diubah': p.diubah_pada, 'Siap Cetak Sejak': p.dikunci_pada,
          'Diedit KUA': p.jumlah_koreksi_kua, 'Pasangan Tertaut': p.pasangan_pengajuan_id, 'Alasan Batal': p.alasan_batal
        };
        fs.forEach(function (f) {
          var v = p.data[f.field_key];
          o[f.label + ' [' + f.field_key + ']'] = v === undefined ? '' : (f.tipe === 'PILIHAN' ? lkOpsiLabel(f, v) : v);
        });
        return o;
      });
      await UI.exportXlsx('KUA-Link_Pengajuan_' + UI.today() + '.xlsx', [{ name: 'Pengajuan', rows: data }]);
      UI.toast(data.length + ' baris diekspor.');
    });
  }

  return {
    renderList: renderList, actionMenu: actionMenu, cancel: cancel, reactivate: reactivate,
    linkPartner: linkPartner, generateDocs: generateDocs, printPackage: printPackage, sortDocs: sortDocs, peranLabel: peranLabel,
    buildPackage: buildPackage, uploadPaket: uploadPaket, openWa: openWa, waUrl: waUrl, integrasiHtml: integrasiHtml, kirimKua: kirimKua, kirimModal: kirimModal,
    downloadDoc: downloadDoc, jenisLabel: jenisLabel, find: find, exportExcel: exportExcel, tplOrder: tplOrder, namaPaket: namaPaket
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
    var st = p.status;
    var o = el();
    var der = lkDerive(d, App.fields(), { id: p.pengajuan_id, desa: App.desaName(p.desa_id), kua: App.kuaName(), cfg: S.master.config });

    var actions = '';
    if (st === 'SELESAI' || st === 'DIBATALKAN') actions += '<button class="btn btn-primary btn-gold" data-print>' + icon('printer') + '<span>Cetak Paket PDF</span></button>';
    if (st === 'SELESAI' && !kua) actions += '<button class="btn btn-wa" data-kirim>' + icon('send') + '<span class="hide-sm">Kirim ke KUA</span></button>';
    if (st !== 'DIBATALKAN') actions += '<a class="btn' + (st === 'DRAF' ? ' btn-primary' : '') + '" href="#/form/' + esc(p.pengajuan_id) + '">' + icon('pencil') + '<span>' + (st === 'DRAF' ? 'Lanjutkan Mengisi' : kua ? 'Edit Data' : 'Edit') + '</span></a>';
    actions += '<button class="btn" data-more data-menu-anchor>' + icon('menu') + '<span class="hide-sm">Aksi Lain</span></button>';

    var banners = '';
    var ed = lastAudit('EDIT_KUA');
    if (ed && st !== 'DIBATALKAN') banners += '<div class="banner info">' + icon('printer') + '<div class="txt"><b>Data diubah KUA ' + UI.waktu(ed.waktu) + '.</b> Cetak ulang &amp; tanda tangan ulang.</div></div>';
    if (st === 'DRAF') banners += '<div class="banner warn">' + icon('pencil') + '<div class="txt"><b>Draf.</b> Lanjutkan mengisi lalu <b>Simpan &amp; Cetak</b>.</div></div>';
    if (st === 'DIBATALKAN') banners += '<div class="banner danger">' + icon('xCircle') + '<div class="txt"><b>Status Batal:</b> ' + esc(p.alasan_batal || '-') + '. Data tetap tersimpan.</div><button class="btn btn-sm" data-reactivate>' + icon('rotate', 15) + 'Aktifkan Kembali</button></div>';
    if (st === 'SELESAI' && data.dokumen_perlu && data.dokumen_perlu.length) banners += '<div class="banner neutral">' + icon('fileCheck') + '<div class="txt">Surat akan dibuat/diperbarui otomatis saat dicetak: <b>' + esc(data.dokumen_perlu.join(', ')) + '</b>.</div></div>';

    o.innerHTML = '<div class="ov-top"><div class="ttl"><b>Detail Pengajuan</b><span><span class="mono" style="color:var(--text);font-weight:600">' + esc(p.pengajuan_id) + '</span> · Desa ' + esc(App.desaName(p.desa_id)) + ' · ' + esc(Pengajuan.jenisLabel(p.jenis)) + '</span></div>' +
      '<div class="row hide-sm">' + UI.statusPills(p) + '</div><div class="end">' + actions + '<button class="btn btn-ghost btn-icon" data-x aria-label="Tutup">' + icon('x', 22) + '</button></div></div>' +
      '<div class="ov-scroll"><div class="ov-inner"><div class="stack" style="gap:12px">' + banners + '</div><div class="mt">' +
      acc('ringkas', 'file', 'Ringkasan', ringkasan(p, d, der)) +
      acc('jadwal', 'calendar', 'Jadwal Akad & Administrasi', groupsView(d, der, 1)) +
      acc('suami', 'user', 'Data Calon Suami', groupsView(d, der, 2)) +
      acc('istri', 'user', 'Data Calon Istri', groupsView(d, der, 3)) +
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
      App.kv('Pengajuan Untuk', f('peran_catin')) + App.kv('Calon Suami', d.suami_nama || '–') + App.kv('Calon Istri', d.istri_nama || '–') +
      App.kv('Hari, Tanggal Akad', d.akad_tanggal ? lkHari(d.akad_tanggal) + ', ' + lkTanggalPanjang(d.akad_tanggal) : '–') +
      App.kv('Jam & Tempat Akad', [d.akad_jam ? d.akad_jam + ' WIB' : '', d.akad_tempat].filter(Boolean).join(' · ') || '–') + App.kv('Modin', d.adm_modin || '–') + App.kv('Nomor / Tanggal Surat Desa', (d.adm_nomor_surat || '–') + ' / ' + (d.adm_tanggal_surat ? lkTanggalPanjang(d.adm_tanggal_surat) : '–')) +
      App.kv('Umur saat Akad', 'Suami ' + (der.suami_umur_saat_akad || '–') + ' th · Istri ' + (der.istri_umur_saat_akad || '–') + ' th') +
      App.kv('Pengajuan Pasangan', data.pasangan ? data.pasangan.pengajuan_id + ' · ' + data.pasangan.nama_catin + ' (' + App.desaName(data.pasangan.desa_id) + ', ' + data.pasangan.status + ')' : 'Belum tertaut') +
      App.kv('Dibuat', UI.waktu(p.dibuat_pada) + ' — ' + p.dibuat_oleh) + App.kv('Terakhir Diubah', UI.waktu(p.diubah_pada) + ' — ' + p.diubah_oleh) +
      App.kv('Siap Cetak Sejak', p.dikunci_pada ? UI.waktu(p.dikunci_pada) : '–') + App.kv('Diedit oleh KUA', (p.jumlah_koreksi_kua || 0) + ' kali') +
      '</div>';
  }

  function groupsView(d, der, step) {
    var fs = App.fields().filter(function (f) { return lkBool(f.aktif) && !f.turunan; });
    var groups = LK_GROUPS.filter(function (g) { return g.step === step; });
    var parts = groups.map(function (g) {
      var list = fs.filter(function (f) { return f.grup === g.key && lkVisible(f, der); });
      if (g.key === 'Wali Nikah' && der.wali_jenis === 'Nasab' && der.wali_hubungan === LK_WALI_AYAH) {
        list = list.concat(['wali_nama', 'wali_bin', 'wali_nik'].map(function (k) { return App.fieldMap()[k]; }).filter(Boolean));
      }
      if (!list.length) return null;
      return '<div class="caption mt-s" style="margin-bottom:10px">' + esc(g.label || g.key.replace(/^(Ayah|Ibu) (Suami|Istri)$/, '$1 Calon $2')) + '</div><div class="kv">' +
        list.map(function (f) { return App.kv(f.label, lkFormat(/_nama$/.test(f.field_key) ? der[f.field_key] : (d[f.field_key] !== undefined ? d[f.field_key] : der[f.field_key]), f)); }).join('') + '</div>';
    }).filter(Boolean);
    return parts.length ? parts.join('<hr style="border:0;border-top:1px solid var(--border);margin:16px 0">') : '<p class="muted">Belum ada data.</p>';
  }

  function dokumenView() {
    var docs = data.dokumen || [];
    if (!docs.length) return '<p class="muted">Surat dibuat saat menekan <b>Simpan &amp; Cetak</b> di langkah Validasi.</p>';
    var alasan = { AWAL: 'Awal', EDIT_KUA: 'Diedit KUA', EDIT_DESA: 'Diedit Desa', KOREKSI_KUA: 'Koreksi KUA', REVISI_DESA: 'Revisi Desa' };
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Surat</th><th class="c">Versi</th><th class="c">Template</th><th>Dibuat</th><th>Keterangan</th><th class="c">Aksi</th></tr></thead><tbody>' +
      Pengajuan.sortDocs(docs).map(function (d) {
        return '<tr style="' + (d.aktif ? '' : 'color:var(--muted)') + '"><td class="nm"><b>' + esc(d.template_kode) + '</b> ' + esc(d.template_nama) + (d.untuk ? '<span class="sub">' + esc(lkUntukLabel(d.untuk)) + '</span>' : '') + '</td><td class="c"><span class="pill ' + (d.aktif ? 's-OK' : 's-NEUTRAL') + '">v' + esc(d.versi_dokumen) + '</span></td>' +
          '<td class="c">v' + esc(d.template_versi) + '</td><td class="nowrap">' + UI.waktu(d.dibuat_pada) + '<span class="sub">' + esc(d.dibuat_oleh) + '</span></td>' +
          '<td>' + esc(alasan[d.alasan] || d.alasan) + ' ' + (d.aktif ? '<span class="tag">Aktif</span>' : '<span class="tag gray">Usang</span>') + '</td>' +
          '<td class="c"><button class="btn btn-sm" data-dl="' + esc(d.dokumen_id) + '">' + icon('download', 15) + 'Unduh</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var AKSI = {
    BUAT_PENGAJUAN: 'Membuat draf', SIMPAN_CETAK: 'Simpan & Cetak (siap cetak)', EDIT_KUA: 'Diedit KUA', EDIT_DESA: 'Diedit desa',
    BATALKAN: 'Dibatalkan (status Batal)', KIRIM_KUA: 'Dikirim ke KUA (WhatsApp / Akad Tracker / LABUKU Desk)', AKTIFKAN_KEMBALI: 'Diaktifkan kembali',
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
    var kr = o.querySelector('[data-kirim]');
    if (kr) kr.onclick = function () { Pengajuan.kirimKua(p.pengajuan_id, kr); };
    var ra = o.querySelector('[data-reactivate]');
    if (ra) ra.onclick = function () { Pengajuan.reactivate(p); };
    o.querySelector('[data-more]').onclick = function (e) { Pengajuan.actionMenu(p, e.currentTarget); };
    UI.$$('[data-dl]', o).forEach(function (b) {
      b.onclick = function () { var d = data.dokumen.find(function (x) { return x.dokumen_id === b.dataset.dl; }); Pengajuan.downloadDoc(d, b); };
    });
  }

  return { open: open, close: close, reload: reload, currentId: function () { return cur; } };
})();
