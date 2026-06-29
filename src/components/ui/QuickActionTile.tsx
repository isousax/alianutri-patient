import { View, Text, Pressable } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, motion } from '../../theme/tokens'

interface QuickActionTileProps {
  /** Pre-sized lucide icon element (caller controls glyph color). */
  icon: React.ReactNode
  label: string
  /** Background of the icon chip — always a `*Light` design token. */
  chipColor?: string
  onPress: () => void
  /** `plain` = transparent (Home grid); `surface` = filled card (RegistroSheet). */
  variant?: 'plain' | 'surface'
  /** Fixed width; defaults to flex:1 so a row of tiles fills the viewport. */
  width?: number
  labelLines?: 1 | 2
  accessibilityLabel?: string
}

/**
 * Canonical quick-action tile (icon chip + label) shared by the Home grid and
 * the "+" RegistroSheet. Centralizing it guarantees a single icon-chip size,
 * radius, label treatment and press feedback across the app — the previous
 * three divergent implementations read as inconsistent (≠ premium).
 */
export function QuickActionTile({
  icon,
  label,
  chipColor,
  onPress,
  variant = 'plain',
  width,
  labelLines = 2,
  accessibilityLabel,
}: QuickActionTileProps) {
  const t = useThemeColors()
  const scale = useSharedValue(1)
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.93, motion.spring) }}
      onPressOut={() => { scale.value = withSpring(1, motion.spring) }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={width != null ? { width } : { flex: 1, minWidth: 0 }}
    >
      <Animated.View
        style={[
          {
            alignItems: 'center',
            paddingVertical: space.md,
            paddingHorizontal: variant === 'surface' ? space.xs : 0,
            marginBottom: space.xs,
            borderRadius: radius.lg,
            backgroundColor: variant === 'surface' ? t.surfaceSecondary : 'transparent',
          },
          pressStyle,
        ]}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 46,
            height: 46,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: chipColor,
          }}
        >
          {icon}
        </View>
        <View style={{ alignSelf: 'center', maxWidth: '100%', height: labelLines === 2 ? 30 : 18, justifyContent: 'center', marginTop: space.xs + 2 }}>
          <Text
            style={[typography.captionBold, { color: t.textSecondary, textAlign: 'center', fontSize: 10.5, lineHeight: 13 }]}
            numberOfLines={labelLines}
          >
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  )
}
