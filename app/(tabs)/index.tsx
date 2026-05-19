import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Calendar, Utensils, FileText, RefreshCw, AlertCircle, ClipboardList, Target, BookOpen } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'
import { usePortalHome } from '../../src/hooks/usePortal'

export default function HomeScreen() {
  const t = useThemeColors()
  const { data, isLoading, error, refetch, isRefetching } = usePortalHome()

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} className="items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    )
  }

  if (error || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} className="items-center justify-center px-8" edges={['top']}>
        <AlertCircle size={32} color={t.error} />
        <Text style={{ color: t.textSecondary }} className="text-sm text-center mt-3 font-sans">
          Não foi possível carregar os dados.
        </Text>
        <Pressable onPress={() => refetch()} className="mt-4 flex-row items-center gap-2">
          <RefreshCw size={14} color={t.primary} />
          <Text style={{ color: t.primary }} className="text-sm font-sans-medium">Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const displayName = data.patient.name?.split(' ')[0] || 'Paciente'

  function fmtAppointment(iso: string): string {
    const d = new Date(iso)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${day}/${month} às ${h}:${m}`
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}>
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text style={{ color: t.textMuted }} className="text-sm font-sans">Olá,</Text>
          <Text style={{ color: t.text }} className="text-2xl font-sans-bold">{displayName} 👋</Text>
          {data.nutritionist?.name ? (
            <Text style={{ color: t.textMuted }} className="text-xs mt-1 font-sans">
              Nutricionista: {data.nutritionist.name}
            </Text>
          ) : null}
        </View>

        {/* Quick actions */}
        <View className="px-5 gap-3">
          <Pressable onPress={() => router.push('/(tabs)/meal-plan')}>
            <QuickCard
              icon={<Utensils size={20} color={t.primary} />}
              title="Plano alimentar"
              subtitle={data.active_meal_plan ? data.active_meal_plan.name : 'Nenhum plano ativo'}
              iconBg={t.primaryLight}
              surfaceColor={t.surface}
              borderColor={t.borderLight}
              textColor={t.text}
              subColor={t.textMuted}
            />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/guidelines')}>
            <QuickCard
              icon={<FileText size={20} color={t.info} />}
              title="Orientações"
              subtitle={data.guidelines_count > 0 ? `${data.guidelines_count} orientaç${data.guidelines_count === 1 ? 'ão' : 'ões'}` : 'Sem orientações'}
              iconBg={t.primaryLight}
              surfaceColor={t.surface}
              borderColor={t.borderLight}
              textColor={t.text}
              subColor={t.textMuted}
            />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/diary')}>
            <QuickCard
              icon={<BookOpen size={20} color={t.warning} />}
              title="Diário alimentar"
              subtitle="Registre suas refeições"
              iconBg={t.accentLight}
              surfaceColor={t.surface}
              borderColor={t.borderLight}
              textColor={t.text}
              subColor={t.textMuted}
            />
          </Pressable>
          <Pressable onPress={() => router.push('/questionnaires')}>
            <QuickCard
              icon={<ClipboardList size={20} color={t.accent} />}
              title="Questionários"
              subtitle="Responda os questionários pendentes"
              iconBg={t.accentLight}
              surfaceColor={t.surface}
              borderColor={t.borderLight}
              textColor={t.text}
              subColor={t.textMuted}
            />
          </Pressable>
          <Pressable onPress={() => router.push('/goals')}>
            <QuickCard
              icon={<Target size={20} color={t.success} />}
              title="Metas"
              subtitle="Acompanhe seu progresso"
              iconBg={t.primaryLight}
              surfaceColor={t.surface}
              borderColor={t.borderLight}
              textColor={t.text}
              subColor={t.textMuted}
            />
          </Pressable>
          <QuickCard
            icon={<Calendar size={20} color={t.info} />}
            title="Próxima consulta"
            subtitle={data.next_appointment ? fmtAppointment(data.next_appointment.starts_at) : 'Nenhuma agendada'}
            iconBg={t.primaryLight}
            surfaceColor={t.surface}
            borderColor={t.borderLight}
            textColor={t.text}
            subColor={t.textMuted}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuickCard({ icon, title, subtitle, iconBg, surfaceColor, borderColor, textColor, subColor }: {
  icon: React.ReactNode; title: string; subtitle: string
  iconBg: string; surfaceColor: string; borderColor: string; textColor: string; subColor: string
}) {
  return (
    <View className="rounded-2xl p-4 flex-row items-center gap-4" style={{ backgroundColor: surfaceColor, borderWidth: 1, borderColor }}>
      <View className="h-12 w-12 rounded-xl items-center justify-center" style={{ backgroundColor: iconBg }}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-sans-semibold" style={{ color: textColor }}>{title}</Text>
        <Text className="text-xs font-sans mt-0.5" style={{ color: subColor }}>{subtitle}</Text>
      </View>
    </View>
  )
}
