import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/produk', label: 'Produk' },
  { to: '/purchase-orders', label: 'Purchase Order' },
  { to: '/barang-masuk', label: 'Barang Masuk' },
  { to: '/penjualan/baru', label: 'Penjualan Baru' },
  { to: '/riwayat-penjualan', label: 'Riwayat Penjualan' },
  { to: '/riwayat-stok', label: 'Riwayat Stok' },
  { to: '/permissions', label: 'Manajemen Izin' },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base = 'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors';
  return isActive
    ? `${base} bg-green-50 text-green-700 font-semibold`
    : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
}

export function Layout() {
  const { user, isOwner, quickSwitch, logout } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleQuickSwitch = async (username: string, pin: string) => {
    setIsSwitching(true);
    try {
      await quickSwitch(username, pin);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col border-b border-slate-200 bg-white md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 py-4 md:py-6">
          <p className="text-base font-bold text-slate-900">Warung Madura</p>
          <p className="text-xs text-slate-500">Stock & Security Manager</p>
        </div>

        {/* User Card & Role Switcher */}
        <div className="mx-3 mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-slate-800">{user ? user.name : 'Belum Login'}</p>
              <p className="text-slate-500 font-mono text-[11px]">@{user?.username ?? '-'}</p>
            </div>
            {user && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isOwner
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {user.role}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  title="Keluar (Logout)"
                  className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Keluar
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/80 pt-2 mt-2">
            <p className="text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
              Quick Role Switch (Demo):
            </p>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                disabled={isSwitching || user?.username === 'cakrofi'}
                onClick={() => handleQuickSwitch('cakrofi', '123456')}
                className={`rounded py-1 px-1 text-[11px] font-medium text-center transition-colors ${
                  user?.username === 'cakrofi'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
                }`}
                title="Cak Rofi (PEMILIK - PIN: 123456)"
              >
                👑 Rofi
              </button>
              <button
                type="button"
                disabled={isSwitching || user?.username === 'udin'}
                onClick={() => handleQuickSwitch('udin', '1111')}
                className={`rounded py-1 px-1 text-[11px] font-medium text-center transition-colors ${
                  user?.username === 'udin'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50'
                }`}
                title="Udin (STAF - PIN: 1111)"
              >
                👤 Udin
              </button>
              <button
                type="button"
                disabled={isSwitching || user?.username === 'sari'}
                onClick={() => handleQuickSwitch('sari', '2222')}
                className={`rounded py-1 px-1 text-[11px] font-medium text-center transition-colors ${
                  user?.username === 'sari'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50'
                }`}
                title="Sari (STAF - PIN: 2222)"
              >
                👤 Sari
              </button>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="p-3 border-t border-slate-100 hidden md:block">
            <button
              type="button"
              onClick={logout}
              className="w-full text-left rounded-md px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors"
            >
              Keluar (Logout)
            </button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
