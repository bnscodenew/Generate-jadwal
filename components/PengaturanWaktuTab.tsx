'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Hari, JamPelajaran } from '../lib/types';
import { LocalDB } from '../lib/db';

interface PengaturanWaktuTabProps {
  hariAktif: Hari[];
  jamPelajaran: JamPelajaran[];
  onUpdateHariAktif: (hari: Hari[]) => void;
  onUpdateJamPelajaran: (jam: JamPelajaran[]) => void;
  loadDatabase: () => void;
  setLogMessages: React.Dispatch<React.SetStateAction<string[]>>;
}

const SEMUA_HARI: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function PengaturanWaktuTab({
  hariAktif,
  jamPelajaran,
  onUpdateHariAktif,
  onUpdateJamPelajaran,
  loadDatabase,
  setLogMessages,
}: PengaturanWaktuTabProps) {
  // Periods form states
  const [newJamKe, setNewJamKe] = useState<number>(jamPelajaran.length + 1);
  const [newJamMulai, setNewJamMulai] = useState<string>('07:30');
  const [newJamSelesai, setNewJamSelesai] = useState<string>('08:15');

  const [editPeriodId, setEditPeriodId] = useState<string | null>(null);
  const [editJamMulai, setEditJamMulai] = useState<string>('');
  const [editJamSelesai, setEditJamSelesai] = useState<string>('');

  const handleToggleDay = (day: Hari) => {
    let updated: Hari[];
    if (hariAktif.includes(day)) {
      if (hariAktif.length <= 1) {
        alert('Minimal harus ada 1 hari aktif dalam seminggu.');
        return;
      }
      
      // Check if there are schedules on this day
      const schedules = LocalDB.getJadwal();
      const hasSchedules = schedules.some(s => s.hari === day);
      if (hasSchedules) {
        const confirmRemove = window.confirm(
          `Peringatan: Terdapat jadwal pelajaran aktif pada hari ${day}. Jika Anda menonaktifkan hari ini, jadwal terkait mungkin tidak akan ditampilkan. Apakah Anda yakin ingin melanjutkan?`
        );
        if (!confirmRemove) return;
      }
      
      updated = hariAktif.filter(d => d !== day);
    } else {
      // Keep natural order when adding days
      updated = SEMUA_HARI.filter(d => d === day || hariAktif.includes(d));
    }
    
    onUpdateHariAktif(updated);
    LocalDB.saveHariAktif(updated);
    loadDatabase();
    setLogMessages(prev => [
      `📅 Konfigurasi Hari Aktif diperbarui: [${updated.join(', ')}]`,
      ...prev
    ]);
  };

  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (jamPelajaran.some(p => p.jam_ke === newJamKe)) {
      alert(`Jam ke-${newJamKe} sudah ada. Silakan gunakan nomor jam pelajaran yang lain.`);
      return;
    }

    const newPeriod: JamPelajaran = {
      id: `period-${Date.now()}`,
      jam_ke: newJamKe,
      jam_mulai: newJamMulai,
      jam_selesai: newJamSelesai,
    };

    const updated = [...jamPelajaran, newPeriod].sort((a, b) => a.jam_ke - b.jam_ke);
    onUpdateJamPelajaran(updated);
    LocalDB.saveJamPelajaran(updated);
    loadDatabase();

    // Setup defaults for next entry
    setNewJamKe(updated.length + 1);
    setLogMessages(prev => [
      `⏰ Menambahkan Jam Pelajaran Baru: Jam Ke-${newJamKe} (${newJamMulai} - ${newJamSelesai})`,
      ...prev
    ]);
  };

  const handleDeletePeriod = (id: string, jamKe: number) => {
    // Check if schedules exist for this period
    const schedules = LocalDB.getJadwal();
    const hasSchedules = schedules.some(s => s.jam_ke === jamKe);
    if (hasSchedules) {
      const confirmDelete = window.confirm(
        `Peringatan: Terdapat jadwal pelajaran aktif pada Jam Ke-${jamKe}. Menghapus jam ini dapat memicu konflik visual. Apakah Anda yakin?`
      );
      if (!confirmDelete) return;
    }

    const updated = jamPelajaran.filter(p => p.id !== id);
    onUpdateJamPelajaran(updated);
    LocalDB.saveJamPelajaran(updated);
    loadDatabase();
    
    setLogMessages(prev => [
      `🗑️ Menghapus Jam Pelajaran Ke-${jamKe}`,
      ...prev
    ]);
  };

  const startEditPeriod = (p: JamPelajaran) => {
    setEditPeriodId(p.id);
    setEditJamMulai(p.jam_mulai);
    setEditJamSelesai(p.jam_selesai);
  };

  const handleSaveEditPeriod = (id: string) => {
    const updated = jamPelajaran.map(p => {
      if (p.id === id) {
        return {
          ...p,
          jam_mulai: editJamMulai,
          jam_selesai: editJamSelesai
        };
      }
      return p;
    });

    onUpdateJamPelajaran(updated);
    LocalDB.saveJamPelajaran(updated);
    loadDatabase();
    setEditPeriodId(null);
    setLogMessages(prev => [
      `📝 Jam Pelajaran diperbarui.`,
      ...prev
    ]);
  };

  // Preset quick configurations
  const applyPreset6Days = () => {
    const days: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    onUpdateHariAktif(days);
    LocalDB.saveHariAktif(days);
    loadDatabase();
    setLogMessages(prev => [`📅 Menerapkan preset: 6 Hari Kerja (Senin - Sabtu).`, ...prev]);
  };

  const applyPreset5Days = () => {
    const days: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    onUpdateHariAktif(days);
    LocalDB.saveHariAktif(days);
    loadDatabase();
    setLogMessages(prev => [`📅 Menerapkan preset: 5 Hari Kerja (Senin - Jumat).`, ...prev]);
  };

  const applyPresetPesantren = () => {
    const days: Hari[] = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
    onUpdateHariAktif(days);
    LocalDB.saveHariAktif(days);
    loadDatabase();
    setLogMessages(prev => [`📅 Menerapkan preset pesantren: Sabtu - Kamis (Jumat Libur).`, ...prev]);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Pengaturan Kalender &amp; Waktu Sekolah
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasikan hari aktif mingguan serta struktur jam pelajaran harian yang digunakan oleh sekolah secara dinamis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: HARI AKTIF */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800">Hari Sekolah Aktif</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Tentukan hari-hari dalam seminggu di mana kegiatan belajar mengajar berlangsung. Penjadwal otomatis hanya akan menempatkan slot pelajaran pada hari yang terpilih.
            </p>

            {/* Checkbox selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SEMUA_HARI.map((day) => {
                const isActive = hariAktif.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-semibold ring-1 ring-indigo-100'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs">{day}</span>
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isActive && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* QUICK PRESETS */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Preset Cepat Hari Sekolah</span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={applyPreset6Days}
                  className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                >
                  🏫 Regular: 6 Hari Kerja <span className="text-slate-400 font-normal">(Senin - Sabtu)</span>
                </button>
                <button
                  type="button"
                  onClick={applyPreset5Days}
                  className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                >
                  🏢 Full Day: 5 Hari Kerja <span className="text-slate-400 font-normal">(Senin - Jumat)</span>
                </button>
                <button
                  type="button"
                  onClick={applyPresetPesantren}
                  className="w-full text-left px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                >
                  🕌 Pesantren: Sabtu - Kamis <span className="text-slate-400 font-normal">(Jumat Libur)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: JAM PELAJARAN */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800">Daftar Jam Pelajaran</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Kelola nomor urutan jam pelajaran beserta rentang waktu aslinya. Anda bisa menambahkan atau menghapus jam pelajaran agar selaras dengan jadwal harian sekolah Anda.
            </p>

            {/* Form to add period */}
            <form onSubmit={handleAddPeriod} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tight">Jam Ke-</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={newJamKe}
                  onChange={(e) => setNewJamKe(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tight">Mulai</label>
                <input
                  type="text"
                  placeholder="07:30"
                  value={newJamMulai}
                  onChange={(e) => setNewJamMulai(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tight">Selesai</label>
                <input
                  type="text"
                  placeholder="08:15"
                  value={newJamSelesai}
                  onChange={(e) => setNewJamSelesai(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </form>

            {/* List of Periods */}
            <div className="border border-slate-150 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-mono text-slate-500 uppercase font-bold">
                    <th className="p-3">Urutan</th>
                    <th className="p-3">Jam Mulai</th>
                    <th className="p-3">Jam Selesai</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {jamPelajaran.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                        Belum ada jam pelajaran yang dikonfigurasi.
                      </td>
                    </tr>
                  ) : (
                    jamPelajaran.map((p) => {
                      const isEditing = editPeriodId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/40">
                          <td className="p-3 font-bold text-slate-800">
                            Jam Ke-{p.jam_ke}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editJamMulai}
                                onChange={(e) => setEditJamMulai(e.target.value)}
                                className="px-2 py-1 border border-slate-300 rounded text-xs font-mono w-20 focus:outline-indigo-500 font-bold"
                              />
                            ) : (
                              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                {p.jam_mulai}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editJamSelesai}
                                onChange={(e) => setEditJamSelesai(e.target.value)}
                                className="px-2 py-1 border border-slate-300 rounded text-xs font-mono w-20 focus:outline-indigo-500 font-bold"
                              />
                            ) : (
                              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                {p.jam_selesai}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditPeriod(p.id)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditPeriodId(null)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold transition cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditPeriod(p)}
                                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-semibold hover:underline cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePeriod(p.id, p.jam_ke)}
                                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                    title="Hapus Jam Pelajaran"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
