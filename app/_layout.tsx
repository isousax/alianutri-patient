import '../global.css'
import { useEffect, useState, useCallback } from 'react'
import { Stack, router, type Href } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { asyncStoragePersister } from '../src/lib/queryPersister'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/stores/auth'
import { useNotifications } from '../src/hooks/useNotifications'
import { useReminders } from '../src/hooks/useReminders'
import { useThemeStore, useTheme } from '../src/stores/theme'
import { useOnboardingStore } from '../src/stores/onboarding'
import { useDevGamStore } from '../src/stores/devGamification'
import { SplashGate } from '../src/components/SplashGate'
import { XpToast, FeedbackOverlays } from '../src/components/ui'
import { setupNetworkMonitoring } from '../src/lib/network'
import { useOfflineQueueSync } from '../src/hooks/useOfflineQueueSync'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
    },
  },
})

// Dados clínicos/PII NÃO são persistidos em disco (AsyncStorage não é cifrado).
// Carregam do backend a cada abertura (são leves; cobertos por skeletons).
const CLINICAL_RESOURCES = new Set([
  'home', 'profile', 'diary-posts', 'diary-post', 'diary-today', 'diary-streak',
  'food-diary', 'weight-history', 'water', 'symptoms', 'evolution',
  'meal-plans', 'progress-photos', 'chat', 'weekly-adherence',
  'lab-reports',
])

const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) => {
      if (query.state.status !== 'success') return false
      const key = query.queryKey
      const resource = Array.isArray(key) && key.length > 1 ? String(key[1]) : ''
      return !CLINICAL_RESOURCES.has(resource)
    },
  },
}

// Drena a fila de mutações offline (food-diary/água) ao iniciar e ao reconectar.
function OfflineQueueSync() {
  useOfflineQueueSync()
  return null
}

// Roteia para o re-pareamento quando o servidor sinaliza PAIRING_REQUIRED
// (ex.: reset do nutri) durante o uso, mantendo o código armazenado.
function PairingGate() {
  const requiresPairing = useAuthStore((s) => s.requiresPairing)
  const accessCode = useAuthStore((s) => s.accessCode)
  useEffect(() => {
    if (requiresPairing && accessCode) {
      router.replace(`/pair?code=${encodeURIComponent(accessCode)}` as Href)
    }
  }, [requiresPairing, accessCode])
  return null
}

// (Re)agenda lembretes locais a partir do plano/meta reais. Precisa rodar
// DENTRO do QueryClientProvider porque consome o cache do React Query.
function RemindersSync() {
  useReminders()
  return null
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  const isHydrated = useAuthStore((s) => s.isHydrated)
  const hydrate = useAuthStore((s) => s.hydrate)
  const hydrateTheme = useThemeStore((s) => s.hydrateTheme)
  const hydrateOnboarding = useOnboardingStore((s) => s.hydrateOnboarding)
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated)

  useEffect(() => {
    setupNetworkMonitoring()
    hydrate()
    hydrateTheme()
    hydrateOnboarding()
    if (__DEV__) useDevGamStore.getState().hydrate()
  }, [hydrate, hydrateTheme, hydrateOnboarding])

  useNotifications()

  const theme = useTheme()
  const ready = (fontsLoaded || !!fontError) && isHydrated && onboardingHydrated
  const [splashDone, setSplashDone] = useState(false)

  // Esconde o splash nativo assim que a árvore JS pinta (o SplashGate assume).
  const onRootLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {})
  }, [ready])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }} onLayout={onRootLayout}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <StatusBar style={!splashDone ? 'light' : theme.dark ? 'light' : 'dark'} />
          {ready && (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
          )}
          {ready && <XpToast />}
          {ready && <FeedbackOverlays />}
          {ready && <OfflineQueueSync />}
          {ready && <PairingGate />}
          {ready && <RemindersSync />}
          {!splashDone && <SplashGate ready={ready} onDone={() => setSplashDone(true)} />}
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
