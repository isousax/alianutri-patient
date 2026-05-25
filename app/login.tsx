import { useState } from 'react'
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { KeyRound, ArrowRight, ShieldCheck } from 'lucide-react-native'
import { Image } from 'expo-image'
import { useAuthStore } from '../src/stores/auth'
import { validateAccessCode } from '../src/services/api'
import { useThemeColors } from '../src/stores/theme'
import { shadows, radius, space, typography } from '../src/theme/tokens'

export default function LoginScreen() {
  const t = useThemeColors()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  async function handleLogin() {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Digite o código de acesso')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await validateAccessCode(trimmed)
      if (!result.valid) {
        setError(result.error || 'Código inválido ou expirado')
        return
      }

      setAuth(
        trimmed,
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Código inválido ou expirado'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A2E1A' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* ── Header ── */}
          <View style={{ alignItems: 'center', paddingTop: space['6xl'], paddingBottom: space['4xl'] }}>
            <Animated.View entering={FadeInDown.duration(600).delay(200)} style={{ alignItems: 'center' }}>
              <Image
                source={require('../assets/logoBlack.svg')}
                style={{ width: 160, height: 48, tintColor: '#fff', marginBottom: space.xl }}
                contentFit="contain"
              />
              <Text style={[typography.displayMd, { color: '#ffffff' }]}>
                AliaNutri
              </Text>
              <Text style={[typography.bodyMd, { color: 'rgba(255,255,255,0.5)', marginTop: space.xs }]}>
                Seu acompanhamento nutricional
              </Text>
            </Animated.View>
          </View>

          {/* ── Form card ── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            style={{
              flex: 1,
              backgroundColor: t.background,
              paddingHorizontal: space['3xl'],
              paddingTop: space['4xl'],
              borderTopLeftRadius: radius['2xl'] + 8,
              borderTopRightRadius: radius['2xl'] + 8,
            }}
          >
            <Text style={[typography.displaySm, { color: t.text, marginBottom: space.xs }]}>
              Bem-vindo!
            </Text>
            <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space['3xl'] }]}>
              Digite o código de acesso fornecido pelo seu nutricionista.
            </Text>

            {/* Input */}
            <View style={{ marginBottom: space.xl }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: t.surfaceSecondary,
                borderRadius: radius.lg,
                paddingHorizontal: space.lg,
                borderWidth: 1,
                borderColor: error ? t.error : t.borderLight,
              }}>
                <KeyRound size={18} color={error ? t.error : t.textMuted} />
                <TextInput
                  value={code}
                  onChangeText={(v) => { setCode(v); setError('') }}
                  placeholder="Código de acesso"
                  placeholderTextColor={t.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    typography.bodyLg,
                    {
                      flex: 1,
                      marginLeft: space.md,
                      paddingVertical: space.lg,
                      color: t.text,
                    },
                  ]}
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
              </View>
              {error ? (
                <Text style={[typography.caption, { color: t.error, marginTop: space.sm, marginLeft: 4 }]}>{error}</Text>
              ) : null}
            </View>

            {/* Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: space.lg,
                borderRadius: radius.lg,
                backgroundColor: loading ? t.primaryMuted : t.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
                ...shadows.glow(t.primary),
              })}
            >
              {loading ? (
                <ActivityIndicator color={t.primaryFg} />
              ) : (
                <>
                  <Text style={[typography.labelLg, { color: t.primaryFg, marginRight: space.sm }]}>Entrar</Text>
                  <ArrowRight size={18} color={t.primaryFg} />
                </>
              )}
            </Pressable>

            {/* Trust badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: space['3xl'],
            }}>
              <ShieldCheck size={14} color={t.textMuted} />
              <Text style={[typography.caption, { color: t.textMuted, marginLeft: 6 }]}>
                Acesso seguro e criptografado
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
