/* =====================================================================
 * KUA-Link — ATURAN BERSAMA
 * File ini IDENTIK dengan backend "Aturan.gs".
 * Jika mengubah salah satu, salin perubahan ke yang lain.
 * Berisi: grup formulir, evaluasi kondisi, umur saat akad, validasi,
 * paket surat, peringatan, kalender hari kerja, dan format nilai template.
 * ===================================================================== */

var LK_STEPS = ['Jadwal Akad', 'Data Calon Suami', 'Data Calon Istri', 'Validasi'];

var LK_GROUPS = [
  { key: 'Administrasi', step: 1, label: 'Pengajuan & Administrasi Desa' },
  { key: 'Rencana Akad', step: 1, label: 'Jadwal Akad' },
  { key: 'Calon Suami', step: 2, prefix: 'suami' },
  { key: 'Ayah Suami', step: 2, prefix: 'ayah_suami', copyFrom: 'suami', copyLabel: 'Calon Suami', copyMode: 'domisili' },
  { key: 'Ibu Suami', step: 2, prefix: 'ibu_suami', copyFrom: 'suami', copyLabel: 'Calon Suami', copyMode: 'domisili' },
  { key: 'Izin Orang Tua Suami', step: 2, prefix: 'izin_suami', copyFrom: 'suami', copyLabel: 'Calon Suami', copyMode: 'domisili', label: 'Pemberi Izin Nikah Calon Suami (N5)' },
  { key: 'Calon Istri', step: 3, prefix: 'istri', copyFrom: 'suami', copyLabel: 'Calon Suami', copyMode: 'domisili' },
  { key: 'Ayah Istri', step: 3, prefix: 'ayah_istri', copyFrom: 'istri', copyLabel: 'Calon Istri', copyMode: 'domisili' },
  { key: 'Ibu Istri', step: 3, prefix: 'ibu_istri', copyFrom: 'istri', copyLabel: 'Calon Istri', copyMode: 'domisili' },
  { key: 'Izin Orang Tua Istri', step: 3, prefix: 'izin_istri', copyFrom: 'istri', copyLabel: 'Calon Istri', copyMode: 'domisili', label: 'Pemberi Izin Nikah Calon Istri (N5)' },
  { key: 'Wali Nikah', step: 3, prefix: 'wali', copyFrom: 'ayah_istri', copyLabel: 'Ayah Istri', copyMode: 'domisili' },
  { key: 'Turunan', step: 0, label: 'Field Otomatis (tidak tampil di formulir)' }
];

var LK_DOMISILI = ['alamat', 'rt', 'rw', 'desa', 'kecamatan', 'kabupaten', 'provinsi'];

var LK_TYPES = ['TEKS', 'TEKS_PANJANG', 'ANGKA', 'NIK', 'TANGGAL', 'JAM', 'PILIHAN', 'YA_TIDAK'];

/* Nilai kunci yang dipakai logika formulir (harus sama dengan opsi di Field Dictionary). */
var LK_PERAN = [{ v: 'SUAMI', l: 'Calon Suami' }, { v: 'ISTRI', l: 'Calon Istri' }, { v: 'SUAMI_ISTRI', l: 'Calon Suami & Calon Istri' }];
var LK_KANTOR = 'Kantor KUA';
var LK_ORTU = ['ayah_suami', 'ibu_suami', 'ayah_istri', 'ibu_istri'];
var LK_ADA = 'Ada';
var LK_MENINGGAL = 'Meninggal';
/** Urutan wali nasab — PMA 30/2024 Pasal 12 ayat (3). */
var LK_WALI_NASAB = ['Bapak kandung', 'Kakek (bapak dari bapak)', 'Buyut (bapak dari kakek)', 'Saudara laki-laki sebapak seibu',
  'Saudara laki-laki sebapak', 'Anak laki-laki dari saudara laki-laki sebapak seibu', 'Anak laki-laki dari saudara laki-laki sebapak',
  'Paman (saudara laki-laki bapak sebapak seibu)', 'Paman sebapak (saudara laki-laki bapak sebapak)', 'Anak paman sebapak seibu',
  'Anak paman sebapak', 'Cucu paman sebapak seibu', 'Cucu paman sebapak', 'Paman bapak sebapak seibu', 'Paman bapak sebapak',
  'Anak paman bapak sebapak seibu', 'Anak paman bapak sebapak'];
