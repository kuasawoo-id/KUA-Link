# Panduan Instalasi — KUA-Link v1.2

Arsitektur:
- **Backend** = Google Apps Script (8 berkas) yang menyimpan data di Google Sheets, membuat PDF dari Google Docs, dan menyimpannya di Google Drive.
- **Frontend** = folder ini (`index.html`, `css/`, `js/`, `icons/`, `sw.js`, `manifest.webmanifest`), di-hosting di **GitHub Pages**. Bisa dipasang sebagai aplikasi (PWA) di laptop/PC dan HP.

Keduanya berkomunikasi lewat URL Web App `/exec`.

> Kerjakan **Bagian A (backend)** sampai selesai dulu. URL `/exec` dari Bagian A dibutuhkan di Bagian B.

Struktur Google Drive setelah setup:

```
📁 Database by Ahzani Labs          ← folder induk (dipakai bersama aplikasi lain; dibuat bila belum ada)
 └── 📁 KUA-Link
      ├── 01_Template_Sumber
      ├── 02_Template_Beku
      ├── 03_Dokumen
      ├── 04_Temp
      ├── 05_Arsip_Data
      ├── 06_Cadangan
      └── 🗃️ Database — KUA-Link (spreadsheet)
```

---

## Alur Kerja v1.2 (ringkas)

- **Desa** mengisi 4 langkah: **Jadwal Akad → Data Calon Suami → Data Calon Istri → Validasi**, lalu **Simpan & Cetak** → tanda tangan Kepala Desa → stempel → bawa ke KUA.
- **Tidak ada penguncian, pengembalian, atau "perlu cetak ulang".** Data tetap bisa diedit desa kapan saja; cetak ulang bila ada perubahan.
- **KUA** cukup membuka pengajuan → **Edit Data** bila ada yang salah. Desa otomatis mendapat notifikasi untuk mencetak & menandatangani ulang.
- **Pengajuan Untuk**: Calon Suami, Calon Istri, atau **Calon Suami & Calon Istri** (keduanya warga desa yang sama — cukup satu pengajuan).
- Status: **Draf** (belum lengkap) · **Siap Cetak** (lengkap) · **Dibatalkan**.

## Sudah Pernah Memasang Versi Sebelumnya?

Struktur data v1.2 berubah (field alamat, status perkawinan, wali, hari libur, aturan surat). **Wajib instal ulang dari awal**, di proyek Apps Script yang **sama**:
1. Di Google Drive, hapus (pindahkan ke Sampah) folder database lama — `📁 LABUKU Link` dan/atau `Database by Ahzani Labs / KUA-Link`. **Jangan** hapus folder induk `Database by Ahzani Labs` bila berisi aplikasi lain.
2. Ganti isi **8 berkas** di proyek Apps Script dengan versi ini, lalu lanjutkan dari **langkah A4**. Setup otomatis membersihkan pengaturan lama karena database lamanya sudah dihapus.
3. Pada **langkah A8**, jangan buat deployment baru. Pakai **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**, supaya URL `/exec` tetap sama dan `GAS_URL` di GitHub tidak perlu diubah.
4. Semua akun lama ikut hilang bersama database lama. Akun desa dibuat ulang oleh Admin (Bagian D).
5. Frontend di GitHub: **salin dulu `GAS_URL`** dari `js/config.js` lama → ekstrak ZIP baru ke folder repo (timpa) → tempel kembali `GAS_URL` di `js/config.js` → `git add .` → `git commit -m "KUA-Link v1.2: alur sederhana, tampilan hijau-emas"` → `git push`.

---

## A. Backend — Google Apps Script

Gunakan akun Google yang sama dengan pemilik folder **Database by Ahzani Labs** (bila sudah ada). Semua data, PDF, dan template akan dimiliki akun ini.

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `KUA-Link`.
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
5. **Password awal Admin KUA** — pilih salah satu, masih di berkas `Setup`:
   - **Paling mudah:** biarkan baris `ADMIN_PASSWORD_AWAL: '',` apa adanya (kosong). Password dibuat otomatis dan muncul di Execution log (langkah A7).
   - **Atau ketik sendiri** di antara tanda kutip, minimal 8 karakter, campuran huruf **dan** angka:
     ```js
     ADMIN_PASSWORD_AWAL: 'passwordAnda123',
     ```
   - Simpan (Ctrl+S).
   - Password ini hanya untuk login pertama. Begitu login, Admin **wajib menggantinya**, sehingga tulisan di berkas `Setup` tidak berlaku lagi.
