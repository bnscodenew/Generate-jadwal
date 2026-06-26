'use client';

import React from 'react';
import { Download, FileText, Info, Trash2, Calendar, Play, AlertTriangle, CheckCircle, HelpCircle, BarChart3, BookOpen, Users, Clock } from 'lucide-react';
import { Guru, Kelas, MataPelajaran, Ruangan, JamPelajaran, Jadwal, Hari, KonflikJadwal, PengampuMataPelajaran } from '../lib/types';
import { LocalDB } from '../lib/db';

interface GridTabProps {
  guru: Guru[];
  kelas: Kelas[];
  mapel: MataPelajaran[];
  ruangan: Ruangan[];
  jamPelajaran: JamPelajaran[];
  jadwal: Jadwal[];
  conflicts: KonflikJadwal[];
  filterType: 'kelas' | 'guru' | 'ruangan';
  setFilterType: (type: 'kelas' | 'guru' | 'ruangan') => void;
  filterId: string;
  setFilterId: (id: string) => void;
  selectedCell: { hari: Hari; jam_ke: number; scheduleId?: string | null } | null;
  setSelectedCell: (cell: { hari: Hari; jam_ke: number; scheduleId?: string | null } | null) => void;
  handleCellClick: (hari: Hari, jamKe: number, scheduleId: string | null | undefined) => void;
  handleManualDeleteSlot: (scheduleId: string) => void;
  handleExportExcel: () => void;
  handlePrintPDF: () => void;
  filteredScheduleMatrix: { [key: number]: { [key in Hari]?: Jadwal[] } };
  setActiveTab: (tab: string) => void;
  hariAktif: Hari[];
  pengampu: PengampuMataPelajaran[];
}

