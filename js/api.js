/* =====================================================================
 * KUA-Link — api.js
 * Semua komunikasi ke backend Apps Script lewat fetch POST.
 * Content-Type text/plain WAJIB agar tidak memicu CORS preflight.
 * ===================================================================== */
var API = (function () {
  var TOKEN_KEY = 'lk_session';

  // Sesi disimpan di localStorage agar aplikasi (termasuk versi terpasang/PWA) tidak minta login
  // setiap dibuka. Sesi tetap berakhir di server setelah 6 jam tidak aktif, dan dihapus saat Keluar.
  function session() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) {
    try { if (s) localStorage.setItem(TOKEN_KEY, JSON.stringify(s)); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* abaikan */ }
  }

  /**
   * Panggil aksi backend. Selalu resolve dengan objek {success, data, message, code}.
   * opts.timeout (ms) default 90 detik (pembuatan PDF bisa lama).
   */
  async function call(action, data, opts) {
    opts = opts || {};
    var s = session();
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeout || 90000) : null;
    var res;
    try {
      var r = await fetch(LK_CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: s ? s.token : '', data: data || {} }),
        signal: ctrl ? ctrl.signal : undefined,
        redirect: 'follow'
      });
      var text = await r.text();
      try { res = JSON.parse(text); } catch (e) {
        res = { success: false, message: 'Server mengembalikan respon tidak valid. Pastikan Web App di-deploy dengan akses "Anyone".' };
      }
    } catch (err) {
      res = {
        success: false, code: 'NETWORK',
        message: err && err.name === 'AbortError' ? 'Server terlalu lama merespon. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (res.code === 'AUTH' && action !== 'login' && window.App) App.sessionExpired(res.message);
    if (res.code === 'GANTI_PW' && window.App) App.forcePasswordChange();
    return res;
  }

  return { call: call, session: session, setSession: setSession };
})();
