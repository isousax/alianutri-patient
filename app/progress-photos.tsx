import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Dimensions, Modal, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Camera, Image as ImageIcon, Sparkles, Trash2, X,
} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient'
import { useThemeColors } from '../src/stores/theme'
import { useProgressPhotos, useUploadProgressPhoto, useDeleteProgressPhoto } from '../src/hooks/usePortal'
import type { ProgressPhoto } from '../src/types/portal'
import { useAuthStore } from '../src/stores/auth'
import { ScreenHeader, EmptyState, SectionLabel, SkeletonBlock } from '../src/components/ui'
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
  const accessCode = useAuthStore((s) => s.accessCode)
  const { data, isLoading } = useProgressPhotos()
  const { mutateAsync: upload, isPending: isUploading } = useUploadProgressPhoto()
  const { mutateAsync: deletePhoto } = useDeleteProgressPhoto()
  const [selectedCategory, setSelectedCategory] = useState('front')
  const [viewerPhoto, setViewerPhoto] = useState<ProgressPhoto | null>(null)

  const photos: ProgressPhoto[] = data?.photos ?? []

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às fotos.')
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await upload({
        uri: result.assets[0].uri,
        category: selectedCategory,
      })
      Alert.alert('Foto salva!', 'Sua foto de progresso foi registrada.')
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a foto.')
    }
  }, [upload, selectedCategory])

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    })

    if (result.canceled || !result.assets?.[0]) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await upload({
        uri: result.assets[0].uri,
        category: selectedCategory,
      })
      Alert.alert('Foto salva!', 'Sua foto de progresso foi registrada.')
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a foto.')
    }
  }, [upload, selectedCategory])

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
        {/* Category selector */}
        <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.sm, marginBottom: space.lg }}>
          <SectionLabel text="CATEGORIA" />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setSelectedCategory(cat.value)}
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
              disabled={isUploading}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: space.md + 2,
                borderRadius: radius.lg,
                backgroundColor: t.primary,
                ...shadows.sm,
              }}
            >
              {isUploading ? (
                <ActivityIndicator color={t.primaryFg} size="small" />
              ) : (
                <>
                  <Camera size={18} color={t.primaryFg} />
                  <Text style={[typography.labelMd, { color: t.primaryFg, marginLeft: space.sm }]}>Tirar foto</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={handlePickPhoto}
              disabled={isUploading}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: space.md + 2,
                borderRadius: radius.lg,
                backgroundColor: t.surface,
                ...shadows.sm,
              }}
            >
              <ImageIcon size={18} color={t.textSecondary} />
              <Text style={[typography.labelMd, { color: t.text, marginLeft: space.sm }]}>Galeria</Text>
            </Pressable>
          </View>
        </Animated.View>

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
                      onPress={() => setViewerPhoto(photo)}
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
              <Pressable onPress={() => setViewerPhoto(null)} hitSlop={16} style={{ padding: space.sm }}>
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
                  if (!viewerPhoto) return
                  Alert.alert('Excluir foto', 'Deseja excluir esta foto de progresso?', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Excluir', style: 'destructive', onPress: async () => {
                        try {
                          await deletePhoto(viewerPhoto.id)
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                          setViewerPhoto(null)
                        } catch {
                          Alert.alert('Erro', 'Não foi possível excluir a foto.')
                        }
                      },
                    },
                  ])
                }}
                hitSlop={16}
                style={{ padding: space.sm }}
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
    </SafeAreaView>
  )
}
