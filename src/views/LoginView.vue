<script setup lang="ts">
import { Key, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  login: '',
  password: '',
})

const rules: FormRules = {
  login: [{ required: true, message: 'Username or email is required.', trigger: 'blur' }],
  password: [{ required: true, message: 'Password is required.', trigger: 'blur' }],
}

async function submit(): Promise<void> {
  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true

  try {
    await auth.login(form)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Login failed.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-header">
        <div class="brand-mark">2C</div>
        <div>
          <h1>0x2c.dev Admin</h1>
          <p>Sign in with an admin account.</p>
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="Username or email" prop="login">
          <el-input v-model="form.login" :prefix-icon="User" autocomplete="username" />
        </el-form-item>
        <el-form-item label="Password" prop="password">
          <el-input
            v-model="form.password"
            :prefix-icon="Key"
            autocomplete="current-password"
            show-password
            type="password"
          />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" class="login-button">
          Sign in
        </el-button>
      </el-form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: var(--el-bg-color-page);
}

.login-panel {
  width: min(100%, 420px);
  padding: 28px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-dark);
}

.login-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: var(--el-color-white);
  font-weight: 750;
}

h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0;
}

p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
}

.login-button {
  width: 100%;
}
</style>
