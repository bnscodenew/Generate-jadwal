'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileText, Info, Trash2, Calendar, Play, AlertTriangle, CheckCircle, HelpCircle, BarChart3, BookOpen, Users, Clock, Printer, X, Settings } from 'lucide-react';
import { Guru, Kelas, MataPelajaran, Ruangan, JamPelajaran, Jadwal, Hari, KonflikJadwal, PengampuMataPelajaran } from '../lib/types';
import { LocalDB } from '../lib/db';
import { getInitialGuru } from '../lib/utils';

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
  handleManualDeleteSlot: (scheduleId: string, skipConfirm?: boolean) => void;
  handleExportExcel: () => void;
  handlePrintPDF: () => void;
  filteredScheduleMatrix: { [key: number]: { [key in Hari]?: Jadwal[] } };
  setActiveTab: (tab: string) => void;
  hariAktif: Hari[];
  pengampu: PengampuMataPelajaran[];
  onRefresh?: () => void;
  addLogMessage?: (msg: string) => void;
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
  pengampu,
  onRefresh,
  addLogMessage
}: GridTabProps) {
  // States untuk Cetak PDF kustom profesional
  const isPro = LocalDB.getCurrentUser()?.is_pro;
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [useTeacherCode, setUseTeacherCode] = useState(false);
  const [printUseTeacherCode, setPrintUseTeacherCode] = useState(false);
  const [printSchoolName, setPrintSchoolName] = useState(() => {
    return LocalDB.getSchoolProfile()?.nama_sekolah || 'SMA NEGERI 1 AI INDONESIA';
  });
  const [printAcademicYear, setPrintAcademicYear] = useState(() => {
    return LocalDB.getSchoolProfile()?.tahun_ajaran || 'Tahun Ajaran 2026/2027';
  });
  const [printPrincipalName, setPrintPrincipalName] = useState(() => {
    return LocalDB.getSchoolProfile()?.nama_kepsek || 'Drs. H. Mulyono, M.Pd.';
  });
  const [printPrincipalNip, setPrintPrincipalNip] = useState(() => {
    return LocalDB.getSchoolProfile()?.nip_kepsek || '19740815 200003 1 002';
  });
  const [printCoordinatorName, setPrintCoordinatorName] = useState(() => {
    return LocalDB.getSchoolProfile()?.nama_koordinator || 'Siti Aminah, S.Pd.';
  });
  const [printCoordinatorNip, setPrintCoordinatorNip] = useState(() => {
    return LocalDB.getSchoolProfile()?.nip_koordinator || '19810312 200801 2 015';
  });
  const [printScope, setPrintScope] = useState<'current' | 'all_classes' | 'all_teachers' | 'master_schedule'>('current');
  const [printDate, setPrintDate] = useState(() => {
    const today = new Date();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  });
  const [printCity, setPrintCity] = useState(() => {
    return LocalDB.getSchoolProfile()?.kota || 'Jakarta';
  });

  // Sync state whenever print modal is opened
  useEffect(() => {
    if (showPrintModal) {
      const timer = setTimeout(() => {
        const p = LocalDB.getSchoolProfile();
        setPrintSchoolName(p.nama_sekolah);
        setPrintAcademicYear(p.tahun_ajaran);
        setPrintPrincipalName(p.nama_kepsek);
        setPrintPrincipalNip(p.nip_kepsek);
        setPrintCoordinatorName(p.nama_koordinator);
        setPrintCoordinatorNip(p.nip_koordinator);
        setPrintCity(p.kota);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [showPrintModal]);

  // Helper untuk generate matrix jadwal mandiri per entitas (kelas/guru) sewaktu print massal
  const generateMatrix = (fType: 'kelas' | 'guru' | 'ruangan', fId: string) => {
    const matrix: { [key: number]: { [key in Hari]?: Jadwal[] } } = {};

    for (const p of jamPelajaran) {
      matrix[p.jam_ke] = {};
      for (const d of hariAktif) {
        matrix[p.jam_ke][d] = [];
      }
    }

    for (const s of jadwal) {
      let match = false;
      if (fType === 'kelas' && s.kelas_id === fId) match = true;
      if (fType === 'guru' && s.guru_id === fId) match = true;
      if (fType === 'ruangan' && s.ruangan_id === fId) match = true;

      if (match && matrix[s.jam_ke] && matrix[s.jam_ke][s.hari]) {
        matrix[s.jam_ke][s.hari]!.push(s);
      }
    }

    return matrix;
  };

  const handleExecutePrint = () => {
    setShowPrintModal(false);
    // Beri sedikit waktu agar state update dan render selesai sebelum dialog print browser terbuka
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const exportMasterScheduleExcel = () => {
    const daysArr: Hari[] = hariAktif;
    const classesArr = kelas;
    
    let csvContent = `\ufeffJADWAL INDUK KOLEKTIF - ${printSchoolName.toUpperCase()}\n`;
    csvContent += `Tahun Ajaran: ${printAcademicYear}\n\n`;
    csvContent += `Hari,Jam Ke,Waktu,${classesArr.map(c => `Kelas ${c.nama_kelas}`).join(',')}\n`;

    for (const day of daysArr) {
      for (const p of jamPelajaran) {
        let row = `${day},${p.jam_ke},${p.jam_mulai} - ${p.jam_selesai}`;
        for (const c of classesArr) {
          const slots = jadwal.filter(s => s.hari === day && s.jam_ke === p.jam_ke && s.kelas_id === c.id);
          if (slots.length > 0) {
            const slotDetails = slots.map(sc => {
              const m = mapel.find(sub => sub.id === sc.mapel_id);
              const g = guru.find(tea => tea.id === sc.guru_id);
              const mCode = m ? m.kode_mapel : 'Mapel';
              const gCode = g ? getInitialGuru(g.nama) : 'Guru';
              return `${mCode}/${gCode}`;
            }).join(' | ');
            row += `,"${slotDetails}"`;
          } else {
            row += `,"-"`;
          }
        }
        csvContent += row + '\n';
      }
    }

    // Append Legenda Guru
    csvContent += `\n\nLEGENDA KODE GURU PENGAJAR\n`;
    csvContent += `Kode,Nama Guru,NIP\n`;
    for (const g of guru.filter(tea => tea.status_aktif)) {
      csvContent += `"${getInitialGuru(g.nama)}","${g.nama}","${g.nip || '-'}"\n`;
    }

    // Append Legenda Mapel
    csvContent += `\nLEGENDA KODE MATA PELAJARAN\n`;
    csvContent += `Kode,Nama Mata Pelajaran\n`;
    for (const m of mapel) {
      csvContent += `"${m.kode_mapel}","${m.nama_mapel}"\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jadwal_induk_kolektif_${printSchoolName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (addLogMessage) {
      addLogMessage(`Jadwal Induk Kolektif berhasil diekspor ke Excel CSV.`);
    }
  };

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

  // --- FITUR TAMBAHAN: INTERAKTIF MODAL EDIT & TAMBAH JADWAL MANUAL ---
  const [activeEditCell, setActiveEditCell] = useState<{ hari: Hari; jam_ke: number; scheduleId?: string | null } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [manualAddMode, setManualAddMode] = useState<'pengampu' | 'custom'>('pengampu');
  const [selectedPengampuId, setSelectedPengampuId] = useState<string>('');
  const [customKelasId, setCustomKelasId] = useState<string>('');
  const [customGuruId, setCustomGuruId] = useState<string>('');
  const [customMapelId, setCustomMapelId] = useState<string>('');
  const [manualRuanganId, setManualRuanganId] = useState<string>('');
  const [quickRoomEdit, setQuickRoomEdit] = useState<boolean>(false);

  const onCellClicked = (hari: Hari, jamKe: number, scheduleId: string | null | undefined) => {
    if (selectedCell) {
      // Complete swap/move
      handleCellClick(hari, jamKe, scheduleId);
    } else {
      // Open modal for this cell
      setActiveEditCell({ hari, jam_ke: jamKe, scheduleId });
      setQuickRoomEdit(false);
      setShowDeleteConfirm(false);
      
      // Filter relevant assignments
      let preselectedPengampu = '';
      if (filterType === 'kelas') {
        const classPengampu = pengampu.filter(p => p.kelas_id === filterId);
        // Find one that still has quota and is not in conflict, or just has quota
        const hungryNoConflict = classPengampu.find(p => {
          const count = jadwal.filter(s => s.kelas_id === filterId && s.guru_id === p.guru_id && s.mapel_id === p.mapel_id).length;
          const hasConflict = jadwal.some(s => s.hari === hari && s.jam_ke === jamKe && s.guru_id === p.guru_id);
          return count < p.jumlah_jam && !hasConflict;
        });
        const hungry = hungryNoConflict || classPengampu.find(p => {
          const count = jadwal.filter(s => s.kelas_id === filterId && s.guru_id === p.guru_id && s.mapel_id === p.mapel_id).length;
          return count < p.jumlah_jam;
        });
        preselectedPengampu = hungry ? hungry.id : (classPengampu[0]?.id || '');
        setCustomKelasId(filterId);
        setCustomGuruId(guru[0]?.id || '');
        setCustomMapelId(mapel[0]?.id || '');
      } else if (filterType === 'guru') {
        const teacherPengampu = pengampu.filter(p => p.guru_id === filterId);
        const hungryNoConflict = teacherPengampu.find(p => {
          const count = jadwal.filter(s => s.kelas_id === p.kelas_id && s.guru_id === filterId && s.mapel_id === p.mapel_id).length;
          const hasConflict = jadwal.some(s => s.hari === hari && s.jam_ke === jamKe && s.guru_id === filterId);
          return count < p.jumlah_jam && !hasConflict;
        });
        const hungry = hungryNoConflict || teacherPengampu.find(p => {
          const count = jadwal.filter(s => s.kelas_id === p.kelas_id && s.guru_id === filterId && s.mapel_id === p.mapel_id).length;
          return count < p.jumlah_jam;
        });
        preselectedPengampu = hungry ? hungry.id : (teacherPengampu[0]?.id || '');
        setCustomKelasId(kelas[0]?.id || '');
        setCustomGuruId(filterId);
        setCustomMapelId(mapel[0]?.id || '');
      } else {
        const hungryNoConflict = pengampu.find(p => {
          const count = jadwal.filter(s => s.kelas_id === p.kelas_id && s.guru_id === p.guru_id && s.mapel_id === p.mapel_id).length;
          const hasConflict = jadwal.some(s => s.hari === hari && s.jam_ke === jamKe && s.guru_id === p.guru_id);
          return count < p.jumlah_jam && !hasConflict;
        });
        const hungry = hungryNoConflict || pengampu.find(p => {
          const count = jadwal.filter(s => s.kelas_id === p.kelas_id && s.guru_id === p.guru_id && s.mapel_id === p.mapel_id).length;
          return count < p.jumlah_jam;
        });
        preselectedPengampu = hungry ? hungry.id : (pengampu[0]?.id || '');
        setCustomKelasId(kelas[0]?.id || '');
        setCustomGuruId(guru[0]?.id || '');
        setCustomMapelId(mapel[0]?.id || '');
      }
      setSelectedPengampuId(preselectedPengampu);
      
      // Default room
      if (filterType === 'ruangan') {
        setManualRuanganId(filterId);
      } else if (scheduleId) {
        const existing = jadwal.find(s => s.id === scheduleId);
        setManualRuanganId(existing?.ruangan_id || ruangan[0]?.id || '');
      } else {
        setManualRuanganId(ruangan[0]?.id || '');
      }
      setManualAddMode('pengampu');
    }
  };

  const handleSaveManualSlot = () => {
    if (!activeEditCell) return;
    const { hari, jam_ke } = activeEditCell;

    let targetKelasId = '';
    let targetGuruId = '';
    let targetMapelId = '';
    let targetRuanganId = manualRuanganId || ruangan[0]?.id || '';

    if (manualAddMode === 'pengampu') {
      const selectedP = pengampu.find(p => p.id === selectedPengampuId);
      if (!selectedP) {
        alert('Harap pilih Mata Pelajaran / Guru yang valid.');
        return;
      }
      targetKelasId = selectedP.kelas_id;
      targetGuruId = selectedP.guru_id;
      targetMapelId = selectedP.mapel_id;
    } else {
      if (!customKelasId || !customGuruId || !customMapelId) {
        alert('Harap lengkapi semua kolom Kelas, Guru, dan Mata Pelajaran.');
        return;
      }
      targetKelasId = customKelasId;
      targetGuruId = customGuruId;
      targetMapelId = customMapelId;
    }

    // Validation: check if teacher is already busy at this time (hari, jam_ke)
    const teacherConflict = jadwal.find(s => s.hari === hari && s.jam_ke === jam_ke && s.guru_id === targetGuruId);
    if (teacherConflict) {
      const otherClass = kelas.find(c => c.id === teacherConflict.kelas_id)?.nama_kelas || 'kelas lain';
      if (!confirm(`⚠️ Peringatan: Guru yang dipilih sudah mengajar di kelas ${otherClass} pada hari ${hari} Jam ke-${jam_ke}.\n\nTetap simpan jadwal ini (mengabaikan bentrok)?`)) {
        return;
      }
    }

    // Validation: check if class is already busy at this time
    const classConflict = jadwal.find(s => s.hari === hari && s.jam_ke === jam_ke && s.kelas_id === targetKelasId);
    if (classConflict) {
      const otherSubject = mapel.find(m => m.id === classConflict.mapel_id)?.nama_mapel || 'mapel lain';
      if (!confirm(`⚠️ Peringatan: Kelas yang dipilih sudah diisi oleh pelajaran ${otherSubject} pada hari ${hari} Jam ke-${jam_ke}.\n\nTetap simpan jadwal ini (mengabaikan bentrok)?`)) {
        return;
      }
    }

    // Validation: check if room is already occupied at this time
    const roomConflict = jadwal.find(s => s.hari === hari && s.jam_ke === jam_ke && s.ruangan_id === targetRuanganId);
    if (roomConflict) {
      const conflictingClass = kelas.find(c => c.id === roomConflict.kelas_id)?.nama_kelas || 'kelas';
      if (!confirm(`⚠️ Peringatan: Ruangan yang dipilih sedang digunakan oleh kelas ${conflictingClass} pada hari ${hari} Jam ke-${jam_ke}.\n\nTetap simpan jadwal ini (mengabaikan bentrok)?`)) {
        return;
      }
    }

    // Create new schedule slot
    const newSlot: Jadwal = {
      id: `manual-s-${Date.now()}`,
      assignment_id: manualAddMode === 'pengampu' ? selectedPengampuId : `custom-p-${Date.now()}`,
      kelas_id: targetKelasId,
      guru_id: targetGuruId,
      mapel_id: targetMapelId,
      ruangan_id: targetRuanganId,
      hari,
      jam_ke
    };

    const updatedJadwal = [...jadwal, newSlot];
    LocalDB.saveJadwal(updatedJadwal);
    
    if (onRefresh) onRefresh();
    if (addLogMessage) {
      const subjectName = mapel.find(m => m.id === targetMapelId)?.nama_mapel || 'Mapel';
      const teacherName = guru.find(g => g.id === targetGuruId)?.nama.split(',')[0] || 'Guru';
      const className = kelas.find(c => c.id === targetKelasId)?.nama_kelas || 'Kelas';
      addLogMessage(`📝 Berhasil menambahkan jadwal manual: ${subjectName} oleh ${teacherName} di Kelas ${className} (${hari}, Jam Ke-${jam_ke}).`);
    }

    setActiveEditCell(null);
  };

  const handleUpdateRoom = (newRoomId: string) => {
    if (!activeEditCell || !activeEditCell.scheduleId) return;
    const targetSlot = jadwal.find(s => s.id === activeEditCell.scheduleId);
    if (!targetSlot) return;

    const updated = jadwal.map(s => {
      if (s.id === activeEditCell.scheduleId) {
        return { ...s, ruangan_id: newRoomId };
      }
      return s;
    });
    LocalDB.saveJadwal(updated);
    if (onRefresh) onRefresh();
    if (addLogMessage) {
      const roomName = ruangan.find(r => r.id === newRoomId)?.nama_ruangan || 'Ruangan';
      const subjectName = mapel.find(m => m.id === targetSlot.mapel_id)?.nama_mapel || 'Mapel';
      addLogMessage(`📍 Berhasil memperbarui ruangan secara manual: ${subjectName} dipindahkan ke ${roomName}.`);
    }
    setActiveEditCell(null);
  };

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
      <div className="print:hidden space-y-6">
      
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
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-semibold"
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

          {/* Toggle Kode Guru */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 select-none" title="Ubah tampilan guru pada grid menjadi inisial/kode singkat">
            <input 
              type="checkbox" 
              checked={useTeacherCode} 
              onChange={(e) => setUseTeacherCode(e.target.checked)} 
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="font-bold text-[11px] text-slate-700">Gunakan Kode Guru (Inisial)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={isPro ? handleExportExcel : undefined}
            disabled={!isPro}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-bold border rounded-lg text-xs transition ${isPro ? 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50 cursor-pointer' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'}`}
            title={isPro ? "Ekspor ke Excel CSV" : "Fitur Ekspor Excel hanya tersedia untuk Akun PRO"}
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" /> Ekspor Excel (CSV) {!isPro && <span className="ml-1 text-[8px] bg-indigo-600 text-white px-1 py-0.5 rounded font-black">PRO</span>}
          </button>
          <button 
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
            title="Cetak/Print PDF Jadwal dengan Format Profesional"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak PDF Profesional
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
            <h3 className="text-md font-semibold text-slate-700">Rancangan Jadwal Mengajar Kurikulum Tahun Ajaran 2026/2027</h3>
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
                <th className="border border-slate-200 p-3 w-28 text-center text-slate-700">Jam Ke / Waktu</th>
                {hariAktif.map((d) => (
                  <th key={d} className="border border-slate-200 p-3 text-center text-slate-800 font-sans text-xs font-bold">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white pb-6">
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
                          onClick={() => onCellClicked(d as Hari, p.jam_ke, sInCell[0]?.id)}
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
                                  <div className="text-[10px] text-indigo-600 leading-none font-bold" title={mappedGuru ? mappedGuru.nama : 'Guru'}>
                                    👤 {mappedGuru ? (useTeacherCode ? getInitialGuru(mappedGuru.nama) : mappedGuru.nama.split(',')[0]) : 'Guru'}
                                  </div>

                                  {/* Extra metadata dependant on filters */}
                                  <div className="text-[9px] text-slate-500 flex flex-col items-center gap-1 mt-1 font-mono font-medium">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded leading-none text-slate-600 block text-center w-full max-w-[115px] truncate" title={mappedKelas ? `Kelas ${mappedKelas.nama_kelas}` : 'Kelas'}>
                                      Kelas {mappedKelas ? mappedKelas.nama_kelas : 'Kelas'}
                                    </span>
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded leading-none text-slate-600 block text-center w-full max-w-[115px] truncate" title={mappedRuangan ? mappedRuangan.nama_ruangan : 'Aula'}>
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

      {/* RENDER HELPER UNTUK HALAMAN CETAK PDF */}
      {(() => {
        const renderPrintPageHeader = (title: string, subtitle?: string, badgeText?: string) => {
          const actualBadge = badgeText || (title.includes('INDUK') ? 'JADWAL PELAJARAN INDUK (KOLEKTIF)' : `DOKUMEN JADWAL ${title.toUpperCase()}`);
          return (
            <div className="relative w-full pb-4 mb-4 border-b border-slate-200 font-sans select-none min-h-[115px] overflow-hidden">
              {/* SVG Background decoration in the top right */}
              <div className="absolute -top-6 -right-10 w-[380px] h-[230px] pointer-events-none opacity-90 z-0 select-none">
                <svg viewBox="0 0 420 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="printGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#17B3A3"/>
                      <stop offset="100%" stopColor="#16355D"/>
                    </linearGradient>
                    <linearGradient id="printGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#16355D"/>
                      <stop offset="100%" stopColor="#0F8E88"/>
                    </linearGradient>
                  </defs>
                  <polygon points="250,0 420,0 420,170" fill="url(#printGrad1)" opacity="0.95"/>
                  <polygon points="320,0 420,100 420,260 210,60" fill="url(#printGrad2)" opacity="0.9"/>
                  <polygon points="180,0 280,0 420,140 420,200" fill="#1DB9A8" opacity="0.35"/>
                </svg>
              </div>

              {/* Header Content Wrapper */}
              <div className="relative z-10 flex items-center justify-between w-full">
                {/* Left: Logo & School Name */}
                <div className="flex items-center gap-4">
                  {/* Elegant Emblem/Logo */}
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center border border-slate-200 p-1.5 shrink-0 relative shadow-xs overflow-hidden">
                    {(() => {
                      const logo = LocalDB.getSchoolProfile()?.logo_sekolah;
                      if (logo) {
                        if (logo.trim().startsWith('<svg')) {
                          return (
                            <div 
                              className="w-full h-full flex items-center justify-center text-indigo-700"
                              dangerouslySetInnerHTML={{ __html: logo }}
                            />
                          );
                        } else {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={logo} 
                              alt="Logo Sekolah" 
                              className="w-full h-full object-contain"
                            />
                          );
                        }
                      }
                      return (
                        <div className="w-full h-full bg-[#16355D] rounded-lg flex flex-col items-center justify-center text-white p-0.5 relative">
                          <div className="absolute top-0 text-[6px] text-yellow-300">★</div>
                          <svg className="w-5 h-5 text-white mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <svg className="w-2.5 h-2.5 text-emerald-300 absolute bottom-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Vertical divider */}
                  <div className="h-10 w-[1px] bg-slate-300"></div>

                  <div>
                    <h1 className="text-lg font-extrabold uppercase tracking-tight text-[#16355D] leading-none mb-0.5">
                      {printSchoolName}
                    </h1>
                    <span className="text-[9px] text-slate-500 tracking-wider font-semibold uppercase block">
                      INDONESIA
                    </span>
                  </div>
                </div>

                {/* Middle: Title & Subtitle */}
                <div className="flex flex-col items-center justify-center text-center flex-1 px-4">
                  <h2 className="text-base font-black uppercase tracking-wide text-[#16355D]">
                    JADWAL PELAJARAN &amp; MENGAJAR GURU
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-[#17B3A3] uppercase tracking-wider">
                      TAHUN AJARAN {printAcademicYear}
                    </span>
                    <span className="bg-[#16355D] text-white text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                      {actualBadge}
                    </span>
                  </div>
                </div>

                {/* Right spacing matching landscape style */}
                <div className="w-[180px] shrink-0 h-1 pointer-events-none"></div>
              </div>

              {/* Info Bar (Address, Target, Semester) */}
              <div className="relative z-10 grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-100 text-[8.5px] text-slate-600 font-medium">
                <div className="flex items-center gap-1">
                  <span className="text-emerald-600 text-[10px]">📍</span>
                  <span className="truncate">Jl. Raya Pendidikan No. 45, Kurikulum Berbasis AI Modern</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-indigo-600 text-[10px]">👤</span>
                  <span>Sasaran: <strong className="text-slate-900 font-extrabold">{title}</strong> {subtitle ? `(${subtitle})` : ''}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-indigo-600 text-[10px]">📅</span>
                  <span>Semester Ganjil / Genap</span>
                </div>
              </div>
            </div>
          );
        };

        const renderPrintTable = (matrix: { [key: number]: { [key in Hari]?: Jadwal[] } }, currentType: 'kelas' | 'guru' | 'ruangan') => {
          return (
            <table className="print-table w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ width: '12%' }} className="border border-slate-600 bg-slate-100 p-1.5 text-[10px] font-bold text-slate-800 text-center">Jam Ke / Waktu</th>
                  {hariAktif.map(day => (
                    <th key={day} style={{ width: `${88 / hariAktif.length}%` }} className="border border-slate-600 bg-slate-100 p-1.5 text-[10px] font-bold text-slate-800 text-center">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jamPelajaran.map(p => (
                  <tr key={p.id}>
                    {/* Period details */}
                    <td className="border border-slate-400 bg-slate-50/50 p-1.5 text-center align-middle" style={{ verticalAlign: 'middle' }}>
                      <div className="font-bold text-indigo-900 text-[10px]">Ke-{p.jam_ke}</div>
                      <div className="text-[8px] text-slate-500 font-mono font-medium mt-0.5">{p.jam_mulai} - {p.jam_selesai}</div>
                    </td>
                    
                    {/* Days cells */}
                    {hariAktif.map(day => {
                      const sInCell = matrix[p.jam_ke]?.[day as Hari] || [];
                      return (
                        <td key={day} className="border border-slate-400 p-1.5 print:p-1 text-center align-top h-[55px] min-h-[55px] print:h-auto print:min-h-0">
                          {sInCell.length === 0 ? (
                            <div className="text-slate-400 italic text-[9px] flex items-center justify-center h-full">-</div>
                          ) : (
                            sInCell.map(sc => {
                              const m = mapel.find(sub => sub.id === sc.mapel_id);
                              const g = guru.find(tea => tea.id === sc.guru_id);
                              const cl = kelas.find(cli => cli.id === sc.kelas_id);
                              const r = ruangan.find(rm => rm.id === sc.ruangan_id);
                              return (
                                <div key={sc.id} className="space-y-0.5 leading-snug">
                                  {/* Subject */}
                                  <div className="font-extrabold text-slate-950 text-[10px] tracking-tight">
                                    {m ? m.nama_mapel : 'Mapel'}
                                  </div>
                                  
                                  {/* Teacher (Show only if NOT printing per teacher page) */}
                                  {currentType !== 'guru' && (
                                    <div className="text-[9px] print:text-[8px] text-indigo-900 font-bold">
                                      👤 {g ? g.nama.split(',')[0] : 'Guru'}
                                    </div>
                                  )}
                                  
                                  {/* Class and Room - print efficiently! */}
                                  <div className="text-[8px] text-slate-600 font-mono space-y-0.5 print:space-y-0">
                                    {currentType !== 'kelas' && (
                                      <div className="bg-slate-50 border border-slate-100 rounded py-0.5 px-1 truncate print:bg-transparent print:border-none print:p-0 print:font-sans print:font-bold print:text-indigo-950">Kelas: {cl ? cl.nama_kelas : '-'}</div>
                                    )}
                                    {currentType !== 'ruangan' && (
                                      <div className="bg-slate-50 border border-slate-100 rounded py-0.5 px-1 truncate print:bg-transparent print:border-none print:p-0">📍 {r ? r.nama_ruangan.replace('Kelas ', '') : '-'}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        };

        const renderMasterPrintTable = () => {
          return (
            <div className="rounded-xl border border-slate-300 overflow-hidden shadow-xs print:shadow-none">
              <table className="print-table w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th 
                      style={{ width: '8%', backgroundColor: '#16355D', color: '#ffffff' }} 
                      className="p-2 text-[9px] font-black tracking-wider uppercase text-center border-r border-slate-300/40"
                    >
                      Hari
                    </th>
                    <th 
                      style={{ width: '10%', backgroundColor: '#16355D', color: '#ffffff' }} 
                      className="p-2 text-[9px] font-black tracking-wider uppercase text-center border-r border-slate-300/40"
                    >
                      Waktu
                    </th>
                    {kelas.map((c) => (
                      <th 
                        key={c.id} 
                        style={{ backgroundColor: '#17B3A3', color: '#ffffff' }} 
                        className="p-2 text-[9px] font-black tracking-wider uppercase text-center border-r last:border-r-0 border-slate-300/40"
                      >
                        Kelas {c.nama_kelas}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hariAktif.map(day => {
                    return jamPelajaran.map((p, pIdx) => {
                      return (
                        <tr key={`${day}-${p.id}`} className="border-b last:border-b-0 border-slate-200">
                          {pIdx === 0 && (
                            <td 
                              rowSpan={jamPelajaran.length} 
                              style={{ backgroundColor: '#16355D', color: '#ffffff' }} 
                              className="font-extrabold text-center align-middle border-r border-slate-300/50 w-[8%] h-auto"
                            >
                              <div className="flex flex-col items-center justify-center text-center text-white py-4 space-y-3 h-full">
                                {/* Circle with Calendar Icon */}
                                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/10 shrink-0 shadow-xs">
                                  <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                {/* Day Name Stacked Vertically */}
                                <div className="font-black text-[11px] tracking-widest uppercase leading-snug select-none">
                                  {day.split('').map((char, charIdx) => (
                                    <span key={charIdx} className="block">{char}</span>
                                  ))}
                                </div>
                              </div>
                            </td>
                          )}
                          
                          {/* Period Cell */}
                          <td className="p-1 text-center bg-slate-50/50 border-r border-slate-200 w-[10%] align-middle">
                            <div className="font-black text-[9px] text-[#16355D] leading-none mb-0.5">Ke-{p.jam_ke}</div>
                            <div className="text-[7.5px] text-slate-500 font-mono font-semibold">{p.jam_mulai} - {p.jam_selesai}</div>
                          </td>

                          {/* Classes Cells */}
                          {kelas.map(c => {
                            const slots = jadwal.filter(s => s.hari === day && s.jam_ke === p.jam_ke && s.kelas_id === c.id);
                            return (
                              <td key={c.id} className="p-1.5 text-center align-middle text-[9px] h-10 border-r last:border-r-0 border-slate-200 min-w-[100px]">
                                {slots.length === 0 ? (
                                  <span className="text-slate-300 select-none">-</span>
                                ) : (
                                  <div className="flex flex-col gap-1 items-center justify-center h-full">
                                    {slots.map(sc => {
                                      const m = mapel.find(sub => sub.id === sc.mapel_id);
                                      const g = guru.find(tea => tea.id === sc.guru_id);
                                      const r = ruangan.find(rm => rm.id === sc.ruangan_id);
                                      const subjLabel = m ? m.kode_mapel : 'Mapel';
                                      const teacherLabel = g ? getInitialGuru(g.nama) : 'Guru';
                                      const roomLabel = r ? r.nama_ruangan.replace('Kelas ', '') : '';
                                      
                                      return (
                                        <div key={sc.id} className="w-full flex flex-col items-center leading-tight">
                                          {/* Pill Badges Container */}
                                          <div className="flex items-center gap-1 justify-center">
                                            {/* Mapel Pill */}
                                            <span 
                                              style={{ backgroundColor: '#E2F8F5', color: '#0F8E88', borderColor: '#BCECE6' }}
                                              className="px-1.5 py-0.5 rounded border font-extrabold text-[8px] tracking-tight shrink-0 select-none"
                                            >
                                              {subjLabel}
                                            </span>
                                            {/* Guru Pill */}
                                            <span 
                                              style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#E0E7FF' }}
                                              className="px-1.5 py-0.5 rounded border font-bold text-[8px] tracking-tight shrink-0 select-none"
                                            >
                                              {teacherLabel}
                                            </span>
                                          </div>
                                          {/* Room Label */}
                                          {roomLabel && (
                                            <div className="text-[7.5px] text-rose-600 font-extrabold mt-1 flex items-center justify-center gap-0.5">
                                              <span>📍</span>
                                              <span>{roomLabel}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          );
        };

        const renderMasterScheduleLegend = () => {
          return (
            <div className="mt-4 pt-3 border-t border-slate-300 print:break-inside-avoid">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                LEGENDA KODE MATA PELAJARAN & GURU PENGAJAR
              </h4>
              <div className="grid grid-cols-2 gap-4 text-[8px] print:text-[7px] leading-relaxed">
                {/* Guru Legend */}
                <div>
                  <span className="block font-bold text-slate-700 border-b border-slate-200 pb-0.5 mb-1 uppercase">KODE GURU PENGAJAR</span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-[120px] overflow-y-auto">
                    {guru.filter(g => g.status_aktif).map(g => (
                      <div key={g.id} className="flex gap-1 items-center">
                        <span className="font-mono font-bold text-indigo-700 bg-slate-100 px-1 rounded min-w-[20px] text-center">
                          {getInitialGuru(g.nama)}
                        </span>
                        <span className="text-slate-800 truncate" title={g.nama}>
                          {g.nama}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mapel Legend */}
                <div>
                  <span className="block font-bold text-slate-700 border-b border-slate-200 pb-0.5 mb-1 uppercase">KODE MATA PELAJARAN</span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-[120px] overflow-y-auto">
                    {mapel.map(m => (
                      <div key={m.id} className="flex gap-1 items-center">
                        <span className="font-mono font-bold text-emerald-700 bg-slate-100 px-1 rounded min-w-[26px] text-center">
                          {m.kode_mapel}
                        </span>
                        <span className="text-slate-800 truncate" title={m.nama_mapel}>
                          {m.nama_mapel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        };

        const renderPrintFooter = () => {
          return (
            <div className="grid grid-cols-2 gap-8 text-[10px] pt-4 print:pt-1 font-sans leading-relaxed">
              <div className="space-y-1 print:space-y-0.5">
                <span className="block text-slate-500 italic text-[9px]">Catatan Penyelenggara:</span>
                <p className="text-slate-600 text-[9px] print:text-[8px] max-w-sm">
                  1. Jadwal ini disusun secara otomatis menggunakan sistem algoritma anti-bentrok berbasis prioritas.<br />
                  2. Perubahan jadwal secara mandiri hanya diperkenankan atas persetujuan Waka Kurikulum.
                </p>
              </div>
              
              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-12 print:space-y-6">
                  <div>
                    <span className="block">Mengetahui,</span>
                    <span className="block font-bold">Kepala Sekolah {printSchoolName}</span>
                  </div>
                  <div>
                    <span className="block font-bold underline">{printPrincipalName}</span>
                    <span className="block text-[8px] text-slate-500">NIP. {printPrincipalNip}</span>
                  </div>
                </div>

                <div className="space-y-12 print:space-y-6">
                  <div>
                    <span className="block">{printCity}, {printDate}</span>
                    <span className="block font-bold">Waka Urusan Kurikulum</span>
                  </div>
                  <div>
                    <span className="block font-bold underline">{printCoordinatorName}</span>
                    <span className="block text-[8px] text-slate-500">NIP. {printCoordinatorNip}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        };

        const renderMasterScheduleFooterCombined = () => {
          return (
            <div className="mt-4 pt-3 border-t border-slate-200 print:break-inside-avoid font-sans">
              {/* Grid 3 Kolom Utama */}
              <div className="grid grid-cols-12 gap-5 text-[8px] print:text-[7.5px] leading-relaxed">
                
                {/* Kolom 1: Legenda Kode (Span 5) */}
                <div className="col-span-5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/60">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-[#16355D] mb-2 border-b border-slate-200 pb-1">
                    LEGENDA KODE MATA PELAJARAN &amp; GURU PENGAJAR
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Guru Legend */}
                    <div>
                      <span className="block font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[7px]">KODE GURU</span>
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                        {guru.filter(g => g.status_aktif).map(g => (
                          <div key={g.id} className="flex gap-1.5 items-center">
                            <span 
                              style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#E0E7FF' }}
                              className="font-mono font-extrabold px-1 rounded border min-w-[18px] text-center text-[7px]"
                            >
                              {getInitialGuru(g.nama)}
                            </span>
                            <span className="text-slate-700 font-semibold truncate max-w-[100px]" title={g.nama}>
                              {g.nama.split(',')[0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mapel Legend */}
                    <div>
                      <span className="block font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[7px]">KODE MAPEL</span>
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                        {mapel.map(m => (
                          <div key={m.id} className="flex gap-1.5 items-center">
                            <span 
                              style={{ backgroundColor: '#E2F8F5', color: '#0F8E88', borderColor: '#BCECE6' }}
                              className="font-mono font-extrabold px-1 rounded border min-w-[24px] text-center text-[7px]"
                            >
                              {m.kode_mapel}
                            </span>
                            <span className="text-slate-700 font-semibold truncate max-w-[110px]" title={m.nama_mapel}>
                              {m.nama_mapel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kolom 2: Catatan Penyelenggara (Span 3) */}
                <div className="col-span-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-[#16355D] mb-2 border-b border-slate-200 pb-1">
                      CATATAN PENYELENGGARA
                    </h4>
                    <div className="space-y-1.5 text-slate-600 text-[7.5px] leading-relaxed font-semibold">
                      <p>1. Jadwal ini disusun secara otomatis menggunakan sistem algoritma anti-bentrok berbasis prioritas.</p>
                      <p>2. Perubahan jadwal secara mandiri hanya diperkenankan atas persetujuan Waka Kurikulum.</p>
                    </div>
                  </div>
                  
                  {/* Decorative tiny slogan */}
                  <div className="text-[6.5px] text-slate-400 italic mt-3 pt-1 border-t border-slate-100 font-semibold">
                    Sistem Penjadwalan SMAN 1 AI
                  </div>
                </div>

                {/* Kolom 3: Tanda Tangan & Pengesahan (Span 4) */}
                <div className="col-span-4 flex flex-col justify-between py-1 text-center font-semibold">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Left signature block */}
                    <div className="flex flex-col justify-between h-28">
                      <div>
                        <span className="block text-slate-400 text-[7px] font-bold uppercase tracking-wider mb-0.5">Mengetahui,</span>
                        <span className="block font-black text-slate-800 leading-tight">Kepala Sekolah</span>
                        <span className="block font-bold text-[7px] text-[#16355D] uppercase">{printSchoolName}</span>
                      </div>
                      <div>
                        <span className="block font-black text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-2">{printPrincipalName}</span>
                        <span className="block text-[6.5px] text-slate-500 font-mono mt-0.5">NIP. {printPrincipalNip}</span>
                      </div>
                    </div>

                    {/* Right signature block */}
                    <div className="flex flex-col justify-between h-28">
                      <div>
                        <span className="block text-slate-400 text-[7px] font-bold tracking-wider mb-0.5">{printCity}, {printDate}</span>
                        <span className="block font-black text-slate-800 leading-tight">Waka Urusan Kurikulum</span>
                        <span className="block font-bold text-[7px] text-transparent uppercase select-none">-</span>
                      </div>
                      <div>
                        <span className="block font-black text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-2">{printCoordinatorName}</span>
                        <span className="block text-[6.5px] text-slate-500 font-mono mt-0.5">NIP. {printCoordinatorNip}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Decorative Banner */}
              <div 
                style={{ backgroundColor: '#16355D' }} 
                className="mt-4 rounded-lg overflow-hidden flex items-center justify-between text-white p-2 relative shadow-xs"
              >
                {/* Left content with icon */}
                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest pl-1">
                  <span className="text-emerald-400 text-xs">🌐</span>
                  <span>Disiplin Waktu, Teratur Jadwal, Prestasi Gemilang</span>
                </div>
                
                {/* Right slanted stripe */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-24 bg-[#17B3A3]"
                  style={{ clipPath: 'polygon(20px 0, 100% 0, 100% 100%, 0 100%)' }}
                ></div>
              </div>

            </div>
          );
        };

        return (
          <>
            {/* PRINT AREA (Hidden on screen, visible only on print) */}
            <div className="hidden print:block print-only-container w-full font-sans text-slate-950">
              
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  :root {
                    color-scheme: light !important;
                  }
                  html, body, #main-root, main, .print-only-container {
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    color-scheme: light !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  @page {
                    size: A4 landscape !important;
                    margin: 8mm 12mm 8mm 12mm !important;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  header, footer, nav, aside, button, select, input, .no-print, .print\\:hidden, #root-layout-header, #auth-root, [role="tablist"] {
                    display: none !important;
                  }
                  .print-page-break {
                    page-break-after: always !important;
                    break-after: page !important;
                  }
                  .print-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    table-layout: fixed !important;
                  }
                  .print-table th {
                    font-weight: bold !important;
                    border: 1px solid #cbd5e1 !important;
                    font-size: 9px !important;
                    padding: 5px 3px !important;
                  }
                  .print-table td {
                    border: 1px solid #e2e8f0 !important;
                    font-size: 9px !important;
                    padding: 4px 3px !important;
                    vertical-align: middle !important;
                  }
                  ${!isPro ? `
                  body::before {
                    content: "VERSI TRIAL - JADWALIFY" !important;
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) rotate(-25deg) !important;
                    font-size: 80pt !important;
                    font-weight: 900 !important;
                    color: rgba(0, 0, 0, 0.04) !important;
                    z-index: 99999 !important;
                    pointer-events: none !important;
                    white-space: nowrap !important;
                    text-transform: uppercase !important;
                    font-family: sans-serif !important;
                    text-align: center !important;
                  }
                  ` : ''}
                }
              `}} />

              {/* Scopes mapping */}
              {printScope === 'current' && (
                <div className="space-y-6">
                  {renderPrintPageHeader(
                    filterType === 'kelas' ? (kelas.find(c => c.id === filterId)?.nama_kelas || 'Seluruh Kelas') :
                    filterType === 'guru' ? (guru.find(g => g.id === filterId)?.nama || 'Seluruh Guru') :
                    (ruangan.find(r => r.id === filterId)?.nama_ruangan || 'Seluruh Ruangan')
                  )}
                  
                  {renderPrintTable(generateMatrix(filterType, filterId), filterType)}
                  
                  {renderPrintFooter()}
                </div>
              )}

              {printScope === 'all_classes' && kelas.map((c, idx) => (
                <div key={c.id} className={`space-y-6 ${idx < kelas.length - 1 ? 'print-page-break' : ''}`}>
                  {renderPrintPageHeader(`KELAS ${c.nama_kelas}`, c.wali_kelas ? `Wali Kelas: ${c.wali_kelas}` : undefined)}
                  
                  {renderPrintTable(generateMatrix('kelas', c.id), 'kelas')}
                  
                  {renderPrintFooter()}
                </div>
              ))}

              {printScope === 'all_teachers' && guru.filter(g => g.status_aktif).map((g, idx) => {
                const activeTeachers = guru.filter(tea => tea.status_aktif);
                return (
                  <div key={g.id} className={`space-y-6 ${idx < activeTeachers.length - 1 ? 'print-page-break' : ''}`}>
                    {renderPrintPageHeader(`GURU: ${g.nama}`, g.nip ? `NIP: ${g.nip}` : undefined)}
                    
                    {renderPrintTable(generateMatrix('guru', g.id), 'guru')}
                    
                    {renderPrintFooter()}
                  </div>
                );
              })}

              {printScope === 'master_schedule' && (
                <div className="space-y-6">
                  {renderPrintPageHeader('JADWAL PELAJARAN INDUK (KOLEKTIF)', 'Seluruh Kelas')}
                  
                  {renderMasterPrintTable()}
                  
                  {renderMasterScheduleFooterCombined()}
                </div>
              )}

            </div>
          </>
        );
      })()}

      {/* MODAL KUSTOMISASI CETAK PDF (print:hidden) */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 md:p-6 z-50 overflow-y-auto print:hidden font-sans">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-200" />
                <div>
                  <h3 className="font-bold text-sm text-white">Pengaturan Cetak Jadwal Profesional</h3>
                  <p className="text-[10px] text-indigo-200 font-medium mt-0.5">Kustomisasi header, tanda tangan, dan lingkup cetak A4 Landscape</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Iframe warning to prevent user confusion */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] leading-relaxed space-y-1">
                <p className="font-bold">⚠️ Catatan Penting untuk Browser &amp; iFrame:</p>
                <p>Aplikasi ini berjalan di dalam frame pratinjau. Beberapa peramban memblokir cetak langsung dari dalam frame. Jika setelah klik tombol cetak di bawah dialog print browser tidak muncul, silakan klik tombol <strong>&ldquo;Buka di Tab Baru&rdquo;</strong> di kanan atas, lalu cetak dari sana.</p>
              </div>

              {/* Scope Selection */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">1. Pilih Lingkup Cetak (A4 Landscape)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrintScope('current')}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      printScope === 'current' 
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100 text-indigo-950 font-semibold' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Tampilan Saringan</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">Hanya mencetak filter aktif saat ini: {
                      filterType === 'kelas' ? (kelas.find(c => c.id === filterId)?.nama_kelas || 'Kelas') :
                      filterType === 'guru' ? (guru.find(g => g.id === filterId)?.nama.split(',')[0] || 'Guru') :
                      'Ruangan'
                    }</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintScope('all_classes')}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      printScope === 'all_classes' 
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100 text-indigo-950 font-semibold' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Semua Kelas Sekaligus</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">Mencetak jadwal {kelas.length} kelas secara berurutan, tiap kelas 1 lembar terpisah.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintScope('all_teachers')}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      printScope === 'all_teachers' 
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100 text-indigo-950 font-semibold' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Semua Guru Aktif</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">Mencetak jadwal mengajar masing-masing guru aktif, tiap guru 1 lembar terpisah.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintScope('master_schedule')}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      printScope === 'master_schedule' 
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100 text-indigo-950 font-semibold' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">Jadwal Induk (Kolektif)</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">Mencetak seluruh kelas berdampingan dalam satu tabel padat (1 file/lembar) dengan kode guru.</span>
                  </button>
                </div>
              </div>

              {/* Header Customization */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1">2. Kop Surat &amp; Identitas Sekolah</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">NAMA SEKOLAH / INSTANSI</label>
                    <input 
                      type="text" 
                      value={printSchoolName} 
                      onChange={(e) => setPrintSchoolName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">TAHUN AJARAN / SEMESTER</label>
                    <input 
                      type="text" 
                      value={printAcademicYear} 
                      onChange={(e) => setPrintAcademicYear(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Signatures & Place */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1">3. Tanda Tangan &amp; Lokasi Pengesahan</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">KOTA PENGESAHAN</label>
                    <input 
                      type="text" 
                      value={printCity} 
                      onChange={(e) => setPrintCity(e.target.value)}
                      placeholder="Contoh: Jakarta"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">TANGGAL DOKUMEN</label>
                    <input 
                      type="text" 
                      value={printDate} 
                      onChange={(e) => setPrintDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                    <span className="block text-[9px] font-bold text-indigo-950 uppercase">Pihak 1 (Kiri): Kepala Sekolah</span>
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-0.5">NAMA KEPALA SEKOLAH</label>
                      <input 
                        type="text" 
                        value={printPrincipalName} 
                        onChange={(e) => setPrintPrincipalName(e.target.value)}
                        className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500 text-slate-850 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-0.5">NIP KEPALA SEKOLAH</label>
                      <input 
                        type="text" 
                        value={printPrincipalNip} 
                        onChange={(e) => setPrintPrincipalNip(e.target.value)}
                        className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500 text-slate-850 font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                    <span className="block text-[9px] font-bold text-indigo-950 uppercase">Pihak 2 (Kanan): Waka Kurikulum</span>
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-0.5">NAMA WAKA KURIKULUM</label>
                      <input 
                        type="text" 
                        value={printCoordinatorName} 
                        onChange={(e) => setPrintCoordinatorName(e.target.value)}
                        className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500 text-slate-850 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-0.5">NIP WAKA KURIKULUM</label>
                      <input 
                        type="text" 
                        value={printCoordinatorNip} 
                        onChange={(e) => setPrintCoordinatorNip(e.target.value)}
                        className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500 text-slate-850 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex flex-wrap items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-white text-slate-700 font-bold border border-slate-200 rounded-lg text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              
              {printScope === 'master_schedule' ? (
                <button
                  type="button"
                  onClick={isPro ? () => {
                    exportMasterScheduleExcel();
                    setShowPrintModal(false);
                  } : undefined}
                  disabled={!isPro}
                  className={`px-4 py-2 font-bold border rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs ${isPro ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 cursor-pointer' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'}`}
                  title={isPro ? "Unduh jadwal pelajaran induk seluruh kelas dalam bentuk Excel .csv" : "Ekspor Excel hanya tersedia untuk Akun PRO"}
                >
                  <Download className="w-4 h-4" />
                  Ekspor Excel (Jadwal Induk) {!isPro && <span className="ml-1 text-[8px] bg-indigo-600 text-white px-1 py-0.5 rounded font-black">PRO</span>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={isPro ? () => {
                    handleExportExcel();
                    setShowPrintModal(false);
                  } : undefined}
                  disabled={!isPro}
                  className={`px-4 py-2 font-bold border rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs ${isPro ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 cursor-pointer' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'}`}
                  title={isPro ? "Unduh jadwal tampilan saringan aktif dalam bentuk Excel .csv" : "Ekspor Excel hanya tersedia untuk Akun PRO"}
                >
                  <Download className="w-4 h-4" />
                  Ekspor Excel (Tampilan Saringan) {!isPro && <span className="ml-1 text-[8px] bg-indigo-600 text-white px-1 py-0.5 rounded font-black">PRO</span>}
                </button>
              )}

              <button
                type="button"
                onClick={handleExecutePrint}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Mulai Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FITUR TAMBAHAN: INTERAKTIF CELL ACTION MODAL (MANUAL OVERRIDE / ADD / UPDATE) */}
      {activeEditCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-800 rounded-lg">
                  <Calendar className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white">Atur Jadwal Manual</h3>
                  <p className="text-[11px] text-indigo-200 font-mono mt-0.5">{activeEditCell.hari} — Jam Pelajaran Ke-{activeEditCell.jam_ke}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveEditCell(null)}
                className="p-1.5 text-indigo-200 hover:text-white bg-indigo-800 hover:bg-indigo-850 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* IF CELL IS OCCUPIED (EDIT/UPDATE MODE) */}
              {activeEditCell.scheduleId ? (() => {
                const currentSlot = jadwal.find(s => s.id === activeEditCell.scheduleId);
                if (!currentSlot) return null;
                const m = mapel.find(sub => sub.id === currentSlot.mapel_id);
                const g = guru.find(t => t.id === currentSlot.guru_id);
                const c = kelas.find(cls => cls.id === currentSlot.kelas_id);
                const r = ruangan.find(rm => rm.id === currentSlot.ruangan_id);

                return (
                  <div className="space-y-4">
                    {/* Detail Pelajaran Saat Ini */}
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Pelajaran Terjadwal Saat Ini:</span>
                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                        <div>
                          <p className="text-[10px] text-slate-450 uppercase">Mata Pelajaran</p>
                          <p className="font-bold text-slate-900 mt-0.5">{m ? m.nama_mapel : 'Tidak Diketahui'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-450 uppercase">Guru Pengajar</p>
                          <p className="font-bold text-slate-900 mt-0.5">{g ? g.nama : 'Tidak Diketahui'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-450 uppercase">Kelas</p>
                          <p className="font-semibold text-indigo-800 mt-0.5">Kelas {c ? c.nama_kelas : 'Tidak Diketahui'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-450 uppercase">Ruangan</p>
                          <p className="font-semibold text-indigo-800 mt-0.5">📍 {r ? r.nama_ruangan : 'Aula'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pilih Tindakan:</span>
                      
                      {/* Action 1: Swap/Move */}
                      <button
                        onClick={() => {
                          setSelectedCell({ hari: activeEditCell.hari, jam_ke: activeEditCell.jam_ke, scheduleId: activeEditCell.scheduleId });
                          setActiveEditCell(null);
                          if (addLogMessage) addLogMessage(`Sel dipilih: ${activeEditCell.hari} Jam ke-${activeEditCell.jam_ke}. Pilih slot lain untuk dipindahkan atau ditukar.`);
                        }}
                        className="w-full p-3 text-left bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 rounded-xl transition flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="p-2 bg-slate-100 group-hover:bg-amber-100 text-slate-600 group-hover:text-amber-700 rounded-lg shrink-0">
                          <Play className="w-4 h-4 rotate-90" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-amber-950">Tukar / Pindahkan Posisi Jadwal</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-normal">Aktifkan sirkulasi pemindahan. Selanjutnya klik sel mana pun untuk ditukar atau dipindahkan.</p>
                        </div>
                      </button>

                      {/* Action 2: Change Room Quick Edit */}
                      <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">Ubah Ruangan Saja</p>
                          <button 
                            onClick={() => setQuickRoomEdit(!quickRoomEdit)}
                            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            {quickRoomEdit ? 'Batal' : 'Ubah Ruangan'}
                          </button>
                        </div>
                        
                        {quickRoomEdit ? (
                          <div className="flex gap-2 animate-fade-in mt-1.5">
                            <select
                              value={manualRuanganId}
                              onChange={(e) => setManualRuanganId(e.target.value)}
                              className="flex-1 text-xs p-2 bg-white border border-slate-250 rounded-lg focus:outline-indigo-500"
                            >
                              {ruangan.map(rm => (
                                <option key={rm.id} value={rm.id}>{rm.nama_ruangan}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleUpdateRoom(manualRuanganId)}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                            >
                              Simpan
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 leading-normal">Ruangan saat ini diatur di {r ? r.nama_ruangan : 'Aula'}. Ubah ruangan cepat jika terjadi bentrok fisik.</p>
                        )}
                      </div>

                      {/* Action 3: Delete */}
                      {showDeleteConfirm ? (
                        <div className="w-full p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-fade-in text-left">
                          <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            Konfirmasi Penghapusan
                          </p>
                          <p className="text-[11px] text-rose-700 leading-normal">
                            Apakah Anda yakin ingin melepas slot pelajaran ini dari jadwal? Tindakan ini akan mengosongkan jam pelajaran ke-{activeEditCell.jam_ke} pada hari {activeEditCell.hari} ini.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (activeEditCell.scheduleId) {
                                  handleManualDeleteSlot(activeEditCell.scheduleId, true);
                                  setActiveEditCell(null);
                                  setShowDeleteConfirm(false);
                                }
                              }}
                              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition text-center cursor-pointer shadow-xs"
                            >
                              Ya, Lepaskan
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(false)}
                              className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition text-center cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full p-3 text-left bg-white border border-rose-150 hover:border-rose-350 hover:bg-rose-50/30 rounded-xl transition flex items-start gap-3 cursor-pointer group"
                        >
                          <div className="p-2 bg-rose-50 group-hover:bg-rose-100 text-rose-600 rounded-lg shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-rose-950">Lepaskan (Hapus) dari Jadwal</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal font-sans">Mengosongkan sel jam pelajaran ini. Guru dan kelas terkait akan dibebaskan kembali.</p>
                          </div>
                        </button>
                      )}

                    </div>
                  </div>
                );
              })() : (
                /* IF CELL IS EMPTY (ADD/CREATE MODE) */
                <div className="space-y-4">
                  {/* Mode Selector Tab */}
                  <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setManualAddMode('pengampu')}
                      className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${manualAddMode === 'pengampu' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Daftar Pengampu Kelas
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualAddMode('custom')}
                      className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${manualAddMode === 'custom' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Form Bebas (Custom)
                    </button>
                  </div>

                  {/* Mode A: Daftar Pengampu */}
                  {manualAddMode === 'pengampu' && (() => {
                    // Filter pengampu based on filterType
                    let eligiblePengampu = pengampu;
                    if (filterType === 'kelas') {
                      eligiblePengampu = pengampu.filter(p => p.kelas_id === filterId);
                    } else if (filterType === 'guru') {
                      eligiblePengampu = pengampu.filter(p => p.guru_id === filterId);
                    }

                    // Map each with its scheduling status and conflict status
                    const mappedPengampu = eligiblePengampu.map(p => {
                      const scheduled = jadwal.filter(s => s.kelas_id === p.kelas_id && s.guru_id === p.guru_id && s.mapel_id === p.mapel_id).length;
                      const isMet = scheduled >= p.jumlah_jam;
                      
                      // Check for conflicts at this exact slot (activeEditCell.hari, activeEditCell.jam_ke)
                      const conflictSlot = jadwal.find(s => s.hari === activeEditCell.hari && s.jam_ke === activeEditCell.jam_ke && s.guru_id === p.guru_id);
                      const otherClass = conflictSlot ? kelas.find(cl => cl.id === conflictSlot.kelas_id)?.nama_kelas : null;
                      const hasConflict = !!conflictSlot;

                      return {
                        ...p,
                        scheduled,
                        isMet,
                        hasConflict,
                        otherClass
                      };
                    });

                    // Filter out those who have already fulfilled their teaching quota (isMet === true)
                    // "Kalau misalkan jam guru sudah full berarti tidak muncul lagi di popup pas klik grid kosong, alias hanya guru yg belum 100%"
                    const unfulfilledPengampu = mappedPengampu.filter(p => !p.isMet);

                    if (unfulfilledPengampu.length === 0) {
                      return (
                        <div className="p-5 border border-amber-100 bg-amber-50 rounded-xl text-center">
                          <p className="text-xs font-semibold text-amber-800">✨ Kuota Jam Mengajar Sudah Terpenuhi</p>
                          <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">Semua guru/pelajaran untuk kelas ini sudah terjadwal 100% sesuai alokasi JP. Gunakan tab <b>Form Bebas (Custom)</b> jika ingin menyisipkan pelajaran tambahan.</p>
                        </div>
                      );
                    }

                    // Sort so that those without conflicts (hasConflict === false) are on top
                    const sortedPengampu = [...unfulfilledPengampu].sort((a, b) => {
                      if (a.hasConflict && !b.hasConflict) return 1;
                      if (!a.hasConflict && b.hasConflict) return -1;
                      return 0;
                    });

                    return (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran & Guru (Belum 100%):</label>
                        <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white shadow-xs">
                          {sortedPengampu.map(p => {
                            const m = mapel.find(sub => sub.id === p.mapel_id);
                            const g = guru.find(t => t.id === p.guru_id);
                            const c = kelas.find(cls => cls.id === p.kelas_id);

                            return (
                              <label 
                                key={p.id}
                                className={`flex items-start gap-3 p-3 text-xs hover:bg-slate-50 cursor-pointer transition ${selectedPengampuId === p.id ? 'bg-indigo-50/50 hover:bg-indigo-50' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name="selectedPengampu"
                                  value={p.id}
                                  checked={selectedPengampuId === p.id}
                                  onChange={() => setSelectedPengampuId(p.id)}
                                  className="w-4 h-4 text-indigo-600 mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-bold text-slate-850 truncate">{m ? m.nama_mapel : 'Mapel'}</p>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                      {p.scheduled}/{p.jumlah_jam} JP
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">👤 {g ? g.nama.split(',')[0] : 'Guru'} {filterType !== 'kelas' && c ? `— Kelas ${c.nama_kelas}` : ''}</p>
                                  
                                  {/* Conflict / Availability Badge */}
                                  <div className="mt-1.5 flex items-center">
                                    {p.hasConflict ? (
                                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-150 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        Bentrok: Mengajar di Kelas {p.otherClass}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Tersedia (Bebas Bentrok)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mode B: Form Bebas */}
                  {manualAddMode === 'custom' && (
                    <div className="space-y-3 border border-slate-150 p-4 rounded-xl bg-slate-50/50">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Kelas:</label>
                        <select
                          value={customKelasId}
                          onChange={(e) => setCustomKelasId(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500"
                        >
                          <option value="">-- Pilih Kelas --</option>
                          {kelas.map(c => (
                            <option key={c.id} value={c.id}>Kelas {c.nama_kelas}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Guru Pengajar:</label>
                          <select
                            value={customGuruId}
                            onChange={(e) => setCustomGuruId(e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500"
                          >
                            <option value="">-- Pilih Guru --</option>
                            {guru.map(g => (
                              <option key={g.id} value={g.id}>{g.nama.split(',')[0]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Mata Pelajaran:</label>
                          <select
                            value={customMapelId}
                            onChange={(e) => setCustomMapelId(e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500"
                          >
                            <option value="">-- Pilih Pelajaran --</option>
                            {mapel.map(m => (
                              <option key={m.id} value={m.id}>{m.nama_mapel} ({m.kode_mapel})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pilihan Ruangan (Berlaku untuk kedua mode) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ruangan Lokasi:</label>
                    <select
                      value={manualRuanganId}
                      onChange={(e) => setManualRuanganId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500"
                    >
                      {ruangan.map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.nama_ruangan} {filterType === 'ruangan' && filterId === rm.id ? '(Aktif)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveEditCell(null)}
                className="px-4 py-2 bg-white text-slate-700 font-bold border border-slate-200 rounded-lg text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
              
              {!activeEditCell.scheduleId && (
                <button
                  type="button"
                  onClick={handleSaveManualSlot}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  Tambahkan ke Jadwal
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
