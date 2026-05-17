<script setup lang="ts">
import { SearchX } from '@lucide/vue'

defineProps<{
  title: string
  message: string
}>()
</script>

<template>
  <div class="grid place-items-center px-6 py-14 text-center sm:py-16">
    <div class="grid max-w-md place-items-center gap-5">
      <span class="grid h-12 w-12 place-items-center rounded-xl border border-mist-50/12 bg-mist-50/7 text-brass-100">
        <SearchX class="h-7 w-7" :stroke-width="1.6" />
      </span>
      <div>
        <h2 class="font-display text-2xl font-bold tracking-[-0.04em] text-mist-50">{{ title }}</h2>
        <p class="mt-3 text-sm leading-6 text-mist-300">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
