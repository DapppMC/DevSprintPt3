# Gate 1: EARS Specifications & Feature Requirements (Planner 3.0)

## System Vision
Mentransformasi Dashboard Warung Madura "Berkah 24 Jam" dari sekadar aplikasi inventaris dasar menjadi **Sistem Operasional Warung Modern & Command Center Eksekutif** yang cepat (sat-set), indah, taktis, dan mudah digunakan oleh Cak Rofi (Pemilik), Mas Udin (Kasir Pagi), dan Mbak Sari (Kasir Malam).

## EARS Feature Specifications

### 1. REQ-FEAT-001: Express POS & Barcode Scanner Simulator
- `REQ-POS-01`: WHEN kasir mengetik atau memindai barcode/SKU pada input kasir, THE SYSTEM SHALL secara otomatis memfilter daftar produk secara instan (< 50ms) dan memilih produk yang cocok.
- `REQ-POS-02`: WHEN kasir mengklik tombol kategori (Semua, Minuman, Makanan, Sembako, Rokok, Lainnya), THE SYSTEM SHALL menyaring produk yang ditampilkan sesuai kategori tersebut.
- `REQ-POS-03`: WHEN kasir mengklik tombol pecahan uang cepat (Uang Pas, Rp 10.000, Rp 20.000, Rp 50.000, Rp 100.000), THE SYSTEM SHALL mengisi nominal bayar dan menghitung uang kembalian secara reaktif.
- `REQ-POS-04`: WHEN transaksi kasir berhasil disimpan, THE SYSTEM SHALL menampilkan dialog Struk Termal Madura (58mm/80mm style) dengan rincian nota, kasir bertugas, item terjual, bayar, kembali, dan tombol Cetak / Unduh Struk.

### 2. REQ-FEAT-002: Executive Analytics & Profit Margin Intelligence
- `REQ-ANL-01`: WHEN pengguna dengan wewenang `dashboard:financial` memuat dashboard, THE SYSTEM SHALL menghitung dan menampilkan estimasi laba kotor hari ini (Gross Profit = Total Omzet - Estimasi HPP Modal).
- `REQ-ANL-02`: WHEN dashboard dirender, THE SYSTEM SHALL menampilkan leaderboard Top 5 Produk Terlaris berdasarkan kuantitas dan kontribusi omzet.
- `REQ-ANL-03`: WHEN data riwayat 7 hari tersedia, THE SYSTEM SHALL menyajikan tren bar chart 7 hari terakhir yang memperlihatkan dinamika omzet dan volume transaksi harian.

### 3. REQ-FEAT-003: Smart Reorder & Automated Kulakan Proposal
- `REQ-ORD-01`: WHEN stok komoditas berada di bawah ambang minimum (`stock <= lowStockThreshold`), THE SYSTEM SHALL menyusun rekomendasi kulakan cerdas (Smart Reorder Recommendation) yang menghitung saran pembelian dalam satuan beli produk (Dus / Renteng / Bal).
- `REQ-ORD-02`: WHEN tombol "Buat PO dari Rekomendasi" diklik, THE SYSTEM SHALL mengarahkan ke form Purchase Order dengan data produk, supplier grosir, dan jumlah pesanan yang sudah terisi otomatis.

### 4. REQ-FEAT-004: Global Command Palette (`Ctrl+K`)
- `REQ-CMD-01`: WHEN pengguna menekan `Ctrl+K` atau `Cmd+K` atau menekan tombol search header, THE SYSTEM SHALL membuka modal Command Palette.
- `REQ-CMD-02`: WHEN pengguna mengetikkan kata kunci navigasi atau nama produk di Command Palette, THE SYSTEM SHALL menampilkan hasil tindakan cepat (Quick Actions) dan item produk dengan navigasi keyboard (`Up`, `Down`, `Enter`, `Esc`).

### 5. REQ-FEAT-005: Strict Design Constitution & Kinetic Craft
- `REQ-DSN-01`: THE SYSTEM SHALL menerapkan token desain resmi dari `tokens.css` dan meniadakan penggunaan warna klise AI (banned indigo/purple `#6366f1`).
- `REQ-DSN-02`: THE SYSTEM SHALL menerapkan angka tabular (`tabular-nums font-mono`) pada seluruh harga rupiah, kuantitas stok, nomor faktur, dan persentase analitik.
- `REQ-DSN-03`: THE SYSTEM SHALL mengganti `transition-all` dengan properti transisi spesifik yang hardware-accelerated (`transform`, `opacity`) atau scoped styling, serta lulus uji `design_lint.py`.
