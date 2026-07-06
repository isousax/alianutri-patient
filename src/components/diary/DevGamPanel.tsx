import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useThemeColors, type ThemeColors } from '../../stores/theme'
import { typography, space, radius } from '../../theme/tokens'
import { haptics } from '../../lib/haptics'
import {
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  levelTitle,
  type Badge,
  type GamificationState,
} from '../../lib/gamification'
import { useDevGamStore } from '../../stores/devGamification'
import { markBadgesSeen, resetSeenBadges } from '../../hooks/useAchievementUnlock'
import { resetSeenLevel } from '../../hooks/useLevelUp'
import { MedalhasIcon } from '../ui/Medalhas'
import { PhysicalMedal } from '../ui/PhysicalMedal'
import { Card } from '../ui'
import { CelebrationModal, LevelUpCelebration } from '../home/LevelUpCelebration'

// ── Botão-pílula compacto do painel dev ──
function DevBtn({
  label,
  onPress,
  t,
  tone = 'default',
  fullWidth,
}: {
  label: string
  onPress: () => void
  t: ThemeColors
  tone?: 'default' | 'primary' | 'danger'
  fullWidth?: boolean
}) {
  const bg =
    tone === 'primary' ? t.primaryLight : tone === 'danger' ? t.errorLight : t.surfaceSecondary
  const fg = tone === 'primary' ? t.primary : tone === 'danger' ? t.error : t.textSecondary
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        paddingHorizontal: space.md,
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: bg,
        opacity: pressed ? 0.6 : 1,
        alignItems: 'center',
        alignSelf: fullWidth ? 'stretch' : 'auto',
      })}
    >
      <Text style={[typography.captionBold, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

/**
 * DEV-ONLY: simulador de gamificação. Renderizado apenas sob __DEV__ pelo
 * chamador. Persiste overrides locais (medalhas + XP/nível) via useDevGamStore,
 * sem tocar no backend. Ao desbloquear uma medalha, marca-a como "vista" (para a
 * Home não re-disparar) e mostra a MESMA animação de desbloqueio do usuário.
 */
export function DevGamPanel({ gam }: { gam: GamificationState }) {
  const t = useThemeColors()
  const xpOverride = useDevGamStore((s) => s.xpOverride)
  const setXpOverride = useDevGamStore((s) => s.setXpOverride)
  const toggleBadge = useDevGamStore((s) => s.toggleBadge)
  const unlockAll = useDevGamStore((s) => s.unlockAll)
  const clearBadges = useDevGamStore((s) => s.clearBadges)
  const resetAll = useDevGamStore((s) => s.reset)

  const [previewBadge, setPreviewBadge] = useState<Badge | null>(null)
  const [previewLevel, setPreviewLevel] = useState<number | null>(null)

  const levelFloor = (lvl: number) =>
    LEVEL_THRESHOLDS[Math.min(Math.max(lvl, 1), MAX_LEVEL) - 1]

  const setLevel = (lvl: number) => {
    haptics.selection()
    setXpOverride(levelFloor(lvl))
  }
  const addPct = (pct: number) => {
    haptics.selection()
    const next = Math.max(0, Math.round(gam.xp + pct * (gam.xpPerLevel || 100)))
    setXpOverride(next)
  }

  const onToggleMedal = (badge: Badge) => {
    const wasUnlocked = gam.badges.find((b) => b.id === badge.id)?.unlocked
    toggleBadge(badge.id)
    if (!wasUnlocked) {
      markBadgesSeen([badge.id])
      haptics.light()
      setPreviewBadge(badge)
    } else {
      haptics.selection()
    }
  }

  const onUnlockAll = () => {
    haptics.light()
    const ids = gam.badges.map((b) => b.id)
    unlockAll(ids)
    markBadgesSeen(ids)
  }

  const onResetAll = () => {
    haptics.warning()
    resetAll()
    resetSeenBadges()
    resetSeenLevel()
  }

  return (
    <View style={{ marginTop: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.sm }}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: radius.full,
            backgroundColor: t.warningLight,
          }}
        >
          <Text style={[typography.captionBold, { color: t.warning }]}>DEV</Text>
        </View>
        <Text style={[typography.labelMd, { color: t.textSecondary }]}>
          Simulador de gamificação
        </Text>
      </View>

      <Card>
        {/* ── Nível / XP ── */}
        <Text style={[typography.labelMd, { color: t.text }]}>
          Nível {gam.level} · {levelTitle(gam.level)}
          {xpOverride != null ? '  · override' : ''}
        </Text>
        <Text style={[typography.caption, { color: t.textMuted, marginTop: 2, marginBottom: space.sm }]}>
          {gam.xpInLevel}/{gam.xpPerLevel} XP nesta faixa · {gam.xp} XP total
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          <DevBtn label="−1 nível" onPress={() => setLevel(gam.level - 1)} t={t} />
          <DevBtn label="+1 nível" onPress={() => setLevel(gam.level + 1)} t={t} />
          <DevBtn label="−10% XP" onPress={() => addPct(-0.1)} t={t} />
          <DevBtn label="+10% XP" onPress={() => addPct(0.1)} t={t} />
          <DevBtn label="Máx" onPress={() => setLevel(MAX_LEVEL)} t={t} />
          <DevBtn
            label="Ver animação"
            tone="primary"
            onPress={() => {
              haptics.light()
              setPreviewLevel(gam.level)
            }}
            t={t}
          />
          <DevBtn
            label="Limpar nível"
            onPress={() => {
              haptics.selection()
              setXpOverride(null)
            }}
            t={t}
          />
        </View>

        <View style={{ height: 1, backgroundColor: t.borderLight, marginVertical: space.md }} />

        {/* ── Medalhas ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: space.xs,
          }}
        >
          <Text style={[typography.labelMd, { color: t.text }]}>
            Medalhas · {gam.unlockedCount}/{gam.badges.length}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <DevBtn label="Todas" onPress={onUnlockAll} t={t} />
            <DevBtn
              label="Limpar"
              onPress={() => {
                haptics.selection()
                clearBadges()
              }}
              t={t}
            />
          </View>
        </View>
        <Text style={[typography.caption, { color: t.textMuted, marginBottom: space.sm }]}>
          Toque para desbloquear/relockar. Ao desbloquear você vê a animação e a medalha permanece
          no painel de progresso.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {gam.badges.map((badge) => (
            <Pressable
              key={badge.id}
              onPress={() => onToggleMedal(badge)}
              accessibilityRole="button"
              accessibilityLabel={`${badge.unlocked ? 'Relockar' : 'Desbloquear'} ${badge.label}`}
              style={({ pressed }) => ({
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: badge.unlocked ? t.primaryLight : t.surfaceSecondary,
                opacity: pressed ? 0.55 : badge.unlocked ? 1 : 0.5,
                borderWidth: badge.unlocked ? 1.5 : 0,
                borderColor: t.primary,
              })}
            >
              <MedalhasIcon medalha={badge.medalha} size={38} />
            </Pressable>
          ))}
        </View>

        <View style={{ height: 1, backgroundColor: t.borderLight, marginVertical: space.md }} />
        <DevBtn
          label="Resetar tudo (medalhas + nível + celebrações)"
          tone="danger"
          fullWidth
          onPress={onResetAll}
          t={t}
        />
      </Card>

      {previewBadge && (
        <CelebrationModal
          soundKey="medalUnlock"
          hero={<PhysicalMedal medalha={previewBadge.medalha} size={132} />}
          eyebrow="Conquista desbloqueada"
          title={previewBadge.label}
          subtitle={previewBadge.hint}
          onDismiss={() => setPreviewBadge(null)}
        />
      )}
      {previewLevel != null && (
        <LevelUpCelebration level={previewLevel} onDismiss={() => setPreviewLevel(null)} />
      )}
    </View>
  )
}
