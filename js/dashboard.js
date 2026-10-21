/* =====================================================================
 * LABUKU Link — dashboard.js : Dashboard Desa & Dashboard KUA
 * Semua angka dihitung di browser dari daftar pengajuan (instan).
 * ===================================================================== */
var Dashboard = (function () {
  var esc = UI.esc, icon = UI.icon;
  var F = { tahun: String(new Date().getFullYear()), bulan: '', desa: '', status: '' };

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

  function statCard(status, num, cap, ic, href, labelOverride) {
    var key = status;
    return '<div class="card stat clickable" data-go="' + href + '"><div class="top"><span class="pill s-' + key + '">' + esc(labelOverride || status) + '</span>' +
      '<span class="ico t-' + key + '">' + icon(ic, 20) + '</span></div><div class="num c-' + key + '">' + num + '</div><div class="cap">' + esc(cap) + '</div></div>';
  }
  function plainStat(label, num, cap, ic, color, href) {
    return '<div class="card stat' + (href ? ' clickable' : '') + '"' + (href ? ' data-go="' + href + '"' : '') + '><div class="top"><span class="caption">' + esc(label) + '</span><span class="ico">' + icon(ic, 20) + '</span></div>' +
      '<div class="num" style="color:' + (color || 'inherit') + '">' + num + '</div><div class="cap">' + esc(cap) + '</div></div>';
  }

  function filterCard(withDesa, withStatus) {
    return '<div class="card filter-card" id="dashFilter"><div class="fhead"><span class="t">' + icon('filter', 16) + 'Filter Rekapitulasi</span>' +
      '<span class="muted hide-sm" style="font-size:12px;white-space:nowrap">Periode = bulan akad</span><button class="toggle" data-toggle>▴ Sembunyikan</button></div>' +
      '<div class="fbody"><div class="filter-grid c' + (withDesa ? 5 : 4) + '">' +
      '<div class="field"><label>Tahun</label><select class="select" data-f="tahun">' + UI.options(years(), F.tahun) + '</select></div>' +
      '<div class="field"><label>Bulan</label><select class="select" data-f="bulan">' + UI.options(bulanOpts(), F.bulan) + '</select></div>' +
      (withDesa ? '<div class="field"><label>Desa</label><select class="select" data-f="desa">' + UI.options(S.master.desa.map(function (d) { return { v: d.desa_id, l: d.nama_desa }; }), F.desa, 'Semua ' + S.master.desa.length + ' Desa') + '</select></div>' : '') +
      (withStatus ? '<div class="field"><label>Status</label><select class="select" data-f="status">' + UI.options(['DRAF', 'TERKUNCI', 'DIKEMBALIKAN', 'DIBATALKAN'].map(function (s) { return { v: s, l: s }; }), F.status, 'Semua Status') + '</select></div>' : '') +
      '<div class="field"><label>&nbsp;</label><div class="row" style="flex-wrap:nowrap"><button class="btn" data-reset>Reset</button><button class="btn btn-primary" data-apply>' + icon('search', 16) + 'Terapkan</button></div></div>' +
      '</div></div></div>';
  }
  function bindFilter(main, rerun) {
    var card = main.querySelector('#dashFilter');
    card.querySelector('[data-toggle]').onclick = function (e) { card.classList.toggle('collapsed'); e.currentTarget.textContent = card.classList.contains('collapsed') ? '▾ Tampilkan' : '▴ Sembunyikan'; };
    card.querySelector('[data-apply]').onclick = function () { UI.$$('[data-f]', card).forEach(function (s) { F[s.dataset.f] = s.value; }); rerun(); };
    card.querySelector('[data-reset]').onclick = function () { F.tahun = String(new Date().getFullYear()); F.bulan = ''; F.desa = ''; F.status = ''; rerun(); };
    UI.$$('[data-f]', card).forEach(function (s) { s.onchange = function () { F[s.dataset.f] = s.value; rerun(); }; });
    UI.$$('[data-go]', main).forEach(function (c) { c.onclick = function () { App.go(c.dataset.go); }; });
  }

  function recentTable(rows, withDesa) {
    if (!rows.length) return UI.emptyState('Belum ada pengajuan', App.isKua() ? 'Pengajuan dari desa akan tampil di sini.' : 'Mulai dengan tombol Pengajuan Baru.');
    return '<div class="table-wrap"><table class="tbl cards"><thead><tr><th class="c" style="width:52px">No</th><th class="c" style="width:64px">Aksi</th><th>No. Pengajuan</th>' +
      (withDesa ? '<th>Desa</th>' : '') + '<th>Nama Catin</th><th>Tgl Akad</th><th class="c">Status</th></tr></thead><tbody>' +
      rows.map(function (p, i) {
        return '<tr><td class="c" data-l="No">' + (i + 1) + '</td><td class="c"><button class="btn btn-menu" data-menu-anchor data-act="' + esc(p.pengajuan_id) + '" aria-label="Aksi">' + icon('menu', 16) + '</button></td>' +
          '<td class="mono" data-l="No. Pengajuan">' + esc(p.pengajuan_id) + '</td>' + (withDesa ? '<td data-l="Desa">' + esc(App.desaName(p.desa_id)) + '</td>' : '') +
          '<td class="nm" data-l="Nama Catin">' + esc(p.nama_catin || '(belum diisi)') + (p.nama_pasangan ? '<span class="sub">& ' + esc(p.nama_pasangan) + '</span>' : '') + '</td>' +
          '<td data-l="Tgl Akad">' + UI.tgl(p.tanggal_akad) + '</td><td class="c">' + UI.statusPills(p) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function bindActions(root) {
    UI.$$('[data-act]', root).forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var p = S.list.find(function (x) { return x.pengajuan_id === b.dataset.act; });
        if (p) Pengajuan.actionMenu(p, b);
      };
    });
  }

  /* ---------------- DESA ---------------- */
  function renderDesa(main) {
    var rows = S.list.filter(function (p) { return inPeriod(p, F.tahun, F.bulan) && (!F.status || p.status === F.status); });
    var c = { DRAF: 0, TERKUNCI: 0, DIKEMBALIKAN: 0, CETAK: 0 };
    rows.forEach(function (p) { if (c[p.status] !== undefined) c[p.status]++; if (p.status === 'TERKUNCI' && lkBool(p.perlu_cetak_ulang)) c.CETAK++; });
    var all = App.counts();
    var recent = S.list.slice().sort(function (a, b) { return a.diubah_pada < b.diubah_pada ? 1 : -1; }).slice(0, 5);
    var bln = F.bulan ? LK_BULAN[Number(F.bulan) - 1] + ' ' + F.tahun : 'Tahun ' + F.tahun;
    main.innerHTML = App.pageHead('Beranda / Dashboard Desa', 'Dashboard Desa', bln) +
      '<div class="stack">' + filterCard(false, true) +
      '<div class="grid g4">' +
      statCard('DRAF', c.DRAF, 'belum dikunci', 'pencil', '#/pengajuan?status=DRAF') +
      statCard('TERKUNCI', c.TERKUNCI, 'siap cetak', 'lock', '#/pengajuan?status=TERKUNCI') +
      statCard('DIKEMBALIKAN', c.DIKEMBALIKAN, 'perlu diperbaiki', 'rotate', '#/pengajuan?status=DIKEMBALIKAN') +
      statCard('CETAK', c.CETAK, 'diubah KUA', 'printer', '#/pengajuan?status=CETAK', 'Perlu Cetak Ulang') + '</div>' +
      (all.DIKEMBALIKAN ? '<div class="banner warn">' + icon('alert') + '<div class="txt"><b>Perhatian:</b> Pengajuan yang dikembalikan KUA harus diperbaiki lalu dicetak &amp; ditandatangani ulang.</div><a href="#/pengajuan?status=DIKEMBALIKAN">Lihat Pengajuan Dikembalikan (' + all.DIKEMBALIKAN + ') →</a></div>' : '') +
      (all.CETAK ? '<div class="banner info">' + icon('printer') + '<div class="txt"><b>' + all.CETAK + ' pengajuan</b> dikoreksi KUA — cetak versi terbaru &amp; minta tanda tangan ulang Kepala Desa.</div><a href="#/pengajuan?status=CETAK">Lihat →</a></div>' : '') +
      '<div class="card"><div class="card-head"><div><h2>Pengajuan Terbaru</h2><div class="sub">Pengajuan pengantar nikah terkini Desa ' + esc(S.desa ? S.desa.nama_desa : '') + '</div></div>' +
      '<div class="end"><a class="btn btn-primary" href="#/form/new">' + icon('plus') + 'Pengajuan Baru</a></div></div>' + recentTable(recent, false) +
      '<div class="tbl-foot"><span class="muted">' + S.list.length + ' pengajuan tercatat</span><a class="btn btn-sm" style="margin-left:auto" href="#/pengajuan">Lihat Semua ' + icon('arrowR', 14) + '</a></div></div>' +
      '<div class="footer-note">© ' + new Date().getFullYear() + ' LABUKU Link · ' + esc(App.kuaName()) + ' · by Ahzani Labs</div></div>';
    App.bindRefresh(main);
    bindFilter(main, function () { renderDesa(main); });
    bindActions(main);
  }

  /* ---------------- KUA ---------------- */
  function renderKua(main) {
    var rows = S.list.filter(function (p) { return inPeriod(p, F.tahun, F.bulan) && (!F.desa || p.desa_id === F.desa); });
    var c = { ALL: rows.length, TERKUNCI: 0, DIKEMBALIKAN: 0, DIBATALKAN: 0, DRAF: 0 };
    rows.forEach(function (p) { c[p.status] = (c[p.status] || 0) + 1; });
    var aktif = rows.filter(function (p) { return p.status !== 'DIBATALKAN'; });
    var perDesa = S.master.desa.map(function (d) {
      var r = aktif.filter(function (p) { return p.desa_id === d.desa_id; });
      var nk = r.filter(function (p) { return p.jenis === 'NIKAH_DI_KUA'; }).length;
      var rk = r.filter(function (p) { return p.jenis === 'REKOMENDASI_KELUAR'; }).length;
      return { nama: d.nama_desa, nk: nk, rk: rk, tot: r.length };
    }).filter(function (x) { return !F.desa || x.tot || S.master.desa.length < 2; }).sort(function (a, b) { return b.tot - a.tot || (a.nama < b.nama ? -1 : 1); });
    var max = Math.max.apply(null, [1].concat(perDesa.map(function (x) { return Math.max(x.nk, x.rk); })));
    var sumNk = perDesa.reduce(function (s, x) { return s + x.nk; }, 0), sumRk = perDesa.reduce(function (s, x) { return s + x.rk; }, 0);
    var recent = S.list.slice().sort(function (a, b) { return a.diubah_pada < b.diubah_pada ? 1 : -1; }).slice(0, 6);
    var bln = F.bulan ? LK_BULAN[Number(F.bulan) - 1] + ' ' + F.tahun : 'Tahun ' + F.tahun;

    main.innerHTML = App.pageHead('Beranda / ' + App.kuaName(), 'Dashboard KUA', bln) +
      '<div class="stack">' + filterCard(true, false) +
      '<div class="grid g4">' +
      plainStat('Total Pengajuan', c.ALL, (F.desa ? App.desaName(F.desa) : S.master.desa.length + ' desa') + ' · periode ini', 'file', 'var(--text)', '#/pengajuan') +
      statCard('TERKUNCI', c.TERKUNCI, 'siap dicetak desa', 'lock', '#/pengajuan?status=TERKUNCI') +
      statCard('DIKEMBALIKAN', c.DIKEMBALIKAN, 'menunggu perbaikan desa', 'rotate', '#/pengajuan?status=DIKEMBALIKAN') +
      statCard('DIBATALKAN', c.DIBATALKAN, 'periode ini', 'xCircle', '#/pengajuan?status=DIBATALKAN') + '</div>' +
      '<div class="muted" style="font-size:12.5px">Satu pernikahan bisa tercatat sebagai 2 pengajuan bila kedua catin berasal dari desa di wilayah ' + esc(S.master.config.kecamatan) + '. Draf desa: ' + (c.DRAF || 0) + '.</div>' +
      '<div class="split" style="grid-template-columns:minmax(0,3fr) minmax(0,2fr)">' +
      '<div class="card"><div class="card-head"><div><h2>Pengajuan per Desa</h2><div class="sub">' + esc(bln) + ' · tanpa yang dibatalkan</div></div>' +
      '<div class="end legend"><span><i style="background:var(--emerald)"></i>Nikah di KUA</span><span><i style="background:var(--blue)"></i>Rekomendasi</span></div></div>' +
      '<div class="card-body">' + (aktif.length ? '<div class="hbars">' + perDesa.map(function (x) {
        return '<div class="hbar"><div class="nm" title="' + esc(x.nama) + '">' + esc(x.nama) + '</div><div class="bars">' +
          '<div class="b e" style="width:' + barW(x.nk, max) + '" title="Nikah di KUA: ' + x.nk + '"></div><div class="b u" style="width:' + barW(x.rk, max) + '" title="Rekomendasi: ' + x.rk + '"></div></div>' +
          '<div class="tot"><b style="color:var(--text)">' + x.tot + '</b> total</div></div>';
      }).join('') + '</div>' : UI.emptyState('Belum ada data periode ini', 'Ubah filter tahun/bulan.')) + '</div>' +
      '<div class="tbl-foot"><span class="muted">Total: <b>' + sumNk + '</b> nikah di KUA · <b>' + sumRk + '</b> rekomendasi</span><a class="btn btn-sm" style="margin-left:auto" href="#/laporan">Buka Laporan ' + icon('arrowR', 14) + '</a></div></div>' +
      '<div class="card"><div class="card-head"><div><h2>Aktivitas Terbaru</h2><div class="sub">Perubahan terakhir dari 14 desa</div></div></div>' +
      (recent.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Desa</th><th>Catin</th><th class="c">Status</th><th class="c">Aksi</th></tr></thead><tbody>' +
        recent.map(function (p) {
          return '<tr><td>' + esc(App.desaName(p.desa_id)) + '<span class="sub">' + UI.waktu(p.diubah_pada) + '</span></td><td class="nm">' + esc(p.nama_catin || '(belum diisi)') + (p.nama_pasangan ? '<span class="sub">& ' + esc(p.nama_pasangan) + '</span>' : '') + '</td>' +
            '<td class="c">' + UI.statusPills(p) + '</td><td class="c"><a class="btn btn-sm" href="#/detail/' + esc(p.pengajuan_id) + '">Lihat</a></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.emptyState('Belum ada aktivitas', '')) +
      '<div class="tbl-foot"><span class="muted">' + S.list.length + ' pengajuan aktif</span><a class="btn btn-sm" style="margin-left:auto" href="#/pengajuan">Lihat Semua ' + icon('arrowR', 14) + '</a></div></div></div>' +
      '<div class="footer-note">© ' + new Date().getFullYear() + ' LABUKU Link · ' + esc(App.kuaName()) + ', Kabupaten ' + esc(S.master.config.kabupaten) + ' · by Ahzani Labs</div></div>';
    App.bindRefresh(main);
    bindFilter(main, function () { renderKua(main); });
  }

  function barW(n, max) { return n ? 'max(3px,' + (n / max * 100) + '%)' : '0'; }

  function render(main) { if (App.isKua()) renderKua(main); else renderDesa(main); }

  return { render: render, periodDate: periodDate, inPeriod: inPeriod, years: years, bulanOpts: bulanOpts, plainStat: plainStat };
})();
