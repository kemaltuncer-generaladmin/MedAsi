import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { ShieldCheck } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          {/* Header */}
          <header
            className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} style={{ color: 'var(--color-primary)' }} />
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                MED<span style={{ color: 'var(--color-primary)' }}>ASI</span>{' '}
                <span
                  className="font-normal text-sm ml-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Admin Panel
                </span>
              </span>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}