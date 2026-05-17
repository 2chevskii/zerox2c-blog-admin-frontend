import { readonly, ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

interface ConfirmRequest extends Required<ConfirmOptions> {
  id: number
  resolve: (confirmed: boolean) => void
}

let nextConfirmId = 1
const pendingConfirm = ref<ConfirmRequest | null>(null)

function normalizeOptions(options: ConfirmOptions): Required<ConfirmOptions> {
  return {
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel ?? 'Confirm',
    cancelLabel: options.cancelLabel ?? 'Cancel',
    tone: options.tone ?? 'default',
  }
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (pendingConfirm.value) {
    pendingConfirm.value.resolve(false)
  }

  return new Promise((resolve) => {
    pendingConfirm.value = {
      ...normalizeOptions(options),
      id: nextConfirmId++,
      resolve,
    }
  })
}

function resolveConfirm(confirmed: boolean): void {
  const request = pendingConfirm.value
  if (!request) {
    return
  }

  pendingConfirm.value = null
  request.resolve(confirmed)
}

export function useConfirm() {
  return {
    pendingConfirm: readonly(pendingConfirm),
    resolveConfirm,
  }
}
