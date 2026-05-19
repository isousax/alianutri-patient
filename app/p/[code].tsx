import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/stores/auth'
import { validateAccessCode } from '../../src/services/api'
import { colors } from '../../src/theme/colors'

/**
 * Deep link handler: /p/:code
 *
 * Supports:
 *   - aliapatient://p/ACCESS_CODE  (custom scheme)
 *   - https://app.alianutri.com.br/p/ACCESS_CODE  (universal link)
 *
 * Validates the access code, stores it, and redirects to the main app.
 */
export default function DeepLinkHandler() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    if (!code) {
      setError('Código de acesso não encontrado no link.')
      return
    }

    let cancelled = false

    async function authenticate() {
      const result = await validateAccessCode(code!)
      if (cancelled) return

      if (!result.valid) {
        setError(result.error || 'Código inválido ou expirado')
        setTimeout(() => router.replace('/login'), 2000)
        return
      }

      setAuth(
        code!,
        {
          id: result.patient?.id || '',
          name: result.patient?.name || '',
          preferred_name: null,
          photo_url: result.patient?.photo_url || null,
        },
        {
          name: result.nutritionist?.name || '',
          photo_url: result.nutritionist?.photo_url || null,
        },
      )
      router.replace('/(tabs)')
    }

    authenticate()
    return () => { cancelled = true }
  }, [code])

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      {error ? (
        <View className="items-center px-8">
          <Text className="text-base font-sans-semibold text-red-500 text-center">{error}</Text>
          <Text className="text-xs text-slate-400 mt-2 font-sans">Redirecionando para login...</Text>
        </View>
      ) : (
        <View className="items-center">
          <ActivityIndicator size="large" color={colors.brand[600]} />
          <Text className="text-sm text-slate-400 mt-4 font-sans">Validando código de acesso...</Text>
        </View>
      )}
    </SafeAreaView>
  )
}
