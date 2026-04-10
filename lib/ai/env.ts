export function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ""
  );
}

export function requireGeminiApiKey() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY eksik. Vercel ortam değişkenlerine GEMINI_API_KEY eklenmeli.",
    );
  }
  return apiKey;
}
