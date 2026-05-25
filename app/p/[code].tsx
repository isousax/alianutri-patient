import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/stores/auth'
import { validateAccessCode } from '../../src/services/api'
import { useThemeColors } from '../../src/stores/theme'
import { space, typography } from '../../src/theme/tokens'

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
  const t = useThemeColors()

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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background, alignItems: 'center', justifyContent: 'center' }}>
      {error ? (
        <View style={{ alignItems: 'center', paddingHorizontal: space['3xl'] }}>
          <Text style={[typography.headingSm, { color: t.error, textAlign: 'center' }]}>{error}</Text>
          <Text style={[typography.caption, { color: t.textMuted, marginTop: space.sm }]}>Redirecionando para login...</Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color={t.primary} />
          <Text style={[typography.bodySm, { color: t.textMuted, marginTop: space.lg }]}>Validando código de acesso...</Text>
        </View>
      )}
    </SafeAreaView>
  )
}
