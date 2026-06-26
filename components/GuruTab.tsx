'use client';

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Info } from 'lucide-react';
import { Guru, PreferensiGuru, Hari } from '../lib/types';

interface GuruTabProps {
  guru: Guru[];
  preferensi: PreferensiGuru[];
  newGuru: Partial<Guru>;
  setNewGuru: React.Dispatch<React.SetStateAction<Partial<Guru>>>;
  handleAddGuru: (e: React.FormEvent) => void;
  handleDeleteGuru: (id: string) => void;
  onSavePreferensi: (guruId: string, updatedPref: {
    hari_tidak_bersedia: Hari[];
    jam_tidak_bersedia: number[];
    hari_favorit: Hari[];
    jam_favorit: number[];
    max_jam_per_hari: number;
  }) => void;
  hariAktif: Hari[];
}

export default function GuruTab({
  guru,
  preferensi,
  newGuru,
  setNewGuru,
  handleAddGuru,
  handleDeleteGuru,
  onSavePreferensi,
  hariAktif
}: GuruTabProps) {
  // Preference modal states
  const [preferensiModalGuruId, setPreferensiModalGuruId] = useState<string | null>(null);
  const [prefDaysBlocked, setPrefDaysBlocked] = useState<Hari[]>([]);
  const [prefSlotsBlocked, setPrefSlotsBlocked] = useState<number[]>([]);
  const [prefDaysFav, setPrefDaysFav] = useState<Hari[]>([]);
  const [prefSlotsFav, setPrefSlotsFav] = useState<number[]>([]);
  const [prefMaxHours, setPrefMaxHours] = useState<number>(6);

  const openPreferencesModal = (guruId: string) => {
    const existing = preferensi.find(p => p.guru_id === guruId);
    setPreferensiModalGuruId(guruId);
    
    if (existing) {
      setPrefDaysBlocked(existing.hari_tidak_bersedia);
      setPrefSlotsBlocked(existing.jam_tidak_bersedia);
      setPrefDaysFav(existing.hari_favorit);
      setPrefSlotsFav(existing.jam_favorit);
      setPrefMaxHours(existing.max_jam_per_hari || 6);
    } else {
      setPrefDaysBlocked([]);
      setPrefSlotsBlocked([]);
      setPrefDaysFav([]);
      setPrefSlotsFav([]);
      setPrefMaxHours(6);
    }
  };

  const toggleDayBlocked = (d: Hari) => {
    setPrefDaysBlocked(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };
  const toggleSlotBlocked = (s: number) => {
    setPrefSlotsBlocked(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const toggleDayFav = (d: Hari) => {
    setPrefDaysFav(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };
  const toggleSlotFav = (s: number) => {
    setPrefSlotsFav(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSavePreferences = () => {
    if (!preferensiModalGuruId) return;
    onSavePreferensi(preferensiModalGuruId, {
      hari_tidak_bersedia: prefDaysBlocked,
      jam_tidak_bersedia: prefSlotsBlocked,
      hari_favorit: prefDaysFav,
      jam_favorit: prefSlotsFav,
      max_jam_per_hari: prefMaxHours
    });
    setPreferensiModalGuruId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Kelola Guru &amp; Preferensi SMAN 1 AI</h2>
          <p className="text-xs text-slate-500">Silakan tambahkan data guru pengajar beserta konfigurasi jam kerja pengampunya.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* FORM ADD TEACHER */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
          <h3 className="font-semibold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-indigo-600" /> Tambah Guru Baru
          </h3>
          
          <form onSubmit={handleAddGuru} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Nama Lengkap &amp; Gelar</label>
              <input 
                type="text" 
                value={newGuru.nama || ''}
                onChange={(e) => setNewGuru({...newGuru, nama: e.target.value})}
                placeholder="contoh: Dr. Ahmad S., M.Pd."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Nomor Induk Pegawai (NIP)</label>
              <input 
                type="text" 
                value={newGuru.nip || ''}
                onChange={(e) => setNewGuru({...newGuru, nip: e.target.value})}
                placeholder="contoh: 198105122009021003"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Jenis Kelamin</label>
                <select 
                  value={newGuru.jenis_kelamin || 'Laki-laki'}
                  onChange={(e) => setNewGuru({...newGuru, jenis_kelamin: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Nomor HP / WA</label>
                <input 
                  type="text" 
                  value={newGuru.no_hp || ''}
                  onChange={(e) => setNewGuru({...newGuru, no_hp: e.target.value})}
                  placeholder="0812..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="status_aktif"
                checked={newGuru.status_aktif !== undefined ? newGuru.status_aktif : true}
                onChange={(e) => setNewGuru({...newGuru, status_aktif: e.target.checked})}
                className="accent-indigo-650"
              />
              <label htmlFor="status_aktif" className="text-slate-700 font-semibold selection:bg-transparent">Status Aktif Mengajar</label>
            </div>

            <button 
              type="submit" 
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer"
            >
              Daftarkan Guru
            </button>
          </form>
        </div>

        {/* TEACHER LIST VIEW */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 space-y-4 shadow-xs">
          <h3 className="font-semibold text-slate-800 text-sm">Daftar Tenaga Pendidik</h3>
          
          <div className="overflow-x-auto text-xs font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-550 font-mono text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-3">Guru &amp; NIP</th>
                  <th className="py-2.5 px-3">Jenis Kelamin</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Preferensi</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guru.map((g) => {
                  const gPref = preferensi.find(p => p.guru_id === g.id);
                  const hasCustomPref = gPref && (
                    gPref.hari_tidak_bersedia.length > 0 || 
                    gPref.jam_tidak_bersedia.length > 0 ||
                    gPref.hari_favorit.length > 0 || 
                    gPref.jam_favorit.length > 0
                  );

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/55 group">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{g.nama}</div>
                        <div className="text-[10px] text-slate-450 font-mono mt-0.5 font-semibold">NIP {g.nip}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{g.jenis_kelamin}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${g.status_aktif ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {g.status_aktif ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button 
                          onClick={() => openPreferencesModal(g.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${hasCustomPref ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs' : 'bg-slate-50 text-slate-605 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 shadow-xs'}`}
                        >
                          <Edit3 className="w-3 h-3" /> {hasCustomPref ? 'Ada Aturan' : 'Atur Pref'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button 
                          onClick={() => handleDeleteGuru(g.id)}
                          className="text-rose-605 hover:text-rose-850 p-1.5 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* INDONESIAN INSTRUCTION */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl text-xs space-y-1 shadow-xs font-sans">
        <span className="font-bold text-indigo-700 block text-xs">Keterangan Aturan Preferensi (Bahasa Indonesia):</span>
        <p className="text-slate-500 leading-relaxed font-medium">
          Menyediakan slot guru istirahat / hari libur tidak bersedia membantu penjadwalan menyesuaikan kondisi riil tiap guru. Misalnya, jika guru memiliki kewajiban administrasi di hari Senin, menyetel <i>Hari Tidak Bersedia: Senin</i> akan mencegah sistem meletakkan jadwal apapun pada hari tersebut agar terhindar dari bentrok fisik.
        </p>
      </div>

      {/* PREFERENCE MODAL */}
      {preferensiModalGuruId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in text-xs max-h-[90vh] flex flex-col font-sans">
            
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Konstruksi Aturan Preferensi Guru</h4>
                <p className="text-[11px] text-slate-500 mt-1">Mengatur jam kerja untuk: <span className="text-indigo-650 font-bold">{guru.find(g => g.id === preferensiModalGuruId)?.nama}</span></p>
              </div>
              <button 
                onClick={() => setPreferensiModalGuruId(null)}
                className="text-slate-600 hover:text-slate-900 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-700">
              
              {/* MAX HOURS */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-indigo-700 block">Batasan Mengajar Maksimal Harian</span>
                  <span className="text-slate-500 text-[11px] font-medium">Membatasi jumlah total jam mengajar yang boleh diberikan dalam satu hari sekolah agar guru tidak terlalu lelah.</span>
                </div>
                <input 
                  type="number" 
                  min={1} 
                  max={8}
                  value={prefMaxHours}
                  onChange={(e) => setPrefMaxHours(Math.max(1, Math.min(8, Number(e.target.value))))}
                  className="bg-white border border-slate-200 w-16 text-center text-slate-800 py-1.5 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-bold"
                />
              </div>

              {/* DAYS BLOCKED AND FAVOURITES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* LEFT: BLOCKED CRITERIA */}
                <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="font-bold text-rose-700 block border-b border-slate-200 pb-1 uppercase tracking-tight font-mono text-[10px]">Hari &amp; Jam TIDAK BERSEDIA (Blok)</span>
                  
                  {/* Days */}
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1.5 font-semibold">Hari Berhalangan Mengajar:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {hariAktif.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDayBlocked(d as Hari)}
                          className={`px-2 py-1 rounded-md transition border text-[11px] font-semibold cursor-pointer ${prefDaysBlocked.includes(d as Hari) ? 'bg-rose-100 text-rose-700 border-rose-300 font-bold' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Period Hours */}
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1.5 font-semibold">Jam Berhalangan (Jam Ke 1-8):</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSlotBlocked(s)}
                          className={`py-1 rounded-md transition border font-mono font-semibold cursor-pointer ${prefSlotsBlocked.includes(s) ? 'bg-rose-100 text-rose-700 border-rose-300 font-bold' : 'bg-white text-slate-650 border-slate-200 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                          Jam {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: FAVORITE CRITERIA */}
                <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="font-bold text-emerald-700 block border-b border-slate-200 pb-1 uppercase tracking-tight font-mono text-[10px]">Hari &amp; Jam FAVORIT (Disukai)</span>
                  
                  {/* Days */}
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1.5 font-semibold">Hari Paling Disukai:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {hariAktif.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDayFav(d as Hari)}
                          className={`px-2 py-1 rounded-md transition border text-[11px] font-semibold cursor-pointer ${prefDaysFav.includes(d as Hari) ? 'bg-emerald-100 text-emerald-700 border-emerald-300 font-bold' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hours */}
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1.5 font-semibold">Jam Paling Disukai (Jam Ke 1-8):</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSlotFav(s)}
                          className={`py-1 rounded-md transition border font-mono font-semibold cursor-pointer ${prefSlotsFav.includes(s) ? 'bg-emerald-100 text-emerald-700 border-emerald-300 font-bold' : 'bg-white text-slate-605 border-slate-200 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                          Jam {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ACTIONS BAR */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setPreferensiModalGuruId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-semibold rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={handleSavePreferences}
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
