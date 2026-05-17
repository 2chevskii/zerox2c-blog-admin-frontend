<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  accent?: boolean
}>(), {
  accent: false,
})
</script>

<template>
  <span
    class="inline-flex min-h-7 items-center rounded-lg px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em]"
    :class="accent ? 'bg-[#303030] text-brass-100' : 'bg-[#303030] text-mist-200'"
  >
    {{ name }}
  </span>
</template>
