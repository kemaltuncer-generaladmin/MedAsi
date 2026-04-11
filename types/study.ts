export type StudyQuestionDifficulty = "Kolay" | "Orta" | "Zor";

export interface WrongQuestionEntry {
  id: string;
  sourceQuestionId?: string | null;
  subject: string;
  difficulty: StudyQuestionDifficulty;
  questionText: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number;
  explanation: string | null;
  learned: boolean;
  addedAt: string;
  learnedAt: string | null;
}

export interface FlashcardCard {
  id: string;
  front: string;
  back: string;
  rating: "unknown" | "hard" | "known";
  nextReview: string | null;
  lastStudiedAt: string | null;
  createdAt: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  subject: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  cards: FlashcardCard[];
}

export interface StudyPlan {
  id: string;
  weekKey: string;
  sourceSummary: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialSlideInsight {
  id: string;
  slideNo: number;
  title: string | null;
  extractedText: string;
  textDensity: number;
  qualityScore: number;
  hasVisualGap: boolean;
  duplicateRisk: boolean;
  keyPoints: string[];
  warnings: string[];
}

export interface MaterialQualityReport {
  summary: string;
  qualityScore: number;
  extractionConfidence: number;
  slideCount: number;
  chunkCoverage: number;
  readabilityScore: number;
  densityScore: number;
  examRelevanceScore: number;
  clinicalRelevanceScore: number;
  flashcardReadiness: number;
  questionReadiness: number;
  strengths: string[];
  issues: string[];
  recommendations: string[];
}

export interface StudyRecommendation {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  score: number;
  createdAt: string;
}

export interface StudyWorkspace {
  focus: {
    weakAreas: string[];
    strongAreas: string[];
    motivationScore: number | null;
    accuracy: number;
  };
  counts: {
    wrongQuestions: number;
    flashcardDecks: number;
    flashcardsDue: number;
    readyMaterials: number;
    activePlan: boolean;
  };
  plan: StudyPlan | null;
  recommendations: StudyRecommendation[];
  highlights: Array<{
    label: string;
    value: string;
    href: string;
    tone: "primary" | "success" | "warning";
  }>;
  materials: Array<{
    id: string;
    name: string;
    status: string;
    branch: string;
    qualityScore: number | null;
    slideCount: number | null;
    readyForQuestions: boolean;
    readyForFlashcards: boolean;
  }>;
}
