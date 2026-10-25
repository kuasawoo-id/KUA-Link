/* =====================================================================
 * KUA-Link — dashboard.js : Dashboard + Laporan Rekapitulasi (jadi satu)
 * Semua angka dihitung di browser dari daftar pengajuan (instan, tanpa server).
 * ===================================================================== */
var Dashboard = (function () {
  var esc = UI.esc, icon = UI.icon;
  var F = { tahun: String(new Date().getFullYear()), bulan: '', desa: '', jenis: '' };

  /** Periode laporan = bulan akad; bila belum ada tanggal akad, pakai tanggal dibuat. */
  function periodDate(p) { return (p.tanggal_akad || String(p.dibuat_pada || '').slice(0, 10)); }
  function inPeriod(p, tahun, bulan) {
    var d = periodDate(p);
    if (tahun && d.slice(0, 4) !== String(tahun)) return false;
    if (bulan && Number(d.slice(5, 7)) !== Number(bulan)) return false;
    return true;
  }
  function years() {
    var set = {}, now = new Date().getFullYear();
    set[now] = 1;
    S.list.forEach(function (p) { var y = periodDate(p).slice(0, 4); if (/^\d{4}$/.test(y)) set[y] = 1; });
    return Object.keys(set).sort().reverse();
  }
  function bulanOpts() { return [{ v: '', l: 'Semua Bulan' }].concat(LK_BULAN.map(function (b, i) { return { v: String(i + 1), l: b }; })); }
  /** Umur termuda catin pengajuan ini (suami/istri/keduanya). */
  function umurCatin(p) {
    var u = [];
    if (p.peran_catin !== 'ISTRI' && p.umur_suami !== '' && p.umur_suami !== undefined) u.push(Number(p.umur_suami));
    if (p.peran_catin !== 'SUAMI' && p.umur_istri !== '' && p.umur_istri !== undefined) u.push(Number(p.umur_istri));
    return u.length ? Math.min.apply(null, u) : null;
  }

  function stat(label, num, cap, ic, tone, href) {
    return '<div class="card stat tone-' + tone + (href ? ' clickable' : '') + '"' + (href ? ' data-go="' + href + '"' : '') + '><div class="top"><span class="caption">' + esc(label) + '</span>' +
      '<span class="ico">' + icon(ic, 20) + '</span></div><div class="num">' + num + '</div><div class="cap">' + esc(cap) + '</div></div>';
  }

  function filterCard(kua) {
    return '<div class="card filter-card" id="dashFilter"><div class="fhead"><span class="t">' + icon('filter', 16) + 'Filter Rekapitulasi</span>' +
      '<span class="muted hide-sm" style="font-size:12px;white-space:nowrap">Periode = bulan akad</span><button class="toggle" data-toggle>▴ Sembunyikan</button></div>' +
      '<div class="fbody"><div class="filter-grid c' + (kua ? 5 : 4) + '">' +
      '<div class="field"><label>Tahun</label><select class="select" data-f="tahun">' + UI.options(years(), F.tahun) + '</select></div>' +
      '<div class="field"><label>Bulan</label><select class="select" data-f="bulan">' + UI.options(bulanOpts(), F.bulan) + '</select></div>' +
      (kua ? '<div class="field"><label>Desa</label><select class="select" data-f="desa">' + UI.options(S.master.desa.map(function (d) { return { v: d.desa_id, l: d.nama_desa }; }), F.desa, 'Semua ' + S.master.desa.length + ' Desa') + '</select></div>' : '') +
      '<div class="field"><label>Jenis</label><select class="select" data-f="jenis">' + UI.options([{ v: 'NIKAH_DI_KUA', l: 'Nikah di Wilayah' }, { v: 'REKOMENDASI_KELUAR', l: 'Rekomendasi' }], F.jenis, 'Semua') + '</select></div>' +
      '<div class="field"><label>&nbsp;</label><div class="row" style="flex-wrap:nowrap"><button class="btn" data-reset>Reset</button><button class="btn btn-emerald" data-xls>' + icon('sheet', 16) + '<span>Ekspor Excel</span></button></div></div>' +
      '</div></div></div>';
  }

  function recentTable(rows, withDesa) {
    if (!rows.length) return UI.emptyState('Belum ada pengajuan', App.isKua() ? 'Pengajuan dari desa akan tampil di sini.' : 'Mulai dengan tombol Pengajuan Baru.');
    return '<div class="table-wrap"><table class="tbl cards"><thead><tr><th class="c" style="width:64px">Aksi</th><th>No. Pengajuan</th>' +
      (withDesa ? '<th>Desa</th>' : '') + '<th>Calon Pengantin</th><th>Tgl Akad</th><th class="c">Status</th></tr></thead><tbody>' +
      rows.map(function (p) {
        return '<tr><td class="c"><button class="btn btn-menu" data-menu-anchor data-act="' + esc(p.pengajuan_id) + '" aria-label="Aksi">' + icon('menu', 16) + '</button></td>' +
          '<td class="mono" data-l="No. Pengajuan"><a href="#/detail/' + esc(p.pengajuan_id) + '" style="color:var(--text)">' + esc(p.pengajuan_id) + '</a></td>' + (withDesa ? '<td data-l="Desa">' + esc(App.desaName(p.desa_id)) + '<span class="sub">' + UI.waktu(p.diubah_pada) + '</span></td>' : '') +
          '<td class="nm" data-l="Calon Pengantin">' + esc(p.nama_catin || '(belum diisi)') + (p.nama_pasangan ? '<span class="sub">& ' + esc(p.nama_pasangan) + '</span>' : '') + '</td>' +
          '<td data-l="Tgl Akad">' + UI.tgl(p.tanggal_akad) + '</td><td class="c">' + UI.statusPills(p) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function render(main) {
    var kua = App.isKua();
    var rows = S.list.filter(function (p) { return inPeriod(p, F.tahun, F.bulan) && (!F.desa || p.desa_id === F.desa) && (!F.jenis || p.jenis === F.jenis); });
    var aktif = rows.filter(function (p) { return p.status !== 'DIBATALKAN'; });
    var c = { SELESAI: 0, DRAF: 0, DIBATALKAN: 0 };
    rows.forEach(function (p) { c[p.status] = (c[p.status] || 0) + 1; });
    var u21 = aktif.filter(function (p) { var u = umurCatin(p); return u !== null && u < 21; }).length;
    var u19 = aktif.filter(function (p) { var u = umurCatin(p); return u !== null && u < 19; }).length;
    var nk = aktif.filter(function (p) { return p.jenis === 'NIKAH_DI_KUA'; }).length, rk = aktif.filter(function (p) { return p.jenis === 'REKOMENDASI_KELUAR'; }).length;
    var per = F.bulan ? LK_BULAN[Number(F.bulan) - 1] + ' ' + F.tahun : 'Tahun ' + F.tahun;
    // Per bulan (tahun terpilih)
    var yearRows = S.list.filter(function (p) { return inPeriod(p, F.tahun, '') && p.status !== 'DIBATALKAN' && (!F.desa || p.desa_id === F.desa) && (!F.jenis || p.jenis === F.jenis); });
    var bulan = LK_BULAN.map(function (b, i) {
      var r = yearRows.filter(function (p) { return Number(periodDate(p).slice(5, 7)) === i + 1; });
      return { nk: r.filter(function (p) { return p.jenis === 'NIKAH_DI_KUA'; }).length, rk: r.filter(function (p) { return p.jenis === 'REKOMENDASI_KELUAR'; }).length, tot: r.length };
    });
    var maxB = Math.max.apply(null, [1].concat(bulan.map(function (b) { return b.tot; })));
    // Rekap per desa
    var desaList = kua ? S.master.desa : [S.desa || { desa_id: S.user.desa_id, nama_desa: App.desaName(S.user.desa_id) }];
    var recap = desaList.filter(function (d) { return !F.desa || d.desa_id === F.desa; }).map(function (d) {
      var r = rows.filter(function (p) { return p.desa_id === d.desa_id; });
      var a = r.filter(function (p) { return p.status !== 'DIBATALKAN'; });
      return {
        Desa: d.nama_desa, 'Nikah di Wilayah': a.filter(function (p) { return p.jenis === 'NIKAH_DI_KUA'; }).length,
        Rekomendasi: a.filter(function (p) { return p.jenis === 'REKOMENDASI_KELUAR'; }).length,
        'Catin < 21': a.filter(function (p) { var u = umurCatin(p); return u !== null && u < 21; }).length,
        Draf: r.filter(function (p) { return p.status === 'DRAF'; }).length, 'Siap Cetak': r.filter(function (p) { return p.status === 'SELESAI'; }).length,
        Dibatalkan: r.filter(function (p) { return p.status === 'DIBATALKAN'; }).length, Total: r.length
      };
    });
    var cols = ['Nikah di Wilayah', 'Rekomendasi', 'Catin < 21', 'Draf', 'Siap Cetak', 'Dibatalkan', 'Total'];
    var sum = {};
    cols.forEach(function (k) { sum[k] = recap.reduce(function (s, r) { return s + r[k]; }, 0); });
    var maxD = Math.max.apply(null, [1].concat(recap.map(function (r) { return Math.max(r['Nikah di Wilayah'], r.Rekomendasi); })));
    var recent = S.list.slice().sort(function (a, b) { return a.diubah_pada < b.diubah_pada ? 1 : -1; }).slice(0, kua ? 6 : 5);
    var draf = S.list.filter(function (p) { return p.status === 'DRAF'; }).length;

    main.innerHTML = App.pageHead('Beranda / ' + (kua ? App.kuaName() : 'Desa ' + (S.desa ? S.desa.nama_desa : '')), kua ? 'Dashboard KUA' : 'Dashboard Desa', per) +
      '<div class="stack">' +
      (!kua ? '<div class="hero"><div><div class="hero-t">Pengajuan surat nikah lebih cepat</div><div class="hero-s">Isi 4 langkah → Simpan &amp; Cetak → tanda tangan Kepala Desa → bawa ke KUA.</div></div>' +
        '<a class="btn btn-gold" href="#/form/new" style="height:46px">' + icon('plus') + 'Pengajuan Baru</a></div>' : '') +
      (!kua && draf ? '<div class="banner warn">' + icon('pencil') + '<div class="txt"><b>' + draf + ' pengajuan masih draf</b> (belum lengkap). Lanjutkan mengisi agar bisa dicetak.</div><a href="#/pengajuan?status=DRAF">Lihat Draf →</a></div>' : '') +
      filterCard(kua) +
      '<div class="grid g4">' +
      stat('Total Pengajuan', aktif.length, per + (F.desa ? ' · ' + App.desaName(F.desa) : ''), 'file', 'green', '#/pengajuan') +
      stat('Siap Cetak', c.SELESAI, 'data lengkap', 'printer', 'gold', '#/pengajuan?status=SELESAI') +
      stat('Draf', c.DRAF, 'belum lengkap', 'pencil', 'slate', '#/pengajuan?status=DRAF') +
      stat('Dibatalkan', c.DIBATALKAN, 'periode ini', 'xCircle', 'red', '#/pengajuan?status=DIBATALKAN') + '</div>' +
      '<div class="grid g4">' +
      stat('Nikah di Wilayah', nk, 'Kec. ' + S.master.config.kecamatan, 'heart', 'green') +
      stat('Rekomendasi', rk, 'nikah di luar wilayah', 'external', 'blue') +
      stat('Catin < 21 Tahun', u21, 'perlu izin orang tua (N5)', 'users', 'amber') +
      stat('Catin < 19 Tahun', u19, 'perlu dispensasi Pengadilan Agama', 'alert', 'red') + '</div>' +
      '<div class="split" style="grid-template-columns:minmax(0,3fr) minmax(0,2fr)">' +
      '<div class="card"><div class="card-head"><div><h2>Pengajuan per Bulan</h2><div class="sub">Tahun ' + esc(F.tahun) + ' · tanpa yang dibatalkan</div></div><div class="end legend"><span><i style="background:var(--brand)"></i>Nikah di Wilayah</span><span><i style="background:var(--gold)"></i>Rekomendasi</span></div></div>' +
      '<div class="card-body"><div class="vbars">' + bulan.map(function (b) {
        return '<div class="vbar" title="' + b.tot + ' pengajuan"><div class="val">' + (b.tot || '') + '</div><div class="seg" style="height:' + (b.rk / maxB * 85) + '%;background:var(--gold)"></div><div class="seg" style="height:' + (b.nk / maxB * 85) + '%;background:var(--brand);border-radius:' + (b.rk ? '0' : '4px 4px 0 0') + '"></div></div>';
      }).join('') + '</div><div class="vlabels">' + LK_BULAN.map(function (b) { return '<div>' + b.slice(0, 3) + '</div>'; }).join('') + '</div></div></div>' +
      '<div class="card"><div class="card-head"><div><h2>' + (kua ? 'Aktivitas Terbaru' : 'Pengajuan Terbaru') + '</h2><div class="sub">' + (kua ? 'Perubahan terakhir dari desa' : 'Desa ' + esc(S.desa ? S.desa.nama_desa : '')) + '</div></div></div>' +
      recentTable(recent, kua) + '<div class="tbl-foot"><span class="muted">' + App.counts().AKTIF + ' pengajuan aktif</span><a class="btn btn-sm" style="margin-left:auto" href="#/pengajuan">Lihat Semua ' + icon('arrowR', 14) + '</a></div></div></div>' +
      (kua ? '<div class="card"><div class="card-head"><div><h2>Rekap per Desa</h2><div class="sub">' + esc(per) + '</div></div><div class="end legend"><span><i style="background:var(--brand)"></i>Nikah di Wilayah</span><span><i style="background:var(--gold)"></i>Rekomendasi</span></div></div>' +
        '<div class="table-wrap"><table class="tbl recap"><thead><tr><th class="c">No</th><th>Desa</th><th style="min-width:160px">Grafik</th>' + cols.map(function (k) { return '<th class="r">' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        recap.map(function (r, i) {
          return '<tr><td class="c">' + (i + 1) + '</td><td class="nm">' + esc(r.Desa) + '</td><td><div class="minibar"><i style="width:' + (r['Nikah di Wilayah'] / maxD * 100) + '%;background:var(--brand)"></i><i style="width:' + (r.Rekomendasi / maxD * 100) + '%;background:var(--gold)"></i></div></td>' +
            cols.map(function (k) { return '<td class="r">' + (r[k] || '<span class="muted">0</span>') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody><tfoot><tr><td></td><td>JUMLAH</td><td></td>' + cols.map(function (k) { return '<td class="r">' + sum[k] + '</td>'; }).join('') + '</tr></tfoot></table></div></div>' : '') +
      '<div class="footer-note">© ' + new Date().getFullYear() + ' KUA-Link · ' + esc(App.kuaName()) + ' · by Ahzani Labs</div></div>';

    App.bindRefresh(main);
    var card = main.querySelector('#dashFilter');
    card.querySelector('[data-toggle]').onclick = function (e) { card.classList.toggle('collapsed'); e.currentTarget.textContent = card.classList.contains('collapsed') ? '▾ Tampilkan' : '▴ Sembunyikan'; };
    card.querySelector('[data-reset]').onclick = function () { F = { tahun: String(new Date().getFullYear()), bulan: '', desa: '', jenis: '' }; render(main); };
    UI.$$('[data-f]', card).forEach(function (s) { s.onchange = function () { F[s.dataset.f] = s.value; render(main); }; });
    UI.$$('[data-go]', main).forEach(function (x) { x.onclick = function () { App.go(x.dataset.go); }; });
    UI.$$('[data-act]', main).forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); var p = S.list.find(function (x) { return x.pengajuan_id === b.dataset.act; }); if (p) Pengajuan.actionMenu(p, b); };
    });
    card.querySelector('[data-xls]').onclick = function () {
      var b = this;
      UI.busy(b, async function () {
        var data = rows.map(function (p) {
          return {
            'No. Pengajuan': p.pengajuan_id, Desa: App.desaName(p.desa_id), Jenis: Pengajuan.jenisLabel(p.jenis), 'Pengajuan Untuk': Pengajuan.peranLabel(p.peran_catin),
            'Nama Catin': p.nama_catin, 'NIK Catin': p.nik_catin, 'Nama Pasangan': p.nama_pasangan, 'Tanggal Akad': p.tanggal_akad, 'Umur Suami': p.umur_suami,
            'Umur Istri': p.umur_istri, 'Nomor Surat': p.nomor_surat, 'Tanggal Surat': p.tanggal_surat, Status: UI.STATUS_LABEL[p.status] || p.status,
            'Diedit KUA': Number(p.jumlah_koreksi_kua) || 0, Dibuat: p.dibuat_pada
          };
        });
        var rekap = recap.concat([Object.assign({ Desa: 'JUMLAH' }, sum)]);
        var perBulan = LK_BULAN.map(function (bl, i) { return { Bulan: bl, 'Nikah di Wilayah': bulan[i].nk, Rekomendasi: bulan[i].rk, Total: bulan[i].tot }; });
        await UI.exportXlsx('KUA-Link_Laporan_' + F.tahun + (F.bulan ? '-' + ('0' + F.bulan).slice(-2) : '') + '.xlsx', [
          { name: 'Rekap per Desa', rows: rekap }, { name: 'Per Bulan ' + F.tahun, rows: perBulan }, { name: 'Data Pengajuan', rows: data }
        ]);
        UI.toast('Laporan diekspor.');
      });
    };
  }

  return { render: render, periodDate: periodDate, inPeriod: inPeriod, years: years, bulanOpts: bulanOpts };
})();
