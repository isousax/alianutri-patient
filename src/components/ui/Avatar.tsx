import { View, Text, Pressable, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { useThemeColors } from '../../stores/theme'
import { shadows } from '../../theme/tokens'

function initialsFrom(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase() || '?'
}

interface AvatarProps {
  name?: string | null
  uri?: string | null
  size?: number
  ring?: boolean
  onPress?: () => void
  accessibilityLabel?: string
}

/**
 * Avatar — foto do usuário (expo-image) com fallback de iniciais.
 * Reutilizado no header da Home (→ Perfil) e no hub Nutri.
 */
export function Avatar({ name, uri, size = 44, ring = true, onPress, accessibilityLabel }: AvatarProps) {
  const t = useThemeColors()
  const fontSize = Math.max(12, Math.round(size * 0.4))

  const frame: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    borderWidth: ring ? 2 : 0,
    borderColor: t.primaryLight,
    backgroundColor: t.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  }

  const inner = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
  ) : (
    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize, color: t.primaryFg }}>{initialsFrom(name)}</Text>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {})
          onPress()
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Abrir perfil'}
        style={frame}
      >
        {inner}
      </Pressable>
    )
  }

  return (
    <View style={frame} accessibilityLabel={accessibilityLabel}>
      {inner}
    </View>
  )
}
