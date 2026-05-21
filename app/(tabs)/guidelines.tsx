import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, ChevronRight, RefreshCw } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'
import { useGuidelines, useGuidelineDetail } from '../../src/hooks/usePortal'

export default function GuidelinesScreen() {
  const t = useThemeColors()
  const { data: guidelines, isLoading, refetch, isRefetching } = useGuidelines()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useGuidelineDetail(selectedId)

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} className="items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    )
  }

  if (!guidelines || guidelines.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View className="px-5 pt-4 pb-3">
          <Text style={{ color: t.text }} className="text-xl font-sans-bold">Orientações</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: t.primaryLight }}>
            <FileText size={28} color={t.primary} />
          </View>
          <Text style={{ color: t.text }} className="text-base font-sans-semibold mb-1">Sem orientações</Text>
          <Text style={{ color: t.textMuted }} className="text-sm text-center font-sans">
            As orientações do seu nutricionista aparecerão aqui.
          </Text>
          <Pressable onPress={() => refetch()} className="mt-4 flex-row items-center gap-2">
            <RefreshCw size={14} color={t.primary} />
            <Text style={{ color: t.primary }} className="text-sm font-sans-medium">Atualizar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (selectedId && detail) {
    // Normalize content: may be array of sections, { text: string }, or plain string
    let sections: { heading?: string; text?: string; body?: string }[] = []
    if (Array.isArray(detail.content)) {
      sections = detail.content
    } else {
      const rawText = typeof detail.content === 'string'
        ? detail.content
        : (detail.content as Record<string, unknown>)?.text
          ? String((detail.content as Record<string, unknown>).text)
          : null
      if (rawText) {
        // Parse "## heading\nbody" format into sections
        const parts = rawText.split(/^## /m).filter(Boolean)
        sections = parts.map((part: string) => {
          const newline = part.indexOf('\n')
          if (newline > 0) {
            return { heading: part.slice(0, newline).trim(), body: part.slice(newline + 1).trim() }
          }
          return { body: part.trim() }
        })
      }
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <Pressable onPress={() => setSelectedId(null)}>
            <Text style={{ color: t.primary }} className="text-sm font-sans-medium">← Voltar</Text>
          </Pressable>
          <Text style={{ color: t.text }} className="text-lg font-sans-bold flex-1" numberOfLines={1}>{detail.title}</Text>
        </View>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          {sections.map((section: any, idx: number) => (
            <View key={idx} className="mb-4">
              {section.heading ? (
                <Text style={{ color: t.text }} className="text-sm font-sans-semibold mb-1">{section.heading}</Text>
              ) : null}
              {section.text ? (
                <Text style={{ color: t.textSecondary }} className="text-sm font-sans leading-5">{section.text}</Text>
              ) : null}
              {section.body ? (
                <Text style={{ color: t.textSecondary }} className="text-sm font-sans leading-5">{section.body}</Text>
              ) : null}
            </View>
          ))}
          {sections.length === 0 && (
            <Text style={{ color: t.textMuted }} className="text-sm font-sans text-center mt-8">Nenhum conteúdo disponível.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Orientações</Text>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}>
        {guidelines.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => setSelectedId(g.id)}
            className="mb-3 rounded-2xl p-4 flex-row items-center"
            style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
          >
            <View className="h-10 w-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: t.primaryLight }}>
              <FileText size={18} color={t.primary} />
            </View>
            <View className="flex-1">
              <Text style={{ color: t.text }} className="text-sm font-sans-semibold">{g.title}</Text>
              {g.published_at ? (
                <Text style={{ color: t.textMuted }} className="text-xs font-sans mt-0.5">
                  {new Date(g.published_at).toLocaleDateString('pt-BR')}
                </Text>
              ) : null}
            </View>
            <ChevronRight size={16} color={t.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
      {loadingDetail && (
        <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: t.background + '99' }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      )}
    </SafeAreaView>
  )
}
