import { useMemo, useCallback, useReducer, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Calendar,
  AlertCircle,
  ClipboardList,
  Target,
  ChevronRight,
  MapPin,
  Video,
  Flame,
  Droplets,
  TrendingDown,
  TrendingUp,
  Sparkles,
  MessageCircle,
  Utensils,
  Sun,
  Moon,
  CloudSun,
  BarChart3,
  Heart,
  Scale,
  Camera,
  CalendarPlus,
} from "lucide-react-native";
import Svg, {
  Rect as SvgRect,
  Polyline,
  Circle as SvgCircle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "../../src/stores/theme";
import { useFeaturesStore } from "../../src/stores/features";
import {
  usePortalHome,
  useDiaryToday,
  useGoals,
  useEvolution,
  useWaterIntake,
  useWeeklyAdherence,
} from "../../src/hooks/usePortal";
import type {
  PortalGoal,
  PortalEvolution,
  WeeklyAdherenceDay,
} from "../../src/types/portal";
import { getTipOfTheDay } from "../../src/data/dailyTips";
import { useSmartWaterGoal } from "../../src/hooks/useSmartWaterGoal";
import {
  ProgressRing,
  Card,
  EmptyState,
  LoadingScreen,
} from "../../src/components/ui";
import {
  radius,
  space,
  typography,
  SCREEN_PADDING,
  todayStr,
  fmtWater,
} from "../../src/theme/tokens";

const { width: SCREEN_W } = Dimensions.get("window");

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Bom dia", icon: Sun };
  if (h < 18) return { text: "Boa tarde", icon: CloudSun };
  return { text: "Boa noite", icon: Moon };
}

function goalProgress(goal: PortalGoal): number {
  if (
    goal.target_value == null ||
    goal.current_value == null ||
    goal.target_value === 0
  )
    return 0;
  const lowerIsBetter = goal.type === "weight" || goal.type === "measurement";
  if (lowerIsBetter && goal.current_value > goal.target_value) {
    const ceiling = goal.target_value * 1.3;
    const total = ceiling - goal.target_value;
    const done = ceiling - goal.current_value;
    return Math.max(0, Math.min(done / total, 1));
  }
  return Math.min(goal.current_value / goal.target_value, 1);
}

