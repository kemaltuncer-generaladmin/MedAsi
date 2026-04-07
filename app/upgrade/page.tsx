import Link from 'next/link'
import { Check, X, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const studentFeatures = [
  { text: 'Günlük 10 AI sorgusu', included: true },
  { text: 'AI Tanı Asistanı', included: true },
  { text: 'Vaka RPG (sınırlı)', included: true },
  { text: 'Medikal Terminal', included: true },
  { text: 'Sınırsız AI sorgusu', included: false },
  { text: 'Öncelikli destek', included: false },
]

const proFeatures = [
  { text: 'Sınırsız AI sorgusu', included: true },
  { text: 'Tüm modüllere tam erişim', included: true },
  { text: 'AI Asistan (sınırsız)', included: true },
  { text: 'Günlük Brifing', included: true },
  { text: 'Hasta & Vaka yönetimi', included: true },
  { text: 'PDF dışa aktarma', included: true },
  { text: 'Özel kurumsal destek', included: false },
]

const enterpriseFeatures = [
  { text: 'Sınırsız her şey', included: true },
  { text: '10 kullanıcı hesabı', included: true },
  { text: 'Özel kurumsal destek', included: true },
  { text: 'Özelleştirilebilir modüller', included: true },
  { text: 'API erişimi', included: true },
  { text: 'Öncelikli AI modelleri', included: true },
  { text: 'SLA garantisi', included: true },
]

const faqs = [
  {
    q: 'Aylık planı iptal edebilir miyim?',
    a: 'Evet, dilediğiniz zaman iptal edebilirsiniz. İptal işlemi sonrasında mevcut dönem sona erene kadar planınız aktif kalmaya devam eder. Herhangi bir ceza veya ek ücret uygulanmaz.',
  },
  {
    q: 'AI sorgu limiti nasıl çalışır?',
    a: 'Her gece gece yarısı (Türkiye saatiyle 00:00) sıfırlanır. Öğrenci paketinde günlük 10 sorgu hakkınız bulunmaktadır. Klinik Pro ve Kurumsal planlarda sınırsız sorgu yapabilirsiniz.',
  },
  {
    q: 'Kurumsal plan nedir?',
    a: 'Hastane ve klinikler için özel olarak tasarlanmış kurumsal planımız, 10 kullanıcı hesabı, SLA garantisi, API erişimi ve özel destek hattı gibi ayrıcalıklar sunar. Daha büyük ekipler için özel fiyatlandırma mevcuttur.',
  },
  {
    q: 'Ödeme yöntemleri neler?',
    a: 'Kredi kartı ve banka kartı (Visa, Mastercard, Troy) ile ödeme yapabilirsiniz. Kurumsal müşterilerimiz için fatura ile ödeme ve banka havalesi seçenekleri de mevcuttur.',
  },
]

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <nav className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 sticky top-0 z-50">
        <Link href="/" className="text-xl font-bold text-[var(--color-text-primary)] tracking-wide">
          MED<span className="text-[var(--color-primary)]">ASI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Giriş Yap</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">Hesap Oluştur</Button>
          </Link>
        </div>
      </nav>

      <main>
        <section className="text-center py-16 px-6">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">Şeffaf fiyatlandırma — her zaman</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-4 leading-tight">
            Potansiyelinizi Ortaya Çıkarın
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto">
            Medikal eğitiminizi bir üst seviyeye taşıyın
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <Badge variant="secondary" className="mb-3">Ücretsiz</Badge>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Öğrenci</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Tıp öğrencileri için temel plan</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-[var(--color-text-primary)]">₺0</span>
                  <span className="text-[var(--color-text-secondary)] mb-1">/ ay</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {studentFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    {f.included ? (
                      <Check size={15} style={{ color: 'var(--color-success)' }} className="shrink-0" />
                    ) : (
                      <X size={15} className="shrink-0 text-[var(--color-border)]" />
                    )}
                    <span className={`text-sm ${f.included ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] line-through decoration-[var(--color-border)]'}`}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="md" disabled className="w-full border border-[var(--color-border)]">
                Mevcut Plan
              </Button>
            </div>

            <div
              className="bg-[var(--color-surface-elevated)] rounded-2xl p-7 flex flex-col relative overflow-hidden"
              style={{ boxShadow: '0 0 0 2px var(--color-primary), 0 0 32px 0 rgba(0,196,235,0.12)' }}
            >
              <style>{`
                @keyframes pulse-glow {
                  0%, 100% { box-shadow: 0 0 0 2px var(--color-primary), 0 0 32px 0 rgba(0,196,235,0.12); }
                  50% { box-shadow: 0 0 0 2px var(--color-primary), 0 0 48px 0 rgba(0,196,235,0.25); }
                }
              `}</style>
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)' }}
              />
              <div className="mb-6">
                <Badge variant="default" className="mb-3">En Popüler</Badge>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Klinik Pro</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Aktif klinisyenler için tam güç</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-[var(--color-text-primary)]">₺299</span>
                  <span className="text-[var(--color-text-secondary)] mb-1">/ ay</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {proFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    {f.included ? (
                      <Check size={15} style={{ color: 'var(--color-success)' }} className="shrink-0" />
                    ) : (
                      <X size={15} className="shrink-0 text-[var(--color-border)]" />
                    )}
                    <span className={`text-sm ${f.included ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] line-through decoration-[var(--color-border)]'}`}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="primary" size="lg" className="w-full">
                Klinik Pro&apos;ya Geç
              </Button>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <Badge variant="secondary" className="mb-3">Kurumsal</Badge>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Enterprise</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Hastane ve klinikler için</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-[var(--color-text-primary)]">₺999</span>
                  <span className="text-[var(--color-text-secondary)] mb-1">/ ay</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {enterpriseFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    <Check size={15} style={{ color: 'var(--color-success)' }} className="shrink-0" />
                    <span className="text-sm text-[var(--color-text-primary)]">{f.text}</span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="md" className="w-full">
                Satış Ekibiyle İletişime Geç
              </Button>
            </div>
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-6 pb-16">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-8">
            Sık Sorulan Sorular
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className="text-[var(--color-text-secondary)] shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="px-5 pb-4 pt-1 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="text-center pb-20 px-6">
          <div className="max-w-lg mx-auto bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-10">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Hâlâ karar veremiyor musunuz?
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Kredi kartı gerektirmeden 14 gün ücretsiz deneyin.
            </p>
            <Button variant="primary" size="lg">
              14 Gün Ücretsiz Deneme Başlatın
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