6. Pilih fungsi **`setupAppEnvironment`** (menu di sebelah tombol Debug) → **▶ Run**.
   - Klik **Review permissions** → pilih akun → **Advanced → Go to KUA-Link (unsafe)** → **Allow**.
   - Peringatan "unsafe" muncul karena aplikasi ini milik Anda sendiri dan belum diverifikasi Google. Ini normal.
7. Buka **Execution log**. Harus ada `✅ SETUP SELESAI` dan bagian **LOGIN ADMIN KUA**:
   ```
   🔑 LOGIN ADMIN KUA
      Username : admin.kua
      Password : Ab3dEf7hJk   ← dibuat otomatis, CATAT sekarang
   ```
   - **Catat** username dan password itu. Bila Anda mengetik sendiri di langkah A5, log hanya menulis "(yang Anda ketik …)".
   - Cek Google Drive: `Database by Ahzani Labs / KUA-Link`.
   - ⚠️ **Jangan jalankan `setupAppEnvironment` dua kali** (akan ditolak otomatis).
8. **Deploy → New deployment**:
   - Klik ikon gerigi → pilih **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Klik **Deploy**, lalu **SALIN URL** yang berakhiran `/exec`.
9. Uji: buka URL `/exec` di browser. Harus muncul teks JSON `"KUA-Link API aktif"` dengan `"siap":true`.

### Bila setup sebelumnya GAGAL di tengah jalan
Contoh: muncul error di log sebelum `✅ SETUP SELESAI` (termasuk error `setAlignment` pada versi lama).

1. Ganti **semua** berkas `.gs` dengan versi terbaru.
2. Jalankan **`resetSetupGagal`**. Fungsi ini:
   - membuang folder aplikasi sisa setup gagal ke Sampah Drive;
   - membuang trigger dan Script Properties sisa setup;
   - **tidak** menyentuh folder induk `Database by Ahzani Labs` dan aplikasi lain di dalamnya;
   - **menolak berjalan** bila sudah ada data pengajuan, demi keamanan data.
3. Jalankan **`setupAppEnvironment`** lagi.
4. Opsional: kosongkan Sampah Drive setelah memastikan semuanya benar.

### Memperbarui backend di kemudian hari
Setelah mengubah kode: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.

Cara ini membuat URL `/exec` tetap sama. Jangan pakai "New deployment", karena akan menghasilkan URL baru.

### Fungsi darurat (jalankan dari editor)
| Fungsi | Kegunaan |
|---|---|
| `resetSetupGagal` | Membersihkan sisa setup yang gagal (lihat di atas). |
| `resetPasswordAdminDarurat` | Admin lupa password. Password sementara baru tampil di Execution log (hanya terlihat oleh pemilik proyek). |
| `bersihkanCache` | Setelah mengedit sheet secara manual. |
| `cleanupTemp` | Membuang file sementara. Sudah berjalan otomatis setiap hari pukul 02.00. |
| `warmupCache` | Menyegarkan cache data master. Sudah berjalan otomatis setiap 30 menit. |

---

## B. Frontend — GitHub Pages

1. Buka berkas **`js/config.js`** dengan Notepad. Ganti nilai `GAS_URL` dengan URL `/exec` dari langkah A8:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/AKfy..../exec',
   ```
   Simpan.
2. **Folder yang di-`git init` adalah folder ini** — folder yang langsung berisi `index.html`, `sw.js`, `manifest.webmanifest`, `css/`, `js/`, dan `icons/`. Jangan pakai folder induknya.
3. Ikuti langkah GitHub Pages: install Git → buat repository **Public** → `git init` → `git add .` → `git commit` → `git push` → **Settings → Pages → Deploy from a branch: main / (root)** → centang **Enforce HTTPS**. Panduan langkah demi langkah diberikan di percakapan.
4. Buka `https://USERNAME.github.io/NAMA-REPO/`.

