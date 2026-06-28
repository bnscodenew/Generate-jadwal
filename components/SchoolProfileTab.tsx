'use client';

import React, { useState, useEffect, useRef } from 'react';
import { School, Upload, Check, Trash2, Info, Image, ShieldCheck, Save, FileText, RefreshCw } from 'lucide-react';
import { LocalDB } from '../lib/db';
import { isSupabaseModeActive, getSupabaseClient } from '../lib/supabaseClient';

// 6 beautiful preset SVGs that users can select as their official School Logo instantly
const PRESET_LOGOS = [
  {
    id: 'badge-emblem',
    name: 'Klasik Akademik',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-indigo-700">
      <path d="M50 5L15 20V45C15 68 35 88 50 95C65 88 85 68 85 45V20L50 5Z" fill="#3B82F6" stroke="#1D4ED8" stroke-width="4"/>
      <path d="M50 15L25 26V45C25 63 41 79 50 85C59 79 75 63 75 45V26L50 15Z" fill="white"/>
      <path d="M35 38H65V42H35V38Z" fill="#1D4ED8"/>
      <path d="M35 46H65V50H35V46Z" fill="#1D4ED8"/>
      <path d="M35 54H65V58H35V54Z" fill="#1D4ED8"/>
      <path d="M50 25L42 33H58L50 25Z" fill="#F59E0B"/>
      <circle cx="50" cy="68" r="4" fill="#F59E0B"/>
    </svg>`
  },
  {
    id: 'book-crest',
    name: 'Buku & Pena',
    color: 'text-sky-700 bg-sky-50 border-sky-200',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-sky-700">
      <circle cx="50" cy="50" r="45" fill="#0EA5E9" stroke="#0369A1" stroke-width="4"/>
      <circle cx="50" cy="50" r="39" fill="white"/>
      <path d="M32 40C32 35 40 32 50 32C60 32 68 35 68 40V68C68 65 60 62 50 62C40 62 32 65 32 68V40Z" fill="#F0F9FF" stroke="#0369A1" stroke-width="2"/>
      <path d="M50 32V62" stroke="#0369A1" stroke-width="2"/>
      <path d="M42 45H48" stroke="#0369A1" stroke-width="1.5"/>
      <path d="M42 51H48" stroke="#0369A1" stroke-width="1.5"/>
      <path d="M52 45H58" stroke="#0369A1" stroke-width="1.5"/>
      <path d="M52 51H58" stroke="#0369A1" stroke-width="1.5"/>
      <path d="M50 22L54 28H46L50 22Z" fill="#D97706"/>
    </svg>`
  },
  {
    id: 'islamic-madrasah',
    name: 'Bintang & Kubah',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-emerald-700">
      <path d="M50 3L63 15L80 15L80 32L92 45L80 58L80 75L63 75L50 87L37 75L20 75L20 58L8 45L20 32L20 15L37 15L50 3Z" fill="#10B981" stroke="#047857" stroke-width="3"/>
      <circle cx="50" cy="45" r="30" fill="white"/>
      <path d="M35 55C35 42 42 35 50 32C58 35 65 42 65 55H35Z" fill="#D97706" stroke="#047857" stroke-width="1.5"/>
      <path d="M50 22L52 27H48L50 22Z" fill="#D97706"/>
      <circle cx="50" cy="42" r="3" fill="white"/>
    </svg>`
  },
  {
    id: 'vocational-gear',
    name: 'Teknik / SMK',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-amber-700">
      <rect x="10" y="10" width="80" height="80" rx="12" fill="#F59E0B" stroke="#B45309" stroke-width="4"/>
      <rect x="16" y="16" width="68" height="68" rx="8" fill="white"/>
      <path d="M50 25C36 25 25 36 25 50C25 64 36 75 50 75C64 75 75 64 75 50C75 36 64 25 50 25ZM50 35C58 35 65 42 65 50C65 58 58 65 50 65C42 65 35 58 35 50C35 42 42 35 50 35Z" fill="#1E293B"/>
      <path d="M47 20H53V30H47V20Z" fill="#1E293B"/>
      <path d="M47 70H53V80H47V70Z" fill="#1E293B"/>
      <path d="M20 47H30V53H20V47Z" fill="#1E293B"/>
      <path d="M70 47H80V53H70V47Z" fill="#1E293B"/>
      <polygon points="45,45 60,50 45,55" fill="#F59E0B" stroke="#B45309" stroke-width="1"/>
    </svg>`
  },
  {
    id: 'modern-globe',
    name: 'Konektivitas Global',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-teal-700">
      <circle cx="50" cy="50" r="45" fill="#14B8A6" stroke="#0F766E" stroke-width="3"/>
      <circle cx="50" cy="50" r="39" fill="white"/>
      <path d="M50 11C60 11 70 20 70 35C70 50 50 85 50 85C50 85 30 50 30 35C30 20 40 11 50 11Z" fill="#E0F2F1" stroke="#0F766E" stroke-width="2"/>
      <circle cx="50" cy="35" r="10" fill="#14B8A6"/>
      <path d="M35 50H65" stroke="#0F766E" stroke-width="1.5" stroke-dasharray="2 2"/>
    </svg>`
  }
];

interface SchoolProfileTabProps {
  currentUser: any;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
  addLogMessage: (msg: string) => void;
  onProfileUpdated?: () => void;
}

export default function SchoolProfileTab({
  currentUser,
  setCurrentUser,
  addLogMessage,
  onProfileUpdated
}: SchoolProfileTabProps) {
  const [profile, setProfile] = useState({
    nama_sekolah: 'SMAN 1 AI INDONESIA',
    logo_sekolah: null as string | null,
    nama_kepsek: 'Drs. H. Mulyono, M.Pd.',
    nip_kepsek: '19740815 200003 1 002',
    nama_koordinator: 'Siti Aminah, S.Pd.',
    nip_koordinator: '19810312 200801 2 015',
    kota: 'Jakarta',
    tahun_ajaran: 'Tahun Ajaran 2026/2027',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile from DB on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const loaded = LocalDB.getSchoolProfile();
      setProfile(loaded);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser]);

  // Handle local text inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Convert custom uploaded image to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      // Limit size to 1MB
      if (file.size > 1048576) {
        alert('Ukuran file logo terlalu besar. Gunakan gambar di bawah 1 MB (Saran 1:1) untuk performa terbaik.');
        return;
      }

      setPendingFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64String = event.target.result as string;
          setProfile(prev => ({ ...prev, logo_sekolah: base64String }));
          addLogMessage(`🖼️ Logo kustom dipilih: ${file.name} (Pratinjau lokal siap)`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Select a preset logo SVG
  const handleSelectPreset = (svgContent: string) => {
    setPendingFile(null);
    setProfile(prev => ({ ...prev, logo_sekolah: svgContent }));
    addLogMessage('🎨 Memilih Logo Preset Sekolah Resmi');
  };

  // Clear current logo
  const handleRemoveLogo = async () => {
    const previousLogo = profile.logo_sekolah;
    setPendingFile(null);
    setProfile(prev => ({ ...prev, logo_sekolah: null }));
    addLogMessage('🗑️ Logo sekolah dihapus dari profil');

    // If active and was a cloud storage URL, clean up the bucket
    if (isSupabaseModeActive() && previousLogo && previousLogo.includes('/school-logos/')) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const userId = user.id;
            addLogMessage('☁️ Menghapus file logo lama dari Storage Bucket Supabase...');
            
            // List files inside user's directory
            const { data: files, error: listError } = await supabase.storage
              .from('school-logos')
              .list(userId);

            if (!listError && files && files.length > 0) {
              const filesToDelete = files.map((file: any) => `${userId}/${file.name}`);
              const { error: deleteError } = await supabase.storage
                .from('school-logos')
                .remove(filesToDelete);

              if (deleteError) {
                console.error("Gagal menghapus file lama dari storage:", deleteError);
              } else {
                addLogMessage('✅ File logo lama berhasil dihapus secara permanen dari Storage Cloud.');
              }
            }
          }
        } catch (err) {
          console.error("Gagal membersihkan storage:", err);
        }
      }
    }
  };

  // Save changes locally and to Supabase (if active)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      let activeLogoUrl = profile.logo_sekolah;

      // 1. Upload to Supabase Storage if Online Mode is active and we have a new file
      if (isSupabaseModeActive() && pendingFile) {
        const supabase = getSupabaseClient();
        if (supabase) {
          addLogMessage('☁️ Menyiapkan unggahan logo ke Bucket Storage Supabase...');
          
          // Ensure the bucket exists (try to create it if not present)
          try {
            const { data: buckets } = await supabase.storage.listBuckets();
            const hasBucket = buckets?.some((b: any) => b.name === 'school-logos');
            if (!hasBucket) {
              await supabase.storage.createBucket('school-logos', {
                public: true,
                fileSizeLimit: 1048576 // 1MB
              });
              addLogMessage('📦 Membuat Bucket baru "school-logos" di cloud.');
            }
          } catch (bucketErr) {
            console.warn("Mungkin tidak memiliki hak akses untuk membuat bucket secara langsung. Melanjutkan unggahan...", bucketErr);
          }

          // Generate file path and name
          const fileExt = pendingFile.name.split('.').pop();
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || 'anonymous';
          const fileName = `${userId}/logo-${Date.now()}.${fileExt}`;

          // BEFORE UPLOADING THE NEW FILE: Let's list and delete any old logo files in this user directory to prevent trash Accumulation
          try {
            const { data: files, error: listError } = await supabase.storage
              .from('school-logos')
              .list(userId);

            if (!listError && files && files.length > 0) {
              const filesToDelete = files.map((file: any) => `${userId}/${file.name}`);
              await supabase.storage
                .from('school-logos')
                .remove(filesToDelete);
              addLogMessage('🧹 Berhasil membersihkan file logo lama di Storage Bucket (bebas sampah).');
            }
          } catch (cleanErr) {
            console.warn("Gagal membersihkan logo lama dari storage bucket:", cleanErr);
          }

          // Upload the file
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('school-logos')
            .upload(fileName, pendingFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error("Gagal mengunggah logo ke bucket storage:", uploadError);
            addLogMessage(`⚠️ Gagal unggah ke Bucket Storage: ${uploadError.message}. Menggunakan base64 lokal sebagai cadangan.`);
          } else if (uploadData) {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('school-logos')
              .getPublicUrl(fileName);
            
            if (publicUrlData?.publicUrl) {
              activeLogoUrl = publicUrlData.publicUrl;
              addLogMessage(`✅ Logo berhasil diunggah ke Bucket Storage Supabase!`);
            }
          }
        }
      }

      // Update local profile state with the final URL
      const finalProfile = {
        ...profile,
        logo_sekolah: activeLogoUrl
      };
      setProfile(finalProfile);

      // 2. Save locally
      LocalDB.saveSchoolProfile(finalProfile);

      // 3. Update parent states if needed
      if (setCurrentUser) {
        setCurrentUser((prev: any) => ({
          ...prev,
          nama_sekolah: finalProfile.nama_sekolah
        }));
      }

      addLogMessage(`⚙️ Identitas & Logo Sekolah berhasil diperbarui: ${finalProfile.nama_sekolah}`);

      // 4. Save to Supabase Cloud profiles table
      if (isSupabaseModeActive()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from('profiles').upsert({
              id: user.id,
              nama_sekolah: finalProfile.nama_sekolah,
              logo_sekolah: finalProfile.logo_sekolah,
              nama_kepsek: finalProfile.nama_kepsek,
              nip_kepsek: finalProfile.nip_kepsek,
              nama_koordinator: finalProfile.nama_koordinator,
              nip_koordinator: finalProfile.nip_koordinator,
              kota_cetak: finalProfile.kota,
              tahun_ajaran: finalProfile.tahun_ajaran,
              email: user.email,
              is_pro: !!currentUser?.is_pro,
              serial_key: currentUser?.serial_key || null,
              activated_at: currentUser?.activated_at || null,
              role: currentUser?.role || 'user'
            });

            if (error) {
              console.error("Gagal menyimpan profil sekolah ke Supabase profiles:", error);
              addLogMessage(`⚠️ Gagal sinkronisasi data profil sekolah: ${error.message}`);
            } else {
              addLogMessage('☁️ Profil sekolah berhasil disinkronkan ke tabel profiles Supabase.');
            }
          }
        }
      }

      // Clear pending file as it's saved now
      setPendingFile(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan saat menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-1 font-sans">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-500/30">
              <School className="w-6 h-6 text-indigo-300" />
            </div>
            <h1 className="text-lg font-black tracking-tight">Identitas &amp; Logo Sekolah</h1>
          </div>
          <p className="text-xs text-indigo-200/80 font-medium">
            Atur nama sekolah, tahun ajaran, logo resmi, serta detail tanda tangan untuk cetak laporan jadwal PDF profesional.
          </p>
        </div>
        
        {isSupabaseModeActive() && (
          <span className="self-start md:self-auto px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 font-mono animate-pulse">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Terhubung Cloud
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: School Profile Form Fields */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">Detail Informasi &amp; Kurikulum</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Sekolah / Instansi</label>
                <input
                  type="text"
                  name="nama_sekolah"
                  value={profile.nama_sekolah}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                  placeholder="Contoh: SMA Negeri 1 Jakarta"
                  required
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1">Nama ini akan tercetak sebagai judul utama dokumen jadwal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tahun Ajaran</label>
                  <input
                    type="text"
                    name="tahun_ajaran"
                    value={profile.tahun_ajaran}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                    placeholder="Contoh: Tahun Ajaran 2026/2027"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kota Cetak Dokumen</label>
                  <input
                    type="text"
                    name="kota"
                    value={profile.kota}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                    placeholder="Contoh: Jakarta"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signature & Validation Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Check className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">Detail Tanda Tangan Dokumen (Lembar Pengesahan)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Kepala Sekolah */}
              <div className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider">Pihak 1: Kepala Sekolah</div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap &amp; Gelar</label>
                  <input
                    type="text"
                    name="nama_kepsek"
                    value={profile.nama_kepsek}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Drs. H. Mulyono, M.Pd."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    name="nip_kepsek"
                    value={profile.nip_kepsek}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: 19740815 200003 1 002"
                  />
                </div>
              </div>

              {/* Koordinator Kurikulum */}
              <div className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-teal-700 font-extrabold uppercase tracking-wider">Pihak 2: Koordinator/Waka</div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap &amp; Gelar</label>
                  <input
                    type="text"
                    name="nama_koordinator"
                    value={profile.nama_koordinator}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Siti Aminah, S.Pd."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    name="nip_koordinator"
                    value={profile.nip_koordinator}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: 19810312 200801 2 015"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Hand: Logo Upload and Selection presets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Image className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">Logo Resmi Sekolah</h2>
            </div>

            {/* Current Active Logo Box */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative group">
              <div className="w-28 h-28 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex items-center justify-center p-3 relative">
                {profile.logo_sekolah ? (
                  profile.logo_sekolah.trim().startsWith('<svg') ? (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: profile.logo_sekolah }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={profile.logo_sekolah} 
                      alt="Logo Sekolah" 
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <School className="w-12 h-12 stroke-1" />
                    <span className="text-[9px] font-bold uppercase mt-1">Kosong</span>
                  </div>
                )}
              </div>

              {profile.logo_sekolah && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="mt-3.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Logo Ini
                </button>
              )}

              <p className="text-[10px] text-slate-400 font-semibold text-center mt-3 leading-relaxed">
                Logo ini akan ditampilkan pada kop surat / kop jadwal di pratinjau dan hasil cetak PDF.<br />
                <span className="text-amber-600 font-bold">Rekomendasi:</span> Rasio <span className="font-extrabold">1:1 (Kotak)</span> &amp; Maksimal <span className="font-extrabold">1 MB</span>.
              </p>
            </div>

            {/* Upload Custom Logo Button */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Opsi 1: Unggah Gambar Logo Sendiri</div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-indigo-400 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs text-center"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Pilih Gambar (Rasio 1:1, Maks 1MB)</span>
              </button>
            </div>

            {/* Curated Preset Vector Badges */}
            <div className="space-y-3 pt-2">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Opsi 2: Gunakan Template Badge Instan</div>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_LOGOS.map((logo) => (
                  <button
                    key={logo.id}
                    type="button"
                    onClick={() => handleSelectPreset(logo.svg)}
                    className="p-2.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-xs rounded-xl flex flex-col items-center justify-center gap-2 transition cursor-pointer text-center group"
                  >
                    <div className="w-12 h-12 bg-white rounded-lg p-1.5 flex items-center justify-center border border-slate-100 group-hover:scale-105 transition-all">
                      <div dangerouslySetInnerHTML={{ __html: logo.svg }} className="w-full h-full" />
                    </div>
                    <span className="text-[9px] font-extrabold text-slate-600 group-hover:text-indigo-600 truncate max-w-full">
                      {logo.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Action Trigger Save */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3.5 rounded-2xl font-black transition text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-md hover:shadow-lg
                ${saveSuccess 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4.5 h-4.5" />
                  <span>Profil Berhasil Disimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  <span>Simpan Pengaturan Sekolah</span>
                </>
              )}
            </button>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-1.5 animate-bounce">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                <span>Identitas berhasil disimpan &amp; disinkronkan ke cloud secara otomatis!</span>
              </div>
            )}
          </div>

        </div>

      </form>
    </div>
  );
}
