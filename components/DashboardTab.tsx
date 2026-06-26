'use client';

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Layers, 
  BookOpen, 
  Calendar, 
  AlertTriangle, 
  Play, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  Info,
  Download,
  Upload,
  BarChart3,
  Database,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Guru, Kelas, MataPelajaran, Jadwal, KonflikJadwal, PengampuMataPelajaran } from '../lib/types';
import { LocalDB } from '../lib/db';

interface DashboardTabProps {
  guru: Guru[];
  kelas: Kelas[];
  mapel: MataPelajaran[];
  jadwal: Jadwal[];
  conflicts: KonflikJadwal[];
  pengampu: PengampuMataPelajaran[];
  setActiveTab: (tab: string) => void;
  handleClearJadwal: () => void;
  loadDatabase: () => void;
  setLogMessages: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function DashboardTab({
  guru,
  kelas,
  mapel,
  jadwal,
  conflicts,
  pengampu,
  setActiveTab,
  handleClearJadwal,
  loadDatabase,
  setLogMessages
}: DashboardTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  // Calculate teacher workloads
  const teacherWorkloads = guru
    .filter(g => g.status_aktif)
    .map(g => {
      // 1. Target hours: sum from pengampu
      const targetHours = pengampu
        .filter(p => p.guru_id === g.id)
        .reduce((sum, curr) => sum + curr.jumlah_jam, 0);

      // 2. Scheduled hours: sum from schedules
      const scheduledHours = jadwal.filter(j => j.guru_id === g.id).length;

      const percentage = targetHours > 0 ? Math.round((scheduledHours / targetHours) * 100) : 0;

      return {
        id: g.id,
        nama: g.nama,
        targetHours,
        scheduledHours,
        percentage
      };
    })
    .sort((a, b) => b.targetHours - a.targetHours); // Sort by teaching weight

  // Export system backup to JSON
  const handleExportBackup = () => {
    try {
      const dataBackup = {
        app: 'Jadwal Sekolah Otomatis',
        version: '1.2',
        exportedAt: new Date().toISOString(),
        tables: {
          guru: LocalDB.getGuru(),
          mapel: LocalDB.getMapel(),
          kelas: LocalDB.getKelas(),
          ruangan: LocalDB.getRuangan(),
          jamPelajaran: LocalDB.getJamPelajaran(),
          pengampu: LocalDB.getPengampu(),
          preferensi: LocalDB.getPreferensi(),
          jadwal: LocalDB.getJadwal(),
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataBackup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `backup_jadwal_sekolah_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setLogMessages(prev => ['Berhasil mengekspor data cadangan sistem (JSON).', ...prev]);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Gagal mengekspor data cadangan.');
    }
  };

  // Import system backup from JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.tables || !parsed.app) {
          throw new Error('Format file cadangan tidak valid (Missing tables or metadata).');
        }

        const t = parsed.tables;

        // Save back via LocalDB wrapper methods
        if (t.guru) LocalDB.saveGuru(t.guru);
        if (t.mapel) LocalDB.saveMapel(t.mapel);
        if (t.kelas) LocalDB.saveKelas(t.kelas);
        if (t.ruangan) LocalDB.saveRuangan(t.ruangan);
        if (t.jamPelajaran) LocalDB.saveJamPelajaran(t.jamPelajaran);
        if (t.pengampu) LocalDB.savePengampu(t.pengampu);
        if (t.preferensi) LocalDB.savePreferensi(t.preferensi);
        if (t.jadwal) LocalDB.saveJadwal(t.jadwal);

        // Recalculate and load
        LocalDB.recalculateConflicts();
        loadDatabase();

        setImportSuccess(true);
        setImportError(null);
        setLogMessages(prev => ['Berhasil mengimpor dan memulihkan seluruh data cadangan sistem!', ...prev]);

        setTimeout(() => {
          setImportSuccess(false);
        }, 4000);
      } catch (err: any) {
        setImportError(err.message || 'Gagal memproses file cadangan.');
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ringkasan Sistem</h2>
          <p className="text-sm text-slate-500">Ikhtisar data kurikulum sekolah dan kualitas jadwal pelajaran saat ini.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* BACKUP EXPORT & IMPORT BUTTONS */}
          <button 
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Ekspor seluruh data input dan jadwal sebagai file cadangan JSON"
          >
            <Download className="w-3.5 h-3.5" /> Ekspor Cadangan
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Impor file cadangan JSON untuk memulihkan seluruh konfigurasi"
          >
            <Upload className="w-3.5 h-3.5" /> Impor Cadangan
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportBackup} 
            accept=".json" 
            className="hidden" 
          />

          {jadwal.length === 0 ? (
            <button 
              onClick={() => setActiveTab('generate')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition shadow-xs text-sm cursor-pointer"
            >
              <Play className="w-4 h-4" /> Susun Jadwal Instan Sekarang
            </button>
          ) : (
            <button 
              onClick={handleClearJadwal}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-55 hover:bg-rose-100 text-rose-700 border border-rose-220 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Kosongkan Jadwal
            </button>
          )}
        </div>
      </div>

      {/* BACKUP NOTIFICATION BANNER */}
      {importSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-fade-in font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Restorasi data sukses! Seluruh data input kurikulum, preferensi, dan struktur jadwal telah dipulihkan.</span>
        </div>
      )}
      {importError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-850 text-xs flex items-center gap-2 animate-fade-in font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Gagal mengimpor: {importError}</span>
        </div>
      )}

      {/* KPI STATS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">Total Guru Aktif</span>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{guru.filter(g => g.status_aktif).length}</h3>
          </div>
          <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100/50">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">Jumlah Kelas</span>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{kelas.length}</h3>
          </div>
          <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100/50">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">Mata Pelajaran</span>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{mapel.length}</h3>
          </div>
          <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100/50">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">Jam Terjadwal</span>
            <h3 className="text-2xl font-bold mt-1 text-indigo-600">
              {jadwal.length} <span className="text-xs text-slate-500 font-normal">slot</span>
            </h3>
          </div>
          <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100/50">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between col-span-2 lg:col-span-1 shadow-xs">
          <div>
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">Deteksi Konflik</span>
            <h3 className={`text-2xl font-bold mt-1 ${conflicts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {conflicts.length === 0 ? '✓ Sempurna' : `${conflicts.length} Konflik`}
            </h3>
          </div>
          <div className={`p-2.5 rounded-lg border ${conflicts.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* DASHBOARD VISUAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RECENT CONFLICTS OR STATUS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Real-time Konflik Dan Validasi
            </h4>
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">Evaluasi Instan</span>
          </div>

          {conflicts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-lg border border-slate-200 shadow-inner">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 stroke-[1.5] mb-2" />
              <h5 className="font-bold text-slate-800">Tidak Ada Bentrok Jadwal</h5>
              <p className="text-xs text-slate-500 max-w-sm mt-1">Sistem penjadwalan telah diuji terhadap seluruh hard constraint. Semua guru, kelas, dan ruangan berada dalam konfigurasi ideal.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {conflicts.slice(0, 5).map((cf) => (
                <div key={cf.id} className="p-3 bg-rose-50 border border-rose-100 border-l-4 border-l-rose-500 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-105 text-rose-750 font-bold border border-rose-220">
                        {cf.tipe_konflik.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-800 font-bold">Hari {cf.hari} • Jam Ke-{cf.jam_ke}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{cf.deskripsi}</p>
                  </div>
                </div>
              ))}
              {conflicts.length > 5 && (
                <button 
                  onClick={() => setActiveTab('konflik')}
                  className="w-full text-center py-2 text-xs text-indigo-600 font-bold hover:text-indigo-850 transition hover:underline cursor-pointer"
                >
                  Lihat {conflicts.length - 5} Konflik Tambahan Lainnya &gt;
                </button>
              )}
            </div>
          )}
        </div>

        {/* SCHEDULER HELPER INFO */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-5 shadow-xs">
          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" /> Aturan Penjadwalan
            </h4>
            
            <div className="text-xs space-y-3 leading-relaxed">
              <div>
                <span className="font-bold text-indigo-700 block mb-0.5">Constraint Wajib (Hard):</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium whitespace-normal">
                  <li>Guru mengajar maks 1 kelas per jam.</li>
                  <li>Kelas hanya belajar 1 mapel per jam.</li>
                  <li>Ruangan eksklusif 1 kelas per jam.</li>
                  <li>Terkondisi dari blok/libur guru.</li>
                </ul>
              </div>
              <div>
                <span className="font-bold text-indigo-700 block mb-0.5">Constraint Prioritas (Soft):</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium whitespace-normal">
                  <li>Utamakan hari &amp; jam favorit guru.</li>
                  <li>Sebar mata pelajaran tidak menumpuk.</li>
                  <li>Maksimal jam mengajar harian guru.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs leading-relaxed text-slate-600 flex items-start gap-2 font-medium">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Gunakan fitur <b>Drag &amp; Drop</b> atau tukar posisi manual di tab Grid untuk penyesuaian manual langsung.
            </span>
          </div>
        </div>

      </div>

      {/* TEACHER WORKLOAD ANALYSIS SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-indigo-600" /> Analisis Alokasi Jam &amp; Beban Kerja Guru
          </h4>
          <span className="text-[10px] font-mono text-slate-500 font-bold">Terjadwal vs Target Pengampu</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherWorkloads.length === 0 ? (
            <div className="col-span-full text-center py-6 text-xs text-slate-400 italic">
              Belum ada data guru pengampu mata pelajaran.
            </div>
          ) : (
            teacherWorkloads.map(w => {
              // Color calculation for workloads
              let progressColor = "bg-indigo-600";
              let badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
              let statusText = "Kurang";

              if (w.percentage === 100) {
                progressColor = "bg-emerald-500";
                badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                statusText = "Selesai";
              } else if (w.percentage > 100) {
                progressColor = "bg-rose-500";
                badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
                statusText = `Overload (+${w.scheduledHours - w.targetHours} Jam)`;
              } else if (w.percentage >= 75) {
                progressColor = "bg-sky-500";
                badgeColor = "bg-sky-100 text-sky-800 border-sky-200";
                statusText = "Hampir Selesai";
              }

              return (
                <div key={w.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-slate-800 truncate max-w-[150px]" title={w.nama}>
                        {w.nama}
                      </h5>
                      <p className="text-[10px] text-slate-500 font-medium">Target: {w.targetHours} Jam | Terjadwal: {w.scheduledHours} Jam</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeColor}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                      <span>Progres</span>
                      <span>{w.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner border border-slate-300">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`} 
                        style={{ width: `${Math.min(w.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
