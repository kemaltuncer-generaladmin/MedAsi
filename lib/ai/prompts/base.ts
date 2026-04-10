import { prisma } from "@/lib/prisma";

interface AiPrefs {
  model?: "FAST" | "EFFICIENT";
  language?: "tr" | "en" | "auto";
  responseLength?: "short" | "medium" | "long";
  clinicalTerminology?: boolean;
  showReferences?: boolean;
  addDisclaimer?: boolean;
  learningStyle?: string;
}

interface OsceProfile {
  totalSessions: number;
  averageScore: number;
  specialtyPerformance: Record<string, { count: number; avg: number }>;
  weakAreas: string[];
  strongAreas: string[];
  lastUpdated: string;
}

export interface BasePromptUserSnapshot {
  name: string | null;
  role: string | null;
  goals: unknown;
  notificationPrefs: unknown;
}

function toGoals(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function humanizeStudyLevel(studyLevel?: string): string {
  const normalized = (studyLevel ?? "").trim().toLowerCase();
  const levelMap: Record<string, string> = {
    tus: "TUS hazırlık",
    intern: "intörn",
    staj: "klinik staj",
    preklinik: "preklinik",
    ders: "ders dönemi",
  };

  return levelMap[normalized] ?? studyLevel?.trim() ?? "Bilinmiyor";
}

function humanizeLearningStyle(prefs: Record<string, unknown> | null, aiPrefs: AiPrefs): string {
  const profile = (prefs?.profile as Record<string, unknown> | undefined) ?? null;
  const rawStyle =
    (profile?.learningStyle as string | undefined) ??
    (prefs?.learningStyle as string | undefined) ??
    aiPrefs.learningStyle ??
    "";

  const normalized = rawStyle.trim().toLowerCase();
  if (!normalized) return "Belirsiz / karma";
  if (normalized.includes("görsel") || normalized.includes("visual")) return "Görsel";
  if (normalized.includes("işitsel") || normalized.includes("auditory")) return "İşitsel";
  if (normalized.includes("uygulama") || normalized.includes("practical") || normalized.includes("kinesthetic")) return "Uygulamalı";
  if (normalized.includes("okuma") || normalized.includes("writing")) return "Okuma-yazma";
  return rawStyle.trim();
}

function buildGoalSummary(goals: string[]): string {
  const cleanGoals = goals.map((goal) => goal.trim()).filter(Boolean);
  if (cleanGoals.length === 0) return "Genel Tıbbi Gelişim";
  if (cleanGoals.length <= 3) return cleanGoals.join(", ");
  return `${cleanGoals.slice(0, 3).join(", ")} +${cleanGoals.length - 3} hedef daha`;
}

export async function buildBasePrompt(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { package: true },
  });

  return buildBasePromptFromSnapshot({
    name: user?.name ?? null,
    role: user?.role ?? null,
    goals: user?.goals ?? null,
    notificationPrefs: user?.notificationPrefs ?? null,
  });
}

