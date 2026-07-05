import * as Haptics from 'expo-haptics'

// ══════════════════════════════════════════════════════
//  Feedback tátil centralizado (U-3)
//  Fire-and-forget: NUNCA lança. Em web / dispositivos sem
//  motor háptico as chamadas rejeitam — aqui engolimos o erro
//  para evitar unhandled promise rejections.
//
//  Guia de quando disparar (pareie com toast quando indicado):
//   • selection() → alternar valor discreto (segmented, stepper, chip, slot, tab).
//   • light()     → navegação / abrir sheet / tap secundário.
//   • medium()    → ação primária (Button) e confirmações.
//   • heavy()     → destaque dentro de uma sequência (não usar sozinho).
//   • success()   → operação concluída (salvar/enviar/registrar) + toast.success.
//   • warning()   → validação branda (campo obrigatório) + toast.error.
//   • error()     → falha de operação + toast.error.
//   • celebrate() → conquista grande (subir de nível, plano do dia 100%).
//                   Use com PARCIMÔNIA — no máximo uma por evento.
// ══════════════════════════════════════════════════════

const swallow = (p: Promise<unknown>) => {
  p.catch(() => {})
}

export const haptics = {
  selection: () => swallow(Haptics.selectionAsync()),
  light: () => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /**
   * Sequência multi-toque (estilo Duolingo) para conquistas.
   * Retorna um `cancel()` que limpa os timers pendentes — chame no cleanup
   * do `useEffect` caso o componente possa desmontar durante a sequência.
   */
  celebrate: (): (() => void) => {
    swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
    const timers = [
      setTimeout(() => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), 200),
      setTimeout(() => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 400),
      setTimeout(() => swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 600),
      setTimeout(() => swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 900),
    ]
    return () => timers.forEach(clearTimeout)
  },
}
