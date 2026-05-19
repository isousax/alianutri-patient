import { View, Text, Pressable, Modal, Dimensions, Alert } from 'react-native'
import { router } from 'expo-router'
import {
  FileText, ClipboardList, Target,
  User, LogOut, X, Palette,
} from 'lucide-react-native'
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../stores/auth'
import { useThemeStore, useThemeColors } from '../stores/theme'
import { THEME_LIST, type AppTheme } from '../theme/themes'

const { height: SCREEN_H } = Dimensions.get('window')

interface Props {
  visible: boolean
  onClose: () => void
}

export default function MenuSheet({ visible, onClose }: Props) {
  const t = useThemeColors()
  const insets = useSafeAreaInsets()
  const logout = useAuthStore((s) => s.logout)
  const patient = useAuthStore((s) => s.patient)
  const { themeId, setTheme } = useThemeStore()

  function nav(path: string) {
    onClose()
    setTimeout(() => router.push(path as never), 150)
  }

  function handleLogout() {
    onClose()
    setTimeout(() => {
      Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair', style: 'destructive',
          onPress: () => { logout(); router.replace('/login') },
        },
      ])
    }, 200)
  }

  const MENU_ITEMS = [
    { icon: FileText, label: 'Orientações', path: '/(tabs)/guidelines' },
    { icon: ClipboardList, label: 'Questionários', path: '/questionnaires' },
    { icon: Target, label: 'Metas', path: '/goals' },
    { icon: User, label: 'Meu perfil', path: '/(tabs)/profile' },
  ]

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <Pressable className="flex-1" onPress={onClose} />

        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(18)}
          style={{
            backgroundColor: t.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 16,
            maxHeight: SCREEN_H * 0.7,
          }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pb-4">
            <View className="flex-row items-center gap-3">
              <View
                style={{ backgroundColor: t.primaryLight, width: 44, height: 44, borderRadius: 22 }}
                className="items-center justify-center"
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: t.primary }}>
                  {(patient?.name?.[0] ?? 'P').toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ color: t.text }} className="text-base font-sans-semibold">
                  {patient?.name?.split(' ')[0] ?? 'Paciente'}
                </Text>
                <Text style={{ color: t.textMuted }} className="text-xs font-sans">
                  Minha conta
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} className="p-2">
              <X size={20} color={t.textMuted} />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: t.borderLight }} className="mx-6" />

          {/* Nav items */}
          <View className="px-4 pt-3 pb-4">
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => nav(item.path)}
                className="flex-row items-center gap-4 px-3 py-3.5 rounded-xl"
                style={({ pressed }) => pressed ? { backgroundColor: t.surfacePressed } : undefined}
              >
                <item.icon size={20} color={t.textSecondary} />
                <Text style={{ color: t.text }} className="text-sm font-sans-medium flex-1">
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: t.borderLight }} className="mx-6" />

          {/* Theme picker */}
          <View className="px-6 pt-4 pb-3">
            <View className="flex-row items-center gap-2 mb-3">
              <Palette size={14} color={t.textMuted} />
              <Text style={{ color: t.textMuted }} className="text-xs font-sans-medium uppercase tracking-wider">
                Tema
              </Text>
            </View>
            <View className="flex-row gap-2">
              {THEME_LIST.map((theme) => (
                <ThemePill
                  key={theme.id}
                  theme={theme}
                  isActive={themeId === theme.id}
                  onSelect={() => setTheme(theme.id)}
                />
              ))}
            </View>
          </View>

          {/* Logout */}
          <View className="px-4 pt-2">
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center gap-4 px-3 py-3.5 rounded-xl"
              style={({ pressed }) => pressed ? { backgroundColor: t.error + '12' } : undefined}
            >
              <LogOut size={20} color={t.error} />
              <Text className="text-sm font-sans-medium" style={{ color: t.error }}>Sair</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

function ThemePill({ theme, isActive, onSelect }: {
  theme: AppTheme
  isActive: boolean
  onSelect: () => void
}) {
  const t = useThemeColors()

  return (
    <Pressable
      onPress={onSelect}
      className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
      style={{
        backgroundColor: isActive ? t.primaryLight : t.surface,
        borderWidth: isActive ? 1.5 : 1,
        borderColor: isActive ? t.primary : t.border,
      }}
    >
      <Text style={{ fontSize: 14 }}>{theme.emoji}</Text>
      <Text
        className="text-xs font-sans-semibold"
        style={{ color: isActive ? t.primary : t.textSecondary }}
      >
        {theme.name}
      </Text>
    </Pressable>
  )
}
