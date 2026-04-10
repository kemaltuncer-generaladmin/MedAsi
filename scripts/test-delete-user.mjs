#!/usr/bin/env node
import('dotenv/config')
const args = process.argv.slice(2)
const userId = args[0] || process.env.TEST_DELETE_USER_ID
if (!userId) {
  console.error('Kullanım: node scripts/test-delete-user.mjs <userId>   veya TEST_DELETE_USER_ID env değişkeni ayarla')
  process.exit(1)
}

const { PrismaClient } = await import('@prisma/client')
const { createClient } = await import('@supabase/supabase-js')

const prisma = new PrismaClient()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log('Test silme başlıyor:', userId)

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
  if (!user) {
    console.error('Kullanıcı bulunamadı:', userId)
    process.exit(1)
  }

  const orgAdminCount = await prisma.researchOrganization.count({ where: { adminUserId: userId } })
  if (orgAdminCount > 0) {
    console.error('Kullanıcı bir organizasyonun yöneticisi olarak atanmış. Önce yönetici atamasını değiştirin.')
    process.exit(1)
  }

  try {
    await prisma.$transaction([
      prisma.orgAiUsage.deleteMany({ where: { userId } }),
      prisma.orgMember.deleteMany({ where: { userId } }),
      prisma.studySession.deleteMany({ where: { userId } }),
      prisma.tokenTransaction.deleteMany({ where: { userId } }),
      prisma.tokenWallet.deleteMany({ where: { userId } }),
      prisma.studentLearningProfile.deleteMany({ where: { userId } }),
      prisma.dashboardPreferences.deleteMany({ where: { userId } }),
      prisma.questionAttempt.deleteMany({ where: { userId } }),
      prisma.pomodoroLog.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.case.deleteMany({ where: { userId } }),
      prisma.patient.deleteMany({ where: { userId } }),
      prisma.userModule.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ])
    console.log('DB verileri silindi, şimdi Supabase auth siliniyor...')
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
      console.error('Supabase auth silinirken hata:', error.message)
      process.exit(1)
    }
    console.log('Kullanıcı başarıyla silindi:', userId)
  } catch (err) {
    console.error('Silme hatası:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
