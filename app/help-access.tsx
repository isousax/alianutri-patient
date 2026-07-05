import type { ComponentType } from 'react'
import { View, Text, Pressable, Dimensions, ScrollView } from 'react-native'
import { router, type Href } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, KeyRound, Smartphone, UserCheck, ShieldCheck, HelpCircle } from 'lucide-react-native'
import { useThemeColors, useTheme } from '../src/stores/theme'
import { shadows, radius, space, typography, gradients } from '../src/theme/tokens'
import { GlowBlob } from '../src/components/Brand'

const { width: SCREEN_W } = Dimensions.get('window')

type HelpItem = { icon: ComponentType<{ size?: number; color?: string }>; title: string; body: string }

const ITEMS: HelpItem[] = [
  {
    icon: KeyRound,
    title: 'Perdi ou esqueci meu código',
    body: 'O código é criado pelo seu nutricionista. É só pedir para ele reenviar — é com esse código que você entra no app.',
  },
  {
    icon: Smartphone,
    title: 'Troquei de celular',
    body: 'Por segurança, o app fica ativo em um aparelho por vez. Peça ao seu nutricionista para “Resetar acesso do app” e entre de novo com o mesmo código neste celular.',
  },
  {
    icon: UserCheck,
    title: 'Meus dados não confirmam',
    body: 'Se a data de nascimento, o CPF ou o telefone não baterem, seu nutricionista corrige o seu cadastro e libera o acesso para você.',
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
          {/* Header verde coeso e FIXO — back + ícone + título/subtítulo. Como não
              rola, a folha branca abaixo desliza por dentro e o header nunca fica
              "espremido" num filete verde sobre o branco. */}
          <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl }}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={12}
              style={{ width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }}
            >
              <ArrowLeft size={20} color={t.primaryFg} />
            </Pressable>

            <View style={{ marginTop: space.xl }}>
              <View style={{ width: 52, height: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: space.md }}>
                <HelpCircle size={26} color={t.primaryFg} />
              </View>
              <Text accessibilityRole="header" style={[typography.displaySm, { color: t.primaryFg }]}>
                Precisa de ajuda{'\n'}para entrar?
              </Text>
              <Text style={[typography.bodyMd, { color: 'rgba(255,255,255,0.9)', marginTop: space.sm }]}>
                Quem cuida do seu acesso é o seu nutricionista. Veja o que fazer em cada situação.
              </Text>
            </View>
          </View>

          {/* Folha branca — preenche o resto e rola por DENTRO. */}
          <View style={{ flex: 1, backgroundColor: t.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', ...shadows.xl }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: space['2xl'], paddingBottom: space['4xl'] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {ITEMS.map((item, i) => {
                const Icon = item.icon
                return (
                  <View
                    key={item.title}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, paddingVertical: space.lg, borderBottomWidth: i < ITEMS.length - 1 ? 1 : 0, borderBottomColor: t.borderLight }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primaryLight }}>
                      <Icon size={21} color={t.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.labelLg, { color: t.text, marginBottom: 3 }]}>{item.title}</Text>
                      <Text style={[typography.bodySm, { color: t.textMuted, lineHeight: 20 }]}>{item.body}</Text>
                    </View>
                  </View>
                )
              })}

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: t.surfaceSecondary }}>
                <ShieldCheck size={18} color={t.success} style={{ marginTop: 1 }} />
                <Text style={[typography.bodySm, { color: t.textSecondary, flex: 1, lineHeight: 20 }]}>
                  Esse cuidado protege os seus dados de saúde: mesmo que o código seja compartilhado, só o seu aparelho fica conectado.
                </Text>
              </View>

              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Voltar para a tela de acesso"
                style={{ marginTop: space['2xl'], borderRadius: radius.lg, overflow: 'hidden', ...shadows.glow(t.primary) }}
              >
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg }}>
                  <Text style={[typography.labelLg, { color: t.primaryFg }]}>Entendi, voltar</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  )
}
