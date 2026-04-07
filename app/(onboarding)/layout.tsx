import type { ReactNode } from 'react'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(0,196,235,0.05), transparent 50%), radial-gradient(circle at 80% 80%, rgba(20,0,166,0.08), transparent 50%)' }} />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
