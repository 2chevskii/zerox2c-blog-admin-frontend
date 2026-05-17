import { readonly, ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: number
  message: string
  variant: ToastVariant
}

let nextToastId = 1
const toasts = ref<ToastMessage[]>([])

function pushToast(variant: ToastVariant, message: string): void {
  const id = nextToastId++
  toasts.value = [...toasts.value, { id, message, variant }]

  setTimeout(() => {
    removeToast(id)
  }, 4600)
}

function removeToast(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    removeToast,
    success: (message: string) => pushToast('success', message),
    error: (message: string) => pushToast('error', message),
    warning: (message: string) => pushToast('warning', message),
    info: (message: string) => pushToast('info', message),
  }
}