### Memperbarui frontend
Ubah berkas → `git add .` → `git commit -m "update"` → `git push`. Pengguna yang sudah membuka aplikasi akan melihat pemberitahuan **"Versi baru KUA-Link tersedia → Muat Ulang"**. `sw.js` tidak perlu diubah, kecuali Anda menambah/menghapus berkas `.js`/`.css` (naikkan `VERSION` di `sw.js` lalu tambahkan berkas itu ke `SHELL_FILES`).

---

## C. Keamanan Password Walau Repository GitHub Publik

Repository publik **berarti siapa pun bisa membaca seluruh isi folder frontend**. Karena itu, aturan berikut **wajib**:

### Yang ada di mana

| Lokasi | Isi | Siapa yang bisa melihat |
|---|---|---|
| GitHub (publik) | `index.html`, `css/`, `js/`, `icons/`, `sw.js`, `manifest.webmanifest`, `config.js` berisi `GAS_URL` | Semua orang |
| Proyek Apps Script | Berkas `.gs` | Hanya pemilik akun Google |
| Berkas `Setup` di Apps Script | `ADMIN_PASSWORD_AWAL` — hanya untuk login pertama Admin, tidak berlaku setelah diganti | Hanya pemilik proyek |
| Google Sheets `Users` | **Hash** password + salt (bukan password asli) | Hanya pemilik akun Google |

### Mengapa password awal tetap aman

1. **Password tidak pernah ada di frontend.** Tidak ada satu pun password di `index.html`, `js/`, maupun `config.js`.
2. **Password awal Admin** hanya ada di proyek Apps Script (privat, tidak pernah ke GitHub) dan **wajib diganti** saat login pertama. Setelah itu, tulisan di berkas `Setup` tidak berguna lagi; boleh dikosongkan kembali.
3. **Password desa** diketik Admin KUA langsung di aplikasi (Data Master → Akun Desa). Yang disimpan hanya hash-nya; password asli tidak pernah ditampilkan lagi, termasuk oleh API.
4. **Password awal hanya sekali pakai.** Saat login pertama, Admin maupun operator desa **wajib menggantinya** sebelum bisa membuka data apa pun (diperiksa di server).
5. **`GAS_URL` bukan rahasia.** URL ini hanya alamat pintu. Setiap permintaan tetap diperiksa server: login, token sesi (berakhir 6 jam setelah tidak aktif), pembatasan data per desa, dan kunci akun 15 menit setelah 5 kali salah password.

### Larangan

- ❌ Jangan menulis password apa pun di `js/config.js` atau berkas frontend lain.
- ❌ Jangan meng-upload berkas `.gs` atau folder `backend/` ke repository GitHub. Yang di-push **hanya** isi folder frontend.
- ❌ Jangan menaruh password di README, komentar kode, atau pesan commit.
- ❌ Jangan mengirim password awal lewat grup WhatsApp. Sampaikan langsung ke operator yang bersangkutan (tatap muka atau chat pribadi).
- ❌ Jangan membagikan spreadsheet atau folder `KUA-Link` ke siapa pun.

Berkas `.gitignore` di folder ini sudah menolak berkas `.gs`, `appsscript.json`, dan folder `backend/` agar tidak ikut ter-push — tetapi tetap lakukan pemeriksaan di bawah.

### Periksa sebelum setiap `git push`

Jalankan di folder frontend:
```
git grep -n -i "password_awal\|ADMIN_PASSWORD"
git status
```
- `git grep` **tidak boleh** menampilkan password asli. Teks petunjuk seperti di panduan ini boleh.
- `git status` **tidak boleh** memuat berkas `.gs`.

Bila password telanjur ter-push: **ganti password akun itu segera** (Profil → Ganti Password, atau Admin: Reset Password). Menghapus commit saja tidak cukup, karena riwayat GitHub publik bisa sudah tersalin.

---

## D. Langkah Pertama Setelah Online

