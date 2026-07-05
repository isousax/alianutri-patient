import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react-native'
import { haptics } from '../src/lib/haptics'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'
import { useQueryClient } from '@tanstack/react-query'
import { useThemeColors, type ThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useChatMessages, useSendChatMessage, usePortalHome } from '../src/hooks/usePortal'
import type { ChatMessage } from '../src/types/portal'
import { SkeletonChatList } from '../src/components/Skeleton'
import { ScreenHeader, EmptyState, ErrorState, KeyboardAvoidingWrapper } from '../src/components/ui'
import { ReadOnlyBanner } from '../src/components/ui/ReadOnlyBanner'
import { radius, space, typography, SCREEN_PADDING, shadows } from '../src/theme/tokens'

// ── helpers ──

function ensureUTC(iso: string): Date {
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
}

function fmtTime(iso: string): string {
  try {
    return ensureUTC(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function toDateKey(iso: string): string {
  const d = ensureUTC(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDateLabel(dateKey: string): string {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  if (dateKey === todayKey) return 'Hoje'

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  if (dateKey === yKey) return 'Ontem'

  const d = new Date(dateKey + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── types ──

type ChatListItem =
  | { type: 'separator'; dateKey: string }
  | { type: 'message'; msg: ChatMessage }

function buildChatList(messages: ChatMessage[]): ChatListItem[] {
  const items: ChatListItem[] = []
  let lastDateKey = ''

  for (const msg of messages) {
    const dk = toDateKey(msg.created_at)
    if (dk !== lastDateKey) {
      items.push({ type: 'separator', dateKey: dk })
      lastDateKey = dk
    }
    items.push({ type: 'message', msg })
  }
  return items
}

function chatItemKey(item: ChatListItem): string {
  return item.type === 'separator' ? `sep-${item.dateKey}` : item.msg.id
}

// ── screen ──

export default function ChatScreen() {
  const t = useThemeColors()
  const insets = useSafeAreaInsets()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const { data: homeData } = usePortalHome()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useChatMessages()
  const send = useSendChatMessage()

  // Clear unread badge: GET /chat marks messages as read on the server (awaited).
  // Invalidate /home after data loads (badge clears) + on unmount (safety net).
  const pageCount = data?.pages?.length ?? 0
  useEffect(() => {
    if (pageCount > 0) qc.invalidateQueries({ queryKey: ['portal', 'home'] })
    return () => { qc.invalidateQueries({ queryKey: ['portal', 'home'] }) }
  }, [pageCount, qc])

  const nutriName = homeData?.nutritionist?.name ?? 'Nutricionista'

  // All messages flattened and reversed to chronological order
  const allMessages: ChatMessage[] = useMemo(
    () => data?.pages.flatMap((p) => p.messages).reverse() ?? [],
    [data],
  )

  // Build mixed list with date separators
  const chatList: ChatListItem[] = useMemo(() => buildChatList(allMessages), [allMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatList.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [chatList.length])

  const handleSend = useCallback(async () => {
    if (!canWrite) return
    const content = text.trim()
    if (!content || send.isPending) return
    setText('')
    haptics.light()
    await send.mutateAsync(content)
  }, [text, send, canWrite])

  const renderItem = useCallback(({ item }: { item: ChatListItem }) => {
    if (item.type === 'separator') {
      return <DateSeparator label={fmtDateLabel(item.dateKey)} t={t} />
    }
    return <MessageBubble msg={item.msg} t={t} />
  }, [t])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingWrapper offset={insets.bottom}>
        <ScreenHeader
          title="Chat"
          subtitle={`com ${nutriName}`}
          rightAction={
            <View style={{
              width: 36, height: 36,
              borderRadius: 18,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: t.primaryLight,
            }}>
              <Text style={[typography.captionBold, { color: t.primary }]}>
                {nutriName.charAt(0).toUpperCase()}
              </Text>
            </View>
          }
        />

        {!canWrite && <ReadOnlyBanner />}

        {/* Messages */}
        {isLoading ? (
          <SkeletonChatList />
        ) : isError && allMessages.length === 0 ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={chatList}
            keyExtractor={chatItemKey}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
            ListHeaderComponent={
              hasNextPage ? (
                <Pressable
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  accessibilityRole="button"
                  accessibilityLabel="Carregar mensagens anteriores"
                  style={{ alignItems: 'center', paddingVertical: space.md }}
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={t.primary} />
                  ) : (
                    <Text style={[typography.captionBold, { color: t.primary }]}>
                      Carregar anteriores
                    </Text>
                  )}
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon={<MessageCircle size={28} color={t.primary} />}
                title="Nenhuma mensagem"
                description={`Envie a primeira mensagem para ${nutriName}.`}
              />
            }
          />
        )}

        {/* Input */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: space.sm,
          paddingHorizontal: SCREEN_PADDING,
          paddingVertical: space.md,
          borderTopWidth: 1,
          borderTopColor: t.borderLight,
        }}>
          <TextInput
            value={text}
            onChangeText={setText}
            editable={canWrite}
            accessibilityLabel="Campo de mensagem"
            placeholder="Digite sua mensagem..."
            placeholderTextColor={t.textMuted}
            multiline
            style={[
              typography.bodyMd,
              {
                flex: 1,
                maxHeight: 96,
                borderRadius: radius.lg,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border,
                color: t.text,
              },
            ]}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || send.isPending || !canWrite}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !text.trim() || send.isPending || !canWrite }}
            style={{
              padding: space.sm + 2,
              borderRadius: radius.lg,
              backgroundColor: text.trim() && !send.isPending && canWrite ? t.primary : t.borderLight,
            }}
          >
            {send.isPending ? (
              <ActivityIndicator size="small" color={t.primaryFg} />
            ) : (
              <Send size={18} color={text.trim() && canWrite ? t.primaryFg : t.textMuted} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  )
}

// ── Date separator ──

function DateSeparator({ label, t }: { label: string; t: ThemeColors }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ alignItems: 'center', marginVertical: space.md }}>
      <View style={{
        paddingHorizontal: space.md,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: t.surface,
      }}>
        <Text style={[typography.captionBold, { color: t.textMuted }]}>
          {label}
        </Text>
      </View>
    </Animated.View>
  )
}

