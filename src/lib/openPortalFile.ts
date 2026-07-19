import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { portalFileUrl } from './diaryPhoto'
import { toast } from '../stores/toast'

/**
 * Baixa um PDF do portal (path relativo, ex.: `/documents/:id/file`) autenticado
 * pela sessão device-bound e abre o share sheet nativo — o paciente pode salvar,
 * imprimir ou enviar (ex.: levar a Solicitação de Exames ao laboratório).
 */
export async function openPortalPdf(opts: {
  accessCode: string | null
  sessionToken: string | null
  path: string
  filename: string
}): Promise<void> {
  try {
    const url = portalFileUrl(opts.accessCode, opts.path)
    const safe = (opts.filename || 'documento').replace(/[^\w.\-]+/g, '_')
    const name = safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`
    const target = (FileSystem.cacheDirectory ?? '') + name
    const { uri, status } = await FileSystem.downloadAsync(url, target, {
      headers: opts.sessionToken ? { 'X-Patient-Session': opts.sessionToken } : undefined,
    })
    if (status !== 200) throw new Error(`status ${status}`)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
    } else {
      toast.error('Compartilhamento indisponível neste dispositivo.')
    }
  } catch {
    toast.error('Não foi possível abrir o PDF.')
  }
}
