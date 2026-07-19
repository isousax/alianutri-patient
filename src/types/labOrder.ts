// Solicitação de exames = documento oficial emitido (type='lab_order'). O app
// lista os PDFs; o paciente baixa/imprime para levar ao laboratório. O envio de
// resultados (laudos) é um fluxo separado, em "Exames".

export interface PortalLabOrder {
  id: string
  name: string
  created_at: string
  shared_at: string | null
}

export interface PortalLabOrdersResponse {
  orders: PortalLabOrder[]
}
