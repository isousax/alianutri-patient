import { View, Text, ScrollView, Dimensions } from "react-native";
import {
  Flame,
  Award,
  Star,
  Target,
  Trophy,
  Utensils,
  Sparkles,
  Droplets,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "../../stores/theme";
import {
  useDiaryStreak,
  useGoals,
  useChartsSummary,
  useWeeklyAdherence,
} from "../../hooks/usePortal";
import {
  computeGamification,
  computeWeeklyChallenges,
  levelTitle,
  MAX_LEVEL,
  type BadgeIconKey,
} from "../../lib/gamification";
import { Card, ProgressBar } from "../ui";
import { typography, space, SCREEN_PADDING } from "../../theme/tokens";
import { FireAnimation } from "../ui/FireAnimation";
import { MedalhasIcon } from "../ui/Medalhas";

// Segmento "Conquistas" do Diário (P1). XP/nível/streak/badges são DERIVADOS no
// cliente (lib/gamification.ts) a partir de sinais que o paciente já gera —
// sem motor de pontos no back. Gated por gamification_enabled no chamador.

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

export function Conquistas({
  bottomPadding = 100,
}: {
  bottomPadding?: number;
}) {
  const t = useThemeColors();
  const { data: streakData } = useDiaryStreak();
  const { data: goals } = useGoals();
  const { data: charts } = useChartsSummary(365);
  const { data: week } = useChartsSummary(7);
  const { data: adherence } = useWeeklyAdherence();
  const counts = charts?.counts;

  const gam = computeGamification({
    streak: streakData?.streak ?? 0,
    loggedDays: streakData?.logged_dates?.length ?? 0,
    goals: goals ?? [],
    mealPhotoCount: counts?.meal_photos ?? 0,
    diaryPostCount: counts?.diary_posts ?? 0,
    nutriLikeCount: counts?.nutri_reactions ?? 0,
    nutriCommentCount: counts?.nutri_comments ?? 0,
  });

  const challenges = computeWeeklyChallenges({
    loggedDaysThisWeek: (adherence?.days ?? []).filter((d) => d.logged > 0)
      .length,
    waterDaysThisWeek: (week?.water ?? []).filter((d) => (d.total_ml ?? 0) > 0)
      .length,
    postsThisWeek:
      (week?.counts?.meal_photos ?? 0) + (week?.counts?.diary_posts ?? 0),
    streak: gam.streak,
  });

  const maxed = gam.level >= MAX_LEVEL;
  const pct = maxed
    ? 1
    : Math.max(
        0,
        Math.min(1, gam.xpPerLevel > 0 ? gam.xpInLevel / gam.xpPerLevel : 0),
      );
  const cellW =
    (Dimensions.get("window").width - SCREEN_PADDING * 2 - space.sm * 2) / 3;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: space.md,
        paddingBottom: bottomPadding,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Herói — nível + barra de XP + streak */}
      <Animated.View entering={FadeInDown.duration(350)}>
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: t.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[typography.headingMd, { color: t.primaryFg }]}>
                {gam.level}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: t.textMuted }]}>
                Nível {gam.level}
              </Text>
              <Text style={[typography.headingMd, { color: t.text }]}>
                {levelTitle(gam.level)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: space.sm,
                paddingVertical: 6,
                //borderRadius: radius.full,
                //backgroundColor: t.warningLight,
              }}
            >
              <FireAnimation size={25} loop={true} />
              {/*<Flame size={15} color={t.warning} />*/}
              <Text style={[typography.captionBold, { color: t.warning }]}>
                {gam.streak}
              </Text>
            </View>
          </View>

          {/* Barra de XP (flex em vez de width %, p/ tipagem segura de DimensionValue) */}
          <ProgressBar
            progress={pct}
            height={8}
            style={{ marginTop: space.lg }}
          />
          <Text
            style={[
              typography.caption,
              { color: t.textMuted, marginTop: space.xs },
            ]}
          >
            {maxed
              ? `Nível máximo · ${gam.xp} XP`
              : `Faltam ${gam.xpPerLevel - gam.xpInLevel} XP para "${levelTitle(gam.level + 1)}" · ${gam.xp} XP total`}
          </Text>
        </Card>
      </Animated.View>

      {/* Desafios da semana */}
      <Text
        style={[
          typography.labelMd,
          {
            color: t.textSecondary,
            marginTop: space.xl,
            marginBottom: space.md,
          },
        ]}
      >
        Desafios da semana
      </Text>
      <Card>
        {challenges.map((ch, i) => {
          const Icon = BADGE_ICON[ch.icon];
          const p =
            ch.target > 0
              ? Math.max(0, Math.min(1, ch.current / ch.target))
              : 0;
          return (
            <View
              key={ch.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                marginTop: i > 0 ? space.md : 0,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  //borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  //backgroundColor: ch.done ? t.primaryLight : t.surfaceSecondary,
                }}
              >
                <Icon
                  size={20}
                  color={ch.done ? t.primary : t.textSecondary}
                  strokeWidth={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[typography.labelSm, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {ch.label}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: ch.done ? t.primary : t.textMuted },
                    ]}
                  >
                    {ch.done ? "Concluído" : `${ch.current}/${ch.target}`}
                  </Text>
                </View>
                <Text
                  style={[typography.caption, { color: t.textMuted }]}
                  numberOfLines={1}
                >
                  {ch.hint}
                </Text>
                <ProgressBar
                  progress={p}
                  color={t.primary}
                  style={{ marginTop: 6 }}
                />
              </View>
            </View>
          );
        })}
      </Card>

      {/* Badges */}
      <Text
        style={[
          typography.labelMd,
          {
            color: t.textSecondary,
            marginTop: space.xl,
            marginBottom: space.md,
          },
        ]}
      >
        Medalhas · {gam.unlockedCount}/{gam.badges.length}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {gam.badges.map((badge) => {
          const Icon = BADGE_ICON[badge.icon];
          return (
            <View
              key={badge.id}
              style={{
                width: cellW,
                alignItems: "center",
                opacity: badge.unlocked ? 1 : 0.4,
              }}
              accessibilityRole="image"
              accessibilityLabel={`${badge.label}: ${badge.hint}. ${badge.unlocked ? "Conquistado" : "Bloqueado"}`}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: badge.unlocked
                    ? t.primaryLight
                    : t.surfaceSecondary,
                  marginBottom: space.xs,
                }}
              >
                <MedalhasIcon medalha={badge.id} size={40} />
              </View>
              <Text
                style={[
                  typography.labelSm,
                  { color: t.text, textAlign: "center" },
                ]}
                numberOfLines={1}
              >
                {badge.label}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: t.textMuted, textAlign: "center" },
                ]}
                numberOfLines={2}
              >
                {badge.hint}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
