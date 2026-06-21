import { useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, ChevronRight } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useDocuments, useDocumentDetail } from '../src/hooks/usePortal'
import type { PortalDocumentSummary } from '../src/types/portal'
import { Card, ScreenHeader, EmptyState, LoadingScreen } from '../src/components/ui'
import { radius, space, typography, SCREEN_PADDING } from '../src/theme/tokens'

const TYPE_LABELS: Record<string, string> = {
  certificate: 'Atestado',
  declaration: 'Declaração',
  prescription: 'Receita',
  report: 'Laudo',
  guidance: 'Orientação',
  custom: 'Documento',
}

type DocBlock = { type: 'h1' | 'h2' | 'h3' | 'p' | 'li'; text: string }

// Render do HTML do documento como blocos de texto (sem WebView).
function decode(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function htmlToBlocks(html: string): DocBlock[] {
  const blocks: DocBlock[] = []
  const re = /<(h1|h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const type = m[1].toLowerCase() as DocBlock['type']
    const text = decode(m[2])
    if (text) blocks.push({ type, text })
  }
  return blocks
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso.slice(0, 10) }
}

export default function DocumentsScreen() {
  const t = useThemeColors()
  const { data: docs, isLoading, refetch, isRefetching } = useDocuments()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useDocumentDetail(selectedId)

  // ── Detail view ──
  if (selectedId) {
    const blocks = detail ? htmlToBlocks(detail.content_html) : []
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title={detail?.name ?? 'Documento'} onBack={() => setSelectedId(null)} />
        {loadingDetail ? (
          <LoadingScreen />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40, paddingTop: space.md }}
            showsVerticalScrollIndicator={false}
          >
            {detail && (
              <Text style={[typography.caption, { color: t.textMuted, marginBottom: space.lg }]}>
                {TYPE_LABELS[detail.type] ?? 'Documento'} · {fmtDate(detail.created_at)}
              </Text>
            )}
            {blocks.map((b, idx) => {
              if (b.type === 'h1') {
                return <Text key={idx} style={[typography.headingSm, { color: t.text, textAlign: 'center', marginBottom: space.md, marginTop: idx === 0 ? 0 : space.lg }]}>{b.text}</Text>
              }
              if (b.type === 'h2' || b.type === 'h3') {
                return <Text key={idx} style={[typography.headingSm, { color: t.text, marginBottom: space.xs, marginTop: space.lg }]}>{b.text}</Text>
              }
              if (b.type === 'li') {
                return (
                  <View key={idx} style={{ flexDirection: 'row', marginBottom: space.xs }}>
                    <Text style={[typography.bodyMd, { color: t.textSecondary }]}>{'•  '}</Text>
                    <Text style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22, flex: 1 }]}>{b.text}</Text>
                  </View>
                )
              }
              return <Text key={idx} style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22, marginBottom: space.sm }]}>{b.text}</Text>
            })}
            {blocks.length === 0 && (
              <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', marginTop: space['5xl'] }]}>
                Nenhum conteúdo disponível.
              </Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    )
  }

  // ── List view ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Documentos" />
      {isLoading ? (
        <LoadingScreen />
      ) : !docs || docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} color={t.primary} />}
          title="Sem documentos"
          description="Atestados, declarações e laudos compartilhados pelo seu nutricionista aparecerão aqui."
          actionLabel="Atualizar"
          onAction={() => refetch()}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40, gap: space.lg }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        >
          {docs.map((d: PortalDocumentSummary, i: number) => (
            <Animated.View key={d.id} entering={FadeInDown.duration(300).delay(i * 50)}>
              <Card onPress={() => setSelectedId(d.id)}>
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
                    <Text style={[typography.headingSm, { color: t.text }]} numberOfLines={1}>{d.name}</Text>
                    <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>
                      {TYPE_LABELS[d.type] ?? 'Documento'} · {fmtDate(d.shared_at ?? d.created_at)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={t.textMuted} />
                </View>
              </Card>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
