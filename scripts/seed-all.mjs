import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zjezqwcjrixkemdmrdoq.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZXpxd2Nqcml4a2VtZG1yZG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5NzUzMSwiZXhwIjoyMDkxMDczNTMxfQ.HcVRwR3X8HtdzuHodbqStdDGhzutMUehQfnY5AK71jM'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const prisma = new PrismaClient()

const PACKAGES = [
  { name: 'Öğrenci', dailyAiLimit: 10, price: 0 },
  { name: 'Klinik Pro', dailyAiLimit: -1, price: 299 },
  { name: 'Kurumsal', dailyAiLimit: -1, price: 999 },
  { name: 'Admin', dailyAiLimit: 9999, price: 0 }
]

const MODULES = [
  { name: 'ai-diagnosis', description: 'Semptom bazlı tanı yardımcısı' },
  { name: 'case-rpg', description: 'İnteraktif vaka simülasyonu' },
  { name: 'terminal', description: 'Klinik komut terminali' },
  { name: 'ai-assistant', description: 'Genel medikal asistan' },
  { name: 'daily-briefing', description: 'Günlük medikal özet' },
  { name: 'patients', description: 'Hasta yönetimi' },
  { name: 'cases', description: 'Vaka takibi' },
  { name: 'notes', description: 'Klinik notlar' },
  { name: 'pomodoro', description: 'Çalışma zamanlayıcısı' }
]

const ADMIN_EMAIL = 'kemal.tuncer@medasi.com.tr'
const ADMIN_PASSWORD = 'Medasi2026!'

async function main() {
  console.log('🔧 Veritabanı eksikleri tamamlanıyor...\n')

  // 1. Modülleri Ekle
  console.log('📦 Modüller oluşturuluyor...')
  for (const mod of MODULES) {
    await prisma.module.upsert({
      where: { name: mod.name },
      update: { description: mod.description },
      create: { name: mod.name, description: mod.description }
    })
  }

  // 2. Paketleri Ekle
  console.log('📦 Paketler oluşturuluyor...')
  for (const pkg of PACKAGES) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: { dailyAiLimit: pkg.dailyAiLimit, price: pkg.price },
      create: { name: pkg.name, dailyAiLimit: pkg.dailyAiLimit, price: pkg.price }
    })
  }

  // Admin Paketini Bul
  const adminPkg = await prisma.package.findUnique({ where: { name: 'Admin' } })

  // 3. Supabase Auth'da Admin oluştur/güncelle
  console.log('👤 Admin kullanıcısı (Supabase) kontrol ediliyor...')
  const { data: listData } = await supabase.auth.admin.listUsers()
  const existing = listData?.users?.find((u) => u.email === ADMIN_EMAIL)

  let supabaseUserId

  if (existing) {
    console.log('ℹ️  Supabase kullanıcısı zaten mevcut:', existing.id)
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error('Şifre güncellenemedi: ' + error.message)
    supabaseUserId = existing.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error('Supabase kullanıcısı oluşturulamadı: ' + error.message)
    supabaseUserId = data.user.id
  }

  // 4. Prisma users tablosunda Admin oluştur/güncelle
  console.log('👤 Admin kullanıcısı (Prisma) eşitleniyor...')
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'admin', name: 'Kemal Tuncer', packageId: adminPkg.id },
    create: {
      id: supabaseUserId,
      email: ADMIN_EMAIL,
      name: 'Kemal Tuncer',
      role: 'admin',
      packageId: adminPkg.id,
      onboardingCompleted: true,
    },
  })

  console.log('\n🎉 Veritabanı başarıyla eksiksiz hale getirildi!')
}

main()
  .catch((e) => { console.error('❌ Hata:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
