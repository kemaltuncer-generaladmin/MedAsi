const jsPDF = require('jspdf');
const fs = require('fs');
const path = require('path');

// PDF oluştur
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Renkler
const primaryColor = [0, 196, 235]; // Cyan
const secondaryColor = [20, 0, 166]; // Indigo
const textDark = [10, 10, 12]; // Dark bg

let yPosition = 15;

// Başlık
doc.setFontSize(28);
doc.setTextColor(...secondaryColor);
doc.text('MEDASI', 105, yPosition, { align: 'center' });

yPosition += 12;
doc.setFontSize(14);
doc.setTextColor(...primaryColor);
doc.text('Tıbbi Eğitim ve AI Platformu', 105, yPosition, { align: 'center' });

yPosition += 20;

// Giriş
doc.setFontSize(12);
doc.setTextColor(...textDark);
doc.text('MEDASI, tıbbi öğrenciler ve hekimler için geliştirilmiş, yapay zeka destekli', 15, yPosition);
yPosition += 6;
doc.text('modern bir eğitim ve tanı yardımcısı platformudur. Sistem, interaktif öğrenme,', 15, yPosition);
yPosition += 6;
doc.text('gerçekçi vaka simülasyonları ve AI destekli tanı asistanı ile komprehensif', 15, yPosition);
yPosition += 6;
doc.text('bir tıbbi eğitim deneyimi sunmaktadır.', 15, yPosition);

yPosition += 15;

// Başlık
doc.setFontSize(16);
doc.setTextColor(...secondaryColor);
doc.text('Ana Özellikler', 15, yPosition);

yPosition += 10;
doc.setFontSize(11);
doc.setTextColor(...textDark);

const features = [
  '✓ AI Destekli Tanı Asistanı - Semptom analizi ve diferansiyel tanı',
  '✓ Oyunlaştırılmış Eğitim - XP sistemi ve uzmanlaşma seçimleri',
  '✓ İnternet Kaynakları - Klinik terminal ile DrugDB ve ICD arama',
  '✓ Gerçek Vaka Çalışmaları - Hasta ve vaka yönetim sistemi',
  '✓ Günlük Öğrenme İçeriği - Case of the day ve öğrenme hedefleri',
  '✓ Pomodoro Tekniği - Zaman yönetimi ve odaklanma',
  '✓ Kişisel Notlar - Markdown editor ile not tutma',
  '✓ Mentor AI - Yapay zeka mentorunuz, 7/24 hazır'
];

features.forEach(feature => {
  doc.text(feature, 20, yPosition);
  yPosition += 8;
});

yPosition += 10;

// Sayfa Tanımlamaları
doc.addPage();
yPosition = 15;

doc.setFontSize(16);
doc.setTextColor(...secondaryColor);
doc.text('Sistem Sayfaları', 15, yPosition);

yPosition += 12;

const pages = [
  {
    title: '1. Giriş / Kayıt Sayfası',
    desc: 'Güvenli Supabase Authentication ile kullanıcı kaydı ve girişi. E-posta doğrulaması ve şifre sıfırlama işlevleri.'
  },
  {
    title: '2. Ana Kontrol Paneli (Dashboard)',
    desc: 'Kullanıcının merkezi sayfası. İstatistikler, hızlı erişim bağlantıları ve AI asistana giriş. Günlük bilgilendirme ve yapılacak görevler.'
  },
  {
    title: '3. AI Tanı Asistanı',
    desc: 'Hastaların semptomlarını girin, Claude AI "Tanı Asistanı" modu semptomları analiz edip olası tanıları probablilite çubukları ile sunar. Ayırıcı tanı önerileri içerir.'
  },
  {
    title: '4. Case RPG (Oyunlaştırılmış Vaka)',
    desc: 'Zorluğu ve uzmanlaşma alanını seçin, gerçekçi tıbbi vakaları çözerek XP kazanın. Her doğru kararınız sizi ileriye taşır, hatalı kararlar öğrenmeyi sağlar.'
  },
  {
    title: '5. Tıbbi Terminal',
    desc: 'CLI-stili arayüz. Tanı komutu (diagnose), ilaç arama (drugs), laboratuvar testleri (labs), ICD kodları (icd) ve vital bulgular (vitals) sorgulaması yapabilirsiniz.'
  },
  {
    title: '6. AI Asistan Sohbeti',
    desc: 'Tam sohbet arayüzü. Konuşma geçmişi, hızlı komutlar ve açılır menü ile dilediğiniz zaman AI mentordan yardım alın.'
  },
  {
    title: '7. Günlük Özet',
    desc: 'Günlük istatistikler, öğrenilenler, "Günün Vakası", haftalık gelişim grafiği ve hedefler burada gösterilir.'
  },
  {
    title: '8. Pomodoro Zamanlayıcı',
    desc: 'SVG animasyonlu dairesel timer. Çalışma ve dinlenme modları ile odaklanmayı artırın. Oturum geçmişi kaydedilir.'
  },
  {
    title: '9. Hasta Yönetimi',
    desc: 'Tam CRUD işlemleri (Oluştur-Oku-Güncelle-Sil). Hasta kartları, avatar görüntüleri, arama ve filtreleme özellikleri ile hastalarınızı organize edin.'
  },
  {
    title: '10. Vaka Yönetimi',
    desc: 'Hastalarla bağlantılı vakalar. Tarih filtreleri, kategorizasyon ve detaylı vaka notları ile klinik deneyiminizi kaydedin.'
  },
  {
    title: '11. Kişisel Notlar',
    desc: 'İki bölmeli markdown editor. Sol tarafta yazım, sağ tarafta ön izleme. localStorage ile otomatik kaydedilir.'
  },
  {
    title: '12. Hesap Ayarları',
    desc: 'Profil bilgisi düzenleme, bildirim tercihleri, paket yönetimi ve tema ayarları. Şifre sıfırlama bağlantısı mevcuttur.'
  },
  {
    title: '13. Admin Paneli',
    desc: 'Yöneticiler için özel sayfası. Sistem istatistikleri, kullanıcı tablosu, paket dağılımı ve aktivite akışı izlenir. Kimse erişemez, sadece admin.',
    isAdmin: true
  },
  {
    title: '14. Fiyatlandırma ve Yükseltme',
    desc: '3 kat fiyatlandırma modeli (Başlangıç, Profesyonel, İşletme). FAQ accordion, özellik karşılaştırması ve ödeme işlemleri.'
  }
];

