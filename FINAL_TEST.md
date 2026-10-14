# Hasil Pengujian Akhir (Final Test Report)
**Project**: Warung Madura Stock Manager  
**Fitur**: Barang Masuk (Goods Receiving & Order Reconciliation)  
**Lingkungan Uji**: Database `warung_madura_test` (bersih + seed), Vitest v5.0.3, Node.js v22  
**Hasil Keseluruhan**: **20 / 20 PASS (100%)**

---

## 1. Tabel Ringkasan Skenario Uji S1 - S20

| ID | Langkah / Request | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|:---:|
| **S1** | **Konversi**: Buat PO 2 renteng Kopi Sachet (1 renteng = 10 sachet); terima 2 renteng (20 sachet) via `POST /api/goods-receipts`. | Stok kopi bertambah +20 sachet; tercatat StockMovement jenis `RECEIPT` berkuantitas 20; PO terpenuhi. | Stok Kopi menjadi 20 sachet; StockMovement tipe `RECEIPT` dibuat dengan quantity 20, beforeStock=0, afterStock=20; referenceLabel=`GR-YYYYMMDD-NNNN`. | **PASS** |
| **S2** | **Parsial**: Buat PO 5 dus Indomie (200 bks). Kirim penerimaan 1: 3 dus (120 bks). Kirim penerimaan 2: 2 dus (80 bks). | Stok +120 lalu +80 (total +200); sisa pesanan 80 lalu 0; status PO berubah OPEN -> PARTIAL -> COMPLETE; kedua penerimaan terhubung ke PO yang sama. | Stok bertambah 120 lalu 200; PO status OPEN saat dibuat, PARTIAL setelah terima 120 (sisa 80), COMPLETE setelah terima 80 (sisa 0); kedua GoodsReceipt memiliki `purchaseOrderId` yang sama. | **PASS** |
| **S3** | **Lebih dari sisa**: PO 5 dus Indomie (200 bks). Coba kirim penerimaan 6 dus (240 bks). | HTTP 409 Conflict; transaksi dibatalkan; stok dan sisa PO tidak berubah. | API mengembalikan HTTP 409 dengan pesan `Jumlah diterima bersih (240) melebihi sisa pesanan (200)`; stok tetap 0; remainingBase PO tetap 200. | **PASS** |
| **S4** | **Bonus**: PO 10 dus Indomie (400 bks). Kirim penerimaan 10 dus (400 bks) + bonus 1 dus (40 bks) dengan harga Rp112.000/dus. | Stok +440; pemenuhan PO hanya 400 (bonus tidak memotong PO); costPerBase Rp2.800,0000; effectiveCostPerBase Rp2.545,4545. | Stok Indomie menjadi 440; PO berstatus COMPLETE (fulfilledBase=400); baris penerimaan mencatat costPerBase=2800.0000 dan effectiveCostPerBase=2545.4545. | **PASS** |
| **S5** | **Ditolak**: PO 3 dus Aqua 600 ml (72 botol). Kirim penerimaan: fisik datang 72 botol, ditolak 24 botol dengan alasan `PENYOK`. | Stok bertambah +48 botol; pemenuhan PO hanya 48; sisa PO tetap 24; alasan dan catatan reject tersimpan; status PO PARTIAL. | Stok Aqua menjadi 48 botol; PO line mencatat fulfilledBase=48, remainingBase=24; status PO PARTIAL; baris GR mencatat rejectedBase=24, rejectReason='PENYOK'. | **PASS** |
| **S6** | **Semua Ditolak**: Kirim penerimaan 24 botol Aqua, ditolak 24 botol (`KEDALUWARSA`), bonus 0. | Penerimaan tersimpan; TIDAK ADA StockMovement yang dibuat (karena qty masuk 0); stok produk tidak berubah (tetap 0). | Dokumen GoodsReceipt tersimpan (HTTP 201); query ke tabel StockMovement untuk produk dan GR tersebut menghasilkan 0 baris; stok produk tetap 0. | **PASS** |
| **S7** | **Snapshot Harga**: Terima Indomie Senin harga Rp112.000/dus (Rp2.800/bks). Terima Kamis harga Rp118.000/dus (Rp2.950/bks). Ubah harga master produk jadi Rp3.500/bks. | Snapshot harga pada dokumen Senin dan Kamis tidak berubah; perubahan harga master tidak mengubah riwayat penerimaan masa lalu. | Penerimaan Senin tetap costPerBase=2800.0000; penerimaan Kamis tetap costPerBase=2950.0000; getGoodsReceipt setelah master diubah tetap mengembalikan snapshot awal. | **PASS** |
| **S8** | **Pembulatan 4 Desimal**: Terima 1 dus Aqua (24 botol) dengan harga beli Rp55.000/dus. | costPerBase tersimpan tepat 2.291,6667 (Decimal 4 angka di belakang koma), bukan float JS yang terdistorsi biner. | Database dan API mengembalikan costPerBase=2291.6667; dihitung via `Prisma.Decimal` dengan pembulatan ROUND_HALF_UP. | **PASS** |
| **S9** | **Klik Ganda / Idempotency**: Kirim 2 request penerimaan dengan `idempotencyKey` yang sama secara bersamaan (paralel). | Hanya 1 penerimaan yang dibuat di database; stok hanya bertambah 1x; kedua request menerima HTTP 200/201 dengan payload data yang sama. | Satu transaksi berhasil (HTTP 201) dan request konkuren menangkap P2002 lalu mengembalikan data yang sama (HTTP 200); ID dokumen identik; stok hanya bertambah 10. | **PASS** |
| **S10** | **Dua Kiriman Sah**: Kirim 2 penerimaan Gula 1 kg dengan data identik (masing-masing 20 bks), namun dengan `idempotencyKey` berbeda. | Keduanya tersimpan sebagai 2 dokumen berbeda; stok bertambah 2x (+40 bks). | Dua dokumen GR dibuat dengan receiptNumber berbeda; stok Gula bertambah dari 0 menjadi 40 bks. | **PASS** |
| **S11** | **Validasi Penerima**: Kirim tanpa `receivedById`, atau dengan staff berstatus nonaktif (`isActive: false`), atau staff id fiktif. | HTTP 400 (jika kosong) / HTTP 409 (jika nonaktif) / HTTP 404 (jika tidak ditemukan); detail penerimaan yang sah menampilkan nama staff penerima. | Missing staff -> HTTP 400; staff nonaktif -> HTTP 409 `Staff penerima tidak aktif`; staff fiktif -> HTTP 404; GR valid menampilkan `receivedByName: "Udin"`. | **PASS** |
| **S12** | **Tanpa Pesanan (Langsung)**: Kirim penerimaan tanpa `purchaseOrderId` (pembelian langsung di grosir). | Dokumen GR tersimpan; stok bertambah; `purchaseOrderId` bernilai null; tidak melibatkan PO. | HTTP 201; dokumen GR tersimpan dengan `purchaseOrderId: null`; stok kopi bertambah +30 sachet. | **PASS** |
| **S13** | **Batalkan Sisa Pesanan**: PO 5 dus mie (200 bks). Terima 3 dus (120 bks). Panggil `POST /api/purchase-orders/:id/cancel-remaining`. | Sisa PO menjadi 0; `cancelledBase`=80; status PO menjadi COMPLETE; penerimaan berikutnya ke PO tersebut ditolak (HTTP 409). Jika PO belum pernah diterima lalu dicancel, status menjadi CANCELLED. | Status PO berubah menjadi COMPLETE; remainingBase=0; cancelledBase=80; request GR susulan menghasilkan HTTP 409; cancel pada PO baru tanpa GR menghasilkan status CANCELLED. | **PASS** |
| **S14** | **Race Concurrency PO**: 2 request penerimaan paralel masing-masing 3 dus (120 bks) pada PO yang tersisa 5 dus (200 bks). | Tepat satu request berhasil (HTTP 201) dan satu request ditolak (HTTP 409); `fulfilledBase` tidak pernah melebihi `orderedBase`. | Lewat row lock `SELECT ... FOR UPDATE`, satu request berhasil (stok +120, sisa 80) dan request kedua ditolak HTTP 409 karena sisa tidak cukup; total fulfilledBase=120 <= 200. | **PASS** |
| **S15** | **Koreksi Stok Melebihi Stok**: Produk Kopi stok 0. Kirim penyesuaian stok keluar (`type: "OUT"`, `quantity: 10`, `reason: "HILANG"`). | HTTP 409 Conflict; stok tidak boleh menjadi negatif. | API mengembalikan HTTP 409 dengan pesan `Stok tidak mencukupi untuk penyesuaian keluar.`; stok Kopi tetap 0. | **PASS** |
| **S16** | **Validasi Alasan Koreksi**: Kirim koreksi stok tanpa `reason`, atau dengan `reason: "LAINNYA"` tanpa catatan (`note`). | HTTP 400 Bad Request; validasi Zod menolak request. | Tanpa reason -> HTTP 400 `Alasan penyesuaian wajib diisi`; reason LAINNYA tanpa note -> HTTP 400 `Catatan wajib diisi jika alasan adalah LAINNYA`. | **PASS** |
| **S17** | **Sisa Stok & Multi-Satuan**: Terima 2 renteng Kopi (20 sachet). Lakukan penjualan 5 sachet via `POST /api/sales`. | Sisa stok produk menjadi 15 sachet; di UI/API ditampilkan dengan label satuan dasar "sachet". | Stok Kopi tersisa 15; baseUnit tersimpan "sachet"; UI menampilkan `15 sachet`. | **PASS** |
| **S18** | **Produk Nonaktif**: Nonaktifkan Indomie (`isActive: false`). Coba buat PO atau buat GR untuk produk tersebut. | HTTP 409 Conflict dengan pesan jelas bahwa produk nonaktif tidak dapat dipesan atau diterima. | Buat PO ditolak HTTP 409 `Produk Indomie Goreng tidak aktif.`; buat GR ditolak HTTP 409 `Produk Indomie Goreng tidak aktif.`. | **PASS** |
| **S19** | **Riwayat Stok**: Cek daftar pergerakan stok (`GET /api/stock-movements`) setelah penerimaan barang. | Tipe `RECEIPT` muncul dengan label nomor penerimaan `GR-YYYYMMDD-NNNN` pada kolom referensi/catatan. | Movement memiliki `type: "RECEIPT"`, `referenceType: "GOODS_RECEIPT"`, dan `referenceLabel` otomatis terisi nomor dokumen GR yang bersangkutan. | **PASS** |
| **S20** | **Regresi Fitur Lama**: Buat penjualan baru, cek penomoran invoice, uji proteksi penghapusan produk berriwayat transaksi vs produk baru. | Fitur lama berjalan normal: nomor invoice berformat `INV-YYYYMMDD-NNNN`; produk berriwayat tidak bisa di-delete (HTTP 409); produk baru bersih dapat di-delete (HTTP 204). | Penjualan menghasilkan invoice `INV-20261010-0001`; DELETE produk berriwayat menghasilkan HTTP 409; DELETE produk baru tanpa transaksi menghasilkan HTTP 204. | **PASS** |

---

## 2. Hasil Verifikasi Otomatis

1. **Typecheck**:
   ```
   npm run typecheck
   > server@1.0.0 typecheck: tsc --noEmit (PASS)
   > client@1.0.0 typecheck: tsc --noEmit (PASS)
   ```
2. **Linter**:
   ```
   npm run lint
   > ESLint: No issues found (PASS)
   ```
3. **Build**:
   ```
   npm run build
   > server@1.0.0 build: tsc -p tsconfig.build.json (PASS)
   > client@1.0.0 build: vite build (PASS, dist generated)
   ```
4. **Unit & Integration Test Suite**:
   ```
   npm test
   > test/scenarios.test.ts (20 tests passed)
   > test/e2e-api.test.ts (20 tests passed)
   Total: 40 tests passed across 2 test suites (PASS)
   ```
