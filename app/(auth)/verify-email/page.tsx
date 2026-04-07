import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui'
import { ROUTES } from '@/constants'

export default function VerifyEmailPage() {
  return (
    <Card
      variant="bordered"
      className="border-[#1E1E2E] bg-[#0F0F14] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
          <Mail size={28} className="text-[var(--color-primary)]" />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-primary)] [font-family:var(--font-mono)]">
            Son Bir Adım
          </p>
          <h1 className="text-[26px] font-bold leading-tight text-[var(--color-text-primary)]">
            E-postanı Doğrula
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-sm">
            Hesabını aktifleştirmek için e-posta adresine bir doğrulama bağlantısı gönderdik.
            Gelen kutunu ve spam klasörünü kontrol et.
          </p>
        </div>

        <div className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4 space-y-2">
          {[
            '1. E-posta kutunu aç',
            '2. MEDASI\'den gelen mesajı bul',
            '3. "E-postamı Doğrula" butonuna tıkla',
            '4. Sisteme giriş yap',
          ].map((step) => (
            <div key={step} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
              <span className="text-sm text-[var(--color-text-secondary)]">{step}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--color-text-secondary)]">
          E-posta gelmediyse birkaç dakika bekle veya spam klasörünü kontrol et.
        </p>

        <Link
          href={ROUTES.login}
          className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={14} />
          Giriş sayfasına dön
        </Link>
      </div>
    </Card>
  )
}
