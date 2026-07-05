import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, Dimensions, ScrollView, Image, type KeyboardTypeOptions } from 'react-native'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { haptics } from '../src/lib/haptics'
import { ShieldCheck, ArrowRight, Smartphone, Lock } from 'lucide-react-native'
import { useAuthStore } from '../src/stores/auth'
import { startPairing, verifyPairing, validateAccessCode, type PairingMethod } from '../src/services/api'
import { useThemeColors, useTheme } from '../src/stores/theme'
import { shadows, radius, space, typography, gradients } from '../src/theme/tokens'
import { AliaWordmark, GlowBlob } from '../src/components/Brand'
import { KeyboardAvoidingWrapper } from '../src/components/ui'

const { width: SCREEN_W } = Dimensions.get('window')

type Phase = 'loading' | 'question' | 'conflict' | 'error'

const FIELDS: Record<PairingMethod, { title: string; subtitle: string; placeholder: string; keyboard: KeyboardTypeOptions }> = {
  birth_date: {
    title: 'Confirme sua identidade',
    subtitle: 'Para vincular este aparelho com segurança, informe sua data de nascimento.',
    placeholder: 'AAAA-MM-DD',
    keyboard: 'numbers-and-punctuation',
  },
  cpf: {
    title: 'Confirme sua identidade',
    subtitle: 'Para vincular este aparelho com segurança, informe seu CPF.',
    placeholder: '000.000.000-00',
    keyboard: 'numeric',
  },
  phone: {
    title: 'Confirme sua identidade',
    subtitle: 'Para vincular este aparelho com segurança, informe seu telefone.',
    placeholder: '(00) 00000-0000',
    keyboard: 'phone-pad',
  },
  collect: {
    title: 'Proteja seu acesso',
    subtitle: 'Para vincular este aparelho com segurança, informe sua data de nascimento.',
    placeholder: 'AAAA-MM-DD',
    keyboard: 'numbers-and-punctuation',
  },
}

function HelpLink({ color }: { color: string }) {
  return (
    <Pressable
      onPress={() => router.push('/help-access' as Href)}
      accessibilityRole="button"
      accessibilityLabel="Preciso de ajuda para entrar"
      hitSlop={8}
      style={{ alignSelf: 'center', marginTop: space.lg, paddingVertical: space.sm }}
    >
      <Text style={[typography.bodyMd, { color }]}>Preciso de ajuda para entrar</Text>
    </Pressable>
  )
}

