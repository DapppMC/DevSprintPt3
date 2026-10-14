import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/http';
import { listProducts } from '../api/products';
import {
  cancelRemainingPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
} from '../api/purchase-orders';
import { listSuppliers } from '../api/suppliers';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { SupplierFormModal } from '../components/SupplierFormModal';
import { useToast } from '../components/ToastProvider';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  btnSmall,
  btnSmallDanger,
  cardClass,
  inputClass,
  labelClass,
  tableHeadClass,
  tdClass,
  thClass,
} from '../components/ui';
import { formatDate } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { useAuth } from '../lib/AuthContext';
import type {
  Product,
  PurchaseOrderDetail,
  PurchaseOrderStatus,
  Supplier,
} from '../types/api';

function statusBadge(status: PurchaseOrderStatus) {
  switch (status) {
    case 'OPEN':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
          OPEN
        </span>
      );
    case 'PARTIAL':
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          SEBAGIAN
        </span>
      );
    case 'COMPLETE':
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          SELESAI
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
          DIBATALKAN
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
          {status}
        </span>
      );
  }
}

interface NewPOLineItem {
  productId: string;
  quantity: string;
}

interface CreatePOModalProps {
  onClose: () => void;
  onSaved: () => void;
  suppliers: Supplier[];
  products: Product[];
  onSupplierAdded?: (supplier: Supplier) => void;
}

