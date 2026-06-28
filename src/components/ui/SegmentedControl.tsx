import { useState } from 'react'
import { View, Text, Pressable, type LayoutChangeEvent } from 'react-native'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useThemeColors } from '../../stores/theme'
import { radius, space, typography, shadows, motion } from '../../theme/tokens'

export interface SegmentOption {
  key: string
  label: string
  /** badge numérico opcional (ex.: mensagens não lidas) */
  badge?: number
}

interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (key: string) => void
}

const PAD = 4

/**
 * SegmentedControl — seletor de abas internas com indicador deslizante.
 * Usado no hub Nutri (Conversa/Consultas/Questionários) e no Diário (Feed/Progresso/Conquistas).
 */
export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const t = useThemeColors()
  const [width, setWidth] = useState(0)
  const n = options.length
  const segW = n > 0 && width > 0 ? (width - PAD * 2) / n : 0
  const index = Math.max(0, options.findIndex((o) => o.key === value))

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segW,
    transform: [{ translateX: withSpring(PAD + index * segW, motion.spring) }],
  }))

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: t.surfaceSecondary,
        borderRadius: radius.lg,
        padding: PAD,
        position: 'relative',
      }}
      accessibilityRole="tablist"
    >
      {segW > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: PAD,
              bottom: PAD,
              left: 0,
              borderRadius: radius.md,
              backgroundColor: t.surface,
              ...shadows.sm,
            },
            indicatorStyle,
          ]}
        />
      )}
      {options.map((o) => {
        const active = o.key === value
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              if (active) return
              Haptics.selectionAsync().catch(() => {})
              onChange(o.key)
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: space.sm + 2,
            }}
          >
            <Text style={[typography.labelMd, { color: active ? t.text : t.textMuted }]} numberOfLines={1}>
              {o.label}
            </Text>
            {typeof o.badge === 'number' && o.badge > 0 && (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 5,
                  borderRadius: 9,
                  backgroundColor: t.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: t.primaryFg }}>
                  {o.badge > 9 ? '9+' : o.badge}
                </Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
