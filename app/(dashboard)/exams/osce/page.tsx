"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ClipboardList,
  Database,
  Download,
  FlaskConical,
  Hash,
  Loader2,
  Mic,
  MicOff,
  PlayCircle,
  RotateCcw,
  Send,
  Settings2,
  Stethoscope,
  Timer,
  TrendingUp,
  User,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/* ─────────────────────── Types ─────────────────────── */

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

interface ReferenceItem {
  chunkId: string;
  materialId: string;
}

interface SkillGap {
  competency: string;
  severity: "low" | "medium" | "high";
  evidence: string;
  recommendation: string;
}

interface QuickSummary {
  totalScore: number;
  subscores: {
    anamnesis: number;
    physicalExam: number;
    investigations: number;
    diagnosis: number;
    management: number;
  };
  missingCompetencies: string[];
  strengths: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  phase: OscePhase;
  grounded?: boolean;
  references?: ReferenceItem[];
  refusalReason?: string | null;
}

interface RequestedInvestigation {
  id: string;
  name: string;
  requestedAt: Date;
  result?: string;
}

interface Material {
  id: string;
  name: string;
  branch: string;
  chunkCount: number;
  status: string;
}

interface StationResult {
  caseData: OsceCase;
  quickSummary: QuickSummary | null;
  skillGaps: SkillGap[];
  evaluationReport: string;
  sessionId: string | null;
  timeUsed: number;
}

type ExamScreen = "lobby" | "loading" | "door" | "countdown" | "active" | "station-eval" | "results";

/* ─────────────────────── Constants ─────────────────────── */

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

const SPECIALTIES = [
  "Rastgele",
  "Dahiliye",
  "Pediatri",
  "Genel Cerrahi",
  "Kadın Doğum",
  "Küçük Stajlar",
  "Acil Tıp",
];

const STATION_COUNTS = [1, 2, 3, 4, 6];
const TIMER_OPTIONS = [
  { value: 300, label: "5 dk" },
  { value: 480, label: "8 dk" },
  { value: 600, label: "10 dk" },
  { value: 720, label: "12 dk" },
  { value: 900, label: "15 dk" },
];

const INVESTIGATION_PRESETS = [
  { category: "Hematoloji", items: ["Tam Kan Sayımı (CBC)", "Periferik Yayma"] },
  {
    category: "Biyokimya",
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
  { category: "Kardiyoloji", items: ["EKG (12 derivasyon)", "Ekokardiyografi"] },
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

const SCORE_CONFIG: { key: keyof QuickSummary["subscores"]; label: string; max: number; color: string }[] = [
  { key: "anamnesis", label: "Anamnez", max: 25, color: "var(--color-primary)" },
  { key: "physicalExam", label: "Fizik Muayene", max: 25, color: "#7ce7c8" },
  { key: "investigations", label: "Tetkikler", max: 20, color: "#f7b955" },
  { key: "diagnosis", label: "Tanı", max: 20, color: "#a78bfa" },
  { key: "management", label: "Tedavi Planı", max: 10, color: "#f472b6" },
];

/* ─────────────────────── Audio ─────────────────────── */

function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.3) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), (dur + 0.5) * 1000);
  } catch { /* audio not available */ }
}

function playWarningBell() {
  playTone(880, 0.25, "sine", 0.25);
  setTimeout(() => playTone(880, 0.25, "sine", 0.25), 350);
}

function playTimeUpBuzzer() {
  playTone(440, 0.4, "square", 0.2);
  setTimeout(() => playTone(660, 0.4, "square", 0.2), 450);
  setTimeout(() => playTone(440, 0.6, "square", 0.25), 900);
}

function playStartChime() {
  playTone(523, 0.15, "sine", 0.2);
  setTimeout(() => playTone(659, 0.15, "sine", 0.2), 180);
  setTimeout(() => playTone(784, 0.25, "sine", 0.25), 360);
}

function playCountdownTick() {
  playTone(800, 0.08, "sine", 0.15);
}

/* ─────────────────────── Speech Types ─────────────────────── */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

/* ─────────────────────── Voice Playback Hook ─────────────────────── */

function useVoicePlayback() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [preferBrowserTts, setPreferBrowserTts] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const fallbackNotifiedRef = useRef(false);

  const speakWithBrowserTts = useCallback((cleaned: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned.slice(0, 600));
    utterance.lang = "tr-TR";
    utterance.rate = 0.98;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    if (!fallbackNotifiedRef.current) {
      fallbackNotifiedRef.current = true;
      toast("Standart ses kullanılıyor.", { icon: "ℹ️" });
    }
    return true;
  }, []);

  const stopSpeaking = useCallback(() => {
    fetchControllerRef.current?.abort();
    fetchControllerRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!ttsEnabled) return;
      const cleaned = text.trim();
      if (!cleaned) return;
      if (preferBrowserTts) {
        speakWithBrowserTts(cleaned);
        return;
      }
      stopSpeaking();
      const controller = new AbortController();
      fetchControllerRef.current = controller;
      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 503 || err?.code === "ELEVENLABS_NOT_CONFIGURED") {
            setPreferBrowserTts(true);
            speakWithBrowserTts(cleaned);
            return;
          }
          throw new Error(err.error || "Ses üretilemedi");
        }
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        currentUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current);
            currentUrlRef.current = null;
          }
        };
        audio.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        await audio.play();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (speakWithBrowserTts(cleaned)) return;
        setIsSpeaking(false);
      }
    },
    [preferBrowserTts, speakWithBrowserTts, stopSpeaking, ttsEnabled],
  );

  useEffect(() => stopSpeaking, [stopSpeaking]);
  return { isSpeaking, ttsEnabled, setTtsEnabled, speak, stopSpeaking };
}

