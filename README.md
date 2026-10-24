# 🏪 Warung Madura Stock & Security Manager

> **Sistem Manajemen Ritel Terintegrasi, Logistik Multi-Satuan, Kasir Express POS, dan Dynamic Role-Based Access Control (RBAC)**

Aplikasi operasional ritel end-to-end yang dirancang khusus untuk memecahkan kompleksitas manajemen stok, rekonsiliasi pengadaan barang distributor, kalkulasi margin laba kotor, serta keamanan akses multi-staf pada Warung Madura modern "Berkah 24 Jam".

[![Build & Verification Status](https://img.shields.io/badge/CI%2FCD-Passing-emerald?style=flat-square&logo=githubactions)](https://github.com/DapppMC/DevSprint-WarungMadura)
[![Test Coverage](https://img.shields.io/badge/Vitest-108%2F108%20PASS%20(100%25)-emerald?style=flat-square&logo=vitest)](./progres.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20(0%20Error)-blue?style=flat-square&logo=typescript)](./tsconfig.json)
[![Platform](https://img.shields.io/badge/Deploy-GCP%20Cloud%20Run-blue?style=flat-square&logo=googlecloud)](https://student2-131481044262.asia-southeast1.run.app/)

---

## 🌐 Tautan Live Deployment & Lingkungan Kerja

- **URL Produksi (Google Cloud Run)**: [https://student2-131481044262.asia-southeast1.run.app/](https://student2-131481044262.asia-southeast1.run.app/)
- **Lingkungan Lokal**: `http://localhost:5001` (Daemon Produksi) / `http://localhost:5173` (Vite HMR)
- **Database Engine**: PostgreSQL 16 (Local) & Supabase Shared Pooler (Cloud Run `student2` schema)
- **Container Architecture**: Docker Alpine multi-stage running unified Express 5 REST API + Vite compiled Single Page Application (SPA).

---

## 🚀 Fitur Unggulan Sistem

### 1. ⚡ Kasir Express POS & Struk Termal Realistis
- **Pencarian Cepat & Barcode Scan**: Filter instan berbasis SKU, nama produk, kategori komoditas, atau shortcut barcode.
- **Tender Tunai Cepat**: Tombol uang pas dan denominasi praktis (+10rb, +20rb, +50rb, +100rb) dengan kalkulasi kembalian otomatis.
- **Struk Termal Otentik**: Dialog cetak struk 58mm/80mm yang mendukung cetak langsung via peramban (`window.print()`) dan unduh berkas teks (`.txt`).
- **Pintasan Global Command Palette (`Ctrl+K` / `Cmd+K`)**: Navigasi keyboard-first, pencarian stok darurat, dan pergantian shift instan.

### 2. 📊 Command Center & Executive Analytics
- **Metrik Omzet & Estimasi Margin Laba Kotor**: Perhitungan laba kotor (*Gross Profit Margin*) harian secara real-time berdasarkan HPP modal tertimbang.
- **Smart Restock Proposal**: Algoritma cerdas yang mendeteksi stok menipis di bawah ambang batas dan menghitung rekomendasi kuantitas kulakan dalam satuan kemasan beli distributor.
- **Leaderboard Fast-Moving**: Identifikasi 5 produk dengan perputaran penjualan tercepat.
- **Visualisasi Tren Komoditas Mingguan**: Grafik batang perbandingan volume barang masuk (*inflow*) distributor versus volume penjualan kasir (*outflow*).

### 3. 📦 Logistik Multi-Satuan & Rekonsiliasi Pesanan (PO)
- **Konversi Otomatis Multi-Satuan**: Pengadaan dalam kemasan grosir (*dus, bal, renteng, karton*) yang secara atomik terurai menjadi satuan fisik terkecil (*bungkus, botol, sachet, pcs*) di rak toko.
- **Penerimaan Fisik Parsial & Toleransi Bonus**: Pencatatan penerimaan bertahap dari distributor, termasuk bonus gratis pabrik yang otomatis mengoreksi nilai HPP efektif.
- **Isolasi Barang Rusak / Cacat (*Defect Handling*)**: Barang penyok atau kedaluwarsa langsung ditolak di tempat dengan pencatatan alasan resmi tanpa menambah stok jual.
- **Penutupan Sisa Pesanan (*Cancel Remaining*)**: Pembatalan transaksional atas sisa kuantitas pesanan yang tidak dapat dipenuhi distributor.
- **Idempotency Protection**: Header `Idempotency-Key` menjamin penekanan tombol ganda (*double-submit*) tidak menduplikasi mutasi stok fisik.

### 4. 🛡️ Dynamic Role-Based Access Control (RBAC) & Shift Switcher
- **Pemisahan Peran Tegas**:
  - **Pemilik (`PEMILIK` / Cak Rofi)**: Akses superadmin tanpa batas terhadap omzet finansial, harga modal kulakan, pengaturan harga jual, dan matriks hak akses.
  - **Staf Kasir / Gudang (`STAF` / Mas Udin & Mbak Sari)**: Akses operasional kasir dan penerimaan barang dengan penyensoran otomatis data finansial dan harga modal.
- **Shift Switcher 1-Klik**: Pergantian shift kasir instan di sidebar tanpa logout berulang kali, dengan proteksi batas laju login (*Rate Limiter*).
- **Matriks Izin Dinamis**: Pemilik dapat mengatur dan mencabut hak akses staf (seperti izin melihat modal atau melihat omzet) secara visual melalui database.

### 5. 🤝 Radar Grosir Terdekat & Kepatuhan UU PDP No. 27/2022
- **Direktori Mitra Grosir**: Integrasi lokasi mitra kulakan terdekat berbasis geolokasi Surabaya & Sidoarjo.
- **Pelindung Privasi Kontak**: Masking nomor kontak distributor grosir untuk akun staf, hanya pemilik yang berhak membuka kontak langsung via WhatsApp.
- **Resilient Chat Room**: Komunikasi real-time berbasis WebSocket Socket.IO dengan fallback in-memory yang tangguh terhadap gangguan jaringan.

---

## 🔑 Kredensial Pengujian Akun (Demo Shift)

Aplikasi dilengkapi tombol cepat (*1-Click Shift Switch*) di layar login dan sidebar:

| Pengguna | Username | PIN Otentikasi | Peran (*Role*) | Batasan Hak Akses |
| :--- | :--- | :--- | :--- | :--- |
| **Cak Rofi** | `cakrofi` | `123456` | **PEMILIK** | **Akses Penuh**: Omzet, Margin Laba Kotor, Manajemen Izin, Tambah Produk, Buka Kontak Supplier |
| **Mas Udin** | `udin` | `1111` | **STAF** (Shift Pagi) | **Operasional Kasir & Gudang**: Terima Barang, Penjualan, Stok. Data omzet & harga modal terkunci |
| **Mbak Sari** | `sari` | `2222` | **STAF** (Shift Malam) | **Operasional Kasir**: Transaksi Kasir POS, Cetak Struk, Riwayat Penjualan Pribadi |

---

## 🛠️ Arsitektur Teknologi & Kinerja

```
┌────────────────────────────────────────────────────────┐
│               Client Tier (Vite + React 19)            │
│  - Tailwind CSS (Light & Dark High-Contrast UI)        │
│  - SWR In-Memory Cache (Sub-millisecond Subnav)        │
│  - Lucide Vector Icons (Zero-Emoji Policy)             │
└───────────────────────────┬────────────────────────────┘
                            │ REST JSON / WebSocket
┌───────────────────────────▼────────────────────────────┐
│              Backend Tier (Node.js + Express 5)        │
│  - TypeScript Strict Architecture                      │
│  - Zod Request DTO Validation                          │
│  - Database Circuit Breaker (<1ms Offline Fallback)    │
│  - Socket.IO Multi-Client Realtime Engine              │
└───────────────────────────┬────────────────────────────┘
                            │ Prisma ORM 6 / SQL
┌───────────────────────────▼────────────────────────────┐
│                    Data Tier (PostgreSQL)              │
│  - ACID Serializable Transactions                      │
│  - Row-Level Locking (`FOR UPDATE`) Anti-Overselling   │
│  - Schema Isolation (`student2` multi-tenant schema)   │
└────────────────────────────────────────────────────────┘
```

- **Stale-While-Revalidate (SWR)**: Transisi antar halaman instan (0 milidetik) memanfaatkan cache memori lokal dengan background refresh asinkron.
- **Database Circuit Breaker**: Jika koneksi basis data remote mengalami gangguan, backend otomatis mengalihkan permintaan ke demo dataset berintegritas tinggi tanpa jeda *hanging* atau *timeout*.
- **High-Contrast Dark Mode**: Skema kontras warna ganda yang konsisten, memenuhi standar aksesibilitas WCAG AA tanpa ada teks yang kabur atau tersembunyi.

---

## 🧪 Jaminan Kualitas & Verifikasi Otomatis

Seluruh logika bisnis, transaksi database, perhitungan konversi, dan mekanisme isolasi hak akses telah lolos pengujian menyeluruh:

| Rangkaian Pengujian (*Test Suite*) | Kategori Uji | Jumlah Kasus | Status |
| :--- | :--- | :---: | :---: |
| `test/e2e-api.test.ts` | E2E HTTP REST API Flow | 20 | ✅ PASS |
| `test/scenarios.test.ts` | Core S1–S20 Inbound Logistics | 20 | ✅ PASS |
| `test/rbac-comprehensive.test.ts` | Granular Security & Permission Masking | 14 | ✅ PASS |
| `test/boundary-edge-adversarial.test.ts` | Boundary, Negative Stock & Race Conditions | 13 | ✅ PASS |
| `test/unit-business-logic.test.ts` | Multi-Unit Conversion & Weighted Cost Math | 13 | ✅ PASS |
| `test/rbac.test.ts` | Authentication & Matrix Enforcements | 8 | ✅ PASS |
| `test/acid-transactions.test.ts` | Rollback Atomicity & Row Locking | 6 | ✅ PASS |
| `test/k1-k17.test.ts` | Real-time WebSocket & Nearby Directory | 13 | ✅ PASS |
| `test/t1-t11.test.ts` | Security Rate Limiter & Audit Trail | 1 | ✅ PASS |
| **Total Pengujian Otomatis** | **Unified Test Harness (`run_all_tests.py`)** | **108 / 108** | **100% PASS** |

### Hasil Audit Desain UI (Design Linter):
- `PASS R01`: Eliminasi warna generik / non-standar (`ai-color`)
- `PASS R02`: Hirarki radius border visual konsentris (`concentric-radius`)
- `PASS R03`: Penyelarasan angka monospaced tabular (`tabular-nums`)
- `PASS R04`: Transparansi backdrop blur performan (`backdrop-blur`)
- `PASS R05`: Animasi taktil non-linear (`active:scale-[0.98]`)
- `PASS R06`: Peniadaan nesting card bertumpuk berlebih (`cardception`)
- `PASS R07`: Teks salinan operasional profesional (`filler-copy`)
- `PASS R08`: Rasio kontras teks mode terang & gelap (`contrast`)
- `PASS R09`: Pemetaan CSS Design Tokens (`tokens`)

---

## 💻 Panduan Menjalankan Sistem Secara Lokal

### Prasyarat
- Node.js versi 20.x atau lebih baru
- Docker Desktop / PostgreSQL lokal

### Langkah Instalasi
```bash
# 1. Kloning repositori
git clone https://github.com/DapppMC/DevSprint-WarungMadura.git
cd DevSprint-WarungMadura

# 2. Pasang dependensi monorepo
npm install

# 3. Konfigurasi berkas .env
# Sesuaikan DATABASE_URL dan JWT_SECRET jika diperlukan

# 4. Inisialisasi skema basis data & benih data awal (seeding)
npm run db:migrate -w server
npm run db:seed -w server

# 5. Jalankan server pengembangan terpadu (Frontend + Backend)
npm run dev

# Aplikasi aktif pada:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:5001
```

### Eksekusi Seluruh Rangkaian Uji
```bash
# Menjalankan typecheck, lint, dan 108 test Vitest
python3 run_all_tests.py

# Memvalidasi standar UI linter
python3 scripts/design_lint.py client/dist/index.html --css client/dist/assets/*.css --max-raw-colors 100
```

---

## 📖 Dokumentasi Pendukung Proyek

- **[Laporan Proyek Komprehensif (`LAPORAN_PROYEK.md`)](./LAPORAN_PROYEK.md)**: Analisis komparatif sebelum vs sesudah, panduan demo 5 menit, pemetaan fitur bisnis, dan pembuktian uji sistem.
- **[Log Kontinuitas AI Agent (`progress.md`)](./progress.md)**: Riwayat checkpoint teknis, invarian sistem, dan state pengerjaan multi-agent swarm.
- **[Audit Matriks Keamanan (`GUARD.md`)](./GUARD.md)**: Dokumentasi proteksi endpoint dan pencegahan impersonasi.
- **[Spesifikasi Izin Sistem (`PERMISSIONS.md`)](./PERMISSIONS.md)**: Matriks peran default dan kamus permission.
