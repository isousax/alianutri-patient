import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, Pressable, type ViewStyle, type TextStyle,
  type PressableProps, ActivityIndicator, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import Svg, { Circle as SvgCircle } from 'react-native-svg'
import Animated, {
  FadeIn, FadeInDown,
  useSharedValue, useAnimatedProps, withTiming, withSpring, Easing,
  useAnimatedStyle, interpolate, withRepeat,
} from 'react-native-reanimated'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useThemeColors, type ThemeColors } from '../../stores/theme'
import { shadows, radius, space, typography, SCREEN_PADDING, motion } from '../../theme/tokens'
import { AliaMark } from '../Brand'

// ══════════════════════════════════════════════════════
//  CARD — The fundamental surface container
//  Borderless on light themes, subtle border on dark
// ══════════════════════════════════════════════════════

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  padded?: boolean    // default true
  onPress?: () => void
  entering?: typeof FadeInDown | ReturnType<typeof FadeInDown.duration>
}

export function Card({ children, style, padded = true, onPress, entering }: CardProps) {
  const t = useThemeColors()
  const scale = useSharedValue(1)
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const cardStyle: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: radius.xl,
    borderWidth: t.cardBorder === 'transparent' ? 0 : 1,
    borderColor: t.cardBorder,
    ...(padded ? { padding: space.lg } : {}),
    ...shadows.md,
    ...style,
  }

  const Wrapper = entering ? Animated.View : View

  if (onPress) {
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      onPress()
    }
    return (
      <Wrapper {...(entering ? { entering } : {})}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => { scale.value = withSpring(0.97, motion.spring) }}
          onPressOut={() => { scale.value = withSpring(1, motion.spring) }}
        >
          <Animated.View style={[cardStyle, pressStyle]}>
            {children}
          </Animated.View>
        </Pressable>
      </Wrapper>
    )
  }

  return (
    <Wrapper style={cardStyle} {...(entering ? { entering } : {})}>
      {children}
    </Wrapper>
  )
}

// ══════════════════════════════════════════════════════
//  SCREEN HEADER — Back button + title (stack screens)
// ══════════════════════════════════════════════════════

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  rightAction?: React.ReactNode
  onBack?: () => void
}

export function ScreenHeader({ title, subtitle, rightAction, onBack }: ScreenHeaderProps) {
  const t = useThemeColors()

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SCREEN_PADDING,
      paddingTop: space.md,
      paddingBottom: space.md,
    }}>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onBack ? onBack() : router.back() }}
        hitSlop={12}
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.surfaceSecondary,
          marginRight: space.md,
        }}
      >
        <ChevronLeft size={20} color={t.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[typography.headingLg, { color: t.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightAction}
    </View>
  )
}

// ══════════════════════════════════════════════════════
//  SECTION LABEL — Overline text for grouping content
// ══════════════════════════════════════════════════════

interface SectionLabelProps {
  text: string
  style?: TextStyle
}

export function SectionLabel({ text, style }: SectionLabelProps) {
  const t = useThemeColors()
  return (
    <Text style={[
      typography.overline,
      { color: t.textMuted, marginBottom: space.sm, marginLeft: 2 },
      style,
    ]}>
      {text}
    </Text>
  )
}

// ══════════════════════════════════════════════════════
//  ANIMATED PROGRESS RING — Smooth, Apple-quality
// ══════════════════════════════════════════════════════

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle)

interface ProgressRingProps {
  progress: number   // 0-1
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  children?: React.ReactNode  // center content
}

export function ProgressRing({
  progress,
  size = 72,
  strokeWidth = 6,
  color,
  trackColor,
  children,
}: ProgressRingProps) {
  const t = useThemeColors()
  const ringColor = color ?? t.primary
  const track = trackColor ?? t.borderLight

  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r

  const animProgress = useSharedValue(0)

  useEffect(() => {
    animProgress.value = withTiming(Math.min(progress, 1), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    })
  }, [progress])

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }))

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <SvgCircle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={track} strokeWidth={strokeWidth}
        />
        <AnimatedSvgCircle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={ringColor} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children ?? (
        <Text style={[typography.labelMd, { color: ringColor }]}>
          {Math.round(Math.min(progress, 1) * 100)}%
        </Text>
      )}
    </View>
  )
}

// ══════════════════════════════════════════════════════
//  EMPTY STATE — Beautiful, emotional, not generic
// ══════════════════════════════════════════════════════

