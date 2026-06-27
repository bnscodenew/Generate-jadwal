import { Guru, MataPelajaran, Kelas, Ruangan, JamPelajaran, PengampuMataPelajaran, PreferensiGuru, Jadwal, KonflikJadwal, Hari } from './types';
import { MOCK_GURU, MOCK_MAPEL, MOCK_KELAS, MOCK_RUANGAN, MOCK_JAM_PELAJARAN, MOCK_PENGAMPU, MOCK_PREFERENSI } from './mock-db-data';

export class LocalDB {
  private static getUserPrefix(): string {
    if (typeof window === 'undefined') return '';
    const user = localStorage.getItem('sch_current_user');
    if (user) {
      try {
        const u = JSON.parse(user);
        if (u && u.username) {
          return `user_${u.username.toLowerCase()}_`;
        }
      } catch {
        return '';
      }
    }
    return '';
  }

  private static getStored<T>(key: string, defaultData: T): T {
    if (typeof window === 'undefined') return defaultData;
    const isGlobal = key === 'sch_users_list';
    const prefix = isGlobal ? '' : this.getUserPrefix();
    const prefixedKey = prefix + key;
    const item = localStorage.getItem(prefixedKey);
    if (!item) {
      localStorage.setItem(prefixedKey, JSON.stringify(defaultData));
      return defaultData;
    }
    try {
      return JSON.parse(item);
    } catch {
      return defaultData;
    }
  }

  private static setStored<T>(key: string, data: T) {
    if (typeof window === 'undefined') return;
    const isGlobal = key === 'sch_users_list';
    const prefix = isGlobal ? '' : this.getUserPrefix();
    const prefixedKey = prefix + key;
    localStorage.setItem(prefixedKey, JSON.stringify(data));
  }

  // --- AUTH SERVICES ---
  static getUsers(): any[] {
    return this.getStored<any[]>('sch_users_list', [
      { username: 'admin', password: 'password123', nama_sekolah: 'SMAN 1 AI INDONESIA', role: 'Administrator' }
    ]);
  }

  static saveUsers(users: any[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sch_users_list', JSON.stringify(users));
  }

  static register(username: string, password: string, nama_sekolah: string): { success: boolean; message: string } {
    const users = this.getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username sudah digunakan oleh akun lain.' };
    }
    users.push({ username, password, nama_sekolah, role: 'Administrator' });
    this.saveUsers(users);
    return { success: true, message: 'Registrasi berhasil! Silakan login.' };
  }

