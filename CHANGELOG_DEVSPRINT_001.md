# Dokumentasi Perubahan: Support Product Deactivation (Ticket DEVSPRINT-001)

Dokumen ini merangkum seluruh perubahan teknis, arsitektur, dan alur implementasi fitur **Product Deactivation** pada aplikasi **Warung Madura Stock Manager**.

---

## 1. Latar Belakang Masalah & Kebutuhan Bisnis

Sebelumnya, aplikasi hanya menyediakan mekanisme **Hard Delete** (`DELETE /api/products/:id`) untuk menghapus produk. Namun terdapat kendala:
- Ketika sebuah produk telah memiliki riwayat transaksi penjualan (`SaleItem`) atau mutasi stok (`StockMovement`), penghapusan produk diblokir oleh foreign key PostgreSQL (`ON DELETE RESTRICT`) dan API mengembalikan respon `409 Conflict`.
- Dalam skenario nyata di warung, pemilik sering kali berhenti menjual suatu barang (discontinue/habis masa edar), tetapi data transaksi lama barang tersebut tetap wajib tersimpan untuk pelaporan keuangan dan audit stok.

Oleh karena itu, diimplementasikan fitur **Soft Deactivation (Deaktivasi Produk)** agar pemilik warung dapat menonaktifkan produk tanpa menghilangkan data historisnya.

---

## 2. Pemenuhan Acceptance Criteria (Ticket DEVSPRINT-001)

| Acceptance Criteria | Status | Penjelasan & Implementasi |
| :--- | :---: | :--- |
| **Owner can deactivate product** | Terpenuhi | Pemilik dapat menonaktifkan produk melalui tombol **"Nonaktifkan"** di tabel produk (disertai dialog konfirmasi), atau mengaktifkannya kembali dengan tombol **"Aktifkan"** dan melalui form edit produk. |
| **Inactive product remains stored** | Terpenuhi | Kolom `isActive BOOLEAN NOT NULL DEFAULT true` ditambahkan pada tabel `Product`. Data produk tidak dihapus dari PostgreSQL saat dinonaktifkan. |
| **History still shows old product** | Terpenuhi | Detail penjualan masa lalu (`SaleDetailPage`), daftar penjualan (`SalesHistoryPage`), dan mutasi stok (`StockHistoryPage`) tetap menampilkan nama dan SKU produk yang dinonaktifkan secara utuh melalui relasi database yang tetap valid. |
| **Inactive product not sellable** | Terpenuhi | Pada halaman **Penjualan Baru** (`NewSalePage`), produk nonaktif disaring keluar (`activeOnly=true`). Di backend (`createSale`), request transaksi yang memuat produk nonaktif langsung ditolak dengan status `409 Conflict`. |
| **Product list shows status** | Terpenuhi | Tabel produk di `ProductsPage` memiliki kolom **Status** dengan badge visual (`Aktif` berwarna hijau, `Nonaktif` berwarna abu-abu). |
| **Existing sales still works** | Terpenuhi | Seluruh data transaksi penjualan yang sudah ada, pembuatan transaksi baru untuk produk aktif, serta alur invoice tetap berjalan normal tanpa gangguan. |

---

## 3. Detail Perubahan Teknis per Layer

### A. Database Layer (PostgreSQL & Prisma)
- **File**: `server/prisma/schema.prisma`
  - Menambahkan kolom `isActive Boolean @default(true)` pada model `Product`.
- **Migrasi Database**:
  - Dibuat migrasi Prisma: `server/prisma/migrations/20261007140557_add_product_deactivation/migration.sql`
  ```sql
  -- AlterTable
  ALTER TABLE "Product" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
  ```
  - Semua produk lama secara otomatis mendapatkan status default `isActive = true`.

### B. Backend Layer (Express, TypeScript, Zod, Services)
1. **Data Transfer Object (`server/src/types/dto.ts`)**:
   - Memperbarui interface `ProductDto` dengan menambahkan properti `isActive: boolean`.
2. **Validasi Input (`server/src/validators/product.validator.ts`)**:
   - `createProductSchema`: Menambahkan field `isActive: z.boolean().default(true)`.
   - `updateProductSchema`: Mendukung pengubahan status `isActive` secara opsional.
   - `listProductsQuerySchema`: Menambahkan opsi query `activeOnly: boolean` untuk memfilter produk aktif.
3. **Service Produk (`server/src/services/product.service.ts`)**:
   - `toProductDto`: Memetakan field `isActive` dari model Prisma ke DTO.
   - `listProducts`: Menambahkan filter `where.isActive = true` bila parameter `activeOnly` bernilai `true`.
   - `createProduct`: Mendukung penyimpanan field `isActive`.
   - `updateProduct`: Mendukung perubahan status aktif/nonaktif melalui `PATCH /api/products/:id`.
4. **Service Penjualan (`server/src/services/sale.service.ts`)**:
   - Pada fungsi transaksi `createSale`, ditambahkan validasi bisnis:
     ```typescript
     if (!product.isActive) {
       inactiveProducts.push(product.name);
       continue;
     }
     ```
     Jika terdapat produk yang nonaktif di dalam keranjang, transaksi dibatalkan dan API melempar `ConflictError` (`409 Conflict`) dengan pesan informatif.
