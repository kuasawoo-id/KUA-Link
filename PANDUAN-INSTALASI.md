# Panduan Instalasi — KUA-Link v1.4

Arsitektur:
- **Backend** = Google Apps Script (9 berkas) yang menyimpan data di Google Sheets, membuat PDF dari Google Docs, dan menyimpannya di Google Drive.
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

## Alur Kerja v1.4 (ringkas)

- **Menu desa:** Dashboard · Pengajuan Nikah · **Riwayat Pengajuan** · Profil Desa · Panduan Singkat.
- **HP:** tanpa sidebar. Navigasi bawah: **Dashboard · Riwayat · ⊕ (tombol bulat tengah) · Profil · Panduan**.
  - Tombol tengah untuk desa = **Pengajuan baru**; untuk Admin KUA = lembar menu **Data Master**.
- **Akun desa:** 14 akun (`desa.<nama desa>`) dengan password awal yang sama (`kuasawoojaya`), **wajib diganti** saat masuk pertama. Admin mengirim tautan, username, dan password ke modin lewat ikon **WhatsApp** di Data Master → Akun Desa.
- **Modin** diatur Admin KUA per desa (boleh lebih dari satu). Di formulir: satu modin → terisi otomatis; lebih dari satu → desa memilih.
- **Desa** mengisi 4 langkah: **Jadwal Akad → Data Calon Suami → Data Calon Istri → Validasi**.
  - Langkah 1: Jenis & Pengajuan Untuk; **Kepala Desa | Modin**, lalu **Nomor Surat | Tanggal Surat**; jadwal akad.
  - Pengajuan baru **baru tercatat sebagai Draf** setelah Jadwal Akad terisi (jenis, pengajuan untuk, tanggal akad).
  - **Tanggal akad paling cepat sehari sesudah tanggal surat** (tanggal surat dan sebelumnya disilang di kalender).
  - Langkah 2–3 dibagi tab Calon | Ayah | Ibu (+ Pemberi Izin) (+ Wali Nikah). Bin/binti otomatis dari nama ayah. Pekerjaan dari 106 jenis KTP-el.
- **Masa iddah** dicek otomatis (Bagian I).
- **Simpan & Cetak** → paket PDF terunduh → **WhatsApp KUA terbuka** → data masuk **Akad Tracker** (dengan nama modin) & **LABUKU Desk** (antrean Front Office) → cetak → tanda tangan Kepala Desa → stempel → bawa ke KUA.
- **Lonceng:** desa = draf yang belum selesai (ketuk untuk melanjutkan) + pemberitahuan KUA; Admin KUA = hasil kiriman ke Akad Tracker & LABUKU Desk. Kiriman gagal dikirim ulang otomatis **tiap 5 menit** sampai berhasil.
- Status: **Draf** · **Siap Cetak** · **Batal**. Batal langsung dari **Riwayat Pengajuan** (☰ → Batalkan) dan bisa diaktifkan kembali.

## Sudah Memasang v1.3? → Upgrade ke v1.4 (data tetap)

1. **KUA-Link (Apps Script):** ganti isi 9 berkas `.gs` (`appsscript.json` sama dengan v1.3). Simpan.
2. Pilih fungsi **`upgradeV14`** → **▶ Run**. Fungsi ini:
   - menambah kolom modin di data desa dan mengisi **modin 14 desa** (desa yang sudah punya daftar modin tidak ditimpa);
   - menambah field **Nama Modin** di langkah Jadwal Akad;
   - **semua akun desa** dibuat aktif, password dikembalikan ke `kuasawoojaya`, dan wajib diganti saat masuk. Desa yang belum punya akun dibuatkan (`desa.<nama>`). Sesi lama dikeluarkan;
   - mengganti trigger kirim ulang 30 menit dengan mekanisme **5 menit** (dibuat otomatis hanya saat ada kiriman gagal).
3. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
4. **Frontend:** salin dulu `GAS_URL` dari `js/config.js` → ekstrak ZIP v1.4 (timpa) → tempel kembali `GAS_URL` → `git add .` → `git commit -m "KUA-Link v1.4"` → `git push`.
5. **Akad Tracker:** ganti isi berkas `KUALink` dengan versi baru (`integrasi/akad-tracker/KUALink.gs`) → Deploy versi baru. `Code.gs` & frontend tidak berubah dari v2.3.
6. **LABUKU Desk:** ganti isi `KUALink` dan `Kode.gs` (2 baris baru, Bagian K2) → Deploy versi baru.
7. **Kirim akun ke modin:** Data Master → Akun Desa & Modin → ikon **WhatsApp** di setiap modin.
8. **PWA:** perangkat yang memasang KUA-Link sebagai "update" SAKU — hapus ikon KUA-Link lama bila ada, buka KUA-Link di browser, lalu **Pasang Aplikasi** lagi (Bagian E).

