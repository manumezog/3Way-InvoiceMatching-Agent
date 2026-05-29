export type Difficulty = 'easy' | 'medium' | 'hard'
export type PdfVariant = 'clean' | 'scanned' | 'photo' | 'handwritten' | 'crumpled'
export type GroundTruthStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

export interface StaticScenario {
  id: string
  title: string
  difficulty: Difficulty
  skill_tag: string
  pdf_variant: PdfVariant
  vendor: string
  invoice_number: string
  ground_truth: GroundTruthStatus
  flag_reason?: string
}

export const STATIC_SCENARIOS: StaticScenario[] = [
  {
    id: 'scenario-01',
    title: 'Clean Digital Invoice',
    difficulty: 'easy',
    skill_tag: 'Baseline',
    pdf_variant: 'clean',
    vendor: 'Apex Logistics',
    invoice_number: 'APX-INV-2024-0391',
    ground_truth: 'APPROVED',
  },
  {
    id: 'scenario-02',
    title: 'Phone-Photo Scan',
    difficulty: 'medium',
    skill_tag: 'Vision OCR',
    pdf_variant: 'photo',
    vendor: 'Northwind Components',
    invoice_number: 'NWC-2024-00892',
    ground_truth: 'APPROVED',
  },
  {
    id: 'scenario-03',
    title: 'Fuzzy Vendor Name',
    difficulty: 'medium',
    skill_tag: 'Fuzzy Matching',
    pdf_variant: 'clean',
    vendor: 'ACME Corp.',
    invoice_number: 'ACME-24-7741',
    ground_truth: 'APPROVED',
    flag_reason: 'Low-confidence match',
  },
  {
    id: 'scenario-04',
    title: 'Partial Shortage',
    difficulty: 'medium',
    skill_tag: 'Multi-Line Reasoning',
    pdf_variant: 'clean',
    vendor: 'Crestline Supply',
    invoice_number: 'CSP-2024-2201',
    ground_truth: 'FLAGGED',
    flag_reason: 'SHORTAGE',
  },
  {
    id: 'scenario-05',
    title: 'Foreign Currency Invoice',
    difficulty: 'hard',
    skill_tag: 'FX Conversion',
    pdf_variant: 'clean',
    vendor: 'EuroTech GmbH',
    invoice_number: 'ET-RE-2024-0088',
    ground_truth: 'FLAGGED',
    flag_reason: 'FX_CONVERSION',
  },
  {
    id: 'scenario-06',
    title: 'Handwritten Annotation',
    difficulty: 'hard',
    skill_tag: 'Vision + Judgment',
    pdf_variant: 'handwritten',
    vendor: 'Pinnacle Parts',
    invoice_number: 'PNP-INV-1047',
    ground_truth: 'ESCALATED',
  },
  {
    id: 'scenario-07',
    title: 'Duplicate Invoice',
    difficulty: 'medium',
    skill_tag: 'Fraud Detection',
    pdf_variant: 'clean',
    vendor: 'Apex Logistics',
    invoice_number: 'APX-INV-2024-0391',
    ground_truth: 'FLAGGED',
    flag_reason: 'DUPLICATE',
  },
  {
    id: 'scenario-08',
    title: 'Unauthorized Line Items',
    difficulty: 'medium',
    skill_tag: 'Unauthorized Items',
    pdf_variant: 'clean',
    vendor: 'Ironstone Trading',
    invoice_number: 'IRT-2024-0551',
    ground_truth: 'FLAGGED',
    flag_reason: 'UNAUTHORIZED_ITEMS',
  },
  {
    id: 'scenario-09',
    title: 'Tax Calculation Error',
    difficulty: 'medium',
    skill_tag: 'Arithmetic Reasoning',
    pdf_variant: 'scanned',
    vendor: 'Meridian Supplies',
    invoice_number: 'MER-INV-7734',
    ground_truth: 'FLAGGED',
    flag_reason: 'TAX_MISMATCH',
  },
  {
    id: 'scenario-10',
    title: 'Price Gouging',
    difficulty: 'easy',
    skill_tag: 'Price Mismatch',
    pdf_variant: 'clean',
    vendor: 'Crestline Supply',
    invoice_number: 'CSP-2024-2267',
    ground_truth: 'FLAGGED',
    flag_reason: 'PRICE_MISMATCH',
  },
  {
    id: 'scenario-11',
    title: 'Near-Duplicate Vendor',
    difficulty: 'hard',
    skill_tag: 'Anti-Fraud Logic',
    pdf_variant: 'crumpled',
    vendor: 'Apax Logistics Inc.',
    invoice_number: 'APX-INV-2024-0412',
    ground_truth: 'ESCALATED',
  },
  {
    id: 'scenario-12',
    title: 'Late Delivery Flag',
    difficulty: 'easy',
    skill_tag: 'Timeliness Check',
    pdf_variant: 'clean',
    vendor: 'Northwind Components',
    invoice_number: 'NWC-2024-01105',
    ground_truth: 'APPROVED',
  },
]
