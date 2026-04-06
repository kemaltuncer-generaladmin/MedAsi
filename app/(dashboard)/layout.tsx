import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell, Sidebar, Topbar } from '@/components/layout'
import { ROUTES } from '@/constants'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  return (
    <DashboardShell
      sidebar={<Sidebar />}
      topbar={<Topbar />}
    >
      {children}
    </DashboardShell>
  )
}
