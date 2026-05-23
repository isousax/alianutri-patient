import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Alert, RefreshControl, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ClipboardList, ChevronRight, ChevronLeft, CheckCircle2, Clock, Send, Circle, CheckCircle } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useQuestionnaires, useQuestionnaireDetail, useAnswerQuestionnaire } from '../src/hooks/usePortal'
import type { PortalQuestionnaire, PortalQuestionItem } from '../src/types/portal'

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
  const { data: detail, isLoading: loadingDetail } = useQuestionnaireDetail(questionnaire.id)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const { mutateAsync, isPending } = useAnswerQuestionnaire()

  function setAnswer(questionIdx: number, value: string) {
    setResponses((prev) => ({ ...prev, [String(questionIdx)]: value }))
  }

  const questions: PortalQuestionItem[] = detail?.questions ?? []
  const requiredCount = questions.filter((q) => q.required).length
  const answeredRequired = questions.filter((q, i) => q.required && responses[String(i)]?.trim()).length

  async function handleSubmit() {
    if (requiredCount > 0 && answeredRequired < requiredCount) {
      Alert.alert('Campos obrigatórios', `Responda todas as ${requiredCount} perguntas obrigatórias antes de enviar.`)
      return
    }
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

      {loadingDetail ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : questions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: t.textMuted }} className="text-sm font-sans text-center">
            Não foi possível carregar as perguntas deste questionário.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: t.textMuted }} className="text-xs font-sans mb-4">
              Responda as perguntas abaixo. {requiredCount > 0 ? `${requiredCount} obrigatória${requiredCount > 1 ? 's' : ''}.` : ''}
            </Text>

            {questions.map((q, idx) => (
              <Animated.View key={idx} entering={FadeInDown.duration(250).delay(idx * 40)}>
                <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
                  <View className="flex-row items-start mb-2.5">
                    <Text style={{ color: t.primary }} className="text-xs font-sans-bold mr-1.5">
                      {idx + 1}.
                    </Text>
                    <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold flex-1 leading-[18px]">
                      {q.text}
                      {q.required && <Text style={{ color: t.error }}> *</Text>}
                    </Text>
                  </View>

                  {q.type === 'text' && (
                    <TextInput
                      value={responses[String(idx)] ?? ''}
                      onChangeText={(txt) => setAnswer(idx, txt)}
                      placeholder="Digite sua resposta..."
                      placeholderTextColor={t.textMuted}
                      multiline
                      className="rounded-xl px-4 py-3 text-sm font-sans min-h-[80px]"
                      style={{
                        color: t.text,
                        backgroundColor: t.surfacePressed,
                        borderWidth: 1,
                        borderColor: t.borderLight,
                      }}
                      textAlignVertical="top"
                    />
                  )}

                  {q.type === 'select' && q.options && (
                    <View className="gap-2">
                      {q.options.map((opt) => {
                        const selected = responses[String(idx)] === opt
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => setAnswer(idx, opt)}
                            className="flex-row items-center px-3.5 py-2.5 rounded-xl"
                            style={{
                              backgroundColor: selected ? t.primary + '12' : t.surfacePressed,
                              borderWidth: 1,
                              borderColor: selected ? t.primary + '40' : t.borderLight,
                            }}
                          >
                            {selected ? (
                              <CheckCircle size={16} color={t.primary} />
                            ) : (
                              <Circle size={16} color={t.textMuted} />
                            )}
                            <Text
                              className="text-[13px] font-sans ml-2.5 flex-1"
                              style={{ color: selected ? t.primary : t.text }}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  )}

                  {q.type === 'boolean' && (
                    <View className="flex-row gap-3">
                      {['Sim', 'Não'].map((opt) => {
                        const selected = responses[String(idx)] === opt
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => setAnswer(idx, opt)}
                            className="flex-1 items-center py-3 rounded-xl"
                            style={{
                              backgroundColor: selected ? t.primary + '12' : t.surfacePressed,
                              borderWidth: 1,
                              borderColor: selected ? t.primary + '40' : t.borderLight,
                            }}
                          >
                            <Text
                              className="text-sm font-sans-semibold"
                              style={{ color: selected ? t.primary : t.text }}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  )}

                  {q.type === 'scale' && (
                    <View>
                      <View className="flex-row justify-between mb-1.5">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                          const selected = responses[String(idx)] === String(n)
                          return (
                            <Pressable
                              key={n}
                              onPress={() => setAnswer(idx, String(n))}
                              className="items-center justify-center rounded-lg"
                              style={{
                                width: 30, height: 30,
                                backgroundColor: selected ? t.primary : t.surfacePressed,
                                borderWidth: 1,
                                borderColor: selected ? t.primary : t.borderLight,
                              }}
                            >
                              <Text
                                className="text-xs font-sans-bold"
                                style={{ color: selected ? '#fff' : t.text }}
                              >
                                {n}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                      <View className="flex-row justify-between px-1">
                        <Text style={{ color: t.textMuted }} className="text-[9px] font-sans">Muito ruim</Text>
                        <Text style={{ color: t.textMuted }} className="text-[9px] font-sans">Excelente</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Animated.View>
            ))}
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
        </>
      )}
    </SafeAreaView>
  )
}
