<script setup lang="ts">
import {
  Collection,
  DataBoard,
  EditPen,
  Fold,
  PriceTag,
  SwitchButton,
  User,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)

const activeRoute = computed(() => route.path)

onMounted(async () => {
  try {
    await auth.refreshCurrentUser()
    if (!auth.isAdmin) {
      ElMessage.error('This admin area requires an Admin or SuperAdmin account.')
      auth.clearSession()
      await router.replace({ name: 'login' })
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      auth.clearSession()
      await router.replace({ name: 'login' })
      return
    }

    ElMessage.error(error instanceof Error ? error.message : 'Failed to refresh session.')
  }
})

async function logout(): Promise<void> {
  auth.clearSession()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
      <div class="brand">
        <div class="brand-mark">2C</div>
        <div v-if="!collapsed">
          <strong>0x2c.dev</strong>
          <span>Admin</span>
        </div>
      </div>

      <el-menu :default-active="activeRoute" router class="nav-menu" :collapse="collapsed">
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>Dashboard</template>
        </el-menu-item>
        <el-menu-item index="/posts">
          <el-icon><EditPen /></el-icon>
          <template #title>Posts</template>
        </el-menu-item>
        <el-menu-item index="/tags">
          <el-icon><PriceTag /></el-icon>
          <template #title>Tags</template>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>Users</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <el-button :icon="Fold" circle @click="collapsed = !collapsed" />
        <div class="topbar-spacer" />
        <el-tag v-if="auth.role" effect="plain">{{ auth.role }}</el-tag>
        <el-dropdown trigger="click">
          <el-button>
            <el-icon><Collection /></el-icon>
            {{ auth.displayName }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>{{ auth.email }}</el-dropdown-item>
              <el-dropdown-item divided :icon="SwitchButton" @click="logout">Logout</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <main class="content">
        <RouterView />
      </main>
    </section>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  border-right: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  transition: width 160ms ease;
}

.sidebar.is-collapsed {
  width: 65px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: var(--el-color-white);
  font-size: 13px;
  font-weight: 750;
}

.brand strong,
.brand span {
  display: block;
}

.brand span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.nav-menu {
  border-right: 0;
}

.workspace {
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 0 22px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
}

.topbar-spacer {
  flex: 1;
}

.content {
  padding: 24px;
}

@media (max-width: 760px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: sticky;
    top: 0;
    z-index: 10;
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color);
  }

  .sidebar.is-collapsed {
    width: 100%;
  }

  .brand {
    min-height: 56px;
  }

  .nav-menu {
    display: flex;
    overflow-x: auto;
  }

  .topbar {
    padding: 0 14px;
  }

  .content {
    padding: 16px;
  }
}
</style>
