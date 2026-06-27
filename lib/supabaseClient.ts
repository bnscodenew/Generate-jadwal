import { createClient } from '@supabase/supabase-js';

// Fungsi untuk mendapatkan konfigurasi Supabase secara dinamis (dari Env atau LocalStorage)
export function getSupabaseConfig() {
  if (typeof window === 'undefined') {
    return {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    };
  }

  // Cek apakah ada kredensial kustom yang dimasukkan user lewat UI
  const customUrl = localStorage.getItem('sch_supabase_url');
  const customKey = localStorage.getItem('sch_supabase_anon_key');

  return {
    supabaseUrl: customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: customKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  };
}

// Fungsi untuk menyimpan kredensial Supabase kustom ke localStorage
export function saveSupabaseConfig(url: string, key: string) {
  if (typeof window === 'undefined') return;
  if (!url || !key) {
    localStorage.removeItem('sch_supabase_url');
    localStorage.removeItem('sch_supabase_anon_key');
    localStorage.removeItem('sch_supabase_connected');
  } else {
    localStorage.setItem('sch_supabase_url', url.trim());
    localStorage.setItem('sch_supabase_anon_key', key.trim());
    localStorage.setItem('sch_supabase_connected', 'true');
  }
}

// Global variable to cache the Supabase client instance
let cachedSupabaseClient: any = null;
let cachedSupabaseUrl = '';
let cachedSupabaseKey = '';

// Fungsi untuk mendapatkan instance client Supabase secara aman
export function getSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    cachedSupabaseClient = null;
    return null;
  }
  
  if (!cachedSupabaseClient || cachedSupabaseUrl !== supabaseUrl || cachedSupabaseKey !== supabaseAnonKey) {
    try {
      cachedSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      cachedSupabaseUrl = supabaseUrl;
      cachedSupabaseKey = supabaseAnonKey;
    } catch (error) {
      console.error('Gagal membuat client Supabase:', error);
      return null;
    }
  }
  return cachedSupabaseClient;
}

// Fungsi pembantu untuk memeriksa apakah mode koneksi Supabase aktif
export function isSupabaseModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  const config = getSupabaseConfig();
  const isConnectedMarker = localStorage.getItem('sch_supabase_connected') === 'true';
  // Aktif jika ada kredensial dan marker terhubung aktif, atau diset via env
  return !!(config.supabaseUrl && config.supabaseAnonKey && (isConnectedMarker || (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)));
}
