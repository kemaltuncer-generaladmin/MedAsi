import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { login } from '@/lib/actions/auth'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            MED<span className="text-[var(--color-primary)]">ASI</span>
          </h1>
          <p className="text-[var(--color-text-secondary)]">Tıbbi AI Platformu</p>
        </div>

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              E-Posta
            </label>
            <Input name="email" type="email" placeholder="dr@ornek.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Şifre
            </label>
            <Input name="password" type="password" placeholder="••••••••" required />
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full mt-6">
            Giriş Yap
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4">
          Hesabın yok mu?{' '}
          <a href="/register" className="text-[var(--color-primary)] hover:underline font-medium">
            Kayıt Ol
          </a>
        </p>
      </Card>
    </div>
  )
}
