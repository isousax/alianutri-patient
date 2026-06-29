import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown, FadeIn, FadeOut, LinearTransition, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { Check, ChevronRight, ChevronDown, Plus, Utensils } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { Card } from '../ui'
import { SuccessBurst } from '../ui/SuccessBurst'
import type { DiaryTimelineMeal } from '../../types/portal'

interface RefeicoesDeHojeProps {
  meals: DiaryTimelineMeal[]
}

function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null
}

// "Próxima" refeição pendente pelo RELÓGIO (não a primeira não registrada):
// a pendente futura mais próxima de agora (30 min de tolerância); se todas já
// passaram, a última do dia; fallback para a ordem da lista quando sem horário.
function pickNextPending(meals: DiaryTimelineMeal[]): DiaryTimelineMeal | null {
  const pending = meals.filter((m) => m.entry === null)
  if (pending.length === 0) return null
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const timed = pending
    .map((m) => ({ m, min: toMinutes(m.meal_time) }))
    .filter((x): x is { m: DiaryTimelineMeal; min: number } => x.min !== null)
  if (timed.length === 0) return pending[0]
  const upcoming = timed.filter((x) => x.min >= nowMin - 30).sort((a, b) => a.min - b.min)
  if (upcoming.length > 0) return upcoming[0].m
  return timed.sort((a, b) => b.min - a.min)[0].m
}

/**
 * Lista de refeições do plano para hoje, com estado registrado/pendente.
 * Cada linha leva ao diário. Não renderiza nada quando não há plano.
 */
export function RefeicoesDeHoje({ meals }: RefeicoesDeHojeProps) {
  const t = useThemeColors()
  const [expanded, setExpanded] = useState(false)
  const rot = useSharedValue(0)
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }))

  if (meals.length === 0) return null

  const loggedCount = meals.filter((m) => m.entry !== null).length
  const nextPending = pickNextPending(meals)
  const collapsible = meals.length > 1
  const visible = expanded || !collapsible ? meals : nextPending ? [nextPending] : []

  const toggle = () => {
    if (!collapsible) return
    const next = !expanded
    setExpanded(next)
    rot.value = withTiming(next ? 180 : 0, { duration: 200 })
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(140)}
      layout={LinearTransition.duration(220)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Pressable
        onPress={toggle}
        disabled={!collapsible}
        accessibilityRole={collapsible ? 'button' : undefined}
        accessibilityLabel={collapsible ? (expanded ? 'Recolher refeições' : 'Ver todas as refeições de hoje') : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space.sm,
        }}
      >
        <Text style={[typography.headingSm, { color: t.text }]}>Refeições de hoje</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[typography.caption, { color: t.textMuted }]}>
            {loggedCount}/{meals.length}
          </Text>
          {collapsible ? (
            <Animated.View style={[chevronStyle, { marginLeft: space.xs }]}>
              <ChevronDown size={16} color={t.textMuted} />
            </Animated.View>
          ) : null}
        </View>
      </Pressable>

      <Card padded={false} style={{ paddingVertical: space.md }}>
        {visible.length === 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: space.lg,
              paddingHorizontal: space.lg,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: space.md,
              }}
            >
              <SuccessBurst size={100} />
            </View>
            <Text style={[typography.labelMd, { color: t.text, flex: 1 }]}>
              Todas as refeições registradas
            </Text>
          </View>
        ) : visible.map((meal, i) => {
          const logged = meal.entry !== null
          const foods = (meal.foods ?? [])
            .map((f) => f.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')

          return (
            <Animated.View
              key={String(meal.meal_index)}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              layout={LinearTransition.duration(200)}
            >
            <Pressable
              onPress={() => router.push('/food-diary' as never)}
              accessibilityRole="button"
              accessibilityLabel={`${logged ? 'Ver' : 'Registrar'} ${meal.meal_name}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: space.lg,
                paddingHorizontal: space.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.borderLight,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: logged ? t.successLight : t.surfaceSecondary,
                  marginRight: space.md,
                }}
              >
                {logged ? (
                  <Check size={20} color={t.success} />
                ) : (
                  <Utensils size={18} color={t.textMuted} />
                )}
              </View>

              <View style={{ flex: 1, marginRight: space.sm }}>
                <Text style={[typography.labelMd, { color: t.text }]} numberOfLines={1}>
                  {meal.meal_name}
                </Text>
                {(meal.meal_time || foods) ? (
                  <Text
                    style={[typography.caption, { color: t.textMuted, marginTop: 4 }]}
                    numberOfLines={1}
                  >
                    {[meal.meal_time, foods].filter(Boolean).join('   ·   ')}
                  </Text>
                ) : null}
              </View>

              {logged ? (
                <ChevronRight size={16} color={t.textMuted} />
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: space.sm + 2,
                    paddingVertical: 5,
                    borderRadius: radius.full,
                    backgroundColor: t.primaryLight,
                  }}
                >
                  <Plus size={12} color={t.primary} />
                  <Text style={[typography.captionBold, { color: t.primary, marginLeft: 2 }]}>
                    Registrar
                  </Text>
                </View>
              )}
            </Pressable>
            </Animated.View>
          )
        })}
      </Card>
    </Animated.View>
  )
}
