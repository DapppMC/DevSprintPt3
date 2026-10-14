import { useEffect, useState } from 'react';
import { getPermissionsMatrix, updateRolePermissions } from '../api/auth';
import { PageHeader } from '../components/PageHeader';
import { ErrorState, LoadingState } from '../components/StateViews';
import { btnPrimary, btnSecondary, tableHeadClass, tdClass, thClass } from '../components/ui';
import { useAuth } from '../lib/AuthContext';
import type { RolePermissionsMatrix } from '../types/api';

export function PermissionsPage() {
  const { isOwner, refreshUser } = useAuth();
  const [data, setData] = useState<RolePermissionsMatrix | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPermissionsMatrix();
      setData(res);
      const staffPerms = res.roles?.STAF || res.matrix?.STAF || [];
      setStaffPermissions(new Set(staffPerms));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat matriks izin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStaff = (permissionId: string) => {
    setStaffPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateRolePermissions('STAF', Array.from(staffPermissions));
      setSuccessMessage('Hak akses Staf berhasil diperbarui dan disimpan ke database!');
      await refreshUser();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hak akses.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (!data) return;
    const staffPerms = data.roles?.STAF || data.matrix?.STAF || [];
    setStaffPermissions(new Set(staffPerms));
    setSuccessMessage(null);
  };

  if (isLoading) return <LoadingState label="Memuat matriks perizinan..." />;
  if (error && !data) return <ErrorState message={error} onRetry={loadData} />;
  if (!data) return null;

  const definitions = data.definitions || data.permissions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Permission Manager"
        description="Atur matriks perizinan dinamis untuk setiap role. Perubahan tersimpan di database dan berlaku instan pada REST API."
      />

      {!isOwner && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-semibold">Perhatian:</span> Anda login sebagai Staf. Halaman ini hanya dapat diubah oleh Pemilik (Role: PEMILIK).
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Kategori</th>
                <th className={thClass}>Kode & Izin</th>
                <th className={thClass}>Deskripsi Bisnis</th>
                <th className={`${thClass} text-center`}>Pemilik (Owner)</th>
                <th className={`${thClass} text-center`}>Staf Toko</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {definitions.map((def) => {
                const isStaffAllowed = staffPermissions.has(def.id);
                return (
                  <tr key={def.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className={`${tdClass} font-medium text-slate-700`}>
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {def.category}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <div className="font-semibold text-slate-900">{def.label}</div>
                      <code className="text-xs text-slate-400">{def.id}</code>
                    </td>
                    <td className={`${tdClass} text-xs text-slate-600`}>
                      {def.description}
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100/70 px-2.5 py-1 rounded-full">
                        ✓ Selalu Aktif
                      </span>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <label className="inline-flex cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                          checked={isStaffAllowed}
                          disabled={!isOwner || isSaving}
                          onChange={() => handleToggleStaff(def.id)}
                        />
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isOwner && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <p className="text-xs text-slate-500">
              Perubahan pada izin Staf akan langsung memengaruhi akses API (403 Forbidden bila dinonaktifkan).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={handleResetToDefault}
                disabled={isSaving}
              >
                Reset Perubahan
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Hak Akses'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
