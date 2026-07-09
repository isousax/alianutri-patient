import { useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, StatusBar, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Info, FileText, Camera, Image as ImageIcon, Upload, Trash2, X, Download, Activity } from 'lucide-react-native'
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
import { useLabReportDetail, useUploadLabReport, useDeleteLabReportDocument } from '../../src/hooks/useLabReports'
import type { LabRangeStatus } from '../../src/types/portal'
import type { PortalLabReportDocument, PortalLabReportResult } from '../../src/types/labReport'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList, SectionLabel, PillBadge, Button, ReadOnlyBanner } from '../../src/components/ui'
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
  if (status === 'within') return { label: 'Dentro da faixa', color: t.success, bg: t.successLight }
  if (status === 'outside') return { label: 'Fora da faixa', color: t.warning, bg: t.warningLight }
  return null
}

export default function LabReportDetailScreen() {
  const t = useThemeColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const reportId = id ?? ''
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const accessCode = useAuthStore((s) => s.accessCode)
  const sessionToken = useAuthStore((s) => s.sessionToken)

  const { data, isLoading, isError, refetch, isRefetching } = useLabReportDetail(reportId)
  const { mutateAsync: upload, isPending: isUploading } = useUploadLabReport()
  const { mutateAsync: deleteDocument } = useDeleteLabReportDocument(reportId)

  const [viewer, setViewer] = useState<PortalLabReportDocument | null>(null)

  const doUpload = useCallback(
    async (input: { uri: string; mimeType: string; name: string }) => {
      try {
        haptics.medium()
        await upload({ ...input, reportId })
        toast.success('Documento enviado!')
      } catch {
        toast.error('Não foi possível enviar o documento.')
      }
    },
    [upload, reportId],
  )

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { toast.error('Precisamos de acesso à câmera.'); return }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (res.canceled || !res.assets?.[0]) return
    await doUpload({ uri: res.assets[0].uri, mimeType: 'image/jpeg', name: 'laudo.jpg' })
  }, [doUpload])

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { toast.error('Precisamos de acesso às fotos.'); return }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (res.canceled || !res.assets?.[0]) return
    await doUpload({ uri: res.assets[0].uri, mimeType: 'image/jpeg', name: 'laudo.jpg' })
  }, [doUpload])

  const pickDocument = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false })
    if (res.canceled || !res.assets?.[0]) return
    const a = res.assets[0]
    await doUpload({ uri: a.uri, mimeType: a.mimeType || 'application/pdf', name: a.name || 'documento.pdf' })
  }, [doUpload])

  const openUploadSheet = useCallback(() => {
    showActionSheet({
      title: 'Adicionar documento',
      message: 'Envie mais um arquivo deste laudo (foto ou PDF).',
      options: [
        { label: 'Tirar foto', icon: <Camera size={20} color={t.text} />, onPress: pickFromCamera },
        { label: 'Escolher da galeria', icon: <ImageIcon size={20} color={t.text} />, onPress: pickFromGallery },
        { label: 'Enviar PDF ou arquivo', icon: <FileText size={20} color={t.text} />, onPress: pickDocument },
      ],
      cancelLabel: 'Cancelar',
    })
  }, [t, pickFromCamera, pickFromGallery, pickDocument])

  const openDocument = useCallback(
    async (doc: PortalLabReportDocument) => {
      try {
        haptics.light()
        const url = portalFileUrl(accessCode, doc.url)
        const safeName = (doc.original_name || `laudo-${doc.id}`).replace(/[^\w.\-]+/g, '_')
        const target = (FileSystem.cacheDirectory ?? '') + safeName
        const { uri, status } = await FileSystem.downloadAsync(url, target, {
          headers: sessionToken ? { 'X-Patient-Session': sessionToken } : undefined,
        })
        if (status !== 200) throw new Error(`status ${status}`)
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: doc.mime_type,
            UTI: doc.mime_type === 'application/pdf' ? 'com.adobe.pdf' : 'public.image',
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
    (doc: PortalLabReportDocument) => {
      confirm({
        title: 'Remover documento',
        message: 'Deseja remover este documento enviado por você?',
        cancelLabel: 'Cancelar',
        confirmLabel: 'Remover',
        destructive: true,
        onConfirm: async () => {
          try {
            await deleteDocument(doc.id)
            haptics.success()
          } catch {
            toast.error('Não foi possível remover o documento.')
          }
        },
      })
    },
    [deleteDocument],
  )

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Laudo" />
        <SkeletonList />
      </SafeAreaView>
    )
  }
  if (isError || !data?.report) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Laudo" />
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <EmptyState icon={<Activity size={28} color={t.primary} />} title="Laudo não encontrado" description="Este laudo pode ter sido removido." />
        )}
      </SafeAreaView>
    )
  }

  const report = data.report
  const results = report.results
  const documents = report.documents
  const confirmed = report.status === 'confirmed'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title={report.lab_name || 'Laudo'} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {/* Meta */}
        <Animated.View entering={FadeInDown.duration(320)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
          <Card>
            <Text style={[typography.overline, { color: t.textMuted }]}>{confirmed ? 'RESULTADO' : 'STATUS'}</Text>
            <Text style={[typography.labelLg, { color: t.text, marginTop: 2 }]}>
              {confirmed ? 'Resultado disponível' : 'Em análise pelo nutricionista'}
            </Text>
            {report.collected_at ? (
              <>
                <Text style={[typography.overline, { color: t.textMuted, marginTop: space.md }]}>COLETA</Text>
                <Text style={[typography.labelLg, { color: t.text, marginTop: 2 }]}>{fmtDate(report.collected_at)}</Text>
              </>
            ) : null}
          </Card>
        </Animated.View>

        {/* Aviso fixo */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: t.infoLight }}>
            <Info size={16} color={t.info} style={{ marginTop: 1 }} />
            <Text style={[typography.caption, { color: t.textSecondary, flex: 1, lineHeight: 18 }]}>
              Os valores e faixas são informativos. A interpretação e a conduta são sempre definidas com o seu nutricionista.
            </Text>
          </View>
        </View>

        {/* Resultados (só quando confirmados) */}
        {confirmed && results.length > 0 && (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
            <SectionLabel text="RESULTADOS" />
            <View style={{ gap: space.md }}>
              {results.map((r) => (
                <ResultCard key={r.id} r={r} />
              ))}
            </View>
          </View>
        )}

        {/* Documentos */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
          <SectionLabel text="DOCUMENTOS" />

          {!canWrite && <ReadOnlyBanner />}

          {documents.length > 0 ? (
            <View style={{ gap: space.sm, marginBottom: space.md }}>
              {documents.map((doc) => {
                const image = isImageMime(doc.mime_type)
                return (
                  <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', padding: space.sm, borderRadius: radius.lg, backgroundColor: t.surface, ...shadows.sm }}>
                    <Pressable onPress={() => (image ? setViewer(doc) : openDocument(doc))} accessibilityRole="button" accessibilityLabel={image ? 'Ver imagem do laudo' : 'Abrir PDF do laudo'} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {image ? (
                        <Image source={portalImageSource(accessCode, sessionToken, doc.url)} style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: t.surfaceSecondary }} contentFit="cover" />
                      ) : (
                        <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: t.errorLight, alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={22} color={t.error} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: space.md }}>
                        <Text style={[typography.labelMd, { color: t.text }]} numberOfLines={1}>
                          {doc.original_name || (image ? 'Imagem do laudo' : 'Documento PDF')}
                        </Text>
                        <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}>
                          {fmtSize(doc.size_bytes)} · {doc.uploaded_by_patient ? 'enviado por você' : 'enviado pelo nutri'}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable onPress={() => openDocument(doc)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Baixar ou compartilhar" style={{ padding: space.sm }}>
                      <Download size={18} color={t.textMuted} />
                    </Pressable>
                    {doc.uploaded_by_patient && canWrite && !confirmed ? (
                      <Pressable onPress={() => handleDelete(doc)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remover documento" style={{ padding: space.sm }}>
                        <Trash2 size={18} color={t.error} />
                      </Pressable>
                    ) : null}
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={[typography.bodyMd, { color: t.textMuted, marginBottom: space.md }]}>Nenhum documento anexado ainda.</Text>
          )}

          {canWrite && !confirmed && (
            <Button label={isUploading ? 'Enviando…' : 'Adicionar documento'} onPress={openUploadSheet} loading={isUploading} leftIcon={<Upload size={18} color={t.primaryFg} />} fullWidth />
          )}
        </View>
      </ScrollView>

      {/* Visualizador de imagem em tela cheia */}
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
              <Pressable onPress={() => viewer && openDocument(viewer)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Compartilhar" style={{ padding: space.sm }}>
                <Download size={20} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {viewer && (
              <Image source={portalImageSource(accessCode, sessionToken, viewer.url)} style={{ width: SCREEN_W, height: SCREEN_W * 1.33 }} contentFit="contain" />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function ResultCard({ r }: { r: PortalLabReportResult }) {
  const t = useThemeColors()
  const meta = rangeMeta(r.range_status, t)
  const display = r.value != null ? fmtNum(r.value) : (r.value_text ?? '—')
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelMd, { color: t.text }]}>{r.analyte_name}</Text>
          <Text style={[typography.headingSm, { color: t.text, marginTop: 2 }]}>
            {display}
            {r.unit ? <Text style={[typography.caption, { color: t.textMuted }]}> {r.unit}</Text> : null}
          </Text>
          {r.reference_low != null || r.reference_high != null ? (
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>
              Referência: {r.reference_low != null ? fmtNum(r.reference_low) : '—'} – {r.reference_high != null ? fmtNum(r.reference_high) : '—'}
            </Text>
          ) : null}
        </View>
        {meta && <PillBadge text={meta.label} color={meta.color} bg={meta.bg} />}
      </View>
    </Card>
  )
}
