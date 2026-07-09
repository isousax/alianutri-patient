import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '../services/api'
import { compressImage } from '../lib/compressImage'
import type {
  PortalLabReportsResponse,
  PortalLabReportDetailResponse,
  UploadLabReportResponse,
} from '../types/labReport'

// Novo sistema de laudos: o paciente envia o documento (foto/PDF); o nutri
// extrai (OCR) e confirma na web. Resultados confirmados voltam para o app.

export function useLabReports() {
  return useQuery({
    queryKey: ['portal', 'lab-reports'],
    queryFn: () => portalApi.get<PortalLabReportsResponse>('/lab-reports'),
  })
}

export function useLabReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['portal', 'lab-reports', reportId],
    queryFn: () => portalApi.get<PortalLabReportDetailResponse>(`/lab-reports/${reportId}`),
    enabled: !!reportId,
  })
}

/**
 * Envia um documento. Sem `reportId` cria um novo laudo; com `reportId` anexa a
 * um laudo existente (ainda não confirmado). Imagens são comprimidas p/ JPEG.
 */
export function useUploadLabReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { uri: string; mimeType: string; name: string; reportId?: string }) => {
      const isImage = input.mimeType.startsWith('image/')
      const uri = isImage ? await compressImage(input.uri) : input.uri
      const fd = new FormData()
      fd.append('file', {
        uri,
        type: isImage ? 'image/jpeg' : input.mimeType,
        name: isImage ? 'laudo.jpg' : input.name,
      } as unknown as Blob)
      if (input.reportId) fd.append('report_id', input.reportId)
      return portalApi.upload<UploadLabReportResponse>('/lab-reports/upload', fd)
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['portal', 'lab-reports'] })
      if (vars.reportId) qc.invalidateQueries({ queryKey: ['portal', 'lab-reports', vars.reportId] })
    },
  })
}

export function useDeleteLabReportDocument(reportId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      portalApi.delete<{ message: string }>(`/lab-reports/${reportId}/documents/${documentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'lab-reports', reportId] })
      qc.invalidateQueries({ queryKey: ['portal', 'lab-reports'] })
    },
  })
}
