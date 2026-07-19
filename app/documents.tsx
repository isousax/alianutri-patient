import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, Download } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useAuthStore } from '../src/stores/auth'
import { useDocuments } from '../src/hooks/usePortal'
import type { PortalDocumentSummary } from '../src/types/portal'
import { openPortalPdf } from '../src/lib/openPortalFile'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList } from '../src/components/ui'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'
import { haptics } from '../src/lib/haptics'

const TYPE_LABELS: Record<string, string> = {
  declaration: 'Declaração',
  prescription: 'Receita',
  report: 'Laudo',
  guidance: 'Orientação',
  lab_order: 'Solicitação de exames',
  custom: 'Documento',
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Documentos oficiais compartilhados pelo nutricionista — PDF imutável (mesma fonte
// de verdade da web/e-mail). O app abre o PDF direto (visualizar/baixar/compartilhar),
// nunca reconstrói o conteúdo. Solicitações de Exames ficam na tela "Exames solicitados".
export default function DocumentsScreen() {
  const t = useThemeColors()
  const accessCode = useAuthStore((s) => s.accessCode)
  const sessionToken = useAuthStore((s) => s.sessionToken)
  const { data: docs, isLoading, isError, refetch, isRefetching } = useDocuments()

  async function openDoc(d: PortalDocumentSummary) {
    haptics.light()
    await openPortalPdf({ accessCode, sessionToken, path: `/documents/${d.id}/file`, filename: d.name })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Documentos" />
      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !docs || docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} color={t.primary} />}
          title="Nenhum documento"
          description="Declarações, receitas e orientações compartilhadas pelo seu nutricionista aparecem aqui em PDF para você baixar."
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: space.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        >
          {docs.map((d, idx) => (
            <Animated.View
              key={d.id}
              entering={FadeInDown.duration(320).delay(Math.min(idx * 60, 300))}
              style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }}
            >
              <Card onPress={() => openDoc(d)} accessibilityLabel={`Abrir PDF: ${d.name}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 40, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: t.infoLight, marginRight: space.md }}>
                    <FileText size={18} color={t.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.headingSm, { color: t.text }]} numberOfLines={1}>{d.name}</Text>
                    <Text style={[typography.caption, { color: t.textMuted, marginTop: 3 }]}>
                      {TYPE_LABELS[d.type] ?? 'Documento'} · {fmtDate(d.shared_at ?? d.created_at)}
                    </Text>
                  </View>
                  <Download size={18} color={t.textMuted} />
                </View>
              </Card>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
