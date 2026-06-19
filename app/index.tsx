import { Redirect, type Href } from 'expo-router'
import { useAuthStore } from '../src/stores/auth'
import { useOnboardingStore } from '../src/stores/onboarding'

export default function Index() {
  const accessCode = useAuthStore((s) => s.accessCode)
  const seen = useOnboardingStore((s) => s.seen)

  // `/onboarding` existe como rota; o cast cobre o typegen do expo-router
  // até ser regenerado no próximo start/build.
  if (!seen) return <Redirect href={'/onboarding' as Href} />
  if (accessCode) return <Redirect href="/(tabs)" />
  return <Redirect href="/login" />
}
