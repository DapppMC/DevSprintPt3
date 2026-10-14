# Laporan Review & Audit Mandiri (Tahap 5)
**Project**: Warung Madura Stock Manager  
**Fitur**: Barang Masuk & Rekonsiliasi Pesanan (Cak Rofi - "Berkah 24 Jam")  
**Tanggal**: 2026-10-10  

---

## 1. Tabel Keputusan Bisnis & Arsitektur

| # | Keputusan | Sumber (Jawaban Klien / Default / Asumsi AI) | Lokasi Implementasi di Kode |
|---|---|---|---|
| 1 | **Satuan Dasar sebagai Single Source of Truth**: Semua stok fisik, pergerakan, dan pemenuhan disimpan dalam baseUnit (bungkus, sachet, botol). Dus/renteng/bal hanya untuk input dan tampilan UI. | Invariant 2.4 #1 & Default Q13 | `schema.prisma` (`orderedBase`, `fulfilledBase`, `receivedBase`, `rejectedBase`, `bonusBase`), `goods-receipt.service.ts`, `purchase-order.service.ts`. |
| 2 | **Pesanan Pembelian (PO) Bersifat Opsional**: Cak Rofi dapat mencatat barang masuk langsung tanpa PO (mis. beli tunai langsung di pasar/grosir). | Default Q1 (A1) | `GoodsReceipt.purchaseOrderId` bersifat nullable di `schema.prisma`, `goods-receipt.validator.ts`, dan S12 test. |
| 3 | **Pencegahan Kelebihan Penerimaan (Over-fulfillment)**: Datang melebihi sisa PO ditolak (HTTP 409). Kelebihan fisik di luar pesanan harus dicatat sebagai bonus. | Default Q2 (A2) | `goods-receipt.service.ts` baris validasi sisa pesanan, S3 test. |
| 4 | **Perhitungan Modal Bersih vs Efektif**: Modal utama (`costPerBaseUnit`) dihitung dari harga beli dibagi isi satuan beli. Modal rata-rata setelah bonus (`effectiveCostPerBaseUnit`) dihitung terpisah menggunakan Decimal 4 angka di belakang koma. | Default Q3 (A3) | `goods-receipt.service.ts` (`Prisma.Decimal` ROUND_HALF_UP 4 desimal), `schema.prisma`, S4 & S8 test. |
| 5 | **Barang Ditolak Tetap Menjadi Sisa Pesanan**: Barang yang ditolak (mis. rusak/penyok) tidak mengurangi sisa pesanan, sehingga supplier masih berhutang barang tersebut sampai dikirim ulang atau dibatalkan. | Default Q4 (A4) | `goods-receipt.service.ts` (`netReceived = receivedBase - rejectedBase`; hanya `netReceived` yang menambah `fulfilledBase`), S5 test. |
| 6 | **Pembatalan Sisa Pesanan Secara Eksplisit**: Pembatalan sisa dilakukan manual dengan mencantumkan alasan wajib (`cancelReason`). Setelah dibatalkan, status PO ditutup dan tidak dapat menerima barang susulan. | Default Q5 (A5) | `purchase-order.service.ts` (`cancelRemaining`), `purchase-order.validator.ts`, S13 test. |
| 7 | **Immutability Dokumen Penerimaan**: Penerimaan yang telah tersimpan tidak dapat diedit atau dihapus. Kesalahan diselesaikan melalui Penyesuaian Stok bertipe koreksi. | Default Q6 (A6) | Tidak ada route PUT/DELETE untuk `GoodsReceipt`, S15-S16 test. |
| 8 | **Staff Penerima Tanpa Login / Multi-tenant**: Staff dipilih dari master data aktif (Udin, Sari, Cak Rofi) tanpa otentikasi kata sandi. | Default Q7 (A7) | `GoodsReceipt.receivedById` foreign key ke `Staff`, `goods-receipt.validator.ts`, S11 test. |
| 9 | **Snapshot Harga Mandiri**: Harga beli pada penerimaan tidak mengubah master `Product.purchasePrice` secara otomatis, dan perubahan harga produk master tidak memengaruhi dokumen masa lalu. | Default Q8 (A8) | `GoodsReceiptLine` menyimpan snapshot `unitCostPerPurchaseUnit` dan `costPerBaseUnit`, S7 test. |
| 10 | **Satu Rasio Konversi per Produk**: Setiap produk hanya memiliki satu satuan beli dan satu faktor pengali (`unitsPerPurchaseUnit`). | Default Q9 (A9) | Kolom `purchaseUnit` dan `unitsPerPurchaseUnit` pada model `Product`. |
| 11 | **Alasan Penyesuaian Stok Wajib**: Endpoint `/api/stock-adjustments` mewajibkan enum alasan (`HITUNG_ULANG`, `RUSAK`, `KEDALUWARSA`, `HILANG`, `LAINNYA`). Jika `LAINNYA`, catatan (`note`) wajib diisi. | Default Q11 (A11) | `stock.validator.ts`, `stock.service.ts`, `StockAdjustmentModal.tsx`, S16 test. |
| 12 | **Proteksi Produk Nonaktif**: Produk nonaktif tidak boleh dipesan lewat PO maupun diterima lewat GR. | Default Q12 (A12) | `purchase-order.service.ts`, `goods-receipt.service.ts`, S18 test. |
| 13 | **Proteksi Hard-Delete**: Produk yang pernah memiliki riwayat pesanan (`PurchaseOrderLine`) atau penerimaan (`GoodsReceiptLine`) diblokir dari hard delete (HTTP 409). | Invariant & Arsitektur | `product.service.ts` (`deleteProduct`), S20 test. |

