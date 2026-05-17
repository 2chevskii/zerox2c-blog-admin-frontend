<script setup lang="ts">
withDefaults(defineProps<{
  rows?: number
}>(), {
  rows: 3,
})
</script>

<template>
  <div class="grid gap-3">
    <div
      v-for="index in rows"
      :key="index"
      class="h-20 animate-pulse rounded-xl border border-mist-50/10 bg-[linear-gradient(115deg,rgba(255,249,238,0.07),rgba(255,249,238,0.025),rgba(255,249,238,0.055))]"
    />
  </div>
</template>
