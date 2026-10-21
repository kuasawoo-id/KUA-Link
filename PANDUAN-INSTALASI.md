# Panduan Instalasi — LABUKU Link V1

Arsitektur:
- **Backend** = Google Apps Script (8 berkas) yang menyimpan data di Google Sheets, membuat PDF dari Google Docs, dan menyimpannya di Google Drive.
- **Frontend** = folder ini (`index.html`, `css/`, `js/`), di-hosting di **GitHub Pages**.

Keduanya berkomunikasi lewat URL Web App `/exec`.

> Kerjakan **Bagian A (backend)** sampai selesai dulu. URL `/exec` dari Bagian A dibutuhkan di Bagian B.

---

## A. Backend — Google Apps Script

**Gunakan akun Google khusus aplikasi milik KUA** (mis. `labukulink.kuasawoo@gmail.com`), bukan Gmail pribadi. Semua data, PDF, dan template akan dimiliki akun ini.

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `LABUKU Link`.
2. **Project Settings** (ikon gerigi) → centang **Show "appsscript.json" manifest file in editor**.
3. Kembali ke **Editor**. Buat berkas sesuai daftar di bawah. Klik **+ → Script**, ketik nama **tanpa** `.gs`, lalu tempel seluruh isinya:

   | Berkas | Isi |
   |---|---|
   | `appsscript.json` | ganti seluruh isi bawaan |
   | `Kode` | ganti isi `Code.gs` bawaan, lalu ganti nama menjadi `Kode` |
   | `Aturan` | aturan bersama (identik dengan `js/rules.js`) |
   | `Pengajuan` | siklus pengajuan |
   | `Dokumen` | template & PDF |
   | `Master` | akun, field, aturan |
   | `Laporan` | riwayat & arsip |
   | `Setup` | instalasi pertama |

4. Buka berkas `Setup`. Periksa daftar **DESA** dan **NAMA_KUA** di bagian atas, sesuaikan bila perlu, lalu **Simpan** (Ctrl+S).
5. Pilih fungsi **`setupAppEnvironment`** di menu atas, lalu klik **▶ Run**.
   - Klik **Review permissions** → pilih akun → **Advanced → Go to LABUKU Link (unsafe)** → **Allow**.
   - Peringatan "unsafe" muncul karena aplikasi ini milik Anda sendiri dan belum diverifikasi Google. Ini normal.
6. Buka **Execution log**:
   - **SALIN daftar username dan password sementara** (1 Admin KUA + 14 desa). Daftar ini **tidak ditampilkan lagi**.
   - Cek Google Drive: folder `📁 LABUKU Link` berisi `01_Template_Sumber` … `06_Cadangan` dan spreadsheet database.
   - ⚠️ **Jangan jalankan `setupAppEnvironment` dua kali.**
7. **Deploy → New deployment**:
   - Klik ikon gerigi → pilih **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Klik **Deploy**, lalu **SALIN URL** yang berakhiran `/exec`.
8. Uji: buka URL `/exec` di browser. Harus muncul teks JSON `"LABUKU Link API aktif"` dengan `"siap":true`.

### Memperbarui backend di kemudian hari
Setelah mengubah kode: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.

Cara ini membuat URL `/exec` tetap sama. Jangan pakai "New deployment", karena akan menghasilkan URL baru.

### Fungsi darurat (jalankan dari editor)
| Fungsi | Kegunaan |
|---|---|
| `resetPasswordAdminDarurat` | Admin lupa password. Password sementara baru tampil di log. |
| `bersihkanCache` | Setelah mengedit sheet secara manual. |
| `cleanupTemp` | Membuang file sementara. Sudah berjalan otomatis setiap hari pukul 02.00. |

---

## B. Frontend — GitHub Pages

1. Buka berkas **`js/config.js`** dengan Notepad. Ganti nilai `GAS_URL` dengan URL `/exec` dari langkah A7:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/AKfy..../exec',
   ```
   Simpan.
2. **Folder yang di-`git init` adalah folder ini** — folder yang langsung berisi `index.html`, `css/`, dan `js/`. Jangan pakai folder induknya.
3. Ikuti langkah GitHub Pages: install Git → buat repository **Public** → `git init` → `git add .` → `git commit` → `git push` → **Settings → Pages → Deploy from a branch: main / (root)** → centang **Enforce HTTPS**. Panduan langkah demi langkah diberikan di percakapan.
4. Buka `https://USERNAME.github.io/NAMA-REPO/`.

Repository publik **aman**: frontend tidak berisi data maupun kata sandi. Seluruh data tetap di Google Sheets/Drive milik akun KUA, dan setiap permintaan diperiksa login di server.

---

## C. Langkah Pertama Setelah Online

1. **Masuk sebagai Admin KUA** (`admin.kua` + password sementara), lalu ganti password.
2. **Data Master → Akun Desa**:
   - Isi **Nama Kepala Desa** setiap desa. Nama ini otomatis mengisi formulir dan tanda tangan di surat.
   - Periksa ejaan nama desa.
3. **Data Master → Template Surat** — wajib sebelum dipakai resmi:
   - Template bawaan bertanda **[CONTOH]**, bukan format resmi.
   - Buat ulang setiap surat sesuai format resmi yang berlaku di Google Docs, di folder `01_Template_Sumber`.
   - Pakai penanda dari menu *Daftar Penanda*, misalnya `{{catin_nama}}` atau `{{akad_tanggal|hari}}`.
   - Daftarkan sebagai **versi baru** dengan kode yang sama (N1, N2, …): **Cek Penanda → Uji PDF → Aktifkan**.
4. **Data Master → Aturan Paket Surat**:
   - Tentukan isi paket untuk **Rekomendasi Keluar** (kolom *Berlaku Untuk*).
   - Periksa aturan N5 dan N6.
5. Bagikan username dan password sementara ke operator masing-masing desa. Mereka wajib mengganti password saat login pertama.

---

## D. Pemecahan Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Halaman bertuliskan "Belum dikonfigurasi" | `GAS_URL` di `js/config.js` belum diisi. Isi, lalu push ulang. |
| "Tidak dapat terhubung ke server" | URL `/exec` salah, atau deployment bukan **Anyone**. Cek langkah A7–A8. |
| "Server mengembalikan respon tidak valid" | Biasanya akses Web App bukan "Anyone", sehingga Google mengembalikan halaman login. |
| "Aplikasi belum di-setup" | `setupAppEnvironment` belum dijalankan atau gagal di tengah. Cek log. |
| PDF lama dibuat (±5–10 detik per surat) | Normal. Google Docs → PDF memang memerlukan waktu. Biarkan jendela progres sampai selesai. |
| Perubahan di sheet tidak muncul | Data master di-cache 1 jam. Jalankan `bersihkanCache`, atau ubah lewat menu Data Master. |
| Pop-up PDF tidak terbuka | Izinkan pop-up untuk situs GitHub Pages Anda. Bila diblokir, berkas otomatis diunduh. |

---

## E. Keamanan & Data Pribadi (UU 27/2022)

- Login per desa dengan password ber-hash. Akun terkunci 15 menit setelah 5 kali gagal. Sesi berakhir 6 jam setelah tidak aktif.
- Desa hanya dapat mengakses data desanya sendiri. Pembatasan ini diperiksa di server.
- Spreadsheet dan folder Drive **jangan dibagikan** ke siapa pun.
- Isian formulir yang belum tersinkron disimpan sementara di browser perangkat. Isian itu dihapus otomatis setelah tersimpan di server atau saat **Keluar**. **Selalu Keluar** setelah selesai, terutama di komputer bersama.
