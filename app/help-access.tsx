import type { ComponentType } from 'react'
import { View, Text, Pressable, Dimensions, ScrollView } from 'react-native'
import { router, type Href } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, KeyRound, Smartphone, UserCheck, ShieldCheck, HelpCircle } from 'lucide-react-native'
import { useThemeColors, useTheme } from '../src/stores/theme'
import { shadows, radius, space, typography, gradients } from '../src/theme/tokens'
import { AliaWordmark, GlowBlob } from '../src/components/Brand'

const { width: SCREEN_W } = Dimensions.get('window')

type HelpItem = { icon: ComponentType<{ size?: number; color?: string }>; title: string; body: string }

const ITEMS: HelpItem[] = [
  {
    icon: KeyRound,
    title: 'Perdi ou esqueci meu código',
    body: 'O código de acesso é gerado pelo seu nutricionista. Peça para ele reenviar o seu código — é com ele que você entra no app.',
  },
  {
    icon: Smartphone,
    title: 'Troquei de celular ou tenho um aparelho novo',
    body: 'Por segurança, o acesso funciona em um aparelho por vez. Peça ao seu nutricionista para tocar em "Resetar acesso do app". Depois é só entrar de novo com o mesmo código neste aparelho.',
  },
  {
    icon: UserCheck,
    title: 'Não consigo confirmar minha identidade',
    body: 'Se a data de nascimento, o CPF ou o telefone não conferirem, seu nutricionista pode corrigir o seu cadastro e resetar o acesso para você vincular este aparelho.',
  },
]

export default function HelpAccessScreen() {
  const t = useThemeColors()
  const theme = useTheme()

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/login' as Href)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.dark ? gradients.night[1] : gradients.brand[0] }}>
      <LinearGradient colors={theme.dark ? gradients.night : gradients.brand} start={{ x: 0.1, y: 0 }} end={{ x: 0.95, y: 0.8 }} style={{ flex: 1 }}>
        <GlowBlob size={SCREEN_W * 1.1} color="#2DD4BF" opacity={theme.dark ? 0.22 : 0.34} style={{ position: 'absolute', top: -SCREEN_W * 0.4, left: -SCREEN_W * 0.3 }} />
        <GlowBlob size={SCREEN_W * 0.85} color="#818CF8" opacity={theme.dark ? 0.24 : 0.2} style={{ position: 'absolute', top: SCREEN_W * 0.1, right: -SCREEN_W * 0.35 }} />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={12}
              style={{ width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }}
            >
              <ArrowLeft size={20} color={t.primaryFg} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', paddingTop: space.xl, paddingBottom: space['3xl'] }}>
              <View style={{ width: 64, height: 64, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: space.lg }}>
                <HelpCircle size={30} color={t.primaryFg} />
              </View>
              <AliaWordmark textOnly size={26} color={t.primaryFg} />
            </View>

            <View style={{ flex: 1, backgroundColor: t.background, paddingHorizontal: space['3xl'], paddingTop: space['4xl'], borderTopLeftRadius: 36, borderTopRightRadius: 36, ...shadows.xl }}>
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: radius.full, backgroundColor: t.borderLight, marginBottom: space['2xl'] }} />

              <Text style={[typography.displaySm, { color: t.text, marginBottom: space.xs }]}>Precisa de ajuda para entrar?</Text>
              <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space['3xl'] }]}>
                Quem libera o seu acesso é o seu nutricionista. Veja o que fazer em cada situação:
              </Text>

              {ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <View
                    key={item.title}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, backgroundColor: t.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: t.borderLight, padding: space.lg, marginBottom: space.lg }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primaryMuted }}>
                      <Icon size={20} color={t.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.labelLg, { color: t.text, marginBottom: 4 }]}>{item.title}</Text>
                      <Text style={[typography.bodySm, { color: t.textMuted }]}>{item.body}</Text>
                    </View>
                  </View>
                )
              })}

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.sm, marginBottom: space['3xl'] }}>
                <ShieldCheck size={16} color={t.success} style={{ marginTop: 2 }} />
                <Text style={[typography.caption, { color: t.textMuted, flex: 1 }]}>
                  Esse cuidado protege os seus dados de saúde: mesmo que o código seja compartilhado, só o seu aparelho fica vinculado.
                </Text>
              </View>

              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Voltar para a tela de acesso"
                style={{ borderRadius: radius.lg, overflow: 'hidden', ...shadows.glow(t.primary) }}
              >
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}>
                  <Text style={[typography.labelLg, { color: t.primaryFg }]}>Entendi, voltar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  )
}
