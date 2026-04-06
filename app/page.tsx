'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import {
  Stethoscope, Brain, Terminal, CalendarDays, BarChart3, ShieldCheck,
  CheckCircle2, XCircle, ArrowRight, Sparkles, ChevronRight, Activity,
  Zap, Heart, Microscope, Pill, ClipboardList
} from 'lucide-react'

const PRIMARY = '#00C4EB'
const SECONDARY = '#1400A6'
const BG = '#0A0A0C'
const SURFACE = '#141419'
const BORDER = '#27272A'
const TEXT = '#FFFFFF'
const MUTED = '#CBD5E1'

// ─── Animasyonlu Sayılar ───
function CountUp({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      let start = 0
      const step = end / 60
      const timer = setInterval(() => {
        start += step
        if (start >= end) { setCount(end); clearInterval(timer) }
        else setCount(Math.floor(start))
      }, 16)
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end])
  return <span ref={ref}>{count.toLocaleString('tr-TR')}{suffix}</span>
}

// ─── Pulsing Dot ───
function PulseDot({ color = PRIMARY }: { color?: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
    </span>
  )
}

// ─── Mockup Dashboard ───
function DashboardMockup() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % 3), 2000)
    return () => clearInterval(t)
  }, [])

  const vitals = [
    { label: 'Nabız', value: '72', unit: 'bpm', icon: Heart, color: '#ef4444' },
    { label: 'SpO2', value: '98', unit: '%', icon: Activity, color: PRIMARY },
    { label: 'Tanı Skoru', value: '94', unit: '%', icon: Zap, color: '#10b981' },
  ]

  const diagnoses = [
    { name: 'Pnömoni (Sol Bazal)', prob: 87 },
    { name: 'Plevral Efüzyon', prob: 64 },
    { name: 'Tüberküloz (Latent)', prob: 31 },
  ]

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Glow */}
      <div className="absolute -inset-4 rounded-3xl opacity-20 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${PRIMARY}, ${SECONDARY})` }} />

      <div className="relative rounded-2xl border overflow-hidden shadow-2xl"
        style={{ background: SURFACE, borderColor: BORDER }}>
        {/* Topbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: BORDER, background: '#0d0d12' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 mx-4 rounded-md px-3 py-1 text-xs" style={{ background: BORDER, color: MUTED }}>
            medasi.com.tr/ai-diagnosis
          </div>
          <PulseDot />
        </div>

        <div className="p-5 space-y-4">
          {/* Vitals */}
          <div className="grid grid-cols-3 gap-3">
            {vitals.map((v, i) => (
              <div key={i} className="rounded-xl p-3 border transition-all duration-500"
                style={{
                  background: active === i ? `${v.color}18` : '#0d0d12',
                  borderColor: active === i ? v.color : BORDER,
                }}>
                <v.icon size={14} style={{ color: v.color }} />
                <div className="text-xl font-bold mt-1" style={{ color: TEXT }}>{v.value}</div>
                <div className="text-xs" style={{ color: MUTED }}>{v.unit} · {v.label}</div>
              </div>
            ))}
          </div>

          {/* Diagnoses */}
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: BORDER, background: '#0d0d12' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: MUTED }}>AI Ayırıcı Tanı</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${PRIMARY}20`, color: PRIMARY }}>Canlı</span>
            </div>
            {diagnoses.map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{ color: TEXT }}>{d.name}</span>
                  <span style={{ color: i === 0 ? PRIMARY : MUTED }}>{d.prob}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${d.prob}%`, background: i === 0 ? PRIMARY : `${PRIMARY}50` }} />
                </div>
              </div>
            ))}
          </div>

          {/* AI Input */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl px-4 py-2.5 text-sm border" style={{ background: '#0d0d12', borderColor: BORDER, color: MUTED }}>
              Hastanın semptomlarını yazın...
            </div>
            <button className="rounded-xl px-4 font-semibold text-sm text-black transition-opacity hover:opacity-90"
              style={{ background: PRIMARY }}>
              Analiz
            </button>
          </div>
        </div>
      </div>

      {/* Floating Badges */}
      <div className="absolute -left-6 top-1/3 animate-bounce rounded-xl px-3 py-2 shadow-lg border text-xs font-medium"
        style={{ background: SURFACE, borderColor: PRIMARY, color: PRIMARY }}>
        <Microscope size={12} className="inline mr-1" />400K+ Vaka
      </div>
      <div className="absolute -right-6 bottom-1/4 animate-bounce rounded-xl px-3 py-2 shadow-lg border text-xs font-medium"
        style={{ background: SURFACE, borderColor: '#10b981', color: '#10b981', animationDelay: '0.5s' }}>
        <Pill size={12} className="inline mr-1" />Kanıta Dayalı
      </div>
    </div>
  )
}

