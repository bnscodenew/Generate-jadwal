import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

// Force dynamic behavior so Next.js doesn't statically optimize this route during build
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json({
      success: false,
      status: 'waiting_for_configuration',
      message: 'Endpoint keep-alive aktif! Namun, variabel lingkungan DATABASE_URL belum dikonfigurasi di Vercel/environment.',
      instructions: {
        step1: 'Salin URL Koneksi PostgreSQL (Transaction Pooler atau Session) dari dashboard Supabase Anda.',
        step2: 'Tambahkan variabel lingkungan dengan nama DATABASE_URL di dashboard Vercel Anda.',
        step3: 'Daftarkan URL endpoint ini (https://domain-anda.vercel.app/api/keep-alive) di cron-job.org untuk dijalankan secara periodik (misal setiap 6 atau 12 jam).'
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }

  try {
    // Inisialisasi koneksi postgres dengan timeout singkat (5 detik) agar tidak menggantung jika DB bermasalah
    const sql = postgres(databaseUrl, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 1,
    });

    // Jalankan query sederhana 'SELECT 1' untuk meyakinkan Supabase bahwa database tetap aktif dan tidak di-pause
    const result = await sql`SELECT 1 as ping`;
    
    // Tutup koneksi agar resource segera dibebaskan
    await sql.end();

    return NextResponse.json({
      success: true,
      status: 'database_pinged',
      message: 'Koneksi ke Supabase berhasil! Database Anda tetap terjaga dan aktif.',
      db_response: result,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error executing database keep-alive:', error);
    return NextResponse.json({
      success: false,
      status: 'error_connecting_database',
      message: 'Gagal melakukan ping ke database Supabase. Periksa kembali DATABASE_URL Anda.',
      error: error?.message || String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
