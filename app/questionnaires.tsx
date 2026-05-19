import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ClipboardList, ChevronRight, ArrowLeft, CheckCircle2, Clock, Send } from 'lucide-react-native'
import { colors } from '../src/theme/colors'
import { useQuestionnaires, useAnswerQuestionnaire } from '../src/hooks/usePortal'
import type { PortalQuestionnaire } from '../src/types/portal'

export default function QuestionnairesScreen() {
  const { data: questionnaires, isLoading, refetch, isRefetching } = useQuestionnaires()
  const [selected, setSelected] = useState<PortalQuestionnaire | null>(null)

  if (selected) {
    return <AnswerForm questionnaire={selected} onBack={() => { setSelected(null); refetch() }} />
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <Text className="text-xl font-sans-bold text-slate-900">Questionários</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand[600]} />
        </View>
      ) : !questionnaires || questionnaires.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-2xl bg-indigo-50 items-center justify-center mb-4">
            <ClipboardList size={28} color="#6366f1" />
          </View>
          <Text className="text-base font-sans-semibold text-slate-900 mb-1">Sem questionários</Text>
          <Text className="text-sm text-slate-400 text-center font-sans">
            Quando o nutricionista enviar um questionário, ele aparecerá aqui.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}>
          {questionnaires.map((q) => (
            <Pressable
              key={q.id}
              onPress={() => q.status === 'sent' ? setSelected(q) : null}
              className="mb-3 bg-white rounded-2xl border border-slate-100 p-4 flex-row items-center active:bg-slate-50"
            >
              <View className={`h-10 w-10 rounded-xl items-center justify-center mr-3 ${q.status === 'answered' ? 'bg-green-50' : 'bg-indigo-50'}`}>
                {q.status === 'answered'
                  ? <CheckCircle2 size={18} color="#16a34a" />
                  : <ClipboardList size={18} color="#6366f1" />}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-sans-semibold text-slate-900">{q.title}</Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  {q.status === 'answered' ? (
                    <Text className="text-xs text-green-600 font-sans">Respondido</Text>
                  ) : (
                    <>
                      <Clock size={10} color="#f59e0b" />
                      <Text className="text-xs text-amber-600 font-sans">Pendente</Text>
                    </>
                  )}
                </View>
              </View>
              {q.status === 'sent' && <ChevronRight size={16} color="#cbd5e1" />}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function AnswerForm({ questionnaire, onBack }: { questionnaire: PortalQuestionnaire; onBack: () => void }) {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const { mutateAsync, isPending } = useAnswerQuestionnaire()

  function setAnswer(questionIdx: number, value: string) {
    setResponses((prev) => ({ ...prev, [String(questionIdx)]: value }))
  }

  async function handleSubmit() {
    try {
      await mutateAsync({ qId: questionnaire.id, responses })
      Alert.alert('Sucesso', 'Questionário respondido com sucesso!', [
        { text: 'OK', onPress: onBack },
      ])
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar as respostas.')
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={onBack} hitSlop={12}>
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <Text className="text-lg font-sans-bold text-slate-900 flex-1" numberOfLines={1}>{questionnaire.title}</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-xs text-slate-400 font-sans mb-4">
          Responda as perguntas abaixo. Ao finalizar, toque em "Enviar respostas".
        </Text>

        {/* Simple text-based answers — the actual questions are in the questionnaire body on the backend */}
        <View className="mb-4 bg-white rounded-2xl border border-slate-100 p-4">
          <Text className="text-sm font-sans-medium text-slate-700 mb-2">Suas respostas</Text>
          <TextInput
            value={responses['0'] ?? ''}
            onChangeText={(t) => setAnswer(0, t)}
            placeholder="Digite suas respostas aqui..."
            placeholderTextColor="#94a3b8"
            multiline
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-sans min-h-[160px]"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View className="px-5 pb-6">
        <Pressable
          onPress={handleSubmit}
          disabled={isPending}
          className={`rounded-2xl py-3.5 flex-row items-center justify-center gap-2 ${isPending ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={16} color="#fff" />
              <Text className="text-white text-sm font-sans-semibold">Enviar respostas</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
