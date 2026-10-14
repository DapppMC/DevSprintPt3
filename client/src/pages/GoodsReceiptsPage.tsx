import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGoodsReceipt, listGoodsReceipts, createGoodsReceipt } from '../api/goods-receipts';
import { getErrorMessage } from '../api/http';
import { listProducts } from '../api/products';
import { getPurchaseOrder, listPurchaseOrders } from '../api/purchase-orders';
import { listStaff } from '../api/staff';
import { listSuppliers } from '../api/suppliers';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { StaffFormModal } from '../components/StaffFormModal';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { SupplierFormModal } from '../components/SupplierFormModal';
import {
  btnPrimary,
  btnSecondary,
  btnSmall,
  cardClass,
  inputClass,
  labelClass,
  tableHeadClass,
  tdClass,
  thClass,
} from '../components/ui';
import { formatDate, formatNumber, formatRupiah } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import type {
  GoodsReceiptDetail,
  GoodsReceiptRejectReason,
  Product,
  PurchaseOrderDetail,
  PurchaseOrderSummary,
  Staff,
  Supplier,
} from '../types/api';

interface ReceiptLineDraft {
  productId: string;
  productName: string;
  sku: string;
  baseUnit: string;
  purchaseUnit: string;
  unitsPerPurchaseUnit: number;
  remainingPoQuantity: number | null; // in purchaseUnit
  qtyReceivedPurch: string; // in purchaseUnit
  qtyRejectedPurch: string; // in purchaseUnit
  rejectReason: GoodsReceiptRejectReason | '';
  rejectNote: string;
  qtyBonusPurch: string; // in purchaseUnit
  unitCostPurch: string; // Rp per purchaseUnit
}

interface CreateReceiptModalProps {
  onClose: () => void;
  onSuccess: (receipt: GoodsReceiptDetail) => void;
  suppliers: Supplier[];
  staffList: Staff[];
  products: Product[];
  openPurchaseOrders: PurchaseOrderSummary[];
  onSupplierAdded?: (supplier: Supplier) => void;
  onStaffAdded?: (staff: Staff) => void;
}