export default function GridTab({
  guru,
  kelas,
  mapel,
  ruangan,
  jamPelajaran,
  jadwal,
  conflicts,
  filterType,
  setFilterType,
  filterId,
  setFilterId,
  selectedCell,
  setSelectedCell,
  handleCellClick,
  handleManualDeleteSlot,
  handleExportExcel,
  handlePrintPDF,
  filteredScheduleMatrix,
  setActiveTab,
  hariAktif,
  pengampu
}: GridTabProps) {
  // Helper to check what conflicts would occur if we swapped selected cell with (targetHari, targetJamKe)
  const getSwapConflicts = (targetHari: Hari, targetJamKe: number): string[] => {
    if (!selectedCell || !selectedCell.scheduleId) return [];
    
    const sourceId = selectedCell.scheduleId;
    const sourceSlot = jadwal.find(s => s.id === sourceId);
    if (!sourceSlot) return [];

    // Find if there is a target slot in the target cell under the current filter
    const targetSlot = jadwal.find(s => s.hari === targetHari && s.jam_ke === targetJamKe && (
      filterType === 'kelas' ? s.kelas_id === filterId :
      filterType === 'guru' ? s.guru_id === filterId :
      s.ruangan_id === filterId
    ));

    // If we clicked on the same cell, no new conflicts
    if (sourceSlot.hari === targetHari && sourceSlot.jam_ke === targetJamKe) return [];

    // Build simulated schedules list
    const simSchedules = jadwal.map(s => {
      if (s.id === sourceSlot.id) {
        return { ...s, hari: targetHari, jam_ke: targetJamKe };
      }
      if (targetSlot && s.id === targetSlot.id) {
        return { ...s, hari: sourceSlot.hari, jam_ke: sourceSlot.jam_ke };
      }
      return s;
    });

    const reasons: string[] = [];

    // 1. Check if source teacher has conflict at target time (except with target class being swapped)
    const teacherDailySchedulesAtTarget = simSchedules.filter(s => 
      s.guru_id === sourceSlot.guru_id && 
      s.hari === targetHari && 
      s.jam_ke === targetJamKe
    );
    if (teacherDailySchedulesAtTarget.length > 1) {
      const otherClasses = teacherDailySchedulesAtTarget
        .filter(s => s.id !== sourceSlot.id)
        .map(s => kelas.find(c => c.id === s.kelas_id)?.nama_kelas || 'kelas lain')
        .join(', ');
      reasons.push(`Guru ${guru.find(g => g.id === sourceSlot.guru_id)?.nama.split(',')[0]} bentrok di kelas ${otherClasses}`);
    }

    // 2. Check if target teacher (if swapped) has conflict at source time
    if (targetSlot) {
      const targetTeacherDailySchedulesAtSource = simSchedules.filter(s => 
        s.guru_id === targetSlot.guru_id && 
        s.hari === sourceSlot.hari && 
        s.jam_ke === sourceSlot.jam_ke
      );
      if (targetTeacherDailySchedulesAtSource.length > 1) {
        const otherClasses = targetTeacherDailySchedulesAtSource
          .filter(s => s.id !== targetSlot.id)
          .map(s => kelas.find(c => c.id === s.kelas_id)?.nama_kelas || 'kelas lain')
          .join(', ');
        reasons.push(`Guru pengganti (${guru.find(g => g.id === targetSlot.guru_id)?.nama.split(',')[0]}) bentrok di kelas ${otherClasses}`);
      }
    }

    // 3. Check teacher offline/unavailability preferences for source teacher
    const preferences = LocalDB.getPreferensi();
    const sourcePref = preferences.find(p => p.guru_id === sourceSlot.guru_id);
    if (sourcePref) {
      if (sourcePref.hari_tidak_bersedia.includes(targetHari)) {
        reasons.push(`Hari ${targetHari} adalah hari tidak bersedia untuk guru`);
      }
      if (sourcePref.jam_tidak_bersedia.includes(targetJamKe)) {
        reasons.push(`Jam ke-${targetJamKe} adalah jam tidak bersedia untuk guru`);
      }
    }

    // 4. Check teacher offline/unavailability preferences for target teacher (if swapped)
    if (targetSlot) {
      const targetPref = preferences.find(p => p.guru_id === targetSlot.guru_id);
      if (targetPref) {
        if (targetPref.hari_tidak_bersedia.includes(sourceSlot.hari)) {
          reasons.push(`Hari ${sourceSlot.hari} adalah hari tidak bersedia untuk guru pengganti`);
        }
        if (targetPref.jam_tidak_bersedia.includes(sourceSlot.jam_ke)) {
          reasons.push(`Jam ke-${sourceSlot.jam_ke} adalah jam tidak bersedia untuk guru pengganti`);
        }
      }
    }

    // 5. Check Room availability at target time
    const roomDailyAtTarget = simSchedules.filter(s => 
      s.ruangan_id === sourceSlot.ruangan_id && 
      s.hari === targetHari && 
      s.jam_ke === targetJamKe
    );
    if (roomDailyAtTarget.length > 1) {
      const otherClasses = roomDailyAtTarget
        .filter(s => s.id !== sourceSlot.id)
        .map(s => kelas.find(c => c.id === s.kelas_id)?.nama_kelas || 'kelas lain')
        .join(', ');
      reasons.push(`Ruangan bentrok dengan kelas ${otherClasses}`);
    }

    // 6. Check Room availability at source time for swapped target slot (if swapped)
    if (targetSlot) {
      const roomDailyAtSource = simSchedules.filter(s => 
        s.ruangan_id === targetSlot.ruangan_id && 
        s.hari === sourceSlot.hari && 
        s.jam_ke === sourceSlot.jam_ke
      );
      if (roomDailyAtSource.length > 1) {
        const otherClasses = roomDailyAtSource
          .filter(s => s.id !== targetSlot.id)
          .map(s => kelas.find(c => c.id === s.kelas_id)?.nama_kelas || 'kelas lain')
          .join(', ');
        reasons.push(`Ruangan target bentrok dengan kelas ${otherClasses}`);
      }
    }

    return reasons;
  };

  // Find selected teacher if any
  const selectedSchedule = selectedCell?.scheduleId ? jadwal.find(s => s.id === selectedCell.scheduleId) : null;
  const selectedGuruId = selectedSchedule ? selectedSchedule.guru_id : null;

  // 1. Hitung progres pemenuhan jam mengajar secara reaktif berdasarkan filter aktif
  const getFulfillmentProgress = () => {
    if (filterType === 'kelas') {
      const currentClass = kelas.find(c => c.id === filterId);
      if (!currentClass) return [];
      
      const classAssignments = pengampu.filter(p => p.kelas_id === filterId);
      return classAssignments.map(p => {
        const t = guru.find(g => g.id === p.guru_id);
        const m = mapel.find(sub => sub.id === p.mapel_id);
        const scheduled = jadwal.filter(s => s.kelas_id === filterId && s.guru_id === p.guru_id && s.mapel_id === p.mapel_id).length;
        const percentage = p.jumlah_jam > 0 ? Math.round((scheduled / p.jumlah_jam) * 100) : 0;
        return {
          id: p.id,
          label: t ? t.nama : 'Guru',
          subLabel: m ? `${m.nama_mapel} (Kode: ${m.kode_mapel})` : 'Mata Pelajaran',
          scheduled,
          target: p.jumlah_jam,
          percentage
        };
      });
    } else if (filterType === 'guru') {
      const currentGuru = guru.find(g => g.id === filterId);
      if (!currentGuru) return [];
      
      const teacherAssignments = pengampu.filter(p => p.guru_id === filterId);
      return teacherAssignments.map(p => {
        const c = kelas.find(cl => cl.id === p.kelas_id);
        const m = mapel.find(sub => sub.id === p.mapel_id);
        const scheduled = jadwal.filter(s => s.kelas_id === p.kelas_id && s.guru_id === filterId && s.mapel_id === p.mapel_id).length;
        const percentage = p.jumlah_jam > 0 ? Math.round((scheduled / p.jumlah_jam) * 100) : 0;
        return {
          id: p.id,
          label: c ? `Kelas ${c.nama_kelas}` : 'Kelas',
          subLabel: m ? `${m.nama_mapel} (Target: ${p.jumlah_jam} jam)` : 'Mata Pelajaran',
          scheduled,
          target: p.jumlah_jam,
          percentage
        };
      });
    } else {
      // Untuk ruangan, tampilkan rangkuman penggunaan jam ruangan berdasarkan kelas-kelas
      const roomSchedules = jadwal.filter(s => s.ruangan_id === filterId);
      const roomUsageMap: { [key: string]: { id: string; label: string; subLabel: string; scheduled: number; target: number; percentage: number } } = {};
      
      roomSchedules.forEach(s => {
        const key = `${s.kelas_id}-${s.guru_id}-${s.mapel_id}`;
        if (!roomUsageMap[key]) {
          const c = kelas.find(cl => cl.id === s.kelas_id);
          const t = guru.find(g => g.id === s.guru_id);
          const m = mapel.find(sub => sub.id === s.mapel_id);
          roomUsageMap[key] = {
            id: key,
            label: c ? `Kelas ${c.nama_kelas}` : 'Kelas',
            subLabel: `${t ? t.nama.split(',')[0] : 'Guru'} - ${m ? m.nama_mapel : 'Mapel'}`,
            scheduled: 0,
            target: 0,
            percentage: 0
          };
        }
        roomUsageMap[key].scheduled += 1;
      });
      return Object.values(roomUsageMap).sort((a, b) => b.scheduled - a.scheduled);
    }
  };

  const activeProgressList = getFulfillmentProgress();

  // 2. Hitung konflik aktif terkait entitas atau grid saat ini
  const getRelevantConflicts = () => {
    if (conflicts.length === 0) return [];
    
    const currentClassName = filterType === 'kelas' ? kelas.find(c => c.id === filterId)?.nama_kelas : null;
    const currentGuruName = filterType === 'guru' ? guru.find(g => g.id === filterId)?.nama : null;
    const currentRoomName = filterType === 'ruangan' ? ruangan.find(r => r.id === filterId)?.nama_ruangan : null;
    
    return conflicts.filter(c => {
      if (filterType === 'kelas' && currentClassName) {
        return c.deskripsi.toLowerCase().includes(currentClassName.toLowerCase()) || 
               (filteredScheduleMatrix[c.jam_ke]?.[c.hari]?.length || 0) > 0;
      }
      if (filterType === 'guru' && currentGuruName) {
        const shortName = currentGuruName.split(',')[0].toLowerCase();
        return c.deskripsi.toLowerCase().includes(shortName) || 
               (filteredScheduleMatrix[c.jam_ke]?.[c.hari]?.length || 0) > 0;
      }
      if (filterType === 'ruangan' && currentRoomName) {
        return c.deskripsi.toLowerCase().includes(currentRoomName.toLowerCase()) || 
               (filteredScheduleMatrix[c.jam_ke]?.[c.hari]?.length || 0) > 0;
      }
      return false;
    });
  };

  const relevantConflictsList = getRelevantConflicts();

  // 3. Hitung progres pemenuhan jam untuk masing-masing kelas secara dinamis
  const classProgressList = kelas.map(c => {
    const classAssignments = pengampu.filter(p => p.kelas_id === c.id);
    const totalRequired = classAssignments.reduce((sum, p) => sum + p.jumlah_jam, 0);
    const totalScheduled = jadwal.filter(s => s.kelas_id === c.id).length;
    const percentage = totalRequired > 0 ? Math.round((totalScheduled / totalRequired) * 100) : 0;
    return {
      ...c,
      totalRequired,
      totalScheduled,
      percentage,
      isComplete: totalRequired > 0 && totalScheduled >= totalRequired
    };
  });

  return (
    <div className="space-y-6">
      
      {/* FILTERING CONTROLS FOR CALENDAR TABLE */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs font-sans">
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
            <button 
              onClick={() => { setFilterType('kelas'); setFilterId(kelas[0]?.id || ''); }}
              className={`px-3 py-1.5 rounded transition font-bold cursor-pointer ${filterType === 'kelas' ? 'bg-white text-indigo-700 border border-slate-200/50 shadow-xs' : 'text-slate-600 hover:text-slate-950'}`}
            >
              Berdasarkan Kelas
            </button>
            <button 
              onClick={() => { setFilterType('guru'); setFilterId(guru[0]?.id || ''); }}
              className={`px-3 py-1.5 rounded transition font-bold cursor-pointer ${filterType === 'guru' ? 'bg-white text-indigo-700 border border-slate-200/50 shadow-xs' : 'text-slate-600 hover:text-slate-950'}`}
            >
              Berdasarkan Guru
            </button>
            <button 
              onClick={() => { setFilterType('ruangan'); setFilterId(ruangan[0]?.id || ''); }}
              className={`px-3 py-1.5 rounded transition font-bold cursor-pointer ${filterType === 'ruangan' ? 'bg-white text-indigo-700 border border-slate-200/50 shadow-xs' : 'text-slate-600 hover:text-slate-950'}`}
            >
              Berdasarkan Ruangan
            </button>
          </div>

          {/* SELECT THE SPECIFIC TARGET ENTITY */}
          <select 
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505/20 font-semibold"
          >
            {filterType === 'kelas' && kelas.map(c => (
              <option key={c.id} value={c.id}>Kelas {c.nama_kelas}</option>
            ))}
            {filterType === 'guru' && guru.map(g => (
              <option key={g.id} value={g.id}>{g.nama}</option>
            ))}
            {filterType === 'ruangan' && ruangan.map(r => (
              <option key={r.id} value={r.id}>{r.nama_ruangan} (Kapasitas: {r.kapasitas})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-655 font-bold border border-slate-200 rounded-lg text-xs hover:text-slate-900 transition hover:bg-slate-50 cursor-pointer"
            title="Export ke Excel CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" /> Ekspor Excel (CSV)
          </button>
          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-655 font-bold border border-slate-200 rounded-lg text-xs hover:text-slate-900 transition hover:bg-slate-50 cursor-pointer"
            title="Cetak/Print PDF Jadwal"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" /> Cetak PDF
          </button>
        </div>

      </div>

      {/* FITUR TAMBAHAN: PROGRES PEMENUHAN JADWAL KELAS (100% MONITOR) */}
      {jadwal.length > 0 && (
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-3 font-sans print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                <span>Status Pemenuhan Jam Pelajaran Kelas</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Klik kartu kelas di bawah untuk langsung menyaring jadwal dan menampilkan data pelajaran kelas tersebut.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>{classProgressList.filter(c => c.percentage === 100).length} Kelas Lengkap (100%)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>{classProgressList.filter(c => c.percentage < 100).length} Belum Lengkap</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {classProgressList.map((c) => {
              const isActive = filterType === 'kelas' && filterId === c.id;
              let barColor = "bg-indigo-600";
              let badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
              
              if (c.percentage === 100) {
                barColor = "bg-emerald-500";
                badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
              } else if (c.percentage > 100) {
                barColor = "bg-rose-500";
                badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
              } else if (c.percentage >= 75) {
                barColor = "bg-sky-500";
                badgeBg = "bg-sky-50 text-sky-700 border-sky-200";
              }

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setFilterType('kelas');
                    setFilterId(c.id);
                  }}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-205 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/75 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="font-bold text-slate-800 text-xs block truncate" title={`Kelas ${c.nama_kelas}`}>
                      Kelas {c.nama_kelas}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${badgeBg}`}>
                      {c.percentage}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden shadow-inner border border-slate-300">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(c.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-500">
                      <span>{c.totalScheduled} / {c.totalRequired} JP</span>
                      {c.percentage === 100 && (
                        <span className="text-emerald-600 font-sans font-extrabold text-[9px]">100% Ok</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {jadwal.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-2xl mx-auto space-y-4 shadow-xs font-sans">
          <Calendar className="w-16 h-16 mx-auto stroke-[1.2] text-indigo-300 animate-pulse" />
          <div>
            <h3 className="text-base font-bold text-slate-800">Jadwal Masih Kosong</h3>
            <p className="text-xs text-slate-550 mt-1 max-w-sm mx-auto">Sistem belum mendeteksi rancangan jadwal pelajaran aktif. Silakan isi data master lalu klik tombol penyusun otomatis di bawah ini.</p>
          </div>
          <button 
            onClick={() => setActiveTab('generate')}
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 stroke-[3]" /> Mulai Otomatisasi
          </button>
        </div>
      ) : (
        
        /* EXCLUSIVE INTERACTIVE CALENDAR CONTAINER MATRIX */
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs overflow-x-auto" id="printable-calendar-view">
          
          {/* PRINT ONLY EMBELLISH HEADER */}
          <div className="hidden print:block text-slate-950 text-center space-y-1 pb-4 border-b border-slate-300 mb-6 font-sans">
            <h2 className="text-xl font-bold uppercase tracking-tight">SMA NEGERI 1 AI INDONESIA</h2>
            <h3 className="text-md font-semibold text-slate-705">Rancangan Jadwal Mengajar Kurikulum Tahun Ajaran 2026/2027</h3>
            <p className="text-xs">
              Berdasarkan {filterType.toUpperCase()}: &nbsp;
              <b>
                {filterType === 'kelas' ? (kelas.find(c => c.id === filterId)?.nama_kelas || 'Seluruh Kelas') :
                 filterType === 'guru' ? (guru.find(g => g.id === filterId)?.nama || 'Seluruh Guru') :
                 (ruangan.find(r => r.id === filterId)?.nama_ruangan || 'Seluruh Ruangan')}
              </b>
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 gap-2 print:hidden select-none font-sans">
            <span className="flex items-center gap-1 text-[11px]"><Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Petunjuk: Klik sel pelajaran asal, lalu klik sel target manapun untuk memindahkan/menukarkan (Swap) posisi slot!</span>
            {selectedCell && (
              <span className="px-2.5 py-1 rounded bg-amber-55 border border-amber-300 text-amber-900 font-bold text-[11px] flex items-center gap-1.5 animate-pulse shrink-0">
                Sirkulasi Aktif: {selectedCell.hari} Jam-{selectedCell.jam_ke} <button onClick={() => setSelectedCell(null)} className="font-extrabold hover:text-amber-955 px-1 font-mono text-xs cursor-pointer">×</button>
              </span>
            )}
          </div>

          {/* LEGEND / KETERANGAN WARNA MANUAL EDITING */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-wrap gap-4 text-xs font-sans print:hidden">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="inline-block w-4 h-4 rounded bg-amber-100 border border-amber-400 ring-2 ring-amber-500"></span>
              <span>Sel Terpilih (Asal)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="inline-block w-4 h-4 rounded bg-blue-50 border border-blue-450"></span>
              <span>Guru Sama (Membantu deteksi jadwal)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="inline-block w-4 h-4 rounded bg-emerald-50 border border-emerald-300"></span>
              <span>🟢 Bebas Bentrok (Saran Hijau)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="inline-block w-4 h-4 rounded bg-rose-50 border border-rose-300"></span>
              <span>🔴 Bentrok (Saran Merah)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="inline-block w-4 h-4 rounded bg-red-100 border-2 border-red-500 animate-pulse"></span>
              <span>⚠️ Konflik Jadwal Aktif</span>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-200 text-xs min-w-[700px] font-sans">
            <thead>
              <tr className="bg-slate-50 border border-slate-200 text-[10px] font-mono uppercase text-slate-500 font-bold">
                <th className="border border-slate-200 p-3 w-28 text-center text-slate-705">Jam Ke / Waktu</th>
                {hariAktif.map((d) => (
                  <th key={d} className="border border-slate-200 p-3 text-center text-slate-800 font-sans text-xs font-bold">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 bg-white pb-6">
              {jamPelajaran.map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-slate-50/40">
                    
                    {/* PERIOD CELL LEFTSIDE */}
                    <td className="border border-slate-200 bg-slate-50/70 p-3 text-center select-none">
                      <div className="font-bold text-indigo-700 font-mono">Ke-{p.jam_ke}</div>
                      <div className="text-[10px] text-slate-550 font-mono mt-1">{p.jam_mulai} - {p.jam_selesai}</div>
                    </td>

                    {/* DAYS GRID CELLS */}
                    {hariAktif.map((d) => {
                      const sInCell = filteredScheduleMatrix[p.jam_ke]?.[d as Hari] || [];
                      const isSelected = selectedCell && selectedCell.hari === d && selectedCell.jam_ke === p.jam_ke;

                      // Check system-wide active conflicts for this cell
                      const hasActiveConflict = conflicts.some(c => c.hari === d && c.jam_ke === p.jam_ke);

                      // Check if same teacher as selected cell
                      const containsSameTeacher = selectedGuruId && sInCell.some(sc => sc.guru_id === selectedGuruId);

                      // Check simulated swap conflicts for placement helper
                      const swapConflictsList = selectedCell ? getSwapConflicts(d as Hari, p.jam_ke) : [];
                      const isPlacementHelperActive = selectedCell && !isSelected;
                      const isSafePlacement = swapConflictsList.length === 0;

                      // Calculate dynamic cell style
                      let cellStyle = "bg-white hover:bg-slate-50 border-slate-200";
                      
                      if (isSelected) {
                        cellStyle = "bg-amber-100 border-amber-400 ring-2 ring-amber-500 text-amber-950 font-medium";
                      } else if (hasActiveConflict) {
                        cellStyle = "bg-red-50 border-red-500 hover:bg-red-100 border-2 text-red-950 shadow-inner";
                      } else if (containsSameTeacher) {
                        cellStyle = "bg-blue-50/90 border-blue-450 hover:bg-blue-100 border-2 text-blue-950 ring-1 ring-blue-300";
                      } else if (isPlacementHelperActive) {
                        if (isSafePlacement) {
                          cellStyle = "bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-950 border-2";
                        } else {
                          cellStyle = "bg-rose-50 border-rose-300 hover:bg-rose-100 text-rose-950 border-2";
                        }
                      } else {
                        // Default styles
                        cellStyle = sInCell.length > 0 ? "bg-white hover:bg-slate-50 border-slate-200" : "hover:bg-slate-50/50 bg-slate-50/15 border-slate-200 text-slate-400";
                      }

                      return (
                        <td 
                          key={d} 
                          onClick={() => handleCellClick(d as Hari, p.jam_ke, sInCell[0]?.id)}
                          className={`border p-2.5 text-center transition-all cursor-pointer relative min-h-[60px] align-top select-none ${cellStyle}`}
                        >
                          {sInCell.length === 0 ? (
                            <div className="py-3">
                              <span className="text-slate-400 italic text-[10px] block select-none">- Kosong -</span>
                              
                              {/* Swapping Helper: Show Indicator for empty target cells */}
                              {isPlacementHelperActive && isSafePlacement && (
                                <div className="mt-1 text-[9px] text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1 py-0.5 inline-flex items-center gap-0.5 font-bold">
                                  <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Bisa Pindah</span>
                                </div>
                              )}
                              
                              {isPlacementHelperActive && !isSafePlacement && (
                                <div className="mt-1 text-[9px] text-rose-700 bg-rose-100 border border-rose-200 rounded px-1 py-0.5 inline-flex flex-col items-center gap-0.5 font-medium">
                                  <div className="flex items-center gap-0.5 font-bold">
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                    <span>Ada Bentrok</span>
                                  </div>
                                  <div className="text-[7px] text-rose-600 leading-tight text-center max-w-[120px] font-mono mt-0.5">
                                    {swapConflictsList.slice(0, 1).map((err, idx) => (
                                      <span key={idx}>{err}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            sInCell.map((sc) => {
                              const mappedMapel = mapel.find(m => m.id === sc.mapel_id);
                              const mappedGuru = guru.find(g => g.id === sc.guru_id);
                              const mappedKelas = kelas.find(c => c.id === sc.kelas_id);
                              const mappedRuangan = ruangan.find(r => r.id === sc.ruangan_id);

                              return (
                                <div key={sc.id} className="space-y-1 group/item z-10">
                                  
                                  {/* Subject abbreviation */}
                                  <div className="font-bold text-slate-900 text-[12px] leading-snug tracking-tight">
                                    {mappedMapel ? mappedMapel.nama_mapel : 'Mapel'}
                                  </div>

                                  {/* Teacher */}
                                  <div className="text-[10px] text-indigo-650 leading-none font-bold">
                                    👤 {mappedGuru ? mappedGuru.nama.split(',')[0] : 'Guru'}
                                  </div>

                                  {/* Extra metadata dependant on filters */}
                                  <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1 mt-1 font-mono font-medium">
                                    <span className="bg-slate-100 px-1 py-0.5 rounded leading-none text-slate-600">
                                      Kelas {mappedKelas ? mappedKelas.nama_kelas : 'Kelas'}
                                    </span>
                                    <span className="bg-slate-100 px-1 py-0.5 rounded leading-none text-slate-600">
                                      📍 {mappedRuangan ? mappedRuangan.nama_ruangan.replace('Kelas ', '') : 'Aula'}
                                    </span>
                                  </div>

                                  {/* Dynamic Visual Badges for editing & conflicts */}
                                  {hasActiveConflict && (
                                    <div className="text-[9px] text-red-700 bg-red-100 border border-red-200 rounded px-1 py-0.5 mt-1 flex items-center justify-center gap-0.5 font-bold animate-pulse">
                                      <AlertTriangle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                                      <span>Konflik Aktif</span>
                                    </div>
                                  )}

                                  {containsSameTeacher && !isSelected && (
                                    <div className="text-[9px] text-blue-700 bg-blue-100 border border-blue-200 rounded px-1 py-0.5 mt-1 inline-flex items-center gap-0.5 font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                      <span>Guru Sama</span>
                                    </div>
                                  )}

                                  {isPlacementHelperActive && isSafePlacement && (
                                    <div className="text-[9px] text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1 py-0.5 mt-1 inline-flex items-center gap-0.5 font-bold">
                                      <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>Aman Ditukar</span>
                                    </div>
                                  )}

                                  {isPlacementHelperActive && !isSafePlacement && (
                                    <div className="text-[9px] text-rose-700 bg-rose-100 border border-rose-200 rounded px-1 py-0.5 mt-1 inline-flex flex-col items-center gap-0.5 font-medium">
                                      <div className="flex items-center gap-0.5 font-bold">
                                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                        <span>Bentrok Ditukar</span>
                                      </div>
                                      <div className="text-[7.5px] text-rose-600 leading-tight text-center max-w-[120px] font-mono mt-0.5">
                                        {swapConflictsList.slice(0, 1).map((err, idx) => (
                                          <span key={idx}>{err}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Extra Delete action (hidden unless hover) */}
                                  <div className="absolute right-1 top-1 text-[9px] print:hidden opacity-0 group-hover/item:opacity-100 transition">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleManualDeleteSlot(sc.id);
                                      }}
                                      className="p-1 text-rose-600 bg-white border border-slate-200 rounded hover:bg-rose-50 transition cursor-pointer"
                                      title="Lepas slot"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                </div>
                              );
                            })
                          )}
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
      )}

      {/* FITUR TAMBAHAN: PANEL INFORMASI REAKTIF - DETEKSI KONFLIK & PROGRES GURU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 print:hidden font-sans">
        
        {/* PANEL 1: PROGRES PEMENUHAN JAM MENGAJAR */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-indigo-600 shrink-0" /> 
              <span>Progres Alokasi Jam {filterType === 'kelas' ? 'Per Kelas' : filterType === 'guru' ? 'Per Guru' : 'Penggunaan Ruangan'}</span>
            </h4>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              {filterType === 'kelas' ? 'Beban Kelas' : filterType === 'guru' ? 'Beban Mengajar' : 'Durasi Ruang'}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {filterType === 'kelas' && "Menampilkan daftar guru pengampu dan mata pelajaran yang dialokasikan khusus untuk kelas ini beserta progres jam mengajar yang sudah ter-plotting dalam tabel."}
            {filterType === 'guru' && "Menampilkan beban kerja mengajar guru terpilih di setiap kelas yang diampunya, serta pemenuhan jam pelajaran per minggu."}
            {filterType === 'ruangan' && "Menampilkan ringkasan frekuensi penggunaan ruangan fisik oleh berbagai kelas dan guru pengajar."}
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {activeProgressList.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                Tidak ada pengampu mengajar yang dikonfigurasi untuk filter ini.
              </div>
            ) : (
              activeProgressList.map(item => {
                let progressColor = "bg-indigo-600";
                let badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                let statusText = "Kurang";

                if (item.target === 0) {
                  progressColor = "bg-slate-400";
                  badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
                  statusText = `${item.scheduled} Jam`;
                } else if (item.percentage === 100) {
                  progressColor = "bg-emerald-500";
                  badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  statusText = "Selesai";
                } else if (item.percentage > 100) {
                  progressColor = "bg-rose-500";
                  badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
                  statusText = `Overload (+${item.scheduled - item.target} Jam)`;
                } else if (item.percentage >= 75) {
                  progressColor = "bg-sky-500";
                  badgeColor = "bg-sky-100 text-sky-800 border-sky-200";
                  statusText = "Hampir Selesai";
                }

                return (
                  <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block truncate max-w-[200px]" title={item.label}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          {item.subLabel}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeColor} shrink-0`}>
                        {statusText}
                      </span>
                    </div>

                    {item.target > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                          <span>Tercapai: {item.scheduled} / {item.target} Jam</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden shadow-inner border border-slate-300">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`} 
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: DETAIL DAN KETERANGAN BENTROK AKTIF */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <span>Keterangan Konflik &amp; Bentrokan</span>
            </h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              conflicts.length > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {conflicts.length} Konflik Terdeteksi
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Daftar analisis bentrokan jadwal guru, kelas, ruangan, atau pelanggaran preferensi waktu yang sedang terjadi dalam sistem.
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {conflicts.length === 0 ? (
              <div className="text-center py-12 text-xs text-emerald-700 bg-emerald-50/50 rounded-lg border border-dashed border-emerald-200 flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <div>
                  <span className="font-bold block">Jadwal 100% Bebas Bentrok!</span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Seluruh slot mengajar telah tersusun secara harmonis dan sesuai aturan preferensi.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Alerter if there are conflicts relevant to the current grid view */}
                {relevantConflictsList.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-50 text-rose-950 border border-rose-200 text-[11px] font-semibold flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span>Terdapat {relevantConflictsList.length} konflik langsung yang berhubungan dengan tampilan grid {filterType === 'kelas' ? 'kelas' : filterType === 'guru' ? 'guru' : 'ruangan'} ini. Periksa daftar bertanda merah di bawah.</span>
                    </div>
                  </div>
                )}

                {conflicts.map((c) => {
                  const isRelevant = relevantConflictsList.some(rc => rc.id === c.id);
                  return (
                    <div 
                      key={c.id} 
                      className={`p-3 rounded-lg text-xs border transition-all ${
                        isRelevant 
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200 shadow-xs' 
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 font-bold mb-1">
                        <span className="text-slate-800 flex items-center gap-1 font-sans">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          Hari {c.hari}, Jam Ke-{c.jam_ke}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                          c.tipe_konflik === 'guru_bentrok' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          c.tipe_konflik === 'kelas_bentrok' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          c.tipe_konflik === 'ruangan_bentrok' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {c.tipe_konflik.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px] mt-1">{c.deskripsi}</p>
                      
                      {c.entities_involved && c.entities_involved.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.entities_involved.map((ent, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {ent}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
