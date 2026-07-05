import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions, Modal, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Camera, Image as ImageIcon, Sparkles, Trash2, X,
} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { haptics } from '../src/lib/haptics'
import { Image } from 'expo-image'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useProgressPhotos, useUploadProgressPhoto, useDeleteProgressPhoto } from '../src/hooks/usePortal'
import type { ProgressPhoto } from '../src/types/portal'
import { useAuthStore } from '../src/stores/auth'
import { toast } from '../src/stores/toast'
import { confirm } from '../src/stores/confirm'
import { ScreenHeader, EmptyState, ErrorState, SectionLabel, SkeletonBlock } from '../src/components/ui'
import { ReadOnlyBanner } from '../src/components/ui/ReadOnlyBanner'
import { shadows, radius, space, typography, SCREEN_PADDING } from '../src/theme/tokens'

const SCREEN_W = Dimensions.get('window').width
const PHOTO_SIZE = (SCREEN_W - SCREEN_PADDING * 2 - space.sm) / 2
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.alianutri.com.br'

const CATEGORIES = [
  { value: 'front', label: 'Frente' },
  { value: 'side', label: 'Lateral' },
  { value: 'back', label: 'Costas' },
  { value: 'other', label: 'Outro' },
]

export default function ProgressPhotosScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const accessCode = useAuthStore((s) => s.accessCode)
  const { data, isLoading, isError, refetch } = useProgressPhotos()
  const { mutateAsync: upload, isPending: isUploading } = useUploadProgressPhoto()
  const { mutateAsync: deletePhoto } = useDeleteProgressPhoto()
  const [selectedCategory, setSelectedCategory] = useState('front')
  const [viewerPhoto, setViewerPhoto] = useState<ProgressPhoto | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  const photos: ProgressPhoto[] = data?.photos ?? []

  // Comparar evolução: escolhe 2 fotos e vê lado a lado (antes/depois por data).
  const exitCompare = () => { setCompareMode(false); setCompareIds([]); setCompareOpen(false) }
  const toggleCompare = (photo: ProgressPhoto) => {
    haptics.selection()
    setCompareIds((prev) =>
      prev.includes(photo.id)
        ? prev.filter((id) => id !== photo.id)
        : prev.length >= 2 ? [prev[1], photo.id] : [...prev, photo.id],
    )
  }
  const comparePair = compareIds
    .map((id) => photos.find((p) => p.id === id))
    .filter((p): p is ProgressPhoto => !!p)
    .sort((a, b) => a.photo_date.localeCompare(b.photo_date))
  const compareGapDays = comparePair.length === 2
    ? Math.round((new Date(comparePair[1].photo_date + 'T00:00:00').getTime() - new Date(comparePair[0].photo_date + 'T00:00:00').getTime()) / 86400000)
    : 0

  const handlePickPhoto = useCallback(async () => {
    if (!canWrite) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      toast.error('Precisamos de acesso às fotos.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    })

    if (result.canceled || !result.assets?.[0]) return

    try {
      haptics.medium()
      await upload({
        uri: result.assets[0].uri,
        category: selectedCategory,
      })
      toast.success('Foto de progresso salva!')
    } catch {
      toast.error('Não foi possível salvar a foto.')
    }
  }, [upload, selectedCategory, canWrite])

  const handleTakePhoto = useCallback(async () => {
    if (!canWrite) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      toast.error('Precisamos de acesso à câmera.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    })

    if (result.canceled || !result.assets?.[0]) return

    try {
      haptics.medium()
      await upload({
        uri: result.assets[0].uri,
        category: selectedCategory,
      })
      toast.success('Foto de progresso salva!')
    } catch {
      toast.error('Não foi possível salvar a foto.')
    }
  }, [upload, selectedCategory, canWrite])

  // Group photos by date
  const groupedByDate = photos.reduce<Record<string, typeof photos>>((acc, photo) => {
    const key = photo.photo_date
    if (!acc[key]) acc[key] = []
    acc[key].push(photo)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Fotos de Progresso" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {!canWrite && <ReadOnlyBanner />}

        {/* Comparar evolução */}
        {photos.length >= 2 && (
          compareMode ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: SCREEN_PADDING, marginTop: space.sm, marginBottom: space.lg }}>
              <Text style={[typography.labelMd, { color: t.text, flex: 1 }]}>
                {compareIds.length < 2 ? `Toque em 2 fotos (${compareIds.length}/2)` : 'Pronto para comparar'}
              </Text>
              {compareIds.length === 2 && (
                <Pressable onPress={() => setCompareOpen(true)} accessibilityRole="button" accessibilityLabel="Comparar fotos" style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: t.primary }}>
                  <Text style={[typography.labelMd, { color: t.primaryFg }]}>Comparar</Text>
                </Pressable>
              )}
              <Pressable onPress={exitCompare} accessibilityRole="button" accessibilityLabel="Cancelar comparação" style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: t.surfaceSecondary }}>
                <Text style={[typography.labelMd, { color: t.textSecondary }]}>Cancelar</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
              <Pressable onPress={() => { setCompareIds([]); setCompareMode(true) }} accessibilityRole="button" accessibilityLabel="Comparar evolução" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.sm + 2, borderRadius: radius.lg, backgroundColor: t.surface, ...shadows.sm }}>
                <ImageIcon size={16} color={t.primary} />
                <Text style={[typography.labelMd, { color: t.primary }]}>Comparar evolução</Text>
              </Pressable>
            </View>
          )
        )}

        {!compareMode && (<>
        {/* Category selector */}
        <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.sm, marginBottom: space.lg }}>
          <SectionLabel text="CATEGORIA" />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setSelectedCategory(cat.value)}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
                accessibilityState={{ selected: selectedCategory === cat.value }}
                style={{
                  flex: 1,
                  paddingVertical: space.sm + 2,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  ...(selectedCategory === cat.value
                    ? { backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primary }
                    : { backgroundColor: t.surface, ...shadows.sm }),
                }}
              >
                <Text style={[typography.captionBold, { color: selectedCategory === cat.value ? t.primary : t.textSecondary }]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space['2xl'] }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Pressable
              onPress={handleTakePhoto}
              disabled={isUploading || !canWrite}
              accessibilityRole="button"
              accessibilityLabel="Tirar foto com a câmera"
              accessibilityState={{ disabled: isUploading || !canWrite, busy: isUploading }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: space.md + 2,
                borderRadius: radius.lg,
                backgroundColor: canWrite ? t.primary : t.borderLight,
                ...shadows.sm,
              }}
            >
              {isUploading ? (
                <ActivityIndicator color={t.primaryFg} size="small" />
              ) : (
                <>
                  <Camera size={18} color={canWrite ? t.primaryFg : t.textMuted} />
                  <Text style={[typography.labelMd, { color: canWrite ? t.primaryFg : t.textMuted, marginLeft: space.sm }]}>Tirar foto</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={handlePickPhoto}
              disabled={isUploading || !canWrite}
              accessibilityRole="button"
              accessibilityLabel="Escolher foto da galeria"
              accessibilityState={{ disabled: isUploading || !canWrite, busy: isUploading }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: space.md + 2,
                borderRadius: radius.lg,
                backgroundColor: t.surface,
                opacity: canWrite ? 1 : 0.5,
                ...shadows.sm,
              }}
            >
              <ImageIcon size={18} color={t.textSecondary} />
              <Text style={[typography.labelMd, { color: t.text, marginLeft: space.sm }]}>Galeria</Text>
            </Pressable>
          </View>
        </Animated.View>
        </>)}

        {/* Photos grid by date */}
        {isLoading ? (
          <View style={{ marginTop: space.lg, gap: space.md }}>
            {[0, 1].map((row) => (
              <View key={row} style={{ flexDirection: 'row', gap: space.md }}>
                <SkeletonBlock width="48%" height={180} borderRadius={radius.lg} />
                <SkeletonBlock width="48%" height={180} borderRadius={radius.lg} />
              </View>
            ))}
          </View>
        ) : isError ? (
          <View style={{ marginTop: space['4xl'] }}>
            <ErrorState onRetry={() => refetch()} />
          </View>
        ) : photos.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={32} color={t.primary} />}
            title="Nenhuma foto registrada"
            description={`Tire fotos periodicamente para acompanhar\nsua evolução visual.`}
          />
        ) : (
          sortedDates.map((date, dateIdx) => {
            const datePhotos = groupedByDate[date]
            const fmtDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })
            return (
              <Animated.View
                key={date}
                entering={FadeInDown.duration(300).delay(dateIdx * 80)}
                style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.xl }}
              >
                <SectionLabel text={fmtDate.toUpperCase()} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  {datePhotos.map((photo) => (
                    <Pressable
                      key={photo.id}
                      onPress={() => (compareMode ? toggleCompare(photo) : setViewerPhoto(photo))}
                      accessibilityRole="button"
                      accessibilityLabel={compareMode
                        ? `Foto de ${CATEGORIES.find((c) => c.value === photo.category)?.label ?? photo.category}, ${compareIds.includes(photo.id) ? 'selecionada' : 'não selecionada'}. Toque para comparar.`
                        : `Ver foto de ${CATEGORIES.find((c) => c.value === photo.category)?.label ?? photo.category}`}
                      style={{
                        borderRadius: radius.xl,
                        overflow: 'hidden',
                        width: PHOTO_SIZE,
                        height: PHOTO_SIZE * 1.33,
                        ...shadows.sm,
                      }}
                    >
                      <Image
                        source={{ uri: `${API_BASE}/p/${accessCode}/progress-photos/${photo.id}` }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      <ExpoGradient
                        colors={['transparent', 'rgba(0,0,0,0.55)']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: space.sm + 2, paddingVertical: space.sm }}
                      >
                        <Text style={[typography.captionBold, { color: '#fff', fontSize: 10 }]}>
                          {CATEGORIES.find((c) => c.value === photo.category)?.label ?? photo.category}
                        </Text>
                      </ExpoGradient>
                      {compareMode && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.xl, borderWidth: compareIds.includes(photo.id) ? 3 : 0, borderColor: t.primary, backgroundColor: compareIds.includes(photo.id) ? 'transparent' : 'rgba(0,0,0,0.28)' }}>
                          {compareIds.includes(photo.id) && (
                            <View style={{ position: 'absolute', top: space.xs, right: space.xs, width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: t.primaryFg, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{compareIds.indexOf(photo.id) + 1}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )
          })
        )}
      </ScrollView>

      {/* ── Fullscreen Photo Viewer ── */}
      <Modal visible={viewerPhoto !== null} transparent animationType="fade" onRequestClose={() => setViewerPhoto(null)}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Top bar */}
          <SafeAreaView edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingTop: space.sm, paddingBottom: space.md }}>
              <Pressable onPress={() => setViewerPhoto(null)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Fechar" style={{ padding: space.sm }}>
                <X size={22} color="#fff" />
              </Pressable>
              <View style={{ alignItems: 'center', flex: 1 }}>
                {viewerPhoto && (
                  <>
                    <Text style={[typography.labelMd, { color: '#fff' }]}>
                      {CATEGORIES.find((c) => c.value === viewerPhoto.category)?.label ?? viewerPhoto.category}
                    </Text>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]}>
                      {new Date(viewerPhoto.photo_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Text>
                  </>
                )}
              </View>
              <Pressable
                onPress={() => {
                  if (!canWrite) return
                  if (!viewerPhoto) return
                  confirm({
                    title: 'Excluir foto',
                    message: 'Deseja excluir esta foto de progresso?',
                    cancelLabel: 'Cancelar',
                    confirmLabel: 'Excluir',
                    destructive: true,
                    onConfirm: async () => {
                      try {
                        await deletePhoto(viewerPhoto.id)
                        haptics.success()
                        setViewerPhoto(null)
                      } catch {
                        toast.error('Não foi possível excluir a foto.')
                      }
                    },
                  })
                }}
                hitSlop={16}
                disabled={!canWrite}
                accessibilityRole="button"
                accessibilityLabel="Excluir foto"
                style={{ padding: space.sm, opacity: canWrite ? 1 : 0.35 }}
              >
                <Trash2 size={20} color="#ef4444" />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Photo */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {viewerPhoto && (
              <Image
                source={{ uri: `${API_BASE}/p/${accessCode}/progress-photos/${viewerPhoto.id}` }}
                style={{ width: SCREEN_W, height: SCREEN_W * 1.33 }}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Compare modal (antes/depois) ── */}
      <Modal visible={compareOpen} transparent animationType="fade" onRequestClose={() => setCompareOpen(false)}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <SafeAreaView edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingTop: space.sm, paddingBottom: space.md }}>
              <Pressable onPress={() => setCompareOpen(false)} hitSlop={16} accessibilityRole="button" accessibilityLabel="Fechar" style={{ padding: space.sm }}>
                <X size={22} color="#fff" />
              </Pressable>
              <Text style={[typography.labelMd, { color: '#fff' }]}>Comparar evolução</Text>
              <View style={{ width: 38 }} />
            </View>
          </SafeAreaView>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {comparePair.map((photo, i) => (
              <View key={photo.id} style={{ flex: 1, borderLeftWidth: i === 1 ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.15)' }}>
                <View style={{ alignItems: 'center', paddingVertical: space.sm }}>
                  <Text style={[typography.captionBold, { color: t.primary }]}>{i === 0 ? 'ANTES' : 'DEPOIS'}</Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                    {new Date(photo.photo_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </Text>
                </View>
                <Image source={{ uri: `${API_BASE}/p/${accessCode}/progress-photos/${photo.id}` }} style={{ flex: 1, width: '100%' }} contentFit="contain" />
              </View>
            ))}
          </View>
          {compareGapDays > 0 && (
            <SafeAreaView edges={['bottom']}>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingVertical: space.sm }]}>
                {compareGapDays} {compareGapDays === 1 ? 'dia' : 'dias'} entre as fotos
              </Text>
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}
