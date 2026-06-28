import { useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Camera, Utensils, Dumbbell, Smile, Pencil, Sparkles, X } from 'lucide-react-native'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { toast } from '../src/stores/toast'
import { showActionSheet } from '../src/stores/actionSheet'
import { useCreatePost } from '../src/hooks/usePortal'
import { ScreenHeader, Button, ReadOnlyBanner, KeyboardAvoidingWrapper } from '../src/components/ui'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'
import type { DiaryPostType } from '../src/types/portal'

const TYPES: { id: DiaryPostType; label: string; Icon: typeof Utensils }[] = [
  { id: 'meal', label: 'Refeição', Icon: Utensils },
  { id: 'exercise', label: 'Exercício', Icon: Dumbbell },
  { id: 'mood', label: 'Humor', Icon: Smile },
  { id: 'free', label: 'Livre', Icon: Pencil },
]
const MOODS = ['😄', '🙂', '😐', '😕', '😣']

export default function PostComposeScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const { mutateAsync: createPost, isPending } = useCreatePost()
  const params = useLocalSearchParams<{ type?: string }>()
  const validTypes: DiaryPostType[] = ['meal', 'exercise', 'mood', 'free']
  const initialType: DiaryPostType = validTypes.includes(params.type as DiaryPostType)
    ? (params.type as DiaryPostType)
    : 'meal'
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [type, setType] = useState<DiaryPostType>(initialType)
  const [caption, setCaption] = useState('')
  const [mood, setMood] = useState<string | null>(null)

  const pick = useCallback(async (mode: 'camera' | 'library') => {
    const perm = mode === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      toast.error(mode === 'camera' ? 'Precisamos de acesso à câmera.' : 'Precisamos de acesso às fotos.')
      return
    }
    const result = mode === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true })
    const asset = result.canceled ? null : result.assets?.[0]
    if (asset) {
      setPhotoUri(asset.uri)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    }
  }, [])

  const choosePhoto = useCallback(() => {
    showActionSheet({
      title: 'Adicionar foto',
      options: [
        { label: 'Tirar foto', onPress: () => pick('camera') },
        { label: 'Escolher da galeria', onPress: () => pick('library') },
      ],
    })
  }, [pick])

  const canPublish = canWrite && !isPending && (!!photoUri || !!caption.trim() || (type === 'mood' && !!mood))

  const handlePublish = useCallback(async () => {
    if (!canPublish) return
    try {
      await createPost({
        type,
        photoUri: photoUri ?? undefined,
        caption: caption.trim() || undefined,
        emoji: type === 'mood' ? (mood ?? undefined) : undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      router.back()
    } catch {
      toast.error('Não foi possível publicar. Tente novamente.')
    }
  }, [canPublish, createPost, type, photoUri, caption, mood])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Nova postagem" />
      <KeyboardAvoidingWrapper>
        <ScrollView contentContainerStyle={{ padding: SCREEN_PADDING, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!canWrite && <ReadOnlyBanner />}

          {/* Foto */}
          <Pressable
            onPress={canWrite ? choosePhoto : undefined}
            accessibilityRole="button"
            accessibilityLabel="Adicionar foto"
            style={{ height: 240, borderRadius: radius.xl, backgroundColor: t.surfaceSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: space.lg }}
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <Pressable
                  onPress={() => setPhotoUri(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Remover foto"
                  hitSlop={10}
                  style={{ position: 'absolute', top: space.sm, right: space.sm, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#fff" />
                </Pressable>
              </>
            ) : (
              <View style={{ alignItems: 'center', gap: space.sm }}>
                <Camera size={28} color={t.textMuted} />
                <Text style={[typography.bodySm, { color: t.textMuted }]}>Toque para adicionar uma foto</Text>
              </View>
            )}
          </Pressable>

          {/* Tipo */}
          <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm }]}>TIPO</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
            {TYPES.map((ty) => {
              const active = type === ty.id
              const TIcon = ty.Icon
              return (
                <Pressable
                  key={ty.id}
                  onPress={() => { setType(ty.id); Haptics.selectionAsync().catch(() => {}) }}
                  disabled={!canWrite}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: active ? t.primary : t.surfaceSecondary }}
                >
                  <TIcon size={18} color={active ? t.primaryFg : t.textSecondary} />
                  <Text style={[typography.caption, { color: active ? t.primaryFg : t.textSecondary }]}>{ty.label}</Text>
                </Pressable>
              )
            })}
          </View>

          {/* Humor */}
          {type === 'mood' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.lg }}>
              {MOODS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => { setMood(m); Haptics.selectionAsync().catch(() => {}) }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mood === m }}
                  style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: mood === m ? t.primaryLight : t.surfaceSecondary, borderWidth: mood === m ? 2 : 0, borderColor: t.primary }}
                >
                  <Text style={{ fontSize: 26 }}>{m}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Legenda */}
          <TextInput
            value={caption}
            onChangeText={setCaption}
            editable={canWrite}
            placeholder={type === 'mood' ? 'Como você está se sentindo?' : 'Escreva uma legenda (opcional)'}
            placeholderTextColor={t.textMuted}
            multiline
            style={[typography.bodyLg, { color: t.text, backgroundColor: t.surfaceSecondary, borderRadius: radius.lg, padding: space.lg, minHeight: 90, textAlignVertical: 'top', marginBottom: space.lg }]}
          />

          {/* Dica IA */}
          {type === 'meal' && photoUri && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
              <Sparkles size={14} color={t.primary} />
              <Text style={[typography.caption, { color: t.textSecondary, flex: 1 }]}>
                Vamos analisar os macros automaticamente após publicar.
              </Text>
            </View>
          )}

          <Button label={isPending ? 'Publicando…' : 'Publicar'} onPress={handlePublish} disabled={!canPublish} loading={isPending} fullWidth />
        </ScrollView>
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  )
}
