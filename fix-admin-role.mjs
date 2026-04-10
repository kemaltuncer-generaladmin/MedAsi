import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zjezqwcjrixkemdmrdoq.supabase.co";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZXpxd2Nqcml4a2VtZG1yZG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5NzUzMSwiZXhwIjoyMDkxMDczNTMxfQ.HcVRwR3X8HtdzuHodbqStdDGhzutMUehQfnY5AK71jM";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = "admin@medasi.com.tr";

async function main() {
  console.log("🔄 Admin rolü Supabase tarafında güncelleniyor...");

  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email === ADMIN_EMAIL);

  if (!existing) {
    console.error("❌ Kullanıcı bulunamadı!");
    return;
  }

  // user_metadata içine admin rolünü enjekte ediyoruz
  const { data, error } = await supabase.auth.admin.updateUserById(
    existing.id,
    {
      user_metadata: { role: "admin", name: "Medasi Admin" },
    },
  );

  if (error) {
    console.error("❌ Hata:", error.message);
  } else {
    console.log("✅ Başarılı! Rol Supabase Auth metadata içine işlendi.");
    console.log("Şimdi hesaptan çıkış yapıp tekrar giriş yapabilirsiniz.");
  }
}

main();
