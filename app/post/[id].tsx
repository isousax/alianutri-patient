import { useCallback } from 'react'
import { ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Trash2, FileText } from 'lucide-react-native'
import { haptics } from '../../src/lib/haptics'
import { useThemeColors } from '../../src/stores/theme'
import { useFeaturesStore } from '../../src/stores/features'
import { confirm } from '../../src/stores/confirm'
import { toast } from '../../src/stores/toast'
import { usePostDetail, useDeletePost, usePortalHome } from '../../src/hooks/usePortal'
import { ScreenHeader, SkeletonList, EmptyState, ErrorState } from '../../src/components/ui'
import { PostCard } from '../../src/components/feed/PostCard'
import { space } from '../../src/theme/tokens'

export default function PostDetailScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: post, isLoading, isError, refetch } = usePostDetail(id ?? null)
  const del = useDeletePost()
  const { data: home } = usePortalHome()

  const handleDelete = useCallback(() => {
    if (!post) return
    confirm({
      title: 'Excluir postagem',
      message: 'Tem certeza? Esta ação não pode ser desfeita.',
      cancelLabel: 'Cancelar',
      confirmLabel: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        try {
          await del.mutateAsync(post.id)
          haptics.success()
          router.back()
        } catch {
          toast.error('Não foi possível excluir a postagem.')
        }
      },
    })
  }, [post, del])

  const rightAction = post && canWrite ? (
    <Pressable
      onPress={handleDelete}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Excluir postagem"
      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
    >
      <Trash2 size={18} color={t.error} />
    </Pressable>
  ) : undefined

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Postagem" rightAction={rightAction} />
      {isLoading && !post ? (
        <SkeletonList count={1} />
      ) : isError && !post ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !post ? (
        <EmptyState
          icon={<FileText size={28} color={t.primary} />}
          title="Postagem não encontrada"
          description="Ela pode ter sido removida."
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: space.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <PostCard post={post} nutriName={home?.nutritionist?.name ?? 'Seu nutricionista'} nutriPhoto={home?.nutritionist?.photo_url ?? null} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
