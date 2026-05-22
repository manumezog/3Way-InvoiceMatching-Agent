import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireGeminiKey } from '@/lib/env'

let client: GoogleGenerativeAI | null = null

export function getGemini(): GoogleGenerativeAI {
  if (!client) client = new GoogleGenerativeAI(requireGeminiKey())
  return client
}

export function getFlashModel() {
  return getGemini().getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
}

export function getEmbeddingModel() {
  return getGemini().getGenerativeModel({ model: 'gemini-embedding-001' })
}
