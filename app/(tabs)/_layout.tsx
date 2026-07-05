import { useEffect, useState } from 'react'
import { Platform, StyleSheet, View, Pressable } from 'react-native'
import { Tabs } from 'expo-router'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated'
import { haptics } from '../../src/lib/haptics'
import { Home, Utensils, BookOpen, Plus, HeartHandshake, type LucideIcon } from 'lucide-react-native'
import { useTheme, useThemeColors } from '../../src/stores/theme'
import { useFeaturesStore } from '../../src/stores/features'
import { radius, shadows, motion } from '../../src/theme/tokens'
import { RegistroSheet } from '../../src/components/registro/RegistroSheet'
import { useRecentPosts, usePortalHome } from '../../src/hooks/usePortal'
import { useDiarySeenStore } from '../../src/stores/diarySeen'
import { hasUnseenNutriActivity } from '../../src/lib/diaryUnseen'

const ICON_SIZE = 24
const SLOT_W = 56
const SLOT_H = 34

// Destaque do item ativo SEM fundo pesado e SEM ponto flutuante: o ícone faz
// cross-fade da cor inativa → `primary` (evita flash de glifo branco), engrossa o
// traço e cresce de leve; o label já fica primary. O antigo ponto "você está aqui"
// acima do ícone era inconsistente entre glifos (Home/Utensils "colavam" no SVG,
// BookOpen/HeartHandshake respiravam) porque a folga superior de cada glifo varia —
// removido em favor de sinais glyph-independentes (cor+peso+escala+label).
// O canto superior-direito fica livre para o badge de "algo novo" (ponto pulsante).
function TabIcon({ Icon, focused, badge }: { Icon: LucideIcon; focused: boolean; badge?: boolean }) {
  const t = useThemeColors()
  const p = useSharedValue(focused ? 1 : 0)
  const pulse = useSharedValue(0)

  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, motion.spring)
  }, [focused])

  // Pulso "radar" contínuo e lento só quando há algo novo — extremamente sutil.
  useEffect(() => {
    if (badge) {
      pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false)
    } else {
      cancelAnimation(pulse)
      pulse.value = 0
    }
  }, [badge])

  const iconScale = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + p.value * 0.12 }] }))
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value }))
  const activeStyle = useAnimatedStyle(() => ({ opacity: p.value }))
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.4 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 2.2 }] }))

  return (
    <View style={{ width: SLOT_W, height: SLOT_H, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: ICON_SIZE, height: ICON_SIZE }, iconScale]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.center, inactiveStyle]}>
          <Icon size={ICON_SIZE} color={t.tabBarInactive} strokeWidth={1.9} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.center, activeStyle]}>
          <Icon size={ICON_SIZE} color={t.primary} strokeWidth={2.4} />
        </Animated.View>
      </Animated.View>

      {badge ? (
        <View style={{ position: 'absolute', top: 2, right: 12, width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: t.primary }, haloStyle]} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.primary, borderWidth: 1.5, borderColor: t.tabBar }} />
        </View>
      ) : null}
    </View>
  )
}

// Botão central "+" do tab bar — abre o menu de criação rápida (não navega).
function CreateFab({ onPress }: { onPress: () => void }) {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const handlePress = () => {
    haptics.medium()
    onPress()
  }
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={canWrite ? 'Criar nova postagem ou registro' : 'Registro pausado — modo de acompanhamento'}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: canWrite ? t.primary : t.textMuted,
          opacity: canWrite ? 1 : 0.5,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          ...(canWrite ? shadows.glow(t.primary) : {}),
        }}
      >
        <Plus size={26} color={t.primaryFg} strokeWidth={2.5} />
      </View>
    </Pressable>
  )
}

export default function TabLayout() {
  const theme = useTheme()
  const t = theme.colors
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const [registroOpen, setRegistroOpen] = useState(false)

  // Badge "nova reação do nutri" no Diário (feed): comentarios do nutri ainda
  // não vistos (reacoes nao tem timestamp na API, ver lib/diaryUnseen).
  const { data: recent } = useRecentPosts(20)
  const seenAt = useDiarySeenStore((s) => s.seenAt)
  const seenHydrated = useDiarySeenStore((s) => s.hydrated)
  const diaryBadge = seenHydrated && hasUnseenNutriActivity(recent?.posts ?? [], seenAt)

  // Badge "algo novo" no Nutri: mensagem não lida OU questionário pendente.
  // Reusa o payload da Home (já carregado) — sem fetch extra dedicado.
  const { data: home } = usePortalHome()
  const nutriBadge = ((home?.chat_unread ?? 0) > 0) || ((home?.pending_questionnaires ?? 0) > 0)

  return (
    <>
    <Tabs
      screenListeners={{
        tabPress: () => { haptics.selection() },
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
          title: 'Hoje',
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
        name="create"
        options={{
          title: '',
          tabBarButton: () => <CreateFab onPress={() => setRegistroOpen(true)} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diário',
          tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen} focused={focused} badge={diaryBadge && !focused} />,
        }}
      />
      <Tabs.Screen
        name="nutri"
        options={{
          title: 'Nutri',
          tabBarIcon: ({ focused }) => <TabIcon Icon={HeartHandshake} focused={focused} badge={nutriBadge && !focused} />,
        }}
      />
    </Tabs>
      <RegistroSheet visible={registroOpen} onClose={() => setRegistroOpen(false)} canWrite={canWrite} />
    </>
  )
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
