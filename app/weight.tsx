import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert, TextInput, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Scale, ChevronLeft, TrendingDown, TrendingUp,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Svg, { Polyline, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { useThemeColors } from '../src/stores/theme'
import { useLogWeight, useWeightHistory } from '../src/hooks/usePortal'

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WeightScreen() {
  const t = useThemeColors()
  const [value, setValue] = useState('')
  const { data } = useWeightHistory()
  const { mutateAsync: logWeight, isPending } = useLogWeight()

  const entries = data?.entries ?? []

  const handleSave = useCallback(async () => {
    const kg = parseFloat(value.replace(',', '.'))
    if (isNaN(kg) || kg < 20 || kg > 400) {
      Alert.alert('Peso inválido', 'Informe um valor entre 20 e 400 kg.')
      return
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await logWeight({ date: todayStr(), weight_kg: kg })
      setValue('')
      Alert.alert('Peso registrado!', `${kg.toFixed(1).replace('.', ',')} kg salvo com sucesso.`)
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.')
    }
  }, [value, logWeight])

  // Sparkline
  const points = [...entries].reverse()
  const W = Dimensions.get('window').width - 40 - 32
  const H = 80

  let sparkline = null
  if (points.length >= 2) {
    const weights = points.map((p) => p.weight_kg)
    const minW = Math.min(...weights) - 0.5
    const maxW = Math.max(...weights) + 0.5
    const rangeW = maxW - minW || 1
    const padX = 4
    const padY = 8
    const chartW = W - padX * 2
    const chartH = H - padY * 2

    const coords = points.map((p, i) => ({
      x: padX + (i / (points.length - 1)) * chartW,
      y: padY + chartH - ((p.weight_kg - minW) / rangeW) * chartH,
    }))
    const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
    const first = points[0].weight_kg
    const last = points[points.length - 1].weight_kg
    const diff = last - first
    const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} kg`
    const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp

    const fillPoints = `${padX},${padY + chartH} ${polyPoints} ${padX + chartW},${padY + chartH}`
    const trendColor = diff <= 0 ? t.success : t.warning

    sparkline = (
      <Animated.View entering={FadeInDown.duration(300)} className="px-5 mb-4">
        <View className="rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="h-7 w-7 rounded-lg items-center justify-center" style={{ backgroundColor: trendColor + '18' }}>
                <TrendIcon size={14} color={trendColor} />
              </View>
              <Text style={{ color: t.text }} className="text-[13px] font-sans-bold ml-2">
                Evolução
              </Text>
            </View>
            <Text className="text-xs font-sans-bold" style={{ color: trendColor }}>
              {diffStr}
            </Text>
          </View>
          <View className="flex-row items-baseline justify-between mb-2">
            <Text style={{ color: t.text }} className="text-xl font-sans-bold">
              {last.toFixed(1).replace('.', ',')}
              <Text className="text-xs font-sans" style={{ color: t.textMuted }}> kg</Text>
            </Text>
            <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">{points.length} registros</Text>
          </View>
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.primary} stopOpacity="0.15" />
                <Stop offset="1" stopColor={t.primary} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Polyline points={fillPoints} fill="url(#weightFill)" stroke="none" />
            <Polyline
              points={polyPoints}
              fill="none"
              stroke={t.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <SvgCircle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r={4}
              fill="#ffffff"
              stroke={t.primary}
              strokeWidth={2.5}
            />
          </Svg>
        </View>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <Scale size={22} color={t.accent} />
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Registro de Peso</Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Input card */}
          <Animated.View entering={FadeIn.duration(300)} className="px-5 mt-4 mb-4">
            <View className="rounded-2xl p-5" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
              <Text style={{ color: t.textMuted }} className="text-xs font-sans-bold uppercase tracking-widest mb-3">
                Peso de hoje
              </Text>
              <View className="flex-row items-center gap-3">
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="Ex: 72,5"
                  placeholderTextColor={t.textMuted}
                  keyboardType="decimal-pad"
                  className="flex-1 text-2xl font-sans-bold py-3 px-4 rounded-xl"
                  style={{ color: t.text, backgroundColor: t.surfacePressed, borderWidth: 1, borderColor: t.borderLight }}
                />
                <Text style={{ color: t.textSecondary }} className="text-lg font-sans-semibold">kg</Text>
              </View>
              <Pressable
                onPress={handleSave}
                disabled={isPending || !value.trim()}
                className="mt-4 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: value.trim() ? t.primary : t.borderLight,
                }}
              >
                <Text
                  className="text-sm font-sans-bold"
                  style={{ color: value.trim() ? t.primaryText : t.textMuted }}
                >
                  {isPending ? 'Salvando...' : 'Registrar peso'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Chart */}
          {sparkline}

          {/* History list */}
          {entries.length > 0 && (
            <Animated.View entering={FadeInDown.duration(300).delay(100)} className="px-5">
              <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase tracking-widest mb-2 ml-1">
                Histórico
              </Text>
              {entries.slice(0, 30).map((entry, i) => {
                const fmtDate = new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short',
                })
                const prev = entries[i + 1]
                const diff = prev ? entry.weight_kg - prev.weight_kg : 0
                return (
                  <View
                    key={`${entry.entry_date}-${entry.source}`}
                    className="flex-row items-center py-2.5 px-3 rounded-xl mb-1.5"
                    style={{ backgroundColor: t.surface, ...SHADOW_SM }}
                  >
                    <Scale size={14} color={t.accent} />
                    <Text style={{ color: t.text }} className="text-sm font-sans-semibold ml-2 flex-1">
                      {entry.weight_kg.toFixed(1).replace('.', ',')} kg
                    </Text>
                    {diff !== 0 && (
                      <Text
                        className="text-[11px] font-sans-medium mr-2"
                        style={{ color: diff < 0 ? t.success : t.warning }}
                      >
                        {diff > 0 ? '+' : ''}{diff.toFixed(1).replace('.', ',')}
                      </Text>
                    )}
                    <Text style={{ color: t.textMuted }} className="text-xs font-sans">{fmtDate}</Text>
                  </View>
                )
              })}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