var LK_WALI_AYAH = LK_WALI_NASAB[0];
/** Sebab wali hakim — PMA 30/2024 Pasal 13 ayat (5). */
var LK_WALI_HAKIM = ['Wali nasab tidak ada', 'Walinya adhal', 'Walinya tidak diketahui keberadaannya',
  'Walinya tidak dapat dihadirkan/ditemui karena dipenjara', 'Wali nasab tidak ada yang beragama Islam',
  'Wali yang akan menikahkan menjadi pengantin itu sendiri'];

var LK_OPS = [
  { v: '=', l: 'sama dengan', s: 'adalah' },
  { v: '!=', l: 'tidak sama dengan', s: 'bukan' },
  { v: '<', l: 'kurang dari', s: '<' },
  { v: '<=', l: 'kurang dari atau sama dengan', s: '≤' },
  { v: '>', l: 'lebih dari', s: '>' },
  { v: '>=', l: 'lebih dari atau sama dengan', s: '≥' },
  { v: 'salah_satu', l: 'salah satu dari (pisahkan ;)', s: 'salah satu dari' },
  { v: 'kosong', l: 'kosong', s: 'kosong' },
  { v: 'tidak_kosong', l: 'tidak kosong', s: 'terisi' }
];

var LK_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
var LK_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function lkStr(v) { return v === undefined || v === null ? '' : String(v).trim(); }

function lkBool(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

function lkJson(v, fallback) {
  if (v && typeof v === 'object') return v;
  if (!v) return fallback;
  try { return JSON.parse(v); } catch (e) { return fallback; }
}

function lkGroup(key) {
  for (var i = 0; i < LK_GROUPS.length; i++) if (LK_GROUPS[i].key === key) return LK_GROUPS[i];
  return null;
}

/** Opsi "KODE=Label;Lain" -> [{v,l}] */
function lkParseOpsi(opsi) {
  return lkStr(opsi).split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
    var i = s.indexOf('=');
    return i > 0 ? { v: s.slice(0, i).trim(), l: s.slice(i + 1).trim() } : { v: s, l: s };
  });
}

function lkOpsiLabel(field, v) {
  var o = lkParseOpsi(field && field.opsi);
  for (var i = 0; i < o.length; i++) if (o[i].v === v) return o[i].l;
  return v;
}

