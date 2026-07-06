import { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image, type ImageSource } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import {
  List,
  LayoutGrid,
  Plus,
  Camera,
  X,
  WifiOff,
  Utensils,
  BookOpen,
} from "lucide-react-native";
import { useThemeColors } from "../../src/stores/theme";
import { useAuthStore } from "../../src/stores/auth";
import { useFeaturesStore } from "../../src/stores/features";
import {
  useDiaryFeed,
  usePortalHome,
  useDiaryToday,
  useDiaryStreak,
} from "../../src/hooks/usePortal";
import {
  EmptyState,
  ErrorState,
  SkeletonList,
  ReadOnlyBanner,
  SegmentedControl,
  ShimmerImage,
} from "../../src/components/ui";
import { PostCard } from "../../src/components/feed/PostCard";
import { diaryPhotoSource } from "../../src/lib/diaryPhoto";
import { useIsOnline } from "../../src/lib/network";
import { todayStr } from "../../src/lib/date";
import {
  typography,
  space,
  radius,
  SCREEN_PADDING,
  shadows,
} from "../../src/theme/tokens";
import type { DiaryPost } from "../../src/types/portal";
import { useDiarySeenStore } from "../../src/stores/diarySeen";
import { ProgressView } from "../../src/components/progress/ProgressView";
import { Conquistas } from "../../src/components/diary/Conquistas";
import { WeeklyRecap } from "../../src/components/diary/WeeklyRecap";
import { MealNudge } from "../../src/components/diary/MealNudge";

const GRID_GAP = 8;
const SCREEN_W = Dimensions.get("window").width;
// Mosaico estilo "explorar": 2 colunas — 1 tile grande (retrato) ladeado por 2 pequenos.
const COL_W = (SCREEN_W - SCREEN_PADDING * 2 - GRID_GAP) / 2;
const SMALL_H = COL_W;
const BIG_H = SMALL_H * 2 + GRID_GAP;

type Segment = "feed" | "progress" | "achievements";

type MosaicRowData = { items: DiaryPost[]; base: number; bigLeft: boolean };

