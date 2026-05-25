import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Check, Send } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useSymptoms, useLogSymptoms } from '../src/hooks/usePortal'
import { ScreenHeader } from '../src/components/ui'
import { shadows, radius, space, typography, SCREEN_PADDING, todayStr } from '../src/theme/tokens'

const CATEGORIES = [
  {
    key: 'energy_level' as const,
    label: 'Energia',
    options: [
      { value: 1, emoji: '😴', label: 'Muito baixa' },
      { value: 2, emoji: '🥱', label: 'Baixa' },
      { value: 3, emoji: '😐', label: 'Normal' },
      { value: 4, emoji: '😊', label: 'Boa' },
      { value: 5, emoji: '⚡', label: 'Excelente' },
    ],
  },
  {
    key: 'mood' as const,
    label: 'Humor',
    options: [
      { value: 1, emoji: '😢', label: 'Péssimo' },
      { value: 2, emoji: '😞', label: 'Ruim' },
      { value: 3, emoji: '😐', label: 'Neutro' },
      { value: 4, emoji: '🙂', label: 'Bom' },
      { value: 5, emoji: '😄', label: 'Ótimo' },
    ],
  },
  {
    key: 'sleep_quality' as const,
    label: 'Sono',
    options: [
      { value: 1, emoji: '😵', label: 'Péssimo' },
      { value: 2, emoji: '😩', label: 'Ruim' },
      { value: 3, emoji: '😐', label: 'Regular' },
      { value: 4, emoji: '😌', label: 'Bom' },
      { value: 5, emoji: '😴', label: 'Ótimo' },
    ],
  },
  {
    key: 'digestion' as const,
    label: 'Digestão',
    options: [
      { value: 1, emoji: '😣', label: 'Péssima' },
      { value: 2, emoji: '😕', label: 'Ruim' },
      { value: 3, emoji: '😐', label: 'Normal' },
      { value: 4, emoji: '👍', label: 'Boa' },
      { value: 5, emoji: '✨', label: 'Excelente' },
    ],
  },
  {
    key: 'bloating' as const,
    label: 'Inchaço',
    options: [
      { value: 0, emoji: '✅', label: 'Nenhum' },
      { value: 1, emoji: '🟡', label: 'Leve' },
      { value: 2, emoji: '🟠', label: 'Moderado' },
      { value: 3, emoji: '🔴', label: 'Forte' },
    ],
  },
]

type SymptomKey = 'energy_level' | 'mood' | 'sleep_quality' | 'digestion' | 'bloating'

export default function WellnessScreen() {
  const t = useThemeColors()
  const today = todayStr()
  const { data: existing } = useSymptoms(today)
  const { mutateAsync: logSymptoms, isPending } = useLogSymptoms()

  const [values, setValues] = useState<Record<SymptomKey, number | null>>({
    energy_level: null,
    mood: null,
    sleep_quality: null,
    digestion: null,
    bloating: null,
  })
  const [saved, setSaved] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Pre-fill if existing data
  useEffect(() => {
    if (existing) {
      setValues({
        energy_level: existing.energy_level,
        mood: existing.mood,
        sleep_quality: existing.sleep_quality,
        digestion: existing.digestion,
        bloating: existing.bloating,
      })
      setSaved(true)
    }
  }, [existing])

  const handleSelect = useCallback((key: SymptomKey, value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const filledCount = Object.values(values).filter((v) => v !== null).length

  const handleSave = useCallback(async () => {
    if (filledCount === 0) {
      Alert.alert('Preencha ao menos um campo', 'Selecione como você está se sentindo hoje.')
      return
    }
    try {
      await logSymptoms({
        date: today,
        energy_level: values.energy_level ?? undefined,
        mood: values.mood ?? undefined,
        sleep_quality: values.sleep_quality ?? undefined,
        digestion: values.digestion ?? undefined,
        bloating: values.bloating ?? undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setSaved(true)
      setShowSuccess(true)
      clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setShowSuccess(false), 2500)
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.')
    }
  }, [filledCount, values, today, logSymptoms])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Bem-estar" />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
            <Text style={[typography.bodyMd, { color: t.textMuted, lineHeight: 22, marginBottom: space.lg }]}>
              Como você está se sentindo hoje? Seu nutricionista usa essas informações para ajustar seu plano.
            </Text>
          </Animated.View>

          {CATEGORIES.map((cat, catIdx) => (
            <Animated.View
              key={cat.key}
              entering={FadeInDown.duration(300).delay(catIdx * 60)}
              style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
            >
              <Text style={[typography.labelMd, { color: t.text, marginBottom: space.sm }]}>{cat.label}</Text>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {cat.options.map((opt) => {
                  const selected = values[cat.key] === opt.value
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleSelect(cat.key, opt.value)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: space.sm + 2,
                        borderRadius: radius.lg,
                        backgroundColor: selected ? t.primaryLight : t.surface,
                        borderWidth: selected ? 1.5 : 1,
                        borderColor: selected ? t.primary : t.borderLight,
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{opt.emoji}</Text>
                      <Text
                        style={[typography.captionBold, { color: selected ? t.primary : t.textMuted, fontSize: 9, marginTop: 2 }]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </Animated.View>
          ))}

          {/* Save button */}
          <Animated.View entering={FadeInDown.duration(300).delay(300)} style={{ paddingHorizontal: SCREEN_PADDING }}>
            <Pressable
              onPress={handleSave}
              disabled={isPending || filledCount === 0}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                paddingVertical: space.md + 2,
                borderRadius: radius.xl,
                backgroundColor: filledCount > 0 ? t.primary : t.borderLight,
                ...shadows.glow(filledCount > 0 ? t.primary : 'transparent'),
              }}
            >
              {isPending ? (
                <Text style={[typography.labelMd, { color: t.primaryFg }]}>Salvando...</Text>
              ) : (
                <>
                  <Send size={14} color={filledCount > 0 ? t.primaryFg : t.textMuted} />
                  <Text style={[typography.labelMd, { color: filledCount > 0 ? t.primaryFg : t.textMuted }]}>
                    {saved ? 'Atualizar registro' : 'Salvar registro'}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Success feedback */}
          {showSuccess && (
            <Animated.View
              entering={FadeInUp.duration(350)}
              exiting={FadeOutUp.duration(400)}
              style={{
                marginHorizontal: SCREEN_PADDING,
                marginTop: space.lg,
                borderRadius: radius.xl,
                padding: space.lg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                backgroundColor: t.successLight,
              }}
            >
              <View style={{
                width: 32, height: 32,
                borderRadius: 16,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: t.success + '25',
              }}>
                <Check size={16} color={t.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelMd, { color: t.success }]}>Registro salvo!</Text>
                <Text style={[typography.caption, { color: t.success + 'cc', marginTop: 2 }]}>
                  Seu nutricionista pode acompanhar seus dados.
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
    </SafeAreaView>
  )
}
