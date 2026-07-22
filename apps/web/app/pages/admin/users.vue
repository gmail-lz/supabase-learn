<template>
  <main class="admin-shell">
    <AdminNav />
    <section class="admin-panel">
      <div class="admin-header">
        <div><p class="eyebrow">Admin</p><h1>用户管理（真实 Supabase）</h1></div>
        <button class="ghost-btn" type="button" :disabled="loading" @click="loadUsers">刷新</button>
      </div>

      <form class="admin-form" @submit.prevent="createUser">
        <input v-model="createForm.nickname" placeholder="昵称" required>
        <input v-model="createForm.phone" placeholder="手机号" required>
        <input v-model="createForm.email" placeholder="邮箱（可选）" type="email">
        <button class="primary-btn small" type="submit" :disabled="submitting">新增用户</button>
      </form>

      <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
      <p v-if="loading" class="muted">加载中...</p>
      <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>昵称</th><th>手机号</th><th>邮箱</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td><input v-model="user.nickname"></td>
              <td><input v-model="user.phone"></td>
              <td><input v-model="user.email"></td>
              <td>
                <select v-model="user.status">
                  <option value="active">正常</option>
                  <option value="disabled">禁用</option>
                </select>
              </td>
              <td>
                <div class="actions">
                  <button class="primary-btn small" type="button" :disabled="submitting" @click="saveUser(user)">保存</button>
                  <button class="danger-btn small" type="button" :disabled="deletingId === user.id" @click="removeUser(user)">
                    {{ deletingId === user.id ? '删除中...' : '删除（禁用）' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AdminNav from '~/components/AdminNav.vue'
import { useApiBase } from '~/composables/useApiBase'

interface DemoUser { id: string; nickname: string; phone?: string; email?: string; status: 'active' | 'disabled' }
interface DeleteResponse {
  message?: string
  softDeleted?: boolean
  deleted?: boolean
}

const apiBase = useApiBase()
const users = ref<DemoUser[]>([])
const loading = ref(true)
const submitting = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const createForm = reactive({ nickname: '', phone: '', email: '' })

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: DemoUser[] }>(`${apiBase}/api/admin/users`, {
      query: { _t: Date.now() }
    })
    users.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function createUser() {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/admin/users`, {
      method: 'POST',
      body: {
        nickname: createForm.nickname,
        phone: createForm.phone,
        email: createForm.email || undefined,
        status: 'active'
      }
    })
    Object.assign(createForm, { nickname: '', phone: '', email: '' })
    successMessage.value = '用户创建成功（已写入 Supabase）'
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

async function saveUser(user: DemoUser) {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: { nickname: user.nickname, phone: user.phone, email: user.email, status: user.status }
    })
    successMessage.value = '用户信息已保存（Supabase 已更新）'
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

async function removeUser(user: DemoUser) {
  if (typeof window !== 'undefined' && !window.confirm(`确认删除用户「${user.nickname}」吗？有订单的用户会被禁用。`)) {
    return
  }

  deletingId.value = user.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await $fetch<DeleteResponse>(`${apiBase}/api/admin/users/${user.id}`, {
      method: 'DELETE'
    })

    successMessage.value = response.message ?? '用户已删除'
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    deletingId.value = ''
  }
}

onMounted(loadUsers)
</script>