function CreateReceiptModal({
  onClose,
  onSuccess,
  suppliers,
  staffList,
  products,
  openPurchaseOrders,
  onSupplierAdded,
  onStaffAdded,
}: CreateReceiptModalProps) {
  // Idempotency key generated once per modal lifecycle
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(suppliers);
  const [localStaffList, setLocalStaffList] = useState<Staff[]>(staffList);
  const [showAddSupplier, setShowAddSupplier] = useState<boolean>(false);
  const [showAddStaff, setShowAddStaff] = useState<boolean>(false);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id ?? '');
  const [receivedById, setReceivedById] = useState<string>(staffList[0]?.id ?? '');
  const [suratJalan, setSuratJalan] = useState<string>('');
  const [lines, setLines] = useState<ReceiptLineDraft[]>([]);
  const [loadingPo, setLoadingPo] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSuppliers(suppliers);
    if (!supplierId && suppliers[0]?.id) {
      setSupplierId(suppliers[0].id);
    }
  }, [suppliers, supplierId]);

  useEffect(() => {
    setLocalStaffList(staffList);
    if (!receivedById && staffList[0]?.id) {
      setReceivedById(staffList[0].id);
    }
  }, [staffList, receivedById]);

  // When PO changes, fetch details and pre-populate lines
  useEffect(() => {
    if (!selectedPoId) {
      // Empty or manual mode
      return;
    }

    let active = true;
    setLoadingPo(true);
    getPurchaseOrder(selectedPoId)
      .then((po: PurchaseOrderDetail) => {
        if (!active) return;
        setSupplierId(po.supplierId);
        const draftLines: ReceiptLineDraft[] = po.lines
          .filter((l) => l.remainingBase > 0)
          .map((l) => {
            const prod = products.find((p) => p.id === l.productId);
            const unitsPerPurch = l.unitsPerPurchaseUnit || prod?.unitsPerPurchaseUnit || 1;
            const purchPrice = prod?.purchasePrice ? prod.purchasePrice * unitsPerPurch : 0;
            const remainingPurch = l.remainingBase / unitsPerPurch;
            return {
              productId: l.productId,
              productName: l.productName,
              sku: l.productSku,
              baseUnit: l.baseUnit,
              purchaseUnit: l.purchaseUnit,
              unitsPerPurchaseUnit: unitsPerPurch,
              remainingPoQuantity: remainingPurch,
              qtyReceivedPurch: String(remainingPurch),
              qtyRejectedPurch: '0',
              rejectReason: '',
              rejectNote: '',
              qtyBonusPurch: '0',
              unitCostPurch: String(purchPrice),
            };
          });
        setLines(draftLines);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoadingPo(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPoId, products]);

  function addManualLine() {
    const prod = products[0];
    if (!prod) return;
    setLines((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        baseUnit: prod.baseUnit,
        purchaseUnit: prod.purchaseUnit,
        unitsPerPurchaseUnit: prod.unitsPerPurchaseUnit,
        remainingPoQuantity: null,
        qtyReceivedPurch: '1',
        qtyRejectedPurch: '0',
        rejectReason: '',
        rejectNote: '',
        qtyBonusPurch: '0',
        unitCostPurch: String((prod.purchasePrice ?? 0) * prod.unitsPerPurchaseUnit),
      },
    ]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine<K extends keyof ReceiptLineDraft>(idx: number, field: K, val: ReceiptLineDraft[K]) {
    setLines((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        if (field === 'productId') {
          const prod = products.find((p) => p.id === val);
          if (prod) {
            updated.productName = prod.name;
            updated.sku = prod.sku;
            updated.baseUnit = prod.baseUnit;
            updated.purchaseUnit = prod.purchaseUnit;
            updated.unitsPerPurchaseUnit = prod.unitsPerPurchaseUnit;
            updated.unitCostPurch = String((prod.purchasePrice ?? 0) * prod.unitsPerPurchaseUnit);
          }
        }
        return updated;
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Supplier wajib dipilih');
      return;
    }
    if (!receivedById) {
      setError('Staff penerima wajib dipilih');
      return;
    }
    if (lines.length === 0) {
      setError('Penerimaan harus memiliki minimal satu item');
      return;
    }

    for (const line of lines) {
      const rec = Number(line.qtyReceivedPurch);
      const rej = Number(line.qtyRejectedPurch || '0');
      const bon = Number(line.qtyBonusPurch || '0');
      const cost = Number(line.unitCostPurch);

      if (isNaN(rec) || rec < 0) {
        setError(`Jumlah datang untuk ${line.productName} tidak valid`);
        return;
      }
      if (isNaN(rej) || rej < 0) {
        setError(`Jumlah ditolak untuk ${line.productName} tidak valid`);
        return;
      }
      if (rej > rec) {
        setError(`Jumlah ditolak (${rej}) tidak boleh melebihi jumlah datang (${rec}) untuk ${line.productName}`);
        return;
      }
      if (rej > 0 && !line.rejectReason) {
        setError(`Pilih alasan penolakan untuk barang ${line.productName}`);
        return;
      }
      if (isNaN(bon) || bon < 0) {
        setError(`Jumlah bonus untuk ${line.productName} tidak valid`);
        return;
      }
      if (rec + bon <= 0) {
        setError(`Total barang masuk untuk ${line.productName} harus lebih dari 0`);
        return;
      }
      if (isNaN(cost) || cost < 0) {
        setError(`Harga beli per satuan untuk ${line.productName} tidak valid`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        idempotencyKey,
        supplierId,
        receivedById,
        purchaseOrderId: selectedPoId || undefined,
        note: suratJalan.trim() ? `Surat Jalan: ${suratJalan.trim()}` : undefined,
        lines: lines.map((l) => {
          const recPurch = Number(l.qtyReceivedPurch);
          const rejPurch = Number(l.qtyRejectedPurch || '0');
          const bonPurch = Number(l.qtyBonusPurch || '0');
          const costPurch = Number(l.unitCostPurch);
          const ratio = l.unitsPerPurchaseUnit || 1;

          return {
            productId: l.productId,
            receivedBase: Math.round(recPurch * ratio),
            rejectedBase: Math.round(rejPurch * ratio),
            rejectReason: rejPurch > 0 ? (l.rejectReason as GoodsReceiptRejectReason) : undefined,
            rejectNote: l.rejectNote.trim() || undefined,
            bonusBase: Math.round(bonPurch * ratio),
            unitCostPerPurchaseUnit: costPurch,
          };
        }),
      };

      const result = await createGoodsReceipt(payload);
      onSuccess(result);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal title="Penerimaan Barang (Barang Masuk)" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-600">
          Kunci Transaksi (Idempotency Key): <span className="font-mono text-slate-800">{idempotencyKey}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="gr-po">
              Pilih Purchase Order (Opsional)
            </label>
            <select
              id="gr-po"
              className={inputClass}
              value={selectedPoId}
              onChange={(e) => setSelectedPoId(e.target.value)}
            >
              <option value="">-- Tanpa PO (Penerimaan Langsung) --</option>
              {openPurchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.orderNumber} - {po.supplierName} ({po.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass} htmlFor="gr-supplier">
                Supplier <span className="text-red-500">*</span>
              </label>
              {!selectedPoId && (
                <button
                  type="button"
                  className="text-xs text-green-700 hover:text-green-800 font-medium underline"
                  onClick={() => setShowAddSupplier(true)}
                >
                  + Tambah Supplier
                </button>
              )}
            </div>
            <select
              id="gr-supplier"
              className={inputClass}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={!!selectedPoId}
              required
            >
              <option value="">-- Pilih Supplier --</option>
              {localSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>
            {localSuppliers.length === 0 && !selectedPoId && (
              <div className="mt-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200 flex items-center justify-between">
                <span>Belum ada supplier terdaftar.</span>
                <button
                  type="button"
                  className="font-semibold underline ml-2 text-amber-900"
                  onClick={() => setShowAddSupplier(true)}
                >
                  + Tambah Supplier
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass} htmlFor="gr-staff">
                Staff Penerima <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                className="text-xs text-green-700 hover:text-green-800 font-medium underline"
                onClick={() => setShowAddStaff(true)}
              >
                + Tambah Staff
              </button>
            </div>
            <select
              id="gr-staff"
              className={inputClass}
              value={receivedById}
              onChange={(e) => setReceivedById(e.target.value)}
              required
            >
              <option value="">-- Pilih Staff Penerima --</option>
              {localStaffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            {localStaffList.length === 0 && (
              <div className="mt-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200 flex items-center justify-between">
                <span>Belum ada staff terdaftar.</span>
                <button
                  type="button"
                  className="font-semibold underline ml-2 text-amber-900"
                  onClick={() => setShowAddStaff(true)}
                >
                  + Tambah Staff
                </button>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="gr-surat-jalan">
              Nomor Surat Jalan Supplier
            </label>
            <input
              id="gr-surat-jalan"
              className={inputClass}
              placeholder="mis. SJ-2026-991"
              value={suratJalan}
              onChange={(e) => setSuratJalan(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>

        {loadingPo && <p className="text-sm text-slate-500">Memuat detail pesanan...</p>}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Daftar Item Barang Masuk</label>
            {!selectedPoId && (
              <button type="button" className={btnSmall} onClick={addManualLine}>
                + Tambah Item
              </button>
            )}
          </div>

          {lines.length === 0 && !loadingPo && (
            <p className="text-sm text-slate-500 italic">
              {selectedPoId ? 'Tidak ada sisa item yang belum diterima pada PO ini.' : 'Belum ada item ditambahkan.'}
            </p>
          )}

          <div className="space-y-4">
            {lines.map((line, idx) => {
              const recPurch = Number(line.qtyReceivedPurch) || 0;
              const rejPurch = Number(line.qtyRejectedPurch) || 0;
              const bonPurch = Number(line.qtyBonusPurch) || 0;
              const ratio = line.unitsPerPurchaseUnit || 1;

              const netAcceptedPurch = Math.max(0, recPurch - rejPurch);
              const totalStockInBase = (netAcceptedPurch + bonPurch) * ratio;
              const remainingAfter =
                line.remainingPoQuantity !== null ? line.remainingPoQuantity - netAcceptedPurch : null;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      {selectedPoId ? (
                        <div className="font-semibold text-slate-900">
                          {line.productName} <span className="text-xs text-slate-500 font-normal">({line.sku})</span>
                        </div>
                      ) : (
                        <select
                          className={inputClass}
                          value={line.productId}
                          onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="text-xs text-slate-500 mt-0.5">
                        Konversi: 1 {line.purchaseUnit} = {line.unitsPerPurchaseUnit} {line.baseUnit}
                        {line.remainingPoQuantity !== null && (
                          <span className="ml-2 font-medium text-amber-700">
                            (Sisa di PO: {line.remainingPoQuantity} {line.purchaseUnit})
                          </span>
                        )}
                      </div>
                    </div>
                    {!selectedPoId && lines.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-700"
                        onClick={() => removeLine(idx)}
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Qty Datang ({line.purchaseUnit})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={inputClass}
                        value={line.qtyReceivedPurch}
                        onChange={(e) => updateLine(idx, 'qtyReceivedPurch', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Qty Ditolak ({line.purchaseUnit})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={inputClass}
                        value={line.qtyRejectedPurch}
                        onChange={(e) => updateLine(idx, 'qtyRejectedPurch', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Qty Bonus ({line.purchaseUnit})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={inputClass}
                        value={line.qtyBonusPurch}
                        onChange={(e) => updateLine(idx, 'qtyBonusPurch', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Harga Beli / {line.purchaseUnit} (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={inputClass}
                        value={line.unitCostPurch}
                        onChange={(e) => updateLine(idx, 'unitCostPurch', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {rejPurch > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-rose-50 rounded border border-rose-200">
                      <div>
                        <label className="text-xs font-medium text-rose-800 block mb-1">
                          Alasan Ditolak <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={inputClass}
                          value={line.rejectReason}
                          onChange={(e) =>
                            updateLine(idx, 'rejectReason', e.target.value as GoodsReceiptRejectReason)
                          }
                          required
                        >
                          <option value="">-- Pilih Alasan --</option>
                          <option value="PENYOK">Rusak / Penyok / Cacat Fisik</option>
                          <option value="KEDALUWARSA">Expired / Mendekati Kedaluwarsa</option>
                          <option value="LAINNYA">Salah Barang / Kemasan Sobek / Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-rose-800 block mb-1">
                          Catatan Penolakan (Opsional)
                        </label>
                        <input
                          className={inputClass}
                          placeholder="mis. 1 dus sobek basah kehujanan"
                          value={line.rejectNote}
                          onChange={(e) => updateLine(idx, 'rejectNote', e.target.value)}
                          maxLength={200}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-600">
                      Masuk ke Stok:{' '}
                      <strong className="text-emerald-700">
                        {formatNumber(totalStockInBase)} {line.baseUnit}
                      </strong>
                    </span>
                    {remainingAfter !== null && (
                      <span className="text-slate-600">
                        Sisa PO Setelah Ini:{' '}
                        <strong className={remainingAfter === 0 ? 'text-slate-500' : 'text-amber-700'}>
                          {remainingAfter} {line.purchaseUnit}
                        </strong>
                      </span>
                    )}
                  </div>
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
          <button type="submit" className={btnPrimary} disabled={submitting || lines.length === 0}>
            {submitting ? 'Memproses Penerimaan...' : 'Simpan Barang Masuk'}
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

    {showAddStaff && (
      <StaffFormModal
        onClose={() => setShowAddStaff(false)}
        onSuccess={(newStaff) => {
          setLocalStaffList((prev) => [...prev, newStaff]);
          setReceivedById(newStaff.id);
          setShowAddStaff(false);
          onStaffAdded?.(newStaff);
        }}
      />
    )}
  </>
  );
}

interface DetailModalProps {
  receiptId: string;
  onClose: () => void;
}

function DetailModal({ receiptId, onClose }: DetailModalProps) {
  const loadDetail = useCallback(() => getGoodsReceipt(receiptId), [receiptId]);
  const { data: gr, error, loading } = useAsyncData(loadDetail);

  return (
    <Modal title={`Detail Penerimaan: ${gr?.receiptNumber ?? '...'}`} onClose={onClose}>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {gr && (
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Nomor Penerimaan:</span>
              <p className="font-semibold text-slate-900">{gr.receiptNumber}</p>
            </div>
            <div>
              <span className="text-slate-500">Tanggal Terima:</span>
              <p className="text-slate-900">{formatDate(gr.receivedAt)}</p>
            </div>
            <div>
              <span className="text-slate-500">Supplier:</span>
              <p className="text-slate-900">{gr.supplierName}</p>
            </div>
            <div>
              <span className="text-slate-500">Diterima Oleh:</span>
              <p className="text-slate-900">{gr.receivedByName}</p>
            </div>
            {gr.purchaseOrderNumber && (
              <div>
                <span className="text-slate-500">Nomor PO:</span>
                <p className="font-semibold text-blue-700">{gr.purchaseOrderNumber}</p>
              </div>
            )}
            {gr.note && (
              <div className="col-span-2 rounded-md bg-slate-50 p-2 text-slate-700">
                <span className="font-semibold">Catatan: </span>
                {gr.note}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 font-medium text-slate-900">Rincian Barang Masuk</h4>
            <div className="space-y-3">
              {gr.lines.map((line) => {
                const netAcceptedBase = line.receivedBase - line.rejectedBase;
                const totalStockInBase = netAcceptedBase + line.bonusBase;

                return (
                  <div key={line.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{line.productName}</div>
                        <div className="text-slate-500">
                          SKU: {line.productSku} | Konversi: 1 {line.purchaseUnit} = {line.unitsPerPurchaseUnit} pcs
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          +{formatNumber(totalStockInBase)} pcs ke stok
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-slate-500">Datang:</span>
                        <p className="font-medium text-slate-800">
                          {formatNumber(line.receivedBase)} pcs ({formatNumber(line.receivedBase / line.unitsPerPurchaseUnit)} {line.purchaseUnit})
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Ditolak:</span>
                        <p className={`font-medium ${line.rejectedBase > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          {formatNumber(line.rejectedBase)} pcs {line.rejectReason ? `(${line.rejectReason})` : ''}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Bonus:</span>
                        <p className={`font-medium ${line.bonusBase > 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                          {formatNumber(line.bonusBase)} pcs
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Harga Beli / Satuan Beli:</span>
                        <p className="font-medium text-slate-800">
                          {line.unitCostPerPurchaseUnit !== undefined
                            ? formatRupiah(line.unitCostPerPurchaseUnit)
                            : '🔒 Terkunci'}
                        </p>
                      </div>
                    </div>

                    {line.costPerBaseUnit !== undefined ? (
                      <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-slate-600">
                        <span>
                          HPP Dasar: <strong>{formatRupiah(line.costPerBaseUnit)}</strong> / pcs
                        </span>
                        <span>
                          HPP Efektif (setelah bonus):{' '}
                          <strong className="text-emerald-700">{formatRupiah(line.effectiveCostPerBaseUnit)}</strong> / pcs
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2 rounded border border-dashed border-slate-200 text-xs text-slate-500 text-center">
                        🔒 HPP modal disembunyikan (memerlukan izin Lihat Harga Modal)
                      </div>
                    )}

                    {line.rejectNote && (
                      <p className="text-rose-700 italic">Catatan tolak: {line.rejectNote}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface SuccessModalProps {
  receipt: GoodsReceiptDetail;
  onClose: () => void;
  onReceiveAnother: () => void;
}

function SuccessModal({ receipt, onClose, onReceiveAnother }: SuccessModalProps) {
  const totalUnits = receipt.lines.reduce(
    (acc, l) => acc + (l.receivedBase - l.rejectedBase + l.bonusBase),
    0,
  );

  return (
    <Modal title="Penerimaan Barang Berhasil Disimpan" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 p-4 text-emerald-800">
          <p className="font-semibold text-base">Nomor GR: {receipt.receiptNumber}</p>
          <p className="text-sm mt-1">
            Berhasil mencatat <strong>{receipt.lines.length} produk</strong> dengan total{' '}
            <strong>{formatNumber(totalUnits)} unit barang</strong> masuk ke stok.
          </p>
          {receipt.purchaseOrderNumber && (
            <p className="text-xs text-emerald-700 mt-2">
              Status pesanan untuk PO <strong>{receipt.purchaseOrderNumber}</strong> telah diperbarui secara otomatis.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <Link to="/riwayat-stok" className={btnSecondary} onClick={onClose}>
            Lihat Riwayat Stok
          </Link>
          <button type="button" className={btnPrimary} onClick={onReceiveAnother}>
            Terima Barang Lain
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function GoodsReceiptsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<GoodsReceiptDetail | null>(null);

  const loadData = useCallback(() => {
    return Promise.all([
      listGoodsReceipts(),
      listSuppliers(),
      listStaff(),
      listProducts({}),
      listPurchaseOrders(),
    ]);
  }, []);

  const { data, error, loading, reload } = useAsyncData(loadData);
  const receipts = data ? data[0] : [];
  const suppliers = data ? data[1] : [];
  const staffList = data ? data[2] : [];
  const products = data ? data[3].filter((p) => p.isActive) : [];
  const openPurchaseOrders = data
    ? data[4].filter((po) => po.status === 'OPEN' || po.status === 'PARTIAL')
    : [];

  return (
    <div>
      <PageHeader
        title="Barang Masuk (Penerimaan)"
        description="Catat penerimaan barang dari supplier atau Purchase Order, verifikasi reject, dan catat bonus."
        actions={
          <button
            type="button"
            className={btnPrimary}
            onClick={() => setShowCreate(true)}
          >
            Terima Barang Masuk
          </button>
        }
      />

      <div className={`${cardClass} overflow-hidden`}>
        {loading && !data && <LoadingState />}
        {error && (
          <div className="p-4">
            <ErrorState message={error} onRetry={reload} />
          </div>
        )}

        {receipts && receipts.length === 0 && (
          <EmptyState
            title="Belum ada riwayat penerimaan barang"
            description="Klik tombol 'Terima Barang Masuk' untuk mencatat barang yang baru tiba dari supplier."
          />
        )}

        {receipts && receipts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>Nomor GR</th>
                  <th className={thClass}>Tanggal</th>
                  <th className={thClass}>Supplier</th>
                  <th className={thClass}>Nomor PO</th>
                  <th className={thClass}>Penerima</th>
                  <th className={`${thClass} text-right`}>Item</th>
                  <th className={`${thClass} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((gr) => (
                  <tr key={gr.id} className="hover:bg-slate-50">
                    <td className={`${tdClass} font-semibold text-slate-900`}>
                      {gr.receiptNumber}
                    </td>
                    <td className={`${tdClass} text-slate-500`}>
                      {formatDate(gr.receivedAt)}
                    </td>
                    <td className={`${tdClass} text-slate-800 font-medium`}>
                      {gr.supplierName}
                    </td>
                    <td className={`${tdClass} text-slate-600`}>
                      {gr.purchaseOrderNumber ? (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {gr.purchaseOrderNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Langsung</span>
                      )}
                    </td>
                    <td className={`${tdClass} text-slate-700`}>
                      {gr.receivedByName}
                    </td>
                    <td className={`${tdClass} text-right text-slate-600`}>
                      {gr.itemCount} barang
                    </td>
                    <td className={`${tdClass} text-right whitespace-nowrap`}>
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setDetailId(gr.id)}
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateReceiptModal
          suppliers={suppliers}
          staffList={staffList}
          products={products}
          openPurchaseOrders={openPurchaseOrders}
          onClose={() => setShowCreate(false)}
          onSupplierAdded={() => reload()}
          onStaffAdded={() => reload()}
          onSuccess={(newReceipt) => {
            setShowCreate(false);
            setSuccessReceipt(newReceipt);
            reload();
          }}
        />
      )}

      {detailId && (
        <DetailModal receiptId={detailId} onClose={() => setDetailId(null)} />
      )}

      {successReceipt && (
        <SuccessModal
          receipt={successReceipt}
          onClose={() => setSuccessReceipt(null)}
          onReceiveAnother={() => {
            setSuccessReceipt(null);
            setShowCreate(true);
          }}
        />
      )}
    </div>
  );
}
