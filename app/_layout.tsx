import '../global.css'
import { useEffect, useState, useCallback } from 'react'
import { Stack } from 'expo-router'
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
import { useThemeStore, useTheme } from '../src/stores/theme'
import { useOnboardingStore } from '../src/stores/onboarding'
import { SplashGate } from '../src/components/SplashGate'

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

const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
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
    hydrate()
    hydrateTheme()
    hydrateOnboarding()
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
          {!splashDone && <SplashGate ready={ready} onDone={() => setSplashDone(true)} />}
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
