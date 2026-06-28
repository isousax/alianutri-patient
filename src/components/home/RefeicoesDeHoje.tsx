import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { Check, ChevronRight, ChevronDown, Plus, Utensils } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { Card } from '../ui'
import type { DiaryTimelineMeal } from '../../types/portal'

interface RefeicoesDeHojeProps {
  meals: DiaryTimelineMeal[]
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
  const nextPending = meals.find((m) => m.entry === null) ?? null
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

      <Card padded={false} style={{ paddingVertical: space.xs }}>
        {visible.length === 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: space.sm + 2,
              paddingHorizontal: space.lg,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.successLight,
                marginRight: space.md,
              }}
            >
              <Check size={18} color={t.success} />
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
            <Pressable
              key={`${meal.meal_index}-${i}`}
              onPress={() => router.push('/food-diary' as never)}
              accessibilityRole="button"
              accessibilityLabel={`${logged ? 'Ver' : 'Registrar'} ${meal.meal_name}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: space.sm + 2,
                paddingHorizontal: space.lg,
                opacity: pressed ? 0.7 : 1,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.borderLight,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: logged ? t.successLight : t.surfaceSecondary,
                  marginRight: space.md,
                }}
              >
                {logged ? (
                  <Check size={18} color={t.success} />
                ) : (
                  <Utensils size={16} color={t.textMuted} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[typography.labelMd, { color: t.text }]} numberOfLines={1}>
                    {meal.meal_name}
                  </Text>
                  {meal.meal_time ? (
                    <Text style={[typography.caption, { color: t.textMuted, marginLeft: space.sm }]}>
                      {meal.meal_time}
                    </Text>
                  ) : null}
                </View>
                {foods ? (
                  <Text
                    style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}
                    numberOfLines={1}
                  >
                    {foods}
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
                    paddingHorizontal: space.sm,
                    paddingVertical: 4,
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
          )
        })}
      </Card>
    </Animated.View>
  )
}
