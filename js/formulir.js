/* =====================================================================
 * KUA-Link — formulir.js : Formulir Pengajuan (4 langkah)
 *   1. Jadwal Akad · 2. Data Calon Suami · 3. Data Calon Istri · 4. Validasi
 *
 * Instant UX:
 *  - Setiap ketikan langsung disimpan ke perangkat (localStorage) — 0 ms.
 *  - Sinkron ke server di latar belakang (4 detik setelah berhenti mengetik,
 *    saat pindah langkah, atau saat tombol Simpan Draf ditekan).
 *  - Formulir dibangun dari Field Dictionary; isian lanjutan (status
 *    perkawinan, izin orang tua, wali) muncul otomatis tepat di bawahnya.
 *  - Langkah 2 & 3 dibagi tab: Calon | Ayah | Ibu | (Pemberi Izin) | (Wali Nikah)
 *    agar formulir tidak memanjang ke bawah (nyaman di HP).
 *  - Tidak ada penguncian: desa & KUA tetap bisa mengedit, lalu cetak ulang.
 * ===================================================================== */
var Formulir = (function () {
  var esc = UI.esc, icon = UI.icon;
  var W = null, saveTimer = null;
  var LAST = 4;

  function el() { return document.getElementById('formOv'); }
  function isOpen() { return !!W; }
  function isDirty() { return !!(W && W.dirtyServer); }
  function fields() { return App.fields().filter(function (f) { return lkBool(f.aktif) && !f.turunan && f.grup !== 'Turunan'; }); }
  function desaNama() { return W && W.p ? App.desaName(W.p.desa_id) : (S.desa ? S.desa.nama_desa : ''); }
  function derived() { return lkDerive(W.data, App.fields(), { id: W.id || '', desa: desaNama(), kua: App.kuaName(), cfg: S.master.config }); }
  function wctx() { return { libur: S.master.libur || [], cfg: S.master.config }; }
  function groupFields(gkey) { return fields().filter(function (f) { return f.grup === gkey; }); }
  function stepGroups(step) { return LK_GROUPS.filter(function (g) { return g.step === step; }); }
  function groupTitle(g) { return g.label || g.key.replace(/^(Ayah|Ibu) (Suami|Istri)$/, '$1 Calon $2'); }

  /* ---------------- PENYIMPANAN LOKAL ---------------- */
  function lkey(id) { return 'lk_draft_' + (S.user ? S.user.user_id : '') + '_' + (id || 'new'); }
  function saveLocal() {
    try { localStorage.setItem(lkey(W.id), JSON.stringify({ data: W.data, at: Date.now(), base: W.rowVersion || 0 })); } catch (e) { /* penuh/diblokir: abaikan */ }
  }
  function readLocal(id) { try { return JSON.parse(localStorage.getItem(lkey(id)) || 'null'); } catch (e) { return null; } }
  function clearLocal(id) { try { localStorage.removeItem(lkey(id === undefined ? W.id : id)); } catch (e) { /* abaikan */ } }

  /* ---------------- BUKA / TUTUP ---------------- */
  /** Nilai awal: tanggal surat hari ini + kepala desa & nomor surat terakhir. Semua pilihan tetap "— Pilih —". */
  function defaults() {
    var desa = S.desa || {};
    var d = { adm_tanggal_surat: UI.today(), adm_kepala_desa: desa.kepala_desa, adm_nomor_surat: desa.nomor_surat_terakhir };
    var known = lkFieldMap(fields()), out = {};
    Object.keys(d).forEach(function (k) { if (known[k] && d[k]) out[k] = d[k]; });
    return out;
  }

  function open(id) {
    if (W && W.id === id && el()) return;
    if (window.Detail) Detail.close(true);
    forceClose(true);
    if (!id && App.isKua()) { UI.toast('Pengajuan baru dibuat oleh operator desa.', 'info'); App.go(S.baseHash); return; }
    W = { id: id, data: {}, rowVersion: null, status: 'DRAF', step: 1, sub: { 2: 'Calon Suami', 3: 'Calon Istri' }, dirtyServer: false, saving: null, pending: false, lastSaved: null, errSteps: {}, p: null, dokumen: [], visited: { 1: true }, finished: false, autoTempat: '' };
    mount();
    if (!id) {
      W.data = defaults();
      var ld = readLocal(null);
      render();
      if (ld && ld.data && Object.keys(ld.data).length > 4) offerRestore(ld);
      return;
    }
    load(id);
  }

  async function load(id) {
    el().querySelector('.ov-scroll').innerHTML = '<div class="ov-inner"><div class="card card-body"><div class="skel" style="width:35%;height:20px"></div><div class="skel mt" style="width:80%"></div><div class="skel mt-s" style="width:60%"></div></div></div>';
    var r = await API.call('getPengajuan', { id: id });
    if (!W || W.id !== id) return;
    if (!r.success) { UI.toast(r.message, 'error'); close(true); return; }
    var p = r.data.pengajuan;
    if (p.status === 'DIBATALKAN') {
      UI.toast('Pengajuan ini dibatalkan. Aktifkan kembali dulu untuk mengedit.', 'warning');
      W = null; el().remove(); App.go('#/detail/' + id); return;
    }
    W.p = p; W.status = p.status; W.rowVersion = p.row_version; W.dokumen = r.data.dokumen || [];
    W.data = r.data.data || {};
    W.autoTempat = W.data.akad_tempat || '';
    App.upsertRow(p);
    render();
    var ld = readLocal(id);
    if (ld && String(ld.base) === String(p.row_version) && JSON.stringify(ld.data) !== JSON.stringify(W.data)) offerRestore(ld);
    else if (ld) clearLocal(id);
  }

  async function offerRestore(ld) {
    var ok = await UI.confirm({ title: 'Pulihkan isian?', icon: 'history', message: 'Ada isian yang belum tersinkron ke server dari ' + new Date(ld.at).toLocaleString('id-ID') + ' di perangkat ini. Pulihkan isian tersebut?', ok: 'Pulihkan', cancel: 'Abaikan' });
    if (!W) return;
    if (ok) { W.data = ld.data; W.dirtyServer = true; render(); setSaveStatus('local'); scheduleServerSave(); }
    else clearLocal(W.id);
  }

  function mount() {
    var o = document.createElement('div');
    o.className = 'overlay';
    o.id = 'formOv';
    o.innerHTML = '<div class="ov-top"></div><div class="steps"></div><div class="meta-line"></div><div class="subtabs ftabs hidden" role="tablist"></div><div class="ov-scroll"></div><div class="ov-bottom"></div>';
    document.getElementById('overlayRoot').appendChild(o);
  }

  /** Tutup dengan menyimpan dulu. */
  async function close(skipSave) {
    if (!W) return;
    if (!skipSave && W.dirtyServer) {
      var saved = await serverSave(true);
      if (!saved) {
        var ok2 = await UI.confirm({ title: 'Belum tersimpan di server', message: 'Isian tetap aman di perangkat ini dan akan ditawarkan untuk dipulihkan saat formulir dibuka lagi. Tetap keluar?', ok: 'Keluar' });
        if (!ok2) return;
      }
    }
    var back = W.finished && W.id ? '#/detail/' + W.id : S.baseHash;
    forceClose(true);
    App.go(back || '#/dashboard');
  }

  /** Tutup tanpa dialog (dipakai router). Sinkron terakhir dikirim tanpa ditunggu. */
  function forceClose() {
    clearTimeout(saveTimer);
    UI.closeDatePicker();
    if (W && W.dirtyServer && W.id && !W.saving) {
      API.call('saveDraft', { id: W.id, data: W.data, row_version: W.rowVersion }).then(function (r) { if (r.success) { clearLocal(r.data.id); App.upsertRow(r.data.row); if (r.data.desa) App.setDesa(r.data.desa); } });
    }
    var o = el();
    if (o) o.remove();
    W = null;
  }

  /* ---------------- SIMPAN KE SERVER (latar belakang) ---------------- */
  function scheduleServerSave() {
    if (!W) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { serverSave(); }, 4000);
  }

  function serverSave(force) {
    if (!W) return Promise.resolve(true);
    clearTimeout(saveTimer);
    if (W.saving) { W.pending = true; return W.saving; }
    if (!W.dirtyServer && !force) return Promise.resolve(true);
    if (!W.dirtyServer && W.id) return Promise.resolve(true);
    var w = W, snapshot = JSON.stringify(W.data);
    setSaveStatus('saving');
    w.saving = (async function () {
      var r = await API.call('saveDraft', { id: w.id, data: JSON.parse(snapshot), row_version: w.rowVersion });
      w.saving = null;
      if (r.success && r.data.desa) App.setDesa(r.data.desa);
      if (W !== w) return r.success;
      if (r.success) {
        var wasNew = !w.id;
        w.id = r.data.id;
        w.rowVersion = r.data.row_version;
        w.status = r.data.row.status;
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
      conflict: '<span class="dot red"></span>' + esc(msg) + ' <button class="btn btn-xs" data-reload>Muat Ulang</button>'
    }[s];
    box.innerHTML = t;
    var rl = box.querySelector('[data-reload]');
    if (rl) rl.onclick = function () { var id = W.id; clearLocal(); W = null; el().remove(); open(id); };
  }

  /* ---------------- VALIDASI PER LANGKAH ---------------- */
  function allErrors() {
    var der = derived();
    var errs = lkValidate(der, fields());
    var sys = lkWarnings(der, S.master.warnings, wctx()).filter(function (w) { return w.tingkat === 'BLOKIR' && w.field; });
    var fm = App.fieldMap();
    sys.forEach(function (w) { var f = fm[w.field]; if (f) errs.push({ field: w.field, label: f.label, grup: f.grup, pesan: w.pesan }); });
    return errs;
  }
  function stepErrors() {
    var errs = allErrors();
    var by = { 1: 0, 2: 0, 3: 0 };
    errs.forEach(function (e) { var g = lkGroup(e.grup); if (g && by[g.step] !== undefined) by[g.step]++; });
    return { list: errs, by: by };
  }
  function showErr(step) { return W.step === LAST || !!W.errSteps[step]; }

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
    var kua = App.isKua();
    el().querySelector('.ov-top').innerHTML = '<div class="wordmark hide-sm" style="font-size:17px">KUA-Link<small>by Ahzani Labs</small></div><div class="divider hide-sm"></div>' +
      '<div class="ttl"><b>' + (kua ? 'Edit Data oleh KUA' : 'Form Pengajuan Surat Nikah') + '</b><span>Desa ' + esc(desaNama()) + ' — Paket Surat Pengantar Nikah</span></div>' +
      '<div class="end">' + (!W.finished && !W.id ? '<button class="btn btn-sm" data-clear>' + icon('rotate', 15) + '<span class="hide-sm">Kosongkan Isian</span></button>' : '') +
      '<button class="btn btn-ghost btn-icon" data-x aria-label="Tutup">' + icon('x', 22) + '</button></div>';
    el().querySelector('[data-x]').onclick = function () { close(); };
    var c = el().querySelector('[data-clear]');
    if (c) c.onclick = async function () {
      var ok = await UI.confirm({ title: 'Kosongkan isian?', message: 'Semua isian formulir ini dikembalikan ke nilai awal. Lanjutkan?', ok: 'Kosongkan', danger: true });
      if (!ok || !W) return;
      W.data = defaults(); W.errSteps = {}; W.dirtyServer = true; saveLocal(); render(); setSaveStatus('local'); scheduleServerSave();
    };
  }

  function renderSteps() {
    var box = el().querySelector('.steps');
    if (W.finished) { box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = '';
    var se = stepErrors();
    box.innerHTML = LK_STEPS.map(function (s, i) {
      var n = i + 1, cls = 'step';
      if (n === W.step) cls += ' active';
      else if (n < LAST && W.errSteps[n] && se.by[n]) cls += ' has-err';
      else if (W.visited[n] && n < W.step && !(n < LAST && se.by[n])) cls += ' done';
      var num = (cls.indexOf('done') >= 0) ? icon('check', 14) : n;
      return '<button class="' + cls + '" data-step="' + n + '" title="' + esc(s) + '"><span class="n">' + num + '</span><span class="t">' + esc(s) + '</span></button>';
    }).join('');
    UI.$$('[data-step]', box).forEach(function (b) { b.onclick = function () { goStep(Number(b.dataset.step)); }; });
  }

  function renderMeta() {
    if (!el()) return;
    var box = el().querySelector('.meta-line');
    var d = W.data;
    var nama = [d.suami_nama, d.istri_nama].filter(Boolean).join(' & ');
    box.innerHTML = '<span data-save></span><span class="hide-sm">·</span><span class="hide-sm">Status:</span>' + UI.pill(W.status) + '<span class="hide-sm">·</span><span>ID: <b class="mono">' + esc(W.id || '(dibuat saat disimpan)') + '</b></span>' +
      (nama ? '<span class="hide-sm">·</span><span class="hide-sm">Catin: <b style="color:var(--text)">' + esc(nama) + '</b></span>' : '') +
      '<span style="margin-left:auto" class="nowrap hide-sm">' + icon('lock', 14) + ' Data pribadi — jangan tinggalkan perangkat dalam keadaan masuk</span>';
    setSaveStatus(saveState.s, saveState.msg);
  }

  /** Tab di langkah 2 & 3: Calon | Ayah | Ibu | (Pemberi Izin) | (Wali Nikah). */
  function renderTabs(groups) {
    var box = el().querySelector('.ftabs');
    if (!groups || groups.length < 2) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.classList.remove('hidden');
    var se = showErr(W.step) ? stepErrors().list : [];
    box.innerHTML = groups.map(function (g, i) {
      var n = se.filter(function (e) { return e.grup === g.key; }).length;
      var on = g.key === W.sub[W.step];
      return '<button class="subtab' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-tab="' + esc(g.key) + '"><span class="tn">' + (i + 1) + '</span>' + esc(g.tab || groupTitle(g)) +
        (n ? '<span class="adot" title="' + n + ' isian perlu dilengkapi"></span>' : '') + '</button>';
    }).join('');
    UI.$$('[data-tab]', box).forEach(function (b) { b.onclick = function () { goTab(b.dataset.tab); }; });
    var act = box.querySelector('.active');
    if (act && act.scrollIntoView) { try { act.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* abaikan */ } }
  }

  /** Grup aktif langkah 2/3 (jatuh ke tab pertama bila tab terpilih tidak tampil). */
  function activeGroup(groups) {
    var g = groups.find(function (x) { return x.key === W.sub[W.step]; }) || groups[0];
    if (g) W.sub[W.step] = g.key;
    return g;
  }
  function goTab(key) {
    if (!W || W.sub[W.step] === key) return;
    W.sub[W.step] = key;
    UI.closeDatePicker();
    renderBody(); renderBottom();
    el().querySelector('.ov-scroll').scrollTop = 0;
  }
  /** Pindah ke tab berikutnya; isian wajib tab ini harus lengkap dulu. */
  function nextTab(groups, idx) {
    var cur = groups[idx];
    var errs = stepErrors().list.filter(function (e) { return e.grup === cur.key; });
    if (errs.length) {
      W.errSteps[W.step] = true;
      renderBody(); renderSteps();
      var first = el().querySelector('.field.err');
      if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); var i = first.querySelector('input,select,textarea'); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 250); }
      return UI.toast('Lengkapi ' + errs.length + ' isian bertanda merah di tab "' + (cur.tab || cur.key) + '".', 'warning');
    }
    serverSave();
    goTab(groups[idx + 1].key);
  }

  function visibleGroups(step) {
    var der = derived();
    return stepGroups(step).filter(function (g) { return groupFields(g.key).some(function (f) { return lkVisible(f, der); }); });
  }

  function renderBody() {
    var sc = el().querySelector('.ov-scroll');
    var html = '<div class="ov-inner">';
    if (App.isKua() && W.p) html += '<div class="banner info" style="margin-bottom:16px">' + icon('info') + '<div class="txt"><b>Edit oleh KUA.</b> Perubahan langsung tersimpan; desa menerima notifikasi untuk mencetak &amp; menandatangani ulang.</div></div>';
    var groups = [];
    if (W.step === LAST) html += reviewHtml();
    else {
      groups = visibleGroups(W.step);
      var shown = W.step === 1 ? groups : [activeGroup(groups)].filter(Boolean);
      html += shown.map(groupCards).join('') || '<div class="card">' + UI.emptyState('Tidak ada isian', '') + '</div>';
    }
    html += '</div>';
    var ae = document.activeElement;
    var focus = ae && ae.dataset ? ae.dataset.k : null;
    var selStart = null;
    try { selStart = focus ? ae.selectionStart : null; } catch (e) { selStart = null; }
    var scrollTop = sc.scrollTop;
    sc.innerHTML = html;
    sc.scrollTop = scrollTop;
    renderTabs(W.step === 2 || W.step === 3 ? groups : null);
    W.visSig = visSig();
    bindBody(sc);
    if (focus) {
      var f = sc.querySelector('[data-k="' + focus + '"]');
      if (f) { f.focus(); try { if (selStart !== null && selStart !== undefined) f.setSelectionRange(selStart, selStart); } catch (e) { /* tipe date */ } }
    }
  }

  /** Penanda field yang tampil (untuk mendeteksi perlunya render ulang). */
  function visSig() {
    if (W.step === LAST) return '';
    var der = derived();
    var groups = stepGroups(W.step).map(function (g) { return g.key; });
    return fields().filter(function (f) { return groups.indexOf(f.grup) >= 0 && lkVisible(f, der); }).map(function (f) { return f.field_key; }).join(',');
  }

  function groupCards(g) {
    var der = derived();
    var list = groupFields(g.key).filter(function (f) { return lkVisible(f, der); });
    if (!list.length) return '';
    var errMap = {};
    if (showErr(g.step)) allErrors().forEach(function (e) { if (!errMap[e.field]) errMap[e.field] = e.pesan; });
    var sysMap = {};
    lkWarnings(der, [], wctx()).forEach(function (w) { if (w.field && (w.fix || !(w.tingkat === 'BLOKIR' && errMap[w.field] === w.pesan))) (sysMap[w.field] = sysMap[w.field] || []).push(w); });
    var seksi = [];
    list.forEach(function (f) {
      var s = f.seksi || groupTitle(g).toUpperCase();
      var last = seksi[seksi.length - 1];
      if (!last || last.s !== s) seksi.push({ s: s, f: [f] }); else last.f.push(f);
    });
    var html = '';
    if (/^Izin Orang Tua/.test(g.key)) {
      html += '<div class="banner warn" style="margin-bottom:12px">' + icon('alert') + '<div class="txt"><b>Kedua orang tua ' + (g.prefix === 'izin_suami' ? 'calon suami' : 'calon istri') + ' meninggal / tidak diketahui keberadaannya</b> dan catin belum 21 tahun. Isi siapa yang bertanggung jawab memberi izin (UU 1/1974 Pasal 6 ayat 4). Data ini dipakai di Surat Izin (N5).</div></div>';
    }
    html += seksi.map(function (sk, idx) {
      var right = '';
      if (g.copyFrom && /^DOMISILI/.test(sk.s)) {
        right = '<button class="btn btn-sm" data-copy="' + esc(g.key) + '">' + icon('copy', 15) + '<span>Sama dengan ' + esc(g.copyLabel) + '</span></button>';
      } else if (sk.s === 'IDENTITAS' && (g.prefix === 'suami' || g.prefix === 'istri')) right = '<span class="sub hide-sm">Wajib sesuai KTP &amp; Akta Kelahiran</span>';
      var title = sk.s === 'IDENTITAS' ? 'IDENTITAS ' + groupTitle(g).toUpperCase() : sk.s;
      if (g.key === 'Rencana Akad') title = 'JADWAL & TEMPAT AKAD';
      var tone = /^(Calon Suami|Calon Istri)$/.test(g.key) && sk.s === 'IDENTITAS' ? ' tone-catin' : (/STATUS PERKAWINAN|IZIN/.test(sk.s) ? ' tone-gold' : '');
      return '<div class="card form-card topline' + tone + '"><div class="card-head"><h3>' + esc(title) + '</h3><div class="end">' + right + '</div></div><div class="card-body"><div class="form-grid' + (/^DOMISILI/.test(sk.s) ? ' dom' : '') + '">' +
        sk.f.map(function (f) { return fieldHtml(f, W.data[f.field_key], errMap[f.field_key], sysMap[f.field_key]); }).join('') + '</div></div></div>';
    }).join('');
    if (g.key === 'Wali Nikah' && lkStr(W.data.wali_jenis) === 'Nasab' && lkStr(W.data.wali_hubungan) === LK_WALI_AYAH) html += waliAyahCard(der);
    return html;
  }

  /** Wali = bapak kandung → tampilkan data ayah calon istri (otomatis, tidak diketik ulang). */
  function waliAyahCard(der) {
    var fm = App.fieldMap();
    var rows = [['Nama', der.wali_nama], ['Bin', der.wali_bin], ['NIK', der.wali_nik], ['Tempat, Tgl Lahir', [der.wali_tempat_lahir, der.wali_tanggal_lahir ? lkTanggalPanjang(der.wali_tanggal_lahir) : ''].filter(Boolean).join(', ')],
      ['Agama', der.wali_agama], ['Pekerjaan', der.wali_pekerjaan], ['Alamat', der.wali_alamat_lengkap]];
    var mati = lkStr(W.data.ayah_istri_status_keberadaan) && lkStr(W.data.ayah_istri_status_keberadaan) !== LK_ADA;
    return '<div class="card form-card topline tone-gold"><div class="card-head"><h3>IDENTITAS WALI</h3><div class="end"><span class="tag">Otomatis dari data Ayah Calon Istri</span></div></div><div class="card-body">' +
      (mati ? '<div class="banner danger" style="margin-bottom:12px">' + icon('xCircle') + '<div class="txt">Ayah calon istri berstatus <b>' + esc(W.data.ayah_istri_status_keberadaan) + '</b>. Pilih wali nasab berikutnya atau wali hakim.</div></div>' : '') +
      '<div class="kv">' + rows.map(function (r) { return App.kv(r[0], r[1] || '–'); }).join('') + '</div>' +
      '<p class="muted" style="font-size:12.5px;margin:12px 0 0">Untuk mengubah, edit data di tab <a href="#" data-jumpto="Ayah Istri">Ayah</a>.' + (fm.wali_nama ? '' : '') + '</p></div></div>';
  }

  function jamOptions(v) {
    var kantor = lkStr(W.data.akad_lokasi) === LK_KANTOR;
    var slots = lkJamSlots(kantor, S.master.config);
    var list = slots.map(function (s) { return { v: s, l: s + ' WIB' }; });
    if (v && slots.indexOf(v) < 0) list.unshift({ v: v, l: v + ' WIB (di luar jam kerja)' });
    return UI.options(list, v, '— Pilih —');
  }

  function fieldHtml(f, val, err, sysWarn) {
    var k = f.field_key, id = 'f_' + k, v = val === undefined ? '' : String(val);
    var req = lkBool(f.wajib) ? '<span class="req">*</span>' : '';
    var full = f.tipe === 'TEKS_PANJANG' || k === 'akad_tempat' ? ' full' : '';
    var ctl;
    var common = ' id="' + id + '" data-k="' + esc(k) + '"';
    if (k === 'akad_tanggal') {
      var disp = v ? lkHari(v) + ', ' + lkTanggalPanjang(v) : '';
      ctl = '<div class="input-wrap"><input class="input dp-input" readonly' + common + ' data-dp value="' + esc(disp) + '" placeholder="— Pilih tanggal —"><span class="suffix">' + icon('calendar', 16) + '</span></div>';
    } else if (k === 'akad_jam') {
      ctl = '<select class="select"' + common + '>' + jamOptions(v) + '</select>';
    } else {
      switch (f.tipe) {
        case 'TEKS_PANJANG': ctl = '<textarea class="textarea" rows="2"' + common + '>' + esc(v) + '</textarea>'; break;
        case 'TANGGAL': ctl = '<input class="input" type="date"' + common + ' value="' + esc(v) + '">'; break;
        case 'JAM': ctl = '<input class="input" type="time" step="1800"' + common + ' value="' + esc(v) + '">'; break;
        case 'ANGKA': ctl = '<input class="input" inputmode="numeric"' + common + ' value="' + esc(v) + '">'; break;
        case 'NIK':
          ctl = '<div class="input-wrap"><input class="input mono" inputmode="numeric" maxlength="16" autocomplete="off"' + common + ' value="' + esc(v) + '" style="padding-right:70px">' +
            '<span class="suffix' + (v.length === 16 ? ' good' : '') + '" data-nikc="' + esc(k) + '">' + (v.length === 16 ? '✓ ' : '') + v.length + '/16</span></div>';
          break;
        case 'PILIHAN':
          var ops = lkParseOpsi(f.opsi);
          // Daftar panjang (mis. 106 pekerjaan Dukcapil): pilihan dengan kotak cari
          if (ops.length > 12) ctl = '<div class="input-wrap"><input class="input cp-input" readonly' + common + ' data-cp value="' + esc(v ? lkOpsiLabel(f, v) : '') + '" placeholder="— Pilih —"><span class="suffix">' + icon('chevD', 16) + '</span></div>';
          else ctl = '<select class="select"' + common + '>' + UI.options(ops, v, '— Pilih —') + '</select>';
          break;
        case 'YA_TIDAK': ctl = '<select class="select"' + common + '>' + UI.options([{ v: 'Ya', l: 'Ya' }, { v: 'Tidak', l: 'Tidak' }], v, '— Pilih —') + '</select>'; break;
        default: ctl = '<input class="input"' + common + ' value="' + esc(v) + '"' + (/_(rt|rw)$/.test(k) ? ' inputmode="numeric" maxlength="3"' : '') + (/_(nama|tempat_lahir|desa|kecamatan|kabupaten|provinsi)$/.test(k) ? ' autocapitalize="words"' : '') + ' enterkeyhint="next">';
      }
    }
    var extra = '';
    if (k === 'suami_tanggal_lahir' || k === 'istri_tanggal_lahir') extra = '<div data-umur="' + k.split('_')[0] + '">' + umurHelp(k.split('_')[0]) + '</div>';
    if (k === 'akad_tanggal') extra = '<div data-akadinfo>' + akadInfo() + '</div>';
    if (k === 'suami_nama' || k === 'istri_nama') {
      var who = k.split('_')[0], ay = lkTanpaAlm(W.data['ayah_' + who + '_nama']);
      extra = '<div class="help">' + (who === 'suami' ? 'Bin' : 'Binti') + ': <b>' + esc(ay || '…') + '</b> — otomatis dari nama di tab <a href="#" data-jumpto="Ayah ' + (who === 'suami' ? 'Suami' : 'Istri') + '">Ayah</a></div>';
    }
    (sysWarn || []).forEach(function (w) {
      var dup = w.tingkat === 'BLOKIR' && err === w.pesan;
      // Perbaikan sekali ketuk (mis. tanggal surat → tanggal paling cepat yang diizinkan masa iddah)
      if (w.fix) extra += '<button type="button" class="btn btn-sm btn-fix" data-fix="' + esc(w.fix.field) + '" data-fixv="' + esc(w.fix.value) + '">' + icon('check', 14) + esc(w.fix.label) + '</button>';
      if (dup) return;
      extra += '<div class="' + (w.tingkat === 'INFO' ? 'info-msg' : w.tingkat === 'BLOKIR' ? 'danger-msg' : 'warn-msg') + '">' + icon(w.tingkat === 'INFO' ? 'info' : 'alert', 13) + ' ' + esc(w.pesan) +
        (w.hint && w.tingkat !== 'INFO' && W.step !== 1 ? ' <a href="#" data-gostep="1">Ubah jadwal →</a>' : '') + '</div>';
    });
    var cls = 'field' + full + (err ? ' err' : '') + (/_(rt|rw)$/.test(k) ? ' narrow' : '');
    return '<div class="' + cls + '" data-fk="' + esc(k) + '"><label for="' + id + '" title="' + esc(f.label) + '">' + esc(f.label) + req + '</label>' + ctl + extra +
      (err ? '<div class="msg">' + esc(err) + '</div>' : (f.bantuan ? '<div class="help">' + esc(f.bantuan) + '</div>' : '')) + '</div>';
  }

  /** Info di bawah tanggal akad: sisa hari kerja sejak tanggal surat. */
  function akadInfo() {
    var d = W.data;
    if (!d.akad_tanggal || !d.adm_tanggal_surat) return '';
    var hk = lkHariKerjaAntara(d.adm_tanggal_surat, d.akad_tanggal, lkLiburMap(S.master.libur));
    if (hk === null || d.akad_tanggal <= d.adm_tanggal_surat) return '';
    var min = Number(S.master.config.min_hari_kerja) || 10;
    return hk >= min ? '<div class="ok-msg">' + icon('check', 13) + ' ' + hk + ' hari kerja sejak tanggal surat (minimal ' + min + ')</div>' : '';
  }

  function umurHelp(who) {
    var der = derived();
    if (!W.data[who + '_tanggal_lahir']) return '';
    if (!W.data.akad_tanggal) return '<div class="help">Isi tanggal akad (langkah 1) untuk menghitung umur saat akad.</div>';
    var u = der[who + '_umur_saat_akad'];
    if (u === '' || u === undefined) return '';
    u = Number(u);
    var isCatin = lkPeranHas(W.data, who);
    if (u < 19) return '<div class="danger-msg">' + icon('alert', 13) + ' Umur saat akad: ' + u + ' tahun — DI BAWAH UMUR: wajib ada putusan dispensasi kawin dari Pengadilan Agama' + (isCatin ? '; Surat Izin Orang Tua (N5) otomatis disertakan' : '') + '</div>';
    if (u < 21) return '<div class="warn-msg">' + icon('alert', 13) + ' Umur saat akad: ' + u + ' tahun — perlu izin orang tua' + (isCatin ? '; Surat Izin Orang Tua (N5) otomatis disertakan' : ' (diurus desa catin tersebut)') + '</div>';
    return '<div class="ok-msg">' + icon('check', 13) + ' Umur saat akad: ' + u + ' tahun</div>';
  }

  function bindBody(sc) {
    sc.oninput = function (e) {
      var t = e.target, k = t.dataset && t.dataset.k;
      if (!k || t.readOnly || t.tagName === 'SELECT') return;
      var f = lkFieldMap(fields())[k];
      var v = t.value;
      if (f && f.tipe === 'NIK') {
        var clean = v.replace(/\D/g, '').slice(0, 16);
        if (clean !== v) { t.value = clean; v = clean; }
        var c = sc.querySelector('[data-nikc="' + k + '"]');
        if (c) { c.textContent = (v.length === 16 ? '✓ ' : '') + v.length + '/16'; c.classList.toggle('good', v.length === 16); }
      }
      if ((f && f.tipe === 'ANGKA') || /_(rt|rw)$/.test(k)) { var n = v.replace(/[^\d]/g, ''); if (n !== v) { t.value = n; v = n; } }
      setVal(k, v, t, f && f.tipe === 'TANGGAL' ? 'date' : 'text');
    };
    // Tanggal diketik per bagian (hari/bulan/tahun): render ulang setelah selesai (keluar dari isian)
    // Catatan: "onfocusout" bukan properti event di Chrome → wajib addEventListener (cukup sekali per elemen)
    if (!sc.dataset.fo) {
      sc.dataset.fo = '1';
      sc.addEventListener('focusout', function () {
        if (!W || !W.deferRender) return;
        W.deferRender = false;
        setTimeout(function () { if (W && !(document.activeElement && document.activeElement.type === 'date')) { renderBody(); renderSteps(); } else if (W) W.deferRender = true; }, 0);
      });
    }
    sc.onchange = function (e) {
      var t = e.target, k = t.dataset && t.dataset.k;
      if (!k || t.tagName !== 'SELECT') return;
      setVal(k, t.value, t, 'select');
    };
    UI.$$('[data-dp]', sc).forEach(function (inp) {
      var openDp = function () {
        var kantor = lkStr(W.data.akad_lokasi) === LK_KANTOR;
        var lm = lkLiburMap(S.master.libur);
        var idd = lkIddah(W.data, S.master.config).istri;
        UI.datePicker(inp, {
          value: W.data.akad_tanggal,
          note: (kantor ? '<span class="sw off"></span> Sabtu, Minggu &amp; hari libur — Kantor KUA tutup' : (lkStr(W.data.akad_lokasi) ? 'Luar Kantor KUA: semua hari bisa dipilih.' : 'Pilih "Nikah Di" lebih dulu agar hari libur ditandai.')) +
            (idd ? '<br>Masa iddah calon istri: akad paling cepat <b>' + esc(lkTanggalPanjang(idd.minAkad)) + '</b>.' : ''),
          dayInfo: function (iso) {
            if (idd && iso < idd.minAkad) return { off: true, title: 'Masih masa iddah calon istri (selesai ' + lkTanggalPanjang(idd.selesai) + ')' };
            var why = lkHariTutup(iso, lm);
            return { off: kantor && !!why, libur: !!lm[iso], title: why ? (kantor ? 'Kantor KUA tutup: ' : '') + why.charAt(0).toUpperCase() + why.slice(1) : '' };
          },
          onPick: function (iso) { setVal('akad_tanggal', iso, inp, 'select'); }
        });
      };
      inp.onclick = openDp;
      inp.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDp(); } };
    });
    UI.$$('[data-cp]', sc).forEach(function (inp) {
      var openCp = function () {
        var f = App.fieldMap()[inp.dataset.k];
        if (!f) return;
        UI.choicePicker(inp, { title: f.label, options: lkParseOpsi(f.opsi), value: W.data[f.field_key], onPick: function (v) { setVal(f.field_key, v, inp, 'select'); } });
      };
      inp.onclick = openCp;
      inp.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); openCp(); } };
    });
    UI.$$('[data-fix]', sc).forEach(function (b) {
      b.onclick = function () { setVal(b.dataset.fix, b.dataset.fixv, b, 'select'); UI.toast('Tanggal diubah ke ' + lkTanggalPanjang(b.dataset.fixv) + '.', 'info'); };
    });
    UI.$$('[data-copy]', sc).forEach(function (b) { b.onclick = function () { copyFrom(lkGroup(b.dataset.copy)); }; });
    UI.$$('[data-jumpto]', sc).forEach(function (a) {
      a.onclick = function (e) { e.preventDefault(); goTab(a.dataset.jumpto); };
    });
    UI.$$('[data-gostep]', sc).forEach(function (a) {
      a.onclick = function (e) { e.preventDefault(); var n = Number(a.dataset.gostep); W.step = n; W.visited[n] = true; W.errSteps[n] = true; render(); el().querySelector('.ov-scroll').scrollTop = 0; };
    });
    UI.$$('[data-goto]', sc).forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        var g = lkGroup(a.dataset.grp);
        if (!g) return;
        W.step = g.step; W.visited[g.step] = true; W.errSteps[g.step] = true;
        if (g.step === 2 || g.step === 3) W.sub[g.step] = g.key;
        render();
        setTimeout(function () { var x = el().querySelector('[data-k="' + a.dataset.goto + '"]'); if (x) { x.scrollIntoView({ block: 'center' }); x.focus(); } }, 30);
      };
    });
    if (W.step === LAST) bindReview(sc);
  }

  /** Isian otomatis setelah pilihan tertentu berubah. */
  function autoFill(k) {
    var d = W.data, cfg = S.master.config, desa = S.desa || {};
    if (k === 'peran_catin' && desa.nama_desa) {
      ['suami', 'istri'].forEach(function (p) {
        if (!lkPeranHas(d, p)) return;
        if (!d[p + '_desa']) d[p + '_desa'] = desa.nama_desa;
        if (!d[p + '_kecamatan']) d[p + '_kecamatan'] = cfg.kecamatan;
        if (!d[p + '_kabupaten']) d[p + '_kabupaten'] = cfg.kabupaten;
        if (!d[p + '_provinsi']) d[p + '_provinsi'] = cfg.provinsi;
      });
    }
    if (k === 'akad_lokasi' || k === 'jenis_pengajuan' || /^istri_(alamat|rt|rw|desa|kecamatan|kabupaten|provinsi)$/.test(k)) {
      var auto = '';
      if (d.akad_lokasi === LK_KANTOR) auto = d.jenis_pengajuan === 'REKOMENDASI_KELUAR' ? '' : 'Balai Nikah ' + App.kuaName();
      else if (d.akad_lokasi) auto = lkAlamatLengkap(d, 'istri');
      if (k !== 'akad_lokasi' && k !== 'jenis_pengajuan' && d.akad_lokasi === LK_KANTOR) return;
      if (!d.akad_tempat || d.akad_tempat === W.autoTempat) {
        if (auto) d.akad_tempat = auto; else delete d.akad_tempat;
        W.autoTempat = auto;
        var inp = el().querySelector('[data-k="akad_tempat"]');
        if (inp) inp.value = auto;
      }
    }
  }

  /** mode: 'select' = render ulang · 'text' = render bila field yang tampil berubah · 'date' = tunda sampai keluar isian */
  function setVal(k, v, input, mode) {
    if (v === '' || v === null) delete W.data[k]; else W.data[k] = v;
    W.dirtyServer = true; setSaveStatus('local');
    autoFill(k);
    saveLocal();
    var fe = input && input.closest && input.closest('.field');
    if (fe && fe.classList.contains('err')) { fe.classList.remove('err'); var m = fe.querySelector('.msg'); if (m) m.remove(); }
    if (/(_tanggal_lahir|^akad_tanggal|^peran_catin)$/.test(k)) {
      UI.$$('[data-umur]', el()).forEach(function (u) { u.innerHTML = umurHelp(u.dataset.umur); });
    }
    if (/_nama$/.test(k)) renderMeta();
    if (mode === 'date' && input && document.activeElement === input) W.deferRender = true;   // masih mengetik tanggal → tunggu keluar isian
    else if (mode === 'date') { renderBody(); renderSteps(); }
    else if (mode === 'select' || visSig() !== W.visSig) { renderBody(); renderSteps(); }
    scheduleServerSave();
  }

  function copyFrom(g) {
    var src = g.copyFrom, dst = g.prefix, n = 0;
    groupFields(g.key).forEach(function (f) {
      var suffix = f.field_key.slice(dst.length + 1);
      if (LK_DOMISILI.indexOf(suffix) < 0) return;
      var v = W.data[src + '_' + suffix];
      if (v !== undefined && v !== '') { W.data[f.field_key] = v; n++; }
    });
    if (!n) return UI.toast('Data domisili ' + g.copyLabel + ' belum diisi.', 'warning');
    W.dirtyServer = true; setSaveStatus('local');
    saveLocal();
    renderBody();
    scheduleServerSave();
    UI.toast(n + ' isian disalin dari ' + g.copyLabel + '.', 'info');
  }

  /* ---------------- NAVIGASI LANGKAH ---------------- */
  /** Maju hanya bila langkah sebelumnya lengkap; bila tidak, isian wajib ditandai merah. */
  function goStep(n) {
    if (n > W.step) {
      var se = stepErrors();
      for (var s = W.step; s < n && s < LAST; s++) {
        if (se.by[s]) {
          W.errSteps[s] = true;
          if (s !== W.step) { W.step = s; W.visited[s] = true; }
          if (s === 2 || s === 3) {
            var eg = se.list.map(function (e) { return lkGroup(e.grup); }).filter(function (g) { return g && g.step === s; });
            var vis = visibleGroups(s).map(function (g) { return g.key; });
            var hasCur = eg.some(function (g) { return g.key === W.sub[s]; });
            if (!hasCur) { var ff = eg.find(function (g) { return vis.indexOf(g.key) >= 0; }); if (ff) W.sub[s] = ff.key; }
          }
          render();
          var first = el().querySelector('.field.err');
          if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); var i = first.querySelector('input,select,textarea'); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 250); }
          UI.toast('Lengkapi ' + se.by[s] + ' isian bertanda merah di langkah "' + LK_STEPS[s - 1] + '" sebelum lanjut.', 'warning');
          return;
        }
      }
    }
    var maju = n > W.step;
    W.step = n;
    W.visited[n] = true;
    if (maju && (n === 2 || n === 3)) { var vg = visibleGroups(n); if (vg.length) W.sub[n] = vg[0].key; }   // maju → mulai dari tab pertama
    serverSave();
    renderSteps();
    renderBody();
    renderBottom();
    el().querySelector('.ov-scroll').scrollTop = 0;
  }

  function renderBottom() {
    var box = el().querySelector('.ov-bottom');
    if (W.finished) { box.innerHTML = '<div class="end"><button class="btn btn-primary" data-close>Tutup</button></div>'; box.querySelector('[data-close]').onclick = function () { close(true); }; return; }
    var right = '';
    var tabs = W.step === 2 || W.step === 3 ? visibleGroups(W.step) : [];
    var ti = tabs.findIndex(function (g) { return g.key === W.sub[W.step]; });
    var nextLbl = ti >= 0 && ti < tabs.length - 1 ? tabs[ti + 1].tab : LK_STEPS[W.step];
    if (W.step > 1 || ti > 0) right += '<button class="btn" data-prev aria-label="Sebelumnya">' + icon('arrowL', 16) + '<span class="hide-sm">Sebelumnya</span></button>';
    right += '<button class="btn" data-save-draft aria-label="Simpan Draf">' + icon('save', 16) + '<span class="hide-sm">Simpan Draf</span></button>';
    if (W.step === LAST) right += '<button class="btn btn-primary btn-gold grow-sm" data-final>' + icon('printer', 16) + 'Simpan &amp; Cetak</button>';
    else right += '<button class="btn btn-primary grow-sm" data-next><span class="hide-sm">Berikutnya:</span> ' + esc(nextLbl) + icon('arrowR', 16) + '</button>';
    box.innerHTML = '<button class="btn btn-ghost" data-exit style="color:var(--danger)" aria-label="Keluar dari Form">' + icon('logout', 16) + '<span class="hide-sm">Keluar dari Form</span></button><div class="end">' + right + '</div>';
    box.querySelector('[data-exit]').onclick = function () { close(); };
    var b;
    if ((b = box.querySelector('[data-prev]'))) b.onclick = function () {
      if (ti > 0) return goTab(tabs[ti - 1].key);
      var pn = W.step - 1;
      if (pn === 2 || pn === 3) { var pg = visibleGroups(pn); if (pg.length) W.sub[pn] = pg[pg.length - 1].key; }
      goStep(pn);
    };
    if ((b = box.querySelector('[data-next]'))) b.onclick = function () {
      if (ti >= 0 && ti < tabs.length - 1) return nextTab(tabs, ti);
      goStep(W.step + 1);
    };
    if ((b = box.querySelector('[data-save-draft]'))) b.onclick = function () {
      var btn = this;
      UI.busy(btn, async function () {
        if (!W.dirtyServer && W.id) { UI.toast('Draf sudah tersimpan.', 'info'); return; }
        var ok = await serverSave(true);
        UI.toast(ok ? 'Draf tersimpan di server.' : 'Gagal menyimpan ke server — isian aman di perangkat.', ok ? 'success' : 'error');
      });
    };
    if ((b = box.querySelector('[data-final]'))) b.onclick = function () { finalize(this); };
  }

  /* ---------------- LANGKAH 4: VALIDASI ---------------- */
  function reviewHtml() {
    var der = derived();
    var se = stepErrors();
    var pkg = lkPackage(der, S.master.rules, S.master.templates, App.fields());
    var warns = lkWarnings(der, S.master.warnings, wctx()).filter(function (w) { return !w.hint; });
    var blok = warns.filter(function (w) { return w.tingkat === 'BLOKIR'; });
    var fm = App.fieldMap();
    var f = function (k) { return lkFormat(der[k], fm[k]); };
    var orang = function (p, binLbl) { return (der[p + '_nama'] || '–') + (der[p + '_bin'] ? ' ' + binLbl + ' ' + der[p + '_bin'] : ''); };
    var sumCard = function (n, title, rows) {
      var errs = se.list.filter(function (e) { var g = lkGroup(e.grup); return g && g.step === n; });
      return '<section class="acc open"><div class="acc-h" style="cursor:default"><span class="pill ' + (errs.length ? 's-DIBATALKAN' : 's-OK') + '">' + (errs.length ? errs.length + ' perlu dilengkapi' : 'Lengkap') + '</span><h3>' + esc(title) + '</h3>' +
        '<button class="btn btn-sm" data-jump-step="' + n + '">' + icon('pencil', 14) + 'Ubah</button></div><div class="acc-b">' +
        (errs.length ? '<div class="diff" style="background:var(--danger-50);border-color:#FECACA">' + errs.slice(0, 12).map(function (e) {
          return '<div><a href="#" data-goto="' + esc(e.field) + '" data-grp="' + esc(e.grup) + '">' + esc(e.label) + '</a>: ' + esc(e.pesan) + '</div>';
        }).join('') + (errs.length > 12 ? '<div class="muted">… ' + (errs.length - 12) + ' lainnya</div>' : '') + '</div>' : '') +
        (rows ? '<div class="kv' + (errs.length ? ' mt-s' : '') + '">' + rows + '</div>' : '') + '</div></section>';
    };
    var waliTxt = lkPeranHas(der, 'istri') ? (f('wali_jenis') + (der.wali_jenis === 'Nasab' ? (der.wali_nama ? ' — ' + der.wali_nama : '') + (der.wali_hubungan ? ' (' + der.wali_hubungan + ')' : '') : der.wali_hakim_alasan ? ' — ' + der.wali_hakim_alasan : '')) : 'Diisi pada pengajuan calon istri';
    var left = sumCard(1, 'Jadwal Akad', App.kv('Jenis', f('jenis_pengajuan')) + App.kv('Pengajuan Untuk', f('peran_catin')) + App.kv('Kepala Desa', f('adm_kepala_desa')) +
      App.kv('Nomor / Tanggal Surat', (der.adm_nomor_surat || '–') + ' / ' + f('adm_tanggal_surat')) + App.kv('Hari, Tanggal Akad', der.akad_tanggal ? lkHari(der.akad_tanggal) + ', ' + lkTanggalPanjang(der.akad_tanggal) : '–') +
      App.kv('Jam · Tempat', [der.akad_jam ? der.akad_jam + ' WIB' : '', der.akad_tempat].filter(Boolean).join(' · ') || '–')) +
      sumCard(2, 'Data Calon Suami', App.kv('Calon Suami', orang('suami', 'bin')) + App.kv('Umur saat Akad', der.suami_umur_saat_akad ? der.suami_umur_saat_akad + ' tahun' : '–') +
        App.kv('Status', f('suami_status_perkawinan')) + App.kv('Orang Tua', [der.ayah_suami_nama, der.ibu_suami_nama].filter(Boolean).join(' & ') || '–')) +
      sumCard(3, 'Data Calon Istri', App.kv('Calon Istri', orang('istri', 'binti')) + App.kv('Umur saat Akad', der.istri_umur_saat_akad ? der.istri_umur_saat_akad + ' tahun' : '–') +
        App.kv('Status', f('istri_status_perkawinan')) + App.kv('Orang Tua', [der.ayah_istri_nama, der.ibu_istri_nama].filter(Boolean).join(' & ') || '–') + App.kv('Wali', waliTxt));

    var right = '<div class="card topline tone-gold"><div class="card-head"><h3 style="font-size:15px">' + icon('fileCheck', 18) + ' SURAT YANG AKAN DICETAK</h3></div><div class="card-body"><div class="doclist">' +
      (pkg.length ? pkg.map(function (t) {
        return '<div class="docitem"><span class="ic">' + icon('file', 18) + '</span><div class="nm"><b>' + esc(t.kode) + ' — ' + esc(t.label) + '</b>' + (t.alasan ? '<span>' + esc(t.alasan) + '</span>' : '<span>Selalu dalam paket</span>') + '</div>' + (t.otomatis ? '<span class="tag">Otomatis</span>' : '') + '</div>';
      }).join('') : '<div class="banner danger">' + icon('alert') + '<div class="txt">' + (der.jenis_pengajuan && der.peran_catin ? 'Tidak ada surat untuk kombinasi ini. Hubungi Admin KUA.' : 'Pilih Jenis Pengajuan &amp; Pengajuan Untuk di langkah 1.') + '</div></div>') +
      '</div><p class="muted" style="font-size:12.5px;margin-bottom:0">Daftar surat ditentukan Admin KUA per Jenis Pengajuan &amp; Pengajuan Untuk.</p></div></div>';
    if (warns.length) {
      right += '<div class="card mt" style="border-color:var(--warn-border)"><div class="card-head" style="background:var(--warn-bg)"><h3 style="font-size:15px;color:var(--warn-text)">' + icon('alert', 18) + ' PERINGATAN</h3></div><div class="card-body stack" style="gap:8px">' +
        warns.map(function (w) { return '<div class="banner ' + (w.tingkat === 'BLOKIR' ? 'danger' : w.tingkat === 'INFO' ? 'info' : 'warn') + '">' + icon(w.tingkat === 'BLOKIR' ? 'xCircle' : w.tingkat === 'INFO' ? 'info' : 'alert') + '<div class="txt">' + (w.tingkat === 'BLOKIR' ? '<b>Wajib diperbaiki:</b> ' : '') + esc(w.pesan) + '</div></div>'; }).join('') + '</div></div>';
    }
    if (se.list.length || blok.length) {
      right += '<div class="banner danger mt">' + icon('xCircle') + '<div class="txt"><b>Belum bisa dicetak.</b> Lengkapi ' + se.list.length + ' isian bertanda merah. Klik tautan di sebelah kiri untuk menuju isiannya.</div></div>';
    } else {
      right += '<div class="banner ok mt">' + icon('checkCircle') + '<div class="txt">Data lengkap. Tekan <b>Simpan &amp; Cetak</b>. Alur: cetak → tanda tangan Kepala Desa → stempel → bawa ke KUA. Data tetap bisa diedit &amp; dicetak ulang kapan saja.</div></div>';
    }
    return '<div class="split"><div>' + left + '</div><div>' + right + '</div></div>';
  }

  function bindReview(sc) {
    UI.$$('[data-jump-step]', sc).forEach(function (b) { b.onclick = function () { goStep(Number(b.dataset.jumpStep)); }; });
  }

  async function finalize(btn) {
    var se = stepErrors();
    if (se.list.length) {
      [1, 2, 3].forEach(function (s) { if (se.by[s]) W.errSteps[s] = true; });
      renderSteps(); renderBody();
      return UI.toast('Masih ada ' + se.list.length + ' isian yang perlu dilengkapi/diperbaiki.', 'error');
    }
    await UI.busy(btn, async function () {
      var saved = await serverSave(true);
      if (!saved || !W.id) return UI.toast('Gagal menyimpan ke server. Coba lagi.', 'error');
      var r = await API.call('finalize', { id: W.id, row_version: W.rowVersion });
      if (!r.success) {
        if (r.data && r.data.errors && r.data.errors.length) { W.errSteps = { 1: true, 2: true, 3: true }; renderSteps(); renderBody(); }
        return UI.toast(r.message, 'error');
      }
      W.rowVersion = r.data.row_version;
      W.status = 'SELESAI';
      W.dirtyServer = false;
      clearLocal();
      App.upsertRow(r.data.row);
      var id = W.id;
      var res = r.data.needed.length ? await Pengajuan.generateDocs(id, r.data.needed, 'Menyiapkan surat ' + id) : { ok: [], gagal: [] };
      if (!W || W.id !== id) return;
      W.finished = true;
      renderSuccess(res);
    });
  }

  async function renderSuccess(res) {
    var id = W.id;
    var desa = !App.isKua();
    renderTop(); renderSteps(); renderMeta(); renderBottom();
    el().querySelector('.ftabs').classList.add('hidden');
    var sc = el().querySelector('.ov-scroll');
    sc.innerHTML = '<div class="ov-inner" style="max-width:760px"><div class="card card-body success-card">' +
      '<div class="success-ico">' + icon('checkCircle', 34) + '</div>' +
      '<h2>' + esc(id) + ' siap dicetak</h2><p class="muted" style="margin:0 0 18px">Cetak → tanda tangan Kepala Desa → stempel → bawa ke KUA.</p>' +
      (res.gagal.length ? '<div class="banner warn" style="text-align:left;margin-bottom:16px">' + icon('alert') + '<div class="txt">Surat gagal dibuat: <b>' + esc(res.gagal.join(', ')) + '</b>. Tekan <b>Cetak Paket PDF</b> untuk mengulang.</div></div>' : '') +
      (desa && !res.gagal.length ? '<div class="kirim-box" data-kirim><div class="kb-h">' + icon('send', 18) + '<b>Pemberitahuan ke KUA</b><span class="spin-s"></span></div><div class="kb-b muted">Menyiapkan paket PDF lengkap &amp; pesan WhatsApp…</div></div>' : '') +
      '<div data-docs style="text-align:left"><div class="skel"></div></div>' +
      '<div class="row succ-act" style="justify-content:center;margin-top:20px"><button class="btn btn-primary btn-gold" data-print style="height:46px">' + icon('printer') + 'Cetak Paket PDF</button>' +
      '<a class="btn" href="#/detail/' + esc(id) + '" style="height:46px">' + icon('eye') + 'Lihat Detail</a>' +
      (desa ? '<button class="btn" data-new style="height:46px">' + icon('plus') + 'Pengajuan Baru</button>' : '') + '</div></div></div>';
    sc.querySelector('[data-print]').onclick = function () { Pengajuan.printPackage(id, this); };
    var nb = sc.querySelector('[data-new]');
    if (nb) nb.onclick = function () { forceClose(true); App.go('#/form/new'); };
    var r = await API.call('docsStatus', { id: id });
    var box = sc.querySelector('[data-docs]');
    if (!box) return;
    if (!r.success) { box.innerHTML = ''; return; }
    if (desa && !res.gagal.length) autoKirim(id, r, sc);
    var aktif = Pengajuan.sortDocs(r.data.dokumen.filter(function (d) { return d.aktif; }));
    box.innerHTML = '<div class="doclist">' + aktif.map(function (d) {
      return '<div class="docitem"><span class="ic">' + icon('fileCheck', 18) + '</span><div class="nm"><b>' + esc(d.template_kode) + ' — ' + esc(d.template_nama) + (d.untuk ? ' (' + lkUntukLabel(d.untuk) + ')' : '') + '</b><span>Versi ' + esc(d.versi_dokumen) + ' · ' + UI.waktu(d.dibuat_pada) + '</span></div>' +
        '<button class="btn btn-sm" data-dl="' + esc(d.dokumen_id) + '">' + icon('download', 15) + '<span class="hide-sm">Unduh</span></button></div>';
    }).join('') + '</div>';
    UI.$$('[data-dl]', box).forEach(function (b) { b.onclick = function () { Pengajuan.downloadDoc(aktif.find(function (d) { return d.dokumen_id === b.dataset.dl; }), b); }; });
  }

  /**
   * Setelah Simpan & Cetak berhasil (desa): paket PDF lengkap diunduh otomatis → diunggah ke Drive
   * (tautan) → dikirim ke Akad Tracker / LABUKU Desk → WhatsApp KUA dibuka (bukti daftar + tautan PDF).
   */
  async function autoKirim(id, st, sc) {
    var kb = sc.querySelector('[data-kirim]');
    var set = function (html, ok) { if (!kb || !document.body.contains(kb)) return; kb.classList.toggle('done', !!ok); var sp = kb.querySelector('.spin-s'); if (sp && ok !== undefined) sp.remove(); kb.querySelector('.kb-b').innerHTML = html; };
    try {
      var blob = await Pengajuan.buildPackage(id, st);
      UI.downloadBlob(blob, id + '_paket.pdf');
      set('Paket PDF terunduh. Mengirim ke KUA…');
      var r = await Pengajuan.uploadPaket(id, blob);
      if (!r.success) return set('<span style="color:var(--danger)">' + esc(r.message) + '</span> <button class="btn btn-sm" data-retry>Coba Lagi</button>', false), bindRetry();
      var opened = Pengajuan.openWa(r.data.wa);
      set((opened ? '<b>WhatsApp KUA sudah dibuka</b> — tinggal tekan Kirim. ' : 'Tekan tombol hijau untuk mengirim pemberitahuan ke KUA. ') +
        (r.data.wa && !r.data.wa.nomor ? '<br><span style="color:var(--warn-text)">Nomor WhatsApp KUA belum diatur Admin — pilih kontak KUA manual.</span>' : '') +
        '<div class="row mt-s" style="gap:8px;flex-wrap:wrap"><a class="btn btn-wa" href="' + esc(Pengajuan.waUrl(r.data.wa)) + '" target="_blank" rel="noopener">' + icon('chat') + 'Kirim WhatsApp ke KUA</a>' +
        '<a class="btn btn-sm" href="' + esc(r.data.paket_url) + '" target="_blank" rel="noopener">' + icon('file', 15) + 'Tautan PDF</a></div>' +
        '<div class="mt-s">' + Pengajuan.integrasiHtml(r.data.integrasi) + '</div>', true);
    } catch (e) {
      set('<span style="color:var(--danger)">' + esc(e.message) + '</span> <button class="btn btn-sm" data-retry>Coba Lagi</button>', false);
      bindRetry();
    }
    function bindRetry() {
      var b = kb && kb.querySelector('[data-retry]');
      if (b) b.onclick = function () { Pengajuan.kirimKua(id, b); };
    }
  }

  return { open: open, close: close, forceClose: forceClose, isOpen: isOpen, isDirty: isDirty };
})();
