import { computed, readonly, ref } from 'vue'
import { useApiBase } from './useApiBase'

export interface DemoUser {
  id: string
  nickname: string
  phone?: string | null
  email?: string | null
  status?: 'active' | 'disabled'
}

interface ApiResponse<T> {
  data: T
  reused?: boolean
}

const STORAGE_USER_KEY = 'supabase-learn-demo-user'
const STORAGE_SKIP_KEY = 'supabase-learn-demo-skip-register'

const currentUser = ref<DemoUser | null>(null)
const skippedRegistration = ref(false)
const initialized = ref(false)
const syncingUser = ref(false)

function loadFromStorage() {
  if (typeof window === 'undefined' || initialized.value) return

  const rawUser = window.localStorage.getItem(STORAGE_USER_KEY)
  if (rawUser) {
    try {
      currentUser.value = JSON.parse(rawUser) as DemoUser
    } catch {
      window.localStorage.removeItem(STORAGE_USER_KEY)
    }
  }

  skippedRegistration.value = window.localStorage.getItem(STORAGE_SKIP_KEY) === '1'
  initialized.value = true
}

function saveUser(user: DemoUser) {
  currentUser.value = user
  skippedRegistration.value = false
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
  window.localStorage.removeItem(STORAGE_SKIP_KEY)
}

export function useDemoAuth() {
  const apiBase = useApiBase()
  loadFromStorage()

  async function register(payload: { nickname: string; phone?: string; email?: string }) {
    const response = await $fetch<ApiResponse<DemoUser>>(`${apiBase}/api/users/register`, {
      method: 'POST',
      body: payload
    })
    saveUser(response.data)
    return response.data
  }

  async function login(phone: string) {
    const response = await $fetch<ApiResponse<DemoUser>>(`${apiBase}/api/users/login`, {
      method: 'POST',
      body: { phone }
    })
    saveUser(response.data)
    return response.data
  }

  async function syncUser() {
    if (typeof window === 'undefined') {
      return currentUser.value
    }

    loadFromStorage()
    if (!currentUser.value?.id || syncingUser.value) {
      return currentUser.value
    }

    syncingUser.value = true
    try {
      const response = await $fetch<ApiResponse<DemoUser>>(`${apiBase}/api/users/${currentUser.value.id}`, {
      query: { _t: Date.now() },
      cache: 'no-store'
    })
      if (response.data.status === 'disabled') {
        throw new Error('该账号已被禁用，请联系管理员')
      }
      saveUser(response.data)
      return response.data
    } catch {
      logout()
      return null
    } finally {
      syncingUser.value = false
    }
  }

  function skipRegistration() {
    currentUser.value = null
    skippedRegistration.value = true
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_USER_KEY)
    window.localStorage.setItem(STORAGE_SKIP_KEY, '1')
  }

  function logout() {
    currentUser.value = null
    skippedRegistration.value = false
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_USER_KEY)
    window.localStorage.removeItem(STORAGE_SKIP_KEY)
  }

  if (typeof window !== 'undefined' && currentUser.value?.id && !syncingUser.value) {
    void syncUser()
  }

  return {
    user: readonly(currentUser),
    skippedRegistration: readonly(skippedRegistration),
    isLoggedIn: computed(() => Boolean(currentUser.value?.id)),
    isSyncing: readonly(syncingUser),
    register,
    login,
    syncUser,
    skipRegistration,
    logout,
    loadFromStorage
  }
}

