import { create } from 'zustand'

export type StudyLevel = 'ogrenci_1' | 'ogrenci_2' | 'ogrenci_3' | 'ogrenci_4' | 'ogrenci_5' | 'ogrenci_6' | 'intern' | 'asistan' | 'uzman' | 'pratisyen' | 'diger' | ''
export type LearningStyle = 'visual' | 'reading' | 'practice' | 'mixed' | ''
export type StudyTime = 'sabah' | 'oglen' | 'aksam' | 'gece' | 'esnek' | ''
export type SubjectLevel = 'cok_zayif' | 'zayif' | 'orta' | 'iyi' | 'cok_iyi'

export interface ProfileData {
  displayName: string
  university: string
  level: StudyLevel
  expectedGradYear: string
  // Çalışma profili
  dailyStudyHours: number
  preferredStudyTime: StudyTime
  learningStyle: LearningStyle
  dailyQuestionTarget: number
  dailyFlashcardTarget: number
  // Konu değerlendirme
  subjectLevels: Record<string, SubjectLevel>
  // Sınav hedefi
  tusTargetDate: string
  tusTargetScore: number | null
}

interface OnboardingState {
  currentStep: number
  goals: string[]
  interests: string[]
  notifications: { email: boolean; push: boolean; sms: boolean }
  profile: ProfileData
  isDirty: boolean
  setStep: (step: number) => void
  setGoals: (goals: string[]) => void
  setInterests: (interests: string[]) => void
  setNotifications: (prefs: OnboardingState['notifications']) => void
  setProfile: (profile: Partial<ProfileData>) => void
  markDirty: (dirty: boolean) => void
  reset: () => void
}

const defaultProfile: ProfileData = {
  displayName: '',
  university: '',
  level: '',
  expectedGradYear: '',
  dailyStudyHours: 4,
  preferredStudyTime: '',
  learningStyle: '',
  dailyQuestionTarget: 40,
  dailyFlashcardTarget: 20,
  subjectLevels: {},
  tusTargetDate: '',
  tusTargetScore: null,
}

const initialState = {
  currentStep: 1,
  goals: [] as string[],
  interests: [] as string[],
  notifications: { email: true, push: false, sms: false },
  profile: defaultProfile,
  isDirty: false,
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step, isDirty: true }),
  setGoals: (goals) => set({ goals, isDirty: true }),
  setInterests: (interests) => set({ interests, isDirty: true }),
  setNotifications: (notifications) => set({ notifications, isDirty: true }),
  setProfile: (partial) => set((state) => ({ profile: { ...state.profile, ...partial }, isDirty: true })),
  markDirty: (isDirty) => set({ isDirty }),
  reset: () => set(initialState),
}))
