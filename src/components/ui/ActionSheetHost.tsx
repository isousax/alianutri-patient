import { View, Text, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeColors } from '../../stores/theme'
import { typography, radius, space } from '../../theme/tokens'
import { useActionSheetStore } from '../../stores/actionSheet'
import { BottomSheet } from './BottomSheet'

/**
 * Action sheet global (escolha entre ações). Reusa o BottomSheet custom.
 * Renderizar uma vez no layout raiz. Disparar com showActionSheet({...}).
 */
export function ActionSheetHost() {
  const t = useThemeColors()
  const current = useActionSheetStore((s) => s.current)
  const close = useActionSheetStore((s) => s.close)

  const run = (onPress?: () => void) => {
    Haptics.selectionAsync().catch(() => {})
    close()
    onPress?.()
  }

  return (
    <BottomSheet visible={!!current} onClose={close} title={current?.title}>
      {current?.message ? (
        <Text style={[typography.bodySm, { color: t.textMuted, marginBottom: space.md }]}>{current.message}</Text>
      ) : null}
      <View style={{ gap: space.md }}>
        {(current?.options ?? []).map((opt, i) => (
          <Pressable
            key={`${opt.label}-${i}`}
            onPress={() => run(opt.onPress)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: opt.icon ? 'flex-start' : 'center',
              gap: space.md,
              paddingVertical: space.lg,
              paddingHorizontal: space.lg,
              borderRadius: radius.lg,
              backgroundColor: pressed ? t.surfacePressed : t.surfaceSecondary,
            })}
          >
            {opt.icon ? <View style={{ width: 24, alignItems: 'center' }}>{opt.icon}</View> : null}
            <Text style={[typography.labelLg, { color: opt.destructive ? t.error : t.text }]}>{opt.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => run()}
          accessibilityRole="button"
          style={({ pressed }) => ({ paddingVertical: space.md + 2, borderRadius: radius.lg, alignItems: 'center', marginTop: space.xs, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[typography.labelLg, { color: t.textMuted }]}>{current?.cancelLabel ?? 'Cancelar'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  )
}