// ── Message bubble ──

function MessageBubble({ msg, t }: { msg: ChatMessage; t: ThemeColors }) {
  const isPatient = msg.sender_type === 'patient'
  const a11yLabel = `${isPatient ? 'Você' : 'Nutricionista'}: ${msg.content}. ${fmtTime(msg.created_at)}${isPatient ? (msg.read_at ? '. Lida' : '. Enviada') : ''}`

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={{
        marginBottom: space.sm,
        paddingHorizontal: SCREEN_PADDING,
        alignItems: isPatient ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        accessible
        accessibilityLabel={a11yLabel}
        style={{
          maxWidth: '80%',
          borderRadius: radius.xl,
          paddingHorizontal: space.md + 2,
          paddingVertical: space.sm + 2,
          ...shadows.sm,
          ...(isPatient
            ? { backgroundColor: t.primary, borderBottomRightRadius: 6 }
            : { backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight, borderBottomLeftRadius: 6 }),
        }}
      >
        <Text style={[typography.bodyMd, { color: isPatient ? t.primaryFg : t.text }]}>
          {msg.content}
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          gap: 4,
          justifyContent: isPatient ? 'flex-end' : 'flex-start',
        }}>
          <Text style={[typography.caption, { color: isPatient ? t.primaryMuted : t.textMuted, fontSize: 10 }]}>
            {fmtTime(msg.created_at)}
          </Text>
          {isPatient && (
            msg.read_at
              ? <CheckCheck size={12} color={t.primaryMuted} />
              : <Check size={12} color={t.primaryMuted} />
          )}
        </View>
      </View>
    </Animated.View>
  )
}
