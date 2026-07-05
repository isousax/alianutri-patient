import { Pressable } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { haptics } from '../../lib/haptics'
import { useThemeColors } from '../../stores/theme'
import { radius, motion } from '../../theme/tokens'

interface IconButtonProps {
  icon: React.ReactNode
  onPress: () => void
  /** REQUIRED for accessibility — icon-only buttons must be labelled */
  accessibilityLabel: string
  variant?: 'plain' | 'surface' | 'primary'
  /** visual size of the touchable surface; touch target is always >= 44px via hitSlop */
  size?: number
  disabled?: boolean
}

export function IconButton({
  icon, onPress, accessibilityLabel, variant = 'plain', size = 40, disabled = false,
}: IconButtonProps) {
  const t = useThemeColors()
  const scale = useSharedValue(1)
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const bg = variant === 'surface' ? t.surfaceSecondary : variant === 'primary' ? t.primary : 'transparent'
  // Guarantee a >= 44px touch target regardless of visual size
  const slop = Math.max(8, Math.ceil((44 - size) / 2))

  return (
    <Pressable
      onPress={() => { if (disabled) return; haptics.light(); onPress() }}
      onPressIn={() => { scale.value = withSpring(0.9, motion.spring) }}
      onPressOut={() => { scale.value = withSpring(1, motion.spring) }}
      hitSlop={slop}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bg,
            opacity: disabled ? 0.45 : 1,
          },
          aStyle,
        ]}
      >
        {icon}
      </Animated.View>
    </Pressable>
  )
}
