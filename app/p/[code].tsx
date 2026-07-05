import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router, type Href } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
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
  const t = useThemeColors()

  useEffect(() => {
    if (!code) {
      setError('Código de acesso não encontrado no link.')
      return
    }

    // S-2: o pareamento (start/verify) valida o código e vincula o device.
    router.replace(`/pair?code=${encodeURIComponent(code)}` as Href)
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
