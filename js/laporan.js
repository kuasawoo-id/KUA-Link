/* =====================================================================
 * KUA-Link — laporan.js : Riwayat Aktivitas, Riwayat Login & Arsip (KUA)
 * (Laporan rekapitulasi kini menjadi satu dengan Dashboard.)
 * ===================================================================== */
var Laporan = (function () {
  var esc = UI.esc, icon = UI.icon;

  /* =================================================================
   * RIWAYAT & ARSIP (KUA)
   * ================================================================= */
  var tab = 'aktivitas', cache = { audit: null, login: null, arsip: null };
  var AF = { q: '', aksi: '', desa: '' }, LF = { desa: '', hasil: '' };
  var AKSI_LABEL = {
    BUAT_PENGAJUAN: 'Membuat draf', SIMPAN_CETAK: 'Simpan & Cetak', EDIT_KUA: 'Edit oleh KUA', EDIT_DESA: 'Edit oleh desa',
    BATALKAN: 'Batalkan (status Batal)', KIRIM_KUA: 'Kirim ke KUA', UBAH_INTEGRASI: 'Ubah pengaturan integrasi', AKTIFKAN_KEMBALI: 'Aktifkan kembali', UBAH_PROFIL: 'Ubah profil akun', UBAH_PROFIL_DESA: 'Ubah data desa',
    SIMPAN_LIBUR: 'Simpan hari libur', HAPUS_LIBUR: 'Hapus hari libur',
    BUAT_PASANGAN: 'Buat pengajuan pasangan', TAUTKAN_PASANGAN: 'Tautkan pasangan', GANTI_PASSWORD: 'Ganti password', RESET_PASSWORD: 'Reset password',
    BUAT_AKUN: 'Buat akun', UBAH_AKUN: 'Ubah akun', BUKA_KUNCI_AKUN: 'Buka kunci akun', SIMPAN_DESA: 'Simpan desa', TAMBAH_FIELD: 'Tambah field',
    UBAH_FIELD: 'Ubah field', AKTIFKAN_FIELD: 'Aktifkan field', NONAKTIFKAN_FIELD: 'Nonaktifkan field', AKTIFKAN_TEMPLATE: 'Aktifkan template',
    AKTIFKAN_VERSI_TEMPLATE: 'Aktifkan versi template', NONAKTIFKAN_TEMPLATE: 'Nonaktifkan template', SIMPAN_ATURAN: 'Simpan aturan', SIMPAN_PERINGATAN: 'Simpan peringatan',
    ARSIPKAN_TAHUN: 'Arsipkan tahun', HAPUS_PERMANEN_ARSIP: 'Hapus permanen arsip', ARSIPKAN_RIWAYAT_LOGIN: 'Arsipkan riwayat login'
  };

  function riwayat(main, params, soft) {
    if (!soft) cache = { audit: null, login: null, arsip: null };
    var tabs = [['aktivitas', 'Riwayat Aktivitas'], ['login', 'Riwayat Login']];
    if (App.isAdmin()) tabs.push(['arsip', 'Arsip Data']);
    main.innerHTML = App.pageHead('Beranda / Riwayat & Arsip', 'RIWAYAT & ARSIP') +
      '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab' + (tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div data-tb></div>';
    App.bindRefresh(main);
    UI.$$('[data-tab]', main).forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; riwayat(main, params, true); }; });
    var box = main.querySelector('[data-tb]');
    if (tab === 'aktivitas') aktivitas(box); else if (tab === 'login') login(box); else arsip(box);
  }

  async function aktivitas(box) {
    if (!cache.audit) {
      box.innerHTML = '<div class="card"><table class="tbl"><tbody>' + UI.skeletonRows(8, 5) + '</tbody></table></div>';
      var r = await API.call('listAudit', { limit: 1000 });
      if (!r.success) { box.innerHTML = '<div class="banner danger">' + esc(r.message) + '</div>'; return; }
      cache.audit = r.data;
    }
    var fm = App.fieldMap();
    var aksiList = Object.keys(cache.audit.reduce(function (o, a) { o[a.aksi] = 1; return o; }, {})).sort();
    var draw = function () {
      var q = AF.q.toLowerCase();
      var list = cache.audit.filter(function (a) {
        if (AF.aksi && a.aksi !== AF.aksi) return false;
        if (AF.desa && a.desa_id !== AF.desa) return false;
        if (q && [a.entitas_id, a.nama_operator, a.alasan, a.aksi].join(' ').toLowerCase().indexOf(q) < 0) return false;
        return true;
      }).slice(0, 300);
      box.querySelector('[data-list]').innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Objek</th><th>Alasan / Catatan</th></tr></thead><tbody>' +
        (list.map(function (a, i) {
          var ch = lkJson(a.perubahan_json, null), keys = ch && typeof ch === 'object' ? Object.keys(ch).filter(function (k) { return Array.isArray(ch[k]); }) : [];
          return '<tr><td class="nowrap">' + UI.waktu(a.waktu) + '</td><td>' + esc(a.nama_operator || a.aktor_peran) + '<span class="sub">' + esc(a.aktor_peran) + (a.desa_id ? ' · ' + esc(App.desaName(a.desa_id)) : '') + '</span></td>' +
            '<td>' + esc(AKSI_LABEL[a.aksi] || a.aksi) + (keys.length ? ' <button class="btn btn-xs" data-exp="' + i + '">' + keys.length + ' perubahan ▾</button>' : '') + '</td>' +
            '<td>' + (/^LK-/.test(a.entitas_id) ? '<a class="mono" href="#/detail/' + esc(a.entitas_id) + '">' + esc(a.entitas_id) + '</a>' : esc(a.entitas + ' ' + a.entitas_id)) + '</td><td>' + esc(a.alasan || '') + '</td></tr>' +
            (keys.length ? '<tr class="hidden" data-row="' + i + '"><td colspan="5"><div class="diff">' + keys.map(function (k) { return '<div><b>' + esc(fm[k] ? fm[k].label : k) + ':</b> <s>' + esc(ch[k][0] || '(kosong)') + '</s> → <ins>' + esc(ch[k][1] || '(kosong)') + '</ins></div>'; }).join('') + '</div></td></tr>' : '');
        }).join('') || '<tr><td colspan="5" class="tbl-empty">Tidak ada aktivitas.</td></tr>') + '</tbody></table></div><div class="tbl-foot"><span class="muted">Menampilkan ' + list.length + ' dari ' + cache.audit.length + ' aktivitas terbaru</span></div>';
      UI.$$('[data-exp]', box).forEach(function (b) { b.onclick = function () { box.querySelector('[data-row="' + b.dataset.exp + '"]').classList.toggle('hidden'); }; });
    };
    box.innerHTML = '<div class="stack"><div class="card filter-card"><div class="fbody"><div class="filter-grid" style="grid-template-columns:2fr 1fr 1fr auto">' +
      '<div class="field"><label>Cari</label><input class="input" data-af="q" value="' + esc(AF.q) + '" placeholder="No. pengajuan, operator, alasan"></div>' +
      '<div class="field"><label>Aksi</label><select class="select" data-af="aksi">' + UI.options(aksiList.map(function (a) { return { v: a, l: AKSI_LABEL[a] || a }; }), AF.aksi, 'Semua Aksi') + '</select></div>' +
      '<div class="field"><label>Desa</label><select class="select" data-af="desa">' + UI.options(S.master.desa.map(function (d) { return { v: d.desa_id, l: d.nama_desa }; }), AF.desa, 'Semua') + '</select></div>' +
      '<div class="field"><label>&nbsp;</label><button class="btn" data-xls>' + icon('sheet') + 'Ekspor</button></div></div></div></div><div class="card" data-list></div></div>';
    UI.$$('[data-af]', box).forEach(function (x) { x.addEventListener(x.tagName === 'INPUT' ? 'input' : 'change', UI.debounce(function () { AF[x.dataset.af] = x.value; draw(); }, 200)); });
    box.querySelector('[data-xls]').onclick = function () {
      UI.busy(this, function () {
        return UI.exportXlsx('KUA-Link_Riwayat_' + UI.today() + '.xlsx', [{ name: 'Riwayat Aktivitas', rows: cache.audit.map(function (a) { return { Waktu: a.waktu, Peran: a.aktor_peran, Pelaku: a.nama_operator, Desa: App.desaName(a.desa_id), Aksi: AKSI_LABEL[a.aksi] || a.aksi, Objek: a.entitas + ' ' + a.entitas_id, Alasan: a.alasan, Perubahan: a.perubahan_json }; }) }]);
      });
    };
    draw();
  }

  function ua(s) {
    s = String(s || '');
    var os = /Windows/.test(s) ? 'Windows' : /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iOS' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'Lainnya';
    var br = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : '';
    return os + (br ? ' · ' + br : '');
  }

  async function login(box) {
    if (!cache.login) {
      box.innerHTML = '<div class="card"><table class="tbl"><tbody>' + UI.skeletonRows(8, 5) + '</tbody></table></div>';
      var r = await API.call('listLoginLog', { limit: 1000 });
      if (!r.success) { box.innerHTML = '<div class="banner danger">' + esc(r.message) + '</div>'; return; }
      cache.login = r.data;
    }
    var hasilPill = { SUKSES: '<span class="pill s-OK">Sukses</span>', GAGAL: '<span class="pill s-DIBATALKAN">Gagal</span>', TERKUNCI: '<span class="pill s-WARN">Terkunci</span>' };
    var draw = function () {
      var list = cache.login.filter(function (l) { return (!LF.desa || l.desa_id === LF.desa) && (!LF.hasil || l.hasil === LF.hasil); });
      box.querySelector('[data-list]').innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Desa / Akun</th><th>Nama Operator</th><th>Perangkat</th><th class="c">Hasil</th></tr></thead><tbody>' +
        (list.slice(0, 400).map(function (l) {
          return '<tr><td class="nowrap">' + UI.waktu(l.waktu) + '</td><td>' + esc(l.desa_id ? App.desaName(l.desa_id) : 'KUA') + '<span class="sub mono">' + esc(l.username) + '</span></td><td>' + esc(l.nama_operator || '–') + '</td><td title="' + esc(l.perangkat) + '">' + esc(ua(l.perangkat)) + '</td><td class="c">' + (hasilPill[l.hasil] || esc(l.hasil)) + '</td></tr>';
        }).join('') || '<tr><td colspan="5" class="tbl-empty">Tidak ada data.</td></tr>') + '</tbody></table></div><div class="tbl-foot"><span class="muted">' + list.length + ' catatan login</span></div>';
    };
    box.innerHTML = '<div class="stack"><div class="banner neutral">' + icon('info') + '<div class="txt">Akun desa dipakai bersama, sehingga riwayat mencatat <b>desa</b>, nama operator yang diisi saat masuk (tidak diverifikasi), dan jenis perangkat. Alamat IP tidak tersedia di Apps Script.</div></div>' +
      '<div class="card filter-card"><div class="fbody"><div class="filter-grid" style="grid-template-columns:1fr 1fr 2fr">' +
      '<div class="field"><label>Desa</label><select class="select" data-lf="desa">' + UI.options(S.master.desa.map(function (d) { return { v: d.desa_id, l: d.nama_desa }; }), LF.desa, 'Semua') + '</select></div>' +
      '<div class="field"><label>Hasil</label><select class="select" data-lf="hasil">' + UI.options(['SUKSES', 'GAGAL', 'TERKUNCI'], LF.hasil, 'Semua') + '</select></div><div></div></div></div></div><div class="card" data-list></div></div>';
    UI.$$('[data-lf]', box).forEach(function (x) { x.onchange = function () { LF[x.dataset.lf] = x.value; draw(); }; });
    draw();
  }

  async function arsip(box) {
    if (!cache.arsip) {
      box.innerHTML = '<div class="card card-body"><div class="skel"></div><div class="skel mt-s"></div></div>';
      var r = await API.call('listArchives');
      if (!r.success) { box.innerHTML = '<div class="banner danger">' + esc(r.message) + '</div>'; return; }
      cache.arsip = r.data;
    }
    var arch = cache.arsip.filter(function (a) { return a.diarsipkan; });
    box.innerHTML = '<div class="stack"><div class="banner neutral">' + icon('info') + '<div class="txt">Data <b>tidak perlu dihapus untuk menjaga kecepatan</b> — ±800 pengajuan/tahun masih jauh di bawah batas Google Sheets. Arsipkan tahun lama (≥ 2 tahun) agar sheet aktif ringkas; data arsip tetap bisa dicari.</div></div>' +
      '<div class="card"><div class="card-head"><h2>Arsipkan per Tahun</h2><div class="end"><button class="btn btn-sm" data-loglog>' + icon('archive', 15) + 'Arsipkan Riwayat Login &gt; 12 Bulan</button></div></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Tahun</th><th class="r">Pengajuan di Data Aktif</th><th class="c">Status</th><th class="c">Aksi</th></tr></thead><tbody>' +
      (cache.arsip.map(function (a) {
        return '<tr><td><b>' + esc(a.tahun) + '</b></td><td class="r">' + a.jumlah_aktif + '</td><td class="c">' + (a.diarsipkan ? '<span class="pill s-INFO">Diarsipkan</span>' : '<span class="pill s-OK">Aktif</span>') + '</td>' +
          '<td class="c">' + (a.boleh_arsip ? '<button class="btn btn-sm" data-arch="' + esc(a.tahun) + '">' + icon('archive', 15) + 'Arsipkan</button>' : '<span class="muted" style="font-size:12px">' + (a.jumlah_aktif ? 'belum 2 tahun' : '–') + '</span>') + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="tbl-empty">Belum ada data.</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-head"><h2>Cari Arsip</h2></div><div class="card-body"><div class="row"><select class="select" data-ay style="width:160px">' + UI.options(arch.map(function (a) { return a.tahun; }), '', 'Tahun arsip') + '</select>' +
      '<input class="input" data-aq placeholder="Nama, NIK, nomor pengajuan" style="flex:1;min-width:200px"><button class="btn btn-primary" data-asearch>' + icon('search', 16) + 'Cari</button></div><div data-ares class="mt"></div></div></div>' +
      '<div class="card" style="border:2px solid #FCA5A5"><div class="card-head" style="background:var(--danger-50)"><h2 style="color:#991B1B">' + icon('alert', 18) + ' Zona Berbahaya — Hapus Permanen</h2></div><div class="card-body">' +
      '<ol style="margin:0 0 14px;padding-left:18px;color:#334155"><li>Cadangan otomatis (salinan spreadsheet + .json) ke folder 06_Cadangan</li><li>Isi alasan</li><li>Ketik konfirmasi persis</li></ol>' +
      '<div class="form-grid"><div class="field"><label>Tahun (sudah diarsipkan)</label><select class="select" data-dy>' + UI.options(arch.map(function (a) { return a.tahun; }), '', '— Pilih —') + '</select></div>' +
      '<div class="field"><label>Ketik konfirmasi</label><input class="input mono" data-dk placeholder="HAPUS 2024"></div>' +
      '<div class="field full"><label>Alasan<span class="req">*</span></label><textarea class="textarea" data-da></textarea></div></div>' +
      '<div class="row end mt"><button class="btn btn-danger-solid" data-del disabled>' + icon('trash', 16) + 'Hapus Permanen</button></div></div></div></div>';
    var delBtn = box.querySelector('[data-del]');
    var syncDel = function () { var y = box.querySelector('[data-dy]').value; delBtn.disabled = !(y && box.querySelector('[data-dk]').value.trim() === 'HAPUS ' + y && box.querySelector('[data-da]').value.trim()); };
    ['[data-dy]', '[data-dk]', '[data-da]'].forEach(function (s) { box.querySelector(s).addEventListener('input', syncDel); box.querySelector(s).addEventListener('change', syncDel); });
    delBtn.onclick = function () {
      var y = box.querySelector('[data-dy]').value;
      UI.busy(delBtn, async function () {
        var r = await API.call('deleteArchive', { tahun: y, konfirmasi: box.querySelector('[data-dk]').value.trim(), alasan: box.querySelector('[data-da]').value.trim() }, { timeout: 300000 });
        if (!r.success) return UI.toast(r.message, 'error');
        UI.toast(r.message); cache.arsip = null; arsip(box);
      });
    };
    UI.$$('[data-arch]', box).forEach(function (b) {
      b.onclick = async function () {
        var y = b.dataset.arch;
        var ok = await UI.confirm({ title: 'Arsipkan ' + y + '?', icon: 'archive', message: 'Pengajuan, dokumen, dan riwayat tahun ' + y + ' dipindah ke spreadsheet arsip. PDF tetap di Drive dan data tetap bisa dicari.', ok: 'Arsipkan' });
        if (!ok) return;
        await UI.busy(b, async function () {
          var r = await API.call('archiveYear', { tahun: y }, { timeout: 300000 });
          if (!r.success) return UI.toast(r.message, 'error');
          UI.toast(r.message); cache.arsip = null; App.refreshList(); arsip(box);
        });
      };
    });
    box.querySelector('[data-loglog]').onclick = function () {
      var b = this;
      UI.busy(b, async function () { var r = await API.call('archiveLoginLog', {}, { timeout: 300000 }); UI.toast(r.message, r.success ? 'success' : 'error'); cache.login = null; });
    };
    box.querySelector('[data-asearch]').onclick = function () {
      var b = this, y = box.querySelector('[data-ay]').value, res = box.querySelector('[data-ares]');
      if (!y) return UI.toast('Pilih tahun arsip.', 'warning');
      UI.busy(b, async function () {
        var r = await API.call('searchArchive', { tahun: y, q: box.querySelector('[data-aq]').value.trim() });
        if (!r.success) { res.innerHTML = '<div class="banner danger">' + esc(r.message) + '</div>'; return; }
        res.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>No. Pengajuan</th><th>Desa</th><th>Catin</th><th>Pasangan</th><th>Tgl Akad</th><th class="c">Status</th><th class="c">Aksi</th></tr></thead><tbody>' +
          (r.data.map(function (p, i) {
            return '<tr><td class="mono">' + esc(p.pengajuan_id) + '</td><td>' + esc(App.desaName(p.desa_id)) + '</td><td class="nm">' + esc(p.nama_catin) + '</td><td>' + esc(p.nama_pasangan) + '</td><td>' + UI.tgl(p.tanggal_akad) + '</td><td class="c">' + UI.pill(p.status) + '</td><td class="c"><button class="btn btn-xs" data-av="' + i + '">Lihat</button></td></tr>';
          }).join('') || '<tr><td colspan="7" class="tbl-empty">Tidak ditemukan.</td></tr>') + '</tbody></table></div>';
        UI.$$('[data-av]', res).forEach(function (x) {
          x.onclick = function () {
            var p = r.data[Number(x.dataset.av)];
            var fs = App.fields().filter(function (f) { return !f.turunan && p.data[f.field_key] !== undefined; });
            UI.modal({ title: 'Arsip ' + p.pengajuan_id, icon: 'archive', size: 'wide', body: '<div class="kv">' + fs.map(function (f) { return App.kv(f.label, lkFormat(p.data[f.field_key], f)); }).join('') + '</div>' });
          };
        });
      });
    };
  }

  return { riwayat: riwayat };
})();
