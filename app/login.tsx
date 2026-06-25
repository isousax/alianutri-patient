import { useState } from 'react'
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { KeyRound, ArrowRight, ShieldCheck } from 'lucide-react-native'
import { useAuthStore } from '../src/stores/auth'
import { validateAccessCode } from '../src/services/api'
import { useThemeColors, useTheme } from '../src/stores/theme'
import { shadows, radius, space, typography, gradients } from '../src/theme/tokens'
import { AliaMark, AliaWordmark, GlowBlob } from '../src/components/Brand'

const { width: SCREEN_W } = Dimensions.get('window')

export default function LoginScreen() {
  const t = useThemeColors()
  const theme = useTheme()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  const canSubmit = code.trim().length > 0 && !loading

  // Foco animado via SharedValue — NÃO causa re-render (evita o loop FOCUS/BLUR).
  const focusedSv = useSharedValue(0)
  const inputWrapStyle = useAnimatedStyle(() => ({
    borderColor: error ? t.error : interpolateColor(focusedSv.value, [0, 1], [t.borderLight, t.primary]),
  }))

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
        setError(result.error || 'Código inválido ou expirado')
        return
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      const msg = e instanceof Error ? e.message : 'Código inválido ou expirado'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.dark ? gradients.night[1] : gradients.brand[0] }}>
      <LinearGradient colors={theme.dark ? gradients.night : gradients.brand} start={{ x: 0.1, y: 0 }} end={{ x: 0.95, y: 0.8 }} style={{ flex: 1 }}>
        {/* blobs de profundidade no hero */}
        <GlowBlob size={SCREEN_W * 1.1} color={gradients.brand[1]} opacity={theme.dark ? 0.22 : 0.34} style={{ position: 'absolute', top: -SCREEN_W * 0.4, left: -SCREEN_W * 0.3 }} />
        <GlowBlob size={SCREEN_W * 0.85} color={gradients.premium[1]} opacity={theme.dark ? 0.24 : 0.2} style={{ position: 'absolute', top: SCREEN_W * 0.1, right: -SCREEN_W * 0.35 }} />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* ── Hero ── */}
            <View style={{ alignItems: 'center', paddingTop: space['5xl'], paddingBottom: space['4xl'] }}>
              <View style={{ alignItems: 'center' }}>
                <AliaMark size={88} glass glassTint="rgba(255,255,255,0.18)" leafFrom="#FFFFFF" leafTo="#D1FAE5" style={{ marginBottom: space.xl }} />
                <AliaWordmark textOnly size={36} color={t.primaryFg} />
                <Text style={[typography.bodyMd, { color: t.primaryFg, opacity: 0.66, marginTop: space.sm }]}>
                  Seu acompanhamento nutricional
                </Text>
              </View>
            </View>

            {/* ── Form card (folha branca subindo) ── */}
            <View
              style={{
                flex: 1,
                backgroundColor: t.background,
                paddingHorizontal: space['3xl'],
                paddingTop: space['4xl'],
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                ...shadows.xl,
              }}
            >
              {/* grabber sutil */}
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: radius.full, backgroundColor: t.borderLight, marginBottom: space['2xl'] }} />

              <Text style={[typography.displaySm, { color: t.text, marginBottom: space.xs }]}>
                Bem-vindo!
              </Text>
              <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space['3xl'] }]}>
                Digite o código de acesso fornecido pelo seu nutricionista.
              </Text>

              {/* Input */}
              <View style={{ marginBottom: space.xl }}>
                <Animated.View style={[{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: t.surfaceSecondary,
                  borderRadius: radius.lg,
                  paddingHorizontal: space.lg,
                  borderWidth: 1.5,
                }, inputWrapStyle]}>
                  <KeyRound size={18} color={error ? t.error : t.textMuted} />
                  <TextInput
                    value={code}
                    onChangeText={(v) => { setCode(v); if (error) setError('') }}
                    placeholder="Código de acesso"
                    placeholderTextColor={t.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Código de acesso"
                    onFocus={() => { focusedSv.value = withTiming(1, { duration: 150 }) }}
                    onBlur={() => { focusedSv.value = withTiming(0, { duration: 150 }) }}
                    style={[
                      typography.bodyLg,
                      { flex: 1, marginLeft: space.md, paddingVertical: space.lg, color: t.text },
                    ]}
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                </Animated.View>
                {error ? (
                  <Text style={[typography.caption, { color: t.error, marginTop: space.sm, marginLeft: 4 }]}>{error}</Text>
                ) : null}
              </View>

              {/* Button (gradiente + glow) */}
              <Pressable
                onPress={handleLogin}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Entrar com o código de acesso"
                style={({ pressed }) => ({
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                  opacity: pressed ? 0.95 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                  ...(canSubmit ? shadows.glow(t.primary) : shadows.none),
                })}
              >
                <LinearGradient
                  colors={canSubmit ? gradients.brand : [t.primaryMuted, t.primaryMuted]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}
                >
                  {loading ? (
                    <ActivityIndicator color={t.primaryFg} />
                  ) : (
                    <>
                      <Text style={[typography.labelLg, { color: t.primaryFg, marginRight: space.sm }]}>Entrar</Text>
                      <ArrowRight size={18} color={t.primaryFg} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Trust badge */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: space['3xl'],
              }}>
                <ShieldCheck size={14} color={t.success} />
                <Text style={[typography.caption, { color: t.textMuted, marginLeft: 6 }]}>
                  Acesso seguro e criptografado
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  )
}
