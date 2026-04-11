import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { SessionTimeoutManager } from '@/components/layout/SessionTimeoutManager'
import { getSystemSettingsFromDb } from '@/lib/system-settings'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [settings, supabase] = await Promise.all([
    getSystemSettingsFromDb(),
    createClient(),
  ])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (settings.emailVerificationRequired && user && !user.email_confirmed_at) {
    const email = encodeURIComponent(user.email ?? '')
    const name = encodeURIComponent(
      typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : 'MedAsi kullanıcısı',
    )
    redirect(`/verify-email?email=${email}&name=${name}`)
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <SessionTimeoutManager timeoutMinutes={settings.sessionTimeoutMinutes} />
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="relative flex-1 min-w-0">
          <div className="pointer-events-none absolute inset-0 medasi-grid-bg opacity-35" />
          <header
            className="sticky top-0 z-40 px-4 py-4 md:px-6 lg:px-8"
          >
            <div className="glass-panel flex min-h-[74px] items-center justify-between rounded-3xl px-5 py-3">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-disabled)]">
                  Control Layer
                </span>
                <span className="text-base font-semibold text-[var(--color-text-primary)]">
                  Admin Panel
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Platform yönetimi, AI denetimi ve operasyonlar
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/5 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Yönetim modu aktif
                  </span>
                </div>
                <ThemeToggle />
                <div className="flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-3 py-2">
                  <ShieldCheck size={14} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-semibold text-[var(--color-primary)]">
                    Admin
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="relative z-10 mx-auto w-full max-w-[var(--content-max-width)] px-4 pb-10 md:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
