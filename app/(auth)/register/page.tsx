'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { AlertCircle, ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { register } from '@/lib/actions/auth'
import { ROUTES } from '@/constants'

const seniorityOptions = ['Tıp Öğrencisi', 'Asistan Doktor', 'Uzman Doktor', 'Profesör'] as const

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, startTransition] = useTransition()
  const formId = useMemo(() => `register-form-${Math.random().toString(36).slice(2)}`, [])
  const passwordsMatch = password.length === 0 || confirmPassword.length === 0 || password === confirmPassword

  const handleSubmit = async (formData: FormData) => {
    setError(null)

    const nextPassword = String(formData.get('password') ?? '')
    const nextConfirmPassword = String(formData.get('confirmPassword') ?? '')

    if (nextPassword !== nextConfirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor')
      return
    }

    formData.delete('confirmPassword')

    startTransition(async () => {
      try {
        await register(formData)
      } catch (submitError) {
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
          1 / 2 — Hesap Bilgileri
        </p>
        <div className="space-y-2">
          <h1 className="text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
            Sisteme Bağlan.
          </h1>
          <p className="text-sm italic text-[var(--color-text-secondary)]">
            Hangi aşamada olursan ol, seni tanıyoruz.
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
          <label htmlFor="register-name" className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
            Ad Soyad
          </label>
          <div className="relative">
            <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              id="register-name"
              name="name"
              type="text"
              placeholder="Dr. Ayşe Kaya"
              required
              className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="register-email" className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
            E-posta
          </label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              id="register-email"
              name="email"
              type="email"
              placeholder="dr@ornek.com"
              required
              className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="register-password" className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
            Şifre
          </label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

        <div className="space-y-1.5">
          <label htmlFor="register-confirm-password" className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
            Şifre Tekrar
          </label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={!passwordsMatch ? 'Şifreler eşleşmiyor' : undefined}
              className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10 pr-11 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              aria-label={showConfirmPassword ? 'Şifre tekrarını gizle' : 'Şifre tekrarını göster'}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="register-seniority" className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
            Uzmanlık Aşaması
          </label>
          <div className="relative">
            <select
              id="register-seniority"
              name="seniority"
              required
              defaultValue=""
              className="h-11 w-full appearance-none rounded-[4px] border border-[#1E1E2E] bg-[var(--color-background)] px-3 pr-11 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="" disabled className="bg-[#070709] text-[var(--color-text-secondary)]">
                Bir aşama seçin
              </option>
              {seniorityOptions.map((option) => (
                <option key={option} value={option} className="bg-[#070709] text-[var(--color-text-primary)]">
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending || !passwordsMatch}
          className="h-11 w-full rounded-[4px] border-0 bg-[var(--color-primary)] text-sm font-semibold text-[#020617] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Kayıt yapılıyor...
            </>
          ) : (
            <>Hesap Oluştur →</>
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Zaten hesabın var mı?{' '}
          <Link href={ROUTES.login} className="text-[var(--color-primary)] transition-opacity hover:opacity-80">
            Giriş Yap
          </Link>
        </p>
        <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--color-text-disabled)] [font-family:var(--font-mono)]">
          AUTHORIZED PERSONNEL ONLY // KVKK COMPLIANT
        </p>
      </div>
    </Card>
  )
}
