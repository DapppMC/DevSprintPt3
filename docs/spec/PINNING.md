# Gate -1: Evidence-Bound EARS and Behavioral Pinning (Warung Madura Brownfield)

## Invariants (Confirmed Core Business Logic - 100% Preserved)

- `REQ-BF-001 [INVARIANT] [ref: server/src/services/sale.service.ts:L30-L160]`: WHEN kasir melakukan checkout penjualan THE SYSTEM SHALL memotong stok barang secara atomik (`updateMany` dengan guard `stock >= qty`), merekam `StockMovement` bertipe `SALE`, dan jika stok tidak cukup SHALL rollback transaksi dan melempar `ConflictError`.
- `REQ-BF-002 [INVARIANT] [ref: server/src/services/goods-receipt.service.ts:L350-L450]`: WHEN staf mencatat penerimaan barang masuk THE SYSTEM SHALL memverifikasi `idempotencyKey`, menambah stok sesuai `receivedBase` + `bonusBase`, mengunci snapshot biaya modal (`costPerBaseUnit` dan `effectiveCostPerBaseUnit`), merekam `StockMovement` tipe `RECEIPT`, dan memperbarui status Purchase Order (`PARTIAL` atau `COMPLETE`).
- `REQ-BF-003 [INVARIANT] [ref: server/src/services/stock.service.ts:L20-L80]`: WHEN penyesuaian stok manual dilakukan THE SYSTEM SHALL mewajibkan alasan (`reason`) dan catatan penjelas, melarang stok menjadi bernilai negatif, dan mencatat `StockMovement` tipe `ADJUSTMENT_IN` atau `ADJUSTMENT_OUT`.
- `REQ-BF-004 [INVARIANT] [ref: server/src/middleware/auth.ts:L15-L80]`: WHEN permintaan HTTP masuk tanpa token atau token tidak valid THE SYSTEM SHALL menolak dengan status 401 Unauthorized; WHEN staf mencoba mengakses endpoint tanpa izin role yang sesuai THE SYSTEM SHALL menolak dengan status 403 Forbidden.
- `REQ-BF-005 [INVARIANT] [ref: server/src/services/dashboard.service.ts:L10-L100]`: WHEN staf tanpa izin `dashboard:financial` meminta dashboard THE SYSTEM SHALL menyembunyikan omzet penjualan dan detail riwayat transaksi penjualan (`todaySalesTotal: null`, `latestSales: null`).

## Anomalies & Workarounds
- `[LEGACY_ANOMALY]`: Tidak ada anomali atau hardcoded magic number kritis. Semua perhitungan diskon dan konversi unit menggunakan schema Zod dan Decimal.js.

## Dead Weight
- `[DEAD_WEIGHT]`: Tidak ada kode mati tak terjangkau dalam flow runtime.

## Golden Master Test Reference
- Fixture ID: `tests/golden/master_baseline.json` (SHA256: `a5490e89eb186f100ac4f85a33e2e7510fb1ec1035e4bbf988cdcd2b56e9bf78`)
- Verified Test Suite: 108/108 tests PASS (Vitest runner).
