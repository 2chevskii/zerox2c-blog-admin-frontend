<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'

defineProps<{
  message: string
}>()
</script>

<template>
  <div
    role="alert"
    class="grid w-full max-w-full grid-cols-[auto_1fr] items-start gap-3 rounded-xl border border-ember-300/30 bg-ember-900/55 p-4 text-sm text-ember-100 shadow-[0_14px_38px_rgba(0,0,0,0.2)]"
  >
    <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-ember-300" />
    <p class="min-w-0 leading-6">{{ message }}</p>
  </div>
</template>
