# GUARD.md — Pemetaan Guard & Analisis Risiko Endpoint

> **Dokumen Blok A (Sesi 3 DevSprint Accelerator)**  
> Memetakan seluruh endpoint yang ada di *Warung Madura Stock Manager*, menilai tingkat risiko (ubah data, uang/stok, data sensitif), dan menentukan perlindungan (*guards*) yang wajib dipasang sebelum sistem dipublikasikan ke internet.

---

## 1. Titik Awal: Kondisi Keamanan Saat Ini
Saat ini server Express berjalan **tanpa autentikasi sama sekali**:
- Semua endpoint di bawah `/api/*` dapat ditembak langsung via `curl` / Postman oleh siapa pun yang mengetahui URL aplikasi.
- Identitas staf penerima barang (`receivedById`) dipercaya begitu saja dari body JSON request (rentan impersonasi / pemalsuan).
- Data finansial sensitif seperti **harga modal kulakan** (`purchasePrice`, `costPerBaseUnit`) terbuka bebas di response JSON produk dan penerimaan barang.

---

## 2. Tabel Pemetaan Endpoint $\rightarrow$ Risiko $\rightarrow$ Guard

| Method | Endpoint | Ubah Data? | Sentuh Uang/Stok? | Data Sensitif? | Tingkat Risiko | Guard yang Dibutuhkan |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `GET` | `/api/health` | Tidak | Tidak | Tidak | **Rendah** | Public (Bebas diakses untuk monitoring) |
| `GET` | `/api/dashboard` | Tidak | **Ya (Uang)** | **Ya (Omset)** | **Tinggi** | Login Wajib + Role: `PEMILIK` |
| `GET` | `/api/products` | Tidak | Ya (Stok) | **Ya (Harga Modal)** | **Sedang** | Login Wajib + Field Filtering (sembunyikan `purchasePrice` untuk Staf) |
| `GET` | `/api/products/:id` | Tidak | Ya (Stok) | **Ya (Harga Modal)** | **Sedang** | Login Wajib + Field Filtering (sembunyikan `purchasePrice` untuk Staf) |
| `POST` | `/api/products` | **Ya** | **Ya (Katalog)** | **Ya** | **Kritis** | Login Wajib + Role: `PEMILIK` + Validasi Zod |
| `PATCH` | `/api/products/:id` | **Ya** | **Ya (Harga Jual/Beli)** | **Ya** | **Kritis** | Login Wajib + Role: `PEMILIK` + Validasi Zod |
| `DELETE` | `/api/products/:id` | **Ya** | **Ya (Katalog)** | Tidak | **Kritis** | Login Wajib + Role: `PEMILIK` + Proteksi Relasi |
| `GET` | `/api/sales` | Tidak | **Ya (Uang)** | **Ya (Riwayat Omset)** | **Tinggi** | Login Wajib + Role: `PEMILIK` (atau kasir terbatas) |
| `GET` | `/api/sales/:id` | Tidak | **Ya (Uang)** | **Ya** | **Sedang** | Login Wajib + Role: `PEMILIK` / `STAF` |
| `POST` | `/api/sales` | **Ya** | **Ya (Stok & Uang)** | Tidak | **Tinggi** | Login Wajib + Role: `PEMILIK` / `STAF` + Validasi Stok |
| `POST` | `/api/stock-adjustments` | **Ya** | **Ya (Stok)** | Tidak | **Kritis** | Login Wajib + Role: `PEMILIK` + Validasi Alasan Wajib |
| `GET` | `/api/stock-movements` | Tidak | Ya (Stok) | Tidak | **Sedang** | Login Wajib + Role: `PEMILIK` / `STAF` |
| `GET` | `/api/purchase-orders` | Tidak | Ya (Pesanan) | **Ya (Harga Beli)** | **Tinggi** | Login Wajib + Role: `PEMILIK` (Staf hanya jika verifikasi kedatangan) |
| `GET` | `/api/purchase-orders/:id` | Tidak | Ya (Pesanan) | **Ya (Harga Beli)** | **Tinggi** | Login Wajib + Role: `PEMILIK` (Sembunyikan harga beli jika diakses Staf) |
| `POST` | `/api/purchase-orders` | **Ya** | **Ya (Komitmen Uang)**| **Ya** | **Kritis** | Login Wajib + Role: `PEMILIK` + Validasi Zod |
| `POST` | `/api/purchase-orders/:id/cancel-remaining` | **Ya** | **Ya (Pesanan)** | Tidak | **Kritis** | Login Wajib + Role: `PEMILIK` |
| `GET` | `/api/goods-receipts` | Tidak | Ya (Stok) | **Ya (Harga Modal)** | **Tinggi** | Login Wajib + Role: `PEMILIK` / `STAF` + Masking Modal |
| `GET` | `/api/goods-receipts/:id` | Tidak | Ya (Stok) | **Ya (Harga Modal)** | **Tinggi** | Login Wajib + Role: `PEMILIK` / `STAF` + Masking Modal |
| `POST` | `/api/goods-receipts` | **Ya** | **Ya (Stok Bertambah)**| **Ya** | **Kritis** | Login Wajib + Role: `PEMILIK` / `STAF` (Kunci `receivedById` = identitas sesi!) + Idempotency |
| `GET` | `/api/suppliers` | Tidak | Tidak | Ya (Kontak) | **Rendah** | Login Wajib + Role: `PEMILIK` / `STAF` |
| `GET` | `/api/suppliers/:id` | Tidak | Tidak | Ya (Kontak) | **Rendah** | Login Wajib + Role: `PEMILIK` / `STAF` |
| `POST` | `/api/suppliers` | **Ya** | Tidak | Tidak | **Tinggi** | Login Wajib + Role: `PEMILIK` |
| `PATCH` | `/api/suppliers/:id` | **Ya** | Tidak | Tidak | **Tinggi** | Login Wajib + Role: `PEMILIK` |
| `GET` | `/api/staff` | Tidak | Tidak | Ya (Daftar Karyawan) | **Sedang** | Login Wajib + Role: `PEMILIK` |
| `GET` | `/api/staff/:id` | Tidak | Tidak | Ya | **Sedang** | Login Wajib + Role: `PEMILIK` |
| `POST` | `/api/staff` | **Ya** | Tidak | **Ya (Akun)** | **Kritis** | Login Wajib + Role: `PEMILIK` |
| `PATCH` | `/api/staff/:id` | **Ya** | Tidak | **Ya (Akun)** | **Kritis** | Login Wajib + Role: `PEMILIK` |

