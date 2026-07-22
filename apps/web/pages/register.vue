<template>
  <main class="mobile-shell narrow-shell">
    <nav class="top-nav">
      <NuxtLink to="/">首页</NuxtLink>
      <NuxtLink to="/products">商品</NuxtLink>
    </nav>

    <section class="panel">
      <p class="eyebrow">账户引导</p>
      <h1>{{ mode === 'register' ? '注册 Demo 用户' : '手机号登录' }}</h1>
      <p class="muted">注册/登录成功后会自动回到刚才的页面。也可以跳过注册先浏览商品。</p>
      <p class="muted" v-if="healthText">{{ healthText }}</p>

      <div class="segmented">
        <button :class="{ active: mode === 'register' }" type="button" @click="mode = 'register'">注册</button>
        <button :class="{ active: mode === 'login' }" type="button" @click="mode = 'login'">登录</button>
      </div>

      <form class="form-stack" @submit.prevent="submit">
        <label v-if="mode === 'register'">
          昵称
          <input v-model="form.nickname" placeholder="例如：小鹿" required>
        </label>
        <label>
          手机号
          <input v-model="form.phone" placeholder="测试号：13800000001" required>
        </label>
        <label v-if="mode === 'register'">
          邮箱（可选）
          <input v-model="form.email" placeholder="demo@example.com" type="email">
        </label>

        <button class="primary-btn" type="submit" :disabled="loading">{{ loading ? '处理中...' : submitText }}</button>
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
      </form>

      <button class="link-btn" type="button" @click="skip">跳过注册，先看商品</button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { navigateTo, useRoute } from '#app'
import { useDemoAuth } from '~/composables/useDemoAuth'
import { useApiBase } from '~/composables/useApiBase'

const route = useRoute()
const apiBase = useApiBase()
const auth = useDemoAuth()
const mode = ref<'register' | 'login'>(route.query.mode === 'login' ? 'login' : 'register')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const healthText = ref('')
const form = reactive({ nickname: 'Demo 用户', phone: '13800000001', email: '' })

const submitText = computed(() => mode.value === 'register' ? '完成注册' : '登录')
const redirectPath = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : '/products'
})

async function checkHealth() {
  try {
    const response = await $fetch<{ ok: boolean; supabase?: { configured?: boolean } }>(`${apiBase}/health`, {
      query: { _t: Date.now() },
      cache: 'no-store'
    })
    healthText.value = response.supabase?.configured ? '后端已连接，可直接注册/登录。' : '后端已启动，但 Supabase 未配置完整。'
  } catch {
    healthText.value = '后端不可达，请先启动 API（pnpm run dev）'
  }
}

async function submit() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (mode.value === 'register') {
      await auth.register({ nickname: form.nickname, phone: form.phone, email: form.email || undefined })
      successMessage.value = '注册成功，即将跳转'
    } else {
      await auth.login(form.phone)
      successMessage.value = '登录成功，即将跳转'
    }
    await navigateTo(redirectPath.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

function skip() {
  auth.skipRegistration()
  return navigateTo('/products')
}

onMounted(checkHealth)
</script>



