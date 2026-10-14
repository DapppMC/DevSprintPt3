import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageHeader } from './components/PageHeader';
import { btnSecondary } from './components/ui';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { GoodsReceiptsPage } from './pages/GoodsReceiptsPage';
import { LoginPage } from './pages/LoginPage';
import { NewSalePage } from './pages/NewSalePage';
import { PermissionsPage } from './pages/PermissionsPage';
import { ProductsPage } from './pages/ProductsPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { SaleDetailPage } from './pages/SaleDetailPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { StockHistoryPage } from './pages/StockHistoryPage';

function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Halaman tidak ditemukan" description="Alamat yang kamu buka tidak tersedia." />
      <Link to="/" className={btnSecondary}>
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-green-600" />
          <p className="text-sm font-medium">Memuat Warung Madura...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="produk" element={<ProductsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="barang-masuk" element={<GoodsReceiptsPage />} />
        <Route path="penjualan/baru" element={<NewSalePage />} />
        <Route path="riwayat-penjualan" element={<SalesHistoryPage />} />
        <Route path="riwayat-penjualan/:id" element={<SaleDetailPage />} />
        <Route path="riwayat-stok" element={<StockHistoryPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
