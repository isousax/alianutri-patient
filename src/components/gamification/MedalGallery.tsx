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
// Abordagens descartadas (e por quê):
//  • `width: '33.3333%'` / `flexBasis` → 3×33.3333% ≠ 100%; arredondamento
//    subpixel faz o 3º item ora caber ora quebrar → "só 2 colunas"/linha torta.
//  • `justifyContent: space-between | space-around` → espalha a última linha
//    (incompleta) por toda a largura → colunas fora do lugar.
//  • `Dimensions.get('window').width` → ignora o padding do pai (card da Home ≠
//    largura de Conquistas) e não reage a rotação/split-screen.
//  • `marginHorizontal` negativo → hack frágil que vaza no clip do pai.
//  • Células `flex: 1` → SÓ preenchem a largura se o PAI entregar largura definida
//    via stretch. Se um ancestral usar alignItems center/flex-start (ou no RN-Web,
//    ou com o wrapper do NativeWind sobre Pressable), a linha COLAPSA para a
//    largura de conteúdo e encosta À ESQUERDA. Foi exatamente o defeito visto.
//
// Solução que NÃO depende do pai: o container assume `width: '100%'` (ocupa todo o
// pai, qualquer que seja o alignItems dele) e MEDE a própria largura via onLayout
// (largura do CONTAINER, não da janela). Cada coluna é uma fatia FIXA dessa largura
// (gridWidth ÷ COLUMNS) — as três somam o total, então a grade preenche e fica
// SIMÉTRICA. O slot (tamanho fixo) é centralizado na célula → coluna do meio no
// centro exato e as laterais afastadas por igual das bordas. Linhas incompletas
// recebem espaçadores de mesma largura. Mesmo componente na Home e em Conquistas.
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = 3
const SLOT = 72 // moldura quadrada FIXA da medalha (px)
const MEDAL = 52 // arte da medalha dentro do slot (px)
const ROW_GAP = space.lg // espaçamento vertical entre linhas

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

// Célula de LARGURA FIXA (= largura medida do container ÷ COLUMNS). Como não usa
// `flex`/stretch do pai, nunca colapsa para a esquerda. O slot é de tamanho fixo e
// centralizado → a medalha cai sempre no mesmo ponto. Estado "bloqueada"
// (esmaecida + selo de cadeado) é idêntico em qualquer tela.
function MedalCell({ badge, width, onPress }: { badge: Badge; width: number; onPress: () => void }) {
  const t = useThemeColors()
  const unlocked = badge.unlocked
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.label}. ${unlocked ? 'Conquistada' : 'Bloqueada'}. Toque para ver.`}
      style={({ pressed }) => ({ width, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
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
  // Largura REAL do container, medida via onLayout (NÃO é Dimensions da janela).
  // Dela derivamos uma largura de coluna fixa e idêntica, sem depender de flex.
  const [gridWidth, setGridWidth] = useState(0)

  const open = (badge: Badge) => {
    haptics.light()
    if (badge.unlocked) setDetail(badge)
    else setLocked(badge)
  }

  const rows = chunk(badges, COLUMNS)
  const cellWidth = gridWidth / COLUMNS

  return (
    <>
      {/* width:'100%' → ocupa TODA a largura do pai, seja qual for o alignItems
          dele; onLayout mede essa largura já resolvida. As colunas são fatias
          exatas dela (somam o total → grade preenchida, centrada e simétrica). */}
      <View
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
        style={{ width: '100%', gap: ROW_GAP }}
      >
        {cellWidth > 0
          ? rows.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: 'row' }}>
                {row.map((badge) => (
                  <MedalCell key={badge.id} badge={badge} width={cellWidth} onPress={() => open(badge)} />
                ))}
                {row.length < COLUMNS
                  ? Array.from({ length: COLUMNS - row.length }).map((_, i) => (
                      <View key={`filler-${i}`} style={{ width: cellWidth }} />
                    ))
                  : null}
              </View>
            ))
          : null}
      </View>

      {detail ? <AchievementDetailModal badge={detail} onDismiss={() => setDetail(null)} /> : null}
      {locked ? <LockedMedalSheet badge={locked} onDismiss={() => setLocked(null)} /> : null}
    </>
  )
}
