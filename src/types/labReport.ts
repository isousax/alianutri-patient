import type { LabRangeStatus } from './portal'

// Novo sistema de laudos (o paciente envia o documento; o nutri extrai/confirma).
// Enquadramento NEUTRO: a interpretação é sempre com o nutricionista.

export type PortalLabReportStatus =
  | 'draft'
  | 'processing'
  | 'extracted'
  | 'needs_review'
  | 'confirmed'
  | 'needs_manual'
  | 'failed'

export interface PortalLabReportSummary {
  id: string
  status: PortalLabReportStatus
  source: string
  lab_name: string | null
  collected_at: string | null
  result_count: number
  created_at: string
}

export interface PortalLabReportsResponse {
  reports: PortalLabReportSummary[]
}

export interface PortalLabReportResult {
  id: string
  analyte_name: string
  value: number | null
  value_text: string | null
  unit: string | null
  reference_low: number | null
  reference_high: number | null
  range_status: LabRangeStatus
}

export interface PortalLabReportDocument {
  id: string
  original_name: string | null
  mime_type: string
  size_bytes: number
  uploaded_by_patient: boolean
  url: string
  created_at: string
}

export interface PortalLabReportDetail {
  id: string
  status: PortalLabReportStatus
  lab_name: string | null
  collected_at: string | null
  created_at: string
  results: PortalLabReportResult[]
  documents: PortalLabReportDocument[]
}

export interface PortalLabReportDetailResponse {
  report: PortalLabReportDetail
}

export interface UploadLabReportResponse {
  report_id: string
  document_id: string
  message: string
}
