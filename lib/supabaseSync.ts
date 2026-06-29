import { getSupabaseClient, isSupabaseModeActive } from './supabaseClient';
import { LocalDB } from './db';
import { Guru, MataPelajaran, Kelas, Ruangan, JamPelajaran, PengampuMataPelajaran, PreferensiGuru, Jadwal, KonflikJadwal } from './types';

// Helper to check if string is a valid UUID
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Map local IDs to valid UUIDs to satisfy PostgreSQL constraints, ensuring relationships are preserved
function getDeterministicUUID(str: string): string {
  let hash1 = 0, hash2 = 0, hash3 = 0, hash4 = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = (hash1 * 31 + ch) | 0;
    hash2 = (hash2 * 37 + ch) | 0;
    hash3 = (hash3 * 41 + ch) | 0;
    hash4 = (hash4 * 43 + ch) | 0;
  }
  
  const hex = (val: number) => {
    const h = (val >>> 0).toString(16);
    return '00000000'.substring(h.length) + h;
  };
  
  const s1 = hex(hash1);
  const s2 = hex(hash2).substring(0, 4);
  const s3 = hex(hash3).substring(4, 8);
  const s4 = hex(hash4).substring(0, 4);
  const s5 = hex(hash1 ^ hash2 ^ hash3 ^ hash4) + hex(hash1 & hash2 | hash3);
  
  return `${s1}-${s2}-4${s3.substring(1)}-8${s4.substring(1)}-${s5.substring(0, 12)}`;
}

class IDMapper {
  static getUUID(localId: string): string {
    if (!localId) return '';
    if (isValidUUID(localId)) return localId;
    return getDeterministicUUID(localId);
  }

  static reset() {
    // No-op karena pemetaan bersifat deterministik berdasarkan nilai ID lokal!
  }
}

export interface SyncResult {
  success: boolean;
  message: string;
  logs: string[];
}

