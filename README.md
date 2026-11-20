# Bayan 0.3.1

Bayan (sebelumnya Sisip Ayat) adalah aplikasi desktop Electron untuk Al-Qur’an, hadis offline, dan perpustakaan PDF pribadi. Kutipan Arab dan terjemahan dapat disalin ke Word/PowerPoint sebagai teks Unicode yang dapat diedit. Data, font pratinjau, setelan, riwayat, dan PDF disimpan di perangkat. Aplikasi terkemas memblokir permintaan jaringan.

## Menggunakan aplikasi

- **Al-Qur’an**: 114 surah, 6.236 ayat. Cari `2:255`, `Al-Baqarah 255`, `Albaqoroh 255`, `2:255-257`, `Ayat Kursi`, atau `Al-Ikhlas`. Gunakan kolom Dari/Sampai untuk mengatur rentang.
- **Hadis**: snapshot 38.102 riwayat dari sembilan kitab, dibundel lokal dari gadingnst/hadith-api. Pilih kitab, cari nomor/rentang atau kata terjemahan/Arab, pilih hasil, lalu salin. Nomor mengikuti sumber, dengan celah penomoran; tidak diklaim sebagai koleksi lengkap setiap kitab. Derajat hadis tidak tersedia.
- **Perpustakaan & Sirah**: impor PDF lokal (maksimal 200 MB per berkas, 20 berkas per impor), kategori Sirah/Hadis/Tafsir/Fikih/Umum, judul, penulis, catatan, pencarian metadata, arsip/pulihkan. PDF disalin ke folder data pengguna dan dibuka memakai pembaca PDF perangkat. File asal tidak diubah. Tidak ada unggahan server, OCR, pencarian isi PDF, atau buku sirah bawaan.
- **Cadangan**: ekspor/pulihkan folder cadangan PDF beserta metadata, dengan deduplikasi berdasarkan SHA-256. Cadangan perpustakaan tidak mencakup setelan dan riwayat kutipan.

Opsi format bersama: Arab/terjemahan/keduanya, nomor, rujukan, Word/PPT, font dan ukuran. Clipboard memuat HTML RTL, RTF, dan teks polos. Font output default Traditional Arabic perlu tersedia di komputer tujuan; Amiri dibundel untuk pratinjau. Untuk memakai Amiri di Office, pasang `assets/fonts/Amiri-Regular.ttf`. PowerPoint dapat mengubah ukuran lewat tema/autofit; gunakan Keep Source Formatting dan periksa autofit bila ukuran harus persis.

Pintasan menggunakan Cmd di macOS dan Ctrl di Windows: K cari, Enter salin. Pada tab Al-Qur’an: 1 Word, 2 PowerPoint, D tema, `/` cari, Esc hapus. Saran surah mendukung panah atas/bawah dan Enter. Dialog setelan menggunakan fokus modal native.

## Pembaruan Windows

**Tutup aplikasi, jalankan installer versi baru di akun Windows yang sama, lalu buka kembali. Tidak perlu uninstall.** Bayan 0.3.1 mempertahankan appId dan folder data `sisip-ayat` milik Sisip Ayat 0.1/0.2 agar pembaruan tetap membaca data lama. Setelan, riwayat dan PDF pribadi berada di luar folder instalasi. Installer lengkap berfungsi untuk memperbarui aplikasi; belum ada patch kecil atau auto-update. Lihat [UPDATING.md](UPDATING.md) untuk cadangan dan perpindahan komputer.

## Pengembangan

Memerlukan Node.js 24 untuk pengembangan. Pengguna aplikasi terkemas tidak memerlukan Node.js, server, atau database.

```sh
npm ci
npm run build
npm start
```

`npm run dev` membuka pratinjau UI dengan hot reload. Layanan hadis, clipboard native, dan impor PDF memerlukan Electron (`npm start` setelah build). Tidak ada backend jaringan.

