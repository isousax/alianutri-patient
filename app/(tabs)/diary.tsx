import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, Dimensions, Modal, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { List, LayoutGrid, Plus, Camera, X, WifiOff } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'
import { useAuthStore } from '../../src/stores/auth'
import { useFeaturesStore } from '../../src/stores/features'
import { useDiaryFeed, usePortalHome } from '../../src/hooks/usePortal'
import { EmptyState, SkeletonList, ReadOnlyBanner, SegmentedControl } from '../../src/components/ui'
import { PostCard } from '../../src/components/feed/PostCard'
import { diaryPhotoUrl } from '../../src/lib/diaryPhoto'
import { useIsOnline } from '../../src/lib/network'
import { typography, space, radius, SCREEN_PADDING, shadows } from '../../src/theme/tokens'
import type { DiaryPost, DiaryPostType } from '../../src/types/portal'
import { useDiarySeenStore } from '../../src/stores/diarySeen'
import { ProgressView } from '../../src/components/progress/ProgressView'
import { Conquistas } from '../../src/components/diary/Conquistas'
import { WeeklyRecap } from '../../src/components/diary/WeeklyRecap'

const GRID_GAP = 2
const COLS = 3
const SCREEN_W = Dimensions.get('window').width

type TypeFilter = 'all' | DiaryPostType
type PeriodFilter = 'all' | 'today' | 'week' | 'month'
type Segment = 'feed' | 'progress' | 'achievements'

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'meal', label: '🍽' },
  { id: 'exercise', label: '🏋️' },
  { id: 'mood', label: '😊' },
  { id: 'free', label: '✏️' },
]
const PERIOD_FILTERS: { id: PeriodFilter; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Tudo' },
]

function withinPeriod(iso: string, period: PeriodFilter): boolean {
  if (period === 'all') return true
  const ts = new Date(iso).getTime()
  if (isNaN(ts)) return true
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30
  return Date.now() - ts <= days * 86400000
}

