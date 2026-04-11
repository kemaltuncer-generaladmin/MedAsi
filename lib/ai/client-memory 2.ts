"use client";

export type StoredAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type StoredAssistantConversation = {
  id: string;
  title: string;
  summary: string;
  module?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  messages: StoredAssistantMessage[];
};

export type StoredAiBriefing = {
  date: string;
  content: string;
  goals: Array<{ id: string; text: string; done: boolean }>;
  focusLabel?: string;
};

export type StoredAiPlan = {
  weekKey: string;
  createdAt: string;
  sourceSummary: string;
  markdown: string;
};

const KEYS = {
  assistantConversations: "medasi_ai_assistant_conversations_v2",
  aiBriefing: "medasi_ai_briefing_v2",
  aiPlan: "medasi_ai_plan_v2",
};

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage doluysa sessizce devam et.
  }
}

export function getAssistantConversations() {
  return safeRead<StoredAssistantConversation[]>(KEYS.assistantConversations, []);
}

export function saveAssistantConversations(conversations: StoredAssistantConversation[]) {
  safeWrite(KEYS.assistantConversations, conversations);
}

export function upsertAssistantConversation(conversation: StoredAssistantConversation) {
  const current = getAssistantConversations();
  const next = [conversation, ...current.filter((item) => item.id !== conversation.id)].slice(0, 20);
  saveAssistantConversations(next);
  return next;
}

export function getStoredBriefing() {
  return safeRead<StoredAiBriefing | null>(KEYS.aiBriefing, null);
}

export function saveStoredBriefing(briefing: StoredAiBriefing) {
  safeWrite(KEYS.aiBriefing, briefing);
}

export function getStoredPlan() {
  return safeRead<StoredAiPlan | null>(KEYS.aiPlan, null);
}

export function saveStoredPlan(plan: StoredAiPlan) {
  safeWrite(KEYS.aiPlan, plan);
}

export function getTodayKey(timeZone = "Europe/Istanbul") {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function getWeekKey(timeZone = "Europe/Istanbul") {
  const date = new Date(
    new Date().toLocaleString("en-US", {
      timeZone,
    }),
  );
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

export function toStoredTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