export default function PairScreen() {
  const t = useThemeColors()
  const theme = useTheme()
  const { code } = useLocalSearchParams<{ code: string }>()

  const getOrCreateDeviceId = useAuthStore((s) => s.getOrCreateDeviceId)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setSessionToken = useAuthStore((s) => s.setSessionToken)

  const [phase, setPhase] = useState<Phase>('loading')
  const [method, setMethod] = useState<PairingMethod | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!code) {
        setError('Código de acesso não encontrado.')
        setPhase('error')
        return
      }
      const dev = await getOrCreateDeviceId()
      if (cancelled) return
      const r = await startPairing(code, dev)
      if (cancelled) return
      if (r.status === 'conflict') return setPhase('conflict')
      if (r.status === 'invalid_code') {
        setError('Código de acesso inválido ou expirado.')
        return setPhase('error')
      }
      if (r.status === 'error') {
        setError(r.message || 'Erro ao iniciar o pareamento.')
        return setPhase('error')
      }
      setMethod(r.method ?? 'collect')
      setHint(r.hint ?? null)
      setPhase('question')
    })()
    return () => { cancelled = true }
  }, [code, getOrCreateDeviceId])

  async function handleVerify() {
    if (!code || !method) return
    const trimmed = answer.trim()
    if (!trimmed) {
      setError('Informe o dado solicitado.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const dev = await getOrCreateDeviceId()
      const r = await verifyPairing(code, dev, trimmed)
      if (r.status === 'conflict') return setPhase('conflict')
      if (r.status === 'bad_request') {
        setError(r.message || 'Dados inválidos.')
        haptics.error()
        return
      }
      if (r.status === 'invalid') {
        setError('Não conseguimos confirmar sua identidade. Verifique os dados e tente novamente.')
        haptics.error()
        return
      }
      if (r.status === 'error' || !r.token) {
        setError(r.message || 'Erro ao confirmar sua identidade.')
        return
      }
      const token = r.token
      setSessionToken(token) // habilita o header antes de buscar o /home
      const info = await validateAccessCode(code)
      setAuth(
        code,
        {
          id: info.patient?.id || '',
          name: info.patient?.name || '',
          preferred_name: null,
          photo_url: info.patient?.photo_url || null,
        },
        {
          name: info.nutritionist?.name || '',
          photo_url: info.nutritionist?.photo_url || null,
        },
        token,
      )
      haptics.success()
      router.replace('/')
    } finally {
      setSubmitting(false)
    }
  }

  const field = method ? FIELDS[method] : null
  const canSubmit = answer.trim().length > 0 && !submitting

  return (
    <View style={{ flex: 1, backgroundColor: theme.dark ? gradients.night[1] : gradients.brand[0] }}>
      <LinearGradient colors={theme.dark ? gradients.night : gradients.brand} start={{ x: 0.1, y: 0 }} end={{ x: 0.95, y: 0.8 }} style={{ flex: 1 }}>
        <GlowBlob size={SCREEN_W * 1.1} color="#2DD4BF" opacity={theme.dark ? 0.22 : 0.34} style={{ position: 'absolute', top: -SCREEN_W * 0.4, left: -SCREEN_W * 0.3 }} />
        <GlowBlob size={SCREEN_W * 0.85} color="#818CF8" opacity={theme.dark ? 0.24 : 0.2} style={{ position: 'absolute', top: SCREEN_W * 0.1, right: -SCREEN_W * 0.35 }} />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <KeyboardAvoidingWrapper style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', paddingTop: space['5xl'], paddingBottom: space['4xl'] }}>
                <Image source={require('../assets/alianutriIconWhite.png')} style={{ width: 72, height: 72, marginBottom: space.lg }} resizeMode="contain" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                <AliaWordmark textOnly size={30} color={t.primaryFg} />
              </View>

              <View style={{ flex: 1, backgroundColor: t.background, paddingHorizontal: space['3xl'], paddingTop: space['4xl'], borderTopLeftRadius: 36, borderTopRightRadius: 36, ...shadows.xl }}>
                <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: radius.full, backgroundColor: t.borderLight, marginBottom: space['2xl'] }} />

                {phase === 'loading' && (
                  <View style={{ alignItems: 'center', paddingVertical: space['5xl'] }}>
                    <ActivityIndicator size="large" color={t.primary} />
                    <Text style={[typography.bodyMd, { color: t.textMuted, marginTop: space.lg }]}>Preparando seu acesso…</Text>
                  </View>
                )}

                {phase === 'conflict' && (
                  <View style={{ paddingBottom: space['3xl'] }}>
                    <View style={{ alignSelf: 'flex-start', padding: space.md, borderRadius: radius.lg, backgroundColor: t.errorLight, marginBottom: space.lg }}>
                      <Smartphone size={26} color={t.error} />
                    </View>
                    <Text accessibilityRole="header" style={[typography.displaySm, { color: t.text, marginBottom: space.xs }]}>Acesso em uso</Text>
                    <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space['3xl'] }]}>
                      Este acesso já está vinculado a outro aparelho. Por segurança, ele funciona em um dispositivo por vez. Peça ao seu nutricionista para liberar o acesso neste novo aparelho.
                    </Text>
                    <Pressable
                      onPress={() => router.replace('/login' as Href)}
                      accessibilityRole="button"
                      style={{ borderRadius: radius.lg, overflow: 'hidden', ...shadows.glow(t.primary) }}
                    >
                      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}>
                        <Text style={[typography.labelLg, { color: t.primaryFg }]}>Voltar ao login</Text>
                      </LinearGradient>
                    </Pressable>
                    <HelpLink color={t.primary} />
                  </View>
                )}

                {phase === 'error' && (
                  <View style={{ paddingBottom: space['3xl'] }}>
                    <View style={{ alignSelf: 'flex-start', padding: space.md, borderRadius: radius.lg, backgroundColor: t.errorLight, marginBottom: space.lg }}>
                      <Lock size={26} color={t.error} />
                    </View>
                    <Text accessibilityRole="header" style={[typography.displaySm, { color: t.text, marginBottom: space.xs }]}>Não foi possível continuar</Text>
                    <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space['3xl'] }]}>{error || 'Tente novamente.'}</Text>
                    <Pressable
                      onPress={() => router.replace('/login' as Href)}
                      accessibilityRole="button"
                      style={{ borderRadius: radius.lg, overflow: 'hidden', ...shadows.glow(t.primary) }}
                    >
                      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}>
                        <Text style={[typography.labelLg, { color: t.primaryFg }]}>Voltar ao login</Text>
                      </LinearGradient>
                    </Pressable>
                    <HelpLink color={t.primary} />
                  </View>
                )}

                {phase === 'question' && field && (
                  <View style={{ paddingBottom: space['3xl'] }}>
                    <Text accessibilityRole="header" style={[typography.displaySm, { color: t.text, marginBottom: space.xs }]}>{field.title}</Text>
                    <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space.lg }]}>{field.subtitle}</Text>
                    {method === 'phone' && hint ? (
                      <Text style={[typography.caption, { color: t.textMuted, marginBottom: space.lg }]}>Dica: seu telefone termina em ••{hint}</Text>
                    ) : null}

                    <View style={{ marginBottom: space.xl }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.surfaceSecondary, borderRadius: radius.lg, paddingHorizontal: space.lg, borderWidth: 1.5, borderColor: error ? t.error : focused ? t.primary : t.borderLight }}>
                        <ShieldCheck size={18} color={error ? t.error : focused ? t.primary : t.textMuted} />
                        <TextInput
                          value={answer}
                          onChangeText={(v) => { setAnswer(v); if (error) setError('') }}
                          placeholder={field.placeholder}
                          placeholderTextColor={t.textMuted}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType={field.keyboard}
                          accessibilityLabel="Dado de identidade"
                          onFocus={() => setFocused(true)}
                          onBlur={() => setFocused(false)}
                          style={[typography.bodyLg, { flex: 1, marginLeft: space.md, paddingVertical: space.lg, color: t.text }]}
                          editable={!submitting}
                          returnKeyType="go"
                          onSubmitEditing={handleVerify}
                        />
                      </View>
                      {error ? (
                        <Text accessibilityLiveRegion="polite" style={[typography.caption, { color: t.error, marginTop: space.sm, marginLeft: 4 }]}>{error}</Text>
                      ) : null}
                    </View>

                    <Pressable
                      onPress={handleVerify}
                      disabled={!canSubmit}
                      accessibilityRole="button"
                      accessibilityLabel="Confirmar e vincular este aparelho"
                      accessibilityState={{ disabled: !canSubmit, busy: submitting }}
                      style={{ borderRadius: radius.lg, overflow: 'hidden', ...(canSubmit ? shadows.glow(t.primary) : shadows.none) }}
                    >
                      <LinearGradient colors={canSubmit ? gradients.brand : [t.primaryMuted, t.primaryMuted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}>
                        {submitting ? (
                          <ActivityIndicator color={t.primaryFg} />
                        ) : (
                          <>
                            <Text style={[typography.labelLg, { color: t.primaryFg, marginRight: space.sm }]}>Confirmar</Text>
                            <ArrowRight size={18} color={t.primaryFg} />
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: space['3xl'] }}>
                      <ShieldCheck size={14} color={t.success} />
                      <Text style={[typography.caption, { color: t.textMuted, marginLeft: 6 }]}>
                        Vinculamos o acesso só a este aparelho
                      </Text>
                    </View>

                    <HelpLink color={t.primary} />
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingWrapper>
        </SafeAreaView>
      </LinearGradient>
    </View>
  )
}
