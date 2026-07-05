import { useState } from 'react'
import { View, Text, Pressable, ScrollView, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { haptics } from '../src/lib/haptics'
import { Bell, Camera, ArrowRight } from 'lucide-react-native'
import { useThemeColors } from '../src/stores/theme'
import { useAuthStore } from '../src/stores/auth'
import { useOnboardingStore } from '../src/stores/onboarding'
import { useRemindersStore } from '../src/stores/reminders'
import { REMINDER_TOGGLES, rescheduleReminders, type ReminderToggle } from '../src/lib/localNotifications'
import { radius, space, typography, shadows, gradients } from '../src/theme/tokens'
import { Avatar } from '../src/components/ui'
import { GlowBlob } from '../src/components/Brand'

const STEPS = 3

function StepDots({ step }: { step: number }) {
  const t = useThemeColors()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <View
          key={i}
          style={{ height: 8, width: i === step ? 22 : 8, borderRadius: radius.full, backgroundColor: i === step ? t.primary : t.border }}
        />
      ))}
    </View>
  )
}

// Linha de lembrete com toggle (usa os defaults smart do store, todos ON).
function ReminderRow({ def }: { def: ReminderToggle }) {
  const t = useThemeColors()
  const enabled = useRemindersStore((s) => s.enabled[def.id] ?? false)
  const toggle = useRemindersStore((s) => s.toggle)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: t.surface, marginBottom: space.sm, ...shadows.sm }}>
      <Text style={[typography.labelLg, { color: t.text, flex: 1 }]}>{def.label}</Text>
      <Switch
        value={enabled}
        onValueChange={() => { haptics.selection(); toggle(def.id) }}
        trackColor={{ false: t.surfacePressed, true: t.primary }}
        thumbColor="#fff"
        ios_backgroundColor={t.surfacePressed}
      />
    </View>
  )
}

export default function OnboardingScreen() {
  const t = useThemeColors()
  const patient = useAuthStore((s) => s.patient)
  const nutritionist = useAuthStore((s) => s.nutritionist)
  const accessCode = useAuthStore((s) => s.accessCode)
  const setSeen = useOnboardingStore((s) => s.setSeen)
  const [step, setStep] = useState(0)

  const firstName = (patient?.preferred_name || patient?.name || '').trim().split(/\s+/)[0] ?? ''
  const nutriName = (nutritionist?.name || '').trim()
  const isLast = step === STEPS - 1

  // Conclui o onboarding: marca como visto, agenda os lembretes habilitados
  // (pede permissão no device; no-op no Expo Go) e entra no app.
  function finish(capture: boolean) {
    haptics.success()
    setSeen()
    rescheduleReminders(useRemindersStore.getState().enabled).catch(() => {})
    if (!accessCode) { router.replace('/login'); return }
    router.replace('/(tabs)')
    if (capture) router.push('/post-compose' as never)
  }

  function advance() {
    haptics.selection()
    setStep((s) => Math.min(s + 1, STEPS - 1))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'bottom']}>
      <GlowBlob size={320} color={t.primary} opacity={0.16} style={{ position: 'absolute', top: -80, right: -60 }} />

      {/* Skip — só nos passos iniciais */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.sm, minHeight: 28 }}>
        {!isLast ? (
          <Pressable onPress={() => finish(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Pular introdução">
            <Text style={[typography.labelMd, { color: t.textMuted }]}>Pular</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space['3xl'], paddingVertical: space.xl }}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 ? (
          <Animated.View key="s0" entering={FadeInDown.duration(450)} style={{ alignItems: 'center' }}>
            <Avatar uri={nutritionist?.photo_url} name={nutriName || 'Nutri'} size={104} />
            <Text style={[typography.displaySm, { color: t.text, textAlign: 'center', marginTop: space.xl, marginBottom: space.md }]}>
              {firstName ? `Olá, ${firstName}! 👋` : 'Boas-vindas! 👋'}
            </Text>
            <Text style={[typography.bodyLg, { color: t.textSecondary, textAlign: 'center' }]}>
              {nutriName
                ? `${nutriName} vai te acompanhar de perto por aqui. Bora começar essa jornada juntos?`
                : 'Seu nutricionista vai te acompanhar de perto por aqui. Bora começar essa jornada juntos?'}
            </Text>
          </Animated.View>
        ) : step === 1 ? (
          <Animated.View key="s1" entering={FadeInDown.duration(450)}>
            <View style={{ alignItems: 'center', marginBottom: space.xl }}>
              <View style={{ width: 72, height: 72, borderRadius: radius['2xl'], alignItems: 'center', justifyContent: 'center', backgroundColor: t.primaryLight, marginBottom: space.lg }}>
                <Bell size={32} color={t.primary} />
              </View>
              <Text style={[typography.displaySm, { color: t.text, textAlign: 'center', marginBottom: space.sm }]}>
                Lembretes nos momentos certos
              </Text>
              <Text style={[typography.bodyMd, { color: t.textSecondary, textAlign: 'center' }]}>
                Já deixei os principais ligados — a maior alavanca pra criar o hábito. Ajuste como preferir.
              </Text>
            </View>
            {REMINDER_TOGGLES.map((r) => (
              <ReminderRow key={r.id} def={r} />
            ))}
          </Animated.View>
        ) : (
          <Animated.View key="s2" entering={FadeInDown.duration(450)} style={{ alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: radius['2xl'], alignItems: 'center', justifyContent: 'center', backgroundColor: t.primaryLight, marginBottom: space.lg }}>
              <Camera size={32} color={t.primary} />
            </View>
            <Text style={[typography.displaySm, { color: t.text, textAlign: 'center', marginBottom: space.md }]}>
              Sua primeira refeição
            </Text>
            <Text style={[typography.bodyLg, { color: t.textSecondary, textAlign: 'center' }]}>
              Tire uma foto do que você vai comer — a Alia analisa pra você. É o melhor jeito de começar.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer: dots + ação */}
      <View style={{ paddingHorizontal: space['3xl'], paddingBottom: space.xl, paddingTop: space.lg }}>
        <View style={{ marginBottom: space['2xl'] }}>
          <StepDots step={step} />
        </View>

        <Pressable
          onPress={isLast ? () => finish(true) : advance}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Tirar foto da primeira refeição' : 'Avançar'}
          style={{
            borderRadius: radius.lg,
            overflow: 'hidden',
            ...shadows.glow(t.primary),
          }}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}
          >
            {isLast ? (
              <>
                <Camera size={18} color={t.primaryFg} />
                <Text style={[typography.labelLg, { color: t.primaryFg, marginLeft: space.sm }]}>Tirar foto agora</Text>
              </>
            ) : (
              <>
                <Text style={[typography.labelLg, { color: t.primaryFg, marginRight: space.sm }]}>Avançar</Text>
                <ArrowRight size={18} color={t.primaryFg} />
              </>
            )}
          </LinearGradient>
        </Pressable>

        {isLast ? (
          <Pressable onPress={() => finish(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Pular a primeira captura" style={{ alignItems: 'center', paddingVertical: space.md, marginTop: space.xs }}>
            <Text style={[typography.labelMd, { color: t.textMuted }]}>Agora não</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  )
}
