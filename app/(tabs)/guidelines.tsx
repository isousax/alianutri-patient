import { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, ChevronRight } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'
import { useGuidelines, useGuidelineDetail } from '../../src/hooks/usePortal'
import { Card, ScreenHeader, EmptyState, LoadingScreen } from '../../src/components/ui'
import { radius, space, typography, SCREEN_PADDING } from '../../src/theme/tokens'

export default function GuidelinesScreen() {
  const t = useThemeColors()
  const { data: guidelines, isLoading, refetch, isRefetching } = useGuidelines()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useGuidelineDetail(selectedId)

  // ── Loading ──
  if (isLoading) return <LoadingScreen />

  // ── Empty state ──
  if (!guidelines || guidelines.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md }}>
          <Text style={[typography.displaySm, { color: t.text }]}>Orientações</Text>
        </View>
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
    let sections: { heading?: string; text?: string; body?: string }[] = []
    if (Array.isArray(detail.content)) {
      sections = detail.content
    } else {
      const rawText = typeof detail.content === 'string'
        ? detail.content
        : (detail.content as Record<string, unknown>)?.text
          ? String((detail.content as Record<string, unknown>).text)
          : null
      if (rawText) {
        const parts = rawText.split(/^## /m).filter(Boolean)
        sections = parts.map((part: string) => {
          const newline = part.indexOf('\n')
          if (newline > 0) {
            return { heading: part.slice(0, newline).trim(), body: part.slice(newline + 1).trim() }
          }
          return { body: part.trim() }
        })
      }
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title={detail.title} onBack={() => setSelectedId(null)} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section: any, idx: number) => (
            <View key={idx} style={{ marginBottom: space.xl }}>
              {section.heading ? (
                <Text style={[typography.headingSm, { color: t.text, marginBottom: space.xs }]}>{section.heading}</Text>
              ) : null}
              {section.text ? (
                <Text style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22 }]}>{section.text}</Text>
              ) : null}
              {section.body ? (
                <Text style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22 }]}>{section.body}</Text>
              ) : null}
            </View>
          ))}
          {sections.length === 0 && (
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
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md }}>
        <Text style={[typography.displaySm, { color: t.text }]}>Orientações</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {guidelines.map((g) => (
          <Card key={g.id} onPress={() => setSelectedId(g.id)} style={{ marginBottom: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 42, height: 42,
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
