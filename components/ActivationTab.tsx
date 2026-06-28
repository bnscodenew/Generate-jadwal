'use client';

import React, { useState } from 'react';
import { Key, CheckCircle, AlertCircle, CreditCard, Lock, ShieldCheck, HelpCircle, Sparkles } from 'lucide-react';
import { LocalDB } from '../lib/db';
import { getSupabaseClient, isSupabaseModeActive } from '../lib/supabaseClient';

interface ActivationTabProps {
  currentUser: any;
  setCurrentUser: (user: any) => void;
  setLogMessages: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function ActivationTab({ currentUser, setCurrentUser, setLogMessages }: ActivationTabProps) {
  const [serialKeyInput, setSerialKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const keyString = serialKeyInput.trim();
    if (!keyString) {
      setErrorMsg('Masukkan kode serial terlebih dahulu.');
      return;
    }

    setLoading(true);

    if (isSupabaseModeActive()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          // Periksa apakah key ada di tabel serial_keys Supabase
          const { data: keyData, error: fetchError } = await supabase
            .from('serial_keys')
            .select('*')
            .eq('key', keyString.toUpperCase())
            .single();

          if (fetchError) {
            console.error("Gagal memeriksa key di Supabase:", fetchError);
            if (fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist')) {
              // Jika tabel tidak ada atau baris tidak ditemukan, coba fallback ke LocalDB
              const localKeys = LocalDB.getSerialKeys();
              const hasLocal = localKeys.some(k => k.key.toUpperCase() === keyString.toUpperCase());
              
              if (hasLocal) {
                const result = LocalDB.activateSerialKey(currentUser.username, keyString);
                if (result.success) {
                  // Sinkronkan status PRO ke profiles di Supabase jika profilnya ada
                  await supabase
                    .from('profiles')
                    .update({
                      is_pro: true,
                      serial_key: keyString.toUpperCase(),
                      activated_at: new Date().toISOString()
                    })
                    .eq('id', currentUser.username);

                  setSuccessMsg("Selamat! Akun Anda berhasil diaktivasi ke Jadwalify PRO.");
                  const updatedUser = {
                    ...currentUser,
                    is_pro: true,
                    serial_key: keyString.toUpperCase(),
                    activated_at: new Date().toISOString()
                  };
                  localStorage.setItem('sch_current_user', JSON.stringify(updatedUser));
                  setCurrentUser(updatedUser);
                  setLogMessages(prev => [`Akun @${currentUser.username} berhasil diaktivasi secara lokal & disinkronkan ke cloud.`, ...prev]);
                  setSerialKeyInput('');
                } else {
                  setErrorMsg(result.message);
                }
              } else {
                setErrorMsg('Kode serial tidak valid atau tidak ditemukan di database.');
              }
            } else {
              setErrorMsg(`Gagal memeriksa lisensi: ${fetchError.message}`);
            }
            setLoading(false);
            return;
          }

          if (keyData) {
            if (keyData.is_used) {
              setErrorMsg(`Kode serial sudah digunakan oleh pengguna lain.`);
              setLoading(false);
              return;
            }

            // Klaim key di tabel serial_keys
            const { error: keyUpdateError } = await supabase
              .from('serial_keys')
              .update({
                is_used: true,
                used_by: currentUser.username,
                activated_at: new Date().toISOString()
              })
              .eq('key', keyString.toUpperCase());

            if (keyUpdateError) {
              setErrorMsg(`Gagal mengklaim lisensi: ${keyUpdateError.message}`);
              setLoading(false);
              return;
            }

            // Perbarui status PRO di profiles Supabase
            const { error: profileUpdateError } = await supabase
              .from('profiles')
              .update({
                is_pro: true,
                serial_key: keyString.toUpperCase(),
                activated_at: new Date().toISOString()
              })
              .eq('id', currentUser.username);

            if (profileUpdateError) {
              setErrorMsg(`Gagal mengaktifkan profil PRO: ${profileUpdateError.message}`);
              setLoading(false);
              return;
            }

            // Berhasil! Perbarui local state & localStorage
            const updatedUser = {
              ...currentUser,
              is_pro: true,
              serial_key: keyString.toUpperCase(),
              activated_at: new Date().toISOString()
            };
            localStorage.setItem('sch_current_user', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            // Selaraskan juga LocalDB agar tetap sinkron jika offline
            LocalDB.updateUserProStatus(currentUser.username, true, keyString.toUpperCase());

            setSuccessMsg("Selamat! Akun Anda berhasil diaktivasi ke Jadwalify PRO.");
            setLogMessages(prev => [
              `Akun @${currentUser.username} berhasil diaktivasi di Cloud menggunakan serial key ${keyString.toUpperCase()}.`,
              ...prev
            ]);
            setSerialKeyInput('');
          }
        } catch (err: any) {
          setErrorMsg(`Terjadi kesalahan sistem: ${err.message}`);
        }
        setLoading(false);
        return;
      }
    }

    // Standard offline mode activation
    setTimeout(() => {
      const result = LocalDB.activateSerialKey(currentUser.username, keyString);
      setLoading(false);

      if (result.success) {
        setSuccessMsg(result.message);
        const updatedUser = LocalDB.getCurrentUser();
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
        setLogMessages(prev => [
          `Akun @${currentUser.username} berhasil diaktivasi menggunakan serial key secara lokal.`,
          ...prev
        ]);
        setSerialKeyInput('');
      } else {
        setErrorMsg(result.message);
      }
    }, 800);
  };