## Sudah Memasang v1.2? → Upgrade TANPA instal ulang (data tetap)

> Dari v1.2: kerjakan langkah di bawah (upgradeV13), **lalu** langsung jalankan **`upgradeV14`** sebelum deploy, dan pakai ZIP frontend v1.4.

1. Di proyek Apps Script yang **sama**:
   - Ganti isi semua berkas `.gs` **dan `appsscript.json`** dengan versi v1.3. `appsscript.json` wajib diganti: ada izin baru `script.external_request` untuk mengirim data ke Akad Tracker & LABUKU Desk; tanpa itu kiriman gagal.
   - Tambah berkas baru **`Integrasi`** (+ → Script).
2. Pilih fungsi **`upgradeV13`** → **▶ Run**. Google akan meminta izin baru: **"Connect to an external service"** (untuk kiriman ke Akad Tracker & LABUKU Desk) — klik **Allow**.
   Fungsi ini:
   - membuat sheet **Integrasi** dan pengaturan baru di **AppConfig**;
   - mengganti field sistem ke versi v1.3 (field buatan Admin tidak disentuh);
   - menambah template **CONTOH** + aturan **Surat Pernyataan Tidak Akan Merujuk Mantan Istri** (syibhul iddah).
3. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL `/exec` tetap).
4. **Template N6 milik Anda:** penanda `{{catin_kematian_tempat}}` dan `{{catin_dok_jenis}}` tidak dipakai lagi. Pakai `{{catin_kematian_tanggal}}`, `{{catin_dok_nomor}}`, `{{catin_dok_tanggal}}` (Tanggal Meninggal, Nomor/Tanggal Akta Kematian), lalu daftarkan ulang di **Template Surat**.
5. Frontend: salin dulu `GAS_URL` dari `js/config.js` lama → ekstrak ZIP v1.4 (timpa) → tempel kembali `GAS_URL` → `git add .` → `git commit -m "KUA-Link v1.4"` → `git push`.
6. Pasang penerima di **Akad Tracker** & **LABUKU Desk** dan catat **kunci** masing-masing (Bagian K).
7. Login Admin KUA-Link → **Data Master → Integrasi & WhatsApp** → isi nomor WhatsApp KUA, **URL /exec** dan **Kunci** kedua aplikasi → **Simpan** → **Uji Koneksi** untuk keduanya (Bagian J).

## Belum Pernah Memasang / Pasang dari Awal

Ikuti Bagian A dari awal. Bila ingin membuang database lama sepenuhnya (instal ulang), di proyek Apps Script yang **sama**:
1. Di Google Drive, hapus (pindahkan ke Sampah) folder database lama — `📁 LABUKU Link` dan/atau `Database by Ahzani Labs / KUA-Link`. **Jangan** hapus folder induk `Database by Ahzani Labs` bila berisi aplikasi lain.
2. Ganti isi **9 berkas** di proyek Apps Script dengan versi ini, lalu lanjutkan dari **langkah A4**. Setup otomatis membersihkan pengaturan lama karena database lamanya sudah dihapus.
3. Pada **langkah A8**, jangan buat deployment baru. Pakai **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**, supaya URL `/exec` tetap sama dan `GAS_URL` di GitHub tidak perlu diubah.
4. Semua akun lama ikut hilang bersama database lama. Setup membuat ulang 14 akun desa (password awal `kuasawoojaya`) — kirim ke modin lewat Bagian D.
5. Frontend di GitHub: **salin dulu `GAS_URL`** dari `js/config.js` lama → ekstrak ZIP baru ke folder repo (timpa) → tempel kembali `GAS_URL` di `js/config.js` → `git add .` → `git commit -m "KUA-Link v1.4"` → `git push`.

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
   | `Integrasi` | paket PDF, WhatsApp KUA, Akad Tracker & LABUKU Desk |
   | `Setup` | instalasi pertama, `upgradeV13` & `upgradeV14` |

   > Berkas di folder `integrasi/` **bukan** untuk proyek ini — itu untuk proyek Akad Tracker & LABUKU Desk (Bagian K).

