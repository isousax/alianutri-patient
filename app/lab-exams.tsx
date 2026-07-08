import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlaskConical, ChevronRight, FileText, CheckCircle2, Clock } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useThemeColors } from '../src/stores/theme'
import { useLabExams } from '../src/hooks/usePortal'
import type { PortalLabExamStatus, PortalLabExamSummary } from '../src/types/portal'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList, PillBadge } from '../src/components/ui'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'

// "Exames" — superfície de LEITURA dos exames laboratoriais que o nutricionista
// solicita (GET /p/:code/lab-exams). O paciente vê o status, abre o detalhe com
// os marcadores e envia os documentos (foto/PDF) do resultado.

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusMeta(status: PortalLabExamStatus, t: ReturnType<typeof useThemeColors>) {
  switch (status) {
    case 'resulted':
      return { label: 'Resultado disponível', color: t.success, bg: t.successLight }
    case 'collected':
      return { label: 'Material coletado', color: t.warning, bg: t.warningLight }
    case 'canceled':
      return { label: 'Cancelado', color: t.textMuted, bg: t.surfaceSecondary }
    default:
      return { label: 'Solicitado', color: t.info, bg: t.infoLight }
  }
}

export default function LabExamsScreen() {
  const t = useThemeColors()
  const { data, isLoading, isError, refetch, isRefetching } = useLabExams()

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Exames" />
        <SkeletonList />
      </SafeAreaView>
    )
  }
  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Exames" />
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    )
  }

  const exams: PortalLabExamSummary[] = [...(data?.exams ?? [])].sort((a, b) =>
    b.requested_date.localeCompare(a.requested_date),
  )

  if (exams.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Exames" />
        <EmptyState
          icon={<FlaskConical size={28} color={t.primary} />}
          title="Nenhum exame ainda"
          description="Os exames solicitados pelo seu nutricionista aparecerão aqui, com resultados e espaço para enviar os documentos."
          actionLabel="Atualizar"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Exames" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: space.sm }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        <Text style={[typography.bodyMd, { color: t.textMuted, paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }]}>
          Exames solicitados pelo seu nutricionista. Toque para ver os resultados e enviar os documentos.
        </Text>

        {exams.map((exam, i) => {
          const meta = statusMeta(exam.status, t)
          const StatusIcon = exam.status === 'resulted' ? CheckCircle2 : Clock
          const subtitle =
            exam.status === 'resulted'
              ? `Resultado em ${fmtDate(exam.result_date ?? exam.requested_date)}`
              : `Solicitado em ${fmtDate(exam.requested_date)}`
          return (
            <Animated.View
              key={exam.id}
              entering={FadeInDown.duration(320).delay(Math.min(i * 60, 300))}
              style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }}
            >
              <Card onPress={() => router.push(`/lab-exam/${exam.id}` as never)} accessibilityLabel={`Exame ${exam.title}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: meta.bg,
                      marginRight: space.md,
                    }}
                  >
                    <FlaskConical size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelLg, { color: t.text }]} numberOfLines={2}>
                      {exam.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <StatusIcon size={12} color={t.textMuted} />
                      <Text style={[typography.caption, { color: t.textMuted }]}>{subtitle}</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={t.textMuted} />
                </View>
                <View style={{ flexDirection: 'row', marginTop: space.md }}>
                  <PillBadge text={meta.label} color={meta.color} bg={meta.bg} />
                </View>
              </Card>
            </Animated.View>
          )
        })}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
          <FileText size={13} color={t.textMuted} />
          <Text style={[typography.caption, { color: t.textMuted, flex: 1 }]}>
            Os valores e faixas são informativos. A interpretação é sempre feita com seu nutricionista.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
