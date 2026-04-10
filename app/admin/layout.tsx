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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <SessionTimeoutManager timeoutMinutes={settings.sessionTimeoutMinutes} />
      <div className="flex">
        <AdminSidebar />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <header
            className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
              borderBottom: '1px solid var(--color-border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex flex-col">
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Admin Panel
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Platform yönetimi ve yapılandırma
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-success)' }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Hızlı yönetim modu
                </span>
              </div>
              <ThemeToggle />
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
                }}
              >
                <ShieldCheck
                  size={14}
                  style={{ color: 'var(--color-primary)', flexShrink: 0 }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Admin
                </span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
