import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { haptics } from '../../lib/haptics'
import { useThemeColors } from '../../stores/theme'
import { radius, space, typography, todayStr } from '../../theme/tokens'
import { BottomSheet } from './BottomSheet'

interface CalendarSheetProps {
  visible: boolean
  onClose: () => void
  /** Data selecionada no formato YYYY-MM-DD. */
  selected: string
  onSelect: (date: string) => void
  /** Último dia selecionável (YYYY-MM-DD). Padrão: hoje. Dias após ficam off. */
  maxDate?: string
  title?: string
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const pad = (n: number) => String(n).padStart(2, '0')
// month é 0-indexado (padrão do Date).
const ymd = (y: number, month: number, d: number) => `${y}-${pad(month + 1)}-${pad(d)}`

export function CalendarSheet({ visible, onClose, selected, onSelect, maxDate, title = 'Selecionar data' }: CalendarSheetProps) {
  const t = useThemeColors()
  const max = maxDate ?? todayStr()

  const parseYM = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number)
    return { year: y, month: (m || 1) - 1 }
  }

  const [view, setView] = useState(() => parseYM(selected || max))

  // Reabrir → volta para o mês da data selecionada.
  useEffect(() => {
    if (visible) setView(parseYM(selected || max))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const { year, month } = view
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const [maxY, maxM] = max.split('-').map(Number)
  const atCurrentMonth = year > maxY || (year === maxY && month >= maxM - 1)

  const monthLabel = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const goPrev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }))
  const goNext = () => {
    if (atCurrentMonth) return
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }))
  }

  const handlePick = (d: number) => {
    const date = ymd(year, month, d)
    if (date > max) return
    haptics.selection()
    onSelect(date)
    onClose()
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {/* Navegação de mês */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
        <Pressable
          onPress={goPrev}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceSecondary }}
        >
          <ChevronLeft size={20} color={t.text} />
        </Pressable>
        <Text style={[typography.labelLg, { color: t.text, textTransform: 'capitalize' }]}>{monthLabel}</Text>
        <Pressable
          onPress={goNext}
          disabled={atCurrentMonth}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceSecondary, opacity: atCurrentMonth ? 0.35 : 1 }}
        >
          <ChevronRight size={20} color={t.text} />
        </Pressable>
      </View>

      {/* Cabeçalho dos dias da semana */}
      <View style={{ flexDirection: 'row', marginBottom: space.xs }}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: space.xs }}>
            <Text style={[typography.caption, { color: t.textMuted }]}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Grade */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (d == null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />
          const date = ymd(year, month, d)
          const isSelected = date === selected
          const isDisabled = date > max
          const isToday = date === todayStr()
          return (
            <View key={date} style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={() => handlePick(d)}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityLabel={date}
                accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? t.primary : 'transparent',
                  borderWidth: !isSelected && isToday ? 1.5 : 0,
                  borderColor: t.primary,
                }}
              >
                <Text
                  style={[
                    typography.bodyMd,
                    {
                      color: isDisabled ? t.borderLight : isSelected ? t.primaryFg : t.text,
                      fontVariant: ['tabular-nums'],
                    },
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </View>
    </BottomSheet>
  )
}
