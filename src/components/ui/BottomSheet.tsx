import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { View, Text, Pressable, Modal, ScrollView, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'
import { radius, space, typography } from '../../theme/tokens'

const { height: SCREEN_H } = Dimensions.get('window')
const OPEN_SPRING = { damping: 22, stiffness: 240, mass: 0.7 }

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/**
 * Bottom sheet custom (sem @gorhom): Modal transparente + backdrop com fade +
 * folha controlada por um shared value (abre/arrasta/fecha sem conflito de
 * animações). Fecha ao tocar fora, no grabber ou arrastando para baixo.
 * Conteúdo rolável com altura máxima (nunca corta) e safe-area inferior.
 */
export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const t = useThemeColors()
  const insets = useSafeAreaInsets()
  const ty = useSharedValue(SCREEN_H)

  // Abre deslizando de baixo; reseta a cada (re)abertura.
  useEffect(() => {
    if (visible) {
      ty.value = SCREEN_H
      ty.value = withSpring(0, OPEN_SPRING)
    }
  }, [visible, ty])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }))

  if (!visible) return null

  const close = () => {
    ty.value = withTiming(SCREEN_H, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onClose)()
    })
  }

  // Arrastar o grabber para baixo fecha (passada distância/velocidade).
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      ty.value = Math.max(0, e.translationY)
    })
    .onEnd((e) => {
      if (ty.value > 110 || e.velocityY > 800) {
        ty.value = withTiming(SCREEN_H, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onClose)()
        })
      } else {
        ty.value = withSpring(0, OPEN_SPRING)
      }
    })

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2,6,23,0.45)' }}
        >
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" />
        </Animated.View>

        {/* Folha */}
        <Animated.View
          style={[
            {
              backgroundColor: t.surface,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              paddingHorizontal: space.lg,
              maxHeight: SCREEN_H * 0.9,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.16,
              shadowRadius: 24,
              elevation: 24,
            },
            sheetStyle,
          ]}
        >
          {/* Grabber — toque OU arraste para baixo fecha */}
          <GestureDetector gesture={pan}>
            <View style={{ paddingTop: space.sm, paddingBottom: space.xs }}>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={12}
                style={{ alignItems: 'center', paddingVertical: space.xs }}
              >
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
              </Pressable>
            </View>
          </GestureDetector>

          {title ? (
            <Text style={[typography.headingMd, { color: t.text, marginTop: space.xs, marginBottom: space.md }]}>
              {title}
            </Text>
          ) : null}

          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}
