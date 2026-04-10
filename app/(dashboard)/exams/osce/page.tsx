"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  Brain,
  CheckCircle2,
  ChevronRight,
  Download,
  FlaskConical,
  Loader2,
  Mic,
  MicOff,
  PlayCircle,
  RotateCcw,
  Send,
  Stethoscope,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// ─── Tipler ───────────────────────────────────────────────────────────────────
type OscePhase =
  | "ANAMNESIS"
  | "PHYSICAL_EXAM"
  | "INVESTIGATIONS"
  | "DIAGNOSIS"
  | "EVALUATION";

interface OsceCase {
  caseId: string;
  specialty: string;
  difficulty: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    occupation: string;
    vitals: { bp: string; hr: string; rr: string; temp: string; spo2: string };
  };
  chiefComplaint: string;
  hiddenDiagnosis: string;
  anamnesis: Record<string, string>;
  physicalExam: Record<string, string>;
  labs: Record<string, string>;
  criticalActions: string[];
  traps: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  phase: OscePhase;
}

interface RequestedInvestigation {
  id: string;
  name: string;
  requestedAt: Date;
  result?: string;
}

// ─── Yardımcı sabitler ────────────────────────────────────────────────────────
const PHASE_LABELS: Record<OscePhase, string> = {
  ANAMNESIS: "Anamnez",
  PHYSICAL_EXAM: "Fizik Muayene",
  INVESTIGATIONS: "Tetkikler",
  DIAGNOSIS: "Tanı & Tedavi",
  EVALUATION: "Değerlendirme",
};

const PHASE_ICONS: Record<OscePhase, React.ReactNode> = {
  ANAMNESIS: <User size={14} />,
  PHYSICAL_EXAM: <Stethoscope size={14} />,
  INVESTIGATIONS: <FlaskConical size={14} />,
  DIAGNOSIS: <Brain size={14} />,
  EVALUATION: <Award size={14} />,
};

const PHASE_ORDER: OscePhase[] = [
  "ANAMNESIS",
  "PHYSICAL_EXAM",
  "INVESTIGATIONS",
  "DIAGNOSIS",
  "EVALUATION",
];

const DIFFICULTY_COLORS = {
  kolay: "success",
  orta: "warning",
  zor: "destructive",
} as const;

const SPECIALTIES = [
  "Rastgele",
  "Dahiliye",
  "Pediatri",
  "Genel Cerrahi",
  "Kadın Doğum",
  "Küçük Stajlar",
  "Acil Tıp",
];

const INVESTIGATION_PRESETS = [
  { category: "Hematoloji", items: ["Tam Kan Sayımı (CBC)", "Periferik Yayma"] },
  {
    category: "Tıbbi Biyokimya",
    items: [
      "Glukoz",
      "BUN / Kreatinin",
      "Elektrolitler (Na, K, Cl)",
      "Karaciğer Enzimleri (AST, ALT, GGT)",
      "Lipaz / Amilaz",
      "Troponin I/T",
      "CRP / Sedimantasyon",
      "D-Dimer",
      "BNP / NT-proBNP",
      "TSH / fT4",
      "Laktat",
    ],
  },
  { category: "İdrar", items: ["İdrar Tahlili (UA)", "İdrar Kültürü"] },
  {
    category: "Dahiliye",
    items: ["EKG (12 derivasyon)", "Ekokardiyografi"],
  },
  {
    category: "Görüntüleme",
    items: [
      "Akciğer Grafisi (PA)",
      "Karın USG",
      "BT Toraks",
      "BT Batın + Pelvis",
      "BT Kranium",
      "MRI Beyin",
      "Doppler USG",
    ],
  },
  {
    category: "Diğer",
    items: ["Kan Gazı (ABG)", "Koagülasyon (PT, aPTT, INR)", "Tiroid USG", "Lomber Ponksiyon"],
  },
];

// ─── Web Speech API tipler ────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

