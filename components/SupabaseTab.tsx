'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, Info, Activity, Clock, ShieldCheck, ExternalLink, 
  RefreshCw, UploadCloud, DownloadCloud, CheckCircle2, AlertCircle, Play, AlertTriangle 
} from 'lucide-react';
import { SUPABASE_SQL_MIGRATION } from '../lib/database-schema';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseModeActive } from '../lib/supabaseClient';
import { SupabaseSyncService } from '../lib/supabaseSync';

interface SupabaseTabProps {
  setLogMessages: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function SupabaseTab({ setLogMessages }: SupabaseTabProps) {
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    const config = getSupabaseConfig();
    return config.supabaseUrl || '';
  });
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => {
    const config = getSupabaseConfig();
    return config.supabaseAnonKey || '';
  });
  const [isConnected, setIsConnected] = useState(() => {
    return isSupabaseModeActive();
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);


  const handleConnect = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      alert('Mohon masukkan URL dan Anon Key Supabase terlebih dahulu.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setSyncLogs(prev => ['Mencoba menghubungkan langsung ke Supabase...', ...prev]);

    // Simpan dulu untuk dites koneksinya
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);

    const test = await SupabaseSyncService.testConnection();
    setIsTesting(false);
    setTestResult(test);

    if (test.success) {
      setIsConnected(true);
      setLogMessages(prev => ['Terhubung secara langsung ke database cloud Supabase!', ...prev]);
      setSyncLogs(prev => [
        `✅ ${test.message}`,
        'Aplikasi kini beroperasi dalam MODE DIRECT SUPABASE.',
        ...prev
      ]);
    } else {
      setIsConnected(false);
      // Hapus config jika tes koneksi gagal agar tidak masuk ke mode rusak
      saveSupabaseConfig('', '');
      setSyncLogs(prev => [`❌ Koneksi gagal: ${test.message}`, ...prev]);
    }
  };

  const handleDisconnect = () => {
    saveSupabaseConfig('', '');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setIsConnected(false);
    setTestResult(null);
    setLogMessages(prev => ['Koneksi Supabase diputuskan. Kembali ke mode penyimpanan lokal offline.', ...prev]);
    setSyncLogs(prev => ['🔌 Koneksi diputuskan. Aplikasi kembali ke mode penyimpanan offline LocalStorage.', ...prev]);
  };

  const handlePush = async () => {
    if (!confirm('Apakah Anda yakin ingin MENGUNGGAH (PUSH) semua data lokal Anda ke Supabase? Data di tabel Supabase yang berbenturan mungkin akan di-update.')) {
      return;
    }
    setIsSyncing(true);
    setSyncLogs(prev => ['🚀 Memulai pengunggahan data (PUSH) ke Supabase...', ...prev]);

    const result = await SupabaseSyncService.pushAll();
    setIsSyncing(false);

    // Append logs ke sync console
    if (result.logs && result.logs.length > 0) {
      setSyncLogs(prev => [...result.logs.map(log => `[PUSH] ${log}`), ...prev]);
    }

    if (result.success) {
      setLogMessages(prev => ['Berhasil mensinkronisasikan dan mengunggah data ke Supabase cloud!', ...prev]);
      alert('Unggah data ke Supabase berhasil!');
    } else {
      setLogMessages(prev => [`Error pengunggahan data ke Supabase: ${result.message}`, ...prev]);
      alert(`Gagal mengunggah data: ${result.message}`);
    }
  };

  const handlePull = async () => {
    if (!confirm('Peringatan! Mengunduh (PULL) data dari Supabase akan MENIMPA semua data lokal Anda di browser saat ini. Apakah Anda yakin ingin melanjutkan?')) {
      return;
    }
    setIsSyncing(true);
    setSyncLogs(prev => ['📥 Memulai pengunduhan data (PULL) dari Supabase...', ...prev]);

    const result = await SupabaseSyncService.pullAll();
    setIsSyncing(false);

    if (result.logs && result.logs.length > 0) {
      setSyncLogs(prev => [...result.logs.map(log => `[PULL] ${log}`), ...prev]);
    }

    if (result.success) {
      setLogMessages(prev => ['Berhasil mengunduh seluruh data terbaru dari Supabase!', ...prev]);
      alert('Berhasil mengunduh data terbaru dari Supabase ke browser lokal Anda!');
      // Reload window agar perubahan state termuat sempurna di tab dashboard
      window.location.reload();
    } else {
      setLogMessages(prev => [`Error pengunduhan data dari Supabase: ${result.message}`, ...prev]);
      alert(`Gagal mengunduh data: ${result.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-600 shrink-0" />
          <span>Integrasi Cloud Database Supabase</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium font-sans mt-1">
          Hubungkan aplikasi penjadwalan ini secara langsung ke cloud database Supabase PostgreSQL Anda untuk sinkronisasi multi-pengguna dan pencadangan instan yang aman.
        </p>
      </div>

      {/* Mode Status Indicator */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans ${
        isConnected 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isConnected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
            <Activity className={`w-5 h-5 ${isConnected ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Status Database</h3>
            <span className="text-sm font-bold block mt-0.5">
              {isConnected ? '🟢 Sinkronisasi Cloud Supabase Aktif' : '🟡 Berjalan dalam Penyimpanan Aman Terenkripsi'}
            </span>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
              {isConnected 
                ? 'Seluruh data terjadwal disinkronkan secara aman ke database cloud Supabase.' 
                : 'Data disimpan secara aman di browser Anda. Hubungkan ke database cloud Supabase Anda di bawah untuk mengaktifkan pencadangan otomatis cloud.'}
            </p>
          </div>
        </div>

        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-xs border border-rose-200 cursor-pointer transition shrink-0"
          >
            Putuskan Koneksi Supabase
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* PANEL KONEKTOR DAN KREDENSIAL */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" /> Atur Kredensial Supabase Anda
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">NEXT_PUBLIC_SUPABASE_URL</label>
                <input
                  type="text"
                  placeholder="https://xxx.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  disabled={isConnected}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-500 focus:border-indigo-500 text-slate-800 font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
                <textarea
                  placeholder="Kunci anonim yang diawali dengan eyJhbGciOi..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  disabled={isConnected}
                  rows={3}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-500 focus:border-indigo-500 text-slate-800 font-mono disabled:opacity-60 leading-normal"
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs leading-relaxed flex items-start gap-1.5 ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">{testResult.success ? 'Koneksi Sukses!' : 'Koneksi Gagal'}</span>
                  <span className="text-[10px] mt-0.5 block">{testResult.message}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isTesting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Mengecek Koneksi...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Koneksikan &amp; Simpan
                  </>
                )}
              </button>
            ) : (
              <div className="text-center text-xs font-semibold text-emerald-600 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                Aplikasi Berhasil Terkoneksi 🥳
              </div>
            )}
          </div>
        </div>

        {/* PANEL METRIC & SINKRONISASI DATA */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <RefreshCw className="w-4.5 h-4.5 text-indigo-600" /> Sinkronisasi Database Cloud
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            Gunakan tombol aksi di bawah untuk melakukan sinkronisasi massal seluruh data (Guru, Mapel, Kelas, Ruangan, Jadwal, Preferensi, Konflik) dari atau ke database cloud Supabase Anda.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={handlePush}
              disabled={!isConnected || isSyncing}
              className="w-full p-4 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 rounded-xl transition cursor-pointer text-left flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shrink-0 mt-0.5">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-indigo-950 block">Push Semua Data ke Supabase</span>
                <span className="text-[10px] text-indigo-800 block mt-0.5 leading-relaxed">
                  Unggah seluruh konfigurasi guru, pengampu, kelas, serta draf jadwal pelajaran di penyimpanan Anda ke tabel Supabase. Sangat cocok untuk sinkronisasi pertama kali.
                </span>
              </div>
            </button>

            <button
              onClick={handlePull}
              disabled={!isConnected || isSyncing}
              className="w-full p-4 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl transition cursor-pointer text-left flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-650 shrink-0 mt-0.5">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-emerald-950 block">Pull Semua Data dari Supabase</span>
                <span className="text-[10px] text-emerald-800 block mt-0.5 leading-relaxed text-left">
                  Tarik seluruh data terbaru dari tabel Supabase cloud untuk memperbarui penyimpanan lokal Anda. Berguna untuk memuat jadwal dari perangkat lain atau memulihkan data.
                </span>
              </div>
            </button>

            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60 text-[11px] text-indigo-900 leading-relaxed flex items-start gap-2 mt-2">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">✨ Sinkronisasi Otomatis Aktif</span>
                Aplikasi ini dilengkapi **Auto-Save (Push)** instan dengan penundaan 1,2 detik setelah setiap pengeditan, serta **Auto-Pull (Latar Belakang)** setiap 30 detik untuk mendeteksi perubahan dari perangkat lain secara aman dan bebas konflik.
              </div>
            </div>
          </div>
        </div>

        {/* LOG KONSOL UNTUK DETEKSI KESALAHAN */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-indigo-600" /> Log Transaksi Database
            </h3>
            <button 
              onClick={() => setSyncLogs([])}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-bold transition"
            >
              Clear
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Semua aktivitas kueri database, sinkronisasi cloud, dan respons transaksi dicatat secara real-time di bawah ini.
          </p>

          <div className="flex-1 min-h-[160px] bg-slate-950 text-indigo-300 p-3 rounded-lg font-mono text-[9px] leading-relaxed overflow-y-auto max-h-[180px] shadow-inner select-all">
            {syncLogs.length === 0 ? (
              <div className="text-slate-500 italic h-full flex items-center justify-center">
                Belum ada log transaksi database...
              </div>
            ) : (
              <div className="space-y-1">
                {syncLogs.map((log, idx) => {
                  let logColor = "text-indigo-300";
                  if (log.startsWith('❌') || log.startsWith('ERROR:') || log.includes('[PUSH] ERROR:')) {
                    logColor = "text-rose-400 font-bold";
                  } else if (log.startsWith('✅') || log.includes('BERHASIL')) {
                    logColor = "text-emerald-400 font-bold";
                  } else if (log.startsWith('[PULL]')) {
                    logColor = "text-sky-300";
                  }
                  return (
                    <div key={idx} className={`${logColor} border-b border-slate-900/40 pb-0.5`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SQL SCHEMA CARD FOR MIGRATION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Skrip SQL Migrasi Database (Wajib Dijalankan di Supabase Anda)</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Sebelum melakukan koneksi langsung ke Supabase, buat query baru di SQL Editor Supabase Anda dan jalankan skrip di bawah ini untuk menginisialisasi skema tabel.
            </p>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(SUPABASE_SQL_MIGRATION);
              alert('Skrip migrasi SQL berhasil disalin ke papan klip Anda.');
              setSyncLogs(prev => ['📋 Skrip DDL migrasi SQL berhasil disalin ke clipboard.', ...prev]);
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Salin SQL Schema
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-[10px] text-slate-600 overflow-x-auto h-72 shadow-inner leading-relaxed select-all">
          <pre>{SUPABASE_SQL_MIGRATION}</pre>
        </div>
      </div>

      {/* FOOTER TIPS */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-sans space-y-1.5">
        <span className="font-bold flex items-center gap-1.5 text-indigo-900">
          <AlertTriangle className="w-4 h-4 text-indigo-600" />
          Tips &amp; Trik Pemecahan Masalah (Troubleshooting):
        </span>
        <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
          <li>Jika Anda melihat log error seperti <code className="bg-indigo-100 text-indigo-950 px-1 py-0.5 rounded font-mono text-[10px]">violates foreign key constraint</code>, berarti tabel referensi (seperti Guru, Mapel, atau Kelas) tidak terisi terlebih dahulu. Solusinya, pastikan Anda menekan tombol <strong>&quot;Push Semua Data ke Supabase&quot;</strong> secara utuh.</li>
          <li>Jika ada pelanggaran <code className="bg-indigo-100 text-indigo-950 px-1 py-0.5 rounded font-mono text-[10px]">Row Level Security (RLS)</code>, pastikan kebijakan (policies) di dalam skrip migrasi SQL di atas telah dieksekusi dengan sukses di editor query Supabase Anda.</li>
          <li>Koneksi langsung ke database Supabase ini aman karena kredensial disimpan di browser lokal Anda secara terenkripsi, atau diatur via variabel lingkungan server.</li>
        </ul>
      </div>

    </div>
  );
}
