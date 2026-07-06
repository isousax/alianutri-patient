import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Check,
  CircleDashed,
  Camera,
  Clock,
  Utensils,
  Undo2,
  Plus,
  ChevronDown,
  X,
} from "lucide-react-native";
import { haptics } from "../src/lib/haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useThemeColors, type ThemeColors } from "../src/stores/theme";
import { toast } from "../src/stores/toast";
import { confirm } from "../src/stores/confirm";
import { useFeaturesStore } from "../src/stores/features";
import { useAuthStore } from "../src/stores/auth";
import {
  useDiaryToday,
  useDiaryStreak,
  useLogFoodDiary,
  useDeleteFoodDiary,
  useFoodDiary,
} from "../src/hooks/usePortal";
import type {
  DiaryTimelineMeal,
  PortalFoodDiaryEntry,
} from "../src/types/portal";
import {
  ScreenHeader,
  SkeletonBlock,
  ShimmerImage,
} from "../src/components/ui";
import { BottomSheet } from "../src/components/ui/BottomSheet";
import { ConfettiCelebration } from "../src/components/ui/ConfettiCelebration";
import { RewardTrophy } from "../src/components/ui/RewardTrophy";
import { AliaAvatar } from "../src/components/ui/AliaAvatar";
import { typography, space, radius } from "../src/theme/tokens";
import { todayStr, shiftDate } from "../src/lib/date";
import { portalImageSource } from "../src/lib/diaryPhoto";

// ── helpers ──

