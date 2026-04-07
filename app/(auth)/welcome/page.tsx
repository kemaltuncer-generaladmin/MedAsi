'use client'

import { useMemo, useState, useTransition } from 'react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import {
  AlertCircle, ChevronDown, Eye, EyeOff,
  Loader2, Lock, Mail, User,
} from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { login, register } from '@/lib/actions/auth'

type Tab = 'login' | 'register'

const SENIORITY = ['Tıp Öğrencisi', 'Asistan Doktor', 'Uzman Doktor', 'Profesör'] as const

export default function WelcomePage() {
  const [tab, setTab] = useState<Tab>('login')

  return (
    <div className="w-full space-y-6">
      <div className="flex rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        {(['login', 'register'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-2.5 text-sm font-medium transition-all duration-150',
              tab === t
                ? 'bg-[var(--color-primary)] text-black'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {t === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        ))}
      </div>
      {tab === 'login' ? <LoginForm /> : <RegisterForm onSuccess={() => setTab('login')} />}
    </div>
  )
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [pending, startTransition] = useTransition()
  const id = useMemo(() => Math.random().toString(36).slice(2), [])

  return (
    <Card variant="bordered" className="border-[var(--color-border)] bg-[#0F0F14] p-7">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Sisteme Giriş Yap</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">Kariyerinin her aşamasında yanındayız.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 border px-3 py-2 text-sm rounded-sm" style={{ borderColor: '#FF3B5C', backgroundColor: 'rgba(255,59,92,0.08)', color: '#FF8DA1' }}>
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id={id} action={(fd) => { setError(null); startTransition(async () => { try { const r = await login(fd); if (r && !r.success) setError(r.error || 'Hata oluştu') } catch (e) { if (isRedirectError(e)) throw e; setError(e instanceof Error ? e.message : 'Hata oluştu') } }) }} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">E-posta</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <Input name="email" type="email" placeholder="dr@ornek.com" required className="pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">Şifre</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <Input name="password" type={showPw ? 'text' : 'password'} placeholder="••••••••" required className="pl-10 pr-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]" />
            <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={pending} className="w-full h-11 rounded-[4px]">
          {pending ? <><Loader2 size={15} className="animate-spin" />Giriş yapılıyor...</> : 'Giriş Yap →'}
        </Button>
      </form>
      <p className="text-center text-xs text-[var(--color-text-secondary)] mt-4 font-mono uppercase tracking-widest">AUTHORIZED PERSONNEL ONLY</p>
    </Card>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [pw, setPw] = useState('')
  const [cpw, setCpw] = useState('')
  const [pending, startTransition] = useTransition()
  const id = useMemo(() => Math.random().toString(36).slice(2), [])
  const match = pw.length === 0 || cpw.length === 0 || pw === cpw

  return (
    <Card variant="bordered" className="border-[var(--color-border)] bg-[#0F0F14] p-7">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Hesap Oluştur</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">Ücretsiz başlayın, istediğiniz zaman yükseltin.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 border px-3 py-2 text-sm rounded-sm" style={{ borderColor: '#FF3B5C', backgroundColor: 'rgba(255,59,92,0.08)', color: '#FF8DA1' }}>
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id={id} action={(fd) => {
        setError(null)
        if (String(fd.get('password')) !== String(fd.get('confirmPassword'))) { setError('Şifreler eşleşmiyor'); return }
        fd.delete('confirmPassword')
        startTransition(async () => { try { const r = await register(fd); if (r && !r.success) { setError(r.error || 'Hata oluştu') } else { onSuccess() } } catch (e) { if (isRedirectError(e)) throw e; setError(e instanceof Error ? e.message : 'Hata oluştu') } })
      }} className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">Ad Soyad</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <Input name="name" type="text" placeholder="Dr. Ad Soyad" required className="pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">E-posta</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <Input name="email" type="email" placeholder="dr@ornek.com" required className="pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">Kıdem</label>
          <div className="relative">
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <select name="seniority" required className="w-full h-11 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text-primary)] pl-3 pr-10 focus:outline-none focus:border-[var(--color-primary)] appearance-none">
              <option value="">Kıdem seçin</option>
              {SENIORITY.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">Şifre</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <Input name="password" type={showPw ? 'text' : 'password'} placeholder="En az 6 karakter" required value={pw} onChange={e => setPw(e.target.value)} className="pl-10 pr-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]" />
            <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">Şifre Tekrar</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <Input name="confirmPassword" type="password" placeholder="••••••••" required value={cpw} onChange={e => setCpw(e.target.value)} className={`pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)] ${!match ? 'border-[var(--color-destructive)]' : ''}`} />
          </div>
          {!match && <p className="text-xs text-[var(--color-destructive)] mt-1">Şifreler eşleşmiyor</p>}
        </div>
        <Button type="submit" disabled={pending || !match} className="w-full h-11 rounded-[4px] mt-1">
          {pending ? <><Loader2 size={15} className="animate-spin" />Kayıt olunuyor...</> : 'Kayıt Ol →'}
        </Button>
      </form>
    </Card>
  )
}
