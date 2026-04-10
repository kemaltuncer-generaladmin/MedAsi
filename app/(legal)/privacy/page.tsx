import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Sözleşmesi — Medasi",
  description: "MEDASI platformunun kişisel verilerin işlenmesine ilişkin gizlilik politikası.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="Son güncelleme: Nisan 2026"
      title="Gizlilik Sözleşmesi"
      subtitle="Kişisel verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklamaktayız."
      sections={SECTIONS}
    />
  );
}

const SECTIONS = [
  {
    heading: "1. Veri Sorumlusu",
    body: `MEDASI platformu, Medasi Teknoloji A.Ş. ("Şirket") tarafından işletilmektedir. 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz. İletişim: kvkk@medasi.com.tr`,
  },
  {
    heading: "2. Hangi Verileri Topluyoruz?",
    body: `• Kimlik ve iletişim verileri: Ad, soyad, e-posta adresi, telefon numarası.\n• Hesap verileri: Şifre özeti (hash), tercihler, öğrenim dönemi, hedefler.\n• Kullanım verileri: Platform içi aktivite kayıtları, AI sorgu geçmişi, flashcard ve sınav sonuçları.\n• Teknik veriler: IP adresi, cihaz/tarayıcı bilgisi, çerez verileri.\n• Ödeme verileri: Ödeme işlemleri üçüncü taraf ödeme altyapısı üzerinden yürütülür; kart bilgileri şirketimizde saklanmaz.`,
  },
  {
    heading: "3. Verileri Neden Kullanıyoruz?",
    body: `• Sözleşmenin ifası: Kayıt, giriş, abonelik yönetimi ve platform hizmetlerinin sunulması.\n• Meşru menfaat: Platform güvenliği, hata tespiti, kötüye kullanım önleme.\n• Açık rıza: Pazarlama e-postaları ve kişiselleştirilmiş AI önerileri (rızanız her zaman geri alınabilir).\n• Yasal yükümlülük: Vergi, fatura ve hukuki süreç gereklilikleri.`,
  },
  {
    heading: "4. Veri Paylaşımı",
    body: `Kişisel verileriniz; hizmet altyapısı sağlayıcıları (Supabase, Google Cloud), ödeme altyapısı ve yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz. Yurt dışına aktarım, KVKK'nın 9. maddesi kapsamında güvence mekanizmaları çerçevesinde yapılır.`,
  },
  {
    heading: "5. Veri Güvenliği",
    body: `Verileriniz AES-256 şifreleme ile aktarılır (TLS 1.3). Şifreler bcrypt ile hash'lenerek saklanır. Erişim kontrolleri ve düzenli güvenlik denetimleri uygulanmaktadır.`,
  },
  {
    heading: "6. Saklama Süresi",
    body: `Aktif hesap verileriniz abonelik süreniz boyunca saklanır. Hesap silme talebinde verileriniz 30 gün içinde anonim hale getirilir veya silinir. Yasal yükümlülük gerektiren veriler (fatura vb.) 10 yıl saklanır.`,
  },
  {
    heading: "7. Haklarınız (KVKK Madde 11)",
    body: `• Verilerinizin işlenip işlenmediğini öğrenme\n• İşlenmişse bilgi talep etme\n• Yanlış veya eksik verilerin düzeltilmesini isteme\n• Silinmesini veya yok edilmesini talep etme\n• Otomatik sistemler aracılığıyla aleyhinize çıkan kararlara itiraz etme\n• Zararınızın tazminini talep etme\n\nBaşvurularınızı kvkk@medasi.com.tr adresine iletebilirsiniz.`,
  },
  {
    heading: "8. Çerezler",
    body: `Oturum çerezleri (zorunlu), tercih çerezleri (isteğe bağlı) ve analitik çerezler (isteğe bağlı) kullanılmaktadır. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.`,
  },
  {
    heading: "9. Değişiklikler",
    body: `Bu politika önemli ölçüde değiştirildiğinde platform içi bildirim ve e-posta ile haberdar edilirsiniz. Güncel sürüm her zaman bu sayfada yayımlanır.`,
  },
  {
    heading: "10. İletişim",
    body: `Sorularınız için: kvkk@medasi.com.tr\nAdres: Medasi Teknoloji A.Ş., Türkiye`,
  },
];

// ─── Shared renderer ─────────────────────────────────────────────────────────
function LegalPage({
  badge,
  title,
  subtitle,
  sections,
}: {
  badge: string;
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <article>
      {/* Header */}
      <div className="mb-10 space-y-3 pb-8" style={{ borderBottom: "1px solid #1E1E24" }}>
        <span
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ background: "rgba(0,196,235,0.08)", border: "1px solid rgba(0,196,235,0.2)", color: "#00C4EB" }}
        >
          {badge}
        </span>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p style={{ color: "#94A3B8" }}>{subtitle}</p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#E2E8F0" }}>
              {s.heading}
            </h2>
            <div
              className="text-sm leading-relaxed whitespace-pre-line"
              style={{ color: "#94A3B8" }}
            >
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
