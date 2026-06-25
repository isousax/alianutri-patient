import { View, Text, Pressable, Alert, Linking, ScrollView, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  LogOut, Bell, Shield, ChevronRight,
} from 'lucide-react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useAuthStore } from '../src/stores/auth'
import { useThemeColors, useTheme, useThemeStore } from '../src/stores/theme'
import { THEME_LIST, type AppTheme, type ThemeColors } from '../src/theme/themes'
import { ScreenHeader, Card, SectionLabel, Divider } from '../src/components/ui'
import { radius, space, typography, SCREEN_PADDING } from '../src/theme/tokens'
import { REMINDERS } from '../src/lib/localNotifications'
import { useRemindersStore } from '../src/stores/reminders'

export default function SettingsScreen() {
  const t = useThemeColors()
  const theme = useTheme()
  const setTheme = useThemeStore((s) => s.setTheme)
  const logout = useAuthStore((s) => s.logout)
  const reminderEnabled = useRemindersStore((s) => s.enabled)
  const toggleReminder = useRemindersStore((s) => s.toggle)

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
      <ScreenHeader title="Configurações" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ── Theme section ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(50)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg }}>
          <SectionLabel text="APARÊNCIA" />
          <Card>
            <Text style={[typography.caption, { color: t.textSecondary, marginBottom: space.md }]}>
              Escolha o tema visual do app
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm + 2 }}>
              {THEME_LIST.map((th: AppTheme) => {
                const selected = theme.id === th.id
                return (
                  <Pressable
                    key={th.id}
                    onPress={() => handleThemeSelect(th.id)}
                    style={{
                      flex: 1,
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      paddingVertical: space.md,
                      backgroundColor: selected ? t.primary : t.surfacePressed,
                      borderWidth: 1.5,
                      borderColor: selected ? t.primary : t.borderLight,
                    }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{th.emoji}</Text>
                    <Text style={[typography.captionBold, { color: selected ? t.primaryFg : t.textSecondary }]}>
                      {th.name}
                    </Text>
                    {selected && (
                      <View style={{
                        width: 6, height: 6,
                        borderRadius: 3,
                        marginTop: 6,
                        backgroundColor: t.primaryFg,
                      }} />
                    )}
                  </Pressable>
                )
              })}
            </View>
          </Card>
        </Animated.View>

        {/* ── Reminders section ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space['2xl'] }}>
          <SectionLabel text="LEMBRETES" />
          <Card padded={false}>
            <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs }}>
              <Text style={[typography.caption, { color: t.textSecondary }]}>
                Lembretes diários pra manter o hábito — ligue só os que fizerem sentido pra você.
              </Text>
            </View>
            {REMINDERS.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <Divider inset={space.lg} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md }}>
                  <Text style={[typography.labelMd, { color: t.text, flex: 1 }]}>{r.label}</Text>
                  <Switch
                    value={!!reminderEnabled[r.id]}
                    onValueChange={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
                      toggleReminder(r.id)
                    }}
                    trackColor={{ false: t.surfacePressed, true: t.primary }}
                    thumbColor={t.surface}
                  />
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* ── General section ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(150)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space['2xl'] }}>
          <SectionLabel text="GERAL" />
          <Card padded={false}>
            <SettingsRow
              icon={<Bell size={18} color={t.textSecondary} />}
              label="Notificações"
              subtitle="Gerenciar nas configurações do sistema"
              onPress={() => Linking.openSettings()}
              t={t}
            />
            <Divider inset={space.lg + 34 + space.md} />
            <SettingsRow
              icon={<Shield size={18} color={t.textSecondary} />}
              label="Privacidade"
              subtitle="Seus dados são protegidos e criptografados"
              t={t}
            />
          </Card>
        </Animated.View>

        {/* ── Danger zone ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space['2xl'] }}>
          <Card padded={false}>
            <Pressable
              onPress={handleLogout}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingVertical: space.lg,
              }}
            >
              <LogOut size={18} color={t.error} />
              <Text style={[typography.labelMd, { color: t.error, flex: 1 }]}>Sair da conta</Text>
            </Pressable>
          </Card>
        </Animated.View>

        {/* ── Version footer ── */}
        <Animated.View entering={FadeIn.duration(400).delay(400)} style={{ alignItems: 'center', marginTop: space['3xl'] }}>
          <Text style={[typography.caption, { color: t.textMuted }]}>
            AliaPatient v{version}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Settings row subcomponent ──

function SettingsRow({ icon, label, subtitle, onPress, t }: {
  icon: React.ReactNode
  label: string
  subtitle?: string
  onPress?: () => void
  t: ThemeColors
}) {
  const content = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.lg,
    }}>
      <View style={{
        width: 34,
        height: 34,
        borderRadius: radius.sm + 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.surfaceSecondary,
        flexShrink: 0,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Text style={[typography.labelMd, { color: t.text }]} numberOfLines={1}>{label}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]} numberOfLines={2}>{subtitle}</Text>
        ) : null}
      </View>
      {onPress ? <ChevronRight size={14} color={t.textMuted} /> : null}
    </View>
  )

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>
  }
  return content
}