  const isPro = currentUser?.is_pro;

  return (
    <div className="space-y-6 font-sans">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Status Lisensi &amp; Aktivasi
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Kelola langganan dan aktivasi lisensi profesional Jadwalify Anda di sini.
          </p>
        </div>
        <div className="flex items-center">
          {isPro ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-pulse">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              PROFESIONAL (PRO) AKTIF
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              VERSI TRIAL (TERBATAS)
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input & Key Details */}
        <div className="lg:col-span-7 space-y-6">
          {isPro ? (
            // PRO ACTIVE LAYOUT
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-40 h-40" />
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] text-indigo-300 font-bold tracking-widest uppercase font-mono">Lisenasi Premium Terverifikasi</div>
                  <h3 className="text-lg font-black tracking-tight text-white">Jadwalify Professional</h3>
                </div>
              </div>

              <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-xs font-mono text-xs">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-300">Pemilik Akun</span>
                  <span className="font-bold text-white">@{currentUser.username}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-300">Nama Sekolah</span>
                  <span className="font-bold text-indigo-200 truncate max-w-[180px]" title={currentUser.nama_sekolah}>
                    {currentUser.nama_sekolah}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-300">Kunci Serial</span>
                  <span className="font-bold text-emerald-300">
                    {currentUser.serial_key ? `${currentUser.serial_key.substring(0, 12)}****` : 'ADMIN-ACTIVATED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Tanggal Aktivasi</span>
                  <span className="font-bold text-slate-200">
                    {currentUser.activated_at ? new Date(currentUser.activated_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : '-'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-indigo-200 font-semibold bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Terima kasih! Dukungan Anda memungkinkan kami terus menyempurnakan algoritma penataan jadwal cerdas ini.</span>
              </div>
            </div>
          ) : (
            // TRIAL ACTIVATION FORM
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 text-indigo-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Aktivasi Kunci Serial</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Masukkan 16 karakter kunci serial untuk membuka akses PRO.</p>
                </div>
              </div>

              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Kode Serial (Serial Key)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="JADW-PRO-XXXX-XXXX"
                      value={serialKeyInput}
                      onChange={(e) => setSerialKeyInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition uppercase font-mono"
                      maxLength={24}
                      disabled={loading}
                    />
                    <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memproses Aktivasi...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Aktivasi Sekarang
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Trial Limitations Card */}
          {!isPro && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">Akses Terbatas Akun Trial</h4>
              <div className="space-y-2.5 text-xs text-slate-600 font-semibold leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span><strong>Format PDF Terbatas:</strong> Hasil cetak master tidak didukung oleh styling kustom premium.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span><strong>Batas Penjadwalan:</strong> Algoritma Genetika hanya terbatas pada 5 generasi kalkulasi.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span><strong>Cloud Sync:</strong> Tidak dapat mengaktifkan sinkronisasi database cloud otomatis.</span>
                </p>
              </div>
            </div>
          )}

          {/* WhatsApp Purchase CTA */}
          {!isPro && (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 text-white p-2.5 rounded-xl">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.989-1.873-1.873-4.352-2.902-6.99-2.903-5.438 0-9.86 4.417-9.864 9.861-.001 1.777.464 3.513 1.348 5.044L1.815 21.75l5.068-1.32c1.55.845 3.238 1.286 4.894 1.286zm11.333-7.794c-.32-.16-1.89-.88-2.185-.987-.294-.107-.508-.16-.721.16-.213.32-.827.987-1.014 1.201-.187.213-.374.24-.694.08-.32-.16-1.352-.499-2.575-1.59-.95-.848-1.592-1.895-1.779-2.214-.187-.32-.02-.493.14-.653.144-.144.32-.374.48-.56.16-.188.213-.32.32-.534.107-.213.053-.4-.027-.56-.08-.16-.721-1.734-.987-2.375-.259-.624-.523-.54-.721-.55l-.614-.01c-.213 0-.56.08-.854.4-.294.32-1.121 1.095-1.121 2.67 0 1.575 1.148 3.1 1.308 3.313.16.213 2.259 3.45 5.474 4.84.764.33 1.36.527 1.824.674.767.244 1.467.21 2.02.127.618-.093 1.89-.773 2.158-1.48.267-.707.267-1.307.187-1.434-.08-.127-.294-.213-.614-.374z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Hubungi WhatsApp Resmi</h3>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Pesan Kode Serial Lisensi PRO secara mudah dan instan melalui nomor WhatsApp resmi kami.</p>
                </div>
              </div>

              <div className="bg-white border border-emerald-100 rounded-xl p-4 space-y-2 shadow-xs">
                <div className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider font-mono">Draf Pesan Otomatis:</div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-mono text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
{`Halo Admin Jadwalify 👋,

Saya tertarik untuk membeli Lisensi PRO Resmi agar dapat menikmati fitur penuh Jadwalify.

Berikut detail akun sekolah saya:
• Username     : @${currentUser?.username || 'user'}
• Nama Sekolah : ${currentUser?.nama_sekolah || '-'}

Mohon informasi harga, prosedur pembayaran, serta pengiriman Kode Serial PRO. Terima kasih!`}
                </div>
              </div>

              <a
                href={`https://wa.me/6289522537711?text=${encodeURIComponent(
                  `Halo Admin Jadwalify 👋,\n\nSaya tertarik untuk membeli Lisensi PRO Resmi agar dapat menikmati fitur penuh Jadwalify.\n\nBerikut detail akun sekolah saya:\n• Username     : @${currentUser?.username || 'user'}\n• Nama Sekolah : ${currentUser?.nama_sekolah || '-'}\n\nMohon informasi harga, prosedur pembayaran, serta pengiriman Kode Serial PRO. Terima kasih!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm font-sans"
              >
                <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.989-1.873-1.873-4.352-2.902-6.99-2.903-5.438 0-9.86 4.417-9.864 9.861-.001 1.777.464 3.513 1.348 5.044L1.815 21.75l5.068-1.32c1.55.845 3.238 1.286 4.894 1.286zm11.333-7.794c-.32-.16-1.89-.88-2.185-.987-.294-.107-.508-.16-.721.16-.213.32-.827.987-1.014 1.201-.187.213-.374.24-.694.08-.32-.16-1.352-.499-2.575-1.59-.95-.848-1.592-1.895-1.779-2.214-.187-.32-.02-.493.14-.653.144-.144.32-.374.48-.56.16-.188.213-.32.32-.534.107-.213.053-.4-.027-.56-.08-.16-.721-1.734-.987-2.375-.259-.624-.523-.54-.721-.55l-.614-.01c-.213 0-.56.08-.854.4-.294.32-1.121 1.095-1.121 2.67 0 1.575 1.148 3.1 1.308 3.313.16.213 2.259 3.45 5.474 4.84.764.33 1.36.527 1.824.674.767.244 1.467.21 2.02.127.618-.093 1.89-.773 2.158-1.48.267-.707.267-1.307.187-1.434-.08-.127-.294-.213-.614-.374z" />
                </svg>
                <span>Beli Lisensi Resmi via WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Right: Benefits & FAQ */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pro Benefits Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Keunggulan Akun Profesional (PRO)
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 h-8 w-8 shrink-0 flex items-center justify-center font-bold">✓</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">PDF Cetak Profesional Kustom</h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Cetak jadwal kolektif super bersih dengan layout landscape, footer tanda tangan, dan legenda otomatis.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 h-8 w-8 shrink-0 flex items-center justify-center font-bold">✓</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Optimasi Genetika Tanpa Batas</h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Temukan solusi jadwal sekolah super padat dengan ratusan generasi fitness kalkulasi bebas bentrok.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 h-8 w-8 shrink-0 flex items-center justify-center font-bold">✓</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pencadangan Cloud Otomatis</h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Hubungkan jadwal sekolah Anda secara reaktif ke Supabase Cloud untuk kolaborasi multi-perangkat.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Licensing FAQ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              Pertanyaan Umum (FAQ)
            </h3>

            <div className="space-y-3 text-[11px] font-semibold text-slate-600">
              <div className="border-b border-slate-50 pb-2.5">
                <h4 className="font-bold text-slate-800 mb-0.5">Bagaimana cara mendapatkan Kode Serial?</h4>
                <p className="text-slate-500 leading-relaxed">Anda dapat membelinya dengan menghubungi kami langsung melalui nomor WhatsApp resmi <strong>6289522537711</strong>. Kami siap memandu pembayaran dan mengirimkan Kode Serial PRO seketika.</p>
              </div>
              <div className="border-b border-slate-50 pb-2.5">
                <h4 className="font-bold text-slate-800 mb-0.5">Apakah Lisensi PRO berlaku selamanya?</h4>
                <p className="text-slate-500 leading-relaxed">Ya, sekali diaktifkan, lisensi PRO terikat permanen dengan akun sekolah Anda tanpa masa kedaluwarsa.</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-0.5">Dapatkah satu Kode Serial digunakan berkali-kali?</h4>
                <p className="text-slate-500 leading-relaxed">Tidak. Demi keamanan data, satu kode serial hanya berlaku unik untuk satu aktivasi akun sekolah saja.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
