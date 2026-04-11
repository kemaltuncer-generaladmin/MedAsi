import { GoogleGenerativeAI } from "@google/generative-ai";
import { getResolvedGeminiConfig } from "@/lib/ai/env";
import { shouldRetryWithAlternateGeminiKey } from "@/lib/ai/failover";
import { normalizeGeminiError } from "@/lib/ai/google-errors";
import type { MaterialQualityReport, MaterialSlideInsight } from "@/types";

function getAgentModel() {
  const resolved = getResolvedGeminiConfig("ai-chat", { keyPreference: "server-first" });
  if (!resolved.apiKey) {
    throw new Error("Gemini API key eksik.");
  }
  const api = new GoogleGenerativeAI(resolved.apiKey);
  return api.getGenerativeModel({ model: "gemini-2.5-flash" });
}

function getFallbackAgentModel() {
  const resolved = getResolvedGeminiConfig("ai-chat", { keyPreference: "module-first" });
  if (!resolved.apiKey) return null;
  const api = new GoogleGenerativeAI(resolved.apiKey);
  return api.getGenerativeModel({ model: "gemini-2.5-flash" });
}

export async function generateMaterialSummary(input: {
  title: string;
  branch?: string;
  text: string;
}): Promise<string> {
  const plainText = input.text.trim();
  if (!plainText) return "Dosyadan okunabilir metin çıkarılamadı.";

  const snippet = plainText.length > 14000 ? plainText.slice(0, 14000) : plainText;
  const model = getAgentModel();
  try {
    const result = await model.generateContent(
      [
        "Sen Medasi Ajan-1 (Icerik Analizci) rolundesin.",
        "Gorevin kullanici materyalini kisa, net ve eyleme donuk sekilde ozetlemek.",
        "Yaniti Turkce ver.",
        "Cikti formati:",
        "1) 5 maddelik ana ozet",
        "2) 10 kritik kavram",
        "3) 5 soru-cevap tarzi hizli tekrar notu",
        "4) 1 satirlik klinik/pratik cikarim",
        "",
        `Baslik: ${input.title}`,
        `Brans: ${input.branch ?? "Genel"}`,
        "",
        "Icerik:",
        snippet,
      ].join("\n"),
    );
    const text = result.response.text().trim();
    return text || "Ozet uretilemedi.";
  } catch (error) {
    if (shouldRetryWithAlternateGeminiKey(error)) {
      const fallbackModel = getFallbackAgentModel();
      if (fallbackModel) {
        try {
          const retryResult = await fallbackModel.generateContent(
            [
              "Sen Medasi Ajan-1 (Icerik Analizci) rolundesin.",
              "Gorevin kullanici materyalini kisa, net ve eyleme donuk sekilde ozetlemek.",
              "Yaniti Turkce ver.",
              "Cikti formati:",
              "1) 5 maddelik ana ozet",
              "2) 10 kritik kavram",
              "3) 5 soru-cevap tarzi hizli tekrar notu",
              "4) 1 satirlik klinik/pratik cikarim",
              "",
              `Baslik: ${input.title}`,
              `Brans: ${input.branch ?? "Genel"}`,
              "",
              "Icerik:",
              snippet,
            ].join("\n"),
          );
          const retryText = retryResult.response.text().trim();
          return retryText || "Ozet uretilemedi.";
        } catch {
          // Fall through to normalized primary error.
        }
      }
    }
    throw normalizeGeminiError(error);
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function splitSlides(text: string): Array<{ slideNo: number; extractedText: string }> {
  const matches = text.match(/\[Slayt\s+\d+\][\s\S]*?(?=\[Slayt\s+\d+\]|$)/g) ?? [];
  if (matches.length === 0) {
    return [
      {
        slideNo: 1,
        extractedText: text.trim(),
      },
    ].filter((item) => item.extractedText.length > 0);
  }

  return matches.map((match, index) => ({
    slideNo: Number(match.match(/\[Slayt\s+(\d+)\]/)?.[1] ?? index + 1),
    extractedText: match.replace(/\[Slayt\s+\d+\]\s*/i, "").trim(),
  }));
}

export function generateMaterialQualityReport(input: {
  title: string;
  branch?: string;
  text: string;
  pageCount?: number;
}): { report: MaterialQualityReport; slides: MaterialSlideInsight[] } {
  const plainText = input.text.trim();
  const slides = splitSlides(plainText);
  const totalLength = plainText.length;
  const words = plainText.split(/\s+/).filter(Boolean);
  const averageSlideLength = slides.length > 0
    ? slides.reduce((sum, slide) => sum + slide.extractedText.length, 0) / slides.length
    : totalLength;
  const duplicateSet = new Set<string>();

  const slideInsights: MaterialSlideInsight[] = slides.map((slide) => {
    const normalized = slide.extractedText.toLowerCase().replace(/\s+/g, " ").trim();
    const duplicateRisk = normalized.length > 0 && duplicateSet.has(normalized);
    duplicateSet.add(normalized);
    const textDensity = clampScore(Math.min(100, slide.extractedText.length / 18));
    const keyPoints = slide.extractedText
      .split(/[.!?\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
    const warnings: string[] = [];
    if (slide.extractedText.length < 60) warnings.push("Metin çok kısa; görsel ağırlıklı olabilir.");
    if (duplicateRisk) warnings.push("Metin başka bir slaytla büyük ölçüde tekrar ediyor.");
    if (slide.extractedText.length > 900) warnings.push("Slayt aşırı yoğun; sadeleştirme önerilir.");

    const qualityScore = clampScore(
      45 +
        Math.min(slide.extractedText.length / 16, 22) +
        (keyPoints.length >= 2 ? 10 : 0) -
        (warnings.length * 8),
    );

    return {
      id: `slide-${slide.slideNo}`,
      slideNo: slide.slideNo,
      title: keyPoints[0] ?? `Slayt ${slide.slideNo}`,
      extractedText: slide.extractedText,
      textDensity,
      qualityScore,
      hasVisualGap: slide.extractedText.length < 60,
      duplicateRisk,
      keyPoints,
      warnings,
    };
  });

  const shortSlides = slideInsights.filter((slide) => slide.extractedText.length < 60).length;
  const duplicateSlides = slideInsights.filter((slide) => slide.duplicateRisk).length;
  const readabilityScore = clampScore(62 + Math.min(words.length / 120, 18) - duplicateSlides * 4);
  const densityScore = clampScore(68 + Math.min(averageSlideLength / 25, 16) - Math.max(0, shortSlides - 1) * 5);
  const examRelevanceScore = clampScore(
    55 +
      (/tanı|tedavi|klinik|yönetim|komplikasyon|endikasyon/i.test(plainText) ? 20 : 0) +
      (/algoritma|yaklaşım|özet|sınıflama/i.test(plainText) ? 10 : 0),
  );
  const clinicalRelevanceScore = clampScore(
    50 +
      (/hasta|olgu|klinik|bulgu|muayene|vaka/i.test(plainText) ? 24 : 0) +
      (/risk|komplikasyon|acil|tedavi/i.test(plainText) ? 10 : 0),
  );
  const flashcardReadiness = clampScore(
    52 + (slideInsights.filter((slide) => slide.keyPoints.length >= 2).length * 7) - duplicateSlides * 5,
  );
  const questionReadiness = clampScore(
    48 + (examRelevanceScore * 0.22) + (readabilityScore * 0.18) - shortSlides * 4,
  );
  const extractionConfidence = clampScore(
    70 +
      (plainText.length > 500 ? 10 : 0) -
      shortSlides * 6 -
      duplicateSlides * 3,
  );
  const qualityScore = clampScore(
    (readabilityScore + densityScore + examRelevanceScore + clinicalRelevanceScore) / 4,
  );

  const strengths: string[] = [];
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (qualityScore >= 75) strengths.push("Genel materyal kalitesi yüksek; tekrar ve türetim için uygun.");
  if (flashcardReadiness >= 65) strengths.push("Flashcard üretimine elverişli kısa kavramsal birimler bulunuyor.");
  if (questionReadiness >= 65) strengths.push("Soru üretimine uygun tanımsal ve karar odaklı içerik mevcut.");
  if (clinicalRelevanceScore >= 70) strengths.push("Klinik/pratik ağırlık güçlü.");

  if (shortSlides > 0) issues.push(`${shortSlides} slaytta çıkarılan metin çok kısa; görsel ağırlık olabilir.`);
  if (duplicateSlides > 0) issues.push(`${duplicateSlides} slaytta tekrar riski tespit edildi.`);
  if (qualityScore < 60) issues.push("Materyal genel kalite açısından yeniden gözden geçirilmeli.");
  if (extractionConfidence < 60) issues.push("Metin çıkarımı güveni sınırlı; dosya yapısı kontrol edilmeli.");

  if (questionReadiness >= 60) {
    recommendations.push("Bu materyalden konuya özel mini soru setleri türet.");
  } else {
    recommendations.push("Önce eksik/slayt-kısa bölümleri tamamla, sonra soru üretimine geç.");
  }
  if (flashcardReadiness >= 60) {
    recommendations.push("Kritik kavramlardan hatırlatma kartları oluştur.");
  }
  recommendations.push("Düşük metinli slaytlar için kullanıcıya manuel not ekleme alanı göster.");

  const summary = [
    `${input.title} materyali ${slides.length} slayt/bölüm üzerinden değerlendirildi.`,
    `Kalite skoru ${qualityScore}/100, çıkarım güveni ${extractionConfidence}/100.`,
    `Soru uygunluğu ${questionReadiness}/100, flashcard uygunluğu ${flashcardReadiness}/100.`,
  ].join(" ");

  return {
    report: {
      summary,
      qualityScore,
      extractionConfidence,
      slideCount: slides.length,
      chunkCoverage: clampScore(Math.min(100, words.length / 40)),
      readabilityScore,
      densityScore,
      examRelevanceScore,
      clinicalRelevanceScore,
      flashcardReadiness,
      questionReadiness,
      strengths,
      issues,
      recommendations,
    },
    slides: slideInsights,
  };
}
