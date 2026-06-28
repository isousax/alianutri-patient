import { Toast } from './Toast'
import { ConfirmDialog } from './ConfirmDialog'
import { ActionSheetHost } from './ActionSheetHost'

/**
 * Hosts globais de feedback (Toast / ConfirmDialog / ActionSheet).
 * Montar uma única vez no layout raiz, acima do conteúdo.
 */
export function FeedbackOverlays() {
  return (
    <>
      <ConfirmDialog />
      <ActionSheetHost />
      <Toast />
    </>
  )
}
