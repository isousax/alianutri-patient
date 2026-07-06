import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Lock } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius } from '../../theme/tokens'
import { haptics } from '../../lib/haptics'
import { MedalhasIcon } from '../ui/Medalhas'
import type { Badge } from '../../lib/gamification'
import { AchievementDetailModal } from '../home/AchievementDetailModal'
import { LockedMedalSheet } from './LockedMedalSheet'

// ─────────────────────────────────────────────────────────────────────────────
// Grade DETERMINÍSTICA de medalhas — COLUMNS colunas de largura IDÊNTICA.
//
// CAUSA RAIZ do desalinhamento (confirmada pelo print: linhas de larguras
// diferentes, grade encostada à esquerda): cada célula é um flex-item e o
// `min-width` PADRÃO de um flex-item é `auto` = largura do seu CONTEÚDO. O rótulo
// (Text de 1 linha) não encolhe abaixo do próprio texto, então rótulos longos
// ("Missão cumprida", "Favorito do Nutri") forçam a célula a ficar MAIOR que 1/3 e
// empurram as vizinhas. Isso ocorre TANTO com `flex: 1` quanto com `width` fixo
// (ambos são flex-items sob o mesmo min-width automático) — por isso as tentativas
// com %, Dimensions, onLayout+largura fixa etc. não resolveram.
//
// CORREÇÃO: `minWidth: 0` em cada célula (mesmo padrão da grade de Ações Rápidas da
// Home, que já funciona). Com min-width 0 a célula pode ficar em EXATAMENTE 1/3 e o
// rótulo elide (numberOfLines=1) dentro dela. `flex: 1` divide a largura por igual;
// sem wrap, sem %, sem Dimensions, sem margem negativa. As 3 colunas somam a
// largura toda → grade simétrica e centrada. Mesmo componente na Home e Conquistas.
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = 3
const SLOT = 72 // moldura quadrada FIXA da medalha (px)
const MEDAL = 52 // arte da medalha dentro do slot (px)
const COL_GAP = space.sm // espaçamento horizontal entre colunas
const ROW_GAP = space.lg // espaçamento vertical entre linhas

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

// Célula: `flex: 1` divide a largura igualmente + `minWidth: 0` deixa o rótulo
// elidir SEM forçar a célula a crescer (ver CAUSA RAIZ acima). O slot é de tamanho
// fixo e centralizado → a medalha cai sempre no mesmo ponto. Estado "bloqueada"
// (esmaecida + selo de cadeado) é idêntico em qualquer tela.
function MedalCell({ badge, onPress }: { badge: Badge; onPress: () => void }) {
  const t = useThemeColors()
  const unlocked = badge.unlocked
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.label}. ${unlocked ? 'Conquistada' : 'Bloqueada'}. Toque para ver.`}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          width: SLOT,
          height: SLOT,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: unlocked ? t.primaryLight : t.surfaceSecondary,
          borderWidth: 1,
          borderColor: unlocked ? 'transparent' : t.borderLight,
        }}
      >
        <View style={{ opacity: unlocked ? 1 : 0.35 }}>
          <MedalhasIcon medalha={badge.medalha} size={MEDAL} />
        </View>
        {!unlocked ? (
          <View
            style={{
              position: 'absolute',
              right: 4,
              bottom: 4,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.borderLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={11} color={t.textMuted} />
          </View>
        ) : null}
      </View>
      {/* alignSelf:stretch → o rótulo ocupa a largura da célula e centraliza igual. */}
      <Text
        numberOfLines={1}
        style={[
          typography.labelSm,
          { alignSelf: 'stretch', textAlign: 'center', marginTop: space.xs, color: unlocked ? t.text : t.textMuted },
        ]}
      >
        {badge.label}
      </Text>
    </Pressable>
  )
}

/**
 * MedalGallery — grade ÚNICA (Home "Seu progresso" e aba Conquistas), sempre com
 * COLUMNS itens por linha e células idênticas em qualquer largura. Roteia o toque,
 * mantendo o desbloqueio como ápice:
 *  • conquistada → contemplação (AchievementDetailModal), calma e SEM celebração.
 *  • bloqueada   → LockedMedalSheet discreto (requisito + progresso), sem
 *                  antecipar a recompensa visual do momento real.
 */
export function MedalGallery({ badges }: { badges: Badge[] }) {
  const [detail, setDetail] = useState<Badge | null>(null)
  const [locked, setLocked] = useState<Badge | null>(null)

  const open = (badge: Badge) => {
    haptics.light()
    if (badge.unlocked) setDetail(badge)
    else setLocked(badge)
  }

  const rows = chunk(badges, COLUMNS)

  return (
    <>
      {/* Linhas explícitas de COLUMNS. Cada célula é flex:1 + minWidth:0, então as
          três dividem a largura por igual e ficam idênticas em toda linha. Linhas
          incompletas recebem espaçadores flex:1 para as colunas nunca esticarem. */}
      <View style={{ rowGap: ROW_GAP }}>
        {rows.map((row, rowIndex) => {
          const fillers = COLUMNS - row.length
          return (
            <View key={rowIndex} style={{ flexDirection: 'row', columnGap: COL_GAP }}>
              {row.map((badge) => (
                <MedalCell key={badge.id} badge={badge} onPress={() => open(badge)} />
              ))}
              {fillers > 0
                ? Array.from({ length: fillers }).map((_, i) => (
                    <View key={`filler-${i}`} style={{ flex: 1, minWidth: 0 }} />
                  ))
                : null}
            </View>
          )
        })}
      </View>

      {detail ? <AchievementDetailModal badge={detail} onDismiss={() => setDetail(null)} /> : null}
      {locked ? <LockedMedalSheet badge={locked} onDismiss={() => setLocked(null)} /> : null}
    </>
  )
}
