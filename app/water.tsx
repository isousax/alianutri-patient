import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Droplets,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { useThemeColors } from "../src/stores/theme";
import {
  useWaterIntake,
  useLogWater,
  useDeleteWater,
} from "../src/hooks/usePortal";
import type { WaterIntakeResponse } from "../src/types/portal";
import { useSmartWaterGoal } from "../src/hooks/useSmartWaterGoal";
import { ScreenHeader, Card } from "../src/components/ui";
import {
  shadows,
  radius,
  space,
  typography,
  SCREEN_PADDING,
  todayStr,
} from "../src/theme/tokens";

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WATER_OPTIONS = [
  { ml: 200, label: "Copo", emoji: "🥤" },
  { ml: 300, label: "Grande", emoji: "🫗" },
  { ml: 500, label: "Garrafa", emoji: "🧴" },
];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2) / 3.4;

export default function WaterScreen() {
  const t = useThemeColors();
  const [date, setDate] = useState(todayStr());
  const isToday = date === todayStr();
  const [showHistory, setShowHistory] = useState(false);
  const localBoostRef = useRef(0);
  const [lastAdded, setLastAdded] = useState<{
    amount: number;
    key: number;
  } | null>(null);
  const [, rerender] = useState(0);
  const prevServerTotal = useRef(0);

  const { data, refetch } = useWaterIntake(date);
  const { mutateAsync: logWater, isPending: isLogging } = useLogWater();
  const { mutateAsync: deleteWater } = useDeleteWater();

  const apiGoal = data?.goal_ml ?? 2000;
  const total = data?.total_ml ?? 0;
  const entries: WaterIntakeResponse["entries"] = data?.entries ?? [];

  const { goal, hydration, weather, nutriSetCustomGoal } =
    useSmartWaterGoal(apiGoal);

  // Absorb server delta synchronously during render (no flicker)
  if (total !== prevServerTotal.current) {
    const delta = total - prevServerTotal.current;
    if (delta > 0)
      localBoostRef.current = Math.max(0, localBoostRef.current - delta);
    prevServerTotal.current = total;
  }

  // Optimistic display values
  const displayTotal = total + localBoostRef.current;
  const displayProgress = goal > 0 ? Math.min(displayTotal / goal, 1) : 0;
  const pct = Math.round(displayProgress * 100);

  // Auto-dismiss floating toast
  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => setLastAdded(null), 1400);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  // Animated circular progress
  const RADIUS = 85;
  const STROKE = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(displayProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [displayProgress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  const handleAdd = useCallback(
    async (amount: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      localBoostRef.current += amount;
      rerender((n) => n + 1);
      setLastAdded({ amount, key: Date.now() });

      // Celebrate if crossing goal
      if (displayTotal < goal && displayTotal + amount >= goal) {
        setTimeout(
          () =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
          600,
        );
      }

      try {
        await logWater({ date, amount_ml: amount });
      } catch {
        localBoostRef.current = Math.max(0, localBoostRef.current - amount);
        rerender((n) => n + 1);
        Alert.alert("Erro", "Não foi possível registrar.");
      }
    },
    [date, logWater, displayTotal, goal],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert("Remover", "Remover este registro?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWater(id);
              refetch();
            } catch {
              Alert.alert("Erro", "Não foi possível remover.");
            }
          },
        },
      ]);
    },
    [deleteWater, refetch],
  );

  const ringColor = displayProgress >= 1 ? t.success : t.info;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.background }}
      edges={["top"]}
    >
      <ScreenHeader title="Hidratação" />

      {/* Discrete date nav */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.md,
          paddingBottom: space.sm,
        }}
      >
        <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={12}>
          <ChevronLeft size={16} color={t.textMuted} />
        </Pressable>
        <Pressable onPress={() => setDate(todayStr())}>
          <Text style={[typography.captionBold, { color: t.textMuted }]}>
            {isToday ? "Hoje" : fmtDate(date)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDate(shiftDate(date, 1))}
          hitSlop={12}
          disabled={isToday}
        >
          <ChevronRight
            size={16}
            color={isToday ? t.borderLight : t.textMuted}
          />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Circular progress */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{
            alignItems: "center",
            marginTop: space["2xl"],
            marginBottom: space["3xl"],
          }}
        >
          <View
            style={{
              width: RADIUS * 2 + STROKE * 2,
              height: RADIUS * 2 + STROKE * 2,
            }}
          >
            <Svg
              width={RADIUS * 2 + STROKE * 2}
              height={RADIUS * 2 + STROKE * 2}
              style={{ transform: [{ rotate: "-90deg" }] }}
            >
              <SvgCircle
                cx={RADIUS + STROKE}
                cy={RADIUS + STROKE}
                r={RADIUS}
                stroke={t.borderLight}
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedSvgCircle
                cx={RADIUS + STROKE}
                cy={RADIUS + STROKE}
                r={RADIUS}
                stroke={ringColor}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                animatedProps={animatedCircleProps}
                strokeLinecap="round"
              />
            </Svg>
            <View
              style={{
                position: "absolute",
                top: STROKE,
                left: STROKE,
                width: RADIUS * 2,
                height: RADIUS * 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Droplets size={22} color={ringColor} />
              <Text
                style={[typography.displayMd, { color: t.text, marginTop: 4 }]}
              >
                {displayTotal >= 1000
                  ? `${(displayTotal / 1000).toFixed(1).replace(".", ",")}`
                  : `${displayTotal}`}
              </Text>
              <Text style={[typography.caption, { color: t.textMuted }]}>
                {displayTotal >= 1000 ? "litros" : "ml"} de{" "}
                {goal >= 1000
                  ? `${(goal / 1000).toFixed(1).replace(".", ",")}L`
                  : `${goal}ml`}
              </Text>
            </View>
          </View>

          {/* Percentage badge + absolutely positioned floating toast */}
          <View
            style={{ alignItems: "center", marginTop: space.md, minHeight: 28 }}
          >
            <View
              style={{
                paddingHorizontal: space.md,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: ringColor + "15",
              }}
            >
              <Text style={[typography.captionBold, { color: ringColor }]}>
                {displayProgress >= 1 ? "Meta atingida! 🎉" : `${pct}% da meta`}
              </Text>
            </View>
            {lastAdded && (
              <Animated.View
                key={lastAdded.key}
                entering={FadeInUp.duration(200)}
                exiting={FadeOutUp.duration(300)}
                style={{
                  position: "absolute",
                  top: -36,
                  alignItems: "center",
                  backgroundColor: t.surface,
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs,
                  borderRadius: radius.lg,
                  ...shadows.md,
                }}
              >
                <Text style={[typography.headingMd, { color: ringColor }]}>
                  +{lastAdded.amount}ml
                </Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Weather & smart goal card */}
        {isToday && (weather || hydration.isPersonalized) && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(50)}
            style={{
              paddingHorizontal: SCREEN_PADDING,
              marginBottom: space.xl,
            }}
          >
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: space.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.sm,
                  }}
                >
                  {weather && (
                    <>
                      <Text style={{ fontSize: 18 }}>{weather.icon}</Text>
                      <Text style={[typography.headingSm, { color: t.text }]}>
                        {Math.round(weather.temperature)}°C
                      </Text>
                      <Text
                        style={[typography.caption, { color: t.textMuted }]}
                      >
                        {weather.description}
                      </Text>
                    </>
                  )}
                </View>
                {hydration.isPersonalized && !nutriSetCustomGoal && (
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        "Meta personalizada",
                        `Sua meta de ${(goal / 1000).toFixed(1).replace(".", ",")}L foi calculada com base no seu perfil e nas condições climáticas atuais.`,
                      )
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: space.sm,
                      paddingVertical: 4,
                      borderRadius: radius.sm,
                      backgroundColor: t.primary + "12",
                    }}
                  >
                    <Info size={10} color={t.primary} />
                  </Pressable>
                )}
                {nutriSetCustomGoal && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: space.sm,
                      paddingVertical: 4,
                      borderRadius: radius.sm,
                      backgroundColor: t.accent + "12",
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        { color: t.accent, fontSize: 9 },
                      ]}
                    >
                      NUTRI
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  typography.bodySm,
                  { color: t.textSecondary, lineHeight: 18 },
                ]}
              >
                {nutriSetCustomGoal
                  ? `Meta de ${(apiGoal / 1000).toFixed(1).replace(".", ",")}L definida pelo seu nutricionista`
                  : hydration.message}
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* 3 quick-add cards — perfectly balanced */}
        {isToday && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(100)}
            style={{
              paddingHorizontal: SCREEN_PADDING,
              marginBottom: space["2xl"],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              {WATER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.ml}
                  onPress={() => handleAdd(opt.ml)}
                  disabled={isLogging}
                  style={({ pressed }) => ({
                    width: CARD_WIDTH,
                    alignItems: "center",
                    paddingVertical: space.md,
                    paddingHorizontal: space.xs,
                    borderRadius: radius.xl,
                    backgroundColor: t.surface,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                    ...shadows.md,
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.lg + 2,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: space.xs,
                      backgroundColor: t.infoLight,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                  </View>

                  <Text
                    style={[
                      typography.headingSm,
                      {
                        color: t.text,
                        textAlign: "center",
                      },
                    ]}
                  >
                    {opt.ml}ml
                  </Text>

                  <Text
                    style={[
                      typography.caption,
                      {
                        color: t.textMuted,
                        marginTop: 3,
                        textAlign: "center",
                        minHeight: 18,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Collapsible history */}
        {entries.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(200)}
            style={{ paddingHorizontal: SCREEN_PADDING }}
          >
            <Pressable
              onPress={() => setShowHistory(!showHistory)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
                borderRadius: radius.xl,
                backgroundColor: t.surface,
                ...shadows.sm,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                }}
              >
                <Droplets size={14} color={t.info} />
                <Text style={[typography.headingSm, { color: t.text }]}>
                  {entries.length}{" "}
                  {entries.length === 1 ? "registro" : "registros"} hoje
                </Text>
              </View>
              <ChevronDown
                size={16}
                color={t.textMuted}
                style={{
                  transform: [{ rotate: showHistory ? "180deg" : "0deg" }],
                }}
              />
            </Pressable>

            {showHistory && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                style={{ marginTop: space.sm }}
              >
                {entries.map((entry) => {
                  const time = new Date(entry.created_at);
                  const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
                  return (
                    <View
                      key={entry.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: space.sm + 2,
                        paddingHorizontal: space.md,
                        borderRadius: radius.lg,
                        marginBottom: 6,
                        backgroundColor: t.surface,
                        ...shadows.sm,
                      }}
                    >
                      <Droplets size={14} color={t.info} />
                      <Text
                        style={[
                          typography.labelMd,
                          { color: t.text, marginLeft: space.sm, flex: 1 },
                        ]}
                      >
                        {entry.amount_ml}ml
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          { color: t.textMuted, marginRight: space.md },
                        ]}
                      >
                        {timeStr}
                      </Text>
                      {isToday && (
                        <Pressable
                          onPress={() => handleDelete(entry.id)}
                          hitSlop={8}
                        >
                          <Trash2 size={14} color={t.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