---

## 3. Tiga Aksi Paling Berbahaya yang Belum Terjaga Saat Ini

1. **Manipulasi Koreksi Stok Bebas (`POST /api/stock-adjustments`)**
   * *Bahaya*: Siapa pun di internet tanpa login dapat mengirim request `OUT` untuk membuat stok barang menjadi 0 atau request `IN` untuk mengaburkan barang hilang/dicuri.
   * *Dampak*: Buku stok langsung rusak dan kehancuran akurasi inventaris toko.

2. **Pengubahan Harga & Penghapusan Master Produk (`POST / PATCH / DELETE /api/products`)**
   * *Bahaya*: Siapa pun dapat mengubah harga jual Indomie dari Rp3.500 menjadi Rp100, menaikkan harga modal secara sembarangan, atau menonaktifkan/menghapus produk aktif.
   * *Dampak*: Kerugian finansial fatal dan terganggunya operasional kasir warung.

3. **Penerimaan Barang Fiktif & Pemalsuan Identitas Penerima (`POST /api/goods-receipts`)**
   * *Bahaya*: Server saat ini menerima `receivedById` dari body JSON. Penyerang dapat memasukkan penerimaan barang palsu sebesar ribuan unit dan mencatut nama staf lain (misal Udin mengaku Sari atau sebaliknya).
   * *Dampak*: Stok gudang fiktif meledak, laporan pembelian berantakan, dan saling tuduh antar staf saat terjadi selisih fisik.