export class SupabaseSyncService {
  // 1. Cek Koneksi ke Supabase
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: 'Supabase belum dikonfigurasi. Silakan isi URL dan Anon Key.' };
    }
    try {
      // Coba lakukan select sederhana ke tabel teachers atau profiles
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      if (error) {
        // Jika error karena masalah auth rls atau tabel tidak ketemu, jelaskan detailnya
        return { 
          success: false, 
          message: `Koneksi tersambung, namun database mengembalikan error: ${error.message}. Pastikan Anda sudah menjalankan script migrasi SQL.` 
        };
      }
      return { success: true, message: 'Koneksi ke Supabase berhasil! Aplikasi siap mensinkronkan data.' };
    } catch (err: any) {
      return { success: false, message: `Gagal menyambung ke Supabase: ${err.message || String(err)}` };
    }
  }

  // 2. Push Semua Data dari LocalDB ke Supabase (Upload)
  static async pushAll(): Promise<SyncResult> {
    const logs: string[] = [];
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: 'Supabase tidak aktif atau belum terkonfigurasi.', logs };
    }

    try {
      logs.push('Memulai proses unggah data ke Supabase...');
      IDMapper.reset();

      // Ambil data lokal
      const teachers = LocalDB.getGuru();
      const subjects = LocalDB.getMapel();
      const classes = LocalDB.getKelas();
      const rooms = LocalDB.getRuangan();
      const periods = LocalDB.getJamPelajaran();
      const preferences = LocalDB.getPreferensi();
      const assignments = LocalDB.getPengampu();
      const schedules = LocalDB.getJadwal();
      const conflicts = LocalDB.getConflicts();

      // Coba dapatkan user authenticated jika ada, jika tidak, batalkan karena RLS mencegah penulisan tanpa auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          message: 'Sesi masuk Supabase tidak terdeteksi atau telah berakhir. Silakan login terlebih dahulu menggunakan Google.',
          logs: ['Sinkronisasi dibatalkan karena pengguna tidak terautentikasi.', ...(userError ? [`Detail: ${userError.message}`] : [])]
        };
      }
      const userId = user.id;
      
      logs.push(`User authenticated terdeteksi: ${user.email}`);

      // Sync School Profile
      const currentUserNow = LocalDB.getCurrentUser();
      const schoolName = currentUserNow?.nama_sekolah || 'SMAN 1 AI INDONESIA';
      const localProfile = LocalDB.getSchoolProfile();
      
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        nama_sekolah: localProfile.nama_sekolah,
        is_pro: !!currentUserNow?.is_pro,
        serial_key: currentUserNow?.serial_key || null,
        activated_at: currentUserNow?.activated_at || null,
        role: currentUserNow?.role || 'user',
        email: user.email || null,
        logo_sekolah: localProfile.logo_sekolah,
        nama_kepsek: localProfile.nama_kepsek,
        nip_kepsek: localProfile.nip_kepsek,
        nama_koordinator: localProfile.nama_koordinator,
        nip_koordinator: localProfile.nip_koordinator,
        kota_cetak: localProfile.kota,
        tahun_ajaran: localProfile.tahun_ajaran
      });
      if (profileError) {
        console.error("Gagal sinkronisasi nama sekolah ke profiles:", profileError.message);
        logs.push(`⚠️ Peringatan: Gagal mensinkronisasi profil sekolah ke Cloud: ${profileError.message}`);
      } else {
        logs.push(`Berhasil menyelaraskan profil sekolah (${schoolName}) di Cloud.`);
      }

      // Fungsi bantu upsert dengan payload terisi & membersihkan data lama untuk isolasi & sinkronisasi
      const syncTable = async (table: string, items: any[]) => {
        // 1. Upsert items
        if (items.length > 0) {
          const { error: upsertError } = await supabase.from(table).upsert(items);
          if (upsertError) {
            throw new Error(`Gagal menulis ke tabel ${table}: ${upsertError.message}`);
          }
        }
        
        // 2. Clean up deleted items for this user
        if (userId) {
          const itemIds = items.map(item => item.id);
          if (itemIds.length > 0) {
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('user_id', userId)
              .not('id', 'in', itemIds);
            
            if (deleteError) {
              console.warn(`Gagal membersihkan data lama di ${table}:`, deleteError.message);
            }
          } else {
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('user_id', userId);
              
            if (deleteError) {
              console.warn(`Gagal mengosongkan tabel ${table}:`, deleteError.message);
            }
          }
        }
      };

      // 1. Teachers
      const mappedTeachers = teachers.map(t => ({
        id: IDMapper.getUUID(t.id),
        nip: t.nip,
        nama: t.nama,
        jenis_kelamin: t.jenis_kelamin,
        no_hp: t.no_hp || '',
        status_aktif: t.status_aktif,
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('teachers', mappedTeachers);
      logs.push(`Berhasil menyelaraskan ${mappedTeachers.length} data Guru.`);

      // 2. Subjects
      const mappedSubjects = subjects.map(s => ({
        id: IDMapper.getUUID(s.id),
        kode_mapel: s.kode_mapel,
        nama_mapel: s.nama_mapel,
        jumlah_jam_per_minggu: s.jumlah_jam_per_minggu,
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('subjects', mappedSubjects);
      logs.push(`Berhasil menyelaraskan ${mappedSubjects.length} data Mata Pelajaran.`);

      // 3. Classes
      const mappedClasses = classes.map(c => ({
        id: IDMapper.getUUID(c.id),
        nama_kelas: c.nama_kelas,
        tingkat: c.tingkat,
        wali_kelas: c.wali_kelas || '',
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('classes', mappedClasses);
      logs.push(`Berhasil menyelaraskan ${mappedClasses.length} data Kelas.`);

      // 4. Rooms
      const mappedRooms = rooms.map(r => ({
        id: IDMapper.getUUID(r.id),
        nama_ruangan: r.nama_ruangan,
        kapasitas: r.kapasitas,
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('rooms', mappedRooms);
      logs.push(`Berhasil menyelaraskan ${mappedRooms.length} data Ruangan.`);

      // 5. Periods (Jam Pelajaran)
      const mappedPeriods = periods.map(p => ({
        id: IDMapper.getUUID(p.id),
        jam_ke: p.jam_ke,
        jam_mulai: p.jam_mulai.includes(':') ? p.jam_mulai : `${p.jam_mulai}:00`,
        jam_selesai: p.jam_selesai.includes(':') ? p.jam_selesai : `${p.jam_selesai}:00`,
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('periods', mappedPeriods);
      logs.push(`Berhasil menyelaraskan ${mappedPeriods.length} data Jam Pelajaran.`);

      // 6. Teacher Preferences
      const mappedPreferences = preferences.map(p => ({
        id: IDMapper.getUUID(p.id),
        guru_id: IDMapper.getUUID(p.guru_id),
        hari_tidak_bersedia: p.hari_tidak_bersedia,
        jam_tidak_bersedia: p.jam_tidak_bersedia,
        hari_favorit: p.hari_favorit || [],
        jam_favorit: p.jam_favorit || [],
        max_jam_per_hari: p.max_jam_per_hari,
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('teacher_preferences', mappedPreferences);
      logs.push(`Berhasil menyelaraskan ${mappedPreferences.length} data Preferensi Guru.`);

      // 7. Teaching Assignments (Pengampu)
      const mappedAssignments = assignments.map(a => ({
        id: IDMapper.getUUID(a.id),
        guru_id: IDMapper.getUUID(a.guru_id),
        mapel_id: IDMapper.getUUID(a.mapel_id),
        kelas_id: IDMapper.getUUID(a.kelas_id),
        jumlah_jam: a.jumlah_jam,
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('teaching_assignments', mappedAssignments);
      logs.push(`Berhasil menyelaraskan ${mappedAssignments.length} data Pengampu Mata Pelajaran.`);

      // 8. Schedules (Jadwal)
      const mappedSchedules = schedules.map(s => ({
        id: IDMapper.getUUID(s.id),
        assignment_id: s.assignment_id ? IDMapper.getUUID(s.assignment_id) : null,
        guru_id: IDMapper.getUUID(s.guru_id),
        mapel_id: IDMapper.getUUID(s.mapel_id),
        kelas_id: IDMapper.getUUID(s.kelas_id),
        ruangan_id: IDMapper.getUUID(s.ruangan_id),
        hari: s.hari,
        jam_ke: s.jam_ke,
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('schedules', mappedSchedules);
      logs.push(`Berhasil menyelaraskan ${mappedSchedules.length} data Jadwal Pelajaran.`);

      // 9. Schedule Conflicts (Konflik)
      const mappedConflicts = conflicts.map(c => ({
        id: IDMapper.getUUID(c.id),
        tipe_konflik: c.tipe_konflik,
        deskripsi: c.deskripsi,
        hari: c.hari,
        jam_ke: c.jam_ke,
        entities_involved: c.entities_involved || [],
        ...(userId ? { user_id: userId } : {})
      }));
      await syncTable('schedule_conflicts', mappedConflicts);
      logs.push(`Berhasil menyelaraskan ${mappedConflicts.length} data Deteksi Konflik.`);

      logs.push('SINKRONISASI UNGGAH BERHASIL! Seluruh data lokal kini tersimpan dengan aman di Supabase cloud.');
      return { success: true, message: 'Seluruh data berhasil diunggah ke Supabase!', logs };

    } catch (err: any) {
      console.error('Error push ke Supabase:', err);
      logs.push(`ERROR: ${err.message || String(err)}`);
      return { success: false, message: `Gagal mengunggah data: ${err.message || String(err)}`, logs };
    }
  }

  // 3. Pull Semua Data dari Supabase ke LocalDB (Download)
  static async pullAll(): Promise<SyncResult> {
    const logs: string[] = [];
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: 'Supabase tidak aktif atau belum terkonfigurasi.', logs };
    }

    try {
      // Coba dapatkan user authenticated jika ada, jika tidak, batalkan karena RLS mencegah penulisan/pembacaan tanpa auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          message: 'Sesi masuk Supabase tidak terdeteksi atau telah berakhir. Silakan login terlebih dahulu menggunakan Google.',
          logs: ['Sinkronisasi unduh dibatalkan karena pengguna tidak terautentikasi.', ...(userError ? [`Detail: ${userError.message}`] : [])]
        };
      }

      logs.push(`Memulai proses unduh data untuk akun: ${user.email}`);
      logs.push('Mengunduh seluruh data dari database Supabase cloud...');

      // Update current user's school name if we pulled a profile
      let schoolName = 'SMAN 1 AI INDONESIA';
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nama_sekolah, is_pro, serial_key, activated_at, role, logo_sekolah, nama_kepsek, nip_kepsek, nama_koordinator, nip_koordinator, kota_cetak, tahun_ajaran')
          .maybeSingle();
        
        if (!profileError && profileData) {
          schoolName = profileData.nama_sekolah;
          logs.push(`Membaca profil sekolah dari Cloud: ${schoolName}`);
          
          if (typeof window !== 'undefined') {
            const user = localStorage.getItem('sch_current_user');
            if (user) {
              const parsedUser = JSON.parse(user);
              parsedUser.nama_sekolah = schoolName;
              parsedUser.is_pro = !!profileData.is_pro;
              parsedUser.serial_key = profileData.serial_key || null;
              parsedUser.activated_at = profileData.activated_at || null;
              parsedUser.role = profileData.role || 'user';
              localStorage.setItem('sch_current_user', JSON.stringify(parsedUser));
            }
            
            // Save complete school profile
            const pulledProfile = {
              nama_sekolah: schoolName,
              logo_sekolah: profileData.logo_sekolah || null,
              nama_kepsek: profileData.nama_kepsek || 'Drs. H. Mulyono, M.Pd.',
              nip_kepsek: profileData.nip_kepsek || '19740815 200003 1 002',
              nama_koordinator: profileData.nama_koordinator || 'Siti Aminah, S.Pd.',
              nip_koordinator: profileData.nip_koordinator || '19810312 200801 2 015',
              kota: profileData.kota_cetak || 'Jakarta',
              tahun_ajaran: profileData.tahun_ajaran || 'Tahun Ajaran 2026/2027',
            };
            LocalDB.saveSchoolProfile(pulledProfile);
          }
        }
      } catch (err) {
        console.error("Gagal membaca profil sekolah dari cloud:", err);
      }

      // Ambil data satu persatu dari Supabase
      const fetchTable = async (table: string) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          throw new Error(`Gagal membaca dari tabel ${table}: ${error.message}`);
        }
        return data || [];
      };

      const teachersData = await fetchTable('teachers');
      logs.push(`Terunduh ${teachersData.length} data Guru.`);

      const subjectsData = await fetchTable('subjects');
      logs.push(`Terunduh ${subjectsData.length} data Mata Pelajaran.`);

      const classesData = await fetchTable('classes');
      logs.push(`Terunduh ${classesData.length} data Kelas.`);

      const roomsData = await fetchTable('rooms');
      logs.push(`Terunduh ${roomsData.length} data Ruangan.`);

      const periodsData = await fetchTable('periods');
      logs.push(`Terunduh ${periodsData.length} data Jam Pelajaran.`);

      const preferencesData = await fetchTable('teacher_preferences');
      logs.push(`Terunduh ${preferencesData.length} data Preferensi Guru.`);

      const assignmentsData = await fetchTable('teaching_assignments');
      logs.push(`Terunduh ${assignmentsData.length} data Pengampu Mata Pelajaran.`);

      const schedulesData = await fetchTable('schedules');
      logs.push(`Terunduh ${schedulesData.length} data Jadwal Pelajaran.`);

      // Petakan kembali ke format LocalDB
      const localTeachers: Guru[] = teachersData.map((t: any) => ({
        id: t.id,
        nip: t.nip,
        nama: t.nama,
        jenis_kelamin: t.jenis_kelamin,
        no_hp: t.no_hp || '',
        status_aktif: t.status_aktif
      }));

      const localSubjects: MataPelajaran[] = subjectsData.map((s: any) => ({
        id: s.id,
        kode_mapel: s.kode_mapel,
        nama_mapel: s.nama_mapel,
        jumlah_jam_per_minggu: s.jumlah_jam_per_minggu
      }));

      const localClasses: Kelas[] = classesData.map((c: any) => ({
        id: c.id,
        nama_kelas: c.nama_kelas,
        tingkat: c.tingkat,
        wali_kelas: c.wali_kelas || ''
      }));

      const localRooms: Ruangan[] = roomsData.map((r: any) => ({
        id: r.id,
        nama_ruangan: r.nama_ruangan,
        kapasitas: r.kapasitas
      }));

      const localPeriods: JamPelajaran[] = periodsData.map((p: any) => ({
        id: p.id,
        jam_ke: p.jam_ke,
        jam_mulai: p.jam_mulai.substring(0, 5), // '07:30:00' -> '07:30'
        jam_selesai: p.jam_selesai.substring(0, 5)
      })).sort((a: any, b: any) => a.jam_ke - b.jam_ke);

      const localPreferences: PreferensiGuru[] = preferencesData.map((p: any) => ({
        id: p.id,
        guru_id: p.guru_id,
        hari_tidak_bersedia: p.hari_tidak_bersedia || [],
        jam_tidak_bersedia: p.jam_tidak_bersedia || [],
        hari_favorit: p.hari_favorit || [],
        jam_favorit: p.jam_favorit || [],
        max_jam_per_hari: p.max_jam_per_hari || 6
      }));

      const localAssignments: PengampuMataPelajaran[] = assignmentsData.map((a: any) => ({
        id: a.id,
        guru_id: a.guru_id,
        mapel_id: a.mapel_id,
        kelas_id: a.kelas_id,
        jumlah_jam: a.jumlah_jam
      }));

      const localSchedules: Jadwal[] = schedulesData.map((s: any) => ({
        id: s.id,
        assignment_id: s.assignment_id || '',
        guru_id: s.guru_id,
        mapel_id: s.mapel_id,
        kelas_id: s.kelas_id,
        ruangan_id: s.ruangan_id,
        hari: s.hari,
        jam_ke: s.jam_ke
      }));

      // Check if new data is different from current local database
      const currentTeachers = LocalDB.getGuru();
      const currentSubjects = LocalDB.getMapel();
      const currentClasses = LocalDB.getKelas();
      const currentRooms = LocalDB.getRuangan();
      const currentPeriods = LocalDB.getJamPelajaran();
      const currentPreferences = LocalDB.getPreferensi();
      const currentAssignments = LocalDB.getPengampu();
      const currentSchedules = LocalDB.getJadwal();

      // Simple normalizer to prevent false-positives
      const normalize = (val: any) => {
        if (!val) return '';
        return JSON.stringify(val, (k, v) => {
          if (v === null || v === undefined) return '';
          if (Array.isArray(v) && v.length === 0) return '';
          return v;
        });
      };

      const hasChanges = 
        normalize(localTeachers) !== normalize(currentTeachers) ||
        normalize(localSubjects) !== normalize(currentSubjects) ||
        normalize(localClasses) !== normalize(currentClasses) ||
        normalize(localRooms) !== normalize(currentRooms) ||
        normalize(localPeriods) !== normalize(currentPeriods) ||
        normalize(localPreferences) !== normalize(currentPreferences) ||
        normalize(localAssignments) !== normalize(currentAssignments) ||
        normalize(localSchedules) !== normalize(currentSchedules);

      if (!hasChanges) {
        logs.push('Data lokal sudah selaras sempurna dengan Supabase Cloud. Lewati penulisan ulang.');
        return { success: true, message: 'Data sudah up-to-date.', logs };
      }

      // Tulis ulang seluruh data ke LocalDB
      LocalDB.saveGuru(localTeachers);
      LocalDB.saveMapel(localSubjects);
      LocalDB.saveKelas(localClasses);
      LocalDB.saveRuangan(localRooms);
      LocalDB.saveJamPelajaran(localPeriods);
      LocalDB.savePreferensi(localPreferences);
      LocalDB.savePengampu(localAssignments);
      LocalDB.saveJadwal(localSchedules);

      logs.push('SINKRONISASI UNDUH BERHASIL! Data lokal Anda kini sama persis dengan data di Supabase cloud.');
      return { success: true, message: 'Seluruh data berhasil diunduh dari Supabase!', logs };

    } catch (err: any) {
      console.error('Error pull dari Supabase:', err);
      logs.push(`ERROR: ${err.message || String(err)}`);
      return { success: false, message: `Gagal mengunduh data: ${err.message || String(err)}`, logs };
    }
  }

  // 4. Sinkronisasi Otomatis Item Tunggal ke Supabase saat Mengedit (Opsional background sync)
  static async syncSingleItem(table: string, action: 'upsert' | 'delete', itemPayload: any): Promise<void> {
    if (!isSupabaseModeActive()) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      if (!userId) return; // Prevent unauthenticated writes!
      
      const payload = action === 'delete' ? itemPayload : {
        ...itemPayload,
        user_id: userId
      };

      if (action === 'upsert') {
        await supabase.from(table).upsert(payload);
      } else if (action === 'delete') {
        await supabase.from(table).delete().eq('id', itemPayload.id);
      }
    } catch (err) {
      console.error(`Gagal melakukan sync single item ke tabel ${table}:`, err);
    }
  }

  // 5. Synchronous real-time single item pushes for vital tables
  static async syncTeacher(t: Guru, action: 'upsert' | 'delete'): Promise<void> {
    const payload = action === 'delete' ? { id: IDMapper.getUUID(t.id) } : {
      id: IDMapper.getUUID(t.id),
      nip: t.nip,
      nama: t.nama,
      jenis_kelamin: t.jenis_kelamin,
      no_hp: t.no_hp || '',
      status_aktif: t.status_aktif
    };
    await this.syncSingleItem('teachers', action, payload);
  }

  static async syncSubject(s: MataPelajaran, action: 'upsert' | 'delete'): Promise<void> {
    const payload = action === 'delete' ? { id: IDMapper.getUUID(s.id) } : {
      id: IDMapper.getUUID(s.id),
      kode_mapel: s.kode_mapel,
      nama_mapel: s.nama_mapel,
      jumlah_jam_per_minggu: s.jumlah_jam_per_minggu
    };
    await this.syncSingleItem('subjects', action, payload);
  }

  static async syncClass(c: Kelas, action: 'upsert' | 'delete'): Promise<void> {
    const payload = action === 'delete' ? { id: IDMapper.getUUID(c.id) } : {
      id: IDMapper.getUUID(c.id),
      nama_kelas: c.nama_kelas,
      tingkat: c.tingkat,
      wali_kelas: c.wali_kelas || ''
    };
    await this.syncSingleItem('classes', action, payload);
  }

  static async syncRoom(r: Ruangan, action: 'upsert' | 'delete'): Promise<void> {
    const payload = action === 'delete' ? { id: IDMapper.getUUID(r.id) } : {
      id: IDMapper.getUUID(r.id),
      nama_ruangan: r.nama_ruangan,
      kapasitas: r.kapasitas
    };
    await this.syncSingleItem('rooms', action, payload);
  }

  static async syncPeriod(p: JamPelajaran, action: 'upsert' | 'delete'): Promise<void> {
    const payload = action === 'delete' ? { id: IDMapper.getUUID(p.id) } : {
      id: IDMapper.getUUID(p.id),
      jam_ke: p.jam_ke,
      jam_mulai: p.jam_mulai.includes(':') ? p.jam_mulai : `${p.jam_mulai}:00`,
      jam_selesai: p.jam_selesai.includes(':') ? p.jam_selesai : `${p.jam_selesai}:00`
    };
    await this.syncSingleItem('periods', action, payload);
  }

  static async syncPreference(p: PreferensiGuru, action: 'upsert' | 'delete'): Promise<void> {
    const payload = action === 'delete' ? { id: IDMapper.getUUID(p.id) } : {
      id: IDMapper.getUUID(p.id),
      guru_id: IDMapper.getUUID(p.guru_id),
      hari_tidak_bersedia: p.hari_tidak_bersedia,
      jam_tidak_bersedia: p.jam_tidak_bersedia,
      hari_favorit: p.hari_favorit || [],
      jam_favorit: p.jam_favorit || [],
      max_jam_per_hari: p.max_jam_per_hari
    };
    await this.syncSingleItem('teacher_preferences', action, payload);
  }

  static async syncAssignment(a: PengampuMataPelajaran, action: 'upsert' | 'delete'): Promise<void> {
    const payload = action === 'delete' ? { id: IDMapper.getUUID(a.id) } : {
      id: IDMapper.getUUID(a.id),
      guru_id: IDMapper.getUUID(a.guru_id),
      mapel_id: IDMapper.getUUID(a.mapel_id),
      kelas_id: IDMapper.getUUID(a.kelas_id),
      jumlah_jam: a.jumlah_jam
    };
    await this.syncSingleItem('teaching_assignments', action, payload);
  }

  static async pushSchedulesOnly(schedules: Jadwal[], conflicts: KonflikJadwal[]): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: 'Supabase tidak terkonfigurasi.' };
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Pengguna tidak terautentikasi.' };
      }
      const userId = user.id;

      // Map schedules
      const mappedSchedules = schedules.map(s => ({
        id: IDMapper.getUUID(s.id),
        assignment_id: s.assignment_id ? IDMapper.getUUID(s.assignment_id) : null,
        guru_id: IDMapper.getUUID(s.guru_id),
        mapel_id: IDMapper.getUUID(s.mapel_id),
        kelas_id: IDMapper.getUUID(s.kelas_id),
        ruangan_id: IDMapper.getUUID(s.ruangan_id),
        hari: s.hari,
        jam_ke: s.jam_ke,
        user_id: userId
      }));

      // Delete all old schedules for this user first
      await supabase.from('schedules').delete().eq('user_id', userId);

      // Insert new ones
      if (mappedSchedules.length > 0) {
        const { error: upsertErr } = await supabase.from('schedules').insert(mappedSchedules);
        if (upsertErr) throw new Error(`Gagal menyimpan draf jadwal: ${upsertErr.message}`);
      }

      // Map conflicts
      const mappedConflicts = conflicts.map(c => ({
        id: IDMapper.getUUID(c.id),
        tipe_konflik: c.tipe_konflik,
        deskripsi: c.deskripsi,
        hari: c.hari,
        jam_ke: c.jam_ke,
        entities_involved: c.entities_involved || [],
        user_id: userId
      }));

      // Delete all old conflicts for this user
      await supabase.from('schedule_conflicts').delete().eq('user_id', userId);

      // Insert new conflicts
      if (mappedConflicts.length > 0) {
        const { error: conflictErr } = await supabase.from('schedule_conflicts').insert(mappedConflicts);
        if (conflictErr) throw new Error(`Gagal menyimpan laporan konflik: ${conflictErr.message}`);
      }

      return { success: true, message: 'Draf Jadwal Pelajaran & Laporan Konflik berhasil disimpan ke Cloud!' };
    } catch (err: any) {
      console.error('Error pushSchedulesOnly:', err);
      return { success: false, message: err.message || String(err) };
    }
  }
}
