export const SUPABASE_SQL_MIGRATION = `-- =========================================================================
-- SQL MIGRATION: SISTEM PENJADWALAN JADWAL PELAJARAN SEKOLAH OTOMATIS
-- Target Database: PostgreSQL / Supabase
-- Fitur: Multi-User Isolation (Satu Akun Satu Database) Menggunakan Row Level Security (RLS)
-- Tanggal Pembuatan: 2026-06-25
-- =========================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLE: profiles (Menyimpan nama sekolah dan metadata pengguna)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_sekolah VARCHAR(255) NOT NULL,
    is_pro BOOLEAN DEFAULT false,
    serial_key VARCHAR(50),
    activated_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(50) DEFAULT 'user',
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mengaktifkan Row Level Security (RLS) pada tabel profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Kebijakan Keamanan (Policies) untuk profiles
CREATE POLICY "Pengguna dapat membaca profil mereka sendiri" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Pengguna dapat memperbarui profil mereka sendiri" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Pengguna dapat memasukkan data profil baru saat register" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);


-- =========================================================================
-- 2. TABLE: teachers (Guru)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    nip VARCHAR(50) NOT NULL,
    nama VARCHAR(150) NOT NULL,
    jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    no_hp VARCHAR(20),
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_nip_per_user UNIQUE (user_id, nip)
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data guru milik sendiri"
    ON public.teachers FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 3. TABLE: subjects (Mata Pelajaran)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    kode_mapel VARCHAR(50) NOT NULL,
    nama_mapel VARCHAR(150) NOT NULL,
    jumlah_jam_per_minggu INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_kode_mapel_per_user UNIQUE (user_id, kode_mapel)
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data mapel milik sendiri"
    ON public.subjects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 4. TABLE: classes (Kelas)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_kelas VARCHAR(50) NOT NULL,
    tingkat VARCHAR(10) NOT NULL,
    wali_kelas VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_nama_kelas_per_user UNIQUE (user_id, nama_kelas)
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data kelas milik sendiri"
    ON public.classes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 5. TABLE: rooms (Ruangan)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_ruangan VARCHAR(100) NOT NULL,
    kapasitas INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_nama_ruangan_per_user UNIQUE (user_id, nama_ruangan)
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data ruangan milik sendiri"
    ON public.rooms FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 6. TABLE: periods (Jam Pelajaran)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    jam_ke INTEGER NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_jam_ke_per_user UNIQUE (user_id, jam_ke)
);

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data jam pelajaran milik sendiri"
    ON public.periods FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 7. TABLE: teacher_preferences (Preferensi Guru)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teacher_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    hari_tidak_bersedia VARCHAR(20)[] DEFAULT '{}', -- Array of Hari names, eg. {'Senin', 'Jumat'}
    jam_tidak_bersedia INTEGER[] DEFAULT '{}',     -- Array of integers jam_ke, eg. {1, 8}
    hari_favorit VARCHAR(20)[] DEFAULT '{}',        -- Array of favorite Hari names
    jam_favorit INTEGER[] DEFAULT '{}',            -- Array of favorite jam_ke numbers
    max_jam_per_hari INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_teacher_pref_per_user UNIQUE (user_id, guru_id)
);

ALTER TABLE public.teacher_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data preferensi guru milik sendiri"
    ON public.teacher_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 8. TABLE: teaching_assignments (Pengampu Mata Pelajaran)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teaching_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    jumlah_jam INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_assignment_composite_per_user UNIQUE (user_id, guru_id, mapel_id, kelas_id)
);

ALTER TABLE public.teaching_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data pengampu milik sendiri"
    ON public.teaching_assignments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 9. TABLE: schedules (Jadwal Pelajaran)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.teaching_assignments(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    ruangan_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    hari VARCHAR(20) NOT NULL CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
    jam_ke INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data jadwal milik sendiri"
    ON public.schedules FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 10. TABLE: schedule_conflicts (Detail Deteksi Konflik)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.schedule_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    tipe_konflik VARCHAR(50) NOT NULL DEFAULT 'guru_bentrok' CHECK (tipe_konflik IN ('guru_bentrok', 'kelas_bentrok', 'ruangan_bentrok', 'preferensi_bentrok')),
    deskripsi TEXT NOT NULL,
    hari VARCHAR(20) NOT NULL,
    jam_ke INTEGER NOT NULL,
    entities_involved VARCHAR(255)[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.schedule_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna hanya dapat mengelola data konflik milik sendiri"
    ON public.schedule_conflicts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- INDEX OPTIMIZATION UNTUK KECEPATAN PENJADWALAN DAN QUERY MULTI-TENANT
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_schedules_lookup_v2 ON public.schedules (user_id, hari, jam_ke);
CREATE INDEX IF NOT EXISTS idx_schedules_guru_v2 ON public.schedules (user_id, guru_id, hari, jam_ke);
CREATE INDEX IF NOT EXISTS idx_schedules_kelas_v2 ON public.schedules (user_id, kelas_id, hari, jam_ke);
CREATE INDEX IF NOT EXISTS idx_schedules_ruangan_v2 ON public.schedules (user_id, ruangan_id, hari, jam_ke);
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_composite_v2 ON public.teaching_assignments (user_id, guru_id, mapel_id, kelas_id);


-- =========================================================================
-- PEMBUATAN OTOMATIS PROFIL SAAT REGISTRASI SUPABASE AUTH (TRIGGER)
-- =========================================================================
-- Skrip di bawah ini otomatis membuat entri profil saat user mendaftar melalui Auth Supabase.
-- Anda dapat menggunakannya jika mengintegrasikannya dengan Supabase Auth secara penuh.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_sekolah, is_pro, serial_key, activated_at, role, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nama_sekolah', 'Nama Sekolah Baru'),
    COALESCE((new.raw_user_meta_data->>'is_pro')::boolean, false),
    new.raw_user_meta_data->>'serial_key',
    CASE WHEN new.raw_user_meta_data->>'activated_at' IS NOT NULL THEN (new.raw_user_meta_data->>'activated_at')::timestamp with time zone ELSE NULL END,
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    new.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger dijalankan setelah user baru berhasil dibuat di auth.users
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- DEFAULT SEED DATA: JAM PELAJARAN STANDAR (UNTUK USER_ID TERTENTU)
-- Note: Jalankan perintah insert periods ini ketika user pertama kali login/dibuat.
-- =========================================================================
-- INSERT INTO public.periods (user_id, jam_ke, jam_mulai, jam_selesai) VALUES
-- (auth.uid(), 1, '07:30:00', '08:15:00'),
-- (auth.uid(), 2, '08:15:00', '09:00:00'),
-- (auth.uid(), 3, '09:00:00', '09:45:00'),
-- (auth.uid(), 4, '10:00:00', '10:45:00'),
-- (auth.uid(), 5, '10:45:00', '11:30:00'),
-- (auth.uid(), 6, '11:30:00', '12:15:00'),
-- (auth.uid(), 7, '13:00:00', '13:45:00'),
-- (auth.uid(), 8, '13:45:00', '14:30:00');
`;

