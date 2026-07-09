import { useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlaskConical, ChevronRight, FileText, CheckCircle2, Clock, Upload, Camera, Image as ImageIcon } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useLabReports, useUploadLabReport } from '../src/hooks/useLabReports'
import type { PortalLabReportStatus, PortalLabReportSummary } from '../src/types/labReport'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList, PillBadge, Button, ReadOnlyBanner } from '../src/components/ui'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'
import { haptics } from '../src/lib/haptics'
import { toast } from '../src/stores/toast'
import { showActionSheet } from '../src/stores/actionSheet'

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Enquadramento neutro: o paciente nunca vê "OCR cru". Só distingue "em análise"
// (nutri revisando) de "resultado disponível" (confirmado).
function statusMeta(status: PortalLabReportStatus, t: ReturnType<typeof useThemeColors>) {
  if (status === 'confirmed') return { label: 'Resultado disponível', color: t.success, bg: t.successLight, Icon: CheckCircle2 }
  return { label: 'Em análise', color: t.info, bg: t.infoLight, Icon: Clock }
}

export default function LabReportsScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const { data, isLoading, isError, refetch, isRefetching } = useLabReports()
  const { mutateAsync: upload, isPending: isUploading } = useUploadLabReport()

  const doUpload = useCallback(
    async (input: { uri: string; mimeType: string; name: string }) => {
      try {
        haptics.medium()
        const res = await upload(input)
        toast.success('Laudo enviado!')
        router.push(`/lab-report/${res.report_id}` as never)
      } catch {
        toast.error('Não foi possível enviar o laudo.')
      }
    },
    [upload],
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
      title: 'Enviar laudo',
      message: 'Envie o resultado do seu exame (foto ou PDF). Seu nutricionista vai revisar.',
      options: [
        { label: 'Tirar foto', icon: <Camera size={20} color={t.text} />, onPress: pickFromCamera },
        { label: 'Escolher da galeria', icon: <ImageIcon size={20} color={t.text} />, onPress: pickFromGallery },
        { label: 'Enviar PDF ou arquivo', icon: <FileText size={20} color={t.text} />, onPress: pickDocument },
      ],
      cancelLabel: 'Cancelar',
    })
  }, [t, pickFromCamera, pickFromGallery, pickDocument])

  const reports: PortalLabReportSummary[] = [...(data?.reports ?? [])].sort((a, b) =>
    (b.collected_at ?? b.created_at).localeCompare(a.collected_at ?? a.created_at),
  )

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
          Envie os resultados dos seus exames. Seu nutricionista revisa e libera os marcadores aqui.
        </Text>

        {canWrite ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
            <Button
              label={isUploading ? 'Enviando…' : 'Enviar laudo'}
              onPress={openUploadSheet}
              loading={isUploading}
              leftIcon={<Upload size={18} color={t.primaryFg} />}
              fullWidth
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
            <ReadOnlyBanner />
          </View>
        )}

        {isLoading ? (
          <SkeletonList />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<FlaskConical size={28} color={t.primary} />}
            title="Nenhum laudo ainda"
            description="Toque em “Enviar laudo” para mandar o resultado de um exame. Você acompanha o status por aqui."
          />
        ) : (
          reports.map((r, i) => {
            const meta = statusMeta(r.status, t)
            return (
              <Animated.View
                key={r.id}
                entering={FadeInDown.duration(320).delay(Math.min(i * 60, 300))}
                style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }}
              >
                <Card onPress={() => router.push(`/lab-report/${r.id}` as never)} accessibilityLabel={`Laudo ${r.lab_name || ''}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: meta.bg, marginRight: space.md }}>
                      <FileText size={20} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.labelLg, { color: t.text }]} numberOfLines={1}>
                        {r.lab_name || 'Laudo laboratorial'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <meta.Icon size={12} color={t.textMuted} />
                        <Text style={[typography.caption, { color: t.textMuted }]}>
                          {fmtDate(r.collected_at ?? r.created_at)}
                          {r.status === 'confirmed' && r.result_count > 0 ? ` · ${r.result_count} marcador${r.result_count === 1 ? '' : 'es'}` : ''}
                        </Text>
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
          })
        )}

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