// ─── Feature Card ───
function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border p-6 transition-all duration-300 cursor-default"
      style={{
        background: hovered ? `${SECONDARY}18` : SURFACE,
        borderColor: hovered ? PRIMARY : BORDER,
        boxShadow: hovered ? `0 0 24px ${PRIMARY}22` : 'none',
      }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
        style={{ background: hovered ? `${PRIMARY}25` : `${PRIMARY}15` }}>
        <Icon size={22} style={{ color: PRIMARY }} />
      </div>
      <h3 className="font-semibold mb-2" style={{ color: TEXT }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{desc}</p>
    </div>
  )
}

// ─── Testimonial Card ───
function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="rounded-xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <span key={i} style={{ color: PRIMARY }}>★</span>
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-5" style={{ color: MUTED }}>"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-black"
          style={{ background: PRIMARY }}>{name[0]}</div>
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{name}</p>
          <p className="text-xs" style={{ color: MUTED }}>{role}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main ───
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const features = [
    { icon: Stethoscope, title: 'AI Tanı Asistanı', desc: 'Semptomları girin, saniyeler içinde kanıta dayalı ayırıcı tanılara ve olası senaryolara ulaşın.' },
    { icon: Brain, title: 'Vaka RPG', desc: 'Sanal hastalarla interaktif pratik yapın. Anamnez alın, tetkik isteyin, tedavi planlayın.' },
    { icon: Terminal, title: 'Medikal Terminal', desc: 'İleri düzey kullanıcılar için komut satırı hızında literatür taraması ve doz hesaplamaları.' },
    { icon: CalendarDays, title: 'Günlük Brifing', desc: 'Size özel hazırlanan günlük tıp bülteni ve odaklanmanız gereken güncel makaleler.' },
    { icon: BarChart3, title: 'Performans Metrikleri', desc: 'TUS denemelerinizi, vaka başarı oranlarınızı ve gelişim eğrinizi anlık takip edin.' },
    { icon: ShieldCheck, title: 'Güvenli ve Güncel', desc: 'En son tıbbi kılavuzlarla sürekli güncellenen, %100 doğrulanmış veri tabanı.' },
  ]

  const tableRows = [
    { feature: 'Gerçek Zamanlı Geri Bildirim', old: false, new: 'Anında Yapay Zeka Analizi' },
    { feature: 'Vaka Çeşitliliği', old: false, new: '400.000+ Dinamik Senaryo' },
    { feature: 'Öğrenme Hızı', old: false, new: 'Kişiselleştirilmiş Hız' },
    { feature: '7/24 Erişim', old: false, new: 'Kesintisiz, Her Cihazdan' },
    { feature: 'Güncel Kılavuzlar', old: false, new: 'Otomatik Güncelleme' },
  ]

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? `${BG}ee` : 'transparent',
          borderBottom: scrolled ? `1px solid ${BORDER}` : 'none',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-wider">
            MED<span style={{ color: PRIMARY }}>ASI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="px-4 py-2 text-sm font-medium rounded-xl transition-colors hover:text-white"
              style={{ color: MUTED }}>
              Giriş Yap
            </Link>
            <Link href="/register"
              className="px-4 py-2 text-sm font-semibold rounded-xl text-black transition-opacity hover:opacity-90"
              style={{ background: PRIMARY }}>
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen flex items-center pt-16 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${BORDER}55 1px, transparent 1px), linear-gradient(90deg, ${BORDER}55 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: PRIMARY }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8 pointer-events-none"
          style={{ background: SECONDARY }} />

        <div className="max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border"
                style={{ background: `${SECONDARY}30`, borderColor: `${SECONDARY}60`, color: PRIMARY }}>
                <Sparkles size={14} />
                Tıbbi Eğitimde Yeni Dönem
              </div>

              <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                Tıbbi Eğitimde<br />
                <span style={{ color: PRIMARY }}>Yapay Zeka:</span><br />
                <span>Sıfır Risk.</span><br />
                <span>Sonsuz Pratik.</span>
              </h1>

              <p className="text-lg leading-relaxed max-w-lg" style={{ color: MUTED }}>
                400.000'den fazla vaka, yapay zeka destekli anlık teşhis ve kişiselleştirilmiş asistan ile
                laboratuvardan kliniğe uzanan yolculuğunuzda yanınızda.
              </p>

              {/* Stats */}
              <div className="flex gap-8">
                {[
                  { end: 400000, suffix: '+', label: 'Klinik Vaka' },
                  { end: 2000, suffix: '+', label: 'Aktif Kullanıcı' },
                  { end: 94, suffix: '%', label: 'Başarı Oranı' },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold" style={{ color: PRIMARY }}>
                      <CountUp end={s.end} suffix={s.suffix} />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: MUTED }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="space-y-3">
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-black font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
                  style={{ background: PRIMARY, boxShadow: `0 0 32px ${PRIMARY}55` }}>
                  30 Dakikalık Demo Al
                  <ArrowRight size={20} />
                </Link>
                <p className="text-xs" style={{ color: MUTED }}>
                  Kredi kartı gerekmez. 2.000+ tıp öğrencisi ve doktor kullanıyor.
                </p>
              </div>
            </div>

            {/* Right — Mockup */}
            <div className="hidden lg:block">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee Logo Band ── */}
      <div className="border-y py-5 overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 items-center">
              {['Hacettepe Tıp', 'İstanbul Tıp', 'Ege Üniversitesi', 'Marmara Tıp', 'Ankara Tıp', 'GATA', '9 Eylül Tıp'].map(u => (
                <span key={u} className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: MUTED }}>
                  <ClipboardList size={14} style={{ color: PRIMARY }} />
                  {u}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="py-28 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full"
            style={{ color: PRIMARY, background: `${PRIMARY}15` }}>
            <Zap size={12} /> Modüller
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold">
            Her İhtiyacınız İçin<br />
            <span style={{ color: PRIMARY }}>Özel Olarak Eğitilmiş</span> Modüller
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="py-28 border-y" style={{ borderColor: BORDER }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Neden <span style={{ color: PRIMARY }}>MEDASI</span>?</h2>
            <p style={{ color: MUTED }}>Geleneksel yöntemlerle kıyaslayın ve farkı görün.</p>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
            {/* Header */}
            <div className="grid grid-cols-3 border-b" style={{ borderColor: BORDER }}>
              <div className="p-4 text-sm font-semibold" style={{ color: MUTED }}>Özellik</div>
              <div className="p-4 text-sm font-semibold text-center border-x" style={{ borderColor: BORDER, color: MUTED }}>
                Geleneksel Yöntemler
              </div>
              <div className="p-4 text-sm font-semibold text-center" style={{ color: PRIMARY, background: `${SECONDARY}20` }}>
                MEDASI Pro ✦
              </div>
            </div>

            {tableRows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: BORDER }}>
                <div className="p-4 text-sm font-medium" style={{ color: TEXT }}>{row.feature}</div>
                <div className="p-4 flex items-center justify-center border-x" style={{ borderColor: BORDER }}>
                  <XCircle size={18} className="text-red-500/60" />
                </div>
                <div className="p-4 flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: `${SECONDARY}12`, color: '#6ee7b7' }}>
                  <CheckCircle2 size={16} />
                  {row.new}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Meslektaşlarınız <span style={{ color: PRIMARY }}>Ne Diyor?</span></h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <TestimonialCard
            quote="Vaka RPG modülü sayesinde poliklinik pratiğimi evden yapabiliyorum. Kesinlikle tıp fakültesi öğrencilerinin başucu asistanı."
            name="Dr. Kemal"
            role="Asistan Hekim"
          />
          <TestimonialCard
            quote="TUS hazırlık sürecimde eksik olduğum konuları AI Asistan ile nokta atışı tespit ettim. Sınava 3 ay kala keşfettiğim için üzgünüm."
            name="Elif Y."
            role="Tıp Fak. 4. Sınıf"
          />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto rounded-2xl p-16 text-center relative overflow-hidden border"
          style={{
            background: `linear-gradient(135deg, ${SECONDARY}60 0%, ${SECONDARY}30 50%, ${SECONDARY}10 100%)`,
            borderColor: `${SECONDARY}80`,
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${PRIMARY}15, transparent 70%)`,
            }} />
          <div className="relative space-y-6">
            <h2 className="text-3xl lg:text-5xl font-extrabold leading-tight">
              Geleceğin Tıbbını<br />
              <span style={{ color: PRIMARY }}>Bugünden Deneyimleyin.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: MUTED }}>
              Hemen kayıt olun ve 14 gün boyunca tüm modülleri ücretsiz test edin.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-black font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
              style={{ background: PRIMARY, boxShadow: `0 0 40px ${PRIMARY}55` }}>
              Ücretsiz Hesabını Oluştur
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8 px-6" style={{ borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">MED<span style={{ color: PRIMARY }}>ASI</span></span>
            <span className="text-sm" style={{ color: MUTED }}>© 2026. Tüm hakları saklıdır.</span>
          </div>
          <div className="flex items-center gap-6">
            {['Gizlilik', 'Kullanım Şartları', 'İletişim'].map(l => (
              <Link key={l} href="#" className="text-sm transition-colors hover:text-white"
                style={{ color: MUTED }}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>

      {/* Marquee animation */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .animate-marquee { animation: marquee 25s linear infinite; }
      `}</style>
    </div>
  )
}
