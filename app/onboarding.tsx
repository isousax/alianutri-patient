import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View, Text, Pressable, FlatList, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Polyline, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  UtensilsCrossed, Droplet, NotebookPen, Check, TrendingUp, MessageCircle, ArrowRight,
} from 'lucide-react-native'
import { useThemeColors } from '../src/stores/theme'
import { useAuthStore } from '../src/stores/auth'
import { useOnboardingStore } from '../src/stores/onboarding'
import { radius, space, typography, shadows, gradients } from '../src/theme/tokens'
import { GlowBlob } from '../src/components/Brand'

type SlideKey = 'plan' | 'diary' | 'progress' | 'chat'

interface Slide {
  key: SlideKey
  tone: 'primary' | 'info' | 'accent'
  title: string
  body: string
}

const SLIDES: Slide[] = [
  { key: 'plan', tone: 'primary', title: 'Seu plano, sempre à mão', body: 'Acesse o plano alimentar montado pelo seu nutricionista a qualquer hora, em qualquer lugar.' },
  { key: 'diary', tone: 'info', title: 'Diário sem complicação', body: 'Registre refeições e hidratação em segundos. Pequenos passos, grandes resultados.' },
  { key: 'progress', tone: 'accent', title: 'Acompanhe sua evolução', body: 'Veja seu progresso, metas e conquistas de forma simples e motivadora.' },
  { key: 'chat', tone: 'primary', title: 'Perto do seu nutri', body: 'Tire dúvidas e mantenha o acompanhamento direto pelo app, com segurança.' },
]

interface Tone { bg: string; fg: string }

// gentle continuous bob for the "floating with depth" feel
function Floaty({ children, delay = 0, amplitude = 7, style }: { children: ReactNode; delay?: number; amplitude?: number; style?: object }) {
  const v = useSharedValue(0)
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true))
  }, [delay])
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -amplitude + v.value * amplitude * 2 }] }))
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>
}

function TwinRing({ size = 76, c, t }: { size?: number; c: Tone; t: ReturnType<typeof useThemeColors> }) {
  const sw = 7
  const r1 = (size - sw) / 2
  const r2 = r1 - sw - 3
  const dash = (r: number, pct: number) => {
    const circ = 2 * Math.PI * r
    return `${circ * pct} ${circ}`
  }
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r1} stroke={t.surfaceSecondary} strokeWidth={sw} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r1} stroke={c.fg} strokeWidth={sw} strokeLinecap="round" fill="none" strokeDasharray={dash(r1, 0.72)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      <Circle cx={size / 2} cy={size / 2} r={r2} stroke={t.surfaceSecondary} strokeWidth={sw} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r2} stroke={t.info} strokeWidth={sw} strokeLinecap="round" fill="none" strokeDasharray={dash(r2, 0.5)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
    </Svg>
  )
}

function Sparkline({ w = 132, h = 48 }: { w?: number; h?: number }) {
  const pts = [0.9, 0.62, 0.74, 0.42, 0.5, 0.28, 0.18]
  const step = w / (pts.length - 1)
  const coords = pts.map((p, i) => `${(i * step).toFixed(1)},${(p * h).toFixed(1)}`).join(' ')
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgLinearGradient id="spark" x1="0" y1="0" x2={w} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#10B981" />
          <Stop offset="1" stopColor="#14B8A6" />
        </SvgLinearGradient>
      </Defs>
      <Polyline points={coords} fill="none" stroke="url(#spark)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[{ borderRadius: radius.xl, padding: space.lg, ...shadows.lg }, style]}>{children}</View>
  )
}

