export type ApiSuccess<T> = {
  data: T
  error: null
}

export type ApiError = {
  data: null
  error: string
  status: number
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type AIModel = 'FAST' | 'EFFICIENT'

export interface AIChatRequest {
  message: string
  model?: AIModel
  caseId?: string
  systemPrompt?: string
}

export interface AIChatResponse {
  response: {
    type: 'text'
    text: string
  }
}
