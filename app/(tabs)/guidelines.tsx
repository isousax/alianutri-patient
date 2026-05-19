import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, ChevronRight, RefreshCw } from 'lucide-react-native'
import { useGuidelines, useGuidelineDetail } from '../../src/hooks/usePortal'

export default function GuidelinesScreen() {
  const { data: guidelines, isLoading, refetch, isRefetching } = useGuidelines()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useGuidelineDetail(selectedId)

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    )
  }

  if (!guidelines || guidelines.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="px-5 pt-4 pb-3">
          <Text className="text-xl font-sans-bold text-slate-900">Orientações</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-2xl bg-violet-50 items-center justify-center mb-4">
            <FileText size={28} color="#8b5cf6" />
          </View>
          <Text className="text-base font-sans-semibold text-slate-900 mb-1">Sem orientações</Text>
          <Text className="text-sm text-slate-400 text-center font-sans">
            As orientações do seu nutricionista aparecerão aqui.
          </Text>
          <Pressable onPress={() => refetch()} className="mt-4 flex-row items-center gap-2">
            <RefreshCw size={14} color="#8b5cf6" />
            <Text className="text-sm font-sans-medium text-violet-600">Atualizar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (selectedId && detail) {
    const sections = Array.isArray(detail.content) ? detail.content : []
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <Pressable onPress={() => setSelectedId(null)}>
            <Text className="text-sm font-sans-medium text-violet-600">← Voltar</Text>
          </Pressable>
          <Text className="text-lg font-sans-bold text-slate-900 flex-1" numberOfLines={1}>{detail.title}</Text>
        </View>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          {sections.map((section: any, idx: number) => (
            <View key={idx} className="mb-4">
              {section.heading ? (
                <Text className="text-sm font-sans-semibold text-slate-900 mb-1">{section.heading}</Text>
              ) : null}
              {section.text ? (
                <Text className="text-sm text-slate-600 font-sans leading-5">{section.text}</Text>
              ) : null}
              {section.body ? (
                <Text className="text-sm text-slate-600 font-sans leading-5">{section.body}</Text>
              ) : null}
            </View>
          ))}
          {sections.length === 0 && typeof detail.content === 'string' && (
            <Text className="text-sm text-slate-600 font-sans leading-5">{detail.content as string}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-sans-bold text-slate-900">Orientações</Text>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#8b5cf6" />}>
        {guidelines.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => setSelectedId(g.id)}
            className="mb-3 bg-white rounded-2xl border border-slate-100 p-4 flex-row items-center active:bg-slate-50"
          >
            <View className="h-10 w-10 rounded-xl bg-violet-50 items-center justify-center mr-3">
              <FileText size={18} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-sans-semibold text-slate-900">{g.title}</Text>
              {g.published_at ? (
                <Text className="text-xs text-slate-400 font-sans mt-0.5">
                  {new Date(g.published_at).toLocaleDateString('pt-BR')}
                </Text>
              ) : null}
            </View>
            <ChevronRight size={16} color="#cbd5e1" />
          </Pressable>
        ))}
      </ScrollView>
      {loadingDetail && (
        <View className="absolute inset-0 items-center justify-center bg-white/60">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      )}
    </SafeAreaView>
  )
}
