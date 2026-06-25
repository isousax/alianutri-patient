import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { Sun, CloudSun, Moon, Flame, MessageCircle } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { AuroraBackground } from '../ui'

function getGreeting(): { text: string; Icon: typeof Sun } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Bom dia', Icon: Sun }
  if (h < 18) return { text: 'Boa tarde', Icon: CloudSun }
  return { text: 'Boa noite', Icon: Moon }
}

interface HomeHeaderProps {
  displayName: string
  nutritionistName: string | null
  weather: { icon: string; temperature: number } | null
  streak: number
  chatUnread: number
}

export function HomeHeader({ displayName, nutritionistName, weather, streak, chatUnread }: HomeHeaderProps) {
  const t = useThemeColors()
  const greeting = getGreeting()
  const GreetingIcon = greeting.Icon

  return (
    <>
      {/* Aurora hero */}
      <AuroraBackground variant="prominent">
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{ paddingHorizontal: SCREEN_PADDING + 4, paddingTop: space.lg, paddingBottom: space.xl }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
            <GreetingIcon size={14} color={t.primary} strokeWidth={2} />
            <Text style={[typography.labelSm, { color: t.primary, marginLeft: 6 }]}>{greeting.text}</Text>
            {weather && (
              <Text style={[typography.caption, { color: t.textMuted, marginLeft: space.sm }]}>
                {weather.icon} {Math.round(weather.temperature)}°C
              </Text>
            )}
          </View>
          <Text style={[typography.displayMd, { color: t.text }]}>{displayName}</Text>
          {nutritionistName && (
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 4 }]}>com {nutritionistName}</Text>
          )}
        </Animated.View>
      </AuroraBackground>

      {/* Streak + chat badges */}
      {(streak > 0 || chatUnread > 0) && (
        <Animated.View
          entering={FadeInDown.duration(350).delay(50)}
          style={{ flexDirection: 'row', paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg, gap: space.sm }}
        >
          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: t.warningLight }}>
              <Flame size={14} color={t.warning} />
              <Text style={[typography.labelMd, { color: t.warning, marginLeft: 4 }]}>{streak}</Text>
              <Text style={[typography.caption, { color: t.warning, marginLeft: 3, opacity: 0.8 }]}>dia{streak > 1 ? 's' : ''}</Text>
            </View>
          )}
          {chatUnread > 0 && (
            <Pressable
              onPress={() => router.push('/chat')}
              accessibilityRole="button"
              accessibilityLabel={`${chatUnread} ${chatUnread === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: t.primaryLight }}
            >
              <MessageCircle size={14} color={t.primary} />
              <Text style={[typography.labelMd, { color: t.primary, marginLeft: 4 }]}>
                {chatUnread} {chatUnread === 1 ? 'mensagem' : 'mensagens'}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </>
  )
}
