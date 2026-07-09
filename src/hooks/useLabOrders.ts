import { useQuery } from '@tanstack/react-query'
import { portalApi } from '../services/api'
import type { PortalLabOrdersResponse } from '../types/labOrder'

// Pedidos de exames ativos (status 'sent'/'partially_fulfilled') que o nutri
// solicitou. Somente leitura: o paciente faz os exames e envia o laudo em Exames.
export function useLabOrders() {
  return useQuery({
    queryKey: ['portal', 'lab-orders'],
    queryFn: () => portalApi.get<PortalLabOrdersResponse>('/lab-orders'),
  })
}
