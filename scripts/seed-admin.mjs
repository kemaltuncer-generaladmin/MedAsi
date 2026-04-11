// scripts/seed-admin.mjs
// Supabase'de admin kullanıcısını oluşturur ve Prisma users tablosuna ekler.
// Çalıştır: node scripts/seed-admin.mjs

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@medasi.com.tr";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const prisma = new PrismaClient();

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY zorunludur.");
  }
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD zorunludur (örnek: ADMIN_PASSWORD='...' node scripts/seed-admin.mjs).");
  }

  console.log("🔧 Admin seed başlıyor...\n");

  // 1. Paket var mı kontrol et, yoksa oluştur
  let pkg = await prisma.package.findFirst({ where: { name: "Admin" } });
  if (!pkg) {
    pkg = await prisma.package.create({
      data: { name: "Admin", dailyAiLimit: 9999, price: 0 },
    });
    console.log("✅ Admin paketi oluşturuldu:", pkg.id);
  } else {
    console.log("ℹ️  Admin paketi zaten mevcut:", pkg.id);
  }

  // 2. Supabase Auth'da kullanıcı var mı kontrol et
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email === ADMIN_EMAIL);

  let supabaseUserId;

  if (existing) {
    console.log("ℹ️  Supabase kullanıcısı zaten mevcut:", existing.id);
    // Şifreyi güncelle
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error("Şifre güncellenemedi: " + error.message);
    console.log("✅ Supabase şifresi güncellendi");
    supabaseUserId = existing.id;
  } else {
    // Kullanıcı yok, oluştur
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error)
      throw new Error("Supabase kullanıcısı oluşturulamadı: " + error.message);
    console.log("✅ Supabase kullanıcısı oluşturuldu:", data.user.id);
    supabaseUserId = data.user.id;
  }

  // 3. Prisma users tablosuna upsert
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "admin", name: "Medasi Admin", packageId: pkg.id },
    create: {
      id: supabaseUserId,
      email: ADMIN_EMAIL,
      name: "Medasi Admin",
      role: "admin",
      packageId: pkg.id,
      onboardingCompleted: true,
    },
  });
  console.log("✅ Prisma kullanıcısı upsert edildi:", user.id);

  console.log("\n🎉 Admin hazır!");
  console.log("   E-posta :", ADMIN_EMAIL);
  console.log("   Şifre   :", ADMIN_PASSWORD);
  console.log("   Panel   : http://localhost:3000/admin");
}

main()
  .catch((e) => {
    console.error("❌", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
