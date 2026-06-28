import { useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { FadeIn } from 'react-native-reanimated'
import { MessageCircle, CalendarDays, ClipboardList, CalendarPlus, Video, MapPin } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'
import { usePortalHome, useChatUnreadCount, useQuestionnaires } from '../../src/hooks/usePortal'
import type { PortalHome, PortalQuestionnaire } from '../../src/types/portal'
import { Card, EmptyState, ListRow, Button, Avatar, SegmentedControl, SkeletonList } from '../../src/components/ui'
import { space, typography, radius, SCREEN_PADDING } from '../../src/theme/tokens'

type Seg = 'chat' | 'appointments' | 'questionnaires'

export default function NutriScreen() {
  const t = useThemeColors()
  const [seg, setSeg] = useState<Seg>('chat')
  const { data: home, isLoading, refetch, isRefetching } = usePortalHome()
  const { data: unread } = useChatUnreadCount()
  const { data: questionnaires } = useQuestionnaires()

  const pendingQuest = (questionnaires ?? []).filter((q) => q.status === 'sent')
  const chatUnread = unread?.unread ?? 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md }}>
        <Text style={[typography.displaySm, { color: t.text }]}>Nutri</Text>
        {home?.nutritionist?.name ? (
          <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>com {home.nutritionist.name}</Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
        <SegmentedControl
          options={[
            { key: 'chat', label: 'Conversa', badge: chatUnread },
            { key: 'appointments', label: 'Consultas' },
            { key: 'questionnaires', label: 'Questionários', badge: pendingQuest.length },
          ]}
          value={seg}
          onChange={(k) => setSeg(k as Seg)}
        />
      </View>

      {isLoading && !home ? (
        <SkeletonList count={3} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40, gap: space.md }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        >
          {seg === 'chat' && (
            <ChatSegment
              nutriName={home?.nutritionist?.name ?? null}
              nutriPhoto={home?.nutritionist?.photo_url ?? null}
              unread={chatUnread}
            />
          )}
          {seg === 'appointments' && <AppointmentsSegment next={home?.next_appointment ?? null} />}
          {seg === 'questionnaires' && (
            <QuestionnairesSegment pending={pendingQuest} total={(questionnaires ?? []).length} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function ChatSegment({
  nutriName,
  nutriPhoto,
  unread,
}: {
  nutriName: string | null
  nutriPhoto: string | null
  unread: number
}) {
  const t = useThemeColors()
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ gap: space.md }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={nutriName} uri={nutriPhoto} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.headingSm, { color: t.text }]}>{nutriName ?? 'Sua nutricionista'}</Text>
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>
              {unread > 0
                ? `${unread} ${unread === 1 ? 'mensagem nova' : 'mensagens novas'}`
                : 'Tire dúvidas e compartilhe como está indo'}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: space.lg }}>
          <Button
            label="Abrir conversa"
            leftIcon={<MessageCircle size={18} color={t.primaryFg} />}
            onPress={() => router.push('/chat')}
            fullWidth
          />
        </View>
      </Card>
    </Animated.View>
  )
}

function AppointmentsSegment({ next }: { next: PortalHome['next_appointment'] }) {
  const t = useThemeColors()

  if (!next) {
    return (
      <View style={{ minHeight: 340 }}>
        <EmptyState
          icon={<CalendarDays size={28} color={t.primary} />}
          title="Nenhuma consulta agendada"
          description="Quando você marcar uma consulta com sua nutricionista, ela aparece aqui."
          actionLabel="Agendar consulta"
          onAction={() => router.push('/booking')}
        />
      </View>
    )
  }

  const start = new Date(next.starts_at)
  const dateLabel = start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const timeLabel = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const isOnline = next.type === 'online'

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ gap: space.md }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.primaryLight,
            }}
          >
            {isOnline ? <Video size={16} color={t.primary} /> : <MapPin size={16} color={t.primary} />}
          </View>
          <Text style={[typography.labelMd, { color: t.primary }]}>
            {isOnline ? 'Próxima consulta · online' : 'Próxima consulta · presencial'}
          </Text>
        </View>
        <Text style={[typography.headingMd, { color: t.text, textTransform: 'capitalize' }]}>{dateLabel}</Text>
        <Text style={[typography.bodyMd, { color: t.textMuted, marginTop: 2 }]}>às {timeLabel}</Text>
      </Card>
      <Button
        label="Agendar nova consulta"
        variant="secondary"
        leftIcon={<CalendarPlus size={18} color={t.text} />}
        onPress={() => router.push('/booking')}
        fullWidth
      />
      <Text style={[typography.caption, { color: t.textMuted, textAlign: 'center', marginTop: space.xs }]}>
        O histórico completo de consultas chega em breve.
      </Text>
    </Animated.View>
  )
}

function QuestionnairesSegment({ pending, total }: { pending: PortalQuestionnaire[]; total: number }) {
  const t = useThemeColors()

  if (total === 0) {
    return (
      <View style={{ minHeight: 340 }}>
        <EmptyState
          icon={<ClipboardList size={28} color={t.primary} />}
          title="Sem questionários"
          description="Os questionários enviados pela sua nutricionista aparecerão aqui."
        />
      </View>
    )
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ gap: space.md }}>
      {pending.length > 0 && (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {pending.map((q, i) => (
            <View key={q.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: t.borderLight, marginLeft: 68 }} />}
              <ListRow
                icon={<ClipboardList size={18} color={t.warning} />}
                iconBg={t.warningLight}
                title={q.title}
                subtitle="Toque para responder"
                onPress={() => router.push('/questionnaires')}
              />
            </View>
          ))}
        </Card>
      )}
      <Button
        label={pending.length > 0 ? 'Ver todos os questionários' : 'Abrir questionários'}
        variant={pending.length > 0 ? 'secondary' : 'primary'}
        onPress={() => router.push('/questionnaires')}
        fullWidth
      />
    </Animated.View>
  )
}