// Registro retroativo: feito claramente depois do dia referente (gap >= 2 dias).
// Tolera 1 dia p/ NAO marcar logs perto da meia-noite (created_at e UTC; entry_date e local).
// Robusto a data ausente/malformada: /diary/today nem sempre traz entry_date no
// entry — sem este guard, shiftDate(undefined) -> new Date inválido -> toISOString
// lançava "RangeError: Date value out of bounds" ao renderizar a tela.
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
function isRetroactive(entry: {
  created_at?: string | null;
  entry_date?: string | null;
}): boolean {
  const entryDay = (entry.entry_date ?? "").slice(0, 10);
  const createdDay = (entry.created_at ?? "").slice(0, 10);
  if (!YMD_RE.test(entryDay) || !YMD_RE.test(createdDay)) return false;
  return shiftDate(entryDay, 1) < createdDay;
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function currentHHMM(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseHHMM(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ── main screen ──

export default function DiaryScreen() {
  const t = useThemeColors();
  const canWrite = useFeaturesStore((s) => s.canWrite);
  const [date, setDate] = useState(todayStr());
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loggingIndex, setLoggingIndex] = useState<number | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [expandedLogged, setExpandedLogged] = useState<number | null>(null);
  const prevLoggedCount = useRef(0);

  const { data: diary, isLoading, refetch, isRefetching } = useDiaryToday(date);
  const { data: streakData } = useDiaryStreak();
  const { mutateAsync: logEntry } = useLogFoodDiary();
  const { mutateAsync: deleteEntry, isPending: isDeleting } =
    useDeleteFoodDiary();

  const isToday = date === todayStr();
  const streak = streakData?.streak ?? 0;
  const mealPlan = diary?.meal_plan;
  const meals: DiaryTimelineMeal[] = diary?.meals ?? [];
  const loggedCount = meals.filter((m) => m.entry !== null).length;
  const totalMeals = meals.length;
  const allDone = totalMeals > 0 && loggedCount === totalMeals;

  // Tick counter that increments every 60s to refresh time-based logic
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  // Derive the "smart" next meal index (first pending closest to now)
  const smartNextIndex = useMemo(() => {
    if (!isToday || meals.length === 0) {
      return meals.findIndex((m) => !m.entry);
    }
    const now = currentHHMM();
    // Find first pending meal whose time is >= now
    let idx = meals.findIndex((m) => !m.entry && parseHHMM(m.meal_time) >= now);
    // If none found, use first pending meal overall
    if (idx === -1) idx = meals.findIndex((m) => !m.entry);
    return idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, isToday, tick]);

  // Guard: reset focus if the focused meal got logged (e.g. via refetch)
  useEffect(() => {
    if (focusedIndex !== null && meals[focusedIndex]?.entry) {
      setFocusedIndex(null);
    }
  }, [focusedIndex, meals]);

  // The active hero index: user override or smart default
  const isManualFocus = focusedIndex !== null && !meals[focusedIndex]?.entry;
  const heroIndex =
    (isManualFocus ? focusedIndex : null) ??
    (smartNextIndex >= 0 ? smartNextIndex : null);

  // Split meals into sections
  const loggedMeals = useMemo(
    () =>
      meals
        .map((m, i) => ({ meal: m, originalIndex: i }))
        .filter(({ meal }) => !!meal.entry),
    [meals],
  );
  const pendingMeals = useMemo(
    () =>
      meals
        .map((m, i) => ({ meal: m, originalIndex: i }))
        .filter(({ meal }) => !meal.entry),
    [meals],
  );
  const remainingPending = useMemo(
    () =>
      pendingMeals.filter(({ originalIndex }) => originalIndex !== heroIndex),
    [pendingMeals, heroIndex],
  );

  // Celebration when all meals are logged
  useEffect(() => {
    if (
      totalMeals > 0 &&
      loggedCount === totalMeals &&
      prevLoggedCount.current < totalMeals
    ) {
      setJustCompleted(true);
      setFocusedIndex(null);
      // Sequência multi-toque (Duolingo-style) centralizada.
      haptics.celebrate();
      const timer = setTimeout(() => setJustCompleted(false), 6000);
      return () => clearTimeout(timer);
    }
    prevLoggedCount.current = loggedCount;
  }, [loggedCount, totalMeals]);

  // Reset focused when date changes
  useEffect(() => {
    setFocusedIndex(null);
    setExpandedLogged(null);
  }, [date]);

  const handleMarkFollowed = useCallback(
    async (meal: DiaryTimelineMeal) => {
      if (!mealPlan || loggingIndex !== null) return;
      setLoggingIndex(meal.meal_index);
      try {
        haptics.medium();
        // Adesão é sinal LEVE (streak/gamificação/animação) — grava só o mínimo:
        // nome da Refeição + slot + status. Sem copiar a lista de alimentos do plano.
        await logEntry({
          meal_type: meal.meal_type,
          entry_date: date,
          entry_time: nowTime(),
          food_description: meal.meal_name,
          compliance_status: "followed",
          meal_plan_id: mealPlan.id,
          meal_index: meal.meal_index,
        });
        setFocusedIndex(null);
      } catch {
        toast.error("Não foi possível registrar.");
      } finally {
        setLoggingIndex(null);
      }
    },
    [mealPlan, date, logEntry, loggingIndex],
  );

  const handleMarkPartial = useCallback(
    async (meal: DiaryTimelineMeal) => {
      if (!mealPlan || loggingIndex !== null) return;
      setLoggingIndex(meal.meal_index);
      try {
        haptics.light();
        await logEntry({
          meal_type: meal.meal_type,
          entry_date: date,
          entry_time: nowTime(),
          food_description: meal.meal_name,
          compliance_status: "partial",
          meal_plan_id: mealPlan.id,
          meal_index: meal.meal_index,
        });
        setFocusedIndex(null);
      } catch {
        toast.error("Não foi possível registrar.");
      } finally {
        setLoggingIndex(null);
      }
    },
    [mealPlan, date, logEntry, loggingIndex],
  );

  // Fase 5: a foto de uma Refeição do plano é registrada pelo COMPOSITOR de post, vinculada
  // ao slot (meal_plan_id/meal_index) — caminho único para fotos (some o upload duplicado).
  const handlePhoto = useCallback(
    (meal: DiaryTimelineMeal) => {
      if (!mealPlan) return;
      haptics.light();
      router.push(
        `/post-compose?type=meal&meal_plan_id=${encodeURIComponent(mealPlan.id)}&meal_index=${meal.meal_index}&meal_name=${encodeURIComponent(meal.meal_name)}` as never,
      );
    },
    [mealPlan],
  );

  const handleUndo = useCallback(
    async (meal: DiaryTimelineMeal) => {
      if (!meal.entry) return;
      haptics.light();
      confirm({
        title: "Desfazer registro",
        message: `Remover o registro de "${meal.meal_name}"?`,
        cancelLabel: "Cancelar",
        confirmLabel: "Desfazer",
        destructive: true,
        onConfirm: async () => {
          try {
            await deleteEntry(meal.entry!.id);
            setExpandedLogged(null);
          } catch {
            toast.error("Não foi possível desfazer.");
          }
        },
      });
    },
    [deleteEntry],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.background }}
      edges={["top"]}
    >
      {/* ── Header ── */}
      <ScreenHeader title="Diário alimentar" />

      {/* ── Date nav ── */}
      <View className="flex-row items-center justify-center gap-4 pb-3">
        <Pressable
          onPress={() => setDate(shiftDate(date, -1))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dia anterior"
        >
          <ChevronLeft size={20} color={t.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => setDate(todayStr())}
          accessibilityRole="button"
          accessibilityLabel="Ir para hoje"
        >
          <Text
            style={{ color: t.text }}
            className="text-sm font-sans-semibold"
          >
            {isToday ? "Hoje" : fmtDate(date)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDate(shiftDate(date, 1))}
          hitSlop={12}
          disabled={isToday}
          accessibilityRole="button"
          accessibilityLabel="Próximo dia"
        >
          <ChevronRight
            size={20}
            color={isToday ? t.border : t.textSecondary}
          />
        </Pressable>
      </View>

      {!isToday && (
        <Text
          style={[
            typography.caption,
            { color: t.info, textAlign: "center", marginVertical: space.sm },
          ]}
        >
          Modo retroativo.
        </Text>
      )}

      {/* ── Progress bar ── */}
      {totalMeals > 0 && (
        <View className="px-5 pb-3">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text style={{ color: t.textMuted }} className="text-xs font-sans">
              {loggedCount}/{totalMeals} refeições
            </Text>
            {allDone &&
              (justCompleted ? (
                <Animated.Text
                  entering={FadeInUp.duration(400)}
                  style={{ color: t.primary }}
                  className="text-xs font-sans-bold"
                >
                  Parabéns! Dia completo!
                </Animated.Text>
              ) : (
                <Text
                  style={{ color: t.primary }}
                  className="text-xs font-sans-bold"
                >
                  Completo ✓
                </Text>
              ))}
          </View>
          <View
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: t.border }}
          >
            <Animated.View
              className="h-full rounded-full"
              style={{
                width: `${totalMeals > 0 ? (loggedCount / totalMeals) * 100 : 0}%`,
                backgroundColor: t.primary,
              }}
            />
          </View>
        </View>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <View className="flex-1 px-5 pt-3" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className="flex-row items-center py-2"
              style={{ gap: 12 }}
            >
              <SkeletonBlock width={44} height={44} borderRadius={14} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBlock width="55%" height={14} />
                <SkeletonBlock width="35%" height={11} />
              </View>
              <SkeletonBlock width={26} height={26} borderRadius={13} />
            </View>
          ))}
        </View>
      ) : !mealPlan || meals.length === 0 ? (
        <FreeDiary date={date} canWrite={canWrite} logEntry={logEntry} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={t.primary}
            />
          }
        >
          {/* ── Logged meals section ── */}
          {loggedMeals.length > 0 && (
            <View className="px-5 mb-2">
              {loggedMeals.map(({ meal, originalIndex }, i) => (
                <Animated.View
                  key={`logged-${originalIndex}`}
                  entering={FadeInDown.duration(250).delay(i * 50)}
                  layout={LinearTransition.duration(200)}
                >
                  <CompactLoggedRow
                    meal={meal}
                    isExpanded={expandedLogged === originalIndex}
                    onPress={() =>
                      setExpandedLogged(
                        expandedLogged === originalIndex ? null : originalIndex,
                      )
                    }
                    onUndo={() => handleUndo(meal)}
                    isDeleting={isDeleting}
                    canWrite={canWrite}
                    t={t}
                  />
                </Animated.View>
              ))}
            </View>
          )}

          {/* ── Hero card (next/focused pending meal) ── */}
          {heroIndex !== null && !allDone && (
            <Animated.View
              key={`hero-${heroIndex}`}
              entering={FadeInDown.duration(350)}
              className="px-5 mb-2"
            >
              <HeroMealCard
                meal={meals[heroIndex]}
                onFollow={() => handleMarkFollowed(meals[heroIndex])}
                onPartial={() => handleMarkPartial(meals[heroIndex])}
                onPhoto={() => handlePhoto(meals[heroIndex])}
                isLogging={loggingIndex === meals[heroIndex].meal_index}
                isToday={isToday}
                isManualFocus={isManualFocus}
                onDismissFocus={() => setFocusedIndex(null)}
                canWrite={canWrite}
                t={t}
              />
            </Animated.View>
          )}

          {/* ── All-done celebration ── */}
          {allDone && (
            <>
              {justCompleted && <ConfettiCelebration />}
              <Animated.View
                entering={FadeIn.duration(500)}
                className="px-5 mb-2"
              >
                <CompletionCard
                  t={t}
                  justCompleted={justCompleted}
                  streak={streak}
                />
              </Animated.View>
            </>
          )}

          {/* ── Remaining pending meals ── */}
          {remainingPending.length > 0 && (
            <View className="px-5 mt-1">
              <Text
                style={{ color: t.textMuted }}
                className="text-[11px] font-sans-semibold uppercase tracking-wider mb-2 ml-1"
              >
                Próximas
              </Text>
              {remainingPending.map(({ meal, originalIndex }, i) => (
                <Animated.View
                  key={`pending-${originalIndex}`}
                  entering={FadeInDown.duration(250).delay(i * 50)}
                  layout={LinearTransition.duration(200)}
                >
                  <CompactPendingRow
                    meal={meal}
                    onFocus={() => {
                      haptics.light();
                      setFocusedIndex(originalIndex);
                    }}
                    onQuickFollow={() => handleMarkFollowed(meal)}
                    isLogging={loggingIndex === meal.meal_index}
                    canWrite={canWrite}
                    t={t}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Free diary (no plan) ──

const FREE_MEAL_TYPES = [
  { value: "breakfast", label: "Café da manhã", emoji: "☕" },
  { value: "morning_snack", label: "Lanche da manhã", emoji: "🍎" },
  { value: "lunch", label: "Almoço", emoji: "🍽️" },
  { value: "afternoon_snack", label: "Lanche da tarde", emoji: "🥪" },
  { value: "dinner", label: "Jantar", emoji: "🌙" },
  { value: "supper", label: "Ceia", emoji: "🍵" },
  { value: "other", label: "Outro", emoji: "📝" },
];

function FreeDiary({
  date,
  canWrite,
  logEntry,
}: {
  date: string;
  canWrite: boolean;
  logEntry: (entry: {
    meal_type: string;
    entry_date: string;
    food_description: string;
    compliance_status?: string;
  }) => Promise<unknown>;
}) {
  const t = useThemeColors();
  const [showModal, setShowModal] = useState(false);
  const [mealType, setMealType] = useState("lunch");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: entries, refetch } = useFoodDiary(date);
  const { mutateAsync: deleteEntry } = useDeleteFoodDiary();

  const dayEntries: PortalFoodDiaryEntry[] = entries ?? [];

  const handleSave = useCallback(async () => {
    if (!description.trim()) {
      toast.error("Descreva o que você comeu.");
      return;
    }
    setIsSaving(true);
    try {
      haptics.success();
      await logEntry({
        meal_type: mealType,
        entry_date: date,
        food_description: description.trim(),
      });
      setDescription("");
      setShowModal(false);
      refetch();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }, [description, mealType, date, logEntry, refetch]);

  const handleDelete = useCallback(
    async (id: string) => {
      confirm({
        title: "Remover",
        message: "Remover este registro?",
        cancelLabel: "Cancelar",
        confirmLabel: "Remover",
        destructive: true,
        onConfirm: async () => {
          try {
            await deleteEntry(id);
            refetch();
          } catch {
            toast.error("Falha ao remover.");
          }
        },
      });
    },
    [deleteEntry, refetch],
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Prompt to log */}
      <Animated.View
        entering={FadeIn.duration(300)}
        className="px-5 mt-4 mb-4 items-center"
      >
        <View
          className="h-14 w-14 rounded-2xl items-center justify-center mb-3"
          style={{ backgroundColor: t.primaryLight }}
        >
          <Utensils size={26} color={t.primary} />
        </View>
        <Text
          style={{ color: t.text }}
          className="text-base font-sans-semibold mb-1 text-center"
        >
          Registre suas refeições
        </Text>
        <Text
          style={{ color: t.textMuted }}
          className="text-sm font-sans text-center leading-5"
        >
          Mesmo sem plano alimentar, registrar o que você come ajuda seu
          nutricionista a te orientar melhor.
        </Text>
      </Animated.View>

      {canWrite && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          className="px-5 mb-4"
        >
          <Pressable
            onPress={() => setShowModal(true)}
            className="flex-row items-center justify-center py-3.5 rounded-xl"
            style={{ backgroundColor: t.primary }}
          >
            <Plus size={18} color={t.primaryFg} />
            <Text
              style={{ color: t.primaryFg }}
              className="text-sm font-sans-bold ml-2"
            >
              Registrar Refeição
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Day entries */}
      {dayEntries.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(200)}
          className="px-5"
        >
          <Text
            style={{ color: t.textMuted }}
            className="text-xs font-sans-semibold uppercase tracking-wider mb-2"
          >
            Refeições do dia ({dayEntries.length})
          </Text>
          {dayEntries.map((entry) => {
            const type = FREE_MEAL_TYPES.find(
              (m) => m.value === entry.meal_type,
            );
            return (
              <View
                key={entry.id}
                className="rounded-xl p-3 mb-1.5 flex-row items-start"
                style={{
                  backgroundColor: t.surface,
                  borderWidth: 1,
                  borderColor: t.borderLight,
                }}
              >
                <Text className="text-lg mr-2">{type?.emoji ?? "🍽️"}</Text>
                <View className="flex-1">
                  <Text
                    style={{ color: t.text }}
                    className="text-sm font-sans-semibold"
                  >
                    {type?.label ?? entry.meal_type}
                  </Text>
                  <Text
                    style={{ color: t.textSecondary }}
                    className="text-[12px] font-sans mt-0.5 leading-4"
                  >
                    {entry.food_description}
                  </Text>
                  {isRetroactive(entry) && (
                    <Text
                      style={{ color: t.info }}
                      className="text-[10px] font-sans-medium mt-0.5"
                    >
                      retroativo
                    </Text>
                  )}
                </View>
                {canWrite && (
                  <Pressable
                    onPress={() => handleDelete(entry.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remover este registro"
                    className="ml-2 mt-0.5"
                  >
                    <X size={14} color={t.textMuted} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </Animated.View>
      )}

      {/* Nova Refeição — bottom sheet keyboard-aware */}
      <BottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Refeição"
      >
        {/* Meal type picker */}
        <Text
          style={{ color: t.textMuted }}
          className="text-xs font-sans-semibold uppercase tracking-wider mb-2"
        >
          Tipo de Refeição
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          <View className="flex-row gap-2">
            {FREE_MEAL_TYPES.map((mt) => (
              <Pressable
                key={mt.value}
                onPress={() => {
                  setMealType(mt.value);
                  haptics.light();
                }}
                accessibilityRole="button"
                accessibilityLabel={mt.label}
                accessibilityState={{ selected: mealType === mt.value }}
                className="px-3 py-2 rounded-xl items-center"
                style={{
                  backgroundColor:
                    mealType === mt.value ? t.primaryLight : t.surface,
                  borderWidth: mealType === mt.value ? 1.5 : 1,
                  borderColor:
                    mealType === mt.value ? t.primary : t.borderLight,
                }}
              >
                <Text className="text-base">{mt.emoji}</Text>
                <Text
                  style={{
                    color: mealType === mt.value ? t.primary : t.textSecondary,
                  }}
                  className="text-[10px] font-sans-medium mt-0.5"
                >
                  {mt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Description */}
        <Text
          style={{ color: t.textMuted }}
          className="text-xs font-sans-semibold uppercase tracking-wider mb-2"
        >
          O que você comeu?
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Descrição da Refeição"
          placeholder="Ex: Arroz, feijão, frango grelhado e salada"
          placeholderTextColor={t.textMuted}
          multiline
          numberOfLines={3}
          className="rounded-xl p-3 text-sm font-sans mb-4"
          style={{
            color: t.text,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.borderLight,
            minHeight: 80,
            textAlignVertical: "top",
          }}
        />

        <Pressable
          onPress={handleSave}
          disabled={isSaving || !description.trim() || !canWrite}
          accessibilityRole="button"
          accessibilityLabel="Salvar Refeição"
          accessibilityState={{
            disabled: isSaving || !description.trim() || !canWrite,
            busy: isSaving,
          }}
          className="py-3.5 rounded-xl items-center"
          style={{
            backgroundColor: description.trim() ? t.primary : t.borderLight,
          }}
        >
          <Text
            className="text-sm font-sans-bold"
            style={{ color: description.trim() ? t.primaryFg : t.textMuted }}
          >
            {isSaving ? "Salvando..." : "Salvar Refeição"}
          </Text>
        </Pressable>
      </BottomSheet>
    </ScrollView>
  );
}

// ── Completion celebration ──

const CELEBRATE_MESSAGES = [
  "Todas as refeições registradas!",
  "Dia completo!",
  "Mandou muito bem hoje!",
  "Compromisso é tudo!",
  "Consistência gera resultados!",
  "Um passo de cada vez!",
  "Você manteve o ritmo hoje!",
  "Mais um dia de consistência!",
  "Parabéns pelo registro de hoje!",
  "Até amanhã! 👋",
  "Você está criando um bom hábito!",
  "Cada dia conta!",
  "Valeu pelo comprometimento!",
];

function CompletionCard({
  t,
  justCompleted,
  streak,
}: {
  t: ThemeColors;
  justCompleted: boolean;
  streak: number;
}) {
  const scale = useSharedValue(0);
  const messageIdx = useMemo(
    () => Math.floor(Math.random() * CELEBRATE_MESSAGES.length),
    [],
  );

  useEffect(() => {
    scale.value = justCompleted
      ? withSequence(
          withTiming(0, { duration: 0 }),
          withSpring(1.15, { damping: 6, stiffness: 150 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        )
      : withTiming(1, { duration: 300 });
  }, [justCompleted, scale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      className="rounded-2xl p-6 items-center overflow-hidden"
      style={{
        backgroundColor: t.primaryLight,
        borderWidth: 1.5,
        borderColor: t.primaryMuted,
      }}
    >
      {/* Celebration icon — premium trophy + lights (just completed) or Alia (already complete) */}
      <Animated.View
        className="items-center justify-center mb-4"
        style={[{ width: 100, height: 100 }, iconStyle]}
      >
        {justCompleted ? <RewardTrophy size={120} /> : <AliaAvatar size={80} />}
      </Animated.View>

      <Text
        style={{ color: t.primary }}
        className="text-lg font-sans-bold mb-1"
      >
        {justCompleted ? "Parabéns! 🎉" : "Dia concluído"}
      </Text>

      <Text
        style={{ color: t.textSecondary }}
        className="text-sm font-sans text-center mb-3"
      >
        {justCompleted
          ? CELEBRATE_MESSAGES[messageIdx]
          : "Continue assim! \nLembre-se de registrar no diário também."}
      </Text>

      {/* Streak badge */}
      {streak > 0 && (
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          className="flex-row items-center px-4 py-2 rounded-full"
          style={{ backgroundColor: t.accentLight }}
        >
          <Flame size={16} color={t.accent} />
          <Text
            style={{ color: t.accent }}
            className="text-sm font-sans-bold ml-1.5"
          >
            {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ── Hero meal card (the focused/next meal) ──

const HERO_MAX_FOODS = 5;

function HeroMealCard({
  meal,
  onFollow,
  onPartial,
  onPhoto,
  isLogging,
  isToday,
  isManualFocus,
  onDismissFocus,
  canWrite,
  t,
}: {
  meal: DiaryTimelineMeal;
  onFollow: () => void;
  onPartial: () => void;
  onPhoto: () => void;
  isLogging: boolean;
  isToday: boolean;
  isManualFocus: boolean;
  onDismissFocus: () => void;
  canWrite: boolean;
  t: ThemeColors;
}) {
  const [showAllFoods, setShowAllFoods] = useState(false);
  const hasManyFoods = meal.foods.length > HERO_MAX_FOODS;
  const visibleFoods = showAllFoods
    ? meal.foods
    : meal.foods.slice(0, HERO_MAX_FOODS);

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: t.surface,
        borderWidth: 1.5,
        borderColor: t.primary + "30",
      }}
    >
      {/* Label */}
      <View className="px-4 pt-3 pb-1 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className="h-2 w-2 rounded-full mr-2"
            style={{ backgroundColor: t.primary }}
          />
          <Text
            style={{ color: t.primary }}
            className="text-[11px] font-sans-bold uppercase tracking-wider"
          >
            {isManualFocus
              ? meal.meal_name
              : isToday
                ? "Próxima Refeição"
                : "Refeição"}
          </Text>
        </View>
        {isManualFocus && (
          <Pressable
            onPress={onDismissFocus}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Sair do foco desta Refeição"
          >
            <X size={14} color={t.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Meal info */}
      <View className="px-4 pt-1 pb-3">
        <View className="flex-row items-center justify-between">
          <Text style={{ color: t.text }} className="text-base font-sans-bold">
            {meal.meal_name}
          </Text>
          <View className="flex-row items-center">
            <Clock size={12} color={t.textMuted} />
            <Text
              style={{ color: t.textMuted }}
              className="text-xs font-sans ml-1"
            >
              {meal.meal_time}
            </Text>
          </View>
        </View>

        {/* Foods list (truncated) */}
        {meal.foods.length > 0 && (
          <View
            className="rounded-xl p-3 mt-3"
            style={{ backgroundColor: t.surfacePressed }}
          >
            {visibleFoods.map((food, i) => (
              <View
                key={i}
                className="flex-row items-center justify-between"
                style={
                  i > 0
                    ? {
                        marginTop: 5,
                        paddingTop: 5,
                        borderTopWidth: 1,
                        borderTopColor: t.borderLight,
                      }
                    : undefined
                }
              >
                <Text
                  style={{ color: t.text }}
                  className="text-[13px] font-sans flex-1"
                  numberOfLines={1}
                >
                  {food.name}
                </Text>
                {food.quantity && (
                  <Text
                    style={{ color: t.textMuted }}
                    className="text-[11px] font-sans ml-2"
                  >
                    {food.quantity}
                  </Text>
                )}
              </View>
            ))}
            {hasManyFoods && !showAllFoods && (
              <Pressable
                onPress={() => setShowAllFoods(true)}
                accessibilityRole="button"
                accessibilityLabel={`Ver todos os ${meal.foods.length} alimentos`}
                className="mt-2 flex-row items-center justify-center"
              >
                <Text
                  style={{ color: t.primary }}
                  className="text-[11px] font-sans-semibold"
                >
                  Ver todos ({meal.foods.length})
                </Text>
                <ChevronDown size={12} color={t.primary} className="ml-0.5" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Action buttons */}
      {canWrite && (
        <View className="px-4 pb-4">
          <View className="flex-row gap-2">
            <Pressable
              onPress={onPhoto}
              disabled={isLogging}
              accessibilityRole="button"
              accessibilityLabel="Registrar Refeição com foto"
              className="flex-row items-center justify-center py-3 rounded-xl flex-1"
              style={{
                backgroundColor: t.surfacePressed,
                borderWidth: 1,
                borderColor: t.borderLight,
              }}
            >
              <Camera size={16} color={t.textSecondary} />
              <Text
                style={{ color: t.textSecondary }}
                className="text-sm font-sans-semibold ml-2"
              >
                Foto
              </Text>
            </Pressable>
            <Pressable
              onPress={onFollow}
              disabled={isLogging}
              accessibilityRole="button"
              accessibilityLabel="Marcar como seguida"
              accessibilityState={{ disabled: isLogging, busy: isLogging }}
              className="flex-row items-center justify-center py-3 rounded-xl flex-[1.4]"
              style={{ backgroundColor: t.primary }}
            >
              <Check size={16} color={t.primaryFg} />
              <Text
                style={{ color: t.primaryFg }}
                className="text-sm font-sans-bold ml-2"
              >
                Segui
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onPartial}
            disabled={isLogging}
            accessibilityRole="button"
            accessibilityLabel="Marcar que segui parcialmente"
            className="mt-2 flex-row items-center justify-center py-2"
          >
            <Text
              style={{ color: t.textMuted }}
              className="text-xs font-sans-medium"
            >
              Segui parcialmente
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Compact row for logged meals ──

function CompactLoggedRow({
  meal,
  isExpanded,
  onPress,
  onUndo,
  isDeleting,
  canWrite,
  t,
}: {
  meal: DiaryTimelineMeal;
  isExpanded: boolean;
  onPress: () => void;
  onUndo: () => void;
  isDeleting: boolean;
  canWrite: boolean;
  t: ThemeColors;
}) {
  const accessCode = useAuthStore((s) => s.accessCode);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const status = meal.entry?.compliance_status;
  return (
    <View className="mb-1.5">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${meal.meal_name}, registrada${meal.meal_time ? `, ${meal.meal_time}` : ""}`}
        accessibilityState={{ expanded: isExpanded }}
        className="flex-row items-center py-2.5 px-3 rounded-xl"
        style={{ backgroundColor: t.primaryLight }}
      >
        <View
          className="h-6 w-6 items-center justify-center mr-3"
          style={{ backgroundColor: t.primaryMuted, borderRadius: radius.md,}}
        >
          <Check size={16} color={t.primary} />
        </View>
        <Text
          style={{ color: t.primary }}
          className="text-[13px] font-sans-semibold flex-1"
          numberOfLines={1}
        >
          {meal.meal_name}
        </Text>
        <Text
          style={{ color: t.textMuted }}
          className="text-[11px] font-sans mr-2"
        >
          {meal.meal_time}
        </Text>
        {status && (
          <View
            className="px-1.5 py-0.5 rounded"
            style={
              {
                //backgroundColor: status === 'followed' ? t.primaryMuted : status === 'partial' ? t.accentLight : t.primaryMuted,
              }
            }
          >
            <Text
              className="text-[10px] font-sans-medium"
              style={{
                color:
                  status === "followed"
                    ? t.primary
                    : status === "partial"
                      ? t.warning
                      : t.info,
              }}
            >
              {status === "followed"
                ? "Seguida"
                : status === "partial"
                  ? "Parcial"
                  : status === "photo_only"
                    ? "Foto"
                    : "✓"}
            </Text>
          </View>
        )}
        {meal.entry && isRetroactive(meal.entry) && (
          <View
            className="px-1.5 py-0.5 rounded ml-1"
            style={{ backgroundColor: t.infoLight }}
          >
            <Text
              className="text-[10px] font-sans-medium"
              style={{ color: t.info }}
            >
              retroativo
            </Text>
          </View>
        )}
        <ChevronDown size={12} color={t.primaryMuted} className="ml-1" />
      </Pressable>

      {/* Expanded: photo + undo */}
      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="ml-9 mt-1 mb-1"
        >
          {meal.entry?.photo_url && (
            <View className="rounded-xl overflow-hidden mb-2">
              <ShimmerImage
                source={portalImageSource(
                  accessCode,
                  sessionToken,
                  `/diary/photo/${meal.entry.id}`,
                )}
                style={{ width: "100%", height: 140 }}
                contentFit="cover"
                recyclingKey={meal.entry.id}
              />
            </View>
          )}
          {/* Foods list */}
          {meal.foods.length > 0 && (
            <View
              className="rounded-lg p-2.5 mb-2"
              style={{ backgroundColor: t.surfacePressed }}
            >
              {meal.foods.map((food, i) => (
                <View
                  key={i}
                  className="flex-row items-center justify-between"
                  style={
                    i > 0
                      ? {
                          marginTop: 4,
                          paddingTop: 4,
                          borderTopWidth: 1,
                          borderTopColor: t.borderLight,
                        }
                      : undefined
                  }
                >
                  <Text
                    style={{ color: t.textSecondary }}
                    className="text-[12px] font-sans flex-1"
                    numberOfLines={1}
                  >
                    {food.name}
                  </Text>
                  {food.quantity && (
                    <Text
                      style={{ color: t.textMuted }}
                      className="text-[10px] font-sans ml-2"
                    >
                      {food.quantity}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {canWrite && (
            <Pressable
              onPress={onUndo}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Desfazer este registro"
              className="flex-row items-center py-1.5"
            >
              <Undo2 size={12} color={t.textMuted} />
              <Text
                style={{ color: t.textMuted }}
                className="text-[11px] font-sans-medium ml-1.5"
              >
                Desfazer
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ── Compact row for pending meals (not the hero) ──

function CompactPendingRow({
  meal,
  onFocus,
  onQuickFollow,
  isLogging,
  canWrite,
  t,
}: {
  meal: DiaryTimelineMeal;
  onFocus: () => void;
  onQuickFollow: () => void;
  isLogging: boolean;
  canWrite: boolean;
  t: ThemeColors;
}) {
  return (
    <View
      className="flex-row items-center py-2.5 px-3 rounded-xl mb-1.5"
      style={{
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.borderLight,
      }}
    >
      <Pressable
        onPress={onFocus}
        accessibilityRole="button"
        accessibilityLabel={`${meal.meal_name}${meal.meal_time ? `, ${meal.meal_time}` : ""}, pendente. Toque para focar`}
        className="flex-row items-center flex-1"
        hitSlop={{ top: 8, bottom: 8, left: 8 }}
      >
        <View
          className="h-6 w-6 rounded-full items-center justify-center mr-3"
          style={{ borderWidth: 1.5, borderColor: t.border }}
        >
          <CircleDashed size={12} color={t.textMuted} />
        </View>
        <Text
          style={{ color: t.text }}
          className="text-[13px] font-sans-medium flex-1"
          numberOfLines={1}
        >
          {meal.meal_name}
        </Text>
        <Text
          style={{ color: t.textMuted }}
          className="text-[11px] font-sans mr-3"
        >
          {meal.meal_time}
        </Text>
      </Pressable>
      {canWrite && (
        <Pressable
          onPress={onQuickFollow}
          disabled={isLogging}
          accessibilityRole="button"
          accessibilityLabel={`Marcar ${meal.meal_name} como seguida`}
          accessibilityState={{ disabled: isLogging, busy: isLogging }}
          hitSlop={{ top: 8, bottom: 8, right: 8 }}
          className="px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: t.primary + "15" }}
        >
          <Text
            style={{ color: t.primary }}
            className="text-[11px] font-sans-bold"
          >
            Segui
          </Text>
        </Pressable>
      )}
    </View>
  );
}