```sh
npm test
npm run validate
npm run build
npm run test:desktop
npm run test:features
```

Tes desktop memakai profil sementara dan mengubah clipboard sistem. Tes fitur memakai dialog pemilih file tiruan; uji pembukaan PDF memeriksa jalur salinan lokal melalui stub pembaca sistem. Screenshot di `tests/*.png`. Untuk menguji kompatibilitas executable lama dan baru:

```sh
node scripts/smoke-features.js "/path/to/old/executable" "/path/to/new/executable"
```

## Pengemasan

```sh
npm run dist:win
npm run dist:mac
```

Hasil di `release/`: NSIS Windows x64 per-user, DMG macOS sesuai arsitektur mesin. Cross-build Windows dari macOS berhasil dibuat; pengujian di Windows tetap diperlukan. Workflow `Build Bayan installers` (workflow_dispatch) tersedia untuk build di runner Windows/macOS. Untuk Mac Intel gunakan `npx electron-builder --mac dmg --x64` setelah build. Installer prarilis belum ditandatangani digital.

## Data, sumber, dan status rilis

Lihat [data/NOTICE.md](data/NOTICE.md), [data/provenance.json](data/provenance.json), [data/hadith/manifest.json](data/hadith/manifest.json), dan [tests/QA.md](tests/QA.md).

- Arab Al-Qur’an: Tanzil Uthmani melalui Quran JSON; seluruh 6.236 teks cocok dengan unduhan langsung Tanzil pada pemeriksaan otomatis. Snapshot tidak diedit.
- Terjemahan Al-Qur’an: Kemenag melalui EQuran.id. Konfirmasi edisi/hak distribusi dan pemeriksaan manual mushaf belum selesai.
- Hadis: gadingnst/hadith-api, commit dipatok dalam manifest, sumber yang dinyatakan tafsirq.com. Lisensi MIT repositori disertakan; hak terjemahan sumber asal dan pemeriksaan ilmiah belum dikonfirmasi secara independen.
- Pemeriksaan build: jumlah ayat baku, ID, pasangan terjemahan, isi tidak kosong, checksum data ayat/hadis. Data hadis mempertahankan celah nomor sumber.
- Uji tempel singkat Word/PowerPoint for Mac sudah dilakukan pada 0.1.0. Installer dan tempel di Windows target masih perlu diuji. Tidak mengklaim pentashihan atau kesiapan rilis publik.
- Dependensi runtime tidak memiliki advisori pada audit awal; electron-builder masih memiliki advisori moderate transitif. Lihat `npm audit` sebelum distribusi publik.

`python3 scripts/fetch-data.py` dan `python3 scripts/fetch-hadith.py` hanya untuk maintainer memperbarui snapshot. Tidak dipanggil aplikasi atau build. `node scripts/verify-tanzil.js` membandingkan sumber Arab langsung dan membutuhkan koneksi. Pembaruan data harus diikuti validator dan peninjauan sumber, tanpa edit manual pada teks keagamaan.

Struktur: `src/main` Electron, IPC dan penyimpanan PDF; `src/core` parser/data/formatter/hadis; `src/renderer` UI React; `data` snapshot; `assets/fonts` font dan lisensi. Renderer diisolasi dan sandboxed tanpa Node.js. Tidak ada auto-insert Office, audio, akun atau telemetri.

Logo Bayan disediakan oleh pemilik proyek dan digunakan dari `assets/bayan-logo.png`. PNG sumber dipertahankan tanpa perubahan; konversi ikon Windows/macOS dilakukan oleh electron-builder saat pengemasan.

Perbaikan 0.3.1: basmalah pembuka dipisahkan ke paragraf tersendiri tanpa nomor pada pratinjau serta clipboard HTML/RTF/teks polos. Berlaku saat rentang mencakup ayat pertama, termasuk mode satu blok. Basmalah Al-Fatihah tetap ayat 1; At-Taubah tidak ditambah basmalah. Teks sumber JSON tidak diubah.
