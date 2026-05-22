export interface EscalationResult {
  escalated: true
  reason: string
  explanation: string
}

export function escalate(reason: string, detail: string): EscalationResult {
  return {
    escalated: true,
    reason,
    explanation: `This invoice has been escalated for human review: ${detail} Automatic processing was halted pending manual verification.`,
  }
}
