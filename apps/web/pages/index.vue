<template>
  <main class="mobile-shell landing-shell">
    <section class="top-tip" aria-label="页面快速入口">
      <p class="tip-title">💡 快速入口</p>
      <div class="tip-links">
        <NuxtLink class="tip-btn" to="/products">H5 商品列表</NuxtLink>
        <NuxtLink class="tip-btn" to="/orders">我的订单</NuxtLink>
        <NuxtLink class="tip-btn" to="/admin/users">管理后台</NuxtLink>
      </div>
    </section>

    <section class="hero-panel hero-upgrade">
      <p class="eyebrow">Nuxt 4 + Node.js + Supabase</p>
      <h1>欢迎来到 Demo 商城</h1>
      <p class="subtitle">
        前后端已真实打通，商品、订单、后台管理都连接 Supabase。
        你可以直接注册，或者先跳过体验完整下单链路。
      </p>

      <div class="hero-actions stacked-on-mobile">
        <NuxtLink class="primary-btn" to="/register?redirect=/products">立即注册</NuxtLink>
        <button class="ghost-btn" type="button" @click="skip">跳过注册，先逛逛</button>
      </div>
    </section>

    <section class="panel overview-panel">
      <div class="admin-header">
        <div>
          <p class="eyebrow">实时数据（来自 Supabase）</p>
          <h2>商城概览</h2>
        </div>
        <button class="ghost-btn compact" type="button" :disabled="loading" @click="loadDashboard">刷新</button>
      </div>

      <p v-if="loading" class="muted">正在从后台读取数据...</p>
      <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <template v-else-if="dashboard">
        <div class="stats-grid">
          <article class="stat-card">
            <span>上架商品</span>
            <strong>{{ dashboard.stats.onSaleProducts }}</strong>
          </article>
          <article class="stat-card">
            <span>用户总数</span>
            <strong>{{ dashboard.stats.users }}</strong>
          </article>
          <article class="stat-card">
            <span>订单总数</span>
            <strong>{{ dashboard.stats.orders }}</strong>
          </article>
          <article class="stat-card">
            <span>待付款</span>
            <strong>{{ dashboard.stats.pendingPayment }}</strong>
          </article>
          <article class="stat-card">
            <span>已付款</span>
            <strong>{{ dashboard.stats.paid }}</strong>
          </article>
          <article class="stat-card">
            <span>退款/退货</span>
            <strong>{{ dashboard.stats.refunded }}</strong>
          </article>
        </div>

        <div class="featured-head">
          <h3>推荐商品</h3>
          <NuxtLink class="link-btn" to="/products">查看全部</NuxtLink>
        </div>

        <div class="featured-grid">
          <NuxtLink
            v-for="product in dashboard.featuredProducts"
            :key="product.id"
            class="featured-item"
            :to="`/products/${product.id}`"
          >
            <span class="featured-title">{{ product.title }}</span>
            <strong>¥{{ Number(product.minPrice).toFixed(2) }}</strong>
          </NuxtLink>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { navigateTo } from '#app'
import { useDemoAuth } from '~/composables/useDemoAuth'
import { useApiBase } from '~/composables/useApiBase'

interface DashboardStats {
  onSaleProducts: number
  users: number
  orders: number
  pendingPayment: number
  paid: number
  refunded: number
}

interface FeaturedProduct {
  id: string
  title: string
  minPrice: number | string
}

interface DashboardData {
  stats: DashboardStats
  featuredProducts: FeaturedProduct[]
}

const auth = useDemoAuth()
const apiBase = useApiBase()
const dashboard = ref<DashboardData | null>(null)
const loading = ref(true)
const errorMessage = ref('')

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: DashboardData }>(`${apiBase}/api/dashboard`, {
      query: { _t: Date.now() },
      cache: 'no-store'
    })
    dashboard.value = response.data
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

await loadDashboard()

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.landing-shell {
  display: grid;
  gap: 16px;
  align-content: start;
  padding-top: 10px;
}

.top-tip {
  position: sticky;
  top: 10px;
  z-index: 8;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 16px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.tip-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
  color: #0f766e;
}

.tip-links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tip-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
  background: #f0fdfa;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.tip-btn:hover {
  background: #ccfbf1;
}

.hero-upgrade {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(236, 253, 245, 0.92));
}

.hero-actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.overview-panel {
  display: grid;
  gap: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  border-radius: 14px;
  padding: 12px;
  border: 1px solid #dbe6e2;
  background: #f8fffb;
}

.stat-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.stat-card strong {
  margin-top: 6px;
  display: block;
  color: #0f766e;
  font-size: 24px;
}

.featured-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.featured-head h3 {
  margin: 0;
}

.featured-grid {
  display: grid;
  gap: 10px;
}

.featured-item {
  border: 1px solid #dbe6e2;
  border-radius: 14px;
  padding: 12px 14px;
  text-decoration: none;
  color: #142033;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.featured-title {
  font-weight: 700;
}

.featured-item strong {
  color: #f97316;
}

@media (max-width: 460px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .tip-btn {
    flex: 1;
    min-width: calc(50% - 6px);
  }
}
</style>
