import { useEffect } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { Tabs } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Home, Utensils, FileText, BookOpen, User, type LucideIcon } from 'lucide-react-native'
import { useTheme, useThemeColors } from '../../src/stores/theme'
import { radius, shadows, motion } from '../../src/theme/tokens'

const ICON_SIZE = 22
const PILL_W = 56
const PILL_H = 34

// Active indicator: gradient pill + colored glow halo, with the icon
// cross-fading between the inactive tint and the on-primary color so it
// never flashes (e.g. a white glyph on a white bar) mid-transition.
function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  const t = useThemeColors()
  const p = useSharedValue(focused ? 1 : 0)

  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, motion.spring)
  }, [focused])

  const pillStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.7 + p.value * 0.3 }],
  }))
  const activeStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.9 + p.value * 0.1 }],
  }))
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value }))

  return (
    <View style={{ width: PILL_W, height: PILL_H, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          pillStyle,
          { borderRadius: radius.full, backgroundColor: t.primary, ...shadows.glow(t.primary) },
        ]}
      >
        <LinearGradient
          colors={[t.primary, t.primaryMuted]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ flex: 1, borderRadius: radius.full }}
        />
      </Animated.View>

      <Animated.View style={[styles.iconWrap, inactiveStyle]}>
        <Icon size={ICON_SIZE} color={t.tabBarInactive} strokeWidth={1.9} />
      </Animated.View>
      <Animated.View style={[styles.iconWrap, activeStyle]}>
        <Icon size={ICON_SIZE} color={t.primaryFg} strokeWidth={2.4} />
      </Animated.View>
    </View>
  )
}

export default function TabLayout() {
  const theme = useTheme()
  const t = theme.colors

  return (
    <Tabs
      screenListeners={{
        tabPress: () => { Haptics.selectionAsync().catch(() => {}) },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.tabBarInactive,
        // Floating "glass" sheet: rounded top, soft upward shadow, no hairline.
        // Kept in normal layout flow (not absolute) so screen content is never
        // hidden behind it — the rounded top + upward shadow already read as a
        // floating sheet.
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: t.tabBar,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          height: Platform.OS === 'ios' ? 90 : 72,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: theme.dark ? 0.5 : 0.07,
          shadowRadius: 18,
          elevation: 18,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 10,
          letterSpacing: 0.1,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: 'Plano',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Utensils} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diário',
          tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="guidelines"
        options={{
          title: 'Orientações',
          tabBarIcon: ({ focused }) => <TabIcon Icon={FileText} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
