import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal, StatusBar, Dimensions, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Info, FileText, Camera, Image as ImageIcon, Upload, Trash2, X, TrendingUp, Download, Activity,
} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Image } from 'expo-image'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useLocalSearchParams } from 'expo-router'
import { haptics } from '../../src/lib/haptics'
import { useThemeColors } from '../../src/stores/theme'
import { useFeaturesStore } from '../../src/stores/features'
import { useAuthStore } from '../../src/stores/auth'
import {
  useLabExamDetail, useUploadLabExamAttachment, useDeleteLabExamAttachment, useBiomarkerEvolution,
} from '../../src/hooks/usePortal'
import type { LabRangeStatus, PortalLabAttachment, PortalLabResult } from '../../src/types/portal'
import {
  Card, ScreenHeader, EmptyState, ErrorState, SkeletonList, SectionLabel, PillBadge, Button, ReadOnlyBanner,
} from '../../src/components/ui'
import { LineChart, type LineChartPoint } from '../../src/components/charts/LineChart'
import { typography, space, radius, shadows, SCREEN_PADDING } from '../../src/theme/tokens'
import { portalImageSource, portalFileUrl } from '../../src/lib/diaryPhoto'
import { toast } from '../../src/stores/toast'
import { confirm } from '../../src/stores/confirm'
import { showActionSheet } from '../../src/stores/actionSheet'

const SCREEN_W = Dimensions.get('window').width

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDayShort(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')
}
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function isImageMime(m: string): boolean {
  return m.startsWith('image/')
}

function rangeMeta(status: LabRangeStatus, t: ReturnType<typeof useThemeColors>) {
  // Enquadramento NEUTRO: nunca alarma (sem vermelho "crítico"). "Fora da faixa"
  // apenas sinaliza que vale conversar com o nutricionista.
  if (status === 'within') return { label: 'Dentro da faixa', color: t.success, bg: t.successLight }
  if (status === 'outside') return { label: 'Fora da faixa', color: t.warning, bg: t.warningLight }
  return null
}

// Barra com a faixa de referência destacada e um marcador na posição do valor.
function RangeBar({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const t = useThemeColors()
  const span = Math.max(max - min, 1e-6)
  const lo = min - span * 0.6
  const hi = max + span * 0.6
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  const pos = clamp((value - lo) / (hi - lo))
  const bandLeft = clamp((min - lo) / (hi - lo))
  const bandWidth = clamp((max - min) / (hi - lo))
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surfaceSecondary, marginTop: space.md }}>
      <View style={{ position: 'absolute', left: `${bandLeft * 100}%`, width: `${bandWidth * 100}%`, top: 0, bottom: 0, backgroundColor: t.successLight, borderRadius: 4 }} />
      <View style={{ position: 'absolute', left: `${pos * 100}%`, top: -3, bottom: -3, width: 4, marginLeft: -2, backgroundColor: color, borderRadius: 2 }} />
    </View>
  )
}

