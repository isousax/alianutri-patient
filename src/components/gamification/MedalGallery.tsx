import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Lock } from "lucide-react-native";
import { useThemeColors } from "../../stores/theme";
import { typography, space, radius } from "../../theme/tokens";
import { haptics } from "../../lib/haptics";
import { MedalhasIcon } from "../ui/Medalhas";
import type { Badge } from "../../lib/gamification";
import { AchievementDetailModal } from "../home/AchievementDetailModal";
import { LockedMedalSheet } from "./LockedMedalSheet";

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
// CORREÇÃO (2 partes): (a) `minWidth: 0` em cada célula — sem ele o min-width
// automático do flex-item vale a largura do rótulo e quebra a divisão em 1/3. (b) o
// `flex: 1` fica numa View SIMPLES (estilo objeto), NÃO no style-FUNÇÃO do Pressable:
// sob o NativeWind (css-interop) o flex vindo de uma função de style do Pressable não
// chega ao nó de layout → a célula não cresce e a linha encosta à esquerda (era o
// resto do defeito no print2). A View envolvente usa alignItems:center → o conteúdo
// (Pressable de largura natural) fica centrado em cada 1/3. Sem wrap, %, Dimensions
// ou margem negativa. As 3 colunas somam a largura toda. Mesmo componente Home/Conquistas.
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = 3;
const SLOT = 72; // moldura quadrada FIXA da medalha (px)
const MEDAL = 52; // arte da medalha dentro do slot (px)
const COL_GAP = space.sm; // espaçamento horizontal entre colunas
const ROW_GAP = space.lg; // espaçamento vertical entre linhas

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    rows.push(items.slice(i, i + size));
  return rows;
}

// MedalCell: só o CONTEÚDO (slot fixo + rótulo), de largura natural. O `flex: 1` que
// divide a linha fica na View que a envolve (ver MedalGallery). O slot é de tamanho
// fixo e centralizado → a medalha cai sempre no mesmo ponto. Estado "bloqueada"
// (esmaecida + selo de cadeado) é idêntico em qualquer tela.
function MedalCell({ badge, onPress }: { badge: Badge; onPress: () => void }) {
  const t = useThemeColors();
  const unlocked = badge.unlocked;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.label}. ${unlocked ? "Conquistada" : "Bloqueada"}. Toque para ver.`}
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: SLOT,
          height: SLOT,
          //borderRadius: radius.lg,
          //backgroundColor: unlocked ? t.primaryLight : t.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
          borderColor: unlocked ? "transparent" : t.borderLight,
        }}
      >
        <View style={{ opacity: unlocked ? 1 : 0.35 }}>
          <MedalhasIcon medalha={badge.medalha} size={MEDAL} />
        </View>
        {!unlocked ? (
          <View
            style={{
              position: "absolute",
              right: 4,
              bottom: 4,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.borderLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={11} color={t.textMuted} />
          </View>
        ) : null}
      </View>
      {/* Rótulo de 1 linha, largura natural e centralizado. NÃO usa alignSelf:stretch
          (forçaria a célula a crescer com o texto → foi parte do desalinhamento). */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          typography.labelSm,
          {
            textAlign: "center",
            marginTop: space.xs,
            color: unlocked ? t.text : t.textMuted,
          },
        ]}
      >
        {badge.label}
      </Text>
    </Pressable>
  );
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
  const [detail, setDetail] = useState<Badge | null>(null);
  const [locked, setLocked] = useState<Badge | null>(null);

  const open = (badge: Badge) => {
    haptics.light();
    if (badge.unlocked) setDetail(badge);
    else setLocked(badge);
  };

  const rows = chunk(badges, COLUMNS);

  return (
    <>
      {/* Linhas explícitas de COLUMNS. Cada célula é uma View flex:1 + minWidth:0, então
          as três dividem a largura por igual. Linhas incompletas recebem espaçadores
          flex:1 para as colunas nunca esticarem. */}
      <View style={{ rowGap: ROW_GAP }}>
        {rows.map((row, rowIndex) => {
          const fillers = COLUMNS - row.length;
          return (
            <View
              key={rowIndex}
              style={{ flexDirection: "row", columnGap: COL_GAP }}
            >
              {row.map((badge) => (
                // flex:1 + minWidth:0 em View SIMPLES (estilo objeto), não no
                // Pressable: sob o NativeWind, flex vindo de style-função do
                // Pressable não chega ao nó de layout. alignItems:center centra a
                // célula sem depender de stretch. As 3 células somam a largura toda.
                <View
                  key={badge.id}
                  style={{ flex: 1, minWidth: 0, alignItems: "center" }}
                >
                  <MedalCell badge={badge} onPress={() => open(badge)} />
                </View>
              ))}
              {fillers > 0
                ? Array.from({ length: fillers }).map((_, i) => (
                    <View
                      key={`filler-${i}`}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  ))
                : null}
            </View>
          );
        })}
      </View>

      {detail ? (
        <AchievementDetailModal
          badge={detail}
          onDismiss={() => setDetail(null)}
        />
      ) : null}
      {locked ? (
        <LockedMedalSheet badge={locked} onDismiss={() => setLocked(null)} />
      ) : null}
    </>
  );
}
