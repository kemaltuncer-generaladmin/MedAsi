'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { login } from '@/lib/actions/auth'
import { ROUTES } from '@/constants'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formId = useMemo(() => `login-form-${Math.random().toString(36).slice(2)}`, [])

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      try {
        await login(formData)
      } catch (submitError) {
        if (isRedirectError(submitError)) throw submitError
        setError(submitError instanceof Error ? submitError.message : 'Bir hata oluştu')
      }
    })
  }

  return (
    <Card
      variant="bordered"
      className="border-[#1E1E2E] bg-[#0F0F14] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="mb-8 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-primary)] [font-family:var(--font-mono)]">
          1 / 1 — Hesap Girişi
        </p>
        <div className="space-y-2">
          <h1 className="text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
            Sisteme Giriş Yap.
          </h1>
          <p className="text-sm italic text-[var(--color-text-secondary)]">
            Kariyerinin her aşamasında yanındayız.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 border px-3 py-3 text-sm" style={{ borderColor: '#FF3B5C', backgroundColor: 'rgba(255,59,92,0.08)', color: '#FF8DA1' }}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id={formId} action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
            E-posta
          </label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              id="login-email"
              name="email"
              type="email"
              placeholder="dr@ornek.com"
              required
              className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
            Şifre
          </label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10 pr-11 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="#" className="text-xs text-[var(--color-primary)] transition-opacity hover:opacity-80">
            Şifremi Unuttum
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-[4px] border-0 bg-[var(--color-primary)] text-sm font-semibold text-[#020617] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Giriş yapılıyor...
            </>
          ) : (
            <>Giriş Yap →</>
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Hesabın yok mu?{' '}
          <Link href={ROUTES.register} className="text-[var(--color-primary)] transition-opacity hover:opacity-80">
            Kayıt Ol
          </Link>
        </p>
        <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--color-text-disabled)] [font-family:var(--font-mono)]">
          AUTHORIZED PERSONNEL ONLY // KVKK COMPLIANT
        </p>
      </div>
    </Card>
  )
}