/** Tanggal ISO "YYYY-MM-DD" -> {y,m,d} atau null */
function lkParseDate(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(lkStr(s));
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

/** Umur (tahun penuh) pada tanggal acuan. "" bila data belum lengkap. */
function lkUmur(lahir, acuan) {
  var a = lkParseDate(lahir), b = lkParseDate(acuan);
  if (!a || !b) return '';
  var u = b.y - a.y;
  if (b.m < a.m || (b.m === a.m && b.d < a.d)) u--;
  return u < 0 ? '' : u;
}

/** Peran catin pengajuan ini mencakup suami / istri? */
function lkPeranHas(data, who) {
  var p = lkStr(data.peran_catin);
  return p === 'SUAMI_ISTRI' || p === (who === 'suami' ? 'SUAMI' : 'ISTRI');
}

/** Gabungan alamat: "Dsn Krajan RT 01 RW 02, Desa/Kel. X, Kec. Y, Kab. Z" */
function lkAlamatLengkap(data, prefix) {
  var g = function (s) { return lkStr(data[prefix + '_' + s]); };
  var parts = [];
  var a = g('alamat');
  var rtrw = (g('rt') ? 'RT ' + g('rt') : '') + (g('rw') ? (g('rt') ? ' ' : '') + 'RW ' + g('rw') : '');
  var first = [a, rtrw].filter(Boolean).join(' ');
  if (first) parts.push(first);
  if (g('desa')) parts.push('Desa/Kel. ' + g('desa'));
  if (g('kecamatan')) parts.push('Kec. ' + g('kecamatan'));
  if (g('kabupaten')) parts.push('Kab. ' + g('kabupaten'));
  if (g('provinsi')) parts.push(g('provinsi'));
  return parts.join(', ');
}

/**
 * Tambahkan field turunan. Jenis rumus di kolom "turunan":
 *  UMUR_AKAD:<field_tgl_lahir>   umur penuh pada tanggal akad
 *  ALAMAT:<prefix>               alamat lengkap dari <prefix>_alamat, _rt, _rw, ...
 *  SYS:nomor_pengajuan | tanggal_cetak | nama_desa | nama_kua | kecamatan | kabupaten | provinsi | jenis_kelamin_catin
 *  CATIN:<pola>                  pola berisi {p} = suami/istri sesuai catin pengajuan ini
 *  PASANGAN:<pola>               {p} = pasangannya
 * Otomatis juga:
 *  - nama ayah/ibu yang meninggal diberi akhiran (Alm)/(Almh)
 *  - wali nasab "Bapak kandung" = data Ayah Calon Istri
 * ctx: {id, today, desa, kua, cfg:{kecamatan,kabupaten,provinsi}, me:'suami'|'istri'}
 */
function lkDerive(data, fields, ctx) {
  var out = {};
  var k;
  for (k in data) if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k];
  ctx = ctx || {};
  var cfg = ctx.cfg || {};
  // Wali nasab bapak kandung → salin data ayah calon istri
  if (lkStr(out.wali_jenis) === 'Nasab' && lkStr(out.wali_hubungan) === LK_WALI_AYAH) {
    ['nama', 'bin', 'nik', 'kewarganegaraan', 'tempat_lahir', 'tanggal_lahir', 'agama', 'pekerjaan'].concat(LK_DOMISILI).forEach(function (s) {
      var v = out['ayah_istri_' + s];
      if (v === undefined || v === '') delete out['wali_' + s]; else out['wali_' + s] = v;
    });
  }
  // Orang tua yang sudah meninggal: (Alm) / (Almh)
  LK_ORTU.forEach(function (p) {
    var nm = lkStr(out[p + '_nama']);
    if (nm && lkStr(out[p + '_status_keberadaan']) === LK_MENINGGAL && !/\(alm/i.test(nm)) out[p + '_nama'] = nm + (p.indexOf('ayah') === 0 ? ' (Alm)' : ' (Almh)');
  });
  var list = fields || [];
  // Tahap 1: umur, alamat, sistem
  list.forEach(function (f) {
    var t = lkStr(f.turunan);
    if (!t) return;
    var i = t.indexOf(':');
    var jenis = t.slice(0, i), arg = t.slice(i + 1);
    if (jenis === 'UMUR_AKAD') out[f.field_key] = String(lkUmur(out[arg], out.akad_tanggal));
    else if (jenis === 'ALAMAT' && arg.indexOf('{p}') < 0) out[f.field_key] = lkAlamatLengkap(out, arg);
    else if (jenis === 'SYS') {
      if (arg === 'nomor_pengajuan') out[f.field_key] = ctx.id || '';
      else if (arg === 'tanggal_cetak') out[f.field_key] = ctx.today || '';
      else if (arg === 'nama_desa') out[f.field_key] = ctx.desa || '';
      else if (arg === 'nama_kua') out[f.field_key] = ctx.kua || '';
      else if (arg === 'kecamatan' || arg === 'kabupaten' || arg === 'provinsi') out[f.field_key] = lkStr(cfg[arg]);
    }
  });
  return lkPerspective(out, list, ctx.me);
}

/** Tahap 2 turunan: rujukan catin / pasangan dari sudut pandang me ('suami'/'istri'). Mengubah & mengembalikan out. */
function lkPerspective(out, fields, me) {
  if (me !== 'suami' && me !== 'istri') me = lkStr(out.peran_catin) === 'ISTRI' ? 'istri' : 'suami';
  var other = me === 'suami' ? 'istri' : 'suami';
  (fields || []).forEach(function (f) {
    var t = lkStr(f.turunan);
    if (!t) return;
    var i = t.indexOf(':');
    var jenis = t.slice(0, i), arg = t.slice(i + 1);
    if (jenis === 'CATIN' || jenis === 'PASANGAN') {
      out[f.field_key] = lkStr(out[arg.replace(/\{p\}/g, jenis === 'CATIN' ? me : other)]);
    } else if (jenis === 'ALAMAT' && arg.indexOf('{p}') >= 0) {
      out[f.field_key] = lkAlamatLengkap(out, arg.replace(/\{p\}/g, me));
    } else if (jenis === 'SYS' && arg === 'jenis_kelamin_catin') {
      out[f.field_key] = me === 'suami' ? 'Laki-laki' : 'Perempuan';
    }
  });
  return out;
}

function lkCompare(a, b) {
  var na = Number(a), nb = Number(b);
  if (a !== '' && b !== '' && !isNaN(na) && !isNaN(nb)) return na < nb ? -1 : na > nb ? 1 : 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Evaluasi satu kondisi {field, op, nilai}. Nilai "@field_lain" membandingkan dengan field lain. */
function lkEvalCond(data, c) {
  var sv = lkStr(data[c.field]);
  var n = lkStr(c.nilai);
  if (n.charAt(0) === '@') n = lkStr(data[n.slice(1)]);
  var lo = sv.toLowerCase();
  switch (c.op) {
    case '=': return lo === n.toLowerCase();
    case '!=': return lo !== n.toLowerCase();
    case 'kosong': return sv === '';
    case 'tidak_kosong': return sv !== '';
    case 'salah_satu':
      return n.split(';').map(function (x) { return x.trim().toLowerCase(); }).indexOf(lo) >= 0;
    case '<': return sv !== '' && n !== '' && lkCompare(sv, n) < 0;
    case '<=': return sv !== '' && n !== '' && lkCompare(sv, n) <= 0;
    case '>': return sv !== '' && n !== '' && lkCompare(sv, n) > 0;
    case '>=': return sv !== '' && n !== '' && lkCompare(sv, n) >= 0;
  }
  return false;
}

/** Grup kondisi {logika: SEMUA|SALAH_SATU, kondisi:[...]}. Kosong = selalu benar. */
function lkEvalGroup(data, g) {
  g = lkJson(g, null);
  if (!g || !g.kondisi || !g.kondisi.length) return true;
  var r = g.kondisi.map(function (c) { return lkEvalCond(data, c); });
  return g.logika === 'SALAH_SATU' ? r.some(Boolean) : r.every(Boolean);
}

function lkVisible(field, data) { return lkEvalGroup(data, field.tampil_jika); }

function lkActiveFields(fields) {
  return (fields || []).filter(function (f) { return lkBool(f.aktif); });
}

/** Validasi data terhadap Field Dictionary. Field tersembunyi tidak divalidasi. */
function lkValidate(data, fields) {
  var errs = [];
  lkActiveFields(fields).forEach(function (f) {
    if (lkStr(f.turunan) || f.grup === 'Turunan') return;
    if (!lkVisible(f, data)) return;
    var v = lkStr(data[f.field_key]);
    var push = function (pesan) { errs.push({ field: f.field_key, label: f.label, grup: f.grup, pesan: pesan }); };
    if (v === '') { if (lkBool(f.wajib)) push('Wajib diisi'); return; }
    if (f.tipe === 'NIK' && !/^\d{16}$/.test(v)) return push('NIK harus 16 digit angka');
    if (f.tipe === 'ANGKA' && isNaN(Number(v))) return push('Harus berupa angka');
    if (f.tipe === 'TANGGAL' && !lkParseDate(v)) return push('Format tanggal tidak valid');
    if (f.tipe === 'JAM' && !/^\d{2}:\d{2}$/.test(v)) return push('Format jam tidak valid (JJ:MM)');
    if (f.tipe === 'PILIHAN') {
      var ok = lkParseOpsi(f.opsi).some(function (o) { return o.v === v; });
      if (!ok) return push('Pilihan tidak dikenal');
    }
    if (lkStr(f.validasi)) {
      try { if (!new RegExp(f.validasi).test(v)) push('Format tidak sesuai'); } catch (e) { /* regex admin tidak valid: abaikan */ }
    }
  });
  return errs;
}

function lkFieldMap(fields) {
  var m = {};
  (fields || []).forEach(function (f) { m[f.field_key] = f; });
  return m;
}

function lkDescribeCond(c, data, fmap) {
  var f = fmap[c.field];
  var label = f ? f.label : c.field;
  var op = '';
  for (var i = 0; i < LK_OPS.length; i++) if (LK_OPS[i].v === c.op) op = LK_OPS[i].s;
  var nilai = lkStr(c.nilai).split(';').join(', ');
  if (nilai.charAt(0) === '@') { var g = fmap[nilai.slice(1)]; nilai = g ? g.label : nilai.slice(1); }
  var actual = lkStr(data[c.field]);
  if (c.op === 'kosong' || c.op === 'tidak_kosong') return label + ' ' + op;
  return label + ' ' + op + ' ' + nilai + (actual !== '' ? ' (terisi: ' + actual + ')' : '');
}

function lkCopy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }

/** Label "untuk siapa" sebuah surat per catin. */
function lkUntukLabel(u) { return u === 'suami' ? 'Calon Suami' : u === 'istri' ? 'Calon Istri' : ''; }

/** Kunci dokumen: "N1" atau "N1:suami" (surat per catin pada pengajuan Calon Suami & Istri). */
function lkDocKey(kode, untuk) { return kode + (untuk ? ':' + untuk : ''); }
function lkSplitKey(key) { var i = String(key).indexOf(':'); return i < 0 ? { kode: String(key), untuk: '' } : { kode: key.slice(0, i), untuk: key.slice(i + 1) }; }

/**
 * Paket surat: aturan aktif yang terpenuhi, hanya untuk template yang aktif.
 * Aturan berlaku per kombinasi Jenis Pengajuan × Pengajuan Untuk (Admin KUA).
 * Pada pengajuan "Calon Suami & Istri", aturan berlingkup PER_CATIN menghasilkan
 * surat untuk masing-masing catin (kunci "KODE:suami" & "KODE:istri").
 * der: data turunan (lkDerive).
 */
function lkPackage(der, rules, templates, fields) {
  var fmap = lkFieldMap(fields);
  var tpl = {};
  (templates || []).forEach(function (t) { if (lkBool(t.aktif)) tpl[t.kode] = t; });
  var jenis = lkStr(der.jenis_pengajuan), peran = lkStr(der.peran_catin);
  var both = peran === 'SUAMI_ISTRI';
  var views = both ? { suami: lkPerspective(lkCopy(der), fields, 'suami'), istri: lkPerspective(lkCopy(der), fields, 'istri') } : null;
  var out = {};
  (rules || []).forEach(function (r) {
    if (!lkBool(r.aktif) || !tpl[r.template_kode]) return;
    var bj = lkStr(r.berlaku_untuk_jenis);
    if (bj && bj !== 'SEMUA' && bj.split(';').indexOf(jenis) < 0) return;
    var bp = lkStr(r.berlaku_untuk_peran);
    if (bp && bp !== 'SEMUA' && bp.split(';').indexOf(peran) < 0) return;
    var kondisi = lkJson(r.kondisi_json, []);
    var g = { logika: r.logika, kondisi: kondisi };
    var targets = both && r.lingkup === 'PER_CATIN' ? ['suami', 'istri'] : [''];
    targets.forEach(function (u) {
      var data = u ? views[u] : (both ? null : der);
      var hitData = null;
      if (r.mode === 'SELALU') hitData = data || views.suami;
      else if (data) hitData = lkEvalGroup(data, g) ? data : null;
      else hitData = lkEvalGroup(views.suami, g) ? views.suami : (lkEvalGroup(views.istri, g) ? views.istri : null);
      if (!hitData) return;
      var t = tpl[r.template_kode];
      var key = lkDocKey(t.kode, u);
      if (out[key]) return;
      var alasan = r.mode === 'SELALU' ? '' : kondisi.filter(function (c) { return lkEvalCond(hitData, c); })
        .map(function (c) { return lkDescribeCond(c, hitData, fmap); }).join('; ');
      out[key] = {
        key: key, kode: t.kode, untuk: u, nama: t.nama, versi: t.versi, urutan: Number(t.urutan_paket) || 99,
        otomatis: r.mode !== 'SELALU', alasan: alasan, label: t.nama + (u ? ' — ' + lkUntukLabel(u) : '')
      };
    });
  });
  var ord = { '': 0, suami: 1, istri: 2 };
  return Object.keys(out).map(function (k) { return out[k]; })
    .sort(function (a, b) { return a.urutan - b.urutan || ord[a.untuk] - ord[b.untuk]; });
}

/* ---------------- KALENDER: HARI KERJA & JAM AKAD ---------------- */

function lkDateObj(s) { var d = lkParseDate(s); return d ? new Date(Date.UTC(d.y, d.m - 1, d.d)) : null; }
function lkIso(dt) { return dt.toISOString().slice(0, 10); }

/** Peta tanggal libur {YYYY-MM-DD: keterangan} dari daftar [{tanggal, keterangan}]. */
function lkLiburMap(libur) {
  var m = {};
  (libur || []).forEach(function (x) { var t = lkStr(x.tanggal).slice(0, 10); if (t) m[t] = lkStr(x.keterangan) || 'Hari libur'; });
  return m;
}

/** '' bila hari kerja; selain itu alasannya (Sabtu/Minggu/nama hari libur). */
function lkHariTutup(tgl, liburMap) {
  var dt = lkDateObj(tgl);
  if (!dt) return '';
  var w = dt.getUTCDay();
  if (w === 0) return 'hari Minggu';
  if (w === 6) return 'hari Sabtu';
  var k = lkIso(dt);
  return liburMap && liburMap[k] ? 'hari libur (' + liburMap[k] + ')' : '';
}

/** Jumlah hari kerja di antara dua tanggal (tidak termasuk keduanya). null bila belum lengkap. */
function lkHariKerjaAntara(dari, sampai, liburMap) {
  var a = lkDateObj(dari), b = lkDateObj(sampai);
  if (!a || !b) return null;
  var n = 0, guard = 0;
  for (var d = new Date(a.getTime() + 86400000); d < b && guard < 800; d = new Date(d.getTime() + 86400000), guard++) {
    if (!lkHariTutup(lkIso(d), liburMap)) n++;
  }
  return n;
}

/** Pilihan jam akad tiap 30 menit. Di Kantor KUA hanya jam kerja (cfg.jam_kantor_mulai–jam_kantor_selesai). */
function lkJamSlots(kantor, cfg) {
  cfg = cfg || {};
  var toMin = function (s, def) { var m = /^(\d{1,2}):(\d{2})$/.exec(lkStr(s)); return m ? +m[1] * 60 + +m[2] : def; };
  var a = kantor ? toMin(cfg.jam_kantor_mulai, 450) : 0, b = kantor ? toMin(cfg.jam_kantor_selesai, 930) : 1410;
  var out = [];
  for (var t = a; t <= b; t += 30) out.push(('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + t % 60).slice(-2));
  return out;
}

/**
 * Pemeriksaan bawaan sistem (tidak bisa dimatikan dari Data Master):
 * jadwal akad di Kantor KUA, batas 10 hari kerja pendaftaran, poligami, dan wali.
 * ctx: {libur:[{tanggal,keterangan}], cfg:{jam_kantor_mulai, jam_kantor_selesai, min_hari_kerja}}
 */
function lkSystemChecks(d, ctx) {
  ctx = ctx || {};
  var cfg = ctx.cfg || {};
  var libur = lkLiburMap(ctx.libur);
  var w = [];
  var kantor = lkStr(d.akad_lokasi) === LK_KANTOR;
  var tgl = lkStr(d.akad_tanggal);
  if (kantor && lkParseDate(tgl)) {
    var why = lkHariTutup(tgl, libur);
    if (why) w.push({ tingkat: 'BLOKIR', field: 'akad_tanggal', pesan: 'Akad di Kantor KUA hanya pada hari kerja — ' + lkTanggalPanjang(tgl) + ' adalah ' + why + '. Pilih tanggal lain atau pilih Luar Kantor KUA (Bedolan).' });
  }
  if (kantor && lkStr(d.akad_jam) && lkJamSlots(true, cfg).indexOf(lkStr(d.akad_jam)) < 0) {
    var sl = lkJamSlots(true, cfg);
    w.push({ tingkat: 'BLOKIR', field: 'akad_jam', pesan: 'Akad di Kantor KUA hanya pada jam kerja (' + sl[0] + '–' + sl[sl.length - 1] + ').' });
  }
  var min = Number(cfg.min_hari_kerja) || 10;
  var hk = lkHariKerjaAntara(d.adm_tanggal_surat, tgl, libur);
  if (hk !== null && lkDateObj(tgl) > lkDateObj(d.adm_tanggal_surat) && hk < min) {
    w.push({ tingkat: 'PERINGATAN', field: 'akad_tanggal', pesan: 'Pendaftaran terlambat: hanya ' + hk + ' hari kerja sebelum akad (minimal ' + min + ' hari kerja). Diperlukan surat dispensasi pendaftaran nikah dari Kecamatan (Camat).' });
  }
  if (lkStr(d.suami_status_perkawinan) === 'Kawin') {
    w.push({ tingkat: 'PERINGATAN', field: 'suami_status_perkawinan', pesan: 'Calon suami berstatus Kawin (beristri lebih dari seorang) — wajib izin Pengadilan Agama.' });
  }
  if (lkPeranHas(d, 'istri')) {
    if (lkStr(d.wali_jenis) === 'Nasab' && lkStr(d.wali_hubungan) === LK_WALI_AYAH && lkStr(d.ayah_istri_status_keberadaan) && lkStr(d.ayah_istri_status_keberadaan) !== LK_ADA) {
      w.push({ tingkat: 'BLOKIR', field: 'wali_hubungan', pesan: 'Ayah calon istri berstatus ' + lkStr(d.ayah_istri_status_keberadaan) + ' — tidak dapat menjadi wali. Pilih wali nasab berikutnya atau wali hakim.' });
    }
    if (lkStr(d.wali_jenis) === 'Hakim') {
      var a = lkStr(d.wali_hakim_alasan);
      if (a === LK_WALI_HAKIM[1]) w.push({ tingkat: 'INFO', field: 'wali_hakim_alasan', pesan: 'Wali adhal ditetapkan oleh Pengadilan (PMA 30/2024 Pasal 13 ayat 6).' });
      if (a === LK_WALI_HAKIM[2]) w.push({ tingkat: 'INFO', field: 'wali_hakim_alasan', pesan: 'Wali tidak diketahui keberadaannya: lampirkan surat pernyataan bermaterai dari calon istri, disaksikan 2 orang (Pasal 13 ayat 7).' });
      if (a === LK_WALI_HAKIM[3]) w.push({ tingkat: 'INFO', field: 'wali_hakim_alasan', pesan: 'Wali dipenjara: lampirkan surat pernyataan tanggung jawab mutlak dari salah satu anggota keluarga (Pasal 13 ayat 8).' });
    }
  }
  return w;
}

/** Peringatan dari Data Master + (bila ctx diberikan) pemeriksaan bawaan sistem. */
function lkWarnings(data, warningRules, ctx) {
  var list = (warningRules || []).filter(function (w) {
    if (!lkBool(w.aktif)) return false;
    var kondisi = lkJson(w.kondisi_json, []);
    if (!kondisi.length) return false;
    return lkEvalGroup(data, { logika: w.logika, kondisi: kondisi });
  }).map(function (w) { return { pesan: w.pesan, tingkat: w.tingkat }; });
  return ctx ? list.concat(lkSystemChecks(data, ctx)) : list;
}

/* ---------------- FORMAT NILAI ---------------- */

function lkTanggalPanjang(s) {
  var d = lkParseDate(s);
  return d ? d.d + ' ' + LK_BULAN[d.m - 1] + ' ' + d.y : lkStr(s);
}

function lkTanggalPendek(s) {
  var d = lkParseDate(s);
  if (!d) return lkStr(s);
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.d) + '-' + p(d.m) + '-' + d.y;
}

function lkHari(s) {
  var d = lkParseDate(s);
  if (!d) return '';
  return LK_HARI[new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()];
}

function lkTerbilang(n) {
  n = Math.floor(Math.abs(Number(String(n).replace(/[^\d]/g, '')) || 0));
  var s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function t(x) {
    if (x < 12) return s[x];
    if (x < 20) return t(x - 10) + ' belas';
    if (x < 100) return t(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + t(x % 10) : '');
    if (x < 200) return 'seratus' + (x - 100 ? ' ' + t(x - 100) : '');
    if (x < 1000) return t(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + t(x % 100) : '');
    if (x < 2000) return 'seribu' + (x - 1000 ? ' ' + t(x - 1000) : '');
    if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + t(x % 1000) : '');
    if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta' + (x % 1e6 ? ' ' + t(x % 1e6) : '');
    if (x < 1e12) return t(Math.floor(x / 1e9)) + ' miliar' + (x % 1e9 ? ' ' + t(x % 1e9) : '');
    return t(Math.floor(x / 1e12)) + ' triliun' + (x % 1e12 ? ' ' + t(x % 1e12) : '');
  }
  return n === 0 ? 'nol' : t(n);
}

function lkKapital(s) {
  return lkStr(s).toLowerCase().replace(/(^|[\s\-\/(])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
}

/**
 * Format nilai untuk dicetak di template.
 * fmt: tanggal_panjang | tanggal | hari | kapital | huruf_besar | huruf_kecil | terbilang | kode
 */
function lkFormat(value, field, fmt) {
  var v = lkStr(value);
  if (v === '') return '-';
  var tipe = field ? field.tipe : '';
  if (!fmt) {
    if (tipe === 'TANGGAL') return lkTanggalPanjang(v);
    if (tipe === 'PILIHAN') return lkOpsiLabel(field, v);
    return v;
  }
  switch (fmt) {
    case 'tanggal_panjang': return lkTanggalPanjang(v);
    case 'tanggal': return lkTanggalPendek(v);
    case 'hari': return lkHari(v) || v;
    case 'kapital': return lkKapital(tipe === 'PILIHAN' ? lkOpsiLabel(field, v) : v);
    case 'huruf_besar': return (tipe === 'PILIHAN' ? lkOpsiLabel(field, v) : v).toUpperCase();
    case 'huruf_kecil': return (tipe === 'PILIHAN' ? lkOpsiLabel(field, v) : v).toLowerCase();
    case 'terbilang': return lkTerbilang(v);
    case 'kode': return v;
  }
  return v;
}

var LK_FORMATS = ['tanggal_panjang', 'tanggal', 'hari', 'kapital', 'huruf_besar', 'huruf_kecil', 'terbilang', 'kode'];

/** Hash FNV-1a 32-bit (hex) — penanda perubahan data per template. */
function lkHash(str) {
  var h = 0x811c9dc5;
  str = String(str);
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

/** Placeholder {{key}} / {{key|format}} dari teks. */
function lkScanPlaceholders(text) {
  var re = /\{\{\s*([a-z0-9_]+)\s*(?:\|\s*([a-z_]+)\s*)?\}\}/g;
  var out = [], seen = {}, m;
  while ((m = re.exec(text))) {
    if (seen[m[0]]) continue;
    seen[m[0]] = 1;
    out.push({ ph: m[0], key: m[1], fmt: m[2] || '' });
  }
  return out;
}

/* Agar bisa diuji di Node (diabaikan oleh Apps Script & browser). */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LK_GROUPS: LK_GROUPS, lkUmur: lkUmur, lkDerive: lkDerive, lkEvalCond: lkEvalCond, lkEvalGroup: lkEvalGroup,
    lkValidate: lkValidate, lkPackage: lkPackage, lkWarnings: lkWarnings, lkFormat: lkFormat, lkSystemChecks: lkSystemChecks,
    lkHariKerjaAntara: lkHariKerjaAntara, lkHariTutup: lkHariTutup, lkJamSlots: lkJamSlots, lkLiburMap: lkLiburMap,
    lkTerbilang: lkTerbilang, lkTanggalPanjang: lkTanggalPanjang, lkHari: lkHari, lkHash: lkHash,
    lkScanPlaceholders: lkScanPlaceholders, lkParseOpsi: lkParseOpsi, lkKapital: lkKapital
  };
}