4. Buka berkas `Setup`. Periksa daftar **DESA** dan **NAMA_KUA** di bagian atas, sesuaikan bila perlu. Boleh juga mengisi **`WA_KUA`** (nomor WhatsApp KUA; bisa diisi nanti di aplikasi). **Simpan** (Ctrl+S).
5. **Password awal Admin KUA** — pilih salah satu, masih di berkas `Setup`:
   - **Paling mudah:** biarkan baris `ADMIN_PASSWORD_AWAL: '',` apa adanya (kosong). Password dibuat otomatis dan muncul di Execution log (langkah A7).
   - **Atau ketik sendiri** di antara tanda kutip, minimal 8 karakter, campuran huruf **dan** angka:
     ```js
     ADMIN_PASSWORD_AWAL: 'passwordAnda123',
     ```
   - Simpan (Ctrl+S).
   - Password ini hanya untuk login pertama. Begitu login, Admin **wajib menggantinya**, sehingga tulisan di berkas `Setup` tidak berlaku lagi.
6. Pilih fungsi **`setupAppEnvironment`** (menu di sebelah tombol Debug) → **▶ Run**.
   - Klik **Review permissions** → pilih akun → **Advanced → Go to KUA-Link (unsafe)** → **Allow**. Daftar izin memuat Drive, Sheets, Docs, dan "Connect to an external service" (kiriman ke Akad Tracker & LABUKU Desk).
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
| `upgradeV13` | Upgrade database v1.2 → v1.3 tanpa instal ulang. Aman dijalankan ulang. |
| `upgradeV14` | Upgrade v1.3 → v1.4: modin per desa, field Nama Modin, semua akun desa kembali ke password awal (wajib ganti). Jalankan ulang = semua akun desa direset lagi. |
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
2. **Data Master → Akun Desa & Modin**:
   - 14 akun desa sudah dibuat setup: username `desa.<nama desa>` (mis. `desa.sawoo`), password awal **`kuasawoojaya`** (diatur di `SETUP_.PASSWORD_DESA_AWAL` / sheet `AppConfig` → `PASSWORD_DESA_AWAL`). Pemilik akun **wajib mengganti** saat masuk pertama.
   - Kolom **Modin & WhatsApp** berisi modin tiap desa beserta nomor WA. Ubah/tambah lewat **☰ → Edit Desa & Modin** (boleh lebih dari satu modin per desa).
   - **Nama Kepala Desa diisi operator desa** (Profil Desa, atau langsung di formulir — keduanya terhubung).
3. Tekan ikon **WhatsApp** di samping nama modin → WhatsApp terbuka berisi tautan KUA-Link, username, dan password awal → tekan **Kirim**.
   - Bila akun desa itu sudah memakai password sendiri, muncul pilihan **Reset & Kirim** (password kembali ke password awal) atau **Kirim tanpa password**.
4. Operator lupa password: **☰ → Reset Password** → password kembali ke `kuasawoojaya`, sesi lama dikeluarkan, dan wajib diganti lagi. Kirim ulang lewat ikon WhatsApp.
   - Risiko yang perlu diketahui: password awal sama untuk semua desa dan username mudah ditebak. Selama sebuah akun **belum** mengganti password, akun itu bisa dimasuki desa lain. Pastikan setiap desa segera masuk & mengganti password (status **Password Awal** di daftar akun hilang setelah diganti).
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
8. **Data Master → Integrasi & WhatsApp** — nomor WhatsApp KUA, Akad Tracker, LABUKU Desk (Bagian J).
9. **Template Surat → SP_TIDAK_RUJUK** (Surat Pernyataan Tidak Akan Merujuk Mantan Istri) juga masih **[CONTOH]** — ganti dengan format resmi KUA.

---

## E. Pasang sebagai Aplikasi (PWA)

KUA-Link bisa dipasang seperti aplikasi: punya ikon sendiri, terbuka di jendela sendiri tanpa bilah alamat, dan dibuka hampir instan. Data tetap diambil dari server; aplikasi tetap butuh internet untuk menyimpan dan mencetak.

| Perangkat | Cara |
|---|---|
| **Laptop/PC — Chrome atau Edge** | Klik **Pasang Aplikasi** di halaman login atau di menu kiri bawah. Bisa juga lewat ikon ⊕ di ujung kanan bilah alamat. |
| **HP Android — Chrome** | Klik **Pasang Aplikasi di Perangkat Ini**, atau menu ⋮ → **Instal aplikasi / Tambahkan ke layar utama**. |
| **iPhone/iPad** | Buka di **Safari** → tombol **Bagikan** → **Tambah ke Layar Utama** → **Tambah**. Tombol *Pasang Aplikasi* menampilkan langkah ini. |
| **Mac — Safari 17+** | Menu **File → Add to Dock**. |

Tombol *Pasang Aplikasi* tidak muncul bila aplikasi sudah terpasang, atau bila browser tidak mendukung pemasangan (mis. Firefox desktop). Di HP: menu akun (kanan atas) → **Pasang Aplikasi**.