export default function LabExamDetailScreen() {
  const t = useThemeColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const requestId = id ?? ''
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const accessCode = useAuthStore((s) => s.accessCode)
  const sessionToken = useAuthStore((s) => s.sessionToken)

  const { data, isLoading, isError, refetch, isRefetching } = useLabExamDetail(requestId)
  const { mutateAsync: upload, isPending: isUploading } = useUploadLabExamAttachment(requestId)
  const { mutateAsync: deleteAttachment } = useDeleteLabExamAttachment(requestId)

  const [viewer, setViewer] = useState<PortalLabAttachment | null>(null)
  const [trend, setTrend] = useState<{ key: string; name: string; unit: string } | null>(null)

  const doUpload = useCallback(
    async (input: { uri: string; mimeType: string; name: string }) => {
      try {
        haptics.medium()
        await upload(input)
        toast.success('Documento enviado!')
      } catch {
        toast.error('Não foi possível enviar o documento.')
      }
    },
    [upload],
  )

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      toast.error('Precisamos de acesso à câmera.')
      return
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (res.canceled || !res.assets?.[0]) return
    await doUpload({ uri: res.assets[0].uri, mimeType: 'image/jpeg', name: 'exame.jpg' })
  }, [doUpload])

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      toast.error('Precisamos de acesso às fotos.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (res.canceled || !res.assets?.[0]) return
    await doUpload({ uri: res.assets[0].uri, mimeType: 'image/jpeg', name: 'exame.jpg' })
  }, [doUpload])

  const pickDocument = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (res.canceled || !res.assets?.[0]) return
    const a = res.assets[0]
    await doUpload({ uri: a.uri, mimeType: a.mimeType || 'application/pdf', name: a.name || 'documento.pdf' })
  }, [doUpload])

  const openUploadSheet = useCallback(() => {
    showActionSheet({
      title: 'Enviar documento',
      message: 'Anexe o resultado do exame (foto ou PDF).',
      options: [
        { label: 'Tirar foto', icon: <Camera size={20} color={t.text} />, onPress: pickFromCamera },
        { label: 'Escolher da galeria', icon: <ImageIcon size={20} color={t.text} />, onPress: pickFromGallery },
        { label: 'Enviar PDF ou arquivo', icon: <FileText size={20} color={t.text} />, onPress: pickDocument },
      ],
      cancelLabel: 'Cancelar',
    })
  }, [t, pickFromCamera, pickFromGallery, pickDocument])

  // Baixa o anexo COM header de sessão e abre na folha de compartilhamento do SO
  // (o download nativo não passa pelo api.ts, então o header vai manual aqui).
  const openAttachment = useCallback(
    async (att: PortalLabAttachment) => {
      try {
        haptics.light()
        const url = portalFileUrl(accessCode, att.url)
        const safeName = (att.original_name || `anexo-${att.id}`).replace(/[^\w.\-]+/g, '_')
        const target = (FileSystem.cacheDirectory ?? '') + safeName
        const { uri, status } = await FileSystem.downloadAsync(url, target, {
          headers: sessionToken ? { 'X-Patient-Session': sessionToken } : undefined,
        })
        if (status !== 200) throw new Error(`status ${status}`)
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: att.mime_type,
            UTI: att.mime_type === 'application/pdf' ? 'com.adobe.pdf' : 'public.image',
          })
        } else {
          toast.error('Compartilhamento indisponível neste dispositivo.')
        }
      } catch {
        toast.error('Não foi possível abrir o arquivo.')
      }
    },
    [accessCode, sessionToken],
  )

  const handleDelete = useCallback(
    (att: PortalLabAttachment) => {
      confirm({
        title: 'Remover anexo',
        message: 'Deseja remover este documento enviado por você?',
        cancelLabel: 'Cancelar',
        confirmLabel: 'Remover',
        destructive: true,
        onConfirm: async () => {
          try {
            await deleteAttachment(att.id)
            haptics.success()
          } catch {
            toast.error('Não foi possível remover o anexo.')
          }
        },
      })
    },
    [deleteAttachment],
  )

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Exame" />
        <SkeletonList />
      </SafeAreaView>
    )
  }
  if (isError || !data?.exam) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Exame" />
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <EmptyState
            icon={<Activity size={28} color={t.primary} />}
            title="Exame não encontrado"
            description="Este exame pode ter sido removido pelo seu nutricionista."
          />
        )}
      </SafeAreaView>
    )
  }

  const exam = data.exam
  const results = exam.results
  const attachments = exam.attachments

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title={exam.title || 'Exame'} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {/* ═══════ META ═══════ */}
        <Animated.View entering={FadeInDown.duration(320)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
          <Card>
            <Text style={[typography.overline, { color: t.textMuted }]}>SOLICITADO EM</Text>
            <Text style={[typography.labelLg, { color: t.text, marginTop: 2 }]}>{fmtDate(exam.requested_date)}</Text>
            {exam.result_date ? (
              <>
                <Text style={[typography.overline, { color: t.textMuted, marginTop: space.md }]}>RESULTADO EM</Text>
                <Text style={[typography.labelLg, { color: t.text, marginTop: 2 }]}>{fmtDate(exam.result_date)}</Text>
              </>
            ) : null}
          </Card>
        </Animated.View>

        {/* ═══════ AVISO FIXO (interpretação com o nutri) ═══════ */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.md }}>
          <View
            style={{
              flexDirection: 'row',
              gap: space.sm,
              padding: space.md,
              borderRadius: radius.lg,
              backgroundColor: t.infoLight,
            }}
          >
            <Info size={16} color={t.info} style={{ marginTop: 1 }} />
            <Text style={[typography.caption, { color: t.textSecondary, flex: 1, lineHeight: 18 }]}>
              Os valores e faixas são informativos. A interpretação e a conduta são sempre definidas com o seu nutricionista.
            </Text>
          </View>
        </View>

        {/* ═══════ RESULTADOS (marcadores) ═══════ */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
          <SectionLabel text="RESULTADOS" />
          {results.length === 0 ? (
            <Card>
              <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', paddingVertical: space.sm }]}>
                {exam.status === 'resulted'
                  ? 'Os resultados ainda não foram digitados. Se você já tem o laudo, envie o documento abaixo.'
                  : 'Ainda sem resultados. Assim que o exame for concluído, envie o documento abaixo.'}
              </Text>
            </Card>
          ) : (
            <View style={{ gap: space.md }}>
              {results.map((r) => (
                <BiomarkerCard
                  key={r.id}
                  r={r}
                  onTrend={() => setTrend({ key: r.biomarker_key, name: r.biomarker_name, unit: r.unit })}
                />
              ))}
            </View>
          )}
        </View>

        {/* ═══════ DOCUMENTOS ═══════ */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
          <SectionLabel text="DOCUMENTOS" />

          {!canWrite && <ReadOnlyBanner />}

          {attachments.length > 0 ? (
            <View style={{ gap: space.sm, marginBottom: space.md }}>
              {attachments.map((att) => {
                const image = isImageMime(att.mime_type)
                return (
                  <View
                    key={att.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: space.sm,
                      borderRadius: radius.lg,
                      backgroundColor: t.surface,
                      ...shadows.sm,
                    }}
                  >
                    <Pressable
                      onPress={() => (image ? setViewer(att) : openAttachment(att))}
                      accessibilityRole="button"
                      accessibilityLabel={image ? 'Ver imagem do exame' : 'Abrir PDF do exame'}
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    >
                      {image ? (
                        <Image
                          source={portalImageSource(accessCode, sessionToken, att.url)}
                          style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: t.surfaceSecondary }}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: t.errorLight, alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={22} color={t.error} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: space.md }}>
                        <Text style={[typography.labelMd, { color: t.text }]} numberOfLines={1}>
                          {att.original_name || (image ? 'Imagem do exame' : 'Documento PDF')}
                        </Text>
                        <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}>
                          {fmtSize(att.size_bytes)} · {att.uploaded_by_patient ? 'enviado por você' : 'enviado pelo nutri'}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => openAttachment(att)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Baixar ou compartilhar"
                      style={{ padding: space.sm }}
                    >
                      <Download size={18} color={t.textMuted} />
                    </Pressable>
                    {att.uploaded_by_patient && canWrite ? (
                      <Pressable
                        onPress={() => handleDelete(att)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Remover anexo"
                        style={{ padding: space.sm }}
                      >
                        <Trash2 size={18} color={t.error} />
                      </Pressable>
                    ) : null}
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space.md }]}>
              Nenhum documento anexado ainda.
            </Text>
          )}

          {canWrite && (
            <Button
              label={isUploading ? 'Enviando…' : 'Enviar documento'}
              onPress={openUploadSheet}
              loading={isUploading}
              leftIcon={<Upload size={18} color={t.primaryFg} />}
              fullWidth
            />
          )}
        </View>
      </ScrollView>

      {/* ── Visualizador de imagem em tela cheia ── */}
      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <SafeAreaView edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingTop: space.sm, paddingBottom: space.md }}>
              <Pressable onPress={() => setViewer(null)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Fechar" style={{ padding: space.sm }}>
                <X size={22} color="#fff" />
              </Pressable>
              <Text style={[typography.labelMd, { color: '#fff', flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                {viewer?.original_name || 'Documento'}
              </Text>
              <Pressable onPress={() => viewer && openAttachment(viewer)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Compartilhar" style={{ padding: space.sm }}>
                <Download size={20} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {viewer && (
              <Image
                source={portalImageSource(accessCode, sessionToken, viewer.url)}
                style={{ width: SCREEN_W, height: SCREEN_W * 1.33 }}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Tendência do marcador ── */}
      <TrendModal trend={trend} onClose={() => setTrend(null)} />
    </SafeAreaView>
  )
}

// ═══════════════════════════════════════════════════════
//  BIOMARKER CARD
// ═══════════════════════════════════════════════════════

function BiomarkerCard({ r, onTrend }: { r: PortalLabResult; onTrend: () => void }) {
  const t = useThemeColors()
  const chip = rangeMeta(r.range_status, t)
  const hasRange = r.reference_min != null && r.reference_max != null
  const refLabel =
    r.reference_min != null && r.reference_max != null
      ? `${fmtNum(r.reference_min)}–${fmtNum(r.reference_max)} ${r.unit}`
      : r.reference_max != null
      ? `até ${fmtNum(r.reference_max)} ${r.unit}`
      : r.reference_min != null
      ? `a partir de ${fmtNum(r.reference_min)} ${r.unit}`
      : null
  const valueColor = r.range_status === 'outside' ? t.warning : t.text

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: space.sm }}>
          <Text style={[typography.labelMd, { color: t.textSecondary }]}>{r.biomarker_name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 2 }}>
            <Text style={[typography.displaySm, { color: valueColor }]}>{fmtNum(r.value)}</Text>
            {r.unit ? <Text style={[typography.labelMd, { color: t.textMuted, marginBottom: 4 }]}>{r.unit}</Text> : null}
          </View>
        </View>
        {chip ? <PillBadge text={chip.label} color={chip.color} bg={chip.bg} /> : null}
      </View>

      {hasRange ? (
        <RangeBar value={r.value} min={r.reference_min as number} max={r.reference_max as number} color={valueColor} />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm }}>
        {refLabel ? (
          <Text style={[typography.caption, { color: t.textMuted }]}>Referência: {refLabel}</Text>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => { haptics.light(); onTrend() }}
          accessibilityRole="button"
          accessibilityLabel={`Ver tendência de ${r.biomarker_name}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 }}
        >
          <TrendingUp size={13} color={t.primary} />
          <Text style={[typography.captionBold, { color: t.primary }]}>Tendência</Text>
        </Pressable>
      </View>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
//  TREND MODAL — evolução histórica de um marcador
// ═══════════════════════════════════════════════════════

function TrendModal({
  trend,
  onClose,
}: {
  trend: { key: string; name: string; unit: string } | null
  onClose: () => void
}) {
  const t = useThemeColors()
  const { data, isLoading } = useBiomarkerEvolution(trend?.key ?? null)
  const points: LineChartPoint[] = (data?.points ?? []).map((p) => ({
    label: fmtDayShort(p.requested_date),
    value: p.value,
  }))
  const chartWidth = SCREEN_W - SCREEN_PADDING * 2 - space.lg * 2
  const summary =
    points.length >= 2
      ? `${trend?.name}: de ${fmtNum(points[0].value)} para ${fmtNum(points[points.length - 1].value)} ${trend?.unit ?? ''}.`
      : undefined

  return (
    <Modal visible={trend !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: t.surface, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space.lg, paddingBottom: space['2xl'] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.overline, { color: t.textMuted }]}>TENDÊNCIA</Text>
              <Text style={[typography.headingSm, { color: t.text }]} numberOfLines={1}>{trend?.name}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar" style={{ padding: space.xs }}>
              <X size={20} color={t.textMuted} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: space['2xl'] }}>
              <ActivityIndicator color={t.primary} />
            </View>
          ) : points.length >= 2 ? (
            <LineChart data={points} width={chartWidth} unit={trend?.unit} decimals={2} accessibilityLabel={summary} />
          ) : (
            <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', paddingVertical: space.xl }]}>
              {points.length === 1
                ? 'Apenas uma medição até agora. A tendência aparece quando houver mais exames deste marcador.'
                : 'Sem histórico para este marcador ainda.'}
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
