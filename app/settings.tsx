import { View, Text, Pressable, Linking, ScrollView, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  LogOut, Bell, Shield, ChevronRight,
} from 'lucide-react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { haptics } from '../src/lib/haptics'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useAuthStore } from '../src/stores/auth'
import { useThemeColors, useThemeStore, type AppearanceMode, type LightThemeId } from '../src/stores/theme'
import { THEMES, type ThemeColors } from '../src/theme/themes'
import { ScreenHeader, Card, SectionLabel, Divider, SegmentedControl } from '../src/components/ui'
import { radius, space, typography, SCREEN_PADDING } from '../src/theme/tokens'
import { REMINDER_TOGGLES } from '../src/lib/localNotifications'
import { useRemindersStore } from '../src/stores/reminders'
import { confirm } from '../src/stores/confirm'

// Identidades claras oferecidas (o escuro é sempre Noturno).
const LIGHT_THEMES = [THEMES.default, THEMES.rose]

export default function SettingsScreen() {
  const t = useThemeColors()
  const mode = useThemeStore((s) => s.mode)
  const lightTheme = useThemeStore((s) => s.lightTheme)
  const setMode = useThemeStore((s) => s.setMode)
  const setLightTheme = useThemeStore((s) => s.setLightTheme)
  const logout = useAuthStore((s) => s.logout)
  const reminderEnabled = useRemindersStore((s) => s.enabled)
  const toggleReminder = useRemindersStore((s) => s.toggle)

  function handleLogout() {
    confirm({
      title: 'Sair',
      message: 'Tem certeza que deseja sair?',
      cancelLabel: 'Cancelar',
      confirmLabel: 'Sair',
      destructive: true,
      onConfirm: () => {
        logout()
        router.replace('/login')
      },
    })
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
            <Text style={[typography.labelMd, { color: t.text }]}>Modo</Text>
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 2, marginBottom: space.md }]}>
              “Automático” acompanha o claro/escuro do seu aparelho.
            </Text>
            <SegmentedControl
              options={[
                { key: 'system', label: 'Automático' },
                { key: 'light', label: 'Claro' },
                { key: 'dark', label: 'Escuro' },
              ]}
              value={mode}
              onChange={(k) => { haptics.light(); setMode(k as AppearanceMode) }}
            />

            <View style={{ height: 1, backgroundColor: t.borderLight, marginVertical: space.lg }} />

            <Text style={[typography.labelMd, { color: t.text }]}>Tema claro</Text>
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 2, marginBottom: space.md }]}>
              Usado no modo claro — e quando o sistema está claro.
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm + 2, opacity: mode === 'dark' ? 0.5 : 1 }}>
              {LIGHT_THEMES.map((th) => {
                const selected = lightTheme === th.id
                return (
                  <Pressable
                    key={th.id}
                    onPress={() => { haptics.light(); setLightTheme(th.id as LightThemeId) }}
                    accessibilityRole="button"
                    accessibilityLabel={`Tema claro ${th.name}`}
                    accessibilityState={{ selected }}
                    style={{
                      flex: 1,
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      paddingVertical: space.md,
                      backgroundColor: selected ? t.primaryLight : t.surfaceSecondary,
                      borderWidth: 1.5,
                      borderColor: selected ? t.primary : t.borderLight,
                    }}
                  >
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: th.colors.primary, marginBottom: 6 }} />
                    <Text style={[typography.captionBold, { color: selected ? t.text : t.textSecondary }]}>
                      {th.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Card>
        </Animated.View>

        {/* ── Notifications & reminders section ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space['2xl'] }}>
          <SectionLabel text="NOTIFICAÇÕES" />
          <Card padded={false}>
            <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs }}>
              <Text style={[typography.caption, { color: t.textSecondary }]}>
                Lembretes diários pra manter o hábito — ligue só os que fizerem sentido pra você.
              </Text>
            </View>
            {REMINDER_TOGGLES.map((r) => (
              <View key={r.id}>
                <Divider inset={space.lg} />
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md }}>
                  <View style={{ flex: 1, paddingRight: space.md }}>
                    <Text style={[typography.labelMd, { color: t.text }]}>{r.label}</Text>
                    <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>{r.description}</Text>
                  </View>
                  <Switch
                    value={!!reminderEnabled[r.id]}
                    accessibilityLabel={r.label}
                    onValueChange={() => {
                      haptics.light()
                      toggleReminder(r.id)
                    }}
                    trackColor={{ false: t.surfacePressed, true: t.primary }}
                    thumbColor={t.surface}
                  />
                </View>
              </View>
            ))}
            <Divider inset={space.lg} />
            <SettingsRow
              icon={<Bell size={18} color={t.textSecondary} />}
              label="Configurações do sistema"
              subtitle="Permissões e som das notificações"
              onPress={() => Linking.openSettings()}
              t={t}
            />
          </Card>
        </Animated.View>

        {/* ── General section ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(150)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space['2xl'] }}>
          <SectionLabel text="GERAL" />
          <Card padded={false}>
            <SettingsRow
              icon={<Shield size={18} color={t.textSecondary} />}
              label="Privacidade"
              subtitle="Termos de uso e política de privacidade"
              onPress={() => Linking.openURL('https://alianutri.com.br/privacidade')}
              t={t}
            />
          </Card>
        </Animated.View>

        {/* ── Danger zone ── */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space['2xl'] }}>
          <Card padded={false}>
            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
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
    return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={subtitle}>{content}</Pressable>
  }
  return content
}