function CreatePOModal({
  onClose,
  onSaved,
  suppliers,
  products,
  onSupplierAdded,
}: CreatePOModalProps) {
  const toast = useToast();
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(suppliers);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<NewPOLineItem[]>([
    { productId: products[0]?.id ?? '', quantity: '1' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSuppliers(suppliers);
    if (!supplierId && suppliers[0]?.id) {
      setSupplierId(suppliers[0].id);
    }
  }, [suppliers, supplierId]);

  function addLine() {
    setLines((prev) => [...prev, { productId: products[0]?.id ?? '', quantity: '1' }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof NewPOLineItem, val: string) {
    setLines((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Supplier wajib dipilih');
      return;
    }

    if (lines.length === 0) {
      setError('Minimal harus ada satu item pesanan');
      return;
    }

    for (const line of lines) {
      if (!line.productId) {
        setError('Pilih produk untuk semua baris');
        return;
      }
      const qty = Number(line.quantity);
      if (isNaN(qty) || qty <= 0) {
        setError('Jumlah pesanan harus lebih besar dari 0');
        return;
      }
    }

    setSubmitting(true);
    try {
      await createPurchaseOrder({
        supplierId,
        note: note.trim() || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
        })),
      });
      toast.success('Purchase Order berhasil dibuat.');
      onSaved();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal title="Buat Purchase Order Baru" onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass} htmlFor="po-supplier">
                Pilih Supplier <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                className="text-xs text-green-700 hover:text-green-800 font-medium underline"
                onClick={() => setShowAddSupplier(true)}
              >
                + Tambah Supplier Baru
              </button>
            </div>
            <select
              id="po-supplier"
              className={inputClass}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">-- Pilih Supplier --</option>
              {localSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>
            {localSuppliers.length === 0 && (
              <div className="mt-1.5 rounded-md bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200 flex items-center justify-between">
                <span>Belum ada supplier yang terdaftar di sistem.</span>
                <button
                  type="button"
                  className="font-semibold underline ml-2 text-amber-900"
                  onClick={() => setShowAddSupplier(true)}
                >
                  + Tambah Sekarang
                </button>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="po-note">
              Catatan (Opsional)
            </label>
            <input
              id="po-note"
              className={inputClass}
              placeholder="mis. Kirim sebelum jam 2 siang"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Daftar Item Pesanan</label>
              <button
                type="button"
                className={btnSmall}
                onClick={addLine}
              >
                + Tambah Item
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const selectedProd = products.find((p) => p.id === line.productId);
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <select
                        className={inputClass}
                        value={line.productId}
                        onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                        required
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      {selectedProd && (
                        <p className="mt-1 text-xs text-slate-500">
                          Satuan beli: <strong>{selectedProd.purchaseUnit}</strong> (1 {selectedProd.purchaseUnit} = {selectedProd.unitsPerPurchaseUnit} {selectedProd.baseUnit})
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:w-36">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className={inputClass}
                          placeholder="Jumlah"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          required
                        />
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {selectedProd?.purchaseUnit ?? 'unit'}
                        </span>
                      </div>
                    </div>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        className={btnSmallDanger}
                        onClick={() => removeLine(idx)}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={onClose} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className={btnPrimary} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Buat Pesanan'}
            </button>
          </div>
        </form>
      </Modal>

      {showAddSupplier && (
        <SupplierFormModal
          onClose={() => setShowAddSupplier(false)}
          onSuccess={(newSup) => {
            setLocalSuppliers((prev) => [...prev, newSup]);
            setSupplierId(newSup.id);
            setShowAddSupplier(false);
            onSupplierAdded?.(newSup);
          }}
        />
      )}
    </>
  );
}

interface CancelModalProps {
  po: { id: string; orderNumber: string };
  onClose: () => void;
  onSuccess: () => void;
}

function CancelModal({ po, onClose, onSuccess }: CancelModalProps) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan pembatalan sisa wajib diisi');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await cancelRemainingPurchaseOrder(po.id, { reason: reason.trim() });
      toast.success(`Sisa pesanan untuk ${po.orderNumber} berhasil dibatalkan.`);
      onSuccess();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Batalkan Sisa PO: ${po.orderNumber}`} onClose={onClose}>
      <form onSubmit={handleCancel} className="space-y-4">
        <p className="text-sm text-slate-600">
          Aksi ini akan membatalkan sisa barang yang belum terkirim pada PO ini. Status PO akan ditutup (CANCELLED jika belum ada yang diterima, atau COMPLETE jika sudah ada yang diterima).
        </p>
        <div>
          <label className={labelClass} htmlFor="cancel-reason">
            Alasan Pembatalan Sisa
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            className={inputClass}
            placeholder="mis. Supplier kehabisan stok gudang"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={submitting}>
            Kembali
          </button>
          <button type="submit" className={btnDanger} disabled={submitting}>
            {submitting ? 'Memproses...' : 'Konfirmasi Batalkan Sisa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface DetailModalProps {
  poId: string;
  onClose: () => void;
  onCancelRemainingClick: (po: PurchaseOrderDetail) => void;
}

function DetailModal({ poId, onClose, onCancelRemainingClick }: DetailModalProps) {
  const { can } = useAuth();
  const loadDetail = useCallback(() => getPurchaseOrder(poId), [poId]);
  const { data: po, error, loading } = useAsyncData(loadDetail);

  return (
    <Modal title={`Detail Purchase Order: ${po?.orderNumber ?? '...'}`} onClose={onClose}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {po && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Supplier:</span>
              <p className="font-semibold text-slate-800">{po.supplierName}</p>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>
              <p>{statusBadge(po.status)}</p>
            </div>
            <div>
              <span className="text-slate-500">Tanggal Pesan:</span>
              <p className="text-slate-800">{formatDate(po.orderedAt)}</p>
            </div>
            {po.note && (
              <div>
                <span className="text-slate-500">Catatan:</span>
                <p className="text-slate-800">{po.note}</p>
              </div>
            )}
            {po.cancelReason && (
              <div className="col-span-2 rounded-md bg-rose-50 p-2 text-rose-700">
                <span className="font-semibold">Alasan Batal: </span>
                {po.cancelReason}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 font-medium text-slate-900">Item Pesanan</h4>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className={thClass}>Produk</th>
                    <th className={`${thClass} text-right`}>Dipesan</th>
                    <th className={`${thClass} text-right`}>Diterima</th>
                    <th className={`${thClass} text-right`}>Sisa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {po.lines.map((line) => {
                    const ratio = line.unitsPerPurchaseUnit || 1;
                    const orderedPurch = line.orderedBase / ratio;
                    const fulfilledPurch = line.fulfilledBase / ratio;
                    const remainingPurch = line.remainingBase / ratio;

                    return (
                      <tr key={line.id}>
                        <td className={tdClass}>
                          <div className="font-medium text-slate-800">{line.productName}</div>
                          <div className="text-xs text-slate-500">
                            SKU: {line.productSku} (1 {line.purchaseUnit} = {line.unitsPerPurchaseUnit} {line.baseUnit})
                          </div>
                        </td>
                        <td className={`${tdClass} text-right font-medium`}>
                          {orderedPurch} {line.purchaseUnit}
                        </td>
                        <td className={`${tdClass} text-right text-emerald-600 font-medium`}>
                          {fulfilledPurch} {line.purchaseUnit}
                        </td>
                        <td className={`${tdClass} text-right font-semibold ${remainingPurch > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {remainingPurch} {line.purchaseUnit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              {can('purchase_order:manage') && (po.status === 'OPEN' || po.status === 'PARTIAL') && (
                <button
                  type="button"
                  className={btnSmallDanger}
                  onClick={() => onCancelRemainingClick(po)}
                >
                  Batalkan Sisa Pesanan
                </button>
              )}
            </div>
            <button type="button" className={btnSecondary} onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function PurchaseOrdersPage() {
  const { can } = useAuth();
  const [filterStatus, setFilterStatus] = useState<PurchaseOrderStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [detailPoId, setDetailPoId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; orderNumber: string } | null>(null);

  const loadData = useCallback(() => {
    return Promise.all([
      listPurchaseOrders(filterStatus === 'ALL' ? undefined : { status: filterStatus }),
      listSuppliers(),
      listProducts({}),
    ]);
  }, [filterStatus]);

  const { data, error, loading, reload } = useAsyncData(loadData);
  const purchaseOrders = data ? data[0] : [];
  const suppliers = data ? data[1] : [];
  const products = data ? data[2].filter((p) => p.isActive) : [];

  return (
    <div>
      <PageHeader
        title="Purchase Order"
        description="Kelola pemesanan barang ke supplier dan pantau status pengiriman."
        actions={
          can('purchase_order:manage') ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => setShowCreate(true)}
            >
              Buat PO Baru
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['ALL', 'OPEN', 'PARTIAL', 'COMPLETE', 'CANCELLED'] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filterStatus === status
                ? 'bg-green-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'ALL'
              ? 'Semua'
              : status === 'OPEN'
              ? 'Open'
              : status === 'PARTIAL'
              ? 'Sebagian'
              : status === 'COMPLETE'
              ? 'Selesai'
              : 'Dibatalkan'}
          </button>
        ))}
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {loading && !data && <LoadingState />}
        {error && (
          <div className="p-4">
            <ErrorState message={error} onRetry={reload} />
          </div>
        )}

        {purchaseOrders && purchaseOrders.length === 0 && (
          <EmptyState
            title="Belum ada Purchase Order"
            description="Buat PO baru untuk memesan stok dari supplier."
          />
        )}

        {purchaseOrders && purchaseOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>Nomor PO</th>
                  <th className={thClass}>Tanggal</th>
                  <th className={thClass}>Supplier</th>
                  <th className={thClass}>Item</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className={`${tdClass} font-medium text-slate-900`}>
                      {po.orderNumber}
                    </td>
                    <td className={`${tdClass} text-slate-500`}>
                      {formatDate(po.orderedAt)}
                    </td>
                    <td className={`${tdClass} text-slate-800`}>
                      {po.supplierName}
                    </td>
                    <td className={`${tdClass} text-slate-600`}>
                      {po.lineCount} barang
                    </td>
                    <td className={tdClass}>{statusBadge(po.status)}</td>
                    <td className={`${tdClass} text-right space-x-1 whitespace-nowrap`}>
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setDetailPoId(po.id)}
                      >
                        Lihat Detail
                      </button>
                      {can('purchase_order:manage') && (po.status === 'OPEN' || po.status === 'PARTIAL') && (
                        <button
                          type="button"
                          className={btnSmallDanger}
                          onClick={() => setCancelTarget(po)}
                        >
                          Batalkan Sisa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePOModal
          suppliers={suppliers}
          products={products}
          onClose={() => setShowCreate(false)}
          onSupplierAdded={() => reload()}
          onSaved={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}

      {detailPoId && (
        <DetailModal
          poId={detailPoId}
          onClose={() => setDetailPoId(null)}
          onCancelRemainingClick={(po) => {
            setDetailPoId(null);
            setCancelTarget(po);
          }}
        />
      )}

      {cancelTarget && (
        <CancelModal
          po={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={() => {
            setCancelTarget(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
