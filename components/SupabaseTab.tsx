'use client';

import React from 'react';
import { Database, Info, Activity, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { SUPABASE_SQL_MIGRATION } from '../lib/database-schema';

interface SupabaseTabProps {
  setLogMessages: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function SupabaseTab({ setLogMessages }: SupabaseTabProps) {
  return (
    <div className="space-y-6 lg:col-span-1">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Supabase SQL Schema &amp; Panduan Integrasi</h2>
        <p className="text-xs text-slate-500 font-medium font-sans">Salin skrip DDL/DML migrasi database di bawah ini untuk digunakan di cloud Supabase SQL Editor Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans">
        
        {/* TUTORIAL CARD IN INDONESIAN */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs shadow-xs text-slate-600 font-medium">
          <h3 className="font-semibold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-600 font-bold" /> Panduan Langkah (Langkah-ke-Langkah)
          </h3>

          <ol className="list-decimal pl-4.5 space-y-3 text-slate-605 leading-relaxed">
            <li>
              <strong className="text-slate-800 font-semibold">Buat Proyek Baru:</strong> Buka akun konsol <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-650 font-bold hover:underline">Supabase.com</a>, dan daftarkan sebuah proyek database baru.
            </li>
            <li>
              <strong className="text-slate-800 font-semibold">Buka SQL Editor:</strong> Di menu navigasi sidebar sebelah kiri Supabase, klik tab <i>SQL Editor</i> lalu buat tab baru <i>&quot;New Query&quot;</i>.
            </li>
            <li>
              <strong className="text-slate-800 font-semibold">Jalankan Migrasi:</strong> Salin seluruh kode schema SQL migrasi di sebelah kanan, tempel ke editor, lalu klik tombol <b className="text-indigo-700 bg-indigo-50 px-1 py-0.5 border border-indigo-200 rounded text-[10px]">Run</b>.
            </li>
            <li>
              <strong className="text-slate-800 font-semibold">Koneksikan Client UI:</strong> Tambahkan variabel environment berikut di dalam file <code className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700 font-mono font-bold">.env.local</code> di aplikasi lokal Anda saat deploy di Vercel:
              <pre className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] font-mono mt-1.5 leading-normal text-slate-700 font-bold">
NEXT_PUBLIC_SUPABASE_URL=&quot;url-kamu&quot;{"\n"}
NEXT_PUBLIC_SUPABASE_ANON_KEY=&quot;anon-key-kamu&quot;
              </pre>
            </li>
          </ol>

          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-slate-600">
            <span className="font-semibold text-indigo-850 block mb-1 flex items-center gap-1"><Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Penjelasan Teknis:</span>
            Kami telah melengkapi index pencarian komposit dan relasi kunci asing (Foreign Keys CASCADE) di semua tabel guna memberikan performa penjadwalan query tercepat!
          </div>
        </div>

        {/* COPYABLE CODE CONSOLE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Skrip SQL Migrasi Database</h3>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(SUPABASE_SQL_MIGRATION);
                alert('Skrip migrasi SQL berhasil disalin ke papan klip Anda.');
                setLogMessages(prev => ['Skrip DDL migrasi SQL berhasil disalin ke clipboard.', ...prev]);
              }}
              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              Salin SQL Schema
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-[10px] text-slate-600 overflow-x-auto h-96 shadow-inner leading-relaxed">
            <pre>{SUPABASE_SQL_MIGRATION}</pre>
          </div>
        </div>

      </div>

      {/* FITUR TAMBAHAN: MODUL KEEP ALIVE & CRON-JOB.ORG GUIDE */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white space-y-5 shadow-lg border border-indigo-500/30 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-400/30 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Modul Keep Alive (Anti-Pause Supabase)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  Ready to Use
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 mt-1">
                Database Supabase gratis akan secara otomatis di-pause jika tidak aktif selama 1 minggu. Gunakan endpoint keep-alive kami untuk menjaganya tetap aktif selamanya!
              </p>
            </div>
          </div>
          <a 
            href="https://cron-job.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap"
          >
            <span>Buka Cron-job.org</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
          {/* Langkah 1 */}
          <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px]">1</span>
              <h4 className="font-bold text-slate-100">Dapatkan Endpoint Keep Alive</h4>
            </div>
            <p className="text-slate-300">
              Kami telah menyediakan API Route otomatis khusus untuk melakukan ping ringan (<code className="bg-slate-950 text-indigo-300 px-1 py-0.5 rounded font-mono font-bold text-[10px]">SELECT 1</code>) ke database Supabase Anda:
            </p>
            <div className="bg-slate-950/80 border border-slate-800 p-2 rounded text-[10px] font-mono text-indigo-300 select-all leading-normal overflow-x-auto">
              https://domain-anda.vercel.app/api/keep-alive
            </div>
          </div>

          {/* Langkah 2 */}
          <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px]">2</span>
              <h4 className="font-bold text-slate-100">Konfigurasi DATABASE_URL</h4>
            </div>
            <p className="text-slate-300">
              Pastikan Anda telah mengisi variabel lingkungan di Vercel/environment:
            </p>
            <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded text-[10px] font-mono text-indigo-200 space-y-1">
              <div className="font-bold text-slate-400 text-[9px] uppercase">Key:</div>
              <div>DATABASE_URL</div>
              <div className="font-bold text-slate-400 text-[9px] uppercase mt-1">Value:</div>
              <div className="text-[9px] text-indigo-400 truncate">postgresql://postgres:[password]@db...</div>
            </div>
          </div>

          {/* Langkah 3 */}
          <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px]">3</span>
              <h4 className="font-bold text-slate-100">Set-up Scheduler Gratis</h4>
            </div>
            <p className="text-slate-300">
              Daftarkan akun gratis di <strong className="text-white">cron-job.org</strong> dan buat Cronjob baru:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
              <li><strong>URL:</strong> Berikan link API Keep Alive (Langkah 1).</li>
              <li><strong>Execution:</strong> Setiap 12 jam sekali sudah sangat cukup.</li>
              <li><strong>Request:</strong> Metode GET (Default).</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-indigo-300/80 bg-indigo-950/50 p-3 rounded-lg border border-indigo-500/10">
          <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Keuntungan Menggunakan Endpoint: Query dieksekusi dengan aman melalui serverless function Vercel menggunakan koneksi aman PostgreSQL sehingga kredensial database Anda tidak pernah bocor ke sisi klien.</span>
        </div>
      </div>

    </div>
  );
}
