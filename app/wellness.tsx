import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Heart, ChevronLeft, Check, Send } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useSymptoms, useLogSymptoms } from '../src/hooks/usePortal'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <Heart size={22} color="#ec4899" />
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Bem-estar</Text>
      </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View entering={FadeIn.duration(300)} className="px-5 mt-2">
            <Text style={{ color: t.textMuted }} className="text-sm font-sans leading-5 mb-4">
              Como você está se sentindo hoje? Seu nutricionista usa essas informações para ajustar seu plano.
            </Text>
          </Animated.View>

          {CATEGORIES.map((cat, catIdx) => (
            <Animated.View
              key={cat.key}
              entering={FadeInDown.duration(300).delay(catIdx * 60)}
              className="px-5 mb-4"
            >
              <Text style={{ color: t.text }} className="text-sm font-sans-semibold mb-2">{cat.label}</Text>
              <View className="flex-row gap-2">
                {cat.options.map((opt) => {
                  const selected = values[cat.key] === opt.value
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleSelect(cat.key, opt.value)}
                      className="flex-1 items-center py-2.5 rounded-xl"
                      style={{
                        backgroundColor: selected ? t.primaryLight : t.surface,
                        borderWidth: selected ? 1.5 : 1,
                        borderColor: selected ? t.primary : t.borderLight,
                      }}
                    >
                      <Text className="text-lg">{opt.emoji}</Text>
                      <Text
                        style={{ color: selected ? t.primary : t.textMuted }}
                        className="text-[9px] font-sans-medium mt-0.5"
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
          <Animated.View entering={FadeInDown.duration(300).delay(300)} className="px-5">
            <Pressable
              onPress={handleSave}
              disabled={isPending || filledCount === 0}
              className="py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
              style={{
                backgroundColor: filledCount > 0 ? t.primary : t.borderLight,
              }}
            >
              {isPending ? (
                <Text className="text-sm font-sans-bold" style={{ color: t.primaryText }}>Salvando...</Text>
              ) : (
                <>
                  <Send size={14} color={filledCount > 0 ? t.primaryText : t.textMuted} />
                  <Text
                    className="text-sm font-sans-bold"
                    style={{ color: filledCount > 0 ? t.primaryText : t.textMuted }}
                  >
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
              className="mx-5 mt-4 rounded-2xl p-4 flex-row items-center gap-3"
              style={{ backgroundColor: t.success + '15' }}
            >
              <View className="h-8 w-8 rounded-full items-center justify-center" style={{ backgroundColor: t.success + '20' }}>
                <Check size={16} color={t.success} />
              </View>
              <View className="flex-1">
                <Text style={{ color: t.success }} className="text-sm font-sans-bold">Registro salvo!</Text>
                <Text style={{ color: t.success + 'cc' }} className="text-[11px] font-sans mt-0.5">
                  Seu nutricionista pode acompanhar seus dados.
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
    </SafeAreaView>
  )
}