export default function HomeScreen() {
  const t = useThemeColors();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = usePortalHome();
  const canWrite = useFeaturesStore((s) => s.canWrite);
  const setCanWrite = useFeaturesStore((s) => s.setCanWrite);

  useEffect(() => {
    if (data?.features) setCanWrite(data.features.can_write);
  }, [data?.features, setCanWrite]);

  const [, tick] = useReducer((x: number) => x + 1, 0);
  const today = useMemo(todayStr, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: diaryToday } = useDiaryToday(today);
  const { data: goals } = useGoals();
  const { data: evolution } = useEvolution();
  const { data: waterData } = useWaterIntake(today);
  const { goal: waterGoal, weather } = useSmartWaterGoal(
    waterData?.goal_ml ?? 2000,
  );
  const { data: adherenceData } = useWeeklyAdherence();

  const handleRefresh = useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: ["portal", "diary-today"] });
    qc.invalidateQueries({ queryKey: ["portal", "goals"] });
    qc.invalidateQueries({ queryKey: ["portal", "evolution"] });
    qc.invalidateQueries({ queryKey: ["portal", "water"] });
    tick();
  }, [refetch, qc]);

  // ── Loading ──
  if (isLoading) return <LoadingScreen />;

  // ── Error ──
  if (error || !data) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: t.background }}
        edges={["top"]}
      >
        <EmptyState
          icon={<AlertCircle size={28} color={t.error} />}
          iconBg={t.errorLight}
          title="Não foi possível carregar"
          description="Verifique sua conexão e tente novamente."
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  // ── Derived data ──
  const displayName = data.patient.name?.split(" ")[0] || "Paciente";
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const streak = data.diary_streak ?? 0;
  const meals = diaryToday?.meals ?? [];
  const loggedCount = meals.filter((m) => m.entry !== null).length;
  const totalMeals = meals.length;
  const diaryPct = totalMeals > 0 ? loggedCount / totalMeals : 0;
  const activeGoals = (goals ?? [])
    .filter((g: PortalGoal) => g.status === "active")
    .slice(0, 2);
  const pendingQ = data.pending_questionnaires ?? 0;
  const waterTotal = waterData?.total_ml ?? 0;
  const waterPct = waterGoal > 0 ? Math.min(waterTotal / waterGoal, 1) : 0;
  const chatUnread = data.chat_unread ?? 0;
  const hasAnyContent =
    totalMeals > 0 ||
    activeGoals.length > 0 ||
    (evolution ?? []).length >= 2 ||
    pendingQ > 0 ||
    waterTotal > 0;
  const apt = data.next_appointment;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.background }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={t.primary}
          />
        }
      >
        {/* ═══════ GREETING HEADER ═══════ */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{
            paddingHorizontal: SCREEN_PADDING + 4,
            paddingTop: space.lg,
            paddingBottom: space.xl,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: space.xs,
            }}
          >
            <GreetingIcon size={14} color={t.primary} strokeWidth={2} />
            <Text
              style={[typography.labelSm, { color: t.primary, marginLeft: 6 }]}
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
          <Text style={[typography.displayMd, { color: t.text }]}>
            {displayName}
          </Text>
          {data.nutritionist?.name && (
            <Text
              style={[typography.caption, { color: t.textMuted, marginTop: 4 }]}
            >
              com {data.nutritionist.name}
            </Text>
          )}
        </Animated.View>

        {/* ═══════ STREAK + CHAT BADGE ═══════ */}
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
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                  borderRadius: radius.lg,
                  backgroundColor: t.warningLight,
                }}
              >
                <Flame size={14} color={t.warning} />
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

        {/* ═══════ PENDING QUESTIONNAIRES (urgent) ═══════ */}
        {pendingQ > 0 && (
          <Animated.View
            entering={FadeInDown.duration(350).delay(80)}
            style={{
              paddingHorizontal: SCREEN_PADDING,
              marginBottom: space.lg,
            }}
          >
            <Pressable onPress={() => router.push("/questionnaires")}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: space.lg,
                  borderRadius: radius.xl,
                  backgroundColor: t.accentLight,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: t.accent + "20",
                    marginRight: space.md,
                  }}
                >
                  <ClipboardList size={18} color={t.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelMd, { color: t.text }]}>
                    {pendingQ} questionário{pendingQ > 1 ? "s" : ""} pendente
                    {pendingQ > 1 ? "s" : ""}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: t.textMuted, marginTop: 2 },
                    ]}
                  >
                    Toque para responder
                  </Text>
                </View>
                <ChevronRight size={16} color={t.accent} />
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ═══════ DAILY FOCUS — Twin progress rings ═══════ */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(120)}
          style={{
            paddingHorizontal: SCREEN_PADDING,
            marginBottom: space.xl,
          }}
        >
          <View style={{ flexDirection: "row", gap: space.md }}>
            {/* Meals ring */}
            <Card
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: space.xl,
              }}
              onPress={() => router.push("/(tabs)/diary")}
            >
              <ProgressRing
                progress={diaryPct}
                size={80}
                strokeWidth={7}
                color={diaryPct >= 1 ? t.success : t.primary}
                trackColor={t.borderLight}
              >
                <Utensils
                  size={20}
                  color={diaryPct >= 1 ? t.success : t.primary}
                  strokeWidth={1.8}
                />
              </ProgressRing>
              <View
                style={{
                  marginTop: space.md,
                  alignItems: "center",
                  minHeight: 42,
                  justifyContent: "flex-start",
                }}
              >
                <Text
                  style={[
                    typography.headingSm,
                    {
                      color: t.text,
                      textAlign: "center",
                    },
                  ]}
                >
                  Refeições
                </Text>

                <Text
                  style={[
                    typography.caption,
                    {
                      color: t.textMuted,
                      marginTop: 2,
                      textAlign: "center",
                    },
                  ]}
                >
                  {totalMeals > 0
                    ? loggedCount === totalMeals
                      ? "Completo!"
                      : `${loggedCount} de ${totalMeals}`
                    : "Sem plano"}
                </Text>
              </View>
            </Card>

            {/* Water ring */}
            <Card
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: space.xl,
              }}
              onPress={() => router.push("/water" as never)}
            >
              <ProgressRing
                progress={waterPct}
                size={80}
                strokeWidth={7}
                color={waterPct >= 1 ? t.success : t.info}
                trackColor={t.borderLight}
              >
                <Droplets
                  size={20}
                  color={waterPct >= 1 ? t.success : t.info}
                  strokeWidth={1.8}
                />
              </ProgressRing>
              <View
                style={{
                  marginTop: space.md,
                  alignItems: "center",
                  minHeight: 42,
                  justifyContent: "flex-start",
                }}
              >
                <Text
                  style={[
                    typography.headingSm,
                    {
                      color: t.text,
                      textAlign: "center",
                    },
                  ]}
                >
                  Água
                </Text>

                <Text
                  style={[
                    typography.caption,
                    {
                      color: t.textMuted,
                      marginTop: 2,
                      textAlign: "center",
                    },
                  ]}
                >
                  {waterTotal > 0
                    ? `${fmtWater(waterTotal)} / ${fmtWater(waterGoal)}`
                    : "Sem registro"}
                </Text>
              </View>
            </Card>
          </View>
        </Animated.View>

        {/* ═══════ QUICK ACTIONS — 4-column icon grid ═══════ */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(160)}
          style={{
            paddingHorizontal: SCREEN_PADDING,
            marginBottom: space.xl,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              columnGap: GRID_GAP,
              rowGap: 0,
            }}
          >
            <QuickAction
              icon={<Scale size={18} color={t.accent} />}
              label="Peso"
              bg={t.accentLight}
              onPress={() => router.push("/weight" as never)}
            />
            <QuickAction
              icon={<Target size={18} color={t.success} />}
              label="Metas"
              bg={t.successLight}
              onPress={() => router.push("/goals")}
            />
            <QuickAction
              icon={<Heart size={18} color="#EC4899" />}
              label="Bem-estar"
              bg="#FDF2F8"
              onPress={() => router.push("/wellness" as never)}
            />
            <QuickAction
              icon={<MessageCircle size={18} color={t.info} />}
              label="Chat"
              bg={t.infoLight}
              onPress={() => router.push("/chat")}
            />
            {canWrite && (
              <QuickAction
                icon={<CalendarPlus size={18} color={t.primary} />}
                label="Agendar"
                bg={t.primaryLight}
                onPress={() => router.push("/booking")}
              />
            )}
            <QuickAction
              icon={<Camera size={18} color={t.primary} />}
              label="Fotos"
              bg={t.primaryLight}
              onPress={() => router.push("/progress-photos" as never)}
            />
            <QuickAction
              icon={<ClipboardList size={18} color={t.accent} />}
              label="Question."
              bg={t.accentLight}
              onPress={() => router.push("/questionnaires")}
            />
          </View>
        </Animated.View>

        {/* ═══════ NEXT APPOINTMENT ═══════ */}
        {apt && <AppointmentCard apt={apt} />}

        {/* ═══════ ACTIVE GOALS ═══════ */}
        {activeGoals.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(350).delay(240)}
            style={{
              paddingHorizontal: SCREEN_PADDING,
              marginBottom: space.lg,
            }}
          >
            <Card onPress={() => router.push("/goals")}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: space.md,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: radius.sm,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: t.successLight,
                    }}
                  >
                    <Target size={14} color={t.success} />
                  </View>
                  <Text
                    style={[
                      typography.headingSm,
                      { color: t.text, marginLeft: space.sm },
                    ]}
                  >
                    Metas
                  </Text>
                </View>
                <ChevronRight size={16} color={t.textMuted} />
              </View>
              {activeGoals.map((goal: PortalGoal, i: number) => {
                const progress = goalProgress(goal);
                return (
                  <View
                    key={goal.id}
                    style={i > 0 ? { marginTop: space.md } : undefined}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={[
                          typography.labelMd,
                          { color: t.text, flex: 1, marginRight: space.sm },
                        ]}
                        numberOfLines={1}
                      >
                        {goal.title}
                      </Text>
                      <Text
                        style={[
                          typography.captionBold,
                          { color: progress >= 1 ? t.success : t.primary },
                        ]}
                      >
                        {Math.round(progress * 100)}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: t.borderLight,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          width: `${Math.min(progress * 100, 100)}%`,
                          backgroundColor:
                            progress >= 1 ? t.success : t.primary,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          </Animated.View>
        )}

        {/* ═══════ WEIGHT SPARKLINE ═══════ */}
        <WeightSparkline evolution={evolution ?? []} />

        {/* ═══════ WEEKLY ADHERENCE ═══════ */}
        {(adherenceData?.days?.length ?? 0) > 0 && (
          <WeeklyAdherenceChart days={adherenceData?.days ?? []} />
        )}

        {/* ═══════ DAILY TIP ═══════ */}
        <DailyTipCard />

        {/* ═══════ EMPTY STATE ═══════ */}
        {!hasAnyContent && !apt && (
          <EmptyState
            icon={<Sparkles size={28} color={t.primary} />}
            title="Bem-vindo ao AliaNutri!"
            description={
              "Seus dados aparecerão aqui conforme\nseu nutricionista atualizar seu plano."
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════
//  HELPER COMPONENTS (design-system based)
// ═══════════════════════════════════════════════════════

// ── Quick Action chip ──

const GRID_COLS = 4;
const GRID_GAP = space.md;
const GRID_ITEM_W =
  (SCREEN_W - SCREEN_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

function QuickAction({
  icon,
  label,
  bg,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  onPress: () => void;
}) {
  const t = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: GRID_ITEM_W,
        alignItems: "center",
        paddingVertical: space.md,
        marginBottom: space.md,
        borderRadius: radius.lg,
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.lg,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          marginBottom: space.sm,
        }}
      >
        {icon}
      </View>
      <Text
        style={[
          typography.captionBold,
          { color: t.textSecondary, textAlign: "center" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Appointment card ──

function AppointmentCard({
  apt,
}: {
  apt: { starts_at: string; type: string };
}) {
  const t = useThemeColors();

  const d = new Date(apt.starts_at);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const dateStr = `${day}/${month} às ${h}:${m}`;
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const isOnline = apt.type === "online";

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(200)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: space.sm,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.primaryLight,
            }}
          >
            <Calendar size={14} color={t.primary} />
          </View>
          <Text
            style={[
              typography.overline,
              { color: t.textMuted, marginLeft: space.sm, marginBottom: 0 },
            ]}
          >
            Próxima consulta
          </Text>
        </View>
        <Text style={[typography.displaySm, { color: t.text }]}>{dateStr}</Text>
        <Text
          style={[
            typography.caption,
            { color: t.textMuted, marginTop: 2, textTransform: "capitalize" },
          ]}
        >
          {weekday}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: space.md,
            paddingHorizontal: space.sm + 2,
            paddingVertical: space.xs + 1,
            borderRadius: radius.sm,
            backgroundColor: t.primaryLight,
            alignSelf: "flex-start",
          }}
        >
          {isOnline ? (
            <Video size={12} color={t.primary} />
          ) : (
            <MapPin size={12} color={t.primary} />
          )}
          <Text
            style={[
              typography.captionBold,
              { color: t.primary, marginLeft: 4 },
            ]}
          >
            {isOnline ? "Online" : "Presencial"}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
}

// ── Daily tip card (static, no carousel — stability > novelty) ──

function DailyTipCard() {
  const t = useThemeColors();
  const tip = useMemo(() => getTipOfTheDay(), []);

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(300)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card style={{ backgroundColor: t.primaryLight }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.primary + "18",
              marginRight: space.md,
            }}
          >
            <Text style={{ fontSize: 18 }}>{tip.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.overline,
                { color: t.primary, marginBottom: 4 },
              ]}
            >
              Dica do dia
            </Text>
            <Text
              style={[typography.bodySm, { color: t.text, lineHeight: 20 }]}
            >
              {tip.text}
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

// ── Weekly adherence chart ──

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function WeeklyAdherenceChart({ days }: { days: WeeklyAdherenceDay[] }) {
  const t = useThemeColors();
  if (days.length === 0 || days.every((d) => d.total === 0)) return null;

  const totalLogged = days.reduce((sum, d) => sum + d.logged, 0);
  const totalExpected = days.reduce((sum, d) => sum + d.total, 0);
  const overallPct =
    totalExpected > 0 ? Math.round((totalLogged / totalExpected) * 100) : 0;

  const W = SCREEN_W - SCREEN_PADDING * 2 - space.lg * 2;
  const barW = Math.floor((W - 6 * 8) / 7);
  const maxH = 48;

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(260)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card onPress={() => router.push("/(tabs)/diary")}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: space.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.primaryLight,
              }}
            >
              <BarChart3 size={14} color={t.primary} />
            </View>
            <Text
              style={[
                typography.headingSm,
                { color: t.text, marginLeft: space.sm },
              ]}
            >
              Aderência semanal
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[
                typography.captionBold,
                {
                  color:
                    overallPct >= 80
                      ? t.success
                      : overallPct >= 50
                        ? t.warning
                        : t.textMuted,
                  marginRight: 4,
                },
              ]}
            >
              {overallPct}%
            </Text>
            <ChevronRight size={14} color={t.textMuted} />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: maxH + 28,
          }}
        >
          {days.map((day, i) => {
            const pct = day.total > 0 ? Math.min(day.logged / day.total, 1) : 0;
            const barH = Math.max(pct * maxH, 4);
            const dayDate = new Date(day.date + "T12:00:00");
            const label = DAY_LABELS[dayDate.getDay()];
            const isToday = day.date === todayStr();
            const barColor =
              pct >= 1 ? t.success : pct > 0 ? t.primary : t.border;

            return (
              <View key={i} style={{ alignItems: "center", width: barW }}>
                <Svg width={barW} height={maxH}>
                  <SvgRect
                    x={(barW - 14) / 2}
                    y={0}
                    width={14}
                    height={maxH}
                    rx={7}
                    fill={t.borderLight}
                  />
                  <SvgRect
                    x={(barW - 14) / 2}
                    y={maxH - barH}
                    width={14}
                    height={barH}
                    rx={7}
                    fill={barColor}
                  />
                </Svg>
                <Text
                  style={[
                    typography.captionBold,
                    {
                      color: isToday ? t.primary : t.textMuted,
                      marginTop: 6,
                      fontSize: 10,
                    },
                  ]}
                >
                  {label}
                </Text>
                {isToday && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: t.primary,
                      marginTop: 2,
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </Card>
    </Animated.View>
  );
}

// ── Weight sparkline card ──

function WeightSparkline({ evolution }: { evolution: PortalEvolution[] }) {
  const t = useThemeColors();
  const points = evolution.filter(
    (e) => e.weight_kg !== null,
  ) as (PortalEvolution & { weight_kg: number })[];
  if (points.length < 2) return null;

  const W = SCREEN_W - SCREEN_PADDING * 2 - space.lg * 2;
  const H = 72;
  const padX = 4;
  const padY = 10;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;

  const weights = points.map((p) => p.weight_kg);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const rangeW = maxW - minW || 1;

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padY + chartH - ((p.weight_kg - minW) / rangeW) * chartH,
  }));

  const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const fillPoints = `${padX},${padY + chartH} ${polyPoints} ${padX + chartW},${padY + chartH}`;
  const first = points[0].weight_kg;
  const last = points[points.length - 1].weight_kg;
  const diff = last - first;
  const diffStr = `${diff > 0 ? "+" : ""}${diff.toFixed(1).replace(".", ",")} kg`;
  const trendColor = diff <= 0 ? t.success : t.warning;
  const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp;

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(280)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card onPress={() => router.push("/(tabs)/profile")}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: space.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: diff <= 0 ? t.successLight : t.warningLight,
              }}
            >
              <TrendIcon size={14} color={trendColor} />
            </View>
            <Text
              style={[
                typography.headingSm,
                { color: t.text, marginLeft: space.sm },
              ]}
            >
              Evolução
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[
                typography.captionBold,
                { color: trendColor, marginRight: 4 },
              ]}
            >
              {diffStr}
            </Text>
            <ChevronRight size={14} color={t.textMuted} />
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: space.xs,
          }}
        >
          <Text style={[typography.headingLg, { color: t.text }]}>
            {last.toFixed(1).replace(".", ",")}
            <Text style={[typography.caption, { color: t.textMuted }]}>
              {" "}
              kg
            </Text>
          </Text>
          <Text style={[typography.caption, { color: t.textMuted }]}>
            {points.length} medições
          </Text>
        </View>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.primary} stopOpacity="0.12" />
              <Stop offset="1" stopColor={t.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Polyline points={fillPoints} fill="url(#fill)" stroke="none" />
          <Polyline
            points={polyPoints}
            fill="none"
            stroke={t.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <SvgCircle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r={4}
            fill={t.surface}
            stroke={t.primary}
            strokeWidth={2.5}
          />
        </Svg>
      </Card>
    </Animated.View>
  );
}
