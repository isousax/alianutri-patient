import { useEffect, useState } from 'react'
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Image, type ImageContentFit, type ImageSource } from 'expo-image'
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '../../stores/theme'

type CachePolicy = 'none' | 'disk' | 'memory' | 'memory-disk'

export interface ShimmerImageProps {
  source: ImageSource | number | null | undefined
  /** Estilo do container: largura/altura/borderRadius. */
  style?: StyleProp<ViewStyle>
  contentFit?: ImageContentFit
  cachePolicy?: CachePolicy
  /** Chave de reciclagem (FlatList): reinicia o shimmer quando o item muda. */
  recyclingKey?: string | null
  /** Duração do fade-in (ms) em carregamentos vindos da rede. */
  fadeDuration?: number
  accessibilityLabel?: string
}

/**
 * Imagem com shimmer premium enquanto carrega — inspirado no efeito das auth
 * pages do web (varredura de luz + fade-in). Só anima em carregamentos REAIS
 * (rede/arquivo); imagens já em cache aparecem na hora, sem custo ao rolar
 * listas. Reusa a mesma linguagem visual do `SkeletonBlock`.
 */
export function ShimmerImage({
  source,
  style,
  contentFit = 'cover',
  cachePolicy = 'memory-disk',
  recyclingKey,
  fadeDuration = 500,
  accessibilityLabel,
}: ShimmerImageProps) {
  const t = useThemeColors()
  const [loaded, setLoaded] = useState(false)
  const opacity = useSharedValue(0)

  // Ao reciclar a célula (novo item na mesma view), volta ao estado de loading.
  useEffect(() => {
    setLoaded(false)
    opacity.value = 0
  }, [recyclingKey])

  const imageStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: t.surfaceSecondary }]}>
      {!loaded && <ShimmerSweep />}
      <Animated.View style={[StyleSheet.absoluteFillObject, imageStyle]}>
        <Image
          source={source ?? undefined}
          style={StyleSheet.absoluteFillObject}
          contentFit={contentFit}
          cachePolicy={cachePolicy}
          recyclingKey={recyclingKey ?? undefined}
          transition={0}
          accessibilityLabel={accessibilityLabel}
          onLoad={(e) => {
            // `cacheType === 'none'` = veio da rede/arquivo agora → vale o fade.
            // Em cache (disk/memory) mostra na hora (sem fade ao rolar a lista).
            const fresh = e.cacheType === 'none'
            opacity.value = fresh
              ? withTiming(1, { duration: fadeDuration, easing: Easing.out(Easing.cubic) })
              : 1
            setLoaded(true)
          }}
          onError={() => {
            opacity.value = 1
            setLoaded(true)
          }}
        />
      </Animated.View>
    </View>
  )
}

/** Varredura de luz (skeleton) — idêntica ao `SkeletonBlock`, em fill absoluto. */
function ShimmerSweep() {
  const t = useThemeColors()
  const [w, setW] = useState(0)
  const x = useSharedValue(0)

  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, false)
  }, [])

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [0, 1], [-w, w]) }],
  }))

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFillObject, { backgroundColor: t.borderLight, overflow: 'hidden' }]}
      pointerEvents="none"
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, sweep]}>
        <LinearGradient
          colors={['transparent', t.surface, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, opacity: 0.6 }}
        />
      </Animated.View>
    </View>
  )
}