1. **Masuk sebagai Admin KUA**: username `admin.kua` + password dari Execution log (langkah A7). Aplikasi langsung meminta Anda **membuat password baru** — pakai password yang hanya Anda ketahui.
2. **Data Master → Akun Desa → ☰ (baris desa) → Buat Akun Desa**:
   - Username sudah terisi otomatis (mis. `desa.sawoo`).
   - Ketik **Password Awal** untuk desa itu, minimal 8 karakter, berisi huruf + angka. **Bedakan setiap desa.**
   - Ulangi untuk 14 desa.
   - **Nama Kepala Desa diisi oleh operator desa** (Profil Desa, atau langsung di formulir pengajuan — keduanya saling terhubung).
3. Sampaikan username + password awal ke masing-masing operator desa. Mereka **wajib mengganti** password saat login pertama.
4. Operator lupa password: **☰ → Reset Password**. Ketik password awal baru; sesi lama operator otomatis dikeluarkan dan ia wajib mengganti password lagi.
5. **Data Master → Template Surat** — wajib sebelum dipakai resmi:
   - Template bawaan bertanda **[CONTOH]**, bukan format resmi.
   - Buat ulang setiap surat sesuai format resmi yang berlaku di Google Docs, di folder `01_Template_Sumber`.
   - Pakai penanda dari menu *Daftar Penanda*, misalnya `{{catin_nama}}` atau `{{akad_tanggal|hari}}`.
   - Daftarkan sebagai **versi baru** dengan kode yang sama (N1, N2, …): **Cek Penanda → Uji PDF → Aktifkan**.
6. **Data Master → Aturan Paket Surat** — lihat **Peta Paket Surat**:
   - Baris = surat, kolom = kombinasi **Jenis Pengajuan** (Nikah di Wilayah / Rekomendasi) × **Pengajuan Untuk** (Calon Suami / Calon Istri / Suami & Istri).
   - Klik sel untuk mengatur: ✓ selalu, ⚡ bersyarat (mis. N5 bila umur catin < 21), ×2 = dicetak untuk masing-masing catin pada pengajuan Suami & Istri.
   - Bawaan: N1, Surat Pernyataan Status, N5, N6 **per catin**; N2 & N4 **sekali** per pasangan. Sesuaikan dengan praktik KUA Anda (mis. apakah N2 dibuat desa untuk Rekomendasi).
7. **Data Master → Hari Libur**:
   - Berisi libur nasional & cuti bersama 2026–2027 (SKB 3 Menteri). Tanggal ini disilang di kalender akad bila desa memilih **Kantor KUA**, dan tidak dihitung sebagai hari kerja.
   - Tambahkan libur tahun berikutnya setelah SKB terbit, atau hari tutup khusus KUA (jenis "Lainnya").
   - Jam akad di Kantor KUA: 07.30–15.30 tiap 30 menit (ubah di sheet `AppConfig`: `JAM_KANTOR_MULAI`, `JAM_KANTOR_SELESAI`, lalu jalankan `bersihkanCache`).

---

## E. Pasang sebagai Aplikasi (PWA)

KUA-Link bisa dipasang seperti aplikasi: punya ikon sendiri, terbuka di jendela sendiri tanpa bilah alamat, dan dibuka hampir instan. Data tetap diambil dari server; aplikasi tetap butuh internet untuk menyimpan dan mencetak.

| Perangkat | Cara |
|---|---|
| **Laptop/PC — Chrome atau Edge** | Klik **Pasang Aplikasi** di halaman login atau di menu kiri bawah. Bisa juga lewat ikon ⊕ di ujung kanan bilah alamat. |
| **HP Android — Chrome** | Klik **Pasang Aplikasi di Perangkat Ini**, atau menu ⋮ → **Instal aplikasi / Tambahkan ke layar utama**. |
| **iPhone/iPad** | Buka di **Safari** → tombol **Bagikan** → **Tambah ke Layar Utama** → **Tambah**. Tombol *Pasang Aplikasi* menampilkan langkah ini. |
| **Mac — Safari 17+** | Menu **File → Add to Dock**. |

