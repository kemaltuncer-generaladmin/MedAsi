require("dotenv").config();

const intervalMs = Number(process.env.RAG_WATCH_INTERVAL_MS || 15000);
const branch = process.argv[2] || "Genel";
const baseUrl =
  process.env.RAG_API_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

let running = false;

async function scan() {
  if (running) return;
  running = true;

  try {
    const response = await fetch(`${baseUrl}/api/rag/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Klasör taranamadı.");
    }

    const now = new Date().toLocaleTimeString("tr-TR");
    console.log(
      `[${now}] toplam=${data.totalFiles} yeni=${data.processed} atlanan=${data.skipped}`,
    );
  } catch (error) {
    console.error("❌ Watcher hatası:", error.message);
  } finally {
    running = false;
  }
}

console.log(`👀 RAG klasör izleyici aktif. Aralık: ${intervalMs}ms`);
console.log(`🌐 API: ${baseUrl}`);
console.log(`🩺 Branş: ${branch}`);

scan();
setInterval(scan, intervalMs);
