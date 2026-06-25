import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Easing } from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'
import { typography, space } from '../../theme/tokens'

interface MacrosBarProps {
  protein_g: number
  carbs_g: number
  fat_g: number
  showLegend?: boolean
}

/**
 * Barra de macros (Proteína / Carbo / Gordura) proporcional à contribuição
 * calórica, com reveal animado da esquerda pra direita. Cores via tema:
 * proteína=info, carbo=warning, gordura=error.
 */
export function MacrosBar({ protein_g, carbs_g, fat_g, showLegend = true }: MacrosBarProps) {
  const t = useThemeColors()

  const pCal = Math.max(protein_g, 0) * 4
  const cCal = Math.max(carbs_g, 0) * 4
  const fCal = Math.max(fat_g, 0) * 9
  const total = pCal + cCal + fCal || 1

  const segs = [
    { key: 'P', label: 'Proteína', grams: protein_g, frac: pCal / total, color: t.info },
    { key: 'C', label: 'Carbo', grams: carbs_g, frac: cCal / total, color: t.warning },
    { key: 'G', label: 'Gordura', grams: fat_g, frac: fCal / total, color: t.error },
  ]

  const [w, setW] = useState(0)
  const p = useSharedValue(0)
  useEffect(() => {
    if (w > 0) {
      p.value = 0
      p.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
    }
  }, [w, protein_g, carbs_g, fat_g])
  const fillStyle = useAnimatedStyle(() => ({ width: interpolate(p.value, [0, 1], [0, w]) }))

  return (
    <View>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: t.borderLight }}
      >
        <Animated.View style={[{ height: 10, flexDirection: 'row' }, fillStyle]}>
          {segs.map((s) => (
            <View key={s.key} style={{ flex: s.frac, backgroundColor: s.color }} />
          ))}
        </Animated.View>
      </View>
      {showLegend && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
          {segs.map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <Text style={[typography.caption, { color: t.textSecondary }]}>
                {s.label} {Math.round(s.grams)}g
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
