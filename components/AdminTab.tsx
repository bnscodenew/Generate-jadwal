'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Key, Plus, Copy, Check, Trash2, ToggleLeft, ToggleRight, TrendingUp, BarChart2, CheckCircle, Search, HelpCircle } from 'lucide-react';
import { LocalDB } from '../lib/db';
import { getSupabaseClient, isSupabaseModeActive } from '../lib/supabaseClient';

interface AdminTabProps {
  currentUser: any;
  setLogMessages: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AdminTab({ currentUser, setLogMessages }: AdminTabProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [serialKeys, setSerialKeys] = useState<any[]>([]);
  const [genQuantity, setGenQuantity] = useState(3);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [keyFilter, setKeyFilter] = useState<'all' | 'available' | 'used'>('all');

  // Load data from LocalDB or Supabase
  const loadAdminData = async () => {
    if (isSupabaseModeActive()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*');
          if (!error && profiles) {
            // Map Supabase profile data to user format expected by AdminTab
            const mapped = profiles.map((p: any) => ({
              username: p.id, // Supabase UUID
              email: p.email || '',
              nama_sekolah: p.nama_sekolah,
              is_pro: p.is_pro,
              serial_key: p.serial_key,
              activated_at: p.activated_at,
              role: p.role || 'user',
              isGoogle: true
            }));
            setUsers(mapped);
          } else {
            console.error("Gagal load profile dari Supabase:", error);
            // Fallback ke local
            setUsers(LocalDB.getUsers());
          }
        } catch (err) {
          console.error("Gagal mengambil daftar pengguna dari Supabase:", err);
          setUsers(LocalDB.getUsers());
        }
      } else {
        setUsers(LocalDB.getUsers());
      }
    } else {
      setUsers(LocalDB.getUsers());
    }
    setSerialKeys(LocalDB.getSerialKeys());
  };

  useEffect(() => {
    // Jalankan asinkron untuk mencegah warning ESLint set-state-in-effect
    const timer = setTimeout(() => {
      loadAdminData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerateKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (genQuantity < 1 || genQuantity > 20) return;

    const newKeys = LocalDB.generateSerialKeys(genQuantity);
    loadAdminData();
    setLogMessages(prev => [
      `Admin berhasil menghasilkan ${genQuantity} Kode Serial baru secara massal.`,
      ...prev
    ]);
  };

  const handleCopyKey = (key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleToggleUserPro = async (username: string, currentIsPro: boolean) => {
    if (isSupabaseModeActive()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const nextIsPro = !currentIsPro;
          const { error } = await supabase
            .from('profiles')
            .update({
              is_pro: nextIsPro,
              serial_key: nextIsPro ? 'CLOUD-ACTIVATED' : null,
              activated_at: nextIsPro ? new Date().toISOString() : null
            })
            .eq('id', username);
          
          if (!error) {
            setLogMessages(prev => [
              `Admin memperbarui status PRO akun di Supabase (ID: ${username}) menjadi ${nextIsPro ? 'PRO' : 'TRIAL'}.`,
              ...prev
            ]);
            loadAdminData();
          } else {
            alert(`Gagal memperbarui status di Supabase: ${error.message}`);
          }
        } catch (err: any) {
          alert(`Error: ${err.message}`);
        }
      }
    } else {
      const success = LocalDB.updateUserProStatus(username, !currentIsPro);
      if (success) {
        loadAdminData();
        setLogMessages(prev => [
          `Admin memperbarui status @${username} secara manual menjadi ${!currentIsPro ? 'PRO' : 'TRIAL'}.`,
          ...prev
        ]);
      }
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username.toLowerCase() === 'admin') {
      alert('Tidak dapat menghapus super-admin default.');
      return;
    }
    
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus akun pengguna? Semua data miliknya akan hilang.`);
    if (!confirmDelete) return;

    if (isSupabaseModeActive()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', username);
          
          if (!error) {
            setLogMessages(prev => [
              `Admin menghapus data profil pengguna (ID: ${username}) dari database Supabase.`,
              ...prev
            ]);
            loadAdminData();
          } else {
            alert(`Gagal menghapus pengguna dari Supabase: ${error.message}`);
          }
        } catch (err: any) {
          alert(`Error: ${err.message}`);
        }
      }
    } else {
      const allUsers = LocalDB.getUsers();
      const filteredUsers = allUsers.filter(u => u.username.toLowerCase() !== username.toLowerCase());
      LocalDB.saveUsers(filteredUsers);
      
      // Also clean up any keys associated
      const userKeys = LocalDB.getSerialKeys();
      const updatedKeys = userKeys.map(k => {
        if (k.used_by?.toLowerCase() === username.toLowerCase()) {
          return { ...k, is_used: false, used_by: null, activated_at: null };
        }
        return k;
      });
      LocalDB.saveSerialKeys(updatedKeys);

      loadAdminData();
      setLogMessages(prev => [
        `Admin menghapus akun pengguna @${username} dari database platform.`,
        ...prev
      ]);
    }
  };

  // Metrics calculations
  const totalUsersCount = users.length;
  const proUsersCount = users.filter(u => u.is_pro).length;
  const trialUsersCount = totalUsersCount - proUsersCount;

  const totalKeysCount = serialKeys.length;
  const usedKeysCount = serialKeys.filter(k => k.is_used).length;
  const availableKeysCount = totalKeysCount - usedKeysCount;

  // Filter keys
  const filteredKeys = serialKeys.filter(k => {
    if (keyFilter === 'available') return !k.is_used;
    if (keyFilter === 'used') return k.is_used;
    return true;
  }).reverse(); // Show newest first

  // Filter users by search term
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.nama_sekolah && u.nama_sekolah.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Header */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
        <div className="text-xs">
          <span className="font-extrabold uppercase">Mode Konsol Administrator:</span> Anda sedang melihat data lisensi global dan manajemen user platform. Pastikan untuk menjaga kerahasiaan Kode Serial yang dihasilkan demi keadilan lisensi sekolah.
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase font-mono">Total Akun Sekolah</div>
            <div className="text-xl font-black text-slate-900">{totalUsersCount}</div>
            <div className="text-[9px] text-slate-400 font-semibold mt-0.5">Semua registrasi terdaftar</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase font-mono">Pengguna PRO</div>
            <div className="text-xl font-black text-emerald-600">{proUsersCount}</div>
            <div className="text-[9px] text-emerald-500 font-bold mt-0.5">
              {totalUsersCount > 0 ? Math.round((proUsersCount / totalUsersCount) * 100) : 0}% Rasio Aktivasi
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase font-mono">Pengguna Trial</div>
            <div className="text-xl font-black text-slate-700">{trialUsersCount}</div>
            <div className="text-[9px] text-slate-400 font-semibold mt-0.5">Dalam masa evaluasi</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-600">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase font-mono">Serial Tersedia</div>
            <div className="text-xl font-black text-amber-600">{availableKeysCount}</div>
            <div className="text-[9px] text-slate-400 font-semibold mt-0.5">Dari total {totalKeysCount} Kode</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Management Table (Col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Manajemen Lisensi Pengguna
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">Aktifkan atau hapus akses sekolah sekolah terdaftar.</p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Cari sekolah/username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-48"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] bg-slate-50/50">
                  <th className="py-2.5 px-3">Username &amp; Sekolah</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Serial Terpakai</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      Tidak menemukan pengguna yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.username} className="hover:bg-slate-50/40">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span>{u.email ? u.email : `@${u.username}`}</span>
                          {(u.role === 'admin' || u.role === 'Administrator') && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium max-w-[200px] truncate" title={u.nama_sekolah}>
                          {u.nama_sekolah || 'Nama sekolah tidak diset'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {u.is_pro ? (
                          <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold">
                            PRO
                          </span>
                        ) : (
                          <span className="inline-flex px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold">
                            TRIAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                        {u.serial_key ? (
                          <span className="text-indigo-600 font-bold">{u.serial_key}</span>
                        ) : (
                          <span className="text-slate-300 italic">Tidak ada</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleUserPro(u.username, !!u.is_pro)}
                            className="p-1 transition text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                            title={u.is_pro ? "Ubah ke Akun Trial" : "Paksa Upgrade ke PRO"}
                          >
                            {u.is_pro ? (
                              <ToggleRight className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(u.username)}
                            className="p-1 transition text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                            disabled={u.username.toLowerCase() === 'admin' || u.role === 'admin' || u.role === 'Administrator' || u.email?.toLowerCase() === 'balkhi05@gmail.com'}
                            title="Hapus Akun Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Serial Keys Generator & List (Col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Key Generator Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Generator Serial Massal
            </h3>
            
            <form onSubmit={handleGenerateKeys} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase font-mono tracking-wider mb-1">
                  Jumlah Serial
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={genQuantity}
                  onChange={(e) => setGenQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                Generate
              </button>
            </form>
          </div>

          {/* Serial Keys List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daftar Kode Serial</h3>
                <p className="text-[9px] text-slate-400 font-semibold">Salin kode di bawah untuk didistribusikan.</p>
              </div>

              {/* Filters */}
              <div className="flex gap-1.5 text-[9px] font-bold">
                <button
                  onClick={() => setKeyFilter('all')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${keyFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setKeyFilter('available')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${keyFilter === 'available' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Tersedia
                </button>
                <button
                  onClick={() => setKeyFilter('used')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${keyFilter === 'used' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Terpakai
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredKeys.length === 0 ? (
                <div className="py-6 text-center text-slate-400 italic text-xs">
                  Tidak ada serial key yang cocok.
                </div>
              ) : (
                filteredKeys.map(k => (
                  <div key={k.key} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/40 transition">
                    <div className="font-mono text-xs font-extrabold text-slate-700 tracking-wider">
                      {k.key}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {k.is_used ? (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold" title={`Diaktifkan oleh @${k.used_by}`}>
                          @{k.used_by}
                        </span>
                      ) : (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold">
                          Ready
                        </span>
                      )}

                      <button
                        onClick={() => handleCopyKey(k.key)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-slate-200 bg-slate-50 shadow-xs cursor-pointer"
                        title="Salin Serial Key"
                      >
                        {copiedKey === k.key ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
