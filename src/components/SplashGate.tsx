import { useEffect, useState } from 'react'
import { StyleSheet, AccessibilityInfo, View, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat,
  interpolate, Easing, runOnJS,
} from 'react-native-reanimated'
import { useThemeColors, useTheme } from '../stores/theme'
import { gradients, space } from '../theme/tokens'
import { AliaMark, BrandRing, GlowBlob, AliaWordmark } from './Brand'

/** Duração mínima do intro de marca. */
const INTRO_DURATION = 4000

const { width: SCREEN_W } = Dimensions.get('window')
const MARK_SIZE = 100
const RING_SIZE = 152

/**
 * Splash/intro de marca — "marca viva" estilo Apple Health/Oura:
 * símbolo em vidro com anel gradiente girando, glow pulsante e blobs de
 * profundidade ao fundo. Segura ~4s e faz fade-out suave pro app.
 */
export function SplashGate({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const t = useThemeColors()
  const theme = useTheme()

  const containerOpacity = useSharedValue(1)
  const markOpacity = useSharedValue(0)
  const markScale = useSharedValue(0.82)
  const breathe = useSharedValue(0)
  const ringSpin = useSharedValue(0)
  const glow = useSharedValue(0)
  const wordOpacity = useSharedValue(0)
  const wordY = useSharedValue(12)
  const taglineOpacity = useSharedValue(0)
  const taglineY = useSharedValue(10)

  const [minElapsed, setMinElapsed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduceMotion(v) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), INTRO_DURATION)
    return () => clearTimeout(id)
  }, [])

  // Intro
  useEffect(() => {
    if (reduceMotion) {
      markOpacity.value = 1; markScale.value = 1; glow.value = 0.75
      wordOpacity.value = 1; wordY.value = 0; taglineOpacity.value = 1; taglineY.value = 0
      return
    }
    markOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })
    markScale.value = withSpring(1, { damping: 14, stiffness: 110, mass: 0.9 })
    breathe.value = withDelay(800, withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true))
    ringSpin.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false)
    glow.value = withDelay(400, withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true))
    wordOpacity.value = withDelay(450, withTiming(1, { duration: 700 }))
    wordY.value = withDelay(450, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }))
    taglineOpacity.value = withDelay(750, withTiming(1, { duration: 700 }))
    taglineY.value = withDelay(750, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }))
  }, [reduceMotion])

  // Fade-out quando pronto + tempo mínimo cumprido
  useEffect(() => {
    if (!ready || !minElapsed) return
    containerOpacity.value = withTiming(0, { duration: 520, easing: Easing.inOut(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(onDone)()
    })
    const id = setTimeout(onDone, 600) // rede de segurança
    return () => clearTimeout(id)
  }, [ready, minElapsed])

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }))
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value * interpolate(breathe.value, [0, 1], [1, 1.04]) }],
  }))
  const ringStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ rotate: `${ringSpin.value * 360}deg` }],
  }))
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.45, 0.95]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.94, 1.12]) }],
  }))
  const wordStyle = useAnimatedStyle(() => ({ opacity: wordOpacity.value, transform: [{ translateY: wordY.value }] }))
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value, transform: [{ translateY: taglineY.value }] }))

  const bg = theme.dark ? gradients.night : gradients.brand

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, containerStyle, { zIndex: 100 }]}
      pointerEvents={ready ? 'none' : 'auto'}
    >
      <LinearGradient colors={bg} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
        {/* blobs de profundidade */}
        <GlowBlob size={SCREEN_W * 0.95} color="#2DD4BF" opacity={theme.dark ? 0.22 : 0.32} style={styles.blobTop} />
        <GlowBlob size={SCREEN_W * 0.9} color="#818CF8" opacity={theme.dark ? 0.26 : 0.22} style={styles.blobBottom} />

        {/* halo + anel + símbolo */}
        <View style={styles.markWrap}>
          <Animated.View style={[styles.absCenter, glowStyle]} pointerEvents="none">
            <GlowBlob size={RING_SIZE * 1.9} color={theme.dark ? '#34D399' : '#FFFFFF'} opacity={0.6} />
          </Animated.View>
          <Animated.View style={[styles.absCenter, ringStyle]} pointerEvents="none">
            <BrandRing size={RING_SIZE} strokeWidth={3} from="#FFFFFF" to={theme.dark ? '#818CF8' : '#A7F3D0'} trackColor="rgba(255,255,255,0.14)" />
          </Animated.View>
          <Animated.View style={markStyle}>
            <AliaMark size={MARK_SIZE} glass glassTint="rgba(255,255,255,0.18)" leafFrom="#FFFFFF" leafTo="#D1FAE5" />
          </Animated.View>
        </View>

        <Animated.View style={[wordStyle, { marginTop: space['4xl'] }]}>
          <AliaWordmark textOnly size={34} color={t.primaryFg} />
        </Animated.View>

        <Animated.Text
          style={[
            taglineStyle,
            { marginTop: space.md, color: t.primaryFg, opacity: 0.82, fontWeight: '600', fontSize: 11, letterSpacing: 2.5 },
          ]}
        >
          NUTRIÇÃO QUE CABE NA SUA ROTINA
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  absCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  blobTop: { position: 'absolute', top: -SCREEN_W * 0.3, left: -SCREEN_W * 0.25 },
  blobBottom: { position: 'absolute', bottom: -SCREEN_W * 0.28, right: -SCREEN_W * 0.3 },
})
