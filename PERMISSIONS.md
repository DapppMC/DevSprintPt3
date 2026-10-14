# PERMISSIONS.md — Matriks Izin & Aturan Khusus RBAC

> **Dokumen Blok B (Sesi 3 DevSprint Accelerator)**  
> Menetapkan aturan izin berbasis peran (*Role-Based Access Control / RBAC*) berdasarkan kebutuhan nyata Cak Rofi (Warung Berkah 24 Jam), aturan khusus integritas data, dan skenario pengujian serangan (*attack tests*).

---

## 1. Definisi Peran (*Roles*)

Berdasarkan chat WhatsApp Cak Rofi:
1. **`PEMILIK` (Cak Rofi)**:
   * Pemilik usaha. Memegang kendali penuh atas manajemen warung: memesan barang (PO), koreksi stok, mengubah harga master, menambah/mengatur staf, melihat laporan laba/omset dashboard, dan melihat harga modal kulakan.
2. **`STAF` (Udin & Sari)**:
   * Karyawan operasional shift. Hanya bertugas menerima kiriman fisik barang masuk dan melihat sisa stok barang di rak.
   * **DILARANG**: Melihat harga modal kulakan, membuat/menutup pesanan ke supplier, melakukan koreksi stok manual, atau mengubah data master barang/harga.

---

## 2. Tabel Matriks Peran $\times$ Aksi

| No | Modul / Aksi | Pemilik | Staf | Publik (Tanpa Login) | Kode HTTP yang Diharapkan |
| :-: | :--- | :---: | :---: | :---: | :---: |
| 1 | **Lihat Stok & Riwayat Mutasi** | Boleh | Boleh | Ditolak | Pemilik/Staf: `200 OK`<br>Publik: `401 Unauthorized` |
| 2 | **Lihat Harga Modal Barang** | Boleh | **Ditolak (Disaring)** | Ditolak | Pemilik: `200 OK` (ada `purchasePrice`)<br>Staf: `200 OK` (field modal disembunyikan/null)<br>Publik: `401 Unauthorized` |
| 3 | **Terima Barang Masuk (Goods Receipt)** | Boleh | **Boleh (Hanya atas nama sendiri)** | Ditolak | Berhasil: `201 Created`<br>Impersonasi: `403 Forbidden`<br>Publik: `401 Unauthorized` |
| 4 | **Buat / Batalkan Pesanan (PO)** | Boleh | **Ditolak** | Ditolak | Pemilik: `201 / 200`<br>Staf: `403 Forbidden`<br>Publik: `401 Unauthorized` |
| 5 | **Koreksi Stok Manual (`stock-adjustments`)** | Boleh | **Ditolak** | Ditolak | Pemilik: `200 OK`<br>Staf: `403 Forbidden`<br>Publik: `401 Unauthorized` |
| 6 | **Kelola Produk & Harga Jual/Beli** | Boleh | **Ditolak** | Ditolak | Pemilik: `201 / 200 / 204`<br>Staf: `403 Forbidden`<br>Publik: `401 Unauthorized` |
| 7 | **Kelola Supplier & Akun Staf** | Boleh | **Ditolak** | Ditolak | Pemilik: `201 / 200`<br>Staf: `403 Forbidden`<br>Publik: `401 Unauthorized` |
| 8 | **Lihat Dashboard Finansial / Omset** | Boleh | **Ditolak** | Ditolak | Pemilik: `200 OK`<br>Staf: `403 Forbidden`<br>Publik: `401 Unauthorized` |

---

## 3. Tiga Aturan Khusus (*Special Security Rules*)

### Aturan 1: *Penerima Barang Terikat Sesi Login (Anti-Impersonasi)*
* **Masalah**: Pada Sesi 2, `POST /api/goods-receipts` menerima `receivedById` langsung dari body JSON. Udin bisa memilih nama Sari, atau penyerang bisa memasukkan ID staf palsu.
* **Aturan Keras**:
  * Nilai `receivedById` **wajib diambil dari token sesi pengguna yang sedang login** (`req.user.id`).
  * Jika body request menyertakan `receivedById` yang berbeda dengan pengguna yang sedang login, server **wajib menolak dengan status HTTP 403 Forbidden** (*"Tidak dapat menerima barang atas nama staf lain"*).