/* ─────────────────────── Push-to-Talk Hook ─────────────────────── */

function usePushToTalk(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [preferBrowserStt, setPreferBrowserStt] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const browserRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const sttFallbackNotifiedRef = useRef(false);

  const startBrowserRecognitionFallback = useCallback(() => {
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) { toast.error("Ses tanıma kullanılamıyor."); return; }
    const recognition = new Ctor();
    browserRecognitionRef.current = recognition;
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (text) onTranscript(text);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
    if (!sttFallbackNotifiedRef.current) {
      sttFallbackNotifiedRef.current = true;
      toast("Tarayıcı ses tanıma aktif.", { icon: "ℹ️" });
    }
  }, [onTranscript]);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;
    if (preferBrowserStt) { startBrowserRecognitionFallback(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size < 500) return;
          const form = new FormData();
          form.set("audio", blob, "osce.webm");
          form.set("language_code", "tr");
          const res = await fetch("/api/voice/stt", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok && (res.status === 503 || data?.code === "ELEVENLABS_NOT_CONFIGURED")) {
            setPreferBrowserStt(true);
            startBrowserRecognitionFallback();
            return;
          }
          if (!res.ok) throw new Error(data.error || "Ses çözümlenemedi");
          const text = typeof data.text === "string" ? data.text.trim() : "";
          if (text) onTranscript(text);
        } catch {
          startBrowserRecognitionFallback();
        } finally {
          stopTracks();
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch {
      startBrowserRecognitionFallback();
      stopTracks();
    }
  }, [isListening, onTranscript, preferBrowserStt, startBrowserRecognitionFallback, stopTracks]);

  const stopListening = useCallback(() => {
    browserRecognitionRef.current?.stop();
    browserRecognitionRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else stopTracks();
    setIsListening(false);
  }, [stopTracks]);

  useEffect(() => () => stopTracks(), [stopTracks]);
  return { isListening, startListening, stopListening };
}

/* ─────────────────────── Timer Hook ─────────────────────── */

function useStationTimer(onWarning: () => void, onTimeUp: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningFiredRef = useRef(false);
  const onWarningRef = useRef(onWarning);
  const onTimeUpRef = useRef(onTimeUp);
  onWarningRef.current = onWarning;
  onTimeUpRef.current = onTimeUp;

  const start = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTotal(seconds);
    setRemaining(seconds);
    warningFiredRef.current = false;
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsRunning(false);
  }, []);

  const getElapsed = useCallback(() => total - remaining, [total, remaining]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsRunning(false);
          onTimeUpRef.current();
          return 0;
        }
        if (prev === 121 && !warningFiredRef.current) {
          warningFiredRef.current = true;
          onWarningRef.current();
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  return { remaining, total, isRunning, start, stop, getElapsed };
}

/* ─────────────────────── Helpers ─────────────────────── */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getTimerColor(r: number): string {
  if (r <= 30) return "var(--color-destructive)";
  if (r <= 120) return "var(--color-warning)";
  return "var(--color-text-primary)";
}

