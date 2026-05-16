<script setup lang="ts">
import { Key, Lock, Refresh, Unlock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import type { AdminUserResponse, UserRole } from '@/types/api'
import {
  blockUser,
  listUsers,
  unblockUser,
  updateUserPassword,
  updateUserRole,
} from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime } from '@/utils/format'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const users = ref<AdminUserResponse[]>([])
const blockDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const selectedUser = ref<AdminUserResponse | null>(null)
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
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load users.')
  } finally {
    loading.value = false
  }
}

async function changeRole(user: AdminUserResponse, role: UserRole): Promise<void> {
  saving.value = true

  try {
    const updated = await updateUserRole(user.id, role)
    replaceUser(updated)
    ElMessage.success('Role updated.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to update role.')
    await loadUsers()
  } finally {
    saving.value = false
  }
}

function openBlockDialog(user: AdminUserResponse): void {
  selectedUser.value = user
  blockForm.reason = ''
  blockDialogVisible.value = true
}

function openPasswordDialog(user: AdminUserResponse): void {
  selectedUser.value = user
  passwordForm.password = ''
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
    ElMessage.success('User blocked.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to block user.')
  } finally {
    saving.value = false
  }
}

async function submitUnblock(user: AdminUserResponse): Promise<void> {
  saving.value = true

  try {
    const updated = await unblockUser(user.id)
    replaceUser(updated)
    ElMessage.success('User unblocked.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to unblock user.')
  } finally {
    saving.value = false
  }
}

async function submitPassword(): Promise<void> {
  if (!selectedUser.value || passwordForm.password.length < 8) {
    ElMessage.error('Password must be at least 8 characters.')
    return
  }

  saving.value = true

  try {
    const updated = await updateUserPassword(selectedUser.value.id, passwordForm.password)
    replaceUser(updated)
    passwordDialogVisible.value = false
    ElMessage.success('Password updated.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to update password.')
  } finally {
    saving.value = false
  }
}

function replaceUser(user: AdminUserResponse): void {
  users.value = users.value.map((item) => (item.id === user.id ? user : item))
}
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <h1>Users</h1>
        <p>Review accounts, block writes, and manage allowed account changes.</p>
      </div>
      <el-button :icon="Refresh" @click="loadUsers">Refresh</el-button>
    </div>

    <div class="panel">
      <el-table v-loading="loading" :data="users" empty-text="No users found">
        <el-table-column prop="username" label="Username" min-width="170" show-overflow-tooltip />
        <el-table-column prop="email" label="Email" min-width="240" show-overflow-tooltip />
        <el-table-column label="Role" width="190">
          <template #default="{ row }">
            <el-select
              v-model="row.role"
              :disabled="!auth.isSuperAdmin || row.isKnownUser || saving"
              size="small"
              @change="(role: UserRole) => changeRole(row, role)"
            >
              <el-option v-for="role in roleOptions" :key="role" :label="role" :value="role" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="State" width="130">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag :type="row.isBlocked ? 'danger' : 'success'" effect="plain">
                {{ row.isBlocked ? 'Blocked' : 'Active' }}
              </el-tag>
              <el-tag v-if="row.isKnownUser" type="warning" effect="plain">Known</el-tag>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="Created" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="280" fixed="right">
          <template #default="{ row }">
            <span class="table-actions">
              <el-button
                v-if="row.canChangePassword && auth.isSuperAdmin"
                size="small"
                :icon="Key"
                :loading="saving"
                @click="openPasswordDialog(row)"
              >
                Password
              </el-button>
              <el-button
                v-if="row.isBlocked"
                size="small"
                :icon="Unlock"
                :disabled="row.isKnownUser"
                :loading="saving"
                @click="submitUnblock(row)"
              >
                Unblock
              </el-button>
              <el-button
                v-else
                size="small"
                type="danger"
                :icon="Lock"
                :disabled="row.isKnownUser"
                :loading="saving"
                @click="openBlockDialog(row)"
              >
                Block
              </el-button>
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="blockDialogVisible" title="Block user" width="520px">
      <el-form :model="blockForm" label-position="top">
        <el-form-item label="Reason">
          <el-input
            v-model="blockForm.reason"
            type="textarea"
            maxlength="512"
            show-word-limit
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blockDialogVisible = false">Cancel</el-button>
        <el-button type="danger" :loading="saving" @click="submitBlock">Block</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="passwordDialogVisible" title="Change password" width="520px">
      <el-form :model="passwordForm" label-position="top">
        <el-form-item label="New password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            maxlength="256"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="submitPassword">Save</el-button>
      </template>
    </el-dialog>
  </section>
</template>