---

## 2. Audit Mandiri Terhadap Daftar Jebakan (Section 2.11 progres.md)

| Jebakan | Status Audit | Bukti & Pengujian |
|---|---|---|
| **1. Menyimpan stok dalam dus, atau menyimpan jumlah dalam dus lalu mengalikan saat baca.** | **Aman** | Dibuktikan oleh **S1, S2, S4, S17**. Kolom `Product.stock` dan seluruh movement murni integer satuan dasar (mis. 2 renteng kopi langsung tersimpan sebagai 20 sachet di database). |
| **2. Menghitung modal dari `Product.purchasePrice` saat ini (bukan snapshot), atau memakai float.** | **Aman** | Dibuktikan oleh **S4, S7, S8**. Menggunakan `Prisma.Decimal` dengan presisi (14, 4). Harga disimpan langsung di `GoodsReceiptLine`. Perubahan harga di tabel Product terbukti tidak mengubah snapshot penerimaan lama (S7). |
| **3. Idempotency berdasar isi, bukan kunci; tidak menangani P2002 saat dua request dengan kunci sama bersamaan.** | **Aman** | Dibuktikan oleh **S9 & S10**. Idempotency murni menggunakan `idempotencyKey` unik di DB. Error Prisma `P2002` saat race condition ditangkap via `try-catch`, kemudian me-reload dokumen yang berhasil dibuat dan mengembalikan status HTTP 200. Request dengan isi sama persis namun kunci beda tetap diterima sebagai 2 penerimaan sah (S10). |
| **4. Bonus ikut memenuhi pesanan (atau dianggap "lebih dari pesanan").** | **Aman** | Dibuktikan oleh **S4**. Rumus pemenuhan PO hanya menghitung `netReceived = receivedBase - rejectedBase`. Bonus menambah stok fisik warung tetapi `fulfilledBase` PO tetap 400 dari 400. |
| **5. Membuat `StockMovement` quantity 0 → melanggar CHECK.** | **Aman** | Dibuktikan oleh **S6**. Jika semua barang ditolak dan bonus 0 (`netStockIncrease == 0`), transaksi menyimpan dokumen `GoodsReceipt` tetapi sengaja melewatkan pembuatan baris `StockMovement` dan update stok produk. Terverifikasi tidak ada movement 0. |
| **6. Cek sisa pesanan tanpa lock → race S14.** | **Aman** | Dibuktikan oleh **S14**. Di awal transaksi penerimaan terhadap PO, baris `PurchaseOrderLine` dikunci menggunakan `SELECT "id" FROM "PurchaseOrderLine" WHERE "purchaseOrderId" = $1::uuid FOR UPDATE;` via `tx.$queryRaw`. Pengujian paralel konkuren 2 x 3 dus pada sisa 5 dus membuktikan tepat 1 request berhasil dan 1 request 409. |
| **7. Memakai nilai enum baru di migration yang sama saat `ADD VALUE`.** | **Aman** | Dibuktikan oleh migration `20261010064555_add_goods_receiving`. CHECK constraint manual tidak menggunakan value enum baru di dalam query DDL transaksi yang sama, sehingga aman dari batasan transactional DDL PostgreSQL. |
| **8. Lupa backfill kolom satuan untuk produk lama; lupa mengubah seed `clearDatabase` (FK).** | **Aman** | Dibuktikan oleh migration SQL yang memiliki default `'pcs'`, `'pcs'`, `1` dan seed `clearDatabase` yang menghapus data tabel anak (`GoodsReceiptLine`, `PurchaseOrderLine`, `GoodsReceipt`, `PurchaseOrder`, `Supplier`, `Staff`) dalam urutan reverse FK sebelum menghapus tabel induk. |
| **9. Mengubah kontrak `/api/stock-adjustments` tanpa mengubah `StockAdjustmentModal`.** | **Aman** | Dibuktikan oleh pengujian antarmuka dan S16. `StockAdjustmentModal.tsx` telah disinkronkan dengan dropdown alasan dan catatan kondisional wajib jika alasan `LAINNYA`. |
| **10. Mengubah `dto.ts` tanpa `client/src/types/api.ts`.** | **Aman** | Dibuktikan oleh kelulusan `npm run typecheck` di kedua workspace (server dan client). Seluruh interface DTO (`PurchaseOrder*`, `GoodsReceipt*`, `Supplier`, `Staff`, `Product`) identik dan selaras. |
| **11. Menjalankan test/seed pada database berisi data asli.** | **Aman** | Dibuktikan oleh guard `assertTestDatabase()` di `db-helper.ts`. Jika `DATABASE_URL` tidak berakhiran `_test`, helper langsung melempar error keras (throw) sebelum operasi DB apa pun dijalankan. |

