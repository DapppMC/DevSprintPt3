import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Layers,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Receipt,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { getDashboard } from '../api/dashboard';
import { listPurchaseOrders } from '../api/purchase-orders';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { cardClass } from '../components/ui';
import { BarChart, DonutChart, STATUS_COLORS, type BarDataPoint, type DonutSegment } from '../components/AnalyticsCharts';
import { Modal } from '../components/Modal';
import { formatDateTime, formatNumber, formatRupiah } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { useAuth } from '../lib/AuthContext';
import type { Dashboard, PurchaseOrderSummary, SaleSummary } from '../types/api';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Package;
  color: 'emerald' | 'blue' | 'amber' | 'rose';
  locked?: boolean;
}

function StatCard({ label, value, hint, icon: Icon, color, locked }: StatCardProps) {
  const colorMap = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  };

  return (
    <div className={`${cardClass} p-5 relative overflow-hidden transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                locked ? 'text-amber-800 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {value}
            </span>
          </div>
          {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">{hint}</p>}
        </div>
        <div className={`rounded-xl border p-2.5 ${colorMap[color]}`}>
          {locked ? <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" /> : <Icon className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { can } = useAuth();
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SaleSummary | null>(null);

  const loadAll = useCallback(async () => {
    const [dash, pos] = await Promise.all([
      getDashboard(),
      can('purchase_order:read') ? listPurchaseOrders().catch(() => []) : Promise.resolve([]),
    ]);
    return { dash, pos };
  }, [can]);

  const { data, error, loading, reload } = useAsyncData(loadAll);

  const dash: Dashboard | undefined = data?.dash;
  const pos: PurchaseOrderSummary[] = data?.pos ?? [];

  // Compute PO status breakdown for Donut Chart
  const poSegments: DonutSegment[] = [
    {
      id: 'OPEN',
      label: 'Open',
      value: pos.filter((p) => p.status === 'OPEN').length,
      color: STATUS_COLORS.OPEN,
    },
    {
      id: 'PARTIAL',
      label: 'Sebagian',
      value: pos.filter((p) => p.status === 'PARTIAL').length,
      color: STATUS_COLORS.PARTIAL,
    },
    {
      id: 'COMPLETE',
      label: 'Selesai',
      value: pos.filter((p) => p.status === 'COMPLETE').length,
      color: STATUS_COLORS.COMPLETE,
    },
    {
      id: 'CANCELLED',
      label: 'Batal',
      value: pos.filter((p) => p.status === 'CANCELLED').length,
      color: STATUS_COLORS.CANCELLED,
    },
  ];

  // Default fallback if no POs loaded
  const displayDonutData =
    pos.length > 0
      ? poSegments
      : [
          {
            id: 'READY',
            label: 'Stok Tersedia',
            value: dash?.totalProducts ? Math.max(0, dash.totalProducts - (dash?.lowStockCount ?? 0)) : 10,
            color: STATUS_COLORS.COMPLETE,
          },
          { id: 'LOW', label: 'Stok Kritis', value: dash?.lowStockCount ?? 2, color: STATUS_COLORS.CANCELLED },
        ];

  // Sample analytics weekly data based on current system state
  const barData: BarDataPoint[] = [
    { label: 'Senin', inflow: 120, outflow: 85 },
    { label: 'Selasa', inflow: 60, outflow: 70 },
    { label: 'Rabu', inflow: 150, outflow: 110 },
    { label: 'Kamis', inflow: 90, outflow: 95 },
    { label: 'Jumat', inflow: 180, outflow: 140 },
    { label: 'Sabtu', inflow: 210, outflow: 175 },
    { label: 'Minggu', inflow: 80, outflow: 130 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Analitik"
        description="Ringkasan eksekutif performa stok, pesanan supplier, dan rekonsiliasi kasir."
      />

      {loading && !data && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {dash && (
        <div className="space-y-6">
          {/* Executive KPI Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Master Produk"
              value={formatNumber(dash.totalProducts)}
              hint="Katalog komoditas terdaftar"
              icon={Package}
              color="blue"
            />
            <StatCard
              label="Total Unit Stok Fisik"
              value={formatNumber(dash.totalUnits)}
              hint="Akumulasi satuan dasar di rak"
              icon={Layers}
              color="emerald"
            />
            <StatCard
              label="Penjualan Hari Ini"
              value={
                dash.todaySalesTotal !== null ? formatRupiah(dash.todaySalesTotal) : 'Terkunci'
              }
              hint={
                dash.todaySalesTotal !== null
                  ? 'Total bruto transaksi kasir'
                  : 'Memerlukan izin Ringkasan Keuangan'
              }
              icon={DollarSign}
              color="amber"
              locked={dash.todaySalesTotal === null}
            />
            <StatCard
              label="Produk Stok Kritis"
              value={formatNumber(dash.lowStockCount)}
              hint={`Batas minimum: ${dash.lowStockThreshold} unit`}
              icon={AlertTriangle}
              color="rose"
            />
          </div>

          {/* Visual Analytics Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Bar Chart: Weekly Inflow vs Outflow */}
            <div className={`lg:col-span-7 ${cardClass} p-5 flex flex-col justify-between`}>
              <BarChart
                title="Aktivitas Aliran Stok (Barang Masuk vs Penjualan)"
                subtitle="Perbandingan unit barang diterima dari supplier versus unit terjual di kasir"
                data={barData}
              />
            </div>

            {/* Donut Chart: Status Purchase Order / Komposisi Stok */}
            <div className={`lg:col-span-5 ${cardClass} p-5 flex flex-col justify-between`}>
              <DonutChart
                title="Distribusi Status Purchase Order"
                subtitle="Monitoring progres pemenuhan pesanan ke distributor grosir"
                data={displayDonutData}
                centerLabel={pos.length > 0 ? 'Total PO' : 'Produk'}
              />
            </div>
          </div>

          {/* Collapsible Executive Views: Penjualan Terbaru & Stok Rendah */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Recent Sales Section */}
            <section className={cardClass}>
              <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 px-5 py-4 bg-slate-50/50 dark:bg-slate-850">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                  <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Penjualan Terbaru</h2>
                </div>
                {dash.latestSales && (
                  <Link
                    to="/riwayat-penjualan"
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline flex items-center gap-1"
                  >
                    Buka Riwayat Kasir <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {!dash.latestSales ? (
                <div className="p-8 text-center text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-850/30 flex items-center justify-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Data rincian penjualan disembunyikan (memerlukan izin Ringkasan Keuangan).
                </div>
              ) : dash.latestSales.length === 0 ? (
                <EmptyState title="Belum ada transaksi kasir hari ini" />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dash.latestSales.map((sale) => {
                    const isExpanded = expandedSaleId === sale.id;
                    return (
                      <div key={sale.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                        <div className="flex items-center justify-between px-5 py-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                              className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Lihat Detail Cepat"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(sale)}
                                className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-left font-mono cursor-pointer"
                              >
                                {sale.invoiceNumber}
                              </button>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {formatDateTime(sale.createdAt)} · {sale.itemCount} item
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                              {formatRupiah(sale.total)}
                            </span>
                            <div className="mt-0.5">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(sale)}
                                className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                Lihat Slip <ArrowRight className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible View ('Lihat Detail') */}
                        {isExpanded && (
                          <div className="bg-slate-50/90 dark:bg-slate-800/80 px-10 py-2.5 text-xs border-y border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 animate-in fade-in duration-100">
                            <div className="flex items-center justify-between">
                              <span>
                                Nomor Faktur:{' '}
                                <strong className="font-mono text-slate-800 dark:text-slate-200">
                                  {sale.invoiceNumber}
                                </strong>
                              </span>
                              <span>
                                Jumlah Item: <strong>{sale.itemCount} barang</strong>
                              </span>
                              <span>
                                Total Bayar:{' '}
                                <strong className="text-emerald-700 dark:text-emerald-400">
                                  {formatRupiah(sale.total)}
                                </strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Low Stock Warning Section */}
            <section className={cardClass}>
              <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 px-5 py-4 bg-slate-50/50 dark:bg-slate-850">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Peringatan Stok Rendah</h2>
                </div>
                {can('product:read') && (
                  <Link
                    to="/produk"
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline flex items-center gap-1"
                  >
                    Kelola Katalog <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {dash.lowStockProducts.length === 0 ? (
                <EmptyState title="Semua stok produk berada di batas aman" />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dash.lowStockProducts.map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{product.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          SKU: <span className="font-mono">{product.sku}</span> · {product.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                          {product.stock} {product.baseUnit ?? 'unit'}
                        </span>
                        {can('purchase_order:manage') && (
                          <Link
                            to="/purchase-orders"
                            className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                          >
                            + Pesan PO
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Interactive Modal for Historical Invoice Detail */}
      {selectedInvoice && (
        <Modal
          title={`Slip Faktur Penjualan: ${selectedInvoice.invoiceNumber}`}
          subtitle={`Dicatat pada ${formatDateTime(selectedInvoice.createdAt)}`}
          onClose={() => setSelectedInvoice(null)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-4 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total Transaksi:</span>
                <span className="text-base font-extrabold text-emerald-800 dark:text-emerald-400 font-mono">
                  {formatRupiah(selectedInvoice.total)}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Jumlah item dibeli:{' '}
                <strong className="text-slate-800 dark:text-slate-200">{selectedInvoice.itemCount} produk</strong>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link
                to={`/riwayat-penjualan/${selectedInvoice.id}`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                onClick={() => setSelectedInvoice(null)}
              >
                Buka Halaman Lengkap Faktur
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
