// Stub de `expo-haptics` para os testes (módulo nativo não roda em Node).
// Registra as chamadas em `calls` e permite simular rejeição via `__reset(true)`.

export const ImpactFeedbackStyle = { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' } as const
export const NotificationFeedbackType = { Success: 'Success', Warning: 'Warning', Error: 'Error' } as const

export const calls: string[] = []
let shouldReject = false

export function __reset(reject = false): void {
  calls.length = 0
  shouldReject = reject
}

const result = (): Promise<void> =>
  shouldReject ? Promise.reject(new Error('no haptics engine')) : Promise.resolve()

export function selectionAsync(): Promise<void> {
  calls.push('selection')
  return result()
}

export function impactAsync(style: string): Promise<void> {
  calls.push(`impact:${style}`)
  return result()
}

export function notificationAsync(type: string): Promise<void> {
  calls.push(`notify:${type}`)
  return result()
}
