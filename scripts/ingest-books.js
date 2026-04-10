require('dotenv').config(); 

async function run() {
  const baseUrl =
    process.env.RAG_API_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const branch = process.argv[2] || "Genel";

  console.log("🚀 RAG klasör taraması başlatılıyor...");

  const response = await fetch(`${baseUrl}/api/rag/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Klasör taraması başarısız.");
  }

  console.log(`📂 Klasör: ${data.watchFolder}`);
  console.log(`📚 Toplam PDF: ${data.totalFiles}`);
  console.log(`✅ Yeni işlenen: ${data.processed}`);
  console.log(`⏭️  Atlanan: ${data.skipped}`);
}

run().catch((error) => {
  console.error("❌ HATA:", error.message);
  process.exit(1);
});
