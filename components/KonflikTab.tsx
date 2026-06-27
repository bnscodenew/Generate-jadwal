'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { KonflikJadwal } from '../lib/types';

interface KonflikTabProps {
  conflicts: KonflikJadwal[];
}

export default function KonflikTab({ conflicts }: KonflikTabProps) {
  // Helper function to generate contextual recommendations
  const getSmartRecommendations = () => {
    const recs: { title: string; desc: string; badge: string; type: string }[] = [];

    // Analyze teacher conflicts
    const teacherConflicts = conflicts.filter(c => c.tipe_konflik === 'guru_bentrok');
    if (teacherConflicts.length > 0) {
      const uniqueTeachers = Array.from(new Set(teacherConflicts.map(c => c.entities_involved?.[0] || 'Guru').filter(Boolean)));
      uniqueTeachers.slice(0, 4).forEach(teacher => {
        recs.push({
          title: `Bagi/Split Beban Mengajar Guru: ${teacher}`,
          desc: `Guru ${teacher} memiliki jam mengajar ganda pada jam pelajaran yang sama. Anda dapat membagi (split) jam mengajar kelas paralel kepada guru lain, atau menggunakan fitur "Tukar Slot" di halaman Grid untuk memindahkan salah satu jadwal mengajar ke slot kosong.`,
          badge: 'Split Beban / Tukar',
          type: 'teacher'
        });
      });
    }

    // Analyze class conflicts
    const classConflicts = conflicts.filter(c => c.tipe_konflik === 'kelas_bentrok');
    if (classConflicts.length > 0) {
      const uniqueClasses = Array.from(new Set(classConflicts.map(c => c.entities_involved?.[0] || 'Kelas').filter(Boolean)));
      uniqueClasses.slice(0, 4).forEach(cls => {
        recs.push({
          title: `Tukar Waktu Ganda Kelas: ${cls}`,
          desc: `Kelas ${cls} memiliki jadwal bertumpuk pada jam yang sama. Disarankan untuk memindahkan salah satu mata pelajaran ke hari atau jam pelajaran lain yang masih kosong pada kelas tersebut menggunakan grid interaktif.`,
          badge: 'Atur Ulang Slot',
          type: 'class'
        });
      });
    }

    // Analyze room conflicts
    const roomConflicts = conflicts.filter(c => c.tipe_konflik === 'ruangan_bentrok');
    if (roomConflicts.length > 0) {
      const uniqueRooms = Array.from(new Set(roomConflicts.map(c => c.entities_involved?.[0] || 'Ruangan').filter(Boolean)));
      uniqueRooms.slice(0, 4).forEach(room => {
        recs.push({
          title: `Alokasikan Ruang Cadangan untuk ${room}`,
          desc: `Ruangan ${room} digunakan oleh beberapa kelas paralel sekaligus. Anda dapat mengubah salah satu kelas ke ruangan kosong lainnya, atau menyelenggarakan pembelajaran gabungan sementara di ruang aula.`,
          badge: 'Pindah Ruangan',
          type: 'room'
        });
      });
    }

    // Analyze preference conflicts
    const prefConflicts = conflicts.filter(c => c.tipe_konflik === 'preferensi_bentrok');
    if (prefConflicts.length > 0) {
      const uniqueTeachers = Array.from(new Set(prefConflicts.map(c => c.entities_involved?.[0] || 'Guru').filter(Boolean)));
      uniqueTeachers.slice(0, 4).forEach(teacher => {
        recs.push({
          title: `Penyelarasan Preferensi: ${teacher}`,
          desc: `Guru ${teacher} terjadwal pada hari/jam berhalangan karena keterbatasan slot sekolah. Cobalah untuk membuka opsi hari/jam bersedia mengajar yang lebih luas di menu Preferensi Guru agar sistem dapat memosisikan jadwal dengan ideal.`,
          badge: 'Lembarkan Preferensi',
          type: 'preference'
        });
      });
    }

    return recs;
  };

  const recommendations = getSmartRecommendations();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 font-sans">Validasi Real-time &amp; Laporan Deteksi Konflik</h2>
          {conflicts.length > 0 && (
            <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold">
              Best-Effort Active Draft
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 font-medium font-sans mt-1">
          Melaporkan bentrokan jadwal guru, kelas, ruangan, maupun batasan preferensi harian secara real-time. Memungkinkan draf tetap terisi meskipun kendala sangat padat.
        </p>
      </div>

      {conflicts.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-xl max-w-2xl mx-auto text-center space-y-3.5 shadow-xs font-sans">
          <CheckCircle2 className="w-16 h-16 mx-auto stroke-[1.2] text-emerald-500" />
          <div>
            <h3 className="text-base font-bold text-slate-800">Sempurna! Nol Konflik Terdeteksi</h3>
            <p className="text-xs text-slate-550 max-w-sm mx-auto mt-1">Seluruh jadwal pelajaran berada dalam kondisi non-bentrok. Memenuhi semua batasan wajib serta mengutamakan target soft constraints.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans">
          
          {/* CONFLICT SUMMARY SENSORS */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-xs">
            <h3 className="font-semibold text-sm text-slate-800">Rincian Tipe Pelanggaran</h3>
            
            <div className="space-y-2.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center justify-between p-2 rounded bg-rose-50 border border-rose-200 text-rose-700">
                <span>Bentrok Guru Mengajar</span>
                <span className="font-mono font-bold bg-rose-500 text-white px-1.5 rounded">{conflicts.filter(c => c.tipe_konflik === 'guru_bentrok').length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-200 text-amber-700">
                <span>Bentrok Jadwal Kelas</span>
                <span className="font-mono font-bold bg-amber-500 text-white px-1.5 rounded">{conflicts.filter(c => c.tipe_konflik === 'kelas_bentrok').length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-rose-50 border border-rose-200 text-rose-700">
                <span>Penggunaan Ruang Ganda</span>
                <span className="font-mono font-bold bg-rose-600 text-white px-1.5 rounded">{conflicts.filter(c => c.tipe_konflik === 'ruangan_bentrok').length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                <span>Pelanggaran Preferensi Guru</span>
                <span className="font-mono font-bold bg-indigo-500 text-white px-1.5 rounded">{conflicts.filter(c => c.tipe_konflik === 'preferensi_bentrok').length}</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-lg text-xs leading-relaxed text-emerald-800 space-y-2 font-medium">
              <span className="font-bold text-emerald-900 block">ℹ️ Mengapa Terjadi Bentrok?</span>
              <p>Sistem menggunakan <b>Mode Best-Effort Toleransi Bentrok</b>. Ini memastikan 100% jam pelajaran tetap terisi di draf jadwal meskipun kapasitas waktu/ruangan sekolah Anda saat ini melampaui batas maksimal.</p>
            </div>
          </div>

          {/* ACTIVE DETAILED CONFLICT LOGS & SUGGESTIONS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SMART SUGGESTIONS PANEL */}
            {recommendations.length > 0 && (
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">💡</span>
                  <h3 className="font-bold text-indigo-900 text-sm">Rekomendasi Pintar &amp; Saran Split</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="bg-white p-3.5 border border-indigo-100/60 rounded-lg space-y-1.5 shadow-2xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-800 leading-snug">{rec.title}</span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                          {rec.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{rec.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DETAILED LOGS */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
              <h3 className="font-semibold text-slate-800 text-sm">Masalah Bentrokan Berdasarkan Rapor Waktu</h3>

              <div className="space-y-3">
                {conflicts.map((cf) => {
                  return (
                    <div key={cf.id} className="p-4 bg-slate-50 border border-slate-202 rounded-xl flex items-start gap-4">
                      <div className="p-2 bg-rose-50 text-rose-600 border border-rose-220 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono font-bold text-rose-700 uppercase tracking-tight text-[9px] bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded leading-none">
                            {cf.tipe_konflik.replace('_', ' ').toUpperCase()}
                          </span>
                          {cf.jam_ke > 0 ? (
                            <span className="text-slate-800 font-bold">Hari {cf.hari} • Jam Ke-{cf.jam_ke}</span>
                          ) : (
                            <span className="text-slate-800 font-bold">Kapasitas Hari {cf.hari}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-650 font-medium leading-relaxed mt-1.5">{cf.deskripsi}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