// ─── SES: Web Speech API hook ─────────────────────────────────────────────────
function useSpeechRecognition(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    const win = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.error("Tarayıcınız ses tanımayı desteklemiyor.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}

// ─── TTS: Text-to-Speech ──────────────────────────────────────────────────────
function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "tr-TR";
      utter.rate = 0.95;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [ttsEnabled]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, ttsEnabled, setTtsEnabled, speak, stopSpeaking };
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function OsceSimulatorPage() {
  const [examState, setExamState] = useState<"setup" | "loading" | "active" | "confirming" | "evaluating" | "done">("setup");
  const [phase, setPhase] = useState<OscePhase>("ANAMNESIS");
  const [caseData, setCaseData] = useState<OsceCase | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("Rastgele");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"kolay" | "orta" | "zor">("orta");
  const [requestedInvestigations, setRequestedInvestigations] = useState<RequestedInvestigation[]>([]);
  const [showInvestigationPanel, setShowInvestigationPanel] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState("");
  const [phaseScores, setPhaseScores] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isSpeaking, ttsEnabled, setTtsEnabled, speak, stopSpeaking } = useTTS();
  const { isListening, startListening, stopListening } = useSpeechRecognition((text) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  });

  // Mesaj listesi otomatik kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Son asistan mesajını seslendir
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      speak(last.content.slice(0, 300));
    }
  }, [messages, speak]);

  // ── Sınav başlatma ──────────────────────────────────────────────────────────
  async function startExam() {
    setExamState("loading");
    const loadingId = toast.loading("Vaka hazırlanıyor, hasta odaya giriyor...");

    try {
      const res = await fetch("/api/ai/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_case",
          specialty: selectedSpecialty === "Rastgele" ? undefined : selectedSpecialty,
          difficulty: selectedDifficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const c = data.caseData as OsceCase;
      setCaseData(c);
      setPhase("ANAMNESIS");
      setMessages([
        {
          id: "intro-1",
          role: "system",
          content: `OSCE Sınavı Başladı — ${c.specialty} | ${c.difficulty.toUpperCase()} Zorluk`,
          phase: "ANAMNESIS",
        },
        {
          id: "intro-2",
          role: "assistant",
          content: `*Hasta odaya giriyor*\n\n**${c.patient.name}** — ${c.patient.age} yaş, ${c.patient.gender}, ${c.patient.occupation}.\nŞikayet: "${c.chiefComplaint}"\n\nVitaller: TA ${c.patient.vitals.bp} | Nabız ${c.patient.vitals.hr} | Solunum ${c.patient.vitals.rr} | Ateş ${c.patient.vitals.temp} | SpO2 ${c.patient.vitals.spo2}\n\n*Anamnez almaya başlayabilirsiniz.*`,
          phase: "ANAMNESIS",
        },
      ]);
      setExamState("active");
      toast.success("Hasta hazır. Anamneze başlayın.", { id: loadingId });
    } catch {
      toast.error("Vaka oluşturulamadı. Tekrar deneyin.", { id: loadingId });
      setExamState("setup");
    }
  }

  // ── Mesaj gönderme (streaming) ──────────────────────────────────────────────
  async function sendMessage(overrideInput?: string) {
    const text = (overrideInput ?? input).trim();
    if (!text || isSending || !caseData) return;

    setInput("");
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
      phase,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    const historyForApi = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await fetch("/api/ai/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          phase,
          message: text,
          caseData,
          history: historyForApi,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      // Streaming okuma
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream alınamadı.");
      const decoder = new TextDecoder();
      let accumulated = "";
      const assistantMsgId = `a_${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "", phase },
      ]);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: accumulated } : m
          )
        );
      }
    } catch (err) {
      toast.error("Yanıt alınamadı.");
      console.error(err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  // ── Tetkik istemi ───────────────────────────────────────────────────────────
  async function requestInvestigation(name: string) {
    if (!caseData) return;
    const already = requestedInvestigations.find((r) => r.name === name);
    if (already?.result) {
      toast("Bu tetkik zaten istendi.", { icon: "ℹ️" });
      return;
    }

    const newReq: RequestedInvestigation = {
      id: `inv_${Date.now()}`,
      name,
      requestedAt: new Date(),
    };
    setRequestedInvestigations((prev) => [...prev, newReq]);

    // Tetkik isteğini mesaj olarak gönder
    const requestText = `${name} sonucunu görmek istiyorum.`;
    await sendMessage(requestText);

    // Sonucu da requestedInvestigations'a ekle (basit mock - gerçek sonuç streaming'den gelir)
    setRequestedInvestigations((prev) =>
      prev.map((r) =>
        r.id === newReq.id ? { ...r, result: "Sonuç AI yanıtında sunuldu" } : r
      )
    );
  }

  // ── Aşama geçişi ─────────────────────────────────────────────────────────────
  function confirmPhaseTransition(nextPhase: OscePhase) {
    const phaseMessages: Record<string, string> = {
      PHYSICAL_EXAM:
        "Anamnezi tamamladınız. **Fizik muayeneye geçmek** istediğinizi onaylıyor musunuz? Geri dönüp ek soru soramayacaksınız.",
      INVESTIGATIONS:
        "Fizik muayeneyi tamamladınız. **Tetkik/görüntüleme aşamasına geçmek** istiyor musunuz?",
      DIAGNOSIS:
        "Tetkiklerinizi tamamladınız. **Tanı ve tedavi planı** sunmaya hazır mısınız?",
      EVALUATION:
        "Tüm aşamaları tamamladınız. **Final değerlendirmesini başlatmak** istiyor musunuz?",
    };

    setMessages((prev) => [
      ...prev,
      {
        id: `confirm_${Date.now()}`,
        role: "system",
        content: phaseMessages[nextPhase] || `${PHASE_LABELS[nextPhase]} aşamasına geçilecek.`,
        phase,
      },
    ]);
    setExamState("confirming");
  }

  async function proceedToNextPhase() {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    const nextPhase = PHASE_ORDER[currentIndex + 1];
    if (!nextPhase) return;

    setPhase(nextPhase);
    setExamState("active");

    const transitionMessages: Record<OscePhase, string> = {
      ANAMNESIS: "",
      PHYSICAL_EXAM:
        "**Fizik Muayene Aşaması Başladı.**\n\nHangi sistemi muayene etmek istediğinizi belirtin. Örn: *'Kardiyovasküler sistemi muayene etmek istiyorum'*",
      INVESTIGATIONS:
        "**Tetkik & Görüntüleme Aşaması Başladı.**\n\nSağ panelden tetkik isteyebilir veya direkt yazabilirsiniz. Örn: *'EKG çekmek istiyorum'*",
      DIAGNOSIS:
        "**Tanı & Tedavi Planı Aşaması.**\n\nÖn tanınızı, ayırıcı tanılarınızı ve tedavi planınızı sunun.",
      EVALUATION: "",
    };

    if (nextPhase === "INVESTIGATIONS") setShowInvestigationPanel(true);

    if (nextPhase === "EVALUATION") {
      await runEvaluation();
      return;
    }

    if (transitionMessages[nextPhase]) {
      setMessages((prev) => [
        ...prev,
        {
          id: `phase_${Date.now()}`,
          role: "system",
          content: `── ${PHASE_LABELS[nextPhase].toUpperCase()} ──`,
          phase: nextPhase,
        },
        {
          id: `phase_msg_${Date.now()}`,
          role: "assistant",
          content: transitionMessages[nextPhase],
          phase: nextPhase,
        },
      ]);
    }
  }

  // ── Final değerlendirme ─────────────────────────────────────────────────────
  async function runEvaluation() {
    if (!caseData) return;
    setExamState("evaluating");
    setMessages((prev) => [
      ...prev,
      {
        id: `eval_start`,
        role: "system",
        content: "── DEĞERLENDİRME HAZIRLANIYOR ──",
        phase: "EVALUATION",
      },
    ]);

    try {
      const historyForApi = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const res = await fetch("/api/ai/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          caseData,
          history: historyForApi,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEvaluationReport(data.report);
      setExamState("done");

      // Skoru parse et ve profile kaydet
      const scoreMatch = data.report.match(/(\d{1,3})\s*\/\s*100/);
      const totalScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      await saveOsceProfile(totalScore, data.report);
    } catch {
      toast.error("Değerlendirme sırasında hata oluştu.");
      setExamState("active");
    }
  }

  async function saveOsceProfile(totalScore: number, report: string) {
    if (!caseData) return;

    // Basit güçlü/zayıf alan parse (report'tan)
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const criticalMisses: string[] = [];

    const strengthMatch = report.match(/[Gg]üçlü\s+[Yy]önler?[:\s]+([^\n]+)/g);
    const weakMatch = report.match(/[Gg]eliştirilmesi\s+[Gg]ereken[:\s]+([^\n]+)/g);
    const criticalMatch = report.match(/[Kk]ritik\s+[Bb]ulgu[:\s]+([^\n]+)/g);

    if (strengthMatch) strengths.push(...strengthMatch.slice(0, 3));
    if (weakMatch) weaknesses.push(...weakMatch.slice(0, 3));
    if (criticalMatch) criticalMisses.push(...criticalMatch.slice(0, 3));

    await fetch("/api/ai/osce/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: {
          caseId: caseData.caseId,
          specialty: caseData.specialty,
          difficulty: caseData.difficulty,
          diagnosis: caseData.hiddenDiagnosis,
          totalScore,
          subscores: phaseScores,
          strengths,
          weaknesses,
          criticalMisses,
          completedAt: new Date().toISOString(),
        },
      }),
    }).catch(() => {});
  }

  function resetExam() {
    setExamState("setup");
    setPhase("ANAMNESIS");
    setCaseData(null);
    setMessages([]);
    setInput("");
    setRequestedInvestigations([]);
    setShowInvestigationPanel(false);
    setEvaluationReport("");
    setPhaseScores({});
    stopSpeaking();
  }

  function downloadReport() {
    const blob = new Blob([evaluationReport], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OSCE_Rapor_${caseData?.caseId ?? "rapor"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Setup ekranı
  // ─────────────────────────────────────────────────────────────────────────────
  if (examState === "setup") {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Başlık */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">OSCE Simülatörü</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Türkiye&apos;nin en gelişmiş klinik beceri sınav simülasyonu
            </p>
          </div>
        </div>

        {/* Uyarı */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-xs text-[var(--color-warning)]">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Eğitim amaçlı simülasyon. Hasta AI rolünde, gerçek klinik bilgi yerine geçmez.</span>
        </div>

        {/* Yapay Zekanın Özellikleri */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <Brain size={18} />, title: "Akıllı Hasta AI", desc: "Sadece sorulan soruya yanıt verir. Asla bilgi sızdırmaz." },
            { icon: <Activity size={18} />, title: "Aşamalı Sınav", desc: "Anamnez → Muayene → Tetkik → Tanı akışı." },
            { icon: <Award size={18} />, title: "Profil Öğrenimi", desc: "Performansın diğer AI ajanlarına aktarılır." },
          ].map((feat) => (
            <Card key={feat.title} variant="bordered" className="p-4">
              <div className="text-[var(--color-primary)] mb-2">{feat.icon}</div>
              <div className="font-semibold text-sm mb-1">{feat.title}</div>
              <p className="text-[var(--color-text-secondary)] text-xs">{feat.desc}</p>
            </Card>
          ))}
        </div>

        {/* Ayarlar */}
        <Card variant="elevated" className="p-6">
          <h2 className="font-bold text-lg mb-5">Sınav Ayarları</h2>

          {/* Uzmanlık */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">Uzmanlık Alanı</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                    selectedSpecialty === spec
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Zorluk */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Zorluk Seviyesi</label>
            <div className="flex gap-3">
              {(["kolay", "orta", "zor"] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all capitalize ${
                    selectedDifficulty === diff
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Button size="lg" onClick={startExam} className="w-full h-14 text-base font-semibold">
            <PlayCircle size={20} className="mr-2" />
            Sınava Gir
          </Button>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Yükleme
  // ─────────────────────────────────────────────────────────────────────────────
  if (examState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] animate-spin" />
          <Stethoscope size={28} className="absolute inset-0 m-auto text-[var(--color-primary)]" />
        </div>
        <p className="text-[var(--color-text-secondary)] animate-pulse">Hasta hazırlanıyor...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Aktif sınav
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-0">
      {/* ── Üst Bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] rounded-t-2xl">
        {/* Aşama göstergesi */}
        <div className="flex items-center gap-1">
          {PHASE_ORDER.map((p, i) => {
            const isDone = i < currentPhaseIndex;
            const isCurrent = p === phase;
            return (
              <div key={p} className="flex items-center gap-1">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-[var(--color-primary)] text-white"
                      : isDone
                        ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                        : "text-[var(--color-text-muted)] opacity-40"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={12} /> : PHASE_ICONS[p]}
                  <span className="hidden md:inline">{PHASE_LABELS[p]}</span>
                </div>
                {i < PHASE_ORDER.length - 1 && (
                  <ChevronRight size={12} className="text-[var(--color-text-muted)] opacity-30" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Vaka bilgi badge */}
          {caseData && (
            <Badge variant={DIFFICULTY_COLORS[caseData.difficulty as keyof typeof DIFFICULTY_COLORS] || "outline"} className="text-xs hidden sm:flex">
              {caseData.specialty}
            </Badge>
          )}

          {/* TTS toggle */}
          <button
            onClick={() => { isSpeaking ? stopSpeaking() : setTtsEnabled(!ttsEnabled); }}
            className={`p-2 rounded-lg transition-colors ${ttsEnabled ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}
            title="Sesli okuma"
          >
            {isSpeaking ? <Volume2 size={16} className="animate-pulse" /> : ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Tetkik paneli */}
          {(phase === "INVESTIGATIONS" || phase === "DIAGNOSIS") && (
            <button
              onClick={() => setShowInvestigationPanel(!showInvestigationPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showInvestigationPanel ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30" : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"}`}
            >
              <FlaskConical size={13} />
              <span>Tetkikler {requestedInvestigations.length > 0 && `(${requestedInvestigations.length})`}</span>
            </button>
          )}

          {/* Sıfırla */}
          {examState !== "evaluating" && (
            <button
              onClick={resetExam}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-destructive)] transition-colors"
              title="Sınavı Sıfırla"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Ana içerik alanı ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sohbet ── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mesajlar */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              if (m.role === "system") {
                return (
                  <div key={m.id} className="flex justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-surface)] px-3 py-1 rounded-full border border-[var(--color-border)]">
                      {m.content}
                    </span>
                  </div>
                );
              }

              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 text-[var(--color-primary)]">
                      {phase === "ANAMNESIS" ? <User size={14} /> : <Brain size={14} />}
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-[var(--color-primary)] text-white rounded-br-sm"
                        : "bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <User size={14} className="text-[var(--color-text-muted)]" />
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                  <Brain size={14} className="text-[var(--color-primary)]" />
                </div>
                <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Aşama onay butonu */}
            {examState === "confirming" && (
              <div className="flex justify-center gap-3 py-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={proceedToNextPhase}
                  className="px-6"
                >
                  <CheckCircle2 size={14} className="mr-2" />
                  Evet, Devam Et
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExamState("active")}
                >
                  <X size={14} className="mr-2" />
                  Hayır, Devam Edeyim
                </Button>
              </div>
            )}

            {/* Değerlendirme yüklenme */}
            {examState === "evaluating" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
                <p className="text-sm text-[var(--color-text-secondary)]">Performansınız analiz ediliyor...</p>
              </div>
            )}

            {/* Final Rapor */}
            {examState === "done" && evaluationReport && (
              <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
                <div className="bg-[var(--color-surface-elevated)] px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-[var(--color-primary)]" />
                    <span className="font-bold text-sm">OSCE Final Raporu</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <Download size={12} />
                      İndir
                    </button>
                    <button
                      onClick={resetExam}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--color-primary)] text-white"
                    >
                      <RotateCcw size={12} />
                      Yeni Sınav
                    </button>
                  </div>
                </div>
                <div className="p-5 prose prose-sm max-w-none text-[var(--color-text-primary)]">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{evaluationReport}</pre>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input alanı ── */}
          {examState === "active" && (
            <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
              {/* Aşama geçiş butonları */}
              <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                {phase === "ANAMNESIS" && (
                  <button
                    onClick={() => confirmPhaseTransition("PHYSICAL_EXAM")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 transition-all whitespace-nowrap shrink-0"
                  >
                    <Stethoscope size={12} />
                    Anamnez Tamam → Muayeneye Geç
                  </button>
                )}
                {phase === "PHYSICAL_EXAM" && (
                  <button
                    onClick={() => confirmPhaseTransition("INVESTIGATIONS")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 transition-all whitespace-nowrap shrink-0"
                  >
                    <FlaskConical size={12} />
                    Muayene Tamam → Tetkiklere Geç
                  </button>
                )}
                {phase === "INVESTIGATIONS" && (
                  <button
                    onClick={() => confirmPhaseTransition("DIAGNOSIS")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 transition-all whitespace-nowrap shrink-0"
                  >
                    <Brain size={12} />
                    Tetkikler Tamam → Tanıya Geç
                  </button>
                )}
                {phase === "DIAGNOSIS" && (
                  <button
                    onClick={() => confirmPhaseTransition("EVALUATION")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-all whitespace-nowrap shrink-0"
                  >
                    <Award size={12} />
                    Sınavı Bitir → Değerlendir
                  </button>
                )}
              </div>

              {/* Metin girişi */}
              <div className="relative flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl py-3 pl-4 pr-3 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none min-h-[44px] max-h-[120px] leading-relaxed"
                  placeholder={
                    phase === "ANAMNESIS"
                      ? "Hastaya soru sorun... (Enter: gönder, Shift+Enter: alt satır)"
                      : phase === "PHYSICAL_EXAM"
                        ? "Muayene etmek istediğiniz sistemi belirtin..."
                        : phase === "INVESTIGATIONS"
                          ? "Tetkik isteyin veya sağ paneli kullanın..."
                          : "Tanınızı ve tedavi planınızı sunun..."
                  }
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                {/* Mikrofon butonu */}
                <button
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onTouchStart={startListening}
                  onTouchEnd={stopListening}
                  className={`p-3 rounded-xl transition-all ${
                    isListening
                      ? "bg-[var(--color-destructive)] text-white animate-pulse"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50"
                  }`}
                  title="Sesle yaz (basılı tut)"
                >
                  {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                </button>

                {/* Gönder */}
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isSending}
                  className="p-3 rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-40 transition-all hover:opacity-90"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tetkik Paneli ────────────────────────────────────────────────── */}
        {showInvestigationPanel && (
          <div className="w-64 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <FlaskConical size={14} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold">İstem Paneli</span>
              </div>
              <button onClick={() => setShowInvestigationPanel(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X size={14} />
              </button>
            </div>

            {/* İstenen tetkikler */}
            {requestedInvestigations.length > 0 && (
              <div className="px-3 py-2 border-b border-[var(--color-border)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                  İstenenler ({requestedInvestigations.length})
                </p>
                <div className="space-y-1">
                  {requestedInvestigations.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 size={10} className="text-[var(--color-success)] shrink-0" />
                      <span className="truncate text-[var(--color-text-secondary)]">{inv.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tetkik kategorileri */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {INVESTIGATION_PRESETS.map((cat) => (
                <div key={cat.category}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-1 mb-1">
                    {cat.category}
                  </p>
                  <div className="space-y-0.5">
                    {cat.items.map((item) => {
                      const isRequested = requestedInvestigations.some((r) => r.name === item);
                      return (
                        <button
                          key={item}
                          onClick={() => requestInvestigation(item)}
                          disabled={isRequested || isSending}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                            isRequested
                              ? "text-[var(--color-success)] bg-[var(--color-success)]/5 cursor-default"
                              : "hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          }`}
                        >
                          {isRequested && <CheckCircle2 size={10} className="inline mr-1" />}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
