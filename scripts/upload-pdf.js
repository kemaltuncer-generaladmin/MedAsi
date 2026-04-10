require("dotenv").config();

const path = require("path");

const filePath = process.argv[2];
const title = process.argv[3];
const branch = process.argv[4] || "Genel";
const baseUrl =
  process.env.RAG_API_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

if (!filePath) {
  console.log("Kullanım: node scripts/upload-pdf.js <pdf_yolu> [kitap_adi] [brans]");
  process.exit(1);
}

async function main() {
  const payload = {
    filePath: path.resolve(filePath),
    branch,
  };

  if (title) {
    payload.title = title;
  }

  const response = await fetch(`${baseUrl}/api/rag/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "İçe aktarma başarısız.");
  }

  if (data.skipped) {
    console.log(`⏭️  ${payload.filePath} daha önce işlendi, tekrar eklenmedi.`);
    return;
  }

  console.log(`✅ ${data.title} başarıyla işlendi.`);
  console.log(`📦 ${data.insertedChunks} chunk oluşturuldu.`);
}

main().catch((error) => {
  console.error("❌ HATA:", error.message);
  process.exit(1);
});
