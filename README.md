# 🏪 Warung Madura Stock & Security Manager (Student 2)
### DevSprint Multi-Tenant Container Lab on GCP Cloud Run & Supabase

Aplikasi manajemen inventaris, penerimaan barang (*goods receiving*), penjualan, dan pengamanan hak akses berbasis peran (*Role-Based Access Control* & *Dynamic Role Permission Manager*) untuk Warung Madura "Berkah 24 Jam" milik Cak Rofi.

---

## 🏗️ Architecture & Cloud Run Mapping

* **Branch:** `student2`
* **Cloud Run Service:** `app-student2`
* **Assigned Database Schema:** `student2` (Supabase PostgreSQL)
* **Stack:** React 19 + Tailwind CSS + Vite (SPA Client), Express 5 + TypeScript + Prisma 6 (Backend API)
* **Containerization:** Node.js 20 Alpine Docker container running both REST API (`/api/*`) and compiled SPA static assets.

```
                      GitHub Monorepo (padinadi01/DevSprintPt3)
                                      │
                               (git push student2)
                                      ▼
                        GCP Cloud Build & Cloud Run
                               (app-student2)
                                      │
                                      ▼
                        Supabase Shared PostgreSQL
                               ┌──────────────┐
                               │ student2.*   │
                               └──────────────┘
```

---

## 🔐 Kredensial Login (Smoke Test)

Sistem menggunakan enkripsi password hash `bcrypt` (C1) dan autentikasi token JWT (C2) dengan antarmuka Quick-Switch untuk kemudahan demonstrasi:

| Pengguna | Username | PIN / Password | Peran (*Role*) | Akses & Wewenang |
| :--- | :--- | :--- | :--- | :--- |
| **Cak Rofi** | `cakrofi` | `123456` | **PEMILIK** | Akses penuh (Omset, Modal, Tambah Produk, Role Permission Manager) |
| **Udin** | `udin` | `1111` | **STAF** | Kasir & Penerimaan Barang (Harga modal disensor secara dinamis) |
| **Sari** | `sari` | `2222` | **STAF** | Shift malam: Kasir & Terima Barang |

---

## 🚀 Fitur Utama & Kepatuhan Blok A - D

1. **Blok A (Modul Barang Masuk & Rekonsiliasi Pesanan)**:
   - Konversi satuan beli ke satuan dasar (dus/renteng/bal ke bungkus/sachet/botol).
   - Penerimaan parsial, pencatatan barang ditolak (*defect*), dan kuantitas bonus gratis.
   - Idempotency proteksi klik ganda (*double-submit*).
   - Snapshot HPP modal terkunci per penerimaan barang.
2. **Blok B (Keamanan & Matriks Guard)**:
   - Hash PIN dengan `bcrypt` pada database (`passwordHash`).
   - Anti-impersonasi: Staf tidak bisa mencatut nama staf lain saat mencatat penerimaan barang.
   - Pembatasan laju (*Rate Limiting*) proteksi serangan *brute force*.
3. **Blok C (Dynamic Role Permission Manager)**:
   - Matriks perizinan dinamis disimpan di database (`RolePermission`).
   - Pemilik dapat mengatur dan mencabut wewenang Staf (seperti `cost:view`) secara seketika melalui antarmuka web.
   - Penolakan HTTP 403 Forbidden bila aksi terlarang diakses.
4. **Blok D (Ship ke Live)**:
   - Secret dikelola melalui environment variable (`DATABASE_URL`, `JWT_SECRET`), bukan di dalam commit.
   - Aplikasi membaca `PORT` dari environment (Cloud Run port `8080`).
   - Migrasi database dan inisialisasi data otomatis dijalankan pada saat *startup* container (`run-migrations.cjs`).
   - Endpoint kesehatan `/api/health` aktif untuk smoke test.

---

## 🧪 Smoke Test Checklist

Setelah aplikasi live di Cloud Run:

1. **Cek Status Kesehatan Server**:
   ```bash
   curl -i https://<cloud-run-url>/api/health
   # Ekspektasi: HTTP 200 {"status":"ok"}
   ```
2. **Uji Login Pemilik**:
   - Buka browser ke URL live.
   - Klik kartu login / tombol `👑 Rofi` (PIN: `123456`).
   - Pastikan masuk ke Dashboard dengan data penjualan dan menu manajemen aktif.
3. **Uji Proteksi Staf**:
   - Klik tombol cepat `👤 Udin` (PIN: `1111`).
   - Pastikan harga modal pada menu **Produk** menampilkan `🔒 Terkunci`.
4. **Uji Dynamic Permission Toggle**:
   - Kembali ke akun `👑 Rofi` -> buka menu **Manajemen Izin**.
   - Centang izin `Lihat Harga Modal` (`cost:view`) untuk Staf -> klik **Simpan Hak Akses**.
   - Beralih ke `👤 Udin` -> buka menu **Produk**: harga modal seketika terbuka dan menampilkan nominal rupiah.

---

## 📚 Dokumentasi Lengkap

* [`progres.md`](./progres.md): Dokumentasi teknis konteks AI Agent (Arsitektur, DTO, Invariant, 49/49 Vitest PASS).
* [`LAPORAN_PROYEK.md`](./LAPORAN_PROYEK.md): Laporan komprehensif untuk pengembang, manajer, dan fasilitator.
* [`GUARD.md`](./GUARD.md): Dokumen audit keamanan dan matriks perlindungan endpoint.
* [`PERMISSIONS.md`](./PERMISSIONS.md): Spesifikasi izin sistem dan pemetaan role.
