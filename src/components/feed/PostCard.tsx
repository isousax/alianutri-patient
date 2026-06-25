import { View, Text, ActivityIndicator, Pressable, Alert } from 'react-native'
import { Image } from 'expo-image'
import { Utensils, Dumbbell, Smile, Pencil, Sparkles, MessageCircle, CloudOff } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import { useUpdatePostType } from '../../hooks/usePortal'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { Card, MacrosBar, AuroraBackground } from '../ui'
import { diaryPhotoUrl } from '../../lib/diaryPhoto'
import type { DiaryPost, DiaryPostType } from '../../types/portal'

const TYPE_META: Record<DiaryPostType, { Icon: typeof Utensils; label: string }> = {
  meal: { Icon: Utensils, label: 'Refeição' },
  exercise: { Icon: Dumbbell, label: 'Exercício' },
  mood: { Icon: Smile, label: 'Humor' },
  free: { Icon: Pencil, label: 'Post' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

function ConfidenceDots({ level }: { level: 'high' | 'medium' | 'low' }) {
  const t = useThemeColors()
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i < filled ? t.primary : t.borderLight }} />
      ))}
    </View>
  )
}

export function PostCard({ post }: { post: DiaryPost }) {
  const t = useThemeColors()
  const accessCode = useAuthStore((s) => s.accessCode)
  const updateType = useUpdatePostType()
  const meta = TYPE_META[post.type]
  const TypeIcon = meta.Icon
  const ai = post.ai_analysis
  const isLocal = !!post._local
  const photoUri = post.has_photo
    ? isLocal && post._localPhotoUri
      ? post._localPhotoUri
      : diaryPhotoUrl(accessCode, post.id, 'medium')
    : null
  const notFood = post.ai_status === 'not_food'

  const handleConvert = () => {
    Alert.alert('Converter post', 'Transformar em post livre? A análise de macros será removida.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Converter', onPress: () => updateType.mutate({ postId: post.id, type: 'free' }) },
    ])
  }

  return (
    <Card style={{ marginHorizontal: SCREEN_PADDING, marginBottom: space.lg }} padded={false}>
      {/* Header: tipo + tempo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg, paddingBottom: space.sm }}>
        <View style={{ width: 28, height: 28, borderRadius: radius.sm, backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
          <TypeIcon size={14} color={t.primary} />
        </View>
        <Text style={[typography.labelMd, { color: t.text, marginLeft: space.sm, flex: 1 }]}>{meta.label}</Text>
        <Text style={[typography.caption, { color: t.textMuted }]}>{isLocal ? 'Enviando…' : timeAgo(post.created_at)}</Text>
      </View>

      {/* Pendente (offline/enviando) */}
      {isLocal && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <CloudOff size={13} color={t.textMuted} />
          <Text style={[typography.caption, { color: t.textMuted }]}>Pendente — será enviado quando reconectar</Text>
        </View>
      )}

      {/* Foto */}
      {photoUri && (
        <Image source={{ uri: photoUri }} style={{ width: '100%', height: 300 }} contentFit="cover" transition={200} />
      )}

      {/* Análise de IA (só refeição já sincronizada) */}
      {post.type === 'meal' && !isLocal && (
        <View style={{ padding: space.lg, paddingBottom: ai && post.ai_status === 'completed' ? space.lg : space.md }}>
          {post.ai_status === 'pending' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <ActivityIndicator size="small" color={t.primary} />
              <Text style={[typography.bodySm, { color: t.textSecondary }]}>Analisando com IA…</Text>
            </View>
          )}
          {post.ai_status === 'completed' && ai && (
            <AuroraBackground variant="subtle" style={{ borderRadius: radius.lg, padding: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color={t.primary} />
                  <Text style={[typography.labelMd, { color: t.text }]}>~{Math.round(ai.calories ?? 0)} kcal</Text>
                </View>
                {ai.confidence && <ConfidenceDots level={ai.confidence} />}
              </View>
              <MacrosBar protein_g={ai.protein_g ?? 0} carbs_g={ai.carbs_g ?? 0} fat_g={ai.fat_g ?? 0} />
              {ai.meal_name ? (
                <Text style={[typography.caption, { color: t.textMuted, marginTop: space.sm }]} numberOfLines={2}>
                  {ai.meal_name}
                </Text>
              ) : null}
            </AuroraBackground>
          )}
          {post.ai_status === 'failed' && (
            <Text style={[typography.caption, { color: t.textMuted }]}>Análise indisponível no momento.</Text>
          )}
          {post.ai_status === 'skipped' && post.ai_error === 'QUOTA_EXCEEDED' && (
            <Text style={[typography.caption, { color: t.textMuted }]}>Limite diário de análises por IA atingido.</Text>
          )}
          {notFood && (
            <View>
              <Text style={[typography.caption, { color: t.textMuted }]}>Não identificamos um alimento nesta foto.</Text>
              <Pressable
                onPress={handleConvert}
                disabled={updateType.isPending}
                accessibilityRole="button"
                accessibilityLabel="Converter para post livre"
                hitSlop={8}
                style={{ marginTop: space.xs }}
              >
                <Text style={[typography.labelSm, { color: t.primary }]}>
                  {updateType.isPending ? 'Convertendo…' : 'Converter para post livre'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Legenda */}
      {(post.caption || post.emoji) && (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: post.type === 'meal' && !isLocal ? 0 : space.sm }}>
          <Text style={[typography.bodyMd, { color: t.text }]}>
            {post.emoji ? `${post.emoji} ` : ''}
            {post.caption}
          </Text>
        </View>
      )}

      {/* Interações do nutri */}
      {(post.reactions.length > 0 || post.comments.length > 0) && (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.xs }}>
          {post.reactions.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 15 }}>{post.reactions.map((r) => r.emoji).join(' ')}</Text>
              <Text style={[typography.caption, { color: t.textSecondary }]}>seu nutricionista reagiu</Text>
            </View>
          )}
          {post.comments.map((cm) => (
            <View key={cm.id} style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              <MessageCircle size={13} color={t.primary} style={{ marginTop: 2 }} />
              <Text style={[typography.bodySm, { color: t.textSecondary, flex: 1 }]}>{cm.comment_text}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  )
}
