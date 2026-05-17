<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from '@lucide/vue'
import type { Component } from 'vue'
import { useToast, type ToastVariant } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const iconMap: Record<ToastVariant, Component> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const toneMap: Record<ToastVariant, string> = {
  success: 'border-brass-200/26 bg-ink-900/94 text-brass-100',
  error: 'border-ember-300/34 bg-ember-900/94 text-ember-100',
  warning: 'border-cardboard-200/34 bg-ink-900/94 text-cardboard-100',
  info: 'border-mist-50/14 bg-ink-900/94 text-mist-100',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed right-4 top-4 z-[80] grid w-[min(24rem,calc(100vw-2rem))] gap-3">
      <TransitionGroup
        enter-active-class="transition duration-180 ease-out"
        enter-from-class="translate-x-5 opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-140 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-5 opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border p-4 text-sm font-semibold shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl"
          :class="toneMap[toast.variant]"
          role="status"
        >
          <component :is="iconMap[toast.variant]" class="mt-0.5 h-5 w-5 shrink-0" :stroke-width="1.8" />
          <p class="min-w-0 leading-6">{{ toast.message }}</p>
          <button
            type="button"
            class="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-lg text-current/70 transition hover:bg-mist-50/8 hover:text-current"
            aria-label="Dismiss notification"
            @click="removeToast(toast.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
