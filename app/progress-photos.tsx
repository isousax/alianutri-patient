import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Dimensions, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Camera, ChevronLeft, Image as ImageIcon, Sparkles,
} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient'
import { useThemeColors } from '../src/stores/theme'
import { useProgressPhotos, useUploadProgressPhoto } from '../src/hooks/usePortal'
import { useAuthStore } from '../src/stores/auth'

const SCREEN_W = Dimensions.get('window').width
const PHOTO_SIZE = (SCREEN_W - 40 - 8) / 2
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.alianutri.com.br'

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

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
  const [selectedCategory, setSelectedCategory] = useState('front')

  const photos = data?.photos ?? []

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
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <View className="h-8 w-8 rounded-xl items-center justify-center" style={{ backgroundColor: t.primary + '15' }}>
          <Camera size={16} color={t.primary} />
        </View>
        <Text style={{ color: t.text }} className="text-xl font-sans-bold flex-1">Fotos de Progresso</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Category selector */}
        <Animated.View entering={FadeIn.duration(300)} className="px-5 mt-2 mb-4">
          <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase tracking-widest mb-2 ml-1">
            Categoria
          </Text>
          <View className="flex-row gap-2">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setSelectedCategory(cat.value)}
                className="flex-1 py-2.5 rounded-xl items-center"
                style={
                  selectedCategory === cat.value
                    ? { backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primary }
                    : { backgroundColor: t.surface, ...SHADOW_SM }
                }
              >
                <Text
                  style={{ color: selectedCategory === cat.value ? t.primary : t.textSecondary }}
                  className="text-xs font-sans-bold"
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)} className="px-5 mb-6">
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleTakePhoto}
              disabled={isUploading}
              className="flex-1 flex-row items-center justify-center py-3.5 rounded-xl"
              style={{ backgroundColor: t.primary, ...SHADOW_SM }}
            >
              {isUploading ? (
                <ActivityIndicator color={t.primaryText} size="small" />
              ) : (
                <>
                  <Camera size={18} color={t.primaryText} />
                  <Text style={{ color: t.primaryText }} className="text-sm font-sans-bold ml-2">Tirar foto</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={handlePickPhoto}
              disabled={isUploading}
              className="flex-1 flex-row items-center justify-center py-3.5 rounded-xl"
              style={{ backgroundColor: t.surface, ...SHADOW_SM }}
            >
              <ImageIcon size={18} color={t.textSecondary} />
              <Text style={{ color: t.text }} className="text-sm font-sans-semibold ml-2">Galeria</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Photos grid by date */}
        {isLoading ? (
          <View className="items-center mt-8">
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : photos.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} className="items-center mt-12 px-8">
            <View className="h-20 w-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: t.primaryLight }}>
              <Sparkles size={32} color={t.primary} />
            </View>
            <Text style={{ color: t.text }} className="text-base font-sans-bold mt-1 text-center">
              Nenhuma foto registrada
            </Text>
            <Text style={{ color: t.textMuted }} className="text-sm font-sans text-center mt-2 leading-5">
              Tire fotos periodicamente para acompanhar{'\n'}sua evolução visual.
            </Text>
          </Animated.View>
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
                className="px-5 mb-5"
              >
                <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase tracking-widest mb-2 ml-1">
                  {fmtDate}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {datePhotos.map((photo) => (
                    <View
                      key={photo.id}
                      className="rounded-2xl overflow-hidden"
                      style={{ width: PHOTO_SIZE, height: PHOTO_SIZE * 1.33, ...SHADOW_SM }}
                    >
                      <Image
                        source={{ uri: `${API_BASE}/p/${accessCode}/progress-photos/${photo.id}` }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      <ExpoGradient
                        colors={['transparent', 'rgba(0,0,0,0.55)']}
                        className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
                      >
                        <Text className="text-[10px] font-sans-bold" style={{ color: '#fff' }}>
                          {CATEGORIES.find((c) => c.value === photo.category)?.label ?? photo.category}
                        </Text>
                      </ExpoGradient>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
