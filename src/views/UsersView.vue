<script setup lang="ts">
import { KeyRound, Lock, RefreshCw, Unlock } from '@lucide/vue'
import { onMounted, reactive, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import type { AdminUserResponse, UserRole } from '@/types/api'
import {
  blockUser,
  listUsers,
  unblockUser,
  updateUserPassword,
  updateUserRole,
} from '@/api/users'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime } from '@/utils/format'

const auth = useAuthStore()
const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const users = ref<AdminUserResponse[]>([])
const blockDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const selectedUser = ref<AdminUserResponse | null>(null)
const passwordError = ref('')
const blockForm = reactive({
  reason: '',
})
const passwordForm = reactive({
  password: '',
})

const roleOptions: UserRole[] = ['User', 'Admin', 'SuperAdmin']

onMounted(loadUsers)

async function loadUsers(): Promise<void> {
  loading.value = true

  try {
    users.value = await listUsers()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to load users.')
  } finally {
    loading.value = false
  }
}

async function changeRole(user: AdminUserResponse, role: UserRole): Promise<void> {
  saving.value = true

  try {
    const updated = await updateUserRole(user.id, role)
    replaceUser(updated)
    toast.success('Role updated.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to update role.')
    await loadUsers()
  } finally {
    saving.value = false
  }
}

function handleRoleChange(user: AdminUserResponse, event: Event): void {
  const select = event.target as HTMLSelectElement
  void changeRole(user, select.value as UserRole)
}

function openBlockDialog(user: AdminUserResponse): void {
  selectedUser.value = user
  blockForm.reason = ''
  blockDialogVisible.value = true
}

function openPasswordDialog(user: AdminUserResponse): void {
  selectedUser.value = user
  passwordForm.password = ''
  passwordError.value = ''
  passwordDialogVisible.value = true
}

async function submitBlock(): Promise<void> {
  if (!selectedUser.value) {
    return
  }

  saving.value = true

  try {
    const reason = blockForm.reason.trim() || null
    const updated = await blockUser(selectedUser.value.id, reason)
    replaceUser(updated)
    blockDialogVisible.value = false
    toast.success('User blocked.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to block user.')
  } finally {
    saving.value = false
  }
}

async function submitUnblock(user: AdminUserResponse): Promise<void> {
  saving.value = true

  try {
    const updated = await unblockUser(user.id)
    replaceUser(updated)
    toast.success('User unblocked.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to unblock user.')
  } finally {
    saving.value = false
  }
}

async function submitPassword(): Promise<void> {
  passwordError.value = ''

  if (!selectedUser.value) {
    return
  }

  if (passwordForm.password.length < 8) {
    passwordError.value = 'Password must be at least 8 characters.'
    return
  }

  saving.value = true

  try {
    const updated = await updateUserPassword(selectedUser.value.id, passwordForm.password)
    replaceUser(updated)
    passwordDialogVisible.value = false
    toast.success('Password updated.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to update password.')
  } finally {
    saving.value = false
  }
}

function replaceUser(user: AdminUserResponse): void {
  users.value = users.value.map((item) => (item.id === user.id ? user : item))
}
</script>