interface EmptyStateProps {
  icon: React.ReactNode
  iconBg?: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, iconBg, title, description, actionLabel, onAction }: EmptyStateProps) {
  const t = useThemeColors()
  const aScale = useSharedValue(1)
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: aScale.value }] }))

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space['5xl'],
      }}
    >
      <View style={{
        width: 72,
        height: 72,
        borderRadius: radius['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: iconBg ?? t.primaryLight,
        marginBottom: space.xl,
      }}>
        {icon}
      </View>
      <Text style={[typography.headingMd, { color: t.text, textAlign: 'center', marginBottom: space.sm }]}>
        {title}
      </Text>
      <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', lineHeight: 22 }]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onAction() }}
          onPressIn={() => { aScale.value = withSpring(0.96, motion.spring) }}
          onPressOut={() => { aScale.value = withSpring(1, motion.spring) }}
        >
          <Animated.View style={[{
            marginTop: space.xl,
            paddingHorizontal: space['2xl'],
            paddingVertical: space.md,
            borderRadius: radius.lg,
            backgroundColor: t.primary,
            ...shadows.glow(t.primary),
          }, aStyle]}>
            <Text style={[typography.labelMd, { color: t.primaryFg }]}>
              {actionLabel}
            </Text>
          </Animated.View>
        </Pressable>
      )}
    </Animated.View>
  )
}

// ══════════════════════════════════════════════════════
//  LIST ROW — Tappable row with icon, title, subtitle
// ══════════════════════════════════════════════════════

interface ListRowProps {
  icon: React.ReactNode
  iconBg?: string
  title: string
  subtitle?: string
  badge?: number
  onPress?: () => void
  rightContent?: React.ReactNode
}

export function ListRow({ icon, iconBg, title, subtitle, badge, onPress, rightContent }: ListRowProps) {
  const t = useThemeColors()

  return (
    <Pressable
      onPress={onPress ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress() } : undefined}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: space.md + 2,
        paddingHorizontal: space.lg,
        backgroundColor: pressed ? t.surfacePressed : 'transparent',
        borderRadius: radius.lg,
      })}
    >
      <View style={{
        width: 40,
        height: 40,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: iconBg ?? t.primaryLight,
        marginRight: space.md,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.labelMd, { color: t.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}>{subtitle}</Text>
        )}
      </View>
      {badge != null && badge > 0 ? (
        <View style={{
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
          backgroundColor: t.error,
        }}>
          <Text style={[typography.captionBold, { color: '#fff', fontSize: 10 }]}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : rightContent ? rightContent : onPress ? (
        <ChevronRight size={16} color={t.textMuted} />
      ) : null}
    </Pressable>
  )
}

// ══════════════════════════════════════════════════════
//  PILL BADGE — Small colored badge
// ══════════════════════════════════════════════════════

interface PillBadgeProps {
  text: string
  color?: string
  bg?: string
}

export function PillBadge({ text, color, bg }: PillBadgeProps) {
  const t = useThemeColors()
  return (
    <View style={{
      paddingHorizontal: space.sm,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: bg ?? t.primaryLight,
    }}>
      <Text style={[typography.captionBold, { color: color ?? t.primary, fontSize: 10 }]}>
        {text}
      </Text>
    </View>
  )
}

// ══════════════════════════════════════════════════════
//  STAT CHIP — Compact metric display (streak, count)
// ══════════════════════════════════════════════════════

interface StatChipProps {
  icon: React.ReactNode
  value: string | number
  label?: string
  bg?: string
  textColor?: string
}

export function StatChip({ icon, value, label, bg, textColor }: StatChipProps) {
  const t = useThemeColors()
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      borderRadius: radius.lg,
      backgroundColor: bg ?? t.surfaceSecondary,
    }}>
      {icon}
      <Text style={[
        typography.labelMd,
        { color: textColor ?? t.text, marginLeft: 6 },
      ]}>
        {value}
      </Text>
      {label && (
        <Text style={[typography.caption, { color: t.textMuted, marginLeft: 4 }]}>
          {label}
        </Text>
      )}
    </View>
  )
}

// ══════════════════════════════════════════════════════
//  SKELETON — Shimmer placeholder (gradient sweep)
// ══════════════════════════════════════════════════════

interface SkeletonBlockProps {
  width: number | `${number}%`
  height: number
  borderRadius?: number
  style?: ViewStyle
}

export function SkeletonBlock({ width, height, borderRadius: br = radius.sm, style }: SkeletonBlockProps) {
  const t = useThemeColors()
  const [w, setW] = useState(0)
  const x = useSharedValue(0)

  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, false)
  }, [])

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [0, 1], [-w, w]) }],
  }))

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: br, backgroundColor: t.borderLight, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, sweepStyle]}>
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

// ══════════════════════════════════════════════════════
//  LOADING SCREEN — Centered, minimal
// ══════════════════════════════════════════════════════

export function LoadingScreen() {
  const t = useThemeColors()
  const pulse = useSharedValue(0)
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [])
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.7, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.97, 1.03]) }],
  }))
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background, alignItems: 'center', justifyContent: 'center', gap: space.xl }} edges={['top']}>
      <Animated.View style={markStyle}>
        <AliaMark size={68} />
      </Animated.View>
      <ActivityIndicator size="small" color={t.primary} />
    </SafeAreaView>
  )
}

// ══════════════════════════════════════════════════════
//  DIVIDER — Thin line separator
// ══════════════════════════════════════════════════════

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useThemeColors()
  return (
    <View style={{
      height: 1,
      backgroundColor: t.borderLight,
      marginLeft: inset,
    }} />
  )
}
