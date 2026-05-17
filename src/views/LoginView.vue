<script setup lang="ts">
import { Eye, EyeOff, KeyRound, UserRound } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import brandBagUrl from '@/assets/brand-bag.svg'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const loading = ref(false)
const showPassword = ref(false)

const form = reactive({
  login: '',
  password: '',
})

const errors = reactive({
  login: '',
  password: '',
})

async function submit(): Promise<void> {
  if (!validate()) {
    return
  }

  loading.value = true

  try {
    await auth.login(form)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Login failed.')
  } finally {
    loading.value = false
  }
}

function validate(): boolean {
  errors.login = form.login.trim() ? '' : 'Username or email is required.'
  errors.password = form.password ? '' : 'Password is required.'

  return !errors.login && !errors.password
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[#1d1d1d] px-4 py-10 text-mist-100">
    <section class="grid w-[min(100%,28rem)] gap-6 rounded-xl bg-[#252525] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:p-7">
      <div class="flex items-center gap-4">
        <img :src="brandBagUrl" alt="" class="h-12 w-12 rounded-xl">
        <div class="min-w-0">
          <h1 class="font-display text-3xl font-bold leading-none text-mist-50">2CHEVSKII Admin</h1>
          <p class="mt-2 text-sm leading-6 text-mist-300">Sign in with an admin account.</p>
        </div>
      </div>

      <form class="grid gap-4" novalidate @submit.prevent="submit">
        <label class="block">
          <span class="field-label">Username or email</span>
          <span class="relative block">
            <UserRound class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-300" />
            <input
              v-model="form.login"
              class="control pl-10"
              autocomplete="username"
              :aria-invalid="Boolean(errors.login)"
              @blur="validate"
            >
          </span>
          <span v-if="errors.login" class="field-error">{{ errors.login }}</span>
        </label>

        <label class="block">
          <span class="field-label">Password</span>
          <span class="relative block">
            <KeyRound class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-300" />
            <input
              v-model="form.password"
              class="control px-10"
              autocomplete="current-password"
              :type="showPassword ? 'text' : 'password'"
              :aria-invalid="Boolean(errors.password)"
              @blur="validate"
            >
            <button
              type="button"
              class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mist-300 transition hover:bg-mist-50/8 hover:text-brass-100"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </span>
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </label>

        <button type="submit" class="button button-primary min-h-12 w-full" :disabled="loading">
          <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-brass-100/70 border-t-transparent" />
          Sign in
        </button>
      </form>
    </section>
  </main>
</template>
