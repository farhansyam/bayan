# Memperbarui ke Bayan di Windows

## Dari Sisip Ayat 0.1/0.2 ke Bayan 0.3.0

1. Tutup aplikasi Sisip Ayat yang sedang berjalan.
2. Jalankan `Bayan-0.3.0-win-x64.exe` di akun Windows yang sama.
3. Installer memperbarui aplikasi yang sudah ada. Tidak perlu menghapus versi lama terlebih dahulu.
4. Buka Bayan dari pintasan aplikasi. Al-Qur’an, Hadis, dan Perpustakaan & Sirah tetap tersedia.

Versi ini menggunakan installer lengkap yang juga berfungsi untuk memperbarui aplikasi. Belum ada patch kecil atau pembaruan otomatis. Setelah installer diunduh/disalin ke komputer, proses instalasi dan penggunaan dapat dilakukan tanpa internet. Gunakan installer resmi proyek dengan nomor versi yang lebih baru.

Nama produk dan logo sekarang Bayan. Identitas instalasi (`appId`) dan pemasangan per pengguna dipertahankan agar installer mengenali pemasangan Sisip Ayat. Setelan dan riwayat menggunakan lokasi data pengguna yang sama. PDF pribadi serta metadata disimpan di subfolder `library` dalam direktori data pengguna, di luar folder instalasi. Installer dikonfigurasi agar tidak menghapus data pengguna. Jangan menghapus folder data pengguna secara manual. Instalasi pada akun Windows lain menggunakan ruang data akun tersebut.

Lokasi data dapat dilihat di **Setelan → Pembaruan & data pribadi**. Lokasi lama dipertahankan secara eksplisit di `%APPDATA%\sisip-ayat`, agar pergantian nama tidak membuat koleksi tampak kosong. Gunakan lokasi yang ditampilkan aplikasi sebagai acuan.

## Cadangkan atau pindahkan koleksi PDF

- Pilih **Perpustakaan & Sirah → Cadangkan**, lalu pilih folder tujuan di luar folder data perpustakaan. Sebaiknya simpan salinannya pada media lain.
- Cadangan berisi PDF asli beserta judul, penulis, kategori, catatan, dan status arsip dalam satu folder. Simpan folder tersebut secara utuh.
- Pada komputer tujuan, pilih **Pulihkan cadangan**, lalu pilih folder `Bayan-Cadangan-...` (cadangan lama `Sisip-Ayat-Cadangan-...` juga tetap dapat dibaca).
- Buku yang sudah ada dilewati berdasarkan checksum; pemulihan tidak menimpa metadata buku yang sudah ada. Arsip juga dicadangkan.
- Fitur cadangan perpustakaan tidak mencakup setelan dan riwayat kutipan. Untuk cadangan seluruh data aplikasi, tutup aplikasi lalu salin direktori data pengguna yang ditampilkan di Setelan.

PDF yang diimpor disalin ke penyimpanan aplikasi. File asal tetap berada di lokasi semula. Tombol **Buka PDF** memakai pembaca PDF di komputer. File pribadi tidak dikirim ke server. Arsipkan buku untuk menyembunyikannya dari koleksi; buku dapat dipulihkan dari tab Arsip.

## Status pengujian

Kompatibilitas data diuji dengan membuka profil dari executable 0.1.0 menggunakan versi 0.2.0, serta memulai ulang versi baru setelah mengimpor dan mengedit PDF. Perpindahan Sisip Ayat 0.2.0 ke Bayan 0.3.0 juga diuji pada executable lama dengan setelan, riwayat, metadata, status arsip, dan isi PDF tetap sama. Installer Windows dibuat dari macOS dan belum diuji pemasangan langsung di Windows. Periksa hasil tempel pada Word/PowerPoint versi komputer tujuan. Installer prarilis belum ditandatangani digital.
