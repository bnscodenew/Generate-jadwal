import { NextRequest, NextResponse } from "next/server";

// Declare global in-memory map for tracking paid transactions in real-time
const globalWithPaid = global as typeof globalThis & {
  paidOrders?: Map<string, string>;
};
globalWithPaid.paidOrders = globalWithPaid.paidOrders || new Map();

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("Menerima webhook pembayaran Pakasir:", JSON.stringify(payload));

    // Pakasir callback fields: typically sends order_id and status/payment_status
    const order_id = payload.order_id || payload.external_id || payload.reference_id;
    const status = payload.status || payload.payment_status || "success"; // Default to success if callback is hit

    if (!order_id) {
      return NextResponse.json(
        { status: "error", message: "order_id tidak ditemukan dalam payload." },
        { status: 400 }
      );
    }

    // Check if status is successful/paid/settled/success
    const isPaid = ["success", "paid", "settlement", "completed", "berhasil"].includes(
      String(status).toLowerCase()
    );

    if (isPaid) {
      console.log(`PAGAR PEMBAYARAN: Transaksi ${order_id} berhasil dibayar!`);
      
      // Save to global in-memory map so frontend polling immediately detects it
      globalWithPaid.paidOrders!.set(order_id, "PAID");

      // Extract user ID from order_id formatted as: JADW_userId_timestamp
      if (order_id.startsWith("JADW_")) {
        const parts = order_id.split("_");
        const userId = parts[1];
        if (userId) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
          // Use service role key if available to bypass RLS, otherwise fallback to anon key
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
          
          if (supabaseUrl && supabaseServiceKey) {
            try {
              const { createClient } = await import("@supabase/supabase-js");
              const supabase = createClient(supabaseUrl, supabaseServiceKey);
              
              // Direct server-side admin upgrade bypassing RLS constraints
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

              if (isUuid) {
                // Check if profile already exists in the profiles table
                const { data: existingProfile, error: fetchErr } = await supabase
                  .from("profiles")
                  .select("id")
                  .eq("id", userId)
                  .maybeSingle();

                if (existingProfile) {
                  const { error } = await supabase
                    .from("profiles")
                    .update({
                      is_pro: true,
                      activated_at: new Date().toISOString()
                    })
                    .eq("id", userId);

                  if (error) {
                    console.error(`Gagal mengupdate profile user ${userId} ke PRO di Supabase:`, error.message);
                  } else {
                    console.log(`SUKSES WEBHOOK: Akun user UUID ${userId} telah diperbarui ke status PRO!`);
                  }
                } else {
                  console.log(`Profile UUID ${userId} belum ada di tabel profiles. Membuat baru dengan status PRO...`);
                  let email = null;
                  let namaSekolah = "SMAN 1 AI INDONESIA";
                  try {
                    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
                    if (!userError && userData?.user) {
                      email = userData.user.email;
                      namaSekolah = userData.user.user_metadata?.school_name || userData.user.user_metadata?.nama_sekolah || "SMAN 1 AI INDONESIA";
                    } else if (userError) {
                      console.warn("Gagal mengambil info user dari auth.admin.getUserById:", userError.message);
                    }
                  } catch (err: any) {
                    console.warn("Kesalahan saat mengambil info user dari auth.admin:", err.message || err);
                  }

                  const { error } = await supabase
                    .from("profiles")
                    .insert({
                      id: userId,
                      nama_sekolah: namaSekolah,
                      is_pro: true,
                      activated_at: new Date().toISOString(),
                      email: email,
                      role: 'user'
                    });

                  if (error) {
                    console.error(`Gagal memasukkan profile baru untuk user ${userId} ke Supabase:`, error.message);
                  } else {
                    console.log(`SUKSES WEBHOOK: Profile baru berhasil dibuat dan status diset ke PRO untuk user UUID ${userId}!`);
                  }
                }
              } else {
                console.log(`Bukan UUID, mencari profile dengan mencocokkan email untuk: ${userId}`);
                const { data: allProfiles, error: fetchError } = await supabase
                  .from("profiles")
                  .select("id, email");

                if (fetchError) {
                  console.error("Gagal mengambil data profiles untuk pencarian manual email:", fetchError.message);
                } else if (allProfiles) {
                  const matchedProfile = allProfiles.find(p => {
                    if (!p.email) return false;
                    const cleanEmail = p.email.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                    return cleanEmail === userId.toLowerCase();
                  });

                  if (matchedProfile) {
                    const { error: updateError } = await supabase
                      .from("profiles")
                      .update({
                        is_pro: true,
                        activated_at: new Date().toISOString()
                      })
                      .eq("id", matchedProfile.id);

                    if (updateError) {
                      console.error(`Gagal mengupdate profile hasil pencarian email ${matchedProfile.id}:`, updateError.message);
                    } else {
                      console.log(`SUKSES WEBHOOK: Akun user ${matchedProfile.id} (${matchedProfile.email}) berhasil diperbarui ke status PRO via pencocokan email!`);
                    }
                  } else {
                    console.error(`Gagal menemukan profil yang cocok dengan username/email filtered: ${userId}`);
                  }
                }
              }
            } catch (sbErr) {
              console.error("Kesalahan koneksi Supabase server-side di webhook:", sbErr);
            }
          } else {
            console.warn("Kredensial Supabase tidak lengkap untuk auto-update profile server-side.");
          }
        }
      }
    } else {
      console.log(`Webhook diterima untuk ${order_id} dengan status non-sukses: ${status}`);
    }

    return NextResponse.json({ status: "success", received: true });
  } catch (err: any) {
    console.error("Gagal memproses webhook Pakasir:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
