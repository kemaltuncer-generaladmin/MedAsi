import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { OrgAdminSidebar } from '@/components/org-admin/OrgAdminSidebar'
import type { ReactNode } from 'react'

export default async function OrgAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'org_admin') {
    redirect('/login')
  }

  // Org admin'in organizasyonunu bul
  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, role: 'org_admin', isActive: true },
    include: { org: true },
  })

  if (!membership) redirect('/login')

  const org = membership.org

  // Org süresi dolmuş veya askıya alınmışsa bilgi sayfasına yönlendir
  if (org.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Organizasyon hesabınız askıya alındı.
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Detaylar için platform yöneticisiyle iletişime geçin.
          </p>
        </div>
      </div>
    )
  }

  if (org.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Organizasyon erişim süreniz doldu.
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Uzatma için platform yöneticisiyle iletişime geçin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-background)' }}>
      <OrgAdminSidebar orgName={org.name} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
