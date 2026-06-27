export type Hari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export interface Guru {
  id: string;
  nip: string;
  nama: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  no_hp: string;
  status_aktif: boolean;
}

export interface MataPelajaran {
  id: string;
  kode_mapel: string;
  nama_mapel: string;
  jumlah_jam_per_minggu: number;
}

export interface Kelas {
  id: string;
  nama_kelas: string;
  tingkat: string;
  wali_kelas: string;
}

export interface Ruangan {
  id: string;
  nama_ruangan: string;
  kapasitas: number;
}

export interface JamPelajaran {
  id: string;
  jam_ke: number;
  jam_mulai: string;
  jam_selesai: string;
}

export interface PengampuMataPelajaran {
  id: string;
  guru_id: string;
  mapel_id: string;
  kelas_id: string;
  jumlah_jam: number; 
}

export interface PreferensiGuru {
  id: string;
  guru_id: string;
  hari_tidak_bersedia: Hari[];
  jam_tidak_bersedia: number[]; // jam_ke
  hari_favorit: Hari[];
  jam_favorit: number[]; // jam_ke
  max_jam_per_hari: number;
  slot_tidak_bersedia?: { hari: Hari; jam_ke: number }[];
}

export interface Jadwal {
  id: string;
  assignment_id: string;
  guru_id: string;
  mapel_id: string;
  kelas_id: string;
  ruangan_id: string; // id ruangan
  hari: Hari;
  jam_ke: number;
}

export interface KonflikJadwal {
  id: string;
  tipe_konflik: 'guru_bentrok' | 'kelas_bentrok' | 'ruangan_bentrok' | 'preferensi_bentrok';
  deskripsi: string;
  hari: Hari;
  jam_ke: number;
  entities_involved: string[]; // nama-nama entitas yang terlibat
}
