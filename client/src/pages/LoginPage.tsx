import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) {
      setErrorMessage('Username dan PIN wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login(username.trim(), pin.trim());
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Username atau PIN salah.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (user: string, defaultPin: string) => {
    setUsername(user);
    setPin(defaultPin);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login(user, defaultPin);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 text-white font-bold text-2xl shadow-lg shadow-green-600/30 mb-4">
          WM
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Warung Madura Stock Manager
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Sistem Manajemen Stok & Keamanan Akses (RBAC)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl sm:px-10 border border-slate-200">
          <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
            Masuk ke Akun Anda
          </h3>

          {errorMessage && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 flex items-center gap-2">
              <span className="font-semibold">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: cakrofi, udin, sari"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>

            <div>
              <label htmlFor="pin" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                PIN / Password
              </label>
              <input
                id="pin"
                type="password"
                autoComplete="current-password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN rahasia"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Memverifikasi PIN...
                </span>
              ) : (
                'Masuk Sekarang'
              )}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              Pilih Akun Demo (1-Klik Masuk):
            </p>

            <div className="space-y-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('cakrofi', '123456')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👑</span>
                    <span className="text-sm font-bold text-slate-900">Cak Rofi</span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                      PEMILIK
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    User: <code className="font-mono font-semibold">cakrofi</code> · PIN: <code className="font-mono font-semibold">123456</code> (Akses Penuh + Omset)
                  </p>
                </div>
                <span className="text-xs font-semibold text-amber-700 group-hover:underline">
                  Masuk →
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('udin', '1111')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <span className="text-sm font-bold text-slate-900">Udin</span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-200 text-blue-900">
                      STAF (Pagi)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    User: <code className="font-mono font-semibold">udin</code> · PIN: <code className="font-mono font-semibold">1111</code> (Modal & Omset Disensor)
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-700 group-hover:underline">
                  Masuk →
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('sari', '2222')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <span className="text-sm font-bold text-slate-900">Sari</span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-200 text-purple-900">
                      STAF (Malam)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    User: <code className="font-mono font-semibold">sari</code> · PIN: <code className="font-mono font-semibold">2222</code> (Modal & Omset Disensor)
                  </p>
                </div>
                <span className="text-xs font-semibold text-purple-700 group-hover:underline">
                  Masuk →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