function Illustration({ slideKey, c, t }: { slideKey: SlideKey; c: Tone; t: ReturnType<typeof useThemeColors> }) {
  const surface = t.surface
  const chip = (icon: ReactNode, label: string, tint: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: surface, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 12, ...shadows.md }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: tint }}>{icon}</View>
      <Text style={[typography.labelMd, { color: t.text, marginLeft: 8 }]}>{label}</Text>
    </View>
  )

  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <GlowBlob size={300} color={c.fg} opacity={0.18} style={{ position: 'absolute' }} />

      {slideKey === 'plan' && (
        <>
          <Floaty>
            <Card style={{ backgroundColor: surface, width: 224 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
                  <UtensilsCrossed size={18} color={c.fg} />
                </View>
                <Text style={[typography.labelLg, { color: t.text, marginLeft: 10 }]}>Café da manhã</Text>
              </View>
              {['Ovos mexidos · 2 un', 'Pão integral · 1 fatia', 'Mamão · 1 fatia'].map((l) => (
                <View key={l} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg, marginRight: 10 }} />
                  <Text style={[typography.bodySm, { color: t.textSecondary }]}>{l}</Text>
                </View>
              ))}
            </Card>
          </Floaty>
          <Floaty delay={500} amplitude={9} style={{ position: 'absolute', top: 8, right: -6 }}>
            <Card style={{ backgroundColor: surface, alignItems: 'center', paddingVertical: space.md }}>
              <TwinRing size={64} c={c} t={t} />
            </Card>
          </Floaty>
          <Floaty delay={900} style={{ position: 'absolute', bottom: 6, left: -10 }}>
            {chip(<Check size={14} color={t.primaryFg} />, 'Meta batida', c.fg)}
          </Floaty>
        </>
      )}

      {slideKey === 'diary' && (
        <>
          <Floaty>
            <Card style={{ backgroundColor: surface, width: 230 }}>
              {[
                { l: 'Almoço registrado', done: true },
                { l: 'Lanche da tarde', done: true },
                { l: 'Jantar', done: false },
              ].map((row) => (
                <View key={row.l} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: row.done ? c.fg : t.surfaceSecondary }}>
                    {row.done ? <Check size={14} color={t.primaryFg} /> : <NotebookPen size={13} color={t.textMuted} />}
                  </View>
                  <Text style={[typography.bodyMd, { color: row.done ? t.text : t.textMuted, marginLeft: 10 }]}>{row.l}</Text>
                </View>
              ))}
            </Card>
          </Floaty>
          <Floaty delay={600} amplitude={9} style={{ position: 'absolute', bottom: 0, right: -8 }}>
            <Card style={{ backgroundColor: surface, flexDirection: 'row', alignItems: 'center' }}>
              <Droplet size={18} color={t.info} />
              <Text style={[typography.labelLg, { color: t.text, marginLeft: 8 }]}>2,7 L</Text>
            </Card>
          </Floaty>
        </>
      )}

      {slideKey === 'progress' && (
        <>
          <Floaty>
            <Card style={{ backgroundColor: surface, width: 224 }}>
              <Text style={[typography.caption, { color: t.textMuted }]}>Peso atual</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2, marginBottom: space.md }}>
                <Text style={[typography.displaySm, { color: t.text }]}>72,4</Text>
                <Text style={[typography.bodyMd, { color: t.textMuted, marginLeft: 4, marginBottom: 4 }]}>kg</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', marginBottom: 4 }}>
                  <TrendingUp size={14} color={c.fg} />
                  <Text style={[typography.captionBold, { color: c.fg, marginLeft: 3 }]}>-2,1</Text>
                </View>
              </View>
              <Sparkline w={192} h={46} />
            </Card>
          </Floaty>
          <Floaty delay={700} amplitude={9} style={{ position: 'absolute', top: 0, left: -8 }}>
            {chip(<TrendingUp size={14} color={c.fg} />, '6 semanas', c.bg)}
          </Floaty>
        </>
      )}

      {slideKey === 'chat' && (
        <>
          <Floaty style={{ alignSelf: 'flex-start' }}>
            <Card style={{ backgroundColor: surface, maxWidth: 200, borderTopLeftRadius: 6 }}>
              <Text style={[typography.bodyMd, { color: t.text }]}>Como foi o almoço hoje? 😊</Text>
            </Card>
          </Floaty>
          <Floaty delay={500} amplitude={9} style={{ alignSelf: 'flex-end', marginTop: space.lg }}>
            <View style={{ borderRadius: radius.xl, borderBottomRightRadius: 6, overflow: 'hidden', ...shadows.lg }}>
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.lg, maxWidth: 200 }}>
                <Text style={[typography.bodyMd, { color: t.primaryFg }]}>Segui o plano certinho! 💪</Text>
              </LinearGradient>
            </View>
          </Floaty>
          <Floaty delay={1000} style={{ position: 'absolute', bottom: 0, alignSelf: 'center' }}>
            {chip(<MessageCircle size={14} color={c.fg} />, 'Resposta em minutos', c.bg)}
          </Floaty>
        </>
      )}
    </View>
  )
}

export default function OnboardingScreen() {
  const t = useThemeColors()
  const { width } = useWindowDimensions()
  const accessCode = useAuthStore((s) => s.accessCode)
  const setSeen = useOnboardingStore((s) => s.setSeen)
  const listRef = useRef<FlatList<Slide>>(null)
  const [index, setIndex] = useState(0)

  const isLast = index === SLIDES.length - 1

  const tone = (k: Slide['tone']): Tone =>
    k === 'info' ? { bg: t.infoLight, fg: t.info } : k === 'accent' ? { bg: t.accentLight, fg: t.accent } : { bg: t.primaryLight, fg: t.primary }

  function finish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setSeen()
    router.replace(accessCode ? '/(tabs)' : '/login')
  }

  function next() {
    if (isLast) return finish()
    Haptics.selectionAsync().catch(() => {})
    listRef.current?.scrollToIndex({ index: index + 1, animated: true })
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    if (i !== index) setIndex(i)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'bottom']}>
      {/* Skip */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.sm }}>
        <Pressable onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel="Pular introdução">
          <Text style={[typography.labelMd, { color: t.textMuted }]}>Pular</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => {
          const c = tone(item.tone)
          return (
            <View style={{ width, height: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space['4xl'] }}>
              <Animated.View entering={FadeInDown.duration(500)} style={{ marginBottom: space['4xl'] }}>
                <Illustration slideKey={item.key} c={c} t={t} />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(120).duration(500)} style={[typography.displaySm, { color: t.text, textAlign: 'center', marginBottom: space.md }]}>
                {item.title}
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={[typography.bodyLg, { color: t.textSecondary, textAlign: 'center' }]}>
                {item.body}
              </Animated.Text>
            </View>
          )
        }}
      />

      {/* Footer: dots + button */}
      <View style={{ paddingHorizontal: space['3xl'], paddingBottom: space.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm, marginBottom: space['2xl'] }}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={{
                height: 8,
                width: i === index ? 22 : 8,
                borderRadius: radius.full,
                backgroundColor: i === index ? t.primary : t.border,
              }}
            />
          ))}
        </View>

        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Continuar' : 'Avançar'}
          style={({ pressed }) => ({
            borderRadius: radius.lg,
            overflow: 'hidden',
            opacity: pressed ? 0.95 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
            ...shadows.glow(t.primary),
          })}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}
          >
            <Text style={[typography.labelLg, { color: t.primaryFg, marginRight: space.sm }]}>
              {isLast ? 'Continuar' : 'Avançar'}
            </Text>
            <ArrowRight size={18} color={t.primaryFg} />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
