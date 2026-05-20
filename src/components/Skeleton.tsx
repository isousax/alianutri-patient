import { createContext, useContext, useEffect } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated'
import { useThemeColors } from '../stores/theme'

// ── Shared pulse provider (single animation for all skeletons) ──

const PulseContext = createContext<SharedValue<number> | null>(null)

function SkeletonGroup({ children }: { children: React.ReactNode }) {
  const pulse = useSharedValue(0)
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true)
  }, [pulse])
  return <PulseContext.Provider value={pulse}>{children}</PulseContext.Provider>
}

// ── Skeleton primitive ──

interface SkeletonProps {
  width: number | `${number}%`
  height: number
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const t = useThemeColors()
  const sharedPulse = useContext(PulseContext)

  // Fallback: standalone pulse if not inside SkeletonGroup
  const localPulse = useSharedValue(0)
  const pulse = sharedPulse ?? localPulse
  useEffect(() => {
    if (!sharedPulse) {
      localPulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true)
    }
  }, [sharedPulse, localPulse])

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.8]),
  }))

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: t.borderLight,
        },
        animStyle,
        style,
      ]}
    />
  )
}

// ── Prebuilt skeleton layouts ──

export function SkeletonChatList() {
  return (
    <SkeletonGroup>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Skeleton width={60} height={22} borderRadius={11} />
        </View>
        <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
          <Skeleton width="65%" height={52} borderRadius={16} />
        </View>
        <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <Skeleton width="55%" height={40} borderRadius={16} />
        </View>
        <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
          <Skeleton width="40%" height={36} borderRadius={16} />
        </View>
        <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <Skeleton width="70%" height={60} borderRadius={16} />
        </View>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Skeleton width={48} height={22} borderRadius={11} />
        </View>
        <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
          <Skeleton width="50%" height={44} borderRadius={16} />
        </View>
        <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <Skeleton width="60%" height={36} borderRadius={16} />
        </View>
      </View>
    </SkeletonGroup>
  )
}

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup>
      <View style={{ paddingHorizontal: 20 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View
            key={i}
            style={{
              marginBottom: 12,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Skeleton width={40} height={40} borderRadius={12} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="60%" height={14} borderRadius={4} />
                <Skeleton width="40%" height={10} borderRadius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  )
}