### Aturan 2: *Penyaringan Harga Modal (Data-Level Masking)*
* **Masalah**: Cak Rofi menegaskan: *"Harga modal jangan sampai kelihatan karyawan"*.
* **Aturan Keras**:
  * Pada endpoint `GET /api/products` dan `GET /api/products/:id`: Jika yang login adalah role `STAF`, field `purchasePrice` wajib dihapus (*omitted*) dari response JSON.
  * Pada endpoint `GET /api/goods-receipts` dan `GET /api/goods-receipts/:id`: Field `unitCostPerPurchaseUnit`, `costPerBaseUnit`, dan `effectiveCostPerBaseUnit` wajib disembunyikan untuk role `STAF`.

### Aturan 3: *Deny by Default & Autentikasi Terpusat*
* **Aturan Keras**:
  * Semua endpoint secara bawaan berstatus **tertutup rapat**, kecuali secara eksplisit dideklarasikan sebagai rute publik (seperti `POST /api/auth/login` dan `GET /api/health`).
  * Menghilangkan tombol di antarmuka frontend (React) **bukanlah keamanan**. Seluruh otorisasi ditegakkan secara mutlak di lapisan *middleware Express*.

---

## 4. Kritik & Penyempurnaan Keamanan (Evaluasi Ide Teknis)

1. **Password Wajib Salted One-Way Hash (Bukan Enkripsi 2 Arah)**:
   * *Kritik*: Jangan menggunakan enkripsi bolak-balik (*reversible encryption*) untuk password karena jika kunci rahasia (*secret key*) bocor, semua password terbongkar.
   * *Standar*: Gunakan algoritma *cryptographic hashing* satu arah dengan salt otomatis seperti **`bcrypt`** (work factor 10) atau **`argon2`**. Bahkan pemilik database tidak bisa melihat password asli.
2. **Proteksi Brute Force (Rate Limiting)**:
   * Tambahkan batas percobaan login (misal: maksimal 5 kali gagal dalam 15 menit per alamat IP) untuk mencegah penyerangan tebak PIN/password secara otomatis.
3. **Pembersihan Respon Error**:
   * Jangan mengembalikan *stack trace* atau error mentah dari PostgreSQL/Prisma ke browser. Klien hanya menerima pesan umum yang aman, sedangkan detail error dicatat di log server.

---

## 5. Rencana Skenario Uji Serangan (*Attacker Test Cases*)

Sebelum kode dianggap aman, AI wajib menyerang sistem dengan skenario berikut:
* **Serangan 1 (Tanpa Kredensial)**: Tembak `POST /api/stock-adjustments` tanpa token $\rightarrow$ Harus `401 Unauthorized`.
* **Serangan 2 (Eskalasi Hak Akses Staf)**: Login sebagai Udin (`STAF`), lalu tembak `POST /api/products` untuk ubah harga $\rightarrow$ Harus `403 Forbidden`.
* **Serangan 3 (Pencurian Informasi Modal)**: Login sebagai Sari (`STAF`), panggil `GET /api/products` $\rightarrow$ Pastikan JSON tidak mengandung properti `purchasePrice`.
* **Serangan 4 (Pemalsuan Identitas)**: Login sebagai Udin (`STAF`), tembak `POST /api/goods-receipts` dengan body `receivedById: <id_milik_sari>` $\rightarrow$ Harus ditolak `403 Forbidden` atau otomatis ditimpa dengan ID Udin.
* **Serangan 5 (Pembatalan Pesanan Ilegal)**: Login sebagai Udin, tembak `POST /api/purchase-orders/:id/cancel-remaining` $\rightarrow$ Harus `403 Forbidden`.
