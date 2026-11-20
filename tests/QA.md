# QA prarilis 0.1.0

Tanggal: 20 November 2026. Mesin uji: macOS Apple Silicon.

## Lolos otomatis

- 114 surah / 6.236 ayat; jumlah Hafs/Kufi baku tiap surah, ID berurutan, isi Arab/terjemahan tidak kosong, SHA-256 snapshot.
- Seluruh 6.236 teks Arab dibandingkan string-per-string dengan unduhan Uthmani langsung Tanzil: identik. Lihat data/tanzil-verification.json dan scripts/verify-tanzil.js.
- Input nomor, nama, variasi Albaqoroh, rentang, angka Arab, surah utuh, seluruh nama baku surah, Ayat Kursi dan Yasin.
- Input salah, nomor di luar batas dan rentang terbalik ditolak.
- HTML membawa RTL/lang/font/ukuran, plain text mempertahankan Unicode asli, RTF membawa arah paragraf/font dan escape Unicode.
- Electron native: salin HTML + plain text + RTF, preset Word/PPT, pemulihan rentang salah melalui kolom rentang, tema gelap, riwayat dan setelan tetap ada setelah reload.
- Build produksi, DMG arm64 sekitar 120 MB, dan pengujian alur utama pada executable terkemas (bukan hanya mode pengembangan). Installer NSIS Windows x64 juga berhasil dibuat melalui cross-build di macOS (sekitar 119 MB). Executable aplikasi terdeteksi PE32+ x86-64; bundel ASAR memuat UI, main/preload, dan data Arab/terjemahan offline. Installer memakai stub NSIS 32-bit yang memasang aplikasi 64-bit. Belum diuji instalasi atau runtime di Windows. Workflow GitHub Actions tetap tersedia untuk build di runner Windows.

## Pengujian langsung Office for Mac

- Word: tempel Ayat Kursi dari clipboard aplikasi ke dokumen baru. Arab berharakat tampil dan tetap berupa teks; Word mengenali Traditional Arabic dan ukuran 36pt dari preset yang saat itu dipilih. Terjemahan dan rujukan hadir. Ini uji singkat, bukan matriks seluruh versi Office.
- PowerPoint: tempel Al-Ikhlas ayat 1 ke slide/kotak teks baru. Arab, terjemahan, label ayat dan rujukan tampil sebagai teks. Awalnya nomor terjemahan dipindah oleh arah teks bawaan; label diubah dari angka awalan menjadi `Ayat 1.` untuk menjaga urutannya tanpa kontrol Unicode tambahan.
- PowerPoint dapat mengubah ukuran melalui tema/autofit (pada uji ini Arab 36pt menjadi 32pt), serta mengambil format kotak teks tujuan. Gunakan Keep Source Formatting dan periksa autofit. Preset adalah ukuran payload clipboard; aplikasi tidak mengendalikan tema dokumen Office.

## Masih perlu sebelum rilis publik

1. Konfirmasi edisi/izin distribusi terjemahan Kemenag dari penyedia/sumber resmi.
2. Pemeriksaan manual minimal 50 ayat dan bagian populer dengan mushaf serta terjemahan resmi; pembandingan string otomatis tidak menggantikan ini.
3. Uji installer dan tempel di Windows 10/11 target, Word dan PowerPoint 2016/365, khususnya paragraf RTL dan ukuran font.
4. Code signing/notarization dan audit advisori transitif electron-builder bila akan didistribusikan luas.

Screenshot antarmuka: welcome.png, preview.png, dark.png (hasil otomatis dengan profil sementara).

# QA prarilis 0.2.0

Tanggal: 20 November 2026. Penambahan: hadis offline dan perpustakaan PDF pribadi.

