import { Linking, Platform } from 'react-native'
import type { AppointmentStatus } from '../types/portal'

/**
 * Abre o link da reunião online (Google Meet / Zoom / WhatsApp / outro).
 * Retorna false se não houver link ou se o sistema não conseguir abrir.
 */
export async function openMeetingLink(url: string | null | undefined): Promise<boolean> {
  if (!url) return false
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Abre um endereço no app de mapas nativo (Apple Maps no iOS, Google Maps no
 * Android/web). Usa o esquema universal do Google Maps como fallback.
 */
export async function openAddressInMaps(address: string | null | undefined): Promise<boolean> {
  if (!address) return false
  const q = encodeURIComponent(address)
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

export interface AppointmentStatusMeta {
  label: string
  tone: 'primary' | 'success' | 'muted' | 'warning' | 'error'
}

/** Rótulo + tom visual para cada estado de consulta exibido ao paciente. */
export function appointmentStatusMeta(status: AppointmentStatus): AppointmentStatusMeta {
  switch (status) {
    case 'scheduled':
      return { label: 'Agendada', tone: 'primary' }
    case 'rescheduled':
      return { label: 'Reagendada', tone: 'warning' }
    case 'completed':
      // "Realizada" veste a MARCA (tone primary), não o verde de `success` — uma
      // conclusão positiva deve parecer do tema atual (ex.: rosa no Rosé), nunca de outro.
      return { label: 'Realizada', tone: 'primary' }
    case 'no_show':
      return { label: 'Não compareceu', tone: 'error' }
    case 'canceled':
      return { label: 'Cancelada', tone: 'muted' }
    case 'pending_approval':
      return { label: 'Aguardando confirmação', tone: 'warning' }
    default:
      return { label: status, tone: 'muted' }
  }
}

/** Uma consulta é "ativa/futura" quando está agendada/reagendada e ainda não passou. */
export function isUpcoming(status: AppointmentStatus, startsAt: string): boolean {
  const active = status === 'scheduled' || status === 'rescheduled'
  return active && new Date(startsAt).getTime() > Date.now()
}
