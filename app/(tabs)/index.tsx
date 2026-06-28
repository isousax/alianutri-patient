import { useMemo, useCallback, useReducer, useEffect, useState, useRef } from "react";
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
  ChevronUp,
  MapPin,
  Video,
  Flame,
  Droplets,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Utensils,
  Sun,
  Moon,
  CloudSun,
  BarChart3,
  Camera,
  CalendarPlus,
  Trophy,
  Award,
  Star,
  Lock,
  Pill,
  FileText,
  MoreHorizontal,
  X,
} from "lucide-react-native";
import Svg, {
  Rect as SvgRect,
  Polyline,
  Circle as SvgCircle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useThemeColors } from "../../src/stores/theme";
import { useFeaturesStore } from "../../src/stores/features";
import {
  usePortalHome,
  useDiaryToday,
  useChartsSummary,
  useRecentPosts,
  useGoals,
  useEvolution,
  useWaterIntake,
  useWeeklyAdherence,
  useDiaryStreak,
} from "../../src/hooks/usePortal";
import { useLevelUp } from "../../src/hooks/useLevelUp";
import { useAchievementUnlock } from "../../src/hooks/useAchievementUnlock";
import type {
  PortalGoal,
  PortalEvolution,
  WeeklyAdherenceDay,
  DiaryTimelineMeal,
  PortalHome,
} from "../../src/types/portal";
import { computeGamification, type BadgeIconKey } from "../../src/lib/gamification";
import { getTipOfTheDay } from "../../src/data/dailyTips";
import { useDailyTipStore } from "../../src/stores/dailyTip";
import { useSmartWaterGoal } from "../../src/hooks/useSmartWaterGoal";
import * as Haptics from "expo-haptics";
import {
  ProgressRing,
  Card,
  EmptyState,
  LoadingScreen,
  AuroraBackground,
} from "../../src/components/ui";
import { HomeHeader } from "../../src/components/home/HomeHeader";
import { AnelDoDia } from "../../src/components/home/AnelDoDia";
import { ProximoPasso } from "../../src/components/home/ProximoPasso";
import { RefeicoesDeHoje } from "../../src/components/home/RefeicoesDeHoje";
import { MiniPostCard } from "../../src/components/home/MiniPostCard";
import { GoalsPreview } from "../../src/components/home/GoalsPreview";
import { LevelUpCelebration, CelebrationModal } from "../../src/components/home/LevelUpCelebration";
import {
  radius,
  shadows,
  space,
  typography,
  SCREEN_PADDING,
  todayStr,
  fmtWater,
} from "../../src/theme/tokens";

