import { View, Text, Pressable, Modal } from 'react-native'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { haptics } from '../../lib/haptics'
import { useThemeColors } from '../../stores/theme'
import { typography, radius, space, shadows, glass } from '../../theme/tokens'
import { useConfirmStore } from '../../stores/confirm'

/**
 * Diálogo de confirmação central (substitui Alert.alert com ações).
 * Renderizar uma vez no layout raiz. Disparar com confirm({...}) ou alertInfo(...).
 * Sem cancelLabel → vira alerta de 1 botão.
 */
export function ConfirmDialog() {
  const t = useThemeColors()
  const current = useConfirmStore((s) => s.current)
  const close = useConfirmStore((s) => s.close)

  if (!current) return null

  const hasCancel = current.cancelLabel != null
  const confirmBg = current.destructive ? t.error : t.primary
  const confirmFg = current.destructive ? '#fff' : t.primaryFg

  const handleConfirm = () => {
    haptics.medium()
    close()
    current.onConfirm?.()
  }
  const handleCancel = () => {
    close()
    current.onCancel?.()
  }

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={handleCancel}>
      <Animated.View
        entering={FadeIn.duration(160)}
        style={{ flex: 1, backgroundColor: glass.scrim, alignItems: 'center', justifyContent: 'center', padding: space['2xl'] }}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={hasCancel ? handleCancel : undefined}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <Animated.View
          entering={ZoomIn.springify().damping(18).stiffness(220).mass(0.7)}
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: t.surface,
            borderRadius: radius['2xl'],
            padding: space.xl,
            ...shadows.xl,
          }}
        >
          <Text style={[typography.headingMd, { color: t.text, textAlign: 'center' }]}>{current.title}</Text>
          {current.message ? (
            <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', marginTop: space.sm, lineHeight: 21 }]}>
              {current.message}
            </Text>
          ) : null}

          <View style={{ flexDirection: hasCancel ? 'row' : 'column', gap: space.sm, marginTop: space.xl }}>
            {hasCancel ? (
              <Pressable
                onPress={handleCancel}
                style={{ flex: 1, paddingVertical: space.md + 2, borderRadius: radius.lg, backgroundColor: t.surfaceSecondary, alignItems: 'center' }}
              >
                <Text style={[typography.labelLg, { color: t.text }]}>{current.cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleConfirm}
              style={{ flex: hasCancel ? 1 : undefined, paddingVertical: space.md + 2, borderRadius: radius.lg, backgroundColor: confirmBg, alignItems: 'center' }}
            >
              <Text style={[typography.labelLg, { color: confirmFg }]}>{current.confirmLabel ?? 'OK'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}
