import { View, Text, Pressable } from 'react-native'
import { Tabs } from 'expo-router'
import { Home, Utensils, BookOpen } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors } from '../../src/stores/theme'

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0]

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const t = useThemeColors()
  const insets = useSafeAreaInsets()

  const visibleRoutes = state.routes.filter((r: (typeof state.routes)[number]) => {
    const options = descriptors[r.key]?.options
    return (options as Record<string, unknown>)?.href !== null
  })

  return (
    <View
      style={{
        backgroundColor: t.tabBar,
        borderTopWidth: 1,
        borderTopColor: t.tabBarBorder,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
        paddingTop: 10,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-around',
      }}
    >
      {visibleRoutes.map((route: (typeof state.routes)[number]) => {
        const realIndex = state.routes.indexOf(route)
        const { options } = descriptors[route.key]
        const isActive = state.index === realIndex

        const icons: Record<string, typeof Home> = {
          index: Home,
          'meal-plan': Utensils,
          diary: BookOpen,
        }
        const Icon = icons[route.name] ?? Home

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            className="items-center px-5 py-1.5 rounded-2xl"
            style={isActive ? { backgroundColor: t.primaryLight } : undefined}
          >
            <Icon size={22} color={isActive ? t.primary : t.tabBarInactive} />
            <Text
              className="text-[11px] mt-0.5"
              style={{
                color: isActive ? t.primary : t.tabBarInactive,
                fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
              }}
            >
              {options.title ?? route.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="meal-plan" options={{ title: 'Plano' }} />
      <Tabs.Screen name="diary" options={{ title: 'Diário' }} />
      <Tabs.Screen name="guidelines" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  )
}
