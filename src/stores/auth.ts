import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCurrentUser, login as loginRequest } from '@/api/auth'
import { sessionStorageKey } from '@/api/http'
import type { AuthResponse, CurrentUserResponse, LoginRequest } from '@/types/api'

interface StoredSession {
  userId: string
  username: string
  email: string
  accessToken: string
  expiresAt: string
  role: AuthResponse['role']
}

function readSession(): StoredSession | null {
  const rawSession = localStorage.getItem(sessionStorageKey)
  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as StoredSession
  } catch {
    localStorage.removeItem(sessionStorageKey)
    return null
  }
}

function isSessionValid(session: StoredSession | null): session is StoredSession {
  return !!session?.accessToken && Date.parse(session.expiresAt) > Date.now()
}

export const useAuthStore = defineStore('auth', () => {
  const storedSession = readSession()
  const userId = ref(storedSession?.userId ?? '')
  const username = ref(storedSession?.username ?? '')
  const email = ref(storedSession?.email ?? '')
  const accessToken = ref(storedSession?.accessToken ?? '')
  const expiresAt = ref(storedSession?.expiresAt ?? '')
  const role = ref<AuthResponse['role'] | ''>(storedSession?.role ?? '')
  const isBlocked = ref(false)

  const isAuthenticated = computed(
    () => !!accessToken.value && Date.parse(expiresAt.value) > Date.now(),
  )
  const isAdmin = computed(() => role.value === 'Admin' || role.value === 'SuperAdmin')
  const isSuperAdmin = computed(() => role.value === 'SuperAdmin')
  const displayName = computed(() => username.value || email.value || 'Admin')

  async function login(request: LoginRequest): Promise<void> {
    const response = await loginRequest(request)
    setSession(response)
  }

  async function refreshCurrentUser(): Promise<void> {
    if (!isAuthenticated.value) {
      clearSession()
      return
    }

    const response = await getCurrentUser()
    applyCurrentUser(response)
  }

  function setSession(response: AuthResponse): void {
    userId.value = response.userId
    username.value = response.username
    email.value = response.email
    accessToken.value = response.accessToken
    expiresAt.value = response.expiresAt
    role.value = response.role
    isBlocked.value = false

    persistSession()
  }

  function applyCurrentUser(response: CurrentUserResponse): void {
    userId.value = response.userId
    username.value = response.username
    email.value = response.email
    role.value = response.role
    isBlocked.value = response.isBlocked

    persistSession()
  }

  function persistSession(): void {
    const session: StoredSession = {
      userId: userId.value,
      username: username.value,
      email: email.value,
      accessToken: accessToken.value,
      expiresAt: expiresAt.value,
      role: role.value || 'User',
    }

    if (isSessionValid(session)) {
      localStorage.setItem(sessionStorageKey, JSON.stringify(session))
    } else {
      localStorage.removeItem(sessionStorageKey)
    }
  }

  function clearSession(): void {
    userId.value = ''
    username.value = ''
    email.value = ''
    accessToken.value = ''
    expiresAt.value = ''
    role.value = ''
    isBlocked.value = false
    localStorage.removeItem(sessionStorageKey)
  }

  return {
    userId,
    username,
    email,
    accessToken,
    expiresAt,
    role,
    isBlocked,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    displayName,
    login,
    refreshCurrentUser,
    clearSession,
  }
})