function getScoreColor(s: number): string {
  if (s >= 75) return "var(--color-success)";
  if (s >= 50) return "var(--color-warning)";
  return "var(--color-destructive)";
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function OsceSimulatorPage() {
  /* ── Config ── */
  const [stationCount, setStationCount] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(480);
  const [selectedSpecialty, setSelectedSpecialty] = useState("Rastgele");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"kolay" | "orta" | "zor">("orta");
  const [useApprovedLibrary] = useState(true);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());

  /* ── Exam ── */
  const [screen, setScreen] = useState<ExamScreen>("lobby");
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [stationResults, setStationResults] = useState<StationResult[]>([]);
  const [countdownValue, setCountdownValue] = useState(3);

  /* ── Station ── */
  const [caseData, setCaseData] = useState<OsceCase | null>(null);
  const [phase, setPhase] = useState<OscePhase>("ANAMNESIS");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [requestedInvestigations, setRequestedInvestigations] = useState<RequestedInvestigation[]>([]);
  const [showInvestigationPanel, setShowInvestigationPanel] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState("");
  const [quickSummary, setQuickSummary] = useState<QuickSummary | null>(null);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  /* ── Materials ── */
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialPanelOpen, setMaterialPanelOpen] = useState(false);

  /* ── Refs ── */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endStationCalledRef = useRef(false);

  /* ── Hooks ── */
  const { isSpeaking, ttsEnabled, setTtsEnabled, speak, stopSpeaking } = useVoicePlayback();
  const { isListening, startListening, stopListening } = usePushToTalk((text) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  });

  /* endStation wrapped in ref to avoid stale closures in timer callback */
  const endStationRef = useRef<() => void>(() => {});

  const handleTimerWarning = useCallback(() => {
    playWarningBell();
    toast("2 dakika kaldı!", { icon: "⏰", duration: 3000 });
  }, []);

  const handleTimeUp = useCallback(() => {
    playTimeUpBuzzer();
    toast("Süre doldu!", { icon: "🔔", duration: 4000 });
    endStationRef.current();
  }, []);

  const timer = useStationTimer(handleTimerWarning, handleTimeUp);

  /* ── Effects ── */
  const fetchMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Materyaller yüklenemedi");
      setMaterials((data.materials ?? []).filter((m: Material) => m.status === "ready"));
    } catch { /* silent */ } finally { setMaterialsLoading(false); }
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") void speak(last.content.slice(0, 600));
  }, [messages, speak]);

  /* ── Helpers ── */

  function toggleMaterial(id: string) {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function resetStationState() {
    setCaseData(null);
    setPhase("ANAMNESIS");
    setMessages([]);
    setInput("");
    setIsSending(false);
    setRequestedInvestigations([]);
    setShowInvestigationPanel(false);
    setEvaluationReport("");
    setQuickSummary(null);
    setSkillGaps([]);
    setSessionId(null);
    endStationCalledRef.current = false;
    stopSpeaking();
  }

  async function startExam() {
    setStationResults([]);
    setCurrentStationIndex(0);
    resetStationState();
    await loadStation(0);
  }

  async function loadStation(index: number) {
    setScreen("loading");
    const loadingId = toast.loading(`İstasyon ${index + 1} hazırlanıyor...`);
    try {
      const res = await fetch("/api/ai/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_case",
          specialty: selectedSpecialty === "Rastgele" ? undefined : selectedSpecialty,
          difficulty: selectedDifficulty,
          selectedMaterialIds: Array.from(selectedMaterialIds),
          useApprovedLibrary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vaka oluşturulamadı");
      setCaseData(data.caseData as OsceCase);
      setPhase("ANAMNESIS");
      setMessages([]);
      setRequestedInvestigations([]);
      setShowInvestigationPanel(false);
      toast.success(`İstasyon ${index + 1} hazır.`, { id: loadingId });
      setScreen("door");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vaka oluşturulamadı", { id: loadingId });
      setScreen("lobby");
    }
  }

  function enterStation() {
    setScreen("countdown");
    setCountdownValue(3);
    let count = 3;
    playCountdownTick();
    const interval = setInterval(() => {
      count -= 1;
      setCountdownValue(count);
      if (count > 0) { playCountdownTick(); }
      else {
        clearInterval(interval);
        playStartChime();
        setScreen("active");
        endStationCalledRef.current = false;
        timer.start(timerSeconds);
        if (caseData) {
          setMessages([
            {
              id: "intro-1", role: "system",
              content: `İSTASYON ${currentStationIndex + 1} — ${caseData.specialty} | ${caseData.difficulty.toUpperCase()}`,
              phase: "ANAMNESIS",
            },
            {
              id: "intro-2", role: "assistant",
              content: `Merhaba doktor. Ben ${caseData.patient.name}, ${caseData.patient.age} yaşındayım.\n\n"${caseData.chiefComplaint}" şikayetiyle geldim.\n\nBana sormak istediğiniz her şeyi sorabilirsiniz.`,
              phase: "ANAMNESIS", grounded: true,
            },
          ]);
        }
      }
    }, 1000);
  }

  async function sendMessage(overrideInput?: string) {
    const text = (overrideInput ?? input).trim();
    if (!text || isSending || !caseData) return;
    stopSpeaking();
    setInput("");
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content: text, phase };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    const historyForApi = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    try {
      const res = await fetch("/api/ai/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", phase, message: text, caseData, history: historyForApi, selectedMaterialIds: Array.from(selectedMaterialIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yanıt alınamadı");
      setMessages((prev) => [...prev, {
        id: `a_${Date.now()}`, role: "assistant", content: data.text || "", phase,
        grounded: data.grounded, references: data.references ?? [], refusalReason: data.refusalReason ?? null,
      }]);
    } catch { toast.error("Yanıt alınamadı."); }
    finally { setIsSending(false); inputRef.current?.focus(); }
  }

  async function requestInvestigation(name: string) {
    if (!caseData) return;
    if (requestedInvestigations.find((r) => r.name === name)?.result) {
      toast("Bu tetkik zaten istendi.", { icon: "ℹ️" });
      return;
    }
    const newReq: RequestedInvestigation = { id: `inv_${Date.now()}`, name, requestedAt: new Date() };
    setRequestedInvestigations((prev) => [...prev, newReq]);
    await sendMessage(`${name} sonucunu görmek istiyorum.`);
    setRequestedInvestigations((prev) => prev.map((r) => (r.id === newReq.id ? { ...r, result: "Sonuç yanıtta sunuldu" } : r)));
  }

  function advancePhase() {
    const ci = PHASE_ORDER.indexOf(phase);
    const next = PHASE_ORDER[ci + 1];
    if (!next || next === "EVALUATION") { endStationRef.current(); return; }
    setPhase(next);
    if (next === "INVESTIGATIONS") setShowInvestigationPanel(true);
    const transitions: Partial<Record<OscePhase, string>> = {
      PHYSICAL_EXAM: "Fizik muayene aşaması. Hangi sistemi muayene etmek istediğinizi belirtin.",
      INVESTIGATIONS: "Tetkik ve görüntüleme aşaması. İstediğiniz tetkikleri belirtin veya sağdaki paneli kullanın.",
      DIAGNOSIS: "Tanı ve tedavi planı aşaması. Ön tanınızı ve tedavi yaklaşımınızı sunun.",
    };
    if (transitions[next]) {
      setMessages((prev) => [...prev,
        { id: `phase_${Date.now()}`, role: "system", content: `── ${PHASE_LABELS[next].toUpperCase()} ──`, phase: next },
        { id: `phase_msg_${Date.now()}`, role: "assistant", content: transitions[next]!, phase: next },
      ]);
    }
  }

  /* endStation — guard against double-call */
  const endStation = useCallback(async () => {
    if (endStationCalledRef.current) return;
    endStationCalledRef.current = true;
    if (!caseData) return;
    timer.stop();
    setScreen("station-eval");
    const timeUsed = timer.getElapsed();

    try {
      const historyForApi = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const quickRes = await fetch("/api/ai/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate_quick", caseData, history: historyForApi, selectedMaterialIds: Array.from(selectedMaterialIds) }),
      });
      const quickData = await quickRes.json();
      if (!quickRes.ok) throw new Error(quickData.error || "Değerlendirme başarısız");
      setQuickSummary(quickData.quickSummary || null);
      setSessionId(quickData.sessionId || null);

      const deepRes = await fetch("/api/ai/osce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate_deep", caseData, history: historyForApi, selectedMaterialIds: Array.from(selectedMaterialIds), sessionId: quickData.sessionId || undefined }),
      });
      const deepData = await deepRes.json();
      if (!deepRes.ok) throw new Error(deepData.error || "Derin değerlendirme başarısız");

      const finalQuick = deepData.quickSummary || quickData.quickSummary || null;
      const finalGaps: SkillGap[] = Array.isArray(deepData.skillGaps) ? deepData.skillGaps : [];
      const finalReport: string = deepData.report || "";
      const finalSessionId: string | null = deepData.sessionId || quickData.sessionId || null;

      setEvaluationReport(finalReport);
      setSkillGaps(finalGaps);
      setQuickSummary(finalQuick);
      setSessionId(finalSessionId);

      setStationResults((prev) => [...prev, { caseData, quickSummary: finalQuick, skillGaps: finalGaps, evaluationReport: finalReport, sessionId: finalSessionId, timeUsed }]);

      // Save profile
      if (finalQuick && finalQuick.totalScore > 0) {
        fetch("/api/ai/osce/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            result: {
              caseId: caseData.caseId,
              specialty: caseData.specialty,
              difficulty: caseData.difficulty,
              diagnosis: caseData.hiddenDiagnosis,
              totalScore: finalQuick.totalScore,
              subscores: finalQuick.subscores,
              strengths: finalQuick.strengths.slice(0, 5),
              weaknesses: finalQuick.missingCompetencies.slice(0, 5),
              criticalMisses: finalGaps.filter((g) => g.severity === "high").map((g) => g.competency).slice(0, 5),
              completedAt: new Date().toISOString(),
            },
          }),
        }).catch(() => {});
        toast.success(`İstasyon skoru: ${finalQuick.totalScore}/100`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Değerlendirme hatası");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData, messages, selectedMaterialIds, timer]);

  /* Keep endStationRef in sync */
  useEffect(() => { endStationRef.current = endStation; }, [endStation]);

  function goToNextStation() {
    const nextIndex = currentStationIndex + 1;
    if (nextIndex >= stationCount) { setScreen("results"); return; }
    setCurrentStationIndex(nextIndex);
    resetStationState();
    void loadStation(nextIndex);
  }

  function resetExam() {
    timer.stop();
    resetStationState();
    setStationResults([]);
    setCurrentStationIndex(0);
    setScreen("lobby");
  }

  function downloadResults() {
    const payload = {
      examDate: new Date().toISOString(),
      stationCount,
      timerPerStation: timerSeconds,
      specialty: selectedSpecialty,
      difficulty: selectedDifficulty,
      stations: stationResults.map((s, i) => ({
        station: i + 1,
        specialty: s.caseData.specialty,
        diagnosis: s.caseData.hiddenDiagnosis,
        score: s.quickSummary?.totalScore ?? 0,
        subscores: s.quickSummary?.subscores,
        skillGaps: s.skillGaps,
        report: s.evaluationReport,
        timeUsed: s.timeUsed,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OSCE_Rapor_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);

  /* ═══════════════════════════════════════════════════════════════
     LOBBY
     ═══════════════════════════════════════════════════════════════ */

  if (screen === "lobby") {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-8">
        <div className="text-center pt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 60%, var(--color-secondary)))" }}>
            <Stethoscope size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">OSCE Sınav Merkezi</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">Klinik beceri değerlendirme simülasyonu</p>
        </div>

        <Card variant="elevated" className="overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border)]"
            style={{ background: "color-mix(in srgb, var(--color-primary) 4%, transparent)" }}>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Settings2 size={16} className="text-[var(--color-primary)]" />
              Sınav Ayarları
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Station Count */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Hash size={14} className="text-[var(--color-primary)]" /> İstasyon Sayısı
              </label>
              <div className="flex gap-2">
                {STATION_COUNTS.map((n) => (
                  <button key={n} onClick={() => setStationCount(n)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all"
                    style={stationCount === n
                      ? { borderColor: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }
                      : { borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }
                    }>{n}</button>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Timer size={14} className="text-[var(--color-primary)]" /> Süre / İstasyon
              </label>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setTimerSeconds(opt.value)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all"
                    style={timerSeconds === opt.value
                      ? { borderColor: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }
                      : { borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }
                    }>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Activity size={14} className="text-[var(--color-primary)]" /> Uzmanlık Alanı
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((spec) => (
                  <button key={spec} onClick={() => setSelectedSpecialty(spec)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                    style={selectedSpecialty === spec
                      ? { borderColor: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }
                      : { borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }
                    }>{spec}</button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Zap size={14} className="text-[var(--color-primary)]" /> Zorluk Seviyesi
              </label>
              <div className="flex gap-3">
                {(["kolay", "orta", "zor"] as const).map((diff) => {
                  const c = { kolay: "var(--color-success)", orta: "var(--color-warning)", zor: "var(--color-destructive)" };
                  return (
                    <button key={diff} onClick={() => setSelectedDifficulty(diff)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all capitalize"
                      style={selectedDifficulty === diff
                        ? { borderColor: c[diff], background: `color-mix(in srgb, ${c[diff]} 12%, transparent)`, color: c[diff] }
                        : { borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }
                      }>{diff.charAt(0).toUpperCase() + diff.slice(1)}</button>
                  );
                })}
              </div>
            </div>

            {/* Voice Toggle */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-border)]" style={{ background: "var(--color-surface)" }}>
              <div className="flex items-center gap-3">
                <Volume2 size={16} className="text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm font-semibold">Sesli Çalışma</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Hasta yanıtları sesli okunur, sesle yazabilirsiniz</p>
                </div>
              </div>
              <button onClick={() => setTtsEnabled((v) => !v)}
                className="w-12 h-7 rounded-full transition-all relative"
                style={{ background: ttsEnabled ? "var(--color-primary)" : "var(--color-border)" }}>
                <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                  style={{ left: ttsEnabled ? "calc(100% - 1.625rem)" : "0.125rem" }} />
              </button>
            </div>

            {/* Materials (optional) */}
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              <button onClick={() => setMaterialPanelOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                style={{ background: "var(--color-surface)" }}>
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-[var(--color-text-secondary)]" />
                  <span className="text-[var(--color-text-secondary)]">Kendi Materyallerim (Opsiyonel)</span>
                  {selectedMaterialIds.size > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "var(--color-primary)", color: "#000" }}>{selectedMaterialIds.size}</span>
                  )}
                </div>
                {materialPanelOpen ? <ChevronUp size={14} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-text-muted)]" />}
              </button>
              {materialPanelOpen && (
                <div className="border-t border-[var(--color-border)]">
                  {materialsLoading ? (
                    <div className="px-4 py-4 text-xs text-[var(--color-text-secondary)]">Yükleniyor...</div>
                  ) : materials.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-[var(--color-text-secondary)]">Hazır materyal bulunamadı.</div>
                  ) : (
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {materials.map((mat) => {
                        const sel = selectedMaterialIds.has(mat.id);
                        return (
                          <button key={mat.id} onClick={() => toggleMaterial(mat.id)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                            style={sel
                              ? { background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)" }
                              : { background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                              style={sel ? { background: "var(--color-primary)" } : { border: "1.5px solid var(--color-border)" }}>
                              {sel && <Check size={10} color="#000" strokeWidth={3} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate" style={{ color: sel ? "var(--color-primary)" : "var(--color-text-primary)" }}>{mat.name}</p>
                              <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{mat.branch} • {mat.chunkCount ?? 0} chunk</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6">
            <Button size="lg" onClick={startExam} className="w-full h-14 text-base font-bold">
              <PlayCircle size={20} className="mr-2" />
              Sınava Başla — {stationCount} İstasyon, {TIMER_OPTIONS.find((o) => o.value === timerSeconds)?.label}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Clock size={18} />, title: "Gerçek Zamanlı", desc: "Her istasyonda geri sayım, uyarı zili ve süre sonu sinyali" },
            { icon: <ClipboardList size={18} />, title: "Aşamalı Akış", desc: "Anamnez → Muayene → Tetkik → Tanı gerçek OSCE düzeninde" },
            { icon: <TrendingUp size={18} />, title: "Detaylı Analiz", desc: "Her istasyon için ayrı skor ve genel performans raporu" },
          ].map((f) => (
            <div key={f.title} className="p-4 rounded-xl border border-[var(--color-border)]" style={{ background: "var(--color-surface)" }}>
              <div className="text-[var(--color-primary)] mb-2">{f.icon}</div>
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     LOADING
     ═══════════════════════════════════════════════════════════════ */

  if (screen === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] animate-spin" />
          <Stethoscope size={28} className="absolute inset-0 m-auto text-[var(--color-primary)]" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">İstasyon {currentStationIndex + 1} Hazırlanıyor</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Hasta bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     DOOR — Station Briefing (Kapı Talimatları)
     ═══════════════════════════════════════════════════════════════ */

  if (screen === "door" && caseData) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-lg">
          <Card variant="elevated" className="overflow-hidden">
            <div className="px-6 py-5 text-center"
              style={{ background: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 60%, var(--color-secondary)))" }}>
              <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">İSTASYON</p>
              <p className="text-white text-5xl font-black">{currentStationIndex + 1}<span className="text-xl font-medium text-white/60"> / {stationCount}</span></p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="outline" className="text-white border-white/30 text-xs">{caseData.specialty}</Badge>
                <Badge variant="outline" className="text-white border-white/30 text-xs capitalize">{caseData.difficulty}</Badge>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-3">KAPI TALİMATLARI</p>
                <div className="w-12 h-px mx-auto" style={{ background: "var(--color-border)" }} />
              </div>
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">HASTA BİLGİSİ</p>
                <div className="grid grid-cols-2 gap-3">
                  {[{ l: "Ad", v: caseData.patient.name }, { l: "Yaş", v: caseData.patient.age }, { l: "Cinsiyet", v: caseData.patient.gender }, { l: "Meslek", v: caseData.patient.occupation }].map((x) => (
                    <div key={x.l}><p className="text-[10px] text-[var(--color-text-muted)] uppercase">{x.l}</p><p className="text-sm font-semibold">{x.v}</p></div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "color-mix(in srgb, var(--color-primary) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)" }}>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-2">BAŞ ŞİKAYET</p>
                <p className="text-base font-semibold italic">&ldquo;{caseData.chiefComplaint}&rdquo;</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">VİTAL BULGULAR</p>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[{ l: "TA", v: caseData.patient.vitals.bp }, { l: "Nabız", v: caseData.patient.vitals.hr }, { l: "SS", v: caseData.patient.vitals.rr }, { l: "Ateş", v: caseData.patient.vitals.temp }, { l: "SpO2", v: caseData.patient.vitals.spo2 }].map((x) => (
                    <div key={x.l}><p className="text-[10px] text-[var(--color-text-muted)] uppercase">{x.l}</p><p className="text-sm font-bold mt-0.5">{x.v}</p></div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">GÖREV</p>
                <p className="text-sm leading-relaxed">Bu hastadan detaylı anamnez alın, fizik muayene yapın, gerekli tetkikleri isteyin ve ön tanı ile tedavi planınızı sunun.</p>
              </div>
              <div className="flex items-center justify-center gap-2 py-2">
                <Timer size={14} className="text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Süre: <span className="font-bold text-[var(--color-text-primary)]">{TIMER_OPTIONS.find((o) => o.value === timerSeconds)?.label || `${timerSeconds / 60} dk`}</span>
                </span>
              </div>
              <Button size="lg" onClick={enterStation} className="w-full h-14 text-base font-bold">
                <ArrowRight size={18} className="mr-2" /> Hazırım — İstasyona Gir
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     COUNTDOWN
     ═══════════════════════════════════════════════════════════════ */

  if (screen === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">İSTASYON BAŞLIYOR</p>
        <div className="w-32 h-32 rounded-full flex items-center justify-center text-6xl font-black transition-all"
          style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", border: "3px solid var(--color-primary)", color: "var(--color-primary)" }}>
          {countdownValue}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">Hasta ile görüşmeniz başlayacak...</p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     STATION EVALUATION
     ═══════════════════════════════════════════════════════════════ */

  if (screen === "station-eval") {
    const hasResults = quickSummary && evaluationReport;
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-8">
        <div className="text-center pt-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: quickSummary ? "color-mix(in srgb, var(--color-success) 15%, transparent)" : "color-mix(in srgb, var(--color-primary) 15%, transparent)" }}>
            {!hasResults ? <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" /> : <Award size={24} className="text-[var(--color-success)]" />}
          </div>
          <h2 className="text-2xl font-bold">İstasyon {currentStationIndex + 1} — {!hasResults ? "Değerlendiriliyor..." : "Tamamlandı"}</h2>
          {caseData && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{caseData.specialty} | {caseData.difficulty}</p>}
        </div>

        {!hasResults && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="flex gap-2">
              {[0, 150, 300].map((d) => <div key={d} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-primary)", animationDelay: `${d}ms` }} />)}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">Performansınız analiz ediliyor...</p>
          </div>
        )}

        {quickSummary && (
          <>
            <div className="flex justify-center">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(quickSummary.totalScore)} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(quickSummary.totalScore / 100) * 264} 264`} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black" style={{ color: getScoreColor(quickSummary.totalScore) }}>{quickSummary.totalScore}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">/ 100</span>
                </div>
              </div>
            </div>

            <Card variant="bordered" className="p-5">
              <p className="text-sm font-bold mb-4">Yetkinlik Puanları</p>
              <div className="space-y-3">
                {SCORE_CONFIG.map((cfg) => {
                  const value = quickSummary.subscores[cfg.key];
                  return (
                    <div key={cfg.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{cfg.label}</span>
                        <span className="text-xs font-bold">{value}/{cfg.max}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / cfg.max) * 100}%`, background: cfg.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card variant="bordered" className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-success)] mb-2">Güçlü Yönler</p>
                <div className="space-y-1.5">
                  {quickSummary.strengths.map((s) => (
                    <div key={s} className="flex items-start gap-2 text-xs"><CheckCircle2 size={12} className="text-[var(--color-success)] shrink-0 mt-0.5" /><span>{s}</span></div>
                  ))}
                </div>
              </Card>
              <Card variant="bordered" className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-destructive)] mb-2">Gelişim Alanları</p>
                <div className="space-y-1.5">
                  {(quickSummary.missingCompetencies.length > 0 ? quickSummary.missingCompetencies : ["Belirgin eksik yok"]).map((s) => (
                    <div key={s} className="flex items-start gap-2 text-xs"><AlertCircle size={12} className="text-[var(--color-destructive)] shrink-0 mt-0.5" /><span>{s}</span></div>
                  ))}
                </div>
              </Card>
            </div>

            {skillGaps.length > 0 && (
              <Card variant="bordered" className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Beceri Açıkları</p>
                <div className="space-y-2">
                  {skillGaps.slice(0, 5).map((gap, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "var(--color-surface)" }}>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${gap.severity === "high" ? "bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]" : gap.severity === "medium" ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]" : "bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]"}`}>
                        {gap.severity === "high" ? "Kritik" : gap.severity === "medium" ? "Orta" : "Hafif"}
                      </span>
                      <span>{gap.competency}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {evaluationReport && (
              <Card variant="bordered" className="p-5">
                <p className="text-sm font-bold mb-3">Detaylı Rapor</p>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-text-secondary)]">{evaluationReport}</pre>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={downloadResults} className="flex-1">
                <Download size={16} className="mr-2" /> Raporu İndir
              </Button>
              <Button size="lg" onClick={goToNextStation} className="flex-[2] h-12 font-bold">
                {currentStationIndex + 1 < stationCount
                  ? <><span>Sonraki İstasyon</span><ArrowRight size={16} className="ml-2" /></>
                  : <><Award size={16} className="mr-2" /><span>Sınav Sonuçları</span></>}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     RESULTS — Final Summary
     ═══════════════════════════════════════════════════════════════ */

  if (screen === "results") {
    const avgScore = stationResults.length > 0
      ? Math.round(stationResults.reduce((s, r) => s + (r.quickSummary?.totalScore || 0), 0) / stationResults.length)
      : 0;

    const allGaps = stationResults.flatMap((s) => s.skillGaps);
    const gapCounts = allGaps.reduce<Record<string, number>>((acc, g) => { acc[g.competency] = (acc[g.competency] || 0) + 1; return acc; }, {});
    const topGaps = Object.entries(gapCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-8">
        <div className="text-center pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 60%, var(--color-secondary)))" }}>
            <Award size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold">OSCE Sınav Raporu</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{stationResults.length} istasyon tamamlandı • {selectedSpecialty} • {selectedDifficulty}</p>
        </div>

        <Card variant="elevated" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Genel Ortalama</p>
              <p className="text-5xl font-black" style={{ color: getScoreColor(avgScore) }}>{avgScore}<span className="text-xl text-[var(--color-text-muted)]">/100</span></p>
              <p className="text-sm mt-2" style={{ color: getScoreColor(avgScore) }}>
                {avgScore >= 75 ? "Başarılı performans" : avgScore >= 50 ? "Geliştirilmeli" : "Yetersiz — tekrar gerekli"}
              </p>
            </div>
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(avgScore)} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(avgScore / 100) * 264} 264`} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black" style={{ color: getScoreColor(avgScore) }}>{avgScore}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border)]" style={{ background: "var(--color-surface)" }}>
            <p className="text-sm font-bold">İstasyon Bazlı Sonuçlar</p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {stationResults.map((s, i) => {
              const score = s.quickSummary?.totalScore || 0;
              return (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                    style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{s.caseData.specialty}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">{s.caseData.chiefComplaint} • {Math.round(s.timeUsed / 60)} dk</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black" style={{ color: getScoreColor(score) }}>{score}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">/ 100</p>
                  </div>
                  <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
                    <div className="h-full rounded-full" style={{ width: `${score}%`, background: getScoreColor(score) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {stationResults.some((s) => s.quickSummary) && (
          <Card variant="bordered" className="p-5">
            <p className="text-sm font-bold mb-4">Ortalama Yetkinlik Dağılımı</p>
            <div className="space-y-3">
              {SCORE_CONFIG.map((cfg) => {
                const avg = Math.round(stationResults.reduce((sum, s) => sum + (s.quickSummary?.subscores[cfg.key] || 0), 0) / stationResults.length);
                return (
                  <div key={cfg.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{cfg.label}</span>
                      <span className="text-xs font-bold">{avg}/{cfg.max}</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(avg / cfg.max) * 100}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {topGaps.length > 0 && (
          <Card variant="bordered" className="p-5">
            <p className="text-sm font-bold mb-3">Tekrarlayan Beceri Açıkları</p>
            <div className="space-y-2">
              {topGaps.map(([comp, count]) => (
                <div key={comp} className="flex items-center gap-3 text-xs p-2 rounded-lg" style={{ background: "var(--color-surface)" }}>
                  <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: "var(--color-destructive)", color: "#fff" }}>{count}x</span>
                  <span>{comp}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={downloadResults} className="flex-1">
            <Download size={16} className="mr-2" /> Tüm Raporu İndir
          </Button>
          <Button size="lg" onClick={resetExam} className="flex-[2] h-12 font-bold">
            <RotateCcw size={16} className="mr-2" /> Yeni Sınav Başlat
          </Button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     ACTIVE EXAM — Main Station Interface
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] shrink-0"
        style={{ background: "var(--color-surface-elevated)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}>
            <Bell size={12} /> {currentStationIndex + 1}/{stationCount}
          </div>
          <div className="hidden md:flex items-center gap-0.5">
            {PHASE_ORDER.filter((p) => p !== "EVALUATION").map((p, i) => {
              const isDone = i < currentPhaseIndex;
              const isCurrent = p === phase;
              return (
                <div key={p} className="flex items-center gap-0.5">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                    style={isCurrent ? { background: "var(--color-primary)", color: "#fff" } : isDone ? { background: "color-mix(in srgb, var(--color-success) 15%, transparent)", color: "var(--color-success)" } : { color: "var(--color-text-muted)", opacity: 0.5 }}>
                    {isDone ? <CheckCircle2 size={10} /> : PHASE_ICONS[p]}
                    <span>{PHASE_LABELS[p]}</span>
                  </div>
                  {i < 3 && <ChevronRight size={10} className="text-[var(--color-text-muted)] opacity-30" />}
                </div>
              );
            })}
          </div>
          <div className="flex md:hidden items-center gap-1 text-xs">{PHASE_ICONS[phase]}<span className="font-semibold">{PHASE_LABELS[phase]}</span></div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-base font-black transition-colors ${timer.remaining <= 30 ? "animate-pulse" : ""}`}
            style={{ color: getTimerColor(timer.remaining) }}>
            <Clock size={14} /> {formatTime(timer.remaining)}
          </div>
          <button onClick={() => { if (isSpeaking) stopSpeaking(); else setTtsEnabled(!ttsEnabled); }}
            className="p-2 rounded-lg transition-colors"
            style={ttsEnabled ? { background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" } : { color: "var(--color-text-muted)" }}>
            {isSpeaking ? <Volume2 size={15} className="animate-pulse" /> : ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          {(phase === "INVESTIGATIONS" || phase === "DIAGNOSIS") && (
            <button onClick={() => setShowInvestigationPanel(!showInvestigationPanel)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={showInvestigationPanel
                ? { background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)", borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)" }
                : { borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
              <FlaskConical size={12} /><span className="hidden sm:inline">Tetkikler</span>
              {requestedInvestigations.length > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--color-primary)", color: "#fff" }}>{requestedInvestigations.length}</span>
              )}
            </button>
          )}
          <button onClick={endStation} className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-destructive)] transition-colors" title="İstasyonu Bitir"><X size={15} /></button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Patient Bar */}
          {caseData && (
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--color-border)] text-xs" style={{ background: "var(--color-surface)" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)" }}>
                  <User size={12} className="text-[var(--color-primary)]" />
                </div>
                <span className="font-semibold">{caseData.patient.name}</span>
                <span className="text-[var(--color-text-muted)]">{caseData.patient.age}y {caseData.patient.gender}</span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[var(--color-text-muted)]">
                <span>TA {caseData.patient.vitals.bp}</span>
                <span>Nabız {caseData.patient.vitals.hr}</span>
                <span>SpO2 {caseData.patient.vitals.spo2}</span>
                <span>Ateş {caseData.patient.vitals.temp}</span>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              if (m.role === "system") return (
                <div key={m.id} className="flex justify-center py-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-1 rounded-full border border-[var(--color-border)]" style={{ background: "var(--color-surface)" }}>{m.content}</span>
                </div>
              );
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
                      <User size={14} className="text-[var(--color-primary)]" />
                    </div>
                  )}
                  <div className={`max-w-[78%] ${isUser ? "text-right" : ""}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "bg-[var(--color-primary)] text-white rounded-br-sm" : "rounded-bl-sm"}`}
                      style={!isUser ? { background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" } : undefined}>
                      {m.content}
                    </div>
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}>
                      <Stethoscope size={14} className="text-[var(--color-text-muted)]" />
                    </div>
                  )}
                </div>
              );
            })}
            {isSending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)" }}>
                  <User size={14} className="text-[var(--color-primary)]" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}>
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map((d) => <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--color-primary)", opacity: 0.5, animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[var(--color-border)]" style={{ background: "var(--color-surface-elevated)" }}>
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
              {phase === "ANAMNESIS" && (
                <button onClick={advancePhase} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap shrink-0"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <Stethoscope size={12} /> Anamnez Tamam → Muayeneye Geç
                </button>
              )}
              {phase === "PHYSICAL_EXAM" && (
                <button onClick={advancePhase} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap shrink-0"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <FlaskConical size={12} /> Muayene Tamam → Tetkiklere Geç
                </button>
              )}
              {phase === "INVESTIGATIONS" && (
                <button onClick={advancePhase} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap shrink-0"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <Brain size={12} /> Tetkikler Tamam → Tanıya Geç
                </button>
              )}
              {phase === "DIAGNOSIS" && (
                <button onClick={endStation} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap shrink-0"
                  style={{ borderColor: "color-mix(in srgb, var(--color-success) 40%, transparent)", background: "color-mix(in srgb, var(--color-success) 8%, transparent)", color: "var(--color-success)" }}>
                  <Award size={12} /> İstasyonu Bitir → Değerlendir
                </button>
              )}
            </div>
            <div className="flex items-end gap-2">
              <textarea ref={inputRef}
                className="flex-1 rounded-xl py-3 pl-4 pr-3 text-sm focus:outline-none resize-none min-h-[44px] max-h-[120px] leading-relaxed"
                style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                placeholder={phase === "ANAMNESIS" ? "Hastaya soru sorun... (Enter: gönder)" : phase === "PHYSICAL_EXAM" ? "Muayene etmek istediğiniz sistemi belirtin..." : phase === "INVESTIGATIONS" ? "Tetkik isteyin veya sağ paneli kullanın..." : "Tanınızı ve tedavi planınızı sunun..."}
                value={input} rows={1}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
              <button onMouseDown={() => void startListening()} onMouseUp={stopListening} onTouchStart={() => void startListening()} onTouchEnd={stopListening}
                className="p-3 rounded-xl transition-all"
                style={isListening ? { background: "var(--color-destructive)", color: "#fff" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                title="Sesle yaz (basılı tut)">
                {isListening ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
              </button>
              <button onClick={() => sendMessage()} disabled={!input.trim() || isSending}
                className="p-3 rounded-xl text-white disabled:opacity-40 transition-all" style={{ background: "var(--color-primary)" }}>
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Investigation Panel */}
        {showInvestigationPanel && (
          <div className="w-72 border-l border-[var(--color-border)] flex flex-col overflow-hidden" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <FlaskConical size={14} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold">Tetkik İstem Paneli</span>
              </div>
              <button onClick={() => setShowInvestigationPanel(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={14} /></button>
            </div>
            {requestedInvestigations.length > 0 && (
              <div className="px-3 py-2.5 border-b border-[var(--color-border)]" style={{ background: "color-mix(in srgb, var(--color-success) 5%, transparent)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-success)] mb-2">İSTENENLER ({requestedInvestigations.length})</p>
                <div className="space-y-1">
                  {requestedInvestigations.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 size={10} className="text-[var(--color-success)] shrink-0" /><span className="truncate">{inv.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {INVESTIGATION_PRESETS.map((cat) => (
                <div key={cat.category}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-1 mb-1">{cat.category}</p>
                  <div className="space-y-0.5">
                    {cat.items.map((item) => {
                      const isReq = requestedInvestigations.some((r) => r.name === item);
                      return (
                        <button key={item} onClick={() => requestInvestigation(item)} disabled={isReq || isSending}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all"
                          style={isReq ? { background: "color-mix(in srgb, var(--color-success) 8%, transparent)", color: "var(--color-success)" } : { color: "var(--color-text-secondary)" }}>
                          {isReq && <CheckCircle2 size={10} className="inline mr-1.5" />}{item}
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
