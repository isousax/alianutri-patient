import { Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { Home, Utensils, FileText, BookOpen, User } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'

const ICON_SIZE = 22

export default function TabLayout() {
  const t = useThemeColors()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.tabBarInactive,
        tabBarStyle: {
          borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
          borderTopColor: t.tabBarBorder,
          backgroundColor: t.tabBar,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 10,
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Home size={ICON_SIZE} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: 'Plano',
          tabBarIcon: ({ color }) => <Utensils size={ICON_SIZE} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diário',
          tabBarIcon: ({ color }) => <BookOpen size={ICON_SIZE} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="guidelines"
        options={{
          title: 'Orientações',
          tabBarIcon: ({ color }) => <FileText size={ICON_SIZE} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={ICON_SIZE} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  )
}
