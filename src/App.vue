<script setup lang="ts">
import ConfirmHost from '@/components/ConfirmHost.vue'
import ToastHost from '@/components/ToastHost.vue'
</script>

<template>
  <RouterView />
  <ConfirmHost />
  <ToastHost />
</template>
