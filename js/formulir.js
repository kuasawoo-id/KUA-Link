/* =====================================================================
 * KUA-Link — formulir.js : Formulir Pengajuan (5 langkah) & Koreksi KUA
 *
 * Instant UX:
 *  - Setiap ketikan langsung disimpan ke perangkat (localStorage) — 0 ms.
 *  - Sinkron ke server di latar belakang (4 detik setelah berhenti mengetik,
 *    saat pindah langkah, atau saat tombol Simpan Draf ditekan).
 *  - Formulir dibangun dari Field Dictionary — field baru dari Admin KUA
 *    otomatis muncul tanpa mengubah kode.
 * ===================================================================== */
var Formulir = (function () {
  var esc = UI.esc, icon = UI.icon;
  var W = null, saveTimer = null;
  var READONLY_DESA = ['adm_provinsi', 'adm_kabupaten', 'adm_kecamatan', 'adm_desa'];

  function el() { return document.getElementById('formOv'); }
  function isOpen() { return !!W; }
  function isDirty() { return !!(W && (W.dirtyServer || (W.mode === 'koreksi' && changedKeys().length))); }
  function fields() { return App.fields().filter(function (f) { return lkBool(f.aktif) && !f.turunan && f.grup !== 'Turunan'; }); }
  function derived() { return lkDerive(W.data, App.fields(), { id: W.id || '', desa: S.desa ? S.desa.nama_desa : '', kua: App.kuaName() }); }
  function groupFields(gkey) { return fields().filter(function (f) { return f.grup === gkey; }); }
  function stepGroups(step) { return LK_GROUPS.filter(function (g) { return g.step === step; }); }

  /* ---------------- PENYIMPANAN LOKAL ---------------- */
  function lkey(id) { return 'lk_draft_' + (S.user ? S.user.user_id : '') + '_' + (id || 'new'); }
  function saveLocal() {
    try { localStorage.setItem(lkey(W.id), JSON.stringify({ data: W.data, at: Date.now(), base: W.rowVersion || 0 })); } catch (e) { /* penuh/diblokir: abaikan */ }
  }
  function readLocal(id) { try { return JSON.parse(localStorage.getItem(lkey(id)) || 'null'); } catch (e) { return null; } }
  function clearLocal(id) { try { localStorage.removeItem(lkey(id === undefined ? W.id : id)); } catch (e) { /* abaikan */ } }

  /* ---------------- BUKA / TUTUP ---------------- */
  function defaults() {
    var cfg = S.master.config, desa = S.desa || {};
    var d = {
      jenis_pengajuan: 'NIKAH_DI_KUA', peran_catin: 'ISTRI', adm_provinsi: cfg.provinsi, adm_kabupaten: cfg.kabupaten, adm_kecamatan: cfg.kecamatan,
      adm_desa: desa.nama_desa, adm_kepala_desa: desa.kepala_desa, adm_tanggal_surat: UI.today(), akad_lokasi: 'Kantor KUA', wali_jenis: 'Nasab',
      suami_kewarganegaraan: 'WNI', istri_kewarganegaraan: 'WNI', suami_agama: 'Islam', istri_agama: 'Islam',
      istri_desa: desa.nama_desa, istri_kecamatan: cfg.kecamatan, istri_kabupaten: cfg.kabupaten, istri_provinsi: cfg.provinsi
    };
    ['ayah_suami', 'ibu_suami', 'ayah_istri', 'ibu_istri'].forEach(function (p) { d[p + '_status_keberadaan'] = 'Ada'; d[p + '_kewarganegaraan'] = 'WNI'; d[p + '_agama'] = 'Islam'; });
    var known = lkFieldMap(fields()), out = {};
    Object.keys(d).forEach(function (k) { if (known[k] && d[k]) out[k] = d[k]; });
    return out;
  }

  function open(id, mode) {
    if (W && W.id === id && W.mode === mode && el()) return;
    if (W && id && W.id === id && el()) return;
    if (window.Detail) Detail.close(true);
    forceClose(true);
    if (!id && App.isKua()) { UI.toast('Pengajuan baru dibuat oleh operator desa.', 'info'); App.go(S.baseHash); return; }
    W = { id: id, mode: mode, data: {}, orig: {}, rowVersion: null, status: 'DRAF', step: 1, sub: 'Calon Suami', dirtyServer: false, saving: null, pending: false, lastSaved: null, showErrors: false, p: null, dokumen: [], visited: { 1: true }, finished: false };
    mount();
    if (!id) {
      W.data = defaults();
      var ld = readLocal(null);
      render();
      if (ld && ld.data && Object.keys(ld.data).length > 4) offerRestore(ld);
      return;
    }
    load(id, mode);
  }

  async function load(id, mode) {
    el().querySelector('.ov-scroll').innerHTML = '<div class="ov-inner"><div class="card card-body"><div class="skel" style="width:35%;height:20px"></div><div class="skel mt" style="width:80%"></div><div class="skel mt-s" style="width:60%"></div></div></div>';
    var r = await API.call('getPengajuan', { id: id });
    if (!W || W.id !== id) return;
    if (!r.success) { UI.toast(r.message, 'error'); close(true); return; }
    var p = r.data.pengajuan;
    if (mode === 'edit' && !(p.status === 'DRAF' || p.status === 'DIKEMBALIKAN')) {
      UI.toast('Pengajuan berstatus ' + p.status + ' tidak dapat diedit' + (App.isKua() && p.status === 'TERKUNCI' ? ' — gunakan Koreksi Data.' : '.'), 'warning');
      W = null; el().remove(); App.go('#/detail/' + id); return;
    }
    if (mode === 'koreksi' && !(App.isKua() && p.status === 'TERKUNCI')) {
      UI.toast('Koreksi hanya untuk KUA pada pengajuan TERKUNCI.', 'warning');
      W = null; el().remove(); App.go('#/detail/' + id); return;
    }
    W.p = p; W.status = p.status; W.rowVersion = p.row_version; W.dokumen = r.data.dokumen || [];
    W.data = r.data.data || {};
    W.orig = JSON.parse(JSON.stringify(W.data));
    App.upsertRow(p);
    render();
    var ld = readLocal(id);
    if (ld && String(ld.base) === String(p.row_version) && JSON.stringify(ld.data) !== JSON.stringify(W.data)) offerRestore(ld);
    else if (ld) clearLocal(id);
  }

  async function offerRestore(ld) {
    var ok = await UI.confirm({ title: 'Pulihkan isian?', icon: 'history', message: 'Ada isian yang belum tersinkron ke server dari ' + new Date(ld.at).toLocaleString('id-ID') + ' di perangkat ini. Pulihkan isian tersebut?', ok: 'Pulihkan', cancel: 'Abaikan' });
    if (!W) return;
    if (ok) { W.data = ld.data; W.dirtyServer = W.mode !== 'koreksi'; render(); setSaveStatus('local'); scheduleServerSave(); }
    else clearLocal(W.id);
  }

  function mount() {
    var o = document.createElement('div');
    o.className = 'overlay';
    o.id = 'formOv';
    o.innerHTML = '<div class="ov-top"></div><div class="steps"></div><div class="meta-line"></div><div class="subtabs hidden"></div><div class="ov-scroll"></div><div class="ov-bottom"></div>';
    document.getElementById('overlayRoot').appendChild(o);
  }

  /** Tutup dengan menyimpan dulu. */
  async function close(skipSave) {
    if (!W) return;
    if (!skipSave) {
      if (W.mode === 'koreksi' && changedKeys().length) {
        var ok = await UI.confirm({ title: 'Buang koreksi?', message: 'Perubahan koreksi belum disimpan. Tutup tanpa menyimpan?', ok: 'Tutup tanpa Simpan', danger: true });
        if (!ok) return;
        clearLocal();
      } else if (W.mode !== 'koreksi' && W.dirtyServer) {
        var saved = await serverSave(true);
        if (!saved) {
          var ok2 = await UI.confirm({ title: 'Belum tersimpan di server', message: 'Isian tetap aman di perangkat ini dan akan ditawarkan untuk dipulihkan saat formulir dibuka lagi. Tetap keluar?', ok: 'Keluar' });
          if (!ok2) return;
        }
      }
    }
    var back = W.finished && W.id ? '#/detail/' + W.id : S.baseHash;
    forceClose(true);
    App.go(back || '#/dashboard');
  }

  /** Tutup tanpa dialog (dipakai router). Sinkron terakhir dikirim tanpa ditunggu. */
  function forceClose() {
    clearTimeout(saveTimer);
    if (W && W.mode !== 'koreksi' && W.dirtyServer && W.id && !W.saving) {
      API.call('saveDraft', { id: W.id, data: W.data, row_version: W.rowVersion }).then(function (r) { if (r.success) { clearLocal(r.data.id); App.upsertRow(r.data.row); } });
    }
    var o = el();
    if (o) o.remove();
    W = null;
  }

  /* ---------------- SIMPAN KE SERVER (latar belakang) ---------------- */
  function scheduleServerSave() {
    if (!W || W.mode === 'koreksi') return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { serverSave(); }, 4000);
  }

  function serverSave(force) {
    if (!W || W.mode === 'koreksi') return Promise.resolve(true);
    clearTimeout(saveTimer);
    if (W.saving) { W.pending = true; return W.saving; }
    if (!W.dirtyServer && !force) return Promise.resolve(true);
    if (!W.dirtyServer && W.id) return Promise.resolve(true);
    var w = W, snapshot = JSON.stringify(W.data);
    setSaveStatus('saving');
    w.saving = (async function () {
      var r = await API.call('saveDraft', { id: w.id, data: JSON.parse(snapshot), row_version: w.rowVersion });
      w.saving = null;
      if (W !== w) return r.success;
      if (r.success) {
        var wasNew = !w.id;
        w.id = r.data.id;
        w.rowVersion = r.data.row_version;
        App.upsertRow(r.data.row);
        if (wasNew) { clearLocal(null); history.replaceState(null, '', '#/form/' + w.id); }
        if (JSON.stringify(w.data) === snapshot) { w.dirtyServer = false; clearLocal(); } else saveLocal();
        w.lastSaved = new Date();
        setSaveStatus('saved');
        renderMeta();
        if (w.pending) { w.pending = false; return serverSave(); }
        return true;
      }
      if (r.code === 'CONFLICT') setSaveStatus('conflict', r.message);
      else if (r.code === 'LOCKED') setSaveStatus('error', r.message);
      else setSaveStatus('error', r.message);
      return false;
    })();
    return w.saving;
  }

  var saveState = { s: 'idle', msg: '' };
  function setSaveStatus(s, msg) {
    saveState = { s: s, msg: msg || '' };
    var box = el() && el().querySelector('[data-save]');
    if (!box) return;
    var t = {
      idle: '<span class="dot gray"></span>Belum ada perubahan',
      local: '<span class="dot gray"></span>Tersimpan di perangkat · menunggu sinkron',
      saving: '<span class="dot amber"></span>Menyimpan ke server…',
      saved: '<span class="dot"></span>Tersimpan otomatis ' + (W && W.lastSaved ? W.lastSaved.toTimeString().slice(0, 5) : ''),
      error: '<span class="dot red"></span>Gagal sinkron: ' + esc(msg) + ' (isian aman di perangkat)',
      conflict: '<span class="dot red"></span>' + esc(msg) + ' <button class="btn btn-xs" data-reload>Muat Ulang</button>',
      koreksi: '<span class="dot amber"></span>Mode koreksi KUA — perubahan disimpan dengan alasan'
    }[s];
    box.innerHTML = t;
    var rl = box.querySelector('[data-reload]');
    if (rl) rl.onclick = function () { var id = W.id, mode = W.mode; clearLocal(); W = null; el().remove(); open(id, mode); };
  }

  /* ---------------- RENDER ---------------- */
  function render() {
    if (!W) return;
    renderTop();
    renderSteps();
    renderMeta();
    renderBody();
    renderBottom();
  }

  function renderTop() {
    var kor = W.mode === 'koreksi';
    var desaNm = W.p ? App.desaName(W.p.desa_id) : (S.desa ? S.desa.nama_desa : '');
    el().querySelector('.ov-top').innerHTML = '<div class="wordmark hide-sm" style="font-size:17px">KUA-Link<small>by Ahzani Labs</small></div><div class="divider hide-sm" style="width:1px;height:36px;background:var(--border)"></div>' +
      '<div class="ttl"><b>' + (kor ? 'Koreksi Data oleh KUA' : 'Form Pengajuan Surat Nikah') + '</b><span>Desa ' + esc(desaNm) + ' — Paket Surat Pengantar Nikah</span></div>' +
      '<div class="end">' + (!kor && !W.finished ? '<button class="btn btn-sm" data-clear>' + icon('rotate', 15) + 'Kosongkan Isian</button>' : '') +
      '<button class="btn btn-ghost btn-icon" data-x aria-label="Tutup">' + icon('x', 22) + '</button></div>';
    el().querySelector('[data-x]').onclick = function () { close(); };
    var c = el().querySelector('[data-clear]');
    if (c) c.onclick = async function () {
      var ok = await UI.confirm({ title: 'Kosongkan isian?', message: 'Semua isian formulir ini dikembalikan ke nilai awal. Lanjutkan?', ok: 'Kosongkan', danger: true });
      if (!ok || !W) return;
      W.data = defaults(); W.dirtyServer = true; saveLocal(); render(); setSaveStatus('local'); scheduleServerSave();
    };
  }

  function stepErrors() {
    var errs = lkValidate(derived(), fields());
    var by = { 1: 0, 2: 0, 3: 0, 4: 0 }, byGroup = {};
    errs.forEach(function (e) { var g = lkGroup(e.grup); if (g) { by[g.step]++; byGroup[g.key] = (byGroup[g.key] || 0) + 1; } });
    return { list: errs, by: by, byGroup: byGroup };
  }

  function renderSteps() {
    var box = el().querySelector('.steps');
    if (W.finished) { box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = '';
    var se = W.showErrors ? stepErrors() : null;
    box.innerHTML = LK_STEPS.map(function (s, i) {
      var n = i + 1, cls = 'step';
      if (n === W.step) cls += ' active';
      else if (se && n < 5 && se.by[n]) cls += ' has-err';
      else if (W.visited[n] && n < W.step) cls += ' done';
      var num = (cls.indexOf('done') >= 0) ? icon('check', 14) : n;
      return '<button class="' + cls + '" data-step="' + n + '" title="' + esc(s) + '"><span class="n">' + num + '</span><span class="t">' + n + '. ' + esc(s) + '</span></button>';
    }).join('');
    UI.$$('[data-step]', box).forEach(function (b) { b.onclick = function () { goStep(Number(b.dataset.step)); }; });
  }

  function renderMeta() {
    if (!el()) return;
    var box = el().querySelector('.meta-line');
    var der = derived();
    var catin = der.catin_nama || '';
    box.innerHTML = '<span data-save></span><span>·</span><span>Status:</span>' + UI.pill(W.status) + '<span>·</span><span>ID: <b class="mono">' + esc(W.id || '(dibuat saat disimpan)') + '</b></span>' +
      (catin ? '<span>·</span><span>Catin: <b style="color:var(--text)">' + esc(catin) + '</b></span>' : '') +
      '<span style="margin-left:auto" class="nowrap hide-sm">' + icon('lock', 14) + ' Data pribadi — jangan tinggalkan perangkat dalam keadaan masuk</span>';
    if (W.mode === 'koreksi') setSaveStatus('koreksi'); else setSaveStatus(saveState.s === 'koreksi' ? 'idle' : saveState.s, saveState.msg);
  }

  function renderSubtabs() {
    var box = el().querySelector('.subtabs');
    if (W.step !== 2 || W.finished) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    var se = W.showErrors ? stepErrors() : null;
    box.innerHTML = stepGroups(2).map(function (g) {
      return '<button class="subtab' + (g.key === W.sub ? ' active' : '') + '" data-sub="' + esc(g.key) + '">' + esc(g.key) + (se && se.byGroup[g.key] ? '<span class="adot" title="' + se.byGroup[g.key] + ' isian perlu dilengkapi"></span>' : '') + '</button>';
    }).join('');
    UI.$$('[data-sub]', box).forEach(function (b) { b.onclick = function () { W.sub = b.dataset.sub; serverSave(); renderSubtabs(); renderBody(); renderBottom(); }; });
  }

  function renderBody() {
    renderSubtabs();
    var sc = el().querySelector('.ov-scroll');
    var html = '<div class="ov-inner">';
    if (W.status === 'DIKEMBALIKAN' && W.p && W.p.catatan_kua) html += '<div class="banner warn" style="margin-bottom:16px">' + icon('rotate') + '<div class="txt"><b>Dikembalikan KUA:</b> ' + esc(W.p.catatan_kua) + '</div></div>';
    if (W.mode === 'koreksi') html += '<div class="banner info" style="margin-bottom:16px">' + icon('info') + '<div class="txt"><b>Mode koreksi KUA.</b> Ubah data yang salah, lalu tekan <b>Simpan Koreksi</b>. Wajib menulis alasan; surat yang terdampak dibuat versi baru dan desa mendapat tanda <b>Perlu Cetak Ulang</b>.</div></div>';
    if (W.step === 5) html += reviewHtml();
    else {
      var groups = W.step === 2 ? [lkGroup(W.sub)] : stepGroups(W.step);
      var cards = groups.map(groupCards).join('');
      if (!cards.replace(/\s/g, '')) {
        html += W.step === 4 ? '<div class="card">' + UI.emptyState('Tidak ada kondisi khusus', 'Bagian ini hanya diisi bila calon suami/istri berstatus duda atau janda. Lanjutkan ke langkah berikutnya.') + '</div>' :
          W.step === 2 && W.sub === 'Wali Nikah' ? '<div class="card">' + UI.emptyState('Data wali tidak diperlukan', 'Data wali nikah diisi pada pengajuan calon istri.') + '</div>' :
            '<div class="card">' + UI.emptyState('Tidak ada isian', '') + '</div>';
      } else html += cards;
    }
    html += '</div>';
    var focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    var selStart = focus && document.activeElement.selectionStart;
    sc.innerHTML = html;
    W.visSig = visSig();
    bindBody(sc);
    if (focus) {
      var f = sc.querySelector('[data-k="' + focus + '"]');
      if (f) { f.focus(); try { if (selStart !== null && selStart !== undefined) f.setSelectionRange(selStart, selStart); } catch (e) { /* tipe date */ } }
    }
  }

  /** Penanda field yang tampil (untuk mendeteksi perlunya render ulang). */
  function visSig() {
    if (W.step === 5) return '';
    var der = derived();
    var groups = W.step === 2 ? [W.sub] : stepGroups(W.step).map(function (g) { return g.key; });
    return fields().filter(function (f) { return groups.indexOf(f.grup) >= 0 && lkVisible(f, der); }).map(function (f) { return f.field_key; }).join(',');
  }

  function groupCards(g) {
    var der = derived();
    var list = groupFields(g.key).filter(function (f) { return lkVisible(f, der); });
    if (!list.length) return '';
    var errMap = {};
    if (W.showErrors) lkValidate(der, list).forEach(function (e) { errMap[e.field] = e.pesan; });
    var seksi = [];
    list.forEach(function (f) {
      var s = f.seksi || (g.label || g.key).toUpperCase();
      var last = seksi[seksi.length - 1];
      if (!last || last.s !== s) seksi.push({ s: s, f: [f] }); else last.f.push(f);
    });
    return seksi.map(function (sk, idx) {
      var right = '';
      if (g.copyFrom && ((g.copyMode === 'domisili' && /^DOMISILI/.test(sk.s)) || (g.copyMode === 'semua' && idx === 0))) {
        right = '<button class="btn btn-sm" data-copy="' + esc(g.key) + '">' + icon('copy', 15) + (g.copyMode === 'domisili' ? 'Sama dengan Domisili ' : 'Salin dari ') + esc(g.copyLabel) + '</button>';
      } else if (sk.s === 'IDENTITAS' && (g.prefix === 'suami' || g.prefix === 'istri')) right = '<span class="sub">Wajib sesuai KTP &amp; Akta Kelahiran</span>';
      var title = sk.s === 'IDENTITAS' && g.prefix ? 'IDENTITAS ' + g.key.toUpperCase() : sk.s;
      var wideGrid = /^DOMISILI/.test(sk.s);
      return '<div class="card form-card topline"><div class="card-head"><h3>' + esc(title) + '</h3><div class="end">' + right + '</div></div><div class="card-body"><div class="form-grid' + '">' +
        sk.f.map(function (f) { return fieldHtml(f, W.data[f.field_key], errMap[f.field_key], wideGrid); }).join('') + '</div></div></div>';
    }).join('');
  }

  function fieldHtml(f, val, err) {
    var k = f.field_key, id = 'f_' + k, v = val === undefined ? '' : String(val);
    var ro = W.mode !== 'koreksi' && !App.isKua() && READONLY_DESA.indexOf(k) >= 0;
    var req = lkBool(f.wajib) ? '<span class="req">*</span>' : '';
    var full = f.tipe === 'TEKS_PANJANG' ? ' full' : '';
    var ctl;
    var common = ' id="' + id + '" data-k="' + esc(k) + '"' + (ro ? ' readonly tabindex="-1"' : '');
    switch (f.tipe) {
      case 'TEKS_PANJANG': ctl = '<textarea class="textarea" rows="2"' + common + '>' + esc(v) + '</textarea>'; break;
      case 'TANGGAL': ctl = '<input class="input" type="date"' + common + ' value="' + esc(v) + '">'; break;
      case 'JAM': ctl = '<input class="input" type="time"' + common + ' value="' + esc(v) + '">'; break;
      case 'ANGKA': ctl = '<input class="input" inputmode="numeric"' + common + ' value="' + esc(v) + '">'; break;
      case 'NIK':
        ctl = '<div class="input-wrap"><input class="input mono" inputmode="numeric" maxlength="16" autocomplete="off"' + common + ' value="' + esc(v) + '" style="padding-right:70px">' +
          '<span class="suffix' + (v.length === 16 ? ' good' : '') + '" data-nikc="' + esc(k) + '">' + (v.length === 16 ? '✓ ' : '') + v.length + '/16</span></div>';
        break;
      case 'PILIHAN': ctl = '<select class="select"' + common + (ro ? ' disabled' : '') + '>' + UI.options(lkParseOpsi(f.opsi), v, '— Pilih —') + '</select>'; break;
      case 'YA_TIDAK': ctl = '<select class="select"' + common + '>' + UI.options([{ v: 'Ya', l: 'Ya' }, { v: 'Tidak', l: 'Tidak' }], v, '— Pilih —') + '</select>'; break;
      default: ctl = '<input class="input"' + common + ' value="' + esc(v) + '">';
    }
    if (ro) ctl = ctl.replace('class="input"', 'class="input" title="Terisi otomatis dari data desa"');
    var extra = '';
    if (k === 'suami_tanggal_lahir' || k === 'istri_tanggal_lahir') extra = '<div data-umur="' + k.split('_')[0] + '">' + umurHelp(k.split('_')[0]) + '</div>';
    return '<div class="field' + full + (err ? ' err' : '') + '" data-fk="' + esc(k) + '"><label for="' + id + '" title="' + esc(f.label) + '">' + esc(f.label) + req + (ro ? ' ' + icon('lock', 12) : '') + '</label>' + ctl + extra +
      (err ? '<div class="msg">' + esc(err) + '</div>' : (f.bantuan ? '<div class="help">' + esc(f.bantuan) + '</div>' : '')) + '</div>';
  }

  function umurHelp(who) {
    var der = derived();
    if (!W.data[who + '_tanggal_lahir']) return '';
    if (!W.data.akad_tanggal) return '<div class="help">Isi tanggal akad (langkah 1) untuk menghitung umur saat akad.</div>';
    var u = der[who + '_umur_saat_akad'];
    if (u === '' || u === undefined) return '';
    u = Number(u);
    var isCatin = (W.data.peran_catin === 'SUAMI' ? 'suami' : 'istri') === who;
    if (u < 19) return '<div class="danger-msg">' + icon('alert', 13) + ' Umur saat akad: ' + u + ' tahun — memerlukan dispensasi Pengadilan Agama</div>';
    if (u < 21) return '<div class="warn-msg">' + icon('alert', 13) + ' Umur saat akad: ' + u + ' tahun — perlu izin orang tua' + (isCatin ? '; Surat Izin Orang Tua (N5) akan ditambahkan' : ' (diurus pada pengajuan desa catin tersebut)') + '</div>';
    return '<div class="ok-msg">' + icon('check', 13) + ' Umur saat akad: ' + u + ' tahun (memenuhi batas minimal UU Perkawinan)</div>';
  }

  function bindBody(sc) {
    sc.oninput = function (e) {
      var t = e.target, k = t.dataset && t.dataset.k;
      if (!k || t.readOnly) return;
      var f = lkFieldMap(fields())[k];
      var v = t.value;
      if (f && f.tipe === 'NIK') {
        var clean = v.replace(/\D/g, '').slice(0, 16);
        if (clean !== v) { t.value = clean; v = clean; }
        var c = sc.querySelector('[data-nikc="' + k + '"]');
        if (c) { c.textContent = (v.length === 16 ? '✓ ' : '') + v.length + '/16'; c.classList.toggle('good', v.length === 16); }
      }
      if (f && f.tipe === 'ANGKA') { var n = v.replace(/[^\d]/g, ''); if (n !== v) { t.value = n; v = n; } }
      setVal(k, v, t);
    };
    sc.onchange = function (e) {
      var t = e.target, k = t.dataset && t.dataset.k;
      if (!k || t.tagName !== 'SELECT') return;
      setVal(k, t.value, t);
    };
    UI.$$('[data-copy]', sc).forEach(function (b) { b.onclick = function () { copyFrom(lkGroup(b.dataset.copy)); }; });
    UI.$$('[data-goto]', sc).forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        var g = lkGroup(a.dataset.grp);
        if (!g) return;
        W.step = g.step; W.visited[g.step] = true;
        if (g.step === 2) W.sub = g.key;
        render();
        setTimeout(function () { var x = el().querySelector('[data-k="' + a.dataset.goto + '"]'); if (x) { x.scrollIntoView({ block: 'center' }); x.focus(); } }, 30);
      };
    });
    if (W.step === 5) bindReview(sc);
  }

  function setVal(k, v, input) {
    if (v === '' || v === null) delete W.data[k]; else W.data[k] = v;
    if (W.mode !== 'koreksi') { W.dirtyServer = true; setSaveStatus('local'); }
    saveLocal();
    var fe = input && input.closest('.field');
    if (fe && fe.classList.contains('err')) { fe.classList.remove('err'); var m = fe.querySelector('.msg'); if (m) m.remove(); }
    if (/(_tanggal_lahir|^akad_tanggal|^peran_catin)$/.test(k)) {
      UI.$$('[data-umur]', el()).forEach(function (u) { u.innerHTML = umurHelp(u.dataset.umur); });
    }
    if (k === 'peran_catin' || /_nama$/.test(k)) renderMeta();
    if (visSig() !== W.visSig) renderBody();
    scheduleServerSave();
  }

  function copyFrom(g) {
    var src = g.copyFrom, dst = g.prefix, n = 0;
    groupFields(g.key).forEach(function (f) {
      var suffix = f.field_key.slice(dst.length + 1);
      if (g.copyMode === 'domisili' && LK_DOMISILI.indexOf(suffix) < 0) return;
      var v = W.data[src + '_' + suffix];
      if (v !== undefined && v !== '') { W.data[f.field_key] = v; n++; }
    });
    if (!n) return UI.toast('Data ' + g.copyLabel + ' belum diisi.', 'warning');
    if (W.mode !== 'koreksi') { W.dirtyServer = true; setSaveStatus('local'); }
    saveLocal();
    renderBody();
    scheduleServerSave();
    UI.toast(n + ' isian disalin dari ' + g.copyLabel + '.', 'info');
  }

  /* ---------------- NAVIGASI LANGKAH ---------------- */
  function goStep(n) {
    if (n === 5) W.showErrors = true;
    W.step = n;
    W.visited[n] = true;
    serverSave();
    renderSteps();
    renderBody();
    renderBottom();
    el().querySelector('.ov-scroll').scrollTop = 0;
  }

  function nextTarget() {
    if (W.step === 2) {
      var gs = stepGroups(2), i = gs.findIndex(function (g) { return g.key === W.sub; });
      if (i < gs.length - 1) return { label: gs[i + 1].key, go: function () { W.sub = gs[i + 1].key; serverSave(); renderSubtabs(); renderBody(); renderBottom(); el().querySelector('.ov-scroll').scrollTop = 0; } };
    }
    if (W.step < 5) return { label: LK_STEPS[W.step], go: function () { if (W.step + 1 === 2) W.sub = stepGroups(2)[0].key; goStep(W.step + 1); } };
    return null;
  }
  function prevTarget() {
    if (W.step === 2) {
      var gs = stepGroups(2), i = gs.findIndex(function (g) { return g.key === W.sub; });
      if (i > 0) return function () { W.sub = gs[i - 1].key; renderSubtabs(); renderBody(); renderBottom(); };
    }
    if (W.step > 1) return function () { if (W.step - 1 === 2) W.sub = stepGroups(2)[stepGroups(2).length - 1].key; goStep(W.step - 1); };
    return null;
  }

  function renderBottom() {
    var box = el().querySelector('.ov-bottom');
    if (W.finished) { box.innerHTML = '<div class="end"><button class="btn btn-primary" data-close>Tutup</button></div>'; box.querySelector('[data-close]').onclick = function () { close(true); }; return; }
    var kor = W.mode === 'koreksi';
    var nx = nextTarget(), pv = prevTarget();
    var right = '';
    if (pv) right += '<button class="btn" data-prev>' + icon('arrowL', 16) + 'Sebelumnya</button>';
    if (kor) right += '<button class="btn btn-primary" data-koreksi>' + icon('save', 16) + 'Simpan Koreksi</button>';
    else right += '<button class="btn" data-save-draft>' + icon('save', 16) + 'Simpan Draf</button>';
    if (W.step === 5 && !kor) {
      right += '<button class="btn" data-preview>' + icon('eye', 16) + 'Pratinjau PDF (Draf)</button>' +
        '<button class="btn btn-primary" data-final>' + icon('lock', 16) + 'Simpan &amp; Siap Cetak</button>';
    } else if (nx) right += '<button class="btn btn-primary" data-next>Berikutnya: ' + esc(nx.label) + icon('arrowR', 16) + '</button>';
    box.innerHTML = '<button class="btn btn-ghost" data-exit style="color:var(--danger)">Keluar dari Form</button><div class="end">' + right + '</div>';
    box.querySelector('[data-exit]').onclick = function () { close(); };
    var b;
    if ((b = box.querySelector('[data-prev]'))) b.onclick = pv;
    if ((b = box.querySelector('[data-next]'))) b.onclick = nx.go;
    if ((b = box.querySelector('[data-save-draft]'))) b.onclick = function () {
      var btn = this;
      UI.busy(btn, async function () {
        if (!W.dirtyServer && W.id) { UI.toast('Draf sudah tersimpan.', 'info'); return; }
        var ok = await serverSave(true);
        UI.toast(ok ? 'Draf tersimpan di server.' : 'Gagal menyimpan ke server — isian aman di perangkat.', ok ? 'success' : 'error');
      });
    };
    if ((b = box.querySelector('[data-preview]'))) b.onclick = function () { preview(this); };
    if ((b = box.querySelector('[data-final]'))) b.onclick = function () { finalize(this); };
    if ((b = box.querySelector('[data-koreksi]'))) b.onclick = function () { saveKoreksi(this); };
  }

  /* ---------------- LANGKAH 5: PERIKSA & CETAK ---------------- */
  function reviewHtml() {
    var der = derived();
    var se = stepErrors();
    var pkg = lkPackage(der, S.master.rules, S.master.templates, App.fields());
    var warns = lkWarnings(der, S.master.warnings);
    var blok = warns.filter(function (w) { return w.tingkat === 'BLOKIR'; });
    var fm = App.fieldMap();
    var f = function (k) { return lkFormat(der[k], fm[k]); };
    var sumCard = function (n, title, rows) {
      var errs = se.list.filter(function (e) { var g = lkGroup(e.grup); return g && g.step === n; });
      return '<section class="acc open"><div class="acc-h" style="cursor:default"><span class="pill ' + (errs.length ? 's-DIKEMBALIKAN' : 's-OK') + '">' + (errs.length ? errs.length + ' perlu dilengkapi' : 'Lengkap') + '</span><h3>' + esc(title) + '</h3>' +
        '<button class="btn btn-sm" data-jump="' + n + '">' + icon('pencil', 14) + 'Ubah</button></div><div class="acc-b">' +
        (errs.length ? '<div class="diff" style="background:var(--warn-bg);border-color:var(--warn-border)">' + errs.slice(0, 12).map(function (e) {
          return '<div><a href="#" data-goto="' + esc(e.field) + '" data-grp="' + esc(e.grup) + '">' + esc(e.grup) + ' → ' + esc(e.label) + '</a>: ' + esc(e.pesan) + '</div>';
        }).join('') + (errs.length > 12 ? '<div class="muted">… ' + (errs.length - 12) + ' lainnya</div>' : '') + '</div>' : '') +
        (rows ? '<div class="kv' + (errs.length ? ' mt-s' : '') + '">' + rows + '</div>' : '') + '</div></section>';
    };
    var left = sumCard(1, 'Administrasi & Jadwal', App.kv('Jenis', f('jenis_pengajuan')) + App.kv('Pengajuan Untuk', f('peran_catin')) + App.kv('Nomor Surat Desa', f('adm_nomor_surat')) +
      App.kv('Tanggal Surat', f('adm_tanggal_surat')) + App.kv('Hari, Tanggal Akad', der.akad_tanggal ? lkHari(der.akad_tanggal) + ', ' + lkTanggalPanjang(der.akad_tanggal) : '–') + App.kv('Jam · Tempat', [der.akad_jam, der.akad_tempat].filter(Boolean).join(' · ') || '–')) +
      sumCard(2, 'Data Calon Pengantin', App.kv('Calon Suami', (der.suami_nama || '–') + (der.suami_bin ? ' bin ' + der.suami_bin : '')) + App.kv('Umur Suami saat Akad', der.suami_umur_saat_akad ? der.suami_umur_saat_akad + ' tahun' : '–') +
        App.kv('Calon Istri', (der.istri_nama || '–') + (der.istri_bin ? ' binti ' + der.istri_bin : '')) + App.kv('Umur Istri saat Akad', der.istri_umur_saat_akad ? der.istri_umur_saat_akad + ' tahun' : '–') +
        App.kv('Wali', der.peran_catin === 'ISTRI' ? (f('wali_jenis') + (der.wali_nama ? ' — ' + der.wali_nama : '')) : 'Diisi pada pengajuan calon istri')) +
      sumCard(3, 'Saksi', App.kv('Saksi 1', der.saksi1_nama || '–') + App.kv('Saksi 2', der.saksi2_nama || '–')) +
      sumCard(4, 'Kondisi Khusus', App.kv('Status Calon Suami', f('suami_status_perkawinan')) + App.kv('Status Calon Istri', f('istri_status_perkawinan')));

    var right = '<div class="card topline"><div class="card-head"><h3 style="font-size:15px">' + icon('fileCheck', 18) + ' SURAT YANG AKAN DIBUAT</h3></div><div class="card-body"><div class="doclist">' +
      (pkg.length ? pkg.map(function (t) {
        return '<div class="docitem"><span class="ic">' + icon('file', 18) + '</span><div class="nm"><b>' + esc(t.kode) + ' — ' + esc(t.nama) + '</b>' + (t.alasan ? '<span>' + esc(t.alasan) + '</span>' : '<span>Selalu dalam paket</span>') + '</div>' + (t.otomatis ? '<span class="tag">Otomatis</span>' : '') + '</div>';
      }).join('') : '<div class="banner danger">' + icon('alert') + '<div class="txt">Tidak ada template aktif. Hubungi Admin KUA.</div></div>') +
      '</div><p class="muted" style="font-size:12.5px;margin-bottom:0">Daftar surat ditentukan otomatis oleh Aturan Paket Surat dari Admin KUA.</p></div></div>';
    if (warns.length) {
      right += '<div class="card mt" style="border-color:var(--warn-border)"><div class="card-head" style="background:var(--warn-bg)"><h3 style="font-size:15px;color:var(--warn-text)">' + icon('alert', 18) + ' PERINGATAN</h3></div><div class="card-body stack" style="gap:8px">' +
        warns.map(function (w) { return '<div class="banner ' + (w.tingkat === 'BLOKIR' ? 'danger' : w.tingkat === 'INFO' ? 'info' : 'warn') + '">' + icon(w.tingkat === 'BLOKIR' ? 'xCircle' : 'alert') + '<div class="txt">' + (w.tingkat === 'BLOKIR' ? '<b>Wajib diperbaiki:</b> ' : '') + esc(w.pesan) + '</div></div>'; }).join('') + '</div></div>';
    }
    if (se.list.length || blok.length) {
      right += '<div class="banner danger mt">' + icon('lock') + '<div class="txt"><b>Belum bisa dikunci.</b> Lengkapi ' + se.list.length + ' isian' + (blok.length ? ' dan perbaiki ' + blok.length + ' peringatan wajib' : '') + '. Klik tautan di sebelah kiri untuk menuju isiannya.</div></div>';
    } else if (W.mode !== 'koreksi') {
      right += '<div class="banner ok mt">' + icon('checkCircle') + '<div class="txt">Data lengkap. Tekan <b>Simpan &amp; Siap Cetak</b> untuk mengunci data dan membuat PDF. Alur: cetak → tanda tangan Kepala Desa → stempel → bawa ke KUA.</div></div>';
    }
    return '<div class="split">' + '<div>' + left + '</div><div>' + right + '</div></div>';
  }

  function bindReview(sc) {
    UI.$$('[data-jump]', sc).forEach(function (b) { b.onclick = function () { var n = Number(b.dataset.jump); if (n === 2) W.sub = stepGroups(2)[0].key; goStep(n); }; });
  }

  async function preview(btn) {
    var win = UI.preOpen();
    try {
      await UI.busy(btn, async function () {
        var ok = await serverSave(true);
        if (!ok || !W.id) { if (win) win.close(); return UI.toast('Simpan draf ke server dulu sebelum pratinjau.', 'error'); }
        var pkg = lkPackage(derived(), S.master.rules, S.master.templates, App.fields());
        if (!pkg.length) { if (win) win.close(); return UI.toast('Tidak ada template aktif.', 'error'); }
        var out = [];
        for (var i = 0; i < pkg.length; i++) {
          btn.querySelector('span:last-child') && (btn.lastChild.textContent = 'Pratinjau ' + (i + 1) + '/' + pkg.length + '…');
          var r = await API.call('previewPdf', { id: W.id, kode: pkg[i].kode }, { timeout: 120000 });
          if (!r.success) { if (win) win.close(); return UI.toast(pkg[i].kode + ': ' + r.message, 'error'); }
          out.push({ base64: r.data.base64 });
        }
        var blob = await UI.mergePdf(out, 'DRAF - BELUM DIKUNCI');
        UI.openBlob(blob, win, (W.id || 'draf') + '_pratinjau.pdf');
      });
    } catch (e) { if (win) win.close(); UI.toast(e.message, 'error'); }
  }

  async function finalize(btn) {
    W.showErrors = true;
    var der = derived();
    var errs = lkValidate(der, fields());
    var warns = lkWarnings(der, S.master.warnings);
    if (errs.length || warns.some(function (w) { return w.tingkat === 'BLOKIR'; })) {
      renderSteps(); renderBody();
      return UI.toast('Masih ada isian yang perlu dilengkapi/diperbaiki.', 'error');
    }
    var pkg = lkPackage(der, S.master.rules, S.master.templates, App.fields());
    var ok = await UI.confirm({
      title: 'Kunci data dan buat PDF?', icon: 'lock', ok: 'Ya, Kunci & Buat PDF',
      html: 'Setelah dikunci, <b>desa tidak bisa mengedit</b>. Koreksi dilakukan melalui KUA.<br><br>Surat yang dibuat: <b>' + pkg.map(function (t) { return esc(t.kode); }).join(', ') + '</b>' +
        (warns.length ? '<br><br><span style="color:var(--warn-text)">' + icon('alert', 14) + ' ' + warns.length + ' peringatan — pastikan sudah diperhatikan.</span>' : '')
    });
    if (!ok || !W) return;
    await UI.busy(btn, async function () {
      var saved = await serverSave(true);
      if (!saved || !W.id) return UI.toast('Gagal menyimpan draf ke server. Coba lagi.', 'error');
      var r = await API.call('finalize', { id: W.id, row_version: W.rowVersion });
      if (!r.success) {
        if (r.data && r.data.errors && r.data.errors.length) { renderSteps(); renderBody(); }
        return UI.toast(r.message, 'error');
      }
      W.rowVersion = r.data.row_version;
      W.status = 'TERKUNCI';
      W.dirtyServer = false;
      clearLocal();
      App.upsertRow(r.data.row);
      var id = W.id;
      var res = r.data.needed.length ? await Pengajuan.generateDocs(id, r.data.needed, 'Membuat dokumen ' + id) : { ok: [], gagal: [] };
      if (!W || W.id !== id) return;
      W.finished = true;
      renderSuccess(res);
    });
  }

  async function renderSuccess(res) {
    var id = W.id;
    var row = Pengajuan.find(id) || {};
    renderTop(); renderSteps(); renderMeta(); renderBottom();
    el().querySelector('.subtabs').classList.add('hidden');
    var sc = el().querySelector('.ov-scroll');
    sc.innerHTML = '<div class="ov-inner" style="max-width:760px"><div class="card card-body" style="text-align:center;padding:36px 28px">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:var(--emerald-50);color:var(--emerald);display:grid;place-items:center;margin:0 auto 14px">' + icon('checkCircle', 34) + '</div>' +
      '<h2 style="margin:0 0 6px">' + esc(id) + ' terkunci &amp; siap cetak</h2><p class="muted" style="margin:0 0 18px">Cetak → tanda tangan Kepala Desa → stempel → bawa ke KUA.</p>' +
      (res.gagal.length ? '<div class="banner warn" style="text-align:left;margin-bottom:16px">' + icon('alert') + '<div class="txt">Surat gagal dibuat: <b>' + esc(res.gagal.join(', ')) + '</b>. Buka detail pengajuan dan tekan <b>Buat Dokumen</b> untuk mengulang.</div></div>' : '') +
      '<div data-docs style="text-align:left"><div class="skel"></div></div>' +
      '<div class="row" style="justify-content:center;margin-top:20px"><button class="btn btn-primary" data-print style="height:44px">' + icon('printer') + 'Cetak Paket PDF</button>' +
      (!row.pasangan_pengajuan_id && !App.isKua() ? '<button class="btn" data-partner style="height:44px">' + icon('userPlus') + 'Buat Pengajuan Pasangan</button>' : '') +
      '<a class="btn" href="#/detail/' + esc(id) + '" style="height:44px">' + icon('eye') + 'Lihat Detail</a></div></div></div>';
    sc.querySelector('[data-print]').onclick = function () { Pengajuan.printPackage(id, this); };
    var pb = sc.querySelector('[data-partner]');
    if (pb) pb.onclick = function () { var p = Pengajuan.find(id); if (p) Pengajuan.createPartner(p); };
    var r = await API.call('docsStatus', { id: id });
    var box = sc.querySelector('[data-docs]');
    if (!box) return;
    if (!r.success) { box.innerHTML = ''; return; }
    var aktif = r.data.dokumen.filter(function (d) { return d.aktif; }).sort(function (a, b) { return Pengajuan.tplOrder(a.template_kode) - Pengajuan.tplOrder(b.template_kode); });
    box.innerHTML = '<div class="doclist">' + aktif.map(function (d) {
      return '<div class="docitem"><span class="ic">' + icon('fileCheck', 18) + '</span><div class="nm"><b>' + esc(d.template_kode) + ' — ' + esc(d.template_nama) + '</b><span>Versi ' + esc(d.versi_dokumen) + ' · ' + UI.waktu(d.dibuat_pada) + '</span></div>' +
        '<button class="btn btn-sm" data-dl="' + esc(d.dokumen_id) + '">' + icon('download', 15) + 'Unduh</button></div>';
    }).join('') + '</div>';
    UI.$$('[data-dl]', box).forEach(function (b) { b.onclick = function () { Pengajuan.downloadDoc(aktif.find(function (d) { return d.dokumen_id === b.dataset.dl; }), b); }; });
  }

  /* ---------------- KOREKSI KUA ---------------- */
  function changedKeys() {
    if (!W) return [];
    var keys = {};
    Object.keys(W.orig).forEach(function (k) { keys[k] = 1; });
    Object.keys(W.data).forEach(function (k) { keys[k] = 1; });
    return Object.keys(keys).filter(function (k) { return String(W.orig[k] === undefined ? '' : W.orig[k]) !== String(W.data[k] === undefined ? '' : W.data[k]); });
  }

  async function saveKoreksi(btn) {
    var ch = changedKeys();
    if (!ch.length) return UI.toast('Belum ada perubahan data.', 'info');
    var fm = App.fieldMap();
    var ctx = { id: W.id, kua: App.kuaName() };
    var derOld = lkDerive(W.orig, App.fields(), ctx), derNew = lkDerive(W.data, App.fields(), ctx);
    var errs = lkValidate(derNew, fields());
    if (errs.length) { W.showErrors = true; renderSteps(); renderBody(); return UI.toast('Data hasil koreksi belum valid (' + errs.length + ' isian).', 'error'); }
    var chDer = Object.keys(Object.assign({}, derOld, derNew)).filter(function (k) { return String(derOld[k] || '') !== String(derNew[k] || ''); });
    var pkgOld = lkPackage(derOld, S.master.rules, S.master.templates, App.fields()).map(function (t) { return t.kode; });
    var pkgNew = lkPackage(derNew, S.master.rules, S.master.templates, App.fields());
    var activeDoc = {};
    W.dokumen.forEach(function (d) { if (d.aktif) activeDoc[d.template_kode] = d; });
    var affected = pkgNew.filter(function (t) {
      if (!activeDoc[t.kode]) return true;
      var tpl = S.master.templates.find(function (x) { return x.kode === t.kode && String(x.versi) === String(activeDoc[t.kode].template_versi); });
      var keys = tpl ? lkJson(tpl.placeholder_list, []) : [];
      return keys.some(function (k) { return chDer.indexOf(k) >= 0 && k !== 'sys_tanggal_cetak'; });
    });
    var removed = pkgOld.filter(function (k) { return !pkgNew.some(function (t) { return t.kode === k; }); });
    var m = UI.modal({
      title: 'Simpan Koreksi', icon: 'save', size: 'wide',
      body: '<div class="caption" style="margin-bottom:8px">Field berubah (' + ch.length + ')</div><div class="diff">' + ch.slice(0, 25).map(function (k) {
        var f = fm[k];
        return '<div><b>' + esc(f ? f.label : k) + (f ? ' <span class="muted">(' + esc(f.grup) + ')</span>' : '') + ':</b> <s>' + esc(lkFormat(W.orig[k], f)) + '</s> → <ins>' + esc(lkFormat(W.data[k], f)) + '</ins></div>';
      }).join('') + '</div>' +
        '<div class="caption mt" style="margin-bottom:8px">Dokumen yang akan dibuat ulang</div>' +
        (affected.length ? '<div class="row">' + affected.map(function (t) { var a = activeDoc[t.kode]; return '<span class="pill s-CETAK">' + esc(t.kode) + (a ? ' v' + a.versi_dokumen + ' → v' + (Number(a.versi_dokumen) + 1) : ' (baru)') + '</span>'; }).join('') + '</div>' : '<p class="muted" style="margin:0">Tidak ada surat yang terdampak.</p>') +
        (removed.length ? '<p class="muted">Tidak lagi dibutuhkan (ditandai usang): ' + esc(removed.join(', ')) + '</p>' : '') +
        '<div class="field mt"><label>Alasan koreksi<span class="req">*</span></label><textarea class="textarea" data-alasan placeholder="Mis. Alamat calon suami salah, sesuai KK" autofocus></textarea></div>' +
        '<div class="banner info mt">' + icon('info') + '<div class="txt">Desa akan menerima tanda <b>Perlu Cetak &amp; TTD Ulang</b> beserta daftar perubahan ini.</div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-ok>' + icon('save', 16) + 'Simpan &amp; Buat Ulang Dokumen</button>'
    });
    m.root.querySelector('[data-ok]').onclick = function () {
      var alasan = m.root.querySelector('[data-alasan]').value.trim();
      if (!alasan) { m.root.querySelector('[data-alasan]').closest('.field').classList.add('err'); return; }
      var b = this;
      UI.busy(b, async function () {
        var r = await API.call('kuaUpdate', { id: W.id, data: W.data, alasan: alasan, row_version: W.rowVersion });
        if (!r.success) return UI.toast(r.message, 'error');
        m.close();
        App.upsertRow(r.data.row);
        clearLocal();
        var id = W.id;
        W.orig = JSON.parse(JSON.stringify(W.data));
        if (r.data.needed.length) await Pengajuan.generateDocs(id, r.data.needed, 'Membuat ulang dokumen ' + id);
        UI.toast('Koreksi tersimpan. Desa diberi tanda Perlu Cetak Ulang.');
        forceClose(true);
        App.go('#/detail/' + id);
      });
    };
  }

  return { open: open, close: close, forceClose: forceClose, isOpen: isOpen, isDirty: isDirty };
})();
