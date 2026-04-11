import { Brain, CalendarDays, ClipboardList, Stethoscope } from "lucide-react";

const FEATURE_ITEMS = [
  {
    icon: Brain,
    title: "AI Tanı Asistanı",
    description: "Semptomdan ayırıcı tanıya hızlı ve kanıta dayalı karar desteği.",
  },
  {
    icon: ClipboardList,
    title: "Sınav ve Soru Modülleri",
    description: "OSCE, sözlü ve kuramsal çalışma akışlarını tek merkezden yürüt.",
  },
  {
    icon: Stethoscope,
    title: "Klinik Yönetim",
    description: "Hasta takibi, notlar ve süreç yönetimi tek panelde.",
  },
  {
    icon: CalendarDays,
    title: "Akıllı Planlayıcı",
    description: "TUS, staj ve dönem planını düzenli bir ritme oturt.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "1. Profil ve hedeflerini belirle",
    text: "Rolüne ve dönemine göre kişisel çalışma omurgası otomatik oluşur.",
  },
  {
    title: "2. Günlük çalışmayı tek yerden yönet",
    text: "Soru, kart, materyal ve plan adımlarını aynı akışta sürdür.",
  },
  {
    title: "3. Performansı ölç ve ayarla",
    text: "Zayıf alanlara göre bir sonraki çalışma hamlesi netleşir.",
  },
];

export function FeaturesSection() {
  return (
    <section id="ozellikler" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
          Hızlı, sade ve güçlü bir öğrenme altyapısı
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
          Tüm temel modüller tek ekranda: daha az tıklama, daha yüksek odak, daha hızlı akış.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <Icon size={18} className="text-cyan-300" />
                <h3 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="nasil-calisir" className="border-y border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
          Medasi nasıl çalışır?
        </h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <article key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AIDemoSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
          AI çıktısı hızlı, okunabilir ve eyleme dönük
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
          Uzun animasyonlar yerine net çıktı odaklı arayüz: öneri, sonraki adım, öncelik.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-cyan-300/20 bg-black/25 p-4 text-sm text-[var(--color-text-secondary)]">
            Olası tanı listesi
          </div>
          <div className="rounded-xl border border-cyan-300/20 bg-black/25 p-4 text-sm text-[var(--color-text-secondary)]">
            Öncelikli tetkik önerileri
          </div>
          <div className="rounded-xl border border-cyan-300/20 bg-black/25 p-4 text-sm text-[var(--color-text-secondary)]">
            Klinik karar notu
          </div>
        </div>
      </div>
    </section>
  );
}
