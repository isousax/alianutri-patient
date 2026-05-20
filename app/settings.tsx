import { View, Text, Pressable, Alert, Linking, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft, Palette, LogOut, Bell, Shield, Info,
  ChevronRight,
} from 'lucide-react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useAuthStore } from '../src/stores/auth'
import { useThemeColors, useTheme, useThemeStore } from '../src/stores/theme'
import { THEME_LIST, type AppTheme } from '../src/theme/themes'
import type { ThemeColors } from '../src/theme/themes'

export default function SettingsScreen() {
  const t = useThemeColors()
  const theme = useTheme()
  const setTheme = useThemeStore((s) => s.setTheme)
  const logout = useAuthStore((s) => s.logout)

  function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout()
          router.replace('/login')
        },
      },
    ])
  }

  function handleThemeSelect(id: AppTheme['id']) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTheme(id)
  }

  const version = Constants.expoConfig?.version ?? '1.0.0'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-3 pb-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-9 w-9 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: t.surface }}
        >
          <ChevronLeft size={18} color={t.text} />
        </Pressable>
        <Text style={{ color: t.text }} className="text-lg font-sans-bold">Configurações</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Theme section ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(50)} className="px-5 mt-4">
          <SectionHeader icon={<Palette size={14} color={t.textSecondary} />} label="Aparência" t={t} />
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
            <View className="p-4">
              <Text style={{ color: t.textSecondary }} className="text-xs font-sans mb-3">Escolha o tema visual do app</Text>
              <View className="flex-row gap-2.5">
                {THEME_LIST.map((th: AppTheme) => {
                  const selected = theme.id === th.id
                  return (
                    <Pressable
                      key={th.id}
                      onPress={() => handleThemeSelect(th.id)}
                      className="flex-1 rounded-xl items-center py-3"
                      style={{
                        backgroundColor: selected ? t.primary : t.surfacePressed,
                        borderWidth: 1.5,
                        borderColor: selected ? t.primary : t.borderLight,
                      }}
                    >
                      <Text className="text-xl mb-1">{th.emoji}</Text>
                      <Text
                        className="text-[11px] font-sans-semibold"
                        style={{ color: selected ? t.primaryText : t.textSecondary }}
                      >
                        {th.name}
                      </Text>
                      {selected && (
                        <View
                          className="h-1.5 w-1.5 rounded-full mt-1.5"
                          style={{ backgroundColor: t.primaryText }}
                        />
                      )}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── General section ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(150)} className="px-5 mt-6">
          <SectionHeader icon={<Info size={14} color={t.textSecondary} />} label="Geral" t={t} />
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
            <SettingsRow
              icon={<Bell size={16} color={t.textSecondary} />}
              label="Notificações"
              subtitle="Gerenciar nas configurações do sistema"
              onPress={() => Linking.openSettings()}
              t={t}
            />
            <Divider t={t} />
            <SettingsRow
              icon={<Shield size={16} color={t.textSecondary} />}
              label="Privacidade"
              subtitle="Seus dados são protegidos e criptografados"
              t={t}
            />
          </View>
        </Animated.View>

        {/* ── Danger zone ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)} className="px-5 mt-6">
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center gap-3 px-4 py-4"
            >
              <LogOut size={18} color={t.error} />
              <Text style={{ color: t.error }} className="text-sm font-sans-semibold flex-1">Sair da conta</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Version footer ── */}
        <Animated.View entering={FadeIn.duration(400).delay(400)} className="items-center mt-8">
          <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">
            AliaPatient v{version}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Shared subcomponents ──

function SectionHeader({ icon, label, t }: { icon: React.ReactNode; label: string; t: ThemeColors }) {
  return (
    <View className="flex-row items-center gap-2 mb-2 ml-1">
      {icon}
      <Text style={{ color: t.textSecondary }} className="text-[11px] font-sans-semibold uppercase tracking-wider">{label}</Text>
    </View>
  )
}

function SettingsRow({ icon, label, subtitle, onPress, t }: {
  icon: React.ReactNode
  label: string
  subtitle?: string
  onPress?: () => void
  t: ThemeColors
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 px-4 py-3.5"
    >
      {icon}
      <View className="flex-1">
        <Text style={{ color: t.text }} className="text-[13px] font-sans-medium">{label}</Text>
        {subtitle && (
          <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-0.5">{subtitle}</Text>
        )}
      </View>
      {onPress && <ChevronRight size={14} color={t.textMuted} />}
    </Pressable>
  )
}

function Divider({ t }: { t: ThemeColors }) {
  return <View className="mx-4" style={{ height: 1, backgroundColor: t.borderLight }} />
}
