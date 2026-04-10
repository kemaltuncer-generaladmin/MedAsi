import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { ShieldCheck } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="flex">
        <AdminSidebar />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <header
            className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
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
