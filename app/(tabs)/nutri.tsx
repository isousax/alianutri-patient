import { useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { FadeIn } from 'react-native-reanimated'
import { MessageCircle, CalendarDays, ClipboardList, CalendarPlus, Video, MapPin, Navigation, CheckCircle2 } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'
import { usePortalHome, useChatUnreadCount, useQuestionnaires, useAppointments } from '../../src/hooks/usePortal'
import type { PortalQuestionnaire, PortalAppointment } from '../../src/types/portal'
import { Card, EmptyState, ErrorState, ListRow, Button, Avatar, SegmentedControl, SkeletonList } from '../../src/components/ui'
import { openMeetingLink, openAddressInMaps, appointmentStatusMeta, isUpcoming } from '../../src/lib/appointment'
import { space, typography, radius, SCREEN_PADDING } from '../../src/theme/tokens'

type Seg = 'chat' | 'appointments' | 'questionnaires'

export default function NutriScreen() {
  const t = useThemeColors()
  const [seg, setSeg] = useState<Seg>('chat')
  const { data: home, isLoading, isError, refetch, isRefetching } = usePortalHome()
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
      ) : isError && !home ? (
        <ErrorState onRetry={() => refetch()} />
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
          {seg === 'appointments' && <AppointmentsSegment />}
          {seg === 'questionnaires' && (
            <QuestionnairesSegment items={questionnaires ?? []} />
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

function AppointmentsSegment() {
  const t = useThemeColors()
  const { data: appointments, isLoading, isError, refetch } = useAppointments()

  const list = appointments ?? []
  const upcoming = list
    .filter((a) => isUpcoming(a.status, a.starts_at))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const history = list
    .filter((a) => !isUpcoming(a.status, a.starts_at))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  if (isLoading && list.length === 0) {
    return <SkeletonList count={2} />
  }

  if (isError && list.length === 0) {
    return (
      <View style={{ minHeight: 340 }}>
        <ErrorState onRetry={() => refetch()} />
      </View>
    )
  }

  if (list.length === 0) {
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

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ gap: space.md }}>
      {upcoming.map((a) => (
        <AppointmentRow key={a.id} apt={a} highlight />
      ))}
      <Button
        label="Agendar nova consulta"
        variant="secondary"
        leftIcon={<CalendarPlus size={18} color={t.text} />}
        onPress={() => router.push('/booking')}
        fullWidth
      />
      {history.length > 0 && (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Text style={[typography.overline, { color: t.textMuted, marginLeft: 2 }]}>HISTÓRICO</Text>
          {history.map((a) => (
            <AppointmentRow key={a.id} apt={a} />
          ))}
        </View>
      )}
    </Animated.View>
  )
}

function AppointmentRow({ apt, highlight = false }: { apt: PortalAppointment; highlight?: boolean }) {
  const t = useThemeColors()
  const start = new Date(apt.starts_at)
  const dateLabel = start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const timeLabel = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const isOnline = apt.type === 'online'
  const meta = appointmentStatusMeta(apt.status)
  const tone = (() => {
    switch (meta.tone) {
      case 'primary': return { fg: t.primary, bg: t.primaryLight }
      case 'success': return { fg: t.success, bg: t.successLight }
      case 'warning': return { fg: t.warning, bg: t.warningLight }
      case 'error': return { fg: t.error, bg: t.errorLight }
      default: return { fg: t.textMuted, bg: t.surfaceSecondary }
    }
  })()
  const canJoin = highlight && isOnline && !!apt.meeting_url
  const hasAddress = !isOnline && !!apt.location?.address
  const onlineLinkPending = highlight && isOnline && !apt.meeting_url

  return (
    <Card style={{ marginTop: 2}}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ width: 25, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', /*backgroundColor: t.primaryLight*/ }}>
            {isOnline ? <Video size={18} color={t.primary} /> : <MapPin size={18} color={t.primary} />}
          </View>
          <Text style={[typography.labelMd, { color: t.primary }]}>{isOnline ? 'Online' : 'Presencial'}</Text>
        </View>
        <View style={{ paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.full, /*backgroundColor: tone.bg*/ }}>
          <Text style={[typography.captionBold, { color: tone.fg }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={[typography.headingMd, { color: t.text, textTransform: 'capitalize' }]}>{dateLabel}</Text>
      <Text style={[typography.bodyMd, { color: t.textMuted, marginTop: 2 }]}>às {timeLabel}</Text>

      {!isOnline && apt.location && (
        <View style={{ marginTop: space.sm }}>
          <Text style={[typography.labelSm, { color: t.text }]}>{apt.location.name}</Text>
          {apt.location.address ? (
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}>{apt.location.address}</Text>
          ) : null}
        </View>
      )}

      {(canJoin || hasAddress) && (
        <View style={{ marginTop: space.md, gap: space.sm }}>
          {canJoin && (
            <Button
              label="Entrar na consulta"
              leftIcon={<Video size={18} color={t.primaryFg} />}
              onPress={() => openMeetingLink(apt.meeting_url)}
              fullWidth
            />
          )}
          {hasAddress && (
            <Button
              label="Abrir no mapa"
              variant="secondary"
              leftIcon={<Navigation size={18} color={t.text} />}
              onPress={() => openAddressInMaps(apt.location?.address)}
              fullWidth
            />
          )}
        </View>
      )}

      {onlineLinkPending && (
        <Text style={[typography.caption, { color: t.textMuted, marginTop: space.md }]}>
          O link da reunião será disponibilizado pela sua nutricionista.
        </Text>
      )}
    </Card>
  )
}

function QuestionnairesSegment({ items }: { items: PortalQuestionnaire[] }) {
  const t = useThemeColors()
  const pending = items.filter((q) => q.status === 'sent')
  const answered = items.filter((q) => q.status === 'answered')

  if (items.length === 0) {
    return (
      <View style={{ minHeight: 340 }}>
        <EmptyState
          alia
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

      {answered.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Text style={[typography.overline, { color: t.textMuted, marginLeft: 2 }]}>RESPONDIDOS</Text>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {answered.map((q, i) => (
              <View key={q.id}>
                {i > 0 && <View style={{ height: 1, backgroundColor: t.borderLight, marginLeft: 68 }} />}
                <ListRow
                  icon={<CheckCircle2 size={18} color={t.primary} />}
                  iconBg={t.primaryLight}
                  title={q.title}
                  subtitle="Ver suas respostas"
                  onPress={() => router.push('/questionnaires')}
                />
              </View>
            ))}
          </Card>
        </View>
      )}

      <Button
        label="Abrir questionários"
        variant="secondary"
        onPress={() => router.push('/questionnaires')}
        fullWidth
      />
    </Animated.View>
  )
}
