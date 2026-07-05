import { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, ChevronRight } from 'lucide-react-native'
import { useThemeColors } from '../src/stores/theme'
import { useGuidelines, useGuidelineDetail } from '../src/hooks/usePortal'
import type { PortalGuidelineSummary } from '../src/types/portal'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList } from '../src/components/ui'
import { Markdown } from '../src/components/Markdown'
import { radius, space, typography, SCREEN_PADDING } from '../src/theme/tokens'

export default function GuidelinesScreen() {
  const t = useThemeColors()
  const { data: guidelines, isLoading, isError, refetch, isRefetching } = useGuidelines()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useGuidelineDetail(selectedId)

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Orientações" />
        <SkeletonList />
      </SafeAreaView>
    )
  }

  // ── Error state ──
  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Orientações" />
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    )
  }

  // ── Empty state ──
  if (!guidelines || guidelines.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Orientações" />
        <EmptyState
          icon={<FileText size={28} color={t.primary} />}
          title="Sem orientações"
          description="As orientações do seu nutricionista aparecerão aqui."
          actionLabel="Atualizar"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    )
  }

  // ── Detail view ──
  if (selectedId && detail) {
    const md = typeof detail.content === 'string'
      ? detail.content
      : (detail.content as Record<string, unknown>)?.text
        ? String((detail.content as Record<string, unknown>).text)
        : ''

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title={detail.title} onBack={() => setSelectedId(null)} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40, paddingTop: space.md }}
          showsVerticalScrollIndicator={false}
        >
          {md ? (
            <Markdown text={md} />
          ) : (
            <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', marginTop: space['5xl'] }]}>
              Nenhum conteúdo disponível.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── List view ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Orientações" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40, gap: space.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {guidelines.map((g: PortalGuidelineSummary) => (
          <Card key={g.id} onPress={() => setSelectedId(g.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40, height: 42,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.primaryLight,
                marginRight: space.md,
              }}>
                <FileText size={18} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.headingSm, { color: t.text }]}>{g.title}</Text>
                {g.published_at ? (
                  <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>
                    {new Date(g.published_at).toLocaleDateString('pt-BR')}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={16} color={t.textMuted} />
            </View>
          </Card>
        ))}
      </ScrollView>
      {loadingDetail && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: t.background + '99',
        }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      )}
    </SafeAreaView>
  )
}
