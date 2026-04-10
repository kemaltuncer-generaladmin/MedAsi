import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment değişkenleri zorunludur.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const prisma = new PrismaClient();

const PACKAGES = [
  { name: "Ücretsiz", dailyAiLimit: 25, price: 0, tokenGrant: 100000n },
  { name: "Giriş", dailyAiLimit: 100, price: 149, tokenGrant: 300000n },
  { name: "Pro", dailyAiLimit: 400, price: 399, tokenGrant: 500000n },
  { name: "Kurumsal", dailyAiLimit: 2000, price: 1299, tokenGrant: 1000000n },
];

const MODULES = [
  { name: "ai-diagnosis", description: "Semptom bazlı tanı yardımcısı" },
  { name: "case-rpg", description: "İnteraktif vaka simülasyonu" },
  { name: "terminal", description: "Klinik komut terminali" },
  { name: "ai-assistant", description: "Genel medikal asistan" },
  { name: "daily-briefing", description: "Günlük medikal özet" },
  { name: "patients", description: "Hasta yönetimi" },
  { name: "cases", description: "Vaka takibi" },
  { name: "notes", description: "Klinik notlar" },
  { name: "pomodoro", description: "Çalışma zamanlayıcısı" },
];

const ADMIN_EMAIL = "admin@medasi.com.tr";
const ADMIN_PASSWORD = "Medasi2026!";

async function main() {
  console.log("🔧 Veritabanı eksikleri tamamlanıyor...\n");

  // 1. Modülleri Ekle
  console.log("📦 Modüller oluşturuluyor...");
  for (const mod of MODULES) {
    await prisma.module.upsert({
      where: { name: mod.name },
      update: { description: mod.description },
      create: { name: mod.name, description: mod.description },
    });
  }

  // 2. Paketleri Ekle
  console.log("📦 Paketler oluşturuluyor...");
  for (const pkg of PACKAGES) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: {
        dailyAiLimit: pkg.dailyAiLimit,
        price: pkg.price,
        tokenGrant: pkg.tokenGrant,
      },
      create: {
        name: pkg.name,
        dailyAiLimit: pkg.dailyAiLimit,
        price: pkg.price,
        tokenGrant: pkg.tokenGrant,
      },
    });
  }

  // Admin Paketini Bul (Kurumsal)
  const adminPkg = await prisma.package.findUnique({
    where: { name: "Kurumsal" },
  });

  // 3. Supabase Auth'da Admin oluştur/güncelle
  console.log("👤 Admin kullanıcısı (Supabase) kontrol ediliyor...");
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email === ADMIN_EMAIL);

  let supabaseUserId;

  if (existing) {
    console.log("ℹ️  Supabase kullanıcısı zaten mevcut:", existing.id);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error("Şifre güncellenemedi: " + error.message);
    supabaseUserId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error)
      throw new Error("Supabase kullanıcısı oluşturulamadı: " + error.message);
    supabaseUserId = data.user.id;
  }

  // 4. Prisma users tablosunda Admin oluştur/güncelle
  console.log("👤 Admin kullanıcısı (Prisma) eşitleniyor...");
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "admin", name: "Medasi Admin", packageId: adminPkg.id },
    create: {
      id: supabaseUserId,
      email: ADMIN_EMAIL,
      name: "Medasi Admin",
      role: "admin",
      packageId: adminPkg.id,
      onboardingCompleted: true,
    },
  });

  console.log("\n🎉 Veritabanı başarıyla eksiksiz hale getirildi!");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
