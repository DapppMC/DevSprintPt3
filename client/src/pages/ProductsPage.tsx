import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/http';
import { deleteProduct, listProducts, updateProduct } from '../api/products';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { ProductFormModal } from '../components/ProductFormModal';
import { StockAdjustmentModal } from '../components/StockAdjustmentModal';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { useToast } from '../components/ToastProvider';
import {
  btnPrimary,
  btnSmall,
  btnSmallDanger,
  cardClass,
  inputClass,
  tableHeadClass,
  tdClass,
  thClass,
} from '../components/ui';
import { LOW_STOCK_THRESHOLD } from '../lib/constants';
import { formatNumber, formatRupiah } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { useAuth } from '../lib/AuthContext';
import type { Product } from '../types/api';

type FormState = { mode: 'create' } | { mode: 'edit'; product: Product } | null;

export function ProductsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [formState, setFormState] = useState<FormState>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Wait until the user stops typing before asking the API.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = useCallback(() => listProducts({ search: query }), [query]);
  const { data: products, error, loading, reload } = useAsyncData(loadProducts);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      toast.success(`Produk "${deleteTarget.name}" berhasil dihapus.`);
      setDeleteTarget(null);
      reload();
    } catch (caught) {
      toast.error(getErrorMessage(caught));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await updateProduct(deactivateTarget.id, { isActive: false });
      toast.success(`Produk "${deactivateTarget.name}" berhasil dinonaktifkan.`);
      setDeactivateTarget(null);
      reload();
    } catch (caught) {
      toast.error(getErrorMessage(caught));
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  }

  async function handleActivate(product: Product) {
    try {
      await updateProduct(product.id, { isActive: true });
      toast.success(`Produk "${product.name}" berhasil diaktifkan kembali.`);
      reload();
    } catch (caught) {
      toast.error(getErrorMessage(caught));
    }
  }

  return (
    <div>
      <PageHeader
        title="Produk"
        description="Kelola daftar produk, harga, dan stok."
        actions={
          can('product:manage') ? (
            <button type="button" className={btnPrimary} onClick={() => setFormState({ mode: 'create' })}>
              Tambah Produk
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 max-w-sm">
        <input
          type="search"
          className={inputClass}
          placeholder="Cari nama, SKU, atau kategori..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Cari produk"
        />
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {loading && !products && <LoadingState />}
        {error && (
          <div className="p-4">
            <ErrorState message={error} onRetry={reload} />
          </div>
        )}

        {products && products.length === 0 && (
          <EmptyState
            title={query ? 'Produk tidak ditemukan' : 'Belum ada produk'}
            description={
              query ? 'Coba kata kunci lain.' : 'Tambahkan produk pertama untuk mulai berjualan.'
            }
          />
        )}

        {products && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>SKU</th>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Kategori</th>
                  <th className={`${thClass} text-right`}>{can('cost:view') ? 'Harga Beli' : 'Modal'}</th>
                  <th className={`${thClass} text-right`}>Harga Jual</th>
                  <th className={`${thClass} text-right`}>Stok</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className={product.isActive ? 'hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'}>
                    <td className={`${tdClass} text-slate-500`}>{product.sku}</td>
                    <td className={`${tdClass} font-medium ${product.isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                      {product.name}
                    </td>
                    <td className={`${tdClass} ${product.isActive ? '' : 'text-slate-400'}`}>{product.category}</td>
                    <td className={`${tdClass} text-right`}>
                      {product.purchasePrice !== undefined ? (
                        formatRupiah(product.purchasePrice)
                      ) : (
                        <span className="text-xs text-slate-400 font-mono" title="Harga modal disembunyikan untuk staf">
                          🔒 Terkunci
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>{formatRupiah(product.sellingPrice)}</td>
                    <td className={`${tdClass} text-right`}>
                      <div
                        className={
                          product.stock <= LOW_STOCK_THRESHOLD && product.isActive
                            ? 'font-semibold text-red-600'
                            : 'text-slate-900'
                        }
                      >
                        <div>
                          {formatNumber(product.stock)} {product.baseUnit}
                        </div>
                        {product.unitsPerPurchaseUnit > 1 &&
                          product.purchaseUnit !== product.baseUnit &&
                          Math.floor(product.stock / product.unitsPerPurchaseUnit) > 0 && (
                            <div className="text-xs text-slate-500 font-normal">
                              = {Math.floor(product.stock / product.unitsPerPurchaseUnit)}{' '}
                              {product.purchaseUnit} +{' '}
                              {product.stock % product.unitsPerPurchaseUnit} {product.baseUnit}
                            </div>
                          )}
                      </div>
                    </td>
                    <td className={tdClass}>
                      {product.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-right space-x-1`}>
                      {can('stock:adjust') && (
                        <button
                          type="button"
                          className={btnSmall}
                          onClick={() => setAdjustTarget(product)}
                        >
                          Stok
                        </button>
                      )}
                      {can('product:manage') && (
                        <button
                          type="button"
                          className={btnSmall}
                          onClick={() => setFormState({ mode: 'edit', product })}
                        >
                          Ubah
                        </button>
                      )}
                      {can('product:manage') && (
                        product.isActive ? (
                          <button
                            type="button"
                            className="rounded px-2 py-1 text-sm font-medium text-amber-700 hover:bg-amber-50"
                            onClick={() => setDeactivateTarget(product)}
                          >
                            Nonaktifkan
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded px-2 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                            onClick={() => void handleActivate(product)}
                          >
                            Aktifkan
                          </button>
                        )
                      )}
                      {can('product:manage') && (
                        <button
                          type="button"
                          className={btnSmallDanger}
                          onClick={() => setDeleteTarget(product)}
                        >
                          Hapus
                        </button>
                      )}
                      {!can('stock:adjust') && !can('product:manage') && (
                        <span className="text-xs text-slate-400">Hanya Lihat</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formState && (
        <ProductFormModal
          product={formState.mode === 'edit' ? formState.product : null}
          onClose={() => setFormState(null)}
          onSaved={(saved) => {
            toast.success(
              formState.mode === 'edit'
                ? `Produk "${saved.name}" berhasil diperbarui.`
                : `Produk "${saved.name}" berhasil ditambahkan.`,
            );
            setFormState(null);
            reload();
          }}
        />
      )}

      {adjustTarget && (
        <StockAdjustmentModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSaved={() => {
            toast.success(`Stok "${adjustTarget.name}" berhasil disesuaikan.`);
            setAdjustTarget(null);
            reload();
          }}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Nonaktifkan produk?"
          message={`Produk "${deactivateTarget.name}" akan dinonaktifkan dan tidak dapat dipilih untuk penjualan baru. Riwayat transaksi dan pergerakan stok tetap tersimpan.`}
          confirmLabel="Nonaktifkan"
          busy={deactivating}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Hapus produk?"
          message={`Produk "${deleteTarget.name}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Hapus"
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