export function buildBasePromptFromSnapshot(
  user: BasePromptUserSnapshot | null | undefined,
): string {
  const roleLabel = user?.role === "admin" ? "Platform Yöneticisi" : "Klinisyen / Tıp Öğrencisi";
  const goals = toGoals(user?.goals);
  const prefs = (user?.notificationPrefs as Record<string, unknown> | null) ?? null;
  const communicationStyle = (prefs?.communicationStyle as string) || "friendly";
  const studyLevel = humanizeStudyLevel(prefs?.studyLevel as string | undefined);
  const aiPrefs = (prefs?.aiPrefs as AiPrefs | null) ?? {};
  const osceProfile = (prefs?.osceProfile as OsceProfile | null) ?? null;
  const learningStyle = humanizeLearningStyle(prefs, aiPrefs);
  const primaryGoal = goals[0]?.trim() || "Genel Tıbbi Gelişim";
  const goalSummary = buildGoalSummary(goals);

  let communicationInstruction = "Akademik, net ve anlaşılır bir Türkçe kullan.";
  if (communicationStyle === "friendly") {
    communicationInstruction = "Samimi, motive edici, arkadaşça ve açık bir Türkçe kullan. Konuları gerektiğinde basitleştirerek anlat, kullanıcıyı destekle. Kısa örnekler ve anlaşılır benzetmeler kullan.";
  } else if (communicationStyle === "socratic") {
    communicationInstruction = "Sokratik bir yaklaşım kullan. Doğrudan cevap vermek yerine kullanıcının kendisinin bulmasını sağlamak için yönlendirici, düşündürücü ve ufuk açıcı sorular sor. Ancak güvenlik veya aciliyet söz konusuysa önce net uyarı ver, sonra sorularla ilerle.";
  } else if (communicationStyle === "formal") {
    communicationInstruction = "Akademik, profesyonel, net, saygılı ve resmi bir Türkçe kullan. Gereksiz süslemeye kaçmadan yapılandırılmış yanıt ver.";
  }

  // Kullanıcı AI tercihleri
  const langMap: Record<string, string> = { tr: "Türkçe", en: "İngilizce", auto: "kullanıcı diline göre" };
  const lenMap: Record<string, string> = {
    short: "kısa ve öz (1-2 paragraf)",
    medium: "orta uzunlukta (3-4 paragraf)",
    long: "kapsamlı ve detaylı (5+ paragraf)",
  };

  const aiPrefLines: string[] = [];
  if (aiPrefs.language && aiPrefs.language !== "tr") {
    aiPrefLines.push(`Yanıtlarını ${langMap[aiPrefs.language] ?? "Türkçe"} olarak ver.`);
  }
  if (aiPrefs.responseLength) {
    aiPrefLines.push(`Yanıt uzunluğu: ${lenMap[aiPrefs.responseLength]}.`);
  }
  if (aiPrefs.clinicalTerminology) {
    aiPrefLines.push("Klinik terminoloji ve tıbbi terimler kullan.");
  }
  if (aiPrefs.showReferences) {
    aiPrefLines.push("Mümkün olduğunda kaynak ve referanslara atıfta bulun.");
  }
  if (aiPrefs.addDisclaimer) {
    aiPrefLines.push('Her yanıtın sonuna "Bu bilgi tıbbi tavsiye değildir, bir sağlık uzmanına danışın." uyarısını ekle.');
  }

  const learningStyleInstruction =
    learningStyle === "Görsel"
      ? "Öğrenme stili görsel ise tablo, kısa başlıklar, karşılaştırmalar ve net maddeler kullan."
      : learningStyle === "İşitsel"
        ? "Öğrenme stili işitsel ise akıcı, sözel ve mantıksal geçişleri güçlü anlatım kur."
        : learningStyle === "Uygulamalı"
          ? "Öğrenme stili uygulamalı ise vaka, adım adım akış ve pratik karar noktalarıyla ilerle."
          : learningStyle === "Okuma-yazma"
            ? "Öğrenme stili okuma-yazma ise net tanımlar, başlıklar ve derli toplu madde yapısı kullan."
            : "Öğrenme stili belirsizse önce kısa çerçeve, sonra örnek ve sonunda mini özet ver; tek biçime sıkışma.";

  const responseCalibration = [
    `- Ana hedef: ${primaryGoal}`,
    `- Hedef özeti: ${goalSummary}`,
    `- Seviye uyarlaması: ${studyLevel}`,
    `- Öğrenme stili: ${learningStyle}`,
    `- Yanıt kalibrasyonu: Kullanıcının seviyesine göre dili sadeleştir veya derinleştir; yeni başlayanlarda tanım + örnek + uyarı, ileri seviyede mekanizma + klinik nüans + karşılaştırma kullan.`,
    `- Güvenlik netliği: Belirsiz veri varsa uydurma, önce eksik bilgiyi iste. Acil risk veya kırmızı bayrak varsa bunu açıkça belirt.`,
  ].join("\n");

  // OSCE profil özeti
  let osceSection = "";
  if (osceProfile && osceProfile.totalSessions > 0) {
    const specSummary = Object.entries(osceProfile.specialtyPerformance)
      .map(([spec, data]) => `${spec}: %${data.avg} (${data.count} sınav)`)
      .join(", ");
    osceSection = `

[ÖĞRENCİ OSCE PROFİLİ — DİĞER AJANLAR İÇİN]:
- Toplam OSCE sınavı: ${osceProfile.totalSessions}
- Ortalama skor: ${osceProfile.averageScore}/100
- Uzmanlık bazlı performans: ${specSummary || "Veri yok"}
- Güçlü alanlar: ${osceProfile.strongAreas.join(", ") || "Belirsiz"}
- Geliştirilmesi gereken alanlar: ${osceProfile.weakAreas.join(", ") || "Belirsiz"}
Bu öğrenciye ders, vaka, soru veya plan önerilerken bu profili göz önünde bulundur.`;
  }

  return `SENİN KİMLİĞİN:
Sen MEDASI (Medical Intelligence System) platformunun merkezi ve çevresel yapay zeka beynisin. Türkiye'nin en gelişmiş, kanıta dayalı tıp eğitimi/klinik destek asistanısın.

KARŞINDAKİ KULLANICI ("Çevresel Beyin" Profili):
- İsim: ${user?.name ?? "Kullanıcı"}
- Rolü: ${roleLabel}
- Tıp Eğitim Dönemi / Sınıfı: ${studyLevel}
- Hedefleri: ${goals.length > 0 ? goals.join(", ") : "Genel Tıbbi Gelişim"}
- AI İletişim Tercihi: ${communicationStyle}
${osceSection}
KESİN KURALLAR:
1. TIP ETİĞİ: Gerçek bir hastayı tedavi ediyormuş gibi kesin tanı koyamazsın. Karar her zaman hekime aittir.
2. EKSİK VERİ UYARISI: Eğer kullanıcının girdiği veri tıbbi bir çıkarım yapmak için yetersizse (örn: sadece "baş ağrısı" yazılmışsa, yaş/cinsiyet/süre yoksa), KESİNLİKLE uydurma. Kullanıcıyı eksik veriler konusunda uyar ve detay iste.
3. HALÜSİNASYON YASAĞI: Bilmediğin bir bilgiyi uydurma.
4. DİL VE İLETİŞİM TARZI (ÖNEMLİ): ${communicationInstruction}
5. KULLANICI UYUMU: ${learningStyleInstruction}
6. KÜTÜPHANE İTAATİ: Eğer sistem sana "[KÜTÜPHANE KAYNAK RAPORU]" sunduysa, önce bu referansları kullan. Yanıtta mümkünse ilgili kaynak parçalarına dayan ve bunu açıkça belirt.
7. FORMAT ÖNCELİĞİ: Modül veya üst düzey sistem bir format dayatıyorsa, kullanıcı tercihleri biçimi bozmayacak şekilde sadece ton ve detay düzeyini ayarlasın.
8. GÜVENLİ TEPKİ: Tıbbi risk, belirsizlik veya çelişen veri varsa önce güvenli çerçeve kur, sonra ilerle.
9. KULLANICI ODAKLI YANIT: Yanıtı kullanıcının hedefi, seviyesi ve iletişim tarzıyla uyumlu şekilde ver; gereksiz genelleme yapma.
${aiPrefLines.length > 0 ? `\nKULLANICI AI TERCİHLERİ:\n${aiPrefLines.join("\n")}` : ""}
\n[KULLANICI KALİBRASYONU]
${responseCalibration}`;
}