<template>
  <section class="admin-page">
    <div class="admin-page-header">
      <div>
        <h1 class="admin-title">Users</h1>
        <p class="admin-subtitle">Review accounts, block writes, and manage allowed account changes.</p>
      </div>
      <button type="button" class="button" :disabled="loading" @click="loadUsers">
        <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </button>
    </div>

    <div class="admin-panel">
      <div v-if="loading && users.length === 0" class="admin-panel-body">
        <LoadingState />
      </div>
      <EmptyState
        v-else-if="users.length === 0"
        title="No users"
        message="No accounts are available from the admin API."
      />
      <div v-else class="admin-table-wrap" :class="loading ? 'opacity-70' : ''">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th class="w-52">Role</th>
              <th class="w-44">State</th>
              <th class="w-52">Created</th>
              <th class="w-72">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <strong class="block max-w-xs truncate text-mist-50">{{ user.username }}</strong>
              </td>
              <td>
                <span class="block max-w-sm truncate text-mist-300">{{ user.email }}</span>
              </td>
              <td>
                <select
                  v-model="user.role"
                  class="control min-h-9 py-1.5"
                  :disabled="!auth.isSuperAdmin || user.isKnownUser || saving"
                  @change="handleRoleChange(user, $event)"
                >
                  <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                </select>
              </td>
              <td>
                <div class="flex flex-wrap gap-2">
                  <span class="badge" :class="user.isBlocked ? 'badge-danger' : 'badge-success'">
                    {{ user.isBlocked ? 'Blocked' : 'Active' }}
                  </span>
                  <span v-if="user.isKnownUser" class="badge badge-accent">Known</span>
                </div>
              </td>
              <td class="text-mist-300">{{ formatDateTime(user.createdAt) }}</td>
              <td>
                <span class="table-actions">
                  <button
                    v-if="user.canChangePassword && auth.isSuperAdmin"
                    type="button"
                    class="button min-h-9 px-3 py-1.5"
                    :disabled="saving"
                    @click="openPasswordDialog(user)"
                  >
                    <KeyRound class="h-4 w-4" />
                    Password
                  </button>
                  <button
                    v-if="user.isBlocked"
                    type="button"
                    class="button min-h-9 px-3 py-1.5"
                    :disabled="user.isKnownUser || saving"
                    @click="submitUnblock(user)"
                  >
                    <Unlock class="h-4 w-4" />
                    Unblock
                  </button>
                  <button
                    v-else
                    type="button"
                    class="button button-danger min-h-9 px-3 py-1.5"
                    :disabled="user.isKnownUser || saving"
                    @click="openBlockDialog(user)"
                  >
                    <Lock class="h-4 w-4" />
                    Block
                  </button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="blockDialogVisible" class="fixed inset-0 z-[60] grid place-items-center bg-[#1d1d1d]/70 p-4 backdrop-blur-[6px]">
        <section class="grid w-[min(100%,32rem)] gap-5 rounded-xl border border-mist-50/12 bg-[#252525] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]" role="dialog" aria-modal="true">
          <h2 class="font-display text-2xl font-bold leading-none text-mist-50">Block user</h2>
          <form class="grid gap-4" @submit.prevent="submitBlock">
            <label class="block">
              <span class="field-label">Reason</span>
              <textarea v-model="blockForm.reason" class="control textarea-control" maxlength="512" />
            </label>
            <div class="flex flex-wrap justify-end gap-2">
              <button type="button" class="button" @click="blockDialogVisible = false">Cancel</button>
              <button type="submit" class="button button-danger" :disabled="saving">
                <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-ember-100/70 border-t-transparent" />
                Block
              </button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="passwordDialogVisible" class="fixed inset-0 z-[60] grid place-items-center bg-[#1d1d1d]/70 p-4 backdrop-blur-[6px]">
        <section class="grid w-[min(100%,32rem)] gap-5 rounded-xl border border-mist-50/12 bg-[#252525] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]" role="dialog" aria-modal="true">
          <h2 class="font-display text-2xl font-bold leading-none text-mist-50">Change password</h2>
          <form class="grid gap-4" @submit.prevent="submitPassword">
            <label class="block">
              <span class="field-label">New password</span>
              <input
                v-model="passwordForm.password"
                class="control"
                type="password"
                maxlength="256"
                autocomplete="new-password"
                :aria-invalid="Boolean(passwordError)"
                @blur="passwordError = passwordForm.password.length >= 8 ? '' : passwordError"
              >
              <span v-if="passwordError" class="field-error">{{ passwordError }}</span>
            </label>
            <div class="flex flex-wrap justify-end gap-2">
              <button type="button" class="button" @click="passwordDialogVisible = false">Cancel</button>
              <button type="submit" class="button button-primary" :disabled="saving">
                <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-brass-100/70 border-t-transparent" />
                Save
              </button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </section>
</template>
