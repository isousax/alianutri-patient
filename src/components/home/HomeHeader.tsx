import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  Sun,
  CloudSun,
  Moon,
  Flame,
  MessageCircle,
  Lightbulb,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "../../stores/theme";
import { typography, space, radius, SCREEN_PADDING } from "../../theme/tokens";
import { AuroraBackground, Avatar } from "../ui";
import { FireAnimation } from "../ui/FireAnimation";
import { ObjectiveIcon } from "./ObjectiveIcon";

function getGreeting(): { text: string; Icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Bom dia", Icon: Sun };
  if (h < 18) return { text: "Boa tarde", Icon: CloudSun };
  return { text: "Boa noite", Icon: Moon };
}

interface HomeHeaderProps {
  displayName: string;
  nutritionistName: string | null;
  weather: { icon: string; temperature: number } | null;
  streak: number;
  chatUnread: number;
  photoUrl?: string | null;
  onTipPress?: () => void;
  /** Perfil de Acompanhamento (F5): enquadramento acolhedor + ícone do objetivo. */
  objective?: { framing: string; icon: string } | null;
}

export function HomeHeader({
  displayName,
  nutritionistName,
  weather,
  streak,
  chatUnread,
  photoUrl,
  onTipPress,
  objective,
}: HomeHeaderProps) {
  const t = useThemeColors();
  const insets = useSafeAreaInsets();
  const greeting = getGreeting();
  const GreetingIcon = greeting.Icon;

  return (
    <>
      {/* Aurora hero */}
      <AuroraBackground variant="prominent">
        {/* Fade que derrete a aurora no fundo da tela (sem costura). Pintado
            SOB o texto (1º filho) → mascara os blobs sem lavar o conteúdo. */}
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", t.background]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 150,
          }}
        />
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{
            paddingHorizontal: SCREEN_PADDING + 4,
            paddingTop: insets.top + space.lg,
            paddingBottom: space.xl,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: insets.top + space.lg,
              right: SCREEN_PADDING,
              zIndex: 5,
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
            }}
          >
            {onTipPress ? (
              <Pressable
                onPress={onTipPress}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Ver a dica do dia"
                style={{
                  width: 20,
                  height: 40,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lightbulb size={18} color={t.warning} />
              </Pressable>
            ) : null}
            <Avatar
              name={displayName}
              uri={photoUrl}
              size={60}
              onPress={() => router.push("/profile")}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: space.xs,
                }}
              >
                <GreetingIcon size={14} color={t.primary} strokeWidth={2} />
                <Text
                  style={[
                    typography.labelSm,
                    { color: t.primary, marginLeft: 6 },
                  ]}
                >
                  {greeting.text}
                </Text>
                {weather && (
                  <Text
                    style={[
                      typography.caption,
                      { color: t.textMuted, marginLeft: space.sm },
                    ]}
                  >
                    {weather.icon} {Math.round(weather.temperature)}°C
                  </Text>
                )}
              </View>
              <Text
                accessibilityRole="header"
                style={[typography.displayMd, { color: t.text }]}
              >
                {displayName}
              </Text>
              {nutritionistName && (
                <Text
                  style={[
                    typography.caption,
                    { color: t.textMuted, marginTop: 4 },
                  ]}
                >
                  com {nutritionistName}
                </Text>
              )}
              {objective && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 6,
                  }}
                >
                  <ObjectiveIcon name={objective.icon} size={13} color={t.primary} />
                  <Text
                    style={[typography.caption, { color: t.textSecondary, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {objective.framing}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </AuroraBackground>

      {/* Streak + chat badges */}
      {(streak > 0 || chatUnread > 0) && (
        <Animated.View
          entering={FadeInDown.duration(350).delay(50)}
          style={{
            flexDirection: "row",
            paddingHorizontal: SCREEN_PADDING,
            marginBottom: space.lg,
            gap: space.sm,
          }}
        >
          {streak > 0 && (
            <View
              accessible
              accessibilityLabel={`Sequência de ${streak} ${streak === 1 ? "dia" : "dias"} registrando`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radius.lg,
                backgroundColor: t.warningLight,
              }}
            >
              <FireAnimation size={20} loop={true} />
              {/*<Flame size={14} color={t.warning} />*/}
              <Text
                style={[
                  typography.labelMd,
                  { color: t.warning, marginLeft: 4 },
                ]}
              >
                {streak}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: t.warning, marginLeft: 3, opacity: 0.8 },
                ]}
              >
                dia{streak > 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {chatUnread > 0 && (
            <Pressable
              onPress={() => router.push("/chat")}
              accessibilityRole="button"
              accessibilityLabel={`${chatUnread} ${chatUnread === 1 ? "mensagem não lida" : "mensagens não lidas"}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radius.lg,
                backgroundColor: t.primaryLight,
              }}
            >
              <MessageCircle size={14} color={t.primary} />
              <Text
                style={[
                  typography.labelMd,
                  { color: t.primary, marginLeft: 4 },
                ]}
              >
                {chatUnread} {chatUnread === 1 ? "mensagem" : "mensagens"}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </>
  );
}
