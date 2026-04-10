const fs = require('fs');
const path = 'app/(dashboard)/exams/osce/page.tsx';

const osceCode = `"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Stethoscope, Sparkles, Brain, Loader2, 
  Send, User, Award, AlertTriangle, PlayCircle, RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";

export default function OscelSimulatorePage() {
  const [loading, setLoading] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  async function startExam() {
    setLoading(true);
    setExamStarted(true);
    setMessages([]);
    const loadingId = toast.loading("Sınav senaryosu ve jüri hazırlanıyor...");
    
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Yeni bir OSCE sınavı başlat. Bana zorlayıcı bir vaka sun ve ilk sorunu sor.", 
          model: "FAST", // Gemini 2.5 Pro kalitesi
          module: "exams-osce" 
        }),
      });

      const data = await res.json();
      setMessages([{ role: "assistant", text: data.response.text }]);
      toast.success("Sınav başladı. Başarılar, meslektaşım!", { id: loadingId });
    } catch (e) {
      toast.error("Sınav sunucusu şu an meşgul.");
      setExamStarted(false);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    
    const userText = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userText, 
          model: "FAST", 
          module: "exams-osce" 
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.response.text }]);
    } catch (e) {
      toast.error("Yanıt alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto h-[calc(100vh-180px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
            <Stethoscope size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">OSCE Simülatörü</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Klinik beceri ve sözlü sınav simülasyonu</p>
          </div>
        </div>
        {examStarted && (
          <Button variant="ghost" size="sm" onClick={startExam} className="text-[var(--color-destructive)]">
            <RotateCcw size={14} className="mr-2" /> Sınavı Sıfırla
          </Button>
        )}
      </div>

      {!examStarted ? (
        <Card variant="elevated" className="flex-1 flex flex-col items-center justify-center text-center p-12 border-dashed border-2">
          <PlayCircle size={64} className="text-[var(--color-primary)] mb-6 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">Sınav Odasına Giriş Yap</h2>
          <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
            Bu modülde AI bir jüri üyesi gibi davranır. Size bir vaka sunar ve yönetmenizi bekler. 
            Tanı adımları, tedavi planı ve etik yaklaşımlarınız üzerinden puanlanacaksınız.
          </p>
          <div className="flex gap-4">
            <Badge variant="outline" className="px-4 py-2">Acil Tıp</Badge>
            <Badge variant="outline" className="px-4 py-2">Dahiliye</Badge>
            <Badge variant="outline" className="px-4 py-2">Pediatri</Badge>
          </div>
          <Button size="lg" onClick={startExam} className="mt-10 px-12 h-14 text-lg">
            Sınavı Başlat
          </Button>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <Card variant="bordered" className="flex-1 flex flex-col p-0 overflow-hidden bg-[var(--color-surface)]/30">
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">Sınav Devam Ediyor...</span>
              </div>
              <Badge variant="success">Jüri: Gemini 2.5 Pro</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={\`flex \${m.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                  <div className={\`max-w-[80%] p-4 rounded-2xl \${
                    m.role === 'user' 
                      ? 'bg-[var(--color-primary)] text-white' 
                      : 'bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
                  }\`}>
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                      {m.role === 'user' ? <User size={12} /> : <Brain size={12} />}
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {m.role === 'user' ? 'Sen' : 'Jüri Üyesi'}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface-elevated)] p-4 rounded-2xl animate-pulse">
                    <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)]">
              <div className="relative">
                <input 
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl py-4 pl-4 pr-12 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Klinik hamlenizi yazın..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button 
                  onClick={sendMessage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-primary)] hover:scale-110 transition-transform"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
";

try {
  fs.writeFileSync(path, osceCode);
  
  // Router Güncellemesi: Jüri kimliği ve puanlama mantığı ekle
  const routerPath = 'lib/ai/router.ts';
  let routerCode = fs.readFileSync(routerPath, 'utf8');
  const oscePrompt = \`case "exams-osce":
      return \\\`\\\\nŞU ANKİ MODÜL: OSCE SİMLÜLATÖRÜ (SÖZLÜ SINAV)
GÖREVİN: Tıp fakültesi jüri üyesisin. Ciddi, akademik ve sorgulayıcı ol.
SÜREÇ:
1. Kullanıcıya zorlayıcı bir klinik vaka sun (Şikayet ve Vitallerle başla).
2. Kullanıcının her hamlesini (muayene, tetkik, tedavi) sorgula. "Bunu neden istedin?", "Ayırıcı tanıda neyi dışladın?" gibi sorular sor.
3. Asla tüm bilgiyi tek seferde verme. Kullanıcı sordukça laboratuvar sonuçlarını açıkla.
4. Sınav sonunda 'PUANLAMA VE GERİ BİLDİRİM' başlığı altında performansı 100 üzerinden değerlendir.\\\`;\`;

  routerCode = routerCode.replace('case "exams-osce":', oscePrompt);
  // Eğer case yoksa ekle (router'da daha önce basit hali vardı, güncelliyoruz)
  if (!routerCode.includes('exams-osce')) {
      routerCode = routerCode.replace('default:', \`\${oscePrompt}\\n    default:\`);
  }
  fs.writeFileSync(routerPath, routerCode);

  console.log("✅ OSCE Simülatörü: Sınav Beyni ve Jüri Sistemi Aktif Edildi!");
} catch (e) {
  console.log("❌ Hata:", e.message);
}
