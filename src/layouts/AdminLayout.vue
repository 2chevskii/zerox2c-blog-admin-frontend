<script setup lang="ts">
import {
  ChevronDown,
  FilePenLine,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Users,
} from '@lucide/vue'
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import brandBagUrl from '@/assets/brand-bag.svg'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const collapsed = ref(false)
const accountOpen = ref(false)

const navItems: { to: string; label: string; icon: Component }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/posts', label: 'Posts', icon: FilePenLine },
  { to: '/tags', label: 'Tags', icon: Tags },
  { to: '/users', label: 'Users', icon: Users },
]

const currentTitle = computed(() => route.meta.title ?? 'Admin')

onMounted(async () => {
  try {
    await auth.refreshCurrentUser()
    if (!auth.isAdmin) {
      toast.error('This admin area requires an Admin or SuperAdmin account.')
      auth.clearSession()
      await router.replace({ name: 'login' })
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      auth.clearSession()
      await router.replace({ name: 'login' })
      return
    }

    toast.error(error instanceof Error ? error.message : 'Failed to refresh session.')
  }
})

watch(() => route.fullPath, () => {
  accountOpen.value = false
})

function isActiveRoute(path: string): boolean {
  return path === '/dashboard' ? route.path === path : route.path.startsWith(path)
}

async function logout(): Promise<void> {
  auth.clearSession()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-[#1d1d1d] text-mist-100 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
    <aside
      class="sticky top-0 z-40 border-b border-mist-50/10 bg-[#252525]/94 shadow-[0_14px_36px_rgba(0,0,0,0.18)] backdrop-blur-[24px] lg:h-screen lg:border-b-0 lg:border-r lg:transition-[width]"
      :class="collapsed ? 'lg:w-[5.25rem]' : 'lg:w-72'"
    >
      <div class="flex min-h-20 items-center justify-between gap-3 px-4">
        <RouterLink
          to="/dashboard"
          class="flex min-w-0 items-center gap-3 rounded-lg p-1 text-mist-50 transition hover:text-brass-100"
          aria-label="0x2c.dev admin dashboard"
        >
          <img :src="brandBagUrl" alt="" class="h-10 w-10 shrink-0 rounded-lg">
          <span v-if="!collapsed" class="hidden min-w-0 lg:block">
            <span class="block truncate font-display text-xl font-bold leading-none">2CHEVSKII</span>
            <span class="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-mist-300">Admin</span>
          </span>
          <span class="min-w-0 lg:hidden">
            <span class="block truncate font-display text-xl font-bold leading-none">2CHEVSKII</span>
            <span class="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-mist-300">Admin</span>
          </span>
        </RouterLink>

        <button
          type="button"
          class="icon-button hidden lg:grid"
          :title="collapsed ? 'Expand navigation' : 'Collapse navigation'"
          :aria-label="collapsed ? 'Expand navigation' : 'Collapse navigation'"
          @click="collapsed = !collapsed"
        >
          <PanelLeftOpen v-if="collapsed" class="h-4 w-4" />
          <PanelLeftClose v-else class="h-4 w-4" />
        </button>
      </div>

      <nav class="flex gap-2 overflow-x-auto px-4 pb-4 lg:grid lg:overflow-visible lg:pb-0" aria-label="Admin navigation">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-bold text-mist-300 transition hover:bg-[#303030] hover:text-brass-100 lg:w-full"
          :class="[
            isActiveRoute(item.to) ? 'bg-[#303030] text-brass-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]' : '',
            collapsed ? 'lg:justify-center' : '',
          ]"
          :title="collapsed ? item.label : undefined"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" :stroke-width="1.8" />
          <span v-if="!collapsed" class="hidden lg:inline">{{ item.label }}</span>
          <span class="lg:hidden">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <section class="min-w-0">
      <header class="sticky top-0 z-30 border-b border-mist-50/10 bg-[#1d1d1d]/72 px-4 py-3 backdrop-blur-[18px] sm:px-6 lg:px-8">
        <div class="flex min-h-14 items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-mist-300">0x2c.dev</p>
            <h1 class="mt-1 truncate font-display text-2xl font-bold leading-none text-mist-50">
              {{ currentTitle }}
            </h1>
          </div>

          <div class="relative">
            <button
              type="button"
              class="inline-flex min-h-11 max-w-[13rem] items-center gap-2 rounded-lg bg-[#303030] px-3 text-sm font-bold text-mist-100 transition hover:bg-[#353535] hover:text-brass-100"
              aria-haspopup="menu"
              :aria-expanded="accountOpen"
              @click="accountOpen = !accountOpen"
            >
              <span class="min-w-0 truncate"><span class="text-mist-300/45">@</span>{{ auth.displayName }}</span>
              <span v-if="auth.role" class="badge badge-accent hidden sm:inline-flex">{{ auth.role }}</span>
              <ChevronDown class="h-4 w-4 shrink-0" />
            </button>

            <div
              v-if="accountOpen"
              class="absolute right-0 top-[calc(100%+0.5rem)] grid w-64 gap-1 rounded-xl border border-mist-50/10 bg-[#252525] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.34)]"
              role="menu"
            >
              <div class="px-3 py-2">
                <p class="truncate text-sm font-bold text-mist-50">{{ auth.displayName }}</p>
                <p class="mt-1 truncate text-xs text-mist-300">{{ auth.email }}</p>
              </div>
              <button type="button" class="button button-ghost justify-start" role="menuitem" @click="logout">
                <LogOut class="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-[112rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <RouterView />
      </main>
    </section>
  </div>
</template>