doc.setFontSize(11);
pages.forEach((page, idx) => {
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setTextColor(...secondaryColor);
  doc.setFont(undefined, 'bold');
  doc.text(page.title, 15, yPosition);
  yPosition += 7;

  doc.setFont(undefined, 'normal');
  doc.setTextColor(...textDark);
  const lines = doc.splitTextToSize(page.desc, 180);
  doc.text(lines, 15, yPosition);
  yPosition += lines.length * 5 + 6;

  if (page.isAdmin) {
    doc.setTextColor([255, 100, 0]);
    doc.text('⚠ Yönetici Erişimi Gerekli', 15, yPosition);
    yPosition += 6;
  }
});

// Teknoloji Stack
doc.addPage();
yPosition = 15;

doc.setFontSize(16);
doc.setTextColor(...secondaryColor);
doc.text('Teknoloji Altyapısı', 15, yPosition);

yPosition += 12;
doc.setFontSize(11);
doc.setTextColor(...textDark);

const techStack = [
  ['Framework', 'Next.js 15 + TypeScript'],
  ['Frontend', 'React 19, Tailwind CSS, Framer Motion'],
  ['Veritabanı', 'PostgreSQL + Prisma ORM'],
  ['Kimlik Doğrulama', 'Supabase Auth'],
  ['AI Modeli', 'Claude API (Sonnet & Haiku)'],
  ['Form Yönetimi', 'React Hook Form + Zod'],
  ['Durum Yönetimi', 'Zustand'],
  ['E-posta', 'Resend'],
  ['PDF Oluşturma', 'jsPDF']
];

doc.setFont(undefined, 'bold');
doc.text('Stack Detayları:', 15, yPosition);
yPosition += 8;
doc.setFont(undefined, 'normal');

techStack.forEach(([tech, impl]) => {
  doc.setFont(undefined, 'bold');
  doc.text(tech + ':', 20, yPosition);
  doc.setFont(undefined, 'normal');
  doc.text(impl, 70, yPosition);
  yPosition += 7;
});

// Güvenlik ve Uyum
yPosition += 10;
doc.setFont(undefined, 'bold');
doc.setTextColor(...secondaryColor);
doc.text('Güvenlik & Uyum', 15, yPosition);

yPosition += 8;
doc.setFont(undefined, 'normal');
doc.setTextColor(...textDark);

const security = [
  '✓ Sunucu Tarafında Kimlik Doğrulama - Supabase Session Tokens',
  '✓ Rol Tabanlı Erişim Kontrol - Admin/User ayrımı',
  '✓ Veri Şifreleme - HTTPS, PostgreSQL güvenliği',
  '✓ TypeScript Türleri - Tüm işlemde tip güvenliği',
  '✓ Environment Variables - Hassas verilerin gizlenmesi'
];

security.forEach(item => {
  doc.text(item, 20, yPosition);
  yPosition += 6;
});

// Son Sayfa - İletişim
doc.addPage();
yPosition = 15;

doc.setFontSize(16);
doc.setTextColor(...secondaryColor);
doc.text('MEDASI Hakkında', 15, yPosition);

yPosition += 15;
doc.setFontSize(12);
doc.setTextColor(...textDark);
doc.text('Web:', 15, yPosition);
doc.text('medasi.com.tr', 40, yPosition);

yPosition += 10;
doc.text('Platform Durumu:', 15, yPosition);
doc.setTextColor(...primaryColor);
doc.text('✓ Üretim Hazır', 40, yPosition);

yPosition += 15;
doc.setTextColor(...textDark);
doc.setFontSize(11);
doc.text('Bu platform, tıbbi profesyonellerin ve öğrencilerin sürekli öğrenme ve', 15, yPosition);
yPosition += 6;
doc.text('gelişimine yardımcı olmak için tasarlanmıştır. AI teknolojisi ile entegrasyonu,', 15, yPosition);
yPosition += 6;
doc.text('kullanıcılara gerçek zamanında tavsiye ve eğitim desteği sağlar.', 15, yPosition);

yPosition += 12;
doc.text('Gizlilik ve Veri Güvenliği, sistemin temel taşlarıdır. Tüm hasta verileri', 15, yPosition);
yPosition += 6;
doc.text('güvenli bir şekilde saklanır ve yalnızca yetkili kişiler tarafından erişilir.', 15, yPosition);

yPosition += 15;
doc.setFontSize(10);
doc.setTextColor(...secondaryColor);
doc.text('Belge Oluşturulma Tarihi: ' + new Date().toLocaleDateString('tr-TR'), 15, yPosition);

// PDF'yi kaydet
const outputPath = path.join(__dirname, '../public/MEDASI_Sistem_Tanitim.pdf');
doc.save(outputPath);
console.log('✓ PDF başarıyla oluşturuldu:', outputPath);
