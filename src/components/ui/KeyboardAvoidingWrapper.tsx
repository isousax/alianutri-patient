import { useEffect } from 'react'
import { Keyboard, Platform, type ViewStyle, type StyleProp } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Descontado da altura do teclado (ex.: uma barra/inset já contemplada no layout). */
  offset?: number
}

/**
 * Wrapper keyboard-aware para telas com input.
 *
 * NÃO usa `KeyboardAvoidingView` nem depende do `adjustResize` do Android: no
 * Expo SDK 54 (New Arch + edge-to-edge) o `adjustResize` deixou de encolher a
 * view RN, então `behavior={undefined}` no Android não movia nada e o teclado
 * cobria os campos de baixo (post-compose, weight, goals, questionnaires).
 *
 * Em vez disso, ouve os eventos nativos do teclado e aplica a altura dele como
 * `paddingBottom` animado — encolhendo o viewport de forma determinística nos
 * dois SOs, independente do edge-to-edge. Mesmo padrão já usado no `BottomSheet`.
 *
 * Coloque um `ScrollView` dentro com `keyboardShouldPersistTaps="handled"`; o
 * campo focado passa a poder ser rolado para acima do teclado.
 */
export function KeyboardAvoidingWrapper({ children, style, offset = 0 }: KeyboardAvoidingWrapperProps) {
  const kb = useSharedValue(0)

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const duration = Platform.OS === 'ios' ? 250 : 150
    const show = Keyboard.addListener(showEvt, (e) => {
      kb.value = withTiming(Math.max(0, e.endCoordinates.height - offset), { duration })
    })
    const hide = Keyboard.addListener(hideEvt, () => {
      kb.value = withTiming(0, { duration })
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [kb, offset])

  const animatedStyle = useAnimatedStyle(() => ({ flex: 1, paddingBottom: kb.value }))

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
}
