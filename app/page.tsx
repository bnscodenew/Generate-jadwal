'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Layers, 
  Home, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Database, 
  Activity,
  Menu,
  Lock,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';

import { 
  Guru, 
  MataPelajaran, 
  Kelas, 
  Ruangan, 
  JamPelajaran, 
  PengampuMataPelajaran, 
  PreferensiGuru, 
  Jadwal, 
  KonflikJadwal, 
  Hari 
} from '../lib/types';

import { LocalDB } from '../lib/db';
import { CalendarScheduler } from '../lib/scheduler';

import DashboardTab from '../components/DashboardTab';
import GuruTab from '../components/GuruTab';
import MapelTab from '../components/MapelTab';
import KelasTab from '../components/KelasTab';
import PengampuTab from '../components/PengampuTab';
import GenerateTab from '../components/GenerateTab';
import GridTab from '../components/GridTab';
import KonflikTab from '../components/KonflikTab';
import SupabaseTab from '../components/SupabaseTab';
import PengaturanWaktuTab from '../components/PengaturanWaktuTab';

export default function AdministrativeDashboard() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  
  // Data Master State
  const [guru, setGuru] = useState<Guru[]>([]);
  const [mapel, setMapel] = useState<MataPelajaran[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [ruangan, setRuangan] = useState<Ruangan[]>([]);
  const [jamPelajaran, setJamPelajaran] = useState<JamPelajaran[]>([]);
  const [pengampu, setPengampu] = useState<PengampuMataPelajaran[]>([]);
  const [preferensi, setPreferensi] = useState<PreferensiGuru[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [conflicts, setConflicts] = useState<KonflikJadwal[]>([]);
  const [hariAktif, setHariAktif] = useState<Hari[]>([]);

  // Simulation settings
  const [algorithm, setAlgorithm] = useState<'csp' | 'genetic'>('csp');
  const [connMode, setConnMode] = useState<'mock' | 'supabase'>('mock');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [stats, setStats] = useState({ executionTimeMs: 0, score: 0 });

  // Filter Grid State
  const [filterType, setFilterType] = useState<'kelas' | 'guru' | 'ruangan'>('kelas');
  const [filterId, setFilterId] = useState<string>('');

  // Forms Input State
  const [newGuru, setNewGuru] = useState<Partial<Guru>>({ nama: '', nip: '', jenis_kelamin: 'Laki-laki', no_hp: '', status_aktif: true });
  const [newMapel, setNewMapel] = useState<Partial<MataPelajaran>>({ kode_mapel: '', nama_mapel: '', jumlah_jam_per_minggu: 4 });
  const [newKelas, setNewKelas] = useState<Partial<Kelas>>({ nama_kelas: '', tingkat: 'VII', wali_kelas: '' });
  const [newRuangan, setNewRuangan] = useState<Partial<Ruangan>>({ nama_ruangan: '', kapasitas: 32 });
  const [newPengampu, setNewPengampu] = useState<Partial<PengampuMataPelajaran>>({ guru_id: '', mapel_id: '', kelas_id: '', jumlah_jam: 4 });

  // Selected cell for manual swaps
  const [selectedCell, setSelectedCell] = useState<{ hari: Hari; jam_ke: number; scheduleId?: string | null } | null>(null);

  // Auth States
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authNamaSekolah, setAuthNamaSekolah] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');

  // Load and refresh state
  const loadDatabase = () => {
    setGuru(LocalDB.getGuru());
    setMapel(LocalDB.getMapel());
    setKelas(LocalDB.getKelas());
    setRuangan(LocalDB.getRuangan());
    setJamPelajaran(LocalDB.getJamPelajaran());
    setPengampu(LocalDB.getPengampu());
    setPreferensi(LocalDB.getPreferensi());
    setJadwal(LocalDB.getJadwal());
    setConflicts(LocalDB.getConflicts());
    setHariAktif(LocalDB.getHariAktif());
  };

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Auth actions
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    
    if (!authUsername || !authPassword) {
      setAuthError('Harap isi username dan password.');
      return;
    }
    
    const result = LocalDB.login(authUsername, authPassword);
    if (result.success) {
      setAuthSuccess('Berhasil masuk!');
      setCurrentUser(result.user);
      setAuthUsername('');
      setAuthPassword('');
    } else {
      setAuthError(result.message);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    
    if (!authUsername || !authPassword || !authNamaSekolah) {
      setAuthError('Semua kolom registrasi wajib diisi.');
      return;
    }
    
    const result = LocalDB.register(authUsername, authPassword, authNamaSekolah);
    if (result.success) {
      setAuthSuccess(result.message);
      // Auto login
      const loginRes = LocalDB.login(authUsername, authPassword);
      if (loginRes.success) {
        setCurrentUser(loginRes.user);
      }
      setAuthUsername('');
      setAuthPassword('');
      setAuthNamaSekolah('');
    } else {
      setAuthError(result.message);
    }
  };

  const handleLogout = () => {
    LocalDB.logout();
    setCurrentUser(null);
    setLogMessages(['Anda telah berhasil keluar dari akun.']);
  };

  // Check auth state initially
  useEffect(() => {
    const user = LocalDB.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Reload database when user switches
  useEffect(() => {
    if (currentUser) {
      loadDatabase();
    }
  }, [currentUser]);

  // Update default filter options when master data loads
  useEffect(() => {
    if (filterType === 'kelas' && kelas.length > 0 && !filterId) {
      setFilterId(kelas[0].id);
    } else if (filterType === 'guru' && guru.length > 0 && !filterId) {
      setFilterId(guru[0].id);
    } else if (filterType === 'ruangan' && ruangan.length > 0 && !filterId) {
      setFilterId(ruangan[0].id);
    }
  }, [filterType, kelas, guru, ruangan, filterId]);

  // Handle resetting data
  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin menyetel ulang data master ke data demo default sekolah? Ini akan menghapus jadwal saat ini.')) {
      LocalDB.resetToDefault();
      loadDatabase();
      setLogMessages(['Sistem berhasil disetel ulang ke Data Demo Sekolah SMAN AI.']);
      setSelectedCell(null);
    }
  };

  const handleClearJadwal = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan jadwal pelajaran saat ini?')) {
      LocalDB.saveJadwal([]);
      loadDatabase();
      setLogMessages(['Jadwal pelajaran berhasil dikosongkan.']);
      setSelectedCell(null);
    }
  };

  // --- CRUD GURU ---
  const handleAddGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuru.nama || !newGuru.nip) {
      alert('Nama dan NIP wajib diisi.');
      return;
    }
    const created: Guru = {
      id: `guru-${Date.now()}`,
      nip: newGuru.nip,
      nama: newGuru.nama,
      jenis_kelamin: newGuru.jenis_kelamin || 'Laki-laki',
      no_hp: newGuru.no_hp || '',
      status_aktif: newGuru.status_aktif !== undefined ? newGuru.status_aktif : true,
    };
    const updated = [...guru, created];
    LocalDB.saveGuru(updated);
    
    // Auto populate basic preferences for this new teacher
    const defaultPref: PreferensiGuru = {
      id: `pref-${created.id}`,
      guru_id: created.id,
      hari_tidak_bersedia: [],
      jam_tidak_bersedia: [],
      hari_favorit: [],
      jam_favorit: [],
      max_jam_per_hari: 6
    };
    LocalDB.savePreferensi([...preferensi, defaultPref]);

    setNewGuru({ nama: '', nip: '', jenis_kelamin: 'Laki-laki', no_hp: '', status_aktif: true });
    loadDatabase();
  };

  const handleDeleteGuru = (id: string) => {
    if (confirm('Hapus guru ini? Seluruh data preferensi dan pengampu terkait akan ikut dihapus.')) {
      const filteredGuru = guru.filter(g => g.id !== id);
      const filteredAssignment = pengampu.filter(a => a.guru_id !== id);
      const filteredPref = preferensi.filter(p => p.guru_id !== id);
      const filteredSched = jadwal.filter(s => s.guru_id !== id);
      
      LocalDB.saveGuru(filteredGuru);
      LocalDB.savePengampu(filteredAssignment);
      LocalDB.savePreferensi(filteredPref);
      LocalDB.saveJadwal(filteredSched);
      loadDatabase();
    }
  };

  // --- CRUD MAPEL ---
  const handleAddMapel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapel.nama_mapel || !newMapel.kode_mapel) {
      alert('Nama mapel dan kode mapel wajib diisi.');
      return;
    }
    const created: MataPelajaran = {
      id: `mapel-${Date.now()}`,
      kode_mapel: newMapel.kode_mapel.toUpperCase(),
      nama_mapel: newMapel.nama_mapel,
      jumlah_jam_per_minggu: Number(newMapel.jumlah_jam_per_minggu) || 4,
    };
    LocalDB.saveMapel([...mapel, created]);
    setNewMapel({ kode_mapel: '', nama_mapel: '', jumlah_jam_per_minggu: 4 });
    loadDatabase();
  };

  const handleDeleteMapel = (id: string) => {
    if (confirm('Hapus mata pelajaran ini? Pengampu dan jadwal terkait akan dihapus.')) {
      LocalDB.saveMapel(mapel.filter(m => m.id !== id));
      LocalDB.savePengampu(pengampu.filter(a => a.mapel_id !== id));
      LocalDB.saveJadwal(jadwal.filter(s => s.mapel_id !== id));
      loadDatabase();
    }
  };

  // --- CRUD KELAS & RUANGAN ---
  const handleAddKelas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelas.nama_kelas) {
      alert('Nama kelas wajib diisi.');
      return;
    }
    const created: Kelas = {
      id: `kelas-${Date.now()}`,
      nama_kelas: newKelas.nama_kelas,
      tingkat: newKelas.tingkat || 'VII',
      wali_kelas: newKelas.wali_kelas || '',
    };
    LocalDB.saveKelas([...kelas, created]);
    setNewKelas({ nama_kelas: '', tingkat: 'VII', wali_kelas: '' });
    loadDatabase();
  };

  const handleDeleteKelas = (id: string) => {
    if (confirm('Hapus kelas ini?')) {
      LocalDB.saveKelas(kelas.filter(c => c.id !== id));
      LocalDB.savePengampu(pengampu.filter(a => a.kelas_id !== id));
      LocalDB.saveJadwal(jadwal.filter(s => s.kelas_id !== id));
      loadDatabase();
    }
  };

  const handleAddRuangan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuangan.nama_ruangan) {
      alert('Nama ruangan wajib diisi.');
      return;
    }
    const created: Ruangan = {
      id: `room-${Date.now()}`,
      nama_ruangan: newRuangan.nama_ruangan,
      kapasitas: Number(newRuangan.kapasitas) || 32,
    };
    LocalDB.saveRuangan([...ruangan, created]);
    setNewRuangan({ nama_ruangan: '', kapasitas: 32 });
    loadDatabase();
  };

  const handleDeleteRuangan = (id: string) => {
    if (confirm('Hapus ruangan ini?')) {
      LocalDB.saveRuangan(ruangan.filter(r => r.id !== id));
      LocalDB.saveJadwal(jadwal.filter(s => s.ruangan_id !== id));
      loadDatabase();
    }
  };

  // --- CRUD ASSIGNMENTS (PENGAMPU) ---
  const handleAddPengampu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPengampu.guru_id || !newPengampu.mapel_id || !newPengampu.kelas_id) {
      alert('Harap pilih Guru, Mata Pelajaran, dan Kelas penerima.');
      return;
    }
    const created: PengampuMataPelajaran = {
      id: `assign-${Date.now()}`,
      guru_id: newPengampu.guru_id,
      mapel_id: newPengampu.mapel_id,
      kelas_id: newPengampu.kelas_id,
      jumlah_jam: Number(newPengampu.jumlah_jam) || 4,
    };
    LocalDB.savePengampu([...pengampu, created]);
    setNewPengampu({ guru_id: '', mapel_id: '', kelas_id: '', jumlah_jam: 4 });
    loadDatabase();
  };

  const handleDeletePengampu = (id: string) => {
    if (confirm('Hapus data pengampu ini? Sektor jadwal terkait juga akan dilepaskan.')) {
      LocalDB.savePengampu(pengampu.filter(a => a.id !== id));
      LocalDB.saveJadwal(jadwal.filter(s => s.assignment_id !== id));
      loadDatabase();
    }
  };

  // --- PREFERENCES SAVE CALLBACK ---
  const handleSavePreferensi = (guruId: string, updatedPref: {
    hari_tidak_bersedia: Hari[];
    jam_tidak_bersedia: number[];
    hari_favorit: Hari[];
    jam_favorit: number[];
    max_jam_per_hari: number;
  }) => {
    const existingIdx = preferensi.findIndex(p => p.guru_id === guruId);
    const updated: PreferensiGuru = {
      id: existingIdx !== -1 ? preferensi[existingIdx].id : `pref-${guruId}`,
      guru_id: guruId,
      hari_tidak_bersedia: updatedPref.hari_tidak_bersedia,
      jam_tidak_bersedia: updatedPref.jam_tidak_bersedia,
      hari_favorit: updatedPref.hari_favorit,
      jam_favorit: updatedPref.jam_favorit,
      max_jam_per_hari: updatedPref.max_jam_per_hari
    };

    let newPrefList = [...preferensi];
    if (existingIdx !== -1) {
      newPrefList[existingIdx] = updated;
    } else {
      newPrefList.push(updated);
    }

    LocalDB.savePreferensi(newPrefList);
    loadDatabase();
    setLogMessages(prev => [`Preferensi guru ${guru.find(g => g.id === guruId)?.nama} berhasil disimpan dan dievaluasi.`, ...prev]);
  };

  // --- AUTOMATIC TIMETABLE GENERATION ENGINE ---
  const handleGenerateAutomatedTimetable = () => {
    if (guru.length === 0 || mapel.length === 0 || kelas.length === 0 || ruangan.length === 0 || pengampu.length === 0) {
      alert('Mohon lengkapi seluruh Data Master (Guru, Mapel, Kelas, Ruangan, & Pengampu) terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    setLogMessages(['Menganalisis skema pembagian kelas penjadwalan...', 'Menginisialisasi algoritma pengkondisian...']);

    setTimeout(() => {
      try {
        const solver = new CalendarScheduler(
          guru,
          mapel,
          kelas,
          ruangan,
          jamPelajaran,
          pengampu,
          preferensi,
          hariAktif
        );

        let result;
        if (algorithm === 'csp') {
          result = solver.solveCSP((msg) => {
            setLogMessages(prev => [msg, ...prev]);
          });
        } else {
          result = solver.solveGenetic((msg) => {
            setLogMessages(prev => [msg, ...prev]);
          });
        }

        if (result.schedules.length > 0) {
          LocalDB.saveJadwal(result.schedules);
          setStats({
            executionTimeMs: result.executionTimeMs,
            score: Math.round(result.score)
          });
          setLogMessages(prev => [
            `🎉 SUKSES GENERATOR: Jadwal berhasil dibuat secara otomatis dalam ${result.executionTimeMs} ms dengan total ${result.schedules.length} slot terisi sempurna!`,
            ...prev
          ]);
          setActiveTab('grid');
        } else {
          setLogMessages(prev => ['⚠️ Gagal menyusun jadwal. Constraints terlalu ketat, mohon kurangi batasan preferensi guru atau tambahkan ruangan.', ...prev]);
        }
      } catch (err: any) {
        setLogMessages(prev => [`Error: ${err.message}`, ...prev]);
      } finally {
        setIsGenerating(false);
        loadDatabase();
      }
    }, 400);
  };

  // --- INTERRUPTED MANUAL SCHEDULING INTERACTIVE EDITS (CLICK / SWAP) ---
  const handleCellClick = (hari: Hari, jamKe: number, scheduleId: string | null | undefined) => {
    if (!selectedCell) {
      setSelectedCell({ hari, jam_ke: jamKe, scheduleId });
      setLogMessages(prev => [`Sel dipilih: ${hari} Jam ke-${jamKe}. Pilih slot lain untuk dipindahkan atau tukarkan posisi (Swap).`, ...prev]);
    } else {
      const source = selectedCell;
      setSelectedCell(null);

      if (source.hari === hari && source.jam_ke === jamKe) {
        return;
      }

      const updatedSchedules = [...jadwal];
      
      const sourceIdx = updatedSchedules.findIndex(s => s.id === source.scheduleId);
      const targetIdx = updatedSchedules.findIndex(s => s.hari === hari && s.jam_ke === jamKe && (
        filterType === 'kelas' ? s.kelas_id === filterId :
        filterType === 'guru' ? s.guru_id === filterId :
        s.ruangan_id === filterId
      ));

      if (sourceIdx !== -1 && targetIdx !== -1) {
        const tempHari = updatedSchedules[sourceIdx].hari;
        const tempJam = updatedSchedules[sourceIdx].jam_ke;

        updatedSchedules[sourceIdx].hari = updatedSchedules[targetIdx].hari;
        updatedSchedules[sourceIdx].jam_ke = updatedSchedules[targetIdx].jam_ke;

        updatedSchedules[targetIdx].hari = tempHari;
        updatedSchedules[targetIdx].jam_ke = tempJam;

        setLogMessages(prev => [`Berhasil menukarkan jadwal hari ${source.hari} Jam-${source.jam_ke} dengan hari ${hari} Jam-${jamKe}.`, ...prev]);
      } else if (sourceIdx !== -1 && targetIdx === -1) {
        updatedSchedules[sourceIdx].hari = hari;
        updatedSchedules[sourceIdx].jam_ke = jamKe;
        
        if (filterType === 'ruangan') {
          updatedSchedules[sourceIdx].ruangan_id = filterId;
        }

        setLogMessages(prev => [`Berhasil memindahkan jadwal dari ${source.hari} Jam-${source.jam_ke} ke tempat kosong yaitu ${hari} Jam-${jamKe}.`, ...prev]);
      } else {
        setLogMessages(prev => [`Slot target kosong dan tidak ada data pengampu asal untuk dipindahkan.`, ...prev]);
        return;
      }

      LocalDB.saveJadwal(updatedSchedules);
      loadDatabase();
    }
  };

  const handleManualDeleteSlot = (scheduleId: string) => {
    if (confirm('Apakah Anda yakin ingin melepas slot jadwal ini saja?')) {
      const updated = jadwal.filter(s => s.id !== scheduleId);
      LocalDB.saveJadwal(updated);
      loadDatabase();
      setSelectedCell(null);
      setLogMessages(prev => [`Satu slot pelajaran berhasil dilepaskan secara manual dari rancangan jadwal.`, ...prev]);
    }
  };

  // --- COMPILING DETAILED TIMETABLE VIEWS FOR RENDER ---
  const filteredScheduleMatrix = useMemo(() => {
    const matrix: { [key: number]: { [key in Hari]?: Jadwal[] } } = {};

    for (const p of jamPelajaran) {
      matrix[p.jam_ke] = {};
      for (const d of hariAktif) {
        matrix[p.jam_ke][d] = [];
      }
    }

    for (const s of jadwal) {
      let match = false;
      if (filterType === 'kelas' && s.kelas_id === filterId) match = true;
      if (filterType === 'guru' && s.guru_id === filterId) match = true;
      if (filterType === 'ruangan' && s.ruangan_id === filterId) match = true;

      if (match && matrix[s.jam_ke] && matrix[s.jam_ke][s.hari]) {
        matrix[s.jam_ke][s.hari]!.push(s);
      }
    }

    return matrix;
  }, [jadwal, filterType, filterId, jamPelajaran, hariAktif]);

  // --- EXPORTS TO EXCEL AND PDF ---
  const handleExportExcel = () => {
    const daysArr: Hari[] = hariAktif;
    const currentName = 
      filterType === 'kelas' ? (kelas.find(c => c.id === filterId)?.nama_kelas || 'Kelas') :
      filterType === 'guru' ? (guru.find(g => g.id === filterId)?.nama || 'Guru') :
      (ruangan.find(r => r.id === filterId)?.nama_ruangan || 'Ruangan');

    let csvContent = `DATA JADWAL PELAJARAN - ${currentName.toUpperCase()}\n`;
    csvContent += `Jam Ke,Mulai,Selesai,${daysArr.join(',')}\n`;

    for (const p of jamPelajaran) {
      let row = `${p.jam_ke},${p.jam_mulai},${p.jam_selesai}`;
      for (const d of daysArr) {
        const slots = filteredScheduleMatrix[p.jam_ke]?.[d] || [];
        if (slots.length > 0) {
          const names = slots.map(s => {
            const mName = mapel.find(m => m.id === s.mapel_id)?.nama_mapel || 'Mapel';
            const gName = guru.find(g => g.id === s.guru_id)?.nama.split(',')[0] || 'Guru';
            const rName = ruangan.find(r => r.id === s.ruangan_id)?.nama_ruangan || 'Ruang';
            return `${mName} (${gName} - ${rName})`;
          }).join(' / ');
          row += `,"${names}"`;
        } else {
          row += `,"-"`;
        }
      }
      csvContent += row + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jadwal_sekolah_${currentName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLogMessages(prev => [`Jadwal ${currentName} berhasil diekspor menjadi format CSV/Excel.`, ...prev]);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6" id="auth-root">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white text-center">
            <div className="inline-flex bg-white/10 backdrop-blur-md p-3 rounded-2xl font-mono font-black text-2xl mb-3 shadow-inner">
              JP
            </div>
            <h2 className="text-xl font-bold tracking-tight">Penjadwalan Sekolah Otomatis</h2>
            <p className="text-xs text-indigo-100/95 mt-1 font-medium">Asisten Cerdas Penjadwalan Bebas Bentrok</p>
          </div>

          <div className="p-6 md:p-8">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 mb-6 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setAuthSuccess('');
                  setShowPassword(false);
                }}
                className={`flex-1 pb-3 text-center text-sm transition cursor-pointer ${authMode === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Masuk (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                  setAuthSuccess('');
                  setShowPassword(false);
                }}
                className={`flex-1 pb-3 text-center text-sm transition cursor-pointer ${authMode === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Daftar Akun Baru
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100 font-semibold flex items-center gap-2">
                <span>✓ {authSuccess}</span>
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Sekolah / Instansi</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Users className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Contoh: SMAN 1 Jakarta"
                      value={authNamaSekolah}
                      onChange={(e) => setAuthNamaSekolah(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Masukkan username"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition focus:outline-none cursor-pointer"
                    title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {authMode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" /> Masuk Aplikasi
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Registrasi &amp; Mulai
                  </>
                )}
              </button>
            </form>

            {authMode === 'login' && (
              <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] text-slate-500 font-medium block">Akun Demo Instan:</span>
                <span className="font-mono text-[11px] text-slate-600 mt-1 block font-bold">
                  Username: <span className="text-indigo-600 font-bold">admin</span> • Password: <span className="text-indigo-600 font-bold">password123</span>
                </span>
              </div>
            )}
            
            <div className="mt-6 text-center border-t border-slate-100 pt-4">
              <span className="text-[11px] text-slate-400 font-medium">
                Penyimpanan Lokal Terisolasi: Setiap akun memiliki database jadwal sendiri secara aman.
              </span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white" id="main-root">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-45 px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 transition rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 active:scale-95 flex items-center justify-center border border-slate-200 cursor-pointer"
            title="Sembunyikan/Tampilkan Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-2 rounded-lg font-mono font-bold text-lg tracking-tight flex items-center justify-center shadow-md shadow-indigo-600/20">
            JP
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Jadwal Pelajaran Sekolah Otomatis <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-bold font-sans">PRO</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Penyusunan Jadwal Tanpa Bentrok • {currentUser?.nama_sekolah || 'SMAN 1 AI'} (Akun: @{currentUser?.username})</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs shadow-inner">
            <button 
              onClick={() => {
                setConnMode('mock');
                setLogMessages(prev => ['Mode Server: Simulasi Lokal Database Aktif (Ponsel & Iframe friendly).', ...prev]);
              }}
              className={`px-3 py-1 rounded-md transition duration-200 font-semibold cursor-pointer ${connMode === 'mock' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Simulasi Lokal
            </button>
            <button 
              onClick={() => {
                setConnMode('supabase');
                setLogMessages(prev => ['Mode Server: Koneksi Supabase Eksternal disimulasikan. Skema database siap diekspor.', ...prev]);
              }}
              className={`px-3 py-1 rounded-md transition duration-200 font-semibold cursor-pointer ${connMode === 'supabase' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-indigo-800'}`}
            >
              Supabase Live
            </button>
          </div>

          <button 
            onClick={handleReset} 
            className="flex items-center gap-1.5 px-3 py-1.5 transition-colors text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/20 shadow-xs cursor-pointer"
            title="Kembalikan semua data ke default pabrik"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atur Ulang Master
          </button>

          <button 
            onClick={handleLogout} 
            className="flex items-center gap-1.5 px-3 py-1.5 transition-colors text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/20 shadow-xs cursor-pointer"
            title="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </header>

      {/* MOBILE SIDEBAR BACKDROP */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* CORE FRAMEWORK GRID WITH INTEGRAL SIDEBAR NAVIGATION */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* SIDE BAR NAVIGATION */}
        <aside className={`shrink-0 border-slate-200 bg-white flex flex-col justify-between transition-all duration-300 ease-in-out z-50
          fixed inset-y-0 left-0 lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] overflow-y-auto lg:translate-x-0
          ${sidebarOpen 
            ? 'translate-x-0 w-72 p-4 border-r shadow-2xl lg:shadow-xs lg:w-64' 
            : '-translate-x-full w-72 p-4 border-r lg:w-0 lg:p-0 lg:border-r-0 lg:overflow-hidden lg:opacity-0 lg:pointer-events-none'
          }
        `}>
          <div className="flex flex-col gap-1.5 min-w-[220px]">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-slate-400 font-mono text-[10px] tracking-widest uppercase font-bold">Menu Utama</div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer font-bold text-sm"
                title="Tutup Menu"
              >
                ✕
              </button>
            </div>
            
            <button 
              onClick={() => handleSetActiveTab('dashboard')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Home className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`} /> Ringkasan Dashboard
            </button>

            <button 
              onClick={() => handleSetActiveTab('guru')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'guru' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'guru' ? 'text-indigo-600' : 'text-slate-400'}`} /> Guru &amp; Preferensi
            </button>

            <button 
              onClick={() => handleSetActiveTab('mapel')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'mapel' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <BookOpen className={`w-4 h-4 ${activeTab === 'mapel' ? 'text-indigo-600' : 'text-slate-400'}`} /> Mata Pelajaran
            </button>

            <button 
              onClick={() => handleSetActiveTab('kelas')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'kelas' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Layers className={`w-4 h-4 ${activeTab === 'kelas' ? 'text-indigo-600' : 'text-slate-400'}`} /> Kelas &amp; Ruangan
            </button>

            <button 
              onClick={() => handleSetActiveTab('pengampu')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'pengampu' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Clock className={`w-4 h-4 ${activeTab === 'pengampu' ? 'text-indigo-600' : 'text-slate-400'}`} /> Pengampu Pelajaran
            </button>

            <button 
              onClick={() => handleSetActiveTab('pengaturan_waktu')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'pengaturan_waktu' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Settings className={`w-4 h-4 ${activeTab === 'pengaturan_waktu' ? 'text-indigo-600' : 'text-slate-400'}`} /> Pengaturan Kalender &amp; Jam
            </button>

            <div className="text-slate-400 font-mono text-[10px] tracking-widest px-2 mt-4 mb-2 uppercase border-t border-slate-100 pt-4 font-bold">Penjadwalan</div>

            <button 
              onClick={() => handleSetActiveTab('generate')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'generate' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
            >
              <Play className={`w-4 h-4 ${activeTab === 'generate' ? 'text-white' : 'text-indigo-600'} animate-pulse`} /> Generator Otomatis
            </button>

            <button 
              onClick={() => handleSetActiveTab('grid')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'grid' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Calendar className={`w-4 h-4 ${activeTab === 'grid' ? 'text-indigo-600' : 'text-slate-400'}`} /> Grid Kalender Jadwal
            </button>

            <button 
              onClick={() => handleSetActiveTab('konflik')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold relative cursor-pointer ${activeTab === 'konflik' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <AlertTriangle className={`w-4 h-4 ${activeTab === 'konflik' ? 'text-amber-600' : 'text-slate-400'}`} /> Validasi Konflik
              {conflicts.length > 0 && (
                <span className="absolute right-3 top-3 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white font-mono">
                  {conflicts.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => handleSetActiveTab('supabase')} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all font-semibold cursor-pointer ${activeTab === 'supabase' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold' : 'text-indigo-600 hover:bg-indigo-50/50'}`}
            >
              <Database className="w-4 h-4 text-indigo-500" /> Supabase SQL Schema
            </button>
          </div>

          {/* Console / Log panel */}
          <div className="mt-auto border-t border-slate-100 pt-4 px-1 min-w-[220px]">
            <div className="flex items-center justify-between text-[11px] mb-1.5 text-slate-400 font-mono font-bold">
              <span>LOG AKTIVITAS SISTEM</span>
              <Activity className="w-3 h-3 text-slate-400" />
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] font-mono h-32 overflow-y-auto flex flex-col gap-1 text-slate-600 shadow-inner">
              {logMessages.length === 0 ? (
                <span className="text-slate-400 italic">Belum ada aktivitas baru.</span>
              ) : (
                logMessages.map((msg, i) => (
                  <div key={i} className="leading-tight border-b border-slate-200/40 pb-0.5">
                    <span className="text-indigo-600 select-none mr-1 font-bold">&gt;</span>{msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT WINDOW */}
        <main className="flex-1 bg-slate-50/50 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardTab 
              guru={guru}
              kelas={kelas}
              mapel={mapel}
              jadwal={jadwal}
              conflicts={conflicts}
              pengampu={pengampu}
              setActiveTab={handleSetActiveTab}
              handleClearJadwal={handleClearJadwal}
              loadDatabase={loadDatabase}
              setLogMessages={setLogMessages}
            />
          )}

          {activeTab === 'guru' && (
            <GuruTab 
              guru={guru}
              preferensi={preferensi}
              newGuru={newGuru}
              setNewGuru={setNewGuru}
              handleAddGuru={handleAddGuru}
              handleDeleteGuru={handleDeleteGuru}
              onSavePreferensi={handleSavePreferensi}
              hariAktif={hariAktif}
            />
          )}

          {activeTab === 'mapel' && (
            <MapelTab 
              mapel={mapel}
              newMapel={newMapel}
              setNewMapel={setNewMapel}
              handleAddMapel={handleAddMapel}
              handleDeleteMapel={handleDeleteMapel}
            />
          )}

          {activeTab === 'kelas' && (
            <KelasTab 
              kelas={kelas}
              ruangan={ruangan}
              newKelas={newKelas}
              setNewKelas={setNewKelas}
              newRuangan={newRuangan}
              setNewRuangan={setNewRuangan}
              handleAddKelas={handleAddKelas}
              handleDeleteKelas={handleDeleteKelas}
              handleAddRuangan={handleAddRuangan}
              handleDeleteRuangan={handleDeleteRuangan}
            />
          )}

          {activeTab === 'pengampu' && (
            <PengampuTab 
              guru={guru}
              mapel={mapel}
              kelas={kelas}
              pengampu={pengampu}
              newPengampu={newPengampu}
              setNewPengampu={setNewPengampu}
              handleAddPengampu={handleAddPengampu}
              handleDeletePengampu={handleDeletePengampu}
            />
          )}

          {activeTab === 'generate' && (
            <GenerateTab 
              guru={guru}
              kelas={kelas}
              pengampu={pengampu}
              algorithm={algorithm}
              setAlgorithm={setAlgorithm}
              isGenerating={isGenerating}
              stats={stats}
              handleGenerateAutomatedTimetable={handleGenerateAutomatedTimetable}
            />
          )}

          {activeTab === 'grid' && (
            <GridTab 
              guru={guru}
              kelas={kelas}
              mapel={mapel}
              ruangan={ruangan}
              jamPelajaran={jamPelajaran}
              jadwal={jadwal}
              conflicts={conflicts}
              filterType={filterType}
              setFilterType={setFilterType}
              filterId={filterId}
              setFilterId={setFilterId}
              selectedCell={selectedCell}
              setSelectedCell={setSelectedCell}
              handleCellClick={handleCellClick}
              handleManualDeleteSlot={handleManualDeleteSlot}
              handleExportExcel={handleExportExcel}
              handlePrintPDF={handlePrintPDF}
              filteredScheduleMatrix={filteredScheduleMatrix}
              setActiveTab={handleSetActiveTab}
              hariAktif={hariAktif}
              pengampu={pengampu}
            />
          )}

          {activeTab === 'pengaturan_waktu' && (
            <PengaturanWaktuTab
              hariAktif={hariAktif}
              jamPelajaran={jamPelajaran}
              onUpdateHariAktif={setHariAktif}
              onUpdateJamPelajaran={setJamPelajaran}
              loadDatabase={loadDatabase}
              setLogMessages={setLogMessages}
            />
          )}

          {activeTab === 'konflik' && (
            <KonflikTab conflicts={conflicts} />
          )}

          {activeTab === 'supabase' && (
            <SupabaseTab setLogMessages={setLogMessages} />
          )}
        </main>
      </div>

    </div>
  );
}
