import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlaskConical, Upload, CalendarDays, Info, Download } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useAuthStore } from '../src/stores/auth'
import { useLabOrders } from '../src/hooks/useLabOrders'
import type { PortalLabOrder } from '../src/types/labOrder'
import { openPortalPdf } from '../src/lib/openPortalFile'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList, Button, ReadOnlyBanner } from '../src/components/ui'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'
import { haptics } from '../src/lib/haptics'

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Solicitação de Exames = documento oficial emitido (PDF). O paciente baixa/imprime
// para levar ao laboratório e depois envia o resultado (fluxo separado, em "Exames").
export default function LabOrdersScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const accessCode = useAuthStore((s) => s.accessCode)
  const sessionToken = useAuthStore((s) => s.sessionToken)
  const { data, isLoading, isError, refetch, isRefetching } = useLabOrders()
  const orders: PortalLabOrder[] = data?.orders ?? []

  async function openOrder(o: PortalLabOrder) {
    haptics.light()
    await openPortalPdf({ accessCode, sessionToken, path: `/documents/${o.id}/file`, filename: o.name })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Exames solicitados" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: space.sm }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        <Text style={[typography.bodyMd, { color: t.textMuted, paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }]}>
          Seu nutricionista solicitou os exames abaixo. Baixe o PDF para levar ao laboratório e depois envie o resultado.
        </Text>

        {canWrite ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
            <Button label="Enviar resultado" onPress={() => router.push('/lab-reports' as never)} leftIcon={<Upload size={18} color={t.primaryFg} />} fullWidth />
          </View>
        ) : (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
            <ReadOnlyBanner />
          </View>
        )}

        {isLoading ? (
          <SkeletonList />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<FlaskConical size={28} color={t.primary} />}
            title="Nenhum exame solicitado"
            description="Quando seu nutricionista pedir exames, a solicitação aparece aqui em PDF para você baixar e levar ao laboratório."
          />
        ) : (
          orders.map((o, idx) => (
            <Animated.View
              key={o.id}
              entering={FadeInDown.duration(320).delay(Math.min(idx * 60, 300))}
              style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }}
            >
              <Card onPress={() => openOrder(o)} accessibilityLabel={`Abrir PDF: ${o.name}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 40, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: t.infoLight, marginRight: space.md }}>
                    <FlaskConical size={18} color={t.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.headingSm, { color: t.text }]} numberOfLines={1}>{o.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <CalendarDays size={12} color={t.textMuted} />
                      <Text style={[typography.caption, { color: t.textMuted }]}>Solicitado em {fmtDate(o.shared_at ?? o.created_at)}</Text>
                    </View>
                  </View>
                  <Download size={18} color={t.textMuted} />
                </View>
              </Card>
            </Animated.View>
          ))
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
          <Info size={13} color={t.textMuted} />
          <Text style={[typography.caption, { color: t.textMuted, flex: 1 }]}>
            Dúvidas sobre preparo ou jejum? Fale com seu nutricionista pelo chat.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
