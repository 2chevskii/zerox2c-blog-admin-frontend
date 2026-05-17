<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import { onBeforeUnmount, onMounted } from 'vue'
import { useConfirm } from '@/composables/useConfirm'

const { pendingConfirm, resolveConfirm } = useConfirm()

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && pendingConfirm.value) {
    resolveConfirm(false)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-180 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-140 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="pendingConfirm" class="fixed inset-0 z-[70] grid place-items-center bg-[#1d1d1d]/70 p-4 backdrop-blur-[6px]">
        <section
          class="grid w-[min(100%,32rem)] gap-5 rounded-xl border border-mist-50/12 bg-[#252525] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`confirm-title-${pendingConfirm.id}`"
        >
          <div class="grid grid-cols-[auto_1fr] gap-4">
            <span
              class="grid h-11 w-11 place-items-center rounded-xl border"
              :class="pendingConfirm.tone === 'danger'
                ? 'border-ember-300/30 bg-ember-700/22 text-ember-100'
                : 'border-brass-200/25 bg-brass-200/12 text-brass-100'"
            >
              <AlertTriangle class="h-5 w-5" :stroke-width="1.8" />
            </span>
            <div class="min-w-0">
              <h2 :id="`confirm-title-${pendingConfirm.id}`" class="font-display text-2xl font-bold leading-none text-mist-50">
                {{ pendingConfirm.title }}
              </h2>
              <p class="mt-3 text-sm leading-6 text-mist-300">{{ pendingConfirm.message }}</p>
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" class="button" @click="resolveConfirm(false)">
              {{ pendingConfirm.cancelLabel }}
            </button>
            <button
              type="button"
              class="button"
              :class="pendingConfirm.tone === 'danger' ? 'button-danger' : 'button-primary'"
              @click="resolveConfirm(true)"
            >
              {{ pendingConfirm.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