const { width: SCREEN_W } = Dimensions.get("window");

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

  // Dica do dia: auto-aparece 1x/dia (até ser dispensada); a lâmpada no header
  // reabre sob demanda. Sem FAB, sem rodapé.
  const tipDismissedDate = useDailyTipStore((s) => s.dismissedDate);
  const tipHydrated = useDailyTipStore((s) => s.hydrated);
  const dismissTip = useDailyTipStore((s) => s.dismiss);
  const [tipManual, setTipManual] = useState(false);
  const tipVisible = tipManual || (tipHydrated && tipDismissedDate !== today);

  const { data: diaryToday } = useDiaryToday(today);
  const { data: chartsToday } = useChartsSummary(1);
  const aiCalories = Math.round((chartsToday?.nutrition ?? []).reduce((s, d) => s + (d.calories || 0), 0));
  const { data: recentPosts } = useRecentPosts(3);
  const { data: goals } = useGoals();
  const { data: evolution } = useEvolution();
  const { data: waterData } = useWaterIntake(today);
  const { goal: waterGoal, weather } = useSmartWaterGoal(
    waterData?.goal_ml ?? 2000,
  );
  const { data: adherenceData } = useWeeklyAdherence();
  const { data: streakData } = useDiaryStreak();

  const handleRefresh = useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: ["portal", "diary-today"] });
    qc.invalidateQueries({ queryKey: ["portal", "goals"] });
    qc.invalidateQueries({ queryKey: ["portal", "evolution"] });
    qc.invalidateQueries({ queryKey: ["portal", "water"] });
    tick();
  }, [refetch, qc]);

  // Celebração tátil ao fechar um anel (100%) — hooks sempre antes de returns
  const prevDiary = useRef(0);
  const prevWater = useRef(0);
  useEffect(() => {
    const dMeals = diaryToday?.meals ?? [];
    const pct = dMeals.length > 0 ? dMeals.filter((m: DiaryTimelineMeal) => m.entry !== null).length / dMeals.length : 0;
    if (pct >= 1 && prevDiary.current < 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    prevDiary.current = pct;
  }, [diaryToday]);
  useEffect(() => {
    const total = waterData?.total_ml ?? 0;
    const pct = waterGoal > 0 ? Math.min(total / waterGoal, 1) : 0;
    if (pct >= 1 && prevWater.current < 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    prevWater.current = pct;
  }, [waterData, waterGoal]);

  // Celebrações de gamificação — level-up e conquistas desbloqueadas
  const gam = useMemo(
    () =>
      data
        ? computeGamification({
            streak: streakData?.streak ?? 0,
            loggedDays: streakData?.logged_dates?.length ?? 0,
            goals: goals ?? [],
            mealPhotoCount: chartsToday?.counts?.meal_photos,
            exercisePostCount: chartsToday?.counts?.exercise_posts,
            nutriLikeCount: chartsToday?.counts?.nutri_reactions,
            nutriCommentCount: chartsToday?.counts?.nutri_comments,
          })
        : null,
    [data, goals, chartsToday, streakData],
  );
  const { celebrateLevel, dismiss: dismissLevelUp } = useLevelUp(gam?.level ?? null);
  const { newBadge, dismiss: dismissBadge } = useAchievementUnlock(gam?.badges ?? []);

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
  const streak = streakData?.streak ?? 0;
  const meals = diaryToday?.meals ?? [];
  const loggedCount = meals.filter((m: DiaryTimelineMeal) => m.entry !== null).length;
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
        <HomeHeader
          displayName={displayName}
          nutritionistName={data.nutritionist?.name ?? null}
          weather={weather ?? null}
          streak={streak}
          chatUnread={chatUnread}
          photoUrl={data.patient.photo_url}
          onTipPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setTipManual(true);
          }}
        />

        {/* ═══════ DICA DO DIA — discreta, 1x/dia, reabre pela lâmpada ═══════ */}
        {tipVisible && (
          <DailyTipCard
            onDismiss={() => {
              dismissTip(today);
              setTipManual(false);
            }}
          />
        )}

        {/* ═══════ PRÓXIMO PASSO — ação única mais relevante ═══════ */}
        <ProximoPasso
          meals={meals}
          waterTotalMl={waterTotal}
          waterGoalMl={waterGoal}
          pendingQuestionnaires={pendingQ}
        />

        {/* ═══════ ANEL DO DIA — foco diário (refeições · calorias · água) ═══════ */}
        <AnelDoDia
          loggedCount={loggedCount}
          totalMeals={totalMeals}
          diaryPct={diaryPct}
          waterTotal={waterTotal}
          waterGoal={waterGoal}
          waterPct={waterPct}
          aiCalories={aiCalories}
          targetKcal={data.active_meal_plan?.target_kcal ?? null}
        />

        {/* ═══════ REFEIÇÕES DE HOJE — checklist do plano ═══════ */}
        <RefeicoesDeHoje meals={meals} />

        {/* ═══════ QUICK ACTIONS — 4-column icon grid + folder ═══════ */}
        <QuickActionsGrid canWrite={canWrite} />

        {/* ═══════ FEED PREVIEW — últimos posts do diário ═══════ */}
        {recentPosts && recentPosts.posts.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(160)} style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm }}>
              <Text style={[typography.headingSm, { color: t.text }]}>Seu Diário</Text>
              <Pressable onPress={() => router.push("/(tabs)/diary")} accessibilityRole="button" accessibilityLabel="Ver diário completo" hitSlop={8}>
                <Text style={[typography.labelSm, { color: t.primary }]}>Ver tudo</Text>
              </Pressable>
            </View>
            <Card>
              {recentPosts.posts.slice(0, 3).map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: t.borderLight, marginVertical: 2 }} /> : null}
                  <MiniPostCard post={p} onPress={() => router.push(`/post/${p.id}` as never)} />
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* ═══════ NEXT APPOINTMENT ═══════ */}
        {apt && <AppointmentCard apt={apt} />}

        {/* ═══════ ACTIVE GOALS ═══════ */}
        <GoalsPreview goals={activeGoals} />

        {/* ═══════ GAMIFICATION HUB (módulo gamification) ═══════ */}
        {data.gamification_enabled && <ProgressHubCard home={data} />}

        {/* ═══════ SUPLEMENTOS (módulo supplementation) ═══════ */}
        {data.supplementation_enabled && data.supplements && data.supplements.items.length > 0 && (
          <SupplementsCard supplements={data.supplements} />
        )}

        {/* ═══════ WEIGHT SPARKLINE ═══════ */}
        <WeightSparkline evolution={evolution ?? []} />

        {/* ═══════ WEEKLY ADHERENCE ═══════ */}
        {(adherenceData?.days?.length ?? 0) > 0 && (
          <WeeklyAdherenceChart days={adherenceData?.days ?? []} />
        )}

      </ScrollView>

      {celebrateLevel != null ? (
        <LevelUpCelebration level={celebrateLevel} onDismiss={dismissLevelUp} />
      ) : newBadge != null ? (
        <CelebrationModal
          icon={(() => {
            const BadgeIcon = BADGE_ICON[newBadge.icon];
            return <BadgeIcon size={52} color={t.primaryFg} />;
          })()}
          eyebrow="Conquista desbloqueada"
          title={newBadge.label}
          subtitle={newBadge.hint}
          onDismiss={dismissBadge}
        />
      ) : null}
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