  static login(username: string, password: string): { success: boolean; user?: any; message: string } {
    const users = this.getUsers();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!found) {
      return { success: false, message: 'Username atau password salah.' };
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('sch_current_user', JSON.stringify(found));
    }
    return { success: true, user: found, message: 'Login berhasil!' };
  }

  static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sch_current_user');
    }
  }

  static getCurrentUser(): any | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('sch_current_user');
    if (!user) return null;
    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  }

  // --- GET ALL ---
  static getGuru(): Guru[] {
    return this.getStored<Guru[]>('sch_guru', MOCK_GURU);
  }
  static getMapel(): MataPelajaran[] {
    return this.getStored<MataPelajaran[]>('sch_mapel', MOCK_MAPEL);
  }
  static getKelas(): Kelas[] {
    return this.getStored<Kelas[]>('sch_kelas', MOCK_KELAS);
  }
  static getRuangan(): Ruangan[] {
    return this.getStored<Ruangan[]>('sch_ruangan', MOCK_RUANGAN);
  }
  static getJamPelajaran(): JamPelajaran[] {
    return this.getStored<JamPelajaran[]>('sch_jam_pelajaran', MOCK_JAM_PELAJARAN);
  }
  static getPengampu(): PengampuMataPelajaran[] {
    return this.getStored<PengampuMataPelajaran[]>('sch_pengampu', MOCK_PENGAMPU);
  }
  static getPreferensi(): PreferensiGuru[] {
    return this.getStored<PreferensiGuru[]>('sch_preferensi', MOCK_PREFERENSI);
  }
  static getJadwal(): Jadwal[] {
    return this.getStored<Jadwal[]>('sch_jadwal', []);
  }
  static getHariAktif(): Hari[] {
    return this.getStored<Hari[]>('sch_hari_aktif', ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']);
  }
  static getBatasJamHari(): Record<Hari, number> {
    return this.getStored<Record<Hari, number>>('sch_batas_jam_hari', {
      'Senin': 8,
      'Selasa': 8,
      'Rabu': 8,
      'Kamis': 8,
      'Jumat': 8,
      'Sabtu': 8,
      'Minggu': 8,
    });
  }

  // --- SAVE ALL ---
  static saveGuru(data: Guru[]) { this.setStored('sch_guru', data); this.recalculateConflicts(); }
  static saveMapel(data: MataPelajaran[]) { this.setStored('sch_mapel', data); this.recalculateConflicts(); }
  static saveKelas(data: Kelas[]) { this.setStored('sch_kelas', data); this.recalculateConflicts(); }
  static saveRuangan(data: Ruangan[]) { this.setStored('sch_ruangan', data); this.recalculateConflicts(); }
  static saveJamPelajaran(data: JamPelajaran[]) { this.setStored('sch_jam_pelajaran', data); this.recalculateConflicts(); }
  static savePengampu(data: PengampuMataPelajaran[]) { this.setStored('sch_pengampu', data); this.recalculateConflicts(); }
  static savePreferensi(data: PreferensiGuru[]) { this.setStored('sch_preferensi', data); this.recalculateConflicts(); }
  static saveJadwal(data: Jadwal[]) { this.setStored('sch_jadwal', data); this.recalculateConflicts(); }
  static saveHariAktif(data: Hari[]) { this.setStored('sch_hari_aktif', data); this.recalculateConflicts(); }
  static saveBatasJamHari(data: Record<Hari, number>) { this.setStored('sch_batas_jam_hari', data); this.recalculateConflicts(); }

  // --- RESET TO DEFAULTS ---
  static resetToDefault() {
    if (typeof window === 'undefined') return;
    const prefix = this.getUserPrefix();
    localStorage.setItem(prefix + 'sch_guru', JSON.stringify(MOCK_GURU));
    localStorage.setItem(prefix + 'sch_mapel', JSON.stringify(MOCK_MAPEL));
    localStorage.setItem(prefix + 'sch_kelas', JSON.stringify(MOCK_KELAS));
    localStorage.setItem(prefix + 'sch_ruangan', JSON.stringify(MOCK_RUANGAN));
    localStorage.setItem(prefix + 'sch_jam_pelajaran', JSON.stringify(MOCK_JAM_PELAJARAN));
    localStorage.setItem(prefix + 'sch_pengampu', JSON.stringify(MOCK_PENGAMPU));
    localStorage.setItem(prefix + 'sch_preferensi', JSON.stringify(MOCK_PREFERENSI));
    localStorage.setItem(prefix + 'sch_jadwal', JSON.stringify([]));
    this.recalculateConflicts();
  }

  // --- CONFLICT RECALCULATION ENGINE ---
  static getConflicts(): KonflikJadwal[] {
    return this.getStored<KonflikJadwal[]>('sch_conflicts', []);
  }

  static recalculateConflicts() {
    const schedules = this.getJadwal();
    const teachers = this.getGuru();
    const classes = this.getKelas();
    const rooms = this.getRuangan();
    const preferences = this.getPreferensi();
    const assignments = this.getPengampu();
    const subjects = this.getMapel();

    const conflicts: KonflikJadwal[] = [];
    let conflictIdCounter = 1;

    // Helper map names
    const tMap = new Map(teachers.map(t => [t.id, t.nama]));
    const cMap = new Map(classes.map(c => [c.id, c.nama_kelas]));
    const rMap = new Map(rooms.map(r => [r.id, r.nama_ruangan]));
    const sMap = new Map(subjects.map(s => [s.id, s.nama_mapel]));

    // Slot map structures to detect collisions
    // key: day_period_teacherId
    const teacherSlots = new Map<string, Jadwal[]>();
    // key: day_period_classId
    const classSlots = new Map<string, Jadwal[]>();
    // key: day_period_roomId
    const roomSlots = new Map<string, Jadwal[]>();

    for (const s of schedules) {
      const parentAssignment = assignments.find(a => a.id === s.assignment_id);
      
      const teacherKey = `${s.hari}_${s.jam_ke}_${s.guru_id}`;
      const classKey = `${s.hari}_${s.jam_ke}_${s.kelas_id}`;
      const roomKey = `${s.hari}_${s.jam_ke}_${s.ruangan_id}`;

      // 1. Group for Teacher collisions
      if (!teacherSlots.has(teacherKey)) teacherSlots.set(teacherKey, []);
      teacherSlots.get(teacherKey)!.push(s);

      // 2. Group for Class collisions
      if (!classSlots.has(classKey)) classSlots.set(classKey, []);
      classSlots.get(classKey)!.push(s);

      // 3. Group for Room collisions
      if (!roomSlots.has(roomKey)) roomSlots.set(roomKey, []);
      roomSlots.get(roomKey)!.push(s);

      // 4. Check teacher block preferences
      const pref = preferences.find(p => p.guru_id === s.guru_id);
      if (pref) {
        if (pref.hari_tidak_bersedia.includes(s.hari)) {
          conflicts.push({
            id: `conf-pref-day-${conflictIdCounter++}`,
            tipe_konflik: 'preferensi_bentrok',
            deskripsi: `Guru ${tMap.get(s.guru_id) || s.guru_id} menjabat pelajaran pada hari ${s.hari} yang bertentangan dengan preferensi tidak bersedia mengajar.`,
            hari: s.hari,
            jam_ke: s.jam_ke,
            entities_involved: [tMap.get(s.guru_id) || s.guru_id]
          });
        }
        if (pref.jam_tidak_bersedia.includes(s.jam_ke)) {
          conflicts.push({
            id: `conf-pref-period-${conflictIdCounter++}`,
            tipe_konflik: 'preferensi_bentrok',
            deskripsi: `Guru ${tMap.get(s.guru_id) || s.guru_id} dijadwalkan mengajar pada Jam Ke-${s.jam_ke} yang bertentangan dengan preferensi tidak bersedia mengajar.`,
            hari: s.hari,
            jam_ke: s.jam_ke,
            entities_involved: [tMap.get(s.guru_id) || s.guru_id]
          });
        }
        if (pref.slot_tidak_bersedia?.some(slot => slot.hari === s.hari && slot.jam_ke === s.jam_ke)) {
          conflicts.push({
            id: `conf-pref-slot-${conflictIdCounter++}`,
            tipe_konflik: 'preferensi_bentrok',
            deskripsi: `Guru ${tMap.get(s.guru_id) || s.guru_id} dijadwalkan mengajar pada hari ${s.hari} Jam Ke-${s.jam_ke} yang bertentangan dengan preferensi khusus berhalangan.`,
            hari: s.hari,
            jam_ke: s.jam_ke,
            entities_involved: [tMap.get(s.guru_id) || s.guru_id]
          });
        }
      }
    }

    // Process Teacher collisions
    for (const [key, slots] of teacherSlots.entries()) {
      if (slots.length > 1) {
        const first = slots[0];
        const teacherName = tMap.get(first.guru_id) || first.guru_id;
        const involvedClasses = slots.map(sl => cMap.get(sl.kelas_id) || sl.kelas_id).join(' dan ');
        conflicts.push({
          id: `conf-t-${conflictIdCounter++}`,
          tipe_konflik: 'guru_bentrok',
          deskripsi: `Guru ${teacherName} mengajar di ${slots.length} kelas sekaligus (${involvedClasses}) pada hari ${first.hari} Jam Ke-${first.jam_ke}.`,
          hari: first.hari,
          jam_ke: first.jam_ke,
          entities_involved: [teacherName, ...slots.map(sl => cMap.get(sl.kelas_id) || sl.kelas_id)]
        });
      }
    }

    // Process Class collisions
    for (const [key, slots] of classSlots.entries()) {
      if (slots.length > 1) {
        const first = slots[0];
        const className = cMap.get(first.kelas_id) || first.kelas_id;
        const involvedSubjects = slots.map(sl => sMap.get(sl.mapel_id) || sl.mapel_id).join(' & ');
        conflicts.push({
          id: `conf-c-${conflictIdCounter++}`,
          tipe_konflik: 'kelas_bentrok',
          deskripsi: `Kelas ${className} memiliki jadwal ganda: ${involvedSubjects} pada hari ${first.hari} Jam Ke-${first.jam_ke}.`,
          hari: first.hari,
          jam_ke: first.jam_ke,
          entities_involved: [className, ...slots.map(sl => sMap.get(sl.mapel_id) || sl.mapel_id)]
        });
      }
    }

    // Process Room collisions
    for (const [key, slots] of roomSlots.entries()) {
      if (slots.length > 1) {
        const first = slots[0];
        const roomName = rMap.get(first.ruangan_id) || first.ruangan_id;
        const involvedClasses = slots.map(sl => cMap.get(sl.kelas_id) || sl.kelas_id).join(' dan ');
        conflicts.push({
          id: `conf-r-${conflictIdCounter++}`,
          tipe_konflik: 'ruangan_bentrok',
          deskripsi: `Ruangan ${roomName} digunakan oleh kelas (${involvedClasses}) secara bersamaan pada hari ${first.hari} Jam Ke-${first.jam_ke}.`,
          hari: first.hari,
          jam_ke: first.jam_ke,
          entities_involved: [roomName, ...slots.map(sl => cMap.get(sl.kelas_id) || sl.kelas_id)]
        });
      }
    }

    // Check maximum hours per day
    for (const g of teachers) {
      const pref = preferences.find(p => p.guru_id === g.id);
      const maxHr = pref?.max_jam_per_hari ?? 6;
      
      const hariList: Hari[] = this.getHariAktif();
      for (const h of hariList) {
        const teacherDailySchedules = schedules.filter(s => s.guru_id === g.id && s.hari === h);
        if (teacherDailySchedules.length > maxHr) {
          conflicts.push({
            id: `conf-max-${g.id}-${h}-${conflictIdCounter++}`,
            tipe_konflik: 'preferensi_bentrok',
            deskripsi: `Beban mengajar Guru ${g.nama} pada hari ${h} adalah ${teacherDailySchedules.length} jam, melebihi batas maksimal preferensi harian miliknya (${maxHr} jam).`,
            hari: h,
            jam_ke: 0,
            entities_involved: [g.nama]
          });
        }
      }
    }

    // Check day period limits
    const batasJamHari = this.getBatasJamHari();
    for (const s of schedules) {
      const limit = batasJamHari[s.hari];
      if (limit !== undefined && s.jam_ke > limit) {
        conflicts.push({
          id: `conf-limit-${s.id}-${conflictIdCounter++}`,
          tipe_konflik: 'preferensi_bentrok',
          deskripsi: `Jadwal pada hari ${s.hari} Jam Ke-${s.jam_ke} melebihi batas jam harian maksimal untuk hari tersebut (Maksimal Jam Ke-${limit}).`,
          hari: s.hari,
          jam_ke: s.jam_ke,
          entities_involved: [tMap.get(s.guru_id) || s.guru_id]
        });
      }
    }

    this.setStored('sch_conflicts', conflicts);
  }
}
