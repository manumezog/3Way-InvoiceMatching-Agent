import { getEmbeddingModel } from '@/lib/agent/gemini'

export interface VendorMatchResult {
  similarity: number
  isMatch: boolean
  isSuspicious: boolean
  confidence: number
  detail: string
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i]!, 0)
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  if (magA === 0 || magB === 0) return 0
  return dot / (magA * magB)
}

async function embed(text: string): Promise<number[]> {
  const model = getEmbeddingModel()
  const result = await model.embedContent(text)
  return result.embedding.values
}

export async function fuzzyMatchVendor(
  invoiceVendor: string,
  poVendor: string,
): Promise<VendorMatchResult> {
  // Exact match shortcut
  if (invoiceVendor.trim().toLowerCase() === poVendor.trim().toLowerCase()) {
    return { similarity: 1, isMatch: true, isSuspicious: false, confidence: 1, detail: 'Exact match' }
  }

  const [embA, embB] = await Promise.all([embed(invoiceVendor), embed(poVendor)])
  const similarity = cosineSimilarity(embA, embB)

  // Very high similarity but not exact → suspicious (near-duplicate vendor fraud)
  if (similarity >= 0.97) {
    return {
      similarity, isMatch: true, isSuspicious: true, confidence: 0.72,
      detail: `Near-identical vendor names (similarity ${similarity.toFixed(3)}) — possible fraud or typo. Manual review recommended.`,
    }
  }

  // High similarity → likely abbreviation/alias (e.g. "ACME Corp." vs "Acme Corporation")
  if (similarity >= 0.88) {
    return {
      similarity, isMatch: true, isSuspicious: false, confidence: 0.82,
      detail: `Vendor names differ but are likely the same entity (similarity ${similarity.toFixed(3)}).`,
    }
  }

  // Medium similarity → uncertain
  if (similarity >= 0.70) {
    return {
      similarity, isMatch: false, isSuspicious: true, confidence: 0.55,
      detail: `Vendor name mismatch — similarity ${similarity.toFixed(3)} is below threshold. Could not confidently link invoice vendor to PO vendor.`,
    }
  }

  // Low similarity → clear mismatch
  return {
    similarity, isMatch: false, isSuspicious: false, confidence: 0.95,
    detail: `Vendor mismatch — "${invoiceVendor}" does not match PO vendor "${poVendor}" (similarity ${similarity.toFixed(3)}).`,
  }
}
