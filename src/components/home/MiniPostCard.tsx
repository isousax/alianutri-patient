import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Utensils, Dumbbell, Smile, Pencil } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import { typography, space, radius } from '../../theme/tokens'
import { diaryPhotoUrl } from '../../lib/diaryPhoto'
import type { DiaryPost, DiaryPostType } from '../../types/portal'

const ICON: Record<DiaryPostType, typeof Utensils> = {
  meal: Utensils,
  exercise: Dumbbell,
  mood: Smile,
  free: Pencil,
}
const FALLBACK: Record<DiaryPostType, string> = {
  meal: 'Refeição',
  exercise: 'Exercício',
  mood: 'Humor',
  free: 'Post',
}

/** Card compacto (preview) de um post do diário — usado na Home. */
export function MiniPostCard({ post, onPress }: { post: DiaryPost; onPress: () => void }) {
  const t = useThemeColors()
  const accessCode = useAuthStore((s) => s.accessCode)
  const Icon = ICON[post.type]
  const ai = post.ai_analysis
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ver post do diário"
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}
    >
      {post.has_photo ? (
        <Image
          source={{ uri: post._local && post._localPhotoUri ? post._localPhotoUri : diaryPhotoUrl(accessCode, post.id, 'thumb') }}
          style={{ width: 56, height: 56, borderRadius: radius.md }}
          contentFit="cover"
        />
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: t.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={t.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodySm, { color: t.text }]} numberOfLines={1}>
          {post.emoji ? `${post.emoji} ` : ''}
          {post.caption || FALLBACK[post.type]}
        </Text>
        {post.type === 'meal' && post.ai_status === 'completed' && ai ? (
          <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}>~{Math.round(ai.calories ?? 0)} kcal</Text>
        ) : post.ai_status === 'pending' ? (
          <Text style={[typography.caption, { color: t.primary, marginTop: 1 }]}>Analisando…</Text>
        ) : null}
      </View>
    </Pressable>
  )
}
