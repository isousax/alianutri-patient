import { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated'
import { CheckCircle2, AlertCircle, Info, type LucideIcon } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, radius, space, shadows } from '../../theme/tokens'
import { useToastStore, type ToastVariant } from '../../stores/toast'

const ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const VISIBLE_MS = 2800

/**
 * Toast global (estilo overlay). Renderizar uma vez no layout raiz.
 * Disparar com toast.success/error/info(...). Auto-some; toque fecha.
 */
export function Toast() {
  const t = useThemeColors()
  const insets = useSafeAreaInsets()
  const current = useToastStore((s) => s.current)
  const clear = useToastStore((s) => s.clear)
  const p = useSharedValue(0)

  useEffect(() => {
    if (!current) return
    p.value = 0
    p.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
    const id = setTimeout(() => {
      p.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, (f) => {
        if (f) runOnJS(clear)()
      })
    }, VISIBLE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.token])

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * -16 }],
  }))

  if (!current) return null

  const color = current.variant === 'success' ? t.success : current.variant === 'error' ? t.error : t.info
  const bg = current.variant === 'success' ? t.successLight : current.variant === 'error' ? t.errorLight : t.infoLight
  const Icon = ICONS[current.variant]

  const dismiss = () => {
    p.value = withTiming(0, { duration: 160 }, (f) => {
      if (f) runOnJS(clear)()
    })
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', top: insets.top + space.sm, left: space.lg, right: space.lg }, style]}>
        <Pressable
          onPress={dismiss}
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderRadius: radius.lg,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.borderLight,
            ...shadows.lg,
          }}
        >
          <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
            <Icon size={17} color={color} strokeWidth={2.4} />
          </View>
          <Text style={[typography.labelMd, { color: t.text, flex: 1 }]} numberOfLines={3}>
            {current.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}