// 5 slots numa única linha: 4 ações principais + "Mais".
const QUICK_COLS = 5;
const QUICK_ITEM_W =
  (SCREEN_W - SCREEN_PADDING * 2 - GRID_GAP * (QUICK_COLS - 1)) / QUICK_COLS;

function QuickAction({
  icon,
  label,
  bg,
  onPress,
  width = GRID_ITEM_W,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  onPress: () => void;
  width?: number;
}) {
  const t = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        alignItems: "center",
        paddingVertical: space.md,
        marginBottom: space.xs,
        borderRadius: radius.lg,
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.93 : 1 }],
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
        }}
      >
        {icon}
      </View>
      <View style={{ height: 30, justifyContent: "center", marginTop: space.xs + 2 }}>
        <Text
          style={[
            typography.captionBold,
            { color: t.textSecondary, textAlign: "center", fontSize: 10.5, lineHeight: 13 },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Quick Actions Grid (4 ações + "Mais" inline) ──

type ActionDef = {
  icon: React.ReactNode;
  label: string;
  bg: string;
  route: string;
};

function QuickActionsGrid({ canWrite }: { canWrite: boolean }) {
  const t = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  // 4 ações principais (sempre visíveis). Removidos da grade: Chat (vive no
  // hub Nutri), Peso e Como me sinto (migraram para o "+"), Diário (já é tab).
  const mainActions: ActionDef[] = useMemo(
    () => [
      { icon: <Camera size={18} color={t.primary} />, label: "Registrar progresso", bg: t.primaryLight, route: "/progress-photos" },
      { icon: <BarChart3 size={18} color={t.success} />, label: "Evolução", bg: t.successLight, route: "/evolution" },
      { icon: <Target size={18} color={t.accent} />, label: "Metas", bg: t.accentLight, route: "/goals" },
      { icon: <ClipboardList size={18} color={t.info} />, label: "Questionários", bg: t.infoLight, route: "/questionnaires" },
    ],
    [t],
  );

  const moreActions: ActionDef[] = useMemo(() => {
    const actions: ActionDef[] = [];
    if (canWrite) {
      actions.push({ icon: <CalendarPlus size={18} color={t.primary} />, label: "Agendar", bg: t.primaryLight, route: "/booking" });
    }
    actions.push(
      { icon: <FileText size={18} color={t.info} />, label: "Documentos", bg: t.infoLight, route: "/documents" },
      { icon: <FileText size={18} color={t.warning} />, label: "Orientações", bg: t.warningLight, route: "/guidelines" },
    );
    return actions;
  }, [canWrite, t]);

  const go = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(route as never);
  };

  const toggleMore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpanded((v) => !v);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(160)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.xl }}
    >
      <View style={{ flexDirection: "row", columnGap: GRID_GAP }}>
        {mainActions.map((a) => (
          <QuickAction
            key={a.route}
            icon={a.icon}
            label={a.label}
            bg={a.bg}
            width={QUICK_ITEM_W}
            onPress={() => go(a.route)}
          />
        ))}

        {/* Slot "Mais" — expande DENTRO do card (sem overlay) */}
        <Pressable
          onPress={toggleMore}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? "Mostrar menos ações" : "Mostrar mais ações"}
          style={({ pressed }) => ({
            width: QUICK_ITEM_W,
            alignItems: "center",
            paddingVertical: space.md,
            marginBottom: space.xs,
            borderRadius: radius.lg,
            opacity: pressed ? 0.75 : 1,
            transform: [{ scale: pressed ? 0.93 : 1 }],
          })}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              backgroundColor: t.surfaceSecondary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {expanded ? (
              <ChevronUp size={20} color={t.textSecondary} />
            ) : (
              <MoreHorizontal size={20} color={t.textSecondary} />
            )}
          </View>
          <View style={{ height: 30, justifyContent: "center", marginTop: space.xs + 2 }}>
            <Text
              style={[
                typography.captionBold,
                { color: t.textSecondary, textAlign: "center", fontSize: 10.5, lineHeight: 13 },
              ]}
              numberOfLines={1}
            >
              {expanded ? "Menos" : "Mais"}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Expansão inline — ações secundárias no mesmo bloco */}
      {expanded && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            columnGap: GRID_GAP,
            rowGap: space.xs,
            marginTop: space.sm,
          }}
        >
          {moreActions.map((a) => (
            <QuickAction
              key={a.route}
              icon={a.icon}
              label={a.label}
              bg={a.bg}
              width={QUICK_ITEM_W}
              onPress={() => go(a.route)}
            />
          ))}
        </Animated.View>
      )}

    </Animated.View>
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

function DailyTipCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useThemeColors();
  const tip = useMemo(() => getTipOfTheDay(), []);

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDismiss();
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(90)}
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
          <Pressable
            onPress={dismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dispensar dica do dia"
            style={({ pressed }) => ({ marginLeft: space.sm, marginTop: -2, opacity: pressed ? 0.6 : 1 })}
          >
            <X size={18} color={t.textMuted} />
          </Pressable>
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
      <Card onPress={() => router.push("/food-diary" as never)}>
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

// ── Gamification: hub de progresso (módulo gamification, gated por gamification_enabled) ──

const BADGE_ICON: Record<BadgeIconKey, typeof Flame> = {
  flame: Flame,
  award: Award,
  star: Star,
  target: Target,
  trophy: Trophy,
  utensils: Utensils,
  sparkles: Sparkles,
  droplet: Droplets,
};

function ProgressHubCard({ home }: { home: PortalHome }) {
  const t = useThemeColors();
  const { data: goals } = useGoals();
  const { data: charts } = useChartsSummary(1);
  const gam = computeGamification({
    streak: home.diary_streak ?? 0,
    loggedDays: home.logged_dates?.length ?? 0,
    goals: goals ?? [],
    mealPhotoCount: charts?.counts?.meal_photos,
    exercisePostCount: charts?.counts?.exercise_posts,
    nutriLikeCount: charts?.counts?.nutri_reactions,
    nutriCommentCount: charts?.counts?.nutri_comments,
  });
  const pct = Math.round((gam.xpInLevel / gam.xpPerLevel) * 100);

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(140)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card padded={false}>
        <AuroraBackground variant="subtle" style={{ borderRadius: radius.xl, padding: space.lg }}>
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
              <Trophy size={15} color={t.primary} />
            </View>
            <Text style={[typography.headingSm, { color: t.text, marginLeft: space.sm }]}>
              Seu progresso
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Flame size={14} color={t.warning} />
            <Text style={[typography.captionBold, { color: t.warning, marginLeft: 3 }]}>
              {gam.streak} {gam.streak === 1 ? "dia" : "dias"}
            </Text>
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
          <Text style={[typography.headingLg, { color: t.text }]}>Nível {gam.level}</Text>
          <Text style={[typography.caption, { color: t.textMuted }]}>
            {gam.xpInLevel}/{gam.xpPerLevel} XP
          </Text>
        </View>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: t.borderLight,
            overflow: "hidden",
            marginBottom: space.md,
          }}
        >
          <View
            style={{
              height: 6,
              borderRadius: 3,
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: t.primary,
            }}
          />
        </View>

        <Text style={[typography.caption, { color: t.textMuted, marginBottom: space.sm }]}>
          Conquistas · {gam.unlockedCount}/{gam.badges.length}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
          {gam.badges.map((badge) => {
            const Icon = BADGE_ICON[badge.icon];
            return (
              <View
                key={badge.id}
                style={{
                  width: "33.33%",
                  paddingHorizontal: 4,
                  marginBottom: space.sm,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: badge.unlocked ? t.primaryLight : t.borderLight,
                    opacity: badge.unlocked ? 1 : 0.6,
                  }}
                >
                  {badge.unlocked ? (
                    <Icon size={20} color={t.primary} />
                  ) : (
                    <Lock size={16} color={t.textMuted} />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    typography.caption,
                    {
                      color: badge.unlocked ? t.text : t.textMuted,
                      marginTop: 4,
                      textAlign: "center",
                    },
                  ]}
                >
                  {badge.label}
                </Text>
              </View>
            );
          })}
        </View>
        </AuroraBackground>
      </Card>
    </Animated.View>
  );
}