---

## 3. Catatan Kejujuran: Bug yang Ditemukan di Tengah Jalan & Keraguan

1. **PowerShell Variable Interpolation saat Regex Script**:
   - *Masalah*: Saat mencoba update script menggunakan PowerShell inline `-replace`, karakter `$1` di string pengganti dievaluasi oleh PowerShell sebagai variabel lokal kosong sehingga menghapus teks target.
   - *Solusi*: Menggunakan tool resmi `replace_file_content` dan file Node CJS terisolasi.
2. **ESLint no-explicit-any pada E2E API Test**:
   - *Masalah*: Deklarasi `let json: any = null;` pada helper fetch API memicu pelanggaran aturan `@typescript-eslint/no-explicit-any`.
   - *Solusi*: Mengganti tipe dengan interface `JsonRecord = { [key: string]: unknown; [key: number]: unknown; }` yang aman dan lolos linting tanpa menonaktifkan aturan.
3. **HTTP Status Code pada DELETE Product**:
   - *Masalah*: E2E test awalnya mengharapkan HTTP 200 untuk penghapusan produk tanpa transaksi, padahal kontrak router Express lama mengembalikan HTTP 204 No Content.
   - *Solusi*: E2E test disesuaikan dengan kontrak RESTful asli (HTTP 204), menjaga integritas perilaku fitur lama tanpa regresi.
4. **Penanganan Idempotency Key Replay**:
   - *Keraguan*: Ketika klien mengirim request replay dengan idempotency key yang sama, Express route mengembalikan status HTTP 200 (sedangkan pembuatan baru mengembalikan 201). Helper service `createGoodsReceipt` mengembalikan flag `isReplay: boolean` sehingga controller Express dapat membedakan status code secara akurat.

---

## 4. Batasan yang Diketahui & Hal yang Sengaja Out-of-Scope (Sesuai Bagian 2.6)

1. **Multi-satuan bertingkat (mis. dus -> pak -> renteng -> sachet)**: Sengaja tidak dibuat; produk hanya memiliki relasi linier 1 satuan beli ke satuan dasar.
2. **Klaim retur supplier / Piutang retur**: Barang ditolak hanya dicatat kuantitas dan alasannya sebagai pengurang barang masuk; tidak ada pencatatan akuntansi retur uang/klaim ke supplier.
3. **Penerimaan parsial antar batch kedaluwarsa (Batch/Lot & Expired Date tracking)**: Tidak ada pelacakan nomor batch atau tanggal kedaluwarsa per unit individual.
4. **Authentication & Role-Based Access Control**: Pemilihan staff penerima (Udin/Sari) dilakukan via dropdown terbuka tanpa password atau session token sesuai sifat warung offline Cak Rofi.
5. **Pencetakan Surat Jalan / Label Barcode**: Tidak ada integrasi printer barcode atau cetak PDF surat jalan.