5. **Service Dashboard (`server/src/services/dashboard.service.ts`)**:
   - Peringatan stok menipis (`lowStockWhere`) disesuaikan agar hanya memperhitungkan produk yang berstatus aktif (`isActive: true`), sehingga pemilik tidak mendapat notifikasi restock untuk barang yang sudah dinonaktifkan.

### C. Frontend Layer (React 19, TypeScript, Tailwind CSS)
1. **Tipe Data Client (`client/src/types/api.ts`)**:
   - Menambahkan properti `isActive: boolean` ke interface `Product`.
   - Menambahkan properti `isActive?: boolean` ke interface `ProductInput`.
2. **API Client (`client/src/api/products.ts`)**:
   - Menambahkan opsi `activeOnly?: boolean` pada `ListProductsParams` dan menyertakannya ke query URL saat dipanggil.
3. **Halaman Kelola Produk (`client/src/pages/ProductsPage.tsx`)**:
   - Menambahkan kolom header **Status** pada tabel produk.
   - Menampilkan badge visual status:
     - **Aktif**: badge hijau (`bg-emerald-50 text-emerald-700`).
     - **Nonaktif**: badge abu-abu (`bg-slate-100 text-slate-600`).
   - Menambahkan tombol aksi kontekstual:
     - Jika produk aktif: tombol **Nonaktifkan** (membuka modal dialog konfirmasi).
     - Jika produk nonaktif: tombol **Aktifkan** (mengaktifkan kembali produk).
   - Dialog konfirmasi (`ConfirmDialog`) menjelaskan dampak penonaktifan produk sebelum aksi dieksekusi.
4. **Modal Form Produk (`client/src/components/ProductFormModal.tsx`)**:
   - Menambahkan input pilihan dropdown **Status Produk** (*Aktif / Nonaktif*) saat membuat atau mengubah produk.
5. **Halaman Penjualan Baru (`client/src/pages/NewSalePage.tsx`)**:
   - Mengubah query pengambilan produk:
     ```typescript
     const loadProducts = useCallback(
       () => listProducts({ inStock: true, activeOnly: true }),
       [],
     );
     ```
     Produk yang nonaktif otomatis tidak akan muncul di daftar pilihan kasir.

---

## 4. Ringkasan File yang Diubah

| File | Kategori | Ringkasan Perubahan |
| :--- | :--- | :--- |
| `server/prisma/schema.prisma` | Database | Penambahan field `isActive Boolean @default(true)`. |
| `server/prisma/migrations/20261007140557_add_product_deactivation/migration.sql` | Database | Skrip SQL migrasi untuk alter table. |
| `server/src/types/dto.ts` | Backend Type | Penambahan `isActive` pada `ProductDto`. |
| `server/src/validators/product.validator.ts` | Backend Validator | Validasi `isActive` & filter `activeOnly`. |
| `server/src/services/product.service.ts` | Backend Service | Mapping DTO, filter aktif, create & update status. |
| `server/src/services/sale.service.ts` | Backend Service | Validasi penolakan penjualan produk nonaktif. |
| `server/src/services/dashboard.service.ts` | Backend Service | Peringatan stok menipis hanya untuk produk aktif. |
| `client/src/types/api.ts` | Frontend Type | Penambahan `isActive` pada tipe data `Product`. |
| `client/src/api/products.ts` | Frontend API | Penambahan parameter `activeOnly` pada pemanggilan API. |
| `client/src/pages/ProductsPage.tsx` | Frontend UI | Kolom status, badge visual, tombol aksi, modal konfirmasi. |
| `client/src/components/ProductFormModal.tsx` | Frontend UI | Dropdown status pada modal tambah/ubah produk. |
| `client/src/pages/NewSalePage.tsx` | Frontend UI | Filter produk aktif pada halaman transaksi baru. |

---

## 5. Hasil Pengujian & Verifikasi

1. **TypeScript Typecheck**:
   - `npm run typecheck`: Lulus 100% tanpa kesalahan tipe pada `server` maupun `client`.
2. **Linting**:
   - `npm run lint`: Bersih, tidak ada issue ESLint.
3. **Build Bundler**:
   - `npm run build`: Berhasil mengompilasi backend ke `server/dist` dan frontend ke `client/dist`.
4. **Pengujian Fungsional API**:
   - Penonaktifan produk via `PATCH /api/products/:id` berhasil mengubah `isActive` menjadi `false`.
   - Endpoint `GET /api/products?inStock=true&activeOnly=true` terverifikasi tidak memunculkan produk nonaktif.
   - Upaya penjualan produk nonaktif via `POST /api/sales` berhasil ditolak dengan respon `409 Conflict`.
   - Detail riwayat penjualan lama dan riwayat mutasi stok terbukti tetap menampilkan informasi produk lama secara akurat.
   - Pengaktifan kembali produk berfungsi dengan normal.