// Tile do mosaico: foto + overlay (ícone da categoria + rótulo + kcal quando refeição).
const GridTile = memo(function GridTile({
  post,
  width,
  height,
  big,
  accessCode,
  sessionToken,
  onPress,
}: {
  post: DiaryPost;
  width: number;
  height: number;
  big: boolean;
  accessCode: string | null;
  sessionToken: string | null;
  onPress: () => void;
}) {
  const t = useThemeColors();
  const source: ImageSource =
    post._local && post._localPhotoUri
      ? { uri: post._localPhotoUri }
      : diaryPhotoSource(
          accessCode,
          sessionToken,
          post.id,
          big ? "medium" : "thumb",
        );
  const isMeal = post.type === "meal";
  const ai = post.ai_analysis;
  const kcal =
    isMeal && post.ai_status === "completed" && ai
      ? Math.round(ai.calories ?? 0)
      : null;
  const Icon = isMeal ? Utensils : BookOpen;
  return (
    <Pressable
      onPress={onPress}
      style={{
        width,
        height,
        borderRadius: radius.lg,
        overflow: "hidden",
        backgroundColor: t.surfaceSecondary,
      }}
    >
      <ShimmerImage
        source={source}
        style={{ width, height }}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={post.id}
      />
      <View
        style={{
          position: "absolute",
          left: 6,
          bottom: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: "rgba(0,0,0,0.55)",
        }}
      >
        <Icon size={11} color="#fff" />
        {big ? (
          <Text
            style={[
              typography.caption,
              { color: "#fff", fontSize: 10, fontWeight: "600" },
            ]}
          >
            {isMeal ? "Refeição" : "Diário"}
          </Text>
        ) : null}
        {kcal != null ? (
          <Text style={[typography.caption, { color: "#fff", fontSize: 10 }]}>
            {big ? `· ${kcal} kcal` : `${kcal} kcal`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export default function FeedScreen() {
  const t = useThemeColors();
  const canWrite = useFeaturesStore((s) => s.canWrite);
  const accessCode = useAuthStore((s) => s.accessCode);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const markDiarySeen = useDiarySeenStore((s) => s.markSeen);
  // Ao abrir o feed, marca como visto (zera o badge de novos comentarios do nutri).
  useFocusEffect(
    useCallback(() => {
      markDiarySeen();
    }, [markDiarySeen]),
  );
  const [view, setView] = useState<"timeline" | "grid">("timeline");
  const [segment, setSegment] = useState<Segment>("feed");
  const { data: home } = usePortalHome();
  // Empurrãozinho contextual (refeição atrasada) — reusa o motor nextStep da Home.
  const { data: diaryToday } = useDiaryToday(todayStr());
  const { data: streakData } = useDiaryStreak();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiaryFeed();

  const posts: DiaryPost[] = data?.pages.flatMap((p) => p.posts) ?? [];
  const photoPosts = posts.filter((p) => p.has_photo);
  const isOnline = useIsOnline();
  const fullSource = (p: DiaryPost): ImageSource =>
    p._local && p._localPhotoUri
      ? { uri: p._localPhotoUri }
      : diaryPhotoSource(accessCode, sessionToken, p.id, "original");

  // Agrupa as fotos em blocos de 3 (1 grande + 2 pequenas), alternando o lado do grande.
  const photoRows = useMemo<MosaicRowData[]>(() => {
    const rows: MosaicRowData[] = [];
    for (let i = 0, r = 0; i < photoPosts.length; i += 3, r++) {
      rows.push({
        items: photoPosts.slice(i, i + 3),
        base: i,
        bigLeft: r % 2 === 0,
      });
    }
    return rows;
  }, [photoPosts]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const header = (
    <View
      style={{
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: space.lg,
        paddingBottom: space.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={[typography.displaySm, { color: t.text }]}>Diário</Text>
      {segment === "feed" && (
        <View
          style={{
            flexDirection: "row",
            backgroundColor: t.surfaceSecondary,
            borderRadius: radius.lg,
            padding: 3,
          }}
        >
          {(["timeline", "grid"] as const).map((v) => {
            const Icon = v === "timeline" ? List : LayoutGrid;
            const active = view === v;
            return (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                accessibilityRole="button"
                accessibilityLabel={
                  v === "timeline" ? "Ver em lista" : "Ver em grade"
                }
                accessibilityState={{ selected: active }}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: 6,
                  borderRadius: radius.md,
                  backgroundColor: active ? t.surface : "transparent",
                }}
              >
                <Icon size={18} color={active ? t.primary : t.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  // Segmentos do Diário: Feed (rede privada) + Progresso (gráficos) + Conquistas
  // (gamificação — só quando o nutri habilita gamification_enabled).
  const segments: { key: Segment; label: string }[] = [
    { key: "feed", label: "Feed" },
    { key: "progress", label: "Progresso" },
    ...(home?.gamification_enabled
      ? [{ key: "achievements" as Segment, label: "Conquistas" }]
      : []),
  ];

  const fab = canWrite ? (
    <Pressable
      onPress={() => router.push("/post-compose" as never)}
      accessibilityRole="button"
      accessibilityLabel="Nova postagem"
      style={{
        position: "absolute",
        right: SCREEN_PADDING,
        bottom: 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: t.primary,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.glow(t.primary),
      }}
    >
      <Plus size={26} color={t.primaryFg} />
    </Pressable>
  ) : null;

  // Visualizador fullscreen (grid → swipe horizontal entre fotos)
  const viewer = (
    <Modal
      visible={viewerIndex !== null}
      animationType="fade"
      onRequestClose={() => setViewerIndex(null)}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              padding: space.md,
            }}
          >
            <Pressable
              onPress={() => setViewerIndex(null)}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={22} color="#fff" />
            </Pressable>
          </View>
          {viewerIndex !== null && photoPosts.length > 0 && (
            <FlatList
              data={photoPosts}
              horizontal
              pagingEnabled
              initialScrollIndex={Math.min(viewerIndex, photoPosts.length - 1)}
              getItemLayout={(_, index) => ({
                length: SCREEN_W,
                offset: SCREEN_W * index,
                index,
              })}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const ai = item.ai_analysis;
                return (
                  <ScrollView
                    style={{ width: SCREEN_W }}
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: "center",
                    }}
                    showsVerticalScrollIndicator={false}
                  >
                    <Image
                      source={fullSource(item)}
                      style={{ width: SCREEN_W, height: SCREEN_W }}
                      contentFit="contain"
                    />
                    <View style={{ padding: SCREEN_PADDING, gap: space.sm }}>
                      {item.caption ? (
                        <Text style={[typography.bodyMd, { color: "#fff" }]}>
                          {item.emoji ? `${item.emoji} ` : ""}
                          {item.caption}
                        </Text>
                      ) : null}
                      {item.type === "meal" &&
                      item.ai_status === "completed" &&
                      ai ? (
                        <Text
                          style={[
                            typography.bodySm,
                            { color: "rgba(255,255,255,0.85)" },
                          ]}
                        >
                          ~{Math.round(ai.calories ?? 0)} kcal · P{" "}
                          {Math.round(ai.protein_g ?? 0)}g · C{" "}
                          {Math.round(ai.carbs_g ?? 0)}g · G{" "}
                          {Math.round(ai.fat_g ?? 0)}g
                        </Text>
                      ) : null}
                    </View>
                  </ScrollView>
                );
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );

  const feedBody = (
    <>
      {!canWrite && <ReadOnlyBanner />}
      {!isOnline && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginHorizontal: SCREEN_PADDING,
            marginBottom: space.sm,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            backgroundColor: t.infoLight,
          }}
        >
          <WifiOff size={15} color={t.info} />
          <Text style={[typography.caption, { color: t.info, flex: 1 }]}>
            Sem internet — seus posts serão enviados quando reconectar.
          </Text>
        </View>
      )}

      {canWrite && (
        <MealNudge
          meals={diaryToday?.meals ?? []}
          streak={streakData?.streak ?? 0}
        />
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError && posts.length === 0 ? (
        <ErrorState onRetry={() => refetch()} />
      ) : posts.length === 0 ? (
        <EmptyState
          alia
          title="Seu diário está vazio"
          description="Tire uma foto da sua refeição e comece sua jornada!"
          actionLabel={canWrite ? "Primeira postagem" : undefined}
          onAction={
            canWrite ? () => router.push("/post-compose" as never) : undefined
          }
        />
      ) : view === "timeline" ? (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={<WeeklyRecap />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/post/${item.id}` as never)}>
              <PostCard
                post={item}
                nutriName={home?.nutritionist?.name ?? "Sua nutricionista"}
                nutriPhoto={home?.nutritionist?.photo_url ?? null}
              />
            </Pressable>
          )}
          contentContainerStyle={{ paddingTop: space.sm, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={t.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={t.primary}
                style={{ marginVertical: space.lg }}
              />
            ) : null
          }
          removeClippedSubviews={false}
          windowSize={11}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={50}
          initialNumToRender={6}
        />
      ) : (
        <FlatList
          key="grid"
          data={photoRows}
          keyExtractor={(row) => row.items[0]?.id ?? String(row.base)}
          contentContainerStyle={{
            gap: GRID_GAP,
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space.sm,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={t.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          windowSize={21}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          initialNumToRender={6}
          renderItem={({ item: row }) => {
            // Resto (1–2 fotos no fim): quadrados simples, sem tile grande.
            if (row.items.length < 3) {
              return (
                <View style={{ flexDirection: "row", gap: GRID_GAP }}>
                  {row.items.map((p, k) => (
                    <GridTile
                      key={p.id}
                      post={p}
                      width={COL_W}
                      height={SMALL_H}
                      big={false}
                      accessCode={accessCode}
                      sessionToken={sessionToken}
                      onPress={() => setViewerIndex(row.base + k)}
                    />
                  ))}
                </View>
              );
            }
            const [a, b, c] = row.items;
            const bigTile = (
              <GridTile
                post={a}
                width={COL_W}
                height={BIG_H}
                big
                accessCode={accessCode}
                sessionToken={sessionToken}
                onPress={() => setViewerIndex(row.base)}
              />
            );
            const smallCol = (
              <View style={{ gap: GRID_GAP }}>
                <GridTile
                  post={b}
                  width={COL_W}
                  height={SMALL_H}
                  big={false}
                  accessCode={accessCode}
                  sessionToken={sessionToken}
                  onPress={() => setViewerIndex(row.base + 1)}
                />
                <GridTile
                  post={c}
                  width={COL_W}
                  height={SMALL_H}
                  big={false}
                  accessCode={accessCode}
                  sessionToken={sessionToken}
                  onPress={() => setViewerIndex(row.base + 2)}
                />
              </View>
            );
            return (
              <View style={{ flexDirection: "row", gap: GRID_GAP }}>
                {row.bigLeft ? (
                  <>
                    {bigTile}
                    {smallCol}
                  </>
                ) : (
                  <>
                    {smallCol}
                    {bigTile}
                  </>
                )}
              </View>
            );
          }}
        />
      )}
    </>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.background }}
      edges={["top"]}
    >
      {header}
      <View
        style={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space.sm }}
      >
        <SegmentedControl
          options={segments}
          value={segment}
          onChange={(k) => setSegment(k as Segment)}
        />
      </View>
      {segment === "feed" ? (
        feedBody
      ) : segment === "progress" ? (
        <ProgressView bottomPadding={100} />
      ) : (
        <Conquistas />
      )}
      {segment === "feed" && fab}
      {viewer}
    </SafeAreaView>
  );
}
