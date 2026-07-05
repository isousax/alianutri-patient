import { Pressable, Text, ActivityIndicator, type ViewStyle, type TextStyle, type StyleProp } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { haptics } from '../../lib/haptics'
import { useThemeColors } from '../../stores/theme'
import { radius, space, typography, shadows, motion } from '../../theme/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const SIZES: Record<ButtonSize, { padV: number; padH: number; font: TextStyle; minH: number }> = {
  sm: { padV: space.sm, padH: space.lg, font: typography.labelMd, minH: 40 },
  md: { padV: space.md, padH: space.xl, font: typography.labelLg, minH: 48 },
  lg: { padV: space.lg, padH: space['2xl'], font: typography.labelLg, minH: 54 },
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, leftIcon, rightIcon, fullWidth, style,
}: ButtonProps) {
  const t = useThemeColors()
  const scale = useSharedValue(1)
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const isDisabled = disabled || loading
  const s = SIZES[size]

  const bg =
    variant === 'primary' ? t.primary
      : variant === 'danger' ? t.error
        : variant === 'secondary' ? t.surfaceSecondary
          : 'transparent'
  const fg =
    variant === 'primary' || variant === 'danger' ? t.primaryFg
      : variant === 'secondary' ? t.text
        : t.primary

  const containerStyle: ViewStyle = {
    minHeight: s.minH,
    paddingVertical: s.padV,
    paddingHorizontal: s.padH,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: bg,
    opacity: isDisabled ? 0.45 : 1,
    ...(variant === 'primary' ? shadows.glow(t.primary) : variant === 'danger' ? shadows.glow(t.error) : {}),
  }

  return (
    <Pressable
      onPress={() => { if (isDisabled) return; haptics.medium(); onPress() }}
      onPressIn={() => { scale.value = withSpring(0.97, motion.spring) }}
      onPressOut={() => { scale.value = withSpring(1, motion.spring) }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={fullWidth ? { alignSelf: 'stretch' } : undefined}
    >
      <Animated.View style={[containerStyle, aStyle, style]}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {leftIcon}
            <Text style={[s.font, { color: fg }]}>{label}</Text>
            {rightIcon}
          </>
        )}
      </Animated.View>
    </Pressable>
  )
}
