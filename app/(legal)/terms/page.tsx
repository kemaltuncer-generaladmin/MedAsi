import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hizmet Şartları — Medasi",
  description: "MEDASI platformunu kullanmadan önce lütfen hizmet şartlarını okuyunuz.",
};

export default function TermsPage() {
  return (
    <LegalPage
      badge="Son güncelleme: Nisan 2026"
      title="Hizmet Şartları"
      subtitle="MEDASI platformunu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız."
      sections={SECTIONS}
    />
  );
}

const SECTIONS = [
  {
    heading: "1. Taraflar ve Kapsam",
    body: `Bu Hizmet Şartları ("Şartlar"), MEDASI platformunu ("Platform") kullanan bireyler veya kurumlar ("Kullanıcı") ile Medasi Teknoloji A.Ş. ("Şirket") arasındaki hukuki ilişkiyi düzenler. Platformu kullanmaya başlamanızla birlikte bu Şartları kabul etmiş sayılırsınız.`,
  },
  {
    heading: "2. Hizmetin Tanımı",
    body: `MEDASI; tıp öğrencileri ve sağlık profesyonelleri için yapay zeka destekli eğitim, vaka simülasyonu, soru bankası, planlayıcı ve klinik karar destek araçları sunan bir SaaS platformudur. Platform yalnızca eğitim amaçlıdır; gerçek bir hastayı teşhis veya tedavi etmek için kullanılamaz.`,
  },
  {
    heading: "3. Hesap Kaydı ve Güvenlik",
    body: `• Hesap oluşturmak için doğru ve güncel bilgi sağlamak zorundasınız.\n• Şifrenizin gizliliğinden ve hesabınızda gerçekleşen tüm işlemlerden siz sorumlusunuz.\n• Hesabınızın yetkisiz kullanımını fark ettiğinizde derhal destek@medasi.com.tr adresine bildiriniz.\n• 18 yaşın altındaysanız ebeveyn veya yasal vasi onayı gereklidir.`,
  },
  {
    heading: "4. Abonelik ve Ödeme",
    body: `• Ücretli planlar aylık veya yıllık faturalandırılır. Fiyatlar KDV dahildir.\n• Abonelik, iptal edilmedikçe dönem sonunda otomatik olarak yenilenir.\n• İptal işlemi, bir sonraki fatura döneminden en az 24 saat önce yapılmalıdır.\n• Yıllık planlar için yıl başından itibaren 14 gün içinde tam iade yapılır. Sonrasında iade yapılmaz.\n• Şirket, fiyatları 30 günlük önceden bildirimle değiştirme hakkını saklı tutar.`,
  },
  {
    heading: "5. Kabul Edilemez Kullanım",
    body: `Aşağıdaki kullanımlar kesinlikle yasaktır:\n• Platformu kopyalamak, tersine mühendislik uygulamak veya ticari amaçla yeniden dağıtmak.\n• Otomatik araçlarla (bot, scraper vb.) içerik çekmek.\n• Başkasının hesabına erişmeye çalışmak.\n• Yanıltıcı veya zararlı içerik oluşturmak.\n• Herhangi bir yasa veya düzenlemeye aykırı kullanım.\n\nBu kurallara aykırı davrananların hesabı bildirim yapılmaksızın askıya alınabilir veya silinebilir.`,
  },
  {
    heading: "6. Fikri Mülkiyet",
    body: `Platform üzerindeki tüm içerik, tasarım, yazılım ve ticari markalar Şirkete aittir. Kullanıcılar platforma yüklediği özgün içeriklerin (notlar, klinik veriler) fikri mülkiyet hakkını korur; ancak Şirkete bu içerikleri hizmetin işletimi için kullanma lisansı verir.`,
  },
  {
    heading: "7. Yapay Zeka İçerikleri — Sorumluluk Reddi",
    body: `Platform tarafından üretilen tüm yapay zeka yanıtları eğitim amaçlıdır. Hiçbir AI çıktısı tıbbi tavsiye, teşhis veya tedavi önerisi niteliği taşımaz. Klinik karar verme yetkisi her zaman yetkili hekimlere aittir. Şirket, AI çıktılarına dayanılarak alınan kararlardan doğabilecek doğrudan veya dolaylı zararlardan sorumlu tutulamaz.`,
  },
  {
    heading: "8. Hizmet Kesintileri ve Değişiklikler",
    body: `Şirket, bakım, güncelleme veya teknik gereklilikler nedeniyle hizmeti geçici olarak kesme hakkını saklı tutar. Platformda önemli değişiklikler yapılması halinde kullanıcılar 30 gün önceden bilgilendirilir.`,
  },
  {
    heading: "9. Hesap Silme",
    body: `Hesabınızı istediğiniz zaman Ayarlar > Hesap bölümünden silebilirsiniz. Silme işleminin ardından verileriniz 30 gün içinde anonim hale getirilir. Yasal saklama yükümlülükleri saklıdır.`,
  },
  {
    heading: "10. Uygulanacak Hukuk ve Uyuşmazlık Çözümü",
    body: `Bu Şartlar Türk Hukuku'na tabidir. Uyuşmazlıklarda İstanbul Merkez Mahkemeleri ve İcra Daireleri yetkilidir.`,
  },
  {
    heading: "11. İletişim",
    body: `Sorularınız için: destek@medasi.com.tr\nAdres: Medasi Teknoloji A.Ş., Türkiye`,
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
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-base font-semibold mb-3" style={{ color: "#E2E8F0" }}>
              {s.heading}
            </h2>
            <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#94A3B8" }}>
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
