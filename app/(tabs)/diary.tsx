import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BookOpen, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { colors } from '../../src/theme/colors'
import { useFoodDiary, useLogFoodDiary } from '../../src/hooks/usePortal'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner: 'Jantar',
  supper: 'Ceia',
  other: 'Outro',
}

const MEAL_ORDER = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper', 'other']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function DiaryScreen() {
  const [date, setDate] = useState(todayStr())
  const [showForm, setShowForm] = useState(false)
  const { data: entries, isLoading, refetch, isRefetching } = useFoodDiary(date)

  const grouped = (entries ?? []).reduce<Record<string, typeof entries>>((acc, e) => {
    const key = e.meal_type
    if (!acc[key]) acc[key] = []
    acc[key]!.push(e)
    return acc
  }, {})

  const sortedMeals = MEAL_ORDER.filter((m) => grouped[m])

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header + date nav */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Text className="text-xl font-sans-bold text-slate-900">Diário alimentar</Text>
        <Pressable
          onPress={() => setShowForm(true)}
          className="h-9 w-9 rounded-xl bg-brand-600 items-center justify-center"
        >
          <Plus size={18} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center gap-4 pb-3">
        <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={12}>
          <ChevronLeft size={20} color="#64748b" />
        </Pressable>
        <Pressable onPress={() => setDate(todayStr())}>
          <Text className="text-sm font-sans-semibold text-slate-700">{fmtDate(date)}</Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftDate(date, 1))} hitSlop={12} disabled={date >= todayStr()}>
          <ChevronRight size={20} color={date >= todayStr() ? '#cbd5e1' : '#64748b'} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand[600]} />
        </View>
      ) : sortedMeals.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-2xl bg-amber-50 items-center justify-center mb-4">
            <BookOpen size={28} color="#d97706" />
          </View>
          <Text className="text-base font-sans-semibold text-slate-900 mb-1">Nenhum registro</Text>
          <Text className="text-sm text-slate-400 text-center font-sans">
            Toque no + para registrar o que comeu hoje.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}>
          {sortedMeals.map((mealType) => (
            <View key={mealType} className="mb-4">
              <Text className="text-xs font-sans-semibold text-slate-400 uppercase tracking-wide mb-2">
                {MEAL_LABELS[mealType] || mealType}
              </Text>
              {grouped[mealType]!.map((entry) => (
                <View key={entry.id} className="bg-white rounded-2xl border border-slate-100 p-3 mb-2">
                  <Text className="text-sm font-sans-medium text-slate-900">{entry.food_description}</Text>
                  <View className="flex-row gap-3 mt-1">
                    {entry.quantity_g ? <Text className="text-xs text-slate-400 font-sans">{entry.quantity_g}g</Text> : null}
                    {entry.energy_kcal ? <Text className="text-xs text-slate-400 font-sans">{entry.energy_kcal} kcal</Text> : null}
                    {entry.entry_time ? <Text className="text-xs text-slate-400 font-sans">{entry.entry_time}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {showForm && (
        <NewEntryForm
          date={date}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refetch() }}
        />
      )}
    </SafeAreaView>
  )
}

function NewEntryForm({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: () => void }) {
  const [mealType, setMealType] = useState('lunch')
  const [description, setDescription] = useState('')
  const [time, setTime] = useState('')
  const { mutateAsync, isPending } = useLogFoodDiary()

  async function handleSave() {
    if (!description.trim()) {
      Alert.alert('', 'Descreva o que comeu.')
      return
    }
    try {
      await mutateAsync({
        meal_type: mealType,
        entry_date: date,
        entry_time: time || undefined,
        food_description: description.trim(),
      })
      onSaved()
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o registro.')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="absolute inset-0 bg-black/40 justify-end"
    >
      <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-sans-bold text-slate-900">Novo registro</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={20} color="#64748b" />
          </Pressable>
        </View>

        {/* Meal type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {MEAL_ORDER.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMealType(m)}
                className={`px-3 py-1.5 rounded-full border ${mealType === m ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-200'}`}
              >
                <Text className={`text-xs font-sans-medium ${mealType === m ? 'text-white' : 'text-slate-600'}`}>
                  {MEAL_LABELS[m]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Arroz, feijão, frango grelhado e salada"
          placeholderTextColor="#94a3b8"
          multiline
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-sans mb-3 min-h-[80px]"
          textAlignVertical="top"
        />

        <TextInput
          value={time}
          onChangeText={setTime}
          placeholder="Horário (ex: 12:30)"
          placeholderTextColor="#94a3b8"
          className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-sans mb-4"
        />

        <Pressable
          onPress={handleSave}
          disabled={isPending}
          className={`rounded-2xl py-3.5 items-center ${isPending ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-sm font-sans-semibold">Salvar registro</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
