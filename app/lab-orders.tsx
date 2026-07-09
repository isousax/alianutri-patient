import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlaskConical, Upload, CalendarDays, Info } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useLabOrders } from '../src/hooks/useLabOrders'
import type { PortalLabOrder } from '../src/types/labOrder'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList, Button, ReadOnlyBanner } from '../src/components/ui'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Somente leitura: o que o nutricionista SOLICITOU. Faz-se o exame e depois
// envia-se o resultado em "Exames" (lab-reports). Nada de interpretação aqui.
export default function LabOrdersScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const { data, isLoading, isError, refetch, isRefetching } = useLabOrders()
  const orders: PortalLabOrder[] = data?.orders ?? []

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
          Seu nutricionista solicitou os exames abaixo. Faça-os e envie o resultado para ele revisar.
        </Text>

        {canWrite ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
            <Button
              label="Enviar resultado"
              onPress={() => router.push('/lab-reports' as never)}
              leftIcon={<Upload size={18} color={t.primaryFg} />}
              fullWidth
            />
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
            description="Quando seu nutricionista pedir exames, eles aparecem aqui com a lista do que fazer."
          />
        ) : (
          orders.map((o, idx) => (
            <Animated.View
              key={o.id}
              entering={FadeInDown.duration(320).delay(Math.min(idx * 60, 300))}
              style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }}
            >
              <Card accessibilityLabel={`Pedido com ${o.items.length} exames`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
                  <View style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: t.infoLight, marginRight: space.sm }}>
                    <FlaskConical size={18} color={t.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelLg, { color: t.text }]}>
                      {o.items.length} exame{o.items.length === 1 ? '' : 's'} solicitado{o.items.length === 1 ? '' : 's'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <CalendarDays size={12} color={t.textMuted} />
                      <Text style={[typography.caption, { color: t.textMuted }]}>
                        Solicitado em {fmtDate(o.requested_date)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {o.items.map((it, i) => (
                    <View
                      key={`${o.id}-${i}`}
                      style={{ backgroundColor: t.borderLight, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5 }}
                    >
                      <Text style={[typography.caption, { color: t.text }]}>{it.display_name}</Text>
                    </View>
                  ))}
                </View>

                {o.notes ? (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: space.sm, alignItems: 'flex-start' }}>
                    <Info size={13} color={t.textMuted} style={{ marginTop: 2 }} />
                    <Text style={[typography.caption, { color: t.textMuted, flex: 1 }]}>{o.notes}</Text>
                  </View>
                ) : null}
              </Card>
            </Animated.View>
          ))
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
          <Info size={13} color={t.textMuted} />
          <Text style={[typography.caption, { color: t.textMuted, flex: 1 }]}>
            Dúvidas sobre preparo ou jejum? Fale com seu nutricionista no chat.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
