// Máscaras de input "inteligentes" (o usuário digita só números; a máscara é
// aplicada progressivamente). Puras e testáveis (T-6).
//
// A UI exibe o valor mascarado no padrão brasileiro; a conversão para o formato
// que o backend espera (ex.: data ISO) é feita na hora do envio.

/** Progressivo: dígitos → `DD/MM/AAAA` (máx. 8 dígitos). */
export function maskBirthDate(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 8)
  const parts: string[] = [d.slice(0, 2)]
  if (d.length > 2) parts.push(d.slice(2, 4))
  if (d.length > 4) parts.push(d.slice(4, 8))
  return parts.join('/')
}

/**
 * `DD/MM/AAAA` (ou dígitos) → `AAAA-MM-DD`. Retorna '' se incompleto/ inválido
 * (valida dia/mês reais). O backend (`normalizeBirthDate`) exige ISO.
 */
export function brDateToISO(masked: string): string {
  const d = masked.replace(/\D/g, '')
  if (d.length !== 8) return ''
  const dd = d.slice(0, 2)
  const mm = d.slice(2, 4)
  const yyyy = d.slice(4, 8)
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return ''
  // Rejeita datas impossíveis (ex.: 31/02) checando o round-trip em UTC.
  const dt = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`)
  if (Number.isNaN(dt.getTime()) || dt.getUTCDate() !== day || dt.getUTCMonth() + 1 !== month) return ''
  return `${yyyy}-${mm}-${dd}`
}

/** Progressivo: dígitos → `000.000.000-00` (máx. 11 dígitos). */
export function maskCpf(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11)
  let out = d.slice(0, 3)
  if (d.length > 3) out += '.' + d.slice(3, 6)
  if (d.length > 6) out += '.' + d.slice(6, 9)
  if (d.length > 9) out += '-' + d.slice(9, 11)
  return out
}

/** Progressivo: dígitos → `(00) 00000-0000` (fixo 8 ou celular 9; máx. 11). */
export function maskPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
}

/** Só os dígitos de uma string (ex.: enviar CPF/telefone sem máscara). */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}
