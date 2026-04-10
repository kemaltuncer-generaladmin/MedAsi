import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireGeminiApiKey } from "@/lib/ai/env";
import { normalizeGeminiError } from "@/lib/ai/google-errors";

function getAgentModel() {
  const api = new GoogleGenerativeAI(requireGeminiApiKey("general"));
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
    throw normalizeGeminiError(error);
  }
}