// ── Suplementos (módulo supplementation, gated por supplementation_enabled) ──

function SupplementsCard({ supplements }: { supplements: NonNullable<PortalHome["supplements"]> }) {
  const t = useThemeColors();
  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(170)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.md }}>
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
            <Pill size={15} color={t.primary} />
          </View>
          <Text style={[typography.headingSm, { color: t.text, marginLeft: space.sm }]}>
            Suplementos
          </Text>
        </View>

        {supplements.items.map((it, i) => (
          <View
            key={i}
            style={{
              paddingVertical: space.sm,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.borderLight,
            }}
          >
            <Text style={[typography.bodySm, { color: t.text, fontWeight: "600" }]}>{it.name}</Text>
            {[it.dose, it.timing, it.frequency].some((x) => x) && (
              <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>
                {[it.dose, it.timing, it.frequency].filter((x) => x).join(" · ")}
              </Text>
            )}
            {it.cycling ? (
              <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}>
                Ciclagem: {it.cycling}
              </Text>
            ) : null}
            {it.notes ? (
              <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}>{it.notes}</Text>
            ) : null}
          </View>
        ))}

        {supplements.notes ? (
          <Text
            style={[
              typography.caption,
              { color: t.textMuted, marginTop: space.sm, fontStyle: "italic" },
            ]}
          >
            {supplements.notes}
          </Text>
        ) : null}
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
      <Card onPress={() => router.push("/evolution" as never)}>
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
