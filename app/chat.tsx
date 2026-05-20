import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Send, MessageCircle, Check, CheckCheck } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'
import { useThemeColors, type ThemeColors } from '../src/stores/theme'
import { useChatMessages, useSendChatMessage, usePortalHome } from '../src/hooks/usePortal'
import type { ChatMessage } from '../src/types/portal'
import { SkeletonChatList } from '../src/components/Skeleton'

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
  const [text, setText] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const { data: homeData } = usePortalHome()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useChatMessages()
  const send = useSendChatMessage()

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
    const content = text.trim()
    if (!content || send.isPending) return
    setText('')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await send.mutateAsync(content)
  }, [text, send])

  const renderItem = useCallback(({ item }: { item: ChatListItem }) => {
    if (item.type === 'separator') {
      return <DateSeparator label={fmtDateLabel(item.dateKey)} t={t} />
    }
    return <MessageBubble msg={item.msg} t={t} />
  }, [t])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={20} color={t.textSecondary} />
          </Pressable>
          <View className="flex-1">
            <Text style={{ color: t.text }} className="text-xl font-sans-bold">Chat</Text>
            <Text style={{ color: t.textMuted }} className="text-xs font-sans">
              com {nutriName}
            </Text>
          </View>
          <View
            className="h-9 w-9 rounded-full items-center justify-center"
            style={{ backgroundColor: t.primaryLight }}
          >
            <Text style={{ color: t.primary }} className="text-xs font-sans-bold">
              {nutriName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Messages */}
        {isLoading ? (
          <SkeletonChatList />
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatList}
            keyExtractor={chatItemKey}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
            ListHeaderComponent={
              hasNextPage ? (
                <Pressable
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="items-center py-3"
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={t.primary} />
                  ) : (
                    <Text style={{ color: t.primary }} className="text-xs font-sans-semibold">
                      Carregar anteriores
                    </Text>
                  )}
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8">
                <View
                  className="h-16 w-16 rounded-2xl items-center justify-center mb-4"
                  style={{ backgroundColor: t.primaryLight }}
                >
                  <MessageCircle size={28} color={t.primary} />
                </View>
                <Text style={{ color: t.text }} className="text-base font-sans-semibold mb-1">
                  Nenhuma mensagem
                </Text>
                <Text style={{ color: t.textMuted }} className="text-sm font-sans text-center">
                  Envie a primeira mensagem para {nutriName}.
                </Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View
          className="px-5 py-3 flex-row items-end gap-2"
          style={{ borderTopWidth: 1, borderTopColor: t.borderLight }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={t.textMuted}
            multiline
            className="flex-1 rounded-xl px-3 py-2 text-sm font-sans max-h-24"
            style={{
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
              color: t.text,
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || send.isPending}
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: text.trim() && !send.isPending ? t.primary : t.borderLight,
            }}
          >
            {send.isPending ? (
              <ActivityIndicator size="small" color={t.primaryText} />
            ) : (
              <Send size={18} color={text.trim() ? t.primaryText : t.textMuted} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Date separator ──

function DateSeparator({ label, t }: { label: string; t: ThemeColors }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} className="items-center my-3">
      <View
        className="px-3 py-1 rounded-full"
        style={{ backgroundColor: t.surface }}
      >
        <Text style={{ color: t.textMuted }} className="text-[11px] font-sans-semibold">
          {label}
        </Text>
      </View>
    </Animated.View>
  )
}

// ── Message bubble ──

function MessageBubble({ msg, t }: { msg: ChatMessage; t: ThemeColors }) {
  const isPatient = msg.sender_type === 'patient'

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      className={`mb-2 px-5 ${isPatient ? 'items-end' : 'items-start'}`}
    >
      <View
        style={
          isPatient
            ? { backgroundColor: t.primary, borderBottomRightRadius: 6 }
            : { backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight, borderBottomLeftRadius: 6 }
        }
        className="max-w-[80%] rounded-2xl px-3.5 py-2.5"
      >
        <Text
          style={{ color: isPatient ? t.primaryText : t.text }}
          className="text-sm font-sans"
        >
          {msg.content}
        </Text>
        <View className={`flex-row items-center mt-1 gap-1 ${isPatient ? 'justify-end' : ''}`}>
          <Text
            style={{ color: isPatient ? t.primaryMuted : t.textMuted }}
            className="text-[10px] font-sans"
          >
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