- 12 tes inti lolos: parser/formatter Al-Qur’an, sumber dan pencarian hadis, rujukan HR (bukan QS), impor/deduplikasi PDF, metadata, arsip, serialisasi perubahan bersamaan, cadangan/pemulihan, checksum cadangan rusak, dan indeks rusak yang tidak ditimpa diam-diam.
- Validasi snapshot: sembilan kitab, 38.102 riwayat, ID positif unik terurut, Arab/Indonesia tidak kosong, SHA-256 cocok. Ada celah penomoran sumber; tidak mengklaim kelengkapan kitab atau derajat hadis.
- Tes Electron Al-Qur’an yang lama tetap lolos setelah penambahan tab.
- Tes fitur membuka executable macOS 0.1.0, menyimpan preferensi/riwayat dalam profil terisolasi, kemudian membuka profil yang sama dengan 0.2.0. Ukuran font khusus dan riwayat tetap terbaca.
- Tes UI hadis: nomor, kata terjemahan, salin native HTML/RTF/plain, rujukan Bukhari, penolakan nomor di luar sumber.
- Tes UI perpustakaan: impor lewat dialog tiruan, edit judul/penulis/catatan, cari catatan, sumber PDF asal dihapus di fixture tetapi salinan lokal tetap tersedia, arsip/pulihkan, cadangkan, pulihkan tanpa duplikasi, dan restart proses penuh dengan metadata tetap ada.
- Pembukaan pembaca PDF OS diuji menggunakan stub `shell.openPath` agar tes tidak membuka aplikasi lain; jalur salinan lokal diverifikasi.
- Screenshot UI `hadith.png` dan `library.png` ditinjau secara visual. File PDF dan metadata pada screenshot adalah fixture tes, bukan koleksi yang disertakan installer.
- Uji pemasangan/upgrade NSIS pada Windows dan pengujian Office Windows masih diperlukan. Kompatibilitas format data tidak menggantikan pengujian installer pada Windows.

Paket akhir 0.2.0: NSIS Windows x64 sekitar 129 MB dan DMG Apple Silicon sekitar 134 MB berhasil dibuat. Isi ASAR Windows diperiksa: versi, sembilan data kitab, total riwayat, checksum, modul perpustakaan dan lisensi sesuai. Alur Al-Qur’an dan fitur baru juga lolos pada executable macOS yang sudah dikemas. Hash installer tersedia di release/checksums-0.2.0.sha256.

# QA Bayan prarilis 0.3.0

- Nama UI, judul jendela, nama aplikasi/installer dan logo diganti menjadi Bayan. PNG logo dari pemilik proyek disalin tanpa perubahan (checksum identik); ikon OS dikonversi saat build.
- `appId` NSIS lama tetap `id.sisipayat.app`. Folder default data disematkan ke direktori lama `sisip-ayat`, sementara `--user-data-dir` tetap dihormati untuk profil khusus/pengujian.
- Tes migrasi memakai executable Sisip Ayat 0.2.0: impor PDF, edit metadata dan arsip, simpan setelan/riwayat, lalu buka profil yang sama dengan Bayan 0.3.0. Jalur, ID, setelan, riwayat, isi PDF, metadata dan status arsip tetap sama.
- Nama folder cadangan baru `Bayan-Cadangan-...`; pemulihan membaca indeks dan PDF sehingga cadangan lama tetap didukung.
- Pengujian instalasi/upgrade NSIS pada Windows target dan signing installer tetap terpisah dari uji kompatibilitas format data.

# Bayan 0.3.1 — pemisahan basmalah

- Basmalah pembuka ditampilkan/disalin sebagai paragraf Arab tersendiri tanpa nomor, sebelum ayat 1; mode per ayat maupun satu blok memakai pemisahan yang sama.
- Seluruh 112 pembuka diuji secara otomatis, termasuk variasi harakat sumber pada At-Tin (95) dan Al-Qadr (97). Penggabungan kembali bagian dengan spasi sumber sama persis dengan teks asli. JSON sumber dan checksum tidak diubah.
- Al-Fatihah 1:1 tetap basmalah bernomor 1; At-Taubah tidak ditambah basmalah; basmalah di tengah An-Naml 27:30 tidak dipecah; rentang mulai ayat 2 dan seterusnya tidak ditambah pembuka.
- HTML, RTF dan teks polos memiliki paragraf basmalah terpisah. Mode terjemahan saja tidak menambah teks Arab.
- 14 tes inti dan alur Electron Al-Qur’an/hadis/perpustakaan lolos. Screenshot `tests/basmalah.png` memperlihatkan Al-Baqarah 1 dengan basmalah di atas ayat, tanpa nomor pembuka.
