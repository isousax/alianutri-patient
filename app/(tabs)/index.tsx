import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Calendar, Utensils, FileText, RefreshCw, AlertCircle, ClipboardList, Target, BookOpen } from 'lucide-react-native'
import { colors } from '../../src/theme/colors'
import { usePortalHome } from '../../src/hooks/usePortal'

export default function HomeScreen() {
  const { data, isLoading, error, refetch, isRefetching } = usePortalHome()

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
      </SafeAreaView>
    )
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-8" edges={['top']}>
        <AlertCircle size={32} color="#ef4444" />
        <Text className="text-sm text-slate-500 text-center mt-3 font-sans">
          Não foi possível carregar os dados.
        </Text>
        <Pressable onPress={() => refetch()} className="mt-4 flex-row items-center gap-2">
          <RefreshCw size={14} color={colors.brand[600]} />
          <Text className="text-sm font-sans-medium text-brand-600">Tentar novamente</Text>
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}>
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-sm text-slate-400 font-sans">Olá,</Text>
          <Text className="text-2xl font-sans-bold text-slate-900">{displayName} 👋</Text>
          {data.nutritionist?.name ? (
            <Text className="text-xs text-slate-400 mt-1 font-sans">
              Nutricionista: {data.nutritionist.name}
            </Text>
          ) : null}
        </View>

        {/* Quick actions */}
        <View className="px-5 gap-3">
          <Pressable onPress={() => router.push('/(tabs)/meal-plan')}>
            <QuickCard
              icon={<Utensils size={20} color={colors.brand[600]} />}
              title="Plano alimentar"
              subtitle={data.active_meal_plan ? data.active_meal_plan.name : 'Nenhum plano ativo'}
              accent="bg-brand-50"
            />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/guidelines')}>
            <QuickCard
              icon={<FileText size={20} color="#8b5cf6" />}
              title="Orientações"
              subtitle={data.guidelines_count > 0 ? `${data.guidelines_count} orientaç${data.guidelines_count === 1 ? 'ão' : 'ões'}` : 'Sem orientações'}
              accent="bg-violet-50"
            />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/diary')}>
            <QuickCard
              icon={<BookOpen size={20} color="#d97706" />}
              title="Diário alimentar"
              subtitle="Registre suas refeições"
              accent="bg-amber-50"
            />
          </Pressable>
          <Pressable onPress={() => router.push('/questionnaires')}>
            <QuickCard
              icon={<ClipboardList size={20} color="#6366f1" />}
              title="Questionários"
              subtitle="Responda os questionários pendentes"
              accent="bg-indigo-50"
            />
          </Pressable>
          <Pressable onPress={() => router.push('/goals')}>
            <QuickCard
              icon={<Target size={20} color="#059669" />}
              title="Metas"
              subtitle="Acompanhe seu progresso"
              accent="bg-emerald-50"
            />
          </Pressable>
          <QuickCard
            icon={<Calendar size={20} color="#0ea5e9" />}
            title="Próxima consulta"
            subtitle={data.next_appointment ? fmtAppointment(data.next_appointment.starts_at) : 'Nenhuma agendada'}
            accent="bg-sky-50"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuickCard({ icon, title, subtitle, accent }: { icon: React.ReactNode; title: string; subtitle: string; accent: string }) {
  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4 flex-row items-center gap-4">
      <View className={`h-12 w-12 rounded-xl ${accent} items-center justify-center`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-sans-semibold text-slate-900">{title}</Text>
        <Text className="text-xs text-slate-400 font-sans mt-0.5">{subtitle}</Text>
      </View>
    </View>
  )
}
