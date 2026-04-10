export const MODULES = [
  {
    id: "ai-diagnosis",
    name: "AI Tanı",
    description: "Semptom bazlı tanı yardımcısı",
    aiModel: "FAST",
  },
  {
    id: "case-rpg",
    name: "Vaka RPG",
    description: "İnteraktif vaka simülasyonu",
    aiModel: "FAST",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Klinik komut terminali",
    aiModel: "FAST",
  },
  {
    id: "ai-assistant",
    name: "AI Asistan",
    description: "Genel medikal asistan",
    aiModel: "EFFICIENT",
  },
  {
    id: "daily-briefing",
    name: "Günlük Brifing",
    description: "Günlük medikal özet",
    aiModel: "EFFICIENT",
  },
  {
    id: "patients",
    name: "Hastalar",
    description: "Hasta yönetimi",
    aiModel: null,
  },
  { id: "cases", name: "Vakalar", description: "Vaka takibi", aiModel: null },
  { id: "notes", name: "Notlar", description: "Klinik notlar", aiModel: null },
  {
    id: "pomodoro",
    name: "Pomodoro",
    description: "Çalışma zamanlayıcısı",
    aiModel: null,
  },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
