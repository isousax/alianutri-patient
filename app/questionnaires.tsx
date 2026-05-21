import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Alert, RefreshControl, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ClipboardList, ChevronRight, ChevronLeft, CheckCircle2, Clock, Send } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useQuestionnaires, useAnswerQuestionnaire } from '../src/hooks/usePortal'
import type { PortalQuestionnaire } from '../src/types/portal'

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

export default function QuestionnairesScreen() {
  const t = useThemeColors()
  const { data: questionnaires, isLoading, refetch, isRefetching } = useQuestionnaires()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const [selected, setSelected] = useState<PortalQuestionnaire | null>(null)

  if (selected) {
    return <AnswerForm questionnaire={selected} onBack={() => { setSelected(null); refetch() }} />
  }

  const pending = (questionnaires ?? []).filter((q) => q.status === 'sent')
  const answered = (questionnaires ?? []).filter((q) => q.status === 'answered')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <View className="h-8 w-8 rounded-xl items-center justify-center" style={{ backgroundColor: t.accent + '15' }}>
          <ClipboardList size={16} color={t.accent} />
        </View>
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Questionários</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : !questionnaires || questionnaires.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: t.primaryLight }}>
            <ClipboardList size={28} color={t.primary} />
          </View>
          <Text style={{ color: t.text }} className="text-base font-sans-semibold mb-1">Sem questionários</Text>
          <Text style={{ color: t.textMuted }} className="text-sm text-center font-sans">
            Quando o nutricionista enviar um questionário, ele aparecerá aqui.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        >
          {pending.length > 0 && (
            <>
              <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase tracking-widest mb-2 ml-1">
                Pendentes ({pending.length})
              </Text>
              {pending.map((q, i) => (
                <Animated.View key={q.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                  <Pressable
                    onPress={() => canWrite ? setSelected(q) : null}
                    className="mb-3 rounded-2xl p-4 flex-row items-center"
                    style={{ backgroundColor: t.surface, ...SHADOW_SM }}
                  >
                    <View className="h-10 w-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: t.warning + '15' }}>
                      <ClipboardList size={18} color={t.warning} />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold">{q.title}</Text>
                      <View className="flex-row items-center gap-1 mt-1">
                        <Clock size={10} color={t.warning} />
                        <Text style={{ color: t.warning }} className="text-xs font-sans-medium">Pendente</Text>
                      </View>
                    </View>
                    {canWrite && <ChevronRight size={16} color={t.textMuted} />}
                  </Pressable>
                </Animated.View>
              ))}
            </>
          )}
          {answered.length > 0 && (
            <>
              <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase tracking-widest mb-2 mt-3 ml-1">
                Respondidos ({answered.length})
              </Text>
              {answered.map((q, i) => (
                <Animated.View key={q.id} entering={FadeInDown.duration(300).delay((pending.length + i) * 60)}>
                  <View className="mb-3 rounded-2xl p-4 flex-row items-center" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
                    <View className="h-10 w-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: t.success + '15' }}>
                      <CheckCircle2 size={18} color={t.success} />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold">{q.title}</Text>
                      <Text style={{ color: t.success }} className="text-xs font-sans-medium mt-1">Respondido</Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function AnswerForm({ questionnaire, onBack }: { questionnaire: PortalQuestionnaire; onBack: () => void }) {
  const t = useThemeColors()
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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={onBack} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <Text style={{ color: t.text }} className="text-lg font-sans-bold flex-1" numberOfLines={1}>
          {questionnaire.title}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={{ color: t.textMuted }} className="text-xs font-sans mb-4">
          Responda as perguntas abaixo. Ao finalizar, toque em "Enviar respostas".
        </Text>

        {/* Simple text-based answers — the actual questions are in the questionnaire body on the backend */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
            <Text style={{ color: t.text }} className="text-sm font-sans-semibold mb-2">Suas respostas</Text>
            <TextInput
              value={responses['0'] ?? ''}
              onChangeText={(txt) => setAnswer(0, txt)}
              placeholder="Digite suas respostas aqui..."
              placeholderTextColor={t.textMuted}
              multiline
              className="rounded-xl px-4 py-3 text-sm font-sans min-h-[160px]"
              style={{
                color: t.text,
                backgroundColor: t.surfacePressed,
                borderWidth: 1,
                borderColor: t.borderLight,
              }}
              textAlignVertical="top"
            />
          </View>
        </Animated.View>
      </ScrollView>

      <View className="px-5 pb-6">
        <Pressable
          onPress={handleSubmit}
          disabled={isPending}
          className="rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
          style={{ backgroundColor: isPending ? t.primary + '80' : t.primary }}
        >
          {isPending ? (
            <ActivityIndicator color={t.primaryText} />
          ) : (
            <>
              <Send size={16} color={t.primaryText} />
              <Text style={{ color: t.primaryText }} className="text-sm font-sans-semibold">Enviar respostas</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
