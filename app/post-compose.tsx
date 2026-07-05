import { useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { haptics } from '../src/lib/haptics'
import { Camera, Utensils, BookOpen, Sparkles, X, Images } from 'lucide-react-native'
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
  { id: 'diary', label: 'Diário', Icon: BookOpen },
]
// Diário = foto de um momento (sem IA). Refeição = foto do prato (com IA).
const HEADER_TITLE: Record<DiaryPostType, string> = {
  meal: 'Nova publicação',
  diary: 'Nova publicação',
}

export default function PostComposeScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const aiMealAnalysis = useFeaturesStore((s) => s.aiMealAnalysis)
  const { mutateAsync: createPost, isPending } = useCreatePost()
  const scrollRef = useRef<ScrollView>(null)
  const params = useLocalSearchParams<{ type?: string; meal_plan_id?: string; meal_index?: string; meal_name?: string }>()
  const validTypes: DiaryPostType[] = ['meal', 'diary']
  // Fase 5: quando vem da tela de Diário (anexar foto a uma refeição do plano), recebe o slot.
  const slotMealPlanId = typeof params.meal_plan_id === 'string' && params.meal_plan_id ? params.meal_plan_id : null
  const slotMealIndexNum = params.meal_index != null && params.meal_index !== '' ? Number(params.meal_index) : NaN
  const fromSlot = slotMealPlanId != null && Number.isInteger(slotMealIndexNum)
  const initialType: DiaryPostType = fromSlot
    ? 'meal'
    : validTypes.includes(params.type as DiaryPostType)
    ? (params.type as DiaryPostType)
    : 'meal'
  // Veio de um atalho do "+" (tipo explícito) ou de um slot do Diário → tela focada, sem abas de tipo.
  const typeLocked = fromSlot || validTypes.includes(params.type as DiaryPostType)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [type, setType] = useState<DiaryPostType>(initialType)
  const [caption, setCaption] = useState('')

  const pick = useCallback(async (mode: 'camera' | 'library') => {
    const perm = mode === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      toast.error(mode === 'camera' ? 'Precisamos de acesso à câmera.' : 'Precisamos de acesso às fotos.')
      return
    }
    // Sem crop (allowsEditing:false) — preserva a foto inteira; o peso é controlado por
    // compressão (qualidade ~0.6–0.7 nas variantes), não por recorte.
    const result = mode === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: false })
    const asset = result.canceled ? null : result.assets?.[0]
    if (asset) {
      setPhotoUri(asset.uri)
      haptics.light()
    }
  }, [])

  const choosePhoto = useCallback(() => {
    showActionSheet({
      title: 'Adicionar foto',
      options: [
        { label: 'Tirar foto', icon: <Camera size={20} color={t.primary} />, onPress: () => pick('camera') },
        { label: 'Escolher da galeria', icon: <Images size={20} color={t.primary} />, onPress: () => pick('library') },
      ],
    })
  }, [pick, t])

  // Todo post do diário é foto (texto puro saiu) — foto é obrigatória pra publicar.
  const canPublish = canWrite && !isPending && !!photoUri

  const handlePublish = useCallback(async () => {
    if (!canPublish) return
    try {
      await createPost({
        type,
        photoUri: photoUri ?? undefined,
        caption: caption.trim() || undefined,
        mealPlanId: fromSlot ? slotMealPlanId! : undefined,
        mealIndex: fromSlot ? slotMealIndexNum : undefined,
      })
      haptics.success()
      router.back()
    } catch (err) {
      console.error('[post-compose] Falha ao publicar:', err)
      const msg = err instanceof Error && err.message ? err.message : 'Não foi possível publicar. Tente novamente.'
      toast.error(msg)
    }
  }, [canPublish, createPost, type, photoUri, caption, fromSlot, slotMealPlanId, slotMealIndexNum])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <KeyboardAvoidingWrapper>
        <ScreenHeader title={HEADER_TITLE[type]} />
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: SCREEN_PADDING, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!canWrite && <ReadOnlyBanner />}

          {fromSlot && params.meal_name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
              <Utensils size={14} color={t.primary} />
              <Text style={[typography.bodySm, { color: t.textSecondary }]}>Refeição do plano: {params.meal_name}</Text>
            </View>
          ) : null}

          {/* Foto — obrigatória para todo post do diário */}
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

          {/* Tipo — só quando a intenção não veio definida (FAB genérico do Diário) */}
          {!typeLocked && (
          <>
          <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm }]}>TIPO</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
            {TYPES.map((ty) => {
              const active = type === ty.id
              const TIcon = ty.Icon
              return (
                <Pressable
                  key={ty.id}
                  onPress={() => { setType(ty.id); haptics.selection() }}
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
          </>
          )}

          {/* Legenda (opcional) */}
          <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm }]}>
            LEGENDA
          </Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            editable={canWrite}
            placeholder="Escreva uma legenda (opcional)"
            placeholderTextColor={t.textMuted}
            multiline
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
            style={[typography.bodyLg, { color: t.text, backgroundColor: t.surfaceSecondary, borderRadius: radius.lg, padding: space.lg, minHeight: 90, textAlignVertical: 'top', marginBottom: space.lg }]}
          />

          {/* Dica IA — mostra a cota diária de análise por IA (T-2) */}
          {type === 'meal' && photoUri && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
              <Sparkles size={14} color={aiMealAnalysis && aiMealAnalysis.used >= aiMealAnalysis.limit ? t.textMuted : t.primary} />
              <Text style={[typography.caption, { color: t.textSecondary, flex: 1 }]}>
                {aiMealAnalysis && aiMealAnalysis.used >= aiMealAnalysis.limit
                  ? 'Você já usou as análises por IA de hoje. A foto será salva; a análise volta amanhã.'
                  : aiMealAnalysis
                    ? `Vamos analisar os macros automaticamente após publicar. (restam ${aiMealAnalysis.limit - aiMealAnalysis.used} de ${aiMealAnalysis.limit} hoje)`
                    : 'Vamos analisar os macros automaticamente após publicar.'}
              </Text>
            </View>
          )}

          <Button label={isPending ? 'Publicando…' : 'Publicar'} onPress={handlePublish} disabled={!canPublish} loading={isPending} fullWidth />
        </ScrollView>
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  )
}