**KUA-Link & SAKU di alamat github.io yang sama (v1.4).** Sebelumnya KUA-Link memakai `"id": "./"`. Chrome menghitung `id` dari *origin*, jadi nilainya menjadi `/` — sama dengan `id` SAKU — sehingga di desktop KUA-Link dianggap **update SAKU**. Sejak v1.4 `id` KUA-Link = `/kua-link/` (unik). Setelah push:
1. Di komputer yang bermasalah, buka SAKU sekali agar manifest SAKU dimuat ulang (nama & ikon SAKU kembali).
2. Hapus pemasangan KUA-Link lama bila ada (chrome://apps → klik kanan → Hapus).
3. Buka KUA-Link di tab browser biasa → **Pasang Aplikasi**.
4. Buka KUA-Link dari **ikonnya sendiri**. Bila dibuka dari dalam jendela SAKU, Chrome dapat menampilkannya di bingkai SAKU karena cakupan SAKU (`/`) meliputi semua alamat di github.io tersebut.

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
| Tombol "Berikutnya" tidak lanjut | Masih ada isian wajib (bertanda merah) di tab yang sedang dibuka. Lengkapi lalu tekan lagi. Tab yang masih kurang diberi titik oranye. |
| Tanggal akad disilang / "masih dalam masa iddah" | Calon istri janda: surat desa paling cepat 1 hari dan akad paling cepat 2 hari **sesudah** iddah selesai (Bagian I). Di langkah 1 tekan tombol hijau **Pakai tanggal …** untuk memperbaiki sekali ketuk. |
| Pendaftaran tidak muncul di Akad Tracker / LABUKU Desk | Lihat lonceng Admin KUA, atau Riwayat Pengajuan → ☰ → **Kirim ke KUA**. `GAGAL` dikirim ulang otomatis tiap 5 menit. Pastikan `KUALink.gs` terpasang, baris tambahan di `Code.gs`/`Kode.gs` sudah ada, dan **deployment versi baru** sudah dibuat (Bagian K). Muat ulang dashboard aplikasi tujuan. |
| WhatsApp tidak terbuka otomatis | Browser memblokir pop-up. Tekan tombol hijau **Kirim WhatsApp ke KUA** di halaman sukses, atau dari Riwayat Pengajuan → ☰ → **Kirim ke KUA**. |
| WhatsApp terbuka tanpa nomor KUA | Nomor belum diisi Admin: Data Master → Integrasi & WhatsApp. |
| "Izin yang ditentukan tidak cukup untuk memanggil UrlFetchApp.fetch … script.external_request" | Masalahnya di proyek **KUA-Link**, bukan di aplikasi tujuan. (1) ⚙️ Project Settings → centang *Show "appsscript.json"* → pastikan baris `script.external_request` ada → Simpan. (2) Pilih fungsi `bersihkanCache` → ▶ Run → **Allow** (izin "Connect to an external service"). (3) Deploy → Manage deployments → Edit → **New version** → Deploy. (4) Uji Koneksi lagi. Jangan menjalankan ulang `upgradeV13` hanya untuk izin: fungsi itu menulis ulang field sistem. |
| Desa lupa password | Admin: Data Master → Akun Desa → ☰ → **Reset Password** (kembali ke password awal), lalu kirim ulang lewat ikon WhatsApp modin. |
| Kolom Modin di formulir kosong / "Belum ada modin" | Admin belum mengisi modin desa itu: ☰ → **Edit Desa & Modin**. |
| Tombol Simpan Draf: "Lengkapi Jadwal Akad dulu" | Pengajuan baru tercatat setelah Jenis, Pengajuan Untuk, dan Tanggal Akad terisi. Isian sebelumnya aman di perangkat. |
| Tanggal akad disilang padahal hari kerja | Tanggal itu sama dengan/sebelum **tanggal surat**. Akad paling cepat sehari sesudahnya. |
| Desktop: KUA-Link muncul sebagai "App update available" SAKU | Frontend v1.3 masih terpasang (id manifest sama dengan SAKU). Push frontend v1.4, lalu ikuti Bagian E. |
| Antrean KL-… tidak tampil di Front Office LABUKU Desk | `Kode.gs` LABUKU belum berisi 2 baris `kualinkGeserAntrean_` (Bagian K2) atau belum Deploy versi baru. |
| "Kunci KUA-Link salah" / "belum dibuat" | Kunci di KUA-Link tidak sama dengan Script Properties `KUALINK_KEY` aplikasi tujuan. Jalankan ulang `aturKunciKUALink` di aplikasi tujuan, salin kunci dari Execution log, tempel di KUA-Link, Simpan, Uji Koneksi. Setelah 5× salah, tunggu 5 menit. |
| "URL bukan API /exec yang benar" | URL yang ditempel salah (mis. URL editor, URL GitHub Pages, atau `/dev`), atau deployment belum versi baru sehingga fungsi `kualinkMasuk` belum dikenal. Pakai URL `/exec` yang sama dengan `GAS_URL` di `js/config.js` aplikasi itu. |
| "Fungsi API tidak dikenal: kualinkMasuk" / "Fungsi tidak dikenal" | Baris tambahan di `Code.gs` (Akad Tracker) / `Kode.gs` (LABUKU Desk) belum ada, atau belum **Deploy → New version**. |
| "Akad Tracker/LABUKU Desk: Gagal …" lainnya | Kegagalan integrasi tidak menggagalkan cetak dan muncul di lonceng Admin KUA. Perbaiki penyebabnya; kiriman diulang otomatis tiap 5 menit, atau kirim ulang lewat ☰ → Kirim ke KUA. |
| "Belum disambungkan" di daftar tujuan | Integrasi belum diatur (Bagian J). Pengajuan tetap tersimpan & tercetak normal. |

---

## H. Keamanan & Data Pribadi (UU 27/2022)

- Login per akun dengan password ber-hash. Akun terkunci 15 menit setelah 5 kali gagal. Sesi berakhir 6 jam setelah tidak aktif.
- Desa hanya dapat mengakses data desanya sendiri. Pembatasan ini diperiksa di server.
- Spreadsheet dan folder Drive **jangan dibagikan** ke siapa pun.
- Demi kecepatan, **data master dan daftar pengajuan (berisi nama & data catin) disimpan di browser perangkat** sampai pengguna menekan **Keluar**. Isian formulir yang belum tersinkron juga disimpan sementara di perangkat.
  - **Selalu Keluar** setelah selesai di komputer bersama/warnet.
  - Komputer kantor desa sebaiknya memakai akun Windows ber-password.

---

## I. Masa Iddah & Syibhul Iddah (v1.3)

Dasar: KHI Pasal 153 ayat (2)–(4). Dihitung otomatis dari tanggal yang diisi desa.

| Kasus | Masa iddah | Dihitung dari |
|---|---|---|
| Janda cerai hidup | 90 hari (3 kali suci, minimal 90 hari) | Tanggal **akta cerai** |
| Janda cerai mati | 130 hari | **Tanggal meninggal** suami |
| Duda cerai hidup karena **Cerai Talak** (syibhul iddah) | iddah mantan istri, 90 hari | Tanggal akta cerai |

**Contoh:** iddah selesai 5 Januari → **surat desa paling cepat 6 Januari**, **akad paling cepat 7 Januari**.

- **Janda dalam masa iddah:** tanggal surat/akad sebelum batas **diblokir**. Di kalender akad, tanggal sebelum batas disilang. Keterangan batas tampil di bawah isian tanggal akta/tanggal meninggal.
- **Surat desa sudah disiapkan lebih awal** (mis. dibuat 5 Desember padahal batasnya 6 Januari): di langkah 1 muncul tombol **Pakai tanggal surat 6 Januari …** — sekali ketuk, Tanggal Surat diganti tanggal yang dibolehkan dan pengajuan bisa lanjut. Tombol serupa ada untuk tanggal akad (bila di Kantor KUA, otomatis memilih hari kerja berikutnya).
- Tanggal meninggal tidak boleh sesudah tanggal akta kematian (ditolak sistem).
- **Duda cerai talak, akad masih dalam iddah mantan istri:** pengajuan **boleh**. Sistem otomatis menambah **Surat Pernyataan Tidak Akan Merujuk Mantan Istri** (`SP_TIDAK_RUJUK`) ke paket desa calon suami.
- Cerai gugat tidak memicu syibhul iddah.

Pengaturan di sheet `AppConfig`. Setelah mengubah, jalankan `bersihkanCache`.

| Kunci | Bawaan | Arti |
|---|---|---|
| `IDDAH_CERAI_HIDUP` | 90 | hari |
| `IDDAH_CERAI_MATI` | 130 | hari |
| `IDDAH_SURAT_SETELAH` | 1 | surat desa paling cepat N hari sesudah iddah selesai |
| `IDDAH_AKAD_SETELAH` | 2 | akad paling cepat N hari sesudah iddah selesai |
| `SYIBHUL_IDDAH` | PERNYATAAN | `PERNYATAAN` = boleh + surat pernyataan · `BLOKIR` = akad ditolak sampai iddah mantan istri selesai |

Batasan yang **belum** ditangani sistem (periksa manual oleh KUA):
- iddah wanita hamil (sampai melahirkan);
- cerai *qabla al-dukhul* (tanpa iddah);
- cerai hidup dihitung dari tanggal akta cerai, padahal dasar hukumnya tanggal putusan berkekuatan hukum tetap (akta terbit pada/sesudah tanggal itu, sehingga hitungan sistem tidak pernah lebih cepat).

---

## J. Integrasi: WhatsApp KUA, Akad Tracker, LABUKU Desk (v1.4)

Setelah desa menekan **Simpan & Cetak** dan surat selesai dibuat, sistem menjalankan urutan ini otomatis:
1. Paket PDF lengkap diunduh ke perangkat desa.
2. Salinan PDF disimpan di Drive (`03_Dokumen/<tahun>/<desa>/<nomor>/Paket_<nomor>.pdf`) → tautan.
3. Backend KUA-Link **langsung mengirim** data ke API `/exec` aplikasi tujuan (real-time, tanpa menunggu):
   - **Nikah di wilayah** → **Akad Tracker** (jadwal akad, lengkap dengan **nama modin**) + **LABUKU Desk** (*Pendaftaran Kehendak Nikah*).
   - **Luar wilayah** → **LABUKU Desk** saja (*Penerbitan Surat Rekomendasi Nikah*).
4. **WhatsApp** terbuka ke nomor KUA dengan pesan bukti daftar + tautan PDF. Desa tinggal menekan **Kirim**.

Pengiriman juga terjadi pada keadaan berikut:
- **Data diubah lalu dicetak ulang** → data di aplikasi tujuan diperbarui (tidak membuat data dobel).
- **Dibatalkan** → status `BATAL` dikirim; **diaktifkan kembali** → `TERDAFTAR` dikirim.
- **Jenis diubah** (mis. Nikah di Wilayah → Rekomendasi) → jadwal di Akad Tracker dibatalkan otomatis. Layanan di LABUKU Desk berganti ke *Penerbitan Surat Rekomendasi Nikah*.
- **Aplikasi tujuan sedang gangguan** → status `GAGAL`. Cetak tetap berhasil. Trigger **`kirimUlangIntegrasi`** dibuat otomatis dan mengirim ulang **tiap 5 menit** (maks. 20 pengajuan per putaran); setelah semua berhasil, trigger **menghapus dirinya sendiri**.

Hasil setiap kiriman masuk **lonceng Admin KUA** (✅ berhasil / ⚠️ gagal + pesan). Kirim ulang otomatis hanya menambah notifikasi bila hasilnya berubah (mis. akhirnya berhasil). Status per pengajuan juga terlihat di Riwayat Pengajuan → ☰ → **Kirim ke KUA**.

### Cara menyambungkan (Data Master → Integrasi & WhatsApp)

Kerjakan **Bagian K dulu** (pasang penerima + buat kunci), lalu:
1. **Nomor WhatsApp KUA** — format bebas (`0812…` atau `62812…`).
2. **Akad Tracker — URL API (/exec):** URL Web App Akad Tracker, sama dengan `GAS_URL` di `js/config.js` repo Akad Tracker. Bentuknya `https://script.google.com/macros/s/……/exec`.
3. **Akad Tracker — Kunci KUA-Link:** kunci `AKD-…` dari Execution log Akad Tracker.
4. **LABUKU Desk — URL API (/exec)** dan **Kunci** `LBD-…` dengan cara yang sama.
5. **Simpan** → **Uji Koneksi** masing-masing. Hasil yang benar: *"Kunci cocok. … siap menerima data KUA-Link."*

Pengaman:
- URL selain `https://script.google.com/macros/s/…/exec` ditolak.
- Kunci disimpan di sheet AppConfig KUA-Link. Kunci hanya terlihat oleh Admin KUA dan tidak pernah dikirim ke perangkat desa.
- Aplikasi tujuan menolak kiriman berkunci salah dan mengunci sementara (5 menit) setelah 5× salah.

### Privasi tautan PDF
- Bawaan: tautan bisa dibuka **siapa saja yang memiliki tautan**. Ini perlu agar bisa dibuka dari WhatsApp tanpa login.
- Tautan memuat NIK dan data pribadi (UU 27/2022): jangan teruskan pesan ke grup/pihak lain.
- Bila ingin tertutup, ubah **Tautan PDF paket** menjadi *Hanya akun yang diberi akses*. Konsekuensinya, staf KUA harus login akun Google yang diberi akses ke folder.

---

## K. Pasang Penerima di Akad Tracker & LABUKU Desk

Berkas ada di folder `integrasi/` paket ini. Dasarnya kode **Akad Tracker v2.2** dan **LABUKU Desk v6.12** dari komputer Anda.

| Aplikasi | Berkas baru | Berkas lama yang diubah | Frontend |
|---|---|---|---|
| Akad Tracker | `KUALink.gs` (v1.4: + modin) | `Code.gs` — 3 tempat | `js/app.js` (badge & berkas desa) |
| LABUKU Desk | `KUALink.gs` (v1.4: antrean biasa) | `Kode.gs` — 1 baris di `doPost` + 2 baris antrean | tidak berubah |

> Bila `Code.gs`/`Kode.gs` di proyek Anda sudah **lebih baru** dari v2.2/v6.12, jangan timpa seluruhnya. Tambahkan perubahan kecil di bawah ini secara manual.

### K1. Akad Tracker (v2.2 → v2.3)

**Backend (Apps Script Akad Tracker):**
1. **+ → Script** → beri nama `KUALink` → hapus isi bawaan → tempel isi `integrasi/akad-tracker/KUALink.gs` → Simpan.
2. Ganti seluruh isi `Code.gs` dengan `integrasi/akad-tracker/Code.gs`. **Atau** ubah manual 3 tempat:
   ```js
   const SCHEMA_VERSION = '15';          // sebelumnya '14'
   ```
   ```js
       'bimwin_status', 'bimwin_sesi_id',
       'kualink_pdf', 'kualink_data'],   // tambahkan di akhir HEADERS.JADWAL
   ```
   ```js
       bimwinDokumen: bimwinDokumen, bimwinSetTemplate: bimwinSetTemplate,
       kualinkMasuk: kualinkMasuk         // tambahkan di akhir apiTable_()
   ```
3. Pilih fungsi **`aturKunciKUALink`** → **▶ Run**. Salin kunci `AKD-…` dari **Execution log**.
4. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL `/exec` tetap sama.
5. Migrasi kolom berjalan sendiri pada permintaan pertama: kolom `kualink_pdf` & `kualink_data` ditambahkan di **akhir** sheet JADWAL. Data lama tidak berubah.

**Frontend (repo GitHub Akad Tracker):**
6. Salin `integrasi/akad-tracker/frontend/js/app.js` ke `js/app.js` di repo (timpa). **Jangan sentuh `js/config.js`.**
7. Git Bash dari folder repo: `git add js/app.js` → `git commit -m "v2.3 integrasi KUA-Link"` → `git push`. Tunggu ±1–10 menit, lalu tekan Ctrl+F5 di dashboard.

Hasil di Akad Tracker:
- Jadwal baru masuk **TERJADWAL** dan **terverifikasi**, bersumber **KUA-Link (desa)**:
  - badge **KUA-Link** di kartu jadwal;
  - **No. Pendaftaran** = nomor KUA-Link;
  - nama catin ditulis KAPITAL (aturan bawaan Akad Tracker);
  - **wali** Nasab/Hakim dan **tempat** Kantor/Luar Kantor terisi;
  - keterangan memuat alamat akad (bila di luar kantor), nama wali, dan asal desa;
  - **modin** (v1.4) dicocokkan dengan **Master Modin** Akad Tracker: lewat nomor WA, lalu nama (sapaan "Pak/Bapak/Ibu" diabaikan). Bila belum terdaftar, kolom modin dibiarkan kosong dan keterangan berisi *"Modin: … — belum ada di Master Modin"*. Tambahkan modin itu di Akad Tracker agar Rekap Modin berjalan;
  - detail jadwal memuat baris **Berkas Desa → Buka PDF paket surat desa**.
- Desa mencetak ulang tanpa mengubah data → hanya tautan PDF yang diperbarui. Field ditimpa **hanya bila desa mengubah nilainya**. Penghulu, modin, jam, atau catatan yang diubah tim KUA tetap. Modin kosong/tidak dikenal dari desa tidak menghapus modin yang dipilih tim KUA.
- Desa membatalkan → **BATAL** (tanda *perlu dicek*); diaktifkan kembali → **TERJADWAL**. Jadwal yang dibatalkan **tim KUA sendiri** tidak dihidupkan lagi oleh KUA-Link.
- Bila nama/tanggal cocok dengan jadwal lain, jadwal ditandai *kemungkinan duplikat* (fitur bawaan).
- Semua perubahan tercatat di Riwayat dengan pelaku `KUA-Link`.

### K2. LABUKU Desk (v6.12)

**Backend saja** (frontend tidak berubah):
1. **+ → Script** → nama `KUALink` → tempel isi `integrasi/labuku-desk/KUALink.gs` → Simpan.
2. Ganti seluruh isi `Kode.gs` dengan `integrasi/labuku-desk/Kode.gs`. **Atau** ubah manual 3 baris:
   ```js
         getFormData: function () { return JSON.parse(buildPublicFormJson_()); },
         kualinkMasuk: kualinkMasuk   // ← di daftar PUBLIK dalam function doPost(e) (koma di baris sebelumnya)
   ```
   ```js
   function getFrontOfficeRows_(ss, range) {
     ensureSchema_();
     kualinkGeserAntrean_(ss);   // ← baris baru
   ```
   ```js
       const mon = monitorConfig_(config);
       kualinkGeserAntrean_(ss);   // ← baris baru (di getMonitorData_)
   ```
3. Jalankan **`aturKunciKUALink`** → salin kunci `LBD-…` dari Execution log (cukup sekali; kunci lama tetap berlaku saat upgrade).
4. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.

Hasil di LABUKU Desk (v1.4 — **masuk biasa, bukan Pending**):
- Layanan baru (ID `LYN-…`) berstatus **Antre** + antrean **`KL-001`, `KL-002`, …** (Sumber *Online*) di **Front Office**:
  - jenis **Pendaftaran Kehendak Nikah** (nikah di wilayah) atau **Penerbitan Surat Rekomendasi Nikah** (luar wilayah);
  - **pemohon** = catin warga desa pengaju (calon istri; calon suami bila pengajuan hanya untuk suami), dicocokkan dengan NIK;
  - **keterangan** berisi nomor KUA-Link, desa, catin, jadwal akad, dan modin;
  - checklist persyaratan dari Katalog Layanan; PDF paket desa masuk **Dokumen** (kategori *Berkas Desa (KUA-Link)*);
  - sheet **`KUALink`** memetakan nomor KUA-Link ↔ layanan ↔ antrean. Jangan diedit.
- **Saat berkas datang:** di Front Office cari baris **KL-…** → **Panggil → Verifikasi → Lengkap** (alur biasa). Jangan *Tambah Antrean* lagi untuk catin yang sama.
- **Berkas belum datang hari itu:** antrean KL-… yang belum dipanggil **dibawa ke hari berikutnya** secara otomatis saat Front Office/Monitor pertama dibuka. Antrean kemarin ditandai *Terlewat*, dan antrean baru dengan nomor sama dibuat untuk hari ini.
- Kiriman berikutnya (cetak ulang) memperbarui keterangan & PDF. Layanan yang sudah **Diproses/Selesai** tidak diubah statusnya.
- Desa membatalkan → **Ditolak** (antrean ditutup); diaktifkan kembali → **Antre** + antrean baru hari itu (nomor sama).
- Data kiriman versi lama yang masih **Pending** tetap diperlakukan seperti sebelumnya.

> Nama layanan di **Katalog Layanan** LABUKU Desk harus persis `Pendaftaran Kehendak Nikah` dan `Penerbitan Surat Rekomendasi Nikah`. Bila berbeda, layanan tetap dibuat dengan nama itu, tetapi tanpa checklist dan tanpa tautan katalog. Ubah nama katalog, atau ubah pemetaan `KUALINK_KATALOG` di `KUALink.gs`.

### K3. Urutan deploy yang aman
1. Akad Tracker: K1 langkah 1–5 (backend) → catat kunci.
2. LABUKU Desk: K2 langkah 1–4 → catat kunci.
3. KUA-Link: upgrade/deploy v1.4 → Data Master → Integrasi & WhatsApp → isi URL + kunci → **Uji Koneksi** keduanya.
4. Uji satu pengajuan contoh: Simpan & Cetak → cek jadwal (dengan modin) di Akad Tracker dan antrean KL-… di Front Office LABUKU Desk → batalkan dari Riwayat Pengajuan → pastikan berubah BATAL/Ditolak → cek lonceng Admin KUA.
5. Akad Tracker frontend (K1 langkah 6–7). Langkah ini boleh kapan saja, karena backend tetap berjalan tanpa frontend baru.

### Kecepatan & kuota
- Tiap kiriman = 1 panggilan `UrlFetchApp` per tujuan (±1–3 detik), dijalankan **setelah** PDF tersimpan. Jendela WhatsApp tetap terbuka walau tujuan lambat.
- Tidak ada trigger di Akad Tracker/LABUKU Desk. Satu-satunya trigger integrasi adalah `kirimUlangIntegrasi` di KUA-Link: tiap 5 menit, **hanya ada selama masih ada kiriman gagal**.
- Pemindahan antrean KL-… di LABUKU Desk berjalan sekali per hari (dicatat di cache), jadi tidak memperlambat Front Office.
- Kuota `UrlFetchApp` akun Google gratis: 20.000 panggilan/hari, jauh di atas kebutuhan 14 desa.
