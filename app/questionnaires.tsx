import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClipboardList,
  ChevronRight,
  CheckCircle2,
  Clock,
  Send,
  Circle,
  CheckCircle,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { haptics } from "../src/lib/haptics";
import { useThemeColors } from "../src/stores/theme";
import { KeyboardAvoidingWrapper } from "../src/components/ui/KeyboardAvoidingWrapper";
import { useFeaturesStore } from "../src/stores/features";
import { toast } from "../src/stores/toast";
import {
  useQuestionnaires,
  useQuestionnaireDetail,
  useAnswerQuestionnaire,
} from "../src/hooks/usePortal";
import type {
  PortalQuestionnaire,
  PortalQuestionItem,
} from "../src/types/portal";
import {
  ScreenHeader,
  Card,
  EmptyState,
  ErrorState,
  LoadingScreen,
  SectionLabel,
  SkeletonList,
} from "../src/components/ui";
import {
  shadows,
  radius,
  space,
  typography,
  SCREEN_PADDING,
} from "../src/theme/tokens";
import { AliaAvatar } from "../src/components/ui/AliaAvatar";

export default function QuestionnairesScreen() {
  const t = useThemeColors();
  const {
    data: questionnaires,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuestionnaires();
  const canWrite = useFeaturesStore((s) => s.canWrite);
  const [selected, setSelected] = useState<PortalQuestionnaire | null>(null);

  if (selected) {
    return (
      <AnswerForm
        questionnaire={selected}
        onBack={() => {
          setSelected(null);
          refetch();
        }}
      />
    );
  }

  const list: PortalQuestionnaire[] = questionnaires ?? [];
  const pending = list.filter((q) => q.status === "sent");
  const answered = list.filter((q) => q.status === "answered");

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.background }}
      edges={["top"]}
    >
      <ScreenHeader title="Questionários" />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !questionnaires || questionnaires.length === 0 ? (
        <EmptyState
          alia
          title="Sem questionários"
          description="Quando o nutricionista enviar um questionário, ele aparecerá aqui."
          actionLabel="Atualizar"
          onAction={() => refetch()}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: 32,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={t.primary}
            />
          }
        >
          {pending.length > 0 && (
            <>
              <SectionLabel text={`PENDENTES (${pending.length})`} />
              {pending.map((q, i) => (
                <Animated.View
                  key={q.id}
                  entering={FadeInDown.duration(300).delay(i * 60)}
                >
                  <Pressable
                    onPress={() => (canWrite ? setSelected(q) : null)}
                    accessibilityRole="button"
                    accessibilityLabel={`${q.title}, pendente. Toque para responder`}
                    accessibilityState={{ disabled: !canWrite }}
                    style={{
                      marginBottom: space.md,
                      borderRadius: radius.xl,
                      padding: space.lg,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: t.surface,
                      ...shadows.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.lg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: space.md,
                        backgroundColor: t.warningLight,
                      }}
                    >
                      <ClipboardList size={18} color={t.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.headingSm, { color: t.text }]}>
                        {q.title}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <Clock size={10} color={t.warning} />
                        <Text
                          style={[typography.captionBold, { color: t.warning }]}
                        >
                          Pendente
                        </Text>
                      </View>
                    </View>
                    {canWrite && <ChevronRight size={16} color={t.textMuted} />}
                  </Pressable>
                </Animated.View>
              ))}
            </>
          )}
          {answered.length > 0 && (
            <View style={{ marginTop: pending.length > 0 ? space.md : 0 }}>
              <SectionLabel text={`RESPONDIDOS (${answered.length})`} />
              {answered.map((q, i) => (
                <Animated.View
                  key={q.id}
                  entering={FadeInDown.duration(300).delay(
                    (pending.length + i) * 60,
                  )}
                >
                  <Pressable
                    onPress={() => setSelected(q)}
                    accessibilityRole="button"
                    accessibilityLabel={`${q.title}, respondido. Toque para ver`}
                    style={{
                      marginBottom: space.md,
                      borderRadius: radius.xl,
                      padding: space.lg,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: t.surface,
                      ...shadows.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.lg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: space.md,
                        backgroundColor: t.successLight,
                      }}
                    >
                      <CheckCircle2 size={18} color={t.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.headingSm, { color: t.text }]}>
                        {q.title}
                      </Text>
                      <Text
                        style={[
                          typography.captionBold,
                          { color: t.success, marginTop: 4 },
                        ]}
                      >
                        Respondido · toque para ver
                      </Text>
                    </View>
                    <CheckCircle size={16} color={t.textMuted} />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function AnswerForm({
  questionnaire,
  onBack,
}: {
  questionnaire: PortalQuestionnaire;
  onBack: () => void;
}) {
  const t = useThemeColors();
  const { data: detail, isLoading: loadingDetail } = useQuestionnaireDetail(
    questionnaire.id,
  );
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { mutateAsync, isPending } = useAnswerQuestionnaire();
  const readOnly = questionnaire.status === "answered";

  // Modo leitura: pré-preenche com as respostas já enviadas (chaveadas por índice).
  useEffect(() => {
    if (detail?.responses) {
      const prefilled: Record<string, string> = {};
      for (const [k, v] of Object.entries(detail.responses)) {
        prefilled[k] = v == null ? "" : String(v);
      }
      setResponses(prefilled);
    }
  }, [detail]);

  function setAnswer(questionIdx: number, value: string) {
    if (readOnly) return;
    setResponses((prev) => ({ ...prev, [String(questionIdx)]: value }));
  }

  const questions: PortalQuestionItem[] = detail?.questions ?? [];
  const requiredCount = questions.filter((q) => q.required).length;
  const answeredRequired = questions.filter(
    (q, i) => q.required && responses[String(i)]?.trim(),
  ).length;

  async function handleSubmit() {
    if (requiredCount > 0 && answeredRequired < requiredCount) {
      haptics.warning();
      toast.error(
        `Responda as ${requiredCount} perguntas obrigatórias antes de enviar.`,
      );
      return;
    }
    try {
      await mutateAsync({ qId: questionnaire.id, responses });
      haptics.success();
      toast.success("Questionário enviado!");
      onBack();
    } catch {
      haptics.error();
      toast.error("Não foi possível enviar as respostas.");
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.background }}
      edges={["top"]}
    >
      <ScreenHeader title={questionnaire.title} onBack={onBack} />

      {loadingDetail ? (
        <LoadingScreen />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} color={t.primary} />}
          title="Sem perguntas"
          description="Não foi possível carregar as perguntas deste questionário."
        />
      ) : (
        <KeyboardAvoidingWrapper>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: SCREEN_PADDING,
              paddingBottom: 32,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                typography.caption,
                { color: t.textMuted, marginBottom: space.lg },
              ]}
            >
              {readOnly
                ? "Estas foram as respostas que você enviou."
                : `Responda as perguntas abaixo. ${
                    requiredCount > 0
                      ? `${requiredCount} obrigatória${requiredCount > 1 ? "s" : ""}.`
                      : ""
                  }`}
            </Text>

            {questions.map((q, idx) => (
              <Animated.View
                key={idx}
                entering={FadeInDown.duration(250).delay(idx * 40)}
              >
                <Card style={{ marginBottom: space.lg }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      marginBottom: space.sm + 2,
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        { color: t.primary, marginRight: 6 },
                      ]}
                    >
                      {idx + 1}.
                    </Text>
                    <Text
                      style={[typography.headingSm, { color: t.text, flex: 1 }]}
                    >
                      {q.text}
                      {q.required && <Text style={{ color: t.error }}> *</Text>}
                    </Text>
                  </View>

                  {q.type === "text" && (
                    <TextInput
                      value={responses[String(idx)] ?? ""}
                      onChangeText={(txt) => setAnswer(idx, txt)}
                      accessibilityLabel={q.text}
                      placeholder="Digite sua resposta..."
                      placeholderTextColor={t.textMuted}
                      editable={!readOnly}
                      multiline
                      style={[
                        typography.bodyMd,
                        {
                          borderRadius: radius.lg,
                          paddingHorizontal: space.lg,
                          paddingVertical: space.md,
                          minHeight: 80,
                          color: t.text,
                          backgroundColor: t.surfacePressed,
                          borderWidth: 1,
                          borderColor: t.borderLight,
                        },
                      ]}
                      textAlignVertical="top"
                    />
                  )}

                  {q.type === "select" && q.options && (
                    <View style={{ gap: space.sm }}>
                      {q.options.map((opt) => {
                        const sel = responses[String(idx)] === opt;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => setAnswer(idx, opt)}
                            accessibilityRole="button"
                            accessibilityLabel={opt}
                            accessibilityState={{ selected: sel }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingHorizontal: space.md + 2,
                              paddingVertical: space.sm + 2,
                              borderRadius: radius.lg,
                              backgroundColor: sel
                                ? t.primary + "12"
                                : t.surfacePressed,
                              borderWidth: 1,
                              borderColor: sel
                                ? t.primary + "40"
                                : t.borderLight,
                            }}
                          >
                            {sel ? (
                              <CheckCircle size={16} color={t.primary} />
                            ) : (
                              <Circle size={16} color={t.textMuted} />
                            )}
                            <Text
                              style={[
                                typography.bodyMd,
                                {
                                  color: sel ? t.primary : t.text,
                                  marginLeft: space.sm + 2,
                                  flex: 1,
                                },
                              ]}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {q.type === "boolean" && (
                    <View style={{ flexDirection: "row", gap: space.md }}>
                      {["Sim", "Não"].map((opt) => {
                        const sel = responses[String(idx)] === opt;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => setAnswer(idx, opt)}
                            accessibilityRole="button"
                            accessibilityLabel={opt}
                            accessibilityState={{ selected: sel }}
                            style={{
                              flex: 1,
                              alignItems: "center",
                              paddingVertical: space.md,
                              borderRadius: radius.lg,
                              backgroundColor: sel
                                ? t.primary + "12"
                                : t.surfacePressed,
                              borderWidth: 1,
                              borderColor: sel
                                ? t.primary + "40"
                                : t.borderLight,
                            }}
                          >
                            <Text
                              style={[
                                typography.labelMd,
                                { color: sel ? t.primary : t.text },
                              ]}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {q.type === "scale" && (
                    <View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(
                          (n) => {
                            const sel = responses[String(idx)] === String(n);
                            return (
                              <Pressable
                                key={n}
                                onPress={() => setAnswer(idx, String(n))}
                                accessibilityRole="button"
                                accessibilityLabel={`Nota ${n} de 10`}
                                accessibilityState={{ selected: sel }}
                                style={{
                                  width: 30,
                                  height: 30,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: radius.sm,
                                  backgroundColor: sel
                                    ? t.primary
                                    : t.surfacePressed,
                                  borderWidth: 1,
                                  borderColor: sel ? t.primary : t.borderLight,
                                }}
                              >
                                <Text
                                  style={[
                                    typography.captionBold,
                                    { color: sel ? "#fff" : t.text },
                                  ]}
                                >
                                  {n}
                                </Text>
                              </Pressable>
                            );
                          },
                        )}
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingHorizontal: 2,
                        }}
                      >
                        <Text
                          style={[
                            typography.caption,
                            { color: t.textMuted, fontSize: 11 },
                          ]}
                        >
                          Muito ruim
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            { color: t.textMuted, fontSize: 11 },
                          ]}
                        >
                          Excelente
                        </Text>
                      </View>
                    </View>
                  )}
                </Card>
              </Animated.View>
            ))}
          </ScrollView>

          {!readOnly && (
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              paddingBottom: space["2xl"],
            }}
          >
            <Pressable
              onPress={handleSubmit}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityLabel="Enviar respostas"
              accessibilityState={{ disabled: isPending, busy: isPending }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: space.sm,
                paddingVertical: space.md + 2,
                borderRadius: radius.xl,
                backgroundColor: isPending ? t.primary + "80" : t.primary,
                ...shadows.glow(t.primary),
              }}
            >
              {isPending ? (
                <ActivityIndicator color={t.primaryFg} />
              ) : (
                <>
                  <Send size={16} color={t.primaryFg} />
                  <Text style={[typography.labelMd, { color: t.primaryFg }]}>
                    Enviar respostas
                  </Text>
                </>
              )}
            </Pressable>
          </View>
          )}
        </KeyboardAvoidingWrapper>
      )}
    </SafeAreaView>
  );
}
