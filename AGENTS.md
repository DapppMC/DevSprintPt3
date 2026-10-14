# Mandatory Project Rule: Dual-Markdown Documentation for Every Session / Task

Setiap kali menyelesaikan suatu tugas, fitur, sprint, atau sesi pengerjaan dalam project ini, agen AI dan pengembang **WAJIB** membuat / memperbarui **2 (dua) file dokumentasi Markdown (.md)**:

---

## 1. File Markdown Pertama: Khusus untuk Konteks AI Agent (`progres.md` / `PROGRESS_AI.md`)

* **Target Pembaca**: AI Coding Agent yang akan melanjutkan pekerjaan di sesi berikutnya.
* **Tujuan**: Memastikan kelangsungan konteks teknis 100% utuh tanpa perlu melakukan eksplorasi ulang dari nol, mencegah halusinasi, dan menjaga aturan bisnis tetap ditegakkan.
* **Komponen Wajib**:
  1. **Status & Checklist**: Tabel progres setiap sub-tahap (Analyze, Plan, Build, Test, Review).
  2. **Spesifikasi & Invariant Bisnis**: Aturan keras teknis (misal: kuantitas harus disimpan dalam satuan dasar terkecil, pembagian uang wajib menggunakan Decimal/integer, stok tidak boleh minus, semua transaksi wajib atomik).
  3. **Arsitektur & Model Data**: Perubahan skema database (model Prisma, enum, constraint SQL manual, relasi antar tabel).
  4. **Kontrak API & DTO**: Endpoint baru/diubah, schema validasi Zod, mapping DTO, dan kode respon HTTP.
  5. **Logika Transaksional & State Machine**: Urutan operasi database, locking (`FOR UPDATE`), mekanisme idempotency, dan penanganan *race condition*.
  6. **Skenario Pengujian (Test Suite)**: Daftar skenario uji (misal: S1–S20, T1–T11), input, ekspektasi, dan status verifikasi otomatis via test runner (Vitest).
  7. **Decision Log**: Catatan trade-off teknis mengapa suatu pendekatan dipilih.

---

## 2. File Markdown Kedua: Khusus untuk Vibe Coder & Laporan Atasan / Awam (`LAPORAN_PROYEK.md` / `CHANGELOG.md`)

* **Target Pembaca**: Pengembang (Vibe Coder), Atasan/Manager, dan Stakeholder non-teknis / orang awam.
* **Tujuan**: Memberikan laporan komprehensif yang mudah dipahami tentang apa saja yang berubah, bagaimana perubahannya bekerja, dampak bisnisnya, dan cara mendemonstrasikannya.
* **Komponen Wajib**:
  1. **Ringkasan Eksekutif (Bahasa Awam)**: Penjelasan tanpa jargon teknis mengenai masalah pengguna dan solusi yang dihadirkan.
  2. **Sebelum vs. Sesudah (*Before vs. After*)**: Tabel perbandingan alur kerja lama dibanding alur kerja baru dari sudut pandang pengguna.
  3. **Peta Kebutuhan ke Fitur**: Tabel yang menghubungkan setiap permintaan/keluhan klien dengan fitur spesifik yang dibangun dan statusnya.
  4. **Diagram Alur Visual (Mermaid)**: Diagram alur bisnis (*Business Flow*) dan alur keputusan (*Workflow Logic*) dengan label bahasa Indonesia yang jelas.
  5. **Rangkuman Perubahan Komponen**: Pengelompokan perubahan berdasarkan modul, tampilan UI yang baru/diperbarui, dan fitur lama yang tetap terlindungi.
  6. **Hasil Pengujian & Kepastian**: Tabel ringkasan pengujian (angka kelulusan, misal 20/20 PASS) untuk membuktikan keandalan sistem kepada atasan.
  7. **Panduan Demo (5 Menit)**: Langkah klik demi langkah klik secara berurutan untuk mendemonstrasikan fitur kepada klien/atasan.
  8. **Glosarium Istilah**: Penjelasan sederhana untuk setiap istilah bisnis/sistem yang digunakan.

---

## Aturan Pelaksanaan:
- **Jangan Pernah Mengabaikan**: Sesi pengerjaan belum dianggap "Selesai" jika kedua file ini belum dibuat atau diperbarui.
- **Konsistensi**: File untuk AI fokus pada *presisi teknis dan invariant*, sedangkan file untuk manusia fokus pada *kejelasan, konteks bisnis, dan pembuktian hasil*.
