import { Redirect, type Href } from 'expo-router'
import { useAuthStore } from '../src/stores/auth'
import { useOnboardingStore } from '../src/stores/onboarding'

export default function Index() {
  const accessCode = useAuthStore((s) => s.accessCode)
  const requiresPairing = useAuthStore((s) => s.requiresPairing)
  const seen = useOnboardingStore((s) => s.seen)

  // Onboarding é ATIVADOR (pós-login): humaniza a nutri + ativa lembretes +
  // 1ª captura — então só entra depois de autenticar. O cast cobre o typegen
  // do expo-router até ser regenerado.
  if (!accessCode) return <Redirect href="/login" />
  if (requiresPairing) return <Redirect href={`/pair?code=${encodeURIComponent(accessCode)}` as Href} />
  if (!seen) return <Redirect href={'/onboarding' as Href} />
  return <Redirect href="/(tabs)" />
}
