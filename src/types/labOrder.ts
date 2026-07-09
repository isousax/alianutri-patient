// Pedidos de exames que o nutricionista SOLICITOU (somente leitura no app).
// O paciente vê o que precisa fazer e envia o resultado em "Exames".

export type PortalLabOrderStatus = 'sent' | 'partially_fulfilled'

export interface PortalLabOrderItem {
  display_name: string
  category: string | null
  item_notes: string | null
  kind: string
}

export interface PortalLabOrder {
  id: string
  status: PortalLabOrderStatus | string
  requested_date: string
  notes: string | null
  created_at: string
  items: PortalLabOrderItem[]
}

export interface PortalLabOrdersResponse {
  orders: PortalLabOrder[]
}