export default function FeedScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const accessCode = useAuthStore((s) => s.accessCode)
  const markDiarySeen = useDiarySeenStore((s) => s.markSeen)
  // Ao abrir o feed, marca como visto (zera o badge de novos comentarios do nutri).
  useFocusEffect(useCallback(() => { markDiarySeen() }, [markDiarySeen]))
  const [view, setView] = useState<'timeline' | 'grid'>('timeline')
  const [segment, setSegment] = useState<Segment>('feed')
  const { data: home } = usePortalHome()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useDiaryFeed()

  const posts: DiaryPost[] = data?.pages.flatMap((p) => p.posts) ?? []
  const filtered = useMemo(
    () => posts.filter((p) => (typeFilter === 'all' || p.type === typeFilter) && withinPeriod(p.created_at, periodFilter)),
    [posts, typeFilter, periodFilter],
  )
  const photoPosts = filtered.filter((p) => p.has_photo)
  const cell = (SCREEN_W - GRID_GAP * (COLS - 1)) / COLS
  const isOnline = useIsOnline()
  const gridUri = (p: DiaryPost) =>
    p._local && p._localPhotoUri ? p._localPhotoUri : diaryPhotoUrl(accessCode, p.id, 'thumb')
  const fullUri = (p: DiaryPost) =>
    p._local && p._localPhotoUri ? p._localPhotoUri : diaryPhotoUrl(accessCode, p.id, 'original')

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const header = (
    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[typography.displaySm, { color: t.text }]}>Diário</Text>
      {segment === 'feed' && (
        <View style={{ flexDirection: 'row', backgroundColor: t.surfaceSecondary, borderRadius: radius.lg, padding: 3 }}>
          {(['timeline', 'grid'] as const).map((v) => {
            const Icon = v === 'timeline' ? List : LayoutGrid
            const active = view === v
            return (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                accessibilityRole="button"
                accessibilityLabel={v === 'timeline' ? 'Ver em lista' : 'Ver em grade'}
                accessibilityState={{ selected: active }}
                style={{ paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.md, backgroundColor: active ? t.surface : 'transparent' }}
              >
                <Icon size={18} color={active ? t.primary : t.textMuted} />
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )

  // Segmentos do Diário: Feed (rede privada) + Progresso (gráficos) + Conquistas
  // (gamificação — só quando o nutri habilita gamification_enabled).
  const segments: { key: Segment; label: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'progress', label: 'Progresso' },
    ...(home?.gamification_enabled ? [{ key: 'achievements' as Segment, label: 'Conquistas' }] : []),
  ]

  const filterBar = posts.length > 0 ? (
    <View style={{ gap: space.sm, paddingBottom: space.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, paddingHorizontal: SCREEN_PADDING }}>
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.id
          return (
            <Pressable key={f.id} onPress={() => setTypeFilter(f.id)} accessibilityRole="button" accessibilityState={{ selected: active }}
              style={{ paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: active ? t.primary : t.surfaceSecondary }}>
              <Text style={[typography.labelSm, { color: active ? t.primaryFg : t.textSecondary }]}>{f.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, paddingHorizontal: SCREEN_PADDING }}>
        {PERIOD_FILTERS.map((f) => {
          const active = periodFilter === f.id
          return (
            <Pressable key={f.id} onPress={() => setPeriodFilter(f.id)} accessibilityRole="button" accessibilityState={{ selected: active }}
              style={{ paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radius.full, backgroundColor: active ? t.primaryLight : 'transparent' }}>
              <Text style={[typography.labelSm, { color: active ? t.primary : t.textMuted }]}>{f.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  ) : null

  const fab = canWrite ? (
    <Pressable
      onPress={() => router.push('/post-compose' as never)}
      accessibilityRole="button"
      accessibilityLabel="Nova postagem"
      style={{ position: 'absolute', right: SCREEN_PADDING, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', ...shadows.glow(t.primary) }}
    >
      <Plus size={26} color={t.primaryFg} />
    </Pressable>
  ) : null

  // Visualizador fullscreen (grid → swipe horizontal entre fotos)
  const viewer = (
    <Modal visible={viewerIndex !== null} animationType="fade" onRequestClose={() => setViewerIndex(null)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: space.md }}>
            <Pressable
              onPress={() => setViewerIndex(null)}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={10}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
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
              getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const ai = item.ai_analysis
                return (
                  <ScrollView style={{ width: SCREEN_W }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
                    <Image source={{ uri: fullUri(item) }} style={{ width: SCREEN_W, height: SCREEN_W }} contentFit="contain" />
                    <View style={{ padding: SCREEN_PADDING, gap: space.sm }}>
                      {item.caption ? (
                        <Text style={[typography.bodyMd, { color: '#fff' }]}>
                          {item.emoji ? `${item.emoji} ` : ''}{item.caption}
                        </Text>
                      ) : null}
                      {item.type === 'meal' && item.ai_status === 'completed' && ai ? (
                        <Text style={[typography.bodySm, { color: 'rgba(255,255,255,0.85)' }]}>
                          ~{Math.round(ai.calories ?? 0)} kcal · P {Math.round(ai.protein_g ?? 0)}g · C {Math.round(ai.carbs_g ?? 0)}g · G {Math.round(ai.fat_g ?? 0)}g
                        </Text>
                      ) : null}
                    </View>
                  </ScrollView>
                )
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  )

  const feedBody = (
    <>
      {!canWrite && <ReadOnlyBanner />}
      {!isOnline && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SCREEN_PADDING, marginBottom: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: t.infoLight }}>
          <WifiOff size={15} color={t.info} />
          <Text style={[typography.caption, { color: t.info, flex: 1 }]}>Sem internet — seus posts serão enviados quando reconectar.</Text>
        </View>
      )}
      {filterBar}

      {isLoading ? (
        <SkeletonList />
      ) : posts.length === 0 ? (
        <EmptyState
          alia
          title="Seu diário está vazio"
          description="Tire uma foto da sua refeição e comece sua jornada!"
          actionLabel={canWrite ? 'Primeira postagem' : undefined}
          onAction={canWrite ? () => router.push('/post-compose' as never) : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Camera size={28} color={t.primary} />}
          title="Nenhum post com esse filtro"
          description="Tente outro tipo ou período."
        />
      ) : view === 'timeline' ? (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={<WeeklyRecap />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/post/${item.id}` as never)}>
              <PostCard post={item} />
            </Pressable>
          )}
          contentContainerStyle={{ paddingTop: space.sm, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color={t.primary} style={{ marginVertical: space.lg }} /> : null}
        />
      ) : (
        <FlatList
          key="grid"
          data={photoPosts}
          numColumns={COLS}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={{ gap: GRID_GAP }}
          contentContainerStyle={{ gap: GRID_GAP, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => setViewerIndex(index)} style={{ width: cell, height: cell }}>
              <Image source={{ uri: gridUri(item) }} style={{ width: cell, height: cell }} contentFit="cover" transition={150} />
            </Pressable>
          )}
        />
      )}
    </>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {header}
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space.sm }}>
        <SegmentedControl options={segments} value={segment} onChange={(k) => setSegment(k as Segment)} />
      </View>
      {segment === 'feed' ? feedBody : segment === 'progress' ? <ProgressView bottomPadding={100} /> : <Conquistas />}
      {segment === 'feed' && fab}
      {viewer}
    </SafeAreaView>
  )
}
