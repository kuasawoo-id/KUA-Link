/* =====================================================================
 * LABUKU Link — ATURAN BERSAMA
 * File ini IDENTIK dengan backend "Aturan.gs".
 * Jika mengubah salah satu, salin perubahan ke yang lain.
 * Berisi: grup formulir, evaluasi kondisi, umur saat akad, validasi,
 * paket surat, peringatan, dan format nilai untuk template.
 * ===================================================================== */

var LK_STEPS = ['Administrasi & Jadwal', 'Data Catin', 'Saksi', 'Kondisi Khusus', 'Periksa & Cetak'];

var LK_GROUPS = [
  { key: 'Administrasi', step: 1, label: 'Administrasi Desa' },
  { key: 'Rencana Akad', step: 1, label: 'Jenis & Jadwal Akad' },
  { key: 'Calon Suami', step: 2, prefix: 'suami' },
  { key: 'Ayah Suami', step: 2, prefix: 'ayah_suami', copyFrom: 'suami', copyLabel: 'Calon Suami', copyMode: 'domisili' },
  { key: 'Ibu Suami', step: 2, prefix: 'ibu_suami', copyFrom: 'suami', copyLabel: 'Calon Suami', copyMode: 'domisili' },
  { key: 'Calon Istri', step: 2, prefix: 'istri', copyFrom: 'suami', copyLabel: 'Calon Suami', copyMode: 'domisili' },
  { key: 'Ayah Istri', step: 2, prefix: 'ayah_istri', copyFrom: 'istri', copyLabel: 'Calon Istri', copyMode: 'domisili' },
  { key: 'Ibu Istri', step: 2, prefix: 'ibu_istri', copyFrom: 'istri', copyLabel: 'Calon Istri', copyMode: 'domisili' },
  { key: 'Wali Nikah', step: 2, prefix: 'wali', copyFrom: 'ayah_istri', copyLabel: 'Ayah Istri', copyMode: 'semua' },
  { key: 'Saksi', step: 3, label: 'Saksi Nikah' },
  { key: 'Kondisi Calon Suami', step: 4, label: 'Kondisi Khusus Calon Suami' },
  { key: 'Kondisi Calon Istri', step: 4, label: 'Kondisi Khusus Calon Istri' },
  { key: 'Turunan', step: 0, label: 'Field Otomatis (tidak tampil di formulir)' }
];

var LK_DOMISILI = ['alamat', 'rt', 'rw', 'desa', 'kecamatan', 'kabupaten', 'provinsi'];

var LK_TYPES = ['TEKS', 'TEKS_PANJANG', 'ANGKA', 'NIK', 'TANGGAL', 'JAM', 'PILIHAN', 'YA_TIDAK'];

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

/** Gabungan alamat: "Alamat RT 01 RW 02, Desa X, Kec. Y, Kab. Z" */
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
 *  SYS:nomor_pengajuan | tanggal_cetak | nama_desa | nama_kua | jenis_kelamin_catin
 *  CATIN:<pola>                  pola berisi {p} = suami/istri sesuai catin pengajuan ini
 *  PASANGAN:<pola>               {p} = pasangannya
 */
function lkDerive(data, fields, ctx) {
  var out = {};
  var k;
  for (k in data) if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k];
  ctx = ctx || {};
  var me = lkStr(out.peran_catin) === 'SUAMI' ? 'suami' : 'istri';
  var other = me === 'suami' ? 'istri' : 'suami';
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
      else if (arg === 'nama_desa') out[f.field_key] = ctx.desa || out.adm_desa || '';
      else if (arg === 'nama_kua') out[f.field_key] = ctx.kua || '';
      else if (arg === 'jenis_kelamin_catin') out[f.field_key] = me === 'suami' ? 'Laki-laki' : 'Perempuan';
    }
  });
  // Tahap 2: rujukan catin / pasangan (boleh merujuk hasil tahap 1)
  list.forEach(function (f) {
    var t = lkStr(f.turunan);
    var i = t.indexOf(':');
    var jenis = t.slice(0, i), arg = t.slice(i + 1);
    if (jenis === 'CATIN' || jenis === 'PASANGAN') {
      out[f.field_key] = lkStr(out[arg.replace(/\{p\}/g, jenis === 'CATIN' ? me : other)]);
    } else if (jenis === 'ALAMAT' && arg.indexOf('{p}') >= 0) {
      out[f.field_key] = lkAlamatLengkap(out, arg.replace(/\{p\}/g, me));
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

/**
 * Paket surat: aturan aktif yang terpenuhi, hanya untuk template yang aktif.
 * templates: daftar template (semua versi); dipakai versi aktif per kode.
 */
function lkPackage(data, rules, templates, fields) {
  var fmap = lkFieldMap(fields);
  var tpl = {};
  (templates || []).forEach(function (t) { if (lkBool(t.aktif)) tpl[t.kode] = t; });
  var jenis = lkStr(data.jenis_pengajuan);
  var out = {};
  (rules || []).forEach(function (r) {
    if (!lkBool(r.aktif) || !tpl[r.template_kode]) return;
    var bj = lkStr(r.berlaku_untuk_jenis);
    if (bj && bj !== 'SEMUA' && bj.split(';').indexOf(jenis) < 0) return;
    var kondisi = lkJson(r.kondisi_json, []);
    var g = { logika: r.logika, kondisi: kondisi };
    if (r.mode !== 'SELALU' && !lkEvalGroup(data, g)) return;
    var alasan = '';
    if (r.mode !== 'SELALU') {
      alasan = kondisi.filter(function (c) { return lkEvalCond(data, c); })
        .map(function (c) { return lkDescribeCond(c, data, fmap); }).join('; ');
    }
    if (!out[r.template_kode]) {
      var t = tpl[r.template_kode];
      out[r.template_kode] = { kode: t.kode, nama: t.nama, versi: t.versi, urutan: Number(t.urutan_paket) || 99, otomatis: r.mode !== 'SELALU', alasan: alasan };
    }
  });
  return Object.keys(out).map(function (k) { return out[k]; })
    .sort(function (a, b) { return a.urutan - b.urutan; });
}

function lkWarnings(data, warningRules) {
  return (warningRules || []).filter(function (w) {
    if (!lkBool(w.aktif)) return false;
    var kondisi = lkJson(w.kondisi_json, []);
    if (!kondisi.length) return false;
    return lkEvalGroup(data, { logika: w.logika, kondisi: kondisi });
  }).map(function (w) { return { pesan: w.pesan, tingkat: w.tingkat }; });
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
    lkValidate: lkValidate, lkPackage: lkPackage, lkWarnings: lkWarnings, lkFormat: lkFormat,
    lkTerbilang: lkTerbilang, lkTanggalPanjang: lkTanggalPanjang, lkHari: lkHari, lkHash: lkHash,
    lkScanPlaceholders: lkScanPlaceholders, lkParseOpsi: lkParseOpsi, lkKapital: lkKapital
  };
}
