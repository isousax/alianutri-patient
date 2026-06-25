import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/**
 * Liga o monitoramento de rede do react-query ao NetInfo (quando instalado).
 * Graceful: sem a lib, mantém o default do react-query (sempre online).
 * Chamar uma vez no _layout. O `require` dinâmico evita quebrar a tipagem
 * antes do `npm install --legacy-peer-deps` (que adiciona o pacote).
 */
export function setupNetworkMonitoring(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-community/netinfo')
    const NetInfo = mod?.default ?? mod
    if (!NetInfo?.addEventListener) return
    onlineManager.setEventListener((setOnline: (online: boolean) => void) =>
      NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
        setOnline(state.isConnected !== false)
      }),
    )
  } catch {
    // Pacote ausente ainda — segue com o default (online).
  }
}

/** Status de conexão reativo. Default `true` até o NetInfo reportar. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  )
}