Tombol *Pasang Aplikasi* tidak muncul bila aplikasi sudah terpasang, atau bila browser tidak mendukung pemasangan (mis. Firefox desktop).

---

## F. Kecepatan

- **Buka ulang hampir instan.** Kerangka aplikasi disimpan di perangkat (service worker). Data terakhir (data master + daftar pengajuan) langsung ditampilkan dari perangkat, lalu diperbarui dari server di latar belakang.
- **Login 1 kali panggilan.** Server langsung mengirim data awal bersama hasil login.
- **Cache server selalu hangat.** Trigger `warmupCache` menyegarkan cache data master setiap 30 menit, jadi pengguna pertama di pagi hari tidak menunggu pembacaan Sheets.
- Batas yang tidak bisa dihilangkan: setiap panggilan ke Apps Script tetap butuh ±1–3 detik, dan pembuatan PDF ±5–10 detik per surat.

---

## G. Pemecahan Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Halaman bertuliskan "Belum dikonfigurasi" | `GAS_URL` di `js/config.js` belum diisi. Isi, lalu push ulang. |
| Log: "ADMIN_PASSWORD_AWAL di berkas Setup: …" | Password ketikan Anda terlalu pendek atau tidak berisi huruf + angka. Perbaiki (atau kosongkan), simpan, lalu Run lagi. |
| Log: "Aplikasi SUDAH terpasang dan database-nya masih ada" | Database lama masih ada di Drive. Hapus folder lamanya (ke Sampah) lalu Run lagi, atau jalankan `resetSetupGagal` bila setup sebelumnya gagal. |
| "Tidak dapat terhubung ke server" | URL `/exec` salah, atau deployment bukan **Anyone**. Cek langkah A8–A9. |
| "Server mengembalikan respon tidak valid" | Biasanya akses Web App bukan "Anyone", sehingga Google mengembalikan halaman login. |
| "Menampilkan data tersimpan di perangkat" | Server/internet sedang tidak bisa dihubungi. Data yang tampil adalah salinan terakhir; jangan mengandalkannya untuk keputusan sampai tersambung lagi. |
| Perubahan frontend belum terlihat | Tunggu ±1–10 menit setelah push, buka ulang aplikasi, lalu klik **Muat Ulang** pada pemberitahuan versi baru. |
| PDF lama dibuat (±5–10 detik per surat) | Normal. Google Docs → PDF memang memerlukan waktu. Biarkan jendela progres sampai selesai. |
| Perubahan di sheet tidak muncul | Data master di-cache. Jalankan `bersihkanCache`, atau ubah lewat menu Data Master. |
| Pop-up PDF tidak terbuka | Izinkan pop-up untuk situs GitHub Pages Anda. Bila diblokir, berkas otomatis diunduh. |
| Tanggal akad tidak bisa dipilih | Nikah di Kantor KUA hanya pada hari kerja. Pilih tanggal lain, atau pilih "Luar Kantor KUA (Bedolan)" — semua hari bisa dipilih. |
| Peringatan "pendaftaran terlambat" | Kurang dari 10 hari kerja antara tanggal surat dan tanggal akad: siapkan surat dispensasi pendaftaran nikah dari Kecamatan. |
| Tombol "Berikutnya" tidak lanjut | Masih ada isian wajib (bertanda merah). Lengkapi lalu tekan lagi. |

---

## H. Keamanan & Data Pribadi (UU 27/2022)

- Login per akun dengan password ber-hash. Akun terkunci 15 menit setelah 5 kali gagal. Sesi berakhir 6 jam setelah tidak aktif.
- Desa hanya dapat mengakses data desanya sendiri. Pembatasan ini diperiksa di server.
- Spreadsheet dan folder Drive **jangan dibagikan** ke siapa pun.
- Demi kecepatan, **data master dan daftar pengajuan (berisi nama & data catin) disimpan di browser perangkat** sampai pengguna menekan **Keluar**. Isian formulir yang belum tersinkron juga disimpan sementara di perangkat.
  - **Selalu Keluar** setelah selesai di komputer bersama/warnet.
  - Komputer kantor desa sebaiknya memakai akun Windows ber-password.
